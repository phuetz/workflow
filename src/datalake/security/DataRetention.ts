/**
 * Data Retention - Handles retention policies, storage optimization, and cleanup
 */

import type {
  RetentionPolicy,
  StorageTier,
  CatalogEntry,
  CostOptimizationConfig,
  StorageOptimizationResult,
  DataLakeAdapter,
  DataLakeConfig,
} from './types';

// =============================================================================
// Retention Policy Manager
// =============================================================================

export class RetentionPolicyManager {
  private policies: Map<string, RetentionPolicy> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private onCleanupError?: (dataLake: string, table: string, error: unknown) => void;

  constructor(callbacks?: {
    onCleanupError?: (dataLake: string, table: string, error: unknown) => void;
  }) {
    this.onCleanupError = callbacks?.onCleanupError;
  }

  /**
   * Set retention policy for a table
   */
  setPolicy(
    dataLakeName: string,
    tableName: string,
    policy: Omit<RetentionPolicy, 'name' | 'tableName'>
  ): void {
    const policyKey = `${dataLakeName}:${tableName}`;

    this.policies.set(policyKey, {
      ...policy,
      name: `retention_${tableName}`,
      tableName,
      nextCleanup: new Date(Date.now() + policy.retentionDays * 86400000),
    });
  }

  /**
   * Get retention policy for a table
   */
  getPolicy(dataLakeName: string, tableName: string): RetentionPolicy | undefined {
    return this.policies.get(`${dataLakeName}:${tableName}`);
  }

  /**
   * Remove retention policy
   */
  removePolicy(dataLakeName: string, tableName: string): boolean {
    return this.policies.delete(`${dataLakeName}:${tableName}`);
  }

  /**
   * Get all policies
   */
  getAllPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Apply retention cleanup for a specific table
   */
  async applyCleanup(
    dataLakeName: string,
    tableName: string,
    adapter: DataLakeAdapter,
    catalogEntry: CatalogEntry | null
  ): Promise<{
    partitionsDeleted: number;
    bytesReclaimed: number;
    archived: boolean;
  }> {
    const policyKey = `${dataLakeName}:${tableName}`;
    const policy = this.policies.get(policyKey);

    if (!policy?.enabled) {
      return { partitionsDeleted: 0, bytesReclaimed: 0, archived: false };
    }

    if (!catalogEntry) {
      return { partitionsDeleted: 0, bytesReclaimed: 0, archived: false };
    }

    const cutoffDate = new Date(
      Date.now() - (policy.retentionDays + policy.gracePeriodDays) * 86400000
    );

    const partitionsToDelete: string[] = [];
    let bytesReclaimed = 0;

    for (const partition of catalogEntry.partitions) {
      if (partition.lastModified < cutoffDate) {
        partitionsToDelete.push(partition.location);
        bytesReclaimed += partition.sizeBytes;
      }
    }

    let archived = false;
    if (policy.archiveBeforeDelete && partitionsToDelete.length > 0) {
      for (const partition of partitionsToDelete) {
        await adapter.setStorageTier(tableName, partition, 'archive');
      }
      archived = true;
    }

    if (partitionsToDelete.length > 0) {
      await adapter.deletePartitions(tableName, partitionsToDelete);
      catalogEntry.partitions = catalogEntry.partitions.filter(
        p => !partitionsToDelete.includes(p.location)
      );
      catalogEntry.sizeBytes -= bytesReclaimed;
    }

    policy.lastCleanup = new Date();
    policy.nextCleanup = new Date(Date.now() + 86400000);

    return {
      partitionsDeleted: partitionsToDelete.length,
      bytesReclaimed,
      archived,
    };
  }

  /**
   * Start cleanup scheduler
   */
  startScheduler(
    cleanupHandler: (
      dataLake: string,
      table: string
    ) => Promise<void>
  ): void {
    this.cleanupInterval = setInterval(async () => {
      const entries = Array.from(this.policies.entries());
      for (const [key, policy] of entries) {
        if (policy.enabled && policy.nextCleanup && new Date() >= policy.nextCleanup) {
          const [dataLake, table] = key.split(':');
          try {
            await cleanupHandler(dataLake, table);
          } catch (error) {
            this.onCleanupError?.(dataLake, table, error);
          }
        }
      }
    }, 3600000); // 1 hour
  }

  /**
   * Stop cleanup scheduler
   */
  stopScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clear all policies
   */
  clear(): void {
    this.policies.clear();
  }
}

// =============================================================================
// Storage Optimizer
// =============================================================================

export class StorageOptimizer {
  /**
   * Optimize storage with tiered placement
   */
  async optimize(
    adapter: DataLakeAdapter,
    tableName: string,
    catalogEntry: CatalogEntry,
    config: CostOptimizationConfig
  ): Promise<StorageOptimizationResult> {
    const result: StorageOptimizationResult = {
      tableName,
      tieredPartitions: 0,
      bytesMovedToWarm: 0,
      bytesMovedToCold: 0,
      bytesMovedToArchive: 0,
      estimatedSavings: 0,
      duration: 0,
    };

    if (!config.enableTiering) {
      return result;
    }

    const startTime = Date.now();
    const now = new Date();
    const { hotToWarmDays, warmToColdDays, coldToArchiveDays } = config;

    for (const partition of catalogEntry.partitions) {
      const ageInDays = Math.floor(
        (now.getTime() - partition.lastModified.getTime()) / 86400000
      );

      let targetTier: StorageTier = partition.tier;

      if (ageInDays >= coldToArchiveDays && partition.tier !== 'archive') {
        targetTier = 'archive';
        result.bytesMovedToArchive += partition.sizeBytes;
      } else if (ageInDays >= warmToColdDays && partition.tier === 'warm') {
        targetTier = 'cold';
        result.bytesMovedToCold += partition.sizeBytes;
      } else if (ageInDays >= hotToWarmDays && partition.tier === 'hot') {
        targetTier = 'warm';
        result.bytesMovedToWarm += partition.sizeBytes;
      }

      if (targetTier !== partition.tier) {
        await adapter.setStorageTier(tableName, partition.location, targetTier);
        partition.tier = targetTier;
        result.tieredPartitions++;
      }
    }

    const GB = 1024 ** 3;
    result.estimatedSavings =
      (result.bytesMovedToWarm / GB) * 0.01 +
      (result.bytesMovedToCold / GB) * 0.015 +
      (result.bytesMovedToArchive / GB) * 0.02;
    result.duration = Date.now() - startTime;

    return result;
  }

  /**
   * Calculate storage costs
   */
  async calculateCosts(
    adapters: Map<string, DataLakeAdapter>,
    catalog: Map<string, CatalogEntry>,
    dataLakeName?: string
  ): Promise<{
    totalCost: number;
    byTable: Record<string, number>;
    byTier: Record<StorageTier, number>;
  }> {
    const result = {
      totalCost: 0,
      byTable: {} as Record<string, number>,
      byTier: { hot: 0, warm: 0, cold: 0, archive: 0 } as Record<StorageTier, number>,
    };

    const dataLakes = dataLakeName
      ? [[dataLakeName, adapters.get(dataLakeName)]]
      : Array.from(adapters.entries());

    for (const [name, adapter] of dataLakes) {
      if (!adapter) continue;

      for (const table of await (adapter as DataLakeAdapter).listTables()) {
        const cost = await (adapter as DataLakeAdapter).getStorageCost(table);
        result.totalCost += cost;
        result.byTable[`${name}:${table}`] = cost;
      }
    }

    const tierRates: Record<StorageTier, number> = {
      hot: 0.023,
      warm: 0.0125,
      cold: 0.004,
      archive: 0.00099,
    };

    Array.from(catalog.values()).forEach(entry => {
      for (const partition of entry.partitions) {
        result.byTier[partition.tier] +=
          (partition.sizeBytes / 1024 ** 3) * tierRates[partition.tier];
      }
    });

    return result;
  }
}

// =============================================================================
// Cost Calculator
// =============================================================================

export class CostCalculator {
  private readonly tierRates: Record<StorageTier, number> = {
    hot: 0.023,
    warm: 0.0125,
    cold: 0.004,
    archive: 0.00099,
  };

  /**
   * Calculate cost for a partition
   */
  calculatePartitionCost(sizeBytes: number, tier: StorageTier): number {
    return (sizeBytes / 1024 ** 3) * this.tierRates[tier];
  }

  /**
   * Calculate cost for a table
   */
  calculateTableCost(entry: CatalogEntry): number {
    return entry.partitions.reduce(
      (total, p) => total + this.calculatePartitionCost(p.sizeBytes, p.tier),
      0
    );
  }

  /**
   * Calculate estimated savings from tiering
   */
  calculateTieringSavings(
    sizeBytes: number,
    currentTier: StorageTier,
    targetTier: StorageTier
  ): number {
    const currentCost = (sizeBytes / 1024 ** 3) * this.tierRates[currentTier];
    const targetCost = (sizeBytes / 1024 ** 3) * this.tierRates[targetTier];
    return currentCost - targetCost;
  }

  /**
   * Get tier rate
   */
  getTierRate(tier: StorageTier): number {
    return this.tierRates[tier];
  }
}

// =============================================================================
// Partition Manager
// =============================================================================

export class PartitionManager {
  /**
   * Build partition columns from spec
   */
  buildPartitionColumns(spec: {
    strategy: 'time' | 'source' | 'severity' | 'composite';
    timeGranularity?: 'hour' | 'day' | 'week' | 'month' | 'year';
    sourceField?: string;
    severityField?: string;
    customPartitions?: string[];
  }): string[] {
    const cols: string[] = [];

    if (spec.strategy === 'time' || spec.strategy === 'composite') {
      cols.push('year', 'month', 'day');
      if (spec.timeGranularity === 'hour') cols.push('hour');
    }

    if (spec.strategy === 'source' || spec.strategy === 'composite') {
      cols.push(spec.sourceField || 'source');
    }

    if (spec.strategy === 'severity' || spec.strategy === 'composite') {
      cols.push(spec.severityField || 'severity');
    }

    if (spec.customPartitions) {
      cols.push(...spec.customPartitions);
    }

    return cols;
  }

  /**
   * Build table location based on provider
   */
  buildTableLocation(config: DataLakeConfig, tableName: string): string {
    const locations: Record<string, string> = {
      aws: `s3://${config.bucket}/${tableName}/`,
      azure: `abfss://${config.container}@${config.credentials.accountId}.dfs.core.windows.net/${tableName}/`,
      gcp: `bq://${config.credentials.projectId}/${config.dataset}/${tableName}`,
      snowflake: `snowflake://${config.credentials.accountId}/${config.warehouse}/${tableName}`,
      databricks: `dbfs://${config.catalog}/${tableName}`,
    };

    return locations[config.provider] || '';
  }
}
