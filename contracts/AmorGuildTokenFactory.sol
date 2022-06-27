// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

/// @title  Proxy Factory for AMORxGuild Tokens
/// @author daoism.systems, lourenslinde,
/// @notice Creates clones of a target contract
/// @dev    ERC1167

/*  
 *  The contract extends the ERC1967Proxy contract from OpenZeppelin.
 *  All calls to this contract (except getImplementation()) should 
 *  default to the fallback() function which calls delegateCall()
 *  to the implementation contract.
 *
 *  This proxy contract acts as the storage contract for the implementation contract.
*/

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./AmorGuildToken.sol";

contract GuildTokenFactory {
    address internal _implementation;
    address internal _tokenAmor;
    address[] public tokenClones;

    constructor(address _cloneTarget, address _tokenTarget) {
        _implementation = _cloneTarget;
        _tokenAmor = _tokenTarget;
    }

    function deployTokens(string[] memory _names, string[] memory _symbols ) public returns (address[] memory) {
        require(_names.length == _symbols.length, "Input arrays mismatch");
        for (uint256 i = 0; i < _names.length; i++) {
            AMORxGuild guildToken;

            guildToken = AMORxGuild(Clones.clone(_implementation));

            require(address(guildToken) != address(0), "Clone deployment failed");
            tokenClones.push(address(guildToken));
            guildToken.init(_implementation, _tokenAmor, _names[i], _symbols[i]);
        }
        return tokenClones;
    }

    function viewGuilds() public view returns (address[] memory) {
        return tokenClones;
    }
}