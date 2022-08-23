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

    address[] public guilds;
    //  Array of addresses of Guilds
    mapping(address => uint256) public guildWeight;
    /// Mapping of guild --> token --> amount
    mapping(address => mapping(address => uint256)) public guildFunds;

    /*  Changing this to a linked list
        This allows for testing `isWhitelisted` and iteration in one mapping
    mapping(address => bool) public whitelist;
    */
    mapping(address => address) public whitelist;
    address public constant SENTINAL = address(0x01);
    address public sentinalOwner;

    //  The total weight of the guilds
    uint256 public guildsTotalWeight;

    /// Time snapshot
    uint256 public claimStart;
    uint256 public claimDuration;

    /// Clone Factory
    address public guildFactory;

    /// ERC20 tokens used by metada
    IERC20 public amorToken;
    IERC20 public usdcToken;

    /// Roles
    bytes32 public constant GUILD_ROLE = keccak256("GUILD");

    error InvalidClaim();
    error NotListed();

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
        claimDuration = 5 days;
        sentinalOwner = _amor;
        whitelist[sentinalOwner] = SENTINAL;
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

    /// @notice Allows someone to donate AMOR token to the metadao
    /// @param amount Amount of AMOR to be donated
    function donate(uint256 amount) public {
        amorToken.transferFrom(msg.sender, address(this), amount);
    }

    /// @notice Allows someone to donate AMOR token to the metadao
    /// @param amount Amount of AMOR to be donated
    function donateUSDC(uint256 amount) public {
        usdcToken.transferFrom(msg.sender, address(this), amount);
    }

    /// @notice Distirbutes the amortoken in the metadao to the approved guilds but guild weight
    /// @dev current guild weight initialised to 100 to alow us to loop throuhgh guilds
    function distribute() public {
        uint256[] memory currentGuildWeight = new uint256[](guilds.length);
        for (uint256 i = 0; i < guilds.length; i++) {
            currentGuildWeight[i] = guildWeight[guilds[i]];
        }
        _distribute(currentGuildWeight);
    }

    function _distribute(uint256[] memory _currentGuildWeight) internal {
        uint256 currentBalanceAMOR = amorToken.balanceOf(address(this));
        uint256 currentBalanceUSDC = amorToken.balanceOf(address(this));
        uint256 totalAmountSentAmor;
        uint256 totalAmountSentUSDC;
        for (uint256 i = 0; i < guilds.length; i++) {
            uint256 amountToDistributeAMOR = (currentBalanceAMOR * _currentGuildWeight[i]) / guildsTotalWeight;
            uint256 amountToDistributeUSDC = (currentBalanceUSDC * _currentGuildWeight[i]) / guildsTotalWeight;
            if (amountToDistributeAMOR == 0 && amountToDistributeUSDC == 0) {
                continue;
            }
            /* Old code 
            /// Why does guildWeight become 0 here?
            guildWeight[msg.sender] = 0;
            /// We aren't doing anything with totalAmountSent here?
            totalAmountSentAmor = totalAmountSentAmor + amountToDistributeAMOR;
            totalAmountSentUSDC = totalAmountSentUSDC + amountToDistributeUSDC;
            /// Distribute doesn't need to transfer tokens, only allocate these to the guilds
            amorToken.transfer(guilds[i], amountToDistributeAMOR);
            */
            guildFunds[address(amorToken)][guilds[i]] += amountToDistributeAMOR;
            guildFunds[address(usdcToken)][guilds[i]] += amountToDistributeUSDC;
        }
        // Potential re-entrancy? May have to put state change inside or before Loop
        //guildsTotalWeight = 0;
    }

    /// @notice Allows a guuild to claim amor tokens from the metadao
    /// @dev only a guild can call this funtion
    function claim() public onlyRole(GUILD_ROLE) {
        /// Calculate the claim amount
        uint256 amount = (amorToken.balanceOf(address(this)) * (guildWeight[msg.sender] / guildsTotalWeight));
        /// Revert if claimant has no claimable funds or no funds to distribute
        if (amount == 0) {
            revert InvalidClaim();
        }
        /// Update guildWeight and guildsTotalWeight
        guildWeight[msg.sender] = 0;
        ///guildsTotalWeight -= amount;

        /// Transfer the AMOR to the claimant
        amorToken.transfer(msg.sender, amount);
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
        grantRole(GUILD_ROLE, controller);
        guilds.push(controller);
    }

    /// @notice adds guild based on the controller address provided
    /// @dev give guild role in access control to the controller for the guild
    /// @param _token the controller address of the guild
    function addWhitelist(address _token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelist[sentinalOwner] = _token;
        sentinalOwner = _token;
        whitelist[sentinalOwner] = SENTINAL;
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

    function getGuild(uint256 index) public view returns (address) {
        return guilds[index];
    }

    function isWhitelisted(address token) public view returns (bool) {
        if (whitelist[token] == address(0)) {
            revert NotListed();
        }
        return true;
    }
}
