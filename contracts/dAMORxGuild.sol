// SPDX-License-Identifier: MIT
// Derived from OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/ERC20.sol)

/// @title  dAMORxGuild
/// @notice Implements a dAMORxGuild token

pragma solidity 0.8.15;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./utils/ERC20Base.sol";

contract dAMORxGuild is ERC20Base, Ownable {
    // staker => time staked for
    mapping(address => uint256) stakesTimes;
    // staker => all staker balance
    mapping(address => uint256) stakes;
    // those who delegated to a specific address
    mapping(address => address[]) delegators;
    // staker => delegated to (many accounts) => amount
    // list of delegations from one address
    mapping(address => mapping(address => uint256)) delegations;
    // amount of all delegated tokens from staker
    mapping(address => uint256) public amountDelegated;

    event Initialized(bool success, address owner, address AMORxGuild, uint256 amount);

    bool private _initialized;

    uint256 public guardianThreshold; // minimal amount of dAMORxGuild(dAMOR) to become guardian
    address[] public guardians;
    address[] public delegateGuardians; //array of delegated guardians(based on the popular vote)

    uint256 public constant TIME_DENOMINATOR = 1000000000000000000;
    uint256 public constant MAX_LOCK_TIME = 365 days; // 1 year is the time for the new deposided tokens to be locked until they can be withdrawn
    uint256 public constant MIN_LOCK_TIME = 7 days; // 1 week is the time for the new deposided tokens to be locked until they can be withdrawn

    address public _owner; //GuildController
    address public guardian;

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
        string memory name_,
        string memory symbol_,
        address initOwner_,
        address AMORxGuild_,
        uint256 amount
    ) external returns (bool) {
        require(!_initialized, "Already initialized");

        _transferOwnership(initOwner_);

        _owner = initOwner_;
        AMORxGuild = IERC20(AMORxGuild_);
        _setTokenDetail(name_, symbol_);
        guardianThreshold = amount;

        _initialized = true;
        emit Initialized(_initialized, initOwner_, AMORxGuild_, amount);
        return true;
    }

    modifier onlyAddress(address authorizedAddress) {
        if (msg.sender != authorizedAddress) {
            revert Unauthorized();
        }
        _;
    }

    function setGuardianThreshold(uint256 _guardianThreshold) external onlyAddress(_owner) {
        guardianThreshold = _guardianThreshold;
    }

    /// @notice Mint AMORxGuild tokens to staker
    /// @dev    Tokens are by following formula: NdAMOR = f(t)^2 *nAMOR
    /// @param  amount uint256 amount of AMORxGuild to be staked
    /// @param  time uint256 time how long tokens wll be staked
    function _stake(uint256 amount, uint256 time) internal returns (uint256) {
        uint256 koef = (time * TIME_DENOMINATOR) / MAX_LOCK_TIME;
        uint256 newAmount = ((koef * koef) * amount) / (TIME_DENOMINATOR * TIME_DENOMINATOR);
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
    function stake(uint256 amount, uint256 time) public returns (uint256) {
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
        AMORxGuild.transferFrom(msg.sender, address(this), amount);

        uint256 newAmount = _stake(amount, time);

        stakesTimes[msg.sender] = block.timestamp + time;
        stakes[msg.sender] = newAmount;

        setGuardian(stakes[msg.sender]);

        return newAmount;
    }

    /// @notice Increases stake of already staken AMORxGuild and receive dAMORxGuild in return
    /// @dev    Front end must still call approve() on AMORxGuild token to allow transferFrom()
    /// @param  amount uint256 amount of dAMOR to be staked
    function increaseStake(uint256 amount) public returns (uint256) {
        if (AMORxGuild.balanceOf(msg.sender) < amount) {
            revert InvalidAmount();
        }
        // send to AMORxGuild contract to stake
        AMORxGuild.transferFrom(msg.sender, address(this), amount);

        // mint AMORxGuild tokens to staker
        // msg.sender receives funds, based on the amount of time remaining until the end of his stake
        uint256 time = stakesTimes[msg.sender] - block.timestamp;

        uint256 newAmount = _stake(amount, time);

        stakes[msg.sender] += newAmount;

        setGuardian(stakes[msg.sender]);

        return newAmount;
    }

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
            delegations[msg.sender][people[i]] = 0;
        }
        amountDelegated[msg.sender] = 0;

        AMORxGuild.transfer(msg.sender, amount);

        return amount;
    }

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

        delegators[msg.sender].push(to);

        delegations[msg.sender][to] += amount;
        amountDelegated[msg.sender] += amount;
    }

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
            delegations[msg.sender][account] = 0;
            amountDelegated[msg.sender] = 0;
        }
        delete delegations[msg.sender][account];
    }

    /// @notice Sets msg.sender as a guardian if a new amount of dAMORxGuild(dAMOR) tokens > guardianThreshold
    function setGuardian(uint256 amount) internal {
        if (balanceOf(msg.sender) > guardianThreshold) {
            guardians.push(msg.sender);
        }
    }

    function addDelegateGuardians(address[] memory _delegateGuardians) public onlyAddress(_owner) {
        delete delegateGuardians;

        for (uint256 i = 0; i < _delegateGuardians.length; i++) {
            address newAddress = _delegateGuardians[i];
            delegateGuardians.push(newAddress);
        }
    }

    /// @notice non-transferable
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        return false;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        return false;
    }
}
