/**
 * Snapshot Service
 * Manages aggregate snapshots for performance optimization
 */

import {
  AggregateRoot,
  AggregateSnapshot,
  ISnapshotStrategy,
  DefaultSnapshotStrategy,
} from './types/eventsourcing';
import { eventStore } from './EventStore';
import { logger } from '../services/SimpleLogger';

/**
 * Snapshot Configuration
 */
export interface SnapshotConfig {
  /** Snapshot strategy */
  strategy: ISnapshotStrategy;

  /** Enable automatic snapshots */
  enableAutoSnapshot: boolean;

  /** Enable snapshot compression */
  enableCompression: boolean;

  /** Maximum snapshot age in days */
  maxSnapshotAgeDays: number;

  /** Keep N most recent snapshots */
  keepRecentSnapshots: number;
}

/**
 * Snapshot Metadata
 */
export interface SnapshotMetadata {
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: Date;
  size: number;
  compressed: boolean;
  createdBy: string;
}

/**
 * Snapshot Service
 * Handles snapshot creation, storage, and retrieval
 */
export class SnapshotService {
  private config: SnapshotConfig;
  private snapshotMetadata: Map<string, SnapshotMetadata[]> = new Map();

  constructor(config?: Partial<SnapshotConfig>) {
    this.config = {
      strategy: config?.strategy || new DefaultSnapshotStrategy(100),
      enableAutoSnapshot: config?.enableAutoSnapshot !== false,
      enableCompression: config?.enableCompression !== false,
      maxSnapshotAgeDays: config?.maxSnapshotAgeDays || 30,
      keepRecentSnapshots: config?.keepRecentSnapshots || 5,
    };
  }

  /**
   * Create a snapshot for an aggregate
   */
  async createSnapshot<T extends AggregateRoot>(
    aggregate: T,
    aggregateType: string,
    userId?: string
  ): Promise<void> {
    const state = aggregate.getState();
    const version = aggregate.version;

    // Compress state if enabled
    const serializedState = this.config.enableCompression
      ? this.compressState(state)
      : state;

    // Save to event store
    await eventStore.saveSnapshot(
      aggregate.id,
      aggregateType,
      version,
      serializedState
    );

    // Track metadata
    const metadata: SnapshotMetadata = {
      aggregateId: aggregate.id,
      aggregateType,
      version,
      timestamp: new Date(),
      size: JSON.stringify(state).length,
      compressed: this.config.enableCompression,
      createdBy: userId || 'system',
    };

    const key = this.getKey(aggregate.id, aggregateType);
    const metadataList = this.snapshotMetadata.get(key) || [];
    metadataList.push(metadata);
    this.snapshotMetadata.set(key, metadataList);

    // Cleanup old snapshots
    await this.cleanupOldSnapshots(aggregate.id, aggregateType);
  }

  /**
   * Load snapshot and restore aggregate
   */
  async loadSnapshot<T extends AggregateRoot>(
    aggregate: T,
    aggregateType: string
  ): Promise<boolean> {
    const snapshot = await eventStore.getSnapshot(aggregate.id, aggregateType);

    if (!snapshot) {
      return false;
    }

    // Decompress if needed
    const state = this.config.enableCompression
      ? this.decompressState(JSON.parse(snapshot.state))
      : JSON.parse(snapshot.state);

    // Restore aggregate state
    aggregate.restoreState(state);
    aggregate.version = snapshot.version;

    return true;
  }

  /**
   * Rebuild aggregate from events with snapshot optimization
   */
  async rebuildAggregate<T extends AggregateRoot>(
    aggregate: T,
    aggregateType: string
  ): Promise<void> {
    // Try to load snapshot first
    const snapshotLoaded = await this.loadSnapshot(aggregate, aggregateType);

    // Get events from snapshot version
    const fromVersion = snapshotLoaded ? aggregate.version + 1 : 1;
    const events = await eventStore.getEvents(
      aggregate.id,
      aggregateType,
      fromVersion
    );

    // Replay events
    for (const event of events) {
      aggregate.replayEvent(event);
    }

    // Auto-snapshot if strategy says so
    if (
      this.config.enableAutoSnapshot &&
      this.config.strategy.shouldTakeSnapshot(aggregate.id, aggregate.version)
    ) {
      await this.createSnapshot(aggregate, aggregateType);
    }
  }

  /**
   * Check if snapshot should be taken
   */
  shouldTakeSnapshot(aggregateId: string, version: number): boolean {
    return this.config.strategy.shouldTakeSnapshot(aggregateId, version);
  }

  /**
   * Get snapshot metadata
   */
  getSnapshotMetadata(
    aggregateId: string,
    aggregateType: string
  ): SnapshotMetadata[] {
    const key = this.getKey(aggregateId, aggregateType);
    return this.snapshotMetadata.get(key) || [];
  }

  /**
   * Get latest snapshot metadata
   */
  getLatestSnapshotMetadata(
    aggregateId: string,
    aggregateType: string
  ): SnapshotMetadata | null {
    const metadata = this.getSnapshotMetadata(aggregateId, aggregateType);
    if (metadata.length === 0) {
      return null;
    }
    return metadata[metadata.length - 1];
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(
    aggregateId: string,
    aggregateType: string,
    version: number
  ): Promise<void> {
    // In production, delete from database
    logger.debug(
      `Deleting snapshot for ${aggregateType}:${aggregateId} version ${version}`
    );

    // Update metadata
    const key = this.getKey(aggregateId, aggregateType);
    const metadata = this.snapshotMetadata.get(key) || [];
    const filtered = metadata.filter((m) => m.version !== version);
    this.snapshotMetadata.set(key, filtered);
  }

  /**
   * Cleanup old snapshots
   */
  private async cleanupOldSnapshots(
    aggregateId: string,
    aggregateType: string
  ): Promise<void> {
    const key = this.getKey(aggregateId, aggregateType);
    const metadata = this.snapshotMetadata.get(key) || [];

    // Sort by timestamp descending
    metadata.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Keep only recent snapshots
    const toKeep = metadata.slice(0, this.config.keepRecentSnapshots);
    const toDelete = metadata.slice(this.config.keepRecentSnapshots);

    // Delete old snapshots
    for (const snapshot of toDelete) {
      await this.deleteSnapshot(aggregateId, aggregateType, snapshot.version);
    }

    // Delete snapshots older than max age
    const maxAge = new Date();
    maxAge.setDate(maxAge.getDate() - this.config.maxSnapshotAgeDays);

    const recentEnough = toKeep.filter((m) => m.timestamp >= maxAge);

    this.snapshotMetadata.set(key, recentEnough);
  }

  /**
   * Get snapshot statistics
   */
  getStatistics(): {
    totalSnapshots: number;
    totalSize: number;
    avgSize: number;
    compressionRatio: number;
    snapshotsByType: Record<string, number>;
  } {
    let totalSnapshots = 0;
    let totalSize = 0;
    let compressedCount = 0;
    const snapshotsByType: Record<string, number> = {};

    for (const metadata of this.snapshotMetadata.values()) {
      for (const snapshot of metadata) {
        totalSnapshots++;
        totalSize += snapshot.size;
        if (snapshot.compressed) {
          compressedCount++;
        }
        snapshotsByType[snapshot.aggregateType] =
          (snapshotsByType[snapshot.aggregateType] || 0) + 1;
      }
    }

    return {
      totalSnapshots,
      totalSize,
      avgSize: totalSnapshots > 0 ? totalSize / totalSnapshots : 0,
      compressionRatio:
        totalSnapshots > 0 ? compressedCount / totalSnapshots : 0,
      snapshotsByType,
    };
  }

  /**
   * Compress state (simple implementation)
   */
  private compressState(state: Record<string, unknown>): Record<string, unknown> {
    // In production, use proper compression like gzip
    // For now, just return as-is
    return state;
  }

  /**
   * Decompress state
   */
  private decompressState(state: Record<string, unknown>): Record<string, unknown> {
    // In production, use proper decompression
    return state;
  }

  /**
   * Get key for metadata storage
   */
  private getKey(aggregateId: string, aggregateType: string): string {
    return `${aggregateType}:${aggregateId}`;
  }
}

/**
 * Global snapshot service instance
 */
export const snapshotService = new SnapshotService({
  strategy: new DefaultSnapshotStrategy(100),
  enableAutoSnapshot: true,
  enableCompression: true,
  maxSnapshotAgeDays: 30,
  keepRecentSnapshots: 5,
});
