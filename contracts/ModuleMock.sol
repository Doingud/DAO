// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.15;

import "@gnosis.pm/zodiac/contracts/core/Module.sol";
import "@gnosis.pm/zodiac/contracts/interfaces/IAvatar.sol";
import "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";

contract ModuleMock is Module {
    uint256 public testValues;

    constructor(address avatar, address target) {
        target = target;
        avatar = avatar;
        setUp("0x");
        _transferOwnership(avatar);
    }

    function setUp(bytes memory initializeParams) public override {}

    /// This function recreates the reality module's action once a vote has passed
    function executeAfterSuccessfulVote(Enum.Operation operation) external returns (bool success) {
        success = IAvatar(avatar).execTransactionFromModule(avatar, 0, bytes(""), operation);
        return success;
    }

    function testInteraction(uint256 value) external returns (bool) {
        testValues = value;
        return true;
    }
}
