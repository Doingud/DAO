// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

/**
 * @title  DoinGud: DoinGudProxy.sol
 * @author Daoism Systems
 * @notice Data storage contract for the DoingGud contracts.
 * @custom Security-contact arseny@daoism.systems || konstantin@daoism.systems
 * @dev Implementation of a generic proxy contract for DoinGud
 *
 *  The contract houses the logic for proxy deployments through a clone-factory pattern.
 *
 * This Proxy Implementation contract is intended to be referenced by the
 * GuildFactory.sol contract.
 *
 *  The contract extends the ERC1967Proxy contract from OpenZeppelin.
 *  All calls to this contract (except `initProxy` and `getImplementation()`) should
 *  default to the `fallback()` function which calls `delegateCall()`
 *  to the implementation contract.
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

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

contract DoinGudBeacon is UpgradeableBeacon {
    constructor(address logic, address metadao) UpgradeableBeacon(logic) {
        _transferOwnership(metadao);
    }
}
