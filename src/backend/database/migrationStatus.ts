/**
 * Database Migration Status Tracking
 * Provides utilities to check migration status for health endpoints
 */

import { prisma } from './prisma';
import { logger } from '../../services/SimpleLogger';

export interface MigrationStatus {
  status: 'up-to-date' | 'pending' | 'failed' | 'unknown';
  appliedMigrations: number;
  pendingMigrations: number;
  lastMigration?: {
    name: string;
    appliedAt: Date;
  };
  error?: string;
}

export interface MigrationRecord {
  id: string;
  migration_name: string;
  checksum: string;
  finished_at: Date | null;
  started_at: Date;
  applied_steps_count: number;
  logs: string | null;
  rolled_back_at: Date | null;
}

/**
 * Get the current migration status from Prisma's migration table
 * Queries _prisma_migrations to determine applied and pending migrations
 */
export async function getMigrationStatus(): Promise<MigrationStatus> {
  try {
    // Query Prisma's migration table
    const migrations = await prisma.$queryRaw<Array<{
      migration_name: string;
      finished_at: Date | null;
      started_at: Date;
      rolled_back_at: Date | null;
    }>>`
      SELECT migration_name, finished_at, started_at, rolled_back_at
      FROM _prisma_migrations
      ORDER BY started_at DESC
    `;

    // Filter migrations
    const applied = migrations.filter(m => m.finished_at !== null && m.rolled_back_at === null);
    const pending = migrations.filter(m => m.finished_at === null && m.rolled_back_at === null);
    const failed = migrations.filter(m => m.finished_at === null && m.started_at !== null);

    const lastApplied = applied[0];

    // Determine status
    let status: MigrationStatus['status'];
    if (failed.length > 0) {
      status = 'failed';
    } else if (pending.length > 0) {
      status = 'pending';
    } else {
      status = 'up-to-date';
    }

    return {
      status,
      appliedMigrations: applied.length,
      pendingMigrations: pending.length,
      lastMigration: lastApplied ? {
        name: lastApplied.migration_name,
        appliedAt: lastApplied.finished_at!
      } : undefined
    };
  } catch (error) {
    // Check if it's because the migrations table doesn't exist yet
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('_prisma_migrations') && errorMessage.includes('does not exist')) {
      logger.warn('Migration table does not exist - database may not be initialized');
      return {
        status: 'unknown',
        appliedMigrations: 0,
        pendingMigrations: 0,
        error: 'Migration table not found - run prisma migrate deploy'
      };
    }

    logger.error('Failed to get migration status', { error });
    return {
      status: 'unknown',
      appliedMigrations: 0,
      pendingMigrations: 0,
      error: errorMessage
    };
  }
}

/**
 * Get detailed migration history
 * Returns all migrations with their full details
 */
export async function getMigrationHistory(): Promise<MigrationRecord[]> {
  try {
    const migrations = await prisma.$queryRaw<MigrationRecord[]>`
      SELECT
        id,
        migration_name,
        checksum,
        finished_at,
        started_at,
        applied_steps_count,
        logs,
        rolled_back_at
      FROM _prisma_migrations
      ORDER BY started_at DESC
    `;

    return migrations;
  } catch (error) {
    logger.error('Failed to get migration history', { error });
    return [];
  }
}

/**
 * Check if a specific migration has been applied
 */
export async function isMigrationApplied(migrationName: string): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM _prisma_migrations
      WHERE migration_name = ${migrationName}
        AND finished_at IS NOT NULL
        AND rolled_back_at IS NULL
    `;

    return Number(result[0]?.count) > 0;
  } catch (error) {
    logger.error('Failed to check migration status', { error, migrationName });
    return false;
  }
}

/**
 * Get failed migrations if any
 */
export async function getFailedMigrations(): Promise<Array<{ name: string; startedAt: Date; logs: string | null }>> {
  try {
    const failed = await prisma.$queryRaw<Array<{
      migration_name: string;
      started_at: Date;
      logs: string | null;
    }>>`
      SELECT migration_name, started_at, logs
      FROM _prisma_migrations
      WHERE finished_at IS NULL
        AND rolled_back_at IS NULL
      ORDER BY started_at DESC
    `;

    return failed.map(m => ({
      name: m.migration_name,
      startedAt: m.started_at,
      logs: m.logs
    }));
  } catch (error) {
    logger.error('Failed to get failed migrations', { error });
    return [];
  }
}

export default {
  getMigrationStatus,
  getMigrationHistory,
  isMigrationApplied,
  getFailedMigrations
};
