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
    }

    event ProposalCanceled(uint256 proposalId);
    event ProposalExecuted(uint256 proposalId);

    uint256 public constant PROPOSAL_MAX_OPERATIONS = 10;
    uint96 public constant votingDelay = 1;
    uint96 public constant votingPeriod = 2 weeks;

    mapping(uint256 => ProposalCore) private _proposals;
    mapping(uint256 => uint256) public proposalCancelApproval;
    mapping(uint256 => address[]) public cancellers; // cancellers mapping(uint proposal => address [] voters)
    uint256 public proposalsCounter;

    // After proposal was voted for, an !executor provides a complete data about the proposal!,
    // which gets hashed and if hashes correspond, then the proposal is executed.

    mapping(uint256 => address[]) public votersInfo; // voters mapping(uint proposal => address [] voters)
    mapping(uint256 => mapping(address => bool)) public voters;
    mapping(uint256 => uint256) public proposalVoting;
    mapping(uint256 => uint256) public proposalWeight;

    uint256 public guardiansLimit; // Amount of guardians for contract to function propperly,
    // Until this limit is reached, governor contract will only be able to execute decisions to add more guardians to itself.

    /// The `guardians` mapping is responsible for maintaining a list of current guardians
    /// Guardians are elected in `seasons` which is handled by the front-end
    /// By updating the `currentGuardianVersion` the `guardians` mapping is effectively cleared.
    /// (version, address) => true
    //mapping(bytes32 => bool) public guardians;
    mapping(uint256 => mapping(address => bool)) public guardians;
    /// The current version of `guardians`
    /// Note: Updated during `setGuardians`
    uint256 public currentGuardianVersion;
    /// The number of currently active guardians
    uint256 public guardiansCounter;

    address public avatarAddress;

    event Initialized(address avatarAddress);
    event ProposalCreated(
        uint256 indexed proposalId,
        address proposer,
        address[] targets,
        uint256[] values,
        bytes[] calldatas,
        uint256 indexed startBlock,
        uint256 indexed endBlock,
        uint256 proposalCounter
    );
    event ChangedGuardiansLimit(uint256 indexed newLimit);
    event GuardiansSet(address[] indexed arrGuardians);
    event GuardianAdded(address indexed newGuardian);
    event GuardianRemoved(address indexed guardian);
    event GuardianChanged(address indexed oldGuardian, address indexed newGuardian);
    event Voted(uint256 indexed proposalId, bool indexed support, address votedGuardian);

    bool private _initialized;

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

    /// @notice This modifier is needed to validate that amount of the Guardians is sufficient to vote and approve the “Many” decision
    modifier GuardianLimitReached() {
        if (guardiansCounter < guardiansLimit) {
            revert NotEnoughGuardians();
        }
        _;
    }

    /// @notice Access control: Avatar for this guikd
    modifier onlyAvatar() {
        if (msg.sender != avatarAddress) {
            revert Unauthorized();
        }
        _;
    }

    /// @notice Access control: Guild Guardian
    modifier onlyGuardian() {
        if (!isGuardian(msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    /// @notice Initializes the Governor contract
    /// @param  AMORxGuild_ The address of the AMORxGuild token
    /// @param  avatarAddress_ The address of the Avatar
    /// @param  initialGuardian The user responsible for the guardian actions
    function init(
        address AMORxGuild_,
        address avatarAddress_,
        address initialGuardian
    ) external {
        if (_initialized) {
            revert AlreadyInitialized();
        }

        guardians[currentGuardianVersion][initialGuardian] = true;
        guardiansCounter++;

        avatarAddress = avatarAddress_;

        _initialized = true;
        guardiansLimit = 1;
        proposalsCounter = 1;

        emit Initialized(avatarAddress_);
    }

    /// @notice Checks Guardian status
    /// @param  guardian Address to be checked
    /// @return bool Returns true if address is a Guardian
    function isGuardian(address guardian) public view returns (bool) {
        return guardians[currentGuardianVersion][guardian];
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

            guardians[currentGuardianVersion][arrGuardians[i]] = true;
            guardiansCounter++;
        }

        emit GuardiansSet(arrGuardians);
    }

    /// @notice Adds new guardian to the system
    /// @param guardian New guardian to be added
    function addGuardian(address guardian) public onlyAvatar {
        if (isGuardian(guardian)) {
            revert InvalidParameters();
        }

        guardians[currentGuardianVersion][guardian] = true;
        guardiansCounter++;

        emit GuardianAdded(guardian);
    }

    /// @notice Removes target guardian from the system
    /// @param guardian Guardian to be removed
    function removeGuardian(address guardian) external onlyAvatar {
        delete guardians[currentGuardianVersion][guardian];
        guardiansCounter--;

        emit GuardianRemoved(guardian);
    }

    /// @notice Swaps one guardian for another
    /// @param currentGuardian Guardian to be removed
    /// @param newGuardian Guardian to be added
    function changeGuardian(address currentGuardian, address newGuardian) external onlyAvatar {
        if (isGuardian(newGuardian) || !isGuardian(currentGuardian)) {
            revert InvalidParameters();
        }

        delete guardians[currentGuardianVersion][currentGuardian];
        guardians[currentGuardianVersion][newGuardian] = true;

        emit GuardianChanged(currentGuardian, newGuardian);
    }

    /// @notice Modifies guardians limit
    /// @param newLimit New limit value
    function changeGuardiansLimit(uint256 newLimit) external onlyAvatar {
        guardiansLimit = newLimit;

        emit ChangedGuardiansLimit(newLimit);
    }

    /// @notice this function will add a proposal for a guardians(from the AMORxGuild token) vote.
    /// Note: Only Avatar(as a result of the Snapshot) contract can add a proposal for voting.
    /// @param targets The array of proposed target addresses
    /// @param values The array of proposed transaction values
    /// @param calldatas The array of proposed (encoded) function calls
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

        proposalsCounter++;

        /// Submit proposals uniquely identified by a proposalId and an array of txHashes,
        /// to create a Reality.eth question that validates the execution of the connected transactions
        uint256 proposalId = hashProposal(targets, values, calldatas, proposalsCounter);
        ProposalCore storage proposal = _proposals[proposalId];
        if (proposal.voteStart != 0) {
            revert InvalidState();
        }

        uint96 snapshot = uint96(block.timestamp + votingDelay);
        uint96 deadline = snapshot + votingPeriod;

        proposal.voteStart = snapshot;
        proposal.voteEnd = deadline;

        proposalVoting[proposalId] = 0;
        proposalWeight[proposalId] = 0;

        _proposals[proposalId] = proposal;

        emit ProposalCreated(
            proposalId,
            msg.sender, // proposer
            targets,
            values,
            calldatas,
            snapshot,
            deadline,
            proposalsCounter
        );

        return proposalId;
    }

    /// @notice Guardian voting for an eligible proposal
    /// Note: Proposal should achieve at least 20% approval of guardians, to be accepted
    /// @dev Internal vote casting mechanism: Check that the vote is pending, that it has not been cast yet
    /// @param proposalId ID of the proposal
    /// @param support Boolean value: true (for) or false (against) user is voting
    function castVote(uint256 proposalId, bool support) external onlyGuardian GuardianLimitReached {
        if (state(proposalId) != ProposalState.Active) {
            revert InvalidState();
        }

        if (voters[proposalId][msg.sender] == true) {
            // this guardian already voted for this proposal
            revert AlreadyVoted();
        }

        proposalWeight[proposalId] += 1;

        if (support == true) {
            proposalVoting[proposalId] += 1;
        }

        voters[proposalId][msg.sender] = true;
        votersInfo[proposalId].push(msg.sender);

        emit Voted(proposalId, support, msg.sender);
    }

    /// @notice Execute passed proposals
    /// Note: params should correspond to `propose`
    /// @param targets Target addresses for proposal calls
    /// @param values AMORxGuild values for proposal calls
    /// @param calldatas Calldatas for proposal calls
    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        uint256 proposalCounter
    ) external GuardianLimitReached returns (uint256) {
        uint256 proposalId = hashProposal(targets, values, calldatas, proposalCounter);

        ProposalState status = state(proposalId);
        if (status != ProposalState.Succeeded) {
            revert InvalidState();
        }

        delete _proposals[proposalId];
        for (uint256 i = 0; i < votersInfo[proposalId].length; i++) {
            delete voters[proposalId][votersInfo[proposalId][i]];
        }
        delete proposalVoting[proposalId];
        delete proposalWeight[proposalId];

        for (uint256 i = 0; i < targets.length; ++i) {
            bool success = IAvatarxGuild(avatarAddress).executeProposal(targets[i], values[i], calldatas[i]);
            if (!success) {
                revert UnderlyingTransactionReverted();
            }
        }

        delete cancellers[proposalId];
        delete proposalCancelApproval[proposalId];

        emit ProposalExecuted(proposalId);

        return proposalId;
    }

    /// @notice Return the proposal state
    /// @param proposalId Unique proposal ID
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

    /// @notice  Vote to cancel an active proposal
    /// Note: Cancel should achieve at least 20% support of guardians, to be cancelled
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
    /// Note: Requires a succesful cancel action by Guardians
    /// @param proposalId The id of the proposal to cancel
    function cancel(uint256 proposalId) external {
        ProposalState status = state(proposalId);

        if (status != ProposalState.Active) {
            revert InvalidState();
        }

        // Execution requires least 20% support from Guardians to cancel proposal
        if (
            proposalCancelApproval[proposalId] < ((20 * guardiansCounter) / 100) ||
            proposalCancelApproval[proposalId] == 0
        ) {
            revert CancelNotApproved();
        }

        delete proposalWeight[proposalId];
        delete proposalVoting[proposalId];
        for (uint256 i = 0; i < votersInfo[proposalId].length; i++) {
            delete voters[proposalId][votersInfo[proposalId][i]];
        }
        delete cancellers[proposalId];
        delete proposalCancelApproval[proposalId];
        delete _proposals[proposalId];

        emit ProposalCanceled(proposalId);
    }

    /// @notice Returns the unique proposal ID generated by the proposal params
    /// @param  targets The array of proposed target addresses
    /// @param  values The array of proposed transaction values
    /// @param  calldatas The array of encoded proposals (bytes32)
    /// @return uint256 Returns the unique hash of the proposal as an uint256
    function hashProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        uint256 proposalCounter
    ) public view returns (uint256) {
        return uint256(keccak256(abi.encode(targets, values, calldatas, proposalCounter)));
    }
}
