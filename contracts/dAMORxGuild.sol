// SPDX-License-Identifier: MIT
// Derived from OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/ERC20.sol)

/// @title  dAMORxGuild 
/// @notice Implements a dAMORxGuild token

pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract dAMORxGuild is ERC20, Ownable {

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
    mapping(address => uint256) amountDelegated;

    uint256 public constant MAX_LOCK_TIME = 365 days; // 1 year is the time for the new deposided tokens to be locked until they can be withdrawn
    uint256 public constant MIN_LOCK_TIME = 7 days; // 1 week is the time for the new deposided tokens to be locked until they can be withdrawn

    string private _name;
    string private _symbol;

    address public _owner; //GuildController
    address public AMORxGuild;
    address public controller; //contract that has a voting function

    error Unauthorized();
    error EmptyArray();

    /// Invalid balance to transfer. Needed `minRequired` but sent `amount`
    /// @param sent sent amount.
    /// @param minRequired minimum amount to send.
    error InvalidAmount (uint256 sent, uint256 minRequired);

    /// Invalid address. Needed address != address(0)
    error AddressZero();

    /// Invalid address to transfer. Needed `to` != msg.sender
    error InvalidSender();
    
    error TimeTooSmall();
    error TimeTooBig();

    event Staked(
        address indexed user,
        uint256 amount
    );

    event Burned(
        address indexed user,
        uint256 amount
    );

    event Delegated(
        address indexed from,
        address indexed to,
        uint256 amount
    );

    constructor(string memory name_, string memory symbol_, address owner) ERC20(name_, symbol_) {
        _owner = msg.sender;
        _name = name_;
        _symbol = symbol_;
    }

    modifier onlyAddress(address authorizedAddress) {
        if (msg.sender != authorizedAddress) {
            revert Unauthorized();
        }
        _;
    }  

    //  receives ERC20 AMORxGuild tokens, which are getting locked 
    //  and generate dAMORxGuild tokens in return. 
    //  Tokens are minted following the formula

    /// @notice Stake AMORxGuild and receive dAMORxGuild in return
    /// @dev    Front end must still call approve() on AMORxGuild token to allow transferFrom()
    /// @param  amount uint256 amount of dAMOR to be staked
    /// @param  time uint256
    /// @return uint256 the amount of dAMORxGuild received from staking
    function stake(uint256 amount, uint256 time) public returns (uint256) {
        if(time <= MIN_LOCK_TIME) {
            revert TimeTooSmall();
        }
        if(time >= MAX_LOCK_TIME) {
           revert TimeTooBig();
        }
        if(IERC20(AMORxGuild).balanceOf(msg.sender) < amount){
            revert InvalidAmount(amount, IERC20(AMORxGuild).balanceOf(msg.sender));
        }
        // send to AMORxGuild contract to stake
        IERC20(AMORxGuild).transferFrom(msg.sender, address(this), amount);

        // mint AMORxGuild tokens to staker
        // Tokens are by following formula
        uint256 koef = time/MAX_LOCK_TIME;
        uint256 newAmount = (koef)^2 *amount; //NdAMOR = f(t)^2 *nAMOR
        stakesTimes[msg.sender] = block.timestamp + time;

        _mint(msg.sender, newAmount);

        stakes[msg.sender] = newAmount;

        emit Staked(msg.sender, newAmount);

        return newAmount;
    }

    function increaseStake(uint256 amount) public returns (uint256) {
        if(IERC20(AMORxGuild).balanceOf(msg.sender) < amount){
            revert InvalidAmount(amount, IERC20(AMORxGuild).balanceOf(msg.sender));
        }
        // send to AMORxGuild contract to stake
        IERC20(AMORxGuild).transferFrom(msg.sender, address(this), amount);

        // mint AMORxGuild tokens to staker
        // msg.sender receives funds, based on the amount of time remaining until the end of his stake
        uint256 time = stakesTimes[msg.sender] - block.timestamp;

        uint256 koef = time/MAX_LOCK_TIME;
        uint256 newAmount = (koef)^2 *amount; //NdAMOR = f(t)^2 *nAMOR

        _mint(msg.sender, newAmount);

        stakes[msg.sender] += newAmount;

        emit Staked(msg.sender, newAmount);

        return newAmount;
    }

    // function withdraws AMORxGuild tokens; burns dAMORxGuild
    // When this tokens are burned, staked AMORxGuild is being transfered 
    // to the controller(contract that has a voting function)
    function withdraw() public returns (uint256) {
        uint256 amount = stakes[msg.sender];
        if(amount <= 0) {
            revert InvalidAmount(amount, 0);
        }

        //burn used dAMORxGuild tokens from staker
        _burn(msg.sender, amount);
        stakes[msg.sender] = 0;

        IERC20(AMORxGuild).transferFrom(address(this), msg.sender, amount);

        emit Burned(msg.sender, amount);
        return amount;
    }
    
    function balanceOf(address account) public view virtual override returns (uint256) {
        return stakes[account];
    }


    // Delegate your dAMORxGuild to the address `account`.
    function delegate(address to, uint256 amount) public {
        if(stakes[msg.sender] < amount) {
            revert InvalidAmount(amount, stakes[msg.sender]);
        }
        if(to == msg.sender) {
            revert InvalidSender();
        }
        
        uint256 alreadyDelegated = amountDelegated[msg.sender];
        uint256 availableAmount = stakes[msg.sender] - alreadyDelegated;
        if(availableAmount < amount) {
            revert InvalidAmount(amount, availableAmount);
        }

        delegators[msg.sender].push(to);

        if(delegations[msg.sender][to] > 0){
            delegations[msg.sender][to] += amount;
            amountDelegated[msg.sender] += amount;
        }else{
            delegations[msg.sender][to] = amount;
            amountDelegated[msg.sender] = amount;
        }
        
        emit Delegated(msg.sender, to, amount);
    }

    function undelegate(address account, uint256 amount) public {
        if(account == msg.sender) {
            revert InvalidSender();
        }

        if(delegators[msg.sender].length == 0) { //Nothing to undelegate
            revert EmptyArray();
        }

        if(delegations[msg.sender][account] >= amount){
            delegations[msg.sender][account] -= amount;
            amountDelegated[msg.sender] -= amount;
        }else{
            delegations[msg.sender][account] = 0;
            amountDelegated[msg.sender] = 0;
        }

        amountDelegated[msg.sender] = amount;
    }

    function undelegateAll() public {
        if(delegators[msg.sender].length == 0) { //Nothing to undelegate
            revert EmptyArray();
        }

        if(delegators[msg.sender].length > 0){
            address[] memory delegationsTo = delegators[msg.sender];
            for (uint256 i = 0; i < delegationsTo.length; i++) {
                address delegatedTo = delegationsTo[i];
                delegations[msg.sender][delegatedTo] = 0;
            }
        }

        delete delegators[msg.sender]; //clear array
        amountDelegated[msg.sender] = 0;
    }

}
