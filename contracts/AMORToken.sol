// SPDX-License-Identifier: MIT

/// @title  DoinGud MetaDAO Token Logic
/// @author Daoism Systems
/// @notice ERC20 implementation for DoinGudDAO
/// @custom security-contact contact@daoism.systems

/**
 *  @dev Implementation of the AMOR token Logic for DoinGud MetaDAO
 *
 *  The Token Logic contract is referenced by the proxy (storage) implementation.
 *
 *  This contract must not store data!
 *
 *  The contract extends the ERC20Taxable contract and exposes the setTaxCollector() and
 *  setTaxRate() functions from the ERC20Taxable contract and allows for custom
 *  require() statements within these functions.
 *
 *  The setTaxCollector() and setTaxRate() functions should be set on deploy and are
 *  not immutable.
 */

pragma solidity 0.8.14;

import "./ERC20Taxable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AMORToken is ERC20Taxable, Pausable, Ownable {
    error InvalidRate();

    error InvalidTaxCollector();

    event Initialized(bool success, address taxCollector, uint256 rate);

    bool private _initialized;

    /*  @dev    The init() function takes the place of the constructor.
     *          It can only be run once.
     */
    function init(
        string memory name,
        string memory symbol,
        address _initCollector,
        uint256 _initTaxRate,
        address _multisig
    ) external returns (bool) {
        require(!_initialized, "Already initialized");
        //  Set the owner to the Multisig
        _transferOwnership(_multisig);
        //  Set the name and symbol
        _name = name;
        _symbol = symbol;
        //  Pre-mint to the multisig address
        _mint(_multisig, 10000000 * 10**decimals());
        //  Set the tax collector address
        setTaxCollector(_initCollector);
        //  Set the tax rate
        setTaxRate(_initTaxRate);
        _initialized = true;
        emit Initialized(_initialized, _initCollector, _initTaxRate);
        return true;
    }

    /// @notice Sets the tax rate for transfer and transferFrom
    /// @dev    Rate is expressed in basis points, this must be divided by 10 000 to equal desired rate
    /// @param  newRate uint256 representing new tax rate, must be <= 500
    function setTaxRate(uint256 newRate) public override onlyOwner {
        if (newRate > 500) {
            revert InvalidRate();
        }
        ERC20Taxable.setTaxRate(newRate);
    }

    /// @notice Sets the address which receives taxes
    /// @param  newTaxCollector address which must receive taxes
    function updateController(address newTaxCollector) public onlyOwner {
        if (newTaxCollector == address(this)) {
            revert InvalidTaxCollector();
        }
        ERC20Taxable.setTaxCollector(newTaxCollector);
    }

    /// @notice Pause functionality for AMOR
    /// @dev    For security purposes, should there be an exploit.
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}
