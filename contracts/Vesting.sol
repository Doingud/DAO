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

/// Imports
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Vesting is Ownable {
    /// Struct containing allocation details
    struct Allocation {
        uint256 tokensAllocated;
        uint256 vestingStart;
        uint256 cliff;
        uint256 vestingDate;
        uint256 tokensClaimed;
    }

    uint256 public tokensAllocated;
    uint256 public tokensWithdrawn;

    /// Mapping of beneficiaries
    mapping(address => bool) public beneficiaries;
    /// Mapping of beneficiary address to Allocation
    mapping(address => Allocation) public allocations;

    /// Tokens
    IERC20 public amorToken;

    ///Events
    event AmorWithdrawn(address to, uint256 amount);

    /// Custom errors
    /// The target has already been allocated an initial vesting amount
    error AlreadyAllocated();
    /// Invalid dates provided for either `cliff`, `vestingStart` or `vestingDate`
    error InvalidDate();
    /// Not enough unallocated dAMOR to complete this allocation
    error InsufficientFunds();
    /// The transfer returned `false`
    error TransferUnsuccessful();
    /// Beneficiary not found
    error NotFound();
    /// The tokens haven't vested with the beneficiary yet (cliff not yet reached)
    error NotVested();

    constructor(address metaDao, IERC20 amor) {
        transferOwnership(metaDao);
        amorToken = amor;
    }

    /// @notice Allows a beneficiary to withdraw AMOR that has accrued to it
    /// @dev    Converts dAMOR to AMOR and transfers it to the beneficiary
    /// @param  amount The amount of dAMOR to convert to AMOR
    function withdrawAmor(uint256 amount) external {
        if (amount > tokensAvailable(msg.sender)) {
            revert InsufficientFunds();
        }

        Allocation storage allocation = allocations[msg.sender];

        /// Update internal balances
        allocation.tokensClaimed += amount;
        tokensWithdrawn += amount;

        /// Transfer the AMOR to the caller
        amorToken.transfer(msg.sender, amount);
        emit AmorWithdrawn(msg.sender, amount);
    }

    /// @notice Returns the amount of vested tokens allocated to the target
    /// @param  target The address of the beneficiary
    /// @return uint256 The amount of dAMOR allocated to the target address
    function balanceOf(address target) external view returns (uint256) {
        /// The voting weight of the beneficiaries can be set here
        return allocations[target].tokensAllocated - allocations[target].tokensClaimed;
    }

    /// @notice Allocates dAMOR to a target beneficiary
    /// @dev    Can only be called by the MetaDAO
    /// @param  target The beneficiary to which tokens should vest
    /// @param  amount The amount of dAMOR to allocate to the tartget beneficiary
    /// @param  cliff The date at which tokens become claimable. `0` for no cliff.
    /// @param  vestingDate The date at which all the tokens have vested in the beneficiary
    function allocateVestedTokens(
        address target,
        uint256 amount,
        uint256 cliff,
        uint256 vestingStart,
        uint256 vestingDate
    ) external onlyOwner {
        if (beneficiaries[target]) {
            revert AlreadyAllocated();
        }

        /// Add the beneficiary
        beneficiaries[target] = true;
        /// Create the new struct and add it to the mapping
        _setAllocationDetail(target, amount, cliff, vestingStart, vestingDate);
    }

    /// @notice Modifies an existing allocation
    /// @dev Cannot modify `amount` lower (trust concerns)
    /// @param target The beneficiary to which tokens should vest
    /// @param amount The amount of additional AMOR to allocate to the tartget beneficiary
    function modifyAllocation(address target, uint256 amount) external onlyOwner {
        if (!beneficiaries[target]) {
            revert NotFound();
        }

        _setAllocationDetail(
            target,
            amount,
            allocations[target].cliff,
            allocations[target].vestingStart,
            allocations[target].vestingDate
        );
    }

    /// @notice Calculates the number of AMOR accrued to a given beneficiary
    /// @dev For a given beneficiary calculates the amount of AMOR by using the vesting date
    /// @param beneficiary the address for which the calcuation is done
    /// @return amount of tokens claimable by the beneficiary address
    function tokensAvailable(address beneficiary) public view returns (uint256) {
        if (!beneficiaries[beneficiary]) {
            revert NotFound();
        }

        /// Point to the Allocation
        Allocation storage allocation = allocations[beneficiary];

        /// Have all the tokens vested? If so, return the tokens allocated
        if (allocation.vestingDate <= block.timestamp) {
            return allocation.tokensAllocated - allocation.tokensClaimed;
        }

        if (allocation.cliff > block.timestamp) {
            revert NotVested();
        }

        uint256 amount = (allocation.tokensAllocated * (block.timestamp - allocation.vestingStart)) /
            (allocation.vestingDate - allocation.vestingStart);

        return amount - allocation.tokensClaimed;
    }

    /// @notice Calculated the amount of AMOR that hasn't been allocated yet
    /// @return unallocatedAmor The amount of AMOR that has been vested but not allocated yet
    function unallocatedAMOR() public view returns (uint256) {
        return amorToken.balanceOf(address(this)) + tokensWithdrawn - tokensAllocated;
    }

    /// @notice Allows the MetaDAO to set allocations
    /// @param  target The address of the target on whose behalf tokens are vested
    /// @param  amount The amount of AMOR tokens vested on the target's behalf
    /// @param  cliff The unix date upon which the target can claim their accumalated tokens
    /// @param  vestingDate The unix date upon which all the tokens should have been claimable
    function _setAllocationDetail(
        address target,
        uint256 amount,
        uint256 cliff,
        uint256 vestingStart,
        uint256 vestingDate
    ) internal {
        /// Check there is enough unallocated AMOR
        if (unallocatedAMOR() < amount) {
            revert InsufficientFunds();
        }

        if (
            cliff > vestingDate || vestingStart > vestingDate || cliff < vestingStart || vestingStart < block.timestamp
        ) {
            revert InvalidDate();
        }

        /// Create the storage pointer and set details
        Allocation storage allocation = allocations[target];
        allocation.cliff = cliff;
        /// vestingStart cannot be modified once set
        if (allocation.vestingStart == 0) {
            allocation.vestingStart = vestingStart;
        }

        allocation.tokensAllocated += amount;
        allocation.vestingDate = vestingDate;
        allocation.cliff = cliff;

        /// Add the amount to the tokensAllocated;
        tokensAllocated += amount;
    }
}
