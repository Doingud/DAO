// SPDX-License-Identifier: MIT

/// @title  DoinGud Proxy Interface
/// @author Daoism Systems Team
/// @notice ERC20 implementation for DoinGudDAO

/**
 *  @dev Interface for the DoinGud Proxy
 */
pragma solidity 0.8.15;

interface IDoinGudProxy {
    /// @notice First time setup of proxy contract
    /// @dev    Can only be called once. Sets up token with specific implementation address
    /// @param  logic The address of the contract with the correct implementation logic
    function initProxy(address logic) external payable;

    /// @notice updates the `implementation` contract
    /// @param  newImplementation the address of the new implementation contract
    function upgradeImplementation(address newImplementation) external;

    /// @notice returns the current implementation address
    /// @dev    ensures transparency with regards to which funcitonality is implemented
    /// @return address the address of the current implementation contract
    function viewImplementation() external view returns (address);
}
