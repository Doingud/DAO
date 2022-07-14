// SPDX-License-Identifier: MIT

/// @title  MetaDAO Controller
/// @author Daoism Systems Team
/// @custom security-contact contact@daoism.systems

/**
 *  @dev Implementation of the MetaDAO controller logic for DoinGud MetaDAO
 *
 *  The MetaDAO creates new guilds and collects fees from AMOR token transfers.
 *  The collected funds can then be claimed by guilds. 
 *  
 */

pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract MetaDaoController {

    //  Array of addresses of Guilds
    mapping(address => uint256) public guildWeight;
    //  The total weight of the guilds
    uint256 public guildsTotalWeight;

    /// Donation distribution weights
    uint256 constant internal WEIGHT_TOTAL = 100;
    uint256 internal operationsWeight;
    uint256 internal buildersWeight;

    /// Operations pool address
    address public operationsPool;
    /// Builders pool
    address public buildersPool;
    /// Clone Factory
    address public guildFactory;

    /// AMOR token
    IERC20 public amorToken;

    constructor(address _amor, address _cloneFactory) {
        amorToken = IERC20(_amor);
        guildFactory = _cloneFactory;
    }

    /// @notice Updates the MetaDAOs accounting of AMOR
    /// @param  amount uint256 representing the amount of AMORxGuild staked in a guild
    function updatePool(uint256 amount) public {
        guildWeight[msg.sender] += amount;
        guildsTotalWeight += amount;
    }

    /// @notice Explain to an end user what this does
    /// @dev Explain to a developer any extra details
    /// @param amount Amount of AMOR to be donated
    function donate(uint256 amount) public {
        uint256 distributedAmount = amount*operationsWeight/WEIGHT_TOTAL;
        amorToken.transferFrom(msg.sender, operationsPool, distributedAmount);
        amorToken.transferFrom(msg.sender, buildersPool, amount-distributedAmount);
    }

    /// @notice Explain to an end user what this does
    /// @dev Explain to a developer any extra details
    /// @param amount Amount of AMOR to be distributed
    function distribute(uint256 amount) public {

    }

    /// @notice Explain to an end user what this does
    /// @dev Explain to a developer any extra details
    function claim() public {
        /// Calculate the claim amount
        uint256 amount = amorToken.balanceOf(address(this)) * guildWeight[msg.sender] / guildsTotalWeight;
        
        /// Revert if claimant has no claimable funds or no funds to distribute
        if (amount == 0) {
            revert InvalidClaim();
        }
        /// Transfer the AMOR to the claimant
        amorToken.transfer(msg.sender, amount);

        /// Update guildWeight and guildsTotalWeight
        guildWeight[msg.sender] = 0;
        guildsTotalWeight -= amount;
    }

    /// @notice Explain to an end user what this does
    /// @dev Explain to a developer any extra details
    /// @param name a parameter just like in doxygen (must be followed by parameter name)
    /// @param tokenSymbol the symbol for the Guild's token
    function createGuild(string memory name, string memory tokenSymbol) public {
        
    }

    /// @notice Explain to an end user what this does
    /// @dev Explain to a developer any extra details
    /// @param name a parameter just like in doxygen (must be followed by parameter name)
    /// @param tokenSymbol the symbol for the Guild's token
    function removeGuild(string memory name, string memory tokenSymbol) public {
        
    }

}