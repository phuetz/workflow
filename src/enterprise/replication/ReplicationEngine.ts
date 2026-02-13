/**
 * Replication Engine
 * Core replication logic including stream management and CDC processing
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import type {
  ReplicationConfig,
  ReplicationState,
  ReplicationStream,
  ReplicationMetrics,
  CDCEvent,
  ReplicationFilter,
  FilterCondition,
  ReplicationLag,
  ConflictRecord,
} from './types';
import { EncryptionManager } from './EncryptionManager';
import { LagMonitor } from './LagMonitor';

export class ReplicationEngine extends EventEmitter {
  protected config: ReplicationConfig | null = null;
  protected state: ReplicationState = 'idle';
  protected streams: Map<string, ReplicationStream> = new Map();
  protected filters: Map<string, ReplicationFilter> = new Map();
  protected vectorClocks: Map<string, Record<string, number>> = new Map();
  protected metricsInterval: NodeJS.Timeout | null = null;
  protected heartbeatInterval: NodeJS.Timeout | null = null;
  protected cdcPollingInterval: NodeJS.Timeout | null = null;
  protected startTime: Date | null = null;
  protected metrics: ReplicationMetrics = this.initializeMetrics();

  private encryptionManager: EncryptionManager;
  private lagMonitor: LagMonitor;

  constructor() {
    super();
    this.setMaxListeners(50);
    this.encryptionManager = new EncryptionManager();
    this.lagMonitor = new LagMonitor();
    this.setupEventForwarding();
  }

  private setupEventForwarding(): void {
    this.encryptionManager.on('encryptionInitialized', (data) => this.emit('encryptionInitialized', data));
    this.encryptionManager.on('keyRotated', (data) => this.emit('keyRotated', data));
    this.lagMonitor.on('alert', (data) => this.emit('alert', data));
  }

  public async configureReplication(config: ReplicationConfig): Promise<void> {
    this.emit('configuring', { config });

    try {
      this.validateConfig(config);
      this.config = { ...config };

      this.filters.clear();
      for (const filter of config.filters) {
        this.filters.set(filter.id, filter);
      }

      if (config.encryption.enabled) {
        await this.encryptionManager.initialize(config.encryption);
      }

      this.lagMonitor.setConfig(config);

      for (const region of config.regions) {
        this.vectorClocks.set(region.id, {});
      }

      this.emit('configured', { config: this.config });
    } catch (error) {
      this.emit('configurationError', { error });
      throw error;
    }
  }

  protected validateConfig(config: ReplicationConfig): void {
    if (!config.id || !config.name) {
      throw new Error('Replication config must have id and name');
    }
    if (config.regions.length < 2) {
      throw new Error('At least 2 regions are required for replication');
    }
    const primaryRegions = config.regions.filter(r => r.isPrimary);
    if (config.mode === 'master-slave' && primaryRegions.length !== 1) {
      throw new Error('Master-slave mode requires exactly one primary region');
    }
    if (config.lagToleranceMs < 0) {
      throw new Error('Lag tolerance must be non-negative');
    }
    if (config.batchSize < 1 || config.batchSize > 10000) {
      throw new Error('Batch size must be between 1 and 10000');
    }
  }

  public async initializeStreams(): Promise<void> {
    if (!this.config) return;
    const { regions, mode } = this.config;

    if (mode === 'multi-master') {
      for (let i = 0; i < regions.length; i++) {
        for (let j = i + 1; j < regions.length; j++) {
          await this.createStream(regions[i].id, regions[j].id);
          await this.createStream(regions[j].id, regions[i].id);
        }
      }
    } else {
      const primary = regions.find(r => r.isPrimary);
      if (!primary) throw new Error('No primary region found');
      for (const region of regions) {
        if (!region.isPrimary && region.enabled) {
          await this.createStream(primary.id, region.id);
        }
      }
    }
  }

  protected async createStream(sourceRegion: string, targetRegion: string): Promise<ReplicationStream> {
    const streamId = `${sourceRegion}->${targetRegion}`;
    const stream: ReplicationStream = {
      id: streamId,
      sourceRegion,
      targetRegion,
      state: 'initializing',
      startedAt: new Date(),
      metrics: this.initializeMetrics()
    };
    this.streams.set(streamId, stream);
    this.emit('streamCreated', { stream });
    return stream;
  }

  public async stopStream(streamId: string): Promise<void> {
    const stream = this.streams.get(streamId);
    if (stream) {
      stream.state = 'idle';
      this.emit('streamStopped', { streamId });
    }
  }

  public async startCDC(): Promise<void> {
    if (!this.config?.cdcConfig.enabled) return;
    const { pollIntervalMs } = this.config.cdcConfig;
    this.cdcPollingInterval = setInterval(async () => {
      try {
        await this.pollCDCEvents();
      } catch (error) {
        this.emit('cdcError', { error });
      }
    }, pollIntervalMs);
    this.emit('cdcStarted', { config: this.config.cdcConfig });
  }

  protected async pollCDCEvents(): Promise<void> {
    if (!this.config) return;
    const events = await this.fetchCDCEvents();
    for (const event of events) {
      await this.processCDCEvent(event);
    }
  }

  protected async fetchCDCEvents(): Promise<CDCEvent[]> {
    return [];
  }

  public async processCDCEvent(event: CDCEvent): Promise<void> {
    if (!this.config) return;
    if (!this.shouldReplicate(event)) {
      this.emit('eventFiltered', { event });
      return;
    }
    const processedEvent = this.config.encryption.enabled
      ? await this.encryptionManager.encryptEvent(event)
      : event;
    this.updateVectorClock(event.sourceRegion, event.id);
    for (const stream of this.streams.values()) {
      if (stream.sourceRegion === event.sourceRegion && stream.state === 'active') {
        await this.replicateEvent(stream, processedEvent);
      }
    }
    this.metrics.totalEventsProcessed++;
    this.emit('eventProcessed', { event });
  }

  public async replicateEvent(
    stream: ReplicationStream,
    event: CDCEvent,
    detectConflictFn?: (event: CDCEvent, targetRegion: string) => Promise<ConflictRecord | null>,
    handleConflictFn?: (conflict: ConflictRecord) => Promise<void>
  ): Promise<void> {
    try {
      if (this.config?.mode === 'multi-master' && event.type !== 'insert' && detectConflictFn) {
        const conflict = await detectConflictFn(event, stream.targetRegion);
        if (conflict && handleConflictFn) {
          await handleConflictFn(conflict);
          return;
        }
      }
      await this.applyEvent(stream.targetRegion, event);
      stream.lastEventTimestamp = new Date();
      stream.metrics.totalEventsProcessed++;
      this.emit('eventReplicated', { streamId: stream.id, event, targetRegion: stream.targetRegion });
    } catch (error) {
      stream.metrics.errorsCount++;
      this.emit('replicationError', { stream, event, error });
      if (this.config && stream.metrics.errorsCount <= this.config.retryAttempts) {
        await this.scheduleRetry(stream, event);
      } else {
        await this.sendToDeadLetterQueue(event);
      }
    }
  }

  protected async applyEvent(targetRegion: string, event: CDCEvent): Promise<void> {
    this.emit('eventApplied', { targetRegion, event });
  }

  protected async scheduleRetry(stream: ReplicationStream, event: CDCEvent): Promise<void> {
    if (!this.config) return;
    const delay = this.config.retryDelayMs * Math.pow(2, stream.metrics.errorsCount - 1);
    setTimeout(async () => {
      await this.replicateEvent(stream, event);
    }, delay);
    this.emit('retryScheduled', { streamId: stream.id, event, delayMs: delay });
  }

  protected async sendToDeadLetterQueue(event: CDCEvent): Promise<void> {
    this.emit('deadLetterQueued', { event });
  }

  public shouldReplicate(event: CDCEvent): boolean {
    for (const filter of this.filters.values()) {
      if (!filter.enabled) continue;
      const matches = this.matchesFilter(event, filter);
      if (filter.type === 'exclude' && matches) return false;
      if (filter.type === 'include' && !matches) return false;
    }
    return true;
  }

  protected matchesFilter(event: CDCEvent, filter: ReplicationFilter): boolean {
    switch (filter.target) {
      case 'table': return this.matchesPattern(event.table, filter.pattern);
      case 'schema': return this.matchesPattern(event.schema, filter.pattern);
      case 'column':
        if (!event.after) return false;
        return Object.keys(event.after).some(col => this.matchesPattern(col, filter.pattern));
      case 'row':
        if (!filter.condition || !event.after) return false;
        return this.evaluateCondition(event.after, filter.condition);
      default: return false;
    }
  }

  protected matchesPattern(value: string, pattern: string): boolean {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
    return regex.test(value);
  }

  protected evaluateCondition(data: Record<string, unknown>, condition: FilterCondition): boolean {
    const fieldValue = data[condition.field];
    switch (condition.operator) {
      case 'eq': return fieldValue === condition.value;
      case 'ne': return fieldValue !== condition.value;
      case 'gt': return (fieldValue as number) > (condition.value as number);
      case 'gte': return (fieldValue as number) >= (condition.value as number);
      case 'lt': return (fieldValue as number) < (condition.value as number);
      case 'lte': return (fieldValue as number) <= (condition.value as number);
      case 'in': return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'regex': return typeof fieldValue === 'string' && new RegExp(condition.value as string).test(fieldValue);
      default: return false;
    }
  }

  public setReplicationFilter(filter: ReplicationFilter): void {
    this.filters.set(filter.id, filter);
    this.emit('filterSet', { filter });
  }

  public removeReplicationFilter(filterId: string): void {
    this.filters.delete(filterId);
    this.emit('filterRemoved', { filterId });
  }

  public startKeyRotation(): void {
    if (this.config?.encryption.keyRotationIntervalMs) {
      this.encryptionManager.startKeyRotation(this.config.encryption.keyRotationIntervalMs);
    }
  }

  public startHeartbeat(): void {
    if (!this.config) return;
    this.heartbeatInterval = setInterval(() => {
      this.metrics.lastHeartbeat = new Date();
      this.metrics.uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
      this.emit('heartbeat', { timestamp: this.metrics.lastHeartbeat, uptime: this.metrics.uptime });
    }, this.config.heartbeatIntervalMs);
  }

  public startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      const now = Date.now();
      const uptime = this.startTime ? (now - this.startTime.getTime()) / 1000 : 1;
      this.metrics.eventsPerSecond = this.metrics.totalEventsProcessed / uptime;
      this.lagMonitor.updateMetricsWithLag(this.metrics, this.streams);
      this.emit('metricsUpdated', { metrics: this.metrics });
    }, 5000);
  }

  public getReplicationLag(regionId?: string): ReplicationLag | ReplicationLag[] {
    return this.lagMonitor.getReplicationLag(regionId, this.streams);
  }

  public calculateChecksum(data: Record<string, unknown>): string {
    const algorithm = this.config?.checksumAlgorithm || 'sha256';
    const hash = crypto.createHash(algorithm === 'xxhash' ? 'sha256' : algorithm);
    hash.update(JSON.stringify(data, Object.keys(data).sort()));
    return hash.digest('hex');
  }

  public updateVectorClock(regionId: string, _eventId: string): void {
    const clock = this.vectorClocks.get(regionId) || {};
    clock[regionId] = (clock[regionId] || 0) + 1;
    this.vectorClocks.set(regionId, clock);
  }

  public initializeMetrics(): ReplicationMetrics {
    return {
      totalEventsProcessed: 0, eventsPerSecond: 0, bytesReplicated: 0,
      conflictsDetected: 0, conflictsResolved: 0, errorsCount: 0,
      averageLagMs: 0, uptime: 0, lastHeartbeat: new Date()
    };
  }

  public cleanup(): void {
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.cdcPollingInterval) clearInterval(this.cdcPollingInterval);
    this.encryptionManager.cleanup();
    this.lagMonitor.cleanup();
    this.streams.clear();
    this.filters.clear();
    this.vectorClocks.clear();
    this.removeAllListeners();
  }

  public getState(): ReplicationState { return this.state; }
  public setState(state: ReplicationState): void { this.state = state; }
  public getConfig(): ReplicationConfig | null { return this.config ? { ...this.config } : null; }
  public getStreams(): ReplicationStream[] { return Array.from(this.streams.values()); }
  public getMetrics(): ReplicationMetrics { return { ...this.metrics }; }
  public getFilters(): ReplicationFilter[] { return Array.from(this.filters.values()); }
  public getVectorClocks(): Map<string, Record<string, number>> { return this.vectorClocks; }
  public setStartTime(time: Date): void { this.startTime = time; }
  public getEncryptionKey(name: string): Buffer | undefined { return this.encryptionManager.getKey(name); }
  public encryptData(data: Record<string, unknown>, key: Buffer): Record<string, unknown> {
    return this.encryptionManager.encryptData(data, key);
  }
  public decryptData(encryptedData: Record<string, unknown>, key: Buffer): Record<string, unknown> {
    return this.encryptionManager.decryptData(encryptedData, key);
  }
  public async encryptEvent(event: CDCEvent): Promise<CDCEvent> {
    return this.encryptionManager.encryptEvent(event);
  }
}
