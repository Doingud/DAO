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

    address[] public impactMakers; // list of impactMakers of this DAO
    mapping(address => uint256) public weights; // weight of each specific Impact Maker/Builder
    uint256 public totalWeight; // total Weight of all of the impact makers
    uint256[] public timeVoting; // deadlines for the vote for reports

    uint256 public constant VOTING_TIME = 7 days; // 1 week is the time for the users to vore for the specific report

    IERC20 private AMORxGuild;
    address public FXAMORxGuild;

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

        _initialized = true;
        emit Initialized(_initialized, initOwner, AMORxGuild_);
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
            uint256 amountToSendVoter = (decAmount * weights[impactMakers[i]]) / totalWeight;
            AMORxGuild.transferFrom(msg.sender, impactMakers[i], amountToSendVoter);
        }

        return amount;
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
        }
    }
}
