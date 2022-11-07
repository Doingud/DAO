// SPDX-License-Identifier: MIT
// Derived from OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/ERC20.sol)

pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title  Interface for AmorToken.sol
/// @author Daoism Systems Team

interface IAmorToken is IERC20 {

    /**
     * @dev Returns the tax rate of the AMOR token.
     */
    function taxRate() external view returns (uint256);

    /**
     * @dev Returns the basis points constant.
     */
    function BASIS_POINTS() external view returns (uint256);

    /// @notice Sets the tax rate for transfer and transferFrom
    function setTaxRate(uint256 newRate) external;

    /// View the current tax collector address
    function updateController(address newTaxCollector) external;
}
