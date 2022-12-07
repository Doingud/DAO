// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

/**
 * @title  DoinGud: MetaDaoController.sol
 * @author Daoism Systems
 * @notice MetaDaoController implementation for DoinGudDAO
 * @custom Security-contact security@daoism.systems
 *
 *  The MetaDAO creates new guilds and collects fees from AMOR token transfers.
 *  The collected funds can then be distributed and claimed by guilds.
 *  The MetaDAO governs high level donations and is intended to be used in
 *  conjunction with a Governor and Avatar contract.
 *
 * MIT License
 * ===========
 *
 * Copyright (c) 2022 DoinGud
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
/// Custom contracts
import "./interfaces/ICloneFactory.sol";
import "./interfaces/IGuildController.sol";
import "./interfaces/IMetaDaoController.sol";
import "./interfaces/IDoinGudBeacon.sol";

contract MetaDaoController is IMetaDaoController, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    /// Guild-related variables
    /// `guilds` contains all Guild Controller addresses
    /// These have been added through `createGuild` or `addExternalGuild`
    mapping(address => address) public guilds;
    address public sentinelGuilds;
    /// Counter to keep track of number of guilds
    uint32 public guildCounter;

    /// Donation- and fee-related variables
    /// Tracking the amount of tokens each guild has available to claim
    /// Mapping of guild --> token --> amount
    mapping(address => mapping(address => uint256)) public guildFunds;
    /// Keeping track of the AMOR fees apportioned to each guild
    mapping(address => uint256) public guildFees;

    /// Mapping of tokens to amount donated
    mapping(address => uint256) public donations;

    /// Donatable token related variables
    mapping(address => address) public whitelist;
    address public constant SENTINEL = address(0x01);
    address public sentinelWhitelist;

    /// Clone Factory
    address public guildFactory;

    /// ERC20 tokens used by metada
    IERC20 public amorToken;

    /// Indexes
    /// Index Struct
    struct Index {
        address creator;
        uint256 indexDenominator;
        mapping(address => uint256) indexWeights;
    }

    /// Create an array to hold the different indexes
    mapping(uint256 => Index) public indexes;
    /// Counter to track number of indexes created
    uint256 public indexCounter;

    /// Events
    event MetaDAOCreated(address indexed amorToken, address indexed guildfactory);
    event GuildCreated(
        address realityModule,
        address indexed initialGuardian,
        string indexed name,
        string tokenSymbol,
        address indexed guildController,
        uint256 guildCounter
    );
    event GuildAdded(address indexed guildController, uint256 guildCounter);
    event GuildRemoved(address indexed guildController, uint256 guildCounter);
    event TokenWhitelisted(address indexed token);
    event DonatedToIndex(uint256 indexed amount, address indexed token, uint256 index, address indexed sender);
    event FeesClaimed(address indexed guild, uint256 indexed guildFees);
    event FeesDistributed(address indexed guild, uint256 indexed guildFees);
    event IndexAdded(uint256 indexed index, address indexed owner);
    event IndexUpdated(uint256 indexed index, address indexed owner);

    /// Errors
    /// The token is not whitelisted
    error NotListed();
    /// The Caller is not the Owner
    error Unauthorized();
    /// The provided arrays do not match in length
    error InvalidArray();
    /// The guild doesn't exist
    error InvalidGuild();
    /// The index array has not been set yet
    error NoIndex();
    /// The address already exists in the mapping
    error Exists();

    /// @notice Initializes the MetaDaoController contract
    /// @param amor The address of the AMOR token
    /// @param cloneFactory The address of the GuildFactory
    /// @param avatar The address of the Avatar
    function init(
        address amor,
        address cloneFactory,
        address avatar
    ) external {
        _transferOwnership(avatar);
        amorToken = IERC20(amor);
        guildFactory = cloneFactory;
        /// Setup the linked list
        sentinelWhitelist = amor;
        whitelist[sentinelWhitelist] = SENTINEL;
        whitelist[SENTINEL] = amor;
        /// Setup the fee index owner
        /// The `Fee Index` is the default index maintained by DoinGud
        Index storage index = indexes[indexCounter];
        index.creator = avatar;
        /// Setup guilds linked list
        sentinelGuilds = SENTINEL;
        guilds[sentinelGuilds] = SENTINEL;
        guilds[SENTINEL] = sentinelGuilds;

        emit MetaDAOCreated(amor, cloneFactory);
    }

    /// @notice Allows a user to donate a whitelisted asset
    /// @dev `approve` must have been called on the `token` contract
    /// @param token The address of the token to be donated
    /// @param amount The amount of tokens to donate
    /// @param index Indicates which index to use in donation calcs
    function donate(
        address token,
        uint256 amount,
        uint256 index
    ) external nonReentrant {
        if (!isWhitelisted(token)) {
            revert NotListed();
        }

        /// Check that the index exists
        if (indexes[index].indexDenominator == 0) {
            revert NoIndex();
        }

        IERC20 tokenDonated = IERC20(token);
        uint256 tokenBalance = tokenDonated.balanceOf(address(this));

        tokenDonated.safeTransferFrom(msg.sender, address(this), amount);
        tokenBalance = tokenDonated.balanceOf(address(this)) - tokenBalance;

        allocateByIndex(token, tokenBalance, index);
        donations[token] += tokenBalance;

        emit DonatedToIndex(amount, token, index, msg.sender);
    }

    /// @notice Allocates donated funds by the index specified
    /// @dev This approach allows any guild to claim their funds at any time
    /// @param token Address of the ERC20 token to be donated
    /// @param amount The number of the specified tokens to be allocated
    /// @param index The index to be used to allocate the donation by
    function allocateByIndex(
        address token,
        uint256 amount,
        uint256 index
    ) internal {
        address endOfList = SENTINEL;
        Index storage targetIndex = indexes[index];
        while (guilds[endOfList] != SENTINEL) {
            uint256 amountAllocated = (amount * targetIndex.indexWeights[guilds[endOfList]]) /
                targetIndex.indexDenominator;
            guildFunds[guilds[endOfList]][token] += amountAllocated;
            endOfList = guilds[endOfList];
        }
    }

    /// @notice Distributes the specified token
    /// @param token The address of target token
    function claimToken(address guild, address token) public returns (uint256) {
        uint256 amount = guildFunds[guild][token];
        if (amount == 0) {
            return amount;
        }

        /// Update donations for this token
        donations[token] -= amount;
        /// Clear this guild's token balance
        delete guildFunds[guild][token];
        IERC20(token).safeTransfer(guild, amount);

        return amount;
    }

    /// @notice Apportions collected AMOR fees
    /// @dev Allows excess tokens sent to the contract to be apportioned
    /// @param token The address of the token to be apportioned
    function distributeFees(address token) public {
        Index storage index = indexes[0];
        address endOfList = SENTINEL;
        /// Determine amount of `token` that has been collected from fees or sent to the contract
        IERC20 targetToken = IERC20(token);
        uint256 feesToBeDistributed = targetToken.balanceOf(address(this)) - donations[address(targetToken)];

        while (guilds[endOfList] != SENTINEL) {
            uint256 amountToDistribute = (feesToBeDistributed * index.indexWeights[guilds[endOfList]]) /
                index.indexDenominator;
            if (amountToDistribute != 0) {
                guildFees[guilds[endOfList]] += amountToDistribute;
            }

            endOfList = guilds[endOfList];
            emit FeesDistributed(guilds[endOfList], amountToDistribute);
        }
    }

    /// @notice Allows a guild to transfer fees to the Guild
    /// @param guild The target guild
    function claimFees(address guild) public {
        if (guilds[guild] == address(0)) {
            revert InvalidGuild();
        }

        amorToken.safeTransfer(guild, guildFees[guild]);
        delete guildFees[guild];

        emit FeesClaimed(guild, guildFees[guild]);
    }

    /// @notice Create a new guild via the guild factory
    /// @dev Only callable by AvatarxMetaDAO
    /// @dev Note: This function does not check that a guild `name` & `symbol` is unique
    /// @dev The MetaDAO Guardians must check and approve the aforementioned `name` and `symbol`
    /// @param realityModule Address that will control the functions of the guild
    /// @param initialGuardian The user responsible for the initial Guardian actions
    /// @param name The name for the guild
    /// @param tokenSymbol The symbol for the Guild's token
    function createGuild(
        address realityModule,
        address initialGuardian,
        string memory name,
        string memory tokenSymbol
    ) external onlyOwner {
        (address controller, , ) = ICloneFactory(guildFactory).deployGuildContracts(
            realityModule,
            initialGuardian,
            name,
            tokenSymbol
        );

        /// Check that guild address hasn't already been added
        if (guilds[controller] != address(0)) {
            revert Exists();
        }

        guilds[sentinelGuilds] = controller;
        sentinelGuilds = controller;
        guilds[controller] = SENTINEL;

        unchecked {
            guildCounter++;
        }

        emit GuildCreated(realityModule, initialGuardian, name, tokenSymbol, controller, guildCounter);
    }

    /// @notice Adds an external guild to the registry
    /// @dev External Guilds can also be independently created through calls to the GuildFactory
    /// Note: To participate in the DoinGud ecosystem guilds need to be approved and added by MetaDAO
    /// @param guildAddress The address of the external guild's controller
    function addExternalGuild(address guildAddress) external onlyOwner {
        /// Add check that guild address hasn't been added yet here
        if (guilds[guildAddress] != address(0)) {
            revert Exists();
        }

        guilds[sentinelGuilds] = guildAddress;
        sentinelGuilds = guildAddress;
        guilds[sentinelGuilds] = SENTINEL;

        unchecked {
            guildCounter++;
        }

        emit GuildAdded(guildAddress, guildCounter);
    }

    /// @notice Adds a token to whitelist
    /// @dev MetaDAO Guardians are expected to evaluate proposed tokens
    /// @param _token Address of the token to be whitelisted
    function addWhitelist(address _token) external onlyOwner {
        if (whitelist[_token] != address(0)) {
            revert Exists();
        }

        whitelist[sentinelWhitelist] = _token;
        sentinelWhitelist = _token;
        whitelist[sentinelWhitelist] = SENTINEL;

        emit TokenWhitelisted(_token);
    }

    /// @notice Removes a guild from the `guilds` mapping
    /// @param controller The address of the guild controller to remove
    function removeGuild(address controller) external onlyOwner {
        if (guilds[controller] == address(0)) {
            revert InvalidGuild();
        }

        address endOfList = SENTINEL;
        /// Loop through tokens to check unclaimed donations
        while (whitelist[endOfList] != SENTINEL) {
            if (guildFunds[controller][whitelist[endOfList]] > 0) {
                claimToken(controller, whitelist[endOfList]);
            }

            endOfList = whitelist[endOfList];
        }

        claimFees(controller);

        /// Find the `owner` of `controller`
        endOfList = SENTINEL;
        while (guilds[endOfList] != controller) {
            endOfList = guilds[endOfList];
        }

        guilds[endOfList] = guilds[controller];
        delete guilds[controller];

        unchecked {
            guildCounter--;
        }

        emit GuildRemoved(controller, guildCounter);
    }

    /// @notice Checks that a token is whitelisted
    /// @param token Tddress of the ERC20 token being checked
    /// @return bool True if token whitelisted, false if not whitelisted
    function isWhitelisted(address token) public view returns (bool) {
        return whitelist[token] != address(0);
    }

    /// @notice Adds a new index to the `Index` array
    /// @dev Requires an encoded array of SORTED tuples in (address, uint256) format
    /// @param weights An array containing the weighting indexes for different guilds
    /// @return index The newly created index in the `Index` array
    function addIndex(address[] calldata guilds, uint256[] calldata weights) external returns (uint256) {
        indexCounter++;
        _updateIndex(guilds, weights, indexCounter);

        emit IndexAdded(indexCounter, msg.sender);

        return indexCounter;
    }

    /// @notice Allows DoinGud to update the fee index used
    /// @param guilds The array of Guilds for this index
    /// @param weights The array of the guild weights
    function updateIndex(
        address[] calldata guilds,
        uint256[] calldata weights,
        uint256 indexPosition
    ) external {
        _updateIndex(guilds, weights, indexPosition);

        emit IndexUpdated(indexPosition, msg.sender);
    }

    /// @notice Adds a new index to the Index mapping
    /// @param _guilds The array of guilds for this index
    /// @param _weights The array of weights for this index
    /// @param _indexPosition Location of index in the `indexes` mapping
    function _updateIndex(
        address[] calldata _guilds,
        uint256[] calldata _weights,
        uint256 _indexPosition
    ) internal {
        /// Check the caller is the owner
        if (indexes[_indexPosition].indexDenominator > 0 && indexes[_indexPosition].creator != msg.sender) {
            revert Unauthorized();
        }

        if (_guilds.length != _weights.length) {
            revert InvalidArray();
        }

        delete indexes[_indexPosition];
        /// Set the storage pointer
        Index storage index = indexes[_indexPosition];
        /// Reset the owner
        index.creator = msg.sender;

        for (uint256 i; i < _guilds.length; i++) {
            if (guilds[_guilds[i]] == address(0) || _weights[i] == 0) {
                revert InvalidGuild();
            }

            index.indexWeights[_guilds[i]] = _weights[i];
            index.indexDenominator += _weights[i];
        }
    }

    /// @notice Updates the Beacon
    /// @param  newImplementation The address containing the new implementation
    function upgradeBeacon(address beacon, address newImplementation) external onlyOwner {
        IDoinGudBeacon(beacon).upgradeTo(newImplementation);
    }
}
