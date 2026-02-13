/**
 * Database Configuration for Production
 * Centralized configuration for connection pooling, query settings, and retry logic
 */

import { logger } from '../../services/SimpleLogger';

export interface DatabasePoolConfig {
  /** Minimum connections to maintain in the pool */
  min: number;
  /** Maximum connections allowed in the pool */
  max: number;
  /** Close idle connections after this duration (milliseconds) */
  idleTimeoutMs: number;
  /** Fail connection acquisition if it takes longer than this (milliseconds) */
  connectionTimeoutMs: number;
}

export interface DatabaseQueryConfig {
  /** Maximum time for a single SQL statement to execute (milliseconds) */
  statementTimeoutMs: number;
  /** Overall query timeout including retries (milliseconds) */
  queryTimeoutMs: number;
}

export interface DatabaseRetryConfig {
  /** Maximum number of retry attempts for failed operations */
  maxRetries: number;
  /** Base delay between retries (milliseconds) - uses exponential backoff */
  baseDelayMs: number;
  /** Maximum delay between retries (milliseconds) */
  maxDelayMs: number;
}

export interface DatabaseHealthConfig {
  /** Interval between health check pings (milliseconds) */
  healthCheckIntervalMs: number;
  /** Timeout for health check queries (milliseconds) */
  healthCheckTimeoutMs: number;
}

export interface DatabaseConfig {
  pool: DatabasePoolConfig;
  query: DatabaseQueryConfig;
  retry: DatabaseRetryConfig;
  health: DatabaseHealthConfig;
}

/**
 * Default database configuration
 * These values are suitable for development and can be overridden per environment
 */
const defaultDatabaseConfig: DatabaseConfig = {
  // Connection pool settings
  pool: {
    min: 2,                     // Minimum connections in pool
    max: 10,                    // Maximum connections in pool
    idleTimeoutMs: 30000,       // Close idle connections after 30s
    connectionTimeoutMs: 10000, // Fail if can't connect within 10s
  },

  // Query settings
  query: {
    statementTimeoutMs: 30000,  // Max query execution time (30s)
    queryTimeoutMs: 60000,      // Overall query timeout including retries (60s)
  },

  // Retry settings
  retry: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
  },

  // Health check settings
  health: {
    healthCheckIntervalMs: 30000,  // Check every 30 seconds
    healthCheckTimeoutMs: 5000,    // 5 second timeout for health checks
  },
};

/**
 * Production-optimized database configuration
 */
const productionOverrides: Partial<DatabaseConfig> = {
  pool: {
    min: 5,                     // Higher minimum for production traffic
    max: 20,                    // More connections for concurrent requests
    idleTimeoutMs: 60000,       // Keep connections alive longer (60s)
    connectionTimeoutMs: 15000, // Slightly longer timeout for production
  },
  query: {
    statementTimeoutMs: 60000,  // Allow longer queries in production (60s)
    queryTimeoutMs: 120000,     // Overall timeout 2 minutes
  },
  retry: {
    maxRetries: 5,              // More retries in production
    baseDelayMs: 500,           // Faster initial retry
    maxDelayMs: 30000,          // But allow longer backoff
  },
};

/**
 * Test environment configuration (smaller pool, faster timeouts)
 */
const testOverrides: Partial<DatabaseConfig> = {
  pool: {
    min: 1,
    max: 5,
    idleTimeoutMs: 10000,
    connectionTimeoutMs: 5000,
  },
  query: {
    statementTimeoutMs: 10000,
    queryTimeoutMs: 20000,
  },
  retry: {
    maxRetries: 2,
    baseDelayMs: 100,
    maxDelayMs: 1000,
  },
};

/**
 * Deep merge configuration objects
 */
function deepMerge(
  target: DatabaseConfig,
  source: Partial<DatabaseConfig>
): DatabaseConfig {
  return {
    pool: {
      ...target.pool,
      ...(source.pool || {}),
    },
    query: {
      ...target.query,
      ...(source.query || {}),
    },
    retry: {
      ...target.retry,
      ...(source.retry || {}),
    },
    health: {
      ...target.health,
      ...(source.health || {}),
    },
  };
}

/**
 * Get database configuration based on current environment
 */
function getEnvironmentConfig(): DatabaseConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';

  switch (nodeEnv) {
    case 'production':
      return deepMerge(defaultDatabaseConfig, productionOverrides);
    case 'test':
      return deepMerge(defaultDatabaseConfig, testOverrides);
    default:
      // Deep clone for development environment
      return {
        pool: { ...defaultDatabaseConfig.pool },
        query: { ...defaultDatabaseConfig.query },
        retry: { ...defaultDatabaseConfig.retry },
        health: { ...defaultDatabaseConfig.health },
      };
  }
}

/**
 * Apply custom overrides from environment variables
 */
function applyEnvironmentVariables(config: DatabaseConfig): DatabaseConfig {
  // Deep clone to avoid mutating the original config
  const result: DatabaseConfig = {
    pool: { ...config.pool },
    query: { ...config.query },
    retry: { ...config.retry },
    health: { ...config.health },
  };

  // Pool configuration from environment
  if (process.env.DB_POOL_MIN) {
    result.pool.min = parseInt(process.env.DB_POOL_MIN, 10);
  }
  if (process.env.DB_POOL_MAX) {
    result.pool.max = parseInt(process.env.DB_POOL_MAX, 10);
  }
  if (process.env.DB_POOL_IDLE_TIMEOUT_MS) {
    result.pool.idleTimeoutMs = parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 10);
  }
  if (process.env.DB_POOL_CONNECTION_TIMEOUT_MS) {
    result.pool.connectionTimeoutMs = parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 10);
  }

  // Query configuration from environment
  if (process.env.DB_STATEMENT_TIMEOUT_MS) {
    result.query.statementTimeoutMs = parseInt(process.env.DB_STATEMENT_TIMEOUT_MS, 10);
  }
  if (process.env.DB_QUERY_TIMEOUT_MS) {
    result.query.queryTimeoutMs = parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10);
  }

  // Retry configuration from environment
  if (process.env.DB_MAX_RETRIES) {
    result.retry.maxRetries = parseInt(process.env.DB_MAX_RETRIES, 10);
  }
  if (process.env.DB_RETRY_BASE_DELAY_MS) {
    result.retry.baseDelayMs = parseInt(process.env.DB_RETRY_BASE_DELAY_MS, 10);
  }

  return result;
}

/**
 * Validate configuration values
 */
function validateConfig(config: DatabaseConfig): void {
  // Pool validation
  if (config.pool.min < 0) {
    throw new Error('DB_POOL_MIN must be >= 0');
  }
  if (config.pool.max < config.pool.min) {
    throw new Error('DB_POOL_MAX must be >= DB_POOL_MIN');
  }
  if (config.pool.max > 100) {
    logger.warn('DB_POOL_MAX > 100 may cause resource issues');
  }

  // Timeout validation
  if (config.pool.connectionTimeoutMs < 1000) {
    throw new Error('DB_POOL_CONNECTION_TIMEOUT_MS must be >= 1000ms');
  }
  if (config.query.statementTimeoutMs < 1000) {
    throw new Error('DB_STATEMENT_TIMEOUT_MS must be >= 1000ms');
  }

  // Retry validation
  if (config.retry.maxRetries < 0) {
    throw new Error('DB_MAX_RETRIES must be >= 0');
  }
  if (config.retry.baseDelayMs < 0) {
    throw new Error('DB_RETRY_BASE_DELAY_MS must be >= 0');
  }
}

/**
 * Build the final database configuration
 * Merges environment-specific defaults with environment variable overrides
 */
function buildDatabaseConfig(): DatabaseConfig {
  const baseConfig = getEnvironmentConfig();
  const configWithEnvVars = applyEnvironmentVariables(baseConfig);

  try {
    validateConfig(configWithEnvVars);
  } catch (error) {
    logger.error('Database configuration validation failed', { error: error instanceof Error ? error.message : error });
    throw error;
  }

  return configWithEnvVars;
}

/**
 * The final database configuration object
 * This is the main export that should be used throughout the application
 */
export const databaseConfig: DatabaseConfig = buildDatabaseConfig();

/**
 * Build Prisma connection URL with pool parameters
 * Appends connection pool parameters to the DATABASE_URL
 */
export function buildPrismaConnectionUrl(baseUrl?: string): string {
  const url = baseUrl || process.env.DATABASE_URL || '';

  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }

  // Parse the URL to add/update parameters
  const urlObj = new URL(url);

  // Prisma uses 'connection_limit' for max pool size
  urlObj.searchParams.set('connection_limit', String(databaseConfig.pool.max));

  // Pool timeout in seconds
  urlObj.searchParams.set('pool_timeout', String(Math.floor(databaseConfig.pool.connectionTimeoutMs / 1000)));

  // Statement timeout in milliseconds (PostgreSQL specific)
  urlObj.searchParams.set('statement_timeout', String(databaseConfig.query.statementTimeoutMs));

  // Connect timeout in seconds
  urlObj.searchParams.set('connect_timeout', String(Math.floor(databaseConfig.pool.connectionTimeoutMs / 1000)));

  return urlObj.toString();
}

/**
 * Get Prisma client options for initialization
 * Returns configuration object suitable for new PrismaClient()
 */
export function getPrismaClientOptions() {
  return {
    datasources: {
      db: {
        url: buildPrismaConnectionUrl(),
      },
    },
    // Transaction options
    transactionOptions: {
      maxWait: databaseConfig.pool.connectionTimeoutMs,
      timeout: databaseConfig.query.queryTimeoutMs,
    },
  };
}

/**
 * Helper to calculate exponential backoff delay
 */
export function calculateRetryDelay(attempt: number): number {
  const delay = databaseConfig.retry.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
  return Math.min(delay + jitter, databaseConfig.retry.maxDelayMs);
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const retryablePatterns = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EPIPE',
    'connection timeout',
    'deadlock detected',
    'could not connect',
    'Connection terminated unexpectedly',
    'Client has encountered a connection error',
    'prepared statement',
    'server closed the connection unexpectedly',
  ];

  const message = error.message.toLowerCase();
  return retryablePatterns.some(pattern =>
    message.includes(pattern.toLowerCase())
  );
}

/**
 * Log the current configuration (with sensitive data redacted)
 */
export function logDatabaseConfig(): void {
  logger.info('Database configuration loaded', {
    environment: process.env.NODE_ENV || 'development',
    pool: databaseConfig.pool,
    query: databaseConfig.query,
    retry: databaseConfig.retry,
    health: databaseConfig.health,
  });
}

export default databaseConfig;
