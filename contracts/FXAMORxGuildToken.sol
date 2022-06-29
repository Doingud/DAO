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

    // staker => all staker balance
    mapping(address => uint256) stakes;
    // those who delegated to a specific address
    mapping(address => address[]) delegators; 
    // list of delegations from one address
    mapping(address => mapping(address => uint256)) delegations;
    // amount of all delegated tokens from staker
    mapping(address => uint256) amountDelegated;

    string private _name = "DoinGud MetaDAO";
    string private _symbol = "FXAMORxGuild";

    address public _owner; //GuildController
    address public AMORxGuild; 
    address public controller; //contract that has a voting function

    error Unauthorized();
    

    constructor(address owner, address _AMORxGuild) ERC20(_name, _symbol) {
        _owner = msg.sender;
        AMORxGuild = _AMORxGuild;
    }

    function setController(address _controller) external onlyAddress(_owner) {
        require(_controller != address(0), "Address zero");
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
    /// @dev    Front end must still call approve() on AMORxGuild token to allow transferFrom()
    /// @param  to a parameter just like in doxygen (must be followed by parameter name)
    /// @param  amount uint256 amount of AMORxGuild to be staked
    /// @return uint256 the amount of AMORxGuild received from staking
    function stake(address to, uint256 amount) external onlyAddress(_owner) returns (uint256) {
         require(IERC20(AMORxGuild).balanceOf(msg.sender) >= amount, "Unsufficient AMORxGuild");
        // send to FXAMORxGuild contract to stake
        IERC20(AMORxGuild).transferFrom(msg.sender, address(this), amount);

        // mint FXAMORxGuild tokens to staker
        // Tokens are minted 1:1.
        _mint(to, amount);

        stakes[to] += amount;

        return amount;
    }

    // function burns FXAMORxGuild tokens if they are being used for voting. 
    // When this tokens are burned, staked AMORxGuild is being transfered 
    // to the controller(contract that has a voting function)
    function burn(address account, uint256 amount) external onlyAddress(_owner) {
        require(stakes[account] >= amount, "Unsufficient FXAMORxGuild");

        //burn used FXAMORxGuild tokens from staker
        _burn(account, amount);
        stakes[account] -= amount;
        IERC20(AMORxGuild).transferFrom(address(this), controller, amount);
    }
    
    // already exists in ERC20Taxable
    function balanceOf(address account) public view override returns (uint256) {
        return stakes[account];
    }


    // function that allows some external account to vote with your FXAMORxGuild tokens
    // Delegate your FXAMORxGuild to the address `to`.
    function delegate(address to, uint256 amount) external {
        require(stakes[msg.sender] >= amount, "Unsufficient FXAMORxGuild");
        require(to != msg.sender, "Self-delegation is disallowed.");
        require(to != address(0), "Delegation to zero address is disallowed.");

        uint256 alreadyDelegated = amountDelegated[msg.sender];
        uint256 availableAmount = stakes[msg.sender] - alreadyDelegated;
        require(availableAmount >= amount, "Unavailable amount of FXAMORxGuild");

        delegators[to].push(msg.sender);
        delegations[msg.sender][to] += amount;
        amountDelegated[msg.sender] += amount;
    }

}
