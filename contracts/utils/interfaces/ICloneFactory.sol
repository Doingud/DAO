// SPDX-License-Identifier: MIT
// Derived from OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/ERC20.sol)

pragma solidity 0.8.15;

/// @title  Interface for AmorToken.sol
/// @author Daoism Systems Team

interface ICloneFacotry {

    error CreationFailed();

    error ArrayMismatch();

    function deployGuildContracts(string memory _name, string memory _symbol) external;

}
