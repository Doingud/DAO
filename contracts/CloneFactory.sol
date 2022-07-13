// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

/// @title  Clone Factory for DoinGud Tokens
/// @author Daoism Systems Team
/// @dev    ERC1167 Pattern

/*  
 *  @dev https://eips.ethereum.org/EIPS/eip-1167[EIP 1167] is a standard for
 *  deploying minimal proxy contracts, also known as "clones".
 *
 *  The DoinGud GuildTokenFactory allows for the low-gas creation of Guilds and Guild-related tokens
 *  by using the minimal proxy, or "clone" pattern
 *
 *  DoinGud Guilds require a non-standard implementation of ERC1967Proxy from OpenZeppelin
 *  to allow the factory to initialize the ERC20 contracts without constructors.
 *
 *  In conjunction with this, the token contracts are custom ERC20 implementations
 *  that use the ERC20Base.sol contracts developed for DoinGud.
 *  
*/

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./utils/interfaces/IAmorGuildToken.sol";

contract GuildCloneFactory {
    /// The AMOR Token address
    address public amorToken;
    /// The address for the AMORxGuild Token implementation
    address public amorxGuildToken;
    /// The FXAMORxGuild Token implementation
    address public fxAMORxGuildToken;
    /// The dAMORxGuild Token implementation
    address public dAMORxGuildToken;
    /// The DoinGud generic proxy contract (the target)
    address public cloneTarget;
    address[] public guilds;
    address[] public dAMORxGuildTokens;
    address[] public fxAMORxGuildTokens;

    error CreationFailed();

    error ArrayMismatch();

    constructor(
        address _amorToken,
        address _amorxGuildToken,
        address _fxAMORxGuildToken,
        address _dAMORxGuildToken,
        address _doinGudProxy
        ) {
        amorToken = _amorToken;
        /// Set the implementation addresses
        amorxGuildToken = _amorxGuildToken;
        fxAMORxGuildToken = _fxAMORxGuildToken;
        dAMORxGuildToken = _dAMORxGuildToken;
        /// `_cloneTarget` refers to the DoinGud Proxy
        cloneTarget = _doinGudProxy;
    }

    /// @notice This deploys a new guild with it's associated tokens
    /// @dev    Takes the names and symbols and associates it to a guild
    /// @param  _name The name of the Guild without the prefix "AMORx"
    /// @param  _symbol The symbol of the Guild
    function deployGuildContracts(string memory _name, string memory _symbol) external {
        /// Setup local scope vars
        string memory tokenName;
        string memory tokenSymbol;
        address clonedContract;

        /// Deploy AMORxGuild contract
        tokenName = string.concat("AMORx",_name);
        tokenSymbol = string.concat("A",_symbol);
        clonedContract = _deployContract(tokenName, _symbol, amorxGuildToken);
        guilds.push(clonedContract);

        /// Deploy FXAMORxGuild contract
        tokenName = string.concat("FXAMORx",_name);
        tokenSymbol = string.concat("FX",_symbol);
        clonedContract = _deployContract(tokenName, _symbol, fxAMORxGuildToken);
        fxAMORxGuildTokens.push(clonedContract);

        /// Deploy dAMORxGuild contract
        tokenName = string.concat("dAMORx",_name);
        tokenSymbol = string.concat("D",_symbol);
        clonedContract = _deployContract(tokenName, _symbol, dAMORxGuildToken);
        dAMORxGuildTokens.push(clonedContract);
        
        /// Check that all contracts were added to the respective arrays
        if (guilds.length != dAMORxGuildTokens.length || guilds.length != fxAMORxGuildTokens.length) {
            revert ArrayMismatch();
        }
        }

    /// @notice Internal contract to deploy clone of an implementation contract
    /// @param  guildName name of token 
    /// @param  guildSymbol symbol of token
    /// @param  _implementation address of the contract to be cloned
    /// @return address of the deployed contract
    function _deployContract(string memory guildName, string memory guildSymbol, address _implementation) internal returns (address) {
        IAmorxGuild proxyContract;
        proxyContract = IAmorxGuild(Clones.clone(cloneTarget));

        if (address(proxyContract) == address(0)) {
            revert CreationFailed();
        }

        proxyContract.initProxy(_implementation);
        proxyContract.init(amorToken, guildName, guildSymbol);

        return address(proxyContract);
    }
}
