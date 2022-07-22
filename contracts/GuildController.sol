// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "./utils/interfaces/IFXAMORxGuild.sol";
import "./utils/interfaces/IAmorGuildToken.sol";
import "./utils/interfaces/IERC20Base.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title GuildController contract
/// @author Daoism Systems Team
/// @notice GuildController contract controls the all of the deployed contracts of the guild

contract GuildController is Ownable {
    using SafeERC20 for IERC20;

    int256[] public reportsWeight; // this is an array, which describes the amount of the weight of each report.(So the reports will later receive payments based on this weight)
    mapping(uint256 => mapping(address => int256)) public votes; // votes mapping(uint report => mapping(address voter => int256 vote))
    mapping(uint256 => address[]) public voters; // voters mapping(uint report => address [] voters)
    int256[] public reportsVoting; // results of the vote for the report with spe
    mapping(uint256 => address) public reportsAuthors;
    uint256 public totalReportsWeight; // total Weight of all of reports

    address[] public impactMakers; // list of impactMakers of this DAO
    mapping(address => uint256) public claimableTokens; // amount of tokens each specific address(impactMaker) can claim
    mapping(address => uint256) public weights; // weight of each specific Impact Maker/Builder
    uint256 public totalWeight; // total Weight of all of the impact makers
    uint256[] public timeVoting; // deadlines for the vote for reports

    address private AMORxGuild;
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

        AMORxGuild = AMORxGuild_;
        FXAMORxGuild = FXAMORxGuild_;
        ADDITIONAL_VOTING_TIME = 0;

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
        if (IERC20(AMORxGuild).balanceOf(msg.sender) < amount) {
            revert InvalidAmount();
        }

        // 10% of the tokens in the impact pool are getting staked in the FXAMORxGuild tokens,
        // which are going to be owned by the user.
        uint256 FxGAmount = (amount * percentToConvert) / FEE_DENOMINATOR; // FXAMORxGuild Amount = 10% of AMORxGuild, eg = Impact pool AMORxGuildAmount * 100 / 10
        IERC20(AMORxGuild).transferFrom(msg.sender, address(this), FxGAmount);
        IERC20(AMORxGuild).approve(FXAMORxGuild, FxGAmount);
        IFXAMORxGuild(FXAMORxGuild).stake(msg.sender, FxGAmount);

        uint256 decAmount = amount - FxGAmount; //decreased amount: other 90%

        // based on the weights distribution, tokens will be automatically redirected to the impact makers
        for (uint256 i = 0; i < impactMakers.length; i++) {
            uint256 amountToSendVoter = (decAmount * weights[impactMakers[i]]) / totalWeight;
            // IERC20(AMORxGuild).transferFrom(msg.sender, impactMakers[i], amountToSendVoter);
            IERC20(AMORxGuild).transferFrom(msg.sender, address(this), amountToSendVoter);

            claimableTokens[impactMakers[i]] += amountToSendVoter; // TODO: fix formula
        }

        return amount;
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

    /// @notice allows to add impactMaker with a specific weight
    /// Only avatar can add one, based on the popular vote
    /// @param impactMaker New impact maker to be added
    /// @param weight Weight of the impact maker
    function addImpactMaker(address impactMaker, uint256 weight) external onlyOwner {
        impactMakers.push(impactMaker);
        weights[impactMaker] = weight;
        totalWeight += weight;
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
    }

    /// @notice allows to claim tokens for specific ImpactMaker address
    /// @param impact Impact maker to to claim tokens from
    function claim(address impact) external {
        if (impact != msg.sender) {
            revert Unauthorized();
        }
        IERC20Base(AMORxGuild).increaseAllowance(address(this), claimableTokens[impact]);
        IERC20(AMORxGuild).transferFrom(address(this), impact, claimableTokens[impact]);
        claimableTokens[impact] = 0;
    }

    function getWeekday(uint256 timestamp) public pure returns (uint8) {
        return uint8((timestamp / DAY_IN_SECONDS + 4) % 7); // day of week = (floor(T / 86400) + 4) mod 7.
    }

    function abs(int256 x) private pure returns (int256) {
        return x >= 0 ? x : -x;
    }
}
