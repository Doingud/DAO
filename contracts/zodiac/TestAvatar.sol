// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0;

contract TestAvatar {
    // address public module;
    mapping(address => address) internal modules;
    address internal constant SENTINEL_MODULES = address(0x1);

    receive() external payable {}

    /// Custom errors
    /// Error if the AvatarxGuild has already been initialized
    error NotEnabled();
    error InvalidParameters();
    error NotWhitelisted();


    function setModule(address module) external {
        modules[SENTINEL_MODULES] = address(0x02);

        // module = _module;
        modules[module] = modules[SENTINEL_MODULES];
        modules[SENTINEL_MODULES] = module;
    }

    function addModule(address module) external {
        // Module address cannot be null or sentinel.
        if (module == address(0) || module == SENTINEL_MODULES) {
            revert NotEnabled();
        }
        // Module cannot be added twice.
        if (modules[module] != address(0)) {
            revert InvalidParameters();
        }
        modules[module] = modules[SENTINEL_MODULES];
        modules[SENTINEL_MODULES] = module;
    }

    function exec(
        address payable to,
        uint256 value,
        bytes calldata data
    ) external {
        bool success;
        bytes memory response;
        (success, response) = to.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(response, 0x20), mload(response))
            }
        }
    }

    function execTransactionFromModule(
        address payable to,
        uint256 value,
        bytes calldata data,
        uint8 operation
    ) external returns (bool success) {
        // require(msg.sender == module, "Not authorized");
        if (msg.sender == SENTINEL_MODULES || modules[msg.sender] == address(0)) {
            revert NotWhitelisted();
        }
        if (operation == 1) (success, ) = to.delegatecall(data);
        else (success, ) = to.call{value: value}(data);
    }
}
