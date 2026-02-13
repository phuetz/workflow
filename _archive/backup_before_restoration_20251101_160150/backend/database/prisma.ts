/**
 * Prisma Client Configuration
 * Centralized database client with connection pooling and logging
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../services/LoggingService';

// Prevent multiple instances in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Custom logging configuration
const logLevels = process.env.NODE_ENV === 'production'
  ? ['error', 'warn']
  : ['query', 'error', 'warn', 'info'];

/**
 * Create Prisma Client with optimized configuration
 */
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: logLevels.map(level => ({
      level: level as any,
      emit: 'event',
    })),
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
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
 * Database connection retry logic
 */
export async function connectWithRetry(
  maxRetries: number = 5,
  delayMs: number = 2000
): Promise<boolean> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await prisma.$connect();
      logger.info('Database connected successfully');
      return true;
    } catch (error) {
      retries++;
      logger.warn(`Database connection attempt ${retries}/${maxRetries} failed:`, error);

      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  logger.error(`Failed to connect to database after ${maxRetries} attempts`);
  return false;
}

/**
 * Execute in transaction with retry logic
 */
export async function executeInTransaction<T>(
  operation: (tx: PrismaClient) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        return await operation(tx as PrismaClient);
      });
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Transaction attempt ${attempt}/${maxRetries} failed:`, error);

      // Don't retry on certain errors
      if (
        error instanceof Error &&
        (error.message.includes('Unique constraint') ||
         error.message.includes('Foreign key constraint'))
      ) {
        throw error;
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError || new Error('Transaction failed after retries');
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

export default prisma;
