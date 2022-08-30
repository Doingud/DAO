// SPDX-License-Identifier: MIT
// Derived from OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/ERC20.sol)

pragma solidity 0.8.15;

/// @title  Interface for AvatarxGuild.sol
/// @author Daoism Systems Team

interface IAvatar {
    function executeProposal(
        address[] memory target,
        uint256[] memory value,
        bytes[] memory proposal
    ) external virtual returns (bool success);
}
