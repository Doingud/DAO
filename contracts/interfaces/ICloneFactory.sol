// SPDX-License-Identifier: MIT
// Derived from OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/ERC20.sol)
pragma solidity 0.8.15;

/**
 * @title  Interface for CloneFactory.sol
 * @author Daoism Systems Team
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

interface ICloneFactory {
    error CreationFailed();
    error ArrayMismatch();

    /// @notice Deploys a new Guild (tokens + control structures)
    /// @param reality Intended to be the reality.eth address for this guild
    /// @param initialGuardian The address responsible for the Guild's first actions
    /// @param _name The full name for the Guild
    /// @param _symbol The symbol for this Guild's token
    /// @return controller The new Guild's Controller address
    /// @return avatar The new Guild's Avatar address
    /// @return governor The new Guild's Governor address
    function deployGuildContracts(
        address reality,
        address initialGuardian,
        string memory _name,
        string memory _symbol
    )
        external
        returns (
            address controller,
            address avatar,
            address governor
        );
}
