// SPDX-License-Identifier: MIT

/// @title  MetaDAO Controller
/// @author Daoism Systems Team
/// @custom security-contact contact@daoism.systems

/**
 *  @dev Implementation of the MetaDAO controller logic for DoinGud MetaDAO
 *  
 */

pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract MetaDaoController {

    //  Array of addresses of Guilds
    address[] public guilds;
    //  The total weight of the guilds
    uint256 public guildsTotalWeight;
    //  Amounts for Guilds' distributions
    uint256[] public guildDistribution;

    //  Donation distribution weights
    uint256 constant internal WEIGHT_TOTAL = 100;
    uint256 internal operationsWeight;
    uint256 internal buildersWeight;

    //  Operations pool address
    address public operationsPool;
    //  Builders pool
    address public buildersPool;

    //  AMOR token
    IERC20 public amorToken;

    constructor(address _amor) {
        amorToken = IERC20(_amor);
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
    /// @param guild a parameter just like in doxygen (must be followed by parameter name)
    function claim(uint16 guild) public {

    }

    /// @notice Explain to an end user what this does
    /// @dev Explain to a developer any extra details
    /// @param name a parameter just like in doxygen (must be followed by parameter name)
    /// @param tokenSymbol the symbol for the Guild's token
    function createGuild(string memory name, string memory tokenSymbol) public {
        
    }

}