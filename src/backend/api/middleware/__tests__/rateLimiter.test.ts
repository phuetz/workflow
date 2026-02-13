/**
 * Rate Limiter Middleware Tests
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  createUserBasedRateLimiter,
  createSlidingWindowRateLimiter
} from '../rateLimiter';

// Mock logger
vi.mock('../../../../services/LoggingService', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

// Helper factory functions for creating mock objects
const createMockResponse = () => {
  const headers: Record<string, string> = {};
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn((name: string, value: string | number | readonly string[]) => {
      headers[name.toLowerCase()] = String(value);
      return res as Response;
    }),
    getHeader: vi.fn((name: string) => headers[name.toLowerCase()]),
    set: vi.fn().mockReturnThis(),
    send: vi.fn(function(this: Response, _chunk: unknown) { return this; }),
    statusCode: 200,
    locals: {}
  };
  return res as Response;
};

const createMockRequest = (overrides: Partial<Request> & { res?: Response } = {}) => {
  const req: Partial<Request> & { res?: Response } = {
    ip: '127.0.0.1',
    path: '/api/test',
    method: 'GET',
    headers: {},
    connection: { remoteAddress: '127.0.0.1' } as unknown as Request['connection'],
    socket: { remoteAddress: '127.0.0.1' } as unknown as Request['socket'],
    get: vi.fn((header: string) => {
      const headers = req.headers || {};
      return headers[header.toLowerCase() as keyof typeof headers] as string | undefined;
    }),
    ...overrides
  };
  return req as Request & { res?: Response };
};

const createMockNext = () => vi.fn() as NextFunction;

describe('Rate Limiter Middleware', () => {
  let mockReq: Request & { res?: Response };
  let mockRes: Response;
  let mockNext: Mock;
  let statusMock: Mock;
  let jsonMock: Mock;
  let setHeaderMock: Mock;
  let getHeaderMock: Mock;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create fresh mocks for each test
    mockRes = createMockResponse();
    mockReq = createMockRequest({ res: mockRes });
    mockNext = createMockNext() as Mock;

    // Extract mock functions for easy assertion access
    statusMock = mockRes.status as Mock;
    jsonMock = mockRes.json as Mock;
    setHeaderMock = mockRes.setHeader as Mock;
    getHeaderMock = mockRes.getHeader as Mock;
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests under the limit', async () => {
      const limiter = createRateLimiter({ max: 5, windowMs: 1000 });

      // Make 5 requests (at the limit)
      for (let i = 0; i < 5; i++) {
        await limiter(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should block requests over the limit', async () => {
      const limiter = createRateLimiter({ max: 5, windowMs: 1000 });

      // Make 6 requests (over the limit)
      for (let i = 0; i < 6; i++) {
        await limiter(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Too Many Requests',
        message: 'Too many requests, please try again later.',
        retryAfter: expect.any(String)
      });
    });

    it('should set rate limit headers', async () => {
      const limiter = createRateLimiter({ max: 10, windowMs: 1000 });

      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '9');
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should reset after window expires', async () => {
      vi.useFakeTimers();

      const limiter = createRateLimiter({ max: 2, windowMs: 1000 });

      // Use up the limit
      await limiter(mockReq as Request, mockRes as Response, mockNext);
      await limiter(mockReq as Request, mockRes as Response, mockNext);
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(429);

      // Advance time past the window
      vi.advanceTimersByTime(1001);

      // Clear previous mocks
      mockNext.mockClear();
      statusMock.mockClear();

      // Should allow request again
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Custom Key Generator', () => {
    it('should use custom key generator', async () => {
      const keyGenerator = vi.fn((req: Request) => req.headers['x-api-key'] as string || req.ip!);
      const limiter = createRateLimiter({
        max: 2,
        windowMs: 1000,
        keyGenerator
      });

      // Request with API key
      mockReq.headers = { 'x-api-key': 'test-key-1' };
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(keyGenerator).toHaveBeenCalledWith(mockReq);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should track different keys separately', async () => {
      const limiter = createRateLimiter({
        max: 1,
        windowMs: 1000,
        keyGenerator: (req: Request) => req.headers['x-api-key'] as string || req.ip!
      });

      // Request 1 with key A
      mockReq.headers = { 'x-api-key': 'key-a' };
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      // Request 2 with key A (should be blocked)
      await limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(statusMock).toHaveBeenCalledWith(429);

      // Reset mocks
      statusMock.mockClear();
      mockNext.mockClear();

      // Request with key B (should be allowed)
      mockReq.headers = { 'x-api-key': 'key-b' };
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('Skip Logic', () => {
    it('should skip requests based on skip function', async () => {
      const skip = vi.fn((req: Request) => req.path === '/health');
      const limiter = createRateLimiter({
        max: 1,
        windowMs: 1000,
        skip
      });

      // Health check request (should be skipped)
      mockReq.path = '/health';
      await limiter(mockReq as Request, mockRes as Response, mockNext);
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(skip).toHaveBeenCalledTimes(2);
      expect(mockNext).toHaveBeenCalledTimes(2);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('Skip Successful/Failed Requests', () => {
    it('should not count successful requests when skipSuccessfulRequests is true', async () => {
      const limiter = createRateLimiter({
        max: 2,
        windowMs: 1000,
        skipSuccessfulRequests: true
      });

      // Simulate successful responses
      mockRes.statusCode = 200;

      // Make 3 successful requests
      for (let i = 0; i < 3; i++) {
        await limiter(mockReq as Request, mockRes as Response, mockNext);
        // Simulate response being sent
        if (mockRes.send && typeof mockRes.send === 'function') {
          (mockRes.send as (data: unknown) => unknown).call(mockRes, 'success');
        }
      }

      // All should pass because successful requests aren't counted
      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should not count failed requests when skipFailedRequests is true', async () => {
      const limiter = createRateLimiter({
        max: 2,
        windowMs: 1000,
        skipFailedRequests: true
      });

      // Simulate failed responses
      mockRes.statusCode = 400;

      // Make 3 failed requests
      for (let i = 0; i < 3; i++) {
        await limiter(mockReq as Request, mockRes as Response, mockNext);
        // Simulate response being sent
        if (mockRes.send && typeof mockRes.send === 'function') {
          (mockRes.send as (data: unknown) => unknown).call(mockRes, 'error');
        }
      }

      // All should pass because failed requests aren't counted
      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('Callbacks', () => {
    it('should call onLimitReached when limit is exceeded', async () => {
      const onLimitReached = vi.fn();
      const limiter = createRateLimiter({
        max: 1,
        windowMs: 1000,
        onLimitReached
      });

      // First request (allowed)
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      // Second request (blocked)
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(onLimitReached).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('should use custom handler', async () => {
      const customHandler = vi.fn((_req: Request, res: Response) => {
        res.status(503).json({ error: 'Service Unavailable' });
      });

      const limiter = createRateLimiter({
        max: 1,
        windowMs: 1000,
        handler: customHandler
      });

      // Exceed limit
      await limiter(mockReq as Request, mockRes as Response, mockNext);
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(customHandler).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(503);
    });
  });

  describe('Pre-configured Rate Limiters', () => {
    it('authRateLimiter should have strict limits', async () => {
      // Auth limiter has 5 attempts per 15 minutes
      for (let i = 0; i < 6; i++) {
        await authRateLimiter(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(statusMock).toHaveBeenCalledWith(429);
    });

    it('apiRateLimiter should use API key if available', async () => {
      mockReq.headers = { 'x-api-key': 'test-api-key' };

      // Should track by API key, not IP
      await apiRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      // Change IP but keep same API key
      mockReq.ip = '192.168.1.1';
      await apiRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      // Both requests should count towards same limit
      expect(mockNext).toHaveBeenCalledTimes(2);
    });
  });

  describe('User-based Rate Limiter', () => {
    it('should apply different limits based on user role', async () => {
      const limiter = createUserBasedRateLimiter({
        default: 10,
        premium: 50,
        admin: 1000
      }, 1000);

      // Default user
      (mockReq as unknown as { user: { id: string; role: string } }).user = { id: 'user1', role: 'default' };

      // Should allow 10 requests
      for (let i = 0; i < 11; i++) {
        await limiter(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(10);
      expect(statusMock).toHaveBeenCalledWith(429);

      // Reset mocks
      mockNext.mockClear();
      statusMock.mockClear();

      // Premium user
      (mockReq as unknown as { user: { id: string; role: string } }).user = { id: 'user2', role: 'premium' };

      // Should allow 50 requests
      for (let i = 0; i < 51; i++) {
        await limiter(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(50);
      expect(statusMock).toHaveBeenCalledWith(429);
    });
  });

  describe('Sliding Window Rate Limiter', () => {
    it('should use sliding window algorithm', async () => {
      vi.useFakeTimers();

      const limiter = createSlidingWindowRateLimiter({
        max: 3,
        windowMs: 3000
      });

      // Time 0: Request 1
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      // Time 1000: Request 2
      vi.advanceTimersByTime(1000);
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      // Time 2000: Request 3
      vi.advanceTimersByTime(1000);
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      // Time 2500: Request 4 (should be blocked - 4 requests in last 3000ms)
      vi.advanceTimersByTime(500);
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(statusMock).toHaveBeenCalledWith(429);

      // Time 5001: All original requests (0, 1000, 2000, 2500) have expired
      // Window is now from 2001 to 5001, so requests at 0, 1000, and 2000 are expired
      // Only request at 2500 remains in window (but it was blocked so not counted)
      // Actually, blocked requests ARE still added to the log, so we need to wait
      // until request at 2500 expires as well
      vi.advanceTimersByTime(3001);  // Now at time 5501
      mockNext.mockClear();
      statusMock.mockClear();

      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources when cleanup is called', () => {
      const limiter = createRateLimiter({ max: 10, windowMs: 1000 });

      // Verify cleanup function exists
      expect(typeof (limiter as unknown as { cleanup: () => void }).cleanup).toBe('function');

      // Call cleanup
      (limiter as unknown as { cleanup: () => void }).cleanup();

      // Should not throw
      expect(() => (limiter as unknown as { cleanup: () => void }).cleanup()).not.toThrow();
    });
  });
});
