/**
 * Debounce/Throttle Node
 * Prevent duplicate executions and control execution rate
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface DebounceConfig {
  mode: 'debounce' | 'throttle' | 'deduplication' | 'rateLimit';
  delay?: number; // milliseconds
  maxWait?: number; // max time to wait before forcing execution
  leading?: boolean; // execute on leading edge
  trailing?: boolean; // execute on trailing edge
  keyField?: string; // field to use as deduplication key
  ttl?: number; // time-to-live for deduplication cache
  maxConcurrent?: number; // max concurrent executions
  tokensPerInterval?: number; // rate limit tokens
  interval?: number; // rate limit interval
  onDrop?: (data: Record<string, unknown>) => void;
  onExecute?: (data: Record<string, unknown>) => void;
}

export interface ExecutionResult {
  executed: boolean;
  queued: boolean;
  dropped: boolean;
  reason?: string;
  executionId?: string;
  queuePosition?: number;
  waitTime?: number;
}

export interface DebounceState {
  timer?: NodeJS.Timeout;
  lastExecution?: number;
  pendingData?: Record<string, unknown>;
  executionCount: number;
}

export interface ThrottleState {
  lastExecution: number;
  executing: boolean;
}

export interface RateLimitState {
  tokens: number;
  lastRefill: number;
  queue: Array<{
    data: Record<string, unknown>;
    resolve: (result: ExecutionResult) => void;
    timestamp: number;
  }>;
}

export class DebounceThrottleNode extends EventEmitter {
  private config: DebounceConfig;
  private debounceStates: Map<string, DebounceState> = new Map();
  private throttleStates: Map<string, ThrottleState> = new Map();
  private deduplicationCache: Map<string, { timestamp: number; data: unknown }> = new Map();
  private rateLimitState: RateLimitState;
  private currentConcurrent: number = 0;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: DebounceConfig) {
    super();
    this.config = {
      delay: 1000,
      maxWait: 10000,
      leading: false,
      trailing: true,
      ttl: 60000,
      maxConcurrent: 10,
      tokensPerInterval: 10,
      interval: 1000,
      ...config
    };

    this.rateLimitState = {
      tokens: this.config.tokensPerInterval || 10,
      lastRefill: Date.now(),
      queue: []
    };

    // Start cleanup interval for deduplication cache
    this.cleanupInterval = setInterval(() => this.cleanupCache(), 30000);
  }

  /**
   * Process incoming data with configured mode
   */
  async process(data: Record<string, unknown>, key?: string): Promise<ExecutionResult> {
    const effectiveKey = key || this.generateKey(data);

    switch (this.config.mode) {
      case 'debounce':
        return this.debounce(data, effectiveKey);
      case 'throttle':
        return this.throttle(data, effectiveKey);
      case 'deduplication':
        return this.deduplicate(data, effectiveKey);
      case 'rateLimit':
        return this.rateLimit(data);
      default:
        return { executed: true, queued: false, dropped: false };
    }
  }

  /**
   * Debounce: Wait for quiet period before executing
   */
  private debounce(data: Record<string, unknown>, key: string): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      let state = this.debounceStates.get(key);

      if (!state) {
        state = { executionCount: 0 };
        this.debounceStates.set(key, state);
      }

      // Clear existing timer
      if (state.timer) {
        clearTimeout(state.timer);
      }

      const now = Date.now();
      const firstCall = !state.pendingData;
      state.pendingData = data;

      // Leading edge execution
      if (this.config.leading && firstCall) {
        this.execute(data);
        state.lastExecution = now;
        state.executionCount++;
        this.emit('debounce:leading', { key });
        resolve({ executed: true, queued: false, dropped: false });
        return;
      }

      // Check maxWait
      const timeSinceFirst = state.lastExecution ? now - state.lastExecution : 0;
      const delay = this.config.maxWait && timeSinceFirst >= this.config.maxWait
        ? 0
        : this.config.delay!;

      // Set trailing edge timer
      state.timer = setTimeout(() => {
        if (this.config.trailing && state!.pendingData) {
          this.execute(state!.pendingData);
          state!.lastExecution = Date.now();
          state!.executionCount++;
          this.emit('debounce:trailing', { key });
        }
        state!.pendingData = undefined;
        state!.timer = undefined;
      }, delay);

      this.emit('debounce:queued', { key, delay });
      resolve({
        executed: false,
        queued: true,
        dropped: false,
        waitTime: delay
      });
    });
  }

  /**
   * Throttle: Limit execution rate
   */
  private throttle(data: Record<string, unknown>, key: string): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      let state = this.throttleStates.get(key);

      if (!state) {
        state = { lastExecution: 0, executing: false };
        this.throttleStates.set(key, state);
      }

      const now = Date.now();
      const elapsed = now - state.lastExecution;

      if (elapsed >= this.config.delay!) {
        // Can execute immediately
        this.execute(data);
        state.lastExecution = now;
        this.emit('throttle:executed', { key });
        resolve({ executed: true, queued: false, dropped: false });
      } else if (this.config.trailing && !state.executing) {
        // Queue for later
        state.executing = true;
        const waitTime = this.config.delay! - elapsed;

        setTimeout(() => {
          this.execute(data);
          state!.lastExecution = Date.now();
          state!.executing = false;
          this.emit('throttle:trailing', { key });
        }, waitTime);

        resolve({
          executed: false,
          queued: true,
          dropped: false,
          waitTime
        });
      } else {
        // Drop
        this.drop(data);
        this.emit('throttle:dropped', { key });
        resolve({
          executed: false,
          queued: false,
          dropped: true,
          reason: 'Rate limited'
        });
      }
    });
  }

  /**
   * Deduplication: Skip duplicate executions within TTL
   */
  private deduplicate(data: Record<string, unknown>, key: string): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const cacheKey = this.config.keyField
        ? String(this.getNestedValue(data, this.config.keyField))
        : key;

      const cached = this.deduplicationCache.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < this.config.ttl!) {
        // Duplicate within TTL
        this.drop(data);
        this.emit('deduplication:skipped', { key: cacheKey });
        resolve({
          executed: false,
          queued: false,
          dropped: true,
          reason: 'Duplicate'
        });
        return;
      }

      // Execute and cache
      this.deduplicationCache.set(cacheKey, { timestamp: now, data });
      this.execute(data);
      this.emit('deduplication:executed', { key: cacheKey });
      resolve({ executed: true, queued: false, dropped: false });
    });
  }

  /**
   * Rate Limit: Token bucket algorithm
   */
  private rateLimit(data: Record<string, unknown>): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      this.refillTokens();

      if (this.rateLimitState.tokens >= 1) {
        // Have tokens, execute
        this.rateLimitState.tokens--;
        this.execute(data);
        this.emit('rateLimit:executed', { tokensRemaining: this.rateLimitState.tokens });
        resolve({ executed: true, queued: false, dropped: false });
      } else if (this.rateLimitState.queue.length < 100) {
        // Queue for later
        this.rateLimitState.queue.push({
          data,
          resolve,
          timestamp: Date.now()
        });
        this.emit('rateLimit:queued', {
          queuePosition: this.rateLimitState.queue.length
        });
        this.scheduleQueueProcessing();
      } else {
        // Queue full, drop
        this.drop(data);
        this.emit('rateLimit:dropped', { reason: 'Queue full' });
        resolve({
          executed: false,
          queued: false,
          dropped: true,
          reason: 'Rate limit exceeded, queue full'
        });
      }
    });
  }

  /**
   * Check if can execute (for concurrent limit)
   */
  async canExecute(): Promise<boolean> {
    if (this.config.mode !== 'rateLimit') return true;
    return this.currentConcurrent < this.config.maxConcurrent!;
  }

  /**
   * Get current state
   */
  getState(): {
    debounceKeys: number;
    throttleKeys: number;
    cacheSize: number;
    rateLimitTokens: number;
    queueLength: number;
    concurrent: number;
  } {
    return {
      debounceKeys: this.debounceStates.size,
      throttleKeys: this.throttleStates.size,
      cacheSize: this.deduplicationCache.size,
      rateLimitTokens: this.rateLimitState.tokens,
      queueLength: this.rateLimitState.queue.length,
      concurrent: this.currentConcurrent
    };
  }

  /**
   * Clear all state
   */
  clear(): void {
    // Clear debounce timers
    for (const state of this.debounceStates.values()) {
      if (state.timer) clearTimeout(state.timer);
    }
    this.debounceStates.clear();
    this.throttleStates.clear();
    this.deduplicationCache.clear();
    this.rateLimitState.queue = [];
    this.rateLimitState.tokens = this.config.tokensPerInterval || 10;
    this.emit('cleared');
  }

  /**
   * Force flush pending operations
   */
  flush(): void {
    // Execute pending debounce operations
    for (const [key, state] of this.debounceStates) {
      if (state.timer && state.pendingData) {
        clearTimeout(state.timer);
        this.execute(state.pendingData);
        this.emit('debounce:flushed', { key });
      }
    }
    this.debounceStates.clear();

    // Process rate limit queue
    while (this.rateLimitState.queue.length > 0) {
      const item = this.rateLimitState.queue.shift()!;
      this.execute(item.data);
      item.resolve({ executed: true, queued: false, dropped: false });
    }
    this.emit('flushed');
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.clear();
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.removeAllListeners();
  }

  private execute(data: Record<string, unknown>): void {
    this.currentConcurrent++;
    this.emit('execute', { data });

    if (this.config.onExecute) {
      try {
        this.config.onExecute(data);
      } finally {
        this.currentConcurrent--;
      }
    } else {
      this.currentConcurrent--;
    }
  }

  private drop(data: Record<string, unknown>): void {
    this.emit('drop', { data });
    if (this.config.onDrop) {
      this.config.onDrop(data);
    }
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.rateLimitState.lastRefill;
    const intervals = Math.floor(elapsed / this.config.interval!);

    if (intervals > 0) {
      const tokensToAdd = intervals * this.config.tokensPerInterval!;
      this.rateLimitState.tokens = Math.min(
        this.config.tokensPerInterval! * 2, // burst capacity
        this.rateLimitState.tokens + tokensToAdd
      );
      this.rateLimitState.lastRefill = now;
    }
  }

  private scheduleQueueProcessing(): void {
    setTimeout(() => {
      this.refillTokens();
      while (this.rateLimitState.tokens >= 1 && this.rateLimitState.queue.length > 0) {
        const item = this.rateLimitState.queue.shift()!;
        this.rateLimitState.tokens--;
        this.execute(item.data);
        item.resolve({ executed: true, queued: false, dropped: false });
      }

      if (this.rateLimitState.queue.length > 0) {
        this.scheduleQueueProcessing();
      }
    }, this.config.interval!);
  }

  private cleanupCache(): void {
    const now = Date.now();
    const ttl = this.config.ttl!;
    let cleaned = 0;

    for (const [key, entry] of this.deduplicationCache) {
      if (now - entry.timestamp > ttl) {
        this.deduplicationCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.emit('cache:cleanup', { cleaned });
    }
  }

  private generateKey(data: Record<string, unknown>): string {
    const str = JSON.stringify(data);
    return crypto.createHash('md5').update(str).digest('hex');
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }
}

// Export factory functions
export function createDebouncer(delay: number = 1000): DebounceThrottleNode {
  return new DebounceThrottleNode({ mode: 'debounce', delay });
}

export function createThrottler(delay: number = 1000): DebounceThrottleNode {
  return new DebounceThrottleNode({ mode: 'throttle', delay });
}

export function createDeduplicator(ttl: number = 60000, keyField?: string): DebounceThrottleNode {
  return new DebounceThrottleNode({ mode: 'deduplication', ttl, keyField });
}

export function createRateLimiter(tokensPerInterval: number = 10, interval: number = 1000): DebounceThrottleNode {
  return new DebounceThrottleNode({ mode: 'rateLimit', tokensPerInterval, interval });
}
