/**
 * Safe Local Storage Utility
 * Provides error-handling wrapper around localStorage with versioning, backup, and recovery
 */

import { StateStorage } from 'zustand/middleware';
import { logger } from '../../services/SimpleLogger';
import { configService } from '../../services/ConfigService';

export class SafeLocalStorage implements StateStorage {
  private storageKey: string;
  private maxRetries = 3;

  constructor(storageKey: string) {
    this.storageKey = storageKey;
  }

  getItem = async (name: string): Promise<string | null> => {
    try {
      const item = localStorage.getItem(name);
      if (!item) return null;

      const parsed = JSON.parse(item);
      if (!parsed || typeof parsed !== 'object') {
        logger.warn('Corrupted data detected, clearing storage');
        localStorage.removeItem(name);
        return null;
      }

      if (parsed.version && parsed.version !== this.getCurrentVersion()) {
        logger.info(`Storage version mismatch, migrating from ${parsed.version} to ${this.getCurrentVersion()}`);
        return this.migrateData(parsed);
      }

      return item;
    } catch (error) {
      logger.error('Storage read error:', error);
      return null;
    }
  };

  setItem = async (name: string, value: string): Promise<void> => {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        let parsedData: Record<string, unknown>;
        try {
          parsedData = JSON.parse(value);
        } catch {
          parsedData = { data: value };
        }

        const estimatedSize = new Blob([value]).size;
        if (estimatedSize > 5 * 1024 * 1024) {
          throw new Error('Data too large for localStorage');
        }

        const backupKey = `${name}_backup`;
        const existingData = localStorage.getItem(name);

        if (existingData) {
          localStorage.setItem(backupKey, existingData);
        }

        const dataWithMetadata = {
          ...parsedData,
          _metadata: {
            version: this.getCurrentVersion(),
            timestamp: Date.now(),
            checksum: this.calculateChecksum(parsedData)
          }
        };

        localStorage.setItem(name, JSON.stringify(dataWithMetadata));

        if (existingData) {
          localStorage.removeItem(backupKey);
        }

        return;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`Storage write attempt ${attempt}/${this.maxRetries} failed:`, errorMessage);

        if (attempt === this.maxRetries) {
          if (error instanceof Error && error.name === 'QuotaExceededError') {
            this.handleStorageQuotaExceeded();
          }
          throw new Error(`Failed to save data after ${this.maxRetries} attempts: ${errorMessage}`);
        }

        const retryTimeout = 100;
        await new Promise(resolve => setTimeout(resolve, retryTimeout * attempt));
      }
    }
  };

  removeItem = async (name: string): Promise<void> => {
    try {
      localStorage.removeItem(name);
      localStorage.removeItem(`${name}_backup`);
    } catch (error) {
      logger.error('Storage remove error:', error);
    }
  };

  private getCurrentVersion(): string {
    return '4.0.0'; // Increment for slice-based architecture
  }

  private migrateData(oldData: unknown): string | null {
    try {
      if (!oldData || typeof oldData !== 'object') {
        return null;
      }

      const migrated = { ...oldData } as Record<string, unknown>;

      // Ensure all required fields exist
      if (!migrated.environments) {
        migrated.environments = configService.getAllEnvironments();
      }
      if (!Array.isArray(migrated.nodes)) {
        migrated.nodes = [];
      }
      if (!Array.isArray(migrated.edges)) {
        migrated.edges = [];
      }

      return JSON.stringify(migrated);
    } catch (error) {
      logger.error('Migration failed:', error);
      return null;
    }
  }

  private calculateChecksum(data: unknown): string {
    return btoa(JSON.stringify(data)).slice(0, 16);
  }

  private handleStorageQuotaExceeded(): void {
    logger.warn('Storage quota exceeded, cleaning up old data');

    try {
      const currentData = localStorage.getItem(this.storageKey);
      if (currentData) {
        const parsed = JSON.parse(currentData) as Record<string, unknown[]>;
        if (parsed.executionHistory && Array.isArray(parsed.executionHistory)) {
          parsed.executionHistory = parsed.executionHistory.slice(-10);
        }
        if (parsed.executionLogs && Array.isArray(parsed.executionLogs)) {
          parsed.executionLogs = parsed.executionLogs.slice(-100);
        }
        localStorage.setItem(this.storageKey, JSON.stringify(parsed));
      }
    } catch (cleanupError) {
      logger.error('Cleanup failed:', cleanupError);
      localStorage.clear();
    }
  }
}
