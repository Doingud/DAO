// SPDX-License-Identifier: MIT

/// @title  DoinGud Guild Controller Interface
/// @author Daoism Systems Team

/**
 *  @dev Interface for the DoinGud Guild Controller
 */
pragma solidity 0.8.15;

interface IGuildController {
    function init(
        address initOwner,
        address AMOR_,
        address AMORxGuild_,
        address FXAMORxGuild_,
        address MetaDaoController_
    ) external returns (bool);

    function setVotingPeriod(uint256 newTime) external;

    /// @notice allows to donate AMORxGuild tokens to the Guild
    /// @param amount The amount to donate
    // It automatically distributes tokens between Impact makers.
    // 10% of the tokens in the impact pool are getting staked in the FXAMORxGuild tokens,
    // which are going to be owned by the user.
    // Afterwards, based on the weights distribution, tokens will be automatically redirected to the impact makers.
    function donate(uint256 amount, address token) external returns (uint256);

    /// @notice removes impact makers, resets mapping and array, and creates new array, mapping, and sets weights
    /// @param arrImpactMakers The array of impact makers
    /// @param arrWeight The array of weights of impact makers
    function setImpactMakers(address[] memory arrImpactMakers, uint256[] memory arrWeight) external;

    /// @notice allows to add impactMaker with a specific weight
    /// Only avatar can add one, based on the popular vote
    /// @param impactMaker New impact maker to be added
    /// @param weight Weight of the impact maker
    function addImpactMaker(address impactMaker, uint256 weight) external;

    /// @notice allows to add change impactMaker weight
    /// @param impactMaker Impact maker to be changed
    /// @param weight Weight of the impact maker
    function changeImpactMaker(address impactMaker, uint256 weight) external;

    /// @notice allows to remove impactMaker with specific address
    /// @param impactMaker Impact maker to be removed
    function removeImpactMaker(address impactMaker) external;

    /// @notice allows to claim tokens for ImpactMaker address
    /// @param token Tokens addresess to claim
    function claim(address[] memory token) external;

    function gatherDonation(address token) external;
}
