// SPDX-License-Identifier: MIT

/**
 *  @dev Implementation of the FXAMORxGuild token for DoinGud
 *
 *  The contract houses the token logic for FXAMORxGuild.
 *
 */
pragma solidity 0.8.15;

interface IFXAMORxGuild {
    /// Events
    /// Emitted once token has been initialized
    event Initialized(bool success, address owner, address AMORxGuild);

    /// @notice Initializes the IFXAMORxGuild contract
    /// @dev    Sets the token details as well as the required addresses for token logic
    /// @param  AMORxGuild the address of the AMORxGuild
    /// @param  name the token name (e.g AMORxIMPACT)
    /// @param  symbol the token symbol
    function init(
        string memory name,
        string memory symbol,
        address initOwner,
        address AMORxGuild
    ) external;

    /// @notice Stake AMORxGuild and receive FXAMORxGuild in return
    /// @dev    Front end must still call approve() on AMORxGuild token to allow transferFrom()
    /// @param  to a parameter just like in doxygen (must be followed by parameter name)
    /// @param  amount uint256 amount of AMORxGuild to be staked
    /// @return uint256 the amount of AMORxGuild received from staking
    function stake(address to, uint256 amount) external returns (uint256);

    /// @notice Burns FXAMORxGuild tokens if they are being used for voting
    /// @dev When this tokens are burned, staked AMORxGuild is being transfered
    //       to the controller(contract that has a voting function)
    /// @param  account address from which must burn tokens
    /// @param  amount uint256 representing amount of burning tokens
    function burn(address account, uint256 amount) external;

    /// @notice Allows some external account to vote with your FXAMORxGuild tokens
    /// @param  to address to which delegate users FXAMORxGuild
    /// @param  amount uint256 representing amount of delegating tokens
    function delegate(address to, uint256 amount) external;

    /// @notice Unallows some external account to vote with your delegated FXAMORxGuild tokens
    /// @param  account address from which delegating will be taken away
    /// @param  amount uint256 representing amount of undelegating tokens
    function undelegate(address account, uint256 amount) external;
}
