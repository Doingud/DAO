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
import "./interfaces/ICloneFactory.sol";
import "./interfaces/IGuildController.sol";
import "./interfaces/IMetaDaoController.sol";

contract MetaDaoController is IMetaDaoController, Ownable {
    using SafeERC20 for IERC20;
    /// Guild-related variables
    /// `guilds` contains all Guild Controller addresses
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
    event GuildCreated(
        address realityModule,
        address indexed initialGuardian,
        string indexed name,
        string tokenSymbol,
        address indexed guildController,
        uint256 guildCounter
    );
    event GuildAdded(address  indexed guildController, uint256 guildCounter);
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
    /// The guild doesn't exist
    error InvalidGuild();
    /// Not all guilds have weights!!
    /// Please ensure guild weights have been updated after adding new guild
    error IndexError();
    /// The supplied array of index weights does not match the number of guilds
    error InvalidArray();
    /// The index array has not been set yet
    error NoIndex();
    /// The guild has 0 funds to claim
    error InvalidClaim();
    /// The guild already exists
    error Exists();
    /// The guild has unclaimed donations and can't be removed
    error UnclaimedDonations();

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
        /// Setup the fee index
        //indexHashes.push(FEES_INDEX);
        Index storage index = indexes[indexCounter];
        index.creator = avatar;
        /// Setup guilds linked list
        sentinelGuilds = address(0x01);
        guilds[sentinelGuilds] = SENTINEL;
        guilds[SENTINEL] = sentinelGuilds;
    }

    /// @notice Allows a user to donate a whitelisted asset
    /// @dev    `approve` must have been called on the `token` contract
    /// @param  token the address of the token to be donated
    /// @param  amount the amount of tokens to donate
    /// @param  index indicates which index to use in donation calcs
    function donate(
        address token,
        uint256 amount,
        uint256 index
    ) external {
        if (this.isWhitelisted(token) == false) {
            revert NotListed();
        }
        if (indexes[0].indexDenominator == 0) {
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
        emit DonatedToIndex(amount, token, index, msg.sender);
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
        Index storage targetIndex = indexes[index];
        while (guilds[endOfList] != SENTINEL) {
            uint256 amountAllocated = (amount * targetIndex.indexWeights[guilds[endOfList]]) /
                targetIndex.indexDenominator;
            guildFunds[guilds[endOfList]][token] += amountAllocated;
            endOfList = guilds[endOfList];
        }
    }

    /// @notice Distributes the specified token
    /// @param  token address of target token
    function claimToken(address token) public {
        if (guilds[msg.sender] == address(0)) {
            revert InvalidGuild();
        }
        uint256 amount = guildFunds[msg.sender][token];
        if (amount == 0) {
            revert InvalidClaim();
        }
        donations[token] -= amount;
        /// Clear this guild's token balance
        delete guildFunds[msg.sender][token];
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    /// @notice Apportions collected AMOR fees
    function distributeFees() public {
        Index storage index = indexes[0];
        address endOfList = SENTINEL;
        /// Determine amount of AMOR that has been collected from fees
        uint256 feesToBeDistributed = amorToken.balanceOf(address(this)) - donations[address(amorToken)];

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
    /// @param  guild The target guild
    function claimFees(address guild) public {
        if (guilds[guild] == address(0)) {
            revert InvalidGuild();
        }
        amorToken.safeTransfer(guild, guildFees[guild]);
        delete guildFees[guild];
        emit FeesClaimed(guild, guildFees[guild]);
    }

    /// @notice use this funtion to create a new guild via the guild factory
    /// @dev    only admin can all this funtion
    /// @dev    NB: this function does not check that a guild `name` & `symbol` is unique
    /// @param  realityModule address that will control the functions of the guild
    /// @param  initialGuardian the user responsible for the initial Guardian actions
    /// @param  name the name for the guild
    /// @param  tokenSymbol the symbol for the Guild's token
    function createGuild(
        address realityModule,
        address initialGuardian,
        string memory name,
        string memory tokenSymbol
    ) public onlyOwner {
        (address controller, , ) = ICloneFactory(guildFactory).deployGuildContracts(
            realityModule,
            initialGuardian,
            name,
            tokenSymbol
        );
        guilds[sentinelGuilds] = controller;
        sentinelGuilds = controller;
        guilds[controller] = SENTINEL;
        unchecked {
            guildCounter++;
        }
        emit GuildCreated(realityModule, initialGuardian, name, tokenSymbol, controller, guildCounter);
    }

    /// @notice Adds an external guild to the registry
    /// @param  guildAddress the address of the external guild's controller
    function addExternalGuild(address guildAddress) external onlyOwner {
        /// Add check that guild address hasn't been added yet here
        if (guilds[guildAddress] != address(0)) {
            revert Exists();
        }
        guilds[sentinelGuilds] = guildAddress;
        sentinelGuilds = guildAddress;
        guilds[sentinelGuilds] = SENTINEL;
        unchecked {
            guildCounter += 1;
        }
        emit GuildAdded(guildAddress, guildCounter);
    }

    /// @notice adds token to whitelist
    /// @dev    checks if token is present in whitelist mapping
    /// @param  _token address of the token to be whitelisted
    function addWhitelist(address _token) external onlyOwner {
        whitelist[sentinelWhitelist] = _token;
        sentinelWhitelist = _token;
        whitelist[sentinelWhitelist] = SENTINEL;
        emit TokenWhitelisted(_token);
    }

    /// @notice removes guild based on guild controller address
    /// @param  controller the address of the guild controller to remove
    function removeGuild(address controller) external onlyOwner {
        if (guilds[controller] == address(0)) {
            revert InvalidGuild();
        }

        /// Transfer unclaimed funds to donations
        address endOfList = SENTINEL;
        /// Loop through linked list
        while (whitelist[endOfList] != SENTINEL) {
            if (guildFunds[controller][whitelist[endOfList]] > 0) {
                revert UnclaimedDonations();
            }
            endOfList = whitelist[endOfList];
        }

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
    /// @param  token address of the ERC20 token being checked
    /// @return bool true if token whitelisted, false if not whitelisted
    function isWhitelisted(address token) external view returns (bool) {
        return whitelist[token] != address(0);
    }

    /// @notice Adds a new index to the `Index` array
    /// @dev    Requires an encoded array of SORTED tuples in (address, uint256) format
    /// @param  weights an array containing the weighting indexes for different guilds
    /// @return index of the new index in the `Index` array
    function addIndex(bytes[] calldata weights) external returns (uint256) {
        indexCounter++;
        _updateIndex(weights, indexCounter);

        emit IndexAdded(indexCounter, msg.sender);
        return indexCounter;
    }

    /// @notice Allows DoinGud to update the fee index used
    /// @param  weights an array of the guild weights
    function updateIndex(bytes[] calldata weights, uint256 indexPosition) external {
        if (indexes[indexPosition].creator != msg.sender) {
            revert Unauthorized();
        }

        _updateIndex(weights, indexPosition);

        emit IndexUpdated(indexPosition, msg.sender);
    }

    /// @notice Adds a new index to the Index mapping
    /// @dev    Requires `weights` to be sorted prior to creating a new `Index` struct
    /// @param  weights the encoded tuple of index values (`address`,`uint256`)
    /// @param  indexPosition keccak256 hash of the provided array
    function _updateIndex(bytes[] calldata weights, uint256 indexPosition) internal {
        /// Check the caller is the owner
        if (indexes[indexPosition].indexDenominator > 0 && indexes[indexPosition].creator != msg.sender) {
            revert Unauthorized();
        }
        delete indexes[indexPosition];
        /// Set the storage pointer
        Index storage index = indexes[indexPosition];
        /// Reset the owner
        index.creator = msg.sender;

        for (uint256 i; i < weights.length; i++) {
            (address guild, uint256 weight) = abi.decode(weights[i], (address, uint256));
            if (guilds[guild] == address(0) || weight == 0) {
                revert InvalidGuild();
            }
            index.indexWeights[guild] = weight;
            index.indexDenominator += weight;
        }
    }
}
