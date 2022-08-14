// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "@openzeppelin/contracts/governance/utils/IVotes.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/utils/Timers.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// import "@gnosis.pm/zodiac/contracts/core/Module.sol";
// import "./interfaces/RealitioV3.sol";
// RealityModuleERC20
// import "@reality.eth/contracts/development/contracts/RealityETH-3.0.sol";

/// @title Governor contract
/// @author Daoism Systems Team
/// @dev    IGovernor IERC165 Pattern
/// @notice Governor contract will allow to add and vote for the proposals

contract GoinGudGovernor { //is RealityETH_v3_0 {//Module {
    using SafeCast for uint256;
    using Timers for Timers.BlockNumber;

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
        Timers.BlockNumber voteStart;
        Timers.BlockNumber voteEnd;
        bool executed;
        bool canceled;
    }
    event ProposalCanceled(uint256 proposalId);
    event ProposalExecuted(uint256 proposalId);

    // address on Rinkeby
    address public constant GNOSIS_REALITY_MODULE = 0xaFdB15b694Df594787E895692C54F2175C095aB4;

    uint256 public proposalMaxOperations = 10;
    mapping(uint256 => ProposalCore) private _proposals;
    mapping(bytes => uint256) public proposalIds;

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

        _votingDelay = 1; // 1 block
        _votingPeriod = 64000; // 64000 blocks
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
    /// @param data Data for proposal call
    function propose(
        address[] memory targets,
        bytes memory data
    ) public virtual onlyAvatar returns (uint256) {

        /* from  RealityModule  :
        /// @param _target Address of the contract that will call exec function
            
            executeProposalWithIndex():
        // Execute the transaction via the target.
        require(exec(to, value, data, operation), "Module transaction failed");

            exec() :
        https://rinkeby.etherscan.io/address/0xaFdB15b694Df594787E895692C54F2175C095aB4#code#F4#L43
        

        /// @dev Passes a transaction to be executed by the avatar.
        /// @notice Can only be called by this contract.
        /// @param address to Destination address of module transaction.
        /// @param uint256 value Ether value of module transaction.
        /// @param bytes data Data payload of module transaction.
        /// @param Enum.Operation operation Operation type of module transaction: 0 == call, 1 == delegate call.
        function exec(
            ...
            success = IAvatar(target).execTransactionFromModule(
                to,
                value,
                data,
                operation
            );
        );
        */

        require(data.length > 0, "Governor: empty proposal");
        uint256 proposalId = hashProposal(targets, data);

        require(
            proposalIds[data] == 0,
            "Proposal has already been submitted"
        );

        proposalIds[data] = proposalId;

        ProposalCore storage proposal = _proposals[proposalId];
        require(proposal.voteStart.isUnset(), "Governor: proposal already exists");

        uint64 snapshot = toUint64(block.number) + toUint64(votingDelay());
        uint64 deadline = snapshot + toUint64(votingPeriod());

        proposal.voteStart.setDeadline(snapshot);
        proposal.voteEnd.setDeadline(deadline);

        proposalVoting[proposalId] = 0;
        proposalWeight[proposalId] = 0;

        _proposals[proposalId] = proposal;
        proposals.push(proposalId);
        proposalCount++;

        emit ProposalCreated(
            proposalId,
            msg.sender, // proposer
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
    function castVote(
        uint256 proposalId,
        bool support
    ) external {
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
    /// @param targets addreses from the proposal
    /// @param data Data about the proposal
    function execute(
        address[] memory targets,
        bytes memory data
    ) external returns (uint256) {
        uint256 proposalId = hashProposal(targets, data);

        ProposalState status = state(proposalId);
        require(
            status == ProposalState.Succeeded,
            "Governor: proposal not successful"
        );

        // If proposal has positive voting weight then proposal is accepted
        int256 needTwentyPercent = (proposalVoting[proposalId] * 100) / proposalWeight[proposalId];
        address[] memory people = voters[proposalId];

        if (needTwentyPercent >= 20) {
            // _execute(proposalId);
            _execute(targets); // TODO: ??? HOW to extract from data?
        }

        _proposals[proposalId].executed = true;
        emit ProposalExecuted(proposalId);

        delete voters[proposalId];
        delete proposalWeight[proposalId];
        delete proposalVoting[proposalId];
        delete _proposals[proposalId];

        return proposalId;
    }

    function proposalSnapshot(uint256 proposalId) public view virtual returns (uint256) {
        return _proposals[proposalId].voteStart.getDeadline();
    }

    function proposalDeadline(uint256 proposalId) public view virtual returns (uint256) {
        return _proposals[proposalId].voteEnd.getDeadline();
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
        address[] memory targets
    ) internal virtual {
        for (uint256 i = 0; i < targets.length; ++i) {
            // add addresses from passed proposal as guardians
            addGuardian(targets[i]);
        }
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
        bytes memory data
    ) internal virtual returns (uint256) {
        uint256 proposalId = hashProposal(targets, data);
        ProposalState status = state(proposalId);

        require(
            status != ProposalState.Canceled && status != ProposalState.Expired && status != ProposalState.Executed,
            "Governor: proposal not active"
        );
        _proposals[proposalId].canceled = true;

        emit ProposalCanceled(proposalId);

        return proposalId;
    }

    function votingDelay() public view returns (uint256) {
        return _votingDelay;
    }

    function votingPeriod() public view returns (uint256) {
        return _votingPeriod;
    }

    function hashProposal(
        address[] memory targets,
        bytes memory data
    ) public pure virtual returns (uint256) {
        return uint256(keccak256(abi.encode(targets, data)));
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
