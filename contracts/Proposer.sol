// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.15;

import "@gnosis.pm/zodiac/contracts/core/Module.sol";
import "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./utils/interfaces/IGovernor.sol";
import "hardhat/console.sol";

contract Proposer is Module {
    /// The Reality module from the Community Safe
    address public reality;
    /// Proposer has already `setGuardians`
    bool public guardiansSet;

    /// Errors
    /// The calling address is not the `Reality` module
    error Unauthorized();
    /// The Proposer has already set the Guardians once
    /// Subsequent calls to `setGuardians` must be made through proposals
    error AlreadySet();

    /// @notice Initializes the Module
    /// @param  initializeParams Encoded initializing parameters passed from the GuildFactory
    function setUp(bytes memory initializeParams) public override {
        (address _avatar, address _target, address _reality) = abi.decode(
            initializeParams,
            (address, address, address)
        );
        target = _target;
        avatar = _avatar;
        reality = _reality;
        _transferOwnership(avatar);
    }

    /// @notice Allows for on-chain execution of off-chain vote
    /// @dev    Links to a `Reality`/`SnapSafe` module
    /*
    /// @param  targets An array of proposed targets for proposed transactions
    /// @param  values An array of values corresponding to proposed transactions
    /// @param  data An array of encoded function calls with parameters corresponding to proposals
    /// @param  operation A specifying enum corresponding to the type of low-level call to use (`delegateCall` or `Call`)
    /// @return bool Was the proposal successfully proposed to the GovernorxGuild
    */
    function proposeAfterVote(
        address[] memory targets,
        uint256[] memory values,
        bytes[] calldata data,
        Enum.Operation operation
    ) external onlyReality returns (bool) {
        bytes memory proposal = abi.encodeWithSelector(IDoinGudGovernor.propose.selector, targets, values, data);
        return exec(target, 0, proposal, operation);
    }

    /// @notice Allows the Avatar to add Guardians before required `GuardianLimitReached`
    /// @dev    `Governor` requires minimum amount of Guardians before proposals can be made
    /// @dev    Can only be called once, before any other proposals can be called
    /// @param  guardians Array of addresses chosen to be the first guardians
    /// @return bool successful execution of `setGuardians`
    function setGuardiansAfterVote(address[] memory guardians) external onlyReality returns (bool) {
        if (guardiansSet) {
            revert AlreadySet();
        }
        bytes4 addGuardianFunctionSelector = bytes4(keccak256(bytes("setGuardians(address[])")));
        bytes memory data = abi.encode(guardians);
        data = abi.encodeWithSelector(IDoinGudGovernor.setGuardians.selector, guardians);
        guardiansSet = exec(target, 0, data, Enum.Operation.Call);
        return guardiansSet;
    }

    modifier onlyReality() {
        if (msg.sender != reality) {
            revert Unauthorized();
        }
        _;
    }
}
