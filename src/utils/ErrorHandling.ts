/**
 * Advanced Error Handling Utilities
 * Provides retry strategies, circuit breaker pattern, and error categorization
 */

import { logger } from '../services/SimpleLogger';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ErrorCategory = 'transient' | 'permanent' | 'timeout' | 'auth' | 'validation' | 'network' | 'unknown';

export interface RetryStrategy {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes needed to close circuit
  timeout: number; // Time to wait before trying again (ms)
  monitoringPeriod?: number; // Time window for counting failures (ms)
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}

export interface DeadLetterQueueItem {
  id: string;
  error: Error;
  context: Record<string, unknown>;
  timestamp: number;
  attemptCount: number;
  category: ErrorCategory;
}

// ============================================================================
// RETRY STRATEGIES
// ============================================================================

/**
 * Exponential backoff retry strategy
 */
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  strategy: RetryStrategy
): Promise<T> {
  const {
    maxAttempts,
    delayMs,
    backoffMultiplier = 2,
    maxDelayMs = 30000,
    retryableErrors,
    onRetry
  } = strategy;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (retryableErrors && !isRetryableError(lastError, retryableErrors)) {
        logger.info(`Error is not retryable: ${lastError.message}`);
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        logger.error(`Max retry attempts (${maxAttempts}) reached`);
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        delayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );

      logger.warn(`Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms`, {
        error: lastError.message
      });

      // Call retry callback
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Linear backoff retry strategy
 */
export async function retryWithLinearBackoff<T>(
  fn: () => Promise<T>,
  strategy: RetryStrategy
): Promise<T> {
  const {
    maxAttempts,
    delayMs,
    maxDelayMs = 30000,
    retryableErrors,
    onRetry
  } = strategy;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (retryableErrors && !isRetryableError(lastError, retryableErrors)) {
        throw lastError;
      }

      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Linear increase in delay
      const delay = Math.min(delayMs * attempt, maxDelayMs);

      logger.warn(`Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms`);

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Custom retry strategy with jitter
 */
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  strategy: RetryStrategy
): Promise<T> {
  const {
    maxAttempts,
    delayMs,
    backoffMultiplier = 2,
    maxDelayMs = 30000,
    retryableErrors,
    onRetry
  } = strategy;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (retryableErrors && !isRetryableError(lastError, retryableErrors)) {
        throw lastError;
      }

      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Calculate base delay with exponential backoff
      const baseDelay = Math.min(
        delayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );

      // Add jitter (random variance of ±25%)
      const jitter = baseDelay * 0.25 * (Math.random() - 0.5) * 2;
      const delay = Math.max(0, baseDelay + jitter);

      logger.warn(`Attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(delay)}ms`);

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed');
}

// ============================================================================
// CIRCUIT BREAKER PATTERN
// ============================================================================

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitBreakerState;
  private failureTimestamps: number[] = [];

  constructor(private config: CircuitBreakerConfig) {
    this.state = {
      state: 'closed',
      failureCount: 0,
      successCount: 0
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state.state === 'open') {
      const now = Date.now();

      // Check if we should try again
      if (this.state.nextAttemptTime && now < this.state.nextAttemptTime) {
        throw new Error(`Circuit breaker is OPEN. Next attempt at ${new Date(this.state.nextAttemptTime).toISOString()}`);
      }

      // Transition to half-open
      logger.info('Circuit breaker transitioning to HALF-OPEN');
      this.state.state = 'half-open';
      this.state.successCount = 0;
    }

    try {
      const result = await fn();

      // Record success
      this.onSuccess();

      return result;

    } catch (error) {
      // Record failure
      this.onFailure();

      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.state.successCount++;

    if (this.state.state === 'half-open') {
      // Check if we have enough successes to close circuit
      if (this.state.successCount >= this.config.successThreshold) {
        logger.info('Circuit breaker transitioning to CLOSED');
        this.state.state = 'closed';
        this.state.failureCount = 0;
        this.state.successCount = 0;
        this.failureTimestamps = [];
      }
    } else if (this.state.state === 'closed') {
      // Reset failure count on success
      if (this.state.successCount >= 5) {
        this.state.failureCount = 0;
        this.failureTimestamps = [];
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    const now = Date.now();
    this.state.failureCount++;
    this.state.lastFailureTime = now;
    this.failureTimestamps.push(now);

    // Clean up old timestamps if monitoring period is set
    if (this.config.monitoringPeriod) {
      const cutoff = now - this.config.monitoringPeriod;
      this.failureTimestamps = this.failureTimestamps.filter(ts => ts > cutoff);
      this.state.failureCount = this.failureTimestamps.length;
    }

    if (this.state.state === 'half-open') {
      // Failure in half-open state opens circuit immediately
      logger.warn('Circuit breaker opening due to failure in HALF-OPEN state');
      this.openCircuit();
    } else if (this.state.state === 'closed') {
      // Check if we've exceeded failure threshold
      if (this.state.failureCount >= this.config.failureThreshold) {
        logger.warn(`Circuit breaker opening due to ${this.state.failureCount} failures`);
        this.openCircuit();
      }
    }
  }

  /**
   * Open the circuit
   */
  private openCircuit(): void {
    this.state.state = 'open';
    this.state.nextAttemptTime = Date.now() + this.config.timeout;
    this.state.successCount = 0;
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = {
      state: 'closed',
      failureCount: 0,
      successCount: 0
    };
    this.failureTimestamps = [];
    logger.info('Circuit breaker reset');
  }

  /**
   * Get statistics
   */
  getStats(): {
    state: string;
    totalFailures: number;
    recentFailures: number;
    successCount: number;
    nextAttempt?: string;
  } {
    return {
      state: this.state.state,
      totalFailures: this.state.failureCount,
      recentFailures: this.failureTimestamps.length,
      successCount: this.state.successCount,
      nextAttempt: this.state.nextAttemptTime
        ? new Date(this.state.nextAttemptTime).toISOString()
        : undefined
    };
  }
}

// ============================================================================
// DEAD LETTER QUEUE
// ============================================================================

/**
 * Dead Letter Queue for failed operations
 */
export class DeadLetterQueue {
  private queue: DeadLetterQueueItem[] = [];
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Add item to dead letter queue
   */
  add(error: Error, context: Record<string, unknown>, attemptCount: number): void {
    const item: DeadLetterQueueItem = {
      id: this.generateId(),
      error,
      context,
      timestamp: Date.now(),
      attemptCount,
      category: categorizeError(error)
    };

    this.queue.push(item);

    // Enforce max size
    if (this.queue.length > this.maxSize) {
      this.queue.shift();
    }

    logger.error('Item added to dead letter queue', {
      id: item.id,
      error: error.message,
      category: item.category,
      attemptCount
    });
  }

  /**
   * Get all items
   */
  getAll(): DeadLetterQueueItem[] {
    return [...this.queue];
  }

  /**
   * Get items by category
   */
  getByCategory(category: ErrorCategory): DeadLetterQueueItem[] {
    return this.queue.filter(item => item.category === category);
  }

  /**
   * Get items by time range
   */
  getByTimeRange(startTime: number, endTime: number): DeadLetterQueueItem[] {
    return this.queue.filter(item =>
      item.timestamp >= startTime && item.timestamp <= endTime
    );
  }

  /**
   * Remove item from queue
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.queue = [];
    logger.info('Dead letter queue cleared');
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalItems: number;
    byCategory: Record<ErrorCategory, number>;
    oldestItem?: Date;
    newestItem?: Date;
  } {
    const byCategory: Record<ErrorCategory, number> = {
      transient: 0,
      permanent: 0,
      timeout: 0,
      auth: 0,
      validation: 0,
      network: 0,
      unknown: 0
    };

    for (const item of this.queue) {
      byCategory[item.category]++;
    }

    return {
      totalItems: this.queue.length,
      byCategory,
      oldestItem: this.queue.length > 0 ? new Date(this.queue[0].timestamp) : undefined,
      newestItem: this.queue.length > 0 ? new Date(this.queue[this.queue.length - 1].timestamp) : undefined
    };
  }

  private generateId(): string {
    return `dlq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// ERROR CATEGORIZATION
// ============================================================================

/**
 * Categorize error as transient or permanent
 */
export function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out') || name.includes('timeout')) {
    return 'timeout';
  }

  // Authentication/Authorization errors
  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('authentication') ||
    message.includes('auth') ||
    name.includes('auth')
  ) {
    return 'auth';
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('malformed') ||
    name.includes('validation')
  ) {
    return 'validation';
  }

  // Network errors (usually transient)
  if (
    message.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('etimedout') ||
    message.includes('econnreset') ||
    name.includes('network')
  ) {
    return 'network';
  }

  // Transient errors (rate limits, temporary unavailability)
  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('service unavailable') ||
    message.includes('temporarily') ||
    message.includes('503') ||
    message.includes('429')
  ) {
    return 'transient';
  }

  // Permanent errors
  if (
    message.includes('not found') ||
    message.includes('does not exist') ||
    message.includes('404') ||
    message.includes('410')
  ) {
    return 'permanent';
  }

  // Default to unknown
  return 'unknown';
}

/**
 * Check if error is transient (retryable)
 */
export function isTransientError(error: Error): boolean {
  const category = categorizeError(error);
  return category === 'transient' || category === 'timeout' || category === 'network';
}

/**
 * Check if error matches retryable patterns
 */
function isRetryableError(error: Error, retryableErrors: string[]): boolean {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  return retryableErrors.some(pattern => {
    const lowerPattern = pattern.toLowerCase();
    return message.includes(lowerPattern) || name.includes(lowerPattern);
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a timeout promise
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Retry with timeout
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  strategy: RetryStrategy,
  timeoutMs: number
): Promise<T> {
  return withTimeout(retryWithExponentialBackoff(fn, strategy), timeoutMs);
}

export default {
  retryWithExponentialBackoff,
  retryWithLinearBackoff,
  retryWithJitter,
  CircuitBreaker,
  DeadLetterQueue,
  categorizeError,
  isTransientError,
  withTimeout,
  retryWithTimeout
};
