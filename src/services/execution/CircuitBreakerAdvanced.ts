/**
 * Circuit Breaker (Advanced)
 * Prevents cascade failures by temporarily disabling failing operations
 *
 * Note: This is the advanced circuit breaker from AdvancedExecutionEngine.
 * For the standard circuit breaker, see src/execution/CircuitBreaker.ts
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreakerAdvanced {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: CircuitState = 'closed';
  private successCountInHalfOpen = 0;

  constructor(
    private failureThreshold: number,
    private timeout: number,
    private halfOpenMaxCalls: number = 3
  ) {}

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
        this.successCountInHalfOpen = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if operation can be executed
   */
  canExecute(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
        this.successCountInHalfOpen = 0;
        return true;
      }
      return false;
    }
    // half-open state - allow limited calls
    return this.successCountInHalfOpen < this.halfOpenMaxCalls;
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
    this.successCountInHalfOpen = 0;
  }

  /**
   * Force open the circuit (for manual intervention)
   */
  forceOpen(): void {
    this.state = 'open';
    this.lastFailureTime = Date.now();
  }

  /**
   * Force close the circuit (for manual intervention)
   */
  forceClose(): void {
    this.reset();
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successCountInHalfOpen++;
      if (this.successCountInHalfOpen >= this.halfOpenMaxCalls) {
        this.reset();
      }
    } else {
      this.failureCount = 0;
      this.state = 'closed';
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }
}
