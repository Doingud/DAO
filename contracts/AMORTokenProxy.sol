// SPDX-License-Identifier: MIT

pragma solidity 0.8.14;

/// @title  Proxy (Storage Implementation) for DoinGudToken
/// @author Daoism Systems Team
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

import "./AMORToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract AMORTokenProxy is ERC1967Proxy, Ownable {
    /// @param  _logic the address of the implementation contract (DoinGudToken in this case)
    /// @param  _data if non-zero this data is forwarded in the delegateCall() to the implementation contract
    ///         this may be used to call the init() function in DoinGudToken.sol
    constructor(address _logic, bytes memory _data) payable ERC1967Proxy(_logic, _data) {
        _transferOwnership(msg.sender);
    }

    /// @notice Gets the implementation contract address
    /// @return address of the contract where function calls are being delegated to.
    function getImplementation() public view returns (address) {
        return _getImplementation();
    }

    /// @notice Upgrades the proxy to point to a new implementation address
    /// @param  _newImplementation The address of the upgraded logic contract
    function upgradeTo(address _newImplementation) public onlyOwner returns (bool) {
        _upgradeTo(_newImplementation);
        return true;
    }
}
