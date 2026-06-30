// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface IAUSDToken {
    function mint(address to, uint256 amount) external;
}

/// @title AstalantyFeeManager
/// @notice MVP fee policy engine for Mock USDC -> AUSD settlement.
/// @dev Only the authorized Paymaster may settle fees.
contract AstalantyFeeManager is Ownable, Pausable {
    using SafeERC20 for IERC20;

    struct FeeQuoteRequest {
        address account;
        address payer;
        uint256 verificationGasLimit;
        uint256 callGasLimit;
        uint256 preVerificationGas;
        uint256 maxFeePerGas;
    }

    struct FeeQuote {
        uint256 gasLimit;
        uint256 gasFeeWei;
        uint256 ausdFee;
        uint256 mockUsdcRequired;
        uint256 rate;
    }

    address public ausd;
    address public mockUsdc;
    address public treasury;
    address public authorizedPaymaster;

    uint256 public usdcToAusdRate;
    uint256 public baseGasMarkupBps;
    uint256 public minAusdFee;
    uint256 public maxAusdFee;

    mapping(bytes32 => bool) public settledOperations;

    event FeeQuoted(
        address indexed account,
        address indexed payer,
        uint256 gasLimit,
        uint256 ausdFee,
        uint256 mockUsdcRequired
    );

    event FeeSettled(
        bytes32 indexed operationId,
        address indexed payer,
        uint256 mockUsdcPaid,
        uint256 ausdSettled,
        address indexed paymaster
    );

    event RateUpdated(uint256 oldRate, uint256 newRate);
    event GasPolicyUpdated(uint256 markupBps, uint256 minFee, uint256 maxFee);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event AuthorizedPaymasterUpdated(address indexed oldPaymaster, address indexed newPaymaster);
    event FeeManagerPaused(address indexed operator);
    event FeeManagerUnpaused(address indexed operator);

    error Unauthorized();
    error FeeManagerIsPaused();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidRate();
    error FeeTooLow();
    error FeeTooHigh();
    error OperationAlreadySettled(bytes32 operationId);
    error InvalidPaymaster();
    error SettlementFailed();

    modifier onlyAuthorizedPaymaster() {
        if (msg.sender != authorizedPaymaster) {
            revert InvalidPaymaster();
        }
        _;
    }

    constructor(
        address initialOwner,
        address ausd_,
        address mockUsdc_,
        address treasury_,
        uint256 usdcToAusdRate_,
        uint256 baseGasMarkupBps_,
        uint256 minAusdFee_,
        uint256 maxAusdFee_
    ) Ownable(initialOwner) {
        if (
            initialOwner == address(0) || ausd_ == address(0) || mockUsdc_ == address(0)
                || treasury_ == address(0)
        ) {
            revert InvalidAddress();
        }
        if (usdcToAusdRate_ == 0) {
            revert InvalidRate();
        }
        if (maxAusdFee_ != 0 && minAusdFee_ > maxAusdFee_) {
            revert FeeTooHigh();
        }

        ausd = ausd_;
        mockUsdc = mockUsdc_;
        treasury = treasury_;
        usdcToAusdRate = usdcToAusdRate_;
        baseGasMarkupBps = baseGasMarkupBps_;
        minAusdFee = minAusdFee_;
        maxAusdFee = maxAusdFee_;
    }

    function quoteFee(FeeQuoteRequest calldata request) public returns (FeeQuote memory quote) {
        quote = _quoteFee(request);
        emit FeeQuoted(request.account, request.payer, quote.gasLimit, quote.ausdFee, quote.mockUsdcRequired);
    }

    function quoteFeeView(FeeQuoteRequest calldata request) external view returns (FeeQuote memory) {
        return _quoteFee(request);
    }

    function settleFee(
        bytes32 operationId,
        address payer,
        uint256 mockUsdcAmount,
        FeeQuote calldata quote
    ) external whenNotPaused onlyAuthorizedPaymaster returns (uint256 ausdSettled) {
        if (operationId == bytes32(0)) {
            revert InvalidAmount();
        }
        if (payer == address(0)) {
            revert InvalidAddress();
        }
        if (mockUsdcAmount == 0 || quote.ausdFee == 0) {
            revert InvalidAmount();
        }
        if (settledOperations[operationId]) {
            revert OperationAlreadySettled(operationId);
        }
        if (mockUsdcAmount < quote.mockUsdcRequired) {
            revert FeeTooLow();
        }

        settledOperations[operationId] = true;
        ausdSettled = quote.ausdFee;

        try IAUSDToken(ausd).mint(treasury, ausdSettled) {}
        catch {
            revert SettlementFailed();
        }

        emit FeeSettled(operationId, payer, mockUsdcAmount, ausdSettled, msg.sender);
    }

    function setRate(uint256 newRate) external onlyOwner {
        if (newRate == 0) {
            revert InvalidRate();
        }

        uint256 oldRate = usdcToAusdRate;
        usdcToAusdRate = newRate;
        emit RateUpdated(oldRate, newRate);
    }

    function setGasPolicy(uint256 markupBps, uint256 minFee, uint256 maxFee) external onlyOwner {
        if (maxFee != 0 && minFee > maxFee) {
            revert FeeTooHigh();
        }

        baseGasMarkupBps = markupBps;
        minAusdFee = minFee;
        maxAusdFee = maxFee;
        emit GasPolicyUpdated(markupBps, minFee, maxFee);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) {
            revert InvalidAddress();
        }

        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function setAuthorizedPaymaster(address paymaster) external onlyOwner {
        if (paymaster == address(0)) {
            revert InvalidAddress();
        }

        address oldPaymaster = authorizedPaymaster;
        authorizedPaymaster = paymaster;
        emit AuthorizedPaymasterUpdated(oldPaymaster, paymaster);
    }

    function pause() external onlyOwner {
        _pause();
        emit FeeManagerPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit FeeManagerUnpaused(msg.sender);
    }

    function _quoteFee(FeeQuoteRequest calldata request) internal view returns (FeeQuote memory quote) {
        if (request.account == address(0) || request.payer == address(0)) {
            revert InvalidAddress();
        }
        if (request.maxFeePerGas == 0) {
            revert InvalidAmount();
        }

        uint256 gasLimit = request.verificationGasLimit + request.callGasLimit + request.preVerificationGas;
        if (gasLimit == 0) {
            revert InvalidAmount();
        }

        uint256 rawFee = gasLimit * request.maxFeePerGas;
        uint256 markedUpFee = rawFee + ((rawFee * baseGasMarkupBps) / 10_000);
        uint256 ausdFee = markedUpFee;

        if (ausdFee < minAusdFee) {
            ausdFee = minAusdFee;
        }
        if (maxAusdFee != 0 && ausdFee > maxAusdFee) {
            revert FeeTooHigh();
        }

        uint256 mockUsdcRequired = (ausdFee * 1e6 + usdcToAusdRate - 1) / usdcToAusdRate;
        if (mockUsdcRequired == 0) {
            mockUsdcRequired = 1;
        }

        quote = FeeQuote({
            gasLimit: gasLimit,
            gasFeeWei: rawFee,
            ausdFee: ausdFee,
            mockUsdcRequired: mockUsdcRequired,
            rate: usdcToAusdRate
        });
    }
}
