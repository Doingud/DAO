// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

/**
 * @title  DoinGud: Vesting.sol
 * @author Daoism Systems
 * @notice Vesting Contract Implementation for DoinGudDAO
 * @custom:security-contact arseny@daoism.systems || konstantin@daoism.systems
 * @dev Implementation of the Vesting Mechanics for DoinGud
 *
 * The Vesting Contract allows DoinGud to reward early contributors with staked dAMOR.
 * In addition, the contract allows for additional staking of AMOR for contributors.
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

contract Vesting {
    /// @notice Delegates vested tokens to another address for voting
    /// @dev    Calls `delegate` on the dAMOR contract
    /// @param  delegatee address to which voting rights are delegated
    /// @param  amount the amount of votes to allocate to the target address
    function delegate(address delegatee, uint256 amount) external {}

    /// @notice Undelegates vested token allocations from a target address
    /// @dev    Calls `undelegate` on the dAMOR contract
    /// @param  delegatee the address to which votes have been delegated
    /// @param  amount the amount of votes to undelegate
    function undelegate(address delegatee, uint256 amount) external {}

    /// @notice Allows a beneficiary to withdraw dAMOR that has accrued to it
    /// @dev    Removes dAMOR from the vesting contract and allocates it to the beneficiary
    /// @param  amount the amount of dAMOR to withdraw
    function withdraw(uint256 amount) external {}

    /// @notice Allows a beneficiary to withdraw AMOR that has accrued to it
    /// @dev    Converts dAMOR to AMOR and transfers it to the beneficiary
    /// @param  amount the amount of dAMOR to convert to AMOR
    function withdrawAmor(uint256 amount) external {}

    /// @notice Allocates dAMOR to a target beneficiary
    /// @dev    Can only be called by the MetaDAO
    /// @param  target the beneficiary to which tokens should vest
    /// @param  amount the amount of dAMOR to allocate to the tartget beneficiary
    /// @param  vestingDate the date at which all the tokens have vested in the beneficiary
    function allocateVestedTokens(
        address target,
        uint256 amount,
        uint256 vestingDate
    ) external {}

    /// @notice Allocates dAMOR to a target beneficiary after contract initialization
    /// @dev    Receives AMOR which is staked to receive dAMOR
    /// @param  target the address of the beneficiary to which tokens must be allocated
    /// @param  amount the amount of AMOR to allocate to the target
    /// @param  cliff the date, in seconds, at which the target can start claiming their allocationa
    /// @param  vestingDate the date, in seconds, at which the target's tokens have fully vested
    function vestAdditionalTokens(
        address target,
        uint256 amount,
        uint256 cliff,
        uint256 vestingDate
    ) external {}

    /// @notice Modifies a target beneficiary's vesting date
    /// @dev    This changes the rate at which tokens vest for the target
    /// @param  target the beneficiary address
    /// @param  newVestingDate the new date, in seconds, when the beneficiary's tokens must have been fully vested
    function changeTargetVestingDate(address target, uint256 newVestingDate) external {}

    /// @notice Modifies the amount of tokens that a beneficiary has been allocated
    /// @dev    Cannot be less than already claimed
    /// @param  target the address of the beneficiary which must be modified
    /// @param  newTargetAllocation the amount of dAMOR allocated to the target
    function changeVestingAmount(address target, uint256 newTargetAllocation) external {}
}
