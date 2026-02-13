/**
 * Database Connection Pool Manager
 * Manages database connections efficiently with pooling
 */

import { logger } from '../../services/LoggingService';
import { EventEmitter } from 'events';

export interface PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  
  // Pool configuration
  minConnections: number;
  maxConnections: number;
  connectionTimeout: number; // milliseconds
  idleTimeout: number; // milliseconds
  maxWaitingClients: number;
  evictionRunInterval: number; // milliseconds
  
  // Connection retry
  retryAttempts: number;
  retryDelay: number; // milliseconds
  
  // SSL configuration
  ssl?: {
    enabled: boolean;
    ca?: string;
    cert?: string;
    key?: string;
    rejectUnauthorized?: boolean;
  };
}

export interface ConnectionStats {
  total: number;
  active: number;
  idle: number;
  waiting: number;
  created: number;
  destroyed: number;
  errors: number;
}

interface PooledConnection {
  id: string;
  connection: unknown;
  inUse: boolean;
  lastUsed: number;
  created: number;
  queryCount: number;
  errorCount: number;
}

interface WaitingClient {
  resolve: (connection: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  startTime: number;
}

export class ConnectionPool extends EventEmitter {
  private config: PoolConfig;
  private connections: Map<string, PooledConnection> = new Map();
  private waitingClients: WaitingClient[] = [];
  private stats: ConnectionStats = {
    total: 0,
    active: 0,
    idle: 0,
    waiting: 0,
    created: 0,
    destroyed: 0,
    errors: 0
  };
  private evictionInterval: NodeJS.Timeout | null = null;
  private isShuttingDown: boolean = false;

  constructor(config: PoolConfig) {
    super();
    this.config = this.validateConfig(config);
    this.initialize();
  }

  /**
   * Validate and set default configuration
   */
  private validateConfig(config: PoolConfig): PoolConfig {
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

  /**
   * Initialize the connection pool
   */
  private async initialize(): Promise<void> {
    try {
      // Create minimum connections
      for (let __i = 0; i < this.config.minConnections; i++) {
        await this.createConnection();
      }

      // Start eviction timer
      this.startEvictionTimer();

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

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<unknown> {
    if (this.isShuttingDown) {
      throw new Error('Connection pool is shutting down');
    }

    // Try to get an idle connection
    if (idleConnection) {
      this.markConnectionActive(idleConnection);
      return idleConnection.connection;
    }

    // Create new connection if under limit
    if (this.connections.size < this.config.maxConnections) {
      try {
        this.markConnectionActive(pooled);
        return pooled.connection;
      } catch (error) {
        logger.error('Failed to create new connection:', error);
        this.stats.errors++;
        throw error;
      }
    }

    // Wait for available connection
    if (this.waitingClients.length >= this.config.maxWaitingClients) {
      throw new Error('Too many clients waiting for connection');
    }

    return this.waitForConnection();
  }

  /**
   * Release a connection back to the pool
   */
  release(connection: unknown): void {
    if (!pooled) {
      logger.warn('Attempted to release unknown connection');
      return;
    }

    // Check if connection is still valid
    if (!this.isConnectionValid(pooled)) {
      this.destroyConnection(pooled);
      this.processWaitingClients();
      return;
    }

    // Mark as idle
    pooled.inUse = false;
    pooled.lastUsed = Date.now();
    this.stats.active--;
    this.stats.idle++;

    // Process waiting clients
    this.processWaitingClients();

    this.emit('release', connection);
  }

  /**
   * Execute a query with automatic connection management
   */
  async execute<T>(
    query: string,
    params: unknown[] = [],
    options: { timeout?: number } = {}
  ): Promise<T> {

    try {
      // Set query timeout if specified
      if (options.timeout) {
        await this.setQueryTimeout(connection, options.timeout);
      }

      // Execute query
      
      // Update statistics
      if (pooled) {
        pooled.queryCount++;
      }

      return result;
    } catch (error) {
      // Update error statistics
      if (pooled) {
        pooled.errorCount++;
      }

      throw error;
    } finally {
      this.release(connection);
    }
  }

  /**
   * Get an idle connection from the pool
   */
  private getIdleConnection(): PooledConnection | null {
    for (const [, pooled] of this.connections) {
      if (!pooled.inUse && this.isConnectionValid(pooled)) {
        return pooled;
      }
    }
    return null;
  }

  /**
   * Create a new connection
   */
  private async createConnection(): Promise<{ id: string }> {
    let lastError: Error | null = null;

    for (let __attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        
        const pooled: PooledConnection = {
          id,
          connection,
          inUse: false,
          lastUsed: Date.now(),
          created: Date.now(),
          queryCount: 0,
          errorCount: 0
        };

        this.connections.set(id, pooled);
        this.stats.total++;
        this.stats.idle++;
        this.stats.created++;

        this.emit('connect', connection);
        
        return { id };
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

  /**
   * Create raw database connection (to be implemented by specific database)
   */
  private async createRawConnection(): Promise<unknown> {
    // This would be implemented by specific database drivers
    // For example, PostgreSQL:
    // const { _Client } = require('pg');
    // const _client = new Client(this.config);
    // await client.connect();
    // return client;

    throw new Error('createRawConnection must be implemented by database-specific class');
  }

  /**
   * Execute query on connection (to be implemented by specific database)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async executeQuery(connection: unknown, query: string, params: unknown[]): Promise<unknown> {
    // This would be implemented by specific database drivers
    throw new Error('executeQuery must be implemented by database-specific class');
  }

  /**
   * Set query timeout (to be implemented by specific database)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async setQueryTimeout(connection: unknown, timeout: number): Promise<void> {
    // This would be implemented by specific database drivers
    // For example, PostgreSQL: await connection.query(`SET statement_timeout = ${timeout}`);
  }

  /**
   * Mark connection as active
   */
  private markConnectionActive(pooled: PooledConnection): void {
    pooled.inUse = true;
    pooled.lastUsed = Date.now();
    this.stats.active++;
    this.stats.idle--;
  }

  /**
   * Wait for an available connection
   */
  private waitForConnection(): Promise<unknown> {
    return new Promise((resolve, reject) => {
        if (index !== -1) {
          this.waitingClients.splice(index, 1);
          this.stats.waiting--;
        }
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);

      const waitingClient: WaitingClient = {
        resolve,
        reject,
        timeout,
        startTime: Date.now()
      };

      this.waitingClients.push(waitingClient);
      this.stats.waiting++;
    });
  }

  /**
   * Process waiting clients when connections become available
   */
  private processWaitingClients(): void {
    while (this.waitingClients.length > 0) {
      if (!idleConnection) break;

      this.stats.waiting--;
      
      clearTimeout(client.timeout);
      this.markConnectionActive(idleConnection);
      client.resolve(idleConnection.connection);

      logger.debug(`Client waited ${waitTime}ms for connection`);
    }
  }

  /**
   * Check if connection is still valid
   */
  private isConnectionValid(pooled: PooledConnection): boolean {
    // Check if connection has been idle too long
    if (Date.now() - pooled.lastUsed > this.config.idleTimeout) {
      return false;
    }

    // Check error rate
    if (pooled.queryCount > 0 && pooled.errorCount / pooled.queryCount > 0.5) {
      return false;
    }

    // Additional health check could be implemented here
    // For example: await connection.query('SELECT 1');

    return true;
  }

  /**
   * Destroy a connection
   */
  private destroyConnection(pooled: PooledConnection): void {
    try {
      // Close the actual database connection
      if (pooled.connection && typeof pooled.connection.end === 'function') {
        pooled.connection.end();
      }
    } catch (error) {
      logger.error('Error closing connection:', error);
    }

    this.connections.delete(pooled.id);
    
    if (pooled.inUse) {
      this.stats.active--;
    } else {
      this.stats.idle--;
    }
    
    this.stats.total--;
    this.stats.destroyed++;

    this.emit('disconnect', pooled.connection);

    // Create replacement connection if needed
    if (!this.isShuttingDown && this.connections.size < this.config.minConnections) {
      this.createConnection().catch(err => {
        logger.error('Failed to create replacement connection:', err);
      });
    }
  }

  /**
   * Find pooled connection by raw connection
   */
  private findPooledConnection(connection: unknown): PooledConnection | null {
    for (const [, pooled] of this.connections) {
      if (pooled.connection === connection) {
        return pooled;
      }
    }
    return null;
  }

  /**
   * Start eviction timer
   */
  private startEvictionTimer(): void {
    this.evictionInterval = setInterval(() => {
      this.evictIdleConnections();
    }, this.config.evictionRunInterval);
  }

  /**
   * Evict idle connections
   */
  private evictIdleConnections(): void {
    const connectionsToEvict: PooledConnection[] = [];

    // Find connections to evict
    for (const [, pooled] of this.connections) {
      if (!pooled.inUse && 
          this.connections.size > this.config.minConnections &&
          now - pooled.lastUsed > this.config.idleTimeout) {
        connectionsToEvict.push(pooled);
      }
    }

    // Evict connections
    for (const pooled of connectionsToEvict) {
      logger.debug(`Evicting idle connection ${pooled.id}`);
      this.destroyConnection(pooled);
    }

    if (connectionsToEvict.length > 0) {
      logger.info(`Evicted ${connectionsToEvict.length} idle connections`);
    }
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get pool statistics
   */
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Get detailed pool information
   */
  getPoolInfo(): {
    stats: ConnectionStats;
    connections: Array<{
      id: string;
      inUse: boolean;
      age: number;
      idleTime: number;
      queryCount: number;
      errorRate: number;
    }>;
  } {
      id: pooled.id,
      inUse: pooled.inUse,
      age: now - pooled.created,
      idleTime: pooled.inUse ? 0 : now - pooled.lastUsed,
      queryCount: pooled.queryCount,
      errorRate: pooled.queryCount > 0 ? pooled.errorCount / pooled.queryCount : 0
    }));

    return {
      stats: this.getStats(),
      connections
    };
  }

  /**
   * Drain the pool (close all connections)
   */
  async drain(): Promise<void> {
    logger.info('Draining connection pool...');
    this.isShuttingDown = true;

    // Stop eviction timer
    if (this.evictionInterval) {
      clearInterval(this.evictionInterval);
    }

    // Reject all waiting clients
    for (const client of this.waitingClients) {
      clearTimeout(client.timeout);
      client.reject(new Error('Connection pool is shutting down'));
    }
    this.waitingClients = [];
    this.stats.waiting = 0;

    // Wait for active connections to be released
    while (this.stats.active > 0 && Date.now() < timeout) {
      await this.delay(100);
    }

    // Force close all connections
    for (const [, pooled] of this.connections) {
      this.destroyConnection(pooled);
    }

    logger.info('Connection pool drained');
    this.emit('drain');
  }
}

/**
 * PostgreSQL-specific connection pool
 */
export class PostgreSQLConnectionPool extends ConnectionPool {
  private pg: unknown; // PostgreSQL client library

  constructor(config: PoolConfig) {
    super(config);
    // In real implementation, would import pg library
    // this.pg = require('pg');
  }

  protected async createRawConnection(): Promise<unknown> {
    // const _client = new this.pg.Client({
    //   host: this.config.host,
    //   port: this.config.port,
    //   database: this.config.database,
    //   user: this.config.user,
    //   password: this.config.password,
    //   ssl: this.config.ssl
    // });
    // await client.connect();
    // return client;
    
    // Placeholder for actual implementation
    return { id: Date.now(), type: 'postgresql' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async executeQuery(connection: unknown, query: string, params: unknown[]): Promise<unknown> {
    // return connection.query(query, params);
    
    // Placeholder for actual implementation
    return { rows: [], rowCount: 0 };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async setQueryTimeout(connection: unknown, timeout: number): Promise<void> {
    // await connection.query(`SET statement_timeout = ${timeout}`);
  }
}

/**
 * MySQL-specific connection pool
 */
export class MySQLConnectionPool extends ConnectionPool {
  private mysql: unknown; // MySQL client library

  constructor(config: PoolConfig) {
    super(config);
    // In real implementation, would import mysql2 library
    // this.mysql = require('mysql2/promise');
  }

  protected async createRawConnection(): Promise<unknown> {
    // const _connection = await this.mysql.createConnection({
    //   host: this.config.host,
    //   port: this.config.port,
    //   database: this.config.database,
    //   user: this.config.user,
    //   password: this.config.password,
    //   ssl: this.config.ssl
    // });
    // return connection;
    
    // Placeholder for actual implementation
    return { id: Date.now(), type: 'mysql' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async executeQuery(connection: unknown, query: string, params: unknown[]): Promise<unknown> {
    // const [rows] = await connection.execute(query, params);
    // return rows;
    
    // Placeholder for actual implementation
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async setQueryTimeout(connection: unknown, timeout: number): Promise<void> {
    // await connection.query(`SET SESSION max_execution_time = ${timeout}`);
  }
}