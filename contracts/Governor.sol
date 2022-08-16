// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "./utils/interfaces/IAvatar.sol";

import "@openzeppelin/contracts/governance/utils/IVotes.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Governor contract
/// @author Daoism Systems Team
/// @dev    IGovernor IERC165 Pattern
/// @notice Governor contract will allow to add and vote for the proposals

contract GoinGudGovernor {
    using SafeCast for uint256;

    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Expired,
        Executed
    }

    struct ProposalCore {
        uint256 voteStart;
        uint256 voteEnd;
        bool executed;
        bool canceled;
    }
    event ProposalCanceled(uint256 proposalId);
    event ProposalExecuted(uint256 proposalId);

    // address on Rinkeby
    address public constant GNOSIS_REALITY_MODULE = 0xaFdB15b694Df594787E895692C54F2175C095aB4;

    uint256 public proposalMaxOperations = 10;
    mapping(uint256 => ProposalCore) private _proposals;
    mapping(uint256 => int256) public proposalCancelApproval;
    mapping(uint256 => address[]) public cancellers; // cancellers mapping(uint proposal => address [] voters)

    // id in array --> Id of passed proposal from _proposals
    uint256[] public proposals; // it’s an array of proposals hashes to execute.
    // After proposal was voted for, an !executor provides a complete data about the proposal!,
    // which gets hashed and if hashes correspond, then the proposal is executed.

    mapping(uint256 => address[]) public voters; // voters mapping(uint proposal => address [] voters)
    mapping(uint256 => int256) public proposalVoting;
    mapping(uint256 => int256) public proposalWeight;

    uint256 public GUARDIANS_LIMIT; // amount of guardians for contract to function propperly,
    // until this limit is reached, governor contract will only be able to execute decisions to add more guardians to itself.

    address[] public guardians; // this is an array guardians who are allowed to vote for the proposals.
    mapping(address => uint256) public weights; // weight of each specific guardian

    address public snapshotAddress;
    address public avatarAddress;
    IERC20 private AMORxGuild;
    IVotes public immutable token;

    event Initialized(bool success, address avatarAddress, address snapshotAddress);
    event ProposalCreated(
        uint256 proposalId,
        address proposer,
        address[] targets,
        uint256[] values,
        bytes[] calldatas,
        uint256 snapshot,
        uint256 deadline
    );

    string public _name;
    bool private _initialized;

    uint256 private _votingDelay;
    uint256 private _votingPeriod;
    uint256 public proposalCount;

    error NotEnoughGuardians();
    error Unauthorized();
    error InvalidParameters();
    error InvalidAmount();
    error ProposalNotExists();
    error VotingTimeExpired();
    error AlreadyVoted();

    constructor(IVotes _token, string memory name) {
        token = _token;
        _name = name;
        // person who inflicted the creation of the contract is set as the only guardian of the system
        guardians.push(msg.sender);
    }

    /// @notice Initializes the Governor contract
    /// @param  AMORxGuild_ the address of the AMORxGuild token
    /// @param  snapshotAddress_ the address of the Snapshot
    /// @param  avatarAddress_ the address of the Avatar
    function init(
        address AMORxGuild_,
        address snapshotAddress_,
        address avatarAddress_
    ) external returns (bool) {
        require(!_initialized, "Already initialized");

        AMORxGuild = IERC20(AMORxGuild_);

        snapshotAddress = snapshotAddress_;
        avatarAddress = avatarAddress_;

        _initialized = true;

        _votingDelay = 1;
        _votingPeriod = 2 weeks;
        proposalCount = 0;

        emit Initialized(_initialized, avatarAddress_, snapshotAddress_);
        return true;
    }

    /// @notice this modifier is needed to validate that amount of the Guardians is sufficient to vote and approve the “Many” decision
    modifier GuardianLimitReached() {
        if (guardians.length < GUARDIANS_LIMIT) {
            revert NotEnoughGuardians();
        }
        _;
    }

    modifier onlySnapshot() {
        if (msg.sender != snapshotAddress) {
            revert Unauthorized();
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
        bool index = false;
        for (uint256 i = 0; i < guardians.length; i++) {
            if (msg.sender == guardians[i]) {
                index = true;
            }
        }
        if (!index) {
            revert Unauthorized();
        }
        _;
    }

    /// @notice this function resets guardians array, and adds new guardian to the system.
    /// @param arrGuardians The array of guardians
    function setGuardians(address[] memory arrGuardians) external onlySnapshot {
        // check that the array is not empty
        if (arrGuardians.length == 0) {
            revert InvalidParameters();
        }
        delete guardians;
        for (uint256 i = 0; i < arrGuardians.length; i++) {
            guardians.push(arrGuardians[i]);
        }
    }

    /// @notice this function adds new guardian to the system
    /// @param guardian New guardian to be added
    function addGuardian(address guardian) public onlySnapshot {
        // check that guardian won't be added twice
        for (uint256 i = 0; i < guardians.length; i++) {
            if (guardian == guardians[i]) {
                revert InvalidParameters();
            }
        }
        guardians.push(guardian);
    }

    /// @notice this function removes choosed guardian from the system
    /// @param guardian Guardian to be removed
    function removeGuardian(address guardian) public onlySnapshot {
        for (uint256 i = 0; i < guardians.length; i++) {
            if (guardians[i] == guardian) {
                guardians[i] = guardians[guardians.length - 1];
                guardians.pop();
                break;
            }
        }
    }

    /// @notice this function changes guardian as a result of the vote (propose function)
    /// @param current Current vote value
    /// @param newGuardian Guardian to be changed
    function changeGuardian(uint256 current, address newGuardian) external onlySnapshot {
        // check that guardian won't be added twice
        for (uint256 i = 0; i < guardians.length; i++) {
            if (newGuardian == guardians[i]) {
                revert InvalidParameters();
            }
        }
        guardians[current] = newGuardian;
    }

    /// @notice this function will add a proposal for a guardians(from the AMORxGuild token) vote.
    /// Only Avatar(as a result of the Snapshot) contract can add a proposal for voting.
    /// Proposal execution will happen throught the Avatar contract
    /// @param targets Target addresses for proposal calls
    /// @param values AMORxGuild values for proposal calls
    /// @param calldatas Calldatas for proposal calls
    /// @param description String description of the proposal
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public virtual onlySnapshot returns (uint256) {
        require(targets.length > 0, "Governor: empty proposal");
        require(targets.length <= proposalMaxOperations, "Governor: too many actions");

        // Submit proposals uniquely identified by a proposalId and an array of txHashes, to create a Reality.eth question that validates the execution of the connected transactions
        bytes32 descriptionHash = keccak256(bytes(description));
        uint256 proposalId = hashProposal(targets, values, calldatas, descriptionHash);

        ProposalCore storage proposal = _proposals[proposalId];
        require(proposal.voteStart == 0, "Governor: proposal already exists");

        uint256 snapshot = block.timestamp + votingDelay();
        uint256 deadline = snapshot + votingPeriod();

        proposal.voteStart = snapshot;
        proposal.voteEnd = deadline;

        proposalVoting[proposalId] = 0;
        proposalWeight[proposalId] = 0;

        _proposals[proposalId] = proposal;
        proposals.push(proposalId);
        proposalCount++;

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
    function castVote(uint256 proposalId, bool support) external onlyGuardian {
        ProposalCore storage proposal = _proposals[proposalId];
        require(state(proposalId) == ProposalState.Active, "Governor: vote not currently active");

        if (AMORxGuild.balanceOf(msg.sender) > 0) {
            revert InvalidAmount();
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
    }

    /// @notice function allows anyone to execute specific proposal, based on the vote.
    /// @param targets Target addresses for proposal calls
    /// @param values AMORxGuild values for proposal calls
    /// @param calldatas Calldatas for proposal calls
    /// @param descriptionHash Description hash of the proposal
    function execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) external returns (uint256) {
        uint256 checkProposalId = hashProposal(targets, values, calldatas, descriptionHash);
        require(proposalId == checkProposalId, "Governor: invalid parametres");

        IAvatar(avatarAddress).executeProposal(targets, values, calldatas);

        return proposalId;
    }

    function proposalSnapshot(uint256 proposalId) public view virtual returns (uint256) {
        return _proposals[proposalId].voteStart;
    }

    function proposalDeadline(uint256 proposalId) public view virtual returns (uint256) {
        return _proposals[proposalId].voteEnd;
    }

    /// @notice function allows anyone to check state of the proposal
    /// @param proposalId id of the proposal
    function state(uint256 proposalId) public view virtual returns (ProposalState) {
        ProposalCore storage proposal = _proposals[proposalId];

        if (proposal.executed) {
            return ProposalState.Executed;
        }
        if (proposal.canceled) {
            return ProposalState.Canceled;
        }
        uint256 snapshot = proposalSnapshot(proposalId);

        if (snapshot == 0) {
            revert("Governor: unknown proposal id");
        }

        if (snapshot >= block.timestamp) {
            return ProposalState.Pending;
        }

        uint256 deadline = proposalDeadline(proposalId);

        if (deadline >= block.timestamp) {
            return ProposalState.Active;
        }

        // Proposal should achieve at least 20% approval of guardians, to be accepted
        if (proposalVoting[proposalId] >= int256((20 * guardians.length) / 100)) {
            return ProposalState.Succeeded;
        } else {
            return ProposalState.Defeated;
        }
    }

    function _execute(address[] memory targets) internal virtual {
        for (uint256 i = 0; i < targets.length; ++i) {
            // add addresses from passed proposal as guardians
            addGuardian(targets[i]);
        }
    }

    /// @notice function allows guardian to vote for cancelling the proposal
    /// Proposal should achieve at least 20% approval of guardians, to be cancelled
    /// @dev Internal vote casting mechanism: Check that the vote is pending, that it has not been cast yet
    /// @param proposalId ID of the proposal
    function castVoteForCancelling(uint256 proposalId) external onlyGuardian {
        ProposalCore storage proposal = _proposals[proposalId];
        ProposalState status = state(proposalId);

        require(
            status == ProposalState.Succeeded || status == ProposalState.Defeated,
            "Governor: vote is still active"
        );

        if (AMORxGuild.balanceOf(msg.sender) > 0) {
            revert InvalidAmount();
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

        require(
            status == ProposalState.Succeeded || status == ProposalState.Defeated,
            "Governor: proposal not finished yet"
        );

        // Proposal should achieve at least 20% approval for cancel from guardians, to be cancelled
        require(
            proposalCancelApproval[proposalId] >= int256((20 * guardians.length) / 100),
            "Governor: cancel for this proposal is not approven"
        );

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

    function votingDelay() public view returns (uint256) {
        return _votingDelay;
    }

    function votingPeriod() public view returns (uint256) {
        return _votingPeriod;
    }

    function hashProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public pure virtual returns (uint256) {
        return uint256(keccak256(abi.encode(targets, values, calldatas, descriptionHash)));
    }

    function sub256(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "subtraction underflow");
        return a - b;
    }
}
