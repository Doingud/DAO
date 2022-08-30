// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;
import "./utils/Enum.sol";
import "./Executor.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract AvatarxGuild is Executor, AccessControl {
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

    mapping(address => bool) public voters;
    mapping(address => address) internal modules;

    /// Custom errors
    /// Error if the AmorxGuild has already been initialized
    error AlreadyInitialized();
    error NotWhitelisted();
    error NotEnabled();
    error NotDisabled();
    error InvalidParameters();

    function init(address initOwner, address guardianAddress_) external returns (bool) {
        if (_initialized) {
            revert AlreadyInitialized();
        }
        _setupRole(DEFAULT_ADMIN_ROLE, initOwner);
        _setupRole(GUARDIAN_ROLE, guardianAddress_);
        _initialized = true;
        emit Initialized(_initialized, initOwner, guardianAddress_);
        return true;
    }

    /// @dev Allows to add a module to the whitelist.
    ///      This can only be done via a Safe transaction.
    /// @notice Enables the module `module` for the Safe.
    /// @param module Module to be whitelisted.
    function enableModule(address module) public {
        // Module address cannot be null or sentinel.
        if (module == address(0) || module == SENTINEL_MODULES) {
            revert NotEnabled();
        }
        // Module cannot be added twice.
        if (modules[module] != address(0)) {
            revert InvalidParameters();
        }
        modules[module] = modules[SENTINEL_MODULES];
        modules[SENTINEL_MODULES] = module;
        emit EnabledModule(module);
    }

    /// @dev Allows to remove a module from the whitelist.
    ///      This can only be done via a Safe transaction.
    /// @notice Disables the module `module` for the Safe.
    /// @param prevModule Module that pointed to the module to be removed in the linked list
    /// @param module Module to be removed.
    function disableModule(address prevModule, address module) public {
        // Validate module address and check that it corresponds to module index.
        if (module == address(0) || module == SENTINEL_MODULES) {
            revert NotDisabled();
        }
        if (modules[prevModule] != module) {
            revert InvalidParameters();
        }
        modules[prevModule] = modules[module];
        modules[module] = address(0);
        emit DisabledModule(module);
    }

    /// @dev Allows a Module to execute a Safe transaction without any further confirmations.
    /// @param to Destination address of module transaction.
    /// @param value Ether value of module transaction.
    /// @param data Data payload of module transaction.
    /// @param operation Operation type of module transaction.
    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation
    ) public virtual returns (bool success) {
        // Only whitelisted modules are allowed.
        if (msg.sender == SENTINEL_MODULES || modules[msg.sender] == address(0)) {
            revert NotWhitelisted();
        }
        // Execute transaction without further confirmations.
        success = execute(to, value, data, operation, gasleft());
        if (success) emit ExecutionFromModuleSuccess(msg.sender);
        else emit ExecutionFromModuleFailure(msg.sender);
    }

    /// @dev Allows a Module to execute a Safe transaction without any further confirmations and return data
    /// @param to Destination address of module transaction.
    /// @param value Ether value of module transaction.
    /// @param data Data payload of module transaction.
    /// @param operation Operation type of module transaction.
    function execTransactionFromModuleReturnData(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation
    ) public returns (bool success, bytes memory returnData) {
        success = execTransactionFromModule(to, value, data, operation);
        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Load free memory location
            let ptr := mload(0x40)
            // We allocate memory for the return data by setting the free memory location to
            // current free memory location + data size + 32 bytes for data size value
            mstore(0x40, add(ptr, add(returndatasize(), 0x20)))
            // Store the size
            mstore(ptr, returndatasize())
            // Store the data
            returndatacopy(add(ptr, 0x20), 0, returndatasize())
            // Point the return data to the correct memory location
            returnData := ptr
        }
    }

    function executeProposal(
        address target,
        uint256 value,
        bytes memory proposal,
        Enum.Operation operation
    ) public onlyRole(GUARDIAN_ROLE) {
        bool success = execute(target, value, proposal, operation, gasleft());
        if (success) emit ExecutionFromGuardianSuccess(msg.sender);
        else emit ExecutionFromGuardianFailure(msg.sender);
    }

    /// @dev Returns if an module is enabled
    /// @return True if the module is enabled
    function isModuleEnabled(address module) public view returns (bool) {
        return SENTINEL_MODULES != module && modules[module] != address(0);
    }

    /// @dev Returns array of modules.
    /// @param start Start of the page.
    /// @param pageSize Maximum number of modules that should be returned.
    /// @return array Array of modules.
    /// @return next Start of the next page.
    function getModulesPaginated(address start, uint256 pageSize)
        external
        view
        returns (address[] memory array, address next)
    {
        // Init array with max page size
        array = new address[](pageSize);

        // Populate return array
        uint256 moduleCount = 0;
        address currentModule = modules[start];
        while (currentModule != address(0x0) && currentModule != SENTINEL_MODULES && moduleCount < pageSize) {
            array[moduleCount] = currentModule;
            currentModule = modules[currentModule];
            moduleCount++;
        }
        next = currentModule;
        // Set correct size of returned array
        // solhint-disable-next-line no-inline-assembly
        assembly {
            mstore(array, moduleCount)
        }
    }

    /// @notice adds guild based on the controller address provided
    /// @dev give guardian role in access control to the guardian address
    /// @param guardian the controller address of the guild
    function addGuardian(address guardian) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setupRole(GUARDIAN_ROLE, guardian);
        emit GuardianAdded(guardian);
    }

    /// @notice adds guild based on the controller address provided
    /// @dev give guardian role in access control to the guardian address
    /// @param guardian the controller address of the guild
    function removeGuardian(address guardian) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(GUARDIAN_ROLE, guardian);
        emit GuardianRemoved(guardian);
    }
}
