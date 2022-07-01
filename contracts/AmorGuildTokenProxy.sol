// SPDX-License-Identifier: MIT

pragma solidity 0.8.14;

/// @title  Proxy (Storage Implementation) for AMORxGuild Tokens
/// @author Daoism Systems
/// @notice Data storage for the DoingGud Guild (AMORxGuild) tokens
/// @dev    ERC1967 compliant, upgradeable proxy implementation

/*  
 *  The contract extends the ERC1967Proxy contract from OpenZeppelin.
 *  All calls to this contract (except getImplementation()) should 
 *  default to the fallback() function which calls delegateCall()
 *  to the implementation contract.
 *
 *  This proxy contract acts as the storage contract for the implementation contract.
*/

import "./AMORToken.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";

contract AmorGuildProxy is Proxy, ERC1967Upgrade {
    bool private _initialized;
    /**
     * @dev Initializes the upgradeable proxy with an initial implementation specified by `_logic`.
     *
     * If `_data` is nonempty, it's used as data in a delegate call to `_logic`. This will typically be an encoded
     * function call, and allows initializing the storage of the proxy like a Solidity constructor.
     */
    function initProxy(address _logic, bytes memory _data) public payable {
        require(!_initialized, "Already initialized");
        _upgradeToAndCall(_logic, _data, false);
        _initialized = true;
    }

    //  Uprade the token implementation
    //  Still needs access control
    function upgradeImplementation(address _newImplementation) public {
        _upgradeTo(_newImplementation);
    }

    //  View the current implementation
    function viewImplementation() public view returns (address) {
        return _getImplementation();
    }

    /**
     * @dev Returns the current implementation address.
     */
    function _implementation() internal view virtual override returns (address impl) {
        return ERC1967Upgrade._getImplementation();
    }
}