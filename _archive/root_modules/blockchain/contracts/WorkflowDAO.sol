// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

/**
 * WorkflowDAO Contract
 * Decentralized governance for the workflow platform
 */
contract WorkflowDAO is 
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    // Proposal types
    enum ProposalType {
        PARAMETER_CHANGE,
        FEATURE_REQUEST,
        WORKFLOW_VERIFICATION,
        TREASURY_ALLOCATION,
        EMERGENCY_ACTION
    }
    
    // Proposal metadata
    struct ProposalMetadata {
        ProposalType proposalType;
        string ipfsHash;
        address proposer;
        uint256 createdAt;
        bool executed;
    }
    
    // Treasury management
    address public treasury;
    uint256 public treasuryBalance;
    
    // Workflow verification registry
    mapping(uint256 => bool) public verifiedWorkflows;
    mapping(address => bool) public verifiedCreators;
    
    // Proposal tracking
    mapping(uint256 => ProposalMetadata) public proposalMetadata;
    uint256 public proposalCount;
    
    // Platform parameters (governable)
    uint256 public platformFee = 250; // 2.5%
    uint256 public minStakeAmount = 100 * 10**18; // 100 tokens
    uint256 public verificationReward = 10 * 10**18; // 10 tokens
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        ProposalType proposalType,
        string description
    );
    event WorkflowVerified(uint256 indexed workflowId, address indexed verifier);
    event CreatorVerified(address indexed creator, address indexed verifier);
    event TreasuryFunded(address indexed funder, uint256 amount);
    event TreasuryAllocated(address indexed recipient, uint256 amount, string purpose);
    event ParameterUpdated(string parameter, uint256 oldValue, uint256 newValue);
    
    constructor(
        IVotes _token,
        TimelockController _timelock
    ) 
        Governor("WorkflowDAO")
        GovernorSettings(
            1, // 1 block voting delay
            50400, // 1 week voting period (assuming 12s blocks)
            100000 * 10**18 // 100k token proposal threshold
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4) // 4% quorum
        GovernorTimelockControl(_timelock)
    {
        treasury = address(this);
    }
    
    /**
     * Create a proposal with metadata
     */
    function proposeWithMetadata(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        ProposalType proposalType,
        string memory ipfsHash
    ) public returns (uint256) {
        uint256 proposalId = propose(targets, values, calldatas, description);
        
        proposalMetadata[proposalId] = ProposalMetadata({
            proposalType: proposalType,
            ipfsHash: ipfsHash,
            proposer: msg.sender,
            createdAt: block.timestamp,
            executed: false
        });
        
        proposalCount++;
        
        emit ProposalCreated(proposalId, msg.sender, proposalType, description);
        
        return proposalId;
    }
    
    /**
     * Verify a workflow
     */
    function verifyWorkflow(uint256 workflowId) public onlyGovernance {
        require(!verifiedWorkflows[workflowId], "Already verified");
        
        verifiedWorkflows[workflowId] = true;
        
        // Reward the verifier (through a separate proposal)
        emit WorkflowVerified(workflowId, msg.sender);
    }
    
    /**
     * Verify a creator
     */
    function verifyCreator(address creator) public onlyGovernance {
        require(!verifiedCreators[creator], "Already verified");
        
        verifiedCreators[creator] = true;
        
        emit CreatorVerified(creator, msg.sender);
    }
    
    /**
     * Fund the treasury
     */
    function fundTreasury() public payable {
        require(msg.value > 0, "No funds sent");
        
        treasuryBalance += msg.value;
        
        emit TreasuryFunded(msg.sender, msg.value);
    }
    
    /**
     * Allocate treasury funds (only through governance)
     */
    function allocateTreasuryFunds(
        address recipient,
        uint256 amount,
        string memory purpose
    ) public onlyGovernance {
        require(amount <= treasuryBalance, "Insufficient treasury balance");
        
        treasuryBalance -= amount;
        payable(recipient).transfer(amount);
        
        emit TreasuryAllocated(recipient, amount, purpose);
    }
    
    /**
     * Update platform fee (only through governance)
     */
    function updatePlatformFee(uint256 newFee) public onlyGovernance {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        
        uint256 oldFee = platformFee;
        platformFee = newFee;
        
        emit ParameterUpdated("platformFee", oldFee, newFee);
    }
    
    /**
     * Update minimum stake amount (only through governance)
     */
    function updateMinStakeAmount(uint256 newAmount) public onlyGovernance {
        uint256 oldAmount = minStakeAmount;
        minStakeAmount = newAmount;
        
        emit ParameterUpdated("minStakeAmount", oldAmount, newAmount);
    }
    
    /**
     * Update verification reward (only through governance)
     */
    function updateVerificationReward(uint256 newReward) public onlyGovernance {
        uint256 oldReward = verificationReward;
        verificationReward = newReward;
        
        emit ParameterUpdated("verificationReward", oldReward, newReward);
    }
    
    /**
     * Emergency pause (only through governance with higher quorum)
     */
    function emergencyPause() public onlyGovernance {
        // Implementation would pause critical functions
        // This is a placeholder for emergency actions
    }
    
    /**
     * Get proposal details
     */
    function getProposalDetails(uint256 proposalId) public view returns (
        ProposalMetadata memory metadata,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        ProposalState proposalState
    ) {
        metadata = proposalMetadata[proposalId];
        (forVotes, againstVotes, abstainVotes) = proposalVotes(proposalId);
        proposalState = state(proposalId);
    }
    
    /**
     * Check if address can propose
     */
    function canPropose(address account) public view returns (bool) {
        return getVotes(account, block.number - 1) >= proposalThreshold();
    }
    
    // Required overrides
    function votingDelay()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor, IGovernor) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
        proposalMetadata[proposalId].executed = true;
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    // Receive function to accept ETH
    receive() external payable {
        fundTreasury();
    }
}