/**
 * Database Connection Pool Manager - Orchestrates database connection pooling
 */
import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';
import { PoolConfig, ConnectionStats, PooledConnection, PgClient, MySQLConnection } from './pool/types';
import { PoolManager } from './pool/PoolManager';
import { HealthChecker } from './pool/HealthChecker';
import { PostgreSQLConnectionFactory, MySQLConnectionFactory } from './pool/ConnectionFactory';
import { PostgreSQLQueryExecutor, MySQLQueryExecutor } from './pool/QueryExecutor';

export { PoolConfig, ConnectionStats } from './pool/types';

function validateConfig(config: PoolConfig): PoolConfig {
  return {
    ...config,
    minConnections: config.minConnections || 2,
    maxConnections: config.maxConnections || 10,
    connectionTimeout: config.connectionTimeout || 30000,
    idleTimeout: config.idleTimeout || 60000,
    maxWaitingClients: config.maxWaitingClients || 20,
    evictionRunInterval: config.evictionRunInterval || 30000,
    retryAttempts: config.retryAttempts || 3,
    retryDelay: config.retryDelay || 1000
  };
}

export class ConnectionPool extends EventEmitter {
  protected config: PoolConfig;
  protected poolManager: PoolManager;
  protected healthChecker: HealthChecker;

  constructor(config: PoolConfig) {
    super();
    this.config = validateConfig(config);
    this.poolManager = new PoolManager(this.config);
    this.healthChecker = new HealthChecker(this.config);
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      for (let i = 0; i < this.config.minConnections; i++) {
        await this.createConnection();
      }
      this.poolManager.startEvictionTimer(() => this.evictIdleConnections());
      logger.info('Connection pool initialized', {
        minConnections: this.config.minConnections,
        maxConnections: this.config.maxConnections
      });
      this.emit('ready');
    } catch (error) {
      logger.error('Failed to initialize connection pool:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async acquire(): Promise<unknown> {
    if (this.poolManager.shuttingDown) {
      throw new Error('Connection pool is shutting down');
    }

    const idleConnection = this.poolManager.getIdleConnection(
      (p) => this.healthChecker.isConnectionValid(p)
    );
    if (idleConnection) {
      this.poolManager.markConnectionActive(idleConnection);
      return idleConnection.connection;
    }

    if (this.poolManager.connectionCount < this.config.maxConnections) {
      try {
        const pooled = await this.createConnection();
        const pooledConnection = this.poolManager.findPooledConnection(pooled.connection);
        if (pooledConnection) {
          this.poolManager.markConnectionActive(pooledConnection);
          return pooledConnection.connection;
        }
      } catch (error) {
        logger.error('Failed to create new connection:', error);
        this.poolManager.incrementErrors();
        throw error;
      }
    }

    if (this.poolManager.getStats().waiting >= this.config.maxWaitingClients) {
      throw new Error('Too many clients waiting for connection');
    }

    return this.poolManager.waitForConnection();
  }

  release(connection: unknown): void {
    const pooled = this.poolManager.findPooledConnection(connection);
    if (!pooled) {
      logger.warn('Attempted to release unknown connection');
      return;
    }

    if (!this.healthChecker.isConnectionValid(pooled)) {
      this.destroyConnection(pooled);
      this.poolManager.processWaitingClients((p) => this.healthChecker.isConnectionValid(p));
      return;
    }

    this.poolManager.markConnectionIdle(pooled);
    this.poolManager.processWaitingClients((p) => this.healthChecker.isConnectionValid(p));
    this.emit('release', connection);
  }

  async execute<T>(
    query: string,
    params: unknown[] = [],
    options: { timeout?: number } = {}
  ): Promise<T> {
    const connection = await this.acquire();
    const pooled = this.poolManager.findPooledConnection(connection);

    try {
      if (options.timeout) {
        await this.setQueryTimeout(connection, options.timeout);
      }
      const result = await this.executeQuery(connection, query, params) as T;
      if (pooled) pooled.queryCount++;
      return result;
    } catch (error) {
      if (pooled) pooled.errorCount++;
      throw error;
    } finally {
      this.release(connection);
    }
  }

  private async createConnection(): Promise<PooledConnection> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const connection = await this.createRawConnection();
        const id = this.poolManager.generateConnectionId();

        const pooled: PooledConnection = {
          id,
          connection: connection as PooledConnection['connection'],
          inUse: false,
          lastUsed: Date.now(),
          created: Date.now(),
          queryCount: 0,
          errorCount: 0
        };

        this.poolManager.addConnection(pooled);
        this.emit('connect', connection);
        return pooled;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Connection attempt ${attempt} failed:`, error);
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    throw lastError || new Error('Failed to create connection');
  }

  protected async createRawConnection(): Promise<unknown> {
    throw new Error('createRawConnection must be implemented by database-specific class');
  }

   
  protected async executeQuery(_connection: unknown, _query: string, _params: unknown[]): Promise<unknown> {
    throw new Error('executeQuery must be implemented by database-specific class');
  }

   
  protected async setQueryTimeout(_connection: unknown, _timeout: number): Promise<void> {}

  private destroyConnection(pooled: PooledConnection): void {
    try {
      if (pooled.connection && typeof pooled.connection.end === 'function') {
        pooled.connection.end();
      }
    } catch (error) {
      logger.error('Error closing connection:', error);
    }

    this.poolManager.removeConnection(pooled);
    this.emit('disconnect', pooled.connection);

    if (!this.poolManager.shuttingDown && this.poolManager.connectionCount < this.config.minConnections) {
      this.createConnection().catch(err => {
        logger.error('Failed to create replacement connection:', err);
      });
    }
  }

  private evictIdleConnections(): void {
    this.poolManager.evictIdleConnections((p) => this.destroyConnection(p));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats(): ConnectionStats {
    return this.poolManager.getStats();
  }

  getPoolInfo() {
    return this.poolManager.getPoolInfo();
  }

  async drain(): Promise<void> {
    logger.info('Draining connection pool...');
    this.poolManager.setShuttingDown(true);
    this.poolManager.stopEvictionTimer();
    this.poolManager.rejectWaitingClients();

    const timeout = Date.now() + 30000;
    while (this.poolManager.activeCount > 0 && Date.now() < timeout) {
      await this.delay(100);
    }

    for (const pooled of this.poolManager.getAllConnections()) {
      this.destroyConnection(pooled);
    }

    logger.info('Connection pool drained');
    this.emit('drain');
  }
}

export class PostgreSQLConnectionPool extends ConnectionPool {
  private factory: PostgreSQLConnectionFactory;
  private executor: PostgreSQLQueryExecutor;

  constructor(config: PoolConfig) {
    super(config);
    this.factory = new PostgreSQLConnectionFactory(this.config);
    this.executor = new PostgreSQLQueryExecutor();
  }

  async isDriverAvailable(): Promise<boolean> {
    return this.factory.isDriverAvailable();
  }

  protected async createRawConnection(): Promise<PgClient> {
    return this.factory.createConnection((err) => {
      logger.error('PostgreSQL client error:', err);
      this.emit('error', err);
    });
  }

  protected async executeQuery(connection: unknown, query: string, params: unknown[]): Promise<unknown[]> {
    return this.executor.executeQuery(connection, query, params);
  }

  protected async setQueryTimeout(connection: unknown, timeout: number): Promise<void> {
    return this.executor.setQueryTimeout(connection, timeout);
  }

  async executeQueryWithMetadata(query: string, params: unknown[] = []): Promise<{ rows: unknown[]; rowCount: number }> {
    const connection = await this.acquire();
    try {
      return await this.executor.executeQueryWithMetadata(connection, query, params);
    } finally {
      this.release(connection);
    }
  }

  async executeTransaction<T>(callback: (client: PgClient) => Promise<T>): Promise<T> {
    const connection = await this.acquire();
    const client = connection as PgClient;

    try {
      await this.executor.beginTransaction(connection);
      const result = await callback(client);
      await this.executor.commit(connection);
      return result;
    } catch (error) {
      await this.executor.rollback(connection);
      throw error;
    } finally {
      this.release(connection);
    }
  }
}

export class MySQLConnectionPool extends ConnectionPool {
  private factory: MySQLConnectionFactory;
  private executor: MySQLQueryExecutor;

  constructor(config: PoolConfig) {
    super(config);
    this.factory = new MySQLConnectionFactory(this.config);
    this.executor = new MySQLQueryExecutor();
  }

  async isDriverAvailable(): Promise<boolean> {
    return this.factory.isDriverAvailable();
  }

  protected async createRawConnection(): Promise<MySQLConnection> {
    return this.factory.createConnection((err) => {
      logger.error('MySQL connection error:', err);
      this.emit('error', err);
    });
  }

  protected async executeQuery(connection: unknown, query: string, params: unknown[]): Promise<unknown[]> {
    return this.executor.executeQuery(connection, query, params);
  }

  protected async setQueryTimeout(connection: unknown, timeout: number): Promise<void> {
    return this.executor.setQueryTimeout(connection, timeout);
  }

  async executeQueryRaw(query: string, params: unknown[] = []): Promise<unknown[]> {
    const connection = await this.acquire();
    try {
      return await this.executor.executeQueryRaw(connection, query, params);
    } finally {
      this.release(connection);
    }
  }

  async executeTransaction<T>(callback: (connection: MySQLConnection) => Promise<T>): Promise<T> {
    const connection = await this.acquire();
    const mysqlConn = connection as MySQLConnection;

    try {
      await this.executor.beginTransaction(connection);
      const result = await callback(mysqlConn);
      await this.executor.commit(connection);
      return result;
    } catch (error) {
      await this.executor.rollback(connection);
      throw error;
    } finally {
      this.release(connection);
    }
  }

  async ping(): Promise<boolean> {
    const connection = await this.acquire();
    try {
      return await this.executor.ping(connection);
    } finally {
      this.release(connection);
    }
  }
}

export async function createConnectionPool(
  type: 'postgresql' | 'mysql',
  config: PoolConfig
): Promise<ConnectionPool> {
  if (type === 'postgresql') {
    const pool = new PostgreSQLConnectionPool(config);
    const available = await pool.isDriverAvailable();
    if (!available) {
      logger.warn('PostgreSQL driver not available. Install with: npm install pg @types/pg');
    }
    return pool;
  } else if (type === 'mysql') {
    const pool = new MySQLConnectionPool(config);
    const available = await pool.isDriverAvailable();
    if (!available) {
      logger.warn('MySQL driver not available. Install with: npm install mysql2');
    }
    return pool;
  }

  throw new Error(`Unsupported database type: ${type}`);
}
