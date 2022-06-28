// SPDX-License-Identifier: MIT

/// @title  DoinGud Guild Token
/// @author Daoism Systems
/// @notice ERC20 implementation for DoinGudDAO

/**
 *  @dev Implementation of the AMORXGuild token for DoinGud
 *   
 *  The contract houses the token logic for AMORxGuild. 
 *
 *  It varies from traditional ERC20 implementations by:
 *  1) Allowing the token name to be set with an `init()` function
 *  2) Allowing the token symbol to be set with an `init()` function
 *  3) Enables upgrades through updating the proxy
 */
pragma solidity 0.8.14;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// Interface to expose ERC20Taxable functions
import "./IERC20Taxable.sol";

/// Advanced math functions for bonding curve
import "./ABDKMath64x64.sol";

import "./ERC20Base.sol";

contract AMORxGuild is ERC20Base, Pausable, Ownable {
    using ABDKMath64x64 for uint256;

    bool private _initialized;

    /// The proxy contract address for AMOR
    IERC20Taxable private tokenAmor;
    /// The token logic for AMORxGuild
    address private _implementation;

    /// Events
    /// Emitted once token has been initialized
    event Initialized(string name, string symbol, address amorToken);
    
    /// AMOR has been staked
    event Stake(address indexed from, address to, uint256 indexed amount);
    
    /// AMOR has been withdrawn
    event Unstake(address indexed from, uint256 indexed amount);

    /// @notice Initializes the AMORxGuild contract
    /// @dev    Sets the token details as well as the required addresses for token logic
    /// @param  amorAddress the address of the AMOR token proxy
    /// @param  name the token name (e.g AMORxIMPACT)
    /// @param  symbol the token symbol
    function init(address amorAddress, string memory name, string memory symbol) public {
        require(!_initialized, "already initialized");
        _setAmorAddress(amorAddress);
        //_setImplementationAddress(implementationAddress);
        _setTokenDetail(name, symbol);
        _initialized = true;
        emit Initialized(name, symbol, amorAddress);
    }


    /// @notice Allows a user to stake their AMOR and receive AMORxGuild in return
    /// @param  to a parameter just like in doxygen (must be followed by parameter name)
    /// @param  amount uint256 amount of AMOR to be staked
    /// @return uint256 the amount of AMORxGuild received from staking
    function stakeAmor(address to, uint256 amount) public returns (uint256) {
        //  Must calculate stakedAmor prior to transferFrom()
        uint256 stakedAmor = tokenAmor.balanceOf(address(this));

        //  Must has enough AMOR to stake
        //  Note that this transferFrom() is taxed
        require(tokenAmor.transferFrom(tx.origin, address(this), amount), "Unsufficient AMOR");

        //  Calculate mint amount and mint this to the address `to`
        uint256 mintAmount;
        mintAmount = (amount + stakedAmor).sqrtu() - stakedAmor.sqrtu();
        _mint(to, mintAmount);

        //  Emit the `Stake` event
        emit Stake(tx.origin, to, amount);
        return mintAmount;
    }

    /// @notice Allows the user to unstake their AMOR
    /// @param  amount uint256 amount of AMORxGuild to exchange for AMOR
    /// @return uint256 the amount of AMOR returned from burning AMORxGuild
    function withdrawAmor(uint256 amount) public returns (uint256) {
        uint256 amorReturned;
        uint256 currentSupply = totalSupply();
        amorReturned = (currentSupply ** 2) - ((currentSupply - amount) ** 2);
        
        //  Burn the AMORxGuild of the tx.origin
        _burn(tx.origin, amount);

        //  Correct for the tax on transfer
        uint256 taxCorrection = (amorReturned * tokenAmor.viewRate()) / tokenAmor.viewBasisPoints();
        //  Transfer AMOR to the tx.origin, but note: this is taxed!
        require(tokenAmor.transfer(tx.origin, amorReturned - taxCorrection), "transfer unsuccessful");
        //  Emit the `Unstake` event
        emit Unstake(tx.origin, amount);
        //  Return the amount of AMOR returned to the user 
        return amorReturned-taxCorrection;
    }

    function _setAmorAddress(address _token) internal {
        tokenAmor = IERC20Taxable(_token);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, amount);
    }
}