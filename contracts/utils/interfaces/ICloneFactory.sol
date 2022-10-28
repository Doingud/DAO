// SPDX-License-Identifier: MIT
// Derived from OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/ERC20.sol)

pragma solidity 0.8.15;

/// @title  Interface for CloneFactory.sol
/// @author Daoism Systems Team

interface ICloneFactory {
    error CreationFailed();

    error ArrayMismatch();

    function deployGuildContracts(
        address owner,
        address initialGuardian,
        string memory _name,
        string memory _symbol
    )
        external
        returns (
            address controller,
            address avatar,
            address governor
        );
}
