// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title AstalantySmartAccount
/// @notice Minimal self-custodial Smart Account for the Astalanty MVP.
/// @dev Designed for testnet/demo while preserving compatibility with a fuller Account Abstraction flow.
contract AstalantySmartAccount {
    using ECDSA for bytes32;

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

    address public owner;
    address public recoveryGuardian;
    address public entryPoint;
    uint256 public nonce;
    bool public initialized;

    event SmartAccountInitialized(address indexed account, address indexed owner, address indexed entryPoint);
    event SmartAccountExecuted(address indexed account, address indexed target, uint256 value, bytes32 callHash);
    event SmartAccountBatchExecuted(address indexed account, uint256 calls);
    event OwnerRecovered(address indexed oldOwner, address indexed newOwner, address indexed guardian);
    event RecoveryGuardianUpdated(address indexed oldGuardian, address indexed newGuardian);
    event EntryPointUpdated(address indexed oldEntryPoint, address indexed newEntryPoint);
    event NativeReceived(address indexed sender, uint256 amount);

    error AlreadyInitialized();
    error Unauthorized();
    error InvalidOwner();
    error InvalidGuardian();
    error InvalidEntryPoint();
    error InvalidSignature();
    error InvalidNonce();
    error ExecutionFailed();
    error InvalidBatch();
    error InvalidTarget();

    modifier onlyAuthorizedExecutor() {
        if (msg.sender != owner && msg.sender != entryPoint) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert Unauthorized();
        }
        _;
    }

    receive() external payable {
        emit NativeReceived(msg.sender, msg.value);
    }

    function initialize(address owner_, address recoveryGuardian_, address entryPoint_) external {
        if (initialized) {
            revert AlreadyInitialized();
        }
        if (owner_ == address(0)) {
            revert InvalidOwner();
        }
        if (entryPoint_ == address(0)) {
            revert InvalidEntryPoint();
        }

        owner = owner_;
        recoveryGuardian = recoveryGuardian_;
        entryPoint = entryPoint_;
        initialized = true;

        emit SmartAccountInitialized(address(this), owner_, entryPoint_);
        if (recoveryGuardian_ != address(0)) {
            emit RecoveryGuardianUpdated(address(0), recoveryGuardian_);
        }
    }

    function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
        external
        returns (uint256 validationData)
    {
        if (msg.sender != entryPoint) {
            revert InvalidEntryPoint();
        }
        if (userOp.sender != address(this)) {
            revert Unauthorized();
        }
        if (userOp.nonce != nonce) {
            revert InvalidNonce();
        }

        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        address recovered = ECDSA.recover(ethSignedHash, userOp.signature);
        if (recovered != owner) {
            revert InvalidSignature();
        }

        nonce++;

        if (missingAccountFunds > 0) {
            (bool success,) = payable(entryPoint).call{value: missingAccountFunds}("");
            if (!success) {
                revert ExecutionFailed();
            }
        }

        return validationData;
    }

    function execute(address target, uint256 value, bytes calldata data) external onlyAuthorizedExecutor {
        if (target == address(0)) {
            revert InvalidTarget();
        }

        (bool success,) = target.call{value: value}(data);
        if (!success) {
            revert ExecutionFailed();
        }

        emit SmartAccountExecuted(address(this), target, value, keccak256(data));
    }

    function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata data)
        external
        onlyAuthorizedExecutor
    {
        uint256 length = targets.length;
        if (length == 0 || length != values.length || length != data.length) {
            revert InvalidBatch();
        }

        for (uint256 i = 0; i < length; i++) {
            if (targets[i] == address(0)) {
                revert InvalidTarget();
            }

            (bool success,) = targets[i].call{value: values[i]}(data[i]);
            if (!success) {
                revert ExecutionFailed();
            }

            emit SmartAccountExecuted(address(this), targets[i], values[i], keccak256(data[i]));
        }

        emit SmartAccountBatchExecuted(address(this), length);
    }

    function recoverOwner(address newOwner) external {
        if (msg.sender != recoveryGuardian) {
            revert Unauthorized();
        }
        if (newOwner == address(0)) {
            revert InvalidOwner();
        }

        address oldOwner = owner;
        owner = newOwner;
        emit OwnerRecovered(oldOwner, newOwner, msg.sender);
    }

    function setRecoveryGuardian(address newGuardian) external onlyOwner {
        address oldGuardian = recoveryGuardian;
        recoveryGuardian = newGuardian;
        emit RecoveryGuardianUpdated(oldGuardian, newGuardian);
    }

    function setEntryPoint(address newEntryPoint) external onlyOwner {
        if (newEntryPoint == address(0)) {
            revert InvalidEntryPoint();
        }

        address oldEntryPoint = entryPoint;
        entryPoint = newEntryPoint;
        emit EntryPointUpdated(oldEntryPoint, newEntryPoint);
    }

    function getOwner() external view returns (address) {
        return owner;
    }

    function getEntryPoint() external view returns (address) {
        return entryPoint;
    }

    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4 magicValue) {
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(hash);
        address recovered = ECDSA.recover(ethSignedHash, signature);
        return recovered == owner ? bytes4(0x1626ba7e) : bytes4(0xffffffff);
    }
}
