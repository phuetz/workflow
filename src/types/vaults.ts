/**
 * Vault Provider Type Definitions
 * Supports AWS, Azure, HashiCorp, and GCP secret management systems
 */

// Vault provider types
export type VaultProviderType = 'aws' | 'azure' | 'hashicorp' | 'gcp';

// Secret metadata
export interface SecretMetadata {
  name: string;
  description?: string;
  tags?: Record<string, string>;
  owner?: string;
  createdAt: Date;
  updatedAt: Date;
  version?: string;
  expiresAt?: Date;
  rotationEnabled?: boolean;
  rotationInterval?: number; // days
}

// Secret version
export interface SecretVersion {
  versionId: string;
  value: string;
  createdAt: Date;
  createdBy: string;
  status: 'current' | 'previous' | 'deprecated' | 'deleted';
  metadata?: Record<string, any>;
}

// Secret with versions
export interface Secret {
  id: string;
  name: string;
  description?: string;
  currentValue: string;
  currentVersion: string;
  versions: SecretVersion[];
  metadata: SecretMetadata;
  vault: VaultProviderType;
  environment: string;
}

// Vault configuration base
export interface VaultConfig {
  type: VaultProviderType;
  name: string;
  enabled: boolean;
  priority: number; // for failover ordering
  healthCheckInterval?: number; // seconds
  timeout?: number; // milliseconds
  retryAttempts?: number;
  retryDelay?: number; // milliseconds
}

// AWS Secrets Manager configuration
export interface AWSSecretsManagerConfig extends VaultConfig {
  type: 'aws';
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  roleArn?: string; // for IAM role assumption
  kmsKeyId?: string;
  replicateToRegions?: string[];
}

// Azure Key Vault configuration
export interface AzureKeyVaultConfig extends VaultConfig {
  type: 'azure';
  vaultUrl: string;
  tenantId: string;
  clientId: string;
  clientSecret?: string;
  useManagedIdentity?: boolean;
  enableSoftDelete?: boolean;
  enablePurgeProtection?: boolean;
}

// HashiCorp Vault configuration
export interface HashiCorpVaultConfig extends VaultConfig {
  type: 'hashicorp';
  address: string;
  token?: string;
  namespace?: string;
  authMethod?: 'token' | 'approle' | 'ldap' | 'github' | 'kubernetes';
  roleId?: string;
  secretId?: string;
  mountPath?: string;
  engineType?: 'kv' | 'database' | 'aws' | 'azure' | 'gcp';
  kvVersion?: 1 | 2;
}

// GCP Secret Manager configuration
export interface GCPSecretManagerConfig extends VaultConfig {
  type: 'gcp';
  projectId: string;
  keyFilePath?: string;
  credentials?: any;
  replicationPolicy?: 'automatic' | 'user-managed';
  locations?: string[];
}

// Union type for all vault configs
export type VaultProviderConfig =
  | AWSSecretsManagerConfig
  | AzureKeyVaultConfig
  | HashiCorpVaultConfig
  | GCPSecretManagerConfig;

// Vault health status
export interface VaultHealthStatus {
  vault: string;
  type: VaultProviderType;
  healthy: boolean;
  lastCheck: Date;
  latency?: number; // milliseconds
  error?: string;
  capabilities?: string[];
}

// Secret rotation policy
export interface RotationPolicy {
  id: string;
  name: string;
  enabled: boolean;
  interval: number; // days
  type: 'time-based' | 'event-based' | 'manual';
  autoRotate: boolean;
  notifyBefore?: number; // days before rotation
  gracePeriod?: number; // days to keep old secret
  validationRequired?: boolean;
  validationFunction?: string; // function name to validate secret
  preRotationHooks?: string[];
  postRotationHooks?: string[];
  rollbackOnFailure?: boolean;
}

// Rotation execution
export interface RotationExecution {
  id: string;
  secretId: string;
  secretName: string;
  policyId: string;
  status: 'pending' | 'generating' | 'validating' | 'updating' | 'completed' | 'failed' | 'rolled-back';
  startedAt: Date;
  completedAt?: Date;
  oldVersion?: string;
  newVersion?: string;
  error?: string;
  steps: RotationStep[];
}

// Rotation step
export interface RotationStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  duration?: number; // milliseconds
}

// Audit event types
export type AuditEventType =
  | 'secret.created'
  | 'secret.read'
  | 'secret.updated'
  | 'secret.deleted'
  | 'secret.rotated'
  | 'secret.accessed'
  | 'secret.failed-access'
  | 'secret.version-created'
  | 'secret.version-restored'
  | 'vault.configured'
  | 'vault.health-check-failed'
  | 'rotation.scheduled'
  | 'rotation.completed'
  | 'rotation.failed'
  | 'sync.started'
  | 'sync.completed'
  | 'sync.failed';

// Audit log entry
export interface AuditLogEntry {
  id: string;
  eventType: AuditEventType;
  secretId?: string;
  secretName?: string;
  userId: string;
  userName: string;
  timestamp: Date;
  vaultType?: VaultProviderType;
  environment?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  details?: Record<string, any>;
  error?: string;
  duration?: number; // milliseconds
}

// Sync configuration
export interface SyncConfig {
  id: string;
  name: string;
  enabled: boolean;
  sourceEnvironment: string;
  targetEnvironment: string;
  sourceVault?: VaultProviderType;
  targetVault?: VaultProviderType;
  syncType: 'auto' | 'manual' | 'scheduled';
  schedule?: string; // cron expression
  secretFilters?: string[]; // secret name patterns
  conflictResolution: 'source-wins' | 'target-wins' | 'manual' | 'newest-wins';
  validateAfterSync?: boolean;
  notifyOnCompletion?: boolean;
  notifyOnFailure?: boolean;
  rollbackOnFailure?: boolean;
}

// Sync execution
export interface SyncExecution {
  id: string;
  configId: string;
  status: 'pending' | 'syncing' | 'validating' | 'completed' | 'failed' | 'rolled-back';
  startedAt: Date;
  completedAt?: Date;
  secretsSynced: number;
  secretsFailed: number;
  conflicts: SyncConflict[];
  errors: string[];
  duration?: number; // milliseconds
}

// Sync conflict
export interface SyncConflict {
  secretName: string;
  sourceValue: string;
  targetValue: string;
  sourceVersion: string;
  targetVersion: string;
  sourceUpdatedAt: Date;
  targetUpdatedAt: Date;
  resolution?: 'source' | 'target' | 'manual';
  resolvedValue?: string;
}

// Vault operation result
export interface VaultOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number; // milliseconds
  vault: VaultProviderType;
  cached?: boolean;
}

// Secret access policy
export interface SecretAccessPolicy {
  id: string;
  secretId: string;
  name: string;
  enabled: boolean;
  rules: AccessRule[];
  denyByDefault?: boolean;
}

// Access rule
export interface AccessRule {
  id: string;
  type: 'allow' | 'deny';
  principal: string; // user, role, or service
  principalType: 'user' | 'role' | 'service';
  actions: ('read' | 'write' | 'delete' | 'rotate')[];
  conditions?: AccessCondition[];
  priority: number;
}

// Access condition
export interface AccessCondition {
  type: 'ip-range' | 'time-window' | 'mfa-required' | 'environment';
  value: any;
}

// Cache entry for secrets
export interface SecretCacheEntry {
  secretId: string;
  value: string;
  version: string;
  cachedAt: Date;
  expiresAt: Date;
  hits: number;
}

// Vault statistics
export interface VaultStatistics {
  vault: VaultProviderType;
  totalSecrets: number;
  activeSecrets: number;
  rotatingSecrets: number;
  expiringSoon: number; // expires in next 7 days
  averageRotationInterval: number; // days
  totalRotations: number;
  successfulRotations: number;
  failedRotations: number;
  totalReads: number;
  totalWrites: number;
  averageLatency: number; // milliseconds
  cacheHitRate: number; // percentage
  lastRotation?: Date;
  nextRotation?: Date;
}

// Compliance report
export interface ComplianceReport {
  id: string;
  type: 'HIPAA' | 'SOC2' | 'GDPR' | 'PCI-DSS' | 'ISO27001';
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  scope: string[];
  findings: ComplianceFinding[];
  summary: {
    totalSecrets: number;
    compliant: number;
    nonCompliant: number;
    warnings: number;
  };
  recommendations: string[];
}

// Compliance finding
export interface ComplianceFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  secretsAffected: string[];
  remediation: string;
  status: 'open' | 'in-progress' | 'resolved' | 'accepted-risk';
}

// Secret expiry warning
export interface SecretExpiryWarning {
  secretId: string;
  secretName: string;
  expiresAt: Date;
  daysUntilExpiry: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  notificationsSent: number;
  lastNotificationAt?: Date;
}

// Vault provider interface (abstract)
export interface IVaultProvider {
  readonly type: VaultProviderType;
  readonly name: string;
  readonly config: VaultProviderConfig;

  // Lifecycle
  initialize(): Promise<void>;
  healthCheck(): Promise<VaultHealthStatus>;
  disconnect(): Promise<void>;

  // Secret operations
  getSecret(name: string): Promise<VaultOperationResult<string>>;
  setSecret(name: string, value: string, metadata?: SecretMetadata): Promise<VaultOperationResult<void>>;
  deleteSecret(name: string): Promise<VaultOperationResult<void>>;
  listSecrets(): Promise<VaultOperationResult<string[]>>;

  // Version operations
  getSecretVersion(name: string, version: string): Promise<VaultOperationResult<string>>;
  listSecretVersions(name: string): Promise<VaultOperationResult<SecretVersion[]>>;

  // Metadata operations
  getSecretMetadata(name: string): Promise<VaultOperationResult<SecretMetadata>>;
  updateSecretMetadata(name: string, metadata: Partial<SecretMetadata>): Promise<VaultOperationResult<void>>;

  // Rotation operations
  rotateSecret(name: string, newValue?: string): Promise<VaultOperationResult<string>>;

  // Validation
  validateSecret(name: string, value: string): Promise<boolean>;
}

// Multi-vault manager interface
export interface IMultiVaultManager {
  // Vault management
  registerVault(vault: IVaultProvider): void;
  unregisterVault(name: string): void;
  getVault(name: string): IVaultProvider | undefined;
  getAllVaults(): IVaultProvider[];

  // Health monitoring
  checkAllVaultsHealth(): Promise<VaultHealthStatus[]>;

  // Failover
  getHealthyVault(preferredType?: VaultProviderType): Promise<IVaultProvider | undefined>;
}

// Secret generator options
export interface SecretGeneratorOptions {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  excludeAmbiguous?: boolean;
  customCharset?: string;
  pattern?: string; // regex pattern for validation
}
