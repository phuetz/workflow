/**
 * Types and interfaces for SecurityOrchestrationHub
 *
 * @module soc/orchestration/types
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Threat severity levels
 */
export enum ThreatSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

/**
 * Incident lifecycle states
 */
export enum IncidentState {
  DETECTED = 'detected',
  TRIAGING = 'triaging',
  INVESTIGATING = 'investigating',
  CONTAINING = 'containing',
  ERADICATING = 'eradicating',
  RECOVERING = 'recovering',
  POST_INCIDENT = 'post_incident',
  CLOSED = 'closed'
}

/**
 * Playbook action categories
 */
export enum PlaybookActionCategory {
  CONTAINMENT = 'containment',
  ERADICATION = 'eradication',
  RECOVERY = 'recovery',
  INVESTIGATION = 'investigation',
  NOTIFICATION = 'notification',
  EVIDENCE_COLLECTION = 'evidence_collection',
  REMEDIATION = 'remediation',
  VALIDATION = 'validation'
}

/**
 * Integration system types
 */
export enum IntegrationSystem {
  EDR_CROWDSTRIKE = 'edr_crowdstrike',
  EDR_CARBON_BLACK = 'edr_carbon_black',
  EDR_SENTINELONE = 'edr_sentinelone',
  SIEM_SPLUNK = 'siem_splunk',
  SIEM_QRADAR = 'siem_qradar',
  SIEM_ELASTIC = 'siem_elastic',
  FIREWALL_PALO_ALTO = 'firewall_palo_alto',
  FIREWALL_CHECKPOINT = 'firewall_checkpoint',
  FIREWALL_FORTINET = 'firewall_fortinet',
  EMAIL_GATEWAY_PROOFPOINT = 'email_gateway_proofpoint',
  EMAIL_GATEWAY_MIMECAST = 'email_gateway_mimecast',
  IAM_OKTA = 'iam_okta',
  IAM_AZURE_AD = 'iam_azure_ad',
  TICKETING_SERVICENOW = 'ticketing_servicenow',
  TICKETING_JIRA = 'ticketing_jira',
  CLOUD_AWS = 'cloud_aws',
  CLOUD_AZURE = 'cloud_azure',
  CLOUD_GCP = 'cloud_gcp',
  VULNERABILITY_TENABLE = 'vulnerability_tenable',
  VULNERABILITY_QUALYS = 'vulnerability_qualys'
}

/**
 * Approval status for remediation workflows
 */
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  AUTO_APPROVED = 'auto_approved',
  ESCALATED = 'escalated',
  TIMED_OUT = 'timed_out'
}

/**
 * Playbook execution status
 */
export enum PlaybookExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  AWAITING_APPROVAL = 'awaiting_approval',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
  CANCELLED = 'cancelled'
}

/**
 * Containment action types
 */
export enum ContainmentType {
  ISOLATE_HOST = 'isolate_host',
  BLOCK_IP = 'block_ip',
  BLOCK_DOMAIN = 'block_domain',
  DISABLE_USER = 'disable_user',
  REVOKE_SESSIONS = 'revoke_sessions',
  QUARANTINE_FILE = 'quarantine_file',
  BLOCK_NETWORK_SEGMENT = 'block_network_segment',
  DISABLE_SERVICE = 'disable_service',
  REVOKE_API_KEYS = 'revoke_api_keys',
  DISABLE_MFA_BYPASS = 'disable_mfa_bypass',
  LOCK_ACCOUNT = 'lock_account',
  RESTRICT_PERMISSIONS = 'restrict_permissions'
}

/**
 * Remediation action types
 */
export enum RemediationType {
  PATCH_SYSTEM = 'patch_system',
  UPDATE_SIGNATURES = 'update_signatures',
  ROTATE_CREDENTIALS = 'rotate_credentials',
  RESTORE_BACKUP = 'restore_backup',
  REBUILD_SYSTEM = 'rebuild_system',
  UPDATE_FIREWALL_RULES = 'update_firewall_rules',
  REVOKE_CERTIFICATES = 'revoke_certificates',
  UPDATE_ACCESS_POLICIES = 'update_access_policies',
  DEPLOY_SECURITY_PATCH = 'deploy_security_patch',
  RESET_PASSWORD = 'reset_password',
  ENABLE_ADDITIONAL_LOGGING = 'enable_additional_logging',
  UPDATE_WAF_RULES = 'update_waf_rules',
  IMPLEMENT_NETWORK_SEGMENTATION = 'implement_network_segmentation',
  DEPLOY_EDR_AGENT = 'deploy_edr_agent',
  UPDATE_THREAT_INTEL = 'update_threat_intel'
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Condition for conditional action execution
 */
export interface ActionCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'matches'
  value: unknown
}

/**
 * Individual playbook action definition
 */
export interface PlaybookAction {
  id: string
  name: string
  description: string
  category: PlaybookActionCategory
  automated: boolean
  requiresApproval: boolean
  approvalRoles?: string[]
  timeout: number
  retryCount: number
  rollbackEnabled: boolean
  rollbackAction?: string
  dependencies: string[]
  parameters: Record<string, unknown>
  integrations: IntegrationSystem[]
  conditions?: ActionCondition[]
}

/**
 * Response playbook definition
 */
export interface ResponsePlaybook {
  id: string
  name: string
  description: string
  version: string
  threatTypes: string[]
  severity: ThreatSeverity[]
  actions: PlaybookAction[]
  autoExecute: boolean
  approvalRequired: boolean
  approvers: string[]
  maxDuration: number
  tags: string[]
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

/**
 * Action execution result
 */
export interface ActionResult {
  actionId: string
  status: 'success' | 'failed' | 'skipped' | 'pending' | 'rolled_back'
  startedAt: Date
  completedAt?: Date
  duration: number
  output?: Record<string, unknown>
  error?: string
  rollbackStatus?: 'available' | 'executed' | 'failed' | 'not_available'
  affectedEntities: string[]
}

/**
 * Execution metrics
 */
export interface ExecutionMetrics {
  totalActions: number
  completedActions: number
  failedActions: number
  skippedActions: number
  totalDuration: number
  successRate: number
}

/**
 * Execution error
 */
export interface ExecutionError {
  timestamp: Date
  actionId: string
  errorCode: string
  message: string
  stackTrace?: string
  recoverable: boolean
  context: Record<string, unknown>
}

/**
 * Playbook execution record
 */
export interface PlaybookExecution {
  id: string
  playbookId: string
  incidentId: string
  status: PlaybookExecutionStatus
  startedAt: Date
  completedAt?: Date
  executedBy: string
  actionResults: Map<string, ActionResult>
  approvalStatus: ApprovalStatus
  approvedBy?: string
  approvedAt?: Date
  rollbackAvailable: boolean
  rollbackExecuted: boolean
  metrics: ExecutionMetrics
  errors: ExecutionError[]
}

/**
 * Affected asset in an incident
 */
export interface AffectedAsset {
  id: string
  type: 'host' | 'user' | 'service' | 'database' | 'network' | 'application' | 'cloud_resource'
  identifier: string
  name: string
  criticality: 'critical' | 'high' | 'medium' | 'low'
  containmentStatus: 'none' | 'partial' | 'full' | 'released'
  metadata: Record<string, unknown>
}

/**
 * Threat indicator
 */
export interface ThreatIndicator {
  id: string
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email' | 'file_path' | 'registry_key' | 'user_agent' | 'certificate'
  value: string
  severity: ThreatSeverity
  confidence: number
  firstSeen: Date
  lastSeen: Date
  source: string
  tags: string[]
  enrichment?: Record<string, unknown>
}

/**
 * Incident timeline entry
 */
export interface IncidentTimelineEntry {
  timestamp: Date
  actor: string
  action: string
  details: Record<string, unknown>
  automated: boolean
  evidence?: string[]
}

/**
 * Chain of custody entry
 */
export interface CustodyEntry {
  timestamp: Date
  actor: string
  action: 'collected' | 'accessed' | 'analyzed' | 'exported' | 'transferred'
  purpose: string
  result: 'success' | 'denied'
}

/**
 * Evidence item
 */
export interface EvidenceItem {
  id: string
  type: 'log' | 'pcap' | 'memory_dump' | 'disk_image' | 'screenshot' | 'artifact' | 'document'
  description: string
  collectedAt: Date
  collectedBy: string
  hash: string
  hashAlgorithm: string
  storageLocation: string
  chainOfCustody: CustodyEntry[]
  tags: string[]
}

/**
 * Containment action
 */
export interface ContainmentAction {
  id: string
  type: ContainmentType
  target: string
  targetType: 'host' | 'user' | 'ip' | 'domain' | 'service' | 'network_segment'
  status: 'pending' | 'active' | 'released' | 'failed'
  initiatedAt: Date
  initiatedBy: string
  releasedAt?: Date
  releasedBy?: string
  duration?: number
  automated: boolean
  rollbackable: boolean
  metadata: Record<string, unknown>
}

/**
 * Remediation action
 */
export interface RemediationAction {
  id: string
  type: RemediationType
  target: string
  status: 'pending' | 'awaiting_approval' | 'in_progress' | 'completed' | 'failed' | 'rolled_back'
  approvalStatus: ApprovalStatus
  approvers: string[]
  approvedBy?: string
  approvedAt?: Date
  initiatedAt: Date
  initiatedBy: string
  completedAt?: Date
  rollbackAvailable: boolean
  rollbackExecuted: boolean
  output?: Record<string, unknown>
  error?: string
}

/**
 * Incident metrics
 */
export interface IncidentMetrics {
  mttd: number // Mean Time to Detect (ms)
  mttr: number // Mean Time to Respond (ms)
  mttc: number // Mean Time to Contain (ms)
  mtte: number // Mean Time to Eradicate (ms)
  mttre: number // Mean Time to Recover (ms)
  containmentEffectiveness: number // 0-100
  remediationEffectiveness: number // 0-100
  impactScore: number // 0-100
}

/**
 * Security incident
 */
export interface SecurityIncident {
  id: string
  title: string
  description: string
  severity: ThreatSeverity
  state: IncidentState
  threatType: string
  detectedAt: Date
  reportedBy: string
  assignedTo?: string
  affectedAssets: AffectedAsset[]
  indicators: ThreatIndicator[]
  timeline: IncidentTimelineEntry[]
  containmentActions: ContainmentAction[]
  remediationActions: RemediationAction[]
  playbookExecutions: string[]
  evidence: EvidenceItem[]
  metrics: IncidentMetrics
  tags: string[]
  externalTicketId?: string
  relatedIncidents: string[]
}

/**
 * Integration configuration
 */
export interface IntegrationConfig {
  system: IntegrationSystem
  name: string
  baseUrl: string
  apiKey?: string
  username?: string
  password?: string
  clientId?: string
  clientSecret?: string
  customHeaders?: Record<string, string>
  timeout: number
  retryCount: number
  rateLimitPerSecond: number
  enabled: boolean
  healthCheckEndpoint?: string
  lastHealthCheck?: Date
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
}

/**
 * Integration health status
 */
export interface IntegrationHealth {
  system: IntegrationSystem
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  latency: number
  lastCheck: Date
  errorCount: number
  successRate: number
  details?: Record<string, unknown>
}

/**
 * Action audit log entry
 */
export interface ActionAuditLog {
  id: string
  timestamp: Date
  actor: string
  actionType: string
  target: string
  targetType: string
  incidentId?: string
  playbookId?: string
  executionId?: string
  status: 'initiated' | 'completed' | 'failed' | 'rolled_back'
  details: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  result?: Record<string, unknown>
  error?: string
  duration: number
}

/**
 * Rollback request
 */
export interface RollbackRequest {
  executionId: string
  actionIds?: string[]
  reason: string
  requestedBy: string
  approvalRequired: boolean
}

/**
 * Incident report
 */
export interface IncidentReport {
  incidentId: string
  generatedAt: Date
  generatedBy: string
  summary: string
  timeline: IncidentTimelineEntry[]
  affectedAssets: AffectedAsset[]
  containmentSummary: {
    totalActions: number
    successfulActions: number
    failedActions: number
    currentContainments: number
  }
  remediationSummary: {
    totalActions: number
    completedActions: number
    pendingActions: number
    failedActions: number
  }
  indicators: ThreatIndicator[]
  metrics: IncidentMetrics
  lessonsLearned: string[]
  recommendations: string[]
  compliance: {
    frameworks: string[]
    notificationRequired: boolean
    notificationSent: boolean
    dueDate?: Date
  }
}

/**
 * Hub configuration
 */
export interface HubConfig {
  autoContainCritical: boolean
  autoContainHigh: boolean
  requireApprovalForContainment: boolean
  containmentApprovers: string[]
  remediationApprovers: string[]
  maxConcurrentPlaybooks: number
  defaultPlaybookTimeout: number
  auditRetentionDays: number
  healthCheckIntervalMs: number
  escalationTimeoutMs: number
  enabledIntegrations: IntegrationSystem[]
}

/**
 * Containment request for containThreat method
 */
export interface ContainmentRequest {
  type: ContainmentType
  target: string
  targetType: 'host' | 'user' | 'ip' | 'domain' | 'service' | 'network_segment'
  automated?: boolean
}

/**
 * Remediation request for remediateIncident method
 */
export interface RemediationRequest {
  type: RemediationType
  target: string
  requiresApproval?: boolean
}

/**
 * Rollback result
 */
export interface RollbackResult {
  success: boolean
  rolledBackActions: string[]
  failedActions: string[]
  errors: string[]
}
