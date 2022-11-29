// SPDX-License-Identifier: MIT

/// @title  DoinGud dAMORxGuild Interface
/// @author Daoism Systems Team
pragma solidity 0.8.15;

interface IdAMORxGuild {
    /// Errors
    /// No tokens to undelegate
    error NoDelegation();
    /// Invalid address to transfer. Needed `to` != msg.sender
    error InvalidSender();
    /// Staking time provided is less than minimum
    error TimeTooSmall();
    /// Staking time provided is larger than maximum
    error TimeTooBig();
    /// Exceeded delegation limits
    error ExceededDelegationLimit();

    // Events
    event Initialized(address owner, address AMORxGuild, uint256 amount);
    event AMORxGuildStakedToDAMOR(
        address from,
        uint256 indexed amount,
        uint256 indexed mintAmount,
        uint256 indexed timeStakedFor
    );
    event AMORxGuildStakeIncreasedToDAMOR(
        address from,
        uint256 indexed amount,
        uint256 indexed mintAmount,
        uint256 indexed timeStakedFor
    );
    event AMORxGuildWithdrawnFromDAMOR(
        address to,
        uint256 indexed burnedDAMORxGuild,
        uint256 indexed returnedAMORxGuild
    );
    event dAMORxGuildUndelegated(address indexed from, address owner, uint256 indexed amount);
    event dAMORxGuildDelegated(address indexed to, address owner, uint256 indexed amount);

    struct Stakes {
        uint256 stakesTimes; // time staked for
        uint256 stakesAMOR; // all staker balance in AMORxGuild
    }

    /// @dev The init() function takes the place of the constructor.
    /// It can only be run once.
    function init(
        string memory name,
        string memory symbol,
        address initOwner,
        address _AMORxGuild,
        uint256 amount
    ) external;

    /// @notice Stakes AMORxGuild and receive dAMORxGuild in return
    /// Receives ERC20 AMORxGuild tokens, which are getting locked
    /// and generate dAMORxGuild tokens in return.
    /// Note: Tokens are minted following the formula
    /// @dev Front end must still call approve() on AMORxGuild token to allow transferFrom()
    /// @param  amount The amount of AMORxGuild/AMOR to be staked
    /// @param  time The period of time (in seconds) to stake for
    /// @return uint256 The amount of dAMORxGuild received from staking
    function stake(uint256 amount, uint256 time) external returns (uint256);

    /// @notice Increases stake of already staken AMORxGuild and receive dAMORxGuild in return
    /// @dev    Frontend must still call approve() on AMORxGuild token to allow transferFrom()
    /// @param  amount uint256 amount of dAMOR to be staked
    /// @return uint256 The amount of dAMORxGuild received from staking
    function increaseStake(uint256 amount) external returns (uint256);

    /// @notice Withdraws AMORxGuild tokens; burns dAMORxGuild
    /// @dev When this tokens are burned, staked AMORxGuild is being transfered
    ///      to the controller(contract that has a voting function)
    /// @return dAMORxGuildBurned amount of dAmorXGuild tokens burned
    /// @return AMORxGuildUnstaked amount of AMORxGuild tokens unstaked
    function withdraw() external returns (uint256 dAMORxGuildBurned, uint256 AMORxGuildUnstaked);

    /// @notice Delegate your dAMORxGuild to the address `account`
    /// @param to Address to which delegate users FXAMORxGuild
    /// @param amount The amount of tokens to delegate
    function delegate(address to, uint256 amount) external;

    /// @notice Undelegate your dAMORxGuild to the address `account`
    /// @param  account The address from which delegating will be taken away
    /// @param  amount The amount of tokens to undelegate
    function undelegate(address account, uint256 amount) external;

    /// @notice Undelegate all of your dAMORxGuild
    /// @param delegatees Array of addresses delegated to
    function undelegateAll(address[] memory delegatees) external;
}
