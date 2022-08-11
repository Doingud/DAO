// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

interface ISnapshotDelegateRegistry {
    function setDelegate(bytes32 id, address delegate) external;

    function clearDelegate(bytes32 id) external;
}