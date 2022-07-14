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
import "./utils/interfaces/IAmorToken.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// Advanced math functions for bonding curve
import "./utils/ABDKMath64x64.sol";

import "./utils/ERC20Base.sol";

contract AMORxGuildToken is ERC20Base, Pausable, Ownable {
    using ABDKMath64x64 for uint256;
    using SafeERC20 for IERC20;

    bool private _initialized;

    /// The proxy contract address for AMOR
    IAmorToken private tokenAmor;
    IERC20 private safeAmor;
    /// Co-efficient
    uint256 private constant COEFFICIENT = 10**9;

    /// Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint8 public taxRate;

    /// Custom errors
    /// Error if the AmorxGuild has already been initialized
    error AlreadyInitialized();
    /// Error if unsufficient token amount for transfer
    error UnsufficientAmount();
    /// New rate above maximum
    error InvalidTaxRate();

    /// Events
    /// Emitted once token has been initialized
    event Initialized(string name, string symbol, address amorToken);

    /// @notice Initializes the AMORxGuild contract
    /// @dev    Sets the token details as well as the required addresses for token logic
    /// @param  amorAddress the address of the AMOR token proxy
    /// @param  name the token name (e.g AMORxIMPACT)
    /// @param  symbol the token symbol
    function init(
        address amorAddress,
        string memory name,
        string memory symbol
    ) public {
        if (_initialized) {
            revert AlreadyInitialized();
        }
        tokenAmor = IAmorToken(amorAddress);
        safeAmor = IERC20(address(tokenAmor));
        //_setImplementationAddress(implementationAddress);
        _setTokenDetail(name, symbol);
        _initialized = true;
        emit Initialized(name, symbol, amorAddress);
    }

    /// @notice Sets the tax on staking AMORxGuild
    /// @dev    Requires the new tax rate in basis points, where each point equals 0.01% change
    /// @param  newRate uint8 representing the new tax rate expressed in basis points.
    function setTax(uint8 newRate) public onlyOwner {
        if (newRate > 2000) {
            revert InvalidTaxRate();
        }

        taxRate = newRate;
    }

    /// @notice Allows a user to stake their AMOR and receive AMORxGuild in return
    /// @param  to a parameter just like in doxygen (must be followed by parameter name)
    /// @param  amount uint256 amount of AMOR to be staked
    /// @return uint256 the amount of AMORxGuild received from staking
    function stakeAmor(address to, uint256 amount) public whenNotPaused returns (uint256) {
        uint256 userAmor = tokenAmor.balanceOf(msg.sender);
        if (userAmor < amount) {
            revert UnsufficientAmount();
        }
        //  Must calculate stakedAmor prior to transferFrom()
        uint256 stakedAmor = tokenAmor.balanceOf(address(this));

        //  Must have enough AMOR to stake
        //  Note that this transferFrom() is taxed
        safeAmor.safeTransferFrom(msg.sender, address(this), amount);

        //  Calculate mint amount and mint this to the address `to`
        uint256 mintAmount = COEFFICIENT * ((amount + stakedAmor).sqrtu() - stakedAmor.sqrtu());
        _mint(to, mintAmount);

        return mintAmount;
    }

    /// @notice Allows the user to unstake their AMOR
    /// @param  amount uint256 amount of AMORxGuild to exchange for AMOR
    /// @return uint256 the amount of AMOR returned from burning AMORxGuild
    function withdrawAmor(uint256 amount) public whenNotPaused returns (uint256) {
        if (amount > balanceOf(msg.sender)) {
            revert UnsufficientAmount();
        }
        uint256 amorReturned;
        uint256 currentSupply = totalSupply();
        amorReturned = ((currentSupply**2) - ((currentSupply - amount)**2)) / (COEFFICIENT**2);

        //  Burn the AMORxGuild of the tx.origin
        _burn(msg.sender, amount);

        //  Correct for the tax on transfer
        uint256 taxCorrection = (amorReturned * tokenAmor.taxRate()) / tokenAmor.BASIS_POINTS();
        //  Transfer AMOR to the tx.origin, but note: this is taxed!
        safeAmor.safeTransfer(msg.sender, amorReturned - taxCorrection);
        //  Return the amount of AMOR returned to the user
        return amorReturned - taxCorrection;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}
