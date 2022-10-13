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
import "./utils/interfaces/IAvatarxGuild.sol";
import "./utils/interfaces/IGovernor.sol";

contract GuildFactory is ICloneFactory, Ownable {
    /// The various guild components
    struct GuildComponents {
        //address AvatarxGuild;
        address AmorGuildToken;
        address DAmorxGuild;
        address FXAmorxGuild;
        address ControllerxGuild;
        address GovernorxGuild;
    }

    /// The Mastercopy/Implementation Addresses
    /// The AMOR Token address
    address public immutable amorToken;
    /// The address for the AMORxGuild Token implementation
    address public amorxGuildToken;
    /// The MetaDaoController address
    address public immutable metaDaoController;
    /// The snapshot address
    address public immutable snapshot;
    /// The DoinGud generic proxy contract (the target)
    address public immutable cloneTarget;
    address public immutable avatarxGuild;
    address public immutable dAmorxGuild;
    address public immutable fXAmorxGuild;
    address public immutable controllerxGuild;
    address public immutable governorxGuild;

    /// Sentinal
    address private constant SENTINEL_GUILDS = address(1);
    /// Create a mapping of AvatarxGuild GuildComponents
    mapping(address => GuildComponents) public guilds;
    mapping(address => address) public guildsList;

    /// CONSTANTS
    uint256 public constant DEFAULT_GUARDIAN_THRESHOLD = 10;

    /// ERRORS
    /// The deployment was unsuccessful
    error Unsuccessful();

    constructor(
        address _amorToken,
        address _amorxGuildToken,
        address _fxAMORxGuildToken,
        address _dAMORxGuildToken,
        address _doinGudProxy,
        address _controllerxGuild,
        address _governor,
        address _avatarxGuild,
        address _metaDaoController,
        address _snapshot
    ) {
        /// The AMOR Token address
        amorToken = _amorToken;
        /// Set the implementation addresses
        amorxGuildToken = _amorxGuildToken;
        fXAmorxGuild = _fxAMORxGuildToken;
        dAmorxGuild = _dAMORxGuildToken;
        controllerxGuild = _controllerxGuild;
        governorxGuild = _governor;
        avatarxGuild = _avatarxGuild;
        /// `_cloneTarget` refers to the DoinGud Proxy
        cloneTarget = _doinGudProxy;
        metaDaoController = _metaDaoController;
        snapshot = _snapshot;
    }

    /// @notice This deploys a new guild with it's associated tokens
    /// @dev    Takes the names and symbols and associates it to a guild
    /// @param  _name The name of the Guild without the prefix "AMORx"
    /// @param  _symbol The symbol of the Guild
    function deployGuildContracts(
        address guildOwner,
        string memory _name,
        string memory _symbol
    )
        external
        returns (
            address controller,
            address avatar,
            address governor
        )
    {
        /// Setup local scope vars
        string memory tokenName;
        string memory tokenSymbol;

        /// Deploy the Guild Avatar
        avatar = _deployAvatar();
        /// Add the Avatar to the linked list
        guildsList[avatar] = guildsList[SENTINEL_GUILDS];
        guildsList[SENTINEL_GUILDS] = avatar;

        /// Create a link to the new GuildComponents struct
        GuildComponents storage guild = guilds[avatar];

        /// Deploy AMORxGuild contract
        tokenName = string.concat("AMORx", _name);
        tokenSymbol = string.concat("Ax", _symbol);
        guild.AmorGuildToken = _deployGuildToken(tokenName, tokenSymbol);

        /// Deploy FXAMORxGuild contract
        tokenName = string.concat("FXAMORx", _name);
        tokenSymbol = string.concat("FXx", _symbol);
        guild.FXAmorxGuild = _deployTokenContracts(avatar, tokenName, tokenSymbol, fXAmorxGuild);

        /// Deploy dAMORxGuild contract
        tokenName = string.concat("dAMORx", _name);
        tokenSymbol = string.concat("Dx", _symbol);
        guild.DAmorxGuild = _deployTokenContracts(avatar, tokenName, tokenSymbol, dAmorxGuild);

        /// Deploy the ControllerxGuild
        guild.ControllerxGuild = _deployGuildController();

        /// Deploy the Guild Governor
        guild.GovernorxGuild = _deployGovernor();

        _initGuildControls(_name, avatar, guildOwner);

        return (guild.ControllerxGuild, guild.GovernorxGuild, avatar);
    }

    /// @notice Internal function to deploy clone of an implementation contract
    /// @param  guildName name of token
    /// @param  guildSymbol symbol of token
    /// @return address of the deployed contract
    function _deployGuildToken(string memory guildName, string memory guildSymbol) internal returns (address) {
        IAmorxGuild proxyContract = IAmorxGuild(Clones.clone(cloneTarget));

        if (address(proxyContract) == address(0)) {
            revert CreationFailed();
        }

        IDoinGudProxy(address(proxyContract)).initProxy(amorxGuildToken);
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
        if (guilds[guildTokenAddress].FXAmorxGuild != address(0)) {
            IdAMORxGuild(address(proxyContract)).init(
                guildName,
                guildSymbol,
                msg.sender,
                guildTokenAddress,
                DEFAULT_GUARDIAN_THRESHOLD
            );
        } else {
            /// FXAMOR uses the same `init` layout as IAMORxGuild
            IAmorxGuild(address(proxyContract)).init(guildName, guildSymbol, msg.sender, guildTokenAddress);
        }

        return address(proxyContract);
    }

    /// @notice Internal function to deploy the Guild Controller
    /// @return address of the deployed guild controller
    function _deployGuildController() internal returns (address) {
        IDoinGudProxy proxyContract = IDoinGudProxy(Clones.clone(cloneTarget));
        proxyContract.initProxy(controllerxGuild);

        return address(proxyContract);
    }

    /// @notice Deploys the guild's AvatarxGuild contract
    /// @return address of the nemwly deployed AvatarxGuild
    function _deployAvatar() internal returns (address) {
        IDoinGudProxy proxyContract = IDoinGudProxy(Clones.clone(cloneTarget));
        proxyContract.initProxy(avatarxGuild);

        return address(proxyContract);
    }

    /// @notice Deploys the GovernorxGuild contract
    /// @return address of the deployed GovernorxGuild
    function _deployGovernor() internal returns (address) {
        IDoinGudProxy proxyContract = IDoinGudProxy(Clones.clone(cloneTarget));
        proxyContract.initProxy(governorxGuild);

        return address(proxyContract);
    }

    /// @notice Initializes the Guild Control Structures
    /// @param  name string: name of the guild being deployed
    /// @param  avatar the avatar token address for this guild
    /// @param  owner address: owner of the Guild
    function _initGuildControls(
        string memory name,
        address avatar,
        address owner
    ) internal {
        /// Init the Guild Controller
        IGuildController(guilds[avatar].ControllerxGuild).init(
            avatar,
            amorToken,
            guilds[avatar].AmorGuildToken,
            guilds[avatar].FXAmorxGuild,
            metaDaoController
        );

        /// Init the AvatarxGuild
        IAvatarxGuild(avatar).init(owner, guilds[avatar].GovernorxGuild);

        /// Init the AvatarxGuild
        IDoinGudGovernor(guilds[avatar].GovernorxGuild).init(
            string.concat("Governorx", name),
            guilds[avatar].AmorGuildToken,
            snapshot,
            avatar
        );
    }
}
