/**
 * Storage Manager
 * Centralized storage abstraction to reduce code duplication across services
 */

import { logger } from '../services/SimpleLogger';
import { SecureStorage } from './security';

export interface StorageOptions {
  encrypt?: boolean;
  version?: string;
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
  compress?: boolean;
}

export interface StorageItem<T = unknown> {
  data: T;
  version: string;
  timestamp: number;
  ttl?: number;
  checksum?: string;
}

export type StorageAdapter = 'localStorage' | 'sessionStorage' | 'memory' | 'secure';

export class StorageManager {
  private static instances = new Map<string, StorageManager>();
  private memoryStore = new Map<string, StorageItem>();
  private defaultOptions: Required<Omit<StorageOptions, 'ttl'>> & { ttl?: number };

  private constructor(
    private namespace: string,
    private adapter: StorageAdapter = 'localStorage',
    options: StorageOptions = {}
  ) {
    this.defaultOptions = {
      encrypt: options.encrypt ?? false,
      version: options.version ?? '1.0.0',
      maxSize: options.maxSize ?? 5 * 1024 * 1024, // 5MB
      compress: options.compress ?? false,
      ttl: options.ttl
    };
  }

  /**
   * Get or create a storage manager instance
   */
  public static getInstance(
    namespace: string,
    adapter: StorageAdapter = 'localStorage',
    options: StorageOptions = {}
  ): StorageManager {
    const key = `${namespace}:${adapter}`;

    if (!this.instances.has(key)) {
      this.instances.set(key, new StorageManager(namespace, adapter, options));
    }

    return this.instances.get(key)!;
  }

  /**
   * Clear all cached instances (useful for testing)
   */
  public static clearInstances(): void {
    this.instances.clear();
  }

  /**
   * Store data with metadata and validation
   */
  public async setItem<T>(
    key: string,
    data: T,
    options: StorageOptions = {}
  ): Promise<boolean> {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      const dataSize = this.calculateSize(data);

      // Validate data size
      if (dataSize > mergedOptions.maxSize) {
        logger.error('Data size exceeds maximum allowed', {
          namespace: this.namespace,
          key,
          size: dataSize,
          maxSize: mergedOptions.maxSize
        });
        return false;
      }

      // Create storage item with metadata
      const storageItem: StorageItem<T> = {
        data,
        version: mergedOptions.version,
        timestamp: Date.now(),
        ttl: mergedOptions.ttl,
        checksum: this.calculateChecksum(data)
      };

      // Compress if enabled
      if (mergedOptions.compress && typeof data === 'object') {
        storageItem.data = this.compress(data) as T;
      }

      // Store using appropriate adapter
      const fullKey = this.getFullKey(key);
      const success = await this.storeWithAdapter(fullKey, storageItem, mergedOptions);

      if (success) {
        logger.debug('Storage item saved', {
          namespace: this.namespace,
          key,
          size: dataSize,
          adapter: this.adapter
        });
      }

      return success;
    } catch (error) {
      logger.error('Failed to store item', {
        namespace: this.namespace,
        key,
        error,
        adapter: this.adapter
      });
      return false;
    }
  }

  /**
   * Retrieve data with validation and TTL check
   */
  public async getItem<T>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      const fullKey = this.getFullKey(key);
      const storageItem = await this.retrieveWithAdapter<T>(fullKey);

      if (!storageItem) {
        return defaultValue ?? null;
      }

      // Check TTL
      if (storageItem.ttl && Date.now() - storageItem.timestamp > storageItem.ttl) {
        logger.debug('Storage item expired', {
          namespace: this.namespace,
          key,
          age: Date.now() - storageItem.timestamp,
          ttl: storageItem.ttl
        });

        await this.removeItem(key);
        return defaultValue ?? null;
      }

      // Validate checksum
      if (storageItem.checksum) {
        const currentChecksum = this.calculateChecksum(storageItem.data);
        if (currentChecksum !== storageItem.checksum) {
          logger.warn('Storage item corruption detected', {
            namespace: this.namespace,
            key,
            expectedChecksum: storageItem.checksum,
            actualChecksum: currentChecksum
          });

          await this.removeItem(key);
          return defaultValue ?? null;
        }
      }

      // Decompress if needed
      let data = storageItem.data;
      if (this.isCompressed(data)) {
        data = this.decompress(data) as T;
      }

      logger.debug('Storage item retrieved', {
        namespace: this.namespace,
        key,
        version: storageItem.version,
        age: Date.now() - storageItem.timestamp
      });

      return data;
    } catch (error) {
      logger.error('Failed to retrieve item', {
        namespace: this.namespace,
        key,
        error,
        adapter: this.adapter
      });
      return defaultValue ?? null;
    }
  }

  /**
   * Remove an item from storage
   */
  public async removeItem(key: string): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);
      const success = await this.removeWithAdapter(fullKey);

      if (success) {
        logger.debug('Storage item removed', {
          namespace: this.namespace,
          key,
          adapter: this.adapter
        });
      }

      return success;
    } catch (error) {
      logger.error('Failed to remove item', {
        namespace: this.namespace,
        key,
        error,
        adapter: this.adapter
      });
      return false;
    }
  }

  /**
   * Clear all items in this namespace
   */
  public async clear(): Promise<void> {
    try {
      const keys = await this.getKeys();

      for (const key of keys) {
        await this.removeWithAdapter(key);
      }

      if (this.adapter === 'memory') {
        this.memoryStore.clear();
      }

      logger.info('Storage namespace cleared', {
        namespace: this.namespace,
        itemsCleared: keys.length,
        adapter: this.adapter
      });
    } catch (error) {
      logger.error('Failed to clear storage', {
        namespace: this.namespace,
        error,
        adapter: this.adapter
      });
    }
  }

  /**
   * Get all keys in this namespace
   */
  public async getKeys(): Promise<string[]> {
    const prefix = `${this.namespace}:`;

    switch (this.adapter) {
      case 'localStorage': {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            keys.push(key);
          }
        }
        return keys;
      }

      case 'sessionStorage': {
        const keys: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(prefix)) {
            keys.push(key);
          }
        }
        return keys;
      }

      case 'memory':
        return Array.from(this.memoryStore.keys()).filter(key => key.startsWith(prefix));

      case 'secure':
        // SecureStorage doesn't provide key enumeration for security reasons
        return [];

      default:
        return [];
    }
  }

  /**
   * Get storage statistics
   */
  public async getStats(): Promise<{
    namespace: string;
    adapter: StorageAdapter;
    itemCount: number;
    totalSize: number;
    oldestItem?: { key: string; timestamp: number };
    newestItem?: { key: string; timestamp: number };
  }> {
    const keys = await this.getKeys();
    let totalSize = 0;
    let oldestItem: { key: string; timestamp: number } | undefined;
    let newestItem: { key: string; timestamp: number } | undefined;

    for (const fullKey of keys) {
      try {
        const storageItem = await this.retrieveWithAdapter(fullKey);
        if (storageItem) {
          totalSize += this.calculateSize(storageItem);

          const key = fullKey.replace(`${this.namespace}:`, '');

          if (!oldestItem || storageItem.timestamp < oldestItem.timestamp) {
            oldestItem = { key, timestamp: storageItem.timestamp };
          }

          if (!newestItem || storageItem.timestamp > newestItem.timestamp) {
            newestItem = { key, timestamp: storageItem.timestamp };
          }
        }
      } catch (error) {
        // Skip corrupted items
        logger.warn('Skipped corrupted storage item', { key: fullKey, error });
      }
    }

    return {
      namespace: this.namespace,
      adapter: this.adapter,
      itemCount: keys.length,
      totalSize,
      oldestItem,
      newestItem
    };
  }

  /**
   * Cleanup expired items
   */
  public async cleanup(): Promise<{ removed: number; errors: number }> {
    const keys = await this.getKeys();
    let removed = 0;
    let errors = 0;

    for (const fullKey of keys) {
      try {
        const storageItem = await this.retrieveWithAdapter(fullKey);
        if (storageItem?.ttl && Date.now() - storageItem.timestamp > storageItem.ttl) {
          await this.removeWithAdapter(fullKey);
          removed++;
        }
      } catch (error) {
        errors++;
        logger.error('Error during cleanup', { key: fullKey, error });
      }
    }

    logger.info('Storage cleanup completed', {
      namespace: this.namespace,
      removed,
      errors,
      adapter: this.adapter
    });

    return { removed, errors };
  }

  // Private helper methods
  private getFullKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private calculateSize(data: unknown): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private calculateChecksum(data: unknown): string {
    // Simple checksum calculation (could be improved with proper hashing)
    const str = JSON.stringify(data);
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(16);
  }

  private compress(data: unknown): unknown {
    // Simple compression placeholder - in real implementation use a compression library
    return { __compressed: true, data: JSON.stringify(data) };
  }

  private decompress(data: unknown): unknown {
    if (this.isCompressed(data)) {
      return JSON.parse((data as { data: string }).data);
    }
    return data;
  }

  private isCompressed(data: unknown): data is { __compressed: true; data: string } {
    return typeof data === 'object' && data !== null && '__compressed' in data && (data as { __compressed?: boolean }).__compressed === true;
  }

  // Adapter-specific implementations
  private async storeWithAdapter(
    key: string,
    item: StorageItem,
    _options: Required<Omit<StorageOptions, 'ttl'>> & { ttl?: number } // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<boolean> {
    const serialized = JSON.stringify(item);

    switch (this.adapter) {
      case 'localStorage':
        localStorage.setItem(key, serialized);
        return true;

      case 'sessionStorage':
        sessionStorage.setItem(key, serialized);
        return true;

      case 'memory':
        this.memoryStore.set(key, item);
        return true;

      case 'secure':
        return SecureStorage.setItem(key, item);

      default:
        return false;
    }
  }

  private async retrieveWithAdapter<T>(key: string): Promise<StorageItem<T> | null> {
    switch (this.adapter) {
      case 'localStorage': {
        const localItem = localStorage.getItem(key);
        return localItem ? JSON.parse(localItem) : null;
      }

      case 'sessionStorage': {
        const sessionItem = sessionStorage.getItem(key);
        return sessionItem ? JSON.parse(sessionItem) : null;
      }

      case 'memory':
        return (this.memoryStore.get(key) as StorageItem<T>) || null;

      case 'secure':
        return SecureStorage.getItem(key) as StorageItem<T> | null;

      default:
        return null;
    }
  }

  private async removeWithAdapter(key: string): Promise<boolean> {
    switch (this.adapter) {
      case 'localStorage':
        localStorage.removeItem(key);
        return true;

      case 'sessionStorage':
        sessionStorage.removeItem(key);
        return true;

      case 'memory':
        return this.memoryStore.delete(key);

      case 'secure':
        return SecureStorage.removeItem(key);

      default:
        return false;
    }
  }
}

// Convenience factory functions
export interface CreateStorageManagerConfig extends StorageOptions {
  namespace: string;
  adapter?: StorageAdapter;
  enableChecksum?: boolean;
}

export const createStorageManager = (
  config: CreateStorageManagerConfig | string,
  adapter: StorageAdapter = 'localStorage',
  options: StorageOptions = {}
) => {
  // Support both object config and positional parameters
  if (typeof config === 'object') {
    const { namespace, adapter: configAdapter = 'localStorage', enableChecksum, ...restOptions } = config;
    // If enableChecksum is set, we'll handle checksum validation in the instance
    return StorageManager.getInstance(namespace, configAdapter, restOptions);
  }
  // Legacy positional parameter support
  return StorageManager.getInstance(config, adapter, options);
};

// Pre-configured storage managers for common use cases
export const workflowStorage = createStorageManager('workflow', 'secure');
export const cacheStorage = createStorageManager('cache', 'memory', { ttl: 300000 }); // 5 minutes
export const sessionStorageManager = createStorageManager('session', 'sessionStorage');
export const persistentStorage = createStorageManager('persistent', 'localStorage');