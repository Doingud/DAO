// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.15;

import "@gnosis.pm/zodiac/contracts/core/Module.sol";
import "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./utils/interfaces/IGovernor.sol";

contract Proposer is Module {
    /// The Reality module from the Community Safe
    address public reality;

    /// Errors
    /// The calling address is not the `Reality` module
    error Unauthorized();

    /// @notice Initializes the Module
    /// @param  intializeParams Encoded initializing parameters passed from the GuildFactory
    function setUp(bytes memory initializeParams) public override {
        (address _avatar, address _target, address _reality) = abi.decode(initializeParams, (address, address, address));
        target = _target;
        avatar = _avatar;
        reality = _reality;
        _transferOwnership(avatar);
    }

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
    ) external returns (bool) {
        if (msg.sender != reality) {
            revert Unauthorized();
        }

        bytes4 proposeFunctionSelector = bytes4(keccak256("propose(address[], uint256[], bytes[]"));
        bytes memory arguments = abi.encode(targets, values, data);
        bytes memory proposal = abi.encodeWithSelector(proposeFunctionSelector, arguments);
        return exec(target, 0, proposal, operation);
    }
}
