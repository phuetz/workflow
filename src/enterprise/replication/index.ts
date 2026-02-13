/**
 * Data Replication Module
 * Enterprise-grade data replication with multi-master support,
 * conflict resolution, cross-region sync, and CDC integration
 *
 * This module provides a facade that composes the individual components
 * for backward compatibility with the original DataReplicationService API.
 */

// Re-export all types
export * from './types';

// Re-export components
export { ReplicationEngine } from './ReplicationEngine';
export { ConflictResolver } from './ConflictResolver';
export { SyncManager } from './SyncManager';
export { EncryptionManager } from './EncryptionManager';
export { LagMonitor } from './LagMonitor';

// Import for facade
import { EventEmitter } from 'events';
import { ReplicationEngine } from './ReplicationEngine';
import { ConflictResolver } from './ConflictResolver';
import { SyncManager } from './SyncManager';
import type {
  ReplicationConfig,
  ReplicationState,
  ReplicationStream,
  ReplicationMetrics,
  ReplicationFilter,
  ReplicationLag,
  IntegrityReport,
  ConflictRecord,
  ConflictResolution,
  CustomConflictResolver,
  CDCEvent,
  DataVersion,
} from './types';

// ============================================================================
// Data Replication Service Facade
// ============================================================================

export class DataReplicationService extends EventEmitter {
  private static instance: DataReplicationService | null = null;

  private engine: ReplicationEngine;
  private conflictResolver: ConflictResolver;
  private syncManager: SyncManager;

  private constructor() {
    super();
    this.setMaxListeners(50);

    this.engine = new ReplicationEngine();
    this.conflictResolver = new ConflictResolver(this.engine.getMetrics());
    this.syncManager = new SyncManager();

    this.setupEventForwarding();
  }

  public static getInstance(): DataReplicationService {
    if (!DataReplicationService.instance) {
      DataReplicationService.instance = new DataReplicationService();
    }
    return DataReplicationService.instance;
  }

  public static resetInstance(): void {
    if (DataReplicationService.instance) {
      DataReplicationService.instance.cleanup();
      DataReplicationService.instance = null;
    }
  }

  private setupEventForwarding(): void {
    const forwardEvent = (source: EventEmitter) => {
      const originalEmit = source.emit.bind(source);
      source.emit = (event: string | symbol, ...args: unknown[]) => {
        this.emit(event, ...args);
        return originalEmit(event, ...args);
      };
    };

    forwardEvent(this.engine);
    forwardEvent(this.conflictResolver);
    forwardEvent(this.syncManager);
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  public async configureReplication(config: ReplicationConfig): Promise<void> {
    await this.engine.configureReplication(config);
    this.conflictResolver.setConfig(config);
    this.syncManager.setConfig(config);
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  public async startReplication(): Promise<void> {
    const config = this.engine.getConfig();
    if (!config) {
      throw new Error('Replication not configured. Call configureReplication first.');
    }

    const state = this.engine.getState();
    if (state === 'active' || state === 'syncing') {
      throw new Error(`Replication already ${state}`);
    }

    this.engine.setState('initializing');
    this.engine.setStartTime(new Date());
    this.emit('starting', { config });

    try {
      await this.engine.initializeStreams();

      if (config.cdcConfig.enabled) {
        await this.engine.startCDC();
      }

      this.engine.startHeartbeat();
      this.engine.startMetricsCollection();

      if (config.encryption.enabled && config.encryption.keyRotationIntervalMs > 0) {
        this.engine.startKeyRotation();
      }

      await this.syncManager.performInitialSync();

      this.engine.setState('active');
      this.emit('started', {
        config,
        streams: this.engine.getStreams()
      });
    } catch (error) {
      this.engine.setState('error');
      this.emit('startError', { error });
      throw error;
    }
  }

  public async stopReplication(): Promise<void> {
    if (this.engine.getState() === 'idle') {
      return;
    }

    this.emit('stopping', { state: this.engine.getState() });

    try {
      for (const stream of this.engine.getStreams()) {
        await this.engine.stopStream(stream.id);
      }

      this.engine.cleanup();
      this.engine.setState('idle');
      this.emit('stopped', { metrics: this.engine.getMetrics() });
    } catch (error) {
      this.emit('stopError', { error });
      throw error;
    }
  }

  public async pauseReplication(): Promise<void> {
    if (this.engine.getState() !== 'active') {
      throw new Error('Can only pause active replication');
    }

    this.engine.setState('paused');
    for (const stream of this.engine.getStreams()) {
      stream.state = 'paused';
    }

    this.emit('paused', { pausedAt: new Date() });
  }

  public async resumeReplication(): Promise<void> {
    if (this.engine.getState() !== 'paused') {
      throw new Error('Can only resume paused replication');
    }

    this.engine.setState('active');
    for (const stream of this.engine.getStreams()) {
      stream.state = 'active';
    }

    this.emit('resumed', { resumedAt: new Date() });
  }

  // ============================================================================
  // Conflict Resolution
  // ============================================================================

  public async resolveConflict(
    conflictId: string,
    resolution?: ConflictResolution
  ): Promise<ConflictRecord> {
    const conflict = await this.conflictResolver.resolveConflict(conflictId, resolution);

    const config = this.engine.getConfig();
    if (config) {
      await this.conflictResolver.applyConflictResolution(
        conflict,
        this.syncManager.applyData.bind(this.syncManager),
        config.regions
      );
    }

    return conflict;
  }

  public registerConflictResolver(table: string, resolver: CustomConflictResolver): void {
    this.conflictResolver.registerConflictResolver(table, resolver);
  }

  // ============================================================================
  // Monitoring
  // ============================================================================

  public getReplicationLag(regionId?: string): ReplicationLag | ReplicationLag[] {
    return this.engine.getReplicationLag(regionId);
  }

  public async verifyDataIntegrity(options?: {
    tables?: string[];
    sampleRate?: number;
    fullScan?: boolean;
  }): Promise<IntegrityReport> {
    return this.syncManager.verifyDataIntegrity(options);
  }

  // ============================================================================
  // Filtering
  // ============================================================================

  public setReplicationFilter(filter: ReplicationFilter): void {
    this.engine.setReplicationFilter(filter);
  }

  public removeReplicationFilter(filterId: string): void {
    this.engine.removeReplicationFilter(filterId);
  }

  // ============================================================================
  // Getters
  // ============================================================================

  public getState(): ReplicationState {
    return this.engine.getState();
  }

  public getConfig(): ReplicationConfig | null {
    return this.engine.getConfig();
  }

  public getStreams(): ReplicationStream[] {
    return this.engine.getStreams();
  }

  public getPendingConflicts(): ConflictRecord[] {
    return this.conflictResolver.getPendingConflicts();
  }

  public getMetrics(): ReplicationMetrics {
    return this.engine.getMetrics();
  }

  public getFilters(): ReplicationFilter[] {
    return this.engine.getFilters();
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  private cleanup(): void {
    this.engine.cleanup();
    this.conflictResolver.cleanup();
    this.syncManager.cleanup();
    this.removeAllListeners();
  }
}

export default DataReplicationService;
