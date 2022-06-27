// SPDX-License-Identifier: MIT
// Derived from OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/ERC20.sol)

/// @title  dAMORxGuild 
/// @notice Implements a dAMORxGuild token

pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract dAMORxGuild is ERC20, Ownable {

    // staker => all staker balance
    mapping(address => uint256) stakes;
    // those who delegated to a specific address
    mapping(address => address[]) delegators; 
    // staker => delegated to (many accounts) => amount
    // list of delegations from one address
    mapping(address => mapping(address => uint256)) delegations;

    // // staker => delegated to (many accounts) => amount
    // mapping(address => mapping(address => uint256)) delegates;

    // mapping(address => address) delegates;

    address public _owner; //GuildController
    address public AMORxGuild; 
    address public controller; //contract that has a voting function

    error Unauthorized();
    
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
    
    constructor(address owner) ERC20("DoinGud MetaDAO", "FXAMORxGuild") {
        _owner = msg.sender;
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
        require(IERC20(AMORxGuild).balanceOf(msg.sender) >= amount, "Unsufficient AMORxGuild");

        // send to AMORxGuild contract to stake
        IERC20(AMORxGuild).transferFrom(msg.sender, address(this), amount);

        // mint AMORxGuild tokens to staker
        // Tokens are by following formula
        //  TODO: formula
        _mint(msg.sender, amount);

        stakes[msg.sender] = amount;

        emit Staked(msg.sender, amount);

        return amount;
    }

    // function withdraws AMORxGuild tokens; burns dAMORxGuild
    // When this tokens are burned, staked AMORxGuild is being transfered 
    // to the controller(contract that has a voting function)
    function withdraw() public returns (uint256) {
        uint256 amount = stakes[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        //burn used dAMORxGuild tokens from staker
        _burn(msg.sender, amount);
        stakes[msg.sender] = 0;

        IERC20(AMORxGuild).transferFrom(address(this), msg.sender, amount);

        emit Burned(msg.sender, amount);
        return amount;
    }


    function increaseStake(uint256 amount) public returns (uint256) {
        require(IERC20(AMORxGuild).balanceOf(msg.sender) >= amount, "Unsufficient AMORxGuild");

        // send to AMORxGuild contract to stake
        IERC20(AMORxGuild).transferFrom(msg.sender, address(this), amount);

        // mint AMORxGuild tokens to staker
        // Tokens are by following formula
        //  TODO: different formula //msg.sender receives funds, based on the amount of time remaining until the end of his stake
        uint256 newAmount = amount;
        _mint(msg.sender, newAmount);

        stakes[msg.sender] += newAmount;

        emit Staked(msg.sender, newAmount);

        return newAmount;
    }
    
    function balanceOf(address account) public view virtual override returns (uint256) {
        return stakes[account];
    }


    // Delegate your dAMORxGuild to the address `account`.
    // function delegate(address account) public {
    //     require(account != msg.sender, "Self-delegation is disallowed.");
    //     require(account != address(0), "Zero address delagation.");
    //     // require(delegates[msg.sender] == address(0), "Already delegated.");

    //     delegates[msg.sender] = account;
    // }

    function delegate(address to, uint256 amount) public {
        require(stakes[msg.sender] >= amount, "Unsufficient FXAMORxGuild");
        require(to != msg.sender, "Self-delegation is disallowed.");

        // Forward the delegation as long as
        // `to` also delegated.
        // In general, such loops are very dangerous,
        // because if they run too long, they might
        // need more gas than is available in a block.
        // In this case, the delegation will not be executed,
        // but in other situations, such loops might
        // cause a contract to get "stuck" completely.
        while (delegators[to] != address(0)) {
            to = delegators[to];
            
            // We found a loop in the delegation, not allowed.
            require(to != msg.sender, "Found loop in delegation.");
        }

        uint256 alreadyDelegated = 0;

        if((delegators[msg.sender]).length > 0){
            // check all delegated amounts to check if current delegation is possible
            for (uint256 i = 0; i < delegators[msg.sender]).length; i++) {
                address j = ??? how to get it??
                alreadyDelegated += delegators[msg.sender][j];
            }
        }

        uint256 availableAmount = stakes[msg.sender] - alreadyDelegated;
        require(availableAmount >= amount, "Unavailable amount of FXAMORxGuild");

        delegators[msg.sender].push(to);

        if(delegations[msg.sender][to] > 0){
            delegations[msg.sender][to] += amount;
        }else{
            delegations[msg.sender][to] = amount;
        }
        
        emit Delegated(msg.sender, to, amount);
    }

    function undelegate(address account) public {
        require(account != msg.sender, "Self-delegation is disallowed.");
        require(delegates[msg.sender] != address(0), "Already delegated.");

        delegates[msg.sender] = address(0);
    }

}