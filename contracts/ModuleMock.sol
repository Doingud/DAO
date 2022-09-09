// // SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.15;

import "@gnosis.pm/zodiac/contracts/core/Module.sol";
import "@gnosis.pm/zodiac/contracts/interfaces/IAvatar.sol";
import "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";

contract ModuleMock is Module {

    uint256 public testValues;
    constructor(address avatar, address target) {
        target = target;
        avatar = avatar;
        setUp("0x");
        _transferOwnership(avatar);
    }

    function setUp(bytes memory initializeParams) public override {

    }

    /// This function recreates the reality module's action once a vote has passed
    function executeAfterSuccessfulVote(address[] memory targets, uint256[] memory values, bytes[] calldata data, Enum.Operation operation) external returns (bool success) {
        success = IAvatar(avatar).execTransactionFromModule(avatar, 0, bytes(""), operation);
        return success;
    }

    function testInteraction(uint256 value) external returns (bool) {
        testValues = value;
        return true;
    }
}


// /// @title Module Interface - A contract that can pass messages to a Module Manager contract if enabled by that contract.
// pragma solidity >=0.7.0 <0.9.0;

// import "@openzeppelin/contracts/access/Ownable.sol";
// import "./utils/interfaces/IAvatar.sol";
// // import "../guard/Guardable.sol";
// import "@openzeppelin/contracts/access/AccessControl.sol";

// abstract contract Module is Ownable{//}, AccessControl {//Guardable {
// event ChangedGuard(address guard);

//     address public guard;

//     /// @dev Set a guard that checks transactions before execution
//     /// @param _guard The address of the guard to be used or the 0 address to disable the guard
//     function setGuard(address _guard) external onlyOwner {
//         if (_guard != address(0)) {
//             // require(
//             //     BaseGuard(_guard).supportsInterface(type(IGuard).interfaceId),
//             //     "Guard does not implement IERC165"
//             // );
//         }
//         guard = _guard;
//         emit ChangedGuard(guard);
//     }

//     function getGuard() external view returns (address _guard) {
//         return guard;
//     }




//     /// @dev Emitted each time the avatar is set.
//     event AvatarSet(address indexed previousAvatar, address indexed newAvatar);

//     /// @dev Address that this module will pass transactions to.
//     address public avatar;

//     /// @dev Sets the avatar to a new avatar (`newAvatar`).
//     /// @notice Can only be called by the current owner.
//     function setAvatar(address _avatar) public onlyOwner {
//         address previousAvatar = avatar;
//         avatar = _avatar;
//         emit AvatarSet(previousAvatar, _avatar);
//     }

//     function checkTransaction(
//         address to,
//         uint256 value,
//         bytes memory data,
//         Enum.Operation operation,
//         uint256 safeTxGas,
//         uint256 baseGas,
//         uint256 gasPrice,
//         address gasToken,
//         address payable refundReceiver,
//         bytes memory signatures,
//         address msgSender
//     ) external;
    
//     /// @dev Passes a transaction to be executed by the avatar.
//     /// @notice Can only be called by this contract.
//     /// @param to Destination address of module transaction.
//     /// @param value Ether value of module transaction.
//     /// @param data Data payload of module transaction.
//     /// @param operation Operation type of module transaction: 0 == call, 1 == delegate call.
//     function exec(
//         address to,
//         uint256 value,
//         bytes memory data,
//         Enum.Operation operation
//     ) internal returns (bool success) {
//         /// check if a transactioon guard is enabled.
//         // if (guard != address(0)) {
//         //     IGuard(guard).checkTransaction(
//         //         /// Transaction info used by module transactions
//         //         to,
//         //         value,
//         //         data,
//         //         operation,
//         //         /// Zero out the redundant transaction information only used for Safe multisig transctions
//         //         0,
//         //         0,
//         //         0,
//         //         address(0),
//         //         payable(0),
//         //         bytes("0x"),
//         //         address(0)
//         //     );
//         // }
//         success = IAvatar(avatar).execTransactionFromModule(
//             to,
//             value,
//             data,
//             operation
//         );
//         if (guard != address(0)) {
//             IGuard(guard).checkAfterExecution(bytes32("0x"), success);
//         }
//         return success;
//     }

//     /// @dev Passes a transaction to be executed by the avatar and returns data.
//     /// @notice Can only be called by this contract.
//     /// @param to Destination address of module transaction.
//     /// @param value Ether value of module transaction.
//     /// @param data Data payload of module transaction.
//     /// @param operation Operation type of module transaction: 0 == call, 1 == delegate call.
//     function execAndReturnData(
//         address to,
//         uint256 value,
//         bytes memory data,
//         Enum.Operation operation
//     ) internal returns (bool success, bytes memory returnData) {
//         /// check if a transactioon guard is enabled.
//         if (guard != address(0)) {
//             IGuard(guard).checkTransaction(
//                 /// Transaction info used by module transactions
//                 to,
//                 value,
//                 data,
//                 operation,
//                 /// Zero out the redundant transaction information only used for Safe multisig transctions
//                 0,
//                 0,
//                 0,
//                 address(0),
//                 payable(0),
//                 bytes("0x"),
//                 address(0)
//             );
//         }
//         (success, returnData) = IAvatar(avatar)
//             .execTransactionFromModuleReturnData(to, value, data, operation);
//         if (guard != address(0)) {
//             IGuard(guard).checkAfterExecution(bytes32("0x"), success);
//         }
//         return (success, returnData);
//     }
// }