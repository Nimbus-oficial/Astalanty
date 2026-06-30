// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title MockUSDC
/// @notice Testnet-only Mock USDC used to demonstrate the Astalanty MVP payment flow.
/// @dev This contract is intentionally simple and must not be used as a production stablecoin.
contract MockUSDC is ERC20, Ownable, Pausable {
    mapping(address => bool) private _minters;

    event MinterUpdated(address indexed account, bool enabled);
    event MockUSDCMinted(address indexed to, uint256 amount, address indexed operator);
    event MockUSDCPaused(address indexed operator);
    event MockUSDCUnpaused(address indexed operator);

    error Unauthorized();
    error TokenPaused();
    error InvalidAddress();
    error InvalidAmount();

    constructor(address initialOwner) ERC20("Mock USDC", "mUSDC") Ownable(initialOwner) {
        if (initialOwner == address(0)) {
            revert InvalidAddress();
        }

        _minters[initialOwner] = true;
        emit MinterUpdated(initialOwner, true);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external whenNotPaused {
        if (!_minters[msg.sender]) {
            revert Unauthorized();
        }
        if (to == address(0)) {
            revert InvalidAddress();
        }
        if (amount == 0) {
            revert InvalidAmount();
        }

        _mint(to, amount);
        emit MockUSDCMinted(to, amount, msg.sender);
    }

    function setMinter(address account, bool enabled) external onlyOwner {
        if (account == address(0)) {
            revert InvalidAddress();
        }

        _minters[account] = enabled;
        emit MinterUpdated(account, enabled);
    }

    function isMinter(address account) external view returns (bool) {
        return _minters[account];
    }

    function pause() external onlyOwner {
        _pause();
        emit MockUSDCPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit MockUSDCUnpaused(msg.sender);
    }

    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        super._update(from, to, value);
    }
}
