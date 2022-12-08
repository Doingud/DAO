// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

/**
 * @title  DoinGud FXAMORxGuild Interface
 * @author Daoism Systems Team
 * @notice FXAMORxGuild interface for DoinGudDAO
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

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IFXAMORxGuild {
    /// Events
    /// Emitted once token has been initialized
    event Initialized(address owner, address AMORxGuild);

    /// @notice Initializes the IFXAMORxGuild contract
    /// @dev    Sets the token details as well as the required addresses for token logic
    /// @param  AMORxGuild the address of the AMORxGuild
    /// @param  name the token name (e.g AMORxIMPACT)
    /// @param  symbol the token symbol
    function init(
        string memory name,
        string memory symbol,
        address initOwner,
        IERC20 AMORxGuild
    ) external;

    /// @notice Stake AMORxGuild and receive FXAMORxGuild in return
    /// @dev    Front end must still call approve() on AMORxGuild token to allow transferFrom()
    /// @param  to a parameter just like in doxygen (must be followed by parameter name)
    /// @param  amount uint256 amount of AMORxGuild to be staked
    /// @return uint256 the amount of AMORxGuild received from staking
    function stake(address to, uint256 amount) external returns (uint256);

    /// @notice Burns FXAMORxGuild tokens if they are being used for voting
    /// @dev When this tokens are burned, staked AMORxGuild is being transfered
    //       to the controller(contract that has a voting function)
    /// @param  whoUsedDelegated who used delegeted tokens that we must burn first
    ///         whoUsedDelegated = account by default
    /// @param  account address from which must burn tokens
    /// @param  amount uint256 representing amount of burning tokens
    function burn(
        address whoUsedDelegated,
        address account,
        uint256 amount
    ) external;

    /// @notice Allows some external account to vote with your FXAMORxGuild tokens
    /// @param  to address to which delegate users FXAMORxGuild
    /// @param  amount uint256 representing amount of delegating tokens
    function delegate(address to, uint256 amount) external;

    /// @notice Unallows some external account to vote with your delegated FXAMORxGuild tokens
    /// @param  account address from which delegating will be taken away
    /// @param  amount uint256 representing amount of undelegating tokens
    function undelegate(address account, uint256 amount) external;

    /// @notice Transfers FXAMORxGuild tokens if they are being used for voting
    /// @param  amount uint256 representing amount of tokens to transfer to controller(contract that has a voting function)
    function withdraw(uint256 amount) external;

    /// @notice Get delegators value
    function delegators(address user, uint256 index) external returns (address);

    /// @notice Get delegations value
    function delegations(address from, address to) external returns (uint256);

    /// @notice Get amountDelegated value
    function amountDelegated(address user) external returns (uint256);

    /// @notice Get amountDelegatedAvailable value
    function amountDelegatedAvailable(address user) external returns (uint256);
}
