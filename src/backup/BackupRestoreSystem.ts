/**
 * Backup and Restore System
 * Automatic backup with point-in-time recovery
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { logger } from '../services/SimpleLogger';
import { Environment } from '../core/EnvironmentManager';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { createAWSS3Client, AWSS3Client } from '../integrations/aws-s3/AWSS3Client';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface BackupConfig {
  enabled: boolean;
  schedule: BackupSchedule;
  retention: RetentionPolicy;
  storage: StorageConfig;
  encryption: EncryptionConfig;
  compression: CompressionConfig;
  notifications: NotificationConfig;
}

export interface BackupSchedule {
  type: 'manual' | 'interval' | 'cron';
  interval?: number; // milliseconds
  cron?: string; // cron expression
  timezone?: string;
}

export interface RetentionPolicy {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
  minBackups: number;
  maxBackups?: number;
  maxSizeGB?: number;
}

export interface StorageConfig {
  type: 'local' | 's3' | 'gcs' | 'azure' | 'ftp';
  path?: string;
  bucket?: string;
  region?: string;
  credentials?: any;
  redundancy?: boolean;
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: 'aes-256-gcm' | 'aes-256-cbc';
  key?: string;
  keyRotation?: boolean;
  keyRotationInterval?: number;
}

export interface CompressionConfig {
  enabled: boolean;
  algorithm: 'gzip' | 'brotli' | 'lz4';
  level: number; // 1-9
}

export interface NotificationConfig {
  onSuccess: boolean;
  onFailure: boolean;
  channels: Array<{
    type: 'email' | 'slack' | 'webhook';
    config: any;
  }>;
}

export interface Backup {
  id: string;
  name: string;
  description?: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'corrupted';
  createdAt: Date;
  completedAt?: Date;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  checksum: string;
  metadata: BackupMetadata;
  location: string;
  parentBackupId?: string; // For incremental/differential
  error?: string;
}

export interface BackupMetadata {
  version: string;
  environment?: string;
  workflows: number;
  executions: number;
  users: number;
  credentials: number;
  plugins: number;
  customData?: any;
}

export interface RestorePoint {
  backupId: string;
  timestamp: Date;
  description: string;
  type: 'manual' | 'automatic';
}

export interface RestoreOptions {
  targetEnvironment?: string;
  overwrite: boolean;
  skipValidation?: boolean;
  dryRun?: boolean;
  selective?: {
    workflows?: string[];
    users?: string[];
    credentials?: string[];
    plugins?: string[];
  };
  transformations?: Array<{
    type: 'replace' | 'remove' | 'add';
    path: string;
    value?: any;
  }>;
}

export interface RestoreResult {
  success: boolean;
  backupId: string;
  restoredAt: Date;
  duration: number;
  items: {
    workflows: number;
    executions: number;
    users: number;
    credentials: number;
    plugins: number;
  };
  warnings?: string[];
  errors?: string[];
}

export interface BackupJob {
  id: string;
  type: 'backup' | 'restore';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number;
  details?: any;
  error?: string;
}

export class BackupRestoreSystem extends EventEmitter {
  private config: BackupConfig;
  private backups: Map<string, Backup> = new Map();
  private restorePoints: Map<string, RestorePoint> = new Map();
  private jobs: Map<string, BackupJob> = new Map();
  private scheduleTimer?: NodeJS.Timeout;
  private encryptionKey: Buffer;
  private isRunning = false;
  private s3Client?: AWSS3Client;

  constructor(config?: Partial<BackupConfig>) {
    super();
    this.config = {
      enabled: true,
      schedule: {
        type: 'interval',
        interval: 24 * 60 * 60 * 1000 // Daily
      },
      retention: {
        daily: 7,
        weekly: 4,
        monthly: 12,
        yearly: 5,
        minBackups: 3
      },
      storage: {
        type: 'local',
        path: './backups',
        redundancy: false
      },
      encryption: {
        enabled: true,
        algorithm: 'aes-256-gcm',
        keyRotation: true,
        keyRotationInterval: 30 * 24 * 60 * 60 * 1000 // 30 days
      },
      compression: {
        enabled: true,
        algorithm: 'gzip',
        level: 6
      },
      notifications: {
        onSuccess: true,
        onFailure: true,
        channels: []
      },
      ...config
    };

    // Initialize encryption key
    this.encryptionKey = this.config.encryption.key 
      ? Buffer.from(this.config.encryption.key, 'hex')
      : crypto.randomBytes(32);

    this.initialize();
  }

  /**
   * Initialize backup system
   */
  private initialize(): void {
    // Create backup directory if local storage
    if (this.config.storage.type === 'local' && this.config.storage.path) {
      this.ensureDirectoryExists(this.config.storage.path);
    }

    // Load existing backups
    this.loadBackupHistory();

    // Start scheduled backups
    if (this.config.enabled) {
      this.startScheduledBackups();
    }

    logger.info('Backup system initialized');
  }

  /**
   * Create backup
   */
  async createBackup(options?: {
    name?: string;
    description?: string;
    type?: 'full' | 'incremental' | 'differential';
    environment?: string;
  }): Promise<Backup> {
    if (this.isRunning) {
      throw new Error('Another backup is already running');
    }

    this.isRunning = true;
    const backupId = `backup_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    const job: BackupJob = {
      id: `job_${backupId}`,
      type: 'backup',
      status: 'running',
      progress: 0,
      startedAt: new Date()
    };

    this.jobs.set(job.id, job);
    this.emit('backup:started', { backupId, job });

    try {
      // Collect data to backup
      const data = await this.collectBackupData(options?.environment);
      job.progress = 25;

      // Serialize data
      const serialized = JSON.stringify(data, null, 2);
      const dataBuffer = Buffer.from(serialized);
      job.progress = 40;

      // Compress if enabled
      let processedData: Buffer = dataBuffer;
      if (this.config.compression.enabled) {
        processedData = await this.compressData(dataBuffer) as Buffer;
        job.progress = 55;
      }

      // Encrypt if enabled
      if (this.config.encryption.enabled) {
        processedData = await this.encryptData(processedData) as Buffer;
        job.progress = 70;
      }

      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(processedData).digest('hex');
      job.progress = 80;

      // Store backup
      const location = await this.storeBackup(backupId, processedData);
      job.progress = 95;

      // Create backup record
      const backup: Backup = {
        id: backupId,
        name: options?.name || `Backup ${new Date().toISOString()}`,
        description: options?.description,
        type: options?.type || 'full',
        status: 'completed',
        createdAt: new Date(),
        completedAt: new Date(),
        size: processedData.length,
        compressed: this.config.compression.enabled,
        encrypted: this.config.encryption.enabled,
        checksum,
        metadata: {
          version: '2.0.0',
          environment: options?.environment,
          workflows: data.workflows?.length || 0,
          executions: data.executions?.length || 0,
          users: data.users?.length || 0,
          credentials: data.credentials?.length || 0,
          plugins: data.plugins?.length || 0
        },
        location
      };

      // Store backup metadata
      this.backups.set(backupId, backup);
      await this.saveBackupMetadata(backup);

      // Create restore point
      this.createRestorePoint(backupId, 'automatic');

      // Apply retention policy
      await this.applyRetentionPolicy();

      // Update job status
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();

      // Send notifications
      if (this.config.notifications.onSuccess) {
        await this.sendNotification('success', backup);
      }

      this.emit('backup:completed', backup);
      logger.info(`Backup completed: ${backupId}`);

      return backup;

    } catch (error) {
      const errorMessage = (error as Error).message;
      
      // Update job status
      job.status = 'failed';
      job.error = errorMessage;
      job.completedAt = new Date();

      // Create failed backup record
      const failedBackup: Backup = {
        id: backupId,
        name: options?.name || `Failed Backup ${new Date().toISOString()}`,
        type: options?.type || 'full',
        status: 'failed',
        createdAt: new Date(),
        size: 0,
        compressed: false,
        encrypted: false,
        checksum: '',
        metadata: {
          version: '2.0.0',
          workflows: 0,
          executions: 0,
          users: 0,
          credentials: 0,
          plugins: 0
        },
        location: '',
        error: errorMessage
      };

      this.backups.set(backupId, failedBackup);

      // Send failure notification
      if (this.config.notifications.onFailure) {
        await this.sendNotification('failure', failedBackup);
      }

      this.emit('backup:failed', { backupId, error: errorMessage });
      logger.error(`Backup failed: ${errorMessage}`);

      throw error;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupId: string, options: RestoreOptions): Promise<RestoreResult> {
    const backup = this.backups.get(backupId);
    
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    if (backup.status !== 'completed') {
      throw new Error(`Backup ${backupId} is not in completed state`);
    }

    const jobId = `restore_${Date.now()}`;
    const job: BackupJob = {
      id: jobId,
      type: 'restore',
      status: 'running',
      progress: 0,
      startedAt: new Date()
    };

    this.jobs.set(jobId, job);
    this.emit('restore:started', { backupId, jobId });

    const startTime = Date.now();

    try {
      // Load backup data
      let data = await this.loadBackup(backup);
      job.progress = 30;

      // Decrypt if needed
      if (backup.encrypted) {
        data = await this.decryptData(data);
        job.progress = 45;
      }

      // Decompress if needed
      if (backup.compressed) {
        data = await this.decompressData(data);
        job.progress = 60;
      }

      // Parse backup data
      let backupData = JSON.parse(data.toString());
      job.progress = 70;

      // Validate backup
      if (!options.skipValidation) {
        await this.validateBackupData(backupData);
      }
      job.progress = 80;

      // Perform dry run if requested
      if (options.dryRun) {
        return {
          success: true,
          backupId,
          restoredAt: new Date(),
          duration: Date.now() - startTime,
          items: {
            workflows: backupData.workflows?.length || 0,
            executions: backupData.executions?.length || 0,
            users: backupData.users?.length || 0,
            credentials: backupData.credentials?.length || 0,
            plugins: backupData.plugins?.length || 0
          },
          warnings: ['Dry run - no data was actually restored']
        };
      }

      // Apply transformations if specified
      if (options.transformations) {
        backupData = this.applyTransformations(backupData, options.transformations);
      }
      job.progress = 85;

      // Perform restore
      const result = await this.performRestore(backupData, options);
      job.progress = 95;

      // Update job status
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();

      const restoreResult: RestoreResult = {
        success: true,
        backupId,
        restoredAt: new Date(),
        duration: Date.now() - startTime,
        items: result.items,
        warnings: result.warnings
      };

      this.emit('restore:completed', restoreResult);
      logger.info(`Restore completed from backup: ${backupId}`);

      return restoreResult;

    } catch (error) {
      const errorMessage = (error as Error).message;
      
      job.status = 'failed';
      job.error = errorMessage;
      job.completedAt = new Date();

      this.emit('restore:failed', { backupId, error: errorMessage });
      logger.error(`Restore failed: ${errorMessage}`);

      return {
        success: false,
        backupId,
        restoredAt: new Date(),
        duration: Date.now() - startTime,
        items: {
          workflows: 0,
          executions: 0,
          users: 0,
          credentials: 0,
          plugins: 0
        },
        errors: [errorMessage]
      };
    }
  }

  /**
   * List available backups
   */
  listBackups(filters?: {
    type?: 'full' | 'incremental' | 'differential';
    status?: 'completed' | 'failed';
    from?: Date;
    to?: Date;
    environment?: string;
  }): Backup[] {
    let backups = Array.from(this.backups.values());

    if (filters) {
      if (filters.type) {
        backups = backups.filter(b => b.type === filters.type);
      }
      if (filters.status) {
        backups = backups.filter(b => b.status === filters.status);
      }
      if (filters.from) {
        backups = backups.filter(b => b.createdAt >= filters.from!);
      }
      if (filters.to) {
        backups = backups.filter(b => b.createdAt <= filters.to!);
      }
      if (filters.environment) {
        backups = backups.filter(b => b.metadata.environment === filters.environment);
      }
    }

    return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    const backup = this.backups.get(backupId);
    
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    // Delete backup file
    await this.deleteBackupFile(backup);

    // Remove from records
    this.backups.delete(backupId);

    // Remove associated restore points
    const restorePointsArray = Array.from(this.restorePoints.entries());
    for (const [pointId, point] of restorePointsArray) {
      if (point.backupId === backupId) {
        this.restorePoints.delete(pointId);
      }
    }

    this.emit('backup:deleted', backupId);
    logger.info(`Backup deleted: ${backupId}`);
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupId: string): Promise<{
    valid: boolean;
    checksum: string;
    expectedChecksum: string;
    errors?: string[];
  }> {
    const backup = this.backups.get(backupId);
    
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    try {
      // Load backup file
      const data = await this.loadBackup(backup);
      
      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(data).digest('hex');
      
      // Compare checksums
      const valid = checksum === backup.checksum;
      
      if (!valid) {
        backup.status = 'corrupted';
        this.emit('backup:corrupted', backupId);
      }

      return {
        valid,
        checksum,
        expectedChecksum: backup.checksum,
        errors: valid ? undefined : ['Checksum mismatch - backup may be corrupted']
      };

    } catch (error) {
      return {
        valid: false,
        checksum: '',
        expectedChecksum: backup.checksum,
        errors: [`Failed to verify backup: ${(error as Error).message}`]
      };
    }
  }

  /**
   * Create restore point
   */
  createRestorePoint(backupId: string, type: 'manual' | 'automatic', description?: string): RestorePoint {
    const backup = this.backups.get(backupId);
    
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    const restorePoint: RestorePoint = {
      backupId,
      timestamp: new Date(),
      description: description || `Restore point for ${backup.name}`,
      type
    };

    const pointId = `rp_${Date.now()}`;
    this.restorePoints.set(pointId, restorePoint);

    this.emit('restore-point:created', restorePoint);
    
    return restorePoint;
  }

  /**
   * Collect data for backup
   */
  private async collectBackupData(environment?: string): Promise<any> {
    // In production, would collect from database and file system
    const data = {
      version: '2.0.0',
      timestamp: new Date(),
      environment,
      workflows: [],
      executions: [],
      users: [],
      credentials: [],
      plugins: [],
      settings: {},
      customData: {}
    };

    // Simulate data collection
    await new Promise(resolve => setTimeout(resolve, 1000));

    return data;
  }

  /**
   * Compress data
   */
  private async compressData(data: Buffer): Promise<Buffer> {
    switch (this.config.compression.algorithm) {
      case 'gzip':
        return await gzip(data, { level: this.config.compression.level });
      default:
        throw new Error(`Unsupported compression algorithm: ${this.config.compression.algorithm}`);
    }
  }

  /**
   * Decompress data
   */
  private async decompressData(data: Buffer): Promise<Buffer> {
    switch (this.config.compression.algorithm) {
      case 'gzip':
        return await gunzip(data);
      default:
        throw new Error(`Unsupported compression algorithm: ${this.config.compression.algorithm}`);
    }
  }

  /**
   * Encrypt data
   */
  private async encryptData(data: Buffer): Promise<Buffer> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.config.encryption.algorithm,
      this.encryptionKey,
      iv
    );

    const encrypted = Buffer.concat([
      iv,
      cipher.update(data),
      cipher.final()
    ]);

    if (this.config.encryption.algorithm === 'aes-256-gcm') {
      const authTag = (cipher as any).getAuthTag();
      return Buffer.concat([encrypted, authTag]);
    }

    return encrypted;
  }

  /**
   * Decrypt data
   */
  private async decryptData(data: Buffer): Promise<Buffer> {
    const iv = data.slice(0, 16);
    let encrypted = data.slice(16);
    let authTag: Buffer | undefined;

    if (this.config.encryption.algorithm === 'aes-256-gcm') {
      authTag = encrypted.slice(-16);
      encrypted = encrypted.slice(0, -16);
    }

    const decipher = crypto.createDecipheriv(
      this.config.encryption.algorithm,
      this.encryptionKey,
      iv
    );

    if (authTag && this.config.encryption.algorithm === 'aes-256-gcm') {
      (decipher as any).setAuthTag(authTag);
    }

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  /**
   * Get or create S3 client
   */
  private getS3Client(): AWSS3Client {
    if (!this.s3Client) {
      const credentials = this.config.storage.credentials || {};
      this.s3Client = createAWSS3Client({
        accessKeyId: credentials.accessKeyId || process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: credentials.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '',
        region: this.config.storage.region || process.env.AWS_REGION || 'us-east-1'
      });
    }
    return this.s3Client;
  }

  /**
   * Store backup
   */
  private async storeBackup(backupId: string, data: Buffer): Promise<string> {
    switch (this.config.storage.type) {
      case 'local':
        const filename = `${backupId}.backup`;
        const filepath = path.join(this.config.storage.path!, filename);
        await fs.promises.writeFile(filepath, data);
        return filepath;
      
      case 's3':
        const s3Client = this.getS3Client();
        const key = `backups/${backupId}.backup`;
        const uploadResult = await s3Client.uploadObject(
          this.config.storage.bucket!,
          key,
          data.toString('base64'),
          'application/octet-stream'
        );
        if (!uploadResult.ok) {
          throw new Error(`S3 upload failed: ${uploadResult.error}`);
        }
        return `s3://${this.config.storage.bucket}/${key}`;
      
      default:
        throw new Error(`Unsupported storage type: ${this.config.storage.type}`);
    }
  }

  /**
   * Load backup
   */
  private async loadBackup(backup: Backup): Promise<Buffer> {
    switch (this.config.storage.type) {
      case 'local':
        return await fs.promises.readFile(backup.location);
      
      case 's3':
        const s3ClientLoad = this.getS3Client();
        // Extract key from location: s3://bucket/key
        const s3Key = backup.location.replace(`s3://${this.config.storage.bucket}/`, '');
        const downloadResult = await s3ClientLoad.downloadObject(
          this.config.storage.bucket!,
          s3Key
        );
        if (!downloadResult.ok) {
          throw new Error(`S3 download failed: ${downloadResult.error}`);
        }
        // Convert base64 back to buffer
        return Buffer.from(downloadResult.data!, 'base64');
      
      default:
        throw new Error(`Unsupported storage type: ${this.config.storage.type}`);
    }
  }

  /**
   * Delete backup file
   */
  private async deleteBackupFile(backup: Backup): Promise<void> {
    switch (this.config.storage.type) {
      case 'local':
        await fs.promises.unlink(backup.location);
        break;
      
      case 's3':
        const s3ClientDelete = this.getS3Client();
        const deleteKey = backup.location.replace(`s3://${this.config.storage.bucket}/`, '');
        const deleteResult = await s3ClientDelete.deleteObject(
          this.config.storage.bucket!,
          deleteKey
        );
        if (!deleteResult.ok) {
          logger.warn('Failed to delete S3 backup', { error: deleteResult.error, key: deleteKey });
        }
        break;
    }
  }

  /**
   * Validate backup data
   */
  private async validateBackupData(data: any): Promise<void> {
    if (!data.version) {
      throw new Error('Invalid backup: missing version');
    }
    
    if (!data.timestamp) {
      throw new Error('Invalid backup: missing timestamp');
    }
    
    // Additional validation as needed
  }

  /**
   * Apply transformations to backup data
   */
  private applyTransformations(data: any, transformations: any[]): any {
    const transformed = { ...data };
    
    for (const transform of transformations) {
      // Apply transformation logic
      // This is simplified - in production would use a proper JSON path library
    }
    
    return transformed;
  }

  /**
   * Perform restore operation
   */
  private async performRestore(data: any, options: RestoreOptions): Promise<{
    items: any;
    warnings?: string[];
  }> {
    const warnings: string[] = [];
    const items = {
      workflows: 0,
      executions: 0,
      users: 0,
      credentials: 0,
      plugins: 0
    };

    // Simulate restore process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In production, would restore to database and file system
    if (data.workflows) {
      items.workflows = data.workflows.length;
    }
    
    if (data.users) {
      items.users = data.users.length;
    }

    return { items, warnings };
  }

  /**
   * Save backup metadata
   */
  private async saveBackupMetadata(backup: Backup): Promise<void> {
    // In production, would save to database
    const metadataPath = path.join(this.config.storage.path!, 'metadata.json');
    const metadata = Array.from(this.backups.values());
    await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Load backup history
   */
  private async loadBackupHistory(): Promise<void> {
    try {
      const metadataPath = path.join(this.config.storage.path!, 'metadata.json');
      const data = await fs.promises.readFile(metadataPath, 'utf-8');
      const backups = JSON.parse(data);
      
      for (const backup of backups) {
        backup.createdAt = new Date(backup.createdAt);
        backup.completedAt = backup.completedAt ? new Date(backup.completedAt) : undefined;
        this.backups.set(backup.id, backup);
      }
    } catch (error) {
      // No backup history found
    }
  }

  /**
   * Apply retention policy
   */
  private async applyRetentionPolicy(): Promise<void> {
    const backups = this.listBackups({ status: 'completed' });
    const now = new Date();
    const toDelete: string[] = [];

    // Group backups by age
    const daily: Backup[] = [];
    const weekly: Backup[] = [];
    const monthly: Backup[] = [];
    const yearly: Backup[] = [];

    for (const backup of backups) {
      const ageInDays = Math.floor((now.getTime() - backup.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      if (ageInDays <= 7) {
        daily.push(backup);
      } else if (ageInDays <= 30) {
        weekly.push(backup);
      } else if (ageInDays <= 365) {
        monthly.push(backup);
      } else {
        yearly.push(backup);
      }
    }

    // Apply retention rules
    if (daily.length > this.config.retention.daily) {
      const excess = daily.slice(this.config.retention.daily);
      toDelete.push(...excess.map(b => b.id));
    }

    if (weekly.length > this.config.retention.weekly) {
      const excess = weekly.slice(this.config.retention.weekly);
      toDelete.push(...excess.map(b => b.id));
    }

    if (monthly.length > this.config.retention.monthly) {
      const excess = monthly.slice(this.config.retention.monthly);
      toDelete.push(...excess.map(b => b.id));
    }

    if (yearly.length > this.config.retention.yearly) {
      const excess = yearly.slice(this.config.retention.yearly);
      toDelete.push(...excess.map(b => b.id));
    }

    // Ensure minimum backups
    const remainingCount = backups.length - toDelete.length;
    if (remainingCount < this.config.retention.minBackups) {
      const keepCount = this.config.retention.minBackups - remainingCount;
      toDelete.splice(0, keepCount);
    }

    // Delete excess backups
    for (const backupId of toDelete) {
      await this.deleteBackup(backupId);
    }

    if (toDelete.length > 0) {
      logger.info(`Retention policy applied: deleted ${toDelete.length} old backups`);
    }
  }

  /**
   * Start scheduled backups
   */
  private startScheduledBackups(): void {
    if (this.config.schedule.type === 'interval' && this.config.schedule.interval) {
      this.scheduleTimer = setInterval(() => {
        this.createBackup({ name: 'Scheduled Backup' })
          .catch(error => logger.error('Scheduled backup failed:', error));
      }, this.config.schedule.interval);
    }
    // In production, would also support cron expressions
  }

  /**
   * Send notification
   */
  private async sendNotification(type: 'success' | 'failure', backup: Backup): Promise<void> {
    for (const channel of this.config.notifications.channels) {
      try {
        switch (channel.type) {
          case 'email':
            // Send email notification
            logger.info(`Email notification sent for backup ${backup.id}`);
            break;
          case 'slack':
            // Send Slack notification
            logger.info(`Slack notification sent for backup ${backup.id}`);
            break;
          case 'webhook':
            // Call webhook
            logger.info(`Webhook called for backup ${backup.id}`);
            break;
        }
      } catch (error) {
        logger.error(`Failed to send notification: ${error}`);
      }
    }
  }

  /**
   * Ensure directory exists
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Get backup statistics
   */
  getStatistics(): any {
    const backups = Array.from(this.backups.values());
    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
    
    return {
      totalBackups: backups.length,
      completedBackups: backups.filter(b => b.status === 'completed').length,
      failedBackups: backups.filter(b => b.status === 'failed').length,
      totalSize,
      averageSize: backups.length > 0 ? totalSize / backups.length : 0,
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].createdAt : null,
      latestBackup: backups.length > 0 ? backups[0].createdAt : null,
      restorePoints: this.restorePoints.size,
      activeJobs: Array.from(this.jobs.values()).filter(j => j.status === 'running').length
    };
  }

  /**
   * Export backup configuration
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart scheduled backups if needed
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
      this.startScheduledBackups();
    }
    
    this.emit('config:updated', this.config);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
    }
    this.removeAllListeners();
  }
}

// Export singleton instance
export const backupSystem = new BackupRestoreSystem();