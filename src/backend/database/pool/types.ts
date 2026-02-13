/**
 * Database Connection Pool Types
 * Type definitions for connection pooling
 */

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

export interface PooledConnection {
  id: string;
  connection: unknown & { end?: () => void };
  inUse: boolean;
  lastUsed: number;
  created: number;
  queryCount: number;
  errorCount: number;
}

export interface WaitingClient {
  resolve: (connection: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  startTime: number;
}

export interface ConnectionInfo {
  id: string;
  inUse: boolean;
  age: number;
  idleTime: number;
  queryCount: number;
  errorRate: number;
}

export interface PoolInfo {
  stats: ConnectionStats;
  connections: ConnectionInfo[];
}

/**
 * PostgreSQL client type definitions
 */
export interface PgClient {
  connect(): Promise<void>;
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number }>;
  end(): Promise<void>;
  on(event: string, listener: (...args: unknown[]) => void): void;
}

export interface PgModule {
  Client: new (config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: {
      rejectUnauthorized?: boolean;
      ca?: string;
      cert?: string;
      key?: string;
    } | boolean;
  }) => PgClient;
}

/**
 * MySQL connection type definitions
 */
export interface MySQLConnection {
  execute(sql: string, values?: unknown[]): Promise<[unknown[], unknown]>;
  query(sql: string, values?: unknown[]): Promise<[unknown[], unknown]>;
  end(): Promise<void>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  ping(): Promise<void>;
  on(event: string, listener: (...args: unknown[]) => void): void;
}

export interface MySQLModule {
  createConnection(config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: {
      rejectUnauthorized?: boolean;
      ca?: string;
      cert?: string;
      key?: string;
    };
    connectTimeout?: number;
  }): Promise<MySQLConnection>;
}
