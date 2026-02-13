/**
 * Workflow Backup and Disaster Recovery Types
 * Comprehensive backup, restore, and disaster recovery functionality
 */


export interface BackupConfig {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  schedule: BackupSchedule;
  retention: BackupRetention;
  destinations: BackupDestination[];
  encryption: BackupEncryption;
  compression: CompressionConfig;
  filters: BackupFilters;
  notifications: BackupNotifications;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface BackupSchedule {
  type: 'manual' | 'scheduled' | 'continuous';
  frequency?: ScheduleFrequency;
  time?: string; // HH:MM format
  timezone?: string;
  daysOfWeek?: number[]; // 0-6, Sunday is 0
  daysOfMonth?: number[]; // 1-31
  monthsOfYear?: number[]; // 1-12
  customCron?: string;
}

export type ScheduleFrequency = 
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'custom';

export interface BackupRetention {
  strategy: RetentionStrategy;
  policies: RetentionPolicy[];
  autoDelete: boolean;
  archiveOldBackups: boolean;
  archiveAfterDays: number;
}

export type RetentionStrategy = 
  | 'grandfather-father-son'
  | 'simple'
  | 'progressive'
  | 'custom';

export interface RetentionPolicy {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  count: number;
  minAge?: number; // days
  maxAge?: number; // days
}

export interface BackupDestination {
  id: string;
  name: string;
  type: DestinationType;
  enabled: boolean;
  config: DestinationConfig;
  testConnection?: () => Promise<boolean>;
}

export type DestinationType = 
  | 'local'
  | 's3'
  | 'azure-blob'
  | 'google-cloud-storage'
  | 'ftp'
  | 'sftp'
  | 'webdav'
  | 'dropbox'
  | 'onedrive'
  | 'database';

export interface DestinationConfig {
  // Local storage
  path?: string;
  
  // S3 compatible
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string; // For S3-compatible services
  
  // Azure Blob
  connectionString?: string;
  containerName?: string;
  
  // FTP/SFTP
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  privateKey?: string;
  
  // Database
  connectionUrl?: string;
  tableName?: string;
  
  // Common
  maxRetries?: number;
  timeout?: number;
}

export interface BackupEncryption {
  enabled: boolean;
  algorithm: EncryptionAlgorithm;
  keyManagement: KeyManagement;
  keyRotation: boolean;
  keyRotationFrequency?: number; // days
}

export type EncryptionAlgorithm = 
  | 'AES-256-GCM'
  | 'AES-256-CBC'
  | 'ChaCha20-Poly1305'
  | 'RSA-4096';

export interface KeyManagement {
  type: 'local' | 'kms' | 'vault' | 'hsm';
  keyId?: string;
  keyPath?: string;
  vaultUrl?: string;
  hsmSlot?: number;
}

export interface CompressionConfig {
  enabled: boolean;
  algorithm: CompressionAlgorithm;
  level: number; // 1-9
}

export type CompressionAlgorithm = 
  | 'gzip'
  | 'bzip2'
  | 'lz4'
  | 'zstd'
  | 'xz';

export interface BackupFilters {
  includeWorkflows: string[]; // workflow IDs or patterns
  excludeWorkflows: string[];
  includeCredentials: boolean;
  includeExecutionHistory: boolean;
  includeNodeData: boolean;
  includeLogs: boolean;
  includeMetrics: boolean;
  tags?: string[];
  modifiedAfter?: Date;
  modifiedBefore?: Date;
}

export interface BackupNotifications {
  onSuccess: NotificationConfig[];
  onFailure: NotificationConfig[];
  onWarning: NotificationConfig[];
  summary: SummaryConfig;
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  recipients: string[];
  template?: string;
  includeDetails: boolean;
}

export interface SummaryConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
}

// Backup Operations
export interface Backup {
  id: string;
  configId: string;
  name: string;
  description?: string;
  type: BackupType;
  status: BackupStatus;
  size: number; // bytes
  compressedSize?: number;
  checksum: string;
  metadata: BackupMetadata;
  manifest: BackupManifest;
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  destinations: BackupLocation[];
}

export type BackupType = 
  | 'full'
  | 'incremental'
  | 'differential'
  | 'snapshot';

export type BackupStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'corrupted'
  | 'expired';

export interface BackupMetadata {
  version: string;
  source: string;
  hostname: string;
  platform: string;
  workflowCount: number;
  credentialCount: number;
  executionCount: number;
  totalSize: number;
  encrypted: boolean;
  compressed: boolean;
  tags: string[];
}

export interface BackupManifest {
  files: BackupFile[];
  workflows: BackupWorkflow[];
  credentials: BackupCredential[];
  executions: BackupExecution[];
  dependencies: BackupDependency[];
}

export interface BackupFile {
  path: string;
  size: number;
  checksum: string;
  encrypted: boolean;
  compressed: boolean;
}

export interface BackupWorkflow {
  id: string;
  name: string;
  version: string;
  nodes: number;
  edges: number;
  lastModified: Date;
}

export interface BackupCredential {
  id: string;
  name: string;
  type: string;
  encrypted: boolean;
}

export interface BackupExecution {
  id: string;
  workflowId: string;
  status: string;
  startedAt: Date;
  finishedAt?: Date;
}

export interface BackupDependency {
  name: string;
  version: string;
  type: 'node' | 'plugin' | 'library';
}

export interface BackupLocation {
  destinationId: string;
  path: string;
  url?: string;
  uploadedAt: Date;
  verified: boolean;
  verifiedAt?: Date;
}

// Restore Operations
export interface RestoreConfig {
  backupId: string;
  strategy: RestoreStrategy;
  options: RestoreOptions;
  mapping: RestoreMapping;
  validation: RestoreValidation;
}

export type RestoreStrategy = 
  | 'overwrite'
  | 'merge'
  | 'skip-existing'
  | 'rename';

export interface RestoreOptions {
  restoreWorkflows: boolean;
  restoreCredentials: boolean;
  restoreExecutions: boolean;
  restoreSettings: boolean;
  restoreLogs: boolean;
  dryRun: boolean;
  validateIntegrity: boolean;
  stopOnError: boolean;
}

export interface RestoreMapping {
  workflowMapping: Record<string, string>; // old ID -> new ID
  credentialMapping: Record<string, string>;
  namespacePrefix?: string;
  namespaceSuffix?: string;
}

export interface RestoreValidation {
  checkDependencies: boolean;
  checkCredentials: boolean;
  checkNodeTypes: boolean;
  checkPermissions: boolean;
  preflightChecks: PreflightCheck[];
}

export interface PreflightCheck {
  name: string;
  description: string;
  validator: () => Promise<ValidationResult>;
  required: boolean;
}

export interface ValidationResult {
  passed: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
}

export interface RestoreResult {
  success: boolean;
  restoredItems: RestoredItems;
  errors: RestoreError[];
  warnings: string[];
  duration: number; // milliseconds
  report: RestoreReport;
}

export interface RestoredItems {
  workflows: RestoredWorkflow[];
  credentials: RestoredCredential[];
  executions: number;
  settings: string[];
}

export interface RestoredWorkflow {
  originalId: string;
  newId: string;
  name: string;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

export interface RestoredCredential {
  originalId: string;
  newId: string;
  name: string;
  type: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface RestoreError {
  item: string;
  type: 'workflow' | 'credential' | 'execution' | 'setting';
  error: string;
  suggestion?: string;
}

export interface RestoreReport {
  summary: string;
  details: RestoreDetail[];
  recommendations: string[];
}

export interface RestoreDetail {
  category: string;
  items: number;
  successful: number;
  failed: number;
  skipped: number;
}

// Disaster Recovery
export interface DisasterRecoveryPlan {
  id: string;
  name: string;
  description: string;
  rto: number; // Recovery Time Objective (minutes)
  rpo: number; // Recovery Point Objective (minutes)
  strategies: DRStrategy[];
  testing: DRTesting;
  documentation: DRDocumentation;
  contacts: DRContact[];
  active: boolean;
  lastTested?: Date;
  lastUpdated: Date;
}

export interface DRStrategy {
  name: string;
  type: DRStrategyType;
  priority: number;
  automated: boolean;
  steps: DRStep[];
  requirements: string[];
  estimatedTime: number; // minutes
}

export type DRStrategyType = 
  | 'hot-standby'
  | 'warm-standby'
  | 'cold-standby'
  | 'backup-restore'
  | 'pilot-light'
  | 'multi-region';

export interface DRStep {
  order: number;
  name: string;
  description: string;
  automated: boolean;
  script?: string;
  validation?: string;
  rollback?: string;
  estimatedTime: number;
  criticalPath: boolean;
}

export interface DRTesting {
  schedule: TestSchedule;
  scenarios: DRScenario[];
  automation: TestAutomation;
  reporting: TestReporting;
}

export interface TestSchedule {
  frequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  nextTest: Date;
  duration: number; // hours
  participants: string[];
}

export interface DRScenario {
  name: string;
  description: string;
  type: 'full' | 'partial' | 'tabletop';
  systems: string[];
  steps: string[];
  successCriteria: string[];
}

export interface TestAutomation {
  enabled: boolean;
  tools: string[];
  scripts: AutomationScript[];
}

export interface AutomationScript {
  name: string;
  path: string;
  parameters: Record<string, unknown>;
  timeout: number;
}

export interface TestReporting {
  template: string;
  metrics: string[];
  distribution: string[];
}

export interface DRDocumentation {
  runbooks: DRRunbook[];
  diagrams: DRDiagram[];
  contacts: string[];
  lastReview: Date;
  nextReview: Date;
}

export interface DRRunbook {
  name: string;
  version: string;
  path: string;
  sections: string[];
  approvedBy: string;
  approvedDate: Date;
}

export interface DRDiagram {
  name: string;
  type: 'architecture' | 'network' | 'process' | 'data-flow';
  path: string;
  lastUpdated: Date;
}

export interface DRContact {
  name: string;
  role: string;
  email: string;
  phone: string;
  alternateContact?: string;
  availability: string;
}

// Backup Service Interface
export interface IBackupService {
  // Configuration
  createBackupConfig(config: Partial<BackupConfig>): Promise<BackupConfig>;
  updateBackupConfig(id: string, updates: Partial<BackupConfig>): Promise<BackupConfig>;
  deleteBackupConfig(id: string): Promise<void>;
  getBackupConfig(id: string): Promise<BackupConfig | null>;
  listBackupConfigs(): Promise<BackupConfig[]>;
  
  // Backup Operations
  createBackup(configId: string, options?: BackupOptions): Promise<Backup>;
  listBackups(filters?: BackupFilters): Promise<Backup[]>;
  getBackup(id: string): Promise<Backup | null>;
  deleteBackup(id: string): Promise<void>;
  verifyBackup(id: string): Promise<ValidationResult>;
  
  // Restore Operations
  restoreBackup(config: RestoreConfig): Promise<RestoreResult>;
  previewRestore(backupId: string): Promise<RestorePreview>;
  validateRestore(config: RestoreConfig): Promise<ValidationResult>;
  
  // Disaster Recovery
  createDRPlan(plan: Partial<DisasterRecoveryPlan>): Promise<DisasterRecoveryPlan>;
  updateDRPlan(id: string, updates: Partial<DisasterRecoveryPlan>): Promise<DisasterRecoveryPlan>;
  testDRPlan(id: string, scenario?: string): Promise<DRTestResult>;
  activateDRPlan(id: string): Promise<DRActivationResult>;
  
  // Utilities
  calculateBackupSize(filters: BackupFilters): Promise<number>;
  exportBackup(id: string, format: 'zip' | 'tar'): Promise<Blob>;
  importBackup(file: File): Promise<Backup>;
  scheduleBackup(configId: string): Promise<void>;
  cancelBackup(backupId: string): Promise<void>;
}

export interface BackupOptions {
  name?: string;
  description?: string;
  tags?: string[];
  priority?: 'low' | 'normal' | 'high';
}

export interface RestorePreview {
  backup: Backup;
  conflicts: RestoreConflict[];
  requirements: RestoreRequirement[];
  estimatedTime: number;
  estimatedSize: number;
}

export interface RestoreConflict {
  type: 'workflow' | 'credential' | 'setting';
  name: string;
  existingId: string;
  backupId: string;
  resolution: 'overwrite' | 'skip' | 'rename';
}

export interface RestoreRequirement {
  type: 'node' | 'plugin' | 'permission' | 'storage';
  name: string;
  required: string;
  current?: string;
  satisfied: boolean;
}

export interface DRTestResult {
  success: boolean;
  scenario: string;
  startTime: Date;
  endTime: Date;
  metrics: DRMetrics;
  issues: DRIssue[];
  recommendations: string[];
  report: string;
}

export interface DRMetrics {
  actualRTO: number;
  actualRPO: number;
  dataLoss: number;
  downtime: number;
  successRate: number;
}

export interface DRIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  component: string;
  description: string;
  impact: string;
  resolution?: string;
}

export interface DRActivationResult {
  activated: boolean;
  strategy: string;
  startTime: Date;
  completionTime?: Date;
  status: DRStatus;
  recoveredSystems: string[];
  failedSystems: string[];
  logs: DRLog[];
}

export type DRStatus = 
  | 'activating'
  | 'active'
  | 'testing'
  | 'failing-over'
  | 'failed-over'
  | 'failing-back'
  | 'completed'
  | 'failed';

export interface DRLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  component: string;
  message: string;
  details?: Record<string, unknown>;
}