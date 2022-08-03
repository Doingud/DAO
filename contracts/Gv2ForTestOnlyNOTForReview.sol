// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.4;

// import "./utils/interfaces/IFXAMORxGuild.sol";
// import "./utils/interfaces/IAmorGuildToken.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// import "@openzeppelin/contracts/governance/Governor.sol";
// import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
// import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
// import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
// import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
// import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

// contract MyGovernor is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction, GovernorTimelockControl {

//     uint256 public proposalMaxOperations = 10;
//     // uint256 public _proposalThreshold;
//     mapping(uint256 => ProposalCore) private _proposals;

//     // id in array --> Id of passed proposal from _proposals
//     uint256[] public proposals; // it’s an array of proposals hashes to execute. 
//     // After proposal was voted for, an !executor provides a complete data about the proposal!, 
//     // which gets hashed and if hashes correspond, then the proposal is executed.


//     // mapping(uint256 => mapping(address => int256)) public votes; // votes mapping(uint report => mapping(address voter => int256 vote))
//     mapping(uint256 => address[]) public voters; // voters mapping(uint proposal => address [] voters)

// // was thinking about those two arrays below, but can't find better solution than just struct(exept mapping)
//     // int256[] public proposalVoting; // results of the vote for the proposal
//     // int256[] public proposalWeight;
//     mapping(uint256 => int256) public proposalVoting;
//     mapping(uint256 => uint256) public proposalWeight;


//     uint256 public GUARDIANS_LIMIT; // amount of guardians for contract to function propperly, 
//     // until this limit is reached, governor contract will only be able to execute decisions to add more guardians to itself.

//     address[] public guardians; // this is an array guardians who are allowed to vote for the proposals.
//     mapping(address => uint256) public weights; // weight of each specific guardian

//     address public snapshotAddress;
//     address public avatarAddress;
//     IERC20 private AMORxGuild;

//     event Initialized(bool success, address owner, address snapshotAddress);

//     string public _name;
//     bool private _initialized;

//   uint256 public _votingDelay;
//   uint256 public _votingPeriod;
//   uint256 public _quorum;

//     /// @notice The total number of proposals
//     uint public proposalCount;

//     error NotEnoughGuardians();
//     error Unauthorized();
//     error InvalidParameters();
//     error InvalidAmount();
//     error ProposalNotExists();
//     error VotingTimeExpired();
//     error AlreadyVoted();

//     // function init(
//     //     string memory name_,
//     //     // IVotes  AMORxGuild_,
//     //     // TimelockController _timelock,
//     //     address AMORxGuild_,
//     //     address initOwner, 
//     //     address snapshotAddress_,
//     //     address avatarAddress_
//     //     // uint256 proposalThreshold_
//     // ) external returns (bool) {
//     //     require(!_initialized, "Already initialized");

//     //     // _transferOwnership(initOwner);

//     //     AMORxGuild = IERC20(AMORxGuild_);

//     //     // person who inflicted the creation of the contract is set as the only guardian of the system
//     //     guardians.push(msg.sender);
//     //     snapshotAddress = snapshotAddress_;
//     //     avatarAddress = avatarAddress_;

//     //     _name = name_;
//     //     _initialized = true;
//     // _votingDelay = 1; // 1 block
//     // _votingPeriod = 45818; // 1 week
//     // _quorum = 11000e18; // 11k AMORxGuild
//     //     // _proposalThreshold = proposalThreshold_;


//     //     emit Initialized(_initialized, initOwner, snapshotAddress_);
//     //     return true;
//     }

//     constructor(IVotes _token, TimelockController _timelock,
//         string memory name_,
//         // IVotes  AMORxGuild_,
//         // TimelockController _timelock,
//         address AMORxGuild_,
//         address initOwner, 
//         address snapshotAddress_,
//         address avatarAddress_
//     )
//         Governor("MyGovernor")
//         GovernorSettings(1 /* 1 block */, 45818 /* 1 week */, 0)
//         GovernorVotes(_token)
//         GovernorVotesQuorumFraction(4)
//         GovernorTimelockControl(_timelock)
//     {
//         AMORxGuild = IERC20(AMORxGuild_);

//         // person who inflicted the creation of the contract is set as the only guardian of the system
//         guardians.push(msg.sender);
//         snapshotAddress = snapshotAddress_;
//         avatarAddress = avatarAddress_;

//         _name = name_;
//         _initialized = true;
//         _votingDelay = 1; // 1 block
//         _votingPeriod = 45818; // 1 week
//         _quorum = 11000e18; // 11k AMORxGuild
//     }

//     // The following functions are overrides required by Solidity.

//     function votingDelay()
//         public
//         view
//         override(IGovernor, GovernorSettings)
//         returns (uint256)
//     {
//         return super.votingDelay();
//     }

//     function votingPeriod()
//         public
//         view
//         override(IGovernor, GovernorSettings)
//         returns (uint256)
//     {
//         return super.votingPeriod();
//     }

//     function quorum(uint256 blockNumber)
//         public
//         view
//         override(IGovernor, GovernorVotesQuorumFraction)
//         returns (uint256)
//     {
//         return super.quorum(blockNumber);
//     }

//     function state(uint256 proposalId)
//         public
//         view
//         override(Governor, GovernorTimelockControl)
//         returns (ProposalState)
//     {
//         return super.state(proposalId);
//     }

//     function propose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description)
//         public
//         override(Governor, IGovernor)
//         returns (uint256)
//     {
//         return super.propose(targets, values, calldatas, description);
//     }

//     function proposalThreshold()
//         public
//         view
//         override(Governor, GovernorSettings)
//         returns (uint256)
//     {
//         return super.proposalThreshold();
//     }

//     function _execute(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
//         internal
//         override(Governor, GovernorTimelockControl)
//     {
//         super._execute(proposalId, targets, values, calldatas, descriptionHash);
//     }

//     function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
//         internal
//         override(Governor, GovernorTimelockControl)
//         returns (uint256)
//     {
//         return super._cancel(targets, values, calldatas, descriptionHash);
//     }

//     function _executor()
//         internal
//         view
//         override(Governor, GovernorTimelockControl)
//         returns (address)
//     {
//         return super._executor();
//     }

//     function supportsInterface(bytes4 interfaceId)
//         public
//         view
//         override(Governor, GovernorTimelockControl)
//         returns (bool)
//     {
//         return super.supportsInterface(interfaceId);
//     }
// }
