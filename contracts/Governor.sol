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
  GovernorCountingSimple,
  GovernorVotes,
  GovernorTimelockControl
{
    using SafeERC20 for IERC20;

    uint256[] public proposals; // it’s an array of proposals hashes to execute. After proposal was voted for, an executor provides a complete data about the proposal, which gets hashed and if hashes correspond, then the proposal is executed.
    mapping(uint256 => ProposalCore) private _proposals;

    mapping(uint256 => mapping(address => int256)) public votes; // votes mapping(uint report => mapping(address voter => int256 vote))
    mapping(uint256 => address[]) public voters; // voters mapping(uint report => address [] voters)
    int256[] public reportsVoting; // results of the vote for the report with spe



    uint256 public GUARDIANS_LIMIT; // amount of guardians for contract to function propperly, until this limit is reached, governor contract will only be able to execute decisions to add more guardians to itself.
    address[] public guardians; // this is an array guardians who are allowed to vote for the proposals.
    int256[] public proposalsWeight;
    mapping(address => uint256) public weights; // weight of each specific guardian

    address public snapshotAddress;

    IERC20 private AMORxGuild;

    event Initialized(bool success, address owner, address snapshotAddress);

    string public _name;
    bool private _initialized;

  uint256 public _votingDelay;
  uint256 public _votingPeriod;
  uint256 public _quorum;

    error NotEnoughGuardians();
    error Unauthorized();
    error InvalidParameters();
    error InvalidAmount();

    struct ProposalCore {
        Timers.BlockNumber voteStart;
        Timers.BlockNumber voteEnd;
        bool executed;
        bool canceled;
        uint256 weights;
    }

    struct Proposal {
        /// @notice Unique id for looking up a proposal
        uint id;

        /// @notice Creator of the proposal
        address proposer;

        /// @notice The timestamp that the proposal will be available for execution, set once the vote succeeds
        uint eta;

        /// @notice the ordered list of target addresses for calls to be made
        address[] targets;

        /// @notice The ordered list of values (i.e. msg.value) to be passed to the calls to be made
        uint[] values;

        /// @notice The ordered list of function signatures to be called
        string[] signatures;

        /// @notice The ordered list of calldata to be passed to each call
        bytes[] calldatas;

        /// @notice The block at which voting begins: holders must delegate their votes prior to this block
        // uint startBlock;
        Timers.BlockNumber voteStart;

        /// @notice The block at which voting ends: votes must be cast prior to this block
        // uint endBlock;
        Timers.BlockNumber voteEnd;

        /// @notice Current number of votes for this proposal
        int Votes;

        /// @notice Flag marking whether the proposal has been canceled
        bool canceled;

        /// @notice Flag marking whether the proposal has been executed
        bool executed;

        /// @notice Receipts of ballots for the entire set of voters
        mapping (address => Receipt) receipts;
    }

    // constructor(IVotes _token, TimelockController _timelock)
    //     Governor("MyGovernor")
    //     GovernorSettings(1 /* 1 block */, 45818 /* 1 week */, 0)
    //     GovernorVotes(_token)
    //     GovernorVotesQuorumFraction(4)
    //     GovernorTimelockControl(_timelock)
    // {}

    function init(
        string memory name_,
        // IVotes  AMORxGuild_,
        // TimelockController _timelock,
        address AMORxGuild_,
        address initOwner, 
        address snapshotAddress_
    ) external returns (bool) {
        require(!_initialized, "Already initialized");

        _transferOwnership(initOwner);

    __Governor_init('Unlock Protocol Governor');
    __GovernorCountingSimple_init();
    __GovernorVotes_init(AMORxGuild_);
    __GovernorTimelockControl_init(_timelock);

        AMORxGuild = IERC20(AMORxGuild_);

        // person who inflicted the creation of the contract is set as the only guardian of the system
        guardians.push(msg.sender);
        snapshotAddress = snapshotAddress_;

        _name = name_;
        _initialized = true;
    _votingDelay = 1; // 1 block
    _votingPeriod = 45818; // 1 week
    _quorum = 11000e18; // 11k AMORxGuild
        proposalThreshold = proposalThreshold_;


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

    //  IGovernor functions
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    function version() public view virtual override returns (string memory) {
        return "1";
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

    function hashProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public pure virtual override returns (uint256) {
        return uint256(keccak256(abi.encode(targets, values, calldatas, descriptionHash)));
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
    /// @param signatures Function signatures for proposal calls
    /// @param calldatas Calldatas for proposal calls
    /// @param description String description of the proposal
    /// @return proposalId id of new proposal
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public virtual override onlySnapshot returns (uint256 proposalId) {

        uint256 proposalId = hashProposal(targets, values, calldatas, keccak256(bytes(description)));

        require(comp.getPriorVotes(msg.sender, sub256(block.number, 1)) > proposalThreshold, "Governor::propose: proposer votes below proposal threshold");
        require(targets.length == values.length && targets.length == signatures.length && targets.length == calldatas.length, "Governor::propose: proposal function information arity mismatch");
        require(targets.length > 0, "Governor: empty proposal");
        require(targets.length <= proposalMaxOperations, "Governor::propose: too many actions");


        Proposal storage proposal = _proposals[proposalId];
        require(proposal.voteStart.isUnset(), "Governor: proposal already exists");

        uint64 snapshot = block.number.toUint64() + votingDelay().toUint64();
        uint64 deadline = snapshot + votingPeriod().toUint64();

        proposal.voteStart.setDeadline(snapshot);
        proposal.voteEnd.setDeadline(deadline);

        Proposal memory newProposal = Proposal({
            id: proposalId,
            proposer: msg.sender,
            eta: 0,
            targets: targets,
            values: values,
            // signatures: signatures,
            calldatas: calldatas,
            voteStart: snapshot,
            voteEnd: deadline,
            Votes: 0,
            canceled: false,
            executed: false
        });

        _proposals[proposalId] = newProposal;

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

    function votingPeriod() public view virtual override returns (uint256);

    /// @notice function allows guardian to vote for the proposal. 
    /// Proposal should achieve at least 20% approval of guardians, to be accepted
    function castVote(uint256 proposalId, uint8 support) public virtual override onlyGuardian returns (uint256 balance){
        address voter = _msgSender();
        return _castVote(proposalId, voter, support, "");
    }

    function _castVote(
        uint256 proposalId,
        address account,
        uint8 support,
        string memory reason
    ) internal virtual returns (uint256) {
        return _castVote(proposalId, account, support, reason, _defaultParams());
    }

    function _defaultParams() internal view virtual returns (bytes memory) {
        return "";
    }

    function _castVote(
        uint256 proposalId,
        address account,
        uint8 support,
        string memory reason
    ) internal virtual override(Governor) returns (uint256)
    {
        uint256 _weight = super._castVote(proposalId, account, support, reason);
        if(proposalReward[proposalId].totalDistributed < proposalReward[proposalId].totalCountedReward){
            uint256 myReward = getProposalReward(proposalId, account);
            if(posi.balanceOf(address(this)) > myReward){
                posi.transfer(_msgSender(), myReward);
                proposalReward[proposalId].totalDistributed+=myReward;
            }
        }
        return _weight;
    }
}

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

    function state(uint256 proposalId) public view virtual override returns (ProposalState) {
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
        if (proposal.weights >= (20 * guardians.length) / 100) { //TODO: chengs this "proposal.weights"
            return ProposalState.Succeeded;
        } else {
            return ProposalState.Defeated;
        }
    }
    // uint256[] public proposals; // it’s an array of proposals hashes to execute. After proposal was voted for, an executor provides a complete data about the proposal, which gets hashed and if hashes correspond, then the proposal is executed.
    // mapping(uint256 => ProposalCore) private _proposals;

    // uint256 public GUARDIANS_LIMIT; // amount of guardians for contract to function propperly, until this limit is reached, governor contract will only be able to execute decisions to add more guardians to itself.
    // address[] public guardians; // this is an array guardians who are allowed to vote for the proposals.
    // int256[] public proposalsWeight;
    // mapping(address => uint256) public weights; // weight of each specific guardian

    function proposalSnapshot(uint256 proposalId) public view virtual override returns (uint256) {
        return _proposals[proposalId].voteStart.getDeadline();
    }

    function proposalDeadline(uint256 proposalId) public view virtual override returns (uint256) {
        return _proposals[proposalId].voteEnd.getDeadline();
    }

    function _execute(
        uint256, /* proposalId */
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 /*descriptionHash*/
    ) internal virtual {
        string memory errorMessage = "Governor: call reverted without message";
        for (uint256 i = 0; i < targets.length; ++i) {
            (bool success, bytes memory returndata) = targets[i].call{value: values[i]}(calldatas[i]);
            Address.verifyCallResult(success, returndata, errorMessage);
        }
    }

    function _executor() internal view virtual returns (address) {
        return address(this);
    }

    // function _executor()
    //     internal
    //     view
    //     override(Governor, GovernorTimelockControl)
    //     returns (address)
    // {
    //     return timelockController;
    // }


    /**
      * @notice Cancels a proposal only if sender is the proposer, or proposer delegates dropped below proposal threshold
      * @param proposalId The id of the proposal to cancel
      */
    function cancel(uint proposalId) external {
        require(state(proposalId) != ProposalState.Executed, "Governor::cancel: cannot cancel executed proposal");

        Proposal storage proposal = proposals[proposalId];
        require(msg.sender == proposal.proposer || comp.getPriorVotes(proposal.proposer, sub256(block.number, 1)) < proposalThreshold, "Governor::cancel: proposer above threshold");

        proposal.canceled = true;
        for (uint i = 0; i < proposal.targets.length; i++) {
            timelock.cancelTransaction(proposal.targets[i], proposal.values[i], proposal.signatures[i], proposal.calldatas[i], proposal.eta);
        }

        emit ProposalCanceled(proposalId);
    }








    function COUNTING_MODE() public pure virtual override returns (string memory);

    /**
     * @notice module:user-config
     * @dev Minimum number of cast voted required for a proposal to be successful.
     *
     * Note: The `blockNumber` parameter corresponds to the snapshot used for counting vote. This allows to scale the
     * quorum depending on values such as the totalSupply of a token at this block (see {ERC20Votes}).
     */
    function quorum(uint256 blockNumber) public view virtual override returns (uint256);

    /**
     * @notice module:voting
     * @dev Returns weither `account` has cast a vote on `proposalId`.
     */
    function hasVoted(uint256 proposalId, address account) public view virtual override returns (bool);

    /**
     * @dev Cast a vote with a reason
     *
     * Emits a {VoteCast} event.
     */
    function castVoteWithReason(
        uint256 proposalId,
        uint8 support,
        string calldata reason
    ) public virtual override returns (uint256 balance);

    /**
     * @dev Cast a vote with a reason and additional encoded parameters
     *
     * Emits a {VoteCast} or {VoteCastWithParams} event depending on the length of params.
     */
    function castVoteWithReasonAndParams(
        uint256 proposalId,
        uint8 support,
        string calldata reason,
        bytes memory params
    ) public virtual override returns (uint256 balance);

    /**
     * @dev Cast a vote using the user's cryptographic signature.
     *
     * Emits a {VoteCast} event.
     */
    function castVoteBySig(
        uint256 proposalId,
        uint8 support,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual override returns (uint256 balance);

    /**
     * @dev Cast a vote with a reason and additional encoded parameters using the user's cryptographic signature.
     *
     * Emits a {VoteCast} or {VoteCastWithParams} event depending on the length of params.
     */
    function castVoteWithReasonAndParamsBySig(
        uint256 proposalId,
        uint8 support,
        string calldata reason,
        bytes memory params,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual override returns (uint256 balance);

}
