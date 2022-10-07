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
import "@openzeppelin/contracts/access/Ownable.sol";

import "./utils/interfaces/IAmorGuildToken.sol";
import "./utils/interfaces/ICloneFactory.sol";
import "./utils/interfaces/IDoinGudProxy.sol";
import "./utils/interfaces/IdAMORxGuild.sol";
import "./utils/interfaces/IGuildController.sol";

contract GuildFactory is ICloneFactory, Ownable {
    /// The AMOR Token address
    address public amorToken;
    /// The address for the AMORxGuild Token implementation
    address public amorxGuildToken;
    /// The FXAMORxGuild Token implementation
    address public fxAMORxGuildToken;
    /// The dAMORxGuild Token implementation
    address public dAMORxGuildToken;
    /// The ControllerxGuild implementation
    address public controllerxGuild;

    address public MetaDaoController;

    address public multisig;

    /// The DoinGud generic proxy contract (the target)
    address public cloneTarget;
    address[] public amorxGuildTokens;
    ///mapping(address => address) public amorxGuildTokens;
    ///address[] public fxAMORxGuildTokens;
    mapping(address => address) public fxAMORxGuildTokens;
    ///address[] public dAMORxGuildTokens;
    mapping(address => address) public dAMORxGuildTokens;
    ///address[] public guildControllers;
    mapping(address => address) public guildControllers;

    uint256 public defaultGuardianThreshold = 10;

    constructor(
        address _amorToken,
        address _amorxGuildToken,
        address _fxAMORxGuildToken,
        address _dAMORxGuildToken,
        address _doinGudProxy,
        address _controllerxGuild,
        address _metaDaoController,
        address _multisig
    ) {
        amorToken = _amorToken;
        /// Set the implementation addresses
        amorxGuildToken = _amorxGuildToken;
        fxAMORxGuildToken = _fxAMORxGuildToken;
        dAMORxGuildToken = _dAMORxGuildToken;
        /// `_cloneTarget` refers to the DoinGud Proxy
        cloneTarget = _doinGudProxy;
        controllerxGuild = _controllerxGuild;
        MetaDaoController = _metaDaoController;
        multisig = _multisig;
    }

    /// @notice This deploys a new guild with it's associated tokens
    /// @dev    Takes the names and symbols and associates it to a guild
    /// @param  _name The name of the Guild without the prefix "AMORx"
    /// @param  _symbol The symbol of the Guild
    function deployGuildContracts(
        address guildOwner,
        string memory _name,
        string memory _symbol
    ) external returns (address) {
        /// Setup local scope vars
        string memory tokenName;
        string memory tokenSymbol;
        address clonedContract;

        /// Deploy AMORxGuild contract
        tokenName = string.concat("AMORx", _name);
        tokenSymbol = string.concat("Ax", _symbol);
        clonedContract = _deployGuildToken(tokenName, tokenSymbol, amorxGuildToken);
        amorxGuildTokens.push(clonedContract);

        /// Deploy FXAMORxGuild contract
        tokenName = string.concat("FXAMORx", _name);
        tokenSymbol = string.concat("FXx", _symbol);
        clonedContract = _deployTokenContracts(
            amorxGuildTokens[amorxGuildTokens.length - 1],
            tokenName,
            tokenSymbol,
            fxAMORxGuildToken
        );
        fxAMORxGuildTokens[amorxGuildTokens[amorxGuildTokens.length - 1]] = clonedContract;

        /// Deploy dAMORxGuild contract
        tokenName = string.concat("dAMORx", _name);
        tokenSymbol = string.concat("Dx", _symbol);
        clonedContract = _deployTokenContracts(
            amorxGuildTokens[amorxGuildTokens.length - 1],
            tokenName,
            tokenSymbol,
            dAMORxGuildToken
        );
        dAMORxGuildTokens[amorxGuildTokens[amorxGuildTokens.length - 1]] = clonedContract;

        /// Deploy the ControllerxGuild
        clonedContract = _deployGuildController(
            controllerxGuild,
            guildOwner,
            amorToken,
            amorxGuildToken,
            fxAMORxGuildToken,
            MetaDaoController,
            multisig
        );
        guildControllers[amorxGuildTokens[amorxGuildTokens.length - 1]] = clonedContract;

        return clonedContract;
    }

    /// @notice Internal function to deploy clone of an implementation contract
    /// @param  guildName name of token
    /// @param  guildSymbol symbol of token
    /// @param  _implementation address of the contract to be cloned
    /// @return address of the deployed contract
    function _deployGuildToken(
        string memory guildName,
        string memory guildSymbol,
        address _implementation
    ) internal returns (address) {
        IAmorxGuild proxyContract = IAmorxGuild(Clones.clone(cloneTarget));

        IDoinGudProxy(address(proxyContract)).initProxy(_implementation);
        proxyContract.init(guildName, guildSymbol, amorToken, msg.sender);

        return address(proxyContract);
    }

    /// @notice Internal function to deploy clone of an implementation contract
    /// @param  guildName name of token
    /// @param  guildSymbol symbol of token
    /// @param  _implementation address of the contract to be cloned
    /// @return address of the deployed contract
    function _deployTokenContracts(
        address guildTokenAddress,
        string memory guildName,
        string memory guildSymbol,
        address _implementation
    ) internal returns (address) {
        IDoinGudProxy proxyContract = IDoinGudProxy(Clones.clone(cloneTarget));
        proxyContract.initProxy(_implementation);

        /// Check which token contract should be deployed
        if (fxAMORxGuildTokens[guildTokenAddress] != address(0)) {
            IdAMORxGuild(address(proxyContract)).init(
                guildName,
                guildSymbol,
                msg.sender,
                guildTokenAddress,
                defaultGuardianThreshold
            );
        } else {
            /// FXAMOR uses the same `init` layout as IAMORxGuild
            IAmorxGuild(address(proxyContract)).init(guildName, guildSymbol, msg.sender, guildTokenAddress);
        }

        return address(proxyContract);
    }

    /// @notice Internal function to deploy the Guild Controller
    /// @param  _implementation the address of the implementation contract
    /// @param  guildOwner address controlling the Guild
    /// @param  amorxGuild the address of this guild's AMORxGuild token
    /// @param  fxAMORxGuild the address of this guild's FXAMORxGuild token
    /// @return address of the deployed guild controller
    function _deployGuildController(
        address _implementation,
        address guildOwner,
        address amor,
        address amorxGuild,
        address fxAMORxGuild,
        address MetaDaoController,
        address multisig
    ) internal returns (address) {
        IDoinGudProxy proxyContract = IDoinGudProxy(Clones.clone(cloneTarget));
        proxyContract.initProxy(_implementation);

        /// Init the Guild Controller
        IGuildController(address(proxyContract)).init(
            guildOwner,
            amor,
            amorxGuild,
            fxAMORxGuild,
            MetaDaoController,
            multisig
        );

        return address(proxyContract);
    }
}
