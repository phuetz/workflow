/**
 * Connection Pool - HTTP and Database connection pooling
 * Reuses connections for improved performance
 */

import http from 'http';
import https from 'https';
import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';
import {
  ConnectionPoolConfig,
  ConnectionPoolMetrics
} from '../../types/taskrunner';

interface HttpConnection {
  id: string;
  agent: http.Agent | https.Agent;
  isSecure: boolean;
  activeRequests: number;
  totalRequests: number;
  createdAt: number;
  lastUsed: number;
}

interface DatabaseConnection {
  id: string;
  connection: unknown; // Actual DB connection object
  inUse: boolean;
  createdAt: number;
  lastUsed: number;
  queriesExecuted: number;
}

export class ConnectionPool extends EventEmitter {
  private config: Required<ConnectionPoolConfig>;

  // HTTP Connection Pool
  private httpAgents: Map<string, http.Agent | https.Agent> = new Map();
  private httpConnections: Map<string, HttpConnection> = new Map();
  private httpMetrics = {
    activeConnections: 0,
    idleConnections: 0,
    totalConnections: 0,
    requestsServed: 0,
    totalResponseTime: 0,
    responseTimes: [] as number[]
  };

  // Database Connection Pool
  private dbConnections: Map<string, DatabaseConnection> = new Map();
  private availableDbConnections: string[] = [];
  private waitingForConnection: Array<(connectionId: string) => void> = [];
  private dbMetrics = {
    activeConnections: 0,
    idleConnections: 0,
    totalConnections: 0,
    queriesExecuted: 0,
    totalQueryTime: 0,
    queryTimes: [] as number[]
  };

  // Cleanup intervals
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    super();

    this.config = {
      http: {
        maxConnections: config.http?.maxConnections || 100,
        keepAlive: config.http?.keepAlive !== false,
        keepAliveTimeout: config.http?.keepAliveTimeout || 30000,
        timeout: config.http?.timeout || 30000,
        maxRedirects: config.http?.maxRedirects || 5
      },
      database: {
        maxConnections: config.database?.maxConnections || 20,
        idleTimeout: config.database?.idleTimeout || 60000,
        connectionTimeout: config.database?.connectionTimeout || 10000,
        enablePreparedStatements: config.database?.enablePreparedStatements !== false
      }
    };

    this.initialize();
  }

  private initialize(): void {
    logger.info('Connection pool initialized', {
      http: {
        maxConnections: this.config.http.maxConnections,
        keepAlive: this.config.http.keepAlive
      },
      database: {
        maxConnections: this.config.database.maxConnections
      }
    });

    // Start cleanup for idle connections
    this.startCleanup();
  }

  // ============================================================================
  // HTTP Connection Pool
  // ============================================================================

  /**
   * Get HTTP/HTTPS agent for a host
   */
  getHttpAgent(url: string): http.Agent | https.Agent {
    const isSecure = url.startsWith('https:');
    const key = this.getHttpPoolKey(url);

    let agent = this.httpAgents.get(key);

    if (!agent) {
      // Create new agent
      const AgentClass = isSecure ? https.Agent : http.Agent;

      agent = new AgentClass({
        keepAlive: this.config.http.keepAlive,
        keepAliveMsecs: this.config.http.keepAliveTimeout,
        maxSockets: this.config.http.maxConnections,
        maxFreeSockets: Math.floor(this.config.http.maxConnections / 2),
        timeout: this.config.http.timeout
      });

      this.httpAgents.set(key, agent);

      // Track connection
      const connection: HttpConnection = {
        id: key,
        agent,
        isSecure,
        activeRequests: 0,
        totalRequests: 0,
        createdAt: Date.now(),
        lastUsed: Date.now()
      };

      this.httpConnections.set(key, connection);
      this.httpMetrics.totalConnections++;

      logger.debug('Created new HTTP agent', { key, isSecure });
    }

    // Update usage
    const connection = this.httpConnections.get(key);
    if (connection) {
      connection.activeRequests++;
      connection.totalRequests++;
      connection.lastUsed = Date.now();
      this.httpMetrics.activeConnections++;
    }

    return agent;
  }

  /**
   * Release HTTP connection
   */
  releaseHttpConnection(url: string, responseTime: number): void {
    const key = this.getHttpPoolKey(url);
    const connection = this.httpConnections.get(key);

    if (connection) {
      connection.activeRequests = Math.max(0, connection.activeRequests - 1);
      this.httpMetrics.activeConnections = Math.max(0, this.httpMetrics.activeConnections - 1);

      // Track metrics
      this.httpMetrics.requestsServed++;
      this.httpMetrics.totalResponseTime += responseTime;
      this.httpMetrics.responseTimes.push(responseTime);

      // Keep last 1000 response times
      if (this.httpMetrics.responseTimes.length > 1000) {
        this.httpMetrics.responseTimes.shift();
      }
    }
  }

  private getHttpPoolKey(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.hostname}:${parsed.port || (parsed.protocol === 'https:' ? '443' : '80')}`;
    } catch {
      return url;
    }
  }

  // ============================================================================
  // Database Connection Pool
  // ============================================================================

  /**
   * Acquire a database connection
   */
  async acquireDbConnection(): Promise<string> {
    // Check if we have available connections
    if (this.availableDbConnections.length > 0) {
      const connectionId = this.availableDbConnections.shift()!;
      const connection = this.dbConnections.get(connectionId);

      if (connection) {
        connection.inUse = true;
        connection.lastUsed = Date.now();
        this.dbMetrics.activeConnections++;
        this.dbMetrics.idleConnections--;

        logger.debug('Acquired existing DB connection', { connectionId });
        return connectionId;
      }
    }

    // Create new connection if under limit
    if (this.dbConnections.size < this.config.database.maxConnections) {
      const connectionId = await this.createDbConnection();
      logger.debug('Created new DB connection', { connectionId });
      return connectionId;
    }

    // Wait for a connection to become available
    logger.debug('Waiting for available DB connection');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingForConnection.indexOf(resolve);
        if (index > -1) {
          this.waitingForConnection.splice(index, 1);
        }
        reject(new Error('Connection acquisition timeout'));
      }, this.config.database.connectionTimeout);

      this.waitingForConnection.push((connectionId: string) => {
        clearTimeout(timeout);
        resolve(connectionId);
      });
    });
  }

  /**
   * Release a database connection
   */
  releaseDbConnection(connectionId: string, queryTime: number): void {
    const connection = this.dbConnections.get(connectionId);

    if (!connection) {
      logger.warn('Attempted to release unknown DB connection', { connectionId });
      return;
    }

    connection.inUse = false;
    connection.lastUsed = Date.now();
    connection.queriesExecuted++;

    this.dbMetrics.activeConnections = Math.max(0, this.dbMetrics.activeConnections - 1);
    this.dbMetrics.idleConnections++;

    // Track metrics
    this.dbMetrics.queriesExecuted++;
    this.dbMetrics.totalQueryTime += queryTime;
    this.dbMetrics.queryTimes.push(queryTime);

    // Keep last 1000 query times
    if (this.dbMetrics.queryTimes.length > 1000) {
      this.dbMetrics.queryTimes.shift();
    }

    // Check if anyone is waiting for a connection
    if (this.waitingForConnection.length > 0) {
      const resolver = this.waitingForConnection.shift()!;
      connection.inUse = true;
      this.dbMetrics.activeConnections++;
      this.dbMetrics.idleConnections--;
      resolver(connectionId);
    } else {
      // Add back to available pool
      this.availableDbConnections.push(connectionId);
    }

    logger.debug('Released DB connection', { connectionId });
  }

  /**
   * Get database connection object
   */
  getDbConnection(connectionId: string): unknown {
    const connection = this.dbConnections.get(connectionId);
    return connection?.connection;
  }

  private async createDbConnection(): Promise<string> {
    const connectionId = `db_conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In a real implementation, this would create an actual DB connection
    // For now, we'll simulate it
    const connection: DatabaseConnection = {
      id: connectionId,
      connection: {}, // Placeholder for actual connection
      inUse: true,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      queriesExecuted: 0
    };

    this.dbConnections.set(connectionId, connection);
    this.dbMetrics.totalConnections++;
    this.dbMetrics.activeConnections++;

    logger.debug('Created DB connection', { connectionId });
    this.emit('db_connection_created', connectionId);

    return connectionId;
  }

  private async closeDbConnection(connectionId: string): Promise<void> {
    const connection = this.dbConnections.get(connectionId);

    if (!connection) {
      logger.warn('Attempted to close unknown DB connection', { connectionId });
      return;
    }

    // In a real implementation, this would close the actual connection
    // connection.connection.close();

    this.dbConnections.delete(connectionId);
    this.dbMetrics.totalConnections--;

    if (connection.inUse) {
      this.dbMetrics.activeConnections--;
    } else {
      this.dbMetrics.idleConnections--;
    }

    // Remove from available pool
    const index = this.availableDbConnections.indexOf(connectionId);
    if (index > -1) {
      this.availableDbConnections.splice(index, 1);
    }

    logger.debug('Closed DB connection', { connectionId });
    this.emit('db_connection_closed', connectionId);
  }

  // ============================================================================
  // Cleanup and Maintenance
  // ============================================================================

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // Every minute
  }

  private cleanupIdleConnections(): void {
    const now = Date.now();
    const idleTimeout = this.config.database.idleTimeout;

    // Clean up idle HTTP agents
    for (const [key, connection] of this.httpConnections.entries()) {
      if (
        connection.activeRequests === 0 &&
        now - connection.lastUsed > idleTimeout
      ) {
        logger.debug('Destroying idle HTTP agent', { key });
        connection.agent.destroy();
        this.httpAgents.delete(key);
        this.httpConnections.delete(key);
        this.httpMetrics.totalConnections--;
      }
    }

    // Clean up idle DB connections
    const toClose: string[] = [];

    for (const [connectionId, connection] of this.dbConnections.entries()) {
      if (
        !connection.inUse &&
        now - connection.lastUsed > idleTimeout &&
        this.dbConnections.size > Math.floor(this.config.database.maxConnections / 2)
      ) {
        toClose.push(connectionId);
      }
    }

    // Close idle connections
    toClose.forEach(connectionId => {
      this.closeDbConnection(connectionId);
    });

    if (toClose.length > 0) {
      logger.info('Cleaned up idle connections', {
        http: 0,
        database: toClose.length
      });
    }

    // Update idle connection count
    this.updateConnectionCounts();
  }

  private updateConnectionCounts(): void {
    // HTTP
    let activeHttp = 0;
    let idleHttp = 0;

    for (const connection of this.httpConnections.values()) {
      if (connection.activeRequests > 0) {
        activeHttp++;
      } else {
        idleHttp++;
      }
    }

    this.httpMetrics.activeConnections = activeHttp;
    this.httpMetrics.idleConnections = idleHttp;

    // Database
    let activeDb = 0;
    let idleDb = 0;

    for (const connection of this.dbConnections.values()) {
      if (connection.inUse) {
        activeDb++;
      } else {
        idleDb++;
      }
    }

    this.dbMetrics.activeConnections = activeDb;
    this.dbMetrics.idleConnections = idleDb;
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  /**
   * Get connection pool metrics
   */
  getMetrics(): ConnectionPoolMetrics {
    this.updateConnectionCounts();

    const avgHttpResponseTime = this.httpMetrics.responseTimes.length > 0
      ? this.httpMetrics.responseTimes.reduce((a, b) => a + b, 0) / this.httpMetrics.responseTimes.length
      : 0;

    const avgDbQueryTime = this.dbMetrics.queryTimes.length > 0
      ? this.dbMetrics.queryTimes.reduce((a, b) => a + b, 0) / this.dbMetrics.queryTimes.length
      : 0;

    return {
      http: {
        activeConnections: this.httpMetrics.activeConnections,
        idleConnections: this.httpMetrics.idleConnections,
        totalConnections: this.httpMetrics.totalConnections,
        requestsServed: this.httpMetrics.requestsServed,
        avgResponseTime: avgHttpResponseTime
      },
      database: {
        activeConnections: this.dbMetrics.activeConnections,
        idleConnections: this.dbMetrics.idleConnections,
        totalConnections: this.dbMetrics.totalConnections,
        queriesExecuted: this.dbMetrics.queriesExecuted,
        avgQueryTime: avgDbQueryTime
      }
    };
  }

  /**
   * Get detailed statistics
   */
  getStats() {
    return {
      http: {
        agents: this.httpAgents.size,
        connections: this.httpConnections.size,
        totalRequests: this.httpMetrics.requestsServed,
        responseTimes: {
          count: this.httpMetrics.responseTimes.length,
          min: Math.min(...this.httpMetrics.responseTimes),
          max: Math.max(...this.httpMetrics.responseTimes),
          avg: this.httpMetrics.responseTimes.reduce((a, b) => a + b, 0) / this.httpMetrics.responseTimes.length
        }
      },
      database: {
        connections: this.dbConnections.size,
        available: this.availableDbConnections.length,
        waiting: this.waitingForConnection.length,
        totalQueries: this.dbMetrics.queriesExecuted,
        queryTimes: {
          count: this.dbMetrics.queryTimes.length,
          min: Math.min(...this.dbMetrics.queryTimes),
          max: Math.max(...this.dbMetrics.queryTimes),
          avg: this.dbMetrics.queryTimes.reduce((a, b) => a + b, 0) / this.dbMetrics.queryTimes.length
        }
      }
    };
  }

  // ============================================================================
  // Shutdown
  // ============================================================================

  /**
   * Shutdown the connection pool
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down connection pool');

    // Stop cleanup
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Destroy all HTTP agents
    for (const [key, agent] of this.httpAgents.entries()) {
      logger.debug('Destroying HTTP agent', { key });
      agent.destroy();
    }

    this.httpAgents.clear();
    this.httpConnections.clear();

    // Close all DB connections
    const closePromises: Promise<void>[] = [];
    for (const connectionId of this.dbConnections.keys()) {
      closePromises.push(this.closeDbConnection(connectionId));
    }

    await Promise.all(closePromises);

    this.removeAllListeners();

    logger.info('Connection pool shutdown complete');
  }
}
