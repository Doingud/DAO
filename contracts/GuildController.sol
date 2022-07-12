// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "./utils/interfaces/IFXAMORxGuild.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

/// @title GuildController contract
/// @author Daoism Systems Team
/// @notice GuildController contract controls the all of the deployed contracts of the guild

contract GuildController {
    uint256[] reportsWeight; // this is an array, which describes the amount of the weight of each report.(So the reports will later receive payments based on this weight)
    mapping(uint256 => mapping(address => uint256)) votes; // votes mapping(uint report => mapping(address voter => int256 vote))
    mapping(uint256 => address[]) voters; // voters mapping(uint report => address [] voters)
    uint256[] reportsVoting; // results of the vote for the report with spe
    mapping(uint256 => address) reportsAuthors;
    uint256 totalReportsWeight; // total Weight of all of reports
    mapping(uint256 => bytes32) reportsContent;

    mapping(address => bool) impactMakers;
    mapping(address => uint) claimableTokens; // amount of tokens each specific address(impactMaker) can claim.
    mapping(address => uint) weights;// weight of each specific Impact Maker/Builder.
    uint256 totalWeight; // total Weight of all of the impact makers.
    uint256[] timeVoting; // time of the forst vote the report with specific id

    uint256 public constant VOTING_TIME = 7 days; // 1 week is the time for the users to vore for the specific report

    address public owner;
    address public AMORxGuild;
    address public FXAMORxGuild;
    address public guild;
    address public impactPoll;
    address public projectPoll;

    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public impactFees = 800; //80% // FEE_DENOMINATOR/100*80
    uint256 public projectFees = 200; //20%

    event Initialized(bool success, address owner, address AMORxGuild);

    bool private _initialized;

    error Unauthorized();
    error EmptyArray();
    error InvalidParameters();
    error VotingTimeExpired();
    error VotingTimeNotFinished();
    error ReportNotExists();
    /// Invalid balance to transfer. Needed `minRequired` but sent `amount`
    /// @param sent sent amount.
    /// @param minRequired minimum amount to send.
    error InvalidAmount(uint256 sent, uint256 minRequired);

    /// Invalid address. Needed address != address(0)
    error AddressZero();

    /// Invalid address to transfer. Needed `to` != msg.sender
    error InvalidSender();

    function init(
        address initOwner_,
        address AMORxGuild_,
        address FXAMORxGuild_,
        address guild_,
        address impactPoll_,
        address projectPoll_
    ) external returns (bool) {
        require(!_initialized, "Already initialized");

        owner = initOwner_;
        AMORxGuild = AMORxGuild_;
        FXAMORxGuild = FXAMORxGuild_;
        guild = guild_;
        impactPoll = impactPoll_;
        projectPoll = projectPoll_;

        _initialized = true;
        emit Initialized(_initialized, initOwner_, AMORxGuild_);
        return true;
    }

    modifier onlyAddress(address authorizedAddress) {
        if (msg.sender != authorizedAddress) {
            revert Unauthorized();
        }
        _;
    }

    /// @notice allows to donate AMORxGuild tokens to the Guild
    /// @param amount The amount to donate
    // It automatically distributes tokens between Impact and project polls
    // (which are both multisigs and governed by the owners of dAMOR) in the 80%-20% distribution.
    // 10% of the tokens in the impact pool are getting staked in the FXAMORxGuild tokens,
    // which are going to be owned by the user.
    function donate(uint256 amount) external returns (uint256) {
        if (IERC20(AMORxGuild).balanceOf(msg.sender) < amount) {
            revert InvalidAmount(amount, IERC20(AMORxGuild).balanceOf(msg.sender));
        }

        // send donation to the Controller
        // IERC20(AMORxGuild).transferFrom(msg.sender, address(this), amount);

        uint256 ipAmount = (amount * impactFees) / FEE_DENOMINATOR; // amount to Impact poll
        uint256 ppAmount = (amount * projectFees) / FEE_DENOMINATOR; // amount to project poll

        uint256 FxGAmount = (ipAmount * 100) / FEE_DENOMINATOR; // FXAMORxGuild Amount = 10% of AMORxGuild, eg = Impact poll AMORxGuildAmount * 100 / 10
        // 10% of the tokens in the impact pool are getting staked in the FXAMORxGuild tokens,
        // which are going to be owned by the user.
        IERC20(AMORxGuild).transferFrom(msg.sender, address(this), FxGAmount);
        IERC20(AMORxGuild).approve(FXAMORxGuild, FxGAmount);

        IFXAMORxGuild(FXAMORxGuild).stake(msg.sender, FxGAmount);

        uint256 decIpAmount = ipAmount - FxGAmount; //decreased ipAmount
        IERC20(AMORxGuild).transferFrom(msg.sender, impactPoll, decIpAmount);
        IERC20(AMORxGuild).transferFrom(msg.sender, projectPoll, ppAmount);

        return amount;
    }


    /// @notice adds another element to the reportsWeight, with weight 0, and starts voting on it. 
    /// @dev As soon as the report added, voting on it can start.
    /// @param report Hash of report (timestamp and report header)
    /// param signature Signature of this report (splitted into uint8 v, bytes32 r, bytes32 s)
    function addReport(bytes32 report, uint8 v, bytes32 r, bytes32 s) external { 

        // each report is an NFT (maybe hash-id of NFT and sign this NFT-hash)
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHashMessage = keccak256(abi.encodePacked(prefix, report));

        // ecrecover(bytes32 hash, uint8 v, bytes32 r, bytes32 s)
        address signer = ecrecover(prefixedHashMessage, v, r, s);
        if (signer != msg.sender) {
            revert Unauthorized();
        }

        uint256 newReportId = reportsVoting.length;

        reportsContent[newReportId] = report; // save report info
        reportsAuthors[newReportId] = msg.sender;
        reportsWeight.push(0);
        reportsVoting.push(0);
        timeVoting.push(0);
    }

    /// @notice burns the amount of FXTokens, and changes a report weight, based on a sign provided. 
    /// It also sets a vote info for a specific voter. 
    /// @dev As soon as the first vote goes for report, we create a time limit for vote(a week).
    /// @param id ID of report to vote for
    /// @param amount Amount of FXTokens to use for vote and burn
    /// @param sign Boolean value: true (for) or false (against) user is voting
    function voteForReport(uint256 id, uint256 amount, bool sign) external {

        // TODO: check if report with that id exists
        if (reportsWeight.length < id) {
            revert ReportNotExists();
        }

        if (voters[id].length == 0) {
            timeVoting[id] = block.timestamp;
        } else if (block.timestamp > (timeVoting[id] + VOTING_TIME)) {
            //check if the week has passed - can vote only a week from first vote
            revert VotingTimeExpired();
        }
        // TODO: check if have enough funds

        IFXAMORxGuild(FXAMORxGuild).burn(msg.sender, amount);

        voters[id].push(msg.sender);
        reportsWeight[id] += amount;

        if (sign == true) {
            reportsVoting[id] += amount;
            votes[id][msg.sender] += amount;
        } else {
            reportsVoting[id] -= amount;
            votes[id][msg.sender] -= amount;
        }
    }

    /// @notice distributes funds, depending on the report ids, for which votings were conducted. 
    /// @param id ID of report from distributes funds
    function finalizeReportVoting(uint256 id) external {

        if (block.timestamp < (timeVoting[id] + VOTING_TIME)) {
            revert VotingTimeNotFinished();
        }

        // if > 80% positive FX tokens then report is accepted
        uint256 necessaryPercent = (reportsWeight[id] * 80) / 100;
        uint256 fiftyPercent = (reportsWeight[id] * 50) / 100;
        address[] memory people = voters[id];

        if (reportsVoting[id] > necessaryPercent) {
            // If report has positive voting weight, then funds go 50-50%, 
            // 50% go to the report creater,
            IERC20(AMORxGuild).transfer(reportsAuthors[id], fiftyPercent);

            // and 50% goes to the people who voted positively
            for (uint256 i = 0; i < voters[id].length; i++) {
                if (votes[id][people[i]] > 0) { // voted positively
                    uint256 weight = votes[id][people[i]] / reportsWeight[id]; // amountFromUser / allAmount
                    // 50% * user weigth / all 100%
                    uint256 amountToSendVoter = (fiftyPercent * weight) / 100;//reportsWeight[id];
                    IERC20(AMORxGuild).transfer(people[i], amountToSendVoter);
                }
            }

        } else {
            // If report has negative voting weight, then 
            // 50% goes to the people who voted negatively,
            for (uint256 i = 0; i < voters[id].length; i++) {
                if (votes[id][people[i]] < 0) { // voted negatively
                    uint256 weight = votes[id][people[i]] / reportsWeight[id]; // weightFromUser / allWeight
                    // allAmountToDistribute(50%) * user weigth in % / all 100%
                    uint256 amountToSendVoter = (fiftyPercent * weight) / reportsWeight[id];
                    IERC20(AMORxGuild).transfer(people[i], amountToSendVoter);
                }
            }
            // and 50% gets redistributed between the passed reports based on their weights
            for (uint256 i = 0; i < reportsWeight.length; i++) {
                if (reportsWeight[i] > 0) { // passed reports // TODO: check. maybe add mappint uint --> bool - if passed
                    uint256 weight = reportsWeight[i] / totalReportsWeight; // weightFromReport / allWeight
                    // allAmountToDistribute(50%) * report weigth in % / all 100%
                    uint256 amountToSendReport = (fiftyPercent * weight) / 100;
                    IERC20(AMORxGuild).transfer(reportsAuthors[i], amountToSendReport);
                }
            }
        }
    }
}
