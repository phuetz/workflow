export interface Secret {
  id: string;
  name: string;
  description?: string;
  type: SecretType;
  value: string;
  encrypted: boolean;
  tags: string[];
  metadata: SecretMetadata;
  access: SecretAccess;
  audit: SecretAudit;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  organizationId: string;
  environmentId?: string;
}

export type SecretType = 
  | 'password'
  | 'api_key'
  | 'oauth_token'
  | 'certificate'
  | 'private_key'
  | 'database_url'
  | 'webhook_secret'
  | 'custom';

export interface SecretMetadata {
  version: number;
  expiresAt?: string;
  lastRotated?: string;
  rotationInterval?: number; // in days
  autoRotate: boolean;
  source: 'manual' | 'vault' | 'aws' | 'azure' | 'gcp' | 'external';
  sourceId?: string;
  keyId?: string;
  algorithm?: string;
  checksum?: string;
}

export interface SecretAccess {
  permissions: SecretPermission[];
  allowedUsers: string[];
  allowedRoles: string[];
  allowedServices: string[];
  ipWhitelist?: string[];
  timeRestrictions?: TimeRestriction[];
  usageLimit?: number;
  expiresAt?: string;
}

export interface SecretPermission {
  type: 'read' | 'write' | 'delete' | 'rotate' | 'admin';
  granted: boolean;
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'time_between';
  value: unknown;
}

export interface TimeRestriction {
  days: number[]; // 0-6 (Sunday-Saturday)
  hours: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
  timezone: string;
}

export interface SecretAudit {
  accessCount: number;
  lastAccessed?: string;
  lastAccessedBy?: string;
  rotationHistory: RotationRecord[];
  accessHistory: AccessRecord[];
}

export interface RotationRecord {
  id: string;
  timestamp: string;
  method: 'manual' | 'automatic' | 'emergency';
  reason: string;
  rotatedBy: string;
  success: boolean;
  error?: string;
}

export interface AccessRecord {
  id: string;
  timestamp: string;
  userId: string;
  action: 'read' | 'write' | 'delete' | 'rotate';
  success: boolean;
  ipAddress: string;
  userAgent: string;
  context?: unknown;
}

export interface SecretEngine {
  id: string;
  name: string;
  type: SecretEngineType;
  description: string;
  status: 'active' | 'inactive' | 'error';
  config: SecretEngineConfig;
  capabilities: SecretEngineCapabilities;
  createdAt: string;
  updatedAt: string;
}

export type SecretEngineType = 
  | 'local'
  | 'hashicorp_vault'
  | 'aws_secrets_manager'
  | 'azure_key_vault'
  | 'gcp_secret_manager'
  | 'custom';

export interface SecretEngineConfig {
  endpoint?: string;
  token?: string;
  region?: string;
  vaultId?: string;
  credentials?: unknown;
  encryption?: EncryptionConfig;
  backup?: BackupConfig;
  [key: string]: unknown;
}

export interface EncryptionConfig {
  algorithm: 'AES-256-GCM' | 'AES-256-CBC' | 'ChaCha20-Poly1305';
  keyDerivation: 'PBKDF2' | 'scrypt' | 'argon2id';
  keySize: number;
  iterations?: number;
  saltSize: number;
  tagSize: number;
}

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // cron expression
  retention: number; // days
  encryption: boolean;
  destination: 'local' | 's3' | 'azure' | 'gcp';
  config: unknown;
}

export interface SecretEngineCapabilities {
  encryption: boolean;
  rotation: boolean;
  versioning: boolean;
  backup: boolean;
  audit: boolean;
  keyDerivation: boolean;
  certificateGeneration: boolean;
  transitEncryption: boolean;
  leasing: boolean;
  templating: boolean;
}

export interface SecretTemplate {
  id: string;
  name: string;
  description: string;
  type: SecretType;
  fields: SecretField[];
  validation: ValidationRule[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SecretField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'file';
  required: boolean;
  sensitive: boolean;
  default?: unknown;
  placeholder?: string;
  validation?: ValidationRule[];
  options?: string[];
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: unknown;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface SecretPolicy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  enforcement: 'strict' | 'warn' | 'monitor';
  scope: PolicyScope;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyRule {
  id: string;
  name: string;
  condition: string;
  action: 'allow' | 'deny' | 'require_approval' | 'audit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  enabled: boolean;
}

export interface PolicyScope {
  environments: string[];
  secretTypes: SecretType[];
  tags: string[];
  users: string[];
  roles: string[];
  services: string[];
}

export interface SecretRotationJob {
  id: string;
  secretId: string;
  type: 'manual' | 'scheduled' | 'emergency';
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  config: RotationConfig;
  progress: RotationProgress;
  result?: RotationResult;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  createdBy: string;
}

export interface RotationConfig {
  strategy: 'immediate' | 'gradual' | 'blue_green';
  validationSteps: ValidationStep[];
  rollbackOnFailure: boolean;
  notifyOnCompletion: boolean;
  notifications: NotificationConfig[];
}

export interface ValidationStep {
  name: string;
  type: 'connectivity' | 'authentication' | 'authorization' | 'custom';
  config: unknown;
  required: boolean;
  timeout: number;
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: unknown;
  events: string[];
}

export interface RotationProgress {
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  lastUpdate: string;
  logs: RotationLog[];
}

export interface RotationLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

export interface RotationResult {
  success: boolean;
  newVersion: number;
  oldVersion: number;
  validationResults: ValidationResult[];
  rollbackPerformed: boolean;
  error?: string;
  metrics: RotationMetrics;
}

export interface ValidationResult {
  step: string;
  success: boolean;
  message: string;
  details?: unknown;
  duration: number;
}

export interface RotationMetrics {
  totalDuration: number;
  validationDuration: number;
  networkCalls: number;
  affectedServices: string[];
  downtime: number;
}

export interface SecretLease {
  id: string;
  secretId: string;
  leasedTo: string;
  leasedBy: string;
  expiresAt: string;
  renewable: boolean;
  maxRenewals: number;
  renewalCount: number;
  status: 'active' | 'expired' | 'revoked';
  createdAt: string;
  revokedAt?: string;
  revokedBy?: string;
  metadata: unknown;
}

export interface SecretRequest {
  id: string;
  secretId: string;
  requestedBy: string;
  requestType: 'access' | 'rotation' | 'deletion' | 'modification';
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  approvers: string[];
  requiredApprovals: number;
  approvals: Approval[];
  expiresAt: string;
  createdAt: string;
  processedAt?: string;
}

export interface Approval {
  approverId: string;
  approved: boolean;
  reason?: string;
  timestamp: string;
}

export interface SecretBackup {
  id: string;
  timestamp: string;
  type: 'full' | 'incremental' | 'differential';
  secretIds: string[];
  size: number;
  encrypted: boolean;
  checksum: string;
  location: string;
  metadata: BackupMetadata;
  status: 'completed' | 'failed' | 'in_progress';
}

export interface BackupMetadata {
  version: string;
  engine: string;
  compression: string;
  encryption: string;
  createdBy: string;
  retention: string;
  tags: string[];
}

export interface SecretEnvironment {
  id: string;
  name: string;
  description: string;
  type: 'development' | 'staging' | 'production' | 'testing';
  config: EnvironmentConfig;
  secrets: string[];
  policies: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentConfig {
  isolation: 'shared' | 'dedicated';
  encryption: EncryptionConfig;
  backup: BackupConfig;
  monitoring: MonitoringConfig;
  compliance: ComplianceConfig;
}

export interface MonitoringConfig {
  enabled: boolean;
  alerting: boolean;
  metrics: string[];
  retention: number;
  exporters: string[];
}

export interface ComplianceConfig {
  standards: string[];
  auditing: boolean;
  reporting: boolean;
  dataResidency: string;
  accessLogging: boolean;
}

export interface SecretUsage {
  secretId: string;
  userId: string;
  serviceId: string;
  workflowId: string;
  nodeId: string;
  timestamp: string;
  action: string;
  context: unknown;
  duration: number;
  success: boolean;
  error?: string;
}

export interface SecretMetrics {
  secretId: string;
  name: string;
  type: SecretType;
  accessCount: number;
  lastAccessed: string;
  rotationCount: number;
  lastRotated: string;
  failureCount: number;
  averageAccessTime: number;
  uniqueUsers: number;
  environments: string[];
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  period: string;
  timestamp: string;
}

export interface SecretHealthCheck {
  secretId: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  checks: HealthCheck[];
  lastCheck: string;
  nextCheck: string;
  score: number;
}

export interface HealthCheck {
  name: string;
  type: 'expiration' | 'rotation' | 'usage' | 'compliance' | 'security';
  status: 'pass' | 'fail' | 'warning';
  message: string;
  value?: unknown;
  threshold?: unknown;
  timestamp: string;
}

export interface SecretAlert {
  id: string;
  secretId: string;
  type: 'expiration' | 'rotation' | 'access' | 'policy' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: unknown;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  acknowledgedBy?: string;
  resolvedBy?: string;
}