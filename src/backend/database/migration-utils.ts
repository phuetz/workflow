/**
 * Database Migration Utilities
 * Helper functions for data migration between systems
 */

import { prisma } from './prisma';
import { logger } from '../../services/SimpleLogger';
import {
  userRepository,
  workflowRepository,
  executionRepository,
  credentialRepository,
} from './repositories';

/**
 * Migrate in-memory data to database
 * This function helps migrate existing Map-based storage to Prisma
 */
export async function migrateInMemoryToDatabase(
  inMemoryData: {
    users?: Map<string, any>;
    workflows?: Map<string, any>;
    executions?: Map<string, any>;
    credentials?: Map<string, any>;
  }
): Promise<{
  users: number;
  workflows: number;
  executions: number;
  credentials: number;
}> {
  const migrated = {
    users: 0,
    workflows: 0,
    executions: 0,
    credentials: 0,
  };

  try {
    logger.info('Starting data migration to database...');

    // Migrate users
    if (inMemoryData.users) {
      logger.info(`Migrating ${inMemoryData.users.size} users...`);
      for (const [_id, userData] of inMemoryData.users) {
        try {
          await userRepository.create({
            email: userData.email,
            passwordHash: userData.passwordHash,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            emailVerified: userData.emailVerified || false,
            timezone: userData.timezone,
            language: userData.language,
            preferences: userData.preferences,
          });
          migrated.users++;
        } catch (error: any) {
          if (error.message?.includes('already exists')) {
            logger.warn(`User ${userData.email} already exists, skipping`);
          } else {
            logger.error(`Failed to migrate user ${userData.email}:`, error);
          }
        }
      }
    }

    // Migrate workflows
    if (inMemoryData.workflows) {
      logger.info(`Migrating ${inMemoryData.workflows.size} workflows...`);
      for (const [_id, workflowData] of inMemoryData.workflows) {
        try {
          await workflowRepository.create({
            name: workflowData.name,
            description: workflowData.description,
            nodes: workflowData.nodes,
            edges: workflowData.edges,
            userId: workflowData.createdBy || workflowData.userId,
            tags: workflowData.tags,
            category: workflowData.category,
            variables: workflowData.settings?.variables || {},
            settings: workflowData.settings,
          });
          migrated.workflows++;
        } catch (error) {
          logger.error(`Failed to migrate workflow ${workflowData.name}:`, error);
        }
      }
    }

    // Migrate executions
    if (inMemoryData.executions) {
      logger.info(`Migrating ${inMemoryData.executions.size} executions...`);
      for (const [_id, executionData] of inMemoryData.executions) {
        try {
          await executionRepository.createExecution({
            workflowId: executionData.workflowId,
            userId: executionData.userId,
            version: executionData.version || 1,
            trigger: executionData.trigger || { type: 'manual' },
            input: executionData.input,
          });
          migrated.executions++;
        } catch (error) {
          logger.error(`Failed to migrate execution:`, error);
        }
      }
    }

    // Migrate credentials
    if (inMemoryData.credentials) {
      logger.info(`Migrating ${inMemoryData.credentials.size} credentials...`);
      for (const [_id, credentialData] of inMemoryData.credentials) {
        try {
          await credentialRepository.create({
            userId: credentialData.userId,
            name: credentialData.name,
            type: credentialData.type,
            data: credentialData.data,
            description: credentialData.description,
          });
          migrated.credentials++;
        } catch (error) {
          logger.error(`Failed to migrate credential ${credentialData.name}:`, error);
        }
      }
    }

    logger.info('Migration completed:', migrated);
    return migrated;
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Validate database integrity
 */
export async function validateDatabaseIntegrity(): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    logger.info('Validating database integrity...');

    // Check for orphaned workflows (user doesn't exist)
    const orphanedWorkflows = await prisma.workflow.findMany({
      where: {
        user: undefined,
      },
      select: { id: true, name: true },
    });

    if (orphanedWorkflows.length > 0) {
      errors.push(`Found ${orphanedWorkflows.length} orphaned workflows`);
    }

    // Check for orphaned executions
    const orphanedExecutions = await prisma.workflowExecution.count({
      where: {
        workflow: undefined,
      },
    });

    if (orphanedExecutions > 0) {
      errors.push(`Found ${orphanedExecutions} orphaned executions`);
    }

    // Check for expired credentials that are still active
    const expiredActiveCredentials = await prisma.credential.count({
      where: {
        isActive: true,
        expiresAt: {
          not: null,
          lt: new Date(),
        },
      },
    });

    if (expiredActiveCredentials > 0) {
      warnings.push(
        `Found ${expiredActiveCredentials} expired credentials still marked as active`
      );
    }

    // Check for workflows with invalid webhook URLs
    const invalidWebhooks = await prisma.workflow.count({
      where: {
        webhookUrl: {
          not: null,
        },
        NOT: {
          webhookUrl: {
            startsWith: 'http',
          },
        },
      },
    });

    if (invalidWebhooks > 0) {
      warnings.push(`Found ${invalidWebhooks} workflows with invalid webhook URLs`);
    }

    // Check for locked users with expired locks
    const expiredLocks = await prisma.user.count({
      where: {
        accountLockedUntil: {
          not: null,
          lt: new Date(),
        },
        status: 'SUSPENDED',
      },
    });

    if (expiredLocks > 0) {
      warnings.push(`Found ${expiredLocks} users with expired locks still suspended`);
    }

    const valid = errors.length === 0;
    logger.info('Validation completed:', { valid, errors, warnings });

    return { valid, errors, warnings };
  } catch (error) {
    logger.error('Validation failed:', error);
    throw error;
  }
}

/**
 * Fix common database issues
 */
export async function fixDatabaseIssues(): Promise<{
  fixed: number;
  failed: number;
}> {
  let fixed = 0;
  let failed = 0;

  try {
    logger.info('Fixing database issues...');

    // Deactivate expired credentials
    const expiredCreds = await credentialRepository.deactivateExpiredCredentials();
    fixed += expiredCreds;
    logger.info(`Deactivated ${expiredCreds} expired credentials`);

    // Unlock users with expired locks
    const expiredLocks = await prisma.user.updateMany({
      where: {
        accountLockedUntil: {
          not: null,
          lt: new Date(),
        },
        status: 'SUSPENDED',
      },
      data: {
        accountLockedUntil: null,
        failedLoginAttempts: 0,
        status: 'ACTIVE',
      },
    });
    fixed += expiredLocks.count;
    logger.info(`Unlocked ${expiredLocks.count} users with expired locks`);

    // Clean up expired sessions
    const expiredSessions = await prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    fixed += expiredSessions.count;
    logger.info(`Removed ${expiredSessions.count} expired sessions`);

    // Clean up expired notifications
    const expiredNotifications = await prisma.notification.deleteMany({
      where: {
        expiresAt: {
          not: null,
          lt: new Date(),
        },
      },
    });
    fixed += expiredNotifications.count;
    logger.info(`Removed ${expiredNotifications.count} expired notifications`);

    logger.info(`Fixed ${fixed} issues, ${failed} failures`);
    return { fixed, failed };
  } catch (error) {
    logger.error('Fix operation failed:', error);
    throw error;
  }
}

/**
 * Database statistics
 */
export async function getDatabaseStatistics() {
  try {
    const [
      userStats,
      workflowStats,
      executionStats,
      credentialStats,
      totalSize,
    ] = await Promise.all([
      userRepository.getStatistics(),
      workflowRepository.getStatistics(),
      executionRepository.getStatistics(),
      credentialRepository.getStatistics(),
      prisma.$queryRaw<Array<{ size: string }>>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `,
    ]);

    return {
      users: userStats,
      workflows: workflowStats,
      executions: executionStats,
      credentials: credentialStats,
      databaseSize: totalSize[0]?.size || 'Unknown',
      timestamp: new Date(),
    };
  } catch (error) {
    logger.error('Failed to get database statistics:', error);
    throw error;
  }
}

/**
 * Optimize database
 */
export async function optimizeDatabase(): Promise<void> {
  try {
    logger.info('Starting database optimization...');

    // Vacuum analyze
    await prisma.$executeRawUnsafe('VACUUM ANALYZE');
    logger.info('Vacuum analyze completed');

    // Reindex
    await prisma.$executeRawUnsafe('REINDEX DATABASE CONCURRENTLY');
    logger.info('Reindex completed');

    logger.info('Database optimization completed');
  } catch (error) {
    logger.error('Database optimization failed:', error);
    throw error;
  }
}

/**
 * Reset database (DANGER: Deletes all data)
 */
export async function resetDatabase(confirm: boolean = false): Promise<void> {
  if (!confirm) {
    throw new Error('Database reset requires confirmation');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database reset is not allowed in production');
  }

  try {
    logger.warn('RESETTING DATABASE - ALL DATA WILL BE LOST');

    // Delete in reverse dependency order
    await prisma.nodeExecution.deleteMany();
    await prisma.workflowExecution.deleteMany();
    await prisma.webhookEvent.deleteMany();
    await prisma.webhook.deleteMany();
    await prisma.workflowVersion.deleteMany();
    await prisma.workflowShare.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.workflowAnalytics.deleteMany();
    await prisma.workflow.deleteMany();
    await prisma.credential.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.systemMetrics.deleteMany();
    await prisma.file.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.apiKey.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.user.deleteMany();

    logger.info('Database reset completed');
  } catch (error) {
    logger.error('Database reset failed:', error);
    throw error;
  }
}
