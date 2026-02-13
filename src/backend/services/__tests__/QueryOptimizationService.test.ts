/**
 * Query Optimization Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryOptimizationService, QueryStats } from '../QueryOptimizationService';
import { DatabaseConnection } from '../../database/connection';

// Mock database connection
vi.mock('../../database/connection');

// Mock logger
vi.mock('../../../services/SimpleLogger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('QueryOptimizationService', () => {
  let service: QueryOptimizationService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create mock database
    mockDb = {
      query: vi.fn(),
      execute: vi.fn(),
      transaction: vi.fn()
    };

    service = new QueryOptimizationService(mockDb, {
      enabled: true,
      ttl: 60,
      maxSize: 10,
      strategy: 'LRU'
    });
  });

  afterEach(() => {
    service.destroy();
    vi.useRealTimers();
  });

  describe('Query Execution', () => {
    it('should execute query and cache result', async () => {
      const mockResult = [{ id: 1, name: 'John' }];
      mockDb.query.mockResolvedValue(mockResult);

      // First execution - should hit database
      const result1 = await service.executeOptimized(
        'SELECT * FROM users WHERE id = ?',
        [1],
        { cache: true }
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?',
        [1]
      );
      expect(result1).toEqual(mockResult);

      // Second execution - should hit cache
      const result2 = await service.executeOptimized(
        'SELECT * FROM users WHERE id = ?',
        [1],
        { cache: true }
      );

      // First call is the query, second call is recording stats
      // So query should be called once for actual execution
      const queryCalls = mockDb.query.mock.calls.filter(
        (call: any[]) => call[0] === 'SELECT * FROM users WHERE id = ?'
      );
      expect(queryCalls).toHaveLength(1);
      expect(result2).toEqual(mockResult);

      // Check cache stats
      const stats = service.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.5);
    });

    it('should bypass cache when disabled', async () => {
      const mockResult = [{ id: 1, name: 'John' }];
      mockDb.query.mockResolvedValue(mockResult);

      // Execute twice with cache disabled
      await service.executeOptimized(
        'SELECT * FROM users WHERE id = ?',
        [1],
        { cache: false }
      );

      await service.executeOptimized(
        'SELECT * FROM users WHERE id = ?',
        [1],
        { cache: false }
      );

      // Should have called query twice (once for each execution)
      const queryCalls = mockDb.query.mock.calls.filter(
        (call: any[]) => call[0] === 'SELECT * FROM users WHERE id = ?'
      );
      expect(queryCalls).toHaveLength(2);

      const stats = service.getCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should record slow queries', async () => {
      const mockResult = [{ id: 1 }];

      // Mock query to take time
      mockDb.query.mockImplementation(async (query: string) => {
        if (query.includes('SELECT * FROM users')) {
          // Simulate slow query by advancing timers
          vi.advanceTimersByTime(150);
        }
        return mockResult;
      });

      await service.executeOptimized(
        'SELECT * FROM users WHERE status = ?',
        ['active']
      );

      // Should have called query for stats recording
      const statsCalls = mockDb.query.mock.calls.filter((call: any[]) =>
        call[0].includes('INSERT INTO query_performance_stats')
      );
      expect(statsCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle query errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Query timeout'));

      await expect(
        service.executeOptimized(
          'SELECT * FROM large_table',
          []
        )
      ).rejects.toThrow('Query timeout');
    });
  });

  describe('Query Analysis', () => {
    it('should analyze query execution plan', async () => {
      const mockPlan = [{
        'QUERY PLAN': [{
          'Plan': {
            'Node Type': 'Seq Scan',
            'Relation Name': 'users',
            'Total Cost': 100,
            'Rows': 5000,
            'Actual Total Time': 50,
            'Seq Scan': true
          }
        }]
      }];

      mockDb.query.mockResolvedValue(mockPlan);

      const analysis = await service.analyzeQuery(
        'SELECT * FROM users WHERE status = ?',
        ['active']
      );

      expect(analysis.query).toContain('SELECT * FROM users');
      expect(analysis.estimatedCost).toBe(100);
      expect(analysis.actualCost).toBe(50);
      expect(analysis.suggestions).toContain(
        'Avoid SELECT *, specify only required columns'
      );
    });

    it('should detect missing indexes from plan', async () => {
      const mockPlan = [{
        'QUERY PLAN': [{
          'Plan': {
            'Seq Scan': true,
            'Rows': 10000
          }
        }]
      }];

      mockDb.query.mockResolvedValue(mockPlan);

      const analysis = await service.analyzeQuery(
        'SELECT id FROM users WHERE email = ?',
        ['test@example.com']
      );

      // The plan indicates a sequential scan with no index scan
      expect(analysis.suggestions).toContain(
        'Consider adding an index on the WHERE clause columns'
      );
    });

    it('should detect missing JOIN conditions', async () => {
      const mockPlan = [{
        'QUERY PLAN': [{ 'Plan': {} }]
      }];

      mockDb.query.mockResolvedValue(mockPlan);

      const analysis = await service.analyzeQuery(
        'SELECT * FROM users JOIN orders'
      );

      expect(analysis.suggestions).toContain(
        'Missing JOIN condition may cause cartesian product'
      );
    });

    it('should reject unsafe queries', async () => {
      await expect(
        service.analyzeQuery('DROP TABLE users; SELECT * FROM users')
      ).rejects.toThrow('Query validation failed');
    });
  });

  describe('Slow Query Detection', () => {
    it('should retrieve slow queries', async () => {
      const mockSlowQueries: QueryStats[] = [
        {
          queryHash: 'hash1',
          queryText: 'SELECT * FROM large_table',
          executionCount: 100,
          totalTimeMs: 50000,
          avgTimeMs: 500,
          maxTimeMs: 1000,
          minTimeMs: 300,
          lastExecutedAt: new Date()
        },
        {
          queryHash: 'hash2',
          queryText: 'SELECT * FROM users WHERE status LIKE \'%active%\'',
          executionCount: 50,
          totalTimeMs: 10000,
          avgTimeMs: 200,
          maxTimeMs: 400,
          minTimeMs: 150,
          lastExecutedAt: new Date()
        }
      ];

      mockDb.query.mockResolvedValue(mockSlowQueries);

      const slowQueries = await service.getSlowQueries(100);
      expect(slowQueries).toHaveLength(2);
      expect(slowQueries[0].suggestions).toContain(
        'Replace SELECT * with specific columns'
      );
      expect(slowQueries[1].suggestions).toContain(
        'Leading wildcard in LIKE prevents index usage'
      );
    });
  });

  describe('Cache Management', () => {
    it('should implement LRU cache eviction', async () => {
      // Set small cache for testing
      service = new QueryOptimizationService(mockDb, {
        enabled: true,
        ttl: 3600,
        maxSize: 0.0001, // Very small to trigger eviction
        strategy: 'LRU'
      });

      mockDb.query.mockResolvedValue([{ id: 1 }]);

      // Fill cache with different queries
      await service.executeOptimized('SELECT 1', []);
      await service.executeOptimized('SELECT 2', []);
      await service.executeOptimized('SELECT 3', []);

      // Access first query again (makes it recently used)
      await service.executeOptimized('SELECT 1', []);

      // Add new query that should evict least recently used
      await service.executeOptimized('SELECT 4', []);

      const stats = service.getCacheStats();
      expect(stats.entries).toBeLessThanOrEqual(3);
    });

    it('should clear expired cache entries', async () => {
      service = new QueryOptimizationService(mockDb, {
        enabled: true,
        ttl: 1, // 1 second TTL
        maxSize: 50,
        strategy: 'TTL'
      });

      mockDb.query.mockResolvedValue([{ id: 1 }]);

      // Add cache entry
      await service.executeOptimized('SELECT * FROM users', []);

      let stats = service.getCacheStats();
      expect(stats.entries).toBe(1);

      // Advance time past TTL (1 second = 1000ms)
      vi.advanceTimersByTime(2000);

      // Access again - should be a cache miss since entry expired
      await service.executeOptimized('SELECT * FROM users', []);

      // The query call count tells us if cache was bypassed
      const queryCalls = mockDb.query.mock.calls.filter(
        (call: any[]) => call[0] === 'SELECT * FROM users'
      );
      expect(queryCalls.length).toBe(2); // Called twice because cache expired
    });

    it('should clear cache on demand', async () => {
      mockDb.query.mockResolvedValue([{ id: 1 }]);

      // Add some cached queries
      await service.executeOptimized('SELECT 1', []);
      await service.executeOptimized('SELECT 2', []);

      let stats = service.getCacheStats();
      expect(stats.entries).toBe(2);

      // Clear cache
      service.clearCache();

      stats = service.getCacheStats();
      expect(stats.entries).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Database Optimization', () => {
    it('should optimize PostgreSQL tables', async () => {
      mockDb.query
        .mockResolvedValueOnce([
          { tablename: 'users' },
          { tablename: 'orders' },
          { tablename: 'products' }
        ])
        .mockResolvedValue([]);

      await service.optimizeForPostgreSQL();

      expect(mockDb.query).toHaveBeenCalledWith(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
      );
      // SECURITY FIX: Table names are now properly escaped with double quotes
      expect(mockDb.query).toHaveBeenCalledWith('VACUUM ANALYZE "users"');
      expect(mockDb.query).toHaveBeenCalledWith('VACUUM ANALYZE "orders"');
      expect(mockDb.query).toHaveBeenCalledWith('VACUUM ANALYZE "products"');
    });

    it('should optimize MySQL tables', async () => {
      mockDb.query
        .mockResolvedValueOnce([
          { TABLE_NAME: 'users' },
          { TABLE_NAME: 'orders' }
        ])
        .mockResolvedValue([]);

      await service.optimizeForMySQL();

      expect(mockDb.query).toHaveBeenCalledWith(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()"
      );
      // SECURITY FIX: Table names are now properly escaped with backticks
      expect(mockDb.query).toHaveBeenCalledWith('OPTIMIZE TABLE `users`');
      expect(mockDb.query).toHaveBeenCalledWith('OPTIMIZE TABLE `orders`');
    });

    it('should handle optimization errors gracefully', async () => {
      mockDb.query
        .mockResolvedValueOnce([{ tablename: 'users' }])
        .mockRejectedValueOnce(new Error('Access denied'));

      await service.optimizeForPostgreSQL();

      // Should not throw, just log error
      // First call: SELECT tablename, Second call: VACUUM ANALYZE "users"
      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(mockDb.query).toHaveBeenCalledWith('VACUUM ANALYZE "users"');
    });

    it('should skip invalid table names', async () => {
      mockDb.query
        .mockResolvedValueOnce([
          { tablename: 'valid_table' },
          { tablename: 'invalid;table--drop' }, // SQL injection attempt
          { tablename: 'another_valid' }
        ])
        .mockResolvedValue([]);

      await service.optimizeForPostgreSQL();

      // Should only optimize valid tables
      expect(mockDb.query).toHaveBeenCalledWith('VACUUM ANALYZE "valid_table"');
      expect(mockDb.query).toHaveBeenCalledWith('VACUUM ANALYZE "another_valid"');
      expect(mockDb.query).not.toHaveBeenCalledWith(
        expect.stringContaining('invalid;table')
      );
    });
  });

  describe('Query Suggestions', () => {
    it('should suggest improvements for common patterns', async () => {
      // Test generateOptimizationSuggestions method
      const testCases = [
        {
          query: 'SELECT * FROM users',
          expectedSuggestion: 'Avoid SELECT *, specify only required columns'
        },
        {
          query: 'SELECT * FROM a JOIN b JOIN c',
          expectedSuggestion: 'Missing JOIN condition may cause cartesian product'
        },
        {
          query: 'SELECT * FROM users WHERE status = ? OR role = ?',
          expectedSuggestion: 'OR conditions may prevent index usage, consider UNION'
        },
        {
          query: 'SELECT * FROM users WHERE LOWER(email) = ?',
          expectedSuggestion: 'Function calls on columns prevent index usage'
        }
      ];

      for (const testCase of testCases) {
        const suggestions = service['generateOptimizationSuggestions'](testCase.query, {});
        expect(suggestions).toContain(testCase.expectedSuggestion);
      }
    });

    it('should detect subqueries that could be JOINs', async () => {
      const mockPlan = [{
        'QUERY PLAN': [{ 'Plan': {} }]
      }];

      mockDb.query.mockResolvedValue(mockPlan);

      const analysis = await service.analyzeQuery(
        'SELECT * FROM users WHERE id IN (SELECT user_id FROM orders)'
      );

      expect(analysis.suggestions).toContain(
        'Consider replacing subquery with JOIN for better performance'
      );
    });

    it('should detect OR conditions affecting indexes', async () => {
      const mockPlan = [{
        'QUERY PLAN': [{ 'Plan': {} }]
      }];

      mockDb.query.mockResolvedValue(mockPlan);

      const analysis = await service.analyzeQuery(
        'SELECT * FROM users WHERE status = ? OR role = ?',
        ['active', 'admin']
      );

      expect(analysis.suggestions).toContain(
        'OR conditions may prevent index usage, consider UNION'
      );
    });

    it('should detect function calls on indexed columns', async () => {
      const mockPlan = [{
        'QUERY PLAN': [{ 'Plan': {} }]
      }];

      mockDb.query.mockResolvedValue(mockPlan);

      const analysis = await service.analyzeQuery(
        'SELECT * FROM users WHERE LOWER(email) = ?',
        ['test@example.com']
      );

      expect(analysis.suggestions).toContain(
        'Function calls on columns prevent index usage'
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should track query statistics', async () => {
      const queryHash = service['hashQuery']('SELECT * FROM users', []);
      mockDb.query.mockResolvedValue([{ id: 1 }]);

      // Execute query - cache is enabled by default so only first call goes to DB
      await service.executeOptimized('SELECT * FROM users', [], { cache: false });
      await service.executeOptimized('SELECT * FROM users', [], { cache: false });
      await service.executeOptimized('SELECT * FROM users', [], { cache: false });

      // Check that stats were recorded for each execution
      const statsCalls = mockDb.query.mock.calls.filter((call: any[]) =>
        call[0].includes('INSERT INTO query_performance_stats')
      );

      expect(statsCalls.length).toBe(3);
      expect(statsCalls[0][1]).toContain(queryHash);
    });

    it('should alert on critical slow queries', async () => {
      const mockSlowQuery: QueryStats = {
        queryHash: 'critical',
        queryText: 'SELECT * FROM massive_table',
        executionCount: 1000,
        totalTimeMs: 500000,
        avgTimeMs: 500, // Very slow (above threshold * 2)
        maxTimeMs: 2000,
        minTimeMs: 200,
        lastExecutedAt: new Date(),
        suggestions: ['Add indexes']
      };

      mockDb.query.mockResolvedValue([mockSlowQuery]);

      // Trigger analysis
      await service['analyzeSlowQueries']();

      // Should have sent alert (logged as error)
      const { logger } = await import('../../../services/SimpleLogger');
      expect(logger.error).toHaveBeenCalledWith(
        'SLOW QUERY ALERT',
        expect.objectContaining({
          avgTime: 500,
          executions: 1000
        })
      );
    });
  });
});
