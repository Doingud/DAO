// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.15;
import "hardhat/console.sol";
/**
 * @title  DoinGud: AvatarxGuild.sol
 * @author Daoism Systems
 * @notice Avatar Implementation for DoinGud Guilds
 * @custom:security-contact arseny@daoism.systems || konstantin@daoism.systems
 * @dev Implementation of an Avatar Interface
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
import "./Executor.sol";
import "./utils/interfaces/IAvatarxGuild.sol";
import "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";

contract AvatarxGuild is Executor, IAvatarxGuild {
    event ExecutionFromGovernorSuccess(address governorAddress);
    event ExecutionFromGovernorFailure(address governorAddress);
    event Initialized(bool success, address owner, address governorAddress);

    address public owner;
    address public governor;

    address internal constant SENTINEL_MODULES = address(0x1);
    bool private _initialized;

    mapping(address => address) internal modules;

    /// Custom errors
    /// Error if the AmorxGuild has already been initialized
    error AlreadyInitialized();
    error NotWhitelisted();
    error NotEnabled();
    error NotDisabled();
    error InvalidParameters();
    error Unauthorized();

    modifier onlyGovernor() {
        if (msg.sender != governor) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert Unauthorized();
        }
        _;
    }

    function init(address initOwner, address governorAddress_) external returns (bool) {
        if (_initialized) {
            revert AlreadyInitialized();
        }
        governor = governorAddress_;
        owner = initOwner;
        modules[SENTINEL_MODULES] = address(0x2);
        _initialized = true;
        emit Initialized(_initialized, initOwner, governorAddress_);
        return true;
    }

    function setGovernor(address newGovernor) external onlyOwner {
        if (newGovernor == governor) {
            revert AlreadyInitialized();
        }

        governor = newGovernor;
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

    /// @notice Allows to execute functions from the module(it will send the passed proposals from the snapshot to the Governor)
    /// @dev Allows a Module to execute a Safe transaction without any further confirmations.
    /// @param to Destination address of module transaction.
    /// @param value Ether value of module transaction.
    /// @param data Data payload of module transaction.
    /// @param operation Operation type of module transaction.
    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes calldata data,
        Enum.Operation operation
    ) external returns (bool success) {
        // Only whitelisted modules are allowed.
        if (msg.sender == SENTINEL_MODULES || modules[msg.sender] == address(0)) {
            revert NotWhitelisted();
        }
        emit ExecutionFromModuleSuccess(msg.sender);
        /// Enum resolves to 0 or 1
        /// 0: call; 1: delegatecall
        if (uint8(operation) == 1) (success, ) = to.delegatecall(data);
        else (success, ) = to.call{value: value}(data);

        if (success) {
            emit ExecutionFromModuleSuccess(msg.sender);
        } else {
            emit ExecutionFromModuleFailure(msg.sender);
        }
    }

    /// @dev Allows a Module to execute a Safe transaction without any further confirmations and return data
    /// @param to Destination address of module transaction.
    /// @param value Ether value of module transaction.
    /// @param data Data payload of module transaction.
    /// @param operation Operation type of module transaction.
    function execTransactionFromModuleReturnData(
        address to,
        uint256 value,
        bytes calldata data,
        Enum.Operation operation
    ) public returns (bool success, bytes memory returnData) {
        /// Check that a module sent the transaction
        if (modules[msg.sender] == address(0)) {
            revert NotWhitelisted();
        }
        /// Enum resolves to 0 or 1
        /// 0: call; 1: delegatecall
        if (uint8(operation) == 1) (success, ) = to.delegatecall(data);
        else (success, returnData) = to.call{value: value}(data);

        /// Emit events
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
    /// @param  operation Operation type of module transaction.
    function executeProposal(
        address target,
        uint256 value,
        bytes memory proposal,
        Enum.Operation operation
    ) public onlyGovernor returns (bool) {
        console.log("avatar msg.sender is %s", msg.sender);
        console.log("target is %s", target);
        console.log("uint8(operation) is %s", uint8(operation));
        bool success;
        if (uint8(operation) == 1) (success, ) = target.delegatecall(proposal);
        else (success, ) = target.call{value: value}(proposal);

        if (success) emit ExecutionFromGovernorSuccess(msg.sender);
        else emit ExecutionFromGovernorFailure(msg.sender);
        return success;
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
        return (array, next);
    }
}
