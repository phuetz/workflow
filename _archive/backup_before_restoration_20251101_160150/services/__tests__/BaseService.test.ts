/**
 * BaseService Tests
 * Integration tests for the base service class and its implementations
 */

import { BaseService, BaseDataService, ServiceResult } from '../BaseService';
import { logger } from '../LoggingService';

// Mock logger
jest.mock('../LoggingService', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Test implementation of BaseService
class TestService extends BaseService {
  constructor() {
    super('TestService', {
      enableRateLimit: true,
      rateLimitAttempts: 3,
      rateLimitWindowMs: 1000,
      enableRetry: true,
      maxRetries: 2,
      retryDelayMs: 100,
      enableCaching: true,
      cacheTimeoutMs: 5000
    });
  }

  async doSomething(value: string): Promise<ServiceResult<string>> {
    return this.executeOperation('doSomething', async () => {
      return `processed: ${value}`;
    });
  }

  async doSomethingCached(value: string): Promise<ServiceResult<string>> {
    return this.executeOperation('doSomethingCached', async () => {
      return `cached: ${value}`;
    }, { cacheKey: `cache_${value}` });
  }

  async failingOperation(): Promise<ServiceResult<string>> {
    return this.executeOperation('failingOperation', async () => {
      throw new Error('Operation failed');
    });
  }

  async slowOperation(delay: number): Promise<ServiceResult<string>> {
    return this.executeOperation('slowOperation', async () => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return 'slow operation completed';
    });
  }

  protected async performHealthChecks(): Promise<Record<string, boolean>> {
    return {
      service: true,
      database: true,
      cache: true
    };
  }
}

// Test implementation of BaseDataService
interface TestData {
  id: string;
  name: string;
  value: number;
}

class TestDataService extends BaseDataService<TestData> {
  constructor() {
    super('TestDataService', {
      enableValidation: true,
      enableSanitization: true
    });
  }

  protected validateData(data: unknown): TestData {
    if (!data.id || typeof data.id !== 'string') {
      throw new Error('Invalid id');
    }
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('Invalid name');
    }
    if (typeof data.value !== 'number') {
      throw new Error('Invalid value');
    }
    return data as TestData;
  }

  protected sanitizeData(data: TestData): TestData {
    return {
      ...data,
      name: data.name.trim().toLowerCase(),
      value: Math.abs(data.value)
    };
  }

  async processData(data: unknown): Promise<ServiceResult<TestData>> {
    return this.executeDataOperation('processData', async (validData) => {
      return { ...validData, processed: true };
    }, data);
  }
}

describe('BaseService', () => {
  let service: TestService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TestService();
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('Basic Operations', () => {
    it('should execute successful operations', async () => {
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('processed: test');
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.executionTime).toBeGreaterThan(0);
      expect(result.metadata?.retryCount).toBe(0);
      expect(result.metadata?.fromCache).toBe(false);
    });

    it('should handle failed operations with retry', async () => {
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Operation failed after 3 attempts');
      expect(result.metadata?.retryCount).toBe(2); // maxRetries is 2
    });

    it('should log metrics for operations', async () => {
      await service.doSomething('test');
      
      expect(logger.debug).toHaveBeenCalledWith(
        'TestService service initialized',
        expect.any(Object)
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make 3 requests quickly (rate limit is 3 per second)
        service.doSomething('1'),
        service.doSomething('2'),
        service.doSomething('3')
      ]);

      expect(results.every(r => r.success)).toBe(true);

      // Fourth request should be rate limited
      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should reset rate limit after window', async () => {
      // Use up rate limit
      await Promise.all([
        service.doSomething('1'),
        service.doSomething('2'),
        service.doSomething('3')
      ]);

      // Wait for rate limit window to reset (1 second)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be able to make requests again
      expect(result.success).toBe(true);
    });
  });

  describe('Caching', () => {
    it('should cache successful results', async () => {
      // First call - not from cache
      expect(result1.success).toBe(true);
      expect(result1.data).toBe('cached: test');
      expect(result1.metadata?.fromCache).toBe(false);

      // Second call - from cache
      expect(result2.success).toBe(true);
      expect(result2.data).toBe('cached: test');
      expect(result2.metadata?.fromCache).toBe(true);
    });

    it('should not cache different cache keys', async () => {

      expect(result1.metadata?.fromCache).toBe(false);
      expect(result2.metadata?.fromCache).toBe(false);
    });

    it('should clear cache on cleanup', async () => {
      await service.doSomethingCached('test');
      service.clearCache();

      expect(result.metadata?.fromCache).toBe(false);
    });
  });

  describe('Performance Monitoring', () => {
    it('should warn about slow operations', async () => {
      await service.slowOperation(6000);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow operation detected'),
        expect.objectContaining({
          executionTime: expect.any(Number)
        })
      );
    });
  });

  describe('Health Check', () => {
    it('should perform health checks', async () => {

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        status: 'healthy',
        checks: {
          service: true,
          database: true,
          cache: true
        }
      });
    });
  });

  describe('Stats', () => {
    it('should return service statistics', () => {

      expect(stats).toEqual({
        serviceName: 'TestService',
        cacheSize: 0,
        config: expect.any(Object)
      });
    });
  });
});

describe('BaseDataService', () => {
  let service: TestDataService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TestDataService();
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('Data Validation', () => {
    it('should validate and process valid data', async () => {

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: '123',
        name: 'test item', // sanitized
        value: 42,
        processed: true
      });
    });

    it('should reject invalid data', async () => {

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid value');
    });

    it('should reject missing required fields', async () => {

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid name');
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize data before processing', async () => {

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('test item');
      expect(result.data?.value).toBe(42); // absolute value
    });
  });
});