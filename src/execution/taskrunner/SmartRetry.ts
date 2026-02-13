/**
 * Smart Retry - Advanced retry logic with exponential backoff and circuit breaker
 * Implements intelligent retry strategies to handle transient failures
 */

import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';
import {
  RetryConfig,
  CircuitBreakerConfig,
  CircuitBreakerState,
  Task
} from '../../types/taskrunner';

export class SmartRetry extends EventEmitter {
  private retryConfig: Required<RetryConfig>;
  private circuitBreakerConfig: Required<CircuitBreakerConfig>;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  // Metrics
  private metrics = {
    totalRetries: 0,
    successfulRetries: 0,
    failedRetries: 0,
    circuitBreaksTriggered: 0,
    averageRetryDelay: 0
  };

  constructor(
    retryConfig: Partial<RetryConfig> = {},
    circuitBreakerConfig: Partial<CircuitBreakerConfig> = {}
  ) {
    super();

    this.retryConfig = {
      maxAttempts: retryConfig.maxAttempts || 5,
      baseDelay: retryConfig.baseDelay || 1000, // 1 second
      maxDelay: retryConfig.maxDelay || 16000, // 16 seconds
      backoffMultiplier: retryConfig.backoffMultiplier || 2,
      jitter: retryConfig.jitter !== false,
      retryableErrors: retryConfig.retryableErrors || [
        'ETIMEDOUT',
        'ECONNRESET',
        'ECONNREFUSED',
        'EHOSTUNREACH',
        'ENETUNREACH',
        'EAI_AGAIN',
        'ENOTFOUND'
      ]
    };

    this.circuitBreakerConfig = {
      failureThreshold: circuitBreakerConfig.failureThreshold || 5,
      successThreshold: circuitBreakerConfig.successThreshold || 2,
      timeout: circuitBreakerConfig.timeout || 60000, // 1 minute
      halfOpenRequests: circuitBreakerConfig.halfOpenRequests || 3
    };

    logger.info('SmartRetry initialized', {
      maxAttempts: this.retryConfig.maxAttempts,
      baseDelay: this.retryConfig.baseDelay,
      circuitBreaker: {
        failureThreshold: this.circuitBreakerConfig.failureThreshold,
        timeout: this.circuitBreakerConfig.timeout
      }
    });
  }

  /**
   * Execute function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    context: { taskId?: string; nodeId?: string; type?: string } = {}
  ): Promise<T> {
    const circuitBreakerKey = this.getCircuitBreakerKey(context);

    // Check circuit breaker
    if (!this.canProceed(circuitBreakerKey)) {
      const error = new Error('Circuit breaker is open');
      logger.warn('Circuit breaker prevented execution', {
        key: circuitBreakerKey,
        state: this.getCircuitBreakerState(circuitBreakerKey)
      });
      this.emit('circuit_breaker_open', circuitBreakerKey);
      throw error;
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < this.retryConfig.maxAttempts) {
      try {
        // Execute the function
        const result = await fn();

        // Success - record it
        this.recordSuccess(circuitBreakerKey);

        if (attempt > 0) {
          this.metrics.successfulRetries++;
          logger.info('Retry succeeded', {
            ...context,
            attempt: attempt + 1,
            totalAttempts: this.retryConfig.maxAttempts
          });
        }

        return result;

      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          logger.warn('Non-retryable error encountered', {
            ...context,
            error: (error as Error).message,
            attempt
          });
          this.recordFailure(circuitBreakerKey);
          throw error;
        }

        // Record failure
        this.recordFailure(circuitBreakerKey);
        this.metrics.totalRetries++;

        // Check if we should retry
        if (attempt >= this.retryConfig.maxAttempts) {
          this.metrics.failedRetries++;
          logger.error('Max retry attempts reached', {
            ...context,
            attempts: attempt,
            error: (error as Error).message
          });
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);

        logger.info('Retrying after delay', {
          ...context,
          attempt: attempt + 1,
          maxAttempts: this.retryConfig.maxAttempts,
          delay: `${delay}ms`,
          error: (error as Error).message
        });

        this.emit('retry_attempt', {
          ...context,
          attempt,
          delay,
          error: (error as Error).message
        });

        // Wait before retrying
        await this.delay(delay);
      }
    }

    // All retries failed
    throw lastError || new Error('Unknown error during retry');
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    // Check error code
    if ('code' in error) {
      const errorCode = (error as { code: string }).code;
      if (this.retryConfig.retryableErrors.includes(errorCode)) {
        return true;
      }
    }

    // Check error message for common transient errors
    const message = error.message.toLowerCase();
    const transientKeywords = [
      'timeout',
      'econnreset',
      'econnrefused',
      'network',
      'temporarily unavailable',
      'rate limit',
      'too many requests',
      'service unavailable',
      '503',
      '429'
    ];

    return transientKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    // Exponential backoff: baseDelay * (multiplier ^ attempt)
    let delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);

    // Cap at max delay
    delay = Math.min(delay, this.retryConfig.maxDelay);

    // Add jitter if enabled (randomize ±25%)
    if (this.retryConfig.jitter) {
      const jitterRange = delay * 0.25;
      const jitter = (Math.random() * 2 - 1) * jitterRange;
      delay = Math.max(0, delay + jitter);
    }

    this.metrics.averageRetryDelay = delay;

    return Math.floor(delay);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Circuit Breaker Logic
  // ============================================================================

  /**
   * Get circuit breaker key for a context
   */
  private getCircuitBreakerKey(context: { taskId?: string; nodeId?: string; type?: string }): string {
    // Use node type or task ID as key
    return context.type || context.nodeId || context.taskId || 'default';
  }

  /**
   * Check if we can proceed with execution
   */
  private canProceed(key: string): boolean {
    const state = this.getCircuitBreakerState(key);

    switch (state.state) {
      case 'closed':
        return true;

      case 'open':
        // Check if timeout has passed
        if (state.nextAttemptTime && Date.now() >= state.nextAttemptTime) {
          // Transition to half-open
          state.state = 'half-open';
          state.successes = 0;
          logger.info('Circuit breaker transitioning to half-open', { key });
          this.emit('circuit_breaker_half_open', key);
          return true;
        }
        return false;

      case 'half-open':
        // Allow limited requests in half-open state
        return state.successes < this.circuitBreakerConfig.halfOpenRequests;

      default:
        return true;
    }
  }

  /**
   * Record successful execution
   */
  private recordSuccess(key: string): void {
    const state = this.getCircuitBreakerState(key);

    state.failures = 0;
    state.successes++;
    state.lastFailureTime = undefined;

    // Check if we should close the circuit
    if (state.state === 'half-open') {
      if (state.successes >= this.circuitBreakerConfig.successThreshold) {
        state.state = 'closed';
        state.successes = 0;
        logger.info('Circuit breaker closed', { key });
        this.emit('circuit_breaker_closed', key);
      }
    }
  }

  /**
   * Record failed execution
   */
  private recordFailure(key: string): void {
    const state = this.getCircuitBreakerState(key);

    state.failures++;
    state.lastFailureTime = Date.now();

    // Check if we should open the circuit
    if (state.state === 'closed' && state.failures >= this.circuitBreakerConfig.failureThreshold) {
      state.state = 'open';
      state.nextAttemptTime = Date.now() + this.circuitBreakerConfig.timeout;
      this.metrics.circuitBreaksTriggered++;

      logger.warn('Circuit breaker opened', {
        key,
        failures: state.failures,
        threshold: this.circuitBreakerConfig.failureThreshold,
        reopenAt: new Date(state.nextAttemptTime).toISOString()
      });

      this.emit('circuit_breaker_opened', key, state);
    }

    // If in half-open and failed, reopen the circuit
    if (state.state === 'half-open') {
      state.state = 'open';
      state.nextAttemptTime = Date.now() + this.circuitBreakerConfig.timeout;
      state.successes = 0;

      logger.warn('Circuit breaker reopened from half-open', { key });
      this.emit('circuit_breaker_reopened', key);
    }
  }

  /**
   * Get circuit breaker state
   */
  private getCircuitBreakerState(key: string): CircuitBreakerState {
    let state = this.circuitBreakers.get(key);

    if (!state) {
      state = {
        state: 'closed',
        failures: 0,
        successes: 0
      };
      this.circuitBreakers.set(key, state);
    }

    return state;
  }

  /**
   * Get all circuit breaker states
   */
  getCircuitBreakerStates(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Reset circuit breaker for a key
   */
  resetCircuitBreaker(key: string): void {
    const state = this.circuitBreakers.get(key);

    if (state) {
      state.state = 'closed';
      state.failures = 0;
      state.successes = 0;
      state.lastFailureTime = undefined;
      state.nextAttemptTime = undefined;

      logger.info('Circuit breaker reset', { key });
      this.emit('circuit_breaker_reset', key);
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    const keys = Array.from(this.circuitBreakers.keys());

    for (const key of keys) {
      this.resetCircuitBreaker(key);
    }

    logger.info('All circuit breakers reset', { count: keys.length });
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  /**
   * Get retry metrics
   */
  getMetrics() {
    const totalAttempts = this.metrics.totalRetries;
    const successRate = totalAttempts > 0
      ? this.metrics.successfulRetries / totalAttempts
      : 0;

    return {
      totalRetries: this.metrics.totalRetries,
      successfulRetries: this.metrics.successfulRetries,
      failedRetries: this.metrics.failedRetries,
      successRate,
      averageRetryDelay: this.metrics.averageRetryDelay,
      circuitBreakers: {
        total: this.circuitBreakers.size,
        open: Array.from(this.circuitBreakers.values()).filter(s => s.state === 'open').length,
        halfOpen: Array.from(this.circuitBreakers.values()).filter(s => s.state === 'half-open').length,
        closed: Array.from(this.circuitBreakers.values()).filter(s => s.state === 'closed').length,
        totalBreaks: this.metrics.circuitBreaksTriggered
      }
    };
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    this.circuitBreakers.clear();
    this.removeAllListeners();
    logger.info('SmartRetry shutdown');
  }
}
