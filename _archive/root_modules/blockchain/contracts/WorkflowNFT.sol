// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * WorkflowNFT Contract
 * NFT representation of workflows for ownership, trading, and licensing
 */
contract WorkflowNFT is ERC721, ERC721URIStorage, ERC721Royalty, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    
    // Workflow metadata
    struct WorkflowMetadata {
        string name;
        string description;
        string category;
        uint256 version;
        address creator;
        uint256 createdAt;
        uint256 lastUpdated;
        bool isPublic;
        uint256 executionCount;
        uint256 rating;
        uint256 price;
    }
    
    // Licensing terms
    struct License {
        bool commercial;
        bool derivative;
        bool attribution;
        uint256 duration; // 0 for perpetual
        uint256 maxExecutions; // 0 for unlimited
        uint256 price;
    }
    
    // Execution rights
    struct ExecutionRights {
        address user;
        uint256 expiresAt;
        uint256 executionsRemaining;
        bool isActive;
    }
    
    // Mappings
    mapping(uint256 => WorkflowMetadata) public workflows;
    mapping(uint256 => License) public licenses;
    mapping(uint256 => mapping(address => ExecutionRights)) public executionRights;
    mapping(address => uint256[]) public userWorkflows;
    mapping(string => bool) public workflowHashExists;
    
    // Revenue sharing
    mapping(uint256 => address[]) public revenueRecipients;
    mapping(uint256 => uint256[]) public revenueShares;
    
    // Events
    event WorkflowMinted(uint256 indexed tokenId, address indexed creator, string name);
    event WorkflowUpdated(uint256 indexed tokenId, uint256 version);
    event LicenseGranted(uint256 indexed tokenId, address indexed licensee, uint256 duration);
    event WorkflowExecuted(uint256 indexed tokenId, address indexed executor, uint256 remaining);
    event RatingUpdated(uint256 indexed tokenId, uint256 newRating);
    event RevenueDistributed(uint256 indexed tokenId, uint256 amount);
    
    constructor() ERC721("WorkflowNFT", "WFLOW") {}
    
    /**
     * Mint new workflow NFT
     */
    function mintWorkflow(
        string memory name,
        string memory description,
        string memory category,
        string memory uri,
        string memory workflowHash,
        bool isPublic,
        uint256 price,
        uint96 royaltyFee
    ) public nonReentrant returns (uint256) {
        require(!workflowHashExists[workflowHash], "Workflow already exists");
        require(royaltyFee <= 1000, "Royalty fee too high"); // Max 10%
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        
        // Set royalty (royaltyFee is in basis points, e.g., 250 = 2.5%)
        _setTokenRoyalty(tokenId, msg.sender, royaltyFee);
        
        workflows[tokenId] = WorkflowMetadata({
            name: name,
            description: description,
            category: category,
            version: 1,
            creator: msg.sender,
            createdAt: block.timestamp,
            lastUpdated: block.timestamp,
            isPublic: isPublic,
            executionCount: 0,
            rating: 0,
            price: price
        });
        
        userWorkflows[msg.sender].push(tokenId);
        workflowHashExists[workflowHash] = true;
        
        emit WorkflowMinted(tokenId, msg.sender, name);
        
        return tokenId;
    }
    
    /**
     * Update workflow (only by owner)
     */
    function updateWorkflow(
        uint256 tokenId,
        string memory newUri,
        string memory newDescription,
        uint256 newPrice
    ) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        
        _setTokenURI(tokenId, newUri);
        workflows[tokenId].description = newDescription;
        workflows[tokenId].price = newPrice;
        workflows[tokenId].version++;
        workflows[tokenId].lastUpdated = block.timestamp;
        
        emit WorkflowUpdated(tokenId, workflows[tokenId].version);
    }
    
    /**
     * Set licensing terms
     */
    function setLicense(
        uint256 tokenId,
        bool commercial,
        bool derivative,
        bool attribution,
        uint256 duration,
        uint256 maxExecutions,
        uint256 price
    ) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        
        licenses[tokenId] = License({
            commercial: commercial,
            derivative: derivative,
            attribution: attribution,
            duration: duration,
            maxExecutions: maxExecutions,
            price: price
        });
    }
    
    /**
     * Purchase execution rights
     */
    function purchaseExecutionRights(
        uint256 tokenId,
        uint256 duration,
        uint256 executions
    ) public payable nonReentrant {
        License memory license = licenses[tokenId];
        require(license.price > 0, "License not set");
        require(msg.value >= license.price, "Insufficient payment");
        
        uint256 expiresAt = duration > 0 ? block.timestamp + duration : 0;
        uint256 executionsGranted = executions > 0 ? executions : license.maxExecutions;
        
        executionRights[tokenId][msg.sender] = ExecutionRights({
            user: msg.sender,
            expiresAt: expiresAt,
            executionsRemaining: executionsGranted,
            isActive: true
        });
        
        // Distribute payment
        _distributeRevenue(tokenId, msg.value);
        
        emit LicenseGranted(tokenId, msg.sender, duration);
    }
    
    /**
     * Execute workflow (requires rights)
     */
    function executeWorkflow(uint256 tokenId) public {
        WorkflowMetadata storage workflow = workflows[tokenId];
        ExecutionRights storage rights = executionRights[tokenId][msg.sender];
        
        // Check if public or has execution rights
        if (!workflow.isPublic) {
            require(
                ownerOf(tokenId) == msg.sender || rights.isActive,
                "No execution rights"
            );
            
            if (rights.isActive) {
                require(
                    rights.expiresAt == 0 || block.timestamp <= rights.expiresAt,
                    "License expired"
                );
                
                if (rights.executionsRemaining > 0) {
                    rights.executionsRemaining--;
                    if (rights.executionsRemaining == 0) {
                        rights.isActive = false;
                    }
                }
            }
        }
        
        workflow.executionCount++;
        
        emit WorkflowExecuted(tokenId, msg.sender, rights.executionsRemaining);
    }
    
    /**
     * Rate workflow
     */
    function rateWorkflow(uint256 tokenId, uint256 rating) public {
        require(rating >= 1 && rating <= 5, "Invalid rating");
        require(executionRights[tokenId][msg.sender].isActive || 
                ownerOf(tokenId) == msg.sender, "No rights to rate");
        
        WorkflowMetadata storage workflow = workflows[tokenId];
        
        // Simple average rating (in production, use weighted average)
        if (workflow.rating == 0) {
            workflow.rating = rating * 100; // Store as rating * 100 for precision
        } else {
            workflow.rating = (workflow.rating + rating * 100) / 2;
        }
        
        emit RatingUpdated(tokenId, workflow.rating);
    }
    
    /**
     * Set revenue sharing
     */
    function setRevenueSharing(
        uint256 tokenId,
        address[] memory recipients,
        uint256[] memory shares
    ) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(recipients.length == shares.length, "Mismatched arrays");
        
        uint256 totalShares = 0;
        for (uint256 i = 0; i < shares.length; i++) {
            totalShares += shares[i];
        }
        require(totalShares == 10000, "Shares must total 100%");
        
        revenueRecipients[tokenId] = recipients;
        revenueShares[tokenId] = shares;
    }
    
    /**
     * Distribute revenue
     */
    function _distributeRevenue(uint256 tokenId, uint256 amount) private {
        address[] memory recipients = revenueRecipients[tokenId];
        uint256[] memory shares = revenueShares[tokenId];
        
        if (recipients.length == 0) {
            // Default: all to owner
            payable(ownerOf(tokenId)).transfer(amount);
        } else {
            // Distribute according to shares
            for (uint256 i = 0; i < recipients.length; i++) {
                uint256 share = (amount * shares[i]) / 10000;
                payable(recipients[i]).transfer(share);
            }
        }
        
        emit RevenueDistributed(tokenId, amount);
    }
    
    /**
     * Get user's workflows
     */
    function getUserWorkflows(address user) public view returns (uint256[] memory) {
        return userWorkflows[user];
    }
    
    /**
     * Get workflow details
     */
    function getWorkflowDetails(uint256 tokenId) public view returns (
        WorkflowMetadata memory metadata,
        License memory license,
        string memory uri
    ) {
        metadata = workflows[tokenId];
        license = licenses[tokenId];
        uri = tokenURI(tokenId);
    }
    
    /**
     * Check execution rights
     */
    function hasExecutionRights(uint256 tokenId, address user) public view returns (bool) {
        WorkflowMetadata memory workflow = workflows[tokenId];
        
        if (workflow.isPublic) return true;
        if (ownerOf(tokenId) == user) return true;
        
        ExecutionRights memory rights = executionRights[tokenId][user];
        return rights.isActive && 
               (rights.expiresAt == 0 || block.timestamp <= rights.expiresAt) &&
               (rights.executionsRemaining == 0 || rights.executionsRemaining > 0);
    }
    
    // Required overrides
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage, ERC721Royalty) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Royalty) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}