// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAstalantyFeeManager {
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

    function quoteFeeView(FeeQuoteRequest calldata request) external view returns (FeeQuote memory);

    function settleFee(
        bytes32 operationId,
        address payer,
        uint256 mockUsdcAmount,
        FeeQuote calldata quote
    ) external returns (uint256 ausdSettled);
}

/// @title AstalantyPaymaster
/// @notice MVP paymaster that collects Mock USDC and settles AUSD through Fee Manager.
/// @dev Includes ERC-4337-style validation plus a Remix-friendly sponsorDemoOperation helper.
contract AstalantyPaymaster is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum PaymasterOperationState {
        None,
        Validated,
        Settled,
        PostOpSucceeded,
        PostOpReverted,
        Refunded
    }

    enum PostOpMode {
        OpSucceeded,
        OpReverted,
        PostOpReverted
    }

    struct UserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        uint256 callGasLimit;
        uint256 verificationGasLimit;
        uint256 preVerificationGas;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
        bytes paymasterAndData;
        bytes signature;
    }

    struct PaymasterOperation {
        address account;
        address payer;
        uint256 mockUsdcPaid;
        uint256 ausdSettled;
        PaymasterOperationState state;
    }

    address public entryPoint;
    address public feeManager;
    address public mockUsdc;
    address public treasury;
    uint256 public maxCostPerOperation;

    mapping(bytes32 => PaymasterOperation) public operations;

    event PaymasterValidationStarted(bytes32 indexed operationId, address indexed account, address indexed payer);
    event PaymasterPaymentReceived(bytes32 indexed operationId, address indexed payer, uint256 mockUsdcAmount);
    event PaymasterFeeSettled(bytes32 indexed operationId, uint256 ausdSettled);
    event PaymasterPostOpSucceeded(bytes32 indexed operationId, uint256 actualGasCost);
    event PaymasterPostOpReverted(bytes32 indexed operationId, uint256 actualGasCost);
    event PaymasterPaused(address indexed operator);
    event PaymasterUnpaused(address indexed operator);
    event FeeManagerUpdated(address indexed oldFeeManager, address indexed newFeeManager);
    event EntryPointUpdated(address indexed oldEntryPoint, address indexed newEntryPoint);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event MaxCostPerOperationUpdated(uint256 oldMaxCost, uint256 newMaxCost);
    event EntryPointDeposited(uint256 amount);
    event EntryPointWithdrawRequested(address indexed to, uint256 amount);

    error Unauthorized();
    error PaymasterIsPaused();
    error InvalidEntryPoint();
    error InvalidPaymasterData();
    error MaxCostExceeded();
    error MockUsdcTransferFailed();
    error FeeSettlementFailed();
    error OperationNotFound(bytes32 operationId);
    error InvalidPostOpCaller();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidPayer();

    modifier onlyEntryPoint() {
        if (msg.sender != entryPoint) {
            revert InvalidEntryPoint();
        }
        _;
    }

    constructor(
        address initialOwner,
        address entryPoint_,
        address feeManager_,
        address mockUsdc_,
        address treasury_,
        uint256 maxCostPerOperation_
    ) Ownable(initialOwner) {
        if (
            initialOwner == address(0) || entryPoint_ == address(0) || feeManager_ == address(0)
                || mockUsdc_ == address(0) || treasury_ == address(0)
        ) {
            revert InvalidAddress();
        }

        entryPoint = entryPoint_;
        feeManager = feeManager_;
        mockUsdc = mockUsdc_;
        treasury = treasury_;
        maxCostPerOperation = maxCostPerOperation_;
    }

    receive() external payable {}

    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external onlyEntryPoint whenNotPaused nonReentrant returns (bytes memory context, uint256 validationData) {
        (address payer) = _decodePaymasterData(userOp.paymasterAndData);
        (bytes32 operationId, IAstalantyFeeManager.FeeQuote memory quote, uint256 ausdSettled) =
            _collectAndSettle(userOpHash, userOp.sender, payer, userOp, maxCost);

        context = abi.encode(operationId, userOp.sender, payer, quote.mockUsdcRequired, ausdSettled);
        validationData = 0;
    }

    function postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost) external onlyEntryPoint {
        (bytes32 operationId,,,) = _decodePostOpContext(context);

        PaymasterOperation storage operation = operations[operationId];
        if (operation.state == PaymasterOperationState.None) {
            revert OperationNotFound(operationId);
        }

        if (mode == PostOpMode.OpSucceeded) {
            operation.state = PaymasterOperationState.PostOpSucceeded;
            emit PaymasterPostOpSucceeded(operationId, actualGasCost);
        } else {
            operation.state = PaymasterOperationState.PostOpReverted;
            emit PaymasterPostOpReverted(operationId, actualGasCost);
        }
    }

    function sponsorDemoOperation(
        bytes32 userOpHash,
        address account,
        address payer,
        uint256 verificationGasLimit,
        uint256 callGasLimit,
        uint256 preVerificationGas,
        uint256 maxFeePerGas
    ) external whenNotPaused nonReentrant returns (uint256 mockUsdcPaid, uint256 ausdSettled) {
        UserOperation memory userOp;
        userOp.sender = account;
        userOp.verificationGasLimit = verificationGasLimit;
        userOp.callGasLimit = callGasLimit;
        userOp.preVerificationGas = preVerificationGas;
        userOp.maxFeePerGas = maxFeePerGas;

        (, IAstalantyFeeManager.FeeQuote memory quote, uint256 settled) =
            _collectAndSettle(userOpHash, account, payer, userOp, verificationGasLimit + callGasLimit + preVerificationGas);

        return (quote.mockUsdcRequired, settled);
    }

    function depositToEntryPoint() external payable onlyOwner {
        if (msg.value == 0) {
            revert InvalidAmount();
        }
        emit EntryPointDeposited(msg.value);
    }

    function withdrawFromEntryPoint(address payable to, uint256 amount) external onlyOwner {
        if (to == address(0)) {
            revert InvalidAddress();
        }
        if (amount == 0 || amount > address(this).balance) {
            revert InvalidAmount();
        }

        (bool success,) = to.call{value: amount}("");
        if (!success) {
            revert FeeSettlementFailed();
        }
        emit EntryPointWithdrawRequested(to, amount);
    }

    function setFeeManager(address newFeeManager) external onlyOwner {
        if (newFeeManager == address(0)) {
            revert InvalidAddress();
        }

        address oldFeeManager = feeManager;
        feeManager = newFeeManager;
        emit FeeManagerUpdated(oldFeeManager, newFeeManager);
    }

    function setEntryPoint(address newEntryPoint) external onlyOwner {
        if (newEntryPoint == address(0)) {
            revert InvalidAddress();
        }

        address oldEntryPoint = entryPoint;
        entryPoint = newEntryPoint;
        emit EntryPointUpdated(oldEntryPoint, newEntryPoint);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) {
            revert InvalidAddress();
        }

        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function setMaxCostPerOperation(uint256 maxCost) external onlyOwner {
        uint256 oldMaxCost = maxCostPerOperation;
        maxCostPerOperation = maxCost;
        emit MaxCostPerOperationUpdated(oldMaxCost, maxCost);
    }

    function pause() external onlyOwner {
        _pause();
        emit PaymasterPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit PaymasterUnpaused(msg.sender);
    }

    function _collectAndSettle(
        bytes32 userOpHash,
        address account,
        address payer,
        UserOperation memory userOp,
        uint256 maxCost
    ) internal returns (bytes32 operationId, IAstalantyFeeManager.FeeQuote memory quote, uint256 ausdSettled) {
        if (userOpHash == bytes32(0)) {
            revert InvalidAmount();
        }
        if (account == address(0) || payer == address(0)) {
            revert InvalidAddress();
        }
        if (payer != account) {
            revert InvalidPayer();
        }
        if (maxCostPerOperation != 0 && maxCost > maxCostPerOperation) {
            revert MaxCostExceeded();
        }

        operationId = keccak256(abi.encode(address(this), block.chainid, userOpHash, account, payer));
        if (operations[operationId].state != PaymasterOperationState.None) {
            revert FeeSettlementFailed();
        }

        IAstalantyFeeManager.FeeQuoteRequest memory request = IAstalantyFeeManager.FeeQuoteRequest({
            account: account,
            payer: payer,
            verificationGasLimit: userOp.verificationGasLimit,
            callGasLimit: userOp.callGasLimit,
            preVerificationGas: userOp.preVerificationGas,
            maxFeePerGas: userOp.maxFeePerGas
        });

        quote = IAstalantyFeeManager(feeManager).quoteFeeView(request);

        emit PaymasterValidationStarted(operationId, account, payer);

        IERC20(mockUsdc).safeTransferFrom(payer, treasury, quote.mockUsdcRequired);
        emit PaymasterPaymentReceived(operationId, payer, quote.mockUsdcRequired);

        try IAstalantyFeeManager(feeManager).settleFee(operationId, payer, quote.mockUsdcRequired, quote) returns (
            uint256 settled
        ) {
            ausdSettled = settled;
        } catch {
            revert FeeSettlementFailed();
        }

        operations[operationId] = PaymasterOperation({
            account: account,
            payer: payer,
            mockUsdcPaid: quote.mockUsdcRequired,
            ausdSettled: ausdSettled,
            state: PaymasterOperationState.Settled
        });

        emit PaymasterFeeSettled(operationId, ausdSettled);
    }

    function _decodePaymasterData(bytes calldata paymasterAndData) internal pure returns (address payer) {
        if (paymasterAndData.length != 32) {
            revert InvalidPaymasterData();
        }
        payer = abi.decode(paymasterAndData, (address));
        if (payer == address(0)) {
            revert InvalidPaymasterData();
        }
    }

    function _decodePostOpContext(bytes calldata context)
        internal
        pure
        returns (bytes32 operationId, address account, address payer, uint256 mockUsdcPaid)
    {
        uint256 ausdSettled;
        (operationId, account, payer, mockUsdcPaid, ausdSettled) =
            abi.decode(context, (bytes32, address, address, uint256, uint256));
        ausdSettled;
    }
}
