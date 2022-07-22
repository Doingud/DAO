// SPDX-License-Identifier: MIT

/**
 *  @dev Implementation of the ERC20Base for DoinGud
 *
 *  The contract houses the token logic for ERC20Base.
 *
 */
pragma solidity 0.8.15;

interface IERC20Base {
    /// @dev Atomically increases the allowance granted to `spender` by the caller.
    function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
}
