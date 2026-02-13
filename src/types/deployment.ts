/**
 * Self-Hosted Deployment Types
 * Infrastructure, deployment configurations, and management
 */

export interface DeploymentConfig {
  id: string;
  name: string;
  type: DeploymentType;
  infrastructure: InfrastructureConfig;
  application: ApplicationConfig;
  database: DatabaseConfig;
  storage: StorageConfig;
  networking: NetworkConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  scaling: ScalingConfig;
  backup: BackupConfig;
  status: DeploymentStatus;
  metadata: DeploymentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type DeploymentType = 
  | 'docker'
  | 'kubernetes'
  | 'docker-compose'
  | 'bare-metal'
  | 'cloud-native'
  | 'serverless';

export interface NetworkingSpec {
  bandwidth: number; // Mbps
  publicIPs: number;
  privateIPs: number;
}

export interface InfrastructureConfig {
  provider: InfrastructureProvider;
  region?: string;
  zone?: string;
  resourceGroup?: string;
  specifications: ResourceSpecifications;
  networking: NetworkingSpec;
  tags: Record<string, string>;
}

export type InfrastructureProvider = 
  | 'aws'
  | 'azure'
  | 'gcp'
  | 'digitalocean'
  | 'linode'
  | 'on-premise'
  | 'hybrid';

export interface ResourceSpecifications {
  compute: ComputeSpec;
  memory: MemorySpec;
  storage: StorageSpec;
  network: NetworkSpec;
}

export interface ComputeSpec {
  cpu: number; // vCPUs
  architecture: 'x86_64' | 'arm64';
  instanceType?: string; // Cloud provider specific
}

export interface MemorySpec {
  ram: number; // GB
  swap?: number; // GB
}

export interface StorageSpec {
  type: 'ssd' | 'hdd' | 'nvme';
  size: number; // GB
  iops?: number;
  throughput?: number; // MB/s
}

export interface NetworkSpec {
  bandwidth: number; // Mbps
  publicIPs: number;
  privateIPs: number;
}

export interface ApplicationConfig {
  version: string;
  components: ComponentConfig[];
  environment: EnvironmentVariables;
  secrets: SecretConfig[];
  features: FeatureFlags;
  customization: CustomizationConfig;
}

export interface ComponentConfig {
  name: string;
  type: ComponentType;
  enabled: boolean;
  replicas: number;
  resources: ResourceRequirements;
  configuration: Record<string, unknown>;
  healthCheck?: HealthCheckConfig;
  dependencies: string[];
}

export type ComponentType = 
  | 'api'
  | 'frontend'
  | 'worker'
  | 'scheduler'
  | 'webhook'
  | 'websocket'
  | 'cache'
  | 'queue';

export interface ResourceRequirements {
  cpu: {
    request: string; // e.g., "100m"
    limit: string;   // e.g., "1000m"
  };
  memory: {
    request: string; // e.g., "128Mi"
    limit: string;   // e.g., "512Mi"
  };
}

export interface HealthCheckConfig {
  type: 'http' | 'tcp' | 'exec';
  path?: string;
  port?: number;
  command?: string[];
  interval: number; // seconds
  timeout: number;
  retries: number;
}

export interface EnvironmentVariables {
  NODE_ENV: 'production' | 'staging' | 'development';
  API_URL: string;
  FRONTEND_URL: string;
  [key: string]: string;
}

export interface SecretConfig {
  name: string;
  type: 'env' | 'file' | 'volume';
  source: SecretSource;
  destination: string;
}

export interface SecretSource {
  type: 'vault' | 'kubernetes-secret' | 'aws-secrets-manager' | 'azure-keyvault' | 'file';
  path: string;
  key?: string;
}

export interface FeatureFlags {
  multiTenancy: boolean;
  sso: boolean;
  audit: boolean;
  encryption: boolean;
  customNodes: boolean;
  webhooks: boolean;
  scheduling: boolean;
  [key: string]: boolean;
}

export interface CustomizationConfig {
  branding: BrandingConfig;
  themes: ThemeConfig[];
  plugins: PluginConfig[];
  integrations: IntegrationConfig[];
}

export interface BrandingConfig {
  logo?: string;
  favicon?: string;
  appName: string;
  companyName: string;
  supportEmail: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface ThemeConfig {
  name: string;
  colors: Record<string, string>;
  fonts: Record<string, string>;
  styles: string; // CSS
}

export interface PluginConfig {
  name: string;
  version: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface IntegrationConfig {
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface DatabaseConfig {
  type: DatabaseType;
  version: string;
  connection: DatabaseConnection;
  replication?: ReplicationConfig;
  backup: DatabaseBackupConfig;
  maintenance: MaintenanceConfig;
}

export type DatabaseType = 
  | 'postgresql'
  | 'mysql'
  | 'mariadb'
  | 'mongodb'
  | 'redis'
  | 'elasticsearch';

export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string; // Should use secrets
  ssl: boolean;
  poolSize: number;
  connectionTimeout: number;
}

export interface ReplicationConfig {
  enabled: boolean;
  mode: 'master-slave' | 'master-master' | 'cluster';
  replicas: ReplicaConfig[];
  failover: FailoverConfig;
}

export interface ReplicaConfig {
  host: string;
  port: number;
  priority: number;
  readonly: boolean;
}

export interface FailoverConfig {
  automatic: boolean;
  timeout: number; // seconds
  retries: number;
}

export interface DatabaseBackupConfig {
  enabled: boolean;
  schedule: string; // cron expression
  retention: number; // days
  location: string;
  encryption: boolean;
}

export interface MaintenanceConfig {
  autoVacuum: boolean;
  autoAnalyze: boolean;
  schedule: string; // cron expression
}

export interface StorageConfig {
  type: StorageType;
  provider?: string;
  configuration: Record<string, unknown>;
  quotas: StorageQuotas;
  lifecycle: LifecyclePolicy[];
}

export type StorageType = 
  | 'local'
  | 's3'
  | 'azure-blob'
  | 'gcs'
  | 'minio'
  | 'nfs';

export interface StorageQuotas {
  maxSize: number; // GB
  maxFiles: number;
  maxFileSize: number; // MB
}

export interface LifecyclePolicy {
  name: string;
  rules: LifecycleRule[];
}

export interface LifecycleRule {
  type: 'archive' | 'delete' | 'transition';
  age: number; // days
  destination?: string;
}

export interface NetworkConfig {
  vpc?: VPCConfig;
  subnets: SubnetConfig[];
  securityGroups: SecurityGroupConfig[];
  loadBalancer?: LoadBalancerConfig;
  dns: DNSConfig;
  ssl: SSLConfig;
}

export interface VPCConfig {
  id?: string;
  cidr: string;
  enableDnsHostnames: boolean;
  enableDnsSupport: boolean;
}

export interface SubnetConfig {
  id?: string;
  cidr: string;
  availabilityZone?: string;
  public: boolean;
  natGateway?: boolean;
}

export interface SecurityGroupConfig {
  name: string;
  rules: SecurityRule[];
}

export interface SecurityRule {
  type: 'ingress' | 'egress';
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  fromPort: number;
  toPort: number;
  source: string; // CIDR or security group
  description?: string;
}

export interface LoadBalancerConfig {
  type: 'application' | 'network' | 'classic';
  scheme: 'internet-facing' | 'internal';
  listeners: ListenerConfig[];
  healthCheck: HealthCheckConfig;
  targetGroups: TargetGroupConfig[];
}

export interface ListenerConfig {
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'TLS';
  sslCertificate?: string;
  rules: RoutingRule[];
}

export interface RoutingRule {
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

export interface RuleCondition {
  type: 'path-pattern' | 'host-header' | 'http-header';
  values: string[];
}

export interface RuleAction {
  type: 'forward' | 'redirect' | 'fixed-response';
  targetGroup?: string;
  redirectConfig?: RedirectConfig;
}

export interface RedirectConfig {
  protocol: string;
  port: string;
  host: string;
  path: string;
  query: string;
  statusCode: 'HTTP_301' | 'HTTP_302';
}

export interface TargetGroupConfig {
  name: string;
  port: number;
  protocol: string;
  targets: string[]; // Instance IDs or IPs
  healthCheck: HealthCheckConfig;
}

export interface DNSConfig {
  provider: 'route53' | 'cloudflare' | 'custom';
  domain: string;
  records: DNSRecord[];
}

export interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT';
  name: string;
  value: string;
  ttl: number;
}

export interface SSLConfig {
  enabled: boolean;
  provider: 'letsencrypt' | 'custom' | 'aws-acm' | 'self-signed';
  certificates: SSLCertificate[];
  autoRenew: boolean;
}

export interface SSLCertificate {
  domain: string;
  certificate: string;
  privateKey: string;
  chain?: string;
  expiresAt: Date;
}

export interface SecurityConfig {
  authentication: AuthConfig;
  authorization: AuthzConfig;
  encryption: EncryptionConfig;
  firewall: FirewallConfig;
  audit: AuditConfig;
  compliance: ComplianceConfig;
}

export interface AuthConfig {
  providers: AuthProvider[];
  mfa: MFAConfig;
  session: SessionConfig;
  passwordPolicy: PasswordPolicy;
}

export interface AuthProvider {
  type: 'local' | 'ldap' | 'saml' | 'oauth' | 'oidc';
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface MFAConfig {
  enabled: boolean;
  required: boolean;
  methods: ('totp' | 'sms' | 'email' | 'hardware')[];
}

export interface SessionConfig {
  timeout: number; // minutes
  maxConcurrent: number;
  rememberMe: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expirationDays: number;
  historyCount: number;
}

export interface AuthzConfig {
  model: 'rbac' | 'abac' | 'custom';
  roles: RoleDefinition[];
  policies: PolicyDefinition[];
}

export interface RoleDefinition {
  name: string;
  permissions: string[];
  inherits?: string[];
}

export interface PolicyDefinition {
  name: string;
  effect: 'allow' | 'deny';
  resources: string[];
  actions: string[];
  conditions?: Record<string, unknown>;
}

export interface EncryptionConfig {
  atRest: {
    enabled: boolean;
    algorithm: string;
    keyManagement: 'local' | 'kms' | 'vault';
  };
  inTransit: {
    enabled: boolean;
    minTlsVersion: string;
    cipherSuites: string[];
  };
}

export interface FirewallConfig {
  enabled: boolean;
  rules: FirewallRule[];
  ddosProtection: boolean;
  ipWhitelist: string[];
  ipBlacklist: string[];
}

export interface FirewallRule {
  name: string;
  priority: number;
  action: 'allow' | 'deny';
  source: string;
  destination: string;
  protocol: string;
  ports: string;
}

export interface AuditConfig {
  enabled: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  retention: number; // days
  destinations: AuditDestination[];
}

export interface AuditDestination {
  type: 'file' | 'database' | 'siem' | 'cloud';
  config: Record<string, unknown>;
}

export interface ComplianceConfig {
  standards: ('hipaa' | 'gdpr' | 'soc2' | 'pci-dss' | 'iso27001')[];
  dataResidency: string[]; // countries/regions
  dataRetention: number; // days
}

export interface MonitoringConfig {
  metrics: MetricsConfig;
  logging: LoggingConfig;
  tracing: TracingConfig;
  alerting: AlertingConfig;
  dashboards: DashboardConfig[];
}

export interface MetricsConfig {
  enabled: boolean;
  provider: 'prometheus' | 'datadog' | 'newrelic' | 'cloudwatch';
  interval: number; // seconds
  retention: number; // days
  exporters: string[];
}

export interface LoggingConfig {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'text';
  destinations: LogDestination[];
}

export interface LogDestination {
  type: 'file' | 'stdout' | 'elasticsearch' | 'cloudwatch' | 'datadog';
  config: Record<string, unknown>;
}

export interface TracingConfig {
  enabled: boolean;
  provider: 'jaeger' | 'zipkin' | 'datadog' | 'newrelic';
  samplingRate: number; // 0-1
  endpoint: string;
}

export interface AlertingConfig {
  enabled: boolean;
  rules: AlertRule[];
  channels: AlertChannel[];
}

export interface AlertRule {
  name: string;
  condition: string; // PromQL or provider-specific
  threshold: number;
  duration: string; // e.g., "5m"
  severity: 'critical' | 'warning' | 'info';
  channels: string[];
}

export interface AlertChannel {
  name: string;
  type: 'email' | 'slack' | 'pagerduty' | 'webhook';
  config: Record<string, unknown>;
}

export interface DashboardConfig {
  name: string;
  provider: 'grafana' | 'kibana' | 'custom';
  config: Record<string, unknown>;
}

export interface ScalingConfig {
  type: 'manual' | 'horizontal' | 'vertical' | 'auto';
  minInstances: number;
  maxInstances: number;
  metrics: ScalingMetric[];
  policies: ScalingPolicy[];
}

export interface ScalingMetric {
  name: string;
  type: 'cpu' | 'memory' | 'requests' | 'custom';
  target: number;
}

export interface ScalingPolicy {
  name: string;
  scaleUp: {
    threshold: number;
    increment: number;
    cooldown: number; // seconds
  };
  scaleDown: {
    threshold: number;
    decrement: number;
    cooldown: number; // seconds
  };
}

export interface BackupConfig {
  enabled: boolean;
  schedule: BackupSchedule;
  retention: BackupRetention;
  destinations: BackupDestination[];
  encryption: boolean;
  verification: boolean;
}

export interface BackupSchedule {
  full: string; // cron expression
  incremental?: string;
  differential?: string;
}

export interface BackupRetention {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
}

export interface BackupDestination {
  type: 's3' | 'azure-blob' | 'gcs' | 'nfs' | 'tape';
  config: Record<string, unknown>;
}

export type DeploymentStatus = 
  | 'provisioning'
  | 'deploying'
  | 'running'
  | 'updating'
  | 'scaling'
  | 'stopping'
  | 'stopped'
  | 'failed'
  | 'terminated';

export interface DeploymentMetadata {
  version: string;
  environment: 'production' | 'staging' | 'development';
  owner: string;
  team: string;
  costCenter?: string;
  project?: string;
  tags: Record<string, string>;
  documentation?: string;
  runbook?: string;
}

// Deployment Templates
export interface DeploymentTemplate {
  id: string;
  name: string;
  description: string;
  type: DeploymentType;
  size: 'small' | 'medium' | 'large' | 'enterprise';
  estimatedCost: CostEstimate;
  requirements: SystemRequirements;
  configuration: DeploymentConfig;
  quickStart: QuickStartGuide;
}

export interface CostEstimate {
  monthly: number;
  hourly: number;
  currency: string;
  breakdown: CostBreakdown[];
}

export interface CostBreakdown {
  component: string;
  cost: number;
  unit: string;
}

export interface SystemRequirements {
  minCpu: number;
  minMemory: number;
  minStorage: number;
  os: string[];
  dependencies: string[];
}

export interface QuickStartGuide {
  steps: DeploymentStep[];
  estimatedTime: number; // minutes
  prerequisites: string[];
  postDeployment: string[];
}

export interface DeploymentStep {
  order: number;
  title: string;
  description: string;
  command?: string;
  script?: string;
  validation?: string;
}

// Deployment Service Interface
export interface DeploymentService {
  // Template Management
  getTemplates(): Promise<DeploymentTemplate[]>;
  getTemplate(id: string): Promise<DeploymentTemplate | null>;
  
  // Deployment Operations
  createDeployment(config: DeploymentConfig): Promise<DeploymentConfig>;
  updateDeployment(id: string, updates: Partial<DeploymentConfig>): Promise<DeploymentConfig>;
  deleteDeployment(id: string): Promise<void>;
  getDeployment(id: string): Promise<DeploymentConfig | null>;
  listDeployments(): Promise<DeploymentConfig[]>;
  
  // Deployment Actions
  deployApplication(id: string): Promise<DeploymentResult>;
  stopDeployment(id: string): Promise<void>;
  restartDeployment(id: string): Promise<void>;
  scaleDeployment(id: string, replicas: number): Promise<void>;
  
  // Configuration
  validateConfig(config: DeploymentConfig): Promise<ValidationResult>;
  generateConfig(template: string, customizations: unknown): Promise<DeploymentConfig>;
  exportConfig(id: string, format: 'yaml' | 'json' | 'terraform'): Promise<string>;
  
  // Monitoring
  getDeploymentStatus(id: string): Promise<DeploymentStatus>;
  getDeploymentMetrics(id: string): Promise<DeploymentMetrics>;
  getDeploymentLogs(id: string, options?: LogOptions): Promise<LogEntry[]>;
  
  // Maintenance
  backupDeployment(id: string): Promise<BackupResult>;
  restoreDeployment(id: string, backupId: string): Promise<void>;
  updateDeploymentVersion(id: string, version: string): Promise<UpdateResult>;
}

export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  endpoints: DeploymentEndpoint[];
  credentials?: DeploymentCredentials;
  notes?: string[];
  warnings?: string[];
}

export interface DeploymentEndpoint {
  name: string;
  url: string;
  type: 'api' | 'frontend' | 'admin' | 'metrics';
  authenticated: boolean;
}

export interface DeploymentCredentials {
  adminUsername: string;
  adminPassword: string;
  apiKey?: string;
  databaseUrl?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface DeploymentMetrics {
  cpu: MetricData[];
  memory: MetricData[];
  disk: MetricData[];
  network: MetricData[];
  requests: MetricData[];
  errors: MetricData[];
  custom: Record<string, MetricData[]>;
}

export interface MetricData {
  timestamp: Date;
  value: number;
  unit: string;
}

export interface LogOptions {
  startTime?: Date;
  endTime?: Date;
  level?: string;
  component?: string;
  limit?: number;
  follow?: boolean;
}

export interface LogEntry {
  timestamp: Date;
  level: string;
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface BackupResult {
  backupId: string;
  timestamp: Date;
  size: number;
  location: string;
  checksum: string;
}

export interface UpdateResult {
  success: boolean;
  previousVersion: string;
  currentVersion: string;
  changes: string[];
  rollbackAvailable: boolean;
}