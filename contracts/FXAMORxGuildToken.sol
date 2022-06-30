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
    mapping(address => uint256) public amountDelegated;

    string private _name;
    string private _symbol;

    address public _owner; //GuildController
    address public AMORxGuild; 
    address public controller; //contract that has a voting function

    error Unauthorized();

    /// Invalid balance to transfer. Needed `minRequired` but sent `amount`
    /// @param sent sent amount.
    /// @param minRequired minimum amount to send.
    error InvalidAmount (uint256 sent, uint256 minRequired);

    /// Invalid address. Needed address != address(0)
    error AddressZero();

    /// Invalid address to transfer. Needed `to` != msg.sender
    error InvalidSender();

    constructor(string memory name_, string memory symbol_, address owner, address AMORxGuild_) ERC20(name_, symbol_) {
        _owner = msg.sender;
        AMORxGuild = AMORxGuild_;
        _name = name_;
        _symbol = symbol_;
    }

    function setController(address _controller) external onlyAddress(_owner) {
        if(_controller == address(0)) {
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
    /// @dev    Front end must still call approve() on AMORxGuild token to allow transferFrom()
    /// @param  to a parameter just like in doxygen (must be followed by parameter name)
    /// @param  amount uint256 amount of AMORxGuild to be staked
    /// @return uint256 the amount of AMORxGuild received from staking
    function stake(address to, uint256 amount) external onlyAddress(_owner) returns (uint256) {
        if(to == msg.sender) {
            revert InvalidSender();
        }
        if(to == address(0)) {
            revert AddressZero();
        }

        if(IERC20(AMORxGuild).balanceOf(msg.sender) < amount){
            revert InvalidAmount(amount, IERC20(AMORxGuild).balanceOf(msg.sender));
        }
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
        if(stakes[account] < amount) {
            revert InvalidAmount(amount, stakes[account]);
        }
        //burn used FXAMORxGuild tokens from staker
        _burn(account, amount);
        stakes[account] -= amount;
        IERC20(AMORxGuild).transfer(controller, amount);
    }

    // already exists in ERC20Taxable
    function balanceOf(address account) public view override returns (uint256) {
        return stakes[account];
    }

    // function that allows some external account to vote with your FXAMORxGuild tokens
    // Delegate your FXAMORxGuild to the address `to`.
    function delegate(address to, uint256 amount) external {
        if(to == msg.sender) {
            revert InvalidSender();
        }
        if(to == address(0)) {
            revert AddressZero();
        }

        uint256 alreadyDelegated = amountDelegated[msg.sender];
        uint256 availableAmount = stakes[msg.sender] - alreadyDelegated;
        if(availableAmount < amount) {
            revert InvalidAmount(amount, availableAmount);
        }

        delegators[to].push(msg.sender);
        delegations[msg.sender][to] += amount;
        amountDelegated[msg.sender] += amount;
    }

}
