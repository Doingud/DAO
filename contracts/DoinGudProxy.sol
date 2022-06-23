// SPDX-License-Identifier: MIT

pragma solidity 0.8.14;

/// @title  Proxy (Storage Implementation) for DoinGudToken
/// @author daoism.systems, lourenslinde,
/// @notice Data storage for the DoingGud MetaDAO (AMOR) token
/// @dev    ERC1967 compliant, upgradeable proxy implementation

/*  
 *  The contract extends the ERC1967Proxy contract from OpenZeppelin.
 *  All calls to this contract (except getImplementation()) should 
 *  default to the fallback() function which calls delegateCall()
 *  to the implementation contract.
 *
 *  This proxy contract acts as the storage contract for the implementation contract.
*/

import "./DoinGudToken.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DoinGudProxy is ERC1967Proxy {
    
    /// @param  _logic the address of the implementation contract (DoinGudToken in this case)
    /// @param  _data if non-zero this data is forwarded in the delegateCall() to the implementation contract
    ///         this may be used to call the init() function in DoinGudToken.sol
    constructor(address _logic, bytes memory _data) ERC1967Proxy(_logic, _data) payable {
    }

    /// @notice Gets the implementation contract address
    /// @return address of the contract where function calls are being delegated to.
    function getImplementation() public view returns (address) {
        return _getImplementation();
    }

}