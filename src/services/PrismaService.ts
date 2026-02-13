/**
 * Prisma Database Service
 * Centralized database access layer with connection management
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './SimpleLogger';

class PrismaService {
  private static instance: PrismaService;
  private client: PrismaClient;
  private isConnected = false;

  private constructor() {
    this.client = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
      errorFormat: 'pretty',
    });

    this.setupEventHandlers();
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  private setupEventHandlers(): void {
    this.client.$on('query', (e) => {
      logger.debug('Prisma Query', {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
        target: e.target
      });
    });

    this.client.$on('error', (e) => {
      logger.error('Prisma Error', {
        target: e.target,
        message: e.message,
        timestamp: e.timestamp
      });
    });

    this.client.$on('info', (e) => {
      logger.info('Prisma Info', {
        target: e.target,
        message: e.message,
        timestamp: e.timestamp
      });
    });

    this.client.$on('warn', (e) => {
      logger.warn('Prisma Warning', {
        target: e.target,
        message: e.message,
        timestamp: e.timestamp
      });
    });
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.client.$connect();
      this.isConnected = true;
      logger.info('📊 Prisma connected to database');
      
      // Test the connection
      await this.healthCheck();
    } catch (error) {
      logger.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.$disconnect();
      this.isConnected = false;
      logger.info('📊 Prisma disconnected from database');
    } catch (error) {
      logger.error('❌ Failed to disconnect from database:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('❌ Database health check failed:', error);
      return false;
    }
  }

  public getClient(): PrismaClient {
    if (!this.isConnected) {
      throw new Error('Prisma client not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Execute a transaction with automatic retry
   */
  public async transaction<T>(
    fn: (client: PrismaClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
    }
  ): Promise<T> {
    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.client.$transaction(fn, {
          maxWait: options?.maxWait || 5000,
          timeout: options?.timeout || 10000,
          isolationLevel: options?.isolationLevel
        });
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Transaction attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    logger.error('❌ Transaction failed after all retries:', lastError);
    throw lastError;
  }

  /**
   * Execute raw SQL query with logging
   */
  public async executeRaw(query: string, ...params: unknown[]): Promise<unknown> {
    try {
      logger.debug('Executing raw query:', { query, params });
      return await this.client.$executeRawUnsafe(query, ...params);
    } catch (error) {
      logger.error('❌ Raw query execution failed:', { query, params, error });
      throw error;
    }
  }

  /**
   * Query raw SQL with logging
   */
  public async queryRaw(query: string, ...params: unknown[]): Promise<unknown> {
    try {
      logger.debug('Executing raw query:', { query, params });
      return await this.client.$queryRawUnsafe(query, ...params);
    } catch (error) {
      logger.error('❌ Raw query failed:', { query, params, error });
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  public async getDatabaseStats(): Promise<{
    totalUsers: number;
    totalWorkflows: number;
    totalExecutions: number;
    activeWorkflows: number;
    recentExecutions: number;
  }> {
    try {
      const [
        totalUsers,
        totalWorkflows,
        totalExecutions,
        activeWorkflows,
        recentExecutions
      ] = await Promise.all([
        this.client.user.count(),
        this.client.workflow.count(),
        this.client.workflowExecution.count(),
        this.client.workflow.count({ where: { status: 'ACTIVE' } }),
        this.client.workflowExecution.count({
          where: {
            startedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        })
      ]);

      return {
        totalUsers,
        totalWorkflows,
        totalExecutions,
        activeWorkflows,
        recentExecutions
      };
    } catch (error) {
      logger.error('❌ Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old data
   */
  public async cleanup(options: {
    olderThanDays?: number;
    batchSize?: number;
  } = {}): Promise<void> {
    const { olderThanDays = 90, batchSize = 1000 } = options;

    try {
      logger.info(`🧹 Starting database cleanup for data older than ${olderThanDays} days`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      let deletedExecutions = 0;

      // Clean old executions
      while (true) {
        const batch = await this.client.workflowExecution.findMany({
          where: {
            startedAt: { lt: cutoffDate },
            status: { in: ['SUCCESS', 'FAILED', 'CANCELLED'] }
          },
          take: batchSize,
          select: { id: true }
        });

        if (batch.length === 0) break;

        const ids = batch.map(b => b.id);
        await this.client.workflowExecution.deleteMany({
          where: { id: { in: ids } }
        });

        deletedExecutions += batch.length;
        logger.debug(`Deleted ${batch.length} old executions`);
      }

      let deletedEvents = 0;
      // Clean old webhook events
      while (true) {
        const batch = await this.client.webhookEvent.findMany({
          where: {
            createdAt: { lt: cutoffDate },
            processed: true
          },
          take: batchSize,
          select: { id: true }
        });

        if (batch.length === 0) break;

        const ids = batch.map(b => b.id);
        await this.client.webhookEvent.deleteMany({
          where: { id: { in: ids } }
        });

        deletedEvents += batch.length;
        logger.debug(`Deleted ${batch.length} old webhook events`);
      }

      // Clean old audit logs
      const deletedAuditLogs = await this.client.auditLog.deleteMany({
        where: { timestamp: { lt: cutoffDate } }
      });

      // Clean old system metrics
      const deletedMetrics = await this.client.systemMetrics.deleteMany({
        where: { timestamp: { lt: cutoffDate } }
      });

      logger.info('🧹 Database cleanup completed:', {
        deletedExecutions,
        deletedEvents,
        deletedAuditLogs: deletedAuditLogs.count,
        deletedMetrics: deletedMetrics.count
      });
    } catch (error) {
      logger.error('❌ Database cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown handler
   */
  public async gracefulShutdown(): Promise<void> {
    logger.info('🛑 Initiating graceful database shutdown...');
    
    try {
      // Wait for ongoing transactions to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.disconnect();
      logger.info('✅ Prisma graceful shutdown completed');
    } catch (error) {
      logger.error('❌ Error during Prisma graceful shutdown:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const prismaService = PrismaService.getInstance();
export const prisma = () => prismaService.getClient();

// Handle process signals for graceful shutdown
process.on('SIGINT', async () => {
  await prismaService.gracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prismaService.gracefulShutdown();
  process.exit(0);
});

export default prismaService;