// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

/**
 * @title  DoinGud: dAMORxGuild.sol
 * @author Daoism Systems
 * @notice ERC20 implementation for DoinGudDAO
 * @custom Security-contact arseny@daoism.systems || konstantin@daoism.systems
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
import "../utils/ERC20Base.sol";

contract dAMORxGuild is ERC20Base, Ownable {
    using SafeERC20 for IERC20;

    struct Stakes {
        uint256 stakesTimes; // time staked for
        uint256 stakesAMOR; //all staker balance in AMORxGuild
    }

    mapping(address => Stakes) public _stakes;

    /// List of delegations from one address
    /// Staker => delegated to (many accounts) => amount
    mapping(address => mapping(address => uint256)) public delegations;
    /// An array of addresses that have been delegated to by a specified address
    mapping(address => address[]) public delegatedTo;
    /// Amount of all delegated tokens from staker
    mapping(address => uint256) public amountDelegated;
    /// Amount of tokens delegated to this address
    mapping(address => uint256) public votingPower;

    event Initialized(address owner, address AMORxGuild, uint256 amount);
    event AMORxGuildStakedToDAMOR(
        address from,
        uint256 indexed amount,
        uint256 indexed mintAmount,
        uint256 indexed timeStakedFor
    );
    event AMORxGuildStakeIncreasedToDAMOR(
        address from,
        uint256 indexed amount,
        uint256 indexed mintAmount,
        uint256 indexed timeStakedFor
    );
    event AMORxGuildWithdrawnFromDAMOR(
        address to,
        uint256 indexed burnedDAMORxGuild,
        uint256 indexed returnedAMORxGuild
    );
    event dAMORxGuildUndelegated(address indexed from, address owner, uint256 indexed amount);
    event dAMORxGuildDelegated(address indexed to, address owner, uint256 indexed amount);

    bool private _initialized;

    /// Constants
    uint256 public constant COEFFICIENT = 2;
    uint256 public constant TIME_DENOMINATOR = 1_000_000_000_000_000_000; // 1 ether
    uint256 public constant MAX_LOCK_TIME = 365 days; // 1 year is the time for the new deposided tokens to be locked until they can be withdrawn
    uint256 public constant MIN_LOCK_TIME = 7 days; // 1 week is the time for the new deposided tokens to be locked until they can be withdrawn

    IERC20 private AMORxGuild;

    /// Errors
    /// The contract has already been initialized
    error AlreadyInitialized();
    /// Caller does not have access
    error Unauthorized();
    /// No tokens to undelegate
    error NotDelegatedAny();
    /// Invalid address. Needed address != address(0)
    error AddressZero();
    /// Invalid address to transfer. Needed `to` != msg.sender
    error InvalidSender();
    /// Staking time provided is less than minimum
    error TimeTooSmall();
    /// Staking time provided is larger than maximum
    error TimeTooBig();
    /// Exceeded delegation limits
    error ExceededDelegationLimit();

    /*  @dev    The init() function takes the place of the constructor.
     *          It can only be run once.
     */
    function init(
        string memory _name,
        string memory _symbol,
        address initOwner,
        address _AMORxGuild,
        uint256 amount
    ) external returns (bool) {
        if (_initialized) {
            revert AlreadyInitialized();
        }

        _transferOwnership(initOwner);

        AMORxGuild = IERC20(_AMORxGuild);
        _setTokenDetail(_name, _symbol);
        _initialized = true;

        emit Initialized(initOwner, _AMORxGuild, amount);
        return true;
    }

    /// @notice Mint AMORxGuild tokens to staker
    /// @dev Tokens are by following formula: NdAMOR =  k * f(t)^2 * nAMOR
    /// @param amount The amount of AMORxGuild to be staked
    /// @param time The period of time the tokens wll be staked
    function _stake(uint256 amount, uint256 time) internal returns (uint256) {
        uint256 koef = (time * TIME_DENOMINATOR) / MAX_LOCK_TIME;
        uint256 newAmount = (COEFFICIENT * (koef * koef) * amount) / (TIME_DENOMINATOR * TIME_DENOMINATOR);
        _mint(msg.sender, newAmount);
        return newAmount;
    }

    /// @notice Stakes AMORxGuild and receive dAMORxGuild in return
    /// Receives ERC20 AMORxGuild tokens, which are getting locked
    /// and generate dAMORxGuild tokens in return.
    /// Note: Tokens are minted following the formula
    /// @dev Front end must still call approve() on AMORxGuild token to allow transferFrom()
    /// @param  amount The amount of AMORxGuild/AMOR to be staked
    /// @param  time The period of time (in seconds) to stake for
    /// @return uint256 The amount of dAMORxGuild received from staking
    function stake(uint256 amount, uint256 time) external returns (uint256) {
        if (time < MIN_LOCK_TIME) {
            revert TimeTooSmall();
        }

        if (time > MAX_LOCK_TIME) {
            revert TimeTooBig();
        }

        if (AMORxGuild.balanceOf(msg.sender) < amount) {
            revert InvalidAmount();
        }

        /// Send to AMORxGuild contract to stake
        AMORxGuild.safeTransferFrom(msg.sender, address(this), amount);

        uint256 newAmount = _stake(amount, time);

        Stakes storage userStake = _stakes[msg.sender];
        userStake.stakesTimes = block.timestamp + time;
        userStake.stakesAMOR += amount;

        emit AMORxGuildStakedToDAMOR(msg.sender, amount, newAmount, userStake.stakesTimes);
        return newAmount;
    }

    /// @notice Increases stake of already staken AMORxGuild and receive dAMORxGuild in return
    /// @dev    Front end must still call approve() on AMORxGuild token to allow transferFrom()
    /// @param  amount uint256 amount of dAMOR to be staked
    function increaseStake(uint256 amount) external returns (uint256) {
        if (AMORxGuild.balanceOf(msg.sender) < amount) {
            revert InvalidAmount();
        }

        /// Send to AMORxGuild contract to stake
        AMORxGuild.safeTransferFrom(msg.sender, address(this), amount);

        Stakes storage userStake = _stakes[msg.sender];

        /// Mint AMORxGuild tokens to staker
        /// msg.sender receives funds, based on the amount of time remaining until the end of his stake
        uint256 time = userStake.stakesTimes - block.timestamp;
        uint256 newAmount = _stake(amount, time);
        userStake.stakesAMOR += amount;

        emit AMORxGuildStakeIncreasedToDAMOR(msg.sender, amount, newAmount, time);
        return newAmount;
    }

    /// @notice Withdraws AMORxGuild tokens; burns dAMORxGuild
    /// @dev When the tokens are burned, staked AMORxGuild is being transfered back to the msg.sender
    function withdraw() external returns (uint256) {
        Stakes storage userStake = _stakes[msg.sender];

        if (block.timestamp < userStake.stakesTimes) {
            revert TimeTooSmall();
        }

        uint256 unstakeAMORAmount = userStake.stakesAMOR;
        uint256 amount = balanceOf(msg.sender);
        if (amount == 0) {
            revert InvalidAmount();
        }

        if (amountDelegated[msg.sender] > 0) {
            undelegateAll();
        }

        delete _stakes[msg.sender];
        _burn(msg.sender, amount);

        AMORxGuild.safeTransfer(msg.sender, unstakeAMORAmount);
        emit AMORxGuildWithdrawnFromDAMOR(msg.sender, amount, unstakeAMORAmount);
        return amount;
    }

    /// @notice Delegate your dAMORxGuild to the address `account`
    /// @param  to Address to which delegate users FXAMORxGuild
    /// @param  amount The amount of tokens to delegate
    function delegate(address to, uint256 amount) external {
        if (to == msg.sender) {
            revert InvalidSender();
        }

        if (delegatedTo[msg.sender].length == 100) {
            revert ExceededDelegationLimit();
        }

        uint256 availableAmount = balanceOf(msg.sender) - amountDelegated[msg.sender];

        if (availableAmount < amount) {
            revert InvalidAmount();
        }

        if (delegations[msg.sender][to] == 0) {
            delegatedTo[msg.sender].push(to);
        }

        delegations[msg.sender][to] += amount;
        amountDelegated[msg.sender] += amount;

        emit dAMORxGuildDelegated(to, msg.sender, amount);
    }

    /// @notice Undelegate your dAMORxGuild to the address `account`
    /// @param  account The address from which delegating will be taken away
    /// @param  amount The amount of tokens to undelegate
    function undelegate(address account, uint256 amount) public {
        if (account == msg.sender) {
            revert InvalidSender();
        }

        //Nothing to undelegate
        if (delegations[msg.sender][account] == 0) {
            revert NotDelegatedAny();
        }

        if (delegations[msg.sender][account] > amount) {
            delegations[msg.sender][account] -= amount;
            amountDelegated[msg.sender] -= amount;
        } else {
            amount = delegations[msg.sender][account];
            amountDelegated[msg.sender] -= amount;
            delete delegations[msg.sender][account];
            address[] memory delegatees = delegatedTo[msg.sender];
            for (uint256 i; i < delegatees.length; i++) {
                if (delegatees[i] == account) {
                    delegatedTo[msg.sender][i] = delegatees[delegatees.length - 1];
                    delegatedTo[msg.sender].pop();
                }
            }
        }

        emit dAMORxGuildUndelegated(account, msg.sender, amount);
    }

    /// @notice Undelegate all your dAMORxGuild
    function undelegateAll() public {
        if (amountDelegated[msg.sender] == 0) {
            revert NotDelegatedAny();
        }

        address[] memory delegatees = delegatedTo[msg.sender];

        for (uint256 i; i < delegatees.length; i++) {
            undelegate(delegatees[i], delegations[msg.sender][delegatees[i]]);
        }

        delete amountDelegated[msg.sender];
        delete delegatedTo[msg.sender];
    }

    /// @notice This token is non-transferable
    function transfer() public pure returns (bool) {
        return false;
    }

    /// @notice This token is non-transferable
    function transferFrom() public pure returns (bool) {
        return false;
    }
}
