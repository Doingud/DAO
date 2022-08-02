// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "./utils/interfaces/IFXAMORxGuild.sol";
import "./utils/interfaces/IAmorGuildToken.sol";

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Governor contract
/// @author Daoism Systems Team
/// @dev    IGovernor IERC165 Pattern
/// @notice Governor contract will allow to add and vote for the proposals

// contract GoinGudGovernor is Governor, IGovernor, Ownable {
contract GoinGudGovernor is 
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    using SafeERC20 for IERC20;
    using Timers for Timers.BlockNumber;

uint256 public proposalMaxOperations = 10;
// uint256 public _proposalThreshold;
    mapping(uint256 => ProposalCore) private _proposals;
    // id in array --> Id of passed proposal from _proposals
    uint256[] public proposals; // it’s an array of proposals hashes to execute. 
    // After proposal was voted for, an !executor provides a complete data about the proposal!, 
    // which gets hashed and if hashes correspond, then the proposal is executed.

    mapping(uint256 => mapping(address => int256)) public votes; // votes mapping(uint report => mapping(address voter => int256 vote))
    mapping(uint256 => address[]) public voters; // voters mapping(uint proposal => address [] voters)

// was thinking about those two arrays below, but can't find better solution (exept mapping)
    int256[] public proposalVoting; // results of the vote for the proposal
    int256[] public proposalWeight;


    uint256 public GUARDIANS_LIMIT; // amount of guardians for contract to function propperly, 
    // until this limit is reached, governor contract will only be able to execute decisions to add more guardians to itself.

    address[] public guardians; // this is an array guardians who are allowed to vote for the proposals.
    mapping(address => uint256) public weights; // weight of each specific guardian

    address public snapshotAddress;
    address public avatarAddress;
    IERC20 private AMORxGuild;

    event Initialized(bool success, address owner, address snapshotAddress);

    string public _name;
    bool private _initialized;

  uint256 public _votingDelay;
  uint256 public _votingPeriod;
  uint256 public _quorum;

    /// @notice The total number of proposals
    uint public proposalCount;

    /// @notice The address of the Compound Protocol Timelock
    // TimelockInterface public timelock;

    /// @notice The address of the Compound governance token
    CompInterface public comp;

    error NotEnoughGuardians();
    error Unauthorized();
    error InvalidParameters();
    error InvalidAmount();
    error ProposalNotExists();
    error VotingTimeExpired();

    function init(
        string memory name_,
        // IVotes  AMORxGuild_,
        // TimelockController _timelock,
        address AMORxGuild_,
        address initOwner, 
        address snapshotAddress_,
        address avatarAddress_
        // uint256 proposalThreshold_
    ) external returns (bool) {
        require(!_initialized, "Already initialized");

        // _transferOwnership(initOwner);

        AMORxGuild = IERC20(AMORxGuild_);

        // person who inflicted the creation of the contract is set as the only guardian of the system
        guardians.push(msg.sender);
        snapshotAddress = snapshotAddress_;
        avatarAddress = avatarAddress_;

        _name = name_;
        _initialized = true;
    _votingDelay = 1; // 1 block
    _votingPeriod = 45818; // 1 week
    _quorum = 11000e18; // 11k AMORxGuild
        // _proposalThreshold = proposalThreshold_;


        emit Initialized(_initialized, initOwner, snapshotAddress_);
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
    /// @param targets Targets of the proposal
    /// @param values Values of the proposal
    /// @param calldatas Calldatas of the proposal
    /// @param description Description of the proposal

    /// @param targets Target addresses for proposal calls
    /// @param values Eth values for proposal calls
    /// @param calldatas Calldatas for proposal calls
    /// @param description String description of the proposal
    /// @return proposalId id of new proposal
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public virtual override(Governor, IGovernor) onlyAvatar returns (uint256 proposalId) {

        uint256 proposalId = hashProposal(targets, values, calldatas, keccak256(bytes(description)));

// AMORxGuild.balanceOf(msg.sender)
// require(AMORxGuild.balanceOf(msg.sender) > proposalThreshold, "Governor::propose: proposer balance below proposal threshold");

        // require(comp.getPriorVotes(msg.sender, sub256(block.number, 1)) > proposalThreshold, "Governor::propose: proposer votes below proposal threshold");
        require(targets.length == values.length && targets.length == calldatas.length, "Governor::propose: proposal function information arity mismatch");
        require(targets.length > 0, "Governor: empty proposal");
        require(targets.length <= proposalMaxOperations, "Governor::propose: too many actions");


        ProposalCore storage proposal = _proposals[proposalId];
        require(proposal.voteStart.isUnset(), "Governor: proposal already exists");

        uint64 snapshot = toUint64(block.number) + toUint64(votingDelay());
        uint64 deadline = snapshot + toUint64(votingPeriod());

        proposal.voteStart.setDeadline(snapshot);
        proposal.voteEnd.setDeadline(deadline);

        // proposals.push(proposals.length); // TODO: not there. _proposals[proposalId] will be added to proposals ONLY IF successful
        proposalVoting.push(0);
        proposalWeight.push(0);

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

    /// @notice function allows guardian to vote for the proposal. 
    /// Proposal should achieve at least 20% approval of guardians, to be accepted
    function castVote(uint256 proposalId, uint8 support) public virtual override(Governor, IGovernor) onlyGuardian returns (uint256 balance){
        address voter = _msgSender();
        return _castVote(proposalId, voter, support, "");

        // mapping(uint256 => ProposalCore) private _proposals;

        // uint256[] public proposals; // Q: it’s an array of proposals hashes to execute. // ??? how this value are getted? 
        // // After proposal was voted for, an executor provides a complete data about the proposal, 
        // // which gets hashed and if hashes correspond, then the proposal is executed.

        // mapping(uint256 => mapping(address => int256)) public votes; // votes mapping(uint report => mapping(address voter => int256 vote))
        // mapping(uint256 => address[]) public voters; // voters mapping(uint report => address [] voters)
        // int256[] public proposalVoting; // results of the vote for the proposal
        // int256[] public proposalWeight;
    }


    function _castVote(
        uint256 proposalId,
        address account,
        uint8 support,
        string memory reason,
        bytes memory params
    ) internal virtual override(Governor) returns (uint256)
    {
        ProposalCore storage proposal = _proposals[proposalId];
        require(state(proposalId) == ProposalState.Active, "Governor: vote not currently active");

        //Q: guardian votes with some choosable amount of AMORxGuild / all amount / 1 point???
        uint256 voterBalance = AMORxGuild.balanceOf(msg.sender);
        if(voterBalance > 0){
            AMORxGuild.safeTransferFrom(_msgSender(), address(this), voterBalance);
        }

        proposalWeight[proposalId] += int256(voterBalance);

        if (support == 1) { //if for
            proposalVoting[proposalId] += int256(voterBalance);
            votes[proposalId][msg.sender] += int256(voterBalance);
        } else { // if against
            proposalVoting[proposalId] -= int256(voterBalance);
            votes[proposalId][msg.sender] -= int256(voterBalance);
        }

        return voterBalance; // weight = voterBalance
    }
// }

    // function _getVotes(
    //     address account,
    //     uint256 blockNumber,
    //     bytes memory params
    // ) internal view virtual returns (uint256) {
    //     // TODO: fill
    // }

    // function _countVote(
    //     uint256 proposalId,
    //     address account,
    //     uint8 support,
    //     uint256 weight,
    //     bytes memory params
    // ) internal virtual {
    //     // TODO: fill
    //     // modify weight
    //     // add weight
    // }

    /// @notice function allows anyone to execute specific proposal, based on the vote.
    /// @param targets Targets of the proposal
    /// @param values Values of the proposal
    /// @param calldatas Calldatas of the proposal
    /// @param descriptionHash Description hash of the proposal
    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public payable virtual override returns (uint256 proposalId) {
        uint256 proposalId = hashProposal(targets, values, calldatas, descriptionHash);

        ProposalState status = state(proposalId);
        require(
            status == ProposalState.Succeeded || status == ProposalState.Queued,
            "Governor: proposal not successful"
        );
        _proposals[proposalId].executed = true;

        emit ProposalExecuted(proposalId);

        _beforeExecute(proposalId, targets, values, calldatas, descriptionHash);
        _execute(proposalId, targets, values, calldatas, descriptionHash);
        _afterExecute(proposalId, targets, values, calldatas, descriptionHash);

        return proposalId;
    }

    function state(uint256 proposalId) public view virtual override(Governor, GovernorTimelockControl) returns (ProposalState) {
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

        // TODO: Proposal should achieve at least 20% approval of guardians, to be accepted.
        // if (_quorumReached(proposalId) && _voteSucceeded(proposalId)) { //TODO: change this 'if'
        if (proposalWeight[proposalId] >= int256((20 * guardians.length) / 100)) { //TODO: chengs this "proposal.weights"
            return ProposalState.Succeeded;
        } else {
            return ProposalState.Defeated;
        }
    }
    // uint256[] public proposals; // it’s an array of proposals hashes to execute. After proposal was voted for, an executor provides a complete data about the proposal, which gets hashed and if hashes correspond, then the proposal is executed.
    // mapping(uint256 => ProposalCore) private _proposals;

    // uint256 public GUARDIANS_LIMIT; // amount of guardians for contract to function propperly, until this limit is reached, governor contract will only be able to execute decisions to add more guardians to itself.
    // address[] public guardians; // this is an array guardians who are allowed to vote for the proposals.
    // int256[] public proposalWeight;
    // mapping(address => uint256) public weights; // weight of each specific guardian


    function _execute(
        uint256, /* proposalId */
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 /*descriptionHash*/
    ) internal virtual override(Governor, GovernorTimelockControl) {
        string memory errorMessage = "Governor: call reverted without message";
        for (uint256 i = 0; i < targets.length; ++i) {
            (bool success, bytes memory returndata) = targets[i].call{value: values[i]}(calldatas[i]);
            Address.verifyCallResult(success, returndata, errorMessage);
        }
    }


    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return avatarAddress;
    }


    /**
      * @notice Cancels a proposal only if sender is the proposer, or proposer delegates dropped below proposal threshold
      * @param proposalId The id of the proposal to cancel
      */
    function cancel(uint proposalId) external {
        // require(state(proposalId) != ProposalState.Executed, "Governor::cancel: cannot cancel executed proposal");

        // ProposalCore storage proposal = _proposals[proposalId];

        // uint256 canselledId = _cancel();

        // require(msg.sender == proposal.proposer || comp.getPriorVotes(proposal.proposer, sub256(block.number, 1)) < proposalThreshold(), "Governor::cancel: proposer above threshold");

        // proposal.canceled = true;
        // for (uint i = 0; i < proposal.targets.length; i++) {
        //     timelock.cancelTransaction(proposal.targets[i], proposal.values[i], proposal.signatures[i], proposal.calldatas[i], proposal.eta);
        // }

        // emit ProposalCanceled(proposalId);

        // uint256 proposalId = hashProposal(targets, values, calldatas, descriptionHash);
        ProposalState status = state(proposalId);

        require(
            status != ProposalState.Canceled && status != ProposalState.Expired && status != ProposalState.Executed,
            "Governor: proposal not active"
        );
        _proposals[proposalId].canceled = true;

    mapping(uint256 => ProposalCore) private _proposals;
    // proposalId --> number in the row
    uint256[] public proposals; // it’s an array of proposals hashes to execute. 
    // After proposal was voted for, an executor provides a complete data about the proposal, 
    // which gets hashed and if hashes correspond, then the proposal is executed.

    mapping(uint256 => mapping(address => int256)) public votes; // votes mapping(uint report => mapping(address voter => int256 vote))
    mapping(uint256 => address[]) public voters; // voters mapping(uint report => address [] voters)
    int256[] public proposalVoting; // results of the vote for the proposal
    int256[] public proposalWeight;


        emit ProposalCanceled(proposalId);
    }

    // /**
    //  * @dev Internal cancel mechanism: locks up the proposal timer, preventing it from being re-submitted. Marks it as
    //  * canceled to allow distinguishing it from executed proposals.
    //  *
    //  * Emits a {IGovernor-ProposalCanceled} event.
    //  */
    // function _cancel(
    //     address[] memory targets,
    //     uint256[] memory values,
    //     bytes[] memory calldatas,
    //     bytes32 descriptionHash
    // ) internal virtual override(Governor, GovernorTimelockControl) returns (uint256) {
    //     uint256 proposalId = hashProposal(targets, values, calldatas, descriptionHash);
    //     ProposalState status = state(proposalId);

    //     require(
    //         status != ProposalState.Canceled && status != ProposalState.Expired && status != ProposalState.Executed,
    //         "Governor: proposal not active"
    //     );
    //     _proposals[proposalId].canceled = true;

    //     emit ProposalCanceled(proposalId);

    //     return proposalId;
    // }

    function supportsInterface(bytes4 interfaceId) public view virtual override(Governor, GovernorTimelockControl) returns (bool) {
        // In addition to the current interfaceId, also support previous version of the interfaceId that did not
        // include the castVoteWithReasonAndParams() function as standard
        return
            interfaceId ==
            (type(IGovernor).interfaceId ^
                this.castVoteWithReasonAndParams.selector ^
                this.castVoteWithReasonAndParamsBySig.selector ^
                this.getVotesWithParams.selector) ||
            interfaceId == type(IGovernor).interfaceId ||
            interfaceId == type(IERC1155Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }


    function votingDelay()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return 0;//(token.getPastTotalSupply(blockNumber) * quorumNumerator(blockNumber)) / quorumDenominator();
    }
     
    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return 0;//_proposalThreshold;
    }

    // function COUNTING_MODE() public pure virtual override returns (string memory);

    // /**
    //  * @notice module:user-config
    //  * @dev Minimum number of cast voted required for a proposal to be successful.
    //  *
    //  * Note: The `blockNumber` parameter corresponds to the snapshot used for counting vote. This allows to scale the
    //  * quorum depending on values such as the totalSupply of a token at this block (see {ERC20Votes}).
    //  */
    // function quorum(uint256 blockNumber) public view virtual override returns (uint256);

    // /**
    //  * @notice module:voting
    //  * @dev Returns weither `account` has cast a vote on `proposalId`.
    //  */
    // function hasVoted(uint256 proposalId, address account) public view virtual override returns (bool);

    /**
     * @dev Cast a vote with a reason
     *
     * Emits a {VoteCast} event.
     */
    // function castVoteWithReason(
    //     uint256 proposalId,
    //     uint8 support,
    //     string calldata reason
    // ) public virtual override returns (uint256 balance);

    // /**
    //  * @dev Cast a vote with a reason and additional encoded parameters
    //  *
    //  * Emits a {VoteCast} or {VoteCastWithParams} event depending on the length of params.
    //  */
    // function castVoteWithReasonAndParams(
    //     uint256 proposalId,
    //     uint8 support,
    //     string calldata reason,
    //     bytes memory params
    // ) public virtual override returns (uint256 balance);

    /**
     * @dev Cast a vote using the user's cryptographic signature.
     *
     * Emits a {VoteCast} event.
     */
    // function castVoteBySig(
    //     uint256 proposalId,
    //     uint8 support,
    //     uint8 v,
    //     bytes32 r,
    //     bytes32 s
    // ) public virtual override returns (uint256 balance);

    /**
     * @dev Cast a vote with a reason and additional encoded parameters using the user's cryptographic signature.
     *
     * Emits a {VoteCast} or {VoteCastWithParams} event depending on the length of params.
     */
    // function castVoteWithReasonAndParamsBySig(
    //     uint256 proposalId,
    //     uint8 support,
    //     string calldata reason,
    //     bytes memory params,
    //     uint8 v,
    //     bytes32 r,
    //     bytes32 s
    // ) public virtual override returns (uint256 balance){

    // }

    function sub256(uint256 a, uint256 b) internal pure returns (uint) {
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



interface TimelockInterface {
    function delay() external view returns (uint);
    function GRACE_PERIOD() external view returns (uint);
    function acceptAdmin() external;
    function queuedTransactions(bytes32 hash) external view returns (bool);
    function queueTransaction(address target, uint value, string calldata signature, bytes calldata data, uint eta) external returns (bytes32);
    function cancelTransaction(address target, uint value, string calldata signature, bytes calldata data, uint eta) external;
    function executeTransaction(address target, uint value, string calldata signature, bytes calldata data, uint eta) external payable returns (bytes memory);
}

interface CompInterface {
    function getPriorVotes(address account, uint blockNumber) external view returns (uint96);
}