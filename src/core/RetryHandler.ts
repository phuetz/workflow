/**
 * Retry Handler System
 * Implements sophisticated retry logic with multiple strategies
 */

import { WorkflowNode } from '../types/workflow';
import { ExecutionResult } from '../types/common-types';
import { logger } from '../services/SimpleLogger';

export interface RetryConfig {
  maxRetries: number;
  strategy: 'exponential' | 'linear' | 'fibonacci' | 'custom';
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
  jitter?: boolean;
  retryableErrors?: string[];
  nonRetryableErrors?: string[];
  onRetry?: (attempt: number, error: Error) => void;
  customDelayFn?: (attempt: number) => number;
}

export interface RetryResult {
  success: boolean;
  attempts: number;
  totalTime: number;
  lastError?: Error;
  retryHistory: RetryAttempt[];
}

interface RetryAttempt {
  attempt: number;
  timestamp: Date;
  error?: string;
  delay: number;
}

export class RetryHandler {
  private fibonacciCache: Map<number, number> = new Map();

  constructor() {
    // Pre-calculate fibonacci numbers
    this.initFibonacci();
  }

  /**
   * Execute function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig
  ): Promise<{ result?: T; retryInfo: RetryResult }> {
    const startTime = Date.now();
    const retryHistory: RetryAttempt[] = [];
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      const attemptStart = Date.now();
      
      try {
        // Execute the function
        const result = await fn();
        
        return {
          result,
          retryInfo: {
            success: true,
            attempts: attempt + 1,
            totalTime: Date.now() - startTime,
            retryHistory
          }
        };
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error as Error, config)) {
          logger.error(`Non-retryable error encountered: ${(error as Error).message}`);
          break;
        }

        // Record attempt
        retryHistory.push({
          attempt: attempt + 1,
          timestamp: new Date(),
          error: (error as Error).message,
          delay: 0
        });

        // Check if we've exhausted retries
        if (attempt === config.maxRetries) {
          logger.error(`Max retries (${config.maxRetries}) exceeded`);
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, config);
        retryHistory[retryHistory.length - 1].delay = delay;

        // Call retry callback if provided
        if (config.onRetry) {
          config.onRetry(attempt + 1, error as Error);
        }

        logger.info(`Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms`);
        
        // Wait before retry
        await this.delay(delay);
      }
    }

    // All retries exhausted
    return {
      retryInfo: {
        success: false,
        attempts: retryHistory.length,
        totalTime: Date.now() - startTime,
        lastError,
        retryHistory
      }
    };
  }

  /**
   * Execute workflow node with retry
   */
  async executeNodeWithRetry(
    node: WorkflowNode,
    executor: (node: WorkflowNode) => Promise<ExecutionResult>,
    config?: Partial<RetryConfig>
  ): Promise<ExecutionResult> {
    const nodeConfig = node.data.config as Record<string, unknown> | undefined;
    const retryCount = (nodeConfig?.retryCount as number) || 3;
    const retryStrategy = (nodeConfig?.retryStrategy as 'exponential' | 'linear' | 'fibonacci' | 'custom') || 'exponential';

    const retryConfig: RetryConfig = {
      maxRetries: retryCount,
      strategy: retryStrategy,
      initialDelay: 1000,
      maxDelay: 30000,
      factor: 2,
      jitter: true,
      ...config
    };

    const { result, retryInfo } = await this.executeWithRetry(
      () => executor(node),
      retryConfig
    );

    if (retryInfo.success && result) {
      return {
        ...result,
        metadata: {
          ...result.metadata,
          retryInfo: {
            attempts: retryInfo.attempts,
            totalRetryTime: retryInfo.totalTime
          }
        }
      };
    }

    return {
      success: false,
      error: {
        message: retryInfo.lastError?.message || 'Unknown error after retries',
        code: 'RETRY_EXHAUSTED',
        stack: retryInfo.lastError?.stack
      },
      metadata: {
        retryInfo: {
          attempts: retryInfo.attempts,
          totalRetryTime: retryInfo.totalTime,
          history: retryInfo.retryHistory
        }
      }
    };
  }

  /**
   * Calculate delay based on strategy
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let baseDelay: number;

    switch (config.strategy) {
      case 'exponential':
        baseDelay = this.exponentialDelay(
          attempt,
          config.initialDelay || 1000,
          config.factor || 2
        );
        break;

      case 'linear':
        baseDelay = this.linearDelay(
          attempt,
          config.initialDelay || 1000,
          config.factor || 1000
        );
        break;

      case 'fibonacci':
        baseDelay = this.fibonacciDelay(
          attempt,
          config.initialDelay || 1000
        );
        break;

      case 'custom':
        if (config.customDelayFn) {
          baseDelay = config.customDelayFn(attempt);
        } else {
          baseDelay = config.initialDelay || 1000;
        }
        break;

      default:
        baseDelay = config.initialDelay || 1000;
    }

    // Apply max delay cap
    if (config.maxDelay) {
      baseDelay = Math.min(baseDelay, config.maxDelay);
    }

    // Add jitter if enabled
    if (config.jitter) {
      baseDelay = this.addJitter(baseDelay);
    }

    return Math.floor(baseDelay);
  }

  /**
   * Exponential backoff delay
   */
  private exponentialDelay(attempt: number, initial: number, factor: number): number {
    return initial * Math.pow(factor, attempt);
  }

  /**
   * Linear delay
   */
  private linearDelay(attempt: number, initial: number, increment: number): number {
    return initial + (attempt * increment);
  }

  /**
   * Fibonacci sequence delay
   */
  private fibonacciDelay(attempt: number, multiplier: number): number {
    const fib = this.getFibonacci(attempt + 1);
    return fib * multiplier;
  }

  /**
   * Get fibonacci number
   */
  private getFibonacci(n: number): number {
    if (this.fibonacciCache.has(n)) {
      return this.fibonacciCache.get(n)!;
    }

    if (n <= 1) return n;
    
    const result = this.getFibonacci(n - 1) + this.getFibonacci(n - 2);
    this.fibonacciCache.set(n, result);
    return result;
  }

  /**
   * Initialize fibonacci cache
   */
  private initFibonacci(): void {
    for (let i = 0; i <= 20; i++) {
      this.getFibonacci(i);
    }
  }

  /**
   * Add random jitter to delay
   */
  private addJitter(delay: number): number {
    // Add ±25% jitter
    const jitter = delay * 0.25;
    return delay + (Math.random() * jitter * 2 - jitter);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error, config: RetryConfig): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorCode = (error as any).code;

    // Check non-retryable errors first
    if (config.nonRetryableErrors) {
      for (const pattern of config.nonRetryableErrors) {
        if (errorMessage.includes(pattern.toLowerCase()) || errorCode === pattern) {
          return false;
        }
      }
    }

    // Check retryable errors
    if (config.retryableErrors && config.retryableErrors.length > 0) {
      for (const pattern of config.retryableErrors) {
        if (errorMessage.includes(pattern.toLowerCase()) || errorCode === pattern) {
          return true;
        }
      }
      return false; // If list provided but no match, don't retry
    }

    // Default retryable errors
    const defaultRetryable = [
      'timeout',
      'econnrefused',
      'enotfound',
      'network',
      'rate limit',
      'throttle',
      '429',
      '502',
      '503',
      '504',
      'temporary',
      'transient'
    ];

    for (const pattern of defaultRetryable) {
      if (errorMessage.includes(pattern) || errorCode === pattern) {
        return true;
      }
    }

    // Default non-retryable errors
    const defaultNonRetryable = [
      'auth',
      'unauthorized',
      'forbidden',
      '401',
      '403',
      'invalid',
      'bad request',
      '400',
      'not found',
      '404'
    ];

    for (const pattern of defaultNonRetryable) {
      if (errorMessage.includes(pattern) || errorCode === pattern) {
        return false;
      }
    }

    // Default to retryable for unknown errors
    return true;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create circuit breaker for a function
   */
  createCircuitBreaker<T>(
    fn: () => Promise<T>,
    options: {
      threshold: number;
      timeout: number;
      resetTimeout: number;
    }
  ): () => Promise<T> {
    let failures = 0;
    let lastFailureTime = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';

    return async () => {
      // Check if circuit should be reset
      if (state === 'open' && Date.now() - lastFailureTime > options.resetTimeout) {
        state = 'half-open';
        failures = 0;
      }

      // If circuit is open, fail fast
      if (state === 'open') {
        throw new Error('Circuit breaker is open');
      }

      try {
        const result = await Promise.race([
          fn(),
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error('Circuit breaker timeout')), options.timeout)
          )
        ]);

        // Success - reset failures
        if (state === 'half-open') {
          state = 'closed';
        }
        failures = 0;
        
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();

        if (failures >= options.threshold) {
          state = 'open';
          logger.error(`Circuit breaker opened after ${failures} failures`);
        }

        throw error;
      }
    };
  }

  /**
   * Bulk retry for multiple operations
   */
  async bulkRetry<T>(
    operations: Array<() => Promise<T>>,
    config: RetryConfig & { concurrency?: number }
  ): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
    const concurrency = config.concurrency || 5;
    const results: Array<{ success: boolean; result?: T; error?: Error }> = [];
    
    // Process in batches
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (op) => {
          try {
            const { result, retryInfo } = await this.executeWithRetry(op, config);
            return {
              success: retryInfo.success,
              result,
              error: retryInfo.lastError
            };
          } catch (error) {
            return {
              success: false,
              error: error as Error
            };
          }
        })
      );
      results.push(...batchResults);
    }

    return results;
  }
}

// Export singleton instance
export const retryHandler = new RetryHandler();