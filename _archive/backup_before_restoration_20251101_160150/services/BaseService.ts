/**
 * Base Service Class
 * Provides common functionality for all services to reduce code duplication
 */

import { logger } from './LoggingService';
import { RateLimiter } from '../utils/security';
import type { ServiceConfig as CommonServiceConfig, AsyncFunction } from '../types/common';

export interface ServiceConfig extends Partial<CommonServiceConfig> {
  enableRateLimit?: boolean;
  rateLimitAttempts?: number;
  rateLimitWindowMs?: number;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  enableCaching?: boolean;
  cacheTimeoutMs?: number;
}

export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    executionTime: number;
    retryCount: number;
    fromCache: boolean;
  };
}

export abstract class BaseService {
  protected readonly serviceName: string;
  protected readonly config: Required<ServiceConfig>;
  private cache = new Map<string, { data: unknown; timestamp: number }>();

  constructor(serviceName: string, config: ServiceConfig = {}) {
    this.serviceName = serviceName;
    this.config = {
      enableRateLimit: true,
      rateLimitAttempts: 10,
      rateLimitWindowMs: 60000,
      enableRetry: true,
      maxRetries: 3,
      retryDelayMs: 1000,
      enableCaching: false,
      cacheTimeoutMs: 300000, // 5 minutes
      ...config
    };
    
    logger.debug(`${serviceName} service initialized`, { config: this.config });
  }

  /**
   * Execute a service operation with common error handling, retries, and rate limiting
   */
  protected async executeOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: {
      userId?: string;
      cacheKey?: string;
      skipRateLimit?: boolean;
      skipRetry?: boolean;
    } = {}
  ): Promise<ServiceResult<T>> {
    const { _userId = 'anonymous', cacheKey, skipRateLimit = false, skipRetry = false } = options;
    const startTime = performance.now();

    // Check cache first
    if (cacheKey && this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached as T,
          metadata: {
            executionTime: performance.now() - startTime,
            retryCount: 0,
            fromCache: true
          }
        };
      }
    }

    // Rate limiting
    if (!skipRateLimit && this.config.enableRateLimit) {
      if (!RateLimiter.isAllowed(
        `${this.serviceName}:${userId}`,
        this.config.rateLimitAttempts,
        this.config.rateLimitWindowMs
      )) {
        logger.warn(`Rate limit exceeded for ${this.serviceName}`, { userId, operationName });
        return {
          success: false,
          error: 'Rate limit exceeded',
          metadata: {
            executionTime: performance.now() - startTime,
            retryCount: 0,
            fromCache: false
          }
        };
      }
    }

    // Execute with retry logic
    while (retryCount <= (skipRetry ? 0 : this.config.maxRetries)) {
      try {
        logger.debug(`Executing ${this.serviceName}.${operationName}`, { 
          userId, 
          attempt: retryCount + 1 
        });


        // Cache successful result
        if (cacheKey && this.config.enableCaching) {
          this.setCache(cacheKey, result);
        }

        
        if (executionTime > 5000) { // Warn if operation takes more than 5 seconds
          logger.warn(`Slow operation detected: ${this.serviceName}.${operationName}`, {
            executionTime,
            retryCount
          });
        }

        return {
          success: true,
          data: result,
          metadata: {
            executionTime,
            retryCount,
            fromCache: false
          }
        };

      } catch (error) {
        retryCount++;
        
        logger.error(`${this.serviceName}.${operationName} failed`, {
          error: error instanceof Error ? error.message : String(error),
          userId,
          attempt: retryCount,
          maxRetries: this.config.maxRetries
        });

        // Don't retry on certain errors
        if (this.isNonRetryableError(error) || skipRetry) {
          break;
        }

        // If we have more retries left, wait before retrying
        if (retryCount <= this.config.maxRetries) {
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: `Operation failed after ${retryCount} attempts`,
      metadata: {
        executionTime: performance.now() - startTime,
        retryCount: retryCount - 1,
        fromCache: false
      }
    };
  }

  /**
   * Log service metrics for monitoring
   */
  protected logMetrics(operationName: string, result: ServiceResult): void {
    
    logger[level](`${this.serviceName} metrics`, {
      operation: operationName,
      success: result.success,
      executionTime: result.metadata?.executionTime,
      retryCount: result.metadata?.retryCount,
      fromCache: result.metadata?.fromCache,
      error: result.error
    });
  }

  /**
   * Determine if an error should not be retried
   */
  private isNonRetryableError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : '';

    const nonRetryablePatterns = [
      /validation/i,
      /unauthorized/i,
      /forbidden/i,
      /not found/i,
      /bad request/i,
      /conflict/i
    ];

    return nonRetryablePatterns.some(pattern =>
      pattern.test(errorMessage) || pattern.test(errorName)
    );
  }

  /**
   * Cache management
   */
  private getFromCache<T>(key: string): T | null {
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.config.cacheTimeoutMs) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.cacheTimeoutMs) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    logger.debug(`Cache cleanup completed for ${this.serviceName}`, { cleaned });
  }

  /**
   * Utility method for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for the service
   */
  public async healthCheck(): Promise<ServiceResult<{ status: string; checks: Record<string, boolean> }>> {
    return this.executeOperation('healthCheck', async () => {
      
      return {
        status: allPassed ? 'healthy' : 'degraded',
        checks
      };
    });
  }

  /**
   * Override this method in derived classes to implement specific health checks
   */
  protected async performHealthChecks(): Promise<Record<string, boolean>> {
    return {
      service: true // Base implementation always returns healthy
    };
  }

  /**
   * Get service statistics
   */
  public getStats(): {
    serviceName: string;
    cacheSize: number;
    config: ServiceConfig;
  } {
    return {
      serviceName: this.serviceName,
      cacheSize: this.cache.size,
      config: this.config
    };
  }

  /**
   * Clear service cache
   */
  public clearCache(): void {
    this.cache.clear();
    logger.info(`Cache cleared for ${this.serviceName}`);
  }

  /**
   * Cleanup resources - call this when service is no longer needed
   */
  public cleanup(): void {
    this.clearCache();
    logger.info(`${this.serviceName} service cleaned up`);
  }
}

/**
 * Base Data Service for services that work with data repositories
 */
export abstract class BaseDataService<T = unknown> extends BaseService {
  protected abstract validateData(data: unknown): T;
  protected abstract sanitizeData(data: T): T;

  /**
   * Execute a data operation with validation and sanitization
   */
  protected async executeDataOperation<R>(
    operationName: string,
    operation: (data: T) => Promise<R>,
    data: unknown,
    options: {
      userId?: string;
      skipValidation?: boolean;
      skipSanitization?: boolean;
    } = {}
  ): Promise<ServiceResult<R>> {
    const { _skipValidation = false, skipSanitization = false } = options;

    return this.executeOperation(operationName, async () => {

      if (!skipValidation) {
        processedData = this.validateData(data);
      }

      if (!skipSanitization) {
        processedData = this.sanitizeData(processedData);
      }

      return operation(processedData);
    }, options);
  }
}