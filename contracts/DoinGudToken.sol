// SPDX-License-Identifier: MIT

/// @title  DoinGud MetaDAO Token
/// @author @daoism.systems, lourenslinde
/// @notice ERC20 implementation for DoinGudDAO

/**
 *  @dev Implementation of the AMOR token for DoinGud MetaDAO
 *   
 *  The contract extends the ERC20Taxable contract and exposes the setTaxCollector() and
 *  setTaxRate() functions from the ERC20Taxable contract and allows for custom 
 *  require() statements within these functions. 
 *
 *  The setTaxCollector() and setTaxRate() functions should be set on deploy and are
 *  not immutable.
 */

pragma solidity ^0.8.4;

import "./ERC20Taxable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @custom:security-contact someone@daoism.systems
contract DoinGud is ERC20Taxable, Pausable, Ownable {

    constructor(address initCollector, uint256 initTaxRate) ERC20Taxable("DoinGud MetaDAO", "AMOR") {
        //  Pre-mint
        _mint(msg.sender, 10000000 * 10 ** decimals());
        //  Set the tax collector address on deploy
        setTaxCollector(initCollector);
        //  Set the tax rate on deploy
        setTaxRate(initTaxRate);
    }
    
    /// @notice Sets the tax rate for transfer and transferFrom
    /// @dev    Rate is expressed in basis points, this must be divided by 10 000 to equal desired rate
    /// @param  newRate uint256 representing new tax rate, must be <= 500
    function setTaxRate(uint256 newRate) public override returns (bool) {
        require(newRate <= 500, "tax rate > 5%");
        ERC20Taxable.setTaxRate(newRate);
        return true;
    }

    /// @notice Sets the address which receives taxes
    /// @param  newTaxCollector address which must receive taxes
    /// @return bool returns true if successfully set
    function setTaxCollector(address newTaxCollector) public override returns (bool) {
        require(newTaxCollector != address(this), "Cannot be token contract");
        ERC20Taxable.setTaxCollector(newTaxCollector);
        return true;
    }
    
    /// @notice Pause functionality for AMOR
    /// @dev    For security purposes, should there be an exploit.    
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