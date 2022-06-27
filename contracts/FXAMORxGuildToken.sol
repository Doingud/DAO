// SPDX-License-Identifier: MIT
// Derived from OpenZeppelin Contracts (last updated v4.6.0) (token/ERC20/ERC20.sol)

/// @title  FXAMORxGuild 
/// @notice Implements a FXAMORxGuild token
/// @dev    Non transferable

pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FXAMORxGuild is ERC20, Ownable {
    mapping(address => User) private users;

    struct User {
        uint256 weight; // = balanceOf(address(this)); // weight is accumulated by stacking balance
        uint256 balance; 
        bool voted; // if true, that person already voted
        address delegate; // person delegated to
    }


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
    //  and generate FXAMORxGuild tokens in return. 
    //  Tokens are minted 1:1.

    /// @notice Stake AMORxGuild and receive FXAMORxGuild in return
    /// @dev    Front end must still call approve() on AMORxGuild token to allow transferFrom()
    /// @param  to a parameter just like in doxygen (must be followed by parameter name)
    /// @param  amount uint256 amount of AMORxGuild to be staked
    /// @return uint256 the amount of AMORxGuild received from staking
    function stake(address to, uint256 amount) public onlyAddress(_owner) returns (uint256) {
        require(IERC20(AMORxGuild).balanceOf(msg.sender) >= amount, "Unsufficient AMORxGuild");

        // send to FXAMORxGuild contract to stake
        IERC20(AMORxGuild).transferFrom(msg.sender, address(this), amount);

        // mint FXAMORxGuild tokens to staker
        // Tokens are minted 1:1.
        _mint(to, amount);

        users[to].balance = amount;

        // _balances[to] = amount;
        emit Staked(msg.sender, amount);

        return amount;
    }

    // function burns FXAMORxGuild tokens if they are being used for voting. 
    // When this tokens are burned, staked AMORxGuild is being transfered 
    // to the controller(contract that has a voting function)
    function burn(uint256 amount) public onlyAddress(_owner) {
        require(users[msg.sender].balance >= amount, "Unsufficient FXAMORxGuild");

        //burn used FXAMORxGuild tokens from staker
        _burn(msg.sender, amount);
        users[msg.sender].balance -= amount;

        IERC20(AMORxGuild).transferFrom(address(this), controller, amount);

        emit Burned(msg.sender, amount);
    }
    
    // already exists in ERC20Taxable
    function balanceOf(address account) public view virtual override returns (uint256) {
        return users[account].balance;
    }


    // function that allows some external account to vote with your FXAMORxGuild tokens
    // Delegate your FXAMORxGuild to the address `to`.
    function delegate(address to) public {
        // assigns reference
        User storage sender = users[msg.sender];

        require(!sender.voted, "You already voted.");
        require(to != msg.sender, "Self-delegation is disallowed.");

        // Forward the delegation as long as
        // `to` also delegated.
        // In general, such loops are very dangerous,
        // because if they run too long, they might
        // need more gas than is available in a block.
        // In this case, the delegation will not be executed,
        // but in other situations, such loops might
        // cause a contract to get "stuck" completely.
        while (users[to].delegate != address(0)) {
            to = users[to].delegate;

            // We found a loop in the delegation, not allowed.
            require(to != msg.sender, "Found loop in delegation.");
        }

        User storage delegate_ = users[to];
        require(!delegate_.voted, "User to delegate is already voted.");

        sender.weight -= sender.balance; //upd weight info

        // Since `sender` is a reference, this
        // modifies `voters[msg.sender].voted`
        sender.voted = true;
        sender.delegate = to;

        // If the delegate did not vote yet,
        // add to their weight.
        delegate_.weight += sender.weight;
    }

}