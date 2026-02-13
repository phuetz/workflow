/**
 * Unit Tests for Enterprise Replication Module
 * Tests ReplicationEngine, ConflictResolver, SyncManager, EncryptionManager, LagMonitor
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReplicationEngine } from '../../enterprise/replication/ReplicationEngine';
import { ConflictResolver } from '../../enterprise/replication/ConflictResolver';
import { SyncManager } from '../../enterprise/replication/SyncManager';
import { EncryptionManager } from '../../enterprise/replication/EncryptionManager';
import { LagMonitor } from '../../enterprise/replication/LagMonitor';
import type {
  ReplicationConfig,
  CDCEvent,
  ConflictRecord,
  DataVersion,
  ReplicationFilter,
  ReplicationMetrics,
  ReplicationStream,
  EncryptionConfig,
} from '../../enterprise/replication/types';

// Helper to create a valid replication config
function createTestConfig(overrides?: Partial<ReplicationConfig>): ReplicationConfig {
  return {
    id: 'test-config-1',
    name: 'Test Replication',
    mode: 'multi-master',
    conflictStrategy: 'last-write-wins',
    consistencyLevel: 'eventual',
    lagToleranceMs: 5000,
    regions: [
      {
        id: 'region-1',
        name: 'Region 1',
        endpoint: 'https://region1.example.com',
        isPrimary: true,
        priority: 1,
        enabled: true,
        credentials: { accessKeyId: 'key1', secretAccessKey: 'secret1' },
      },
      {
        id: 'region-2',
        name: 'Region 2',
        endpoint: 'https://region2.example.com',
        isPrimary: false,
        priority: 2,
        enabled: true,
        credentials: { accessKeyId: 'key2', secretAccessKey: 'secret2' },
      },
    ],
    encryption: {
      enabled: false,
      algorithm: 'aes-256-gcm',
      keyRotationIntervalMs: 86400000,
      inTransit: true,
      atRest: true,
      keyDerivationIterations: 100000,
    },
    filters: [],
    cdcConfig: {
      enabled: true,
      captureMode: 'log-based',
      pollIntervalMs: 1000,
      batchSize: 100,
      startPosition: 'latest',
      includeBeforeImage: true,
      includeMetadata: true,
    },
    alerting: {
      enabled: true,
      lagThresholdMs: 3000,
      errorThreshold: 5,
      notificationChannels: ['email', 'slack'],
      cooldownMs: 60000,
    },
    checksumAlgorithm: 'sha256',
    batchSize: 100,
    retryAttempts: 3,
    retryDelayMs: 1000,
    heartbeatIntervalMs: 10000,
    snapshotIntervalMs: 3600000,
    compressData: true,
    parallelStreams: 4,
    ...overrides,
  };
}

function createTestCDCEvent(overrides?: Partial<CDCEvent>): CDCEvent {
  return {
    id: 'event-1',
    timestamp: new Date(),
    type: 'update',
    sourceRegion: 'region-1',
    table: 'users',
    schema: 'public',
    primaryKey: { id: 1 },
    before: { id: 1, name: 'John', email: 'john@example.com' },
    after: { id: 1, name: 'John Doe', email: 'john.doe@example.com' },
    metadata: {
      transactionId: 'tx-123',
      logSequenceNumber: 'lsn-456',
      commitTimestamp: new Date(),
      sourceConnector: 'postgres',
      schemaVersion: 1,
    },
    ...overrides,
  };
}

// ============================================================================
// ReplicationEngine Tests
// ============================================================================

describe('ReplicationEngine', () => {
  let engine: ReplicationEngine;

  beforeEach(() => {
    engine = new ReplicationEngine();
  });

  afterEach(() => {
    engine.cleanup();
  });

  describe('Configuration', () => {
    it('should configure replication successfully', async () => {
      const config = createTestConfig();
      await engine.configureReplication(config);
      expect(engine.getConfig()).toEqual(config);
    });

    it('should emit configuring and configured events', async () => {
      const config = createTestConfig();
      const configuringHandler = vi.fn();
      const configuredHandler = vi.fn();

      engine.on('configuring', configuringHandler);
      engine.on('configured', configuredHandler);

      await engine.configureReplication(config);

      expect(configuringHandler).toHaveBeenCalledWith({ config });
      expect(configuredHandler).toHaveBeenCalledWith({ config });
    });

    it('should reject config without id or name', async () => {
      const config = createTestConfig({ id: '', name: '' });
      await expect(engine.configureReplication(config)).rejects.toThrow(
        'Replication config must have id and name'
      );
    });

    it('should reject config with less than 2 regions', async () => {
      const config = createTestConfig({ regions: [createTestConfig().regions[0]] });
      await expect(engine.configureReplication(config)).rejects.toThrow(
        'At least 2 regions are required for replication'
      );
    });

    it('should reject master-slave mode without exactly one primary', async () => {
      const config = createTestConfig({
        mode: 'master-slave',
        regions: [
          { ...createTestConfig().regions[0], isPrimary: true },
          { ...createTestConfig().regions[1], isPrimary: true },
        ],
      });
      await expect(engine.configureReplication(config)).rejects.toThrow(
        'Master-slave mode requires exactly one primary region'
      );
    });

    it('should reject negative lag tolerance', async () => {
      const config = createTestConfig({ lagToleranceMs: -1000 });
      await expect(engine.configureReplication(config)).rejects.toThrow(
        'Lag tolerance must be non-negative'
      );
    });

    it('should reject invalid batch size', async () => {
      const config = createTestConfig({ batchSize: 0 });
      await expect(engine.configureReplication(config)).rejects.toThrow(
        'Batch size must be between 1 and 10000'
      );
    });
  });

  describe('Stream Management', () => {
    it('should initialize streams for multi-master mode', async () => {
      const config = createTestConfig({ mode: 'multi-master' });
      await engine.configureReplication(config);
      await engine.initializeStreams();

      const streams = engine.getStreams();
      // 2 regions = 2 bidirectional streams (region-1->region-2 and region-2->region-1)
      expect(streams.length).toBe(2);
    });

    it('should initialize streams for master-slave mode', async () => {
      const config = createTestConfig({ mode: 'master-slave' });
      await engine.configureReplication(config);
      await engine.initializeStreams();

      const streams = engine.getStreams();
      // 1 primary to 1 secondary
      expect(streams.length).toBe(1);
    });

    it('should stop stream and change state to idle', async () => {
      const config = createTestConfig();
      await engine.configureReplication(config);
      await engine.initializeStreams();

      const streams = engine.getStreams();
      const streamId = streams[0].id;

      await engine.stopStream(streamId);

      const updatedStreams = engine.getStreams();
      expect(updatedStreams.find(s => s.id === streamId)?.state).toBe('idle');
    });
  });

  describe('Filter Management', () => {
    it('should set and get replication filters', async () => {
      const config = createTestConfig();
      await engine.configureReplication(config);

      const filter: ReplicationFilter = {
        id: 'filter-1',
        name: 'Exclude Test Tables',
        enabled: true,
        type: 'exclude',
        target: 'table',
        pattern: 'test_*',
      };

      engine.setReplicationFilter(filter);
      const filters = engine.getFilters();

      expect(filters).toContainEqual(filter);
    });

    it('should remove replication filters', async () => {
      const config = createTestConfig();
      await engine.configureReplication(config);

      const filter: ReplicationFilter = {
        id: 'filter-1',
        name: 'Test Filter',
        enabled: true,
        type: 'include',
        target: 'table',
        pattern: 'users',
      };

      engine.setReplicationFilter(filter);
      engine.removeReplicationFilter('filter-1');

      expect(engine.getFilters()).not.toContainEqual(filter);
    });

    it('should filter events based on table pattern', async () => {
      const config = createTestConfig({
        filters: [{
          id: 'filter-1',
          name: 'Exclude Test Tables',
          enabled: true,
          type: 'exclude',
          target: 'table',
          pattern: 'test_*',
        }],
      });
      await engine.configureReplication(config);

      const testEvent = createTestCDCEvent({ table: 'test_users' });
      expect(engine.shouldReplicate(testEvent)).toBe(false);

      const realEvent = createTestCDCEvent({ table: 'users' });
      expect(engine.shouldReplicate(realEvent)).toBe(true);
    });

    it('should filter events based on schema pattern', async () => {
      const config = createTestConfig({
        filters: [{
          id: 'filter-1',
          name: 'Include Public Schema',
          enabled: true,
          type: 'include',
          target: 'schema',
          pattern: 'public',
        }],
      });
      await engine.configureReplication(config);

      const publicEvent = createTestCDCEvent({ schema: 'public' });
      expect(engine.shouldReplicate(publicEvent)).toBe(true);

      const privateEvent = createTestCDCEvent({ schema: 'private' });
      expect(engine.shouldReplicate(privateEvent)).toBe(false);
    });
  });

  describe('CDC Processing', () => {
    it('should process CDC event and increment metrics', async () => {
      const config = createTestConfig();
      await engine.configureReplication(config);
      await engine.initializeStreams();

      const event = createTestCDCEvent();
      await engine.processCDCEvent(event);

      expect(engine.getMetrics().totalEventsProcessed).toBe(1);
    });

    it('should emit eventFiltered when event is filtered', async () => {
      const config = createTestConfig({
        filters: [{
          id: 'filter-1',
          name: 'Exclude All',
          enabled: true,
          type: 'exclude',
          target: 'table',
          pattern: '*',
        }],
      });
      await engine.configureReplication(config);

      const handler = vi.fn();
      engine.on('eventFiltered', handler);

      const event = createTestCDCEvent();
      await engine.processCDCEvent(event);

      expect(handler).toHaveBeenCalledWith({ event });
    });
  });

  describe('Checksum Calculation', () => {
    it('should calculate consistent checksums for same data', async () => {
      const config = createTestConfig();
      await engine.configureReplication(config);

      const data = { name: 'John', age: 30 };
      const checksum1 = engine.calculateChecksum(data);
      const checksum2 = engine.calculateChecksum(data);

      expect(checksum1).toBe(checksum2);
    });

    it('should calculate different checksums for different data', async () => {
      const config = createTestConfig();
      await engine.configureReplication(config);

      const data1 = { name: 'John', age: 30 };
      const data2 = { name: 'Jane', age: 25 };

      expect(engine.calculateChecksum(data1)).not.toBe(engine.calculateChecksum(data2));
    });
  });

  describe('Vector Clock', () => {
    it('should update vector clock for region', async () => {
      const config = createTestConfig();
      await engine.configureReplication(config);

      engine.updateVectorClock('region-1', 'event-1');
      engine.updateVectorClock('region-1', 'event-2');

      const clocks = engine.getVectorClocks();
      expect(clocks.get('region-1')?.['region-1']).toBe(2);
    });
  });

  describe('Metrics', () => {
    it('should initialize metrics with default values', () => {
      const metrics = engine.initializeMetrics();

      expect(metrics.totalEventsProcessed).toBe(0);
      expect(metrics.eventsPerSecond).toBe(0);
      expect(metrics.conflictsDetected).toBe(0);
      expect(metrics.errorsCount).toBe(0);
    });
  });

  describe('State Management', () => {
    it('should get and set state', () => {
      expect(engine.getState()).toBe('idle');
      engine.setState('active');
      expect(engine.getState()).toBe('active');
    });
  });

  describe('Cleanup', () => {
    it('should clean up all resources', async () => {
      const config = createTestConfig();
      await engine.configureReplication(config);
      await engine.initializeStreams();

      engine.cleanup();

      expect(engine.getStreams()).toHaveLength(0);
      expect(engine.getFilters()).toHaveLength(0);
    });
  });
});

// ============================================================================
// ConflictResolver Tests
// ============================================================================

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;
  let metrics: ReplicationMetrics;

  beforeEach(() => {
    metrics = {
      totalEventsProcessed: 0,
      eventsPerSecond: 0,
      bytesReplicated: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      errorsCount: 0,
      averageLagMs: 0,
      uptime: 0,
      lastHeartbeat: new Date(),
    };
    resolver = new ConflictResolver(metrics);
  });

  afterEach(() => {
    resolver.cleanup();
  });

  describe('Conflict Detection', () => {
    it('should detect conflict when vector clocks are concurrent', async () => {
      const config = createTestConfig();
      resolver.setConfig(config);

      const event = createTestCDCEvent();
      const localVersion: DataVersion = {
        regionId: 'region-2',
        timestamp: new Date(Date.now() - 1000),
        data: { id: 1, name: 'Jane' },
        checksum: 'abc123',
        vectorClock: { 'region-1': 1, 'region-2': 2 },
      };

      const getLocalVersionFn = vi.fn().mockResolvedValue(localVersion);
      const vectorClocks = new Map([
        ['region-1', { 'region-1': 2, 'region-2': 1 }],
      ]);
      const calculateChecksumFn = vi.fn().mockReturnValue('def456');

      const conflict = await resolver.detectConflict(
        event,
        'region-2',
        getLocalVersionFn,
        vectorClocks,
        calculateChecksumFn
      );

      expect(conflict).not.toBeNull();
      expect(metrics.conflictsDetected).toBe(1);
    });

    it('should not detect conflict when no local version exists', async () => {
      const config = createTestConfig();
      resolver.setConfig(config);

      const event = createTestCDCEvent();
      const getLocalVersionFn = vi.fn().mockResolvedValue(null);
      const vectorClocks = new Map();
      const calculateChecksumFn = vi.fn();

      const conflict = await resolver.detectConflict(
        event,
        'region-2',
        getLocalVersionFn,
        vectorClocks,
        calculateChecksumFn
      );

      expect(conflict).toBeNull();
    });
  });

  describe('isConflicting', () => {
    it('should detect conflict when both clocks have greater values', () => {
      const clock1 = { a: 2, b: 1 };
      const clock2 = { a: 1, b: 2 };

      expect(resolver.isConflicting(clock1, clock2)).toBe(true);
    });

    it('should not detect conflict when one clock dominates', () => {
      const clock1 = { a: 2, b: 2 };
      const clock2 = { a: 1, b: 1 };

      expect(resolver.isConflicting(clock1, clock2)).toBe(false);
    });

    it('should not detect conflict when clocks are equal', () => {
      const clock1 = { a: 1, b: 1 };
      const clock2 = { a: 1, b: 1 };

      expect(resolver.isConflicting(clock1, clock2)).toBe(false);
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflict using last-write-wins strategy', async () => {
      const config = createTestConfig({ conflictStrategy: 'last-write-wins' });
      resolver.setConfig(config);

      const conflict: ConflictRecord = {
        id: 'conflict-1',
        timestamp: new Date(),
        table: 'users',
        primaryKey: { id: 1 },
        localVersion: {
          regionId: 'region-2',
          timestamp: new Date(Date.now() - 5000),
          data: { id: 1, name: 'Local' },
          checksum: 'local-checksum',
          vectorClock: {},
        },
        remoteVersion: {
          regionId: 'region-1',
          timestamp: new Date(),
          data: { id: 1, name: 'Remote' },
          checksum: 'remote-checksum',
          vectorClock: {},
        },
      };

      // Create conflict in resolver by adding it directly
      const resolution = resolver.resolveLastWriteWins(conflict);

      expect(resolution.strategy).toBe('last-write-wins');
      expect(resolution.winner).toBe('remote');
    });

    it('should resolve conflict using merge strategy', async () => {
      const config = createTestConfig({ conflictStrategy: 'merge' });
      resolver.setConfig(config);

      const conflict: ConflictRecord = {
        id: 'conflict-1',
        timestamp: new Date(),
        table: 'users',
        primaryKey: { id: 1 },
        localVersion: {
          regionId: 'region-2',
          timestamp: new Date(),
          data: { id: 1, name: 'Local', email: 'local@example.com' },
          checksum: 'local-checksum',
          vectorClock: {},
        },
        remoteVersion: {
          regionId: 'region-1',
          timestamp: new Date(),
          data: { id: 1, name: 'Remote', phone: '123-456-7890' },
          checksum: 'remote-checksum',
          vectorClock: {},
        },
      };

      const resolution = resolver.resolveMerge(conflict);

      expect(resolution.strategy).toBe('merge');
      expect(resolution.winner).toBe('merged');
      expect(resolution.mergedData).toHaveProperty('email');
      expect(resolution.mergedData).toHaveProperty('phone');
    });

    it('should throw error when resolving non-existent conflict', async () => {
      const config = createTestConfig();
      resolver.setConfig(config);

      await expect(resolver.resolveConflict('non-existent')).rejects.toThrow(
        'Conflict non-existent not found'
      );
    });
  });

  describe('Custom Resolvers', () => {
    it('should register and use custom resolver', async () => {
      const config = createTestConfig({ conflictStrategy: 'custom' });
      resolver.setConfig(config);

      const customResolver = vi.fn().mockResolvedValue({
        strategy: 'custom',
        winner: 'merged',
        mergedData: { custom: true },
        reason: 'Custom resolution',
      });

      resolver.registerConflictResolver('users', customResolver);
      expect(resolver.hasCustomResolver('users')).toBe(true);
    });
  });

  describe('Deep Merge', () => {
    it('should deep merge nested objects', () => {
      const target = { a: { b: 1, c: 2 }, d: 3 };
      const source = { a: { b: 10, e: 5 }, f: 6 };

      const result = resolver.deepMerge(target, source);

      expect(result).toEqual({ a: { b: 10, c: 2, e: 5 }, d: 3, f: 6 });
    });

    it('should not deep merge arrays', () => {
      const target = { a: [1, 2, 3] };
      const source = { a: [4, 5] };

      const result = resolver.deepMerge(target, source);

      expect(result.a).toEqual([4, 5]);
    });
  });

  describe('Getters', () => {
    it('should get pending conflicts', () => {
      expect(resolver.getPendingConflicts()).toEqual([]);
    });

    it('should get all conflicts', () => {
      expect(resolver.getAllConflicts()).toEqual([]);
    });
  });
});

// ============================================================================
// SyncManager Tests
// ============================================================================

describe('SyncManager', () => {
  let syncManager: SyncManager;

  beforeEach(() => {
    syncManager = new SyncManager();
  });

  afterEach(() => {
    syncManager.cleanup();
  });

  describe('Initial Sync', () => {
    it('should perform initial sync and emit events', async () => {
      const startedHandler = vi.fn();
      const completedHandler = vi.fn();

      syncManager.on('initialSyncStarted', startedHandler);
      syncManager.on('initialSyncCompleted', completedHandler);

      await syncManager.performInitialSync();

      expect(startedHandler).toHaveBeenCalled();
      expect(completedHandler).toHaveBeenCalled();
    });
  });

  describe('Data Integrity Verification', () => {
    it('should throw error if not configured', async () => {
      await expect(syncManager.verifyDataIntegrity()).rejects.toThrow(
        'Replication not configured'
      );
    });

    it('should verify data integrity and return report', async () => {
      const config = createTestConfig();
      syncManager.setConfig(config);

      const report = await syncManager.verifyDataIntegrity();

      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('regions');
      expect(report.regions).toEqual(['region-1', 'region-2']);
      expect(report.passed).toBe(true);
    });

    it('should emit integrity check events', async () => {
      const config = createTestConfig();
      syncManager.setConfig(config);

      const startedHandler = vi.fn();
      const completedHandler = vi.fn();

      syncManager.on('integrityCheckStarted', startedHandler);
      syncManager.on('integrityCheckCompleted', completedHandler);

      await syncManager.verifyDataIntegrity();

      expect(startedHandler).toHaveBeenCalled();
      expect(completedHandler).toHaveBeenCalled();
    });
  });

  describe('Data Operations', () => {
    it('should emit event when applying data', async () => {
      const handler = vi.fn();
      syncManager.on('dataApplied', handler);

      await syncManager.applyData('region-1', 'users', { id: 1 }, { name: 'John' });

      expect(handler).toHaveBeenCalledWith({
        regionId: 'region-1',
        table: 'users',
        primaryKey: { id: 1 },
        data: { name: 'John' },
      });
    });

    it('should emit event when getting local version', async () => {
      const handler = vi.fn();
      syncManager.on('localVersionRequested', handler);

      await syncManager.getLocalVersion('region-1', 'users', { id: 1 });

      expect(handler).toHaveBeenCalledWith({
        regionId: 'region-1',
        table: 'users',
        primaryKey: { id: 1 },
      });
    });
  });
});

// ============================================================================
// EncryptionManager Tests
// ============================================================================

describe('EncryptionManager', () => {
  let encryptionManager: EncryptionManager;

  beforeEach(() => {
    encryptionManager = new EncryptionManager();
  });

  afterEach(() => {
    encryptionManager.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize encryption and emit event', async () => {
      const config: EncryptionConfig = {
        enabled: true,
        algorithm: 'aes-256-gcm',
        keyRotationIntervalMs: 86400000,
        inTransit: true,
        atRest: true,
        keyDerivationIterations: 100,
      };

      const handler = vi.fn();
      encryptionManager.on('encryptionInitialized', handler);

      await encryptionManager.initialize(config);

      expect(handler).toHaveBeenCalledWith({ algorithm: 'aes-256-gcm' });
      expect(encryptionManager.getKey('current')).toBeDefined();
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const config: EncryptionConfig = {
        enabled: true,
        algorithm: 'aes-256-gcm',
        keyRotationIntervalMs: 86400000,
        inTransit: true,
        atRest: true,
        keyDerivationIterations: 100,
      };

      await encryptionManager.initialize(config);
      const key = encryptionManager.getKey('current')!;

      const originalData = { name: 'John', email: 'john@example.com', age: 30 };
      const encrypted = encryptionManager.encryptData(originalData, key);

      expect(encrypted.__encrypted).toBe(true);
      expect(encrypted.algorithm).toBe('aes-256-gcm');

      const decrypted = encryptionManager.decryptData(encrypted, key);
      expect(decrypted).toEqual(originalData);
    });

    it('should return unencrypted data if not marked as encrypted', () => {
      const key = Buffer.alloc(32);
      const data = { name: 'John' };

      const result = encryptionManager.decryptData(data, key);
      expect(result).toEqual(data);
    });
  });

  describe('Event Encryption', () => {
    it('should encrypt CDC event', async () => {
      const config: EncryptionConfig = {
        enabled: true,
        algorithm: 'aes-256-gcm',
        keyRotationIntervalMs: 86400000,
        inTransit: true,
        atRest: true,
        keyDerivationIterations: 100,
      };

      await encryptionManager.initialize(config);

      const event = createTestCDCEvent();
      const encryptedEvent = await encryptionManager.encryptEvent(event);

      expect(encryptedEvent.before?.__encrypted).toBe(true);
      expect(encryptedEvent.after?.__encrypted).toBe(true);
    });

    it('should return event unchanged when encryption disabled', async () => {
      const config: EncryptionConfig = {
        enabled: false,
        algorithm: 'aes-256-gcm',
        keyRotationIntervalMs: 86400000,
        inTransit: true,
        atRest: true,
        keyDerivationIterations: 100,
      };

      await encryptionManager.initialize(config);

      const event = createTestCDCEvent();
      const result = await encryptionManager.encryptEvent(event);

      expect(result).toEqual(event);
    });
  });

  describe('Key Rotation', () => {
    it('should start key rotation', async () => {
      const config: EncryptionConfig = {
        enabled: true,
        algorithm: 'aes-256-gcm',
        keyRotationIntervalMs: 100,
        inTransit: true,
        atRest: true,
        keyDerivationIterations: 100,
      };

      await encryptionManager.initialize(config);

      const handler = vi.fn();
      encryptionManager.on('keyRotated', handler);

      encryptionManager.startKeyRotation(100);

      // Wait for rotation
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(handler).toHaveBeenCalled();
      encryptionManager.cleanup();
    });
  });
});

// ============================================================================
// LagMonitor Tests
// ============================================================================

describe('LagMonitor', () => {
  let lagMonitor: LagMonitor;

  beforeEach(() => {
    lagMonitor = new LagMonitor();
  });

  afterEach(() => {
    lagMonitor.cleanup();
  });

  describe('Configuration', () => {
    it('should throw error when getting lag without config', () => {
      expect(() => lagMonitor.getReplicationLag(undefined, new Map())).toThrow(
        'Replication not configured'
      );
    });
  });

  describe('Lag Calculation', () => {
    it('should calculate region lag correctly', () => {
      const config = createTestConfig();
      lagMonitor.setConfig(config);

      const streams = new Map<string, ReplicationStream>();
      streams.set('region-1->region-2', {
        id: 'region-1->region-2',
        sourceRegion: 'region-1',
        targetRegion: 'region-2',
        state: 'active',
        startedAt: new Date(Date.now() - 60000),
        lastEventTimestamp: new Date(Date.now() - 1000),
        metrics: {
          totalEventsProcessed: 100,
          eventsPerSecond: 10,
          bytesReplicated: 50000,
          conflictsDetected: 0,
          conflictsResolved: 0,
          errorsCount: 0,
          averageLagMs: 0,
          uptime: 60000,
          lastHeartbeat: new Date(),
        },
      });

      const lag = lagMonitor.calculateRegionLag('region-2', streams);

      expect(lag.regionId).toBe('region-2');
      expect(lag.lagMs).toBeGreaterThan(0);
      expect(lag.status).toBe('healthy');
    });

    it('should return critical status when lag exceeds 2x tolerance', () => {
      const config = createTestConfig({ lagToleranceMs: 1000 });
      lagMonitor.setConfig(config);

      const streams = new Map<string, ReplicationStream>();
      streams.set('region-1->region-2', {
        id: 'region-1->region-2',
        sourceRegion: 'region-1',
        targetRegion: 'region-2',
        state: 'active',
        startedAt: new Date(Date.now() - 60000),
        lastEventTimestamp: new Date(Date.now() - 3000), // 3s lag
        metrics: {
          totalEventsProcessed: 100,
          eventsPerSecond: 10,
          bytesReplicated: 50000,
          conflictsDetected: 0,
          conflictsResolved: 0,
          errorsCount: 0,
          averageLagMs: 0,
          uptime: 60000,
          lastHeartbeat: new Date(),
        },
      });

      const lag = lagMonitor.calculateRegionLag('region-2', streams);

      expect(lag.status).toBe('critical');
    });
  });

  describe('Lag Alerts', () => {
    it('should emit alert when lag exceeds threshold', () => {
      const config = createTestConfig({
        alerting: {
          enabled: true,
          lagThresholdMs: 1000,
          errorThreshold: 5,
          notificationChannels: ['email'],
          cooldownMs: 0, // No cooldown for testing
        }
      });
      lagMonitor.setConfig(config);

      const handler = vi.fn();
      lagMonitor.on('alert', handler);

      lagMonitor.checkLagAlerts({
        regionId: 'region-2',
        lagMs: 5000,
        lastSyncTimestamp: new Date(),
        pendingEvents: 0,
        bytesPerSecond: 0,
        estimatedCatchupMs: 0,
        status: 'critical',
      });

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].type).toBe('replication_lag');
    });

    it('should respect cooldown period', () => {
      const config = createTestConfig({
        alerting: {
          enabled: true,
          lagThresholdMs: 1000,
          errorThreshold: 5,
          notificationChannels: ['email'],
          cooldownMs: 60000, // 1 minute cooldown
        }
      });
      lagMonitor.setConfig(config);

      const handler = vi.fn();
      lagMonitor.on('alert', handler);

      const lagData = {
        regionId: 'region-2',
        lagMs: 5000,
        lastSyncTimestamp: new Date(),
        pendingEvents: 0,
        bytesPerSecond: 0,
        estimatedCatchupMs: 0,
        status: 'critical' as const,
      };

      // First alert should fire
      lagMonitor.checkLagAlerts(lagData);
      // Second alert should be suppressed by cooldown
      lagMonitor.checkLagAlerts(lagData);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Metrics Update', () => {
    it('should update metrics with average lag', () => {
      const config = createTestConfig();
      lagMonitor.setConfig(config);

      const metrics: ReplicationMetrics = {
        totalEventsProcessed: 100,
        eventsPerSecond: 10,
        bytesReplicated: 50000,
        conflictsDetected: 0,
        conflictsResolved: 0,
        errorsCount: 0,
        averageLagMs: 0,
        uptime: 60000,
        lastHeartbeat: new Date(),
      };

      const streams = new Map<string, ReplicationStream>();

      lagMonitor.updateMetricsWithLag(metrics, streams);

      expect(metrics.averageLagMs).toBeDefined();
    });
  });
});
