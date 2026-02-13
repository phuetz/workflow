/**
 * Intelligent Rate Limiting Service
 * Advanced rate limiting with Redis, user-based limits, and adaptive algorithms
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { logger } from './LoggingService';
import { config } from '../config/environment';

interface RateLimitRule {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  onLimitReached?: (req: Request) => void;
}

interface RateLimitInfo {
  totalHits: number;
  totalDuration: number;
  resetTime: Date;
  remaining: number;
}

export class RateLimitService {
  private static instance: RateLimitService;
  private redis: Redis;
  private rules: Map<string, RateLimitRule> = new Map();
  private adaptiveThresholds: Map<string, number> = new Map();

  private constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.initializeDefaultRules();
    this.startAdaptiveMonitoring();
  }

  public static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  private initializeDefaultRules(): void {
    // Global rate limit
    this.rules.set('global', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000,
      message: 'Too many requests, please try again later.',
      keyGenerator: (req) => req.ip
    });

    // API endpoints - more restrictive
    this.rules.set('api', {
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'API rate limit exceeded.',
      keyGenerator: (req) => `api:${req.ip}:${req.headers['user-id'] || 'anonymous'}`,
      skipSuccessfulRequests: false
    });

    // Authentication endpoints - very restrictive
    this.rules.set('auth', {
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: 'Too many authentication attempts, please wait.',
      keyGenerator: (req) => `auth:${req.ip}`,
      onLimitReached: (req) => {
        logger.warn('🚨 Authentication rate limit exceeded', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          path: req.path
        });
      }
    });

    // Workflow execution - per user
    this.rules.set('execution', {
      windowMs: 60 * 1000, // 1 minute
      max: 10,
      message: 'Workflow execution rate limit exceeded.',
      keyGenerator: (req) => `exec:${req.headers['user-id'] || req.ip}`,
      skip: (req) => !req.path.includes('/execute')
    });

    // File upload
    this.rules.set('upload', {
      windowMs: 60 * 1000,
      max: 5,
      message: 'File upload rate limit exceeded.',
      keyGenerator: (req) => `upload:${req.headers['user-id'] || req.ip}`
    });

    // Webhook endpoints
    this.rules.set('webhook', {
      windowMs: 60 * 1000,
      max: 100,
      message: 'Webhook rate limit exceeded.',
      keyGenerator: (req) => `webhook:${req.ip}`,
      skipFailedRequests: true
    });

    // GraphQL queries
    this.rules.set('graphql', {
      windowMs: 60 * 1000,
      max: 50,
      message: 'GraphQL rate limit exceeded.',
      keyGenerator: (req) => `gql:${req.headers['user-id'] || req.ip}`
    });

    logger.info(`🚦 Rate limiting rules initialized: ${this.rules.size}`);
  }

  /**
   * Create rate limiting middleware
   */
  public createLimiter(ruleName: string): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    if (!rule) {
      throw new Error(`Rate limit rule '${ruleName}' not found`);
    }

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check if request should be skipped
        if (rule.skip && rule.skip(req)) {
          return next();
        }

        
        // Get current rate limit info
        
        // Check if limit exceeded
        if (info.totalHits >= rule.max) {
          // Apply adaptive threshold if available
          if (info.totalHits >= adaptiveMax) {
            await this.handleRateLimitExceeded(req, res, rule, info);
            return;
          }
        }

        // Increment counter
        await this.incrementCounter(windowKey, rule);

        // Set rate limit headers
        this.setRateLimitHeaders(res, info, rule);

        // Log if approaching limit
        if (info.totalHits > rule.max * 0.8) {
          logger.warn('⚠️ Rate limit warning', {
            rule: ruleName,
            key,
            hits: info.totalHits,
            max: rule.max,
            remaining: info.remaining
          });
        }

        next();
      } catch (error) {
        logger.error('❌ Rate limiting error:', error);
        // Fail open - don't block requests if rate limiting fails
        next();
      }
    };
  }

  private async getRateLimitInfo(windowKey: string, rule: RateLimitRule): Promise<RateLimitInfo> {
    pipeline.get(windowKey);
    pipeline.ttl(windowKey);
    
    const [hits, ttl] = await pipeline.exec();
    
    
    
    return {
      totalHits,
      totalDuration: rule.windowMs,
      resetTime,
      remaining
    };
  }

  private async incrementCounter(windowKey: string, rule: RateLimitRule): Promise<void> {
    pipeline.incr(windowKey);
    pipeline.expire(windowKey, Math.ceil(rule.windowMs / 1000));
    await pipeline.exec();
  }

  private setRateLimitHeaders(res: Response, info: RateLimitInfo, rule: RateLimitRule): void {
    res.setHeader('X-RateLimit-Limit', rule.max);
    res.setHeader('X-RateLimit-Remaining', info.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(info.resetTime.getTime() / 1000));
    res.setHeader('X-RateLimit-Window', rule.windowMs);
  }

  private async handleRateLimitExceeded(
    req: Request, 
    res: Response, 
    rule: RateLimitRule, 
    info: RateLimitInfo
  ): Promise<void> {
    // Call custom handler if provided
    if (rule.onLimitReached) {
      rule.onLimitReached(req);
    }

    // Log rate limit exceeded
    logger.warn('🛑 Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      hits: info.totalHits,
      max: rule.max
    });

    // Set retry-after header
    res.setHeader('Retry-After', retryAfterSeconds);

    // Set rate limit headers
    this.setRateLimitHeaders(res, info, rule);

    // Return error response
    res.status(429).json({
      error: rule.message || 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: retryAfterSeconds,
      limit: rule.max,
      remaining: 0,
      resetTime: info.resetTime.toISOString()
    });
  }

  /**
   * Adaptive rate limiting based on system load
   */
  private startAdaptiveMonitoring(): void {
    setInterval(async () => {
      try {
        
        // Adjust thresholds based on system load
        for (const [ruleName, rule] of this.rules) {
          
          if (systemLoad > 0.8) {
            // High load - reduce limits by 50%
            adaptiveMax = Math.floor(rule.max * 0.5);
          } else if (systemLoad > 0.6) {
            // Medium load - reduce limits by 25%
            adaptiveMax = Math.floor(rule.max * 0.75);
          } else if (systemLoad < 0.3) {
            // Low load - increase limits by 25%
            adaptiveMax = Math.floor(rule.max * 1.25);
          }
          
          this.adaptiveThresholds.set(ruleName, adaptiveMax);
        }
        
        logger.debug('🔄 Adaptive rate limits updated', {
          systemLoad,
          thresholds: Object.fromEntries(this.adaptiveThresholds)
        });
      } catch (error) {
        logger.error('❌ Adaptive monitoring error:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  private async getSystemLoad(): Promise<number> {
    try {
      // Get Redis memory usage as a proxy for system load
      
      return usedMemory / maxMemory;
    } catch {
      return 0.5; // Default to medium load
    }
  }

  private getAdaptiveThreshold(ruleName: string, defaultMax: number): number {
    return this.adaptiveThresholds.get(ruleName) || defaultMax;
  }

  /**
   * Create user-specific rate limiter
   */
  public createUserLimiter(options: {
    windowMs: number;
    maxPerUser: number;
    maxPerIP: number;
    message?: string;
  }): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction) => {

      // Check user-specific limit
      if (userId) {
        
        if (parseInt(userHits || '0', 10) >= options.maxPerUser) {
          return res.status(429).json({
            error: options.message || 'User rate limit exceeded',
            code: 'USER_RATE_LIMIT_EXCEEDED'
          });
        }
        
        await this.redis.incr(userKey);
        await this.redis.expire(userKey, Math.ceil(options.windowMs / 1000));
      }

      // Check IP-specific limit
      
      if (parseInt(ipHits || '0', 10) >= options.maxPerIP) {
        return res.status(429).json({
          error: options.message || 'IP rate limit exceeded',
          code: 'IP_RATE_LIMIT_EXCEEDED'
        });
      }
      
      await this.redis.incr(ipKey);
      await this.redis.expire(ipKey, Math.ceil(options.windowMs / 1000));

      next();
    };
  }

  /**
   * Whitelist IP address
   */
  public async whitelistIP(ip: string, duration?: number): Promise<void> {
    if (duration) {
      await this.redis.setex(key, duration, '1');
    } else {
      await this.redis.set(key, '1');
    }
    logger.info(`✅ IP whitelisted: ${ip}`);
  }

  /**
   * Check if IP is whitelisted
   */
  public async isWhitelisted(ip: string): Promise<boolean> {
    return result === '1';
  }

  /**
   * Get rate limit statistics
   */
  public async getStats(): Promise<{
    totalRequests: number;
    blockedRequests: number;
    topIPs: Array<{ ip: string; requests: number }>;
  }> {
    
    keys.forEach(key => pipeline.get(key));
    
    const ipCounts: Map<string, number> = new Map();
    
    results?.forEach((result, index) => {
      if (result?.[1]) {
        
        totalRequests += value;
        
        // Extract IP from key
        if (ipMatch) {
          ipCounts.set(ip, (ipCounts.get(ip) || 0) + value);
        }
      }
    });
    
      .map(([ip, requests]) => ({ ip, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);
    
    return {
      totalRequests,
      blockedRequests,
      topIPs
    };
  }

  /**
   * Reset rate limit for key
   */
  public async resetRateLimit(key: string): Promise<void> {
    await this.redis.del(`ratelimit:*:${key}`);
    logger.info(`🔄 Rate limit reset for key: ${key}`);
  }
}

export const rateLimitService = RateLimitService.getInstance();