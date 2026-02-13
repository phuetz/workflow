/**
 * Advanced Rate Limiting Service
 * Re-exports from refactored module structure
 *
 * @module RateLimitService
 * @see ./ratelimit/index.ts for implementation details
 */

// Re-export all types
export type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitEntry,
  RateLimitStats,
  RateLimitStrategy,
  TokenBucketState
} from './ratelimit/types';

// Re-export core classes
export { RateLimitService } from './ratelimit';
export { TokenBucket } from './ratelimit/TokenBucket';
export { SlidingWindow } from './ratelimit/SlidingWindow';
export { RateLimitStore } from './ratelimit/RateLimitStore';

// Re-export integration-specific functionality
export {
  IntegrationRateLimiter,
  INTEGRATION_RATE_LIMITS
} from './ratelimit/IntegrationLimits';

// Re-export middleware
export { rateLimitMiddleware } from './ratelimit/RateLimitMiddleware';

// Re-export singleton instances
export {
  rateLimitService,
  integrationRateLimiter
} from './ratelimit';
