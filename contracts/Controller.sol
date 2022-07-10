// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "./utils/interfaces/IFXAMORxGuild.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

/// @title Controller contract
/// @author Daoism Systems Team
/// @notice Controller contract controls the all of the deployed contracts of the guild

contract Controller {
    int256[] reportsWeight; // this is an array, which describes the amount of the weight of each report.(So the reports will later receive payments based on this weight)
    mapping(uint256 => mapping(address => int256)) votes; // votes mapping(uint report => mapping(address voter => int256 vote))
    mapping(uint256 => address[]) voters; // voters mapping(uint report => address [] voters)
    uint256[] reportsVoting; // results of the vote for the report with specific id
    mapping(address => bool) impactMakers;

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

        // _transferOwnership(initOwner_);

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
    /// @param report The report to add
    /// @param signature Function checks if a report is ok to start voting on(based on signature)
    function addReport(bytes memory report, bytes memory signature) external {

        uint256 newReportId = reportsWeight.length;

        // saveRepostContent = report; TODO

        reportsWeight[newReportId] = 0;//report);//[length] = 0;
        // reportsVoting[newReportId] = 0;//[length] = 0;


        // int256[] reportsWeight; // this is an array, which describes the amount of the weight of each report.(So the reports will later receive payments based on this weight)
        // mapping(uint256 => mapping(address => int256)) votes; // votes mapping(uint report => mapping(address voter => int256 vote))
        // mapping(uint256 => address[]) voters; // voters mapping(uint report => address [] voters)
        // uint256[] reportsVoting; // results of the vote for the report with specific id
        // mapping(address => bool) impactMakers;
    }

    /// @notice burns the amount of FXTokens, and changes a report weight, based on a sign provided. 
    /// It also sets a vote info for a specific voter. 
    /// @dev As soon as the first vote goes for report, we create a time limit for vote(a week).
    /// @param id ID of report to vote for
    /// @param amount Amount of FXTokens to use for vote and burn
    /// @param sign The signature of the voting signed by the reporter
    function voteForReport(uint256 id, int256 amount, bool sign) external {


        bytes32 hash = ; //TODO
        require(
            SignatureChecker.isValidSignatureNow(
                msg.sender,
                hash
                rootSig
            ),
            "invalid result signature"
        );

        reportsWeight[id] += amount;
        // reportsVoting[newReportId] = 0;//[length] = 0;
    }

    /// @notice distributes funds, depending on the report ids, for which votings were conducted. 
    /// @param id ID of report from distributes funds
    function finalizeReportVoting(uint256 id) external {

        if (reportsWeight[id] >= 0) {
            // If report has positive voting weight, then funds go 50-50%, 50% go to the report creater, 
            // and 50% goes to the people who voted positively

        } else {
            // If report has negative voting weight, then 50% goes to the people who voted negatively, 
            // and 50% gets redistributed between the passed reports based on their weights

        }
    }
}
