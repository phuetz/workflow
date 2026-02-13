/**
 * Type Definitions for Evidence Collection System
 *
 * Centralized type definitions for the digital forensics
 * evidence collection framework.
 */

// ============================================================================
// Basic Type Definitions
// ============================================================================

export type EvidenceSourceType =
  | 'endpoint'
  | 'server'
  | 'cloud_aws'
  | 'cloud_azure'
  | 'cloud_gcp'
  | 'network_device'
  | 'mobile'
  | 'container'
  | 'database';

export type EvidenceType =
  | 'disk_image'
  | 'memory_dump'
  | 'log_file'
  | 'network_capture'
  | 'process_list'
  | 'registry'
  | 'file_artifact'
  | 'cloud_snapshot'
  | 'container_image'
  | 'database_dump';

export type CollectionStatus =
  | 'pending'
  | 'initializing'
  | 'collecting'
  | 'hashing'
  | 'preserving'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type StorageBackend = 'local' | 's3' | 'azure_blob' | 'gcs';

export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';

export type CloudResourceType =
  | 'ec2_instance'
  | 'ebs_volume'
  | 's3_bucket'
  | 'cloudtrail_logs'
  | 'vpc_flow_logs'
  | 'azure_vm'
  | 'azure_disk'
  | 'azure_blob'
  | 'azure_activity_logs'
  | 'gce_instance'
  | 'gce_disk'
  | 'gcs_bucket'
  | 'stackdriver_logs';

// ============================================================================
// Source Interfaces
// ============================================================================

export interface EvidenceSource {
  id: string;
  type: EvidenceSourceType;
  name: string;
  hostname?: string;
  ipAddress?: string;
  credentials?: SourceCredentials;
  metadata?: Record<string, unknown>;
}

export interface SourceCredentials {
  type: 'ssh' | 'winrm' | 'api_key' | 'oauth' | 'certificate';
  username?: string;
  password?: string;
  privateKey?: string;
  apiKey?: string;
  accessToken?: string;
  certificate?: string;
  region?: string;
}

// ============================================================================
// Evidence Interfaces
// ============================================================================

export interface EvidenceItem {
  id: string;
  caseId: string;
  sourceId: string;
  type: EvidenceType;
  name: string;
  description: string;
  size: number;
  path: string;
  storagePath: string;
  storageBackend: StorageBackend;
  hashes: EvidenceHashes;
  metadata: EvidenceMetadata;
  chainOfCustody: ChainOfCustodyEntry[];
  legalHold?: LegalHold;
  collectedAt: Date;
  collectedBy: string;
  verified: boolean;
  tags: string[];
}

export interface EvidenceHashes {
  md5?: string;
  sha1?: string;
  sha256: string;
  sha512?: string;
  verifiedAt?: Date;
}

export interface EvidenceMetadata {
  originalPath: string;
  originalSize: number;
  createdAt?: Date;
  modifiedAt?: Date;
  accessedAt?: Date;
  owner?: string;
  permissions?: string;
  fileSystem?: string;
  acquisitionMethod: string;
  acquisitionTool: string;
  acquisitionToolVersion: string;
  sourceHostname?: string;
  sourceIpAddress?: string;
  timezone?: string;
  encoding?: string;
  mimeType?: string;
  customFields: Record<string, unknown>;
}

// ============================================================================
// Chain of Custody & Legal Hold
// ============================================================================

export interface ChainOfCustodyEntry {
  id: string;
  timestamp: Date;
  action: 'collected' | 'transferred' | 'analyzed' | 'exported' | 'verified' | 'accessed';
  actor: string;
  description: string;
  previousHash?: string;
  newHash?: string;
  location?: string;
  signature?: string;
}

export interface LegalHold {
  id: string;
  name: string;
  caseReference: string;
  startDate: Date;
  endDate?: Date;
  custodians: string[];
  retentionDays: number;
  isActive: boolean;
  createdBy: string;
  approvedBy?: string;
  notes?: string;
}

// ============================================================================
// Collection Job Interfaces
// ============================================================================

export interface CollectionJob {
  id: string;
  caseId: string;
  name: string;
  description: string;
  sources: EvidenceSource[];
  evidenceTypes: EvidenceType[];
  status: CollectionStatus;
  progress: CollectionProgress;
  options: CollectionOptions;
  schedule?: CollectionSchedule;
  results: CollectionResult[];
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  createdAt: Date;
  errors: CollectionError[];
}

export interface CollectionProgress {
  totalItems: number;
  completedItems: number;
  currentItem?: string;
  bytesCollected: number;
  estimatedTotalBytes: number;
  percentComplete: number;
  currentPhase: string;
  elapsedMs: number;
  estimatedRemainingMs?: number;
}

export interface CollectionOptions {
  writeBlocking: boolean;
  verifyHashes: boolean;
  hashAlgorithms: HashAlgorithm[];
  compression: boolean;
  encryption: boolean;
  encryptionKey?: string;
  storageBackend: StorageBackend;
  storagePath: string;
  maxConcurrent: number;
  timeout: number;
  retryAttempts: number;
  minimalFootprint: boolean;
  preserveTimestamps: boolean;
  collectDeleted: boolean;
  excludePatterns: string[];
}

export interface CollectionSchedule {
  enabled: boolean;
  cronExpression: string;
  timezone: string;
  nextRunAt?: Date;
  lastRunAt?: Date;
  runCount: number;
  maxRuns?: number;
}

export interface CollectionResult {
  sourceId: string;
  evidenceItems: EvidenceItem[];
  status: 'success' | 'partial' | 'failed';
  duration: number;
  bytesCollected: number;
  errors: CollectionError[];
}

export interface CollectionError {
  timestamp: Date;
  sourceId?: string;
  evidenceType?: EvidenceType;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
}

// ============================================================================
// Live Response Interfaces
// ============================================================================

export interface LiveResponseData {
  timestamp: Date;
  hostname: string;
  memoryDump?: MemoryDumpInfo;
  processList?: ProcessInfo[];
  networkConnections?: NetworkConnectionInfo[];
  openFiles?: OpenFileInfo[];
  loadedModules?: LoadedModuleInfo[];
  systemInfo?: SystemInfo;
  runningServices?: ServiceInfo[];
  scheduledTasks?: ScheduledTaskInfo[];
  userSessions?: UserSessionInfo[];
}

export interface MemoryDumpInfo {
  path: string;
  size: number;
  dumpType: 'full' | 'kernel' | 'process';
  processId?: number;
  hash: string;
  acquisitionTime: number;
}

export interface ProcessInfo {
  pid: number;
  ppid: number;
  name: string;
  path: string;
  commandLine: string;
  user: string;
  startTime: Date;
  cpuPercent: number;
  memoryPercent: number;
  memoryRss: number;
  threads: number;
  handles?: number;
  hash?: string;
}

export interface NetworkConnectionInfo {
  protocol: 'tcp' | 'udp' | 'tcp6' | 'udp6';
  localAddress: string;
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  state: string;
  pid: number;
  processName: string;
}

export interface OpenFileInfo {
  pid: number;
  processName: string;
  fd: number;
  type: string;
  path: string;
  mode: string;
}

export interface LoadedModuleInfo {
  pid: number;
  processName: string;
  moduleName: string;
  modulePath: string;
  baseAddress: string;
  size: number;
  hash?: string;
}

export interface SystemInfo {
  hostname: string;
  os: string;
  osVersion: string;
  architecture: string;
  kernel: string;
  uptime: number;
  bootTime: Date;
  timezone: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: number;
  freeMemory: number;
  diskInfo: DiskInfo[];
}

export interface DiskInfo {
  device: string;
  mountPoint: string;
  fileSystem: string;
  totalSize: number;
  usedSize: number;
  freeSize: number;
}

export interface ServiceInfo {
  name: string;
  displayName: string;
  status: string;
  startType: string;
  path: string;
  pid?: number;
  user: string;
}

export interface ScheduledTaskInfo {
  name: string;
  path: string;
  status: string;
  nextRunTime?: Date;
  lastRunTime?: Date;
  lastResult?: number;
  author: string;
  command: string;
}

export interface UserSessionInfo {
  username: string;
  sessionId: number;
  sessionType: string;
  state: string;
  loginTime: Date;
  idleTime: number;
  clientName?: string;
  clientAddress?: string;
}

// ============================================================================
// Cloud Collection Interfaces
// ============================================================================

export interface CloudCollectionConfig {
  provider: 'aws' | 'azure' | 'gcp';
  region: string;
  credentials: CloudCredentials;
  resourceTypes: CloudResourceType[];
  includeSnapshots: boolean;
  includeLogs: boolean;
  timeRange?: { start: Date; end: Date };
}

export interface CloudCredentials {
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  projectId?: string;
  serviceAccountKey?: string;
}

// ============================================================================
// Configuration Interfaces
// ============================================================================

export interface StorageConfig {
  backend: StorageBackend;
  localPath?: string;
  s3Config?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
  };
  azureConfig?: {
    connectionString: string;
    containerName: string;
  };
  gcsConfig?: {
    bucket: string;
    projectId: string;
    keyFilePath: string;
  };
}

export interface EvidenceCollectorConfig {
  storage: StorageConfig;
  defaultHashAlgorithms: HashAlgorithm[];
  maxConcurrentJobs: number;
  jobTimeout: number;
  retentionDays: number;
  enableAuditLog: boolean;
  auditLogPath?: string;
}

// ============================================================================
// Event Interfaces
// ============================================================================

export interface EvidenceCollectorEvents {
  'job:created': (job: CollectionJob) => void;
  'job:started': (job: CollectionJob) => void;
  'job:progress': (job: CollectionJob, progress: CollectionProgress) => void;
  'job:completed': (job: CollectionJob) => void;
  'job:failed': (job: CollectionJob, error: CollectionError) => void;
  'job:cancelled': (job: CollectionJob) => void;
  'evidence:collected': (evidence: EvidenceItem) => void;
  'evidence:verified': (evidence: EvidenceItem) => void;
  'evidence:preserved': (evidence: EvidenceItem) => void;
  'legal_hold:applied': (hold: LegalHold, evidenceIds: string[]) => void;
  'legal_hold:released': (hold: LegalHold) => void;
  'error': (error: CollectionError) => void;
}

// ============================================================================
// Live Response Options
// ============================================================================

export interface LiveResponseOptions {
  collectMemory?: boolean;
  collectProcesses?: boolean;
  collectNetworkConnections?: boolean;
  collectOpenFiles?: boolean;
  collectLoadedModules?: boolean;
  collectSystemInfo?: boolean;
  collectServices?: boolean;
  collectScheduledTasks?: boolean;
  collectUserSessions?: boolean;
  memoryDumpType?: 'full' | 'kernel' | 'process';
  targetProcessId?: number;
}

// ============================================================================
// Preservation Options
// ============================================================================

export interface PreservationOptions {
  writeBlock?: boolean;
  compress?: boolean;
  encrypt?: boolean;
  encryptionKey?: string;
  targetStorage?: StorageBackend;
  targetPath?: string;
}
