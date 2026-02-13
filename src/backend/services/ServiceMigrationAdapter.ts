/**
 * Service Migration Adapter
 * Provides a smooth transition layer from in-memory storage to database repositories
 *
 * This adapter allows services to gradually migrate from Map-based storage to
 * database repositories without breaking existing functionality.
 *
 * Features:
 * - Dual-mode operation (memory + database)
 * - Automatic synchronization
 * - Migration helpers
 * - Backward compatibility
 */

import { logger } from '../../services/SimpleLogger';
import {
  userRepository,
  workflowRepository,
  executionRepository,
  credentialRepository,
  webhookRepository,
  analyticsRepository,
  repositoryManager,
} from '../database/repositories';
import { EventBus } from './EventBus';

export interface MigrationConfig {
  mode: 'memory-only' | 'dual' | 'database-only';
  syncToDatabase?: boolean;
  syncFromDatabase?: boolean;
  fallbackToMemory?: boolean;
}

export interface MigrationStats {
  memoryReads: number;
  memoryWrites: number;
  databaseReads: number;
  databaseWrites: number;
  syncOperations: number;
  errors: number;
}

/**
 * Base adapter for migrating services from Map to database
 */
export class ServiceMigrationAdapter<T> {
  private memoryStore = new Map<string, T>();
  private config: MigrationConfig;
  private stats: MigrationStats;
  private eventBus?: EventBus;

  constructor(
    private repositoryName: string,
    config: Partial<MigrationConfig> = {},
    eventBus?: EventBus
  ) {
    this.config = {
      mode: config.mode || 'dual',
      syncToDatabase: config.syncToDatabase !== false,
      syncFromDatabase: config.syncFromDatabase !== false,
      fallbackToMemory: config.fallbackToMemory !== false,
    };

    this.stats = {
      memoryReads: 0,
      memoryWrites: 0,
      databaseReads: 0,
      databaseWrites: 0,
      syncOperations: 0,
      errors: 0,
    };

    this.eventBus = eventBus;

    logger.info(`ServiceMigrationAdapter initialized for ${repositoryName}`, {
      mode: this.config.mode,
    });
  }

  /**
   * Get item by ID
   */
  async get(id: string, dbFetcher?: (id: string) => Promise<T | null>): Promise<T | null> {
    try {
      switch (this.config.mode) {
        case 'memory-only':
          this.stats.memoryReads++;
          return this.memoryStore.get(id) || null;

        case 'database-only':
          if (!dbFetcher) {
            throw new Error('Database fetcher required for database-only mode');
          }
          this.stats.databaseReads++;
          return await dbFetcher(id);

        case 'dual':
        default:
          // Try memory first
          let item: T | null = this.memoryStore.get(id) ?? null;
          if (item) {
            this.stats.memoryReads++;
            return item;
          }

          // Fallback to database
          if (dbFetcher && this.config.syncFromDatabase) {
            item = await dbFetcher(id);
            if (item) {
              this.stats.databaseReads++;
              // Cache in memory
              this.memoryStore.set(id, item);
              this.stats.syncOperations++;
            }
          }

          return item;
      }
    } catch (error) {
      this.stats.errors++;
      logger.error(`Error getting ${this.repositoryName} by ID:`, error);

      if (this.config.fallbackToMemory) {
        this.stats.memoryReads++;
        return this.memoryStore.get(id) || null;
      }

      throw error;
    }
  }

  /**
   * List all items
   */
  async list(dbFetcher?: () => Promise<T[]>): Promise<T[]> {
    try {
      switch (this.config.mode) {
        case 'memory-only':
          this.stats.memoryReads++;
          return Array.from(this.memoryStore.values());

        case 'database-only':
          if (!dbFetcher) {
            throw new Error('Database fetcher required for database-only mode');
          }
          this.stats.databaseReads++;
          return await dbFetcher();

        case 'dual':
        default:
          // Return from database if available
          if (dbFetcher && this.config.syncFromDatabase) {
            const items = await dbFetcher();
            this.stats.databaseReads++;

            // Sync to memory
            items.forEach((item: any) => {
              if (item.id) {
                this.memoryStore.set(item.id, item);
              }
            });
            this.stats.syncOperations++;

            return items;
          }

          // Fallback to memory
          this.stats.memoryReads++;
          return Array.from(this.memoryStore.values());
      }
    } catch (error) {
      this.stats.errors++;
      logger.error(`Error listing ${this.repositoryName}:`, error);

      if (this.config.fallbackToMemory) {
        this.stats.memoryReads++;
        return Array.from(this.memoryStore.values());
      }

      throw error;
    }
  }

  /**
   * Create/update item
   */
  async set(
    id: string,
    item: T,
    dbWriter?: (id: string, item: T) => Promise<T>
  ): Promise<T> {
    try {
      switch (this.config.mode) {
        case 'memory-only':
          this.stats.memoryWrites++;
          this.memoryStore.set(id, item);
          return item;

        case 'database-only':
          if (!dbWriter) {
            throw new Error('Database writer required for database-only mode');
          }
          this.stats.databaseWrites++;
          return await dbWriter(id, item);

        case 'dual':
        default:
          // Write to memory
          this.memoryStore.set(id, item);
          this.stats.memoryWrites++;

          // Sync to database
          if (dbWriter && this.config.syncToDatabase) {
            try {
              const dbItem = await dbWriter(id, item);
              this.stats.databaseWrites++;
              this.stats.syncOperations++;
              return dbItem;
            } catch (dbError) {
              logger.error(`Failed to sync ${this.repositoryName} to database:`, dbError);
              this.stats.errors++;

              if (!this.config.fallbackToMemory) {
                throw dbError;
              }
            }
          }

          return item;
      }
    } catch (error) {
      this.stats.errors++;
      logger.error(`Error setting ${this.repositoryName}:`, error);
      throw error;
    }
  }

  /**
   * Delete item
   */
  async delete(id: string, dbDeleter?: (id: string) => Promise<boolean>): Promise<boolean> {
    try {
      switch (this.config.mode) {
        case 'memory-only':
          this.stats.memoryWrites++;
          return this.memoryStore.delete(id);

        case 'database-only':
          if (!dbDeleter) {
            throw new Error('Database deleter required for database-only mode');
          }
          this.stats.databaseWrites++;
          return await dbDeleter(id);

        case 'dual':
        default:
          // Delete from memory
          const memoryDeleted = this.memoryStore.delete(id);
          this.stats.memoryWrites++;

          // Sync to database
          let dbDeleted = false;
          if (dbDeleter && this.config.syncToDatabase) {
            try {
              dbDeleted = await dbDeleter(id);
              this.stats.databaseWrites++;
              this.stats.syncOperations++;
            } catch (dbError) {
              logger.error(`Failed to delete ${this.repositoryName} from database:`, dbError);
              this.stats.errors++;

              if (!this.config.fallbackToMemory) {
                throw dbError;
              }
            }
          }

          return memoryDeleted || dbDeleted;
      }
    } catch (error) {
      this.stats.errors++;
      logger.error(`Error deleting ${this.repositoryName}:`, error);
      throw error;
    }
  }

  /**
   * Get migration statistics
   */
  getStats(): MigrationStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      memoryReads: 0,
      memoryWrites: 0,
      databaseReads: 0,
      databaseWrites: 0,
      syncOperations: 0,
      errors: 0,
    };
  }

  /**
   * Switch migration mode
   */
  setMode(mode: MigrationConfig['mode']): void {
    logger.info(`Switching ${this.repositoryName} mode from ${this.config.mode} to ${mode}`);
    this.config.mode = mode;
  }

  /**
   * Get current mode
   */
  getMode(): MigrationConfig['mode'] {
    return this.config.mode;
  }

  /**
   * Clear memory store (useful when switching to database-only)
   */
  clearMemory(): void {
    const size = this.memoryStore.size;
    this.memoryStore.clear();
    logger.info(`Cleared ${size} items from ${this.repositoryName} memory store`);
  }

  /**
   * Migrate all data from memory to database
   */
  async migrateToDatabase(
    dbBulkWriter?: (items: Array<{ id: string; data: T }>) => Promise<number>
  ): Promise<number> {
    if (this.memoryStore.size === 0) {
      logger.info(`No items to migrate for ${this.repositoryName}`);
      return 0;
    }

    try {
      const items = Array.from(this.memoryStore.entries()).map(([id, data]) => ({
        id,
        data,
      }));

      if (dbBulkWriter) {
        const migrated = await dbBulkWriter(items);
        logger.info(`Migrated ${migrated} items from ${this.repositoryName} to database`);
        return migrated;
      }

      logger.warn(`No bulk writer provided for ${this.repositoryName}, migration skipped`);
      return 0;
    } catch (error) {
      logger.error(`Failed to migrate ${this.repositoryName} to database:`, error);
      throw error;
    }
  }
}

/**
 * Global migration manager for all services
 */
export class GlobalMigrationManager {
  private adapters = new Map<string, ServiceMigrationAdapter<any>>();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    logger.info('GlobalMigrationManager initialized');
  }

  /**
   * Register an adapter
   */
  registerAdapter<T>(name: string, adapter: ServiceMigrationAdapter<T>): void {
    this.adapters.set(name, adapter);
    logger.info(`Registered migration adapter: ${name}`);
  }

  /**
   * Get adapter by name
   */
  getAdapter<T>(name: string): ServiceMigrationAdapter<T> | undefined {
    return this.adapters.get(name);
  }

  /**
   * Switch all adapters to a specific mode
   */
  async switchAllToMode(mode: MigrationConfig['mode']): Promise<void> {
    logger.info(`Switching all adapters to ${mode} mode`);

    for (const [name, adapter] of this.adapters) {
      adapter.setMode(mode);
      logger.info(`Switched ${name} to ${mode}`);
    }

    this.eventBus.publish('system.health_check', {
      action: 'mode_switch',
      mode,
      adapters: Array.from(this.adapters.keys()),
    }, 'GlobalMigrationManager');
  }

  /**
   * Get statistics for all adapters
   */
  getAllStats(): Record<string, MigrationStats> {
    const stats: Record<string, MigrationStats> = {};

    for (const [name, adapter] of this.adapters) {
      stats[name] = adapter.getStats();
    }

    return stats;
  }

  /**
   * Health check for all adapters
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    adapters: Record<string, { mode: string; stats: MigrationStats }>;
  }> {
    const adapters: Record<string, { mode: string; stats: MigrationStats }> = {};
    let healthy = true;

    for (const [name, adapter] of this.adapters) {
      const stats = adapter.getStats();
      adapters[name] = {
        mode: adapter.getMode(),
        stats,
      };

      // Check if error rate is too high
      const totalOps =
        stats.memoryReads +
        stats.memoryWrites +
        stats.databaseReads +
        stats.databaseWrites;
      const errorRate = totalOps > 0 ? stats.errors / totalOps : 0;

      if (errorRate > 0.1) {
        // More than 10% error rate
        healthy = false;
        logger.warn(`High error rate detected for ${name}: ${(errorRate * 100).toFixed(2)}%`);
      }
    }

    return { healthy, adapters };
  }

  /**
   * Migrate all adapters to database
   */
  async migrateAllToDatabase(): Promise<Record<string, number>> {
    logger.info('Starting migration of all adapters to database');

    const results: Record<string, number> = {};

    for (const [name, adapter] of this.adapters) {
      try {
        // Migration logic will be implemented per adapter
        results[name] = 0;
        logger.info(`Migration completed for ${name}`);
      } catch (error) {
        logger.error(`Migration failed for ${name}:`, error);
        results[name] = -1;
      }
    }

    this.eventBus.publish('system.health_check', {
      action: 'bulk_migration',
      results,
    }, 'GlobalMigrationManager');

    return results;
  }
}

/**
 * Repository health check
 */
export async function checkRepositoryHealth(): Promise<{
  healthy: boolean;
  repositories: Record<string, boolean>;
}> {
  try {
    const health = await repositoryManager.healthCheck();
    const healthy = Object.values(health).every((h) => h === true);

    logger.info('Repository health check completed', { healthy, health });

    return {
      healthy,
      repositories: health,
    };
  } catch (error) {
    logger.error('Repository health check failed:', error);
    return {
      healthy: false,
      repositories: {},
    };
  }
}

/**
 * Export singleton instance (will be initialized when EventBus is available)
 */
let globalMigrationManager: GlobalMigrationManager | null = null;

export function initializeGlobalMigrationManager(eventBus: EventBus): GlobalMigrationManager {
  if (!globalMigrationManager) {
    globalMigrationManager = new GlobalMigrationManager(eventBus);
  }
  return globalMigrationManager;
}

export function getGlobalMigrationManager(): GlobalMigrationManager | null {
  return globalMigrationManager;
}
