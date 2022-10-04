// SPDX-License-Identifier: MIT

/// @title  MetaDAO Controller
/// @author Daoism Systems Team
/// @custom security-contact contact@daoism.systems

/**
 *  @dev Implementation of the MetaDAO controller logic for DoinGud MetaDAO
 *
 *  The MetaDAO creates new guilds and collects fees from AMOR token transfers.
 *  The collected funds can then be claimed by guilds.
 */

pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./utils/interfaces/ICloneFactory.sol";
import "./utils/interfaces/IMetadao.sol";
import "./utils/interfaces/IGuildController.sol";

contract MetaDaoControllerMock is IMetadao, AccessControl {
    error InvalidGuild();

    /// Guild-related variables
    /// Array of addresses of Guilds
    address[] public guilds;
    mapping(address => uint256) public guildWeight;
    /// Mapping of guild --> token --> amount
    mapping(address => mapping(address => uint256)) public guildFunds;
    /// The total weight of the guilds
    uint256 public guildsTotalWeight;

    /// Donations variables
    mapping(address => uint256) public donations;

    /// Token related variables
    mapping(address => uint256) public whitelist;

    /// Clone Factory
    address public guildFactory;

    /// ERC20 tokens used by metada
    address public amor;
    IERC20 public amorToken;
    IERC20 public usdcToken;

    /// Roles
    bytes32 public constant GUILD_ROLE = keccak256("GUILD");

    error InvalidClaim();
    error NotListed();
    error AlreadyAdded();

    constructor(
        address _amor,
        address _usdc,
        address _cloneFactory,
        address admin
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(GUILD_ROLE, admin);
        usdcToken = IERC20(_usdc);
        amorToken = IERC20(_amor);
        amor = _amor;
        guildFactory = _cloneFactory;
        whitelist[_amor] = 1;
    }

    /// @notice adds guild based on the controller address provided
    /// @dev give guild role in access control to the controller for the guild
    /// @param token the controller address of the guild
    function addWhitelist(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // check that token won't be added twice
        if (whitelist[token] != 0) {
            revert AlreadyAdded();
        }

        whitelist[token] = 1;
    }

    /// @notice Checks that a token is whitelisted
    /// @param  token address of the ERC20 token being checked
    /// @return bool true if token whitelisted, false if not whitelisted
    function isWhitelisted(address token) external view returns (bool) {
        if (whitelist[token] == 0) {
            revert NotListed();
        }
        return true;
    }

    // no result
    function distribute(address token, address controller) external {
        IGuildController(controller).gatherDonation(token);
    }

    function claimDonation(address token, address controller) external returns (uint256) {
        uint256 amount = IERC20(token).balanceOf(address(this));
        // transfer funds to the GuildController
        IERC20(token).transfer(controller, IERC20(token).balanceOf(address(this)));
        guildFunds[controller][token] = amount;
        return amount;
    }

    function getGuildFunds(address token, address controller) external view returns (uint256) {
        return guildFunds[controller][token];
    }
}
