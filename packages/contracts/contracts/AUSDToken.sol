// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title AUSDToken
/// @notice ERC-20 testnet token used as Astalanty's MVP technical fee settlement asset.
contract AUSDToken is ERC20, Ownable, Pausable {
    mapping(address => bool) private _minters;
    mapping(address => bool) private _burners;

    event MinterUpdated(address indexed account, bool enabled);
    event BurnerUpdated(address indexed account, bool enabled);
    event AUSDPaused(address indexed operator);
    event AUSDUnpaused(address indexed operator);
    event AUSDMinted(address indexed to, uint256 amount, address indexed operator);
    event AUSDBurned(address indexed from, uint256 amount, address indexed operator);

    error Unauthorized();
    error TokenPaused();
    error InvalidAddress();
    error InvalidAmount();

    constructor(address initialOwner) ERC20("Astalanty USD", "AUSD") Ownable(initialOwner) {
        if (initialOwner == address(0)) {
            revert InvalidAddress();
        }

        _minters[initialOwner] = true;
        _burners[initialOwner] = true;
        emit MinterUpdated(initialOwner, true);
        emit BurnerUpdated(initialOwner, true);
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
        emit AUSDMinted(to, amount, msg.sender);
    }

    function burn(address from, uint256 amount) external whenNotPaused {
        if (!_burners[msg.sender]) {
            revert Unauthorized();
        }
        if (from == address(0)) {
            revert InvalidAddress();
        }
        if (amount == 0) {
            revert InvalidAmount();
        }

        if (msg.sender != from) {
            _spendAllowance(from, msg.sender, amount);
        }

        _burn(from, amount);
        emit AUSDBurned(from, amount, msg.sender);
    }

    function setMinter(address account, bool enabled) external onlyOwner {
        if (account == address(0)) {
            revert InvalidAddress();
        }

        _minters[account] = enabled;
        emit MinterUpdated(account, enabled);
    }

    function setBurner(address account, bool enabled) external onlyOwner {
        if (account == address(0)) {
            revert InvalidAddress();
        }

        _burners[account] = enabled;
        emit BurnerUpdated(account, enabled);
    }

    function isMinter(address account) external view returns (bool) {
        return _minters[account];
    }

    function isBurner(address account) external view returns (bool) {
        return _burners[account];
    }

    function pause() external onlyOwner {
        _pause();
        emit AUSDPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit AUSDUnpaused(msg.sender);
    }

    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        super._update(from, to, value);
    }
}
