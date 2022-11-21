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
import "./interfaces/IGovernor.sol";

import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DoinGudGovernor is IDoinGudGovernor {
    using SafeCast for uint256;

    struct ProposalCore {
        uint96 voteStart;
        uint96 voteEnd;
        bool executed;
        bool canceled;
    }

    event ProposalCanceled(uint256 proposalId);
    event ProposalExecuted(uint256 proposalId);

    uint256 public constant PROPOSAL_MAX_OPERATIONS = 10;
    mapping(uint256 => ProposalCore) private _proposals;
    mapping(uint256 => uint256) public proposalCancelApproval;
    mapping(uint256 => address[]) public cancellers; // cancellers mapping(uint proposal => address [] voters)

    // id in array --> Id of passed proposal from _proposals
    uint256[] public proposals; // it’s an array of proposals hashes to execute.
    // After proposal was voted for, an !executor provides a complete data about the proposal!,
    // which gets hashed and if hashes correspond, then the proposal is executed.

    mapping(uint256 => address[]) public voters; // voters mapping(uint proposal => address [] voters)
    mapping(uint256 => uint256) public proposalVoting;
    mapping(uint256 => uint256) public proposalWeight;

    uint256 public guardiansLimit; // amount of guardians for contract to function propperly,
    // until this limit is reached, governor contract will only be able to execute decisions to add more guardians to itself.

    //address[] public guardians; // this is an array guardians who are allowed to vote for the proposals.
    //mapping(address => uint256) public weights; // weight of each specific guardian
    /// input (version, address) => true
    mapping(bytes32 => bool) public guardians;
    uint256 public currentGuardianVersion;
    uint256 public guardiansCounter;

    address public avatarAddress;
    IERC20 private AMORxGuild;

    event Initialized(address avatarAddress);
    event ProposalCreated(
        uint256 indexed proposalId,
        address proposer,
        address[] targets,
        uint256[] values,
        bytes[] calldatas,
        uint256 startBlock,
        uint256 endBlock
    );
    event ChangedGuardiansLimit(uint256 newLimit);
    event GuardiansSet(address[] arrGuardians);
    event GuardianAdded(address newGuardian);
    event GuardianRemoved(address guardian);
    event GuardianChanged(address oldGuardian, address newGuardian);
    event Voted(uint256 proposalId, bool support, address votedGuardian);

    bool private _initialized;

    uint96 private _votingDelay;
    uint96 private _votingPeriod;

    error InvalidProposalId();
    error AlreadyInitialized();
    error NotEnoughGuardians();
    error Unauthorized();
    error InvalidParameters();
    error InvalidAmount();
    error InvalidState();
    error ProposalNotExists();
    error VotingTimeExpired();
    error AlreadyVoted();
    error CancelNotApproved();
    error UnderlyingTransactionReverted();
    error DuplicateAddress();

    /// @notice Initializes the Governor contract
    /// @param  AMORxGuild_ the address of the AMORxGuild token
    /// @param  avatarAddress_ the address of the Avatar
    /// @param  initialGuardian the user responsible for the guardian actions
    function init(
        address AMORxGuild_,
        address avatarAddress_,
        address initialGuardian
    ) external returns (bool) {
        if (_initialized) {
            revert AlreadyInitialized();
        }
        // person who inflicted the creation of the contract is set as the only guardian of the system
        //guardians.push(initialGuardian);
        //weights[initialGuardian] = 1;
        guardians[_getGuardianKey(initialGuardian)] = true;
        guardiansCounter++;
        AMORxGuild = IERC20(AMORxGuild_);
        avatarAddress = avatarAddress_;

        _initialized = true;
        _votingDelay = 1;
        _votingPeriod = 2 weeks;
        guardiansLimit = 1;

        emit Initialized(avatarAddress_);
        return true;
    }

    /// @notice this modifier is needed to validate that amount of the Guardians is sufficient to vote and approve the “Many” decision
    modifier GuardianLimitReached() {
        if (guardiansCounter < guardiansLimit) {
            revert NotEnoughGuardians();
        }
        _;
    }

    modifier onlyAvatar() {
        if (msg.sender != avatarAddress) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyGuardian() {
        if (!isGuardian(msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    /// @notice Checks Guardian status
    /// @param  guardian Address to be checked
    /// @return bool Returns true if address is a Guardian
    function isGuardian(address guardian) public view returns (bool) {
        return guardians[_getGuardianKey(guardian)];
    }

    /// @notice this function resets guardians array, and adds new guardian to the system.
    /// @param arrGuardians The array of guardians
    function setGuardians(address[] memory arrGuardians) external onlyAvatar {
        // check that the array is not empty
        if (arrGuardians.length == 0) {
            revert InvalidParameters();
        }

        currentGuardianVersion++;
        delete guardiansCounter;
        for (uint256 i; i < arrGuardians.length; i++) {
            if (isGuardian(arrGuardians[i])) {
                revert DuplicateAddress();
            }
            guardians[_getGuardianKey(arrGuardians[i])] = true;
            guardiansCounter++;
        }

        emit GuardiansSet(arrGuardians);
    }

    /// @notice this function adds new guardian to the system
    /// @param guardian New guardian to be added
    function addGuardian(address guardian) public onlyAvatar {
        // check that guardian won't be added twice
        /*for (uint256 i = 0; i < guardians.length; i++) {
            if (guardian == guardians[i]) {
                revert InvalidParameters();
            }
        }
        guardians.push(guardian);
        weights[guardian] = 1; */
        if (isGuardian(guardian)) {
            revert InvalidParameters();
        }

        guardians[_getGuardianKey(guardian)] = true;
        guardiansCounter++;

        emit GuardianAdded(guardian);
    }

    /// @notice this function removes choosed guardian from the system
    /// @param guardian Guardian to be removed
    function removeGuardian(address guardian) external onlyAvatar {
/*        for (uint256 i = 0; i < guardians.length; i++) {
            if (guardians[i] == guardian) {
                guardians[i] = guardians[guardians.length - 1];
                guardians.pop();
                weights[guardian] = 0;
                break;
            }
        } */
        guardians[_getGuardianKey(guardian)] = false;
        guardiansCounter--;
        emit GuardianRemoved(guardian);
    }

    /// @notice this function changes guardian as a result of the vote (propose function)
    /// @param currentGuardian Guardian to be removed
    /// @param newGuardian Guardian to be added
    function changeGuardian(address currentGuardian, address newGuardian) external onlyAvatar {
        // check that guardian won't be added twice
/*        for (uint256 i = 0; i < guardians.length; i++) {
            if (newGuardian == guardians[i]) {
                revert InvalidParameters();
            }
        }
*/
        if (isGuardian(newGuardian) || !isGuardian(currentGuardian)) {
            revert InvalidParameters();
        }

        delete guardians[_getGuardianKey(currentGuardian)];
        guardians[_getGuardianKey(newGuardian)] = true;
        emit GuardianChanged(currentGuardian, newGuardian);
    }

    /// @notice this function changes guardians limit
    /// Should be passed to the Avatar as a Governor contract proposal
    /// @param newLimit New limit value
    function changeGuardiansLimit(uint256 newLimit) external onlyAvatar {
        guardiansLimit = newLimit;
        emit ChangedGuardiansLimit(newLimit);
    }

    /// @notice this function will add a proposal for a guardians(from the AMORxGuild token) vote.
    /// Only Avatar(as a result of the Snapshot) contract can add a proposal for voting.
    /// Proposal execution will happen through the Avatar contract
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas
    ) external onlyAvatar GuardianLimitReached returns (uint256) {
        if (!(targets.length == values.length && targets.length == calldatas.length)) {
            revert InvalidParameters();
        }
        if (targets.length == 0) {
            revert InvalidParameters();
        }
        if (targets.length > PROPOSAL_MAX_OPERATIONS) {
            revert InvalidParameters();
        }
        /// Submit proposals uniquely identified by a proposalId and an array of txHashes,
        /// to create a Reality.eth question that validates the execution of the connected transactions
        uint256 proposalId = hashProposal(targets, values, calldatas);

        ProposalCore storage proposal = _proposals[proposalId];
        if (proposal.voteStart != 0) {
            revert InvalidState();
        }

        uint96 snapshot = uint96(block.timestamp + _votingDelay);
        uint96 deadline = snapshot + _votingPeriod;

        proposal.voteStart = snapshot;
        proposal.voteEnd = deadline;

        proposalVoting[proposalId] = 0;
        proposalWeight[proposalId] = 0;

        _proposals[proposalId] = proposal;
        proposals.push(proposalId);

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

    /// @notice function allows guardian to vote for the proposal
    /// Proposal should achieve at least 20% approval of guardians, to be accepted
    /// @dev Internal vote casting mechanism: Check that the vote is pending, that it has not been cast yet
    /// @param proposalId ID of the proposal
    /// @param support Boolean value: true (for) or false (against) user is voting
    function castVote(uint256 proposalId, bool support) external onlyGuardian GuardianLimitReached {
        if (state(proposalId) != ProposalState.Active) {
            revert InvalidState();
        }

        for (uint256 i = 0; i < voters[proposalId].length; i++) {
            if (voters[proposalId][i] == msg.sender) {
                // this guardian already voted for this proposal
                revert AlreadyVoted();
            }
        }

        proposalWeight[proposalId] += 1;

        if (support == true) {
            proposalVoting[proposalId] += 1;
        }

        voters[proposalId].push(msg.sender);
        emit Voted(proposalId, support, msg.sender);
    }

    /// @notice function allows anyone to execute specific proposal, based on the vote.
    /// @param targets Target addresses for proposal calls
    /// @param values AMORxGuild values for proposal calls
    /// @param calldatas Calldatas for proposal calls
    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas
    ) external GuardianLimitReached returns (uint256) {
        uint256 proposalId = hashProposal(targets, values, calldatas);

        ProposalState status = state(proposalId);
        if (status != ProposalState.Succeeded) {
            revert InvalidState();
        }

        delete _proposals[proposalId];
        delete voters[proposalId];
        delete proposalVoting[proposalId];
        delete proposalWeight[proposalId];

        for (uint256 i = 0; i < targets.length; ++i) {
            bool success = IAvatarxGuild(avatarAddress).executeProposal(
                targets[i],
                values[i],
                calldatas[i],
                Enum.Operation.Call
            );
            if (!success) {
                revert UnderlyingTransactionReverted();
            }
        }

        emit ProposalExecuted(proposalId);

        return proposalId;
    }

    /// @notice function allows anyone to check state of the proposal
    /// @param proposalId id of the proposal
    function state(uint256 proposalId) public view returns (ProposalState) {
        ProposalCore storage proposal = _proposals[proposalId];

        if (proposal.voteStart == 0) {
            revert InvalidProposalId();
        }

        if (proposal.voteStart >= block.timestamp) {
            return ProposalState.Pending;
        }

        if (proposal.voteEnd >= block.timestamp) {
            return ProposalState.Active;
        }

        // Proposal should achieve at least 20% approval of all guardians, to be accepted.
        // Proposal should achieve at least 51% approval of voted guardians, to be accepted.
        if (
            (uint256(proposalVoting[proposalId] * 100) / (guardiansCounter) >= 20) &&
            (uint256(proposalVoting[proposalId] * 100) / proposalWeight[proposalId] >= 51)
        ) {
            return ProposalState.Succeeded;
        } else {
            return ProposalState.Defeated;
        }
    }

    /// @notice function allows guardian to vote for cancelling the proposal
    /// Proposal should achieve at least 20% approval of guardians, to be cancelled
    /// @param proposalId ID of the proposal
    function castVoteForCancelling(uint256 proposalId) external onlyGuardian {
        ProposalState state = state(proposalId);

        if (state != ProposalState.Active) {
            revert InvalidState();
        }

        for (uint256 i = 0; i < cancellers[proposalId].length; i++) {
            if (cancellers[proposalId][i] == msg.sender) {
                // this guardian already voted for this proposal
                revert AlreadyVoted();
            }
        }

        proposalCancelApproval[proposalId] += 1;

        cancellers[proposalId].push(msg.sender);
    }

    /// @notice Cancels a proposal
    /// @param proposalId The id of the proposal to cancel
    function cancel(uint256 proposalId) external {
        ProposalState status = state(proposalId);

        if (status != ProposalState.Active) {
            revert InvalidState();
        }

        // Proposal should achieve at least 20% approval for cancel from guardians, to be cancelled
        if (
            proposalCancelApproval[proposalId] < ((20 * guardiansCounter) / 100) ||
            proposalCancelApproval[proposalId] == 0
        ) {
            revert CancelNotApproved();
        }

        _proposals[proposalId].canceled = true;

        // clear mappings
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i] == proposalId) {
                proposals[i] = proposals[proposals.length - 1];
                proposals.pop();
                break;
            }
        }
        delete proposalWeight[proposalId];
        delete proposalVoting[proposalId];
        delete voters[proposalId];
        delete cancellers[proposalId];
        delete proposalCancelApproval[proposalId];
        delete _proposals[proposalId];

        emit ProposalCanceled(proposalId);
    }

    function votingDelay() external view returns (uint256) {
        return _votingDelay;
    }

    function votingPeriod() external view returns (uint256) {
        return _votingPeriod;
    }

    /// @notice Returns the unique proposal ID generated by the proposal params
    /// @param  targets array of proposed target addresses
    /// @param  values array of proposed transaction values
    /// @param  calldatas array of encoded proposals (bytes32)
    /// @return uint256 returns the unique hash of the proposal as an uint256
    function hashProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas
    ) public pure returns (uint256) {
        return uint256(keccak256(abi.encode(targets, values, calldatas)));
    }

    /// @notice Returns the key to the mapping of the current Guardians version
    /// @param  guardian The address of the Guardian
    /// @return bytes32 The hash of the `currentGuardianVersion` and `guardian` address...
    /// ...this resolves to a unique key for every version of the Guardians mapping
    function _getGuardianKey(address guardian) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(currentGuardianVersion, guardian));
    }
}
