// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;
import "hardhat/console.sol";
/**
 * @title  DoinGud: AMORxGuild.sol
 * @author Daoism Systems
 * @notice ERC20 implementation for DoinGudDAO
 * @custom Security-contact arseny@daoism.systems || konstantin@daoism.systems
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

/// Advanced math functions for bonding curve
import "./utils/ABDKMath64x64.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./utils/ERC20Base.sol";
import "./utils/interfaces/IAmorGuildToken.sol";

contract AMORxGuildToken is IAmorxGuild, ERC20Base, Pausable, Ownable {
    using ABDKMath64x64 for uint256;
    using SafeERC20 for IERC20;

    bool private _initialized;

    /// The proxy contract address for AMOR
    IERC20 private tokenAmor;

    /// Tax on staking
    uint16 public stakingTaxRate;
    address public guildController;

    /// Constants
    /// Basis points as used in financial math
    /// It allows fine-grained control over the tax rate
    /// 1 basis point change == 0.01% change in the tax rate
    /// Here it is the denominator for tax-related calculations
    uint256 public BASIS_POINTS = 10000;
    /// Co-efficient
    uint256 private constant COEFFICIENT = 10**9;

    /// Custom errors
    /// Error if the AmorxGuild has already been initialized
    error AlreadyInitialized();
    /// Error if unsufficient token amount for transfer
    error UnsufficientAmount();
    /// New rate above maximum
    error InvalidTaxRate();

    /// @notice Initializes the AMORxGuild contract
    /// @dev    Sets the token details as well as the required addresses for token logic
    /// @param  amorAddress the address of the AMOR token proxy
    /// @param  name the token name (e.g AMORxIMPACT)
    /// @param  symbol the token symbol
    /// @param  controller the GuildController owning this token
    function init(
        string memory name,
        string memory symbol,
        address amorAddress,
        address controller
    ) external override {
        if (_initialized) {
            revert AlreadyInitialized();
        }
        tokenAmor = IERC20(amorAddress);
        _setTokenDetail(name, symbol);
        guildController = controller;
        _initialized = true;
        emit Initialized(name, symbol, amorAddress);
    }

    /// @notice Sets the tax on staking AMORxGuild
    /// @dev    Requires the new tax rate in basis points, where each point equals 0.01% change
    /// @param  newRate uint8 representing the new tax rate expressed in basis points.
    function setTax(uint16 newRate) external onlyOwner {
        if (newRate > 2000) {
            revert InvalidTaxRate();
        }

        stakingTaxRate = newRate;
    }

    /// @notice Allows a user to stake their AMOR and receive AMORxGuild in return
    /// @param  to address where the AMORxGuild will be sent to
    /// @param  amount uint256 amount of AMOR to be staked
    /// @return uint256 the amount of AMORxGuild received from staking
    function stakeAmor(address to, uint256 amount) external override whenNotPaused returns (uint256) {
        if (tokenAmor.balanceOf(msg.sender) < amount) {
            revert UnsufficientAmount();
        }
        //  Must calculate stakedAmor prior to transferFrom()
        uint256 stakedAmor = tokenAmor.balanceOf(address(this));
        //  Must have enough AMOR to stake
        //  Note that this transferFrom() is taxed due to AMOR tax
        tokenAmor.safeTransferFrom(msg.sender, address(this), amount);

        //  Calculate mint amount and mint this to the address `to`
        //  Take AMOR tax into account
        uint256 taxCorrectedAmount = tokenAmor.balanceOf(address(this)) - stakedAmor;
        //  Note there is a tax on staking into AMORxGuild
        uint256 mintAmount = COEFFICIENT * ((taxCorrectedAmount + stakedAmor).sqrtu() - stakedAmor.sqrtu());
        _mint(guildController, (mintAmount * stakingTaxRate) / BASIS_POINTS);
        mintAmount = (mintAmount * (BASIS_POINTS - stakingTaxRate)) / BASIS_POINTS;
        _mint(to, mintAmount);

        return mintAmount;
    }

    /// @notice Allows the user to unstake their AMOR
    /// @param  amount uint256 amount of AMORxGuild to exchange for AMOR
    /// @return uint256 the amount of AMOR returned from burning AMORxGuild
    function withdrawAmor(uint256 amount) external override whenNotPaused returns (uint256) {
        if (amount > balanceOf(msg.sender)) {
            revert UnsufficientAmount();
        }
        uint256 currentSupply = totalSupply();
        uint256 amorReturned = ((currentSupply**2) - ((currentSupply - amount)**2)) / (COEFFICIENT**2);

        //  Burn the AMORxGuild of the tx.origin
        _burn(msg.sender, amount);

        //  Correct for the tax on transfer
        //  Transfer AMOR to the tx.origin, but note: this is taxed!
        tokenAmor.safeTransfer(msg.sender, amorReturned);
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
