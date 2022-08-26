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
import "./utils/interfaces/IGuildController.sol";

contract MetaDaoController is AccessControl {
    /// Guild-related variables
    /// Array of addresses of Guilds
    address[] public guilds;
    mapping(address => address) public guildControllers;
    mapping(address => uint256) public guildWeight;
    /// Mapping of guild --> token --> amount
    mapping(address => mapping(address => uint256)) public guildFunds;
    /// The total weight of the guilds
    uint256 public guildsTotalWeight;

    /// Donations variables
    mapping(address => uint256) public donations;

    /// Token related variables
    mapping(address => address) public whitelist;
    address public constant SENTINEL = address(0x01);
    address public sentinalWhitelist;

    /// Clone Factory
    address public guildFactory;

    /// Access Control
    bytes32 public GUILD_ROLE = keccak256("GUILD");

    /// ERC20 tokens used by metada
    IERC20 public amorToken;

    error InvalidClaim();
    error NotListed();
    /// The guild cannot be added because it already exists
    error Exists();
    error InvalidGuild();

    constructor(
        address _amor,
        address _cloneFactory,
        address admin
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(GUILD_ROLE, admin);
        amorToken = IERC20(_amor);
        guildFactory = _cloneFactory;
        /// Setup the linked list
        sentinalWhitelist = _amor;
        whitelist[sentinalWhitelist] = SENTINEL;
        whitelist[SENTINEL] = _amor;
    }

    /// @notice Updates a guild's weight
    /// @param  guildArray addresses of the guilds
    /// @param  newWeights weights of the guilds, must be correspond to the order of `guildArray`
    function updateGuildWeights(address[] memory guildArray, uint256[] memory newWeights) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (guildArray.length != guilds.length || newWeights.length != guilds.length) {
            revert InvalidGuild();
        }
        guildsTotalWeight = 0;
        for (uint256 i; i < guildArray.length; i++) {
            guildWeight[guildArray[i]] = newWeights[i];
            guildsTotalWeight += newWeights[i];
        }
    }

    /// @notice Allows a user to donate a whitelisted asset
    /// @dev    `approve` must have been called on the `token` contract
    /// @param  token the address of the token to be donated
    /// @param  amount the amount of tokens to donate
    function donate(address token, uint256 amount) external {
        if (whitelist[token] == address(0)) {
            revert NotListed();
        }
        if (token == address(amorToken)) {
            uint256 amorBalance = amorToken.balanceOf(address(this));
            IERC20(token).transferFrom(msg.sender, address(this), amount);
            amorBalance = amorToken.balanceOf(address(this)) - amorBalance;
            donations[token] += amorBalance;
        } else {
            donations[token] += amount;
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        }
    }

    /// @notice Distributes both the fees and the token donations
    function distributeAll() external {
        /// Apportion the AMOR received from fees
        distributeFees();
        /// Apportion the token donations
        distributeTokens();
    }

    /// @notice Distributes the specified token
    /// @param  token address of target token
    function distributeToken(address token) public {
        if (whitelist[token] == address(0)) {
            revert NotListed();
        }
        uint256 trackDistributions;
        /// Loop through guilds
        for (uint256 i = 0; i < guilds.length; i++) {
            uint256 amountToDistribute = (donations[token] * guildWeight[guilds[i]]) /
                guildsTotalWeight;
            if (amountToDistribute == 0) {
                continue;
            }
            guildFunds[guilds[i]][token] += amountToDistribute;
            /// Update the donation total for this token
            trackDistributions += amountToDistribute;
            }
        /// Decrease the donations by the amount of tokens distributed
        /// This prevents multiple calls to distribute attack vector
        donations[token] -= trackDistributions;
    }

    /// @notice Apportions approved token donations according to guild weights
    /// @dev    Loops through all whitelisted tokens and calls `distributeToken()` for each
    function distributeTokens() public {
        address endOfList = SENTINEL;
        /// Loop through linked list
        while (whitelist[endOfList] != SENTINEL) {
            distributeToken(whitelist[endOfList]);
            endOfList = whitelist[endOfList];
        }
    }

    /// @notice Apportions collected AMOR fees
    function distributeFees() public {
        /// Determine amount of AMOR that has been collected from fees
        uint256 feesToBeDistributed = amorToken.balanceOf(address(this)) - donations[address(amorToken)];
        for (uint256 i = 0; i < guilds.length; i++) {
            uint256 amountToDistribute = (feesToBeDistributed * guildWeight[guilds[i]]) / guildsTotalWeight;
            if (amountToDistribute != 0) {
                guildFunds[guilds[i]][address(amorToken)] += amountToDistribute;
            }
        }
    }

    /// @notice Transfers apportioned tokens from the metadao to the guild
    /// @dev only a guild can call this funtion
    function claim() public onlyRole(GUILD_ROLE) {
        /// Loop through the token linked list
        address helper = SENTINEL;
        while (whitelist[helper] != SENTINEL) {
            /// Donate or transfer the token
            bool success = IERC20(whitelist[helper]).transfer(msg.sender, guildFunds[msg.sender][whitelist[helper]]);
            if (!success) {
                revert InvalidClaim();
            }
            /// Clear this guild's token balance
            delete guildFunds[msg.sender][whitelist[helper]];
            /// Advance the helper to the next link in the list
            helper = whitelist[helper];
        }
    }

    /// @notice use this funtion to create a new guild via the guild factory
    /// @dev only admin can all this funtion
    /// @param guildOwner address that will control the functions of the guild
    /// @param name the name for the guild
    /// @param tokenSymbol the symbol for the Guild's token
    function createGuild(
        address guildOwner,
        string memory name,
        string memory tokenSymbol
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        ICloneFactory(guildFactory).deployGuildContracts(guildOwner, name, tokenSymbol);
    }

    /// @notice adds guild based on the controller address provided
    /// @dev give guild role in access control to the controller for the guild
    /// @param controller the controller address of the guild
    function addGuild(address controller) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i; i < guilds.length; i++) {
            if (controller == guilds[i]) {
                revert Exists();
            }
        }
        grantRole(GUILD_ROLE, controller);
        guilds.push(controller);
    }

    /// @notice adds guild based on the controller address provided
    /// @dev give guild role in access control to the controller for the guild
    /// @param _token the controller address of the guild
    function addWhitelist(address _token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelist[sentinalWhitelist] = _token;
        sentinalWhitelist = _token;
        whitelist[sentinalWhitelist] = SENTINEL;
    }

    /// @notice removes guild based on id
    /// @param index the index of the guild in guilds[]
    /// @param controller the address of the guild controller to remove
    function removeGuild(uint256 index, address controller) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (guilds[index] == controller) {
            guilds[index] = guilds[guilds.length - 1];
            guilds.pop();
            revokeRole(GUILD_ROLE, controller);
        } else {
            revert InvalidGuild();
        }
    }

    /// @notice Checks that a token is whitelisted
    /// @param  token address of the ERC20 token being checked
    /// @return bool true if token whitelisted, false if not whitelisted
    function isWhitelisted(address token) external view returns (bool) {
        if (whitelist[token] == address(0)) {
            revert NotListed();
        }
        return true;
    }
}
