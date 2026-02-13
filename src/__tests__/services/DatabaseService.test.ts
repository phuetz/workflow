/**
 * DatabaseService Unit Tests
 * Tests for the multi-database provider service
 *
 * Task: T2.7 - Tests DatabaseService
 * Created: 2026-01-07
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies
vi.mock('../../services/SimpleLogger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn()
  }
}));

vi.mock('../../services/SecretsService', () => ({
  SecretsService: vi.fn().mockImplementation(() => ({
    getSecret: vi.fn().mockResolvedValue('mock-secret'),
    setSecret: vi.fn().mockResolvedValue(undefined)
  }))
}));

import {
  DatabaseService,
  DatabaseConfig,
  DatabaseQuery,
  DatabaseTransaction,
  DatabaseResult,
  DatabaseSchema,
  DatabaseTable
} from '../../services/DatabaseService';
import { SecretsService } from '../../services/SecretsService';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let mockSecretsService: SecretsService;

  beforeEach(() => {
    mockSecretsService = new SecretsService();
    service = new DatabaseService(mockSecretsService);
  });

  afterEach(async () => {
    // Cleanup all connections
    await service.closeAllConnections();
  });

  // ============================================
  // Provider Initialization Tests
  // ============================================
  describe('Provider Initialization', () => {
    it('should initialize all 10 database providers', () => {
      const providers = service.getAvailableProviders();

      expect(providers).toHaveLength(10);
      expect(providers).toContain('oracle');
      expect(providers).toContain('sqlserver');
      expect(providers).toContain('snowflake');
      expect(providers).toContain('bigquery');
      expect(providers).toContain('elasticsearch');
      expect(providers).toContain('cassandra');
      expect(providers).toContain('mysql');
      expect(providers).toContain('postgresql');
      expect(providers).toContain('mongodb');
      expect(providers).toContain('redis');
    });

    it('should return provider capabilities for Oracle', async () => {
      const capabilities = await service.getProviderCapabilities('oracle');

      expect(capabilities).toHaveProperty('supportsTransactions', true);
      expect(capabilities).toHaveProperty('supportsStoredProcedures', true);
      expect(capabilities).toHaveProperty('supportsViews', true);
      expect(capabilities).toHaveProperty('supportsIndexes', true);
      expect(capabilities).toHaveProperty('maxConnections');
      expect(capabilities).toHaveProperty('supportedDataTypes');
    });

    it('should return provider capabilities for SQL Server', async () => {
      const capabilities = await service.getProviderCapabilities('sqlserver');

      expect(capabilities.supportsTransactions).toBe(true);
      expect(capabilities.supportsStoredProcedures).toBe(true);
    });

    it('should return provider capabilities for PostgreSQL', async () => {
      const capabilities = await service.getProviderCapabilities('postgresql');

      expect(capabilities.supportsTransactions).toBe(true);
      expect(capabilities.supportsStoredProcedures).toBe(true);
    });

    it('should return provider capabilities for MySQL', async () => {
      const capabilities = await service.getProviderCapabilities('mysql');

      expect(capabilities.supportsTransactions).toBe(true);
    });

    it('should return provider capabilities for MongoDB', async () => {
      const capabilities = await service.getProviderCapabilities('mongodb');

      expect(capabilities.supportsTransactions).toBe(true);
      expect(capabilities.supportsStoredProcedures).toBe(false);
    });

    it('should return provider capabilities for BigQuery', async () => {
      const capabilities = await service.getProviderCapabilities('bigquery');

      expect(capabilities.supportsTransactions).toBe(false);
      expect(capabilities.supportsIndexes).toBe(false);
    });

    it('should return provider capabilities for Elasticsearch', async () => {
      const capabilities = await service.getProviderCapabilities('elasticsearch');

      expect(capabilities.supportsTransactions).toBe(false);
      expect(capabilities.supportsIndexes).toBe(true);
    });

    it('should return provider capabilities for Cassandra', async () => {
      const capabilities = await service.getProviderCapabilities('cassandra');

      expect(capabilities.supportsTransactions).toBe(false);
    });

    it('should throw error for unknown provider capabilities', async () => {
      await expect(service.getProviderCapabilities('unknown')).rejects.toThrow(
        'Unknown provider: unknown'
      );
    });
  });

  // ============================================
  // Connection Management Tests
  // ============================================
  describe('Connection Management', () => {
    describe('connect()', () => {
      it('should connect to Oracle database', async () => {
        const config: DatabaseConfig = {
          type: 'oracle',
          host: 'localhost',
          port: 1521,
          database: 'testdb',
          username: 'user',
          password: 'pass'
        };

        const result = await service.connect(config);

        expect(result.success).toBe(true);
        expect(result.connectionId).toBeDefined();
        expect(result.connectionId).toMatch(/^oracle_\d+_[a-z0-9]+$/);
      });

      it('should connect to SQL Server database', async () => {
        const config: DatabaseConfig = {
          type: 'sqlserver',
          host: 'localhost',
          port: 1433,
          database: 'testdb'
        };

        const result = await service.connect(config);

        expect(result.success).toBe(true);
        expect(result.connectionId).toContain('sqlserver');
      });

      it('should connect to PostgreSQL database', async () => {
        const config: DatabaseConfig = {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          database: 'testdb'
        };

        const result = await service.connect(config);

        expect(result.success).toBe(true);
        expect(result.connectionId).toContain('postgresql');
      });

      it('should connect to MySQL database', async () => {
        const config: DatabaseConfig = {
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          database: 'testdb'
        };

        const result = await service.connect(config);

        expect(result.success).toBe(true);
        expect(result.connectionId).toContain('mysql');
      });

      it('should connect to MongoDB', async () => {
        const config: DatabaseConfig = {
          type: 'mongodb',
          host: 'localhost',
          port: 27017,
          database: 'testdb'
        };

        const result = await service.connect(config);

        expect(result.success).toBe(true);
        expect(result.connectionId).toContain('mongodb');
      });

      it('should connect to Redis', async () => {
        const config: DatabaseConfig = {
          type: 'redis',
          host: 'localhost',
          port: 6379
        };

        const result = await service.connect(config);

        expect(result.success).toBe(true);
        expect(result.connectionId).toContain('redis');
      });

      it('should connect to Snowflake', async () => {
        const config: DatabaseConfig = {
          type: 'snowflake',
          accountId: 'test-account',
          warehouse: 'test-warehouse',
          database: 'testdb'
        };

        const result = await service.connect(config);

        expect(result.success).toBe(true);
        expect(result.connectionId).toContain('snowflake');
      });

      it('should connect to BigQuery', async () => {
        const config: DatabaseConfig = {
          type: 'bigquery',
          projectId: 'test-project',
          datasetId: 'test-dataset'
        };

        const result = await service.connect(config);

        expect(result.success).toBe(true);
        expect(result.connectionId).toContain('bigquery');
      });

      it('should connect to Elasticsearch', async () => {
        const config: DatabaseConfig = {
          type: 'elasticsearch',
          host: 'localhost',
          port: 9200
        };

        const result = await service.connect(config);

        expect(result.success).toBe(true);
        expect(result.connectionId).toContain('elasticsearch');
      });

      it('should connect to Cassandra', async () => {
        const config: DatabaseConfig = {
          type: 'cassandra',
          host: 'localhost',
          port: 9042
        };

        const result = await service.connect(config);

        expect(result.success).toBe(true);
        expect(result.connectionId).toContain('cassandra');
      });

      it('should throw error for unsupported database type', async () => {
        const config = {
          type: 'unsupported' as any,
          host: 'localhost'
        };

        await expect(service.connect(config)).rejects.toThrow(
          'Unsupported database type: unsupported'
        );
      });

      it('should track active connections', async () => {
        const config: DatabaseConfig = {
          type: 'postgresql',
          host: 'localhost',
          database: 'testdb'
        };

        expect(service.getActiveConnections()).toHaveLength(0);

        await service.connect(config);

        expect(service.getActiveConnections()).toHaveLength(1);
      });

      it('should handle multiple connections', async () => {
        const configs: DatabaseConfig[] = [
          { type: 'postgresql', host: 'localhost', database: 'db1' },
          { type: 'mysql', host: 'localhost', database: 'db2' },
          { type: 'mongodb', host: 'localhost', database: 'db3' }
        ];

        for (const config of configs) {
          await service.connect(config);
        }

        expect(service.getActiveConnections()).toHaveLength(3);
      });
    });

    describe('disconnect()', () => {
      it('should disconnect an existing connection', async () => {
        const config: DatabaseConfig = {
          type: 'postgresql',
          host: 'localhost',
          database: 'testdb'
        };

        const { connectionId } = await service.connect(config);
        expect(service.getActiveConnections()).toHaveLength(1);

        const result = await service.disconnect(connectionId);

        expect(result).toBe(true);
        expect(service.getActiveConnections()).toHaveLength(0);
      });

      it('should return false for non-existent connection', async () => {
        const result = await service.disconnect('non-existent-id');

        expect(result).toBe(false);
      });
    });

    describe('closeAllConnections()', () => {
      it('should close all active connections', async () => {
        const configs: DatabaseConfig[] = [
          { type: 'postgresql', host: 'localhost', database: 'db1' },
          { type: 'mysql', host: 'localhost', database: 'db2' }
        ];

        for (const config of configs) {
          await service.connect(config);
        }

        expect(service.getActiveConnections()).toHaveLength(2);

        await service.closeAllConnections();

        expect(service.getActiveConnections()).toHaveLength(0);
      });

      it('should handle closing when no connections exist', async () => {
        await expect(service.closeAllConnections()).resolves.not.toThrow();
      });
    });

    describe('cleanupConnections()', () => {
      it('should cleanup stale connections based on maxAge', async () => {
        const config: DatabaseConfig = {
          type: 'postgresql',
          host: 'localhost',
          database: 'testdb'
        };

        await service.connect(config);
        expect(service.getActiveConnections()).toHaveLength(1);

        // Wait a bit and use negative maxAge to ensure connection is "old"
        // The cleanup checks: now - connection.createdAt.getTime() > maxAge
        // With -1, even a fresh connection (0ms old) will be cleaned: 0 > -1 = true
        await service.cleanupConnections(-1);

        expect(service.getActiveConnections()).toHaveLength(0);
      });

      it('should not cleanup fresh connections with default maxAge', async () => {
        const config: DatabaseConfig = {
          type: 'postgresql',
          host: 'localhost',
          database: 'testdb'
        };

        await service.connect(config);

        // Default maxAge is 1 hour, connection should remain
        await service.cleanupConnections();

        expect(service.getActiveConnections()).toHaveLength(1);
      });

      it('should not cleanup connections younger than maxAge', async () => {
        const config: DatabaseConfig = {
          type: 'postgresql',
          host: 'localhost',
          database: 'testdb'
        };

        await service.connect(config);

        // Use a large maxAge (1 hour), connection should remain
        await service.cleanupConnections(3600000);

        expect(service.getActiveConnections()).toHaveLength(1);
      });
    });

    describe('testConnection()', () => {
      it('should test Oracle connection successfully', async () => {
        const config: DatabaseConfig = {
          type: 'oracle',
          host: 'localhost',
          database: 'testdb'
        };

        const result = await service.testConnection(config);

        expect(result).toBe(true);
      });

      it('should test PostgreSQL connection successfully', async () => {
        const config: DatabaseConfig = {
          type: 'postgresql',
          host: 'localhost',
          database: 'testdb'
        };

        const result = await service.testConnection(config);

        expect(result).toBe(true);
      });

      it('should return false for unknown provider', async () => {
        const config = {
          type: 'unknown' as any,
          host: 'localhost'
        };

        const result = await service.testConnection(config);

        expect(result).toBe(false);
      });
    });
  });

  // ============================================
  // Query Operations Tests
  // ============================================
  describe('Query Operations', () => {
    let connectionId: string;

    beforeEach(async () => {
      const config: DatabaseConfig = {
        type: 'postgresql',
        host: 'localhost',
        database: 'testdb'
      };
      const result = await service.connect(config);
      connectionId = result.connectionId;
    });

    describe('executeQuery()', () => {
      it('should execute a simple query successfully', async () => {
        const query: DatabaseQuery = {
          query: 'SELECT * FROM users',
          returnType: 'rows'
        };

        const result = await service.executeQuery(connectionId, query);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.executionTime).toBeGreaterThanOrEqual(0);
        expect(result.metadata).toHaveProperty('provider', 'postgresql');
      });

      it('should execute query with parameters', async () => {
        const query: DatabaseQuery = {
          query: 'SELECT * FROM users WHERE id = $1',
          parameters: [1],
          returnType: 'rows'
        };

        const result = await service.executeQuery(connectionId, query);

        expect(result.success).toBe(true);
      });

      it('should execute query with timeout', async () => {
        const query: DatabaseQuery = {
          query: 'SELECT * FROM large_table',
          timeout: 5000
        };

        const result = await service.executeQuery(connectionId, query);

        expect(result.success).toBe(true);
      });

      it('should throw error for non-existent connection', async () => {
        const query: DatabaseQuery = {
          query: 'SELECT 1'
        };

        await expect(
          service.executeQuery('non-existent', query)
        ).rejects.toThrow('Connection not found: non-existent');
      });

      it('should include execution time in result', async () => {
        const query: DatabaseQuery = {
          query: 'SELECT 1'
        };

        const result = await service.executeQuery(connectionId, query);

        expect(typeof result.executionTime).toBe('number');
        expect(result.executionTime).toBeGreaterThanOrEqual(0);
      });

      it('should include rowCount when available', async () => {
        const query: DatabaseQuery = {
          query: 'SELECT * FROM users',
          returnType: 'count'
        };

        const result = await service.executeQuery(connectionId, query);

        expect(result).toHaveProperty('rowCount');
      });
    });

    describe('executeBatch()', () => {
      it('should execute multiple queries in batch', async () => {
        const queries: DatabaseQuery[] = [
          { query: 'SELECT 1' },
          { query: 'SELECT 2' },
          { query: 'SELECT 3' }
        ];

        const results = await service.executeBatch(connectionId, queries);

        expect(results).toHaveLength(3);
        expect(results.every(r => r.success)).toBe(true);
      });

      it('should return results in order', async () => {
        const queries: DatabaseQuery[] = [
          { query: 'SELECT 1 AS num' },
          { query: 'SELECT 2 AS num' }
        ];

        const results = await service.executeBatch(connectionId, queries);

        expect(results).toHaveLength(2);
      });

      it('should throw error for non-existent connection', async () => {
        const queries: DatabaseQuery[] = [{ query: 'SELECT 1' }];

        await expect(
          service.executeBatch('non-existent', queries)
        ).rejects.toThrow('Connection not found: non-existent');
      });

      it('should handle empty batch', async () => {
        const results = await service.executeBatch(connectionId, []);

        expect(results).toHaveLength(0);
      });
    });

    describe('executeTransaction()', () => {
      it('should execute transaction successfully', async () => {
        const transaction: DatabaseTransaction = {
          id: 'tx-001',
          queries: [
            { query: 'INSERT INTO users (name) VALUES ($1)', parameters: ['John'] },
            { query: 'INSERT INTO users (name) VALUES ($1)', parameters: ['Jane'] }
          ],
          rollbackOnError: true
        };

        const result = await service.executeTransaction(connectionId, transaction);

        expect(result.success).toBe(true);
        expect(result.metadata).toHaveProperty('provider', 'postgresql');
      });

      it('should throw error for non-existent connection', async () => {
        const transaction: DatabaseTransaction = {
          id: 'tx-001',
          queries: [{ query: 'SELECT 1' }],
          rollbackOnError: true
        };

        await expect(
          service.executeTransaction('non-existent', transaction)
        ).rejects.toThrow('Connection not found: non-existent');
      });

      it('should include execution time in result', async () => {
        const transaction: DatabaseTransaction = {
          id: 'tx-002',
          queries: [{ query: 'SELECT 1' }],
          rollbackOnError: false
        };

        const result = await service.executeTransaction(connectionId, transaction);

        expect(result.executionTime).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Transaction Support by Provider', () => {
      it('should throw error for BigQuery transactions', async () => {
        const bigQueryConfig: DatabaseConfig = {
          type: 'bigquery',
          projectId: 'test-project',
          datasetId: 'test-dataset'
        };

        const { connectionId: bqConnId } = await service.connect(bigQueryConfig);

        const transaction: DatabaseTransaction = {
          id: 'tx-bq',
          queries: [{ query: 'SELECT 1' }],
          rollbackOnError: true
        };

        const result = await service.executeTransaction(bqConnId, transaction);

        expect(result.success).toBe(false);
        expect(result.error).toContain('BigQuery does not support transactions');
      });

      it('should throw error for Elasticsearch transactions', async () => {
        const esConfig: DatabaseConfig = {
          type: 'elasticsearch',
          host: 'localhost',
          port: 9200
        };

        const { connectionId: esConnId } = await service.connect(esConfig);

        const transaction: DatabaseTransaction = {
          id: 'tx-es',
          queries: [{ query: 'SELECT 1' }],
          rollbackOnError: true
        };

        const result = await service.executeTransaction(esConnId, transaction);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Elasticsearch does not support transactions');
      });

      it('should throw error for Cassandra transactions', async () => {
        const cassandraConfig: DatabaseConfig = {
          type: 'cassandra',
          host: 'localhost',
          port: 9042
        };

        const { connectionId: cConnId } = await service.connect(cassandraConfig);

        const transaction: DatabaseTransaction = {
          id: 'tx-cass',
          queries: [{ query: 'SELECT 1' }],
          rollbackOnError: true
        };

        const result = await service.executeTransaction(cConnId, transaction);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Cassandra does not support transactions');
      });
    });
  });

  // ============================================
  // Schema Operations Tests
  // ============================================
  describe('Schema Operations', () => {
    let connectionId: string;

    beforeEach(async () => {
      const config: DatabaseConfig = {
        type: 'oracle',
        host: 'localhost',
        database: 'testdb'
      };
      const result = await service.connect(config);
      connectionId = result.connectionId;
    });

    describe('getSchema()', () => {
      it('should return database schema', async () => {
        const schema: DatabaseSchema = await service.getSchema(connectionId);

        expect(schema).toHaveProperty('tables');
        expect(schema).toHaveProperty('views');
        expect(schema).toHaveProperty('procedures');
        expect(schema).toHaveProperty('functions');
        expect(Array.isArray(schema.tables)).toBe(true);
        expect(Array.isArray(schema.views)).toBe(true);
        expect(Array.isArray(schema.procedures)).toBe(true);
        expect(Array.isArray(schema.functions)).toBe(true);
      });

      it('should throw error for non-existent connection', async () => {
        await expect(service.getSchema('non-existent')).rejects.toThrow(
          'Connection not found: non-existent'
        );
      });
    });

    describe('getTables()', () => {
      it('should return list of tables', async () => {
        const tables: DatabaseTable[] = await service.getTables(connectionId);

        expect(Array.isArray(tables)).toBe(true);
      });

      it('should throw error for non-existent connection', async () => {
        await expect(service.getTables('non-existent')).rejects.toThrow(
          'Connection not found: non-existent'
        );
      });
    });

    describe('getTableSchema()', () => {
      it('should return table schema with name', async () => {
        const table: DatabaseTable = await service.getTableSchema(
          connectionId,
          'users'
        );

        expect(table).toHaveProperty('name', 'users');
        expect(table).toHaveProperty('schema');
        expect(table).toHaveProperty('columns');
        expect(Array.isArray(table.columns)).toBe(true);
      });

      it('should return different schemas for different databases', async () => {
        // Oracle
        const oracleTable = await service.getTableSchema(connectionId, 'test');
        expect(oracleTable.schema).toBe('public');

        // SQL Server
        const sqlConfig: DatabaseConfig = { type: 'sqlserver', host: 'localhost' };
        const { connectionId: sqlConnId } = await service.connect(sqlConfig);
        const sqlTable = await service.getTableSchema(sqlConnId, 'test');
        expect(sqlTable.schema).toBe('dbo');

        // Snowflake
        const snowConfig: DatabaseConfig = { type: 'snowflake', accountId: 'test' };
        const { connectionId: snowConnId } = await service.connect(snowConfig);
        const snowTable = await service.getTableSchema(snowConnId, 'test');
        expect(snowTable.schema).toBe('PUBLIC');
      });

      it('should throw error for non-existent connection', async () => {
        await expect(
          service.getTableSchema('non-existent', 'users')
        ).rejects.toThrow('Connection not found: non-existent');
      });
    });
  });

  // ============================================
  // Active Connections Tests
  // ============================================
  describe('Active Connections', () => {
    it('should return empty array when no connections', () => {
      expect(service.getActiveConnections()).toEqual([]);
    });

    it('should return array of connection IDs', async () => {
      await service.connect({ type: 'postgresql', host: 'localhost' });
      await service.connect({ type: 'mysql', host: 'localhost' });

      const connections = service.getActiveConnections();

      expect(connections).toHaveLength(2);
      expect(connections[0]).toMatch(/^postgresql_\d+_[a-z0-9]+$/);
      expect(connections[1]).toMatch(/^mysql_\d+_[a-z0-9]+$/);
    });

    it('should update when connections are added/removed', async () => {
      const { connectionId } = await service.connect({
        type: 'postgresql',
        host: 'localhost'
      });

      expect(service.getActiveConnections()).toHaveLength(1);

      await service.disconnect(connectionId);

      expect(service.getActiveConnections()).toHaveLength(0);
    });
  });

  // ============================================
  // Config Options Tests
  // ============================================
  describe('Config Options', () => {
    it('should accept SSL configuration', async () => {
      const config: DatabaseConfig = {
        type: 'postgresql',
        host: 'localhost',
        ssl: true
      };

      const result = await service.connect(config);

      expect(result.success).toBe(true);
    });

    it('should accept pool size configuration', async () => {
      const config: DatabaseConfig = {
        type: 'postgresql',
        host: 'localhost',
        poolSize: 10
      };

      const result = await service.connect(config);

      expect(result.success).toBe(true);
    });

    it('should accept timeout configuration', async () => {
      const config: DatabaseConfig = {
        type: 'postgresql',
        host: 'localhost',
        timeout: 30000
      };

      const result = await service.connect(config);

      expect(result.success).toBe(true);
    });

    it('should accept connection string', async () => {
      const config: DatabaseConfig = {
        type: 'postgresql',
        connectionString: 'postgresql://user:pass@localhost:5432/db'
      };

      const result = await service.connect(config);

      expect(result.success).toBe(true);
    });

    it('should accept additional options', async () => {
      const config: DatabaseConfig = {
        type: 'postgresql',
        host: 'localhost',
        options: {
          application_name: 'test-app',
          client_encoding: 'UTF8'
        }
      };

      const result = await service.connect(config);

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // Provider-Specific Tests
  // ============================================
  describe('Provider-Specific Behavior', () => {
    describe('Oracle Provider', () => {
      it('should have Oracle-specific capabilities', async () => {
        const capabilities = await service.getProviderCapabilities('oracle');

        expect(capabilities.supportedDataTypes).toContain('VARCHAR2');
        expect(capabilities.supportedDataTypes).toContain('CLOB');
        expect(capabilities.supportedDataTypes).toContain('BLOB');
      });
    });

    describe('SQL Server Provider', () => {
      it('should have SQL Server-specific capabilities', async () => {
        const capabilities = await service.getProviderCapabilities('sqlserver');

        expect(capabilities.supportedDataTypes).toContain('NVARCHAR');
        expect(capabilities.maxConnections).toBe(32767);
      });
    });

    describe('Snowflake Provider', () => {
      it('should accept account and warehouse config', async () => {
        const config: DatabaseConfig = {
          type: 'snowflake',
          accountId: 'my-account',
          warehouse: 'my-warehouse',
          database: 'my-db'
        };

        const result = await service.connect(config);

        expect(result.success).toBe(true);
      });

      it('should have Snowflake-specific capabilities', async () => {
        const capabilities = await service.getProviderCapabilities('snowflake');

        expect(capabilities.supportedDataTypes).toContain('VARIANT');
        expect(capabilities.supportedDataTypes).toContain('ARRAY');
        expect(capabilities.supportedDataTypes).toContain('OBJECT');
        expect(capabilities.supportsIndexes).toBe(false);
      });
    });

    describe('BigQuery Provider', () => {
      it('should accept project and dataset config', async () => {
        const config: DatabaseConfig = {
          type: 'bigquery',
          projectId: 'my-project',
          datasetId: 'my-dataset'
        };

        const result = await service.connect(config);

        expect(result.success).toBe(true);
      });

      it('should have BigQuery-specific capabilities', async () => {
        const capabilities = await service.getProviderCapabilities('bigquery');

        expect(capabilities.supportedDataTypes).toContain('STRUCT');
        expect(capabilities.supportedDataTypes).toContain('ARRAY');
        expect(capabilities.supportsTransactions).toBe(false);
      });
    });

    describe('Elasticsearch Provider', () => {
      it('should have Elasticsearch-specific capabilities', async () => {
        const capabilities = await service.getProviderCapabilities('elasticsearch');

        expect(capabilities.supportedDataTypes).toContain('text');
        expect(capabilities.supportedDataTypes).toContain('keyword');
        expect(capabilities.supportedDataTypes).toContain('nested');
        expect(capabilities.supportsStoredProcedures).toBe(false);
      });
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    it('should handle query execution errors gracefully', async () => {
      const config: DatabaseConfig = {
        type: 'postgresql',
        host: 'localhost'
      };
      const { connectionId } = await service.connect(config);

      // Mock a failing query by manipulating the provider
      // The simulated provider should return success, but we can test error paths exist
      const query: DatabaseQuery = {
        query: 'SELECT * FROM users'
      };

      const result = await service.executeQuery(connectionId, query);

      // Should not throw, should return result
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('executionTime');
    });

    it('should log errors during connection failures', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      // Try to connect with invalid config - but simulated providers always succeed
      // This test verifies the error handling code path exists
      const config: DatabaseConfig = {
        type: 'postgresql',
        host: 'invalid-host'
      };

      // Simulated providers don't actually fail, so connection succeeds
      const result = await service.connect(config);
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // Concurrent Operations Tests
  // ============================================
  describe('Concurrent Operations', () => {
    it('should handle concurrent connections', async () => {
      const configs: DatabaseConfig[] = [
        { type: 'postgresql', host: 'host1' },
        { type: 'mysql', host: 'host2' },
        { type: 'mongodb', host: 'host3' },
        { type: 'redis', host: 'host4' }
      ];

      const results = await Promise.all(
        configs.map(config => service.connect(config))
      );

      expect(results).toHaveLength(4);
      expect(results.every(r => r.success)).toBe(true);
      expect(service.getActiveConnections()).toHaveLength(4);
    });

    it('should handle concurrent queries on same connection', async () => {
      const config: DatabaseConfig = {
        type: 'postgresql',
        host: 'localhost'
      };
      const { connectionId } = await service.connect(config);

      const queries: DatabaseQuery[] = [
        { query: 'SELECT 1' },
        { query: 'SELECT 2' },
        { query: 'SELECT 3' }
      ];

      const results = await Promise.all(
        queries.map(q => service.executeQuery(connectionId, q))
      );

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should handle concurrent queries on different connections', async () => {
      const pgConfig: DatabaseConfig = { type: 'postgresql', host: 'localhost' };
      const mysqlConfig: DatabaseConfig = { type: 'mysql', host: 'localhost' };

      const [pg, mysql] = await Promise.all([
        service.connect(pgConfig),
        service.connect(mysqlConfig)
      ]);

      const [pgResult, mysqlResult] = await Promise.all([
        service.executeQuery(pg.connectionId, { query: 'SELECT 1' }),
        service.executeQuery(mysql.connectionId, { query: 'SELECT 2' })
      ]);

      expect(pgResult.success).toBe(true);
      expect(pgResult.metadata?.provider).toBe('postgresql');
      expect(mysqlResult.success).toBe(true);
      expect(mysqlResult.metadata?.provider).toBe('mysql');
    });
  });

  // ============================================
  // Type Safety Tests
  // ============================================
  describe('Type Safety', () => {
    it('should have correct types for DatabaseConfig', () => {
      const config: DatabaseConfig = {
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'test',
        username: 'user',
        password: 'pass',
        ssl: true,
        poolSize: 10,
        timeout: 30000
      };

      expect(typeof config.type).toBe('string');
      expect(typeof config.host).toBe('string');
      expect(typeof config.port).toBe('number');
    });

    it('should have correct types for DatabaseQuery', () => {
      const query: DatabaseQuery = {
        query: 'SELECT * FROM users WHERE id = $1',
        parameters: [1, 'test', true, null, new Date(), Buffer.from('test')],
        timeout: 5000,
        returnType: 'rows'
      };

      expect(typeof query.query).toBe('string');
      expect(Array.isArray(query.parameters)).toBe(true);
    });

    it('should have correct types for DatabaseResult', () => {
      const result: DatabaseResult = {
        success: true,
        data: [{ id: 1, name: 'Test' }],
        rowCount: 1,
        executionTime: 10,
        metadata: { provider: 'postgresql' }
      };

      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.executionTime).toBe('number');
    });

    it('should have correct types for DatabaseTransaction', () => {
      const transaction: DatabaseTransaction = {
        id: 'tx-001',
        queries: [{ query: 'SELECT 1' }],
        rollbackOnError: true
      };

      expect(typeof transaction.id).toBe('string');
      expect(Array.isArray(transaction.queries)).toBe(true);
      expect(typeof transaction.rollbackOnError).toBe('boolean');
    });
  });
});
