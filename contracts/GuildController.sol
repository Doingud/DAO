// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "./utils/interfaces/IFXAMORxGuild.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title GuildController contract
/// @author Daoism Systems Team
/// @notice GuildController contract controls the all of the deployed contracts of the guild

contract GuildController {
    uint256[] public reportsWeight; // this is an array, which describes the amount of the weight of each report.(So the reports will later receive payments based on this weight)
    mapping(uint256 => mapping(address => uint256)) public votes; // votes mapping(uint report => mapping(address voter => int256 vote))
    mapping(uint256 => address[]) public voters; // voters mapping(uint report => address [] voters)
    uint256[] public reportsVoting; // results of the vote for the report with spe
    mapping(uint256 => address) public reportsAuthors;
    uint256 public totalReportsWeight; // total Weight of all of reports

    address[] impactMakers; // list of impactMakers of this DAO
    mapping(address => uint256) claimableTokens; // amount of tokens each specific address(impactMaker) can claim
    mapping(address => uint256) weights; // weight of each specific Impact Maker/Builder
    uint256 totalWeight; // total Weight of all of the impact makers
    uint256[] timeVoting; // time of the forst vote the report with specific id

    uint256 public constant VOTING_TIME = 7 days; // 1 week is the time for the users to vore for the specific report

    address public owner;
    address public FXAMORxGuild;
    address public guild;

    IERC20 private AMORxGuild;

    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public percentToConvert = 100; //10% // FEE_DENOMINATOR/100*80

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
        address initOwner_,
        address AMORxGuild_,
        address FXAMORxGuild_,
        address guild_,
        address firstImpactMaker
    ) external returns (bool) {
        require(!_initialized, "Already initialized");

        owner = initOwner_;
        AMORxGuild = IERC20(AMORxGuild_);
        FXAMORxGuild = FXAMORxGuild_;
        guild = guild_;
        impactMakers.push(firstImpactMaker);
        weights[firstImpactMaker] = 1;
        totalWeight = 1;

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
            uint256 weight = weights[impactMakers[i]] / totalWeight; // impartMakerWeight / totalWeight
            uint256 amountToSendVoter = decAmount * weight;
            AMORxGuild.transferFrom(msg.sender, impactMakers[i], amountToSendVoter);
        }

        return amount;
    }
}
