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
pragma solidity 0.8.15;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// Interface to expose ERC20Taxable functions
import "./utils/interfaces/IERC20Taxable.sol";

/// Advanced math functions for bonding curve
import "./utils/ABDKMath64x64.sol";

import "./utils/ERC20Base.sol";

contract AMORxGuildToken is ERC20Base, Pausable, Ownable {
    using ABDKMath64x64 for uint256;

    bool private _initialized;

    /// The proxy contract address for AMOR
    IERC20Taxable private tokenAmor;
    /// The token logic for AMORxGuild
    address private _implementation;
    /// Co-efficient
    uint256 constant private COEFFICIENT = 10**9;

    error AlreadyInitialized();
    error UnsufficientAmount();

    /// Events
    /// Emitted once token has been initialized
    event Initialized(string name, string symbol, address amorToken);

    /// @notice Initializes the AMORxGuild contract
    /// @dev    Sets the token details as well as the required addresses for token logic
    /// @param  amorAddress the address of the AMOR token proxy
    /// @param  name the token name (e.g AMORxIMPACT)
    /// @param  symbol the token symbol
    function init(address amorAddress, string memory name, string memory symbol) public {
        if (_initialized) {
            revert AlreadyInitialized();
        }
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
        uint256 userAmor = tokenAmor.balanceOf(msg.sender);
        if (userAmor < amount ) {
            revert UnsufficientAmount();
        }
        //  Must calculate stakedAmor prior to transferFrom()
        uint256 stakedAmor = tokenAmor.balanceOf(address(this));

        //  Must have enough AMOR to stake
        //  Note that this transferFrom() is taxed
        tokenAmor.transferFrom(msg.sender, address(this), amount);

        //  Calculate mint amount and mint this to the address `to`
        uint256 mintAmount;
        //  Add co-efficient
        mintAmount = COEFFICIENT*((amount + stakedAmor).sqrtu() - stakedAmor.sqrtu());
        _mint(to, mintAmount);

        return mintAmount;
    }

    /// @notice Allows the user to unstake their AMOR
    /// @param  amount uint256 amount of AMORxGuild to exchange for AMOR
    /// @return uint256 the amount of AMOR returned from burning AMORxGuild
    function withdrawAmor(uint256 amount) public returns (uint256) {
        if (amount > balanceOf(msg.sender)) {
            revert UnsufficientAmount();
        }
        uint256 amorReturned;
        uint256 currentSupply = totalSupply();
        amorReturned = ((currentSupply ** 2) - ((currentSupply - amount) ** 2))/(COEFFICIENT**2);

        //  Burn the AMORxGuild of the tx.origin
        _burn(msg.sender, amount);

        //  Correct for the tax on transfer
        uint256 taxCorrection = (amorReturned * tokenAmor.viewRate()) / tokenAmor.viewBasisPoints();
        //  Transfer AMOR to the tx.origin, but note: this is taxed!
        tokenAmor.transfer(msg.sender, amorReturned - taxCorrection);
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