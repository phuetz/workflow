/**
 * Key Management Service
 *
 * Manages encryption key lifecycle including:
 * - Key rotation (automatic and manual)
 * - Version management
 * - Key archival
 * - Audit logging
 *
 * @module security/KeyManagement
 */

import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../services/SimpleLogger';

interface KeyVersion {
  version: string;
  key: string;
  salt: string;
  createdAt: Date;
  rotatedAt?: Date;
  archivedAt?: Date;
  status: 'active' | 'archived' | 'deprecated';
}

interface RotationResult {
  success: boolean;
  oldVersion: string;
  newVersion: string;
  credentialsReencrypted: number;
  duration: number;
  errors: string[];
}

/**
 * Manages encryption keys and rotation
 */
export class KeyManagement {
  private readonly KEY_STORAGE_PATH = process.env.KEY_STORAGE_PATH || '.keys';
  private readonly ROTATION_INTERVAL_DAYS = 90; // 90 days recommended
  private keyVersions: Map<string, KeyVersion> = new Map();

  constructor() {
    this.ensureKeyStorageExists();
  }

  /**
   * Ensures key storage directory exists
   */
  private async ensureKeyStorageExists(): Promise<void> {
    try {
      await fs.access(this.KEY_STORAGE_PATH);
    } catch {
      await fs.mkdir(this.KEY_STORAGE_PATH, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Generates new encryption key and salt
   */
  generateNewKey(): { key: string; salt: string } {
    return {
      key: randomBytes(32).toString('hex'),
      salt: randomBytes(16).toString('hex')
    };
  }

  /**
   * Gets next version number
   */
  private getNextVersion(): string {
    const versions = Array.from(this.keyVersions.keys())
      .map(v => parseInt(v.replace('v', '')))
      .filter(v => !isNaN(v));

    const maxVersion = versions.length > 0 ? Math.max(...versions) : 0;
    return `v${maxVersion + 1}`;
  }

  /**
   * Registers a new key version
   */
  async registerKeyVersion(
    key: string,
    salt: string,
    version?: string
  ): Promise<string> {
    const newVersion = version || this.getNextVersion();

    const keyVersion: KeyVersion = {
      version: newVersion,
      key,
      salt,
      createdAt: new Date(),
      status: 'active'
    };

    // Store in memory
    this.keyVersions.set(newVersion, keyVersion);

    // Persist to disk (encrypted storage recommended in production)
    await this.saveKeyVersion(keyVersion);

    return newVersion;
  }

  /**
   * Saves key version to disk
   */
  private async saveKeyVersion(keyVersion: KeyVersion): Promise<void> {
    const filePath = path.join(this.KEY_STORAGE_PATH, `${keyVersion.version}.json`);

    // In production, this should be encrypted or stored in a vault
    await fs.writeFile(
      filePath,
      JSON.stringify(keyVersion, null, 2),
      { mode: 0o600 } // Read/write for owner only
    );
  }

  /**
   * Loads all key versions from disk
   */
  async loadKeyVersions(): Promise<void> {
    try {
      const files = await fs.readdir(this.KEY_STORAGE_PATH);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.KEY_STORAGE_PATH, file);
          const content = await fs.readFile(filePath, 'utf8');
          const keyVersion: KeyVersion = JSON.parse(content);

          // Convert date strings back to Date objects
          keyVersion.createdAt = new Date(keyVersion.createdAt);
          if (keyVersion.rotatedAt) {
            keyVersion.rotatedAt = new Date(keyVersion.rotatedAt);
          }
          if (keyVersion.archivedAt) {
            keyVersion.archivedAt = new Date(keyVersion.archivedAt);
          }

          this.keyVersions.set(keyVersion.version, keyVersion);
        }
      }
    } catch (error) {
      // Directory doesn't exist or is empty - that's ok
      logger.warn('No key versions found, will create new ones');
    }
  }

  /**
   * Gets active key version
   */
  getActiveKeyVersion(): KeyVersion | null {
    for (const [, keyVersion] of this.keyVersions) {
      if (keyVersion.status === 'active') {
        return keyVersion;
      }
    }
    return null;
  }

  /**
   * Gets key version by version string
   */
  getKeyVersion(version: string): KeyVersion | null {
    return this.keyVersions.get(version) || null;
  }

  /**
   * Archives old key version
   *
   * @param version - Version to archive
   * @param retentionDays - Days to keep before deletion (default: 30)
   */
  async archiveKeyVersion(version: string, retentionDays: number = 30): Promise<void> {
    const keyVersion = this.keyVersions.get(version);

    if (!keyVersion) {
      throw new Error(`Key version ${version} not found`);
    }

    if (keyVersion.status === 'active') {
      throw new Error('Cannot archive active key version');
    }

    keyVersion.status = 'archived';
    keyVersion.archivedAt = new Date();

    await this.saveKeyVersion(keyVersion);

    // Schedule deletion after retention period
    setTimeout(async () => {
      await this.deleteKeyVersion(version);
    }, retentionDays * 24 * 60 * 60 * 1000);

    logger.info(`Key version ${version} archived. Will be deleted after ${retentionDays} days.`, { version, retentionDays });
  }

  /**
   * Deletes key version (permanent)
   */
  private async deleteKeyVersion(version: string): Promise<void> {
    const filePath = path.join(this.KEY_STORAGE_PATH, `${version}.json`);

    try {
      await fs.unlink(filePath);
      this.keyVersions.delete(version);
      logger.info(`Key version permanently deleted`, { version });
    } catch (error) {
      logger.error(`Failed to delete key version ${version}`, error, { version });
    }
  }

  /**
   * Rotates encryption key
   *
   * This is a critical operation that:
   * 1. Generates new key
   * 2. Re-encrypts all credentials with new key
   * 3. Archives old key
   * 4. Updates environment
   *
   * @param reencryptFn - Function to re-encrypt credentials
   * @returns Rotation result
   */
  async rotateKey(
    reencryptFn: (oldVersion: string, newVersion: string) => Promise<number>
  ): Promise<RotationResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Get current active version
      const currentVersion = this.getActiveKeyVersion();
      if (!currentVersion) {
        throw new Error('No active key version found');
      }

      // Generate new key
      const { key: newKey, salt: newSalt } = this.generateNewKey();
      const newVersion = this.getNextVersion();

      logger.info(`Starting key rotation: ${currentVersion.version} → ${newVersion}`, { oldVersion: currentVersion.version, newVersion });

      // Register new key version
      await this.registerKeyVersion(newKey, newSalt, newVersion);

      // Re-encrypt all credentials
      logger.info('Re-encrypting all credentials...');
      const reencryptedCount = await reencryptFn(currentVersion.version, newVersion);

      logger.info(`Re-encrypted ${reencryptedCount} credentials`, { count: reencryptedCount });

      // Mark old version as deprecated
      currentVersion.status = 'deprecated';
      currentVersion.rotatedAt = new Date();
      await this.saveKeyVersion(currentVersion);

      // Archive old version (keep for 30 days for rollback)
      await this.archiveKeyVersion(currentVersion.version, 30);

      const duration = Date.now() - startTime;

      logger.info(`Key rotation completed in ${duration}ms`, { duration, oldVersion: currentVersion.version, newVersion, credentialsReencrypted: reencryptedCount });

      return {
        success: true,
        oldVersion: currentVersion.version,
        newVersion,
        credentialsReencrypted: reencryptedCount,
        duration,
        errors
      };
    } catch (error) {
      errors.push((error as Error).message);

      return {
        success: false,
        oldVersion: '',
        newVersion: '',
        credentialsReencrypted: 0,
        duration: Date.now() - startTime,
        errors
      };
    }
  }

  /**
   * Checks if key rotation is needed
   */
  needsRotation(): boolean {
    const activeKey = this.getActiveKeyVersion();

    if (!activeKey) {
      return true; // No active key
    }

    const daysSinceCreation = Math.floor(
      (Date.now() - activeKey.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceCreation >= this.ROTATION_INTERVAL_DAYS;
  }

  /**
   * Gets rotation status
   */
  getRotationStatus(): {
    needsRotation: boolean;
    daysSinceRotation: number;
    daysUntilRotation: number;
    activeVersion: string | null;
  } {
    const activeKey = this.getActiveKeyVersion();

    if (!activeKey) {
      return {
        needsRotation: true,
        daysSinceRotation: 0,
        daysUntilRotation: 0,
        activeVersion: null
      };
    }

    const daysSinceRotation = Math.floor(
      (Date.now() - activeKey.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const daysUntilRotation = Math.max(0, this.ROTATION_INTERVAL_DAYS - daysSinceRotation);

    return {
      needsRotation: this.needsRotation(),
      daysSinceRotation,
      daysUntilRotation,
      activeVersion: activeKey.version
    };
  }

  /**
   * Validates key management setup
   */
  async validate(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if key storage directory exists
    try {
      await fs.access(this.KEY_STORAGE_PATH);
    } catch {
      errors.push(`Key storage directory does not exist: ${this.KEY_STORAGE_PATH}`);
    }

    // Load key versions
    await this.loadKeyVersions();

    // Check for active key
    const activeKey = this.getActiveKeyVersion();
    if (!activeKey) {
      errors.push('No active key version found');
    }

    // Check rotation status
    if (activeKey && this.needsRotation()) {
      warnings.push(
        `Key rotation needed (last rotation: ${activeKey.createdAt.toISOString()})`
      );
    }

    // Check for multiple active keys (shouldn't happen)
    const activeKeys = Array.from(this.keyVersions.values()).filter(
      kv => kv.status === 'active'
    );

    if (activeKeys.length > 1) {
      errors.push(`Multiple active keys found: ${activeKeys.map(k => k.version).join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Singleton instance
let keyManagementInstance: KeyManagement | null = null;

/**
 * Gets singleton instance of KeyManagement
 */
export function getKeyManagement(): KeyManagement {
  if (!keyManagementInstance) {
    keyManagementInstance = new KeyManagement();
  }
  return keyManagementInstance;
}
