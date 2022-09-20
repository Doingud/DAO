// SPDX-License-Identifier: MIT
// Derived from OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/ERC20.sol)

pragma solidity 0.8.15;

/// @title  Interface for CloneFactory.sol
/// @author Daoism Systems Team

interface ICloneFactory {
    function deployGuildContracts(
        address owner,
        string memory _name,
        string memory _symbol
    ) external;
}
