/**
 * Edge Sync Engine
 * Bidirectional synchronization between edge devices and cloud
 * Handles conflict resolution, offline buffering, and delta sync
 */

import { logger } from '../services/SimpleLogger';
import type {
  SyncOperation,
  SyncConflict,
  OfflineBuffer,
  OfflineEvent,
  EdgeWorkflowExecution
} from '../types/edge';

export interface SyncConfig {
  syncInterval: number; // seconds
  batchSize: number; // max operations per batch
  compressionEnabled: boolean;
  conflictResolution: 'local-wins' | 'remote-wins' | 'timestamp' | 'manual';
  retryAttempts: number;
  retryDelay: number; // ms
}

export interface SyncStats {
  totalOperations: number;
  successfulSyncs: number;
  failedSyncs: number;
  conflictsResolved: number;
  bytesTransferred: number;
  lastSyncTime: Date;
  averageSyncDuration: number; // ms
}

export class SyncEngine {
  private deviceId: string;
  private config: SyncConfig;
  private pendingOperations: Map<string, SyncOperation> = new Map();
  private conflicts: Map<string, SyncConflict> = new Map();
  private syncStats: SyncStats;
  private syncInterval?: NodeJS.Timeout;
  private isOnline: boolean = true;
  private isSyncing: boolean = false;

  constructor(deviceId: string, config: Partial<SyncConfig> = {}) {
    this.deviceId = deviceId;
    this.config = {
      syncInterval: config.syncInterval || 30,
      batchSize: config.batchSize || 100,
      compressionEnabled: config.compressionEnabled ?? true,
      conflictResolution: config.conflictResolution || 'timestamp',
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 5000
    };

    this.syncStats = {
      totalOperations: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      conflictsResolved: 0,
      bytesTransferred: 0,
      lastSyncTime: new Date(),
      averageSyncDuration: 0
    };

    logger.info('Sync Engine initialized', {
      context: { deviceId, config: this.config }
    });
  }

  /**
   * Start automatic synchronization
   */
  start(): void {
    if (this.syncInterval) {
      return;
    }

    logger.info('Starting sync engine', {
      context: { deviceId: this.deviceId, interval: this.config.syncInterval }
    });

    this.syncInterval = setInterval(async () => {
      if (this.isOnline && !this.isSyncing) {
        await this.performSync();
      }
    }, this.config.syncInterval * 1000);
  }

  /**
   * Stop automatic synchronization
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;

      logger.info('Sync engine stopped', {
        context: { deviceId: this.deviceId }
      });
    }
  }

  /**
   * Queue a sync operation
   */
  async queueOperation(operation: Omit<SyncOperation, 'id' | 'createdAt'>): Promise<string> {
    const id = this.generateId();

    const syncOp: SyncOperation = {
      ...operation,
      id,
      createdAt: new Date()
    };

    this.pendingOperations.set(id, syncOp);
    this.syncStats.totalOperations++;

    logger.debug('Sync operation queued', {
      context: {
        operationId: id,
        type: operation.type,
        dataType: operation.dataType
      }
    });

    // Trigger immediate sync if online
    if (this.isOnline && !this.isSyncing) {
      // Defer to next tick to avoid blocking
      setTimeout(() => this.performSync(), 0);
    }

    return id;
  }

  /**
   * Sync offline buffer to cloud
   */
  async syncOfflineBuffer(buffer: OfflineBuffer): Promise<{
    synced: number;
    failed: number;
    errors: Array<{ eventId: string; error: string }>;
  }> {
    logger.info('Syncing offline buffer', {
      context: {
        deviceId: this.deviceId,
        eventCount: buffer.events.length
      }
    });

    let synced = 0;
    let failed = 0;
    const errors: Array<{ eventId: string; error: string }> = [];

    // Process events in batches
    for (let i = 0; i < buffer.events.length; i += this.config.batchSize) {
      const batch = buffer.events.slice(i, i + this.config.batchSize);

      try {
        await this.syncBatch(batch);
        synced += batch.length;

        // Mark events as synced
        batch.forEach(event => {
          event.synced = true;
        });

      } catch (error) {
        failed += batch.length;

        batch.forEach(event => {
          errors.push({
            eventId: event.id,
            error: error instanceof Error ? error.message : String(error)
          });
        });

        logger.error('Batch sync failed', {
          context: {
            batchSize: batch.length,
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }

    logger.info('Offline buffer sync completed', {
      context: { synced, failed, totalEvents: buffer.events.length }
    });

    return { synced, failed, errors };
  }

  /**
   * Perform bidirectional sync
   */
  async performSync(): Promise<void> {
    if (this.isSyncing) {
      logger.debug('Sync already in progress, skipping');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      // Step 1: Push local changes to cloud
      await this.pushToCloud();

      // Step 2: Pull remote changes from cloud
      await this.pullFromCloud();

      // Step 3: Resolve any conflicts
      await this.resolveConflicts();

      // Update stats
      this.syncStats.successfulSyncs++;
      this.syncStats.lastSyncTime = new Date();

      const duration = Date.now() - startTime;
      this.syncStats.averageSyncDuration =
        (this.syncStats.averageSyncDuration + duration) / 2;

      logger.info('Sync completed successfully', {
        context: {
          deviceId: this.deviceId,
          duration,
          operationsProcessed: this.pendingOperations.size
        }
      });

    } catch (error) {
      this.syncStats.failedSyncs++;

      logger.error('Sync failed', {
        context: {
          deviceId: this.deviceId,
          error: error instanceof Error ? error.message : String(error)
        }
      });

    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Set online/offline status
   */
  setOnlineStatus(online: boolean): void {
    const wasOnline = this.isOnline;
    this.isOnline = online;

    if (!wasOnline && online) {
      logger.info('Device back online, triggering sync', {
        context: { deviceId: this.deviceId, pendingOperations: this.pendingOperations.size }
      });

      // Trigger immediate sync
      setTimeout(() => this.performSync(), 1000);
    }
  }

  /**
   * Get sync statistics
   */
  getStats(): SyncStats {
    return { ...this.syncStats };
  }

  /**
   * Get pending operations
   */
  getPendingOperations(): SyncOperation[] {
    return Array.from(this.pendingOperations.values());
  }

  /**
   * Get unresolved conflicts
   */
  getConflicts(): SyncConflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Manually resolve a conflict
   */
  async resolveConflict(
    conflictId: string,
    resolution: 'local-wins' | 'remote-wins' | 'merge',
    mergedData?: unknown
  ): Promise<void> {
    const conflict = this.conflicts.get(conflictId);

    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    conflict.resolution = resolution;
    conflict.resolvedAt = new Date();

    // Apply resolution
    if (resolution === 'merge' && mergedData) {
      // Use merged data
      await this.applyMergedData(conflict, mergedData);
    } else if (resolution === 'local-wins') {
      // Keep local data
      await this.applyLocalData(conflict);
    } else {
      // Use remote data
      await this.applyRemoteData(conflict);
    }

    this.conflicts.delete(conflictId);
    this.syncStats.conflictsResolved++;

    logger.info('Conflict resolved', {
      context: { conflictId, resolution }
    });
  }

  // Private methods

  private async pushToCloud(): Promise<void> {
    if (this.pendingOperations.size === 0) {
      return;
    }

    logger.debug('Pushing changes to cloud', {
      context: { operationCount: this.pendingOperations.size }
    });

    const operations = Array.from(this.pendingOperations.values())
      .filter(op => op.status === 'pending' || op.status === 'failed')
      .slice(0, this.config.batchSize);

    for (const operation of operations) {
      try {
        operation.status = 'syncing';

        // Compress payload if enabled
        const payload = this.config.compressionEnabled
          ? await this.compressPayload(operation.payload)
          : operation.payload;

        // Simulate cloud push (in production, make actual API call)
        await this.sendToCloud(operation.deviceId, operation.dataType, payload);

        // Update operation
        operation.status = 'completed';
        operation.completedAt = new Date();

        // Track bytes transferred
        this.syncStats.bytesTransferred += operation.size;

        // Remove from pending
        this.pendingOperations.delete(operation.id);

        logger.debug('Operation pushed successfully', {
          context: { operationId: operation.id, dataType: operation.dataType }
        });

      } catch (error) {
        operation.status = 'failed';
        operation.error = error instanceof Error ? error.message : String(error);

        logger.error('Failed to push operation', {
          context: {
            operationId: operation.id,
            error: operation.error
          }
        });
      }
    }
  }

  private async pullFromCloud(): Promise<void> {
    logger.debug('Pulling changes from cloud');

    try {
      // Simulate cloud pull (in production, make actual API call)
      const remoteChanges = await this.fetchFromCloud(this.deviceId);

      for (const change of remoteChanges) {
        await this.applyRemoteChange(change);
      }

      logger.debug('Remote changes applied', {
        context: { changeCount: remoteChanges.length }
      });

    } catch (error) {
      logger.error('Failed to pull from cloud', {
        context: { error: error instanceof Error ? error.message : String(error) }
      });

      throw error;
    }
  }

  private async resolveConflicts(): Promise<void> {
    if (this.conflicts.size === 0) {
      return;
    }

    logger.info('Resolving conflicts', {
      context: { conflictCount: this.conflicts.size }
    });

    for (const conflict of this.conflicts.values()) {
      if (conflict.resolution) {
        continue; // Already resolved
      }

      // Auto-resolve based on strategy
      switch (this.config.conflictResolution) {
        case 'local-wins':
          await this.resolveConflict(conflict.id, 'local-wins');
          break;

        case 'remote-wins':
          await this.resolveConflict(conflict.id, 'remote-wins');
          break;

        case 'timestamp':
          // Compare timestamps and pick newer
          const localTimestamp = this.getTimestamp(conflict.localData);
          const remoteTimestamp = this.getTimestamp(conflict.remoteData);

          if (localTimestamp > remoteTimestamp) {
            await this.resolveConflict(conflict.id, 'local-wins');
          } else {
            await this.resolveConflict(conflict.id, 'remote-wins');
          }
          break;

        case 'manual':
          // Leave for manual resolution
          logger.info('Conflict requires manual resolution', {
            context: { conflictId: conflict.id }
          });
          break;
      }
    }
  }

  private async syncBatch(events: OfflineEvent[]): Promise<void> {
    // Compress batch if enabled
    const payload = this.config.compressionEnabled
      ? await this.compressBatch(events)
      : events;

    // Send batch to cloud
    await this.sendToCloud(this.deviceId, 'offline-events', payload);

    // Update bytes transferred
    const batchSize = JSON.stringify(events).length;
    this.syncStats.bytesTransferred += batchSize;
  }

  private async applyRemoteChange(change: unknown): Promise<void> {
    // Check for conflicts with local data
    const hasConflict = await this.checkConflict(change);

    if (hasConflict) {
      const conflict: SyncConflict = {
        id: this.generateId(),
        syncOperationId: '',
        type: 'data-mismatch',
        localData: await this.getLocalData(change),
        remoteData: change
      };

      this.conflicts.set(conflict.id, conflict);

      logger.warn('Conflict detected', {
        context: { conflictId: conflict.id }
      });

    } else {
      // Apply change directly
      await this.applyChange(change);
    }
  }

  private async compressPayload(payload: unknown): Promise<unknown> {
    // Simple compression simulation (in production, use actual compression)
    return payload;
  }

  private async compressBatch(events: OfflineEvent[]): Promise<unknown> {
    // Compress batch (in production, use gzip or similar)
    return events;
  }

  private async sendToCloud(deviceId: string, dataType: string, payload: unknown): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));

    // In production, make actual API call to cloud
    logger.debug('Data sent to cloud', {
      context: { deviceId, dataType, size: JSON.stringify(payload).length }
    });
  }

  private async fetchFromCloud(deviceId: string): Promise<unknown[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));

    // In production, fetch from actual cloud API
    return [];
  }

  private async checkConflict(change: unknown): Promise<boolean> {
    // Check if local version differs from remote
    return false; // Simplified
  }

  private async getLocalData(change: unknown): Promise<unknown> {
    // Fetch corresponding local data
    return change;
  }

  private async applyChange(change: unknown): Promise<void> {
    // Apply remote change to local storage
    logger.debug('Remote change applied', {
      context: { change }
    });
  }

  private async applyMergedData(conflict: SyncConflict, data: unknown): Promise<void> {
    // Apply merged data
    logger.info('Merged data applied', {
      context: { conflictId: conflict.id }
    });
  }

  private async applyLocalData(conflict: SyncConflict): Promise<void> {
    // Keep local data, push to cloud
    await this.sendToCloud(this.deviceId, 'conflict-resolution', conflict.localData);
  }

  private async applyRemoteData(conflict: SyncConflict): Promise<void> {
    // Use remote data, update local
    await this.applyChange(conflict.remoteData);
  }

  private getTimestamp(data: unknown): number {
    if (typeof data === 'object' && data !== null && 'timestamp' in data) {
      const timestamp = (data as { timestamp: unknown }).timestamp;
      if (timestamp instanceof Date) {
        return timestamp.getTime();
      }
      if (typeof timestamp === 'number') {
        return timestamp;
      }
    }
    return 0;
  }

  private generateId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create a sync engine instance
 */
export function createSyncEngine(
  deviceId: string,
  config?: Partial<SyncConfig>
): SyncEngine {
  return new SyncEngine(deviceId, config);
}
