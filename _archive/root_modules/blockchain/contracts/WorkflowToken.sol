// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * WorkflowToken Contract
 * Governance and utility token for the workflow platform
 */
contract WorkflowToken is 
    ERC20,
    ERC20Burnable,
    ERC20Snapshot,
    ERC20Votes,
    ERC20Permit,
    AccessControl,
    Pausable
{
    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant STAKING_ROLE = keccak256("STAKING_ROLE");
    
    // Staking data
    struct StakeInfo {
        uint256 amount;
        uint256 timestamp;
        uint256 lockPeriod;
        uint256 rewardDebt;
        bool isActive;
    }
    
    mapping(address => StakeInfo) public stakes;
    uint256 public totalStaked;
    uint256 public rewardPerSecond = 1 * 10**15; // 0.001 tokens per second
    uint256 public lastRewardTime;
    uint256 public accRewardPerShare;
    
    // Token economics
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10**18; // 100 million tokens
    
    // Fee distribution
    address public treasuryAddress;
    address public rewardsPool;
    uint256 public platformFeeShare = 3000; // 30%
    uint256 public stakingRewardShare = 5000; // 50%
    uint256 public burnShare = 2000; // 20%
    
    // Vesting
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 startTime;
        uint256 duration;
        uint256 cliff;
        bool revocable;
        bool revoked;
    }
    
    mapping(address => VestingSchedule[]) public vestingSchedules;
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 lockPeriod);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    event RewardsClaimed(address indexed user, uint256 reward);
    event VestingCreated(address indexed beneficiary, uint256 amount, uint256 duration);
    event VestingReleased(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary);
    event FeeDistributed(uint256 treasury, uint256 rewards, uint256 burned);
    
    constructor(
        address _treasury,
        address _rewardsPool
    ) 
        ERC20("WorkflowToken", "WFLOW")
        ERC20Permit("WorkflowToken")
    {
        treasuryAddress = _treasury;
        rewardsPool = _rewardsPool;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(SNAPSHOT_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(STAKING_ROLE, address(this));
        
        // Mint initial supply
        _mint(msg.sender, INITIAL_SUPPLY);
        
        lastRewardTime = block.timestamp;
    }
    
    // Minting (controlled)
    
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }
    
    // Staking functions
    
    function stake(uint256 amount, uint256 lockPeriod) public whenNotPaused {
        require(amount > 0, "Cannot stake 0");
        require(lockPeriod >= 0 && lockPeriod <= 365 days, "Invalid lock period");
        
        updateRewards();
        
        if (stakes[msg.sender].isActive) {
            // Claim pending rewards first
            claimRewards();
            stakes[msg.sender].amount += amount;
        } else {
            stakes[msg.sender] = StakeInfo({
                amount: amount,
                timestamp: block.timestamp,
                lockPeriod: lockPeriod,
                rewardDebt: stakes[msg.sender].amount * accRewardPerShare / 1e12,
                isActive: true
            });
        }
        
        _transfer(msg.sender, address(this), amount);
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, lockPeriod);
    }
    
    function unstake(uint256 amount) public {
        StakeInfo storage stakeInfo = stakes[msg.sender];
        require(stakeInfo.isActive, "No active stake");
        require(stakeInfo.amount >= amount, "Insufficient staked amount");
        require(
            block.timestamp >= stakeInfo.timestamp + stakeInfo.lockPeriod,
            "Still in lock period"
        );
        
        updateRewards();
        
        uint256 pending = pendingRewards(msg.sender);
        
        stakeInfo.amount -= amount;
        if (stakeInfo.amount == 0) {
            stakeInfo.isActive = false;
        }
        
        totalStaked -= amount;
        
        _transfer(address(this), msg.sender, amount);
        
        if (pending > 0) {
            _mint(msg.sender, pending);
        }
        
        stakeInfo.rewardDebt = stakeInfo.amount * accRewardPerShare / 1e12;
        
        emit Unstaked(msg.sender, amount, pending);
    }
    
    function claimRewards() public {
        updateRewards();
        
        uint256 pending = pendingRewards(msg.sender);
        require(pending > 0, "No rewards to claim");
        
        stakes[msg.sender].rewardDebt = stakes[msg.sender].amount * accRewardPerShare / 1e12;
        
        _mint(msg.sender, pending);
        
        emit RewardsClaimed(msg.sender, pending);
    }
    
    function pendingRewards(address user) public view returns (uint256) {
        StakeInfo memory stakeInfo = stakes[user];
        if (!stakeInfo.isActive) return 0;
        
        uint256 _accRewardPerShare = accRewardPerShare;
        
        if (block.timestamp > lastRewardTime && totalStaked > 0) {
            uint256 timeDiff = block.timestamp - lastRewardTime;
            uint256 reward = timeDiff * rewardPerSecond;
            _accRewardPerShare += reward * 1e12 / totalStaked;
        }
        
        return stakeInfo.amount * _accRewardPerShare / 1e12 - stakeInfo.rewardDebt;
    }
    
    function updateRewards() private {
        if (block.timestamp <= lastRewardTime) return;
        
        if (totalStaked == 0) {
            lastRewardTime = block.timestamp;
            return;
        }
        
        uint256 timeDiff = block.timestamp - lastRewardTime;
        uint256 reward = timeDiff * rewardPerSecond;
        accRewardPerShare += reward * 1e12 / totalStaked;
        lastRewardTime = block.timestamp;
    }
    
    // Vesting functions
    
    function createVesting(
        address beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 duration,
        uint256 cliff,
        bool revocable
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(amount > 0, "Amount must be > 0");
        require(duration > 0, "Duration must be > 0");
        require(cliff <= duration, "Cliff must be <= duration");
        
        vestingSchedules[beneficiary].push(VestingSchedule({
            totalAmount: amount,
            releasedAmount: 0,
            startTime: startTime,
            duration: duration,
            cliff: cliff,
            revocable: revocable,
            revoked: false
        }));
        
        _transfer(msg.sender, address(this), amount);
        
        emit VestingCreated(beneficiary, amount, duration);
    }
    
    function releaseVesting(uint256 scheduleIndex) public {
        VestingSchedule storage schedule = vestingSchedules[msg.sender][scheduleIndex];
        require(!schedule.revoked, "Vesting revoked");
        
        uint256 releasable = releasableAmount(msg.sender, scheduleIndex);
        require(releasable > 0, "No tokens to release");
        
        schedule.releasedAmount += releasable;
        _transfer(address(this), msg.sender, releasable);
        
        emit VestingReleased(msg.sender, releasable);
    }
    
    function releasableAmount(address beneficiary, uint256 scheduleIndex) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary][scheduleIndex];
        
        if (schedule.revoked) return 0;
        
        if (block.timestamp < schedule.startTime + schedule.cliff) {
            return 0;
        }
        
        uint256 elapsedTime = block.timestamp - schedule.startTime;
        uint256 vested;
        
        if (elapsedTime >= schedule.duration) {
            vested = schedule.totalAmount;
        } else {
            vested = schedule.totalAmount * elapsedTime / schedule.duration;
        }
        
        return vested - schedule.releasedAmount;
    }
    
    function revokeVesting(address beneficiary, uint256 scheduleIndex) public onlyRole(DEFAULT_ADMIN_ROLE) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary][scheduleIndex];
        require(schedule.revocable, "Vesting not revocable");
        require(!schedule.revoked, "Already revoked");
        
        uint256 releasable = releasableAmount(beneficiary, scheduleIndex);
        uint256 refund = schedule.totalAmount - schedule.releasedAmount - releasable;
        
        schedule.revoked = true;
        
        if (releasable > 0) {
            schedule.releasedAmount += releasable;
            _transfer(address(this), beneficiary, releasable);
        }
        
        if (refund > 0) {
            _transfer(address(this), msg.sender, refund);
        }
        
        emit VestingRevoked(beneficiary);
    }
    
    // Fee distribution
    
    function distributeFees(uint256 amount) public {
        require(amount > 0, "Amount must be > 0");
        
        uint256 treasuryAmount = amount * platformFeeShare / 10000;
        uint256 rewardsAmount = amount * stakingRewardShare / 10000;
        uint256 burnAmount = amount * burnShare / 10000;
        
        if (treasuryAmount > 0) {
            _transfer(msg.sender, treasuryAddress, treasuryAmount);
        }
        
        if (rewardsAmount > 0) {
            _transfer(msg.sender, rewardsPool, rewardsAmount);
        }
        
        if (burnAmount > 0) {
            _burn(msg.sender, burnAmount);
        }
        
        emit FeeDistributed(treasuryAmount, rewardsAmount, burnAmount);
    }
    
    // Governance functions
    
    function snapshot() public onlyRole(SNAPSHOT_ROLE) returns (uint256) {
        return _snapshot();
    }
    
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    function updateRewardRate(uint256 newRate) public onlyRole(DEFAULT_ADMIN_ROLE) {
        updateRewards();
        rewardPerSecond = newRate;
    }
    
    function updateFeeShares(
        uint256 _platformFee,
        uint256 _stakingReward,
        uint256 _burn
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_platformFee + _stakingReward + _burn == 10000, "Must total 100%");
        
        platformFeeShare = _platformFee;
        stakingRewardShare = _stakingReward;
        burnShare = _burn;
    }
    
    function updateTreasury(address newTreasury) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), "Invalid address");
        treasuryAddress = newTreasury;
    }
    
    function updateRewardsPool(address newPool) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newPool != address(0), "Invalid address");
        rewardsPool = newPool;
    }
    
    // View functions
    
    function getStakeInfo(address user) public view returns (
        uint256 amount,
        uint256 timestamp,
        uint256 lockPeriod,
        uint256 pendingReward,
        bool canUnstake
    ) {
        StakeInfo memory info = stakes[user];
        amount = info.amount;
        timestamp = info.timestamp;
        lockPeriod = info.lockPeriod;
        pendingReward = pendingRewards(user);
        canUnstake = block.timestamp >= info.timestamp + info.lockPeriod;
    }
    
    function getVestingSchedules(address beneficiary) public view returns (VestingSchedule[] memory) {
        return vestingSchedules[beneficiary];
    }
    
    function circulatingSupply() public view returns (uint256) {
        return totalSupply() - balanceOf(address(this));
    }
    
    // Required overrides
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Snapshot) whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
    
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }
    
    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }
    
    function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }
}