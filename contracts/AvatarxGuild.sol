// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

/**
 * @title  DoinGud: AvatarxGuild.sol
 * @author Daoism Systems
 * @notice Avatar Implementation for DoinGud Guilds
 * @custom:security-contact security@daoism.systems
 * @dev Implementation of an Avatar Interface for DoinGud
 *
 * AvatarxGuild contract is needed to manage the funds of the guild,
 * receive and execute the proposals, attach modules and interact with
 * external voting contracts
 *
 * MIT License
 * ===========
 *
 * Copyright (c) 2022 DoinGud
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *
 */

/// Custom contracts
import "./interfaces/IAvatarxGuild.sol";
import "./interfaces/IGovernor.sol";

contract AvatarxGuild is IAvatarxGuild {
    /// Events
    event ExecutionFromGovernorSuccess(address governorAddress);
    event ExecutionFromGovernorFailure(address governorAddress);
    event Initialized(address owner, address governorAddress);
    event GovernorSet(address newGovernor);

    address internal constant SENTINEL_MODULES = address(0x1);
    address public governor;
    address public reality;
    bool private _initialized;

    mapping(address => address) internal modules;

    /// Custom errors
    /// AvatarxGuild has already been initialized
    error AlreadyInitialized();
    /// The calling address is not a recoignized `Module`
    error NotWhitelisted();
    /// Invalid address provided for module
    error InvalidParameters();
    /// The calling address is not authorized to call this function
    error Unauthorized();

    /// Access Control Modifiers
    /// Access control: Governor
    modifier onlyGovernor() {
        if (msg.sender != governor) {
            revert Unauthorized();
        }
        _;
    }

    /// Access control: Avatar contract
    modifier onlySelf() {
        if (msg.sender != address(this)) {
            revert Unauthorized();
        }
        _;
    }

    // Access control: Only whitelisted module
    modifier onlyModule() {
        // Only whitelisted modules are allowed.
        if (modules[msg.sender] == address(0)) {
            revert NotWhitelisted();
        }
        _;
    }

    /// Access control: Linked Reality module
    modifier onlyReality() {
        if (msg.sender != reality) {
            revert Unauthorized();
        }
        _;
    }

    /// @notice Initializes the Avatar contract
    /// @param  realityAddress Address of the oracle which can propose transactions after Snaphsot
    /// @param  governorAddress Address of the GovernorxGuild
    function init(address realityAddress, address governorAddress) external {
        if (_initialized) {
            revert AlreadyInitialized();
        }
        governor = governorAddress;
        reality = realityAddress;
        _initialized = true;
        modules[SENTINEL_MODULES] = address(0x02);
        emit Initialized(reality, governorAddress);
    }

    /// @notice Changes Governor address
    /// @param newGovernor Address of the new Governor
    function setGovernor(address newGovernor) public onlySelf {
        if (newGovernor == governor) {
            revert AlreadyInitialized();
        }
        governor = newGovernor;
        emit GovernorSet(newGovernor);
    }

    /// @dev Allows to add a module to the whitelist.
    /// @notice Enables the module `module` for the Avatar.
    /// @param module Module to be whitelisted.
    function enableModule(address module) public onlySelf {
        // Module address cannot be null or sentinel.
        if (module == address(0) || module == SENTINEL_MODULES) {
            revert InvalidParameters();
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
    /// @notice Disables the module `module` for the Avatar.
    /// @param prevModule Module that pointed to the module to be removed in the linked list
    /// @param module Module to be removed.
    function disableModule(address prevModule, address module) public onlySelf {
        // Validate module address and check that it corresponds to module index.
        if (module == address(0) || module == SENTINEL_MODULES) {
            revert InvalidParameters();
        }

        if (modules[prevModule] != module) {
            revert InvalidParameters();
        }

        modules[prevModule] = modules[module];
        modules[module] = address(0);
        emit DisabledModule(module);
    }

    /// @notice Allows to execute functions from the module(it will send the passed proposals from the snapshot to the Governor)
    /// @dev Allows a Module to execute a Safe transaction without any further confirmations.
    /// @param to Destination address of module transaction.
    /// @param value Ether value of module transaction.
    /// @param data Data payload of module transaction.
    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes calldata data,
        Enum.Operation
    ) external onlyModule returns (bool success) {
        /// Process all calls to this function as a `call` operation
        /// Note: this is done to minimize security risk
        (success, ) = to.call{value: value}(data);

        if (success) {
            emit ExecutionFromModuleSuccess(msg.sender);
        } else {
            emit ExecutionFromModuleFailure(msg.sender);
        }
    }

    /// @dev Allows a Module to execute a Safe transaction without any further confirmations and return data
    /// This function is the same as `execTransactionFromModule`
    /// Leaving it for compatibility with Avatar/Zodiac modules
    /// @param to Destination address of module transaction.
    /// @param value Ether value of module transaction.
    /// @param data Data payload of module transaction.
    function execTransactionFromModuleReturnData(
        address to,
        uint256 value,
        bytes calldata data,
        Enum.Operation
    ) external onlyModule returns (bool success, bytes memory returnData) {
        /// Process all calls to this function as a `call` operation
        /// Note: this is done to minimize security risk
        (success, returnData) = to.call{value: value}(data);

        if (success) {
            emit ExecutionFromModuleSuccess(msg.sender);
        } else {
            emit ExecutionFromModuleFailure(msg.sender);
        }
    }

    /// @notice This function executes the proposal voted on by the GOVERNOR
    /// @dev    Not to be confused with SNAPSHOT
    /// @param  target Destination address of module transaction.
    /// @param  value Ether value of module transaction.
    /// @param  proposal Data payload of module transaction.
    function executeProposal(
        address target,
        uint256 value,
        bytes calldata proposal
    ) public onlyGovernor returns (bool success) {
        (success, ) = target.call{value: value}(proposal);

        if (success) {
            emit ExecutionFromGovernorSuccess(msg.sender);
        } else {
            emit ExecutionFromGovernorFailure(msg.sender);
        }

        return success;
    }

    /// @dev Returns if an module is enabled
    /// @param module Address of module to check
    /// @return True if the module is enabled
    function isModuleEnabled(address module) public view returns (bool) {
        return SENTINEL_MODULES != module && modules[module] != address(0);
    }

    /// @dev Returns array of modules.
    /// @param start Start of the page.
    /// @param pageSize Maximum number of modules that should be returned.
    /// @return array Array of modules.
    /// @return next Start of the next page.
    function getModulesPaginated(
        address start,
        uint256 pageSize
    ) external view returns (address[] memory array, address next) {
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
        return (array, next);
    }

    /// @notice Allows for on-chain execution of off-chain vote
    /// @dev    Links to a `Reality`/`SnapSafe` module
    /// @param  targets An array of proposed targets for proposed transactions
    /// @param  values An array of values corresponding to proposed transactions
    /// @param  data An array of encoded function calls with parameters corresponding to proposals
    function proposeAfterVote(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata data
    ) external onlyReality {
        IDoinGudGovernor(governor).propose(targets, values, data);
    }
}
