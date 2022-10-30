// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

/**
 * @title  DoinGud: FXAMORxGuild.sol
 * @author Daoism Systems
 * @notice ERC20 implementation for DoinGudDAO
 * @custom Security-contact arseny@daoism.systems || konstantin@daoism.systems
 * @dev Implementation of the FXAMORXGuild token for DoinGud
 *
 *  The contract houses the token logic for FXAMORxGuild.
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

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
/// Advanced math functions for bonding curve
import "../utils/ABDKMath64x64.sol";
/// Custom contracts
import "../utils/ERC20Base.sol";
import "../interfaces/IFXAMORxGuild.sol";

contract FXAMORxGuild is IFXAMORxGuild, ERC20Base, Ownable {
    using ABDKMath64x64 for uint256;
    using SafeERC20 for IERC20;

    // staker => all staker balance
    mapping(address => uint256) public stakes;
    // those who delegated to a specific address
    mapping(address => address[]) public delegators;
    // list of delegations from one address
    mapping(address => mapping(address => uint256)) public delegations;
    // amount of all delegated tokens from staker
    mapping(address => uint256) public amountDelegated;

    bool private _initialized;

    address public _owner; //GuildController
    address public controller; //contract that has a voting function

    IERC20 public AMORxGuild;

    error AlreadyInitialized();
    error Unauthorized();
    error EmptyArray();
    error NotDelegatedAny();

    /// Invalid address. Needed address != address(0)
    error AddressZero();

    /// Invalid address to transfer. Needed `to` != msg.sender
    error InvalidSender();

    /*  @dev    The init() function takes the place of the constructor.
     *          It can only be run once.
     */
    function init(
        string memory name_,
        string memory symbol_,
        address initOwner_,
        address AMORxGuild_
    ) external override {
        if (_initialized) {
            revert AlreadyInitialized();
        }

        _transferOwnership(initOwner_);

        _owner = initOwner_;
        controller = initOwner_;
        AMORxGuild = IERC20(AMORxGuild_);
        //  Set the name and symbol
        name = name_;
        symbol = symbol_;

        _initialized = true;
        emit Initialized(_initialized, initOwner_, AMORxGuild_);
    }

    function setController(address _controller) external onlyAddress(_owner) {
        if (_controller == address(0)) {
            revert AddressZero();
        }
        controller = _controller;
    }

    modifier onlyAddress(address authorizedAddress) {
        if (msg.sender != authorizedAddress) {
            revert Unauthorized();
        }
        _;
    }

    //  receives ERC20 AMORxGuild tokens, which are getting locked
    //  and generate FXAMORxGuild tokens in return.
    //  Tokens are minted 1:1.

    /// @notice Stake AMORxGuild and receive FXAMORxGuild in return
    /// @dev    Front end must still call approve() on AMORxGuild token to allow safeTransferFrom()
    /// @param  to Address where FXAMORxGuild must be minted to
    /// @param  amount uint256 amount of AMORxGuild to be staked
    /// @return uint256 the amount of AMORxGuild received from staking
    function stake(address to, uint256 amount) external onlyAddress(controller) returns (uint256) {
        if (to == msg.sender) {
            revert InvalidSender();
        }
        if (to == address(0)) {
            revert AddressZero();
        }

        if (AMORxGuild.balanceOf(msg.sender) < amount) {
            revert InvalidAmount();
        }
        // send to FXAMORxGuild contract to stake
        AMORxGuild.safeTransferFrom(msg.sender, address(this), amount);

        // mint FXAMORxGuild tokens to staker
        // Tokens are minted 1:1.
        _mint(to, amount);

        stakes[to] += amount;

        return amount;
    }

    /// @notice Burns FXAMORxGuild tokens if they are being used for voting
    /// @dev When this tokens are burned, staked AMORxGuild is being transfered
    //       to the controller(contract that has a voting function)
    /// @param  account address from which must burn tokens
    /// @param  amount uint256 representing amount of burning tokens
    function burn(address account, uint256 amount) external onlyAddress(_owner) {
        if (stakes[account] < amount) {
            revert InvalidAmount();
        }
        //burn used FXAMORxGuild tokens from staker
        _burn(account, amount);
        AMORxGuild.safeTransfer(controller, amount);
        stakes[account] -= amount;
    }

    /// @notice Allows some external account to vote with your FXAMORxGuild tokens
    /// @param  to address to which delegate users FXAMORxGuild
    /// @param  amount uint256 representing amount of delegating tokens
    function delegate(address to, uint256 amount) external {
        if (to == msg.sender) {
            revert InvalidSender();
        }
        if (to == address(0)) {
            revert AddressZero();
        }

        uint256 availableAmount = stakes[msg.sender] - amountDelegated[msg.sender];
        if (availableAmount < amount) {
            revert InvalidAmount();
        }

        delegators[to].push(msg.sender);
        delegations[msg.sender][to] += amount;
        amountDelegated[msg.sender] += amount;
    }

    /// @notice Unallows some external account to vote with your delegated FXAMORxGuild tokens
    /// @param  account address from which delegating will be taken away
    /// @param  amount uint256 representing amount of undelegating tokens
    function undelegate(address account, uint256 amount) public {
        if (account == msg.sender) {
            revert InvalidSender();
        }

        //Nothing to undelegate
        if (delegations[msg.sender][account] == 0) {
            revert NotDelegatedAny();
        }

        if (delegations[msg.sender][account] >= amount) {
            delegations[msg.sender][account] -= amount;
            amountDelegated[msg.sender] -= amount;
        } else {
            delegations[msg.sender][account] = 0;
            amountDelegated[msg.sender] = 0;
        }
    }
}
