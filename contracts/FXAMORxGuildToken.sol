pragma solidity 0.8.15;

// import "./ERC20Taxable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FXAMORxGuild is ERC20, Pausable, Ownable {
    mapping(address => uint256) private _balances;

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
        // send to FXAMORxGuild contract to stake
        require(IERC20(AMORxGuild).transferFrom(msg.sender, address(this), amount), "Unsufficient AMORxGuild");

        // mint FXAMORxGuild tokens to staker
        // Tokens are minted 1:1.
        _mint(to, amount);

        _balances[to] = amount;
        emit Staked(msg.sender, amount);

        return amount;
    }

    // function burns FXAMORxGuild tokens if they are being used for voting. 
    // When this tokens are burned, staked AMORxGuild is being transfered 
    // to the controller(contract that has a voting function)
    function burn(uint256 amount) public onlyAddress(_owner) {

        //burn used FXAMORxGuild tokens from staker
        _burn(msg.sender, amount);
        _balances[msg.sender] -= amount;

        IERC20(AMORxGuild).transferFrom(address(this), controller, amount);

        emit Burned(msg.sender, amount);
    }
    
    // already exists in ERC20Taxable
    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    // function that allows some external account to vote with your FXAMORxGuild tokens
    function delegate(address account) public {
        
    }

}