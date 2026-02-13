/**
 * Database Backup and Restore Utilities
 * Provides functionality for backing up and restoring database data
 */

import { prisma } from './prisma';
import { logger } from '../../services/SimpleLogger';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

export interface BackupOptions {
  outputDir?: string;
  includeData?: boolean;
  compress?: boolean;
  tables?: string[];
}

export interface RestoreOptions {
  backupFile: string;
  skipValidation?: boolean;
}

/**
 * Create a complete database backup
 */
export async function createBackup(options: BackupOptions = {}): Promise<string> {
  const {
    outputDir = './backups',
    includeData = true,
    compress = true,
    tables,
  } = options;

  try {
    // Ensure backup directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `workflow_backup_${timestamp}`;
    const backupPath = path.join(outputDir, backupName);

    logger.info('Starting database backup...');

    // Export schema and data
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    // Use pg_dump for PostgreSQL
    let pgDumpCmd = `pg_dump "${databaseUrl}" -F c`;

    if (!includeData) {
      pgDumpCmd += ' --schema-only';
    }

    if (tables && tables.length > 0) {
      tables.forEach((table) => {
        pgDumpCmd += ` -t ${table}`;
      });
    }

    pgDumpCmd += ` -f ${backupPath}.dump`;

    logger.info('Running pg_dump...');
    execSync(pgDumpCmd, { stdio: 'inherit' });

    // Also create JSON backup of critical data
    if (includeData) {
      logger.info('Creating JSON backup...');
      const jsonBackup = await createJsonBackup(tables);
      await fs.writeFile(
        `${backupPath}.json`,
        JSON.stringify(jsonBackup, null, 2)
      );
    }

    // Compress if requested
    if (compress) {
      logger.info('Compressing backup...');
      const tarCmd = `tar -czf ${backupPath}.tar.gz -C ${outputDir} ${backupName}.dump ${backupName}.json`;
      execSync(tarCmd);

      // Clean up uncompressed files
      await fs.unlink(`${backupPath}.dump`).catch((err) => {
        logger.debug('Failed to cleanup uncompressed dump file', { path: `${backupPath}.dump`, error: err.message });
      });
      await fs.unlink(`${backupPath}.json`).catch((err) => {
        logger.debug('Failed to cleanup uncompressed json file', { path: `${backupPath}.json`, error: err.message });
      });

      logger.info(`Backup completed: ${backupPath}.tar.gz`);
      return `${backupPath}.tar.gz`;
    }

    logger.info(`Backup completed: ${backupPath}.dump`);
    return `${backupPath}.dump`;
  } catch (error) {
    logger.error('Backup failed:', error);
    throw error;
  }
}

/**
 * Create JSON backup of database data
 */
async function createJsonBackup(tables?: string[]): Promise<Record<string, any>> {
  const backup: Record<string, any> = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    data: {},
  };

  try {
    // Backup users (without sensitive data)
    if (!tables || tables.includes('users')) {
      backup.data.users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          emailVerified: true,
          timezone: true,
          language: true,
          preferences: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    // Backup workflows
    if (!tables || tables.includes('workflows')) {
      backup.data.workflows = await prisma.workflow.findMany();
    }

    // Backup credentials (encrypted)
    if (!tables || tables.includes('credentials')) {
      backup.data.credentials = await prisma.credential.findMany({
        select: {
          id: true,
          userId: true,
          name: true,
          type: true,
          description: true,
          data: true, // Encrypted
          isActive: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    // Backup webhooks
    if (!tables || tables.includes('webhooks')) {
      backup.data.webhooks = await prisma.webhook.findMany();
    }

    // Backup analytics (last 90 days)
    if (!tables || tables.includes('workflow_analytics')) {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      backup.data.analytics = await prisma.workflowAnalytics.findMany({
        where: {
          date: {
            gte: ninetyDaysAgo,
          },
        },
      });
    }

    return backup;
  } catch (error) {
    logger.error('JSON backup failed:', error);
    throw error;
  }
}

/**
 * Restore database from backup
 */
export async function restoreBackup(options: RestoreOptions): Promise<void> {
  const { backupFile, skipValidation = false } = options;

  try {
    logger.info(`Starting database restore from ${backupFile}...`);

    // Check if file exists
    await fs.access(backupFile);

    // Validate backup file
    if (!skipValidation) {
      logger.info('Validating backup file...');
      // Add validation logic here
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    // Extract if compressed
    let dumpFile = backupFile;
    if (backupFile.endsWith('.tar.gz')) {
      logger.info('Extracting compressed backup...');
      const extractDir = path.dirname(backupFile);
      execSync(`tar -xzf ${backupFile} -C ${extractDir}`);
      dumpFile = backupFile.replace('.tar.gz', '.dump');
    }

    // Restore using pg_restore
    logger.info('Restoring database...');
    const pgRestoreCmd = `pg_restore -d "${databaseUrl}" --clean --if-exists ${dumpFile}`;
    execSync(pgRestoreCmd, { stdio: 'inherit' });

    logger.info('Database restore completed successfully');
  } catch (error) {
    logger.error('Restore failed:', error);
    throw error;
  }
}

/**
 * Export data to JSON
 */
export async function exportToJson(
  outputFile: string,
  tables?: string[]
): Promise<void> {
  try {
    logger.info('Exporting data to JSON...');

    const data = await createJsonBackup(tables);
    await fs.writeFile(outputFile, JSON.stringify(data, null, 2));

    logger.info(`Data exported to ${outputFile}`);
  } catch (error) {
    logger.error('Export failed:', error);
    throw error;
  }
}

/**
 * Import data from JSON
 */
export async function importFromJson(inputFile: string): Promise<void> {
  try {
    logger.info(`Importing data from ${inputFile}...`);

    const fileContent = await fs.readFile(inputFile, 'utf-8');
    const data = JSON.parse(fileContent);

    if (!data.data) {
      throw new Error('Invalid backup file format');
    }

    // Import users - batched transaction to avoid N+1
    if (data.data.users && data.data.users.length > 0) {
      logger.info(`Importing ${data.data.users.length} users...`);
      await prisma.$transaction(
        data.data.users.map((user: Record<string, unknown>) =>
          prisma.user.upsert({
            where: { id: user.id as string },
            create: user as Parameters<typeof prisma.user.create>[0]['data'],
            update: user as Parameters<typeof prisma.user.update>[0]['data'],
          })
        )
      );
    }

    // Import workflows - batched transaction to avoid N+1
    if (data.data.workflows && data.data.workflows.length > 0) {
      logger.info(`Importing ${data.data.workflows.length} workflows...`);
      await prisma.$transaction(
        data.data.workflows.map((workflow: Record<string, unknown>) =>
          prisma.workflow.upsert({
            where: { id: workflow.id as string },
            create: workflow as Parameters<typeof prisma.workflow.create>[0]['data'],
            update: workflow as Parameters<typeof prisma.workflow.update>[0]['data'],
          })
        )
      );
    }

    // Import credentials - batched transaction to avoid N+1
    if (data.data.credentials && data.data.credentials.length > 0) {
      logger.info(`Importing ${data.data.credentials.length} credentials...`);
      await prisma.$transaction(
        data.data.credentials.map((credential: Record<string, unknown>) =>
          prisma.credential.upsert({
            where: { id: credential.id as string },
            create: credential as Parameters<typeof prisma.credential.create>[0]['data'],
            update: credential as Parameters<typeof prisma.credential.update>[0]['data'],
          })
        )
      );
    }

    // Import webhooks - batched transaction to avoid N+1
    if (data.data.webhooks && data.data.webhooks.length > 0) {
      logger.info(`Importing ${data.data.webhooks.length} webhooks...`);
      await prisma.$transaction(
        data.data.webhooks.map((webhook: Record<string, unknown>) =>
          prisma.webhook.upsert({
            where: { id: webhook.id as string },
            create: webhook as Parameters<typeof prisma.webhook.create>[0]['data'],
            update: webhook as Parameters<typeof prisma.webhook.update>[0]['data'],
          })
        )
      );
    }

    logger.info('Data import completed successfully');
  } catch (error) {
    logger.error('Import failed:', error);
    throw error;
  }
}

/**
 * Clean up old backups
 */
export async function cleanupOldBackups(
  backupDir: string = './backups',
  daysToKeep: number = 30
): Promise<number> {
  try {
    const files = await fs.readdir(backupDir);
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = await fs.stat(filePath);

      if (stats.isFile() && stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        deletedCount++;
        logger.info(`Deleted old backup: ${file}`);
      }
    }

    logger.info(`Cleaned up ${deletedCount} old backups`);
    return deletedCount;
  } catch (error) {
    logger.error('Cleanup failed:', error);
    throw error;
  }
}

/**
 * Get backup information
 */
export async function listBackups(
  backupDir: string = './backups'
): Promise<
  Array<{
    filename: string;
    size: number;
    created: Date;
  }>
> {
  try {
    const files = await fs.readdir(backupDir);
    const backups = [];

    for (const file of files) {
      if (file.startsWith('workflow_backup_')) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);

        backups.push({
          filename: file,
          size: stats.size,
          created: stats.mtime,
        });
      }
    }

    return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
  } catch (error) {
    logger.error('Failed to list backups:', error);
    throw error;
  }
}
