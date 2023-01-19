// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

/**
 * @title  DoinGud: FXAMORxGuild.sol
 * @author Daoism Systems
 * @notice ERC20 implementation for DoinGudDAO
 * @custom Security-contact security@daoism.systems
 * @dev Implementation of the FXAMORXGuild token for DoinGud
 *
 * The contract houses the token logic for FXAMORxGuild.
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
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
/// Advanced math functions for bonding curve
import "../utils/ABDKMath64x64.sol";
/// Custom contracts
import "../utils/ERC20Base.sol";
import "../interfaces/IFXAMORxGuild.sol";

contract FXAMORxGuild is IFXAMORxGuild, ERC20Base, Ownable {
    using ABDKMath64x64 for uint256;
    using SafeERC20 for IERC20;

    // those who delegated to a specific address
    mapping(address => address[]) public delegators;
    // list of delegations from one address
    mapping(address => mapping(address => uint256)) public delegations;
    // those to whom tokens were delegated from a specific address
    mapping(address => address[]) public delegation;
    // amount of all delegated tokens from staker
    mapping(address => uint256) public amountDelegated;
    // amount of all delegated tokens to staker
    mapping(address => uint256) public amountDelegatedAvailable;

    bool private _initialized;

    address public controller; // contract that has a voting function

    IERC20 public AMORxGuild;

    uint256 public MIN_AMOUNT = 10**15;

    /// Events
    event AMORxGuildStakedToFXAMOR(address to, uint256 amount, uint256 timeOfStake);
    event AMORxGuildWithdrawnFromFXAMOR(address to, uint256 amount, uint256 timeOfWithdraw);
    event FXAMORxGuildUndelegated(address from, address owner, uint256 amount);
    event FXAMORxGuildDelegated(address to, address owner, uint256 amount);
    event FXAMORxGuildControllerUpdated(address newCollector);

    /// Errors
    /// Contract has been initialized already
    error AlreadyInitialized();
    /// Access controlled
    error Unauthorized();
    /// Invalid array provided
    error EmptyArray();
    /// No delegated tokens
    error NotDelegatedAny();
    /// Invalid address. Needed address != address(0)
    error AddressZero();
    /// Invalid address to transfer. Needed `to` != msg.sender
    error InvalidSender();
    /// Invalid address to transfer. Needed `to` != msg.sender
    error NotSufficientDelegation();

    /*  @dev    The init() function takes the place of the constructor.
     *          It can only be run once.
     */
    function init(
        string memory _name,
        string memory _symbol,
        address _initOwner,
        IERC20 _AMORxGuild
    ) external override {
        if (_initialized) {
            revert AlreadyInitialized();
        }

        _transferOwnership(_initOwner); // GuildController

        controller = _initOwner;
        AMORxGuild = IERC20(_AMORxGuild);
        //  Set the name and symbol
        _setTokenDetail(_name, _symbol);

        _initialized = true;
        emit Initialized(_initOwner, address(_AMORxGuild));
    }

    function setController(address _controller) external onlyOwner {
        if (_controller == address(0)) {
            revert AddressZero();
        }
        controller = _controller;
        emit FXAMORxGuildControllerUpdated(_controller);
    }

    modifier onlyAddress(address authorizedAddress) {
        if (msg.sender != authorizedAddress) {
            revert Unauthorized();
        }
        _;
    }

    /// @notice Stake AMORxGuild and receive FXAMORxGuild in return
    ///         receives ERC20 AMORxGuild tokens, which are getting locked
    ///         and generate FXAMORxGuild tokens in return.
    ///         Tokens are minted 1:1.
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

        emit AMORxGuildStakedToFXAMOR(to, amount, block.timestamp);
        return amount;
    }

    /// @notice Burns FXAMORxGuild tokens if they are being used for voting
    /// @dev When this tokens are burned, staked AMORxGuild is being transfered
    //       to the controller(contract that has a voting function)
    /// @param  whoUsedDelegated who used delegeted tokens that we must burn first
    ///         whoUsedDelegated = account by default
    /// @param  account address from which must burn tokens
    /// @param  amount uint256 representing amount of burning tokens
    function burn(
        address whoUsedDelegated,
        address account,
        uint256 amount
    ) external onlyOwner {
        if (balanceOf(account) < amount) {
            revert InvalidAmount();
        }

        if (whoUsedDelegated == account && amount > (balanceOf(account) - amountDelegated[account])) {
            revert InvalidAmount();
        }

        if (whoUsedDelegated != account) {
            // if the delegatee is the one who using tokens
            if (delegations[account][whoUsedDelegated] < amount) {
                revert InvalidAmount();
            }
            _undelegate(account, whoUsedDelegated, amount);
            emit FXAMORxGuildUndelegated(whoUsedDelegated, account, amount);
        }

        //burn used FXAMORxGuild tokens from staker
        _burn(account, amount);
        // transfer of AMORxGuild is executed in the GuildController via call of withdraw()

        emit AMORxGuildWithdrawnFromFXAMOR(account, amount, block.timestamp);
    }

    /// @notice Transfers FXAMORxGuild tokens if they are being used for voting
    /// @param  amount uint256 representing amount of tokens to transfer to controller(contract that has a voting function)
    function withdraw(uint256 amount) external onlyOwner {
        AMORxGuild.safeTransfer(controller, amount);
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

        if (delegation[msg.sender].length >= 100) {
            revert InvalidAmount();
        }

        if (delegators[to].length >= 100) {
            revert InvalidAmount();
        }

        if (amount < MIN_AMOUNT) {
            revert NotSufficientDelegation();
        }

        uint256 availableAmount = balanceOf(msg.sender) - amountDelegated[msg.sender];
        if (availableAmount < amount) {
            revert InvalidAmount();
        }

        if (delegations[msg.sender][to] == 0) {
            delegation[msg.sender].push(to);
        }
        delegators[to].push(msg.sender);
        delegations[msg.sender][to] += amount;
        amountDelegated[msg.sender] += amount;
        amountDelegatedAvailable[to] += amount;
        emit FXAMORxGuildDelegated(to, msg.sender, amount);
    }

    /// @notice Unallows some external account to vote with your delegated FXAMORxGuild tokens
    /// @param  account address from which delegating will be taken away
    /// @param  amount uint256 representing amount of undelegating tokens
    function undelegate(address account, uint256 amount) public {
        _undelegate(msg.sender, account, amount);
    }

    /// @notice Unallows some external account to vote with your delegated FXAMORxGuild tokens
    /// @param  owner address undelegating tokens owner
    /// @param  account address from which delegating will be taken away
    /// @param  amount uint256 representing amount of undelegating tokens
    function _undelegate(
        address owner,
        address account,
        uint256 amount
    ) internal {
        if (account == owner) {
            revert InvalidSender();
        }

        //Nothing to undelegate
        if (delegations[owner][account] == 0) {
            revert NotDelegatedAny();
        }

        if (delegations[owner][account] > amount) {
            delegations[owner][account] -= amount;
            amountDelegated[owner] -= amount;
            amountDelegatedAvailable[account] -= amount;
        } else {
            amountDelegated[owner] -= delegations[owner][account];
            amountDelegatedAvailable[account] -= delegations[owner][account];
            amount = delegations[owner][account];
            delete delegations[owner][account];

            for (uint256 j = 0; j < delegation[owner].length; j++) {
                if (delegation[owner][j] == account) {
                    delegation[owner][j] = delegation[owner][delegation[owner].length - 1];
                    delegation[owner].pop();
                    break;
                }
            }
            address[] memory _delegators = delegators[account];
            uint256 last = delegators[account].length - 1;
            for (uint8 i = 0; i < _delegators.length; i++) {
                if (_delegators[i] == owner) {
                    delegators[account][i] = delegators[account][last];
                    delegators[account].pop();
                    break;
                }
            }
        }

        emit FXAMORxGuildUndelegated(account, owner, amount);
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
}
