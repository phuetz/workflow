/**
 * Rate Limiter
 * Token bucket rate limiter for execution queue management
 */

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillIntervalMs: number
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Try to acquire a token for execution
   * @returns true if token was acquired, false if rate limited
   */
  tryAcquire(): boolean {
    this.refillTokens();

    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Check available tokens without consuming
   */
  getAvailableTokens(): number {
    this.refillTokens();
    return this.tokens;
  }

  /**
   * Reset the rate limiter to full capacity
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Update configuration
   */
  configure(maxTokens: number, refillIntervalMs: number): void {
    this.maxTokens = maxTokens;
    this.refillIntervalMs = refillIntervalMs;
    this.reset();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const timeSinceRefill = now - this.lastRefill;
    if (timeSinceRefill >= this.refillIntervalMs) {
      this.tokens = this.maxTokens;
      this.lastRefill = now;
    }
  }
}
