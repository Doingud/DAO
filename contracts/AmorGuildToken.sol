// SPDX-License-Identifier: MIT

/// @title  DoinGud Guild Token
/// @author @daoism.systems, lourenslinde
/// @notice ERC20 implementation for DoinGudDAO

/**
 *  @dev Implementation of the AMORxGuild token for DoinGud MetaDAO
 *   
 *  The contract is the base implementation for proxy deployments.
 *  The "Guild" will be unique to the Guild token being represented.
 *  As an example: AMORxHunger is the token for the End Hunger Guild 
 *
 *  The setTaxCollector() and setTaxRate() functions should be set on deploy and are
 *  not immutable.
 */
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// Interface to expose ERC20Taxable functions
import "./IERC20Taxable.sol";

/// Advanced math functions for bonding curve
import "./ABDKMath64x64.sol";

contract AMORxGuild is ERC20, Pausable, Ownable {
    using ABDKMath64x64 for uint256;

    IERC20Taxable private tokenAmor;

    constructor(address tokenAddress) ERC20("AMORxGuild", "AMORxGuild") {
        tokenAmor = IERC20Taxable(tokenAddress);
    }


    /// @notice Allows a user to stake their AMOR and receive AMORxGuild in return
    /// @param  to a parameter just like in doxygen (must be followed by parameter name)
    /// @param  amount uint256 amount of AMOR to be staked
    /// @return uint256 the amount of AMORxGuild received from staking
    function stakeAmor(address to, uint256 amount) public returns (uint256) {
        // Must calculate stakedAmor prior to transferFrom()
        uint256 stakedAmor = tokenAmor.balanceOf(address(this));

        require(tokenAmor.transferFrom(msg.sender, address(this), amount), "Unsufficient AMOR");

        uint256 mintAmount;
        mintAmount = (amount + stakedAmor).sqrtu() - stakedAmor.sqrtu();

        _mint(to, mintAmount);

        return mintAmount;
    }

    /// @notice Allows the user to unstake their AMOR
    /// @param  amount uint256 amount of AMORxGuild to exchange for AMOR
    /// @return uint256 the amount of AMOR returned from burning AMORxGuild
    function withdrawAmor(uint256 amount) public returns (uint256) {
        uint256 amorReturned;
        uint256 currentSupply = totalSupply();
        amorReturned = (currentSupply ** 2) - ((currentSupply - amount) ** 2);
        
        _burn(msg.sender, amount);

        /// Correct for the tax on transfer
        uint256 taxCorrection = (amorReturned * tokenAmor.viewRate()) / tokenAmor.viewBasisPoints();
        require(tokenAmor.transfer(msg.sender, amorReturned - taxCorrection), "transfer unsuccessful");

        return amorReturned;
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