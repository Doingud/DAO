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

    constructor(
        address _amorToken,
        address _amorxGuildToken,
        address _fxAMORxGuildToken,
        address _ dAMORxGuildToken
        address _doinGudProxy,
        ) {
        amorToken = _amorToken;
        /// Set the implementation addresses
        amorxGuildToken = _amorxGuildToken;
        fxAMORxGuildToken = _fxAMORxGuildToken;
        dAMORxGuildToken = _dAMORxGuildToken;
        /// `_cloneTarget` refers to the DoinGud Proxy
        _cloneTarget = _doinGudProxy;
    }

    /// @notice This deploys a new guild with it's associated tokens
    /// @dev    Takes the names and symbols and associates it to a guild
    /// @param  _names an array of Guild names
    /// @param  _symbols an array of token symbols
    function deployGuildContracts(string memory _name, string memory _symbol) public returns (address) {
        /// Create a new instance of the Guild
        IAmorxGuild proxyAmorxGuild;
        IAmorxGuild proxyFXAMORxGuild;
        IAmorxGuild proxyDAMORxGuild;
        proxyContract = IAmorxGuild(Clones.clone(_cloneTarget));
        /// Ensure Guild creation succeeded
        require(address(proxyContract) != address(0), "Clone deployment failed");
        /// Add this Guild to the array
        guilds.push(address(proxyGuildToken));
        /// Init the proxy and set the token details
        proxyGuildToken.initProxy(_implementation);
        proxyGuildToken.init(amorToken, _name, _symbol);
        }
    }

    function _deployGuildContracts(_name, _symbol, _implementation) internal returns (address) {
        IAmorxGuild proxyContract;
        proxyContract IAmorxGuild(Clones.clone(_cloneTarget)
    }

    function viewGuilds() public view returns (address[] memory) {
        return guilds;
    }
}