// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * WorkflowExecutor Contract
 * Decentralized workflow execution with validation and rewards
 */
contract WorkflowExecutor is AccessControl, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    
    // Roles
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    
    // Executor data
    struct Executor {
        address operator;
        uint256 stake;
        uint256 reputation;
        uint256 executionsCompleted;
        uint256 executionsFailed;
        uint256 lastExecutionTime;
        bool isActive;
        string endpoint;
    }
    
    // Execution request
    struct ExecutionRequest {
        uint256 workflowId;
        address requester;
        bytes inputData;
        uint256 gasLimit;
        uint256 reward;
        uint256 deadline;
        ExecutionStatus status;
        address assignedExecutor;
        uint256 requestTime;
    }
    
    // Execution result
    struct ExecutionResult {
        bytes32 requestId;
        bytes outputData;
        uint256 gasUsed;
        bool success;
        string errorMessage;
        uint256 executionTime;
        bytes32 proofHash;
    }
    
    // Validation
    struct ValidationRequest {
        bytes32 executionId;
        address validator;
        bool approved;
        string feedback;
        uint256 timestamp;
    }
    
    enum ExecutionStatus {
        PENDING,
        ASSIGNED,
        EXECUTING,
        COMPLETED,
        FAILED,
        DISPUTED,
        VALIDATED
    }
    
    // State variables
    mapping(address => Executor) public executors;
    mapping(bytes32 => ExecutionRequest) public executionRequests;
    mapping(bytes32 => ExecutionResult) public executionResults;
    mapping(bytes32 => ValidationRequest[]) public validations;
    mapping(address => bytes32[]) public executorAssignments;
    
    uint256 public minStakeAmount = 10 ether;
    uint256 public executorRewardShare = 8000; // 80%
    uint256 public validatorRewardShare = 1500; // 15%
    uint256 public protocolFeeShare = 500; // 5%
    uint256 public slashingPercentage = 1000; // 10%
    uint256 public minReputation = 0;
    uint256 public validationsRequired = 2;
    
    address public treasury;
    uint256 public totalStaked;
    uint256 public executionNonce;
    
    // Events
    event ExecutorRegistered(address indexed executor, uint256 stake);
    event ExecutorSlashed(address indexed executor, uint256 amount, string reason);
    event ExecutionRequested(bytes32 indexed requestId, uint256 workflowId, address requester);
    event ExecutionAssigned(bytes32 indexed requestId, address indexed executor);
    event ExecutionCompleted(bytes32 indexed requestId, bool success);
    event ValidationSubmitted(bytes32 indexed executionId, address indexed validator, bool approved);
    event RewardsDistributed(bytes32 indexed requestId, uint256 executorReward, uint256 validatorReward);
    event DisputeRaised(bytes32 indexed executionId, address indexed disputer);
    
    constructor(address _treasury) {
        treasury = _treasury;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }
    
    // Executor Management
    
    function registerExecutor(string memory endpoint) public payable nonReentrant {
        require(msg.value >= minStakeAmount, "Insufficient stake");
        require(!executors[msg.sender].isActive, "Already registered");
        
        executors[msg.sender] = Executor({
            operator: msg.sender,
            stake: msg.value,
            reputation: 100, // Starting reputation
            executionsCompleted: 0,
            executionsFailed: 0,
            lastExecutionTime: 0,
            isActive: true,
            endpoint: endpoint
        });
        
        totalStaked += msg.value;
        _grantRole(EXECUTOR_ROLE, msg.sender);
        
        emit ExecutorRegistered(msg.sender, msg.value);
    }
    
    function addStake() public payable {
        require(executors[msg.sender].isActive, "Not registered");
        require(msg.value > 0, "Invalid amount");
        
        executors[msg.sender].stake += msg.value;
        totalStaked += msg.value;
    }
    
    function withdrawStake(uint256 amount) public nonReentrant {
        Executor storage executor = executors[msg.sender];
        require(executor.isActive, "Not registered");
        require(executor.stake - amount >= minStakeAmount, "Below minimum stake");
        require(executorAssignments[msg.sender].length == 0, "Has active assignments");
        
        executor.stake -= amount;
        totalStaked -= amount;
        
        payable(msg.sender).transfer(amount);
    }
    
    function deregisterExecutor() public {
        Executor storage executor = executors[msg.sender];
        require(executor.isActive, "Not registered");
        require(executorAssignments[msg.sender].length == 0, "Has active assignments");
        
        uint256 stake = executor.stake;
        executor.isActive = false;
        executor.stake = 0;
        totalStaked -= stake;
        
        _revokeRole(EXECUTOR_ROLE, msg.sender);
        
        payable(msg.sender).transfer(stake);
    }
    
    // Execution Flow
    
    function requestExecution(
        uint256 workflowId,
        bytes memory inputData,
        uint256 gasLimit,
        uint256 deadline
    ) public payable nonReentrant returns (bytes32) {
        require(msg.value > 0, "No reward provided");
        require(deadline > block.timestamp, "Invalid deadline");
        
        bytes32 requestId = keccak256(
            abi.encodePacked(workflowId, msg.sender, executionNonce++, block.timestamp)
        );
        
        executionRequests[requestId] = ExecutionRequest({
            workflowId: workflowId,
            requester: msg.sender,
            inputData: inputData,
            gasLimit: gasLimit,
            reward: msg.value,
            deadline: deadline,
            status: ExecutionStatus.PENDING,
            assignedExecutor: address(0),
            requestTime: block.timestamp
        });
        
        emit ExecutionRequested(requestId, workflowId, msg.sender);
        
        return requestId;
    }
    
    function assignExecution(bytes32 requestId, address executor) public onlyRole(ORACLE_ROLE) {
        ExecutionRequest storage request = executionRequests[requestId];
        require(request.status == ExecutionStatus.PENDING, "Invalid status");
        require(executors[executor].isActive, "Executor not active");
        require(executors[executor].reputation >= minReputation, "Low reputation");
        
        request.status = ExecutionStatus.ASSIGNED;
        request.assignedExecutor = executor;
        executorAssignments[executor].push(requestId);
        
        emit ExecutionAssigned(requestId, executor);
    }
    
    function submitExecutionResult(
        bytes32 requestId,
        bytes memory outputData,
        uint256 gasUsed,
        bool success,
        string memory errorMessage,
        bytes32 proofHash
    ) public onlyRole(EXECUTOR_ROLE) {
        ExecutionRequest storage request = executionRequests[requestId];
        require(request.assignedExecutor == msg.sender, "Not assigned executor");
        require(request.status == ExecutionStatus.ASSIGNED, "Invalid status");
        require(block.timestamp <= request.deadline, "Past deadline");
        
        request.status = ExecutionStatus.EXECUTING;
        
        executionResults[requestId] = ExecutionResult({
            requestId: requestId,
            outputData: outputData,
            gasUsed: gasUsed,
            success: success,
            errorMessage: errorMessage,
            executionTime: block.timestamp,
            proofHash: proofHash
        });
        
        if (success) {
            request.status = ExecutionStatus.COMPLETED;
            executors[msg.sender].executionsCompleted++;
        } else {
            request.status = ExecutionStatus.FAILED;
            executors[msg.sender].executionsFailed++;
        }
        
        executors[msg.sender].lastExecutionTime = block.timestamp;
        
        // Remove from assignments
        removeAssignment(msg.sender, requestId);
        
        emit ExecutionCompleted(requestId, success);
    }
    
    // Validation
    
    function validateExecution(
        bytes32 requestId,
        bool approved,
        string memory feedback
    ) public onlyRole(VALIDATOR_ROLE) {
        ExecutionRequest storage request = executionRequests[requestId];
        require(
            request.status == ExecutionStatus.COMPLETED || 
            request.status == ExecutionStatus.FAILED,
            "Invalid status"
        );
        
        // Check if validator already validated
        ValidationRequest[] storage vals = validations[requestId];
        for (uint i = 0; i < vals.length; i++) {
            require(vals[i].validator != msg.sender, "Already validated");
        }
        
        vals.push(ValidationRequest({
            executionId: requestId,
            validator: msg.sender,
            approved: approved,
            feedback: feedback,
            timestamp: block.timestamp
        }));
        
        emit ValidationSubmitted(requestId, msg.sender, approved);
        
        // Check if enough validations
        if (vals.length >= validationsRequired) {
            processValidations(requestId);
        }
    }
    
    function processValidations(bytes32 requestId) private {
        ValidationRequest[] memory vals = validations[requestId];
        uint256 approvals = 0;
        
        for (uint i = 0; i < vals.length; i++) {
            if (vals[i].approved) {
                approvals++;
            }
        }
        
        ExecutionRequest storage request = executionRequests[requestId];
        
        if (approvals >= validationsRequired) {
            request.status = ExecutionStatus.VALIDATED;
            distributeRewards(requestId);
        } else {
            request.status = ExecutionStatus.DISPUTED;
            // Slash executor
            slashExecutor(request.assignedExecutor, "Validation failed");
        }
    }
    
    // Rewards & Slashing
    
    function distributeRewards(bytes32 requestId) private {
        ExecutionRequest storage request = executionRequests[requestId];
        ExecutionResult memory result = executionResults[requestId];
        
        uint256 totalReward = request.reward;
        uint256 executorReward = totalReward * executorRewardShare / 10000;
        uint256 validatorReward = totalReward * validatorRewardShare / 10000;
        uint256 protocolFee = totalReward * protocolFeeShare / 10000;
        
        // Pay executor
        if (result.success && request.assignedExecutor != address(0)) {
            payable(request.assignedExecutor).transfer(executorReward);
            
            // Increase reputation
            executors[request.assignedExecutor].reputation += 10;
        }
        
        // Pay validators
        ValidationRequest[] memory vals = validations[requestId];
        uint256 rewardPerValidator = validatorReward / vals.length;
        
        for (uint i = 0; i < vals.length; i++) {
            if (vals[i].approved) {
                payable(vals[i].validator).transfer(rewardPerValidator);
            }
        }
        
        // Protocol fee to treasury
        if (protocolFee > 0) {
            payable(treasury).transfer(protocolFee);
        }
        
        emit RewardsDistributed(requestId, executorReward, validatorReward);
    }
    
    function slashExecutor(address executor, string memory reason) private {
        Executor storage exec = executors[executor];
        uint256 slashAmount = exec.stake * slashingPercentage / 10000;
        
        if (slashAmount > exec.stake) {
            slashAmount = exec.stake;
        }
        
        exec.stake -= slashAmount;
        exec.reputation = exec.reputation > 20 ? exec.reputation - 20 : 0;
        
        totalStaked -= slashAmount;
        
        // Transfer slashed amount to treasury
        payable(treasury).transfer(slashAmount);
        
        emit ExecutorSlashed(executor, slashAmount, reason);
        
        // Deactivate if stake below minimum
        if (exec.stake < minStakeAmount) {
            exec.isActive = false;
            _revokeRole(EXECUTOR_ROLE, executor);
        }
    }
    
    // Dispute Resolution
    
    function raiseDispute(bytes32 executionId, string memory reason) public {
        ExecutionRequest storage request = executionRequests[executionId];
        require(request.requester == msg.sender, "Not requester");
        require(
            request.status == ExecutionStatus.COMPLETED || 
            request.status == ExecutionStatus.FAILED,
            "Invalid status"
        );
        
        request.status = ExecutionStatus.DISPUTED;
        
        emit DisputeRaised(executionId, msg.sender);
    }
    
    function resolveDispute(
        bytes32 executionId,
        bool favorRequester
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        ExecutionRequest storage request = executionRequests[executionId];
        require(request.status == ExecutionStatus.DISPUTED, "Not disputed");
        
        if (favorRequester) {
            // Refund requester
            payable(request.requester).transfer(request.reward);
            
            // Slash executor
            if (request.assignedExecutor != address(0)) {
                slashExecutor(request.assignedExecutor, "Dispute resolved against executor");
            }
        } else {
            // Process normal rewards
            distributeRewards(executionId);
        }
        
        request.status = ExecutionStatus.VALIDATED;
    }
    
    // Helper Functions
    
    function removeAssignment(address executor, bytes32 requestId) private {
        bytes32[] storage assignments = executorAssignments[executor];
        
        for (uint i = 0; i < assignments.length; i++) {
            if (assignments[i] == requestId) {
                assignments[i] = assignments[assignments.length - 1];
                assignments.pop();
                break;
            }
        }
    }
    
    // View Functions
    
    function getExecutorDetails(address executor) public view returns (
        uint256 stake,
        uint256 reputation,
        uint256 completed,
        uint256 failed,
        bool isActive,
        uint256 activeAssignments
    ) {
        Executor memory exec = executors[executor];
        return (
            exec.stake,
            exec.reputation,
            exec.executionsCompleted,
            exec.executionsFailed,
            exec.isActive,
            executorAssignments[executor].length
        );
    }
    
    function getExecutionDetails(bytes32 requestId) public view returns (
        ExecutionRequest memory request,
        ExecutionResult memory result,
        uint256 validationCount
    ) {
        return (
            executionRequests[requestId],
            executionResults[requestId],
            validations[requestId].length
        );
    }
    
    function getActiveExecutors() public view returns (address[] memory) {
        // This is a simplified implementation
        // In production, maintain a separate array of active executors
        address[] memory active = new address[](0);
        return active;
    }
    
    // Admin Functions
    
    function updateParameters(
        uint256 _minStake,
        uint256 _executorShare,
        uint256 _validatorShare,
        uint256 _protocolShare,
        uint256 _slashingPercentage,
        uint256 _minReputation,
        uint256 _validationsRequired
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_executorShare + _validatorShare + _protocolShare == 10000, "Invalid shares");
        
        minStakeAmount = _minStake;
        executorRewardShare = _executorShare;
        validatorRewardShare = _validatorShare;
        protocolFeeShare = _protocolShare;
        slashingPercentage = _slashingPercentage;
        minReputation = _minReputation;
        validationsRequired = _validationsRequired;
    }
    
    function updateTreasury(address _treasury) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_treasury != address(0), "Invalid address");
        treasury = _treasury;
    }
    
    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    // Emergency Functions
    
    function emergencyWithdraw() public onlyRole(DEFAULT_ADMIN_ROLE) {
        payable(treasury).transfer(address(this).balance);
    }
}