// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.15;

import "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";

interface IProposer {

    function setUp(bytes memory initializeParams) external;

    function proposeAfterVote(
        address[] memory targets,
        uint256[] memory values,
        bytes[] calldata data,
        Enum.Operation operation
    ) external;

}