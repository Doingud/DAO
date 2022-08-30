// SPDX-License-Identifier: MIT

/// @title  DoinGud Proxy Interface
/// @author Daoism Systems Team
/// @notice ERC20 implementation for DoinGudDAO

/**
 *  @dev Interface for the DoinGud Proxy
 */
pragma solidity 0.8.15;

interface IMetadao {
    /// @notice returns the current implementation address
    /// @dev    ensures transparency with regards to which funcitonality is implemented
    /// @return address the address of the current implementation contract
    function isWhitelisted(address token) external returns (bool);

    function getGuildFunds(address token, address controller) external returns (uint256);
}
