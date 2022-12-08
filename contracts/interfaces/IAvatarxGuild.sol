// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

/**
 * @title  DoinGud: IAvatarxGuild.sol
 * @author Daoism Systems
 * @notice Avatar interface for DoinGudDAO
 * @custom Security-contact security@daoism.systems
 *
 *  The IAvatarxGuild follows the IAvatar.sol structure popularized by Zodiac, but is initializable.
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

import "@gnosis.pm/zodiac/contracts/interfaces/IAvatar.sol";

interface IAvatarxGuild is IAvatar {
    /// Events
    event ExecutionFromGovernorSuccess(address governorAddress);
    event ExecutionFromGovernorFailure(address governorAddress);
    event Initialized(address owner, address governorAddress);
    event GovernorSet(address newGovernor);

    /// Custom errors
    /// AvatarxGuild has already been initialized
    error AlreadyInitialized();
    /// The calling address is not a recoignized `Module`
    error NotWhitelisted();
    /// Invalid address provided for module
    error InvalidParameters();
    /// The calling address is not authorized to call this function
    error Unauthorized();

    /// @notice Initializes the AvatarxGuild module
    /// @param  initOwner The address that owns this AvatarxGuild
    /// @param  governorAddress_ The guild's governor
    function init(address initOwner, address governorAddress_) external;

    /// @notice Changes Governor address
    /// @param newGovernor Address of the new Governor
    function setGovernor(address newGovernor) external;

    /// @notice This function executes the proposal voted on by the GOVERNOR
    /// @dev    Not to be confused with SNAPSHOT
    /// @param  target Destination address of module transaction.
    /// @param  value Ether value of module transaction.
    /// @param  proposal Data payload of module transaction.
    function executeProposal(
        address target,
        uint256 value,
        bytes memory proposal
    ) external returns (bool success);

    /// @notice Allows for on-chain execution of off-chain vote
    /// @dev    Links to a `Reality`/`SnapSafe` module
    /// @param  targets An array of proposed targets for proposed transactions
    /// @param  values An array of values corresponding to proposed transactions
    /// @param  data An array of encoded function calls with parameters corresponding to proposals
    function proposeAfterVote(
        address[] memory targets,
        uint256[] memory values,
        bytes[] calldata data
    ) external;
}
