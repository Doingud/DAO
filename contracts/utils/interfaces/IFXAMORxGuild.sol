// SPDX-License-Identifier: MIT

/**
 *  @dev Implementation of the FXAMORxGuild token for DoinGud
 *
 *  The contract houses the token logic for FXAMORxGuild.
 *
 */
pragma solidity 0.8.14;

interface IFXAMORxGuild {
    /// Events
    /// Emitted once token has been initialized
    event Initialized(bool success, address owner, address AMORxGuild);

    /// @notice Initializes the IFXAMORxGuild contract
    /// @dev    Sets the token details as well as the required addresses for token logic
    /// @param  amorAddress the address of the AMOR token proxy
    /// @param  name the token name (e.g AMORxIMPACT)
    /// @param  symbol the token symbol
    function init(
        address amorAddress,
        string memory name,
        string memory symbol
    ) external;

    function stake(address to, uint256 amount) external returns (uint256);

    function burn(address account, uint256 amount) external;

    function delegate(address to, uint256 amount) external;

    function undelegate(address account, uint256 amount) external;
}
