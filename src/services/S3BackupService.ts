/**
 * S3 Backup Service
 * Provides cloud backup functionality with AWS S3 as primary storage
 * and IndexedDB as browser fallback
 *
 * @layer Layer 2 (Storage)
 */

import { logger } from './SimpleLogger';
import { EventEmitter } from 'events';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string; // For S3-compatible services (MinIO, DigitalOcean Spaces)
  forcePathStyle?: boolean;
}

export interface BackupResult {
  success: boolean;
  key?: string;
  etag?: string;
  versionId?: string;
  size?: number;
  error?: string;
  timestamp?: Date;
}

export interface BackupMetadata {
  key: string;
  size: number;
  lastModified: Date;
  etag?: string;
  versionId?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface RestoreResult {
  success: boolean;
  data?: unknown;
  metadata?: BackupMetadata;
  error?: string;
}

export interface ListBackupsOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
  startAfter?: string;
}

export interface ListBackupsResult {
  backups: BackupMetadata[];
  isTruncated: boolean;
  continuationToken?: string;
  keyCount: number;
}

export interface BackupStats {
  totalBackups: number;
  totalSize: number;
  oldestBackup?: Date;
  newestBackup?: Date;
  avgSize: number;
}

// ============================================================================
// S3 Backup Service Implementation
// ============================================================================

export class S3BackupService extends EventEmitter {
  private static instance: S3BackupService;
  private config: S3Config;
  private s3Client: unknown = null;
  private isInitialized = false;
  private useIndexedDB = false;

  private constructor() {
    super();
    this.config = {
      bucket: import.meta.env?.VITE_S3_BUCKET || process.env.AWS_S3_BUCKET || 'workflow-backups',
      region: import.meta.env?.VITE_AWS_REGION || process.env.AWS_REGION || 'us-east-1',
      accessKeyId: import.meta.env?.VITE_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env?.VITE_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
      endpoint: import.meta.env?.VITE_S3_ENDPOINT || process.env.S3_ENDPOINT,
      forcePathStyle: Boolean(import.meta.env?.VITE_S3_FORCE_PATH_STYLE || process.env.S3_FORCE_PATH_STYLE),
    };
  }

  public static getInstance(): S3BackupService {
    if (!S3BackupService.instance) {
      S3BackupService.instance = new S3BackupService();
    }
    return S3BackupService.instance;
  }

  /**
   * Initialize the S3 client
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Try to import AWS SDK v3
      const { S3Client } = await import('@aws-sdk/client-s3');

      const clientConfig: Record<string, unknown> = {
        region: this.config.region,
      };

      if (this.config.accessKeyId && this.config.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        };
      }

      if (this.config.endpoint) {
        clientConfig.endpoint = this.config.endpoint;
        clientConfig.forcePathStyle = this.config.forcePathStyle;
      }

      this.s3Client = new S3Client(clientConfig);
      this.useIndexedDB = false;
      this.isInitialized = true;
      logger.info('S3BackupService initialized with AWS S3');
    } catch (error) {
      // Fallback to IndexedDB for browser environments
      logger.warn('AWS SDK not available, using IndexedDB fallback', { error });
      this.useIndexedDB = true;
      this.isInitialized = true;
    }
  }

  /**
   * Update S3 configuration
   */
  updateConfig(config: Partial<S3Config>): void {
    this.config = { ...this.config, ...config };
    this.isInitialized = false;
    this.s3Client = null;
    logger.info('S3BackupService configuration updated');
  }

  /**
   * Create a backup
   */
  async backup(data: unknown, key: string, metadata?: Record<string, string>): Promise<BackupResult> {
    await this.initialize();

    const serializedData = JSON.stringify(data);
    const size = new Blob([serializedData]).size;

    if (this.useIndexedDB) {
      return this.backupToIndexedDB(serializedData, key, size, metadata);
    }

    return this.backupToS3(serializedData, key, size, metadata);
  }

  /**
   * Backup to AWS S3
   */
  private async backupToS3(
    data: string,
    key: string,
    size: number,
    metadata?: Record<string, string>
  ): Promise<BackupResult> {
    try {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');

      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: data,
        ContentType: 'application/json',
        Metadata: {
          ...metadata,
          'backup-timestamp': new Date().toISOString(),
          'backup-size': String(size),
        },
      });

      const response = await (this.s3Client as { send: (cmd: unknown) => Promise<{ ETag?: string; VersionId?: string }> }).send(command);

      const result: BackupResult = {
        success: true,
        key: `s3://${this.config.bucket}/${key}`,
        etag: response.ETag?.replace(/"/g, ''),
        versionId: response.VersionId,
        size,
        timestamp: new Date(),
      };

      this.emit('backup:created', result);
      logger.info('Backup created to S3', { key, size });

      return result;
    } catch (error) {
      logger.error('S3 backup failed', error);
      const result: BackupResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      this.emit('backup:failed', result);
      return result;
    }
  }

  /**
   * Backup to IndexedDB (browser fallback)
   */
  private async backupToIndexedDB(
    data: string,
    key: string,
    size: number,
    metadata?: Record<string, string>
  ): Promise<BackupResult> {
    try {
      const db = await this.openIndexedDB();

      return new Promise((resolve) => {
        const transaction = db.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');

        const backupData = {
          key,
          data,
          timestamp: new Date().toISOString(),
          size,
          metadata: metadata || {},
        };

        const request = store.put(backupData);

        request.onsuccess = () => {
          const result: BackupResult = {
            success: true,
            key: `indexeddb://workflow-backups/${key}`,
            size,
            timestamp: new Date(),
          };
          this.emit('backup:created', result);
          logger.info('Backup created to IndexedDB', { key, size });
          resolve(result);
        };

        request.onerror = () => {
          const result: BackupResult = {
            success: false,
            error: request.error?.message || 'IndexedDB write failed',
          };
          this.emit('backup:failed', result);
          resolve(result);
        };
      });
    } catch (error) {
      logger.error('IndexedDB backup failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Restore a backup
   */
  async restore(key: string): Promise<RestoreResult> {
    await this.initialize();

    if (this.useIndexedDB) {
      return this.restoreFromIndexedDB(key);
    }

    return this.restoreFromS3(key);
  }

  /**
   * Restore from AWS S3
   */
  private async restoreFromS3(key: string): Promise<RestoreResult> {
    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');

      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const response = await (this.s3Client as { send: (cmd: unknown) => Promise<{
        Body?: { transformToString: () => Promise<string> };
        ContentLength?: number;
        LastModified?: Date;
        ETag?: string;
        VersionId?: string;
        ContentType?: string;
        Metadata?: Record<string, string>;
      }> }).send(command);

      const bodyContents = await response.Body?.transformToString();
      if (!bodyContents) {
        throw new Error('Empty response body');
      }

      const data = JSON.parse(bodyContents);

      const result: RestoreResult = {
        success: true,
        data,
        metadata: {
          key,
          size: response.ContentLength || 0,
          lastModified: response.LastModified || new Date(),
          etag: response.ETag?.replace(/"/g, ''),
          versionId: response.VersionId,
          contentType: response.ContentType,
          metadata: response.Metadata,
        },
      };

      this.emit('backup:restored', result);
      logger.info('Backup restored from S3', { key });

      return result;
    } catch (error) {
      logger.error('S3 restore failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Restore from IndexedDB
   */
  private async restoreFromIndexedDB(key: string): Promise<RestoreResult> {
    try {
      const db = await this.openIndexedDB();

      return new Promise((resolve) => {
        const transaction = db.transaction(['backups'], 'readonly');
        const store = transaction.objectStore('backups');
        const request = store.get(key);

        request.onsuccess = () => {
          const backup = request.result as {
            key: string;
            data: string;
            timestamp: string;
            size: number;
            metadata?: Record<string, string>;
          } | undefined;

          if (!backup) {
            resolve({
              success: false,
              error: 'Backup not found',
            });
            return;
          }

          const result: RestoreResult = {
            success: true,
            data: JSON.parse(backup.data),
            metadata: {
              key: backup.key,
              size: backup.size,
              lastModified: new Date(backup.timestamp),
              metadata: backup.metadata,
            },
          };

          this.emit('backup:restored', result);
          logger.info('Backup restored from IndexedDB', { key });
          resolve(result);
        };

        request.onerror = () => {
          resolve({
            success: false,
            error: request.error?.message || 'IndexedDB read failed',
          });
        };
      });
    } catch (error) {
      logger.error('IndexedDB restore failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a backup
   */
  async delete(key: string): Promise<BackupResult> {
    await this.initialize();

    if (this.useIndexedDB) {
      return this.deleteFromIndexedDB(key);
    }

    return this.deleteFromS3(key);
  }

  /**
   * Delete from AWS S3
   */
  private async deleteFromS3(key: string): Promise<BackupResult> {
    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');

      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await (this.s3Client as { send: (cmd: unknown) => Promise<unknown> }).send(command);

      const result: BackupResult = {
        success: true,
        key,
        timestamp: new Date(),
      };

      this.emit('backup:deleted', result);
      logger.info('Backup deleted from S3', { key });

      return result;
    } catch (error) {
      logger.error('S3 delete failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete from IndexedDB
   */
  private async deleteFromIndexedDB(key: string): Promise<BackupResult> {
    try {
      const db = await this.openIndexedDB();

      return new Promise((resolve) => {
        const transaction = db.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');
        const request = store.delete(key);

        request.onsuccess = () => {
          const result: BackupResult = {
            success: true,
            key,
            timestamp: new Date(),
          };
          this.emit('backup:deleted', result);
          logger.info('Backup deleted from IndexedDB', { key });
          resolve(result);
        };

        request.onerror = () => {
          resolve({
            success: false,
            error: request.error?.message || 'IndexedDB delete failed',
          });
        };
      });
    } catch (error) {
      logger.error('IndexedDB delete failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * List all backups
   */
  async list(options?: ListBackupsOptions): Promise<ListBackupsResult> {
    await this.initialize();

    if (this.useIndexedDB) {
      return this.listFromIndexedDB(options);
    }

    return this.listFromS3(options);
  }

  /**
   * List from AWS S3
   */
  private async listFromS3(options?: ListBackupsOptions): Promise<ListBackupsResult> {
    try {
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');

      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: options?.prefix,
        MaxKeys: options?.maxKeys || 1000,
        ContinuationToken: options?.continuationToken,
        StartAfter: options?.startAfter,
      });

      const response = await (this.s3Client as { send: (cmd: unknown) => Promise<{
        Contents?: Array<{
          Key?: string;
          Size?: number;
          LastModified?: Date;
          ETag?: string;
        }>;
        IsTruncated?: boolean;
        NextContinuationToken?: string;
        KeyCount?: number;
      }> }).send(command);

      const backups: BackupMetadata[] = (response.Contents || []).map((obj) => ({
        key: obj.Key || '',
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        etag: obj.ETag?.replace(/"/g, ''),
      }));

      return {
        backups,
        isTruncated: response.IsTruncated || false,
        continuationToken: response.NextContinuationToken,
        keyCount: response.KeyCount || 0,
      };
    } catch (error) {
      logger.error('S3 list failed', error);
      return {
        backups: [],
        isTruncated: false,
        keyCount: 0,
      };
    }
  }

  /**
   * List from IndexedDB
   */
  private async listFromIndexedDB(options?: ListBackupsOptions): Promise<ListBackupsResult> {
    try {
      const db = await this.openIndexedDB();

      return new Promise((resolve) => {
        const transaction = db.transaction(['backups'], 'readonly');
        const store = transaction.objectStore('backups');
        const request = store.getAll();

        request.onsuccess = () => {
          let backups = (request.result as Array<{
            key: string;
            size: number;
            timestamp: string;
            metadata?: Record<string, string>;
          }>).map((item) => ({
            key: item.key,
            size: item.size,
            lastModified: new Date(item.timestamp),
            metadata: item.metadata,
          }));

          // Apply prefix filter
          if (options?.prefix) {
            backups = backups.filter((b) => b.key.startsWith(options.prefix!));
          }

          // Apply maxKeys limit
          const maxKeys = options?.maxKeys || 1000;
          const isTruncated = backups.length > maxKeys;
          if (isTruncated) {
            backups = backups.slice(0, maxKeys);
          }

          // Sort by lastModified descending
          backups.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

          resolve({
            backups,
            isTruncated,
            keyCount: backups.length,
          });
        };

        request.onerror = () => {
          resolve({
            backups: [],
            isTruncated: false,
            keyCount: 0,
          });
        };
      });
    } catch (error) {
      logger.error('IndexedDB list failed', error);
      return {
        backups: [],
        isTruncated: false,
        keyCount: 0,
      };
    }
  }

  /**
   * Get backup statistics
   */
  async getStats(prefix?: string): Promise<BackupStats> {
    const result = await this.list({ prefix, maxKeys: 10000 });

    if (result.backups.length === 0) {
      return {
        totalBackups: 0,
        totalSize: 0,
        avgSize: 0,
      };
    }

    const totalSize = result.backups.reduce((sum, b) => sum + b.size, 0);
    const dates = result.backups.map((b) => b.lastModified.getTime());

    return {
      totalBackups: result.backups.length,
      totalSize,
      oldestBackup: new Date(Math.min(...dates)),
      newestBackup: new Date(Math.max(...dates)),
      avgSize: Math.round(totalSize / result.backups.length),
    };
  }

  /**
   * Check if a backup exists
   */
  async exists(key: string): Promise<boolean> {
    await this.initialize();

    if (this.useIndexedDB) {
      const result = await this.restoreFromIndexedDB(key);
      return result.success;
    }

    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3');

      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await (this.s3Client as { send: (cmd: unknown) => Promise<unknown> }).send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a presigned URL for download (S3 only)
   */
  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string | null> {
    if (this.useIndexedDB) {
      logger.warn('Presigned URLs not supported with IndexedDB');
      return null;
    }

    await this.initialize();

    try {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');

      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client as never, command as never, { expiresIn });
      return url;
    } catch (error) {
      logger.error('Failed to generate presigned URL', error);
      return null;
    }
  }

  /**
   * Copy a backup to a new key
   */
  async copy(sourceKey: string, destinationKey: string): Promise<BackupResult> {
    await this.initialize();

    if (this.useIndexedDB) {
      // For IndexedDB, restore and re-save
      const restored = await this.restoreFromIndexedDB(sourceKey);
      if (!restored.success) {
        return { success: false, error: restored.error };
      }
      return this.backup(restored.data, destinationKey);
    }

    try {
      const { CopyObjectCommand } = await import('@aws-sdk/client-s3');

      const command = new CopyObjectCommand({
        Bucket: this.config.bucket,
        Key: destinationKey,
        CopySource: `${this.config.bucket}/${sourceKey}`,
      });

      const response = await (this.s3Client as { send: (cmd: unknown) => Promise<{
        CopyObjectResult?: { ETag?: string };
        VersionId?: string;
      }> }).send(command);

      return {
        success: true,
        key: destinationKey,
        etag: response.CopyObjectResult?.ETag?.replace(/"/g, ''),
        versionId: response.VersionId,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('S3 copy failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get storage type being used
   */
  getStorageType(): 'S3' | 'IndexedDB' {
    return this.useIndexedDB ? 'IndexedDB' : 'S3';
  }

  /**
   * Get current configuration (excluding secrets)
   */
  getConfig(): Omit<S3Config, 'accessKeyId' | 'secretAccessKey'> {
    return {
      bucket: this.config.bucket,
      region: this.config.region,
      endpoint: this.config.endpoint,
      forcePathStyle: this.config.forcePathStyle,
    };
  }

  /**
   * Open IndexedDB database
   */
  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WorkflowBackups', 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create backups store if it doesn't exist
        if (!db.objectStoreNames.contains('backups')) {
          const store = db.createObjectStore('backups', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('size', 'size', { unique: false });
        }
      };
    });
  }
}

// Export singleton instance
export const s3BackupService = S3BackupService.getInstance();
export default s3BackupService;
