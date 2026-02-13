/**
 * ResponseOrchestrator Types
 *
 * Type definitions for the incident response orchestration system.
 *
 * @module integrations/response/orchestrator/types
 */

/**
 * Logger interface for compatibility
 */
export interface Logger {
  debug: (msg: string, ...args: unknown[]) => void;
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}

/**
 * Incident severity levels
 */
export enum IncidentSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Incident lifecycle states
 */
export enum IncidentStatus {
  NEW = 'new',
  INVESTIGATING = 'investigating',
  CONTAINING = 'containing',
  ERADICATING = 'eradicating',
  RECOVERING = 'recovering',
  CLOSED = 'closed'
}

/**
 * Response action types
 */
export enum ActionType {
  ISOLATE_SYSTEM = 'isolate_system',
  DISABLE_ACCOUNT = 'disable_account',
  KILL_PROCESS = 'kill_process',
  BLOCK_IP = 'block_ip',
  REVOKE_CREDENTIALS = 'revoke_credentials',
  NOTIFY_USERS = 'notify_users',
  ENGAGE_FORENSICS = 'engage_forensics',
  ESCALATE = 'escalate',
  SNAPSHOT = 'snapshot',
  COLLECT_LOGS = 'collect_logs'
}

/**
 * Communication channel types
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  TEAMS = 'teams',
  PAGERDUTY = 'pagerduty',
  SMS = 'sms'
}

/**
 * Playbook execution status
 */
export enum PlaybookStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  PARTIAL = 'partial',
  CANCELLED = 'cancelled'
}

/**
 * Evidence types for forensic analysis
 */
export enum EvidenceType {
  LOG_FILE = 'log_file',
  MEMORY_DUMP = 'memory_dump',
  DISK_IMAGE = 'disk_image',
  NETWORK_CAPTURE = 'network_capture',
  SYSTEM_SNAPSHOT = 'system_snapshot',
  REGISTRY_DUMP = 'registry_dump',
  APPLICATION_STATE = 'application_state'
}

/**
 * Timeline entry for incident tracking
 */
export interface TimelineEntry {
  timestamp: Date
  actor: string
  action: string
  details: Record<string, unknown>
  evidence?: string[]
}

/**
 * Incident metrics for MTTD/MTTR calculations
 */
export interface IncidentMetrics {
  mttd: number // Mean Time to Detect in milliseconds
  mttr: number // Mean Time to Respond in milliseconds
  mttc: number // Mean Time to Contain in milliseconds
  responseStartTime?: Date
  containmentTime?: Date
  resolutionTime?: Date
  impactScore: number // 0-100
  effectivenessScore: number // 0-100
}

/**
 * Incident definition with full metadata
 */
export interface Incident {
  id: string
  title: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  type: string
  detectionTime: Date
  reportedBy: string
  affectedSystems: string[]
  affectedUsers: string[]
  timeline: TimelineEntry[]
  metrics: IncidentMetrics
  assignedTeam?: string
  tags: string[]
  metadata: Record<string, unknown>
}

/**
 * Retry strategy for failed actions
 */
export interface RetryPolicy {
  maxAttempts: number
  initialDelayMs: number
  backoffMultiplier: number
  maxDelayMs: number
}

/**
 * Action configuration with parameters
 */
export interface ActionConfig {
  target?: string
  parameters?: Record<string, unknown>
  conditions?: string[] // Expression-based conditions
  notifications?: {
    channels: NotificationChannel[]
    template: string
  }
}

/**
 * Individual action within a playbook
 */
export interface PlaybookAction {
  id: string
  name: string
  type: ActionType
  sequence: number
  dependencies: string[] // IDs of actions that must complete first
  config: ActionConfig
  timeout: number // milliseconds
  retryPolicy?: RetryPolicy
  rollbackAction?: string
}

/**
 * Playbook definition with execution configuration
 */
export interface Playbook {
  id: string
  name: string
  description: string
  incidentType: string
  severityLevel: IncidentSeverity
  actions: PlaybookAction[]
  workflowId?: string
  prerequisites: string[]
  expectedDuration: number // milliseconds
  tags: string[]
  version: number
  lastModified: Date
}

/**
 * Result of executing a single action
 */
export interface ActionResult {
  actionId: string
  status: 'success' | 'failed' | 'skipped'
  startTime: Date
  endTime: Date
  duration: number
  output?: Record<string, unknown>
  error?: string
  rollbackStatus?: 'pending' | 'executed' | 'failed'
}

/**
 * Execution error with full context
 */
export interface ExecutionError {
  timestamp: Date
  actionId: string
  message: string
  code: string
  context: Record<string, unknown>
}

/**
 * Playbook execution record
 */
export interface PlaybookExecution {
  id: string
  playbookId: string
  incidentId: string
  status: PlaybookStatus
  startTime: Date
  endTime?: Date
  duration?: number
  actionResults: Map<string, ActionResult>
  successRate: number // 0-100
  errors: ExecutionError[]
  workflowExecutionId?: string
  executedBy: string
}

/**
 * Evidence access tracking for chain of custody
 */
export interface AccessLogEntry {
  timestamp: Date
  actor: string
  action: 'view' | 'export' | 'analyze' | 'share'
  purpose: string
  result: 'success' | 'denied'
}

/**
 * Evidence record for forensic analysis
 */
export interface Evidence {
  id: string
  incidentId: string
  type: EvidenceType
  description: string
  source: string
  collectedAt: Date
  collectedBy: string
  hash: string
  hashAlgorithm: string
  storageLocation: string
  accessLog: AccessLogEntry[]
  tags: string[]
}

/**
 * Escalation chain configuration
 */
export interface EscalationChain {
  level: number
  delayMinutes: number
  recipients: string[]
  channels: NotificationChannel[]
  template: string
}

/**
 * Notification template for communications
 */
export interface NotificationTemplate {
  id: string
  name: string
  channel: NotificationChannel
  subject?: string
  body: string
  variables: string[]
  priority: 'low' | 'normal' | 'high' | 'critical'
}

/**
 * Resource lock for action deconfliction
 */
export interface ResourceLock {
  resourceId: string
  lockedBy: string
  lockedAt: Date
  expiresAt: Date
  reason: string
}

/**
 * Post-incident analysis report
 */
export interface PostMortemReport {
  incidentId: string
  generatedAt: Date
  timeline: TimelineEntry[]
  rootCauses: string[]
  lessonsLearned: string[]
  playbookImprovements: string[]
  trainingRecommendations: string[]
  preventiveMeasures: string[]
  metrics: IncidentMetrics
  reviewedBy: string[]
}

/**
 * Compliance reporting configuration
 */
export interface ComplianceReport {
  incidentId: string
  frameworks: ('GDPR' | 'HIPAA' | 'SOC2')[]
  notificationRequired: boolean
  notificationDueDate?: Date
  notified: boolean
  regulatoryBody?: string
  reportContent: Record<string, unknown>
  generatedAt: Date
}

/**
 * Dashboard metrics summary
 */
export interface DashboardMetrics {
  totalIncidents: number
  activeIncidents: number
  criticalIncidents: number
  averageMTTD: number
  averageMTTR: number
  averageMTTC: number
  responseEffectiveness: number
  teamWorkload: Map<string, number>
  playbookSuccessRates: Map<string, number>
  recentIncidents: Incident[]
  topThreats: string[]
}

/**
 * Incident creation parameters
 */
export interface CreateIncidentParams {
  title: string
  description: string
  severity: IncidentSeverity
  type: string
  reportedBy: string
  affectedSystems?: string[]
  affectedUsers?: string[]
  tags?: string[]
  metadata?: Record<string, unknown>
}

/**
 * Workflow result from execution
 */
export interface WorkflowResult {
  status: 'success' | 'failed' | 'partial'
  duration: number
  output: Record<string, unknown>
  errors?: string[]
}

/**
 * Evidence collection parameters
 */
export interface CollectEvidenceParams {
  type: EvidenceType
  description: string
  source: string
  hash: string
  hashAlgorithm?: string
  storageLocation: string
}
