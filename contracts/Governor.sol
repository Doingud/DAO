// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "./utils/interfaces/IFXAMORxGuild.sol";
import "./utils/interfaces/IAmorGuildToken.sol";

import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Governor contract
/// @author Daoism Systems Team
/// @dev    IGovernor IERC165 Pattern
/// @notice Governor contract will allow to add and vote for the proposals

contract GoinGudGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes
{
    using SafeERC20 for IERC20;
    using SafeCast for uint256;
    using Timers for Timers.BlockNumber;

    // struct ProposalVoting {
    //     int256 proposalVoting;
    //     uint256 proposalWeight;
    // }
    // mapping(uint256 => mapping(address => int256)) public votes; // votes mapping(uint report => mapping(address voter => int256 vote))
    // mapping(uint256 => ProposalVoting) private _proposalsVotings;

    uint256 public proposalMaxOperations = 10;
    uint256 private _proposalThreshold;
    mapping(uint256 => ProposalCore) private _proposals;

    // id in array --> Id of passed proposal from _proposals
    uint256[] public proposals; // it’s an array of proposals hashes to execute.
    // After proposal was voted for, an !executor provides a complete data about the proposal!,
    // which gets hashed and if hashes correspond, then the proposal is executed.

    mapping(uint256 => address[]) public voters; // voters mapping(uint proposal => address [] voters)
    mapping(uint256 => int256) public proposalVoting;
    mapping(uint256 => uint256) public proposalWeight;

    uint256 public timeVoting; // deadlines for the votes for proposals

    uint256 public GUARDIANS_LIMIT; // amount of guardians for contract to function propperly,
    // until this limit is reached, governor contract will only be able to execute decisions to add more guardians to itself.

    address[] public guardians; // this is an array guardians who are allowed to vote for the proposals.
    mapping(address => uint256) public weights; // weight of each specific guardian

    address public snapshotAddress;
    address public avatarAddress;
    IERC20 private AMORxGuild;

    event Initialized(bool success, address avatarAddress, address snapshotAddress);

    string public _name;
    bool private _initialized;

    uint256 public _votingDelay;
    uint256 public _votingPeriod;
    uint256 public proposalCount;

    error NotEnoughGuardians();
    error Unauthorized();
    error InvalidParameters();
    error InvalidAmount();
    error ProposalNotExists();
    error VotingTimeExpired();
    error AlreadyVoted();

    constructor(
        IVotes _token,
        string memory name
    )
        Governor(name)
        GovernorSettings(
            1, /* 1 block */
            45818, /* 1 week */
            0
        )
        GovernorVotes(_token)
    {
        _name = name;
        // person who inflicted the creation of the contract is set as the only guardian of the system
        guardians.push(msg.sender);
    }

    function init(
        address AMORxGuild_,
        address snapshotAddress_,
        address avatarAddress_,
        uint256 timeVoting_,
        uint256 proposalThreshold_
    ) external returns (bool) {
        require(!_initialized, "Already initialized");

        AMORxGuild = IERC20(AMORxGuild_);

        snapshotAddress = snapshotAddress_;
        avatarAddress = avatarAddress_;
        timeVoting = timeVoting_;

        _initialized = true;

        _votingDelay = 1; // 1 block
        _votingPeriod = 64000; // 64000 blocks
        proposalCount = 0;
        _proposalThreshold = proposalThreshold_;

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
    /// @return proposalId id of the new proposal
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public virtual override(Governor) onlyAvatar returns (uint256) {
        uint256 proposalId = hashProposal(targets, values, calldatas, keccak256(bytes(description)));
        // AMORxGuild.balanceOf(msg.sender)
        // require(AMORxGuild.balanceOf(msg.sender) > proposalThreshold, "Governor::propose: proposer balance below proposal threshold");
        require(
            targets.length == values.length && targets.length == calldatas.length,
            "Governor::propose: proposal function information arity mismatch"
        );
        require(targets.length > 0, "Governor: empty proposal");
        require(targets.length <= proposalMaxOperations, "Governor::propose: too many actions");

        ProposalCore storage proposal = _proposals[proposalId];
        require(proposal.voteStart.isUnset(), "Governor: proposal already exists");

        uint64 snapshot = toUint64(block.number) + toUint64(votingDelay());
        uint64 deadline = snapshot + toUint64(votingPeriod());

        proposal.voteStart.setDeadline(snapshot);
        proposal.voteEnd.setDeadline(deadline);

        // ProposalVoting storage proposalvoting = _proposalsVotings[proposalId];
        // proposalvoting.proposalVoting = 0;
        // proposalvoting.proposalWeight = 0;

        proposalVoting[proposalId] = 0;
        proposalWeight[proposalId] = 0;

        _proposals[proposalId] = proposal;
        proposals.push(proposalId);
        proposalCount++;
        emit ProposalCreated(
            proposalId,
            _msgSender(), // proposer
            targets,
            values,
            new string[](targets.length), // signatures
            calldatas,
            snapshot,
            deadline,
            description
        );

        return proposalId;
    }

    /// @notice function allows guardian to vote for the proposal
    /// Proposal should achieve at least 20% approval of guardians, to be accepted
    /// @param proposalId id of the proposal
    /// @param support For or against proposal
    function castVote(uint256 proposalId, uint8 support)
        public
        virtual
        override(Governor)
        onlyGuardian
        returns (uint256 balance)
    {
        address voter = _msgSender();
        return _castVote(proposalId, voter, support, "");
    }

    /// @notice vote for the proposal
    /// @dev Internal vote casting mechanism: Check that the vote is pending, that it has not been cast yet
    /// @param proposalId id of the proposal
    /// @param account address of the voter
    /// @param support For or against proposal
    function _castVote(
        uint256 proposalId,
        address account,
        uint8 support,
        string memory reason
    ) internal virtual override(Governor) returns (uint256) {
        ProposalCore storage proposal = _proposals[proposalId];
        require(state(proposalId) == ProposalState.Active, "Governor: vote not currently active");

        for (uint256 i = 0; i < voters[proposalId].length; i++) {
            if (voters[proposalId][i] == account) {
                // this guardian already voted for this proposal
                revert AlreadyVoted();
            }
        }

        // Q: guardian votes with some choosable amount of AMORxGuild / all amount / 1 point?
        // 1 point for now
        uint256 voterBalance = AMORxGuild.balanceOf(account);
        // if (voterBalance > 0) {
        //    AMORxGuild.safeTransferFrom(_msgSender(), address(this), voterBalance);
        // }

        // proposal.proposalWeight += 1;//voterBalance;
        proposalWeight[proposalId] += 1;

        if (support == 1) {
            // if for
            proposalVoting[proposalId] += 1;
            // proposal.proposalVoting += 1;//int256(voterBalance);
            // votes[proposalId][msg.sender] += int256(voterBalance);
        } else {
            // if against
            proposalVoting[proposalId] -= 1;
            // proposal.proposalVoting -= 1;//int256(voterBalance);
            // votes[proposalId][msg.sender] -= int256(voterBalance);
        }

        voters[proposalId].push(account);

        return voterBalance; // weight = voterBalance
    }

    /// @notice function allows anyone to execute specific proposal, based on the vote.
    /// @param targets Target addresses for proposal calls
    /// @param values AMORxGuild values for proposal calls
    /// @param calldatas Calldatas for proposal calls
    /// @param descriptionHash Description hash of the proposal
    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public payable virtual override(Governor) returns (uint256) {
        uint256 proposalId = hashProposal(targets, values, calldatas, descriptionHash);

        ProposalState status = state(proposalId);
        require(
            status == ProposalState.Succeeded || status == ProposalState.Queued,
            "Governor: proposal not successful"
        );
        _proposals[proposalId].executed = true;

        emit ProposalExecuted(proposalId);

        _execute(proposalId, targets, values, calldatas, descriptionHash);

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
        delete _proposals[proposalId];

        return proposalId;
    }

    function proposalSnapshot(uint256 proposalId) public view virtual override(Governor) returns (uint256) {
        return _proposals[proposalId].voteStart.getDeadline();
    }

    function proposalDeadline(uint256 proposalId) public view virtual override(Governor) returns (uint256) {
        return _proposals[proposalId].voteEnd.getDeadline();
    }

    /// @notice function allows anyone to check state of the proposal
    /// @param proposalId id of the proposal
    function state(uint256 proposalId)
        public
        view
        virtual
        override(Governor)
        returns (ProposalState)
    {
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

        if (snapshot >= block.number) {
            return ProposalState.Pending;
        }

        uint256 deadline = proposalDeadline(proposalId);

        if (deadline >= block.number) {
            return ProposalState.Active;
        }

        // Proposal should achieve at least 20% approval of guardians, to be accepted
        if (proposalVoting[proposalId] >= int256((20 * guardians.length) / 100)) {
            return ProposalState.Succeeded;
        } else {
            return ProposalState.Defeated;
        }
    }

    function _execute(
        uint256, /* proposalId */
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 /*descriptionHash*/
    ) internal virtual override(Governor) {
        for (uint256 i = 0; i < targets.length; ++i) {
            // add addresses from passed proposal as guardians
            addGuardian(targets[i]);
        }
    }

    function _executor() internal view override(Governor) returns (address) {
        return avatarAddress;
    }

    /// @notice Cancels a proposal
    /// @param proposalId The id of the proposal to cancel
    function cancel(uint256 proposalId) external {
        ProposalState status = state(proposalId);

        require(
            status != ProposalState.Canceled && status != ProposalState.Expired && status != ProposalState.Executed,
            "Governor: proposal not active"
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
        delete _proposals[proposalId];

        emit ProposalCanceled(proposalId);
    }

    /**
     * @dev Internal cancel mechanism: locks up the proposal timer, preventing it from being re-submitted. Marks it as
     * canceled to allow distinguishing it from executed proposals.
     *
     * Emits a {IGovernor-ProposalCanceled} event.
     */
    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal virtual override(Governor) returns (uint256) {
        uint256 proposalId = hashProposal(targets, values, calldatas, descriptionHash);
        ProposalState status = state(proposalId);

        require(
            status != ProposalState.Canceled && status != ProposalState.Expired && status != ProposalState.Executed,
            "Governor: proposal not active"
        );
        _proposals[proposalId].canceled = true;

        emit ProposalCanceled(proposalId);

        return proposalId;
    }

    function votingDelay() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return _votingDelay;
    }

    function votingPeriod() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return _votingPeriod;
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor)
        returns (uint256)
    {
        return 0; //(token.getPastTotalSupply(blockNumber) * quorumNumerator(blockNumber)) / quorumDenominator();
    }

    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return _proposalThreshold;
    }

    function sub256(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "subtraction underflow");
        return a - b;
    }

    /**
     * @dev Returns the downcasted uint64 from uint256, reverting on
     * overflow (when the input is greater than largest uint64).
     *
     * Counterpart to Solidity's `uint64` operator.
     *
     * Requirements:
     *
     * - input must fit into 64 bits
     */
    function toUint64(uint256 value) internal pure returns (uint64) {
        require(value <= type(uint64).max, "SafeCast: value doesn't fit in 64 bits");
        return uint64(value);
    }
}
