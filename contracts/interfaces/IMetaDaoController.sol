// SPDX-License-Identifier: MIT

/// @title  MetaDAO Controller Interface
/// @author Daoism Systems Team
/// @custom security-contact contact@daoism.systems

pragma solidity 0.8.15;

interface IMetaDaoController {
    function init(
        address amor,
        address factory,
        address avatar
    ) external;

    function guildFunds(address guild, address token) external returns (uint256);

    /// @notice Allows a user to donate a whitelisted asset
    /// @dev    `approve` must have been called on the `token` contract
    /// @param  token the address of the token to be donated
    /// @param  amount the amount of tokens to donate
    /// @param  index the index being donated to
    function donate(
        address token,
        uint256 amount,
        uint256 index
    ) external;

    /// @notice Claims specified token for specified guild
    /// @param guild The address of the target guild controller
    /// @param token The target token contract address
    function claimToken(address guild, address token) external returns (uint256);

    /// @notice Apportions collected funds
    /// @param token The address of the token being distributed
    function distributeFees(address token) external;

    /// @notice Transfers apportioned tokens from the metadao to the guild
    /// @param  guild target guild
    function claimFees(address guild) external;

    /// @notice use this funtion to create a new guild via the guild factory
    /// @dev only admin can all this funtion
    /// @param guildOwner address that will control the functions of the guild
    /// @param name the name for the guild
    /// @param tokenSymbol the symbol for the Guild's token
    /// @param initialGuardian the user responsible for the initial Guardian actions
    function createGuild(
        address guildOwner,
        address initialGuardian,
        string memory name,
        string memory tokenSymbol
    ) external;

    /// @notice adds guild based on the controller address provided
    /// @dev give guild role in access control to the controller for the guild
    /// @param controller the controller address of the guild
    function addExternalGuild(address controller) external;

    /// @notice adds guild based on the controller address provided
    /// @dev give guild role in access control to the controller for the guild
    /// @param _token the controller address of the guild
    function addWhitelist(address _token) external;

    /// @notice removes guild based on id
    /// @param controller the index of the guild in guilds[]
    function removeGuild(address controller) external;

    /// @notice Checks that a token is whitelisted
    /// @param  token address of the ERC20 token being checked
    /// @return bool true if token whitelisted, false if not whitelisted
    function isWhitelisted(address token) external view returns (bool);

    /// @notice Adds a new index to the `Index` array
    /// @dev    Requires an encoded array of SORTED tuples in (address, uint256) format
    /// @param  weights an array containing the weighting indexes for different guilds
    /// @return index of the new index in the `Index` array
    function addIndex(bytes[] calldata weights) external returns (uint256);

    /// @notice Allows DoinGud to update the fee index used
    /// @param  weights an array of the guild weights
    function updateIndex(bytes[] calldata weights, uint256 index) external;
}
