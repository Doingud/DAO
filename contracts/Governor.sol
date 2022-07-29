// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "./utils/interfaces/IFXAMORxGuild.sol";
import "./utils/interfaces/IAmorGuildToken.sol";

import "@openzeppelin/contracts/governance/IGovernor.sol";
import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/utils/Timers.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Governor contract
/// @author Daoism Systems Team
/// @dev    IGovernor IERC165 Pattern
/// @notice Governor contract will allow to add and vote for the proposals

contract GoinGudGovernor is IGovernor, Ownable {
// contract GoinGudGovernor is Ownable {

    using SafeERC20 for IERC20;
    using Timers for Timers.BlockNumber;

    uint256 public GUARDIANS_LIMIT; // amount of guardians for contract to function propperly, until this limit is reached, governor contract will only be able to execute decisions to add more guardians to itself.
    uint256[] public proposals; // it’s an array of proposals hashes to execute. After proposal was voted for, an executor provides a complete data about the proposal, which gets hashed and if hashes correspond, then the proposal is executed.
    address[] public guardians; // this is an array guardians who are allowed to vote for the proposals.

    address public snapshotAddress;

    mapping(uint256 => ProposalCore) private _proposals;

    event Initialized(bool success, address owner, address snapshotAddress);

    string public _name;
    bool private _initialized;

    error NotEnoughGuardians();
    error Unauthorized();
    error InvalidParameters();

    struct ProposalCore {
        Timers.BlockNumber voteStart;
        Timers.BlockNumber voteEnd;
        bool executed;
        bool canceled;
    }

    function init(
        string memory name_,
        address initOwner, address snapshotAddress_) external returns (bool) {
        require(!_initialized, "Already initialized");

        _transferOwnership(initOwner);

        // person who inflicted the creation of the contract is set as the only guardian of the system
        guardians.push(msg.sender);
        snapshotAddress = snapshotAddress_;

        _name = name_;
        _initialized = true;
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
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public virtual override onlySnapshot returns (uint256 proposalId) {

        uint256 proposalId = hashProposal(targets, values, calldatas, keccak256(bytes(description)));

        require(targets.length == values.length, "Governor: invalid proposal length");
        require(targets.length == calldatas.length, "Governor: invalid proposal length");
        require(targets.length > 0, "Governor: empty proposal");

        ProposalCore storage proposal = _proposals[proposalId];
        require(proposal.voteStart.isUnset(), "Governor: proposal already exists");

        uint64 snapshot = block.number.toUint64() + votingDelay().toUint64();
        uint64 deadline = snapshot + votingPeriod().toUint64();

        proposal.voteStart.setDeadline(snapshot);
        proposal.voteEnd.setDeadline(deadline);

        emit ProposalCreated(
            proposalId,
            _msgSender(),
            targets,
            values,
            new string[](targets.length),
            calldatas,
            snapshot,
            deadline,
            description
        );

        return proposalId;
    }

    /// @notice function allows guardian to vote for the proposal. 
    /// Proposal should achieve at least 20% approval of guardians, to be accepted
    function castVote(uint256 proposalId, uint8 support) public virtual override onlyGuardian returns (uint256 balance){

    }

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
    
    }


    // function version() public view virtual override returns (string memory);

    // function COUNTING_MODE() public pure virtual override returns (string memory);

    // function hashProposal(
    //     address[] memory targets,
    //     uint256[] memory values,
    //     bytes[] memory calldatas,
    //     bytes32 descriptionHash
    // ) public pure virtual override returns (uint256);

    // function state(uint256 proposalId) public view virtual override returns (ProposalState);

    // function proposalSnapshot(uint256 proposalId) public view virtual override returns (uint256);

    // /**
    //  * @notice module:core
    //  * @dev Block number at which votes close. Votes close at the end of this block, so it is possible to cast a vote
    //  * during this block.
    //  */
    // function proposalDeadline(uint256 proposalId) public view virtual override returns (uint256);

    // /**
    //  * @notice module:user-config
    //  * @dev Delay, in number of block, between the proposal is created and the vote starts. This can be increassed to
    //  * leave time for users to buy voting power, of delegate it, before the voting of a proposal starts.
    //  */
    // function votingDelay() public view virtual override returns (uint256);

    // /**
    //  * @notice module:user-config
    //  * @dev Delay, in number of blocks, between the vote start and vote ends.
    //  *
    //  * NOTE: The {votingDelay} can delay the start of the vote. This must be considered when setting the voting
    //  * duration compared to the voting delay.
    //  */
    // function votingPeriod() public view virtual override returns (uint256);

    // /**
    //  * @notice module:user-config
    //  * @dev Minimum number of cast voted required for a proposal to be successful.
    //  *
    //  * Note: The `blockNumber` parameter corresponds to the snapshot used for counting vote. This allows to scale the
    //  * quorum depending on values such as the totalSupply of a token at this block (see {ERC20Votes}).
    //  */
    // function quorum(uint256 blockNumber) public view virtual override returns (uint256);

    // /**
    //  * @notice module:reputation
    //  * @dev Voting power of an `account` at a specific `blockNumber`.
    //  *
    //  * Note: this can be implemented in a number of ways, for example by reading the delegated balance from one (or
    //  * multiple), {ERC20Votes} tokens.
    //  */
    // function getVotes(address account, uint256 blockNumber) public view virtual override returns (uint256);

    // /**
    //  * @notice module:reputation
    //  * @dev Voting power of an `account` at a specific `blockNumber` given additional encoded parameters.
    //  */
    // function getVotesWithParams(
    //     address account,
    //     uint256 blockNumber,
    //     bytes memory params
    // ) public view virtual override returns (uint256);

    // /**
    //  * @notice module:voting
    //  * @dev Returns weither `account` has cast a vote on `proposalId`.
    //  */
    // function hasVoted(uint256 proposalId, address account) public view virtual override returns (bool);

    // /**
    //  * @dev Cast a vote with a reason
    //  *
    //  * Emits a {VoteCast} event.
    //  */
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

    // /**
    //  * @dev Cast a vote using the user's cryptographic signature.
    //  *
    //  * Emits a {VoteCast} event.
    //  */
    // function castVoteBySig(
    //     uint256 proposalId,
    //     uint8 support,
    //     uint8 v,
    //     bytes32 r,
    //     bytes32 s
    // ) public virtual override returns (uint256 balance);

    // /**
    //  * @dev Cast a vote with a reason and additional encoded parameters using the user's cryptographic signature.
    //  *
    //  * Emits a {VoteCast} or {VoteCastWithParams} event depending on the length of params.
    //  */
    // function castVoteWithReasonAndParamsBySig(
    //     uint256 proposalId,
    //     uint8 support,
    //     string calldata reason,
    //     bytes memory params,
    //     uint8 v,
    //     bytes32 r,
    //     bytes32 s
    // ) public virtual override returns (uint256 balance);
}
