// SPDX-License-Identifier: MIT

pragma solidity 0.8.14;

/// @title  Proxy Factory for AMORxGuild Tokens
/// @author Daoism Systems
/// @notice Creates clones of a target contract
/// @dev    ERC1167

/*  
 *  @dev https://eips.ethereum.org/EIPS/eip-1167[EIP 1167] is a standard for
 *  deploying minimal proxy contracts, also known as "clones".
 *
 *  The DoinGud GuildTokenFactory allows for the low-gas creation of Guilds
 *  by using the minimal proxy, or "clone" pattern
 *
 *  DoinGud Guilds require a non-standard implementation of ERC1967Proxy from OpenZeppelin
 *  to allow the factory to initialize the ERC20 contracts without constructors
 *  
*/

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./IAmorGuildToken.sol";
import "./AmorGuildToken.sol";

interface AmorxGuildProxy is IAmorxGuild {
    function initProxy(address _logic, bytes memory _data) external;
}

contract GuildTokenFactory {
    address internal _implementation;
    address internal _cloneAddress;
    address internal _tokenAmor;
    address[] public guilds;

    constructor(address _cloneTarget, address _logic, address _tokenTarget) {
        /// `_logic` refers to the AmorGuildToken address
        _implementation = _logic;
        /// `_cloneTarget` refers to the AmorGuildTokenProxy
        _cloneAddress = _cloneTarget;
        /// `_tokenTarget` refers to the proxy address for the AMOR token
        _tokenAmor = _tokenTarget;
    }

    /// @notice This deploys new guilds with their associated tokens
    /// @dev    Takes arrays of Guild details and deploys upgradeable tokens 
    /// @param  _names an array of Guild names
    /// @param  _symbols an array of token symbols
    /// Note    Arrays must be equal in length
    function deployTokens(string[] memory _names, string[] memory _symbols ) public returns (address[] memory) {
        /// Check array length
        require(_names.length == _symbols.length, "Input arrays mismatch");
        /// Loop through the input arrays and deploy minimal proxy clones and initialize the Guilds
        for (uint256 i = 0; i < _names.length; i++) {
            /// Create a new instance of the Guild
            AmorxGuildProxy proxyGuildToken;
            proxyGuildToken = AmorxGuildProxy(Clones.clone(_cloneAddress));
            /// Ensure Guild creation succeeded
            require(address(proxyGuildToken) != address(0), "Clone deployment failed");
            /// Add this Guild to the 
            guilds.push(address(proxyGuildToken));
            /// Encode the low-level init() call to be called within the proxyInit() initialization
            bytes memory initToken = abi.encodeWithSignature("init(address,string,string)", _tokenAmor, _names[i], _symbols[i]);
            /// Init the proxy and set the token details
            proxyGuildToken.initProxy(_implementation, initToken);
        }
        return guilds;
    }

    function viewGuilds() public view returns (address[] memory) {
        return guilds;
    }
}