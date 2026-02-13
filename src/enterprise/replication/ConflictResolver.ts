/**
 * Conflict Resolver
 * Handles conflict detection and resolution strategies for multi-master replication
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import type {
  ConflictRecord,
  ConflictResolution,
  ConflictStrategy,
  CustomConflictResolver,
  DataVersion,
  CDCEvent,
  ReplicationConfig,
  ReplicationMetrics,
} from './types';

// ============================================================================
// Conflict Resolver Class
// ============================================================================

export class ConflictResolver extends EventEmitter {
  private conflicts: Map<string, ConflictRecord> = new Map();
  private customResolvers: Map<string, CustomConflictResolver> = new Map();
  private config: ReplicationConfig | null = null;
  private metrics: ReplicationMetrics;

  constructor(metrics: ReplicationMetrics) {
    super();
    this.metrics = metrics;
  }

  public setConfig(config: ReplicationConfig | null): void {
    this.config = config;
  }

  // ============================================================================
  // Conflict Detection
  // ============================================================================

  public async detectConflict(
    event: CDCEvent,
    targetRegion: string,
    getLocalVersionFn: (regionId: string, table: string, primaryKey: Record<string, unknown>) => Promise<DataVersion | null>,
    vectorClocks: Map<string, Record<string, number>>,
    calculateChecksumFn: (data: Record<string, unknown>) => string
  ): Promise<ConflictRecord | null> {
    const localVersion = await getLocalVersionFn(targetRegion, event.table, event.primaryKey);

    if (!localVersion) return null;

    const localClock = localVersion.vectorClock;
    const remoteClock = vectorClocks.get(event.sourceRegion) || {};

    if (this.isConflicting(localClock, remoteClock)) {
      const conflict: ConflictRecord = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        table: event.table,
        primaryKey: event.primaryKey,
        localVersion,
        remoteVersion: {
          regionId: event.sourceRegion,
          timestamp: event.timestamp,
          data: event.after || {},
          checksum: calculateChecksumFn(event.after || {}),
          vectorClock: remoteClock
        }
      };

      this.conflicts.set(conflict.id, conflict);
      this.metrics.conflictsDetected++;
      this.emit('conflictDetected', { conflict });

      return conflict;
    }

    return null;
  }

  public isConflicting(
    clock1: Record<string, number>,
    clock2: Record<string, number>
  ): boolean {
    let clock1Greater = false;
    let clock2Greater = false;

    const allKeys = new Set([...Object.keys(clock1), ...Object.keys(clock2)]);

    for (const key of allKeys) {
      const v1 = clock1[key] || 0;
      const v2 = clock2[key] || 0;

      if (v1 > v2) clock1Greater = true;
      if (v2 > v1) clock2Greater = true;
    }

    return clock1Greater && clock2Greater;
  }

  // ============================================================================
  // Conflict Resolution
  // ============================================================================

  public async resolveConflict(
    conflictId: string,
    resolution?: ConflictResolution
  ): Promise<ConflictRecord> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    if (conflict.resolution) {
      throw new Error(`Conflict ${conflictId} already resolved`);
    }

    const finalResolution = resolution || await this.autoResolveConflict(conflict);

    conflict.resolution = finalResolution;
    conflict.resolvedAt = new Date();

    this.metrics.conflictsResolved++;
    this.emit('conflictResolved', { conflict });

    return conflict;
  }

  public async autoResolveConflict(conflict: ConflictRecord): Promise<ConflictResolution> {
    if (!this.config) {
      throw new Error('Replication not configured');
    }

    const { conflictStrategy } = this.config;

    switch (conflictStrategy) {
      case 'last-write-wins':
        return this.resolveLastWriteWins(conflict);

      case 'merge':
        return this.resolveMerge(conflict);

      case 'custom':
        return this.resolveCustom(conflict);

      default:
        throw new Error(`Unknown conflict strategy: ${conflictStrategy}`);
    }
  }

  public resolveLastWriteWins(conflict: ConflictRecord): ConflictResolution {
    const localTime = conflict.localVersion.timestamp.getTime();
    const remoteTime = conflict.remoteVersion.timestamp.getTime();

    const winner = remoteTime >= localTime ? 'remote' : 'local';

    return {
      strategy: 'last-write-wins',
      winner,
      reason: `${winner} version has later timestamp (${winner === 'remote' ? remoteTime : localTime})`
    };
  }

  public resolveMerge(conflict: ConflictRecord): ConflictResolution {
    const localData = conflict.localVersion.data;
    const remoteData = conflict.remoteVersion.data;

    const mergedData = this.deepMerge(localData, remoteData);

    return {
      strategy: 'merge',
      winner: 'merged',
      mergedData,
      reason: 'Data merged from both versions'
    };
  }

  public async resolveCustom(conflict: ConflictRecord): Promise<ConflictResolution> {
    const resolver = this.customResolvers.get(conflict.table);

    if (resolver) {
      return resolver(conflict);
    }

    return this.resolveLastWriteWins(conflict);
  }

  public registerConflictResolver(table: string, resolver: CustomConflictResolver): void {
    this.customResolvers.set(table, resolver);
    this.emit('resolverRegistered', { table });
  }

  public hasCustomResolver(table: string): boolean {
    return this.customResolvers.has(table);
  }

  // ============================================================================
  // Conflict Application
  // ============================================================================

  public async applyConflictResolution(
    conflict: ConflictRecord,
    applyDataFn: (regionId: string, table: string, primaryKey: Record<string, unknown>, data: Record<string, unknown>) => Promise<void>,
    regions: { id: string }[]
  ): Promise<void> {
    if (!conflict.resolution) return;

    const dataToApply = conflict.resolution.winner === 'merged'
      ? conflict.resolution.mergedData
      : conflict.resolution.winner === 'remote'
        ? conflict.remoteVersion.data
        : conflict.localVersion.data;

    for (const region of regions) {
      await applyDataFn(region.id, conflict.table, conflict.primaryKey, dataToApply || {});
    }

    this.emit('resolutionApplied', { conflict });
  }

  public async handleConflict(conflict: ConflictRecord): Promise<void> {
    if (this.config?.conflictStrategy === 'custom' && !this.customResolvers.has(conflict.table)) {
      this.emit('conflictPendingResolution', { conflict });
      return;
    }

    await this.resolveConflict(conflict.id);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  public deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      if (
        source[key] !== null &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] !== null &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        result[key] = this.deepMerge(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        );
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  // ============================================================================
  // Getters
  // ============================================================================

  public getPendingConflicts(): ConflictRecord[] {
    return Array.from(this.conflicts.values()).filter(c => !c.resolution);
  }

  public getConflict(conflictId: string): ConflictRecord | undefined {
    return this.conflicts.get(conflictId);
  }

  public getAllConflicts(): ConflictRecord[] {
    return Array.from(this.conflicts.values());
  }

  public cleanup(): void {
    this.conflicts.clear();
    this.customResolvers.clear();
    this.removeAllListeners();
  }
}
