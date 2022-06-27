// SPDX-License-Identifier: MIT
// Derived from OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/ERC20.sol)

/// @title  dAMORxGuild 
/// @notice Implements a dAMORxGuild token

pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract dAMORxGuild is ERC20, Ownable {

    mapping(address => uint256) stakes;
    mapping(address => address) delegates;


    mapping(address => uint256) private _allowedBalances;
    mapping(address => uint256) private _delegatedBalances; //amount that was delegated and can't be used


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
        return stakes[msg.sender];
    }


    // Delegate your dAMORxGuild to the address `account`.
    function delegate(address account) public {
        require(account != msg.sender, "Self-delegation is disallowed.");
        require(account != address(0), "Zero address delagation.");
        // require(delegates[msg.sender] == address(0), "Already delegated.");

        delegates[msg.sender] = account;
    }

    function undelegate(address account) public {
        require(account != msg.sender, "Self-delegation is disallowed.");
        require(delegates[msg.sender] != address(0), "Already delegated.");

        delegates[msg.sender] = address(0);
    }

}