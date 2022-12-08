// SPDX-License-Identifier: MIT

/// @title  DoinGud dAMORxGuild Interface
/// @author Daoism Systems Team

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

interface IdAMORxGuild {
    /// Errors
    /// No tokens to undelegate
    error NoDelegation();
    /// Staking time provided is less than minimum
    error TimeTooSmall();
    /// Staking time provided is larger than maximum
    error TimeTooBig();
    /// There are still delegated tokens
    error TokensDelegated();
    /// Array parity mismatch
    error ArrayMismatch();

    // Events
    event Initialized(address owner, address AMORxGuild, uint256 amount);
    event AMORxGuildStakedToDAMOR(
        address indexed from,
        uint256 amount,
        uint256 mintAmount,
        uint256 indexed timeStakedFor
    );
    event AMORxGuildStakeIncreasedToDAMOR(
        address indexed from,
        uint256 amount,
        uint256 mintAmount,
        uint256 indexed timeStakedFor
    );
    event AMORxGuildWithdrawnFromDAMOR(address indexed to, uint256 burnedDAMORxGuild, uint256 returnedAMORxGuild);
    event dAMORxGuildUndelegated(address indexed from, address indexed owner, uint256 amount);
    event dAMORxGuildDelegated(address indexed to, address indexed owner, uint256 amount);

    struct Stakes {
        uint256 stakesTimes; // time staked for
        uint256 stakesAMOR; // all staker balance in AMORxGuild
    }

    /// @dev The init() function takes the place of the constructor.
    /// It can only be run once.
    function init(
        string memory name,
        string memory symbol,
        address initOwner,
        address _AMORxGuild,
        uint256 amount
    ) external;

    /// @notice Stakes AMORxGuild and receive dAMORxGuild in return
    /// Receives ERC20 AMORxGuild tokens, which are getting locked
    /// and generate dAMORxGuild tokens in return.
    /// Note: Tokens are minted following the formula
    /// @dev Front end must still call approve() on AMORxGuild token to allow transferFrom()
    /// @param  amount The amount of AMORxGuild/AMOR to be staked
    /// @param  time The period of time (in seconds) to stake for
    /// @return uint256 The amount of dAMORxGuild received from staking
    function stake(uint256 amount, uint256 time) external returns (uint256);

    /// @notice Increases stake of already staken AMORxGuild and receive dAMORxGuild in return
    /// @dev    Frontend must still call approve() on AMORxGuild token to allow transferFrom()
    /// @param  amount uint256 amount of dAMOR to be staked
    /// @return uint256 The amount of dAMORxGuild received from staking
    function increaseStake(uint256 amount) external returns (uint256);

    /// @notice Withdraws AMORxGuild tokens; burns dAMORxGuild
    /// @dev When this tokens are burned, staked AMORxGuild is being transfered
    ///      to the controller(contract that has a voting function)
    /// @return dAMORxGuildBurned amount of dAmorXGuild tokens burned
    /// @return AMORxGuildUnstaked amount of AMORxGuild tokens unstaked
    function withdraw() external returns (uint256 dAMORxGuildBurned, uint256 AMORxGuildUnstaked);

    /// @notice Delegate your dAMORxGuild to the address `account`
    /// @param to Address to which delegate users FXAMORxGuild
    /// @param amount The amount of tokens to delegate
    function delegate(address[] calldata to, uint256[] calldata amount) external;

    /// @notice Undelegate all of your dAMORxGuild
    /// @param delegatees Array of addresses delegated to
    function undelegate(address[] calldata delegatees) external;

    /// @notice Undelegates and withdraws staked AMORxGuild in one transaction
    /// @param delegatees Array of addresses delegated to
    /// @return dAMORxGuildBurned amount of dAmorXGuild tokens burned
    /// @return AMORxGuildUnstaked amount of AMORxGuild tokens unstaked
    function undelegateAndWithdraw(address[] calldata delegatees)
        external
        returns (uint256 dAMORxGuildBurned, uint256 AMORxGuildUnstaked);
}
