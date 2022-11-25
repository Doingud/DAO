// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

/**
 * @title  DoinGud: AMORxGuild.sol
 * @author Daoism Systems
 * @notice ERC20 implementation for DoinGudDAO
 * @custom Security-contact security@daoism.systems
 * @dev Implementation of the AMORXGuild token for DoinGud
 *
 *  The contract houses the token logic for AMORxGuild.
 *
 *  It varies from traditional ERC20 implementations by:
 *  1) Allowing the token name to be set with an `init()` function
 *  2) Allowing the token symbol to be set with an `init()` function
 *  3) Enables upgrades through updating the proxy
 *
 * This Token Implementation contract is referenced by the proxy contract.
 *
 * The contract is an extension of ERC20Base, which is an initializable
 * ERC20 Token Standard contract, itself derived from the IERC20.sol implementation
 * from OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/ERC20.sol).
 * Please see ERC20Base.sol for licensing and copyright info.
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

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// Advanced math functions for bonding curve
import "../utils/ABDKMath64x64.sol";
/// Custom contracts
import "../utils/ERC20Base.sol";
import "../interfaces/IAMORxGuild.sol";

contract AMORxGuildToken is IAmorxGuild, ERC20Base, Pausable, Ownable {
    using ABDKMath64x64 for uint256;
    using SafeERC20 for IERC20;

    bool private _initialized;

    /// The proxy contract address for AMOR
    IERC20 private tokenAmor;

    /// Tracking the amount of AMOR staked in this contract
    uint256 public stakedAmor;

    /// Tax on staking
    uint16 public stakingTaxRate;
    address public guildController;

    /// Constants
    /// Basis points as used in financial math
    /// It allows fine-grained control over the tax rate
    /// 1 basis point change == 0.01% change in the tax rate
    /// Here it is the denominator for tax-related calculations
    uint256 public constant BASIS_POINTS = 10_000;
    /// Co-efficient
    uint256 private constant COEFFICIENT = 10**9;

    /// Events
    event AmorxGuildTaxChanged(uint256 newRate);
    event AmorStaked(address to, uint256 amount, uint256 mintAmount, uint256 timeOfStake);
    event AmorWithdrawed(address to, uint256 amorxguildAmount, uint256 amorReturned, uint256 timeOfWithdraw);

    /// Errors
    /// Error if the AmorxGuild has already been initialized
    error AlreadyInitialized();
    /// Error if unsufficient token amount for transfer
    error UnsufficientAmount();
    /// New rate above maximum
    error InvalidTaxRate();

    /// @notice Initializes the AMORxGuild contract
    /// @dev Sets the token details as well as the required addresses for token logic
    /// @param amorAddress The address of the AMOR token proxy
    /// @param _name The token name (e.g AMORxIMPACT)
    /// @param _symbol The token symbol
    /// @param controller The GuildController owning this token
    function init(
        string memory _name,
        string memory _symbol,
        address amorAddress,
        address controller
    ) external override {
        if (_initialized) {
            revert AlreadyInitialized();
        }
        tokenAmor = IERC20(amorAddress);
        _setTokenDetail(_name, _symbol);
        guildController = controller;
        _initialized = true;
        /// Proxy storage requires BASIS_POINTS and COEFFICIENT to be initialized in the init function
        emit Initialized(_name, _symbol, amorAddress);
    }

    /// @notice Sets the tax on staking AMORxGuild
    /// @dev Requires the new tax rate in basis points, where each point equals 0.01% change
    /// @param  newRate The new tax rate expressed in basis points.
    function setTax(uint16 newRate) external onlyOwner {
        if (newRate > 2000) {
            revert InvalidTaxRate();
        }

        stakingTaxRate = newRate;
        emit AmorxGuildTaxChanged(newRate);
    }

    /// @notice Allows a user to stake their AMOR and receive AMORxGuild in return
    /// @param to The address where the AMORxGuild will be sent to
    /// @param amount The amount of AMOR to be staked
    /// @return mintAmount The amount of AMORxGuild received from staking
    function stakeAmor(address to, uint256 amount) external override whenNotPaused returns (uint256) {
        if (tokenAmor.balanceOf(msg.sender) < amount) {
            revert UnsufficientAmount();
        }
        //  Must have enough AMOR to stake
        //  Note that this transferFrom() is taxed due to AMOR tax
        tokenAmor.safeTransferFrom(msg.sender, address(this), amount);

        //  Calculate mint amount and mint this to the address `to`
        //  Take AMOR tax into account
        uint256 taxCorrectedAmount = tokenAmor.balanceOf(address(this)) - stakedAmor;
        //  Note there is a tax on staking into AMORxGuild
        uint256 mintAmount = COEFFICIENT * ((taxCorrectedAmount + stakedAmor).sqrtu() - stakedAmor.sqrtu());
        stakedAmor += taxCorrectedAmount;
        _mint(guildController, (mintAmount * stakingTaxRate) / BASIS_POINTS);
        mintAmount = (mintAmount * (BASIS_POINTS - stakingTaxRate)) / BASIS_POINTS;
        _mint(to, mintAmount);

        emit AmorStaked(to, amount, mintAmount, block.timestamp);
        return mintAmount;
    }

    /// @notice Allows the user to unstake their AMOR
    /// @param  amount uint256 amount of AMORxGuild to exchange for AMOR
    /// @return amorReturned uint256 amount of AMOR returned from burning AMORxGuild
    function withdrawAmor(uint256 amount) external override whenNotPaused returns (uint256) {
        if (amount > balanceOf(msg.sender)) {
            revert UnsufficientAmount();
        }
        uint256 currentSupply = totalSupply();
        uint256 amorReturned = ((currentSupply**2) - ((currentSupply - amount)**2)) / (COEFFICIENT**2);

        //  Burn the AMORxGuild of the tx.origin
        _burn(msg.sender, amount);

        currentSupply = tokenAmor.balanceOf(address(this));
        //  Correct for the tax on transfer
        //  Transfer AMOR to the tx.origin, but note: this is taxed!
        tokenAmor.safeTransfer(msg.sender, amorReturned);
        stakedAmor = stakedAmor - amorReturned;
        emit AmorWithdrawed(msg.sender, amount, amorReturned, block.timestamp);
        //  Return the amount of AMOR returned to the user
        return amorReturned;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
