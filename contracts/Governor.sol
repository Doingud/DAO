// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "./utils/interfaces/IFXAMORxGuild.sol";
import "./utils/interfaces/IAmorGuildToken.sol";

import "@openzeppelin/contracts/governance/IGovernor.sol";
import "@openzeppelin/contracts/governance/Governor.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Governor contract
/// @author Daoism Systems Team
/// @dev    IGovernor IERC165 Pattern
/// @notice Governor contract will allow to add and vote for the proposals

abstract contract GoinGudGovernor is Governor, Ownable {
    using SafeERC20 for IERC20;

    uint256 public GUARDIANS_LIMIT; // amount of guardians for contract to function propperly, until this limit is reached, governor contract will only be able to execute decisions to add more guardians to itself.
    uint256[] public proposals; // it’s an array of proposals hashes to execute. After proposal was voted for, an executor provides a complete data about the proposal, which gets hashed and if hashes correspond, then the proposal is executed.
    address[] public guardians; // this is an array guardians who are allowed to vote for the proposals.

    address public snapshotAddress;

    event Initialized(bool success, address owner, address snapshotAddress);

    bool private _initialized;

    error NotEnoughGuardians();
    error Unauthorized();
    error InvalidParameters();

    function init(address initOwner, address snapshotAddress_) external returns (bool) {
        require(!_initialized, "Already initialized");

        _transferOwnership(initOwner);

        // person who inflicted the creation of the contract is set as the only guardian of the system
        guardians.push(msg.sender);
        snapshotAddress = snapshotAddress_;

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
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public virtual override onlySnapshot returns (uint256 proposalId) {
        require(
            getVotes(_msgSender(), block.number - 1) >= proposalThreshold(),
            "Governor: proposer votes below proposal threshold"
        );

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

}
