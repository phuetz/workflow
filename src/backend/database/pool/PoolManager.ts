/**
 * Pool Manager
 * Manages connection pool lifecycle and state
 */

import { logger } from '../../../services/SimpleLogger';
import type { PoolConfig, PooledConnection, ConnectionStats, WaitingClient } from './types';

export class PoolManager {
  protected connections: Map<string, PooledConnection> = new Map();
  protected waitingClients: WaitingClient[] = [];
  protected stats: ConnectionStats = {
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

  constructor(protected config: PoolConfig) {}

  /**
   * Start eviction timer
   */
  startEvictionTimer(evictCallback: () => void): void {
    this.evictionInterval = setInterval(() => {
      evictCallback();
    }, this.config.evictionRunInterval);
  }

  /**
   * Evict idle connections
   */
  evictIdleConnections(destroyCallback: (pooled: PooledConnection) => void): void {
    const now = Date.now();
    const connectionsToEvict: PooledConnection[] = [];

    for (const [, pooled] of this.connections) {
      if (!pooled.inUse &&
        this.connections.size > this.config.minConnections &&
        now - pooled.lastUsed > this.config.idleTimeout) {
        connectionsToEvict.push(pooled);
      }
    }

    for (const pooled of connectionsToEvict) {
      logger.debug(`Evicting idle connection ${pooled.id}`);
      destroyCallback(pooled);
    }

    if (connectionsToEvict.length > 0) {
      logger.info(`Evicted ${connectionsToEvict.length} idle connections`);
    }
  }

  /**
   * Get an idle connection from the pool
   */
  getIdleConnection(isValidCallback: (pooled: PooledConnection) => boolean): PooledConnection | null {
    for (const [, pooled] of this.connections) {
      if (!pooled.inUse && isValidCallback(pooled)) {
        return pooled;
      }
    }
    return null;
  }

  /**
   * Mark connection as active
   */
  markConnectionActive(pooled: PooledConnection): void {
    pooled.inUse = true;
    pooled.lastUsed = Date.now();
    this.stats.active++;
    this.stats.idle--;
  }

  /**
   * Add a new connection to the pool
   */
  addConnection(pooled: PooledConnection): void {
    this.connections.set(pooled.id, pooled);
    this.stats.total++;
    this.stats.idle++;
    this.stats.created++;
  }

  /**
   * Remove a connection from the pool
   */
  removeConnection(pooled: PooledConnection): void {
    this.connections.delete(pooled.id);

    if (pooled.inUse) {
      this.stats.active--;
    } else {
      this.stats.idle--;
    }

    this.stats.total--;
    this.stats.destroyed++;
  }

  /**
   * Find pooled connection by raw connection
   */
  findPooledConnection(connection: unknown): PooledConnection | null {
    for (const [, pooled] of this.connections) {
      if (pooled.connection === connection) {
        return pooled;
      }
    }
    return null;
  }

  /**
   * Wait for an available connection
   */
  waitForConnection(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingClients.findIndex(
          (c) => c.timeout === timeout
        );
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
  processWaitingClients(isValidCallback: (pooled: PooledConnection) => boolean): void {
    while (this.waitingClients.length > 0) {
      const idleConnection = this.getIdleConnection(isValidCallback);
      if (!idleConnection) break;

      const client = this.waitingClients.shift()!;
      this.stats.waiting--;

      clearTimeout(client.timeout);
      this.markConnectionActive(idleConnection);
      client.resolve(idleConnection.connection);

      const waitTime = Date.now() - client.startTime;
      logger.debug(`Client waited ${waitTime}ms for connection`);
    }
  }

  /**
   * Generate unique connection ID
   */
  generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    const now = Date.now();
    const connections = Array.from(this.connections.values()).map((pooled) => ({
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
   * Check if pool is shutting down
   */
  get shuttingDown(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Set shutting down flag
   */
  setShuttingDown(value: boolean): void {
    this.isShuttingDown = value;
  }

  /**
   * Stop eviction timer
   */
  stopEvictionTimer(): void {
    if (this.evictionInterval) {
      clearInterval(this.evictionInterval);
    }
  }

  /**
   * Reject all waiting clients
   */
  rejectWaitingClients(): void {
    for (const client of this.waitingClients) {
      clearTimeout(client.timeout);
      client.reject(new Error('Connection pool is shutting down'));
    }
    this.waitingClients = [];
    this.stats.waiting = 0;
  }

  /**
   * Get connection count
   */
  get connectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get all connections
   */
  getAllConnections(): PooledConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Increment error count
   */
  incrementErrors(): void {
    this.stats.errors++;
  }

  /**
   * Get active connection count
   */
  get activeCount(): number {
    return this.stats.active;
  }

  /**
   * Update idle stats on release
   */
  markConnectionIdle(pooled: PooledConnection): void {
    pooled.inUse = false;
    pooled.lastUsed = Date.now();
    this.stats.active--;
    this.stats.idle++;
  }
}
