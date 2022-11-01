// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0;

// We import the contract so truffle compiles it, and we have the ABI
// available when working from truffle console.
// from Imports.sol
// import "@gnosis.pm/mock-contract/contracts/MockContract.sol";

contract MockContract {
	enum MockType { Return, Revert, OutOfGas }
	
	bytes32 public constant MOCKS_LIST_START = hex"01";
	bytes public constant MOCKS_LIST_END = "0xff";
	bytes4 public constant SENTINEL_ANY_MOCKS = hex"01";

	// A linked list allows easy iteration and inclusion checks
	mapping(bytes32 => bytes) calldataMocks;
	mapping(bytes4 => bytes4) methodIdMocks;

	constructor() public {
		calldataMocks[MOCKS_LIST_START] = MOCKS_LIST_END;
		methodIdMocks[SENTINEL_ANY_MOCKS] = SENTINEL_ANY_MOCKS;
	}
}
