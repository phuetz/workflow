/**
 * Query Optimization Service Tests
 */

import { QueryOptimizationService, QueryStats } from '../QueryOptimizationService';
import { DatabaseConnection } from '../../database/connection';

// Mock database connection
jest.mock('../../database/connection');

// Mock logger
jest.mock('../../../services/LoggingService', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('QueryOptimizationService', () => {
  let service: QueryOptimizationService;
  let mockDb: jest.Mocked<DatabaseConnection>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock database
    mockDb = {
      query: jest.fn(),
      execute: jest.fn(),
      transaction: jest.fn()
    } as unknown;

    service = new QueryOptimizationService(mockDb, {
      enabled: true,
      ttl: 60,
      maxSize: 10,
      strategy: 'LRU'
    });

    // Clear any intervals
    jest.clearAllTimers();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Query Execution', () => {
    it('should execute query and cache result', async () => {
      mockDb.query.mockResolvedValue(mockResult);

      // First execution - should hit database
        'SELECT * FROM users WHERE id = ?',
        [1],
        { cache: true }
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?',
        [1],
        undefined
      );
      expect(result1).toEqual(mockResult);

      // Second execution - should hit cache
        'SELECT * FROM users WHERE id = ?',
        [1],
        { cache: true }
      );

      expect(mockDb.query).toHaveBeenCalledTimes(1); // Not called again
      expect(result2).toEqual(mockResult);

      // Check cache stats
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.5);
    });

    it('should bypass cache when disabled', async () => {
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

      expect(mockDb.query).toHaveBeenCalledTimes(2);
      
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should record slow queries', async () => {
      mockDb.query.mockImplementation(async () => {
        // Simulate slow query
        await new Promise(resolve => setTimeout(resolve, 150));
        return mockResult;
      });

      await service.executeOptimized(
        'SELECT * FROM users WHERE status = ?',
        ['active']
      );

      // Should have recorded the slow query
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO query_performance_stats'),
        expect.any(Array)
      );
    });

    it('should handle query timeout', async () => {
      mockDb.query.mockRejectedValue(new Error('Query timeout'));

      await expect(
        service.executeOptimized(
          'SELECT * FROM large_table',
          [],
          { timeout: 1000 }
        )
      ).rejects.toThrow('Query timeout');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM large_table',
        [],
        1000
      );
    });
  });

  describe('Query Analysis', () => {
    it('should analyze query execution plan', async () => {
        'QUERY PLAN': [{
          'Plan': {
            'Node Type': 'Seq Scan',
            'Relation Name': 'users',
            'Total Cost': 100,
            'Rows': 5000,
            'Actual Total Time': 50
          }
        }]
      }];

      mockDb.query.mockResolvedValue(mockPlan);

        'SELECT * FROM users WHERE status = ?',
        ['active']
      );

      expect(analysis.query).toContain('SELECT * FROM users');
      expect(analysis.estimatedCost).toBe(100);
      expect(analysis.actualCost).toBe(50);
      expect(analysis.suggestions).toContain(
        'Query is performing a full table scan on a large table'
      );
      expect(analysis.suggestions).toContain(
        'Avoid SELECT *, specify only required columns'
      );
    });

    it('should detect missing indexes', async () => {
        'QUERY PLAN': [{
          'Seq Scan': true,
          'Rows': 10000
        }]
      }];

      mockDb.query.mockResolvedValue(mockPlan);

        'SELECT id FROM users WHERE email = ?',
        ['test@example.com']
      );

      expect(analysis.suggestions).toContain(
        'Consider adding an index on the WHERE clause columns'
      );
    });

    it('should detect missing JOIN conditions', async () => {
        'QUERY PLAN': [{}]
      }];

      mockDb.query.mockResolvedValue(mockPlan);

        'SELECT * FROM users JOIN orders'
      );

      expect(analysis.suggestions).toContain(
        'Missing JOIN condition may cause cartesian product'
      );
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

      expect(stats.entries).toBeLessThanOrEqual(3);
    });

    it('should clear expired cache entries', async () => {
      jest.useFakeTimers();

      service = new QueryOptimizationService(mockDb, {
        enabled: true,
        ttl: 60, // 60 seconds
        maxSize: 50,
        strategy: 'TTL'
      });

      mockDb.query.mockResolvedValue([{ id: 1 }]);

      // Add cache entry
      await service.executeOptimized('SELECT * FROM users', []);

      // Advance time past TTL
      jest.advanceTimersByTime(61000);

      // Trigger cleanup
      service['cleanupCache']();

      expect(stats.entries).toBe(0);

      jest.useRealTimers();
    });

    it('should clear cache on demand', async () => {
      mockDb.query.mockResolvedValue([{ id: 1 }]);

      // Add some cached queries
      await service.executeOptimized('SELECT 1', []);
      await service.executeOptimized('SELECT 2', []);

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
      expect(mockDb.query).toHaveBeenCalledWith('VACUUM ANALYZE users');
      expect(mockDb.query).toHaveBeenCalledWith('VACUUM ANALYZE orders');
      expect(mockDb.query).toHaveBeenCalledWith('VACUUM ANALYZE products');
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
      expect(mockDb.query).toHaveBeenCalledWith('OPTIMIZE TABLE users');
      expect(mockDb.query).toHaveBeenCalledWith('OPTIMIZE TABLE orders');
    });

    it('should handle optimization errors gracefully', async () => {
      mockDb.query
        .mockResolvedValueOnce([{ tablename: 'users' }])
        .mockRejectedValueOnce(new Error('Access denied'));

      await service.optimizeForPostgreSQL();

      // Should not throw, just log error
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('Query Suggestions', () => {
    it('should suggest improvements for common patterns', async () => {
        {
          query: 'SELECT * FROM users',
          expectedSuggestion: 'Replace SELECT * with specific columns'
        },
        {
          query: "SELECT id FROM users WHERE email LIKE '%@gmail.com'",
          expectedSuggestion: 'Leading wildcard in LIKE prevents index usage'
        },
        {
          query: 'SELECT * FROM orders ORDER BY created_at DESC',
          expectedSuggestion: 'Add LIMIT when using ORDER BY for better performance'
        },
        {
          query: 'SELECT DISTINCT user_id FROM orders GROUP BY user_id',
          expectedSuggestion: 'DISTINCT with GROUP BY is redundant'
        },
        {
          query: 'SELECT * FROM a JOIN b JOIN c JOIN d ON a.id = b.id',
          expectedSuggestion: 'Multiple JOINs detected, ensure proper indexes exist'
        }
      ];

      for (const testCase of testCases) {
        expect(suggestions).toContain(testCase.expectedSuggestion);
      }
    });

    it('should detect subqueries that could be JOINs', async () => {
        'QUERY PLAN': [{}]
      }];

      mockDb.query.mockResolvedValue(mockPlan);

        'SELECT * FROM users WHERE id IN (SELECT user_id FROM orders)'
      );

      expect(analysis.suggestions).toContain(
        'Consider replacing subquery with JOIN for better performance'
      );
    });

    it('should detect OR conditions affecting indexes', async () => {
        'QUERY PLAN': [{}]
      }];

      mockDb.query.mockResolvedValue(mockPlan);

        'SELECT * FROM users WHERE status = ? OR role = ?',
        ['active', 'admin']
      );

      expect(analysis.suggestions).toContain(
        'OR conditions may prevent index usage, consider UNION'
      );
    });

    it('should detect function calls on indexed columns', async () => {
        'QUERY PLAN': [{}]
      }];

      mockDb.query.mockResolvedValue(mockPlan);

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
      
      mockDb.query.mockResolvedValue([{ id: 1 }]);

      // Execute same query multiple times
      for (let __i = 0; i < 3; i++) {
        await service.executeOptimized('SELECT * FROM users', []);
      }

      // Check that stats were recorded
        call[0].includes('INSERT INTO query_performance_stats')
      );
      
      expect(statsCalls).toHaveLength(3);
      expect(statsCalls[0][1]).toContain(queryHash);
    });

    it('should alert on critical slow queries', async () => {
      jest.useFakeTimers();

      const mockSlowQuery: QueryStats = {
        queryHash: 'critical',
        queryText: 'SELECT * FROM massive_table',
        executionCount: 1000,
        totalTimeMs: 500000,
        avgTimeMs: 500, // Very slow
        maxTimeMs: 2000,
        minTimeMs: 200,
        lastExecutedAt: new Date(),
        suggestions: ['Add indexes']
      };

      mockDb.query.mockResolvedValue([mockSlowQuery]);

      // Trigger analysis
      await service['analyzeSlowQueries']();

      // Should have sent alert (logged as error)
      const { _logger } = await import('../../../services/LoggingService');
      expect(logger.error).toHaveBeenCalledWith(
        'SLOW QUERY ALERT',
        expect.objectContaining({
          avgTime: 500,
          executions: 1000
        })
      );

      jest.useRealTimers();
    });
  });
});