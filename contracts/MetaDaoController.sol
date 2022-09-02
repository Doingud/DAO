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
    /// address[] public guilds;
    mapping(address => address) public guilds;
    address public sentinelGuilds;
    uint256 public guildCounter;
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
    /// The token is not whitelisted
    error NotListed();
    /// The guild/index cannot be added because it already exists
    error Exists();
    /// The guild doesn't exist
    error InvalidGuild();
    /// Not all guilds have weights!!
    /// Please ensure guild weights have been updated after adding new guild
    error IndexError();
    /// The supplied array of index weights does not match the number of guilds
    error InvalidArray();
    /// The index array has not been set yet
    error NoIndex();

    constructor(address _amor, address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(GUILD_ROLE, admin);
        amorToken = IERC20(_amor);
        //guildFactory = _cloneFactory;
        /// Setup the linked list
        sentinelWhitelist = _amor;
        whitelist[sentinelWhitelist] = SENTINEL;
        whitelist[SENTINEL] = _amor;
        indexHashes.push(FEES_INDEX);
        /// Setup guilds linked list
        sentinelGuilds = address(0x01);
        guilds[sentinelGuilds] = SENTINEL;
        guilds[SENTINEL] = sentinelGuilds;
    }

    //  Temp fix for unit tests!!
    function setGuildFactory(address cloneFactory) external onlyRole(DEFAULT_ADMIN_ROLE) {
        guildFactory = cloneFactory;
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
        if (this.isWhitelisted(token) == false) {
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
        address endOfList = SENTINEL;
        Index storage targetIndex = indexes[indexHashes[index]];
        while (guilds[endOfList] != SENTINEL) {
            uint256 amountAllocated = (amount * targetIndex.indexWeights[guilds[endOfList]]) /
                targetIndex.indexDenominator;
            guildFunds[guilds[endOfList]][token] += amountAllocated;
            endOfList = guilds[endOfList];
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
    function claimToken(address guild, address token) public {
        if (whitelist[token] == address(0)) {
            revert NotListed();
        }
        uint256 amount = guildFunds[guild][token];
        donations[token] -= amount;
        /// Clear this guild's token balance
        delete guildFunds[guild][token];
        IERC20(token).safeTransfer(guild, amount);
        //IERC20(token).approve(guild, amount);
        //IERC20(token).safe
        //IGuildController(guild).gatherDonation(token);
    }

    /// @notice Apportions approved token donations according to guild weights
    /// @dev    Loops through all whitelisted tokens and calls `distributeToken()` for each
    /// @param  guild the address of the guild claiming tokens
    function claimTokens(address guild) public {
        address endOfList = SENTINEL;
        /// Loop through linked list
        while (whitelist[endOfList] != SENTINEL) {
            claimToken(guild, whitelist[endOfList]);
            endOfList = whitelist[endOfList];
        }
    }

    /// @notice Apportions collected AMOR fees
    function distributeFees() public {
        Index storage index = indexes[FEES_INDEX];
        address endOfList = SENTINEL;
        /// Determine amount of AMOR that has been collected from fees
        uint256 feesToBeDistributed = amorToken.balanceOf(address(this)) - donations[address(amorToken)];

        while (guilds[endOfList] != SENTINEL) {
            uint256 amountToDistribute = (feesToBeDistributed * index.indexWeights[endOfList]) / index.indexDenominator;
            if (amountToDistribute != 0) {
                guildFunds[endOfList][address(amorToken)] += amountToDistribute;
            }
            endOfList = guilds[endOfList];
        }
    }

    /// @notice use this funtion to create a new guild via the guild factory
    /// @dev    only admin can all this funtion
    /// @dev    NB: this function does not check that a guild `name` & `symbol` is unique
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
        guilds[sentinelGuilds] = controller;
        sentinelGuilds = controller;
        guilds[sentinelGuilds] = SENTINEL;
        guildCounter += 1;
    }

    /// @notice Adds an external guild to the registry
    /// @param  guildAddress the address of the external guild's controller
    function addExternalGuild(address guildAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        /// Add check that guild address hasn't been added yet here
        if (guilds[guildAddress] != address(0)) {
            revert Exists();
        }
        grantRole(GUILD_ROLE, guildAddress);
        guilds[sentinelGuilds] = guildAddress;
        sentinelGuilds = guildAddress;
        guilds[sentinelGuilds] = SENTINEL;
        guildCounter += 1;
        ///guilds.push(guildAddress);
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
    /// @param  controller the address of the guild controller to remove
    function removeGuild(address controller) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (guilds[controller] == address(0)) {
            revert InvalidGuild();
        }
        /// Transfer unclaimed funds to donations
        address endOfList = SENTINEL;
        /// Loop through linked list
        while (whitelist[endOfList] != SENTINEL) {
            donations[whitelist[endOfList]] += guildFunds[guilds[controller]][whitelist[endOfList]];
            delete guildFunds[guilds[controller]][whitelist[endOfList]];
            endOfList = whitelist[endOfList];
        }

        endOfList = SENTINEL;
        while (guilds[endOfList] != controller) {
            endOfList = guilds[endOfList];
        }
        guilds[endOfList] = guilds[controller];
        delete guilds[controller];
        guildCounter -= 1;
        //guilds[index] = guilds[guilds.length - 1];
        //guilds.pop();
        revokeRole(GUILD_ROLE, controller);
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
    /// @dev    Requires an encoded array of tuples in (address, uint256) format
    /// @param  weights an array containing the weighting indexes for different guilds
    /// @return index of the new index in the `Index` array
    function addIndex(bytes[] calldata weights) external returns (uint256) {
        /// This check becomes redundant
        /// Using the hash of the array allows a O(1) check if that index exists already
        bytes32 hashArray = keccak256(abi.encode(weights));
        if (indexes[hashArray].indexDenominator != 0) {
            revert Exists();
        }
        if (_updateIndex(weights, hashArray) != true) {
            revert IndexError();
        }
        indexHashes.push(hashArray);

        return indexHashes.length;
    }

    /// @notice Allows DoinGud to update the fee index used
    /// @param  weights an array of the guild weights
    function updateFeeIndex(bytes[] calldata weights) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _updateIndex(weights, FEES_INDEX);
    }

    /// @notice Adds a new index to the Index mapping
    /// @dev    Requires `weights` to be sorted prior to creating a new `Index` struct
    /// @param  weights the encoded tuple of index values (`address`,`uint256`)
    /// @param  arrayHash keccak256 hash of the provided array
    /// @return bool was the index update successful
    function _updateIndex(bytes[] calldata weights, bytes32 arrayHash) internal returns (bool) {
        Index storage index = indexes[arrayHash];
        for (uint256 i; i < weights.length; i++) {
            (address guild, uint256 weight) = abi.decode(weights[i], (address, uint256));
            index.indexWeights[guild] = weight;
            index.indexDenominator += weight;
            index.creator = msg.sender;
        }
        return true;
    }
}
