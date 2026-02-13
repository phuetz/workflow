/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascade failures by tracking failures and opening circuit
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests fail immediately
 * - HALF_OPEN: Testing recovery, limited requests pass through
 */

import { logger } from '../services/SimpleLogger';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close from half-open
  timeout: number; // Time to wait before attempting recovery (ms)
  resetTimeout?: number; // Time to reset failure count in closed state (ms)
  volumeThreshold?: number; // Minimum number of calls before checking failure rate
  errorFilter?: (error: Error) => boolean; // Filter which errors count as failures
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalCalls: number;
  rejectedCalls: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  stateChangedAt: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private totalCalls: number = 0;
  private rejectedCalls: number = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private stateChangedAt: number = Date.now();
  private consecutiveFailures: number = 0;
  private consecutiveSuccesses: number = 0;
  private nextAttemptTime: number = 0;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {
    logger.info(`Circuit breaker "${name}" initialized with threshold: ${config.failureThreshold}`);
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    // Check if circuit allows execution
    if (!this.canExecute()) {
      this.rejectedCalls++;
      throw new CircuitBreakerOpenError(
        `Circuit breaker "${this.name}" is OPEN. Request rejected.`
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Check if circuit allows execution
   */
  private canExecute(): boolean {
    const now = Date.now();

    switch (this.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        // Check if timeout has elapsed
        if (now >= this.nextAttemptTime) {
          this.transitionTo('HALF_OPEN');
          return true;
        }
        return false;

      case 'HALF_OPEN':
        // In half-open, only allow limited requests
        return true;

      default:
        return false;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.successes++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;

    switch (this.state) {
      case 'HALF_OPEN':
        // Check if we've had enough successes to close
        if (this.consecutiveSuccesses >= this.config.successThreshold) {
          this.transitionTo('CLOSED');
          this.resetCounts();
        }
        break;

      case 'CLOSED':
        // Check if we should reset failure count after timeout
        if (
          this.config.resetTimeout &&
          this.lastFailureTime &&
          Date.now() - this.lastFailureTime > this.config.resetTimeout
        ) {
          this.failures = 0;
          this.consecutiveFailures = 0;
        }
        break;
    }

    logger.debug(`Circuit breaker "${this.name}" - Success (state: ${this.state})`);
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    // Check if error should be counted as failure
    if (this.config.errorFilter && !this.config.errorFilter(error)) {
      logger.debug(`Circuit breaker "${this.name}" - Error filtered, not counted as failure`);
      return;
    }

    this.lastFailureTime = Date.now();
    this.failures++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;

    logger.warn(`Circuit breaker "${this.name}" - Failure (consecutive: ${this.consecutiveFailures})`);

    switch (this.state) {
      case 'CLOSED':
        // Check if we've exceeded failure threshold
        if (this.shouldOpenCircuit()) {
          this.transitionTo('OPEN');
          this.nextAttemptTime = Date.now() + this.config.timeout;
        }
        break;

      case 'HALF_OPEN':
        // Any failure in half-open returns to open
        this.transitionTo('OPEN');
        this.nextAttemptTime = Date.now() + this.config.timeout;
        this.consecutiveSuccesses = 0;
        break;
    }
  }

  /**
   * Check if circuit should open
   */
  private shouldOpenCircuit(): boolean {
    // If volume threshold is set, check if we have enough data
    if (this.config.volumeThreshold) {
      if (this.totalCalls < this.config.volumeThreshold) {
        return false;
      }
    }

    return this.consecutiveFailures >= this.config.failureThreshold;
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;

    if (oldState === newState) return;

    this.state = newState;
    this.stateChangedAt = Date.now();

    logger.info(`Circuit breaker "${this.name}" state changed: ${oldState} → ${newState}`);

    // Call state change callback
    if (this.config.onStateChange) {
      this.config.onStateChange(oldState, newState);
    }
  }

  /**
   * Reset counts
   */
  private resetCounts(): void {
    this.failures = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalCalls: this.totalCalls,
      rejectedCalls: this.rejectedCalls,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChangedAt: this.stateChangedAt,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses
    };
  }

  /**
   * Force circuit state (for testing/manual intervention)
   */
  forceState(state: CircuitState): void {
    logger.warn(`Circuit breaker "${this.name}" forced to state: ${state}`);
    this.transitionTo(state);

    if (state === 'CLOSED') {
      this.resetCounts();
    }
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    logger.info(`Circuit breaker "${this.name}" reset`);
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.totalCalls = 0;
    this.rejectedCalls = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.stateChangedAt = Date.now();
    this.nextAttemptTime = 0;
  }

  /**
   * Get failure rate
   */
  getFailureRate(): number {
    if (this.totalCalls === 0) return 0;
    return this.failures / this.totalCalls;
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.totalCalls === 0) return 0;
    return this.successes / this.totalCalls;
  }

  /**
   * Check if circuit is healthy
   */
  isHealthy(): boolean {
    return this.state === 'CLOSED' && this.consecutiveFailures === 0;
  }

  /**
   * Get time until next attempt (for OPEN state)
   */
  getTimeUntilNextAttempt(): number {
    if (this.state !== 'OPEN') return 0;
    return Math.max(0, this.nextAttemptTime - Date.now());
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers by name/key
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    resetTimeout: 120000 // 2 minutes
  };

  /**
   * Get or create circuit breaker
   */
  getBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breakerConfig = { ...this.defaultConfig, ...config };
      this.breakers.set(name, new CircuitBreaker(name, breakerConfig));
    }

    return this.breakers.get(name)!;
  }

  /**
   * Execute function with circuit breaker
   */
  async execute<T>(
    breakerName: string,
    fn: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const breaker = this.getBreaker(breakerName, config);
    return breaker.execute(fn);
  }

  /**
   * Get all breakers
   */
  getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get breaker stats by name
   */
  getStats(name: string): CircuitBreakerStats | undefined {
    const breaker = this.breakers.get(name);
    return breaker?.getStats();
  }

  /**
   * Get all stats
   */
  getAllStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();

    for (const [name, breaker] of this.breakers) {
      stats.set(name, breaker.getStats());
    }

    return stats;
  }

  /**
   * Reset breaker by name
   */
  resetBreaker(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
    }
  }

  /**
   * Reset all breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Remove breaker
   */
  removeBreaker(name: string): boolean {
    return this.breakers.delete(name);
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    total: number;
    healthy: number;
    open: number;
    halfOpen: number;
    unhealthy: number;
  } {
    let healthy = 0;
    let open = 0;
    let halfOpen = 0;

    for (const breaker of this.breakers.values()) {
      const stats = breaker.getStats();

      if (breaker.isHealthy()) {
        healthy++;
      }

      switch (stats.state) {
        case 'OPEN':
          open++;
          break;
        case 'HALF_OPEN':
          halfOpen++;
          break;
      }
    }

    return {
      total: this.breakers.size,
      healthy,
      open,
      halfOpen,
      unhealthy: open + halfOpen
    };
  }

  /**
   * Create circuit breaker for node
   */
  createForNode(
    nodeId: string,
    nodeType: string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    const name = `node:${nodeType}:${nodeId}`;
    return this.getBreaker(name, config);
  }

  /**
   * Create circuit breaker for external service
   */
  createForService(
    serviceName: string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    const name = `service:${serviceName}`;
    return this.getBreaker(name, config);
  }
}

/**
 * Custom error for circuit breaker open state
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Create default circuit breaker config
 */
export const createCircuitBreakerConfig = (
  overrides?: Partial<CircuitBreakerConfig>
): CircuitBreakerConfig => {
  return {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
    resetTimeout: 120000,
    ...overrides
  };
};

// Export singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();
