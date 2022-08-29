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

contract MetaDaoController is AccessControl {
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
    mapping(address => address) public whitelist;
    address public constant SENTINAL = address(0x01);
    address public sentinalWhitelist;

    /// Clone Factory
    address public guildFactory;

    /// ERC20 tokens used by metada
    IERC20 public amorToken;
    IERC20 public usdcToken;

    /// Roles
    bytes32 public constant GUILD_ROLE = keccak256("GUILD");

    /// Indexes
    /// Create the Index object
    struct Index {
        address creator;
        uint256 indexDenominator;
        mapping(address => uint256) indexWeights;
    }

    /// Create an array to hold the different indexes
    mapping(bytes32 => Index) public indexes;
    bytes32[] public indexHashes;

    /// Errors
    /// The claim is not valid
    error InvalidClaim();
    /// The token is not whitelisted
    error NotListed();
    /// The guild/index cannot be added because it already exists
    error Exists();
    /// The supplied array of index weights does not match the number of guilds
    error InvalidArray();

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
        guildFactory = _cloneFactory;
        sentinalWhitelist = _amor;
        whitelist[sentinalWhitelist] = SENTINAL;
        whitelist[SENTINAL] = _amor;
    }

    /// @notice Updates a guild's weight
    /// @param  newWeight the amount of staked AMORxGuild in this guild
    /// @return bool the guild's balance was updated successfully
    function updateGuildWeight(uint256 newWeight) external onlyRole(GUILD_ROLE) returns (bool) {
        /// If `distribute` is still in cooldown, or if the guild weight does not change
        if (guildWeight[msg.sender] == newWeight) {
            return false;
        }
        /// If the new weight is less than the current weight:
        /// Decrease the total guilds weight by the difference between the old and the new weight
        /// Update guildWeight
        if (guildWeight[msg.sender] > newWeight) {
            guildsTotalWeight -= (guildWeight[msg.sender] - newWeight);
            guildWeight[msg.sender] = newWeight;
            return true;
        }
        /// If not yet exited then newWeight > guildWeight
        /// Increase the total guild weight by the difference and set guildWeight == newWeight
        guildsTotalWeight += (newWeight - guildWeight[msg.sender]);
        guildWeight[msg.sender] = newWeight;
        return true;
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

    /// @notice Distributes the amortoken in the metadao to the approved guilds but guild weight
    /// @dev    Creates an array of the current guild weights to pass to `_distribute`
    /// @param  index the chosen index of weights to use
    function distribute(uint256 index) public {
        /// Apportion the AMOR received from fees
        distributeFees(index);
        /// Apportion the token donations
        distributeTokens(index);
    }

    /// @notice Apportions approved token donations according to guild weights
    /// @param  currentGuildWeights an array of the current weights of all the guilds
    function distributeTokens(uint256 index) internal {
        Index memory index = indexes[indexHashes[index]];
        address endOfList = SENTINAL;
        /// Loop through linked list
        while (whitelist[endOfList] != SENTINAL) {
            /// Track the amount of donations distributed
            uint256 trackDistributions;
            /// Loop through guilds
            for (uint256 i = 0; i < guilds.length; i++) {
                uint256 amountToDistribute = (donations[whitelist[endOfList]] * index.indexWeights[guilds[i]]) /
                    index.indexDenominator;
                if (amountToDistribute == 0) {
                    continue;
                }
                guildFunds[guilds[i]][whitelist[endOfList]] += amountToDistribute;
                /// Update the donation total for this token
                trackDistributions += amountToDistribute;
            }
            /// Decrease the donations by the amount of tokens distributed
            /// This prevents multiple calls to distribute attack vector
            donations[whitelist[endOfList]] -= trackDistributions;
            endOfList = whitelist[endOfList];
        }
    }

    /// @notice Apportions collected AMOR fees
    /// @param  index the index to use
    function distributeFees(uint256 index) internal {
        Index memory index = indexes[indexHashes[index]];
        /// Determine amount of AMOR that has been collected from fees
        uint256 feesToBeDistributed = amorToken.balanceOf(address(this)) - donations[address(amorToken)];
        for (uint256 i = 0; i < guilds.length; i++) {
            uint256 amountToDistribute = (feesToBeDistributed * index.indexWeights[guilds[i]]) / index.indexDenominator;
            if (amountToDistribute != 0) {
                guildFunds[guilds[i]][address(amorToken)] += amountToDistribute;
            }
        }
    }

    /// @notice Transfers apportioned tokens from the metadao to the guild
    /// @dev only a guild can call this funtion
    function claim() public onlyRole(GUILD_ROLE) {
        /// Loop through the token linked list
        address helper = SENTINAL;
        while (whitelist[helper] != SENTINAL) {
            /// Transfer the token
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
    /// @dev    only admin can all this funtion
    /// @param  guildOwner address that will control the functions of the guild
    /// @param  name the name for the guild
    /// @param  tokenSymbol the symbol for the Guild's token
    function createGuild(
        address guildOwner,
        string memory name,
        string memory tokenSymbol
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        address newGuildController = ICloneFactory(guildFactory).deployGuildContracts(guildOwner, name, tokenSymbol);
        addGuild(newGuildController);
    }

    /// @notice adds guild based on the controller address provided
    /// @dev    give guild role in access control to the controller for the guild
    /// @param  controller the controller address of the guild
    function addGuild(address controller) internal {
        grantRole(GUILD_ROLE, controller);
        guilds.push(controller);
    }

    /// @notice adds token to whitelist
    /// @dev    checks if token is present in whitelist mapping
    /// @param  _token address of the token to be whitelisted
    function addWhitelist(address _token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelist[sentinalWhitelist] = _token;
        sentinalWhitelist = _token;
        whitelist[sentinalWhitelist] = SENTINAL;
    }

    /// @notice removes guild based on id
    /// @param  index the index of the guild in guilds[]
    /// @param  controller the address of the guild controller to remove
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

    /// @notice Adds a new index to the `Index` array
    /// @param  weights an array containing the weighting indexes for different guilds
    /// @return index of the new index in the `Index` array
    function addIndex(uint256[] memory weights) external returns (uint256) {
        if (weights.length != guilds.length) {
            revert InvalidArray();
        }
        /// Using the hash of the array allows a O(1) check if that index exists already
        bytes32 hashArray = keccak256(abi.encodePacked(weights));
        Index storage index = indexes[hashArray];
        if (index.indexDenominator != 0) {
            revert Exists();
        }
        for (uint256 i; i < guilds.length; i++) {
            index.indexWeights[guilds[i]] = weights[i];
            index.indexDenominator += weights[i];
        }
        indexHashes.push(hashArray);
        return indexHashes.length;
    }
}
