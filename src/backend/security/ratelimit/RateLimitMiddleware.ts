/**
 * Express Rate Limit Middleware
 */

import { logger } from '../../../services/SimpleLogger';
import type { Request, Response, NextFunction } from 'express';
import type { RateLimitConfig } from './types';
import { rateLimitService } from './index';

interface RequestWithUser extends Request {
  user?: { id: string };
}

/**
 * Express middleware helper for rate limiting
 */
export function rateLimitMiddleware(limitKey: string, config?: RateLimitConfig) {
  return async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      // Build rate limit key
      const identifier = req.user?.id || req.ip || 'anonymous';
      const key = `${limitKey}:${identifier}`;

      const result = await rateLimitService.checkLimit(key, config);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toISOString()
      });

      if (!result.allowed) {
        if (result.retryAfter) {
          res.set('Retry-After', result.retryAfter.toString());
        }

        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          limit: result.limit,
          resetTime: result.resetTime
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', error);
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}
