// SPDX-License-Identifier: MIT

/// @title  MetaDAO Controller
/// @author Daoism Systems Team
/// @custom security-contact contact@daoism.systems

/**
 *  @dev Implementation of the MetaDAO controller logic for DoinGud MetaDAO
 *
 *  The MetaDAO creates new guilds and collects fees from AMOR token transfers.
 *  The collected funds can then be claimed by guilds. 
 *  
 */

pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";


contract MetaDaoController is AccessControl {

    event proposalCreated(address proposedBy, bytes command);

    // Data struct for proposals 
    struct Proposal {
        address avatar;
        bytes command;  
        uint voteCount;  
        uint timeProposed;
        bool executed;
    }

    Proposal[] public proposals;

    address[] public guilds;
    //  Array of addresses of Guilds
    mapping(address => uint256) public guildWeight;
    //  The total weight of the guilds
    uint256 public guildsTotalWeight;

    // Mapping to keep track of which addresses already voted on a proposal
    mapping(uint => mapping(address => bool)) public voted;

    /// Donation distribution weights
    uint256 internal operationsWeight;
    uint256 internal buildersWeight;

    /// Time snapshot
    uint256 public claimStart;
    uint256 public claimDuration;

    /// Operations pool address
    address public operationsPool;
    /// Builders pool
    address public buildersPool;
    /// Clone Factory
    address public guildFactory;

    /// AMOR token
    IERC20 public amorToken;

    /// Roles
    bytes32 public constant GUILD_ROLE = keccak256("GUILD");
    Bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN");

    /// Errors
    error AlreadyDistributing();
    error InvalidClaim();

    constructor(address _amor, address _cloneFactory, address admin) {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        amorToken = IERC20(_amor);
        guildFactory = _cloneFactory;
        claimDuration = 5 days;
    }

    /// @notice Updates a guild's weight
    /// @param  newWeight the amount of staked AMORxGuild in this guild
    /// @return bool the guild's balance was updated successfully
    function updateGuildWeight(uint256 newWeight) external onlyRole(GUILD_ROLE) returns (bool) {
        /// If `distribute` is still in cooldown, or if the guild weight does not change
        if (guildWeight[msg.sender] == newWeight) {
            return false;
        }
        /// If the new weight is less than the current weight:
        /// Decrease the total guilds weight by the difference between the old and the new weight
        /// Update guildWeight
        if (guildWeight[msg.sender] > newWeight) {
            guildsTotalWeight -= (guildWeight[msg.sender] - newWeight);
            guildWeight[msg.sender] = newWeight;
            return true;
        }
        /// If not yet exited then newWeight > guildWeight
        /// Increase the total guild weight by the difference and set guildWeight == newWeight
        guildsTotalWeight += (newWeight - guildWeight[msg.sender]);
        guildWeight[msg.sender] = newWeight;
        return true;

    }

    /// @notice Explain to an end user what this does
    /// @dev Explain to a developer any extra details
    /// @param amount Amount of AMOR to be donated
    function donate(uint256 amount) public {
        uint256 distributedAmount = amount*operationsWeight/guildsTotalWeight;
        amorToken.transferFrom(msg.sender, operationsPool, distributedAmount);
        amorToken.transferFrom(msg.sender, buildersPool, amount-distributedAmount);
    }

    /// @notice Explain to an end user what this does
    /// @dev Explain to a developer any extra details
    function distribute() public {
        claimStart = block.timestamp;
        uint[] memory currentGuildWeight;
        for (uint i = 0; i < guilds.length; i++){
            currentGuildWeight[i] = guildWeight[guilds[i]];
        }
        


    }

    function _distribute(uint[] calldata _currentGuildWeight) internal {
         uint256 currentBalance = amorToken.balanceOf(address(this));
         uint256 totalAmmountSent;
        for (uint i = 0; i < guilds.length; i++){
            uint ammountToDistribute = _currentGuildWeight[i] * currentBalance;
            if(ammountToDistribute == 0) {
            continue;
             //it skip  to next iteration of loop
            }
            guildWeight[msg.sender] = 0;
            totalAmmountSent = totalAmmountSent + ammountToDistribute;
            amorToken.transfer(guilds[i], ammountToDistribute);

        }
        // Potential re-entrancy? May have to put state change inside Loop
        guildsTotalWeight -= totalAmmountSent;


    }

    /// @notice Explain to an end user what this does
    /// @dev Explain to a developer any extra details
    function claim() public {
        /// Calculate the claim amount
        uint256 amount = amorToken.balanceOf(address(this)) * guildWeight[msg.sender] / guildsTotalWeight;
        
        /// Revert if claimant has no claimable funds or no funds to distribute
        if (amount == 0) {
            revert InvalidClaim();
        }
        /// Update guildWeight and guildsTotalWeight
        guildWeight[msg.sender] = 0;
        guildsTotalWeight -= amount;

        /// Transfer the AMOR to the claimant
        amorToken.transfer(msg.sender, amount);
    }


    /// @notice Explain to an end user what this does
    /// @dev Explain to a developer any extra details
    /// @param name a parameter just like in doxygen (must be followed by parameter name)
    /// @param tokenSymbol the symbol for the Guild's token
    function createGuild(string memory name, string memory tokenSymbol) public {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "NOT_ADMIN");
        ICloneFactory(guildFactory).deployGuild(name,tokenSymbol);
        
        
    }



    /// @notice adds guild based on the controller address provided
    /// @dev Explain to a developer any extra details
    /// @param controller the controller address of the guild
    function addGuild(address controller) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "NOT_ADMIN");
        _setupRole(GUILD_ROLE, controller);
        guilds.push(controller);

    }

    /// @notice removes guild based on id
    /// @dev Explain to a developer any extra details
    /// @param id the index of the guild in guilds[]
    function removeGuild(uint256 id) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "NOT_ADMIN");

        require(id < guilds.length, "index out of bound");

        for (uint i = id; i < guilds.length - 1; i++) {
            guilds[i] = guilds[i + 1];
        }
        guilds.pop();

    }

    /// @notice addProposal on a proposal using the proposalId 
    /// @param command the funcationlity to be executed if the proposal passes
    function addProposal(bytes memory command)public{
        proposals.push(Proposal({
                avatar: avtar,
                command: command,
                voteCount: 0,
                timeProposed: block.timestamp,
                executed: false

            }));
            emit proposalCreated(msg.sender,command);
        
    }

    /// @notice voteForProposal on a proposal using the proposalId
    /// @param proposalId the id number used to retreive the proposal 
    function voteForProposal(uint proposalId)public{
        require(hasRole(GUARDIAN_ROLE, msg.sender), "NOT_GUARDIAN");
        Proposal storage currentProposal =  proposals[proposalId];
        require(!voted[proposalId][msg.sender], "Already Voted");
        currentProposal.voteCount += 1;
        voted[proposalId][msg.sender] = true;
    }


    /// @notice Execuded a proposal using the proposalId
    /// @dev Proposal must be executed in betweeen half a day and 2 weeks of being created
    /// @param proposalId the id number used to retreive the proposal 
    function executeProposal(uint proposalId)public{
        Proposal storage currentProposal =  proposals[proposalId];
        require(currentProposal.timeProposed + 0.5 days < block.timestamp, "1 day needs to pass");
        require(currentProposal.timeProposed + 2 weeks > block.timestamp, "Execution window elapsed");
        require(currentProposal.voteCount > 2000000000, "Vote threshold not reached");
        require(!currentProposal.executed, "Already executed");
        (bool success,) = currentProposal.avatar.call(currentProposal.command);
        require(success,"tx failed");
        currentProposal.executed = true;
        emit proposalExecuted(proposalId);

    }

}