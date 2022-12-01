// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

/**
 * @title   DoinGud: Governor.sol
 * @author  Daoism Systems
 * @notice  Governor Implementation for DoinGud Guilds
 * @custom:security-contact security@daoism.systems
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
import "./interfaces/IAvatarxGuild.sol";
import "./interfaces/IDoinGudGovernor.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

contract DoinGudGovernor is IDoinGudGovernor, Initializable {
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 private constant _PROPOSAL_MAX_OPERATIONS = 10;

    address private _avatar;
    uint96 private _votingDelay;
    uint96 private _votingPeriod;
    uint256 private _guardiansLimit; // Until this limit is reached, governor contract will only be able to execute decisions to add more guardians to itself.

    mapping(uint256 => Proposal) private _proposals;

    uint256 private _setIndex;
    EnumerableSet.AddressSet[] private _guardians;

    /// @notice This modifier is needed to validate that amount of the Guardians is sufficient to vote and approve the “Many” decision
    modifier guardianLimitReached() {
        if (EnumerableSet.length(_guardians[_setIndex]) < _guardiansLimit) {
            revert NotEnoughGuardians();
        }
        _;
    }

    /// @notice Access control: Avatar for this guild
    modifier onlyAvatar() {
        if (msg.sender != _avatar) {
            revert Unauthorized();
        }
        _;
    }

    /// @notice Access control: Guild Guardian
    modifier onlyGuardian() {
        if (!isGuardian(msg.sender, _setIndex)) {
            revert Unauthorized();
        }
        _;
    }

    /// @inheritdoc IDoinGudGovernor
    function init(address avatar, address initialGuardian) external initializer {
        _avatar = avatar;
        _guardians.push();
        _addGuardian(initialGuardian);
        _changeVotingDelay(1);
        _changeVotingPeriod(2 weeks);
        _changeGuardiansLimit(1);
    }

    function getAvatar() external view returns (address) {
        return _avatar;
    }

    function getNumberOfGuardians() external view returns(uint256) {
        return EnumerableSet.length(_guardians[_setIndex]);
    }

    /// @inheritdoc IDoinGudGovernor
    function getGuardiansLimit() external view returns (uint256) {
        return _guardiansLimit;
    }

    /// @inheritdoc IDoinGudGovernor
    function isGuardian(address guardian, uint256 setIndex) public view returns (bool) {
        return EnumerableSet.contains(_guardians[setIndex], guardian);
    }

    /// @inheritdoc IDoinGudGovernor
    function getSetIndex() external view returns (uint256) {
        return _setIndex;
    }

    /// @inheritdoc IDoinGudGovernor
    function setGuardians(address[] calldata guardians) external onlyAvatar {
        if (guardians.length == 0) {
            revert InvalidParameters();
        }

        _guardians.push();
        _setIndex++;

        // Add new guardians
        for (uint256 i; i < guardians.length; ++i) {
            _addGuardian(guardians[i]);
        }
    }

    /// @inheritdoc IDoinGudGovernor
    function addGuardian(address guardian) external onlyAvatar {
        _addGuardian(guardian);
    }
    
    /// @inheritdoc IDoinGudGovernor
    function removeGuardian(address guardian) external onlyAvatar {
        _removeGuardian(guardian);
    }

    /// @inheritdoc IDoinGudGovernor
    function changeGuardian(address currentGuardian, address newGuardian) external onlyAvatar {
        uint256 setIndex = _setIndex;
        if (isGuardian(newGuardian, setIndex) || !isGuardian(currentGuardian, setIndex)) {
            revert InvalidParameters();
        }

        _removeGuardian(currentGuardian);
        _addGuardian(newGuardian);

        emit GuardianChanged(currentGuardian, newGuardian);
    }

    /// @inheritdoc IDoinGudGovernor
    function changeGuardiansLimit(uint256 limit) external onlyAvatar {
        _changeGuardiansLimit(limit);
    }

    /// @inheritdoc IDoinGudGovernor
    function propose(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas
    ) external onlyAvatar guardianLimitReached returns (uint256) {
        if (!(targets.length == values.length && targets.length == calldatas.length)) {
            revert InvalidParameters();
        }

        if (targets.length == 0) {
            revert InvalidParameters();
        }

        if (targets.length > _PROPOSAL_MAX_OPERATIONS) {
            revert InvalidParameters();
        }

        /// Submit proposals uniquely identified by a proposalId and an array of txHashes,
        /// to create a Reality.eth question that validates the execution of the connected transactions
        uint256 proposalId = hashProposal(targets, values, calldatas);

        Proposal storage proposal = _proposals[proposalId];
        if (proposal.voteStart != 0) {
            revert InvalidState();
        }

        uint96 snapshot = uint96(block.timestamp + _votingDelay);
        uint96 deadline = snapshot + _votingPeriod;

        proposal.voteStart = snapshot;
        proposal.voteEnd = deadline;

        emit ProposalCreated(
            proposalId,
            msg.sender, // proposer
            targets,
            values,
            calldatas,
            snapshot,
            deadline
        );

        return proposalId;
    }

    /// @inheritdoc IDoinGudGovernor
    function castVote(uint256 proposalId) external onlyGuardian guardianLimitReached {
        Proposal storage proposal = _proposals[proposalId];

        if (_state(proposal) != ProposalState.Active) {
            revert InvalidState();
        }

        // If we can't add voter to voters set
        // that means that he already voted
        if (!EnumerableSet.add(proposal.voters, msg.sender)) {
            revert AlreadyVoted();
        }

        proposal.votesCount++;
        emit VotedFor(proposalId, msg.sender);
    }

    /// @inheritdoc IDoinGudGovernor
    function execute(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas
    ) external guardianLimitReached returns (uint256) {
        uint256 proposalId = hashProposal(targets, values, calldatas);
        Proposal storage proposal = _proposals[proposalId];

        if (_state(proposal) != ProposalState.Succeeded) {
            revert InvalidState();
        }

        _resetVotersSet(proposal);
        _resetCancelersSet(proposal);
        delete _proposals[proposalId];

        for (uint256 i = 0; i < targets.length; ++i) {
            bool success = IAvatarxGuild(_avatar).executeProposal(targets[i], values[i], calldatas[i]);
            if (!success) {
                revert UnderlyingTransactionReverted();
            }
        }

        emit ProposalExecuted(proposalId);

        return proposalId;
    }

    /// @inheritdoc IDoinGudGovernor
    function state(uint256 proposalId) public view returns (ProposalState) {
        return _state(_proposals[proposalId]);
    }

    function getProposalEnd(uint256 proposalId) external view returns (uint256) {
        return _proposals[proposalId].voteEnd;
    }

    function getProposalVotesCount(uint256 proposalId) external view returns (uint256) {
        return _proposals[proposalId].votesCount;
    }

    function getProposalCancelVotesCount(uint256 proposalId) external view returns (uint256) {
        return _proposals[proposalId].cancelVotesCount;
    }

    function getProposalVoteStart(uint256 proposalId) external view returns (uint256) {
        return _proposals[proposalId].voteStart;
    }

    /// @inheritdoc IDoinGudGovernor
    function castVoteForCancelling(uint256 proposalId) external onlyGuardian {
        Proposal storage proposal = _proposals[proposalId];

        if (_state(proposal) != ProposalState.Active) {
            revert InvalidState();
        }

        // If we can't add voter to voters set
        // that means that he already voted
        if (!EnumerableSet.add(proposal.cancelVoters, msg.sender)) {
            revert AlreadyVoted();
        }

        proposal.cancelVotesCount++;
        emit VoteForCancelling(proposalId, msg.sender);

        // If 20% of all guardians vote for cancel, cancel it
        if (proposal.cancelVotesCount > ((20 * EnumerableSet.length(_guardians[_setIndex])) / 100)) {
            _cancelProposal(proposal, proposalId);
        }
    }

    /// @inheritdoc IDoinGudGovernor
    function changeVotingDelay(uint96 votingDelay) external onlyAvatar {
        _changeVotingDelay(votingDelay);
    }

    /// @inheritdoc IDoinGudGovernor
    function changeVotingPeriod(uint96 votingPeriod) external onlyAvatar {
        _changeVotingPeriod(votingPeriod);
    }

    /// @inheritdoc IDoinGudGovernor
    function votingDelay() external view returns (uint256) {
        return _votingDelay;
    }
    
    /// @inheritdoc IDoinGudGovernor
    function votingPeriod() external view returns (uint256) {
        return _votingPeriod;
    }

    /// @inheritdoc IDoinGudGovernor
    function hashProposal(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas
    ) public pure returns (uint256) {
        return uint256(keccak256(abi.encode(targets, values, calldatas)));
    }

    function _cancelProposal(Proposal storage proposal, uint256 proposalId) private {
        _resetVotersSet(proposal);
        _resetCancelersSet(proposal);
        delete _proposals[proposalId];
        emit ProposalCanceled(proposalId);
    }

    function _changeVotingDelay(uint96 votingDelay) private {
        _votingDelay = votingDelay;
        emit VotingDelayChanged(_votingDelay);
    }

    function _changeVotingPeriod(uint96 votingPeriod) private {
        _votingPeriod = votingPeriod;
        emit VotingPeriodChanged(votingPeriod);
    }

    function _addGuardian(address guardian) private {
        if (guardian == address(0)) {
            revert InvalidGuardian();
        }
        uint256 setIndex = _setIndex;

        if (EnumerableSet.length(_guardians[setIndex]) > _guardiansLimit) {
            revert InvalidParameters();
        }

        // Only if new guardian is added emit an event
        if (EnumerableSet.add(_guardians[setIndex], guardian)) {
            emit GuardianAdded(guardian);
        }
    }

    function _changeGuardiansLimit(uint256 limit) private {
        _guardiansLimit = limit;
        emit ChangedGuardiansLimit(limit);
    }

    function _removeGuardian(address guardian) private {
        if (EnumerableSet.remove(_guardians[_setIndex], guardian)) {
            emit GuardianRemoved(guardian);
        }
    }

    function _state(Proposal storage proposal) private view returns (ProposalState) {
        if (proposal.voteStart == 0) {
            revert InvalidProposalId();
        }

        if (proposal.voteStart >= block.timestamp) {
            return ProposalState.Pending;
        }

        if (proposal.voteEnd >= block.timestamp) {
            return ProposalState.Active;
        }

        uint256 numberOfGuardians = EnumerableSet.length(_guardians[_setIndex]);
        // 20% of all guardians is vote trehshold
        if (proposal.votesCount < ((20 * numberOfGuardians) / 100)) {
            return ProposalState.Defeated;
        }

        // Over the treshold
        return ProposalState.Succeeded;
    }

    function _resetVotersSet(Proposal storage proposal) private {
        uint256 votersLength = EnumerableSet.length(proposal.voters);

        for (uint256 i; i < votersLength; ++i) {
            address voter = EnumerableSet.at(proposal.voters, 0);
            EnumerableSet.remove(proposal.voters, voter);
        }
    }

    function _resetCancelersSet(Proposal storage proposal) private {
        uint256 votersLength = EnumerableSet.length(proposal.cancelVoters);

        for (uint256 i; i < votersLength; ++i) {
            address voter = EnumerableSet.at(proposal.cancelVoters, 0);
            EnumerableSet.remove(proposal.cancelVoters, voter);
        }
    }
}
