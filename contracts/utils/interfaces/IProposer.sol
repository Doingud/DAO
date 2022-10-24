// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.15;

import "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";

interface IProposer {
    /// @notice Initializes the Proposer module
    /// @param  initializeParams: the encoded `(address, address, address)` parameters
    ///         corresponding to `(avatar, governor, reality)`
    function setUp(bytes memory initializeParams) external;

    /// @notice Allows for on-chain execution of off-chain vote
    /// @dev    Links to a `Reality`/`SnapSafe` module
    /// @param  targets An array of proposed targets for proposed transactions
    /// @param  values An array of values corresponding to proposed transactions
    /// @param  data An array of encoded function calls with parameters corresponding to proposals
    /// @param  operation A specifying enum corresponding to the type of low-level call to use (`delegateCall` or `Call`)
    /// @return bool Was the proposal successfully proposed to the GovernorxGuild
    function proposeAfterVote(
        address[] memory targets,
        uint256[] memory values,
        bytes[] calldata data,
        Enum.Operation operation
    ) external returns (bool);

    function setGuardiansAfterVote(address[] memory guardians) external returns (bool);
}
