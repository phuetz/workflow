/**
 * Rate Limiter Middleware Tests
 */

import { Request, Response } from 'express';
import { 
  createRateLimiter, 
  authRateLimiter,
  apiRateLimiter,
  createUserBasedRateLimiter,
  createSlidingWindowRateLimiter
} from '../rateLimiter';

// Mock logger
jest.mock('../../../../services/LoggingService', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Rate Limiter Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let setHeaderMock: jest.Mock;
  let getHeaderMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock response methods
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();
    setHeaderMock = jest.fn();
    getHeaderMock = jest.fn();
    
    mockReq = {
      ip: '127.0.0.1',
      path: '/api/test',
      method: 'GET',
      headers: {},
      connection: { remoteAddress: '127.0.0.1' }
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock,
      getHeader: getHeaderMock,
      send: jest.fn(function(_chunk) { return this; }), // eslint-disable-line @typescript-eslint/no-unused-vars
      statusCode: 200
    };
    
    mockNext = jest.fn();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests under the limit', async () => {
      
      // Make 5 requests (at the limit)
      for (let __i = 0; i < 5; i++) {
        await limiter(mockReq as Request, mockRes as Response, mockNext);
      }
      
      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should block requests over the limit', async () => {
      
      // Make 6 requests (over the limit)
      for (let __i = 0; i < 6; i++) {
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
      
      await limiter(mockReq as Request, mockRes as Response, mockNext);
      
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '9');
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should reset after window expires', async () => {
      jest.useFakeTimers();
      
      
      // Use up the limit
      await limiter(mockReq as Request, mockRes as Response, mockNext);
      await limiter(mockReq as Request, mockRes as Response, mockNext);
      await limiter(mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(429);
      
      // Advance time past the window
      jest.advanceTimersByTime(1001);
      
      // Clear previous mocks
      mockNext.mockClear();
      statusMock.mockClear();
      
      // Should allow request again
      await limiter(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Custom Key Generator', () => {
    it('should use custom key generator', async () => {
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
        max: 1, 
        windowMs: 1000,
        keyGenerator: (req) => req.headers['x-api-key'] as string || req.ip!
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
        max: 2, 
        windowMs: 1000,
        skipSuccessfulRequests: true
      });
      
      // Simulate successful responses
      mockRes.statusCode = 200;
      
      // Make 3 successful requests
      for (let __i = 0; i < 3; i++) {
        await limiter(mockReq as Request, mockRes as Response, mockNext);
        // Simulate response being sent
        if (mockRes.send && typeof mockRes.send === 'function') {
          (mockRes.send as unknown as (data: unknown) => unknown).call(mockRes, 'success');
        }
      }
      
      // All should pass because successful requests aren't counted
      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should not count failed requests when skipFailedRequests is true', async () => {
        max: 2, 
        windowMs: 1000,
        skipFailedRequests: true
      });
      
      // Simulate failed responses
      mockRes.statusCode = 400;
      
      // Make 3 failed requests
      for (let __i = 0; i < 3; i++) {
        await limiter(mockReq as Request, mockRes as Response, mockNext);
        // Simulate response being sent
        if (mockRes.send && typeof mockRes.send === 'function') {
          (mockRes.send as unknown as (data: unknown) => unknown).call(mockRes, 'error');
        }
      }
      
      // All should pass because failed requests aren't counted
      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('Callbacks', () => {
    it('should call onLimitReached when limit is exceeded', async () => {
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
        res.status(503).json({ error: 'Service Unavailable' });
      });
      
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
      for (let __i = 0; i < 6; i++) {
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
        default: 10,
        premium: 50,
        admin: 1000
      }, 1000);
      
      // Default user
      (mockReq as unknown as { user: { id: string; role: string } }).user = { id: 'user1', role: 'default' };
      
      // Should allow 10 requests
      for (let __i = 0; i < 11; i++) {
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
      for (let __i = 0; i < 51; i++) {
        await limiter(mockReq as Request, mockRes as Response, mockNext);
      }
      
      expect(mockNext).toHaveBeenCalledTimes(50);
      expect(statusMock).toHaveBeenCalledWith(429);
    });
  });

  describe('Sliding Window Rate Limiter', () => {
    it('should use sliding window algorithm', async () => {
      jest.useFakeTimers();
      
        max: 3,
        windowMs: 3000
      });
      
      // Time 0: Request 1
      await limiter(mockReq as Request, mockRes as Response, mockNext);
      
      // Time 1000: Request 2
      jest.advanceTimersByTime(1000);
      await limiter(mockReq as Request, mockRes as Response, mockNext);
      
      // Time 2000: Request 3
      jest.advanceTimersByTime(1000);
      await limiter(mockReq as Request, mockRes as Response, mockNext);
      
      // Time 2500: Request 4 (should be blocked)
      jest.advanceTimersByTime(500);
      await limiter(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(statusMock).toHaveBeenCalledWith(429);
      
      // Time 3001: Request 1 expires, should allow new request
      jest.advanceTimersByTime(501);
      mockNext.mockClear();
      statusMock.mockClear();
      
      await limiter(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources when cleanup is called', () => {
      
      // Verify cleanup function exists
      expect(typeof (limiter as unknown as { cleanup: () => void }).cleanup).toBe('function');
      
      // Call cleanup
      (limiter as unknown as { cleanup: () => void }).cleanup();
      
      // Should not throw
      expect(() => (limiter as unknown as { cleanup: () => void }).cleanup()).not.toThrow();
    });
  });
});