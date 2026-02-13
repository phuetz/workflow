/**
 * Rate Limiting Types and Interfaces
 */

export type RateLimitStrategy = 'fixed-window' | 'sliding-window' | 'token-bucket';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  strategy?: RateLimitStrategy;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // seconds
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
  timestamps?: number[]; // For sliding window
}

export interface TokenBucketState {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per second
}

export interface RateLimitStats {
  totalKeys: number;
  blockedKeys: number;
  activeLimits: number;
  tokenBuckets: number;
}
