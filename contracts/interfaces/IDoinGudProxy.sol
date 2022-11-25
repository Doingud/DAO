// SPDX-License-Identifier: MIT

/// @title  DoinGud Proxy Interface
/// @author Daoism Systems Team
/// @notice ERC20 implementation for DoinGudDAO

/**
 *  @dev Interface for the DoinGud Proxy
 */
pragma solidity 0.8.15;

/**
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
 */

interface IDoinGudProxy {
    /// @notice First time setup of proxy contract
    /// @dev    Can only be called once. Sets up token with specific implementation address
    /// @param  logic The address of the contract with the correct implementation logic
    function initProxy(address logic) external payable;

    /// @notice updates the `implementation` contract
    /// @param  newImplementation the address of the new implementation contract
    function upgradeImplementation(address newImplementation) external;

    /// @notice returns the current implementation address
    /// @dev    ensures transparency with regards to which funcitonality is implemented
    /// @return address the address of the current implementation contract
    function viewImplementation() external view returns (address);
}
