// SPDX-License-Identifier: MIT

/// @title  DoinGud MetaDAO Token Logic
/// @author Daoism Systems
/// @notice ERC20 implementation for DoinGudDAO
/// @custom security-contact contact@daoism.systems

/**
 *  @dev Implementation of the AMOR token Logic for DoinGud MetaDAO
 *
 *  The Token Logic contract is referenced by the proxy (storage) implementation.
 *
 *  This contract must not store data!
 *
 *  The contract extends the ERC20Taxable contract and exposes the setTaxCollector() and
 *  setTaxRate() functions from the ERC20Taxable contract and allows for custom
 *  require() statements within these functions.
 *
 *  The setTaxCollector() and setTaxRate() functions should be set on deploy and are
 *  not immutable.
 */

pragma solidity 0.8.15;

import "./utils/ERC20Base.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
contract AMORToken is ERC20Base, Pausable, Ownable {
    //  Tax controller
    address public taxController;
    //  Tax Rate
    uint256 public taxRate;
    //  Basis points
    uint256 public constant BASIS_POINTS = 10000;

    error InvalidRate();

    error InvalidTaxCollector();

    error AlreadyInitialized();

    event Initialized(bool success, address taxCollector, uint256 rate);

    bool private _initialized;

    /*  @dev    The init() function takes the place of the constructor.
     *          It can only be run once.
     */
    function init(
        string memory _name,
        string memory _symbol,
        address _initCollector,
        uint256 _initTaxRate,
        address _multisig
    ) external returns (bool) {
        if (_initialized) {
            revert AlreadyInitialized();
        }
        //  Set the owner to the Multisig
        _transferOwnership(_multisig);
        //  Set the name and symbol
        name = _name;
        symbol = _symbol;
        //  Pre-mint to the multisig address
        _mint(_multisig, 10000000 * 10**decimals);
        //  Set the tax collector address
        updateController(_initCollector);
        //  Set the tax rate
        setTaxRate(_initTaxRate);
        _initialized = true;
        emit Initialized(_initialized, _initCollector, _initTaxRate);
        return true;
    }

    /// @notice Sets the tax rate for transfer and transferFrom
    /// @dev    Rate is expressed in basis points, this must be divided by 10 000 to equal desired rate
    /// @param  newRate uint256 representing new tax rate, must be <= 500
    function setTaxRate(uint256 newRate) public onlyOwner {
        if (newRate > 500) {
            revert InvalidRate();
        }
        _setTaxRate(newRate);
    }

    /// @notice Sets the address which receives taxes
    /// @param  newTaxCollector address which must receive taxes
    function updateController(address newTaxCollector) public onlyOwner {
        if (newTaxCollector == address(this)) {
            revert InvalidTaxCollector();
        }
        _updateController(newTaxCollector);
    }

    /// @notice Sets the address which receives taxes
    /// @param  newTaxCollector address which must receive taxes
    function _updateController(address newTaxCollector) internal {
        taxController = newTaxCollector;
    }

    /// @notice Sets the tax rate for transfer and transferFrom
    /// @dev    Rate is expressed in basis points, this must be divided by 10 000 to equal desired rate
    /// @param  newRate uint256 representing new tax rate, must be <= 500
    function _setTaxRate(uint256 newRate) internal {
        taxRate = newRate;
    }

    /// @notice This transfer function overrides the normal _transfer from ERC20Base
    /// @dev    It implements the logic for taking fees
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        if (from == address(0) || to == address(0)) {
            revert InvalidTransfer();
        }

        _beforeTokenTransfer(from, to, amount);

        uint256 fromBalance = _balances[from];
        console.log("fromBalance is %s", fromBalance);
        console.log("amount is %s", amount);
        if (fromBalance <= amount) {
            revert InvalidTransfer();
        }

        unchecked {
            _balances[from] = fromBalance - amount;
        }

        if (taxRate > 0) {
            uint256 taxAmount = (amount * taxRate) / BASIS_POINTS;
            uint256 afterTaxAmount = amount - taxAmount;
            _balances[taxController] += taxAmount;

            emit Transfer(from, taxController, taxAmount);

            _balances[to] += afterTaxAmount;

            emit Transfer(from, to, (amount - taxAmount));
        } else {
            _balances[to] += amount;

            emit Transfer(from, to, amount);
        }

        _afterTokenTransfer(from, to, amount);
    }

    /// @notice Pause functionality for AMOR
    /// @dev    For security purposes, should there be an exploit.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}
