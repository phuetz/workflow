#!/usr/bin/env tsx
/**
 * Credential Migration Script
 * Encrypts existing plain-text credentials and migrates them to encrypted storage
 *
 * Usage:
 *   npm run migrate:credentials
 *   npm run migrate:credentials -- --dry-run
 *   npm run migrate:credentials -- --backup-only
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { getCredentialEncryption } from '../src/security/CredentialEncryption';
import { getCredentialRepository } from '../src/backend/repositories/CredentialRepository';

const prisma = new PrismaClient();
const encryption = getCredentialEncryption();
const repository = getCredentialRepository();

interface PlainCredential {
  id?: string;
  type: string;
  name: string;
  data: Record<string, unknown>;
  provider?: string;
}

interface MigrationReport {
  startTime: string;
  endTime?: string;
  totalCredentials: number;
  successfulMigrations: number;
  failedMigrations: number;
  backupFile: string;
  errors: Array<{
    credential: string;
    error: string;
  }>;
  dryRun: boolean;
}

class CredentialMigrator {
  private report: MigrationReport;
  private backupDir = path.join(process.cwd(), 'backup');
  private dryRun = false;
  private backupOnly = false;

  constructor(options: { dryRun?: boolean; backupOnly?: boolean } = {}) {
    this.dryRun = options.dryRun || false;
    this.backupOnly = options.backupOnly || false;

    this.report = {
      startTime: new Date().toISOString(),
      totalCredentials: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      backupFile: '',
      errors: [],
      dryRun: this.dryRun
    };
  }

  /**
   * Main migration process
   */
  async migrate(): Promise<MigrationReport> {
    try {
      logger.info('Starting credential migration', {
        dryRun: this.dryRun,
        backupOnly: this.backupOnly
      });

      // Step 1: Ensure encryption service is initialized
      await this.initializeEncryption();

      // Step 2: Create backup directory
      await this.createBackupDirectory();

      // Step 3: Load existing credentials
      const credentials = await this.loadExistingCredentials();
      this.report.totalCredentials = credentials.length;

      if (credentials.length === 0) {
        logger.info('No credentials found to migrate');
        return this.finalizeReport();
      }

      // Step 4: Create backup
      const backupFile = await this.createBackup(credentials);
      this.report.backupFile = backupFile;

      if (this.backupOnly) {
        logger.info('Backup-only mode - skipping migration');
        return this.finalizeReport();
      }

      // Step 5: Migrate credentials
      if (!this.dryRun) {
        await this.migrateCredentials(credentials);
      } else {
        logger.info('Dry-run mode - simulating migration');
        await this.simulateMigration(credentials);
      }

      // Step 6: Verify migration
      if (!this.dryRun) {
        await this.verifyMigration();
      }

      return this.finalizeReport();
    } catch (error) {
      logger.error('Migration failed', error);
      this.report.errors.push({
        credential: 'MIGRATION_PROCESS',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return this.finalizeReport();
    }
  }

  /**
   * Initialize encryption service
   */
  private async initializeEncryption(): Promise<void> {
    console.log('🔍 Initializing encryption service...');

    const setupValid = await encryption.validateSetup();
    if (!setupValid.valid) {
      throw new Error(`Encryption setup invalid: ${setupValid.errors?.join(', ')}`);
    }

    console.log('✅ Encryption service initialized (AES-256-GCM)');
  }

  /**
   * Create backup directory
   */
  private async createBackupDirectory(): Promise<void> {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info('Created backup directory', { path: this.backupDir });
    }
  }

  /**
   * Load existing credentials from database (Prisma)
   */
  private async loadExistingCredentials(): Promise<PlainCredential[]> {
    console.log('📊 Loading credentials from database...');

    const credentials = await prisma.credential.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        data: true,
        isEncrypted: true,
        encryptionVersion: true
      }
    });

    console.log(`   Found ${credentials.length} credentials`);

    const unencrypted = credentials.filter(c => !c.isEncrypted || c.encryptionVersion !== 'v1');
    console.log(`   ${unencrypted.length} need encryption`);
    console.log(`   ${credentials.length - unencrypted.length} already encrypted`);

    return credentials.map(cred => ({
      id: cred.id,
      type: cred.type,
      name: cred.name,
      data: typeof cred.data === 'string' ? JSON.parse(cred.data) : cred.data as Record<string, unknown>
    }));
  }


  /**
   * Create backup of credentials
   */
  private async createBackup(credentials: PlainCredential[]): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `credentials-backup-${timestamp}.json`);

    const backup = {
      timestamp,
      credentialCount: credentials.length,
      credentials,
      metadata: {
        version: '2.0.0',
        encryptionAlgorithm: 'aes-256-gcm',
        note: 'Backup created before credential encryption migration'
      }
    };

    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), { mode: 0o600 });

    console.log(`✅ Backup created: ${backupFile}`);
    console.log(`   Secured with file permissions 0600 (owner read/write only)`);

    return backupFile;
  }

  /**
   * Migrate credentials to encrypted storage
   */
  private async migrateCredentials(credentials: PlainCredential[]): Promise<void> {
    console.log('🔄 Starting credential migration...\n');

    for (const cred of credentials) {
      try {
        if (!cred.id) {
          throw new Error('Credential ID is required');
        }

        // Get current credential from database
        const current = await prisma.credential.findUnique({
          where: { id: cred.id }
        });

        if (!current) {
          throw new Error('Credential not found in database');
        }

        // Skip if already encrypted with current version
        if (current.isEncrypted && current.encryptionVersion === 'v1') {
          console.log(`   ⏭️  Skipped (already encrypted): ${cred.name}`);
          this.report.successfulMigrations++;
          continue;
        }

        // Encrypt the credential data
        const encryptedData = await encryption.encryptCredential(cred.data);

        // Update with encrypted data
        await prisma.credential.update({
          where: { id: cred.id },
          data: {
            data: encryptedData,
            isEncrypted: true,
            encryptionVersion: 'v1',
            updatedAt: new Date()
          }
        });

        this.report.successfulMigrations++;
        console.log(`   ✅ Encrypted: ${cred.name} (${cred.type})`);
      } catch (error) {
        this.report.failedMigrations++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.report.errors.push({
          credential: cred.name,
          error: errorMessage
        });
        console.log(`   ❌ Failed: ${cred.name} - ${errorMessage}`);
      }
    }

    console.log(`\n📊 Migration completed: ${this.report.successfulMigrations} successful, ${this.report.failedMigrations} failed`);
  }

  /**
   * Simulate migration (dry run)
   */
  private async simulateMigration(credentials: PlainCredential[]): Promise<void> {
    console.log('🧪 Simulating credential migration (DRY RUN)...\n');

    for (const cred of credentials) {
      try {
        if (!cred.id) {
          throw new Error('Credential ID is required');
        }

        // Get current credential from database
        const current = await prisma.credential.findUnique({
          where: { id: cred.id }
        });

        if (!current) {
          throw new Error('Credential not found in database');
        }

        // Skip if already encrypted
        if (current.isEncrypted && current.encryptionVersion === 'v1') {
          console.log(`   ⏭️  [DRY RUN] Would skip (already encrypted): ${cred.name}`);
          this.report.successfulMigrations++;
          continue;
        }

        // Test encryption without saving
        await encryption.encryptCredential(cred.data);

        this.report.successfulMigrations++;
        console.log(`   ✅ [DRY RUN] Would encrypt: ${cred.name} (${cred.type})`);
      } catch (error) {
        this.report.failedMigrations++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.report.errors.push({
          credential: cred.name,
          error: errorMessage
        });
        console.log(`   ❌ [DRY RUN] Would fail: ${cred.name} - ${errorMessage}`);
      }
    }

    console.log(`\n🧪 [DRY RUN] Simulation completed: ${this.report.successfulMigrations} would succeed, ${this.report.failedMigrations} would fail`);
  }

  /**
   * Verify migration
   */
  private async verifyMigration(): Promise<void> {
    console.log('\n🔍 Verifying migration...');

    const stats = await repository.getEncryptionStats();

    console.log(`   Total credentials: ${stats.total}`);
    console.log(`   Encrypted: ${stats.encrypted}`);
    console.log(`   Unencrypted: ${stats.unencrypted}`);
    console.log(`   By version:`, stats.byVersion);

    if (stats.unencrypted > 0) {
      console.log(`   ⚠️  Warning: ${stats.unencrypted} credentials remain unencrypted`);
    } else {
      console.log(`   ✅ All credentials are encrypted`);
    }
  }

  /**
   * Finalize report
   */
  private finalizeReport(): MigrationReport {
    this.report.endTime = new Date().toISOString();

    // Calculate duration
    const duration = new Date(this.report.endTime).getTime() -
      new Date(this.report.startTime).getTime();

    const successRate = this.report.totalCredentials > 0
      ? (this.report.successfulMigrations / this.report.totalCredentials * 100).toFixed(2) + '%'
      : 'N/A';

    console.log(`\n📊 Success rate: ${successRate}`);
    console.log(`⏱️  Duration: ${duration}ms`);

    // Save report to file
    const reportFile = path.join(
      this.backupDir,
      `migration-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );

    fs.writeFileSync(reportFile, JSON.stringify({
      ...this.report,
      durationMs: duration,
      successRate
    }, null, 2), { mode: 0o600 });

    console.log(`📄 Report saved: ${reportFile}\n`);

    return this.report;
  }

  /**
   * Rollback migration
   */
  async rollback(backupFile: string): Promise<void> {
    console.log('🔄 Rolling back migration...');
    console.log(`   Backup file: ${backupFile}`);

    try {
      if (!fs.existsSync(backupFile)) {
        throw new Error('Backup file not found');
      }

      const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

      if (!backup.credentials || !Array.isArray(backup.credentials)) {
        throw new Error('Invalid backup file format');
      }

      console.log(`   Restoring ${backup.credentials.length} credentials...`);

      for (const cred of backup.credentials) {
        if (!cred.id) continue;

        try {
          await prisma.credential.update({
            where: { id: cred.id },
            data: {
              data: JSON.stringify(cred.data),
              isEncrypted: false,
              encryptionVersion: 'none',
              updatedAt: new Date()
            }
          });

          console.log(`   ✅ Restored: ${cred.name}`);
        } catch (error) {
          console.log(`   ❌ Failed to restore: ${cred.name}`);
        }
      }

      console.log('✅ Rollback complete\n');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
}

// CLI execution
async function main() {
  try {
    const args = process.argv.slice(2);
    const options = {
      dryRun: args.includes('--dry-run'),
      backupOnly: args.includes('--backup-only')
    };

    console.log('\n' + '='.repeat(80));
    console.log('🔐  CREDENTIAL ENCRYPTION MIGRATION');
    console.log('='.repeat(80));
    console.log('');

    if (options.dryRun) {
      console.log('🧪 DRY RUN MODE - No changes will be made');
    }

    if (options.backupOnly) {
      console.log('📦 BACKUP ONLY MODE - Only creating backup');
    }

    // Validate environment
    if (!process.env.ENCRYPTION_KEY || !process.env.ENCRYPTION_SALT) {
      console.error('❌ ERROR: ENCRYPTION_KEY and ENCRYPTION_SALT must be set in .env');
      console.error('   Generate keys with: npm run generate:keys\n');
      process.exit(1);
    }

    console.log('');

    const migrator = new CredentialMigrator(options);
    const report = await migrator.migrate();

    console.log('');
    console.log('='.repeat(80));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Credentials:     ${report.totalCredentials}`);
    console.log(`Successful Migrations: ${report.successfulMigrations}`);
    console.log(`Failed Migrations:     ${report.failedMigrations}`);
    console.log(`Backup File:           ${report.backupFile}`);

    if (report.errors.length > 0) {
      console.log('');
      console.log('❌ ERRORS:');
      report.errors.forEach(err => {
        console.log(`   - ${err.credential}: ${err.error}`);
      });
    }

    console.log('='.repeat(80) + '\n');

    // Disconnect Prisma
    await prisma.$disconnect();

    // Exit with error code if there were failures
    process.exit(report.failedMigrations > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { CredentialMigrator, type MigrationReport };
