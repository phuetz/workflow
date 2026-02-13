/**
 * Data Replication Types
 * Shared types and interfaces for the replication module
 */

// ============================================================================
// Enums and Type Aliases
// ============================================================================

export type ReplicationMode = 'multi-master' | 'master-slave';

export type ConflictStrategy = 'last-write-wins' | 'merge' | 'custom';

export type ReplicationState =
  | 'idle'
  | 'initializing'
  | 'syncing'
  | 'active'
  | 'paused'
  | 'error'
  | 'recovering';

export type ConsistencyLevel = 'eventual' | 'strong' | 'bounded-staleness';

export type CDCEventType = 'insert' | 'update' | 'delete' | 'truncate';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';

// ============================================================================
// Configuration Interfaces
// ============================================================================

export interface RegionConfig {
  id: string;
  name: string;
  endpoint: string;
  isPrimary: boolean;
  priority: number;
  enabled: boolean;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  metadata?: Record<string, unknown>;
}

export interface ReplicationConfig {
  id: string;
  name: string;
  mode: ReplicationMode;
  conflictStrategy: ConflictStrategy;
  consistencyLevel: ConsistencyLevel;
  lagToleranceMs: number;
  regions: RegionConfig[];
  encryption: EncryptionConfig;
  filters: ReplicationFilter[];
  cdcConfig: CDCConfig;
  alerting: AlertConfig;
  checksumAlgorithm: 'md5' | 'sha256' | 'sha512' | 'xxhash';
  batchSize: number;
  retryAttempts: number;
  retryDelayMs: number;
  heartbeatIntervalMs: number;
  snapshotIntervalMs: number;
  compressData: boolean;
  parallelStreams: number;
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: EncryptionAlgorithm;
  keyRotationIntervalMs: number;
  inTransit: boolean;
  atRest: boolean;
  keyDerivationIterations: number;
  masterKeyId?: string;
}

export interface ReplicationFilter {
  id: string;
  name: string;
  enabled: boolean;
  type: 'include' | 'exclude';
  target: 'table' | 'schema' | 'column' | 'row';
  pattern: string;
  condition?: FilterCondition;
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'regex';
  value: unknown;
}

export interface CDCConfig {
  enabled: boolean;
  captureMode: 'log-based' | 'trigger-based' | 'timestamp-based';
  pollIntervalMs: number;
  batchSize: number;
  startPosition?: 'beginning' | 'latest' | 'timestamp';
  startTimestamp?: Date;
  includeBeforeImage: boolean;
  includeMetadata: boolean;
  deadLetterQueue?: string;
}

export interface AlertConfig {
  enabled: boolean;
  lagThresholdMs: number;
  errorThreshold: number;
  notificationChannels: string[];
  cooldownMs: number;
}

// ============================================================================
// Event and Data Interfaces
// ============================================================================

export interface CDCEvent {
  id: string;
  timestamp: Date;
  type: CDCEventType;
  sourceRegion: string;
  table: string;
  schema: string;
  primaryKey: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata: CDCMetadata;
}

export interface CDCMetadata {
  transactionId: string;
  logSequenceNumber: string;
  commitTimestamp: Date;
  sourceConnector: string;
  schemaVersion: number;
}

export interface ConflictRecord {
  id: string;
  timestamp: Date;
  table: string;
  primaryKey: Record<string, unknown>;
  localVersion: DataVersion;
  remoteVersion: DataVersion;
  resolution?: ConflictResolution;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface DataVersion {
  regionId: string;
  timestamp: Date;
  data: Record<string, unknown>;
  checksum: string;
  vectorClock: Record<string, number>;
}

export interface ConflictResolution {
  strategy: ConflictStrategy;
  winner: 'local' | 'remote' | 'merged';
  mergedData?: Record<string, unknown>;
  reason: string;
}

// ============================================================================
// Monitoring Interfaces
// ============================================================================

export interface ReplicationLag {
  regionId: string;
  lagMs: number;
  lastSyncTimestamp: Date;
  pendingEvents: number;
  bytesPerSecond: number;
  estimatedCatchupMs: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface IntegrityReport {
  id: string;
  timestamp: Date;
  regions: string[];
  tablesChecked: number;
  rowsVerified: number;
  checksumMismatches: ChecksumMismatch[];
  missingRecords: MissingRecord[];
  duration: number;
  passed: boolean;
}

export interface ChecksumMismatch {
  table: string;
  primaryKey: Record<string, unknown>;
  regions: {
    regionId: string;
    checksum: string;
    timestamp: Date;
  }[];
}

export interface MissingRecord {
  table: string;
  primaryKey: Record<string, unknown>;
  presentIn: string[];
  missingFrom: string[];
}

export interface ReplicationMetrics {
  totalEventsProcessed: number;
  eventsPerSecond: number;
  bytesReplicated: number;
  conflictsDetected: number;
  conflictsResolved: number;
  errorsCount: number;
  averageLagMs: number;
  uptime: number;
  lastHeartbeat: Date;
}

export interface ReplicationStream {
  id: string;
  sourceRegion: string;
  targetRegion: string;
  state: ReplicationState;
  startedAt: Date;
  lastEventTimestamp?: Date;
  metrics: ReplicationMetrics;
}

// ============================================================================
// Function Types
// ============================================================================

export interface CustomConflictResolver {
  (conflict: ConflictRecord): Promise<ConflictResolution>;
}
