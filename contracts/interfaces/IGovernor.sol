// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

/**
 * @title   DoinGud: IGovernor.sol
 * @author  Daoism Systems
 * @notice  Governor Interface for DoinGud Guilds
 * @custom:security-contact arseny@daoism.systems || konstantin@daoism.systems
 * @dev     IGovernor IERC165 Pattern
 *
 * Governor contract will allow to Guardians to add and vote for the proposals
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

interface IDoinGudGovernor {
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Expired
    }

    /// @notice Initializes the Governor contract
    /// @param  AMORxGuild_ the address of the AMORxGuild token
    /// @param  avatarAddress_ the address of the Avatar
    /// @param  initialGuardian the useer responsible for the initial guardian actions
    function init(
        address AMORxGuild_,
        address avatarAddress_,
        address initialGuardian
    ) external;

    /// @notice this function resets guardians array, and adds new guardian to the system.
    /// @param arrGuardians The array of guardians
    function setGuardians(address[] memory arrGuardians) external;

    /// @notice this function adds new guardian to the system
    /// @param guardian New guardian to be added
    function addGuardian(address guardian) external;

    /// @notice this function removes choosed guardian from the system
    /// @param guardian Guardian to be removed
    function removeGuardian(address guardian) external;

    /// @notice this function changes guardian as a result of the vote (propose function)
    /// @param current Current vote value
    /// @param newGuardian Guardian to be changed
    function changeGuardian(uint256 current, address newGuardian) external;

    /// @notice this function will add a proposal for a guardians(from the AMORxGuild token) vote.
    /// Only Avatar(as a result of the Snapshot) contract can add a proposal for voting.
    /// Proposal execution will happen through the Avatar contract
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas
    ) external returns (uint256);

    /// @notice function allows guardian to vote for the proposal
    /// Proposal should achieve at least 20% approval of guardians, to be accepted
    /// @dev Internal vote casting mechanism: Check that the vote is pending, that it has not been cast yet
    /// @param proposalId ID of the proposal
    /// @param support Boolean value: true (for) or false (against) user is voting
    function castVote(uint256 proposalId, bool support) external;

    /// @notice function allows anyone to execute specific proposal, based on the vote.
    /// @param targets Target addresses for proposal calls
    /// @param values AMORxGuild values for proposal calls
    /// @param calldatas Calldatas for proposal calls
    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas
    ) external returns (uint256);

    /// @notice function allows anyone to check state of the proposal
    /// @param proposalId id of the proposal
    function state(uint256 proposalId) external view returns (ProposalState);

    /// @notice function allows guardian to vote for cancelling the proposal
    /// Proposal should achieve at least 20% approval of guardians, to be cancelled
    /// @param proposalId ID of the proposal
    function castVoteForCancelling(uint256 proposalId) external;

    /// @notice Cancels a proposal
    /// @param proposalId The id of the proposal to cancel
    function cancel(uint256 proposalId) external;

    function votingDelay() external view returns (uint256);

    function votingPeriod() external view returns (uint256);

    function hashProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas
    ) external returns (uint256);
}
