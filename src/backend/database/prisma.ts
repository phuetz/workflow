/**
 * Prisma Client Configuration
 * Centralized database client with connection pooling and logging
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../services/SimpleLogger';
import {
  databaseConfig,
  buildPrismaConnectionUrl,
  calculateRetryDelay,
  isRetryableError,
  logDatabaseConfig,
} from './config';

// Prevent multiple instances in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Custom logging configuration
const logLevels = process.env.NODE_ENV === 'production'
  ? ['error', 'warn']
  : ['query', 'error', 'warn', 'info'];

// Log database configuration on startup (only in non-test environments)
if (process.env.NODE_ENV !== 'test') {
  logDatabaseConfig();
}

/**
 * Build connection URL with pool parameters
 */
const getConnectionUrl = (): string => {
  try {
    return buildPrismaConnectionUrl();
  } catch {
    // Fall back to raw DATABASE_URL if building fails
    logger.warn('Failed to build Prisma connection URL with pool params, using raw DATABASE_URL');
    return process.env.DATABASE_URL || '';
  }
};

/**
 * Create Prisma Client with optimized configuration
 */
const createPrismaClient = () => {
  const connectionUrl = getConnectionUrl();

  const client = new PrismaClient({
    log: logLevels.map(level => ({
      level: level as any,
      emit: 'event',
    })),
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: connectionUrl,
      },
    },
  });

  logger.info('Prisma client initialized with pool configuration', {
    poolMin: databaseConfig.pool.min,
    poolMax: databaseConfig.pool.max,
    connectionTimeoutMs: databaseConfig.pool.connectionTimeoutMs,
    statementTimeoutMs: databaseConfig.query.statementTimeoutMs,
  });

  // Custom query logging
  if (process.env.NODE_ENV !== 'production') {
    client.$on('query' as never, (e: any) => {
      logger.debug('Prisma Query:', {
        query: e.query,
        duration: `${e.duration}ms`,
        params: e.params,
      });
    });
  }

  // Error logging
  client.$on('error' as never, (e: any) => {
    logger.error('Prisma Error:', e);
  });

  // Warn logging
  client.$on('warn' as never, (e: any) => {
    logger.warn('Prisma Warning:', e);
  });

  return client;
};

/**
 * Singleton Prisma Client instance
 */
export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
  }
}

/**
 * Database connection retry logic with exponential backoff
 * Uses configuration from databaseConfig for retry settings
 */
export async function connectWithRetry(
  maxRetries: number = databaseConfig.retry.maxRetries,
  baseDelayMs: number = databaseConfig.retry.baseDelayMs
): Promise<boolean> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await prisma.$connect();
      logger.info('Database connected successfully', {
        poolConfig: {
          min: databaseConfig.pool.min,
          max: databaseConfig.pool.max,
          connectionTimeoutMs: databaseConfig.pool.connectionTimeoutMs,
        },
      });
      return true;
    } catch (error) {
      retries++;
      const delay = calculateRetryDelay(retries);
      logger.warn(`Database connection attempt ${retries}/${maxRetries} failed:`, {
        error: error instanceof Error ? error.message : String(error),
        nextRetryIn: retries < maxRetries ? `${delay}ms` : 'N/A',
      });

      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(`Failed to connect to database after ${maxRetries} attempts`);
  return false;
}

/**
 * Execute in transaction with retry logic
 * Uses configuration from databaseConfig for retry and timeout settings
 */
export async function executeInTransaction<T>(
  operation: (tx: PrismaClient) => Promise<T>,
  options: {
    maxRetries?: number;
    timeout?: number;
    maxWait?: number;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? databaseConfig.retry.maxRetries;
  const timeout = options.timeout ?? databaseConfig.query.queryTimeoutMs;
  const maxWait = options.maxWait ?? databaseConfig.pool.connectionTimeoutMs;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          return await operation(tx as PrismaClient);
        },
        {
          timeout,
          maxWait,
        }
      );
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Transaction attempt ${attempt}/${maxRetries} failed:`, {
        error: error instanceof Error ? error.message : String(error),
        attempt,
        maxRetries,
      });

      // Don't retry on non-retryable errors
      if (error instanceof Error && !isRetryableError(error)) {
        // Also check for constraint violations which should never be retried
        if (
          error.message.includes('Unique constraint') ||
          error.message.includes('Foreign key constraint') ||
          error.message.includes('violates') ||
          error.message.includes('Invalid')
        ) {
          throw error;
        }
      }

      if (attempt < maxRetries) {
        const delay = calculateRetryDelay(attempt);
        logger.debug(`Retrying transaction in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Transaction failed after retries');
}

/**
 * Execute a query with automatic retry logic
 * Wraps Prisma queries with retry capability for transient failures
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? databaseConfig.retry.maxRetries;
  const operationName = options.operationName ?? 'database operation';
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      logger.warn(`${operationName} attempt ${attempt}/${maxRetries} failed:`, {
        error: error instanceof Error ? error.message : String(error),
      });

      if (attempt < maxRetries) {
        const delay = calculateRetryDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error(`${operationName} failed after ${maxRetries} retries`);
}

/**
 * Get current pool statistics (when using PgBouncer or similar)
 */
export async function getPoolStatistics(): Promise<{
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  maxConnections: number;
}> {
  try {
    // This query works with PostgreSQL's pg_stat_activity
    const result = await prisma.$queryRaw<Array<{
      state: string;
      count: bigint;
    }>>`
      SELECT state, count(*) as count
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state
    `;

    const stats = {
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      maxConnections: databaseConfig.pool.max,
    };

    for (const row of result) {
      const count = Number(row.count);
      if (row.state === 'active') {
        stats.activeConnections = count;
      } else if (row.state === 'idle') {
        stats.idleConnections = count;
      } else if (row.state === 'idle in transaction') {
        stats.waitingClients = count;
      }
    }

    return stats;
  } catch (error) {
    logger.error('Failed to get pool statistics:', error);
    return {
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      maxConnections: databaseConfig.pool.max,
    };
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const stats = await prisma.$queryRaw<Array<{
      table_name: string;
      row_count: number;
      total_size: string;
    }>>`
      SELECT
        schemaname || '.' || tablename as table_name,
        n_tup_ins as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_tup_ins DESC
      LIMIT 20
    `;

    return stats;
  } catch (error) {
    logger.error('Failed to get database statistics:', error);
    return [];
  }
}

/**
 * Clean up expired records
 */
export async function cleanupExpiredRecords(): Promise<void> {
  try {
    const now = new Date();

    // Clean up expired sessions
    const deletedSessions = await prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    // Clean up expired notifications
    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        expiresAt: {
          not: null,
          lt: now,
        },
      },
    });

    // Clean up old webhook events (keep last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deletedWebhookEvents = await prisma.webhookEvent.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
        processed: true,
      },
    });

    logger.info('Cleanup completed:', {
      sessions: deletedSessions.count,
      notifications: deletedNotifications.count,
      webhookEvents: deletedWebhookEvents.count,
    });
  } catch (error) {
    logger.error('Cleanup failed:', error);
  }
}

// Re-export configuration utilities
export { databaseConfig, calculateRetryDelay, isRetryableError } from './config';

export default prisma;
