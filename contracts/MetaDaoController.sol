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
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./utils/interfaces/ICloneFactory.sol";
import "./utils/interfaces/IGuildController.sol";

contract MetaDaoController is AccessControl {
    using SafeERC20 for IERC20;
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
    address public constant SENTINEL = address(0x01);
    address public sentinelWhitelist;

    /// Clone Factory
    address public guildFactory;

    /// ERC20 tokens used by metada
    IERC20 public amorToken;

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
    bytes32 public constant FEES_INDEX = keccak256("FEES_INDEX");

    /// Constant for Guild based access control
    bytes32 public constant GUILD_ROLE = keccak256("GUILD_ROLE");

    /// Errors
    /// The claim is not valid
    error InvalidClaim();
    /// The token is not whitelisted
    error NotListed();
    /// The guild/index cannot be added because it already exists
    error Exists();
    error InvalidGuild();
    /// Not all guilds have weights!!
    /// Please ensure guild weights have been updated after adding new guild
    error ArrayError(address guild, uint256 index);
    /// The supplied array of index weights does not match the number of guilds
    error InvalidArray();
    /// The index array has not been set yet
    error NoIndex();

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
        sentinelWhitelist = _amor;
        whitelist[sentinelWhitelist] = SENTINEL;
        whitelist[SENTINEL] = _amor;
        indexHashes.push(FEES_INDEX);
    }

    /// @notice Allows a user to donate a whitelisted asset
    /// @dev    `approve` must have been called on the `token` contract
    /// @param  token the address of the token to be donated
    /// @param  amount the amount of tokens to donate
    function donate(
        address token,
        uint256 amount,
        uint256 index
    ) external {
        if (whitelist[token] == address(0)) {
            revert NotListed();
        }
        if (indexes[FEES_INDEX].indexDenominator == 0) {
            revert NoIndex();
        }
        if (token == address(amorToken)) {
            uint256 amorBalance = amorToken.balanceOf(address(this));
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            amorBalance = amorToken.balanceOf(address(this)) - amorBalance;
            allocateByIndex(token, amorBalance, index);
            donations[token] += amorBalance;
        } else {
            donations[token] += amount;
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            allocateByIndex(token, amount, index);
        }
    }

    /// @notice Allocates donated funds by the index specified
    /// @dev    This approach allows any guild to claim their funds at any time
    /// @param  token address of the ERC20 token to be donated
    /// @param  amount of the specified token to be allocated
    /// @param  index the index to be used to allocate the donation by
    function allocateByIndex(
        address token,
        uint256 amount,
        uint256 index
    ) internal {
        Index storage targetIndex = indexes[indexHashes[index]];
        for (uint256 i = 0; i < guilds.length; i++) {
            uint256 amountAllocated = (amount * targetIndex.indexWeights[guilds[i]]) / targetIndex.indexDenominator;
            guildFunds[guilds[i]][token] += amountAllocated;
        }
    }

    /// @notice Distributes both the fees and the token donations
    function claimAll(address guild) external {
        /// Apportion the AMOR received from fees
        distributeFees();
        /// Apportion the token donations
        claimTokens(guild);
    }

    /// @notice Distributes the specified token
    /// @param  token address of target token
    function claimToken(address token, address guild) public {
        if (whitelist[token] == address(0)) {
            revert NotListed();
        }
        uint256 amount = guildFunds[guild][token];
        donations[token] -= amount;
        /// Clear this guild's token balance
        delete guildFunds[guild][token];
        IERC20(token).approve(guild, amount);
        IGuildController(guild).donate(amount, token);
    }

    /// @notice Apportions approved token donations according to guild weights
    /// @dev    Loops through all whitelisted tokens and calls `distributeToken()` for each
    /// @param  guild the address of the guild claiming tokens
    function claimTokens(address guild) public onlyRole(GUILD_ROLE) {
        address endOfList = SENTINEL;
        /// Loop through linked list
        while (whitelist[endOfList] != SENTINEL) {
            claimToken(whitelist[endOfList], guild);
            endOfList = whitelist[endOfList];
        }
    }

    /// @notice Apportions collected AMOR fees
    function distributeFees() public {
        Index storage index = indexes[FEES_INDEX];
        /// Determine amount of AMOR that has been collected from fees
        uint256 feesToBeDistributed = amorToken.balanceOf(address(this)) - donations[address(amorToken)];
        for (uint256 i = 0; i < guilds.length; i++) {
            uint256 amountToDistribute = (feesToBeDistributed * index.indexWeights[guilds[i]]) / index.indexDenominator;
            if (amountToDistribute != 0) {
                guildFunds[guilds[i]][address(amorToken)] += amountToDistribute;
            }
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
        address controller = ICloneFactory(guildFactory).deployGuildContracts(guildOwner, name, tokenSymbol);
        grantRole(GUILD_ROLE, controller);
        guilds.push(controller);
    }

    /// @notice adds token to whitelist
    /// @dev    checks if token is present in whitelist mapping
    /// @param  _token address of the token to be whitelisted
    function addWhitelist(address _token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelist[sentinelWhitelist] = _token;
        sentinelWhitelist = _token;
        whitelist[sentinelWhitelist] = SENTINEL;
    }

    /// @notice removes guild based on id
    /// @param  index the index of the guild in guilds[]
    /// @param  controller the address of the guild controller to remove
    function removeGuild(uint256 index, address controller) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (guilds[index] == controller) {
            /// Transfer unclaimed funds to donations
            address endOfList = SENTINEL;
            /// Loop through linked list
            while (whitelist[endOfList] != SENTINEL) {
                donations[whitelist[endOfList]] += guildFunds[guilds[index]][whitelist[endOfList]];
                delete guildFunds[guilds[index]][whitelist[endOfList]];
                endOfList = whitelist[endOfList];
            }
            guildsTotalWeight -= guildWeight[guilds[index]];
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

    function updateFeeIndex(uint256[] memory weights) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (weights.length != guilds.length) {
            revert InvalidArray();
        }
        Index storage index = indexes[FEES_INDEX];
        for (uint256 i; i < guilds.length; i++) {
            index.indexWeights[guilds[i]] = weights[i];
            index.indexDenominator += weights[i];
        }
    }
}
