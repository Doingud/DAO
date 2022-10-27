// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

/**
 * @title  DoinGud: MetaDaoController.sol
 * @author Daoism Systems
 * @notice MetaDaoController implementation for DoinGudDAO
 * @custom Security-contact arseny@daoism.systems || konstantin@daoism.systems
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
import "./utils/interfaces/ICloneFactory.sol";
import "./utils/interfaces/IGuildController.sol";
import "./utils/interfaces/IMetaDaoController.sol";

contract MetaDaoController is IMetaDaoController, Ownable {
    using SafeERC20 for IERC20;
    /// Guild-related variables
    mapping(address => address) public guilds;
    address public sentinelGuilds;
    uint32 public guildCounter;
    mapping(address => uint256) public guildWeight;
    /// Mapping of guild --> token --> amount
    mapping(address => mapping(address => uint256)) public guildFunds;
    /// The total weight of the guilds
    uint256 public guildsTotalWeight;
    /// The Avatar associated with a guildController
    /// The fees distributed will go the AvatarxGuild
    mapping(address => address) public guildAvatar;
    /// Keeping track of the AMOR fees apportioned to each guild
    mapping(address => uint256) public guildFees;

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

    /// Events
    event guildCreated(
        address guildOwner,
        string name,
        string tokenSymbol,
        address guildController,
        uint256 guildCounter
    );
    event guildAdded(address guildController, uint256 guildCounter);
    event guildRemoved(address guildController, uint256 guildCounter);
    event tokenWhitelisted(address token);

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
    /// The guild has 0 funds to claim
    error InvalidClaim();

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
        indexHashes.push(FEES_INDEX);
        Index storage index = indexes[FEES_INDEX];
        index.creator = owner();
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
        Index storage index = indexes[FEES_INDEX];
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
    ) public onlyOwner {
        (address controller, , ) = ICloneFactory(guildFactory).deployGuildContracts(guildOwner, name, tokenSymbol);
        guilds[sentinelGuilds] = controller;
        sentinelGuilds = controller;
        guilds[sentinelGuilds] = SENTINEL;
        unchecked {
            guildCounter += 1;
        }
        emit guildCreated(guildOwner, name, tokenSymbol, controller, guildCounter);
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
        emit guildAdded(guildAddress, guildCounter);
    }

    /// @notice adds token to whitelist
    /// @dev    checks if token is present in whitelist mapping
    /// @param  _token address of the token to be whitelisted
    function addWhitelist(address _token) external onlyOwner {
        whitelist[sentinelWhitelist] = _token;
        sentinelWhitelist = _token;
        whitelist[sentinelWhitelist] = SENTINEL;
        emit tokenWhitelisted(_token);
    }

    /// @notice removes guild based on id
    /// @param  controller the address of the guild controller to remove
    function removeGuild(address controller) external onlyOwner {
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
        unchecked {
            guildCounter -= 1;
        }
        emit guildRemoved(controller, guildCounter);
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
        /// This check becomes redundant
        /// Using the hash of the array allows a O(1) check if that index exists already
        bytes32 hashArray = keccak256(abi.encode(weights));
        if (indexes[hashArray].indexDenominator != 0) {
            revert Exists();
        }
        indexHashes.push(hashArray);
        _updateIndex(weights, indexHashes[indexHashes.length - 1]);

        return indexHashes.length - 1;
    }

    /// @notice Allows DoinGud to update the fee index used
    /// @param  weights an array of the guild weights
    function updateIndex(bytes[] calldata weights, uint256 index) external returns (uint256) {
        if (indexes[indexHashes[index]].creator != msg.sender) {
            revert IndexError();
        }
        bytes32 key = _updateIndex(weights, indexHashes[index]);
        if (index > 0) {
            indexHashes[index] = indexHashes[indexHashes.length - 1];
            indexHashes.pop();
            indexHashes.push(key);
            return indexHashes.length;
        }
        return 0;
    }

    /// @notice Adds a new index to the Index mapping
    /// @dev    Requires `weights` to be sorted prior to creating a new `Index` struct
    /// @param  weights the encoded tuple of index values (`address`,`uint256`)
    /// @param  arrayHash keccak256 hash of the provided array
    /// @return bool was the index update successful
    function _updateIndex(bytes[] calldata weights, bytes32 arrayHash) internal returns (bytes32) {
        /// Delete the previous index
        /// Even a small change will create a very different hash
        if (arrayHash != FEES_INDEX) {
            delete indexes[arrayHash];
            arrayHash = keccak256(abi.encode(weights));
        }
        /// Set the storage pointer
        Index storage index = indexes[arrayHash];

        for (uint256 i; i < weights.length; i++) {
            (address guild, uint256 weight) = abi.decode(weights[i], (address, uint256));
            index.indexDenominator -= index.indexWeights[guild];
            index.indexWeights[guild] = weight;
            index.indexDenominator += weight;
            index.creator = msg.sender;
        }
        return arrayHash;
    }
}
