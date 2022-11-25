// SPDX-License-Identifier: MIT
// Derived from OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/ERC20.sol)

/// @title  DoinGud Guild AMOR Token Interface
/// @author Daoism Systems Team
/// @notice ERC20 implementation for DoinGudDAO

pragma solidity 0.8.15;

/*
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
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title  Interface for AmorToken.sol
/// @author Daoism Systems Team

interface IAmorToken is IERC20 {
    /**
     * @dev Returns the tax rate of the AMOR token.
     */
    function taxRate() external view returns (uint256);

    /**
     * @dev Returns the basis points constant.
     */
    function BASIS_POINTS() external view returns (uint256);

    /// @notice Sets the tax rate for transfer and transferFrom
    function setTaxRate(uint256 newRate) external;

    /// View the current tax collector address
    function updateController(address newTaxCollector) external;
}
