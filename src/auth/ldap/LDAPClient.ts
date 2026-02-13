/**
 * LDAP Client with Connection Pooling
 * Manages LDAP connections with automatic reconnection and pooling
 */

import ldap, { Client, SearchOptions, SearchCallbackResponse, SearchEntry, Control } from 'ldapjs';
import { EventEmitter } from 'events';
import {
  LDAPConfig,
  LDAPSearchOptions,
  LDAPSearchResult,
  LDAPConnectionStats,
  LDAPErrorCode,
  LDAPConnectionPool,
} from '../../types/ldap';
import { logger } from '../../services/SimpleLogger';

interface PooledConnection {
  client: Client;
  id: string;
  active: boolean;
  lastUsed: Date;
  createdAt: Date;
  requestCount: number;
}

export class LDAPClient extends EventEmitter {
  private config: LDAPConfig;
  private connectionPool: PooledConnection[] = [];
  private stats: LDAPConnectionStats;
  private initialized: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private waitingQueueCount: number = 0;

  constructor(config: LDAPConfig) {
    super();
    this.config = config;
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      failedConnections: 0,
      reconnections: 0,
      averageResponseTime: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
    };
  }

  /**
   * Initialize connection pool
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('LDAP client already initialized');
      return;
    }

    logger.info('Initializing LDAP connection pool', {
      url: this.config.url,
      poolSize: this.config.poolSize || 5,
    });

    const poolSize = this.config.poolSize || 5;

    // Create initial connections
    for (let i = 0; i < poolSize; i++) {
      try {
        await this.createConnection();
      } catch (error) {
        logger.error(`Failed to create connection ${i + 1}/${poolSize}`, { error });
      }
    }

    if (this.connectionPool.length === 0) {
      throw new Error('Failed to create any LDAP connections');
    }

    this.initialized = true;
    this.emit('connect');

    logger.info('LDAP connection pool initialized', {
      totalConnections: this.connectionPool.length,
      poolSize,
    });

    // Start pool maintenance
    this.startPoolMaintenance();
  }

  /**
   * Create a new connection
   */
  private async createConnection(): Promise<PooledConnection> {
    return new Promise((resolve, reject) => {
      const clientId = `ldap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const clientOptions: any = {
        url: this.config.url,
        timeout: this.config.timeout || 5000,
        connectTimeout: this.config.connectTimeout || 10000,
        idleTimeout: this.config.idleTimeout || 300000,
        reconnect: this.config.reconnect !== false,
      };

      // Add TLS options if using LDAPS
      if (this.config.url.startsWith('ldaps://') && this.config.tlsOptions) {
        clientOptions.tlsOptions = this.config.tlsOptions;
      }

      const client = ldap.createClient(clientOptions);

      const connection: PooledConnection = {
        client,
        id: clientId,
        active: false,
        lastUsed: new Date(),
        createdAt: new Date(),
        requestCount: 0,
      };

      // Handle connection events
      client.on('connect', () => {
        logger.debug('LDAP connection established', { id: clientId });
        this.stats.totalConnections++;
        this.connectionPool.push(connection);
        resolve(connection);
      });

      client.on('error', (error: Error) => {
        logger.error('LDAP connection error', { id: clientId, error: error.message });
        this.stats.failedConnections++;
        this.emit('error', error);
        reject(error);
      });

      client.on('timeout', () => {
        logger.warn('LDAP connection timeout', { id: clientId });
        this.emit('timeout');
      });

      client.on('close', () => {
        logger.debug('LDAP connection closed', { id: clientId });
        this.removeConnection(clientId);
        this.emit('disconnect');

        // Try to reconnect if enabled
        if (this.config.reconnect !== false && this.initialized) {
          this.scheduleReconnect();
        }
      });

      // Bind with service account
      this.bindConnection(client)
        .then(() => {
          logger.debug('LDAP service account bind successful', { id: clientId });
        })
        .catch((error) => {
          logger.error('LDAP service account bind failed', { id: clientId, error });
          client.destroy();
          reject(error);
        });
    });
  }

  /**
   * Bind connection with service account credentials
   */
  private async bindConnection(client: Client): Promise<void> {
    return new Promise((resolve, reject) => {
      client.bind(this.config.bindDN, this.config.bindPassword, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get an available connection from the pool
   */
  private async getConnection(): Promise<PooledConnection> {
    // Find an idle connection
    const idleConnection = this.connectionPool.find((conn) => !conn.active);

    if (idleConnection) {
      idleConnection.active = true;
      idleConnection.lastUsed = new Date();
      this.updateStats();
      return idleConnection;
    }

    // No idle connections, wait or create new one
    if (this.connectionPool.length < (this.config.poolSize || 5)) {
      logger.debug('Creating new connection (pool not full)');
      const newConnection = await this.createConnection();
      newConnection.active = true;
      this.updateStats();
      return newConnection;
    }

    // Wait for a connection to become available
    logger.debug('Waiting for available connection');
    this.waitingQueueCount++;

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const available = this.connectionPool.find((conn) => !conn.active);
        if (available) {
          clearInterval(checkInterval);
          this.waitingQueueCount--;
          available.active = true;
          available.lastUsed = new Date();
          this.updateStats();
          resolve(available);
        }
      }, 100);
    });
  }

  /**
   * Release a connection back to the pool
   */
  private releaseConnection(connectionId: string): void {
    const connection = this.connectionPool.find((conn) => conn.id === connectionId);
    if (connection) {
      connection.active = false;
      connection.lastUsed = new Date();
      this.updateStats();
    }
  }

  /**
   * Remove a connection from the pool
   */
  private removeConnection(connectionId: string): void {
    const index = this.connectionPool.findIndex((conn) => conn.id === connectionId);
    if (index !== -1) {
      this.connectionPool.splice(index, 1);
      this.updateStats();
    }
  }

  /**
   * Authenticate user with LDAP
   */
  async authenticate(username: string, password: string): Promise<boolean> {
    const startTime = Date.now();

    try {
      // Build user DN from search filter
      const userDN = await this.findUserDN(username);

      if (!userDN) {
        logger.info('User not found in LDAP', { username });
        this.stats.failedRequests++;
        return false;
      }

      // Try to bind with user credentials
      const authenticated = await this.bindUser(userDN, password);

      const duration = Date.now() - startTime;
      this.updateAverageResponseTime(duration);

      if (authenticated) {
        this.stats.successfulRequests++;
        logger.info('LDAP authentication successful', { username, duration });
      } else {
        this.stats.failedRequests++;
        logger.info('LDAP authentication failed', { username, duration });
      }

      return authenticated;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateAverageResponseTime(duration);
      this.stats.failedRequests++;
      logger.error('LDAP authentication error', {
        username,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });
      return false;
    }
  }

  /**
   * Find user DN by username
   */
  private async findUserDN(username: string): Promise<string | null> {
    const filter = this.config.searchFilter!.replace('{{username}}', username);
    const searchOptions: SearchOptions = {
      filter,
      scope: this.config.searchScope || 'sub',
      attributes: ['dn'],
      sizeLimit: 1,
    };

    const results = await this.search(this.config.baseDN, searchOptions);

    if (results.entries.length === 0) {
      return null;
    }

    return results.entries[0].dn;
  }

  /**
   * Bind with user credentials
   */
  private async bindUser(userDN: string, password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const client = ldap.createClient({
        url: this.config.url,
        timeout: this.config.timeout || 5000,
        tlsOptions: this.config.url.startsWith('ldaps://') ? this.config.tlsOptions : undefined,
      });

      client.bind(userDN, password, (error) => {
        if (error) {
          if (error.message.includes('Invalid Credentials')) {
            resolve(false);
          } else {
            reject(error);
          }
        } else {
          resolve(true);
        }
        client.unbind();
      });
    });
  }

  /**
   * Search LDAP directory
   */
  async search(baseDN: string, options: SearchOptions): Promise<LDAPSearchResult> {
    const connection = await this.getConnection();
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const entries: any[] = [];
      const referrals: string[] = [];

      connection.client.search(baseDN, options, (error, res: SearchCallbackResponse) => {
        if (error) {
          this.releaseConnection(connection.id);
          this.stats.failedRequests++;
          reject(error);
          return;
        }

        res.on('searchEntry', (entry: SearchEntry) => {
          entries.push({
            dn: entry.objectName,
            ...entry.pojo.attributes.reduce((acc: any, attr: any) => {
              acc[attr.type] = attr.values.length === 1 ? attr.values[0] : attr.values;
              return acc;
            }, {}),
          });
        });

        res.on('searchReference', (referral: any) => {
          referrals.push(referral.uris.join(','));
        });

        res.on('error', (err: Error) => {
          this.releaseConnection(connection.id);
          this.stats.failedRequests++;
          reject(err);
        });

        res.on('end', (result: any) => {
          const duration = Date.now() - startTime;
          this.updateAverageResponseTime(duration);
          this.releaseConnection(connection.id);
          connection.requestCount++;
          this.stats.totalRequests++;
          this.stats.successfulRequests++;

          logger.debug('LDAP search completed', {
            baseDN,
            filter: options.filter,
            entries: entries.length,
            duration,
          });

          resolve({ entries, referrals: referrals.length > 0 ? referrals : undefined });
        });
      });
    });
  }

  /**
   * Get user by DN
   */
  async getUserByDN(dn: string, attributes?: string[]): Promise<any | null> {
    const options: SearchOptions = {
      filter: '(objectClass=*)',
      scope: 'base',
      attributes: attributes || [],
    };

    try {
      const results = await this.search(dn, options);
      return results.entries.length > 0 ? results.entries[0] : null;
    } catch (error) {
      logger.error('Failed to get user by DN', { dn, error });
      return null;
    }
  }

  /**
   * Get groups for user
   */
  async getUserGroups(userDN: string): Promise<string[]> {
    try {
      const user = await this.getUserByDN(userDN, [this.config.userAttributes?.memberOf || 'memberOf']);

      if (!user) return [];

      const memberOf = user[this.config.userAttributes?.memberOf || 'memberOf'];

      if (!memberOf) return [];

      return Array.isArray(memberOf) ? memberOf : [memberOf];
    } catch (error) {
      logger.error('Failed to get user groups', { userDN, error });
      return [];
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<{ success: boolean; latency: number; error?: string }> {
    const startTime = Date.now();

    try {
      await this.search(this.config.baseDN, {
        filter: '(objectClass=*)',
        scope: 'base',
        attributes: ['dn'],
        sizeLimit: 1,
      });

      const latency = Date.now() - startTime;
      return { success: true, latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        success: false,
        latency,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get pool status
   */
  getPoolStatus(): LDAPConnectionPool {
    const active = this.connectionPool.filter((conn) => conn.active).length;
    const idle = this.connectionPool.length - active;

    return {
      size: this.connectionPool.length,
      active,
      idle,
      waiting: this.waitingQueueCount,
    };
  }

  /**
   * Get connection statistics
   */
  getStats(): LDAPConnectionStats {
    return { ...this.stats };
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.activeConnections = this.connectionPool.filter((conn) => conn.active).length;
    this.stats.idleConnections = this.connectionPool.length - this.stats.activeConnections;
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(duration: number): void {
    const totalTime = this.stats.averageResponseTime * this.stats.totalRequests;
    this.stats.totalRequests++;
    this.stats.averageResponseTime = (totalTime + duration) / this.stats.totalRequests;
  }

  /**
   * Start pool maintenance (cleanup idle connections)
   */
  private startPoolMaintenance(): void {
    const maintenanceInterval = setInterval(() => {
      const now = Date.now();
      const maxIdleTime = this.config.poolMaxIdleTime || 300000; // 5 minutes

      // Remove idle connections that exceeded max idle time
      this.connectionPool = this.connectionPool.filter((conn) => {
        if (!conn.active && now - conn.lastUsed.getTime() > maxIdleTime) {
          logger.debug('Removing idle connection', { id: conn.id });
          conn.client.unbind();
          return false;
        }
        return true;
      });

      // Ensure minimum pool size
      const minPoolSize = Math.min(2, this.config.poolSize || 5);
      while (this.connectionPool.length < minPoolSize) {
        this.createConnection().catch((error) => {
          logger.error('Failed to maintain minimum pool size', { error });
        });
      }
    }, 60000); // Run every minute

    // Store for cleanup
    this.reconnectTimer = maintenanceInterval;
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    logger.info('Scheduling LDAP reconnection');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.stats.reconnections++;

      this.createConnection()
        .then(() => {
          logger.info('LDAP reconnection successful');
          this.emit('reconnect');
        })
        .catch((error) => {
          logger.error('LDAP reconnection failed', { error });
          this.scheduleReconnect(); // Try again
        });
    }, 5000); // Wait 5 seconds before reconnecting
  }

  /**
   * Destroy all connections and cleanup
   */
  async destroy(): Promise<void> {
    logger.info('Destroying LDAP client');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Close all connections
    for (const connection of this.connectionPool) {
      try {
        connection.client.unbind();
      } catch (error) {
        logger.error('Error unbinding connection', { id: connection.id, error });
      }
    }

    this.connectionPool = [];
    this.initialized = false;

    this.emit('disconnect');
    logger.info('LDAP client destroyed');
  }
}
