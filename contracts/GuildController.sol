// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "./utils/interfaces/IFXAMORxGuild.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title GuildController contract
/// @author Daoism Systems Team
/// @notice GuildController contract controls the all of the deployed contracts of the guild

contract GuildController is Ownable {
    using SafeERC20 for IERC20;

    uint256[] public reportsWeight; // this is an array, which describes the amount of the weight of each report.(So the reports will later receive payments based on this weight)
    mapping(uint256 => mapping(address => uint256)) public votes; // votes mapping(uint report => mapping(address voter => int256 vote))
    mapping(uint256 => address[]) public voters; // voters mapping(uint report => address [] voters)
    uint256[] public reportsVoting; // results of the vote for the report with spe
    mapping(uint256 => address) public reportsAuthors;
    uint256 public totalReportsWeight; // total Weight of all of reports

    address[] public impactMakers; // list of impactMakers of this DAO
    mapping(address => uint256) claimableTokens; // amount of tokens each specific address(impactMaker) can claim
    mapping(address => uint256) public weights; // weight of each specific Impact Maker/Builder
    uint256 public totalWeight; // total Weight of all of the impact makers
    uint256[] public timeVoting; // deadlines for the vote for reports

    IERC20 private AMORxGuild;
    address public FXAMORxGuild;

    uint256 public ADDITIONAL_VOTING_TIME;
    uint256 public constant WEEK = 7 days; // 1 week is the time for the users to vore for the specific report
    uint256 public constant DAY_IN_SECONDS = 86400;
    uint256 constant HOUR_IN_SECONDS = 3600;
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public percentToConvert = 100; //10% // FEE_DENOMINATOR/100*10

    event Initialized(bool success, address owner, address AMORxGuild);

    bool private _initialized;

    error Unauthorized();
    error EmptyArray();
    error InvalidParameters();
    error VotingTimeExpired();
    error VotingTimeNotFinished();
    error ReportNotExists();
    error InvalidAmount();

    /// Invalid address. Needed address != address(0)
    error AddressZero();

    /// Invalid address to transfer. Needed `to` != msg.sender
    error InvalidSender();

    function init(
        address initOwner,
        address AMORxGuild_,
        address FXAMORxGuild_
    ) external returns (bool) {
        require(!_initialized, "Already initialized");

        _transferOwnership(initOwner);

        AMORxGuild = IERC20(AMORxGuild_);
        FXAMORxGuild = FXAMORxGuild_;
        ADDITIONAL_VOTING_TIME = 0;//WEEK;

        _initialized = true;
        emit Initialized(_initialized, initOwner, AMORxGuild_);
        return true;
    }

    function setVotingPeriod(uint256 newTime) external onlyOwner {
        if (newTime < 2 days) {
            revert InvalidAmount();
        }
        ADDITIONAL_VOTING_TIME = newTime;
    }

    /// @notice allows to donate AMORxGuild tokens to the Guild
    /// @param amount The amount to donate
    // It automatically distributes tokens between Impact makers.
    // 10% of the tokens in the impact pool are getting staked in the FXAMORxGuild tokens,
    // which are going to be owned by the user.
    // Afterwards, based on the weights distribution, tokens will be automatically redirected to the impact makers.
    function donate(uint256 amount) external returns (uint256) {
        if (AMORxGuild.balanceOf(msg.sender) < amount) {
            revert InvalidAmount();
        }

        // 10% of the tokens in the impact pool are getting staked in the FXAMORxGuild tokens,
        // which are going to be owned by the user.
        uint256 FxGAmount = (amount * percentToConvert) / FEE_DENOMINATOR; // FXAMORxGuild Amount = 10% of AMORxGuild, eg = Impact pool AMORxGuildAmount * 100 / 10
        AMORxGuild.transferFrom(msg.sender, address(this), FxGAmount);
        AMORxGuild.approve(FXAMORxGuild, FxGAmount);
        IFXAMORxGuild(FXAMORxGuild).stake(msg.sender, FxGAmount);

        uint256 decAmount = amount - FxGAmount; //decreased amount: other 90%

        // based on the weights distribution, tokens will be automatically redirected to the impact makers
        for (uint256 i = 0; i < impactMakers.length; i++) {
            uint256 amountToSendVoter = (decAmount * weights[impactMakers[i]]) / totalWeight;
            AMORxGuild.transferFrom(msg.sender, impactMakers[i], amountToSendVoter);
        }

        return amount;
    }

    /// @notice adds another element to the reportsWeight, with weight 0, and starts voting on it.
    /// @dev As soon as the report added, voting on it can start.
    /// @param report Hash of report (timestamp and report header)
    /// param signature Signature of this report (splitted into uint8 v, bytes32 r, bytes32 s)
    function addReport(
        bytes32 report,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // each report is an NFT (maybe hash-id of NFT and sign this NFT-hash)
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHashMessage = keccak256(abi.encodePacked(prefix, report));

        // ecrecover(bytes32 hash, uint8 v, bytes32 r, bytes32 s)
        address signer = ecrecover(prefixedHashMessage, v, r, s);
        if (signer != msg.sender) {
            revert Unauthorized();
        }

        uint256 newReportId = reportsVoting.length;

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
    function voteForReport(
        uint256 id,
        uint256 amount,
        bool sign
    ) external {
        // check if report with that id exists
        if (reportsWeight.length < id) {
            revert ReportNotExists();
        }

        if (voters[id].length == 0) {
            uint256 endTime = block.timestamp;
            uint256 day = getWeekday(block.timestamp);
            // SUNDAY-CHECK
            if (day == 0) {
                endTime += WEEK;
            } else if (day == 6 || day == 5) {
                // if vote started on Friday/Saturday, then the end will be next week
                // end of the next week
                endTime += WEEK + (DAY_IN_SECONDS * (7 - day));
            } else {
                endTime += WEEK - (DAY_IN_SECONDS * day);
            }
            endTime = endTime / DAY_IN_SECONDS * DAY_IN_SECONDS;
            endTime += 12 * HOUR_IN_SECONDS;

            timeVoting[id] = endTime;
        }

        if (block.timestamp > (timeVoting[id] + ADDITIONAL_VOTING_TIME)) {
            //check if the week has passed - can vote only a week from first vote
            revert VotingTimeExpired();
        }

        if (IERC20(FXAMORxGuild).balanceOf(msg.sender) < amount) {
            revert InvalidAmount();
        }

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
        // check if report with that id exists
        if (reportsWeight.length < id) {
            revert ReportNotExists();
        }

        if (block.timestamp < (timeVoting[id] + ADDITIONAL_VOTING_TIME)) {
            revert VotingTimeNotFinished();
        }

        // If report has positive voting weight (positive FX tokens) then report is accepted
        uint256 fiftyPercent = (reportsWeight[id] * 50) / 100;
        address[] memory people = voters[id];

        if (reportsVoting[id] > 0) {
            // If report has positive voting weight, then funds go 50-50%,
            // 50% go to the report creater,
            AMORxGuild.transfer(reportsAuthors[id], fiftyPercent);

            // and 50% goes to the people who voted positively
            for (uint256 i = 0; i < voters[id].length; i++) {
                // if voted positively
                if (votes[id][people[i]] > 0) {
                    // 50% * user weigth / all 100%
                    uint256 amountToSendVoter = (fiftyPercent *  votes[id][people[i]]) / reportsWeight[id];
                    AMORxGuild.transfer(people[i], amountToSendVoter);
                }
            }
        } else {
            // If report has negative voting weight, then
            // 50% goes to the people who voted negatively,
            for (uint256 i = 0; i < voters[id].length; i++) {
                // if voted negatively
                if (votes[id][people[i]] < 0) {
                    // allAmountToDistribute(50%) * user weigth in % / all 100%
                    uint256 amountToSendVoter = (fiftyPercent *  votes[id][people[i]]) / reportsWeight[id];
                    AMORxGuild.transfer(people[i], amountToSendVoter);
                }
            }
            // and 50% gets redistributed between the passed reports based on their weights
            for (uint256 i = 0; i < reportsWeight.length; i++) {
                // passed reports 
                if (reportsWeight[i] > 0) {
                    // TODO: add smth what will be solving no-passed-at-this-week-reports isssue
                    // allAmountToDistribute(50%) * report weigth in % / all 100%
                    uint256 amountToSendReport = (fiftyPercent * reportsWeight[i]) / totalReportsWeight;
                    AMORxGuild.transfer(reportsAuthors[i], amountToSendReport);
                }
            }
        }
    }

    function getWeekday(uint256 timestamp) public pure returns (uint8) {
        return uint8((timestamp / DAY_IN_SECONDS + 4) % 7); // day of week = (floor(T / 86400) + 4) mod 7.
    }

    /// @notice removes impact makers, resets mapping and array, and creates new array, mapping, and sets weights
    /// @param arrImpactMakers The array of impact makers
    /// @param arrWeight The array of weights of impact makers
    function setImpactMakers(address[] memory arrImpactMakers, uint256[] memory arrWeight) external onlyOwner {
        for (uint256 i = 0; i < arrImpactMakers.length; i++) {
            impactMakers.push(arrImpactMakers[i]);
            weights[arrImpactMakers[i]] = arrWeight[i];
            totalWeight += arrWeight[i];
        }
    }
}
