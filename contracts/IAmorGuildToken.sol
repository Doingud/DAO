// SPDX-License-Identifier: MIT

/// @title  DoinGud Guild Token
/// @author @daoism.systems, lourenslinde
/// @notice ERC20 implementation for DoinGudDAO

/**
 *  @dev Implementation of the AMORxGuild token for DoinGud
 *   
 *  The contract houses the token logic for AMORxGuild. 
 *
 *  It varies from traditional ERC20 implementations by:
 *  1) Allowing the token name to be set with an `init()` function
 *  2) Allowing the token symbol to be set with an `init()` function
 *  3) Enables upgrades through updating the proxy
 */
pragma solidity 0.8.14;

interface IAmorxGuild {

    /// Events
    /// Emitted once token has been initialized
    event Initialized(string name, string symbol, address amorToken);
    
    /// AMOR has been staked
    event Stake(address indexed from, address to, uint256 indexed amount);
    
    /// AMOR has been withdrawn
    event Unstake(address indexed from, uint256 indexed amount);

    /// Proxy Address Change
    event ProxyAddressChange(address indexed newProxyAddress);

    function initProxy(address _logic, bytes memory _data) external;

    /// @notice Initializes the AMORxGuild contract
    /// @dev    Sets the token details as well as the required addresses for token logic
    /// @param  amorAddress the address of the AMOR token proxy
    /// @param  name the token name (e.g AMORxIMPACT)
    /// @param  symbol the token symbol
    function init(address amorAddress, string memory name, string memory symbol) external;


    /// @notice Allows a user to stake their AMOR and receive AMORxGuild in return
    /// @param  to a parameter just like in doxygen (must be followed by parameter name)
    /// @param  amount uint256 amount of AMOR to be staked
    /// @return uint256 the amount of AMORxGuild received from staking
    function stakeAmor(address to, uint256 amount) external returns (uint256);

    /// @notice Allows the user to unstake their AMOR
    /// @param  amount uint256 amount of AMORxGuild to exchange for AMOR
    /// @return uint256 the amount of AMOR returned from burning AMORxGuild
    function withdrawAmor(uint256 amount) external returns (uint256);

}