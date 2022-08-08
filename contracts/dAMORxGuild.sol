// SPDX-License-Identifier: MIT
// Derived from OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/ERC20.sol)

/// @title  dAMORxGuild
/// @notice Implements a dAMORxGuild token

pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./utils/ERC20Base.sol";

contract dAMORxGuild is ERC20Base, Ownable {
    using SafeERC20 for IERC20;

    // staker => time staked for
    mapping(address => uint256) public stakesTimes;
    // staker => all staker balance
    mapping(address => uint256) public stakes;
    // those who delegated to a specific address
    mapping(address => address[]) public delegators;
    // staker => delegated to (many accounts) => amount
    // list of delegations from one address
    mapping(address => mapping(address => uint256)) public delegations;
    // those to whom tokens were delegated from a specific address
    mapping(address => address[]) public delegation;
    // amount of all delegated tokens from staker
    mapping(address => uint256) public amountDelegated;

    event Initialized(bool success, address owner, address AMORxGuild, uint256 amount);

    bool private _initialized;
    uint256 public constant COEFFICIENT = 2;
    uint256 public constant TIME_DENOMINATOR = 1000000000000000000;
    uint256 public constant MAX_LOCK_TIME = 365 days; // 1 year is the time for the new deposided tokens to be locked until they can be withdrawn
    uint256 public constant MIN_LOCK_TIME = 7 days; // 1 week is the time for the new deposided tokens to be locked until they can be withdrawn

    IERC20 private AMORxGuild;

    error Unauthorized();
    error EmptyArray();
    error NotDelegatedAny();
    /// Invalid address. Needed address != address(0)
    error AddressZero();
    /// Invalid address to transfer. Needed `to` != msg.sender
    error InvalidSender();
    error TimeTooSmall();
    error TimeTooBig();

    /*  @dev    The init() function takes the place of the constructor.
     *          It can only be run once.
     */
    function init(
        string memory name,
        string memory symbol,
        address initOwner,
        address _AMORxGuild,
        uint256 amount
    ) external returns (bool) {
        require(!_initialized, "Already initialized");

        _transferOwnership(initOwner);

        AMORxGuild = IERC20(_AMORxGuild);
        _setTokenDetail(name, symbol);

        _initialized = true;
        emit Initialized(_initialized, initOwner, _AMORxGuild, amount);
        return true;
    }

    /// @notice Mint AMORxGuild tokens to staker
    /// @dev    Tokens are by following formula: NdAMOR =  k * f(t)^2 * nAMOR
    /// @param  amount uint256 amount of AMORxGuild to be staked
    /// @param  time uint256 time how long tokens wll be staked
    function _stake(uint256 amount, uint256 time) internal returns (uint256) {
        uint256 koef = (time * TIME_DENOMINATOR) / MAX_LOCK_TIME;
        uint256 newAmount = (COEFFICIENT * (koef * koef) * amount) / (TIME_DENOMINATOR * TIME_DENOMINATOR);
        _mint(msg.sender, newAmount);
        return newAmount;
    }

    //  receives ERC20 AMORxGuild tokens, which are getting locked
    //  and generate dAMORxGuild tokens in return.
    //  Tokens are minted following the formula

    /// @notice Stakes AMORxGuild and receive dAMORxGuild in return
    /// @dev    Front end must still call approve() on AMORxGuild token to allow transferFrom()
    /// @param  amount uint256 amount of dAMOR to be staked
    /// @param  time uint256
    /// @return uint256 the amount of dAMORxGuild received from staking
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
        // send to AMORxGuild contract to stake
        AMORxGuild.safeTransferFrom(msg.sender, address(this), amount);

        uint256 newAmount = _stake(amount, time);

        stakesTimes[msg.sender] = block.timestamp + time;
        stakes[msg.sender] = newAmount;

        return newAmount;
    }

    /// @notice Increases stake of already staken AMORxGuild and receive dAMORxGuild in return
    /// @dev    Front end must still call approve() on AMORxGuild token to allow transferFrom()
    /// @param  amount uint256 amount of dAMOR to be staked
    function increaseStake(uint256 amount) external returns (uint256) {
        if (AMORxGuild.balanceOf(msg.sender) < amount) {
            revert InvalidAmount();
        }
        // send to AMORxGuild contract to stake
        AMORxGuild.safeTransferFrom(msg.sender, address(this), amount);

        // mint AMORxGuild tokens to staker
        // msg.sender receives funds, based on the amount of time remaining until the end of his stake
        uint256 time = stakesTimes[msg.sender] - block.timestamp;

        uint256 newAmount = _stake(amount, time);

        stakes[msg.sender] += newAmount;

        return newAmount;
    }

    // /// @notice Withdraws AMORxGuild tokens; burns dAMORxGuild
    // /// @dev When this tokens are burned, staked AMORxGuild is being transfered
    // ///      to the controller(contract that has a voting function)
    // function withdraw() external returns (uint256) {
    //     if (block.timestamp < stakesTimes[msg.sender]) {
    //         revert TimeTooSmall();
    //     }

    //     uint256 amount = stakes[msg.sender];

    //     //burn used dAMORxGuild tokens from staker
    //     _burn(msg.sender, amount);
    //     stakes[msg.sender] = 0;

    //     // clear msg.sender delegation from delegators who delegated to msg.sender
    //     address[] memory people = delegators[msg.sender];
    //     for (uint256 i = 0; i < people.length; i++) {
    //         delete delegation[people[i]];
    //     }

    //     address toWhom = delegation[msg.sender];
    //     // clear msg.sender delegation from list of delegators to `toWhom` address
    //     for (uint256 i = 0; i < delegators[toWhom].length; i++) {
    //         if (delegators[toWhom][i] == msg.sender) {
    //             delegators[toWhom][i] = delegators[toWhom][delegators[toWhom].length - 1];
    //             delegators[toWhom].pop();
    //             break;
    //         }
    //     }

    //     // clear msg.sender delegation
    //     delete delegation[msg.sender];
    //     delete delegators[msg.sender];

    //     AMORxGuild.safeTransfer(msg.sender, amount);

    //     return amount;
    // }

    /// @notice Withdraws AMORxGuild tokens; burns dAMORxGuild
    /// @dev When this tokens are burned, staked AMORxGuild is being transfered
    ///      to the controller(contract that has a voting function)
    function withdraw() public returns (uint256) {
        if (block.timestamp < stakesTimes[msg.sender]) {
            revert TimeTooSmall();
        }

        uint256 amount = stakes[msg.sender];
        if (amount <= 0) {
            revert InvalidAmount();
        }

        //burn used dAMORxGuild tokens from staker
        _burn(msg.sender, amount);
        stakes[msg.sender] = 0;

        address[] memory people = delegators[msg.sender];
        for (uint256 i = 0; i < people.length; i++) {
            delete delegations[msg.sender][people[i]];
        }
        amountDelegated[msg.sender] = 0;

        AMORxGuild.safeTransfer(msg.sender, amount);

        if (delegation[msg.sender].length != 0) {
            undelegateAll();
        }
        return amount;
    }

    // /// @notice Delegate your dAMORxGuild to the address `account`
    // /// @param  to address to which delegate users FXAMORxGuild
    // function delegate(address to) external {
    //     /// remove old delegation if already delagated to someone
    //     if (delegation[msg.sender] != address(0)) {
    //         undelegate();
    //     }

    //     if (to == msg.sender) {
    //         revert InvalidSender();
    //     }

    //     delegators[to].push(msg.sender);
    //     delegation[msg.sender] = to;
    // }

    /// @notice Delegate your dAMORxGuild to the address `account`
    /// @param  to address to which delegate users FXAMORxGuild
    /// @param  amount uint256 representing amount of delegating tokens
    function delegate(address to, uint256 amount) public {
        if (to == msg.sender) {
            revert InvalidSender();
        }

        uint256 alreadyDelegated = amountDelegated[msg.sender];
        uint256 availableAmount = stakes[msg.sender] - alreadyDelegated;
        if (availableAmount < amount) {
            revert InvalidAmount();
        }

        delegation[msg.sender].push(to);
        delegators[to].push(msg.sender);

        delegations[msg.sender][to] += amount;
        amountDelegated[msg.sender] += amount;
    }

    // /// @notice Undelegate your dAMORxGuild
    // function undelegate() public {
    //     address account = delegation[msg.sender];

    //     //Nothing to undelegate
    //     if (delegators[account].length == 0) {
    //         revert NotDelegatedAny();
    //     }

    //     for (uint256 i = 0; i < delegators[account].length; i++) {
    //         if (delegators[account][i] == msg.sender) {
    //             delegators[account][i] = delegators[account][delegators[account].length - 1];
    //             delegators[account].pop();
    //             break;
    //         }
    //     }
    //     delete delegation[msg.sender];
    // }

    /// @notice Undelegate your dAMORxGuild to the address `account`
    /// @param  account address from which delegating will be taken away
    /// @param  amount uint256 representing amount of undelegating tokens
    function undelegate(address account, uint256 amount) public {
        if (account == msg.sender) {
            revert InvalidSender();
        }

        //Nothing to undelegate
        if (delegations[msg.sender][account] == 0) {
            delete delegations[msg.sender][account];
            revert NotDelegatedAny();
        }

        if (delegations[msg.sender][account] >= amount) {
            delegations[msg.sender][account] -= amount;
            amountDelegated[msg.sender] -= amount;
        } else {
            amountDelegated[msg.sender] -= delegations[msg.sender][account];
            delegations[msg.sender][account] = 0;
            delete delegations[msg.sender][account];

            for (uint256 i = 0; i < delegators[msg.sender].length; i++) {
                if (delegators[msg.sender][i] == account) {
                    delegators[msg.sender][i] = delegators[msg.sender][delegators[msg.sender].length - 1];
                    delegators[msg.sender].pop();
                    break;
                }
            }
        }
    }

    /// @notice Undelegate all your dAMORxGuild
    function undelegateAll() public {
        address[] memory accounts = delegation[msg.sender];

        //Nothing to undelegate
        if (accounts.length == 0) {
            revert NotDelegatedAny();
        }

        address account;
        for (uint256 i = 0; i < accounts.length; i++) {
            account = accounts[i];
            delete delegations[msg.sender][account];

            // clear msg.sender delegation from list of delegators to `account` address
            for (uint256 j = 0; j < delegators[account].length; j++) {
                if (delegators[account][j] == msg.sender) {
                    delegators[account][j] = delegators[account][delegators[account].length - 1];
                    delegators[account].pop();
                    break;
                }
            }
        }

        delete delegation[msg.sender];
        delete delegators[msg.sender];
        delete amountDelegated[msg.sender];
    }

    /// @notice non-transferable
    function transfer(address to, uint256 amount) public override returns (bool) {
        return false;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        return false;
    }
}
