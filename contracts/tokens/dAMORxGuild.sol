// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

/**
 * @title  DoinGud: dAMORxGuild.sol
 * @author Daoism Systems
 * @notice ERC20 implementation for DoinGudDAO
 * @custom Security-contact security@daoism.systems
 * @dev Implementation of the dAMORXGuild token for DoinGud
 *
 * The contract houses the token logic for dAMOR and dAMORxGuild.
 *
 * This Token Implementation contract is intended to be referenced by a proxy contract.
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

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
/// Custom contracts
import "../utils/ERC20Base.sol";
import "../interfaces/IdAMORxGuild.sol";

contract dAMORxGuild is IdAMORxGuild, ERC20Base, Ownable {
    using SafeERC20 for IERC20;

    /// List of delegations from one address
    /// Staker => delegated to (many accounts) => amount
    mapping(address => mapping(address => uint256)) public delegations;
    /// Amount of all delegated tokens from staker
    mapping(address => uint256) public amountDelegated;

    mapping(address => Stakes) private _stakes;

    /// Constants
    uint256 public constant COEFFICIENT = 2;
    uint256 public constant TIME_DENOMINATOR = 1 ether; // 10**18
    uint256 public constant MAX_LOCK_TIME = 365 days; // 1 year is the time for the new deposided tokens to be locked until they can be withdrawn
    uint256 public constant MIN_LOCK_TIME = 7 days; // 1 week is the time for the new deposided tokens to be locked until they can be withdrawn

    IERC20 private _amorXGuild;

    /// @inheritdoc IdAMORxGuild
    function init(
        string memory _name,
        string memory _symbol,
        address initOwner,
        address amorXGuild,
        uint256 amount
    ) external {
        // _setTokenDetail is preventing re-initialization
        _setTokenDetail(_name, _symbol);

        _transferOwnership(initOwner);

        _amorXGuild = IERC20(amorXGuild);
        emit Initialized(initOwner, amorXGuild, amount);
    }

    /// @inheritdoc IdAMORxGuild
    function stake(uint256 amount, uint256 time) external returns (uint256) {
        if (time < MIN_LOCK_TIME) {
            revert TimeTooSmall();
        }
        if (time > MAX_LOCK_TIME) {
            revert TimeTooBig();
        }

        if (_amorXGuild.balanceOf(msg.sender) < amount) {
            revert InvalidAmount();
        }

        _amorXGuild.safeTransferFrom(msg.sender, address(this), amount);

        // mints dAMORxGuildAmount to staker
        uint256 dAMORxGuildAmount = _stake(amount, time);

        Stakes storage userStake = _stakes[msg.sender];
        uint256 endTime = block.timestamp + time;
        userStake.stakesTimes = endTime;
        userStake.stakesAMOR += amount;

        emit AMORxGuildStakedToDAMOR(msg.sender, amount, dAMORxGuildAmount, endTime);
        return dAMORxGuildAmount;
    }

    /// @inheritdoc IdAMORxGuild
    function increaseStake(uint256 amount) external returns (uint256) {
        if (_amorXGuild.balanceOf(msg.sender) < amount) {
            revert InvalidAmount();
        }

        _amorXGuild.safeTransferFrom(msg.sender, address(this), amount);

        Stakes storage userStake = _stakes[msg.sender];

        // mint AMORxGuild tokens to staker
        // msg.sender receives funds, based on the amount of time remaining until the end of his stake
        uint256 time = userStake.stakesTimes - block.timestamp;
        uint256 dAMORxGuildAmount = _stake(amount, time);
        userStake.stakesAMOR += amount;

        emit AMORxGuildStakeIncreasedToDAMOR(msg.sender, amount, dAMORxGuildAmount, time);
        return dAMORxGuildAmount;
    }

    /// @inheritdoc IdAMORxGuild
    function withdraw() public returns (uint256 dAMORxGuildBurned, uint256 AMORxGuildUnstaked) {
        Stakes storage userStake = _stakes[msg.sender];

        if (block.timestamp < userStake.stakesTimes) {
            revert TimeTooSmall();
        }

        AMORxGuildUnstaked = userStake.stakesAMOR;
        dAMORxGuildBurned = balanceOf(msg.sender);
        if (dAMORxGuildBurned == 0) {
            revert InvalidAmount();
        }

        if (amountDelegated[msg.sender] > 0) {
            revert TokensDelegated();
        }

        delete _stakes[msg.sender];
        _burn(msg.sender, dAMORxGuildBurned);

        _amorXGuild.safeTransfer(msg.sender, AMORxGuildUnstaked);
        emit AMORxGuildWithdrawnFromDAMOR(msg.sender, dAMORxGuildBurned, AMORxGuildUnstaked);
        return (dAMORxGuildBurned, AMORxGuildUnstaked);
    }

    /// @inheritdoc IdAMORxGuild
    function delegate(address[] calldata to, uint256[] calldata amount) external {
        if (to.length != amount.length) {
            revert ArrayMismatch();
        }

        uint256 totalAmount;
        uint256 availableAmount = balanceOf(msg.sender) - amountDelegated[msg.sender];

        for (uint256 i; i < to.length; i++) {
            if (to[i] == msg.sender) {
                revert InvalidAddress();
            }

            delegations[msg.sender][to[i]] += amount[i];
            amountDelegated[msg.sender] += amount[i];
            totalAmount += amount[i];

            emit dAMORxGuildDelegated(to[i], msg.sender, amount[i]);
        }

        if (availableAmount < totalAmount) {
            revert InvalidAmount();
        }
    }

    /// @inheritdoc IdAMORxGuild
    function undelegateAndWithdraw(address[] calldata delegatees)
        external
        returns (uint256 dAMORxGuildBurned, uint256 AMORxGuildUnstaked)
    {
        undelegate(delegatees);
        return withdraw();
    }

    /// @inheritdoc IdAMORxGuild
    function undelegate(address[] calldata delegatees) public {
        if (amountDelegated[msg.sender] == 0) {
            revert NoDelegation();
        }

        uint256 undelegated;

        for (uint256 i; i < delegatees.length; ++i) {
            uint256 amount = delegations[msg.sender][delegatees[i]];
            undelegated += amount;
            emit dAMORxGuildUndelegated(delegatees[i], msg.sender, amount);
            delete delegations[msg.sender][delegatees[i]];
        }

        amountDelegated[msg.sender] -= undelegated;
    }

    /// @notice This token is non-transferable
    function transfer(address to, uint256 amount) public override returns (bool) {
        return false;
    }

    /// @notice This token is non-transferable
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        return false;
    }

    /// @notice Mint AMORxGuild tokens to staker
    /// @dev Tokens are by following formula: NdAMOR =  k * f(t)^2 * nAMOR
    /// @param amount The amount of AMORxGuild to be staked
    /// @param time The period of time the tokens wll be staked
    /// @return amount of dAMORxGuildAmount tokens minted to staker
    function _stake(uint256 amount, uint256 time) internal returns (uint256) {
        uint256 koef = (time * TIME_DENOMINATOR) / MAX_LOCK_TIME;
        uint256 dAMORxGuildAmount = (COEFFICIENT * (koef * koef) * amount) / (TIME_DENOMINATOR * TIME_DENOMINATOR);
        _mint(msg.sender, dAMORxGuildAmount);
        return dAMORxGuildAmount;
    }
}
