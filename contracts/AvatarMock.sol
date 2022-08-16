// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract AvatarxGuild is AccessControl {
    event EnabledModule(address module);
    event DisabledModule(address module);
    event ExecutionFromModuleSuccess(address indexed module);
    event ExecutionFromModuleFailure(address indexed module);
    event ExecutionFromGuardianSuccess(address guardianAddress);
    event ExecutionFromGuardianFailure(address guardianAddress);
    event Initialized(bool success, address owner, address guardianAddress);
    event GuardianAdded(address guardian);
    event GuardianRemoved(address guardian);

    /// Roles
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN");

    address internal constant SENTINEL_MODULES = address(0x1);
    bool private _initialized;

    uint256 public check = 0;

    mapping(address => bool) public voters;
    mapping(address => address) internal modules;

    function init(address initOwner, address guardianAddress_) external returns (bool) {
        require(!_initialized, "Already initialized");

        _setupRole(DEFAULT_ADMIN_ROLE, initOwner);
        _setupRole(GUARDIAN_ROLE, guardianAddress_);
        _initialized = true;
        emit Initialized(_initialized, initOwner, guardianAddress_);
        return true;
    }

    function executeProposal(
        address[] memory target,
        uint256[] memory value,
        bytes[] memory proposal
    ) public returns (bool) {
        check += 1;
        return true;
    }
}
