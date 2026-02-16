/**
 * Advanced Rate Limiting and Throttling System
 * Enterprise-grade rate limiting with multiple strategies and distributed support
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { logger } from '../services/SimpleLogger';

export interface RateLimitConfig {
  strategy: RateLimitStrategy;
  limits: RateLimitRule[];
  storage: 'memory' | 'redis' | 'database';
  enableDistributed: boolean;
  syncInterval?: number;
  whitelist?: string[];
  blacklist?: string[];
  customRules?: CustomRateRule[];
  penalties?: PenaltyConfig;
  monitoring?: MonitoringConfig;
}

export type RateLimitStrategy = 
  | 'token-bucket'
  | 'sliding-window'
  | 'fixed-window'
  | 'leaky-bucket'
  | 'adaptive'
  | 'hybrid';

export interface RateLimitRule {
  id: string;
  name: string;
  resource: string;
  limit: number;
  window: number; // in milliseconds
  tier?: 'free' | 'basic' | 'premium' | 'enterprise';
  method?: string[];
  paths?: string[];
  headers?: Record<string, string>;
  priority?: number;
  burst?: number;
  cost?: number;
  shared?: boolean;
}

export interface CustomRateRule {
  id: string;
  name: string;
  condition: (context: RateLimitContext) => boolean;
  limit: (context: RateLimitContext) => RateLimitRule;
}

export interface PenaltyConfig {
  enabled: boolean;
  thresholds: {
    warning: number;
    throttle: number;
    block: number;
  };
  durations: {
    throttle: number;
    block: number;
  };
  escalation: boolean;
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsInterval: number;
  alertThreshold: number;
  webhooks?: string[];
}

export interface RateLimitContext {
  identifier: string;
  ip?: string;
  userId?: string;
  apiKey?: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  tier?: string;
  metadata?: any;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
  reason?: string;
  penalty?: 'none' | 'throttled' | 'blocked';
}

export interface RateLimitMetrics {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  throttledRequests: number;
  averageLatency: number;
  peakUsage: number;
  uniqueIdentifiers: number;
  violations: ViolationRecord[];
}

export interface ViolationRecord {
  identifier: string;
  timestamp: Date;
  rule: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TokenBucket {
  tokens: number;
  capacity: number;
  refillRate: number;
  lastRefill: number;
}

export interface SlidingWindow {
  requests: Array<{ timestamp: number; weight: number }>;
  windowSize: number;
}

export interface LeakyBucket {
  queue: Array<{ timestamp: number; weight: number }>;
  capacity: number;
  leakRate: number;
  lastLeak: number;
}

export class RateLimitingSystem extends EventEmitter {
  private config: RateLimitConfig;
  private buckets: Map<string, TokenBucket> = new Map();
  private windows: Map<string, SlidingWindow> = new Map();
  private leakyBuckets: Map<string, LeakyBucket> = new Map();
  private penalties: Map<string, PenaltyStatus> = new Map();
  private metrics: Map<string, RateLimitMetrics> = new Map();
  private rules: Map<string, RateLimitRule> = new Map();
  private customRules: CustomRateRule[] = [];
  private syncTimer?: NodeJS.Timeout;

  constructor(config?: Partial<RateLimitConfig>) {
    super();
    this.config = {
      strategy: 'token-bucket',
      limits: this.getDefaultLimits(),
      storage: 'memory',
      enableDistributed: false,
      whitelist: [],
      blacklist: [],
      penalties: {
        enabled: true,
        thresholds: {
          warning: 0.8,
          throttle: 0.9,
          block: 1.0
        },
        durations: {
          throttle: 60000, // 1 minute
          block: 300000 // 5 minutes
        },
        escalation: true
      },
      monitoring: {
        enabled: true,
        metricsInterval: 60000,
        alertThreshold: 0.9
      },
      ...config
    };

    this.initialize();
  }

  /**
   * Initialize rate limiting system
   */
  private initialize(): void {
    // Load rate limit rules
    this.config.limits.forEach(rule => {
      this.rules.set(rule.id, rule);
    });

    // Load custom rules
    if (this.config.customRules) {
      this.customRules = this.config.customRules;
    }

    // Start distributed sync if enabled
    if (this.config.enableDistributed) {
      this.startDistributedSync();
    }

    // Start metrics collection
    if (this.config.monitoring?.enabled) {
      this.startMetricsCollection();
    }

    logger.info('Rate limiting system initialized');
  }

  /**
   * Check rate limit
   */
  async checkLimit(context: RateLimitContext): Promise<RateLimitResult> {
    // Check whitelist
    if (this.isWhitelisted(context)) {
      return this.allowRequest(context);
    }

    // Check blacklist
    if (this.isBlacklisted(context)) {
      return this.blockRequest(context, 'Blacklisted');
    }

    // Check penalties
    const penalty = this.checkPenalty(context.identifier);
    if (penalty?.status === 'blocked') {
      return this.blockRequest(context, 'Temporarily blocked due to violations');
    }

    // Get applicable rule
    const rule = this.getApplicableRule(context);
    if (!rule) {
      return this.allowRequest(context);
    }

    // Apply rate limiting based on strategy
    let result: RateLimitResult;
    
    switch (this.config.strategy) {
      case 'token-bucket':
        result = await this.tokenBucketLimit(context, rule);
        break;
      case 'sliding-window':
        result = await this.slidingWindowLimit(context, rule);
        break;
      case 'fixed-window':
        result = await this.fixedWindowLimit(context, rule);
        break;
      case 'leaky-bucket':
        result = await this.leakyBucketLimit(context, rule);
        break;
      case 'adaptive':
        result = await this.adaptiveLimit(context, rule);
        break;
      case 'hybrid':
        result = await this.hybridLimit(context, rule);
        break;
      default:
        result = await this.tokenBucketLimit(context, rule);
    }

    // Apply throttling if needed
    if (penalty?.status === 'throttled') {
      result = this.applyThrottling(result);
    }

    // Update metrics
    this.updateMetrics(context, result);

    // Check for violations
    if (!result.allowed) {
      this.handleViolation(context, rule);
    }

    // Emit events
    this.emit('rate-limit:checked', { context, result });

    return result;
  }

  /**
   * Token bucket rate limiting
   */
  private async tokenBucketLimit(
    context: RateLimitContext,
    rule: RateLimitRule
  ): Promise<RateLimitResult> {
    const key = this.getKey(context, rule);
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: rule.limit,
        capacity: rule.limit,
        refillRate: rule.limit / rule.window,
        lastRefill: Date.now()
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = (elapsed / 1000) * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if request can be served
    const cost = rule.cost || 1;
    
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      
      return {
        allowed: true,
        limit: rule.limit,
        remaining: Math.floor(bucket.tokens),
        reset: new Date(now + rule.window)
      };
    }

    // Calculate retry after
    const tokensNeeded = cost - bucket.tokens;
    const retryAfter = Math.ceil((tokensNeeded / bucket.refillRate) * 1000);

    return {
      allowed: false,
      limit: rule.limit,
      remaining: 0,
      reset: new Date(now + rule.window),
      retryAfter,
      reason: 'Rate limit exceeded'
    };
  }

  /**
   * Sliding window rate limiting
   */
  private async slidingWindowLimit(
    context: RateLimitContext,
    rule: RateLimitRule
  ): Promise<RateLimitResult> {
    const key = this.getKey(context, rule);
    let window = this.windows.get(key);

    if (!window) {
      window = {
        requests: [],
        windowSize: rule.window
      };
      this.windows.set(key, window);
    }

    const now = Date.now();
    const windowStart = now - rule.window;

    // Remove old requests
    window.requests = window.requests.filter(r => r.timestamp > windowStart);

    // Calculate current usage
    const currentUsage = window.requests.reduce((sum, r) => sum + r.weight, 0);
    const cost = rule.cost || 1;

    if (currentUsage + cost <= rule.limit) {
      // Add new request
      window.requests.push({ timestamp: now, weight: cost });
      
      return {
        allowed: true,
        limit: rule.limit,
        remaining: rule.limit - currentUsage - cost,
        reset: new Date(now + rule.window)
      };
    }

    // Find when the oldest request will expire
    const oldestRequest = window.requests[0];
    const retryAfter = oldestRequest ? oldestRequest.timestamp + rule.window - now : rule.window;

    return {
      allowed: false,
      limit: rule.limit,
      remaining: 0,
      reset: new Date(now + retryAfter),
      retryAfter,
      reason: 'Rate limit exceeded'
    };
  }

  /**
   * Fixed window rate limiting
   */
  private async fixedWindowLimit(
    context: RateLimitContext,
    rule: RateLimitRule
  ): Promise<RateLimitResult> {
    const key = this.getKey(context, rule);
    const now = Date.now();
    const windowStart = Math.floor(now / rule.window) * rule.window;
    const windowKey = `${key}:${windowStart}`;

    const count = this.getWindowCount(windowKey);
    const cost = rule.cost || 1;

    if (count + cost <= rule.limit) {
      this.incrementWindowCount(windowKey, cost);
      
      return {
        allowed: true,
        limit: rule.limit,
        remaining: rule.limit - count - cost,
        reset: new Date(windowStart + rule.window)
      };
    }

    const retryAfter = windowStart + rule.window - now;

    return {
      allowed: false,
      limit: rule.limit,
      remaining: 0,
      reset: new Date(windowStart + rule.window),
      retryAfter,
      reason: 'Rate limit exceeded'
    };
  }

  /**
   * Leaky bucket rate limiting
   */
  private async leakyBucketLimit(
    context: RateLimitContext,
    rule: RateLimitRule
  ): Promise<RateLimitResult> {
    const key = this.getKey(context, rule);
    let bucket = this.leakyBuckets.get(key);

    if (!bucket) {
      bucket = {
        queue: [],
        capacity: rule.limit,
        leakRate: rule.limit / rule.window,
        lastLeak: Date.now()
      };
      this.leakyBuckets.set(key, bucket);
    }

    // Leak requests
    const now = Date.now();
    const elapsed = now - bucket.lastLeak;
    const toLeak = (elapsed / 1000) * bucket.leakRate;
    
    let leaked = 0;
    while (leaked < toLeak && bucket.queue.length > 0) {
      const request = bucket.queue[0];
      if (leaked + request.weight <= toLeak) {
        bucket.queue.shift();
        leaked += request.weight;
      } else {
        break;
      }
    }
    
    bucket.lastLeak = now;

    // Check if request can be added
    const currentSize = bucket.queue.reduce((sum, r) => sum + r.weight, 0);
    const cost = rule.cost || 1;

    if (currentSize + cost <= bucket.capacity) {
      bucket.queue.push({ timestamp: now, weight: cost });
      
      return {
        allowed: true,
        limit: rule.limit,
        remaining: bucket.capacity - currentSize - cost,
        reset: new Date(now + rule.window)
      };
    }

    const retryAfter = Math.ceil((cost / bucket.leakRate) * 1000);

    return {
      allowed: false,
      limit: rule.limit,
      remaining: 0,
      reset: new Date(now + rule.window),
      retryAfter,
      reason: 'Rate limit exceeded'
    };
  }

  /**
   * Adaptive rate limiting
   */
  private async adaptiveLimit(
    context: RateLimitContext,
    rule: RateLimitRule
  ): Promise<RateLimitResult> {
    // Adjust limits based on current system load
    const systemLoad = this.getSystemLoad();
    const adaptedRule = { ...rule };
    
    if (systemLoad > 0.8) {
      adaptedRule.limit = Math.floor(rule.limit * 0.5);
    } else if (systemLoad > 0.6) {
      adaptedRule.limit = Math.floor(rule.limit * 0.75);
    }

    // Use token bucket with adapted limits
    return this.tokenBucketLimit(context, adaptedRule);
  }

  /**
   * Hybrid rate limiting (combines multiple strategies)
   */
  private async hybridLimit(
    context: RateLimitContext,
    rule: RateLimitRule
  ): Promise<RateLimitResult> {
    // Check token bucket for burst protection
    const burstRule = { ...rule, limit: rule.burst || rule.limit * 2, window: 1000 };
    const burstResult = await this.tokenBucketLimit(context, burstRule);
    
    if (!burstResult.allowed) {
      return burstResult;
    }

    // Check sliding window for sustained rate
    const sustainedResult = await this.slidingWindowLimit(context, rule);
    
    return sustainedResult;
  }

  /**
   * Get rate limit key
   */
  private getKey(context: RateLimitContext, rule: RateLimitRule): string {
    const parts = [rule.id];
    
    if (rule.shared) {
      parts.push('shared');
    } else {
      parts.push(context.identifier);
    }

    if (context.tier) {
      parts.push(context.tier);
    }

    return parts.join(':');
  }

  /**
   * Get applicable rule for context
   */
  private getApplicableRule(context: RateLimitContext): RateLimitRule | undefined {
    // Check custom rules first
    for (const customRule of this.customRules) {
      if (customRule.condition(context)) {
        return customRule.limit(context);
      }
    }

    // Find matching standard rules
    const matchingRules = Array.from(this.rules.values()).filter(rule => {
      if (rule.tier && rule.tier !== context.tier) {
        return false;
      }

      if (rule.method && !rule.method.includes(context.method)) {
        return false;
      }

      if (rule.paths && !rule.paths.some(p => context.path.startsWith(p))) {
        return false;
      }

      if (rule.headers) {
        for (const [key, value] of Object.entries(rule.headers)) {
          if (context.headers[key] !== value) {
            return false;
          }
        }
      }

      return true;
    });

    // Return highest priority rule
    return matchingRules.sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
  }

  /**
   * Check if context is whitelisted
   */
  private isWhitelisted(context: RateLimitContext): boolean {
    return this.config.whitelist?.includes(context.identifier) ||
           this.config.whitelist?.includes(context.ip || '') ||
           false;
  }

  /**
   * Check if context is blacklisted
   */
  private isBlacklisted(context: RateLimitContext): boolean {
    return this.config.blacklist?.includes(context.identifier) ||
           this.config.blacklist?.includes(context.ip || '') ||
           false;
  }

  /**
   * Check penalty status
   */
  private checkPenalty(identifier: string): PenaltyStatus | undefined {
    const penalty = this.penalties.get(identifier);
    
    if (!penalty) {
      return undefined;
    }

    // Check if penalty has expired
    if (penalty.expiresAt && penalty.expiresAt < new Date()) {
      this.penalties.delete(identifier);
      return undefined;
    }

    return penalty;
  }

  /**
   * Handle rate limit violation
   */
  private handleViolation(context: RateLimitContext, rule: RateLimitRule): void {
    if (!this.config.penalties?.enabled) {
      return;
    }

    let penalty = this.penalties.get(context.identifier);
    
    if (!penalty) {
      penalty = {
        identifier: context.identifier,
        violations: 0,
        status: 'none',
        createdAt: new Date()
      };
      this.penalties.set(context.identifier, penalty);
    }

    penalty.violations++;
    penalty.lastViolation = new Date();

    // Determine penalty level
    const violationRate = penalty.violations / 10; // Per 10 requests
    
    if (violationRate >= this.config.penalties.thresholds.block) {
      penalty.status = 'blocked';
      penalty.expiresAt = new Date(Date.now() + this.config.penalties.durations.block);
      
      this.emit('penalty:blocked', { identifier: context.identifier, penalty });
      logger.warn(`Identifier ${context.identifier} blocked for rate limit violations`);
      
    } else if (violationRate >= this.config.penalties.thresholds.throttle) {
      penalty.status = 'throttled';
      penalty.expiresAt = new Date(Date.now() + this.config.penalties.durations.throttle);
      
      this.emit('penalty:throttled', { identifier: context.identifier, penalty });
      logger.warn(`Identifier ${context.identifier} throttled for rate limit violations`);
    }

    // Record violation
    const violation: ViolationRecord = {
      identifier: context.identifier,
      timestamp: new Date(),
      rule: rule.id,
      count: penalty.violations,
      severity: this.calculateSeverity(penalty.violations)
    };

    this.recordViolation(violation);
  }

  /**
   * Calculate violation severity
   */
  private calculateSeverity(violations: number): ViolationRecord['severity'] {
    if (violations >= 100) return 'critical';
    if (violations >= 50) return 'high';
    if (violations >= 20) return 'medium';
    return 'low';
  }

  /**
   * Record violation
   */
  private recordViolation(violation: ViolationRecord): void {
    const metricsKey = 'global';
    let metrics = this.metrics.get(metricsKey);
    
    if (!metrics) {
      metrics = this.createEmptyMetrics();
      this.metrics.set(metricsKey, metrics);
    }

    metrics.violations.push(violation);
    
    // Keep only last 1000 violations
    if (metrics.violations.length > 1000) {
      metrics.violations = metrics.violations.slice(-1000);
    }
  }

  /**
   * Allow request
   */
  private allowRequest(context: RateLimitContext): RateLimitResult {
    return {
      allowed: true,
      limit: Number.MAX_SAFE_INTEGER,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: new Date(Date.now() + 3600000)
    };
  }

  /**
   * Block request
   */
  private blockRequest(context: RateLimitContext, reason: string): RateLimitResult {
    return {
      allowed: false,
      limit: 0,
      remaining: 0,
      reset: new Date(Date.now() + 3600000),
      reason,
      penalty: 'blocked'
    };
  }

  /**
   * Apply throttling to result
   */
  private applyThrottling(result: RateLimitResult): RateLimitResult {
    if (result.allowed) {
      // Add artificial delay
      result.retryAfter = 1000; // 1 second delay
      result.penalty = 'throttled';
    }
    return result;
  }

  /**
   * Update metrics
   */
  private updateMetrics(context: RateLimitContext, result: RateLimitResult): void {
    const metricsKey = 'global';
    let metrics = this.metrics.get(metricsKey);
    
    if (!metrics) {
      metrics = this.createEmptyMetrics();
      this.metrics.set(metricsKey, metrics);
    }

    metrics.totalRequests++;
    
    if (result.allowed) {
      metrics.allowedRequests++;
    } else {
      metrics.blockedRequests++;
      
      if (result.penalty === 'throttled') {
        metrics.throttledRequests++;
      }
    }

    // Update unique identifiers
    const identifiers = new Set<string>();
    for (const [key] of this.buckets) {
      const parts = key.split(':');
      if (parts[1] && parts[1] !== 'shared') {
        identifiers.add(parts[1]);
      }
    }
    metrics.uniqueIdentifiers = identifiers.size;

    // Check for alerts
    if (this.config.monitoring?.enabled) {
      const usageRate = metrics.blockedRequests / metrics.totalRequests;
      
      if (usageRate > (this.config.monitoring.alertThreshold || 0.9)) {
        this.emit('alert:high-usage', { usageRate, metrics });
      }
    }
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): RateLimitMetrics {
    return {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      throttledRequests: 0,
      averageLatency: 0,
      peakUsage: 0,
      uniqueIdentifiers: 0,
      violations: []
    };
  }

  /**
   * Get window count (for fixed window)
   */
  private windowCounts: Map<string, number> = new Map();
  
  private getWindowCount(key: string): number {
    return this.windowCounts.get(key) || 0;
  }

  private incrementWindowCount(key: string, amount: number): void {
    const current = this.windowCounts.get(key) || 0;
    this.windowCounts.set(key, current + amount);
    
    // Clean up old windows
    setTimeout(() => {
      this.windowCounts.delete(key);
    }, 3600000); // Clean after 1 hour
  }

  /**
   * Get system load (for adaptive limiting)
   */
  private getSystemLoad(): number {
    // Simplified load calculation
    const metrics = this.metrics.get('global');
    
    if (!metrics) {
      return 0;
    }

    const recentRequests = metrics.totalRequests;
    const maxCapacity = 10000; // Estimated max capacity
    
    return Math.min(1, recentRequests / maxCapacity);
  }

  /**
   * Get default rate limit rules
   */
  private getDefaultLimits(): RateLimitRule[] {
    return [
      {
        id: 'api-default',
        name: 'Default API Rate Limit',
        resource: 'api',
        limit: 100,
        window: 60000, // 1 minute
        tier: 'free'
      },
      {
        id: 'api-basic',
        name: 'Basic API Rate Limit',
        resource: 'api',
        limit: 1000,
        window: 60000,
        tier: 'basic'
      },
      {
        id: 'api-premium',
        name: 'Premium API Rate Limit',
        resource: 'api',
        limit: 10000,
        window: 60000,
        tier: 'premium'
      },
      {
        id: 'api-enterprise',
        name: 'Enterprise API Rate Limit',
        resource: 'api',
        limit: 100000,
        window: 60000,
        tier: 'enterprise'
      },
      {
        id: 'auth-limit',
        name: 'Authentication Rate Limit',
        resource: 'auth',
        limit: 5,
        window: 300000, // 5 minutes
        paths: ['/auth/login', '/auth/register']
      },
      {
        id: 'webhook-limit',
        name: 'Webhook Rate Limit',
        resource: 'webhook',
        limit: 50,
        window: 60000,
        paths: ['/webhooks']
      }
    ];
  }

  /**
   * Start distributed sync
   */
  private startDistributedSync(): void {
    this.syncTimer = setInterval(() => {
      this.syncDistributedState();
    }, this.config.syncInterval || 5000);
  }

  /**
   * Sync distributed state
   */
  private async syncDistributedState(): Promise<void> {
    // In production, would sync with Redis or database
    // For now, just emit event
    this.emit('sync:distributed', {
      buckets: this.buckets.size,
      windows: this.windows.size,
      penalties: this.penalties.size
    });
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring?.metricsInterval || 60000);
  }

  /**
   * Collect metrics
   */
  private collectMetrics(): void {
    const globalMetrics = this.metrics.get('global') || this.createEmptyMetrics();
    
    this.emit('metrics:collected', globalMetrics);
    
    // Reset some metrics
    globalMetrics.totalRequests = 0;
    globalMetrics.allowedRequests = 0;
    globalMetrics.blockedRequests = 0;
    globalMetrics.throttledRequests = 0;
  }

  /**
   * Add custom rule
   */
  addCustomRule(rule: CustomRateRule): void {
    this.customRules.push(rule);
    this.emit('rule:added', rule);
  }

  /**
   * Update rule
   */
  updateRule(ruleId: string, updates: Partial<RateLimitRule>): void {
    const rule = this.rules.get(ruleId);
    
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    Object.assign(rule, updates);
    this.emit('rule:updated', rule);
  }

  /**
   * Get metrics
   */
  getMetrics(key = 'global'): RateLimitMetrics | undefined {
    return this.metrics.get(key);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, RateLimitMetrics> {
    return this.metrics;
  }

  /**
   * Reset limits for identifier
   */
  resetLimits(identifier: string): void {
    // Remove from all buckets
    for (const [key] of this.buckets) {
      if (key.includes(identifier)) {
        this.buckets.delete(key);
      }
    }

    // Remove from windows
    for (const [key] of this.windows) {
      if (key.includes(identifier)) {
        this.windows.delete(key);
      }
    }

    // Remove from leaky buckets
    for (const [key] of this.leakyBuckets) {
      if (key.includes(identifier)) {
        this.leakyBuckets.delete(key);
      }
    }

    // Remove penalties
    this.penalties.delete(identifier);

    this.emit('limits:reset', identifier);
  }

  /**
   * Add to whitelist
   */
  addToWhitelist(identifier: string): void {
    if (!this.config.whitelist) {
      this.config.whitelist = [];
    }
    
    if (!this.config.whitelist.includes(identifier)) {
      this.config.whitelist.push(identifier);
      this.emit('whitelist:added', identifier);
    }
  }

  /**
   * Remove from whitelist
   */
  removeFromWhitelist(identifier: string): void {
    if (this.config.whitelist) {
      const index = this.config.whitelist.indexOf(identifier);
      if (index > -1) {
        this.config.whitelist.splice(index, 1);
        this.emit('whitelist:removed', identifier);
      }
    }
  }

  /**
   * Add to blacklist
   */
  addToBlacklist(identifier: string): void {
    if (!this.config.blacklist) {
      this.config.blacklist = [];
    }
    
    if (!this.config.blacklist.includes(identifier)) {
      this.config.blacklist.push(identifier);
      this.emit('blacklist:added', identifier);
    }
  }

  /**
   * Remove from blacklist
   */
  removeFromBlacklist(identifier: string): void {
    if (this.config.blacklist) {
      const index = this.config.blacklist.indexOf(identifier);
      if (index > -1) {
        this.config.blacklist.splice(index, 1);
        this.emit('blacklist:removed', identifier);
      }
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): any {
    const globalMetrics = this.metrics.get('global') || this.createEmptyMetrics();
    
    return {
      strategy: this.config.strategy,
      rules: this.rules.size,
      customRules: this.customRules.length,
      activeBuckets: this.buckets.size,
      activeWindows: this.windows.size,
      activeLeakyBuckets: this.leakyBuckets.size,
      penalties: this.penalties.size,
      whitelist: this.config.whitelist?.length || 0,
      blacklist: this.config.blacklist?.length || 0,
      metrics: globalMetrics
    };
  }

  /**
   * Shutdown system
   */
  shutdown(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.removeAllListeners();
    logger.info('Rate limiting system shut down');
  }
}

// Helper interfaces
interface PenaltyStatus {
  identifier: string;
  violations: number;
  status: 'none' | 'throttled' | 'blocked';
  createdAt: Date;
  lastViolation?: Date;
  expiresAt?: Date;
}

// Export singleton instance
export const rateLimitingSystem = new RateLimitingSystem();