// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "../interfaces/IAMORxGuild.sol";
import "../interfaces/IFXAMORxGuild.sol";
import "../interfaces/IGuildController.sol";
import "../interfaces/IMetaDaoController.sol";

/// Advanced math functions for bonding curve
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title GuildController contract
/// @author Daoism Systems Team
/// @notice GuildController contract controls the all of the deployed contracts of the guild

contract GuildControllerVersionForTesting is IGuildController, Ownable {
    using SafeERC20 for IERC20;

    int256[] public reportsWeight; // this is an array, which describes the amount of the weight of each report.(So the reports will later receive payments based on this weight)
    mapping(uint256 => mapping(address => int256)) public votes; // votes mapping(uint report => mapping(address voter => int256 vote))
    mapping(uint256 => address[]) public voters; // voters mapping(uint report => address [] voters)
    int256[] public reportsVoting; // results of the vote for the report with spe
    mapping(uint256 => address) public reportsAuthors;
    uint256 public totalReportsWeight; // total Weight of all of reports

    address[] public impactMakers; // list of impactMakers of this DAO

    // user --> token --> amount
    mapping(address => mapping(address => uint256)) public claimableTokens; // amount of tokens each specific address(impactMaker) can claim
    mapping(address => uint256) public weights; // weight of each specific Impact Maker/Builder
    uint256 public totalWeight; // total Weight of all of the impact makers
    uint256 public timeVoting; // deadlines for the votes for reports

    IERC20 private ERC20AMORxGuild;
    IFXAMORxGuild private FXGFXAMORxGuild;
    address public AMOR;
    address public AMORxGuild;
    address public dAMORxGuild;
    address public FXAMORxGuild;
    address public MetaDaoController;

    bool public trigger; // set true for a week if previous week were added >= 10 reports; users can vote only if trigger == true
    uint256[] public reportsQueue;
    mapping(uint256 => address) public queueReportsAuthors;

    uint256 public additionalVotingTime;
    uint256 public constant WEEK = 7 days; // 1 week is the time for the users to vore for the specific report
    uint256 public constant DAY = 1 days;
    uint256 public constant HOUR = 1 hours;
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public percentToConvert; //10% // FEE_DENOMINATOR/100*10

    event Initialized(address owner, address AMORxGuild);
    event DonatedToGuild(uint256 amount, address token, uint256 givenAmorxguild, address sender);
    event ReportAdded(uint256 newReportId, bytes32 report);
    event VotedForTheReport(address voter, uint256 reportId, uint256 amount, bool sign);
    event VotingPeriodUpdated(uint256 newPeriod);
    event PercentToConvertUpdated(uint256 newPercent);
    event ImpactMakerSetted(address arrImpactMakers, uint256 arrWeight);
    // event ImpactMakersSetted(address[] arrImpactMakers, uint256[] arrWeight);
    event ImpactMakerAdded(address newImpactMaker, uint256 weight);
    event ImpactMakerRemoved(address ImpactMaker);
    event ImpactMakerChanged(address ImpactMaker, uint256 weight);
    event TokensClaimedByImpactMaker(address ImpactMaker, address token, uint256 amount);

    bool private _initialized;

    error AlreadyInitialized();
    error Unauthorized();
    error EmptyArray();
    error InvalidParameters();
    error VotingTimeExpired();
    error VotingTimeNotFinished();
    error ReportNotExists();
    error InvalidAmount();
    error VotingNotStarted();
    error NotWhitelistedToken();

    /// Invalid address. Needed address != address(0)
    error AddressZero();

    /// Invalid address to transfer. Needed `to` != msg.sender
    error InvalidSender();

    function init(
        address initOwner, // The Avatar for this Guild
        address AMOR_,
        address AMORxGuild_,
        address FXAMORxGuild_,
        address MetaDaoController_
    ) external {
        if (_initialized) {
            revert AlreadyInitialized();
        }
        _transferOwnership(initOwner);

        AMOR = AMOR_;
        AMORxGuild = AMORxGuild_;
        ERC20AMORxGuild = IERC20(AMORxGuild_);
        FXGFXAMORxGuild = IFXAMORxGuild(FXAMORxGuild_);
        FXAMORxGuild = FXAMORxGuild_;
        MetaDaoController = MetaDaoController_;

        percentToConvert = 100;
        _initialized = true;
        emit Initialized(initOwner, AMORxGuild_);
    }

    function setVotingPeriod(uint256 newTime) external onlyOwner {
        // if (newTime < 2 days) {
        //     revert InvalidAmount();
        // }
        additionalVotingTime = newTime;
        emit VotingPeriodUpdated(newTime);
    }

    function setPercentToConvert(uint256 newPercentToConvert) external onlyOwner {
        percentToConvert = newPercentToConvert;
        emit PercentToConvertUpdated(newPercentToConvert);
    }

    /// @notice called by donate and gatherDonation, distributes amount of tokens between
    /// all of the impact makers based on their weight.
    /// Afterwards, based on the weights distribution, tokens will be automatically redirected to the impact makers
    function distribute(uint256 amount, address token) internal returns (uint256) {
        // based on the weights distribution, tokens will be automatically marked as claimable for the impact makers
        for (uint256 i = 0; i < impactMakers.length; i++) {
            uint256 amountToSendVoter = (amount * weights[impactMakers[i]]) / totalWeight;
            claimableTokens[impactMakers[i]][token] += amountToSendVoter;
        }

        return amount;
    }

    /// @notice gathers donation from MetaDaoController in specific token
    /// and calles distribute function for the whole amount of gathered tokens
    function gatherDonation(address token) public {
        // check if token in the whitelist of the MetaDaoController
        if (!IMetaDaoController(MetaDaoController).isWhitelisted(token)) {
            revert NotWhitelistedToken();
        }
        uint256 amount = IMetaDaoController(MetaDaoController).guildFunds(address(this), token);
        IMetaDaoController(MetaDaoController).claimToken(address(this), token);

        // distribute those tokens
        distribute(amount, token);
    }

    /// @notice allows to donate AMORxGuild tokens to the Guild
    /// @param allAmount The amount to donate
    /// @param token Token in which to donate
    // It automatically distributes tokens between Impact makers.
    // 10% of the tokens in the impact pool are getting staked in the FXAMORxGuild tokens,
    // which are going to be owned by the user.
    // Afterwards, based on the weights distribution, tokens will be automatically redirected to the impact makers.
    // Requires the msg.sender to `approve` amount prior to calling this function
    function donate(uint256 allAmount, address token) external returns (uint256) {
        // check if token in the whitelist of the MetaDaoController
        if (!IMetaDaoController(MetaDaoController).isWhitelisted(token)) {
            revert NotWhitelistedToken();
        }
        // if amount is below 10, most of the calculations will round down to zero, only wasting gas
        if (IERC20(token).balanceOf(msg.sender) < allAmount || allAmount < 10) {
            revert InvalidAmount();
        }

        uint256 amount = (allAmount * percentToConvert) / FEE_DENOMINATOR; // 10% of tokens
        uint256 amorxguildAmount = amount;

        // 10% of the tokens in the impact pool are getting:
        if (token == AMOR) {
            // convert AMOR to AMORxGuild
            // 2.Exchanged from AMOR to AMORxGuild using staking contract( if it’s not AMORxGuild)

            // Must calculate stakedAmor prior to transferFrom()
            uint256 stakedAmor = IERC20(token).balanceOf(address(this));
            // get all tokens
            // Note that if token is AMOR then this transferFrom() is taxed due to AMOR tax
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            // Calculate mint amount and mint this to the address `to`
            // Take AMOR tax into account
            uint256 taxCorrectedAmount = IERC20(token).balanceOf(address(this)) - stakedAmor;

            IERC20(token).approve(AMORxGuild, taxCorrectedAmount);

            amorxguildAmount = IAmorxGuild(AMORxGuild).stakeAmor(address(this), taxCorrectedAmount);
        } else if (token == AMORxGuild) {
            ERC20AMORxGuild.safeTransferFrom(msg.sender, address(this), amorxguildAmount);
        } else {
            // if token != AMORxGuild && token != AMOR
            // recieve tokens
            amount = 0;
        }

        if (token == AMORxGuild || token == AMOR) {
            // 3.Staked in the FXAMORxGuild tokens,
            // which are going to be owned by the user.
            ERC20AMORxGuild.approve(FXAMORxGuild, amorxguildAmount);
            FXGFXAMORxGuild.stake(msg.sender, amorxguildAmount); // from address(this)
        }
        uint256 decAmount = allAmount - amount; //decreased amount: other 90%

        uint256 tokenBefore = IERC20(token).balanceOf(address(this));

        IERC20(token).safeTransferFrom(msg.sender, address(this), decAmount);

        uint256 decTaxCorrectedAmount = IERC20(token).balanceOf(address(this)) - tokenBefore;

        distribute(decTaxCorrectedAmount, token); // distribute other 90%

        emit DonatedToGuild(allAmount, token, amorxguildAmount, msg.sender);
        return amorxguildAmount;
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

        address signer = ecrecover(prefixedHashMessage, v, r, s);
        if (signer != msg.sender) {
            revert Unauthorized();
        }

        uint256 newReportId = reportsQueue.length;

        queueReportsAuthors[newReportId] = msg.sender;

        // During the vote reports can be added, but they will be waiting and vote for them won’t start.
        // When the voting for the 10 reports is finished, and there are ≥ 10 reports in the queue,
        // than the vote for the next report set instantly starts.
        // The vote starts for all of the untouched reports in the queue.
        // timeVoting == 0 --> for the first queue when there was no voting yet
        reportsQueue.push(newReportId);
        emit ReportAdded(newReportId, report);
    }

    /// @notice burns the amount of FXTokens, and changes a report weight, based on a sign provided.
    /// It also sets a vote info for a specific voter.
    /// It requires the `amount` to be `approved` prior to being called
    /// @dev As soon as the first vote goes for report, we create a time limit for vote(a week).
    /// @param id ID of report to vote for
    /// @param amount Amount of FXTokens to use for vote and burn
    /// @param sign Boolean value: true (for) or false (against) user is voting
    function voteForReport(
        uint256 id,
        uint256 amount,
        bool sign
    ) external {
        // check if tthe voting for this report has started
        if (trigger == false) {
            revert VotingNotStarted();
        }

        if (amount == 0 && msg.sender != address(this)) {
            revert InvalidAmount();
        }

        // check if report with that id exists
        if (reportsWeight.length < id) {
            revert ReportNotExists();
        }

        //check if the week has passed - can vote only a week from first vote
        if (block.timestamp > (timeVoting + additionalVotingTime)) {
            revert VotingTimeExpired();
        }

        if (IERC20(FXAMORxGuild).balanceOf(msg.sender) < amount) {
            revert InvalidAmount();
        }

        FXGFXAMORxGuild.burn(msg.sender, msg.sender, amount);
        voters[id].push(msg.sender);

        reportsWeight[id] += int256(amount);
        totalReportsWeight += amount;

        if (sign == true) {
            reportsVoting[id] += int256(amount);
            votes[id][msg.sender] += int256(amount);
        } else {
            reportsVoting[id] -= int256(amount);
            votes[id][msg.sender] -= int256(amount);
        }

        emit VotedForTheReport(msg.sender, id, amount, sign);
    }

    /// @notice distributes funds, depending on the report ids, for which votings were conducted
    function finalizeVoting() public {
        // nothing to finalize
        if (trigger == false) {
            revert ReportNotExists();
        }

        if (block.timestamp < (timeVoting + additionalVotingTime)) {
            revert VotingTimeNotFinished();
        }

        for (uint256 id = 0; id < reportsWeight.length; id++) {
            // If report has positive voting weight (positive FX tokens) then report is accepted
            int256 fiftyPercent = (reportsWeight[id] * 50) / 100;
            address[] memory people = voters[id];

            if (reportsVoting[id] > 0) {
                // If report has positive voting weight, then funds go 50-50%,
                // 50% go to the report creater,
                ERC20AMORxGuild.safeTransfer(reportsAuthors[id], uint256(fiftyPercent));

                // and 50% goes to the people who voted positively
                for (uint256 i = 0; i < voters[id].length; i++) {
                    // if voted positively
                    if (votes[id][people[i]] > 0) {
                        // 50% * user weigth / all 100%
                        int256 amountToSendVoter = (int256(fiftyPercent) * votes[id][people[i]]) / reportsWeight[id];
                        ERC20AMORxGuild.safeTransfer(people[i], uint256(amountToSendVoter));
                    }
                    delete votes[id][people[i]];
                }
            } else {
                // If report has negative voting weight, then
                // 50% goes to the people who voted negatively,
                for (uint256 i = 0; i < voters[id].length; i++) {
                    // if voted negatively
                    if (votes[id][people[i]] < 0) {
                        // allAmountToDistribute(50%) * user weigth in % / all 100%
                        int256 absVotes = abs(votes[id][people[i]]);
                        int256 amountToSendVoter = (fiftyPercent * absVotes) / reportsWeight[id];
                        ERC20AMORxGuild.safeTransfer(people[i], uint256(amountToSendVoter));
                    }
                    delete votes[id][people[i]];
                }
                // and 50% gets redistributed between the passed reports based on their weights
                for (uint256 i = 0; i < reportsWeight.length; i++) {
                    // passed reports
                    if (reportsVoting[i] > 0) {
                        // allAmountToDistribute(50%) * report weigth in % / all 100%
                        int256 amountToSendReport = (fiftyPercent * reportsWeight[i]) / int256(totalReportsWeight);
                        ERC20AMORxGuild.safeTransfer(reportsAuthors[i], uint256(amountToSendReport));
                    }
                }
            }

            delete voters[id];
        }

        for (uint256 i = 0; i < reportsWeight.length; i++) {
            delete reportsAuthors[i];
        }

        delete reportsWeight;
        delete reportsVoting;
        totalReportsWeight = 0;
        timeVoting = 0;
        trigger = false;
    }

    /// @notice starts voting and clears reports queue
    function startVoting() external {
        // nothing to finalize
        // startVoting will not start voting if there is another voting in progress
        if (block.timestamp < (timeVoting + additionalVotingTime)) {
            revert VotingTimeNotFinished();
        }

        // check queque lenght. must be >= 10 reports
        if (reportsQueue.length < 1) {//10) {
            revert InvalidAmount();
        }

        // if the voting time is over, then startVoting will first call finalizeVoting and then start it's own functional
        // if timeVoting == 0 then skip call finalizeVoting for the first start
        if (block.timestamp >= (timeVoting + additionalVotingTime) && timeVoting != 0) {
            finalizeVoting();
        }

        uint256 endTime = block.timestamp;
        uint256 day = getWeekday(block.timestamp);

        // SUNDAY-CHECK
        if (day == 0) {
            endTime += WEEK;
        } else if (day == 6 || day == 5) {
            // if vote started on Friday/Saturday, then the end will be next week
            // end of the next week
            endTime += WEEK + (DAY * (7 - day));
        } else {
            endTime += WEEK - (DAY * day);
        }
        endTime = (endTime / DAY) * DAY;
        endTime += 12 * HOUR;

        for (uint256 i = 0; i < reportsQueue.length; i++) {
            reportsAuthors[i] = queueReportsAuthors[i];
            reportsWeight.push(0);
            reportsVoting.push(0);
            delete queueReportsAuthors[i];
        }

        timeVoting = endTime;
        trigger = true;
        delete reportsQueue;
    }

    /// @notice removes impact makers, resets mapping and array, and creates new array, mapping, and sets weights
    /// @param arrImpactMakers The array of impact makers
    /// @param arrWeight The array of weights of impact makers
    function setImpactMakers(address[] memory arrImpactMakers, uint256[] memory arrWeight) external onlyOwner {
        delete impactMakers;
        for (uint256 i = 0; i < arrImpactMakers.length; i++) {
            impactMakers.push(arrImpactMakers[i]);
            weights[arrImpactMakers[i]] = arrWeight[i];
            totalWeight += arrWeight[i];
            emit ImpactMakerSetted(arrImpactMakers[i], arrWeight[i]);
        }
        // emit ImpactMakersSetted(arrImpactMakers, arrWeight);
    }

    /// @notice allows to add impactMaker with a specific weight
    /// Only avatar can add one, based on the popular vote
    /// @param impactMaker New impact maker to be added
    /// @param weight Weight of the impact maker
    function addImpactMaker(address impactMaker, uint256 weight) external onlyOwner {
        // check thet ImpactMaker won't be added twice
        if (weights[impactMaker] > 0) {
            revert InvalidParameters();
        }
        impactMakers.push(impactMaker);
        weights[impactMaker] = weight;
        totalWeight += weight;
        emit ImpactMakerAdded(impactMaker, weight);
    }

    /// @notice allows to add change impactMaker weight
    /// @param impactMaker Impact maker to be changed
    /// @param weight Weight of the impact maker
    function changeImpactMaker(address impactMaker, uint256 weight) external onlyOwner {
        if (weight > weights[impactMaker]) {
            totalWeight += weight - weights[impactMaker];
        } else {
            totalWeight -= weights[impactMaker] - weight;
        }
        weights[impactMaker] = weight;
        emit ImpactMakerChanged(impactMaker, weight);
    }

    /// @notice allows to remove impactMaker with specific address
    /// @param impactMaker Impact maker to be removed
    function removeImpactMaker(address impactMaker) external onlyOwner {
        for (uint256 i = 0; i < impactMakers.length; i++) {
            if (impactMakers[i] == impactMaker) {
                impactMakers[i] = impactMakers[impactMakers.length - 1];
                impactMakers.pop();
                break;
            }
        }
        totalWeight -= weights[impactMaker];
        delete weights[impactMaker];
        emit ImpactMakerRemoved(impactMaker);
    }

    /// @notice allows to claim tokens for specific ImpactMaker address
    /// @param impact Impact maker to to claim tokens from
    /// @param token Tokens addresess to claim
    function claim(address impact, address[] memory token) external {
        if (impact != msg.sender) {
            revert Unauthorized();
        }
        for (uint256 i = 0; i < token.length; i++) {
            IERC20(token[i]).safeTransfer(msg.sender, claimableTokens[msg.sender][token[i]]);
            emit TokensClaimedByImpactMaker(msg.sender, token[i], claimableTokens[msg.sender][token[i]]);
            claimableTokens[msg.sender][token[i]] = 0;
        }
    }

    function getWeekday(uint256 timestamp) public pure returns (uint8) {
        return uint8((timestamp / DAY + 4) % 7); // day of week = (floor(T / 86400) + 4) mod 7.
    }

    function abs(int256 x) private pure returns (int256) {
        return x >= 0 ? x : -x;
    }
}
