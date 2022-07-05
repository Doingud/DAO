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

    address[] public guilds;
    uint256 public guildsTotalWeight;
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

    function donate(uint256 amount) public {
        uint256 distributedAmount = amount*operationsWeight/WEIGHT_TOTAL;
        amorToken.transferFrom(msg.sender, operationsPool, distributedAmount);
        amorToken.transferFrom(msg.sender, buildersPool, amount-distributedAmount);
    }

    function distribute(uint256 amount) public {

    }

    function claim(uint16 guild) public {

    }

    function createGuild(string name, string tokenSymbol) public {
        
    }

}