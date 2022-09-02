// SPDX-License-Identifier: MIT

/// @title  MetaDAO Controller Interface
/// @author Daoism Systems Team
/// @custom security-contact contact@daoism.systems

pragma solidity 0.8.15;

interface IMetaDaoController {
    /// @notice Updates a guild's weight
    /// @param  guildArray addresses of the guilds
    /// @param  newWeights weights of the guilds, must be correspond to the order of `guildArray`
    function updateGuildWeights(address[] memory guildArray, uint256[] memory newWeights) external;

    function guildFunds(address guild, address token) external returns (uint256);

    /// @notice Allows a user to donate a whitelisted asset
    /// @dev    `approve` must have been called on the `token` contract
    /// @param  token the address of the token to be donated
    /// @param  amount the amount of tokens to donate
    function donate(address token, uint256 amount) external;

    /// @notice Distributes both the fees and the token donations
    function distributeAll() external;

    /// @notice Distributes the specified token
    /// @param  token address of target token
    function distributeToken(address token) external;

    /// @notice Apportions approved token donations according to guild weights
    /// @dev    Loops through all whitelisted tokens and calls `distributeToken()` for each
    function distributeTokens() external;

    /// @notice Apportions collected AMOR fees
    function distributeFees() external;

    /// @notice Transfers apportioned tokens from the metadao to the guild
    /// @dev only a guild can call this funtion
    function claimToken(address token) external;

    /// @notice use this funtion to create a new guild via the guild factory
    /// @dev only admin can all this funtion
    /// @param guildOwner address that will control the functions of the guild
    /// @param name the name for the guild
    /// @param tokenSymbol the symbol for the Guild's token
    function createGuild(
        address guildOwner,
        string memory name,
        string memory tokenSymbol
    ) external;

    /// @notice adds guild based on the controller address provided
    /// @dev give guild role in access control to the controller for the guild
    /// @param controller the controller address of the guild
    function addGuild(address controller) external;

    /// @notice adds guild based on the controller address provided
    /// @dev give guild role in access control to the controller for the guild
    /// @param _token the controller address of the guild
    function addWhitelist(address _token) external;

    /// @notice removes guild based on id
    /// @param index the index of the guild in guilds[]
    /// @param controller the address of the guild controller to remove
    function removeGuild(uint256 index, address controller) external;

    /// @notice Checks that a token is whitelisted
    /// @param  token address of the ERC20 token being checked
    /// @return bool true if token whitelisted, false if not whitelisted
    function isWhitelisted(address token) external view returns (bool);
}
