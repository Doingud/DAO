// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

/**
 * @title  DoinGud: AMOR.sol
 * @author Daoism Systems
 * @notice ERC20 implementation for DoinGudDAO
 * @custom Security-contact arseny@daoism.systems || konstantin@daoism.systems
 * @dev Implementation of the AMOR Token Logic for DoinGud MetaDAO
 *
 * This token implementation contract is referenced by a proxy contract.
 *
 * It is crucial that control over proxy features which upgrade or change the
 * implementation contract is transparent and secure.
 *
 * The contract is an extension of ERC20Base, which is an initializable
 * ERC20 Token contract, itself derived from the IERC20.sol implementation
 * from OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/ERC20.sol).
 * Please see ERC20Base.sol for licensing and copyright info.
 *
 * MIT License
 * ===========
 *
 * Copyright (c) 2022 DoinGud
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *
 */

import "../utils/ERC20Base.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

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
    event AmorTaxChanged(uint256 newRate);
    event AmorTaxControllerUpdated(address newTaxCollector);

    bool private _initialized;

    /// @notice Initializes the token
    /// @dev    Must call `_setTokenDetail` to set `name` and `symol`
    /// @param  _name the token name
    /// @param  _symbol the token symbol
    /// @param  _initCollector the tax/fee collector (DoinGud MetaDAO)
    /// @param  _multisig the multisig address of the MetaDAO, which owns the token
    /// @return bool value, true if successful
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
        _setTokenDetail(_name, _symbol);
        _decimals = 18;
        //  Pre-mint to the multisig address
        _mint(_multisig, 10000000 * 10**_decimals);
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
        emit AmorTaxChanged(newRate);
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
        emit AmorTaxControllerUpdated(newTaxCollector);
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
        if (fromBalance < amount) {
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
    ///         The owner should be a multisig and have strong security practices
    //          Actions invoking `pause` and `unpause` must be transparent to the community
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
