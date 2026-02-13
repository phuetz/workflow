/**
 * Cross-Region Data Replication
 * Handles bidirectional and unidirectional data replication across regions
 */

export interface ReplicationConfig {
  mode: 'active-active' | 'active-passive';
  regions: string[];
  conflictResolution: ConflictResolutionStrategy;
  replicationLag: {
    maxAcceptable: number; // milliseconds
    monitoringInterval: number; // milliseconds
  };
  retryPolicy: RetryPolicy;
  filters?: ReplicationFilter[];
}

export type ConflictResolutionStrategy =
  | 'last-write-wins'
  | 'version-vectors'
  | 'manual'
  | 'custom';

export interface RetryPolicy {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

export interface ReplicationFilter {
  type: 'include' | 'exclude';
  tables?: string[];
  columns?: string[];
  conditions?: Record<string, unknown>;
}

export interface ReplicationStatus {
  sourceRegion: string;
  targetRegion: string;
  healthy: boolean;
  lagMs: number;
  lastSyncTime: Date;
  pendingOperations: number;
  errorCount: number;
  throughput: number; // operations per second
}

export interface DataOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  timestamp: Date;
  version?: number;
  vectorClock?: Record<string, number>;
  sourceRegion: string;
}

export interface ConflictEvent {
  id: string;
  operation1: DataOperation;
  operation2: DataOperation;
  detectedAt: Date;
  resolved: boolean;
  resolution?: DataOperation;
}

export class DataReplication {
  private config: ReplicationConfig;
  private replicationStatus: Map<string, ReplicationStatus> = new Map();
  private pendingOperations: Map<string, DataOperation[]> = new Map();
  private conflicts: ConflictEvent[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private logger: (message: string) => void;

  constructor(config: ReplicationConfig, logger?: (message: string) => void) {
    this.config = config;
    this.logger = logger || (() => {});

    // Initialize status for each region pair
    this.initializeReplicationStatus();
  }

  /**
   * Initialize replication status tracking
   */
  private initializeReplicationStatus(): void {
    for (const sourceRegion of this.config.regions) {
      for (const targetRegion of this.config.regions) {
        if (sourceRegion === targetRegion) continue;

        // For active-passive, only replicate from primary to secondaries
        if (this.config.mode === 'active-passive') {
          if (sourceRegion !== this.config.regions[0]) continue;
        }

        const key = `${sourceRegion}->${targetRegion}`;
        this.replicationStatus.set(key, {
          sourceRegion,
          targetRegion,
          healthy: true,
          lagMs: 0,
          lastSyncTime: new Date(),
          pendingOperations: 0,
          errorCount: 0,
          throughput: 0
        });

        this.pendingOperations.set(key, []);
      }
    }
  }

  /**
   * Start replication monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      this.logger('Replication monitoring already running');
      return;
    }

    this.logger('Starting replication monitoring...');
    this.monitoringInterval = setInterval(
      () => this.monitorReplicationLag(),
      this.config.replicationLag.monitoringInterval
    );
  }

  /**
   * Stop replication monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      this.logger('Replication monitoring stopped');
    }
  }

  /**
   * Replicate a data operation to other regions
   */
  async replicateOperation(operation: DataOperation): Promise<void> {
    this.logger(`Replicating ${operation.type} operation on ${operation.table} from ${operation.sourceRegion}`);

    // Check if operation should be replicated based on filters
    if (!this.shouldReplicate(operation)) {
      this.logger(`Operation filtered out, skipping replication`);
      return;
    }

    // Determine target regions
    const targetRegions = this.getTargetRegions(operation.sourceRegion);

    // Replicate to each target region
    const replications = targetRegions.map(targetRegion =>
      this.replicateToRegion(operation, targetRegion)
    );

    await Promise.allSettled(replications);
  }

  /**
   * Check if operation should be replicated based on filters
   */
  private shouldReplicate(operation: DataOperation): boolean {
    if (!this.config.filters || this.config.filters.length === 0) {
      return true;
    }

    for (const filter of this.config.filters) {
      const matches = this.matchesFilter(operation, filter);

      if (filter.type === 'include' && matches) {
        return true;
      }
      if (filter.type === 'exclude' && matches) {
        return false;
      }
    }

    // Default behavior based on filter types
    const hasIncludeFilters = this.config.filters.some(f => f.type === 'include');
    return !hasIncludeFilters; // If no include filters, allow by default
  }

  /**
   * Check if operation matches a filter
   */
  private matchesFilter(operation: DataOperation, filter: ReplicationFilter): boolean {
    // Check table filter
    if (filter.tables && !filter.tables.includes(operation.table)) {
      return false;
    }

    // Check column filter
    if (filter.columns) {
      const operationColumns = Object.keys(operation.data);
      const hasMatchingColumn = filter.columns.some(col => operationColumns.includes(col));
      if (!hasMatchingColumn) {
        return false;
      }
    }

    // Check conditions
    if (filter.conditions) {
      for (const [key, value] of Object.entries(filter.conditions)) {
        if (operation.data[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get target regions for replication
   */
  private getTargetRegions(sourceRegion: string): string[] {
    if (this.config.mode === 'active-active') {
      // Replicate to all other regions
      return this.config.regions.filter(r => r !== sourceRegion);
    } else {
      // Active-passive: only primary replicates to secondaries
      if (sourceRegion === this.config.regions[0]) {
        return this.config.regions.slice(1);
      }
      return [];
    }
  }

  /**
   * Replicate operation to a specific region
   */
  private async replicateToRegion(
    operation: DataOperation,
    targetRegion: string
  ): Promise<void> {
    const key = `${operation.sourceRegion}->${targetRegion}`;
    const status = this.replicationStatus.get(key);

    if (!status) {
      this.logger(`No replication status found for ${key}`);
      return;
    }

    try {
      // Add to pending operations
      const pending = this.pendingOperations.get(key) || [];
      pending.push(operation);
      this.pendingOperations.set(key, pending);
      status.pendingOperations = pending.length;

      // Apply operation with retry logic
      await this.applyOperationWithRetry(operation, targetRegion);

      // Remove from pending operations
      const index = pending.indexOf(operation);
      if (index > -1) {
        pending.splice(index, 1);
        status.pendingOperations = pending.length;
      }

      // Update status
      status.lastSyncTime = new Date();
      status.lagMs = Date.now() - operation.timestamp.getTime();
      status.healthy = true;

      this.logger(`Successfully replicated to ${targetRegion}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger(`Replication to ${targetRegion} failed: ${errorMessage}`);

      status.errorCount++;
      status.healthy = false;

      // Keep in pending for retry
      throw error;
    }
  }

  /**
   * Apply operation to target region with retry logic
   */
  private async applyOperationWithRetry(
    operation: DataOperation,
    targetRegion: string
  ): Promise<void> {
    const { maxAttempts, initialDelay, maxDelay, backoffMultiplier } = this.config.retryPolicy;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.applyOperation(operation, targetRegion);
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }

        this.logger(`Retry ${attempt}/${maxAttempts} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));

        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  /**
   * Apply operation to target region
   */
  private async applyOperation(
    operation: DataOperation,
    targetRegion: string
  ): Promise<void> {
    // This would integrate with actual database/storage system
    // For now, this is a placeholder

    // Check for conflicts
    const conflict = await this.detectConflict(operation, targetRegion);

    if (conflict) {
      this.logger(`Conflict detected for operation ${operation.id}`);
      await this.resolveConflict(conflict);
    } else {
      // Apply the operation
      this.logger(`Applying ${operation.type} on ${operation.table} to ${targetRegion}`);

      // Actual database operation would go here
      // Examples:
      // - await db.insert(operation.table, operation.data)
      // - await db.update(operation.table, operation.data)
      // - await db.delete(operation.table, operation.data)
    }
  }

  /**
   * Detect conflicts with existing data
   */
  private async detectConflict(
    operation: DataOperation,
    targetRegion: string
  ): Promise<ConflictEvent | null> {
    // In active-active mode with concurrent writes, conflicts can occur

    // This would check if there's a concurrent modification
    // For now, this is a placeholder that simulates conflict detection

    // Example: Check if version numbers conflict
    if (this.config.conflictResolution === 'version-vectors' && operation.vectorClock) {
      // Compare vector clocks to detect conflicts
      // Implementation would depend on actual storage system
    }

    return null; // No conflict detected
  }

  /**
   * Resolve a conflict based on configured strategy
   */
  private async resolveConflict(conflict: ConflictEvent): Promise<void> {
    this.logger(`Resolving conflict ${conflict.id} using ${this.config.conflictResolution}`);

    let resolution: DataOperation;

    switch (this.config.conflictResolution) {
      case 'last-write-wins':
        resolution = this.resolveLastWriteWins(conflict);
        break;

      case 'version-vectors':
        resolution = this.resolveVersionVectors(conflict);
        break;

      case 'manual':
        // Store conflict for manual resolution
        this.conflicts.push(conflict);
        this.logger(`Conflict ${conflict.id} queued for manual resolution`);
        return;

      case 'custom':
        // Custom resolution logic would go here
        resolution = conflict.operation1;
        break;

      default:
        resolution = conflict.operation1;
    }

    conflict.resolved = true;
    conflict.resolution = resolution;

    this.logger(`Conflict ${conflict.id} resolved`);
  }

  /**
   * Resolve conflict using last-write-wins strategy
   */
  private resolveLastWriteWins(conflict: ConflictEvent): DataOperation {
    const op1Time = conflict.operation1.timestamp.getTime();
    const op2Time = conflict.operation2.timestamp.getTime();

    return op1Time > op2Time ? conflict.operation1 : conflict.operation2;
  }

  /**
   * Resolve conflict using version vectors
   */
  private resolveVersionVectors(conflict: ConflictEvent): DataOperation {
    const vec1 = conflict.operation1.vectorClock || {};
    const vec2 = conflict.operation2.vectorClock || {};

    // Check if one vector clock dominates the other
    let vec1Dominates = true;
    let vec2Dominates = true;

    const allRegions = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);

    for (const region of allRegions) {
      const v1 = vec1[region] || 0;
      const v2 = vec2[region] || 0;

      if (v1 < v2) vec1Dominates = false;
      if (v2 < v1) vec2Dominates = false;
    }

    if (vec1Dominates) return conflict.operation1;
    if (vec2Dominates) return conflict.operation2;

    // Vectors are concurrent, fall back to last-write-wins
    return this.resolveLastWriteWins(conflict);
  }

  /**
   * Monitor replication lag
   */
  private async monitorReplicationLag(): Promise<void> {
    for (const [key, status] of this.replicationStatus.entries()) {
      const pending = this.pendingOperations.get(key) || [];

      if (pending.length > 0) {
        const oldestOperation = pending[0];
        const lagMs = Date.now() - oldestOperation.timestamp.getTime();
        status.lagMs = lagMs;

        if (lagMs > this.config.replicationLag.maxAcceptable) {
          this.logger(`WARNING: Replication lag for ${key} exceeds threshold: ${lagMs}ms`);
          status.healthy = false;
        }
      } else {
        status.lagMs = 0;
      }

      // Calculate throughput (operations per second)
      const timeDiff = (Date.now() - status.lastSyncTime.getTime()) / 1000;
      if (timeDiff > 0) {
        status.throughput = pending.length / timeDiff;
      }
    }
  }

  /**
   * Get replication status for all region pairs
   */
  getReplicationStatus(): ReplicationStatus[] {
    return Array.from(this.replicationStatus.values());
  }

  /**
   * Get pending conflicts that need manual resolution
   */
  getPendingConflicts(): ConflictEvent[] {
    return this.conflicts.filter(c => !c.resolved);
  }

  /**
   * Manually resolve a conflict
   */
  manuallyResolveConflict(conflictId: string, resolution: DataOperation): void {
    const conflict = this.conflicts.find(c => c.id === conflictId);

    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    conflict.resolved = true;
    conflict.resolution = resolution;

    this.logger(`Conflict ${conflictId} manually resolved`);
  }

  /**
   * Force synchronization of all pending operations
   */
  async forceSynchronization(): Promise<void> {
    this.logger('Forcing synchronization of all pending operations...');

    const syncPromises: Promise<void>[] = [];

    for (const [key, operations] of this.pendingOperations.entries()) {
      const [sourceRegion, targetRegion] = key.split('->');

      for (const operation of operations) {
        syncPromises.push(
          this.replicateToRegion(operation, targetRegion)
            .catch(error => {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              this.logger(`Failed to sync ${operation.id}: ${errorMessage}`);
            })
        );
      }
    }

    await Promise.allSettled(syncPromises);
    this.logger('Force synchronization completed');
  }

  /**
   * Get replication metrics
   */
  getMetrics(): {
    totalOperations: number;
    pendingOperations: number;
    averageLagMs: number;
    healthyConnections: number;
    totalConnections: number;
    conflictCount: number;
  } {
    const statuses = Array.from(this.replicationStatus.values());
    const totalPending = Array.from(this.pendingOperations.values())
      .reduce((sum, ops) => sum + ops.length, 0);

    const avgLag = statuses.length > 0
      ? statuses.reduce((sum, s) => sum + s.lagMs, 0) / statuses.length
      : 0;

    const healthy = statuses.filter(s => s.healthy).length;

    return {
      totalOperations: 0, // Would track total operations replicated
      pendingOperations: totalPending,
      averageLagMs: Math.round(avgLag),
      healthyConnections: healthy,
      totalConnections: statuses.length,
      conflictCount: this.conflicts.length
    };
  }
}
