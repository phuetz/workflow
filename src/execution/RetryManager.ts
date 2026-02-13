/**
 * Advanced Retry Manager
 * Implements sophisticated retry strategies with comprehensive configuration
 *
 * Strategies:
 * - Fixed Delay
 * - Linear Backoff
 * - Exponential Backoff
 * - Fibonacci Backoff
 * - Custom Function
 */

import { logger } from '../services/SimpleLogger';

export type RetryStrategy = 'fixed' | 'linear' | 'exponential' | 'fibonacci' | 'custom';

export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  strategy: RetryStrategy;
  initialDelay: number; // milliseconds
  maxDelay?: number; // milliseconds
  multiplier?: number; // for exponential/linear
  jitter?: boolean; // add randomness
  retryOnErrors?: string[]; // Retry only for specific error codes/messages
  skipOnErrors?: string[]; // Skip retry for specific error codes/messages
  onRetry?: (attempt: number, delay: number, error: Error) => void;
  customDelayFn?: (attempt: number) => number;
}

export interface RetryState {
  attemptNumber: number;
  totalAttempts: number;
  totalDelay: number;
  lastError?: Error;
  history: RetryAttempt[];
}

export interface RetryAttempt {
  attempt: number;
  timestamp: number;
  delay: number;
  errorMessage?: string;
  errorCode?: string;
  success: boolean;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  state: RetryState;
  metrics: {
    totalTime: number;
    totalRetries: number;
    averageDelay: number;
    successOnAttempt?: number;
  };
}

export class RetryManager {
  private fibonacciCache: Map<number, number> = new Map();
  private activeRetries: Map<string, RetryState> = new Map();

  constructor() {
    this.initializeFibonacciCache();
    logger.info('RetryManager initialized');
  }

  /**
   * Execute function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig,
    retryId?: string
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const state: RetryState = {
      attemptNumber: 0,
      totalAttempts: config.maxAttempts,
      totalDelay: 0,
      history: []
    };

    if (retryId) {
      this.activeRetries.set(retryId, state);
    }

    if (!config.enabled) {
      // No retry, just execute once
      try {
        const result = await fn();
        return this.createSuccessResult(result, state, startTime);
      } catch (error) {
        return this.createErrorResult(error as Error, state, startTime);
      }
    }

    // Execute with retry logic
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      state.attemptNumber = attempt;
      const attemptStart = Date.now();

      try {
        logger.debug(`Attempt ${attempt}/${config.maxAttempts}`);
        const result = await fn();

        // Success!
        state.history.push({
          attempt,
          timestamp: attemptStart,
          delay: 0,
          success: true
        });

        if (retryId) {
          this.activeRetries.delete(retryId);
        }

        return this.createSuccessResult(result, state, startTime, attempt);
      } catch (error) {
        const err = error as Error;
        state.lastError = err;

        // Record attempt
        state.history.push({
          attempt,
          timestamp: attemptStart,
          delay: 0,
          errorMessage: err.message,
          errorCode: (err as any).code,
          success: false
        });

        // Check if we should retry this error
        if (!this.shouldRetryError(err, config)) {
          logger.info(`Error is non-retryable: ${err.message}`);
          if (retryId) {
            this.activeRetries.delete(retryId);
          }
          return this.createErrorResult(err, state, startTime);
        }

        // Check if we've exhausted retries
        if (attempt >= config.maxAttempts) {
          logger.warn(`Max retry attempts (${config.maxAttempts}) exceeded`);
          if (retryId) {
            this.activeRetries.delete(retryId);
          }
          return this.createErrorResult(err, state, startTime);
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, config);
        state.totalDelay += delay;
        state.history[state.history.length - 1].delay = delay;

        // Call retry callback
        if (config.onRetry) {
          config.onRetry(attempt, delay, err);
        }

        logger.info(
          `Retry attempt ${attempt}/${config.maxAttempts} after ${delay}ms delay (strategy: ${config.strategy})`
        );

        // Wait before next attempt
        await this.delay(delay);
      }
    }

    // Should not reach here, but just in case
    if (retryId) {
      this.activeRetries.delete(retryId);
    }
    return this.createErrorResult(
      state.lastError || new Error('Unknown error'),
      state,
      startTime
    );
  }

  /**
   * Calculate delay based on retry strategy
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let baseDelay: number;

    switch (config.strategy) {
      case 'fixed':
        baseDelay = this.fixedDelay(config.initialDelay);
        break;

      case 'linear':
        baseDelay = this.linearBackoff(attempt, config.initialDelay, config.multiplier || 1);
        break;

      case 'exponential':
        baseDelay = this.exponentialBackoff(
          attempt,
          config.initialDelay,
          config.multiplier || 2
        );
        break;

      case 'fibonacci':
        baseDelay = this.fibonacciBackoff(attempt, config.initialDelay);
        break;

      case 'custom':
        if (config.customDelayFn) {
          baseDelay = config.customDelayFn(attempt);
        } else {
          logger.warn('Custom strategy selected but no customDelayFn provided, using fixed delay');
          baseDelay = config.initialDelay;
        }
        break;

      default:
        logger.warn(`Unknown retry strategy: ${config.strategy}, using fixed delay`);
        baseDelay = config.initialDelay;
    }

    // Apply max delay cap
    if (config.maxDelay !== undefined) {
      baseDelay = Math.min(baseDelay, config.maxDelay);
    }

    // Add jitter if enabled
    if (config.jitter) {
      baseDelay = this.addJitter(baseDelay);
    }

    return Math.floor(baseDelay);
  }

  /**
   * Fixed delay strategy
   */
  private fixedDelay(delay: number): number {
    return delay;
  }

  /**
   * Linear backoff: initialDelay + (attempt * multiplier * initialDelay)
   * Example: 1s, 2s, 3s, 4s, 5s...
   */
  private linearBackoff(attempt: number, initialDelay: number, multiplier: number): number {
    return initialDelay * attempt * multiplier;
  }

  /**
   * Exponential backoff: initialDelay * (multiplier ^ attempt)
   * Example with multiplier=2: 1s, 2s, 4s, 8s, 16s...
   */
  private exponentialBackoff(
    attempt: number,
    initialDelay: number,
    multiplier: number
  ): number {
    return initialDelay * Math.pow(multiplier, attempt - 1);
  }

  /**
   * Fibonacci backoff: initialDelay * fibonacci(attempt)
   * Example: 1s, 1s, 2s, 3s, 5s, 8s, 13s...
   */
  private fibonacciBackoff(attempt: number, initialDelay: number): number {
    const fibNumber = this.getFibonacci(attempt);
    return initialDelay * fibNumber;
  }

  /**
   * Get Fibonacci number (with caching)
   */
  private getFibonacci(n: number): number {
    if (this.fibonacciCache.has(n)) {
      return this.fibonacciCache.get(n)!;
    }

    if (n <= 1) return n === 0 ? 0 : 1;

    const result = this.getFibonacci(n - 1) + this.getFibonacci(n - 2);
    this.fibonacciCache.set(n, result);
    return result;
  }

  /**
   * Initialize Fibonacci cache
   */
  private initializeFibonacciCache(): void {
    for (let i = 0; i <= 30; i++) {
      this.getFibonacci(i);
    }
  }

  /**
   * Add random jitter to delay (±25%)
   */
  private addJitter(delay: number): number {
    const jitterRange = delay * 0.25;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    return Math.max(0, delay + jitter);
  }

  /**
   * Check if error should be retried
   */
  private shouldRetryError(error: Error, config: RetryConfig): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorCode = (error as any).code;

    // Check skipOnErrors first (takes precedence)
    if (config.skipOnErrors && config.skipOnErrors.length > 0) {
      for (const pattern of config.skipOnErrors) {
        if (this.matchesPattern(errorMessage, errorCode, pattern)) {
          return false;
        }
      }
    }

    // If retryOnErrors is specified, only retry matching errors
    if (config.retryOnErrors && config.retryOnErrors.length > 0) {
      for (const pattern of config.retryOnErrors) {
        if (this.matchesPattern(errorMessage, errorCode, pattern)) {
          return true;
        }
      }
      return false; // No match in whitelist
    }

    // Default retryable errors
    const defaultRetryable = [
      'timeout',
      'econnrefused',
      'econnreset',
      'enotfound',
      'etimedout',
      'network',
      'rate limit',
      'throttle',
      'too many requests',
      '429',
      '502',
      '503',
      '504',
      'temporary',
      'transient',
      'unavailable',
      'overload'
    ];

    for (const pattern of defaultRetryable) {
      if (this.matchesPattern(errorMessage, errorCode, pattern)) {
        return true;
      }
    }

    // Default non-retryable errors
    const defaultNonRetryable = [
      'auth',
      'unauthorized',
      'forbidden',
      'permission',
      '401',
      '403',
      'invalid',
      'bad request',
      '400',
      'not found',
      '404',
      'conflict',
      '409',
      'unprocessable',
      '422'
    ];

    for (const pattern of defaultNonRetryable) {
      if (this.matchesPattern(errorMessage, errorCode, pattern)) {
        return false;
      }
    }

    // Default to retryable for unknown errors
    return true;
  }

  /**
   * Check if error matches pattern
   */
  private matchesPattern(errorMessage: string, errorCode: string | undefined, pattern: string): boolean {
    const patternLower = pattern.toLowerCase();
    return (
      errorMessage.includes(patternLower) ||
      (errorCode && errorCode.toLowerCase() === patternLower) ||
      (errorCode && errorCode.toLowerCase().includes(patternLower))
    );
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create success result
   */
  private createSuccessResult<T>(
    result: T,
    state: RetryState,
    startTime: number,
    successAttempt?: number
  ): RetryResult<T> {
    const totalTime = Date.now() - startTime;
    const averageDelay = state.history.length > 0
      ? state.totalDelay / state.history.length
      : 0;

    return {
      success: true,
      result,
      state,
      metrics: {
        totalTime,
        totalRetries: state.attemptNumber - 1,
        averageDelay,
        successOnAttempt: successAttempt
      }
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(
    error: Error,
    state: RetryState,
    startTime: number
  ): RetryResult<never> {
    const totalTime = Date.now() - startTime;
    const averageDelay = state.history.length > 0
      ? state.totalDelay / state.history.length
      : 0;

    return {
      success: false,
      error,
      state,
      metrics: {
        totalTime,
        totalRetries: state.attemptNumber,
        averageDelay
      }
    };
  }

  /**
   * Get retry state for active retry
   */
  getRetryState(retryId: string): RetryState | undefined {
    return this.activeRetries.get(retryId);
  }

  /**
   * Get all active retries
   */
  getActiveRetries(): Map<string, RetryState> {
    return new Map(this.activeRetries);
  }

  /**
   * Cancel active retry
   */
  cancelRetry(retryId: string): boolean {
    return this.activeRetries.delete(retryId);
  }

  /**
   * Create default retry config
   */
  static createDefaultConfig(): RetryConfig {
    return {
      enabled: true,
      maxAttempts: 3,
      strategy: 'exponential',
      initialDelay: 1000,
      maxDelay: 30000,
      multiplier: 2,
      jitter: true
    };
  }

  /**
   * Create retry config from node configuration
   */
  static fromNodeConfig(nodeConfig: any): RetryConfig {
    return {
      enabled: nodeConfig?.retry?.enabled ?? false,
      maxAttempts: nodeConfig?.retry?.maxAttempts ?? 3,
      strategy: nodeConfig?.retry?.strategy ?? 'exponential',
      initialDelay: nodeConfig?.retry?.initialDelay ?? 1000,
      maxDelay: nodeConfig?.retry?.maxDelay ?? 30000,
      multiplier: nodeConfig?.retry?.multiplier ?? 2,
      jitter: nodeConfig?.retry?.jitter ?? true,
      retryOnErrors: nodeConfig?.retry?.retryOnErrors,
      skipOnErrors: nodeConfig?.retry?.skipOnErrors
    };
  }

  /**
   * Validate retry config
   */
  static validateConfig(config: Partial<RetryConfig>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (config.maxAttempts !== undefined) {
      if (config.maxAttempts < 0 || config.maxAttempts > 100) {
        errors.push('maxAttempts must be between 0 and 100');
      }
    }

    if (config.initialDelay !== undefined) {
      if (config.initialDelay < 0) {
        errors.push('initialDelay must be non-negative');
      }
    }

    if (config.maxDelay !== undefined) {
      if (config.maxDelay < 0) {
        errors.push('maxDelay must be non-negative');
      }
      if (config.initialDelay && config.maxDelay < config.initialDelay) {
        errors.push('maxDelay must be greater than or equal to initialDelay');
      }
    }

    if (config.multiplier !== undefined) {
      if (config.multiplier <= 0) {
        errors.push('multiplier must be positive');
      }
    }

    if (config.strategy === 'custom' && !config.customDelayFn) {
      errors.push('customDelayFn is required when using custom strategy');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate total possible delay for a config
   */
  static calculateTotalDelay(config: RetryConfig): number {
    let totalDelay = 0;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      let delay: number;

      switch (config.strategy) {
        case 'fixed':
          delay = config.initialDelay;
          break;
        case 'linear':
          delay = config.initialDelay * attempt * (config.multiplier || 1);
          break;
        case 'exponential':
          delay = config.initialDelay * Math.pow(config.multiplier || 2, attempt - 1);
          break;
        case 'fibonacci':
          const fib = this.getFibonacciStatic(attempt);
          delay = config.initialDelay * fib;
          break;
        case 'custom':
          if (config.customDelayFn) {
            delay = config.customDelayFn(attempt);
          } else {
            delay = config.initialDelay;
          }
          break;
        default:
          delay = config.initialDelay;
      }

      if (config.maxDelay !== undefined) {
        delay = Math.min(delay, config.maxDelay);
      }

      totalDelay += delay;
    }

    return totalDelay;
  }

  /**
   * Static Fibonacci helper
   */
  private static getFibonacciStatic(n: number): number {
    if (n <= 1) return n === 0 ? 0 : 1;

    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      const temp = a + b;
      a = b;
      b = temp;
    }
    return b;
  }

  /**
   * Get strategy description
   */
  static getStrategyDescription(strategy: RetryStrategy): string {
    switch (strategy) {
      case 'fixed':
        return 'Fixed delay between retries';
      case 'linear':
        return 'Linear increase in delay (1x, 2x, 3x...)';
      case 'exponential':
        return 'Exponential backoff (1x, 2x, 4x, 8x...)';
      case 'fibonacci':
        return 'Fibonacci sequence delay (1x, 1x, 2x, 3x, 5x, 8x...)';
      case 'custom':
        return 'Custom delay function';
      default:
        return 'Unknown strategy';
    }
  }
}

// Export singleton instance
export const retryManager = new RetryManager();
