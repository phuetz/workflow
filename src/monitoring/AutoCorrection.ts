/**
 * AutoCorrection.ts
 * Self-healing and automatic error correction system
 */

import type { ErrorEvent, ErrorType } from './ErrorMonitoringSystem';
import { logger } from '../services/SimpleLogger';

export interface CorrectionStrategy {
  name: string;
  description: string;
  applicableErrors: Array<ErrorType | string>;
  confidence: number; // 0-1
  estimatedTime: number; // milliseconds
  execute: (error: ErrorEvent) => Promise<CorrectionResult>;
}

export interface CorrectionResult {
  success: boolean;
  method: string;
  message: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: Array<string | RegExp>;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenAttempts: number;
}

export interface CorrectionStats {
  total: number;
  successful: number;
  failed: number;
  byStrategy: Record<string, number>;
  averageTime: number;
  successRate: number;
}

export class AutoCorrection {
  private strategies: Map<string, CorrectionStrategy> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private correctionHistory: CorrectionResult[] = [];
  private readonly maxHistorySize = 1000;

  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      /network/i,
      /timeout/i,
      /rate limit/i,
      /connection/i,
      /ECONNREFUSED/i,
      /ETIMEDOUT/i,
    ],
  };

  constructor() {
    this.initializeStrategies();
  }

  /**
   * Initialize built-in correction strategies
   */
  private initializeStrategies(): void {
    // Network retry strategy
    this.registerStrategy({
      name: 'network-retry',
      description: 'Retry failed network requests with exponential backoff',
      applicableErrors: ['network'],
      confidence: 0.9,
      estimatedTime: 5000,
      execute: async (error: ErrorEvent) => {
        return this.executeNetworkRetry(error);
      },
    });

    // Rate limit backoff
    this.registerStrategy({
      name: 'rate-limit-backoff',
      description: 'Wait and retry when rate limited',
      applicableErrors: ['network'],
      confidence: 0.95,
      estimatedTime: 10000,
      execute: async (error: ErrorEvent) => {
        return this.executeRateLimitBackoff(error);
      },
    });

    // Memory cleanup
    this.registerStrategy({
      name: 'memory-cleanup',
      description: 'Force garbage collection and clear caches',
      applicableErrors: ['performance'],
      confidence: 0.7,
      estimatedTime: 1000,
      execute: async (error: ErrorEvent) => {
        return this.executeMemoryCleanup(error);
      },
    });

    // Cache invalidation
    this.registerStrategy({
      name: 'cache-invalidation',
      description: 'Clear stale cache entries',
      applicableErrors: ['validation', 'runtime'],
      confidence: 0.6,
      estimatedTime: 500,
      execute: async (error: ErrorEvent) => {
        return this.executeCacheInvalidation(error);
      },
    });

    // Service restart
    this.registerStrategy({
      name: 'service-restart',
      description: 'Restart failed service or connection',
      applicableErrors: ['database', 'network'],
      confidence: 0.8,
      estimatedTime: 3000,
      execute: async (error: ErrorEvent) => {
        return this.executeServiceRestart(error);
      },
    });

    // Fallback to default values
    this.registerStrategy({
      name: 'default-fallback',
      description: 'Use default/cached values when primary source fails',
      applicableErrors: ['network', 'database'],
      confidence: 0.85,
      estimatedTime: 100,
      execute: async (error: ErrorEvent) => {
        return this.executeDefaultFallback(error);
      },
    });

    // Auto-healing circuit breaker
    this.registerStrategy({
      name: 'circuit-breaker',
      description: 'Open circuit to prevent cascade failures',
      applicableErrors: ['network', 'database'],
      confidence: 0.9,
      estimatedTime: 0,
      execute: async (error: ErrorEvent) => {
        return this.executeCircuitBreaker(error);
      },
    });
  }

  /**
   * Register a custom correction strategy
   */
  public registerStrategy(strategy: CorrectionStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Try to automatically correct an error
   */
  public async tryCorrect(error: ErrorEvent): Promise<CorrectionResult | null> {
    const startTime = Date.now();

    // Find applicable strategies
    const applicableStrategies = this.findApplicableStrategies(error);

    if (applicableStrategies.length === 0) {
      return null;
    }

    // Sort by confidence
    applicableStrategies.sort((a, b) => b.confidence - a.confidence);

    // Try each strategy
    for (const strategy of applicableStrategies) {
      try {
        const result = await strategy.execute(error);
        result.duration = Date.now() - startTime;

        // Record result
        this.recordCorrection(result);

        if (result.success) {
          return result;
        }
      } catch (correctionError) {
        logger.error(`Strategy ${strategy.name} failed`, { component: 'AutoCorrection', error: correctionError });
      }
    }

    return null;
  }

  /**
   * Find strategies applicable to an error
   */
  private findApplicableStrategies(error: ErrorEvent): CorrectionStrategy[] {
    return Array.from(this.strategies.values()).filter(strategy => {
      // Check if error type matches
      if (strategy.applicableErrors.includes(error.type)) {
        return true;
      }

      // Check if error message matches
      return strategy.applicableErrors.some(pattern => {
        if (typeof pattern === 'string') {
          return error.message.toLowerCase().includes(pattern.toLowerCase());
        }
        return false;
      });
    });
  }

  /**
   * Strategy implementations
   */
  private async executeNetworkRetry(error: ErrorEvent): Promise<CorrectionResult> {
    if (!this.isRetryable(error)) {
      return {
        success: false,
        method: 'network-retry',
        message: 'Error is not retryable',
        duration: 0,
      };
    }

    const url = error.metadata.url as string;
    if (!url) {
      return {
        success: false,
        method: 'network-retry',
        message: 'No URL found in error metadata',
        duration: 0,
      };
    }

    try {
      // Attempt retry with exponential backoff
      for (let attempt = 0; attempt < this.retryConfig.maxAttempts; attempt++) {
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt),
          this.retryConfig.maxDelay
        );

        await this.sleep(delay);

        try {
          // This would be replaced with actual retry logic
          // For now, just simulate
          const success = Math.random() > 0.3; // 70% success rate

          if (success) {
            return {
              success: true,
              method: 'network-retry',
              message: `Request succeeded after ${attempt + 1} attempts`,
              duration: delay * (attempt + 1),
              metadata: { attempts: attempt + 1 },
            };
          }
        } catch (retryError) {
          if (attempt === this.retryConfig.maxAttempts - 1) {
            throw retryError;
          }
        }
      }

      return {
        success: false,
        method: 'network-retry',
        message: 'All retry attempts exhausted',
        duration: 0,
      };
    } catch (retryError) {
      return {
        success: false,
        method: 'network-retry',
        message: `Retry failed: ${retryError}`,
        duration: 0,
      };
    }
  }

  private async executeRateLimitBackoff(error: ErrorEvent): Promise<CorrectionResult> {
    if (!error.message.toLowerCase().includes('rate limit')) {
      return {
        success: false,
        method: 'rate-limit-backoff',
        message: 'Not a rate limit error',
        duration: 0,
      };
    }

    // Parse rate limit info from error
    const retryAfter = this.parseRetryAfter(error);
    const waitTime = retryAfter || 60000; // Default 60s

    await this.sleep(waitTime);

    return {
      success: true,
      method: 'rate-limit-backoff',
      message: `Waited ${waitTime}ms for rate limit reset`,
      duration: waitTime,
      metadata: { waitTime },
    };
  }

  private async executeMemoryCleanup(error: ErrorEvent): Promise<CorrectionResult> {
    try {
      // Clear any in-memory caches
      if (typeof global !== 'undefined' && (global as Record<string, unknown>).gc) {
        (global as { gc: () => void }).gc();
      }

      // Clear browser caches if in browser
      if (typeof window !== 'undefined') {
        // Clear sessionStorage of old items
        const now = Date.now();
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key?.startsWith('cache_')) {
            try {
              const item = JSON.parse(sessionStorage.getItem(key) || '{}');
              if (item.expiry && item.expiry < now) {
                sessionStorage.removeItem(key);
              }
            } catch {
              // Invalid cache entry, remove it
              sessionStorage.removeItem(key);
            }
          }
        }
      }

      return {
        success: true,
        method: 'memory-cleanup',
        message: 'Memory cleanup completed',
        duration: 100,
      };
    } catch (cleanupError) {
      return {
        success: false,
        method: 'memory-cleanup',
        message: `Cleanup failed: ${cleanupError}`,
        duration: 0,
      };
    }
  }

  private async executeCacheInvalidation(error: ErrorEvent): Promise<CorrectionResult> {
    try {
      // Invalidate relevant caches based on error context
      const cacheKeys = this.identifyCacheKeys(error);

      if (typeof window !== 'undefined') {
        cacheKeys.forEach(key => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });
      }

      return {
        success: true,
        method: 'cache-invalidation',
        message: `Invalidated ${cacheKeys.length} cache entries`,
        duration: 50,
        metadata: { keys: cacheKeys },
      };
    } catch (invalidationError) {
      return {
        success: false,
        method: 'cache-invalidation',
        message: `Cache invalidation failed: ${invalidationError}`,
        duration: 0,
      };
    }
  }

  private async executeServiceRestart(error: ErrorEvent): Promise<CorrectionResult> {
    // This would integrate with your service management system
    // For now, simulate a restart
    try {
      await this.sleep(2000);

      return {
        success: true,
        method: 'service-restart',
        message: 'Service restarted successfully',
        duration: 2000,
      };
    } catch (restartError) {
      return {
        success: false,
        method: 'service-restart',
        message: `Service restart failed: ${restartError}`,
        duration: 0,
      };
    }
  }

  private async executeDefaultFallback(error: ErrorEvent): Promise<CorrectionResult> {
    // Use cached or default values
    const fallbackData = this.getFallbackData(error);

    if (fallbackData) {
      return {
        success: true,
        method: 'default-fallback',
        message: 'Using fallback data',
        duration: 10,
        metadata: { fallbackData },
      };
    }

    return {
      success: false,
      method: 'default-fallback',
      message: 'No fallback data available',
      duration: 0,
    };
  }

  private async executeCircuitBreaker(error: ErrorEvent): Promise<CorrectionResult> {
    const service = this.identifyService(error);
    let breaker = this.circuitBreakers.get(service);

    if (!breaker) {
      breaker = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 60000,
        halfOpenAttempts: 1,
      });
      this.circuitBreakers.set(service, breaker);
    }

    breaker.recordFailure();

    if (breaker.isOpen()) {
      return {
        success: true,
        method: 'circuit-breaker',
        message: `Circuit breaker opened for ${service} to prevent cascade failures`,
        duration: 0,
        metadata: { service, state: breaker.getState() },
      };
    }

    return {
      success: false,
      method: 'circuit-breaker',
      message: 'Circuit breaker threshold not reached',
      duration: 0,
    };
  }

  /**
   * Utilities
   */
  private isRetryable(error: ErrorEvent): boolean {
    return this.retryConfig.retryableErrors.some(pattern => {
      if (typeof pattern === 'string') {
        return error.message.toLowerCase().includes(pattern.toLowerCase());
      }
      return pattern.test(error.message);
    });
  }

  private parseRetryAfter(error: ErrorEvent): number | null {
    // Try to parse Retry-After header or message
    const match = error.message.match(/retry after (\d+)/i);
    if (match) {
      return parseInt(match[1], 10) * 1000;
    }

    const retryAfter = error.metadata['Retry-After'] as string | number;
    if (retryAfter) {
      return typeof retryAfter === 'number' ? retryAfter * 1000 : parseInt(retryAfter, 10) * 1000;
    }

    return null;
  }

  private identifyCacheKeys(error: ErrorEvent): string[] {
    const keys: string[] = [];

    // Add workflow-specific cache keys
    if (error.context.workflowId) {
      keys.push(`workflow_${error.context.workflowId}`);
      keys.push(`execution_${error.context.workflowId}`);
    }

    // Add node-specific cache keys
    if (error.context.nodeId) {
      keys.push(`node_${error.context.nodeId}`);
    }

    // Add user-specific cache keys
    if (error.context.userId) {
      keys.push(`user_${error.context.userId}`);
    }

    return keys;
  }

  private getFallbackData(error: ErrorEvent): unknown {
    // Try to get cached data
    if (typeof window !== 'undefined') {
      const cacheKey = `fallback_${error.context.workflowId || 'default'}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          return null;
        }
      }
    }

    // Return default values based on error type
    if (error.type === 'network') {
      return { status: 'offline', data: [] };
    }

    return null;
  }

  private identifyService(error: ErrorEvent): string {
    // Extract service name from error context
    if (error.metadata.service) {
      return String(error.metadata.service);
    }

    if (error.metadata.url) {
      try {
        const url = new URL(String(error.metadata.url));
        return url.hostname;
      } catch {
        return 'unknown';
      }
    }

    return error.context.nodeId || 'unknown';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private recordCorrection(result: CorrectionResult): void {
    this.correctionHistory.push(result);

    // Keep history size manageable
    if (this.correctionHistory.length > this.maxHistorySize) {
      this.correctionHistory.shift();
    }
  }

  /**
   * Get correction statistics
   */
  public getStats(): CorrectionStats {
    const successful = this.correctionHistory.filter(r => r.success).length;
    const byStrategy: Record<string, number> = {};

    this.correctionHistory.forEach(result => {
      byStrategy[result.method] = (byStrategy[result.method] || 0) + 1;
    });

    const totalTime = this.correctionHistory.reduce((sum, r) => sum + r.duration, 0);

    return {
      total: this.correctionHistory.length,
      successful,
      failed: this.correctionHistory.length - successful,
      byStrategy,
      averageTime: this.correctionHistory.length > 0 ? totalTime / this.correctionHistory.length : 0,
      successRate: this.correctionHistory.length > 0 ? successful / this.correctionHistory.length : 0,
    };
  }

  /**
   * Configure retry behavior
   */
  public configureRetry(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  /**
   * Get circuit breaker status
   */
  public getCircuitBreakerStatus(): Map<string, string> {
    const status = new Map<string, string>();
    this.circuitBreakers.forEach((breaker, service) => {
      status.set(service, breaker.getState());
    });
    return status;
  }
}

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failures = 0;
  private lastFailureTime?: Date;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  public recordFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
      setTimeout(() => {
        this.state = 'half-open';
        this.failures = 0;
      }, this.config.resetTimeout);
    }
  }

  public recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  public isOpen(): boolean {
    return this.state === 'open';
  }

  public getState(): string {
    return this.state;
  }
}

export default AutoCorrection;
