// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.15;

interface IProposer {
    /// The Reality module from the Community Safe
    address public reality;

    function setUp(bytes memory initializeParams) external;

    function proposeAfterVote(
        address[] memory targets,
        uint256[] memory values,
        bytes[] calldata data,
        Enum.Operation operation
    ) external;

}