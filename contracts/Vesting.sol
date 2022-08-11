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

/// Access controls
import "@openzeppelin/contracts/access/Ownable.sol";
/// Interfaces
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./utils/interfaces/IdAMORxGuild.sol";

contract Vesting is Ownable {
    /// Struct containing allocation details
    struct Allocation {
        uint256 tokensAllocated;
        uint256 cliff;
        uint256 vestingDate;
        uint256 tokensClaimed;
    }

    uint256 public tokensAllocated;
    address public constant SENTINAL = address(0x1);
    address public sentinalOwner;
    
    /// Address mapping to keep track of the sentinal owner
    /// Initialized as `SENTINAL`, updated in `allocateVestedTokens`
    mapping(address => address) internal sentinalOwners;
    /// Linked list of all the beneficiaries
    mapping(address => address) public beneficiaries;
    /// Mapping of beneficiary address to Allocation
    mapping(address => Allocation) public allocations;
    
    /// Tokens
    IdAMORxGuild public dAMOR;
    IERC20 public amorToken;

    /// Contract creation time (for vesting logic)
    uint256 public immutable VESTING_START;

    /// Custom errors
    /// The target has already been allocated an initial vesting amount
    error AlreadyAllocated();
    /// Not enough unallocated dAMOR to complete this allocation
    error InsufficientFunds();
    /// The transfer returned `false`
    error TransferUnsuccessful();
    /// Invalid vesting date
    error InvalidDate();
    /// Beneficiary not found
    error NotFound();
    /// The tokens haven't vested with the beneficiary yet (cliff not yet reached)
    error NotVested();

    constructor(address metaDao, address amor, address dAmor) {
        transferOwnership(metaDao);
        dAMOR = IdAMORxGuild(dAmor);
        amorToken = IERC20(amor);
        sentinalOwner = address(0);
        beneficiaries[sentinalOwner] = SENTINAL;
        VESTING_START = block.timestamp;
    }

    /// @notice Receives AMOR and stakes it in the dAMOR contract
    /// @dev    Requires approval of AMOR amount prior to calling
    /// @param  amount of AMOR to be transferred to this contract
    function lockAMOR(uint256 amount) external {
        if (amorToken.transferFrom(msg.sender, address(this), amount) == false) {
        revert TransferUnsuccessful();
        }
    }

    /// @notice Allows a beneficiary to withdraw AMOR that has accrued to it
    /// @dev    Converts dAMOR to AMOR and transfers it to the beneficiary
    /// @param  amount the amount of dAMOR to convert to AMOR
    function withdrawAmor(uint256 amount) external {
        if (amount > tokensAvailable(msg.sender)) {
            revert InsufficientFunds();
        }
        Allocation storage allocation = allocations[msg.sender];

        if (allocation.cliff > block.timestamp) {
            revert NotVested();
        }
        
        /// Update internal balances
        allocation.tokensClaimed -= amount;
        /// Withdraw the AMOR from the staking contract
        uint256 amountReturned = amorToken.balanceOf(address(this));
        dAMOR.withdraw();
        amountReturned = amorToken.balanceOf(address(this)) - amountReturned;
        /// Transfer the AMOR to the caller
        if (!amorToken.transfer(msg.sender, amountReturned)) {
            revert TransferUnsuccessful();
        }
    }

    /// @notice Returns the amount of vested tokens allocated to the target
    /// @param  target the address of the beneficiary
    /// @return the amount of dAMOR allocated to the target address
    function balanceOf(address target) external view returns(uint256) {
        return allocations[target].tokensAllocated;
    }

    /// @notice Allocates dAMOR to a target beneficiary
    /// @dev    Can only be called by the MetaDAO
    /// @param  target the beneficiary to which tokens should vest
    /// @param  amount the amount of dAMOR to allocate to the tartget beneficiary
    /// @param  cliff the date at which tokens become claimable. `0` for no cliff.
    /// @param  vestingDate the date at which all the tokens have vested in the beneficiary
    function allocateVestedTokens(
        address target,
        uint256 amount,
        uint256 cliff,
        uint256 vestingDate
    ) external {
        /// Check that there are enough unallocated tokens
        if (amorToken.balanceOf(address(this)) < tokensAllocated + amount) {
            revert InsufficientFunds();
        }
        /// Create the new struct and add it to the mapping
        _setAllocationDetail(target, amount, cliff, vestingDate);
        /// Add the amount to the tokensAllocated;
        tokensAllocated += amount;
        /// Add the beneficiary to the beneficiaries linked list if it doesn't exist yet
        if (beneficiaries[target] == address(0)) {
            beneficiaries[sentinalOwner] = target;
            beneficiaries[target] = SENTINAL;
            sentinalOwner = target;
        }
    }

    /// @notice Modifies an existing allocation
    /// @param  target the beneficiary to which tokens should vest
    /// @param  amount the amount of AMOR to allocate to the tartget beneficiary
    /// @param  cliff the date at which tokens become claimable. `0` for no cliff.
    /// @param  vestingDate the date at which all the tokens have vested in the beneficiary
    function modifyAllocation(
        address target,
        uint256 amount,
        uint256 cliff,
        uint256 vestingDate
    ) external {
        if (beneficiaries[target] == address(0)) {
            revert NotFound();
        }
        if (allocations[target].cliff > cliff || allocations[target].vestingDate > vestingDate) {
            revert InvalidDate();
        }
        _setAllocationDetail(target, amount, cliff, vestingDate);
    }

    /// @notice Calculates the number of dAMOR accrued to a given beneficiary
    /// @dev    For a given beneficiary calculates the amount of dAMOR by using the vesting date
    /// @param  beneficiary the address for which the calcuation is done
    /// @return amount of tokens claimable by the beneficiary address
    function tokensAvailable(address beneficiary) public view returns(uint256) {
        if (beneficiaries[beneficiary] == address(0)) {
            revert NotFound();
        }
        Allocation storage allocation = allocations[beneficiary];
        uint256 amount = allocation.tokensAllocated * ((block.timestamp - VESTING_START) / (allocation.vestingDate - VESTING_START));
        return amount - allocation.tokensClaimed;
    }

    function _setAllocationDetail(
        address target,
        uint256 amount,
        uint256 cliff,
        uint256 vestingDate
        ) internal {
        Allocation storage allocation = allocations[target];
        allocation.cliff = cliff;
        allocation.tokensAllocated += amount;
        allocation.vestingDate = vestingDate;
        allocation.cliff = cliff;
        }
}
