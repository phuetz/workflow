/**
 * Safe Storage Implementation
 * Extracted from workflowStore to reduce duplication and improve maintainability
 */

import { StateStorage } from 'zustand/middleware';
import { logger } from '../services/SimpleLogger';
import { configService } from '../services/ConfigService';

export interface StorageConfig {
  storageKey: string;
  maxRetries?: number;
  maxSize?: number;
  version?: string;
  enableBackup?: boolean;
  enableMigration?: boolean;
  enableValidation?: boolean;
}

export class SafeStorage implements StateStorage {
  private readonly config: Required<StorageConfig>;
  
  constructor(config: StorageConfig) {
    this.config = {
      maxRetries: 3,
      maxSize: 5 * 1024 * 1024, // 5MB
      version: '1.0.0',
      enableBackup: true,
      enableMigration: true,
      enableValidation: true,
      ...config
    };
  }
  
  getItem = async (name: string): Promise<string | null> => {
    try {
      const item = localStorage.getItem(name);
      if (!item) return null;

      // Parse and validate structure
      const parsed = JSON.parse(item);
      if (!parsed || typeof parsed !== 'object') {
        logger.warn('Corrupted data detected, clearing storage', { name });
        localStorage.removeItem(name);
        return null;
      }
      
      // Check version compatibility if migration is enabled
      if (this.config.enableMigration && parsed._metadata?.version !== this.config.version) {
        logger.info('Storage version mismatch, migrating', {
          name,
          from: parsed._metadata?.version,
          to: this.config.version
        });
        return this.migrateData(parsed);
      }
      
      // Validate checksum if available
      if (this.config.enableValidation && parsed._metadata?.checksum) {
        const dataWithoutMetadata = { ...parsed };
        delete dataWithoutMetadata._metadata;
        const currentChecksum = this.calculateChecksum(dataWithoutMetadata);

        if (currentChecksum !== parsed._metadata.checksum) {
          logger.warn('Data corruption detected, removing item', { name });
          localStorage.removeItem(name);
          return null;
        }
      }
      
      return item;
    } catch (error) {
      logger.error('Storage read error', { name, error });
      return null;
    }
  };
  
  setItem = async (name: string, value: string): Promise<void> => {
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const parsed = JSON.parse(value);

        // Validate data if enabled
        if (this.config.enableValidation) {
          this.validateData(parsed);
        }

        // Check size limits
        const estimatedSize = new Blob([value]).size;
        if (estimatedSize > this.config.maxSize) {
          throw new Error(`Data size (${estimatedSize}) exceeds maximum allowed (${this.config.maxSize})`);
        }
        
        // Create backup if enabled
        if (this.config.enableBackup) {
          await this.createBackup(name);
        }
        
        // Add metadata
        const dataWithMetadata = {
          ...parsed,
          _metadata: {
            version: this.config.version,
            timestamp: Date.now(),
            checksum: this.calculateChecksum(parsed)
          }
        };
        
        localStorage.setItem(name, JSON.stringify(dataWithMetadata));
        
        // Clean up backup on successful write
        if (this.config.enableBackup) {
          this.cleanupBackup(name);
        }
        
        logger.debug('Storage item saved successfully', {
          name,
          size: estimatedSize,
          attempt
        });
        
        return;
      } catch (error: unknown) {
        logger.warn(`Storage write attempt ${attempt}/${this.config.maxRetries} failed`, {
          name,
          error: (error as Error).message
        });

        if (attempt === this.config.maxRetries) {
          if ((error as Error).name === 'QuotaExceededError') {
            await this.handleStorageQuotaExceeded(name);
          }
          throw new Error(`Failed to save data after ${this.config.maxRetries} attempts: ${(error as Error).message}`);
        }
        
        // Wait before retry with exponential backoff
        await this.sleep(1000 * Math.pow(2, attempt - 1));
      }
    }
  };
  
  removeItem = async (name: string): Promise<void> => {
    try {
      localStorage.removeItem(name);
      localStorage.removeItem(`${name}_backup`);
      logger.debug('Storage item removed', { name });
    } catch (error) {
      logger.error('Storage remove error', { name, error });
    }
  };
  
  // Private helper methods
  private validateData(data: unknown): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data structure - must be an object');
    }
    
    // Add specific validation logic based on your needs
    // This is a basic implementation
  }
  
  private migrateData(oldData: unknown): string | null {
    try {
      const oldDataRecord = oldData as Record<string, unknown>;
      const migrated = { ...oldDataRecord };
      const oldVersion = (migrated._metadata as Record<string, unknown>)?.version || '1.0.0';

      // Handle version-specific migrations

      if (this.shouldMigrate(oldVersion as string, '2.0.0')) {
        (migrated as Record<string, unknown>).workflows = (migrated as Record<string, unknown>).workflows || {};
      }
      
      if (this.shouldMigrate(oldVersion as string, '3.0.0')) {
        (migrated as Record<string, unknown>).environments = (migrated as Record<string, unknown>).environments || configService.getAllEnvironments();
      }
      
      // Update metadata
      const existingMetadata = (migrated as Record<string, unknown>)._metadata as Record<string, unknown> | undefined;
      (migrated as Record<string, unknown>)._metadata = {
        ...(existingMetadata || {}),
        version: this.config.version,
        migratedFrom: oldVersion,
        migratedAt: Date.now()
      };
      
      logger.info('Data migration completed', {
        from: oldVersion as string,
        to: this.config.version
      });
      
      return JSON.stringify(migrated);
    } catch (error) {
      logger.error('Migration failed', { error });
      return null;
    }
  }
  
  private shouldMigrate(currentVersion: string, targetVersion: string): boolean {
    // Simple version comparison - in production, use a proper semver library
    return currentVersion < targetVersion;
  }
  
  private calculateChecksum(data: unknown): string {
    try {
      const str = JSON.stringify(data);
      let hash = 0;

      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }

      return Math.abs(hash).toString(16);
    } catch (error) {
      logger.warn('Checksum calculation failed', { error });
      return '';
    }
  }
  
  private async createBackup(name: string): Promise<void> {
    try {
      const existingData = localStorage.getItem(name);
      if (existingData) {
        localStorage.setItem(`${name}_backup`, existingData);
      }
    } catch (error) {
      logger.warn('Backup creation failed', { name, error });
    }
  }
  
  private cleanupBackup(name: string): void {
    try {
      localStorage.removeItem(`${name}_backup`);
    } catch (error) {
      logger.warn('Backup cleanup failed', { name, error });
    }
  }
  
  private async handleStorageQuotaExceeded(name: string): Promise<void> {
    logger.warn('Storage quota exceeded, attempting cleanup', { name });

    try {
      // Strategy 1: Clean up old execution data
      const currentData = localStorage.getItem(name);
      if (currentData) {
        const parsed = JSON.parse(currentData);
        let cleaned = false;

        if (parsed.executionHistory && parsed.executionHistory.length > 10) {
          parsed.executionHistory = parsed.executionHistory.slice(-10);
          cleaned = true;
        }
        
        if (parsed.executionLogs && parsed.executionLogs.length > 100) {
          parsed.executionLogs = parsed.executionLogs.slice(-100);
          cleaned = true;
        }
        
        if (cleaned) {
          localStorage.setItem(name, JSON.stringify(parsed));
          logger.info('Cleaned up old execution data', { name });
          return;
        }
      }

      // Strategy 2: Remove old backups
      const backupKeys = Object.keys(localStorage).filter(key => key.endsWith('_backup'));

      for (const backupKey of backupKeys) {
        localStorage.removeItem(backupKey);
      }
      
      if (backupKeys.length > 0) {
        logger.info('Removed backup files', { count: backupKeys.length });
        return;
      }

      // Strategy 3: Clear all non-essential data
      const nonEssentialKeys = Object.keys(localStorage).filter(key =>
        !key.startsWith('workflow-') && !key.startsWith('auth-')
      );

      for (const key of nonEssentialKeys) {
        localStorage.removeItem(key);
      }
      
      logger.warn('Cleared non-essential storage data', {
        clearedCount: nonEssentialKeys.length
      });
      
    } catch (cleanupError) {
      logger.error('Storage cleanup failed', { cleanupError });
      // Last resort - this might lose data but prevents app crash
      localStorage.clear();
      logger.error('Performed emergency storage clear');
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Factory function for creating SafeStorage instances
export function createSafeStorage(config: StorageConfig): SafeStorage {
  return new SafeStorage(config);
}

// Pre-configured instances for common use cases
export const workflowSafeStorage = createSafeStorage({
  storageKey: 'workflow-state',
  version: '3.1.0',
  maxSize: 10 * 1024 * 1024, // 10MB for workflows
  enableBackup: true,
  enableMigration: true,
  enableValidation: true
});

export const cacheSafeStorage = createSafeStorage({
  storageKey: 'app-cache',
  version: '1.0.0',
  maxSize: 2 * 1024 * 1024, // 2MB for cache
  enableBackup: false,
  enableMigration: false,
  enableValidation: false
});