// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AstalantySmartAccount} from "./AstalantySmartAccount.sol";

/// @title AstalantySmartAccountFactory
/// @notice Factory for creating one MVP Smart Account per owner.
contract AstalantySmartAccountFactory is Ownable {
    address public entryPoint;
    uint256 public totalAccounts;

    mapping(address => address) public accountOfOwner;
    mapping(address => bool) public isAstalantyAccount;

    event SmartAccountCreated(address indexed account, address indexed owner, bytes32 indexed salt);
    event EntryPointUpdated(address indexed oldEntryPoint, address indexed newEntryPoint);

    error Unauthorized();
    error InvalidOwner();
    error InvalidEntryPoint();
    error AccountAlreadyExists(address owner, address account);
    error AccountNotFound(address owner);

    constructor(address initialOwner, address entryPoint_) Ownable(initialOwner) {
        if (initialOwner == address(0)) {
            revert InvalidOwner();
        }
        if (entryPoint_ == address(0)) {
            revert InvalidEntryPoint();
        }

        entryPoint = entryPoint_;
    }

    function createAccount(address owner_, address recoveryGuardian) external returns (address account) {
        bytes32 salt = keccak256(abi.encode(owner_));
        return createAccount(owner_, recoveryGuardian, salt);
    }

    function createAccount(address owner_, address recoveryGuardian, bytes32 salt) public returns (address account) {
        if (owner_ == address(0)) {
            revert InvalidOwner();
        }
        if (accountOfOwner[owner_] != address(0)) {
            revert AccountAlreadyExists(owner_, accountOfOwner[owner_]);
        }

        AstalantySmartAccount smartAccount = new AstalantySmartAccount{salt: salt}();
        smartAccount.initialize(owner_, recoveryGuardian, entryPoint);

        account = address(smartAccount);
        accountOfOwner[owner_] = account;
        isAstalantyAccount[account] = true;
        totalAccounts++;

        emit SmartAccountCreated(account, owner_, salt);
    }

    function getAccount(address owner_) external view returns (address account) {
        account = accountOfOwner[owner_];
        if (account == address(0)) {
            revert AccountNotFound(owner_);
        }
    }

    function predictAccountAddress(address owner_) external view returns (address predicted) {
        bytes32 salt = keccak256(abi.encode(owner_));
        return predictAccountAddress(owner_, salt);
    }

    function predictAccountAddress(address owner_, bytes32 salt) public view returns (address predicted) {
        owner_;
        bytes memory bytecode = type(AstalantySmartAccount).creationCode;
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(bytecode)));
        predicted = address(uint160(uint256(hash)));
    }

    function setEntryPoint(address newEntryPoint) external onlyOwner {
        if (newEntryPoint == address(0)) {
            revert InvalidEntryPoint();
        }

        address oldEntryPoint = entryPoint;
        entryPoint = newEntryPoint;
        emit EntryPointUpdated(oldEntryPoint, newEntryPoint);
    }
}
