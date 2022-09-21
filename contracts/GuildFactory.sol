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
    /// The various Guild Components
    /// Note AmorxGuild is excluded
    enum GuildComponents {
        DAmorxGuild,
        FXAmorxGuild,
        ControllerxGuild,
        GovernorxGuild,
        AvatarxGuild
    }

    /// The AMOR Token address
    address public amorToken;
    /// The address for the AMORxGuild Token implementation
    address public amorxGuildToken;

    /// A mapping of the AmorxGuild address => the related GuildComponent's address
    /// Note Guild Components implementations = guildComponents[amorxGuildToken][GuildComponent]
    mapping(address => mapping(GuildComponents => address)) public guildComponents;

    /// The MetaDaoController address
    address public immutable metaDaoController;
    /// The DoinGud Multisig address
    address public immutable multisig;
    /// The snapshot address
    address public immutable snapshot;
    /// The DoinGud generic proxy contract (the target)
    address public immutable cloneTarget;
    
    address[] public amorxGuildTokens;

    uint256 public constant DEFAULT_GUARDIAN_THRESHOLD = 10;

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
        address _multisig,
        address _snapshot
    ) {
        /// The AMOR Token address
        amorToken = _amorToken;
        /// Set the implementation addresses
        amorxGuildToken = _amorxGuildToken;
        guildComponents[amorxGuildToken][GuildComponents.FXAmorxGuild] = _fxAMORxGuildToken;
        guildComponents[amorxGuildToken][GuildComponents.DXAmorxGuild] = _dAMORxGuildToken;
        guildComponents[amorxGuildToken][GuildComponents.ControllerxGuild] = _controllerxGuild;
        guildComponents[amorxGuildToken][GuildComponents.GovernorxGuild] = _governor;
        guildComponents[amorxGuildToken][GuildComponents.AvatarxGuild] = _avatarxGuild;

        /// `_cloneTarget` refers to the DoinGud Proxy
        cloneTarget = _doinGudProxy;
        MetaDaoController = _metaDaoController;
        multisig = _multisig;
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
    ) external returns (
        address controller,
        address avatar,
        address governor
    ) {
        /// Setup local scope vars
        string memory tokenName;
        string memory tokenSymbol;
        address clonedContract;
        uint256 currentGuildIndex;

        /// Deploy AMORxGuild contract
        tokenName = string.concat("AMORx", _name);
        tokenSymbol = string.concat("Ax", _symbol);
        clonedContract = _deployGuildToken(tokenName, tokenSymbol, amorxGuildToken);
        amorxGuildTokens.push(clonedContract);

        /// Deploy FXAMORxGuild contract
        tokenName = string.concat("FXAMORx", _name);
        tokenSymbol = string.concat("FXx", _symbol);
        clonedContract = _deployTokenContracts(
            amorxGuildTokens[currentGuildIndex],
            tokenName,
            tokenSymbol,
            guildComponents[amorxGuildToken][GuildComponents.FXAmorxGuild]
        );
        guildComponents[amorxGuildTokens[currentGuildIndex]][GuildComponents.FXAmorxGuild] = clonedContract;

        /// Deploy dAMORxGuild contract
        tokenName = string.concat("dAMORx", _name);
        tokenSymbol = string.concat("Dx", _symbol);
        clonedContract = _deployTokenContracts(
            amorxGuildTokens[currentGuildIndex],
            tokenName,
            tokenSymbol,
            guildComponents[amorxGuildToken][GuildComponents.DXAmorxGuild]
        );
        guildComponents[amorxGuildTokens[currentGuildIndex]][GuildComponents.DAmorxGuild] = clonedContract;

        /// Deploy the ControllerxGuild
        controller = _deployGuildController(
            guildOwner,
            amorToken,
            amorxGuildToken,
            guildComponents[amorxGuildToken][GuildComponents.FXAmorxGuild],
            MetaDaoController,
            multisig
        );
        guildComponents[amorxGuildTokens[currentGuildIndex]][GuildComponents.ControllerxGuild] = clonedContract;

        /// Deploy the Guild Governor
        governor = _deployGovernor(
            string.concat("Governorx", _name),
            amorxGuildTokens[currentGuildIndex],
            snapshot,
            avatar
        );
        guildComponents[amorxGuildTokens[currentGuildIndex]][GuildComponents.GovernorxGuild] = clonedContract;

        /// Deploy the Guild Avatar
        avatar = _deployAvatar(guildOwner, governor);
        guildComponents[amorxGuildTokens[currentGuildIndex]][GuildComponents.AvatarxGuild] = clonedContract;

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

        if (address(proxyContract) == address(0)) {
            revert CreationFailed();
        }

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

        if (address(proxyContract) == address(0)) {
            revert CreationFailed();
        }
        /// Check which token contract should be deployed
        if (fxAMORxGuildTokens[guildTokenAddress] != address(0)) {
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
    /// @param  _implementation the address of the implementation contract
    /// @param  guildOwner address controlling the Guild
    /// @param  amorxGuild the address of this guild's AMORxGuild token
    /// @param  fxAMORxGuild the address of this guild's FXAMORxGuild token
    /// @return address of the deployed guild controller
    function _deployGuildController(
        address guildOwner,
        address amor,
        address amorxGuild,
        address fxAMORxGuild,
        address MetaDaoController,
        address multisig
    ) internal returns (address) {
        IDoinGudProxy proxyContract = IDoinGudProxy(Clones.clone(cloneTarget));
        proxyContract.initProxy(guildComponents[amorxGuildToken][GuildComponents.ControllerxGuild]);

        return address(proxyContract);
    }

    /// @notice Deploys the guild's AvatarxGuild contract
    /// @param  owner guild Avatar owner
    /// @param  governor the GovernorxGuild this Avatar is linked to
    /// @return address of the nemwly deployed AvatarxGuild
    function _deployAvatar(address owner, address governor) internal returns (address) {
        IDoinGudProxy proxyContract = IDoinGudProxy(Clones.clone(cloneTarget));
        proxyContract.initProxy(guildComponents[amorxGuildToken][GuildComponents.AvatarxGuild]);

        return address(proxyContract);
    }

    /// @notice Deploys the GovernorxGuild contract
    /// @param  name The name of this guild's governor
    /// @param  amorGuildtoken address of this guild's token
    /// @param  snapshot address of the snapshot
    /// @param  avatar address of this guild's avatar
    /// @return address of the deployed GovernorxGuild
    function _deployGovernor(
        string memory name,
        address amorGuildToken,
        address snapshot,
        address avatar
    ) internal returns (address) {
        IDoinGudProxy proxyContract = IDoinGudProxy(Clones.clone(cloneTarget));
        proxyContract.initProxy(guildComponents[amorxGuildToken][GuildComponents.GovernorxGuild]);

        return address(proxyContract);
    }

    /// @notice Initializes the Guild Control Structures
    /// @param Documents a parameter just like in doxygen (must be followed by parameter name)
    /// @return Documents the return variables of a contract’s function state variable
    function _initGuildControls(string memory name, address amorGuildToken, address guildAvatar, address owner, address governor) external returns (bool) {
        /// Init the Guild Controller
        IGuildController(address(proxyContract)).init(
            guildOwner,
            amor,
            amorxGuild,
            fxAMORxGuild,
            MetaDaoController,
            multisig
        );

        /// Init the AvatarxGuild
        IAvatarxGuild(address(proxyContract)).init(owner, governor);

        /// Init the AvatarxGuild
        IDoinGudGovernor(address(proxyContract)).init(
            name,
            amorGuildToken,
            snapshot,
            avatar
        );

    }
}
