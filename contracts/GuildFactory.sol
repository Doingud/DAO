// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

/**
 * @title  Clone Factory for DoinGud Tokens
 * @author Daoism Systems Team
 * @custom Security-contact security@daoism.systems
 *
 * @dev https://eips.ethereum.org/EIPS/eip-1167[EIP 1167] is a standard for
 * deploying minimal proxy contracts, also known as "clones".
 *
 * The DoinGud GuildTokenFactory allows for the low-gas creation of Guilds and Guild-related tokens
 * by using the minimal proxy, or "clone" pattern
 *
 * DoinGud Guilds require a non-standard implementation of ERC1967Proxy from OpenZeppelin
 * to allow the factory to initialize the ERC20 contracts without constructors.
 *
 * In conjunction with this, the token contracts are custom ERC20 implementations
 * that use the ERC20Base.sol contracts developed for DoinGud.
 *
 * MIT License
 * ===========
 *
 * Copyright (c) 2022 DoinGud
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *
 */

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

import "./interfaces/IAMORxGuild.sol";
import "./interfaces/ICloneFactory.sol";
import "./interfaces/IDoinGudProxy.sol";
import "./interfaces/IdAMORxGuild.sol";
import "./interfaces/IGuildController.sol";
import "./interfaces/IAvatarxGuild.sol";
import "./interfaces/IGovernor.sol";

contract GuildFactory is ICloneFactory {
    /// The various guild components
    struct GuildComponents {
        address AmorGuildToken;
        address DAmorxGuild;
        address FXAmorxGuild;
        address AvatarxGuild;
        address GovernorxGuild;
    }

    /// The AMOR Token address
    address public immutable amorToken;

    /// Beacons
    address public immutable avatarxGuild;
    address public immutable dAmorxGuild;
    address public immutable fXAmorxGuild;
    address public immutable controllerxGuild;
    address public immutable governorxGuild;
    address public immutable amorxGuildToken;
    address public immutable metaDaoController;

    /// Create a mapping of AvatarxGuild GuildComponents
    mapping(address => GuildComponents) public guilds;

    /// CONSTANTS
    uint256 public constant DEFAULT_GUARDIAN_THRESHOLD = 10;

    /// EVENTS
    event GuildContractsCreated(
        address GuildController,
        address AmorGuildToken,
        address DAmorxGuild,
        address FXAmorxGuild,
        address AvatarxGuild,
        address GovernorxGuild
    );

    /// ERRORS
    /// The deployment was unsuccessful
    error Unsuccessful();

    event GuildCreated(
        address amorxGuildToken,
        address dAMORxGuildToken,
        address fxAMORxGuildToken,
        address controllerxGuild
    );

    constructor(
        address _amorToken,
        address _amorxGuildToken,
        address _fxAMORxGuildToken,
        address _dAMORxGuildToken,
        address _doinGudProxy,
        address _controllerxGuild,
        address _governor,
        address _avatarxGuild,
        address _metaDaoController
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
        metaDaoController = _metaDaoController;
    }

    /// @notice This deploys a new guild with it's associated tokens
    /// @dev    Takes the names and symbols and associates it to a guild
    /// @param  reality The address of the Reality.eth module linked to this guild's snapshot
    /// @param  _name The name of the Guild without the prefix "AMORx"
    /// @param  _symbol The symbol of the Guild
    function deployGuildContracts(
        address reality,
        address initialGuardian,
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
        controller = _deployGuildController();

        /// Create a link to the new GuildComponents struct
        GuildComponents storage guild = guilds[controller];

        /// Deploy AMORxGuild contract
        tokenName = string.concat("AMORx", _name);
        tokenSymbol = string.concat("Ax", _symbol);
        guild.AmorGuildToken = _deployGuildToken(tokenName, tokenSymbol);

        /// Deploy FXAMORxGuild contract
        tokenName = string.concat("FXAMORx", _name);
        tokenSymbol = string.concat("FXx", _symbol);
        guild.FXAmorxGuild = _deployTokenContracts(controller, tokenName, tokenSymbol, fXAmorxGuild);

        /// Deploy dAMORxGuild contract
        tokenName = string.concat("dAMORx", _name);
        tokenSymbol = string.concat("Dx", _symbol);
        guild.DAmorxGuild = _deployTokenContracts(controller, tokenName, tokenSymbol, dAmorxGuild);

        /// Deploy the ControllerxGuild
        guild.AvatarxGuild = _deployAvatar();

        /// Deploy the Guild Governor
        guild.GovernorxGuild = _deployGovernor();

        _initGuildControls(controller, reality, initialGuardian);
        emit GuildContractsCreated(
            controller,
            guild.AmorGuildToken,
            guild.DAmorxGuild,
            guild.FXAmorxGuild,
            guild.AvatarxGuild,
            guild.GovernorxGuild
        );
        return (controller, guild.GovernorxGuild, guild.AvatarxGuild);
    }

    /// @notice Internal function to deploy clone of an implementation contract
    /// @param  guildName name of token
    /// @param  guildSymbol symbol of token
    /// @return proxyContract address of the deployed contract
    function _deployGuildToken(string memory guildName, string memory guildSymbol)
        internal
        returns (address proxyContract)
    {
        proxyContract = address(new BeaconProxy(amorxGuildToken, ""));

        if (proxyContract == address(0)) {
            revert CreationFailed();
        }

        IAmorxGuild(proxyContract).init(guildName, guildSymbol, amorToken, msg.sender);

        return address(proxyContract);
    }

    /// @notice Internal function to deploy clone of an implementation contract
    /// @param  guildName name of token
    /// @param  guildSymbol symbol of token
    /// @param  _implementation address of the contract to be cloned
    /// @return proxyContract address of the deployed contract
    function _deployTokenContracts(
        address guildTokenAddress,
        string memory guildName,
        string memory guildSymbol,
        address _implementation
    ) internal returns (address proxyContract) {
        proxyContract = address(new BeaconProxy(_implementation, ""));

        /// Check which token contract should be deployed
        if (guilds[guildTokenAddress].FXAmorxGuild != address(0)) {
            IdAMORxGuild(proxyContract).init(
                guildName,
                guildSymbol,
                guilds[guildTokenAddress].AvatarxGuild,
                guilds[guildTokenAddress].AmorGuildToken,
                DEFAULT_GUARDIAN_THRESHOLD
            );
        } else {
            /// FXAMOR uses the same `init` layout as IAMORxGuild
            IAmorxGuild(proxyContract).init(
                guildName,
                guildSymbol,
                guildTokenAddress,
                guilds[guildTokenAddress].AmorGuildToken
            );
        }
    }

    /// @notice Internal function to deploy the Guild Controller
    /// @return address of the deployed guild controller
    function _deployGuildController() internal returns (address) {
        return address(new BeaconProxy(controllerxGuild, ""));
    }

    /// @notice Deploys the guild's AvatarxGuild contract
    /// @return address of the nemwly deployed AvatarxGuild
    function _deployAvatar() internal returns (address) {
        return address(new BeaconProxy(avatarxGuild, ""));
    }

    /// @notice Deploys the GovernorxGuild contract
    /// @return address of the deployed GovernorxGuild
    function _deployGovernor() internal returns (address) {
        return address(new BeaconProxy(governorxGuild, ""));
    }

    /// @notice Initializes the Guild Control Structures
    /// @param  controller the avatar token address for this guild
    /// @param  reality the Reality.io address
    /// @param  initialGuardian the first guardian for the guild Governor
    function _initGuildControls(
        address controller,
        address reality,
        address initialGuardian
    ) internal {
        /// Init the Guild Controller
        IGuildController(controller).init(
            guilds[controller].AvatarxGuild,
            amorToken,
            guilds[controller].AmorGuildToken,
            guilds[controller].FXAmorxGuild,
            metaDaoController
        );

        /// Init the AvatarxGuild
        IAvatarxGuild(guilds[controller].AvatarxGuild).init(reality, guilds[controller].GovernorxGuild);

        /// Init the GovernorxGuild
        IDoinGudGovernor(guilds[controller].GovernorxGuild).init(guilds[controller].AvatarxGuild, initialGuardian);
    }
}
