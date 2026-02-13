/**
 * Connection Factory
 * Database-specific connection creation
 */

import { logger } from '../../../services/SimpleLogger';
import type { PoolConfig, PgClient, PgModule, MySQLConnection, MySQLModule } from './types';

// Lazy-loaded pg module
let pgModule: PgModule | null = null;
let pgLoadAttempted = false;
let pgLoadError: Error | null = null;

// Lazy-loaded mysql2 module
let mysqlModule: MySQLModule | null = null;
let mysqlLoadAttempted = false;
let mysqlLoadError: Error | null = null;

/**
 * Attempt to load the pg module
 */
export async function loadPgModule(): Promise<PgModule> {
  if (pgLoadAttempted) {
    if (pgLoadError) throw pgLoadError;
    if (pgModule) return pgModule;
  }

  pgLoadAttempted = true;

  try {
    pgModule = await (import('pg' /* @vite-ignore */) as Promise<any>) as PgModule;
    return pgModule;
  } catch {
    pgLoadError = new Error(
      'PostgreSQL driver (pg) is not installed. Please install it with: npm install pg @types/pg'
    );
    throw pgLoadError;
  }
}

/**
 * Attempt to load the mysql2 module
 */
export async function loadMySQLModule(): Promise<MySQLModule> {
  if (mysqlLoadAttempted) {
    if (mysqlLoadError) throw mysqlLoadError;
    if (mysqlModule) return mysqlModule;
  }

  mysqlLoadAttempted = true;

  try {
    mysqlModule = await (import('mysql2/promise' /* @vite-ignore */) as Promise<any>) as MySQLModule;
    return mysqlModule;
  } catch {
    mysqlLoadError = new Error(
      'MySQL driver (mysql2) is not installed. Please install it with: npm install mysql2'
    );
    throw mysqlLoadError;
  }
}

/**
 * PostgreSQL Connection Factory
 */
export class PostgreSQLConnectionFactory {
  private pgClient: PgModule | null = null;

  constructor(private config: PoolConfig) {}

  async ensureDriver(): Promise<void> {
    if (!this.pgClient) {
      this.pgClient = await loadPgModule();
    }
  }

  async isDriverAvailable(): Promise<boolean> {
    try {
      await this.ensureDriver();
      return true;
    } catch {
      return false;
    }
  }

  async createConnection(errorHandler: (err: unknown) => void): Promise<PgClient> {
    await this.ensureDriver();

    if (!this.pgClient) {
      throw new Error('PostgreSQL driver not available');
    }

    const sslConfig = this.config.ssl?.enabled
      ? {
          rejectUnauthorized: this.config.ssl.rejectUnauthorized ?? true,
          ca: this.config.ssl.ca,
          cert: this.config.ssl.cert,
          key: this.config.ssl.key,
        }
      : undefined;

    const client = new this.pgClient.Client({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: sslConfig,
    });

    client.on('error', errorHandler);
    await client.connect();

    logger.debug('PostgreSQL connection established', {
      host: this.config.host,
      database: this.config.database,
    });

    return client;
  }
}

/**
 * MySQL Connection Factory
 */
export class MySQLConnectionFactory {
  private mysqlClient: MySQLModule | null = null;

  constructor(private config: PoolConfig) {}

  async ensureDriver(): Promise<void> {
    if (!this.mysqlClient) {
      this.mysqlClient = await loadMySQLModule();
    }
  }

  async isDriverAvailable(): Promise<boolean> {
    try {
      await this.ensureDriver();
      return true;
    } catch {
      return false;
    }
  }

  async createConnection(errorHandler: (err: unknown) => void): Promise<MySQLConnection> {
    await this.ensureDriver();

    if (!this.mysqlClient) {
      throw new Error('MySQL driver not available');
    }

    const sslConfig = this.config.ssl?.enabled
      ? {
          rejectUnauthorized: this.config.ssl.rejectUnauthorized ?? true,
          ca: this.config.ssl.ca,
          cert: this.config.ssl.cert,
          key: this.config.ssl.key,
        }
      : undefined;

    const connection = await this.mysqlClient.createConnection({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: sslConfig,
      connectTimeout: this.config.connectionTimeout,
    });

    connection.on('error', errorHandler);

    logger.debug('MySQL connection established', {
      host: this.config.host,
      database: this.config.database,
    });

    return connection;
  }
}
