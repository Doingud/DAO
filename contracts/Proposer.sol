// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.15;

import "@gnosis.pm/zodiac/contracts/core/Module.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./utils/interfaces/IGovernor.sol";

contract Proposer is Module, Ownable {
    /// The Reality module from the Community Safe
    address public reality;

    function setUp(bytes memory initializeParams) public override {
        (address _avatar, address _target, address _reality) = abi.decode(initializeParams, (address, address, address));
        target = _target;
        avatar = _avatar;
        reality = _reality;
        _transferOwnership(avatar);
    }

    function proposeAfterVote(
        address[] memory targets,
        uint256[] memory values,
        bytes[] calldata data,
        Enum.Operation operation
    ) external returns (bool) {
        bytes proposeFunctionSelector = bytes4(keccak256("propose(address[], uint256[], bytes[]"));
        bytes arguments = abi.encode(targets, values, data);
        bytes proposal = abi.encodeWithSelector(proposeFunctionSelector, arguments);
        return exec(target, 0, proposal, operation);
    }
}
