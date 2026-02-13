/**
 * Incident Response System Types
 * Shared types and interfaces for incident response modules
 */

// ============================================================================
// Enums
// ============================================================================

export enum IncidentCategory {
  BRUTE_FORCE = 'brute_force',
  DATA_BREACH = 'data_breach',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  MALWARE = 'malware',
  DDOS = 'ddos',
  INSIDER_THREAT = 'insider_threat',
  CONFIGURATION_ERROR = 'configuration_error',
  COMPLIANCE_VIOLATION = 'compliance_violation'
}

export enum IncidentStatus {
  DETECTED = 'detected',
  ANALYZING = 'analyzing',
  CONTAINED = 'contained',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export enum ResponseActionType {
  BLOCK_IP = 'block_ip',
  LOCK_ACCOUNT = 'lock_account',
  TERMINATE_SESSION = 'terminate_session',
  REVOKE_TOKEN = 'revoke_token',
  DISABLE_API_KEY = 'disable_api_key',
  QUARANTINE_RESOURCE = 'quarantine_resource',
  ALERT_SECURITY_TEAM = 'alert_security_team',
  CAPTURE_FORENSICS = 'capture_forensics',
  ISOLATE_SYSTEM = 'isolate_system',
  TRIGGER_BACKUP = 'trigger_backup'
}

// ============================================================================
// Core Interfaces
// ============================================================================

export interface Incident {
  id: string
  timestamp: Date
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: IncidentCategory
  status: IncidentStatus
  affectedResources: string[]
  affectedUsers: string[]
  detectionMethod: string
  indicators: SecurityIndicator[]
  timeline: IncidentEvent[]
  responseActions: ResponseAction[]
  assignedTo?: string
  resolvedAt?: Date
  resolvedBy?: string
  postMortem?: PostMortem
  relatedIncidents?: string[]
}

export interface SecurityIndicator {
  type: string
  value: any
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface IncidentEvent {
  timestamp: Date
  type: string
  description: string
  actor?: string
  details?: Record<string, any>
}

export interface ResponseAction {
  id: string
  type: ResponseActionType
  description: string
  automated: boolean
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  executedAt?: Date
  result?: string
  rollbackExecuted?: boolean
}

// ============================================================================
// Detection & Playbook Interfaces
// ============================================================================

export interface DetectionRule {
  id: string
  name: string
  description: string
  category: IncidentCategory
  severity: 'low' | 'medium' | 'high' | 'critical'
  conditions: Condition[]
  automaticResponse: boolean
  responseActions: ResponseActionType[]
  notificationChannels: string[]
  enabled: boolean
}

export interface Condition {
  field: string
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'matches'
  value: any
  timeWindow?: number // in milliseconds
}

export interface ResponsePlaybook {
  id: string
  name: string
  category: IncidentCategory
  steps: PlaybookStep[]
  estimatedDuration: number
  requiredApprovals: string[]
}

export interface PlaybookStep {
  order: number
  action: string
  description: string
  automated: boolean
  timeout?: number
  rollbackPossible: boolean
}

// ============================================================================
// Event & Forensic Interfaces
// ============================================================================

export interface SecurityEvent {
  timestamp: Date
  type: string
  source: string
  userId?: string
  ipAddress?: string
  resource?: string
  details: Record<string, any>
}

export interface ForensicData {
  incidentId: string
  timestamp: Date
  logs: AuditLogEntry[]
  securityEvents: SecurityEvent[]
  userActivity: UserActivity[]
  systemState: SystemSnapshot
  networkTraffic: NetworkCapture[]
  fileHashes: Record<string, string>
}

export interface AuditLogEntry {
  timestamp: Date
  actor: string
  action: string
  resource: string
  result: string
}

export interface UserActivity {
  userId: string
  activityType: string
  timestamp: Date
  details: Record<string, any>
}

export interface SystemSnapshot {
  timestamp: Date
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkConnections: number
  runningProcesses: string[]
}

export interface NetworkCapture {
  timestamp: Date
  sourceIP: string
  destinationIP: string
  port: number
  protocol: string
  dataSize: number
}

// ============================================================================
// Post-Mortem & Statistics Interfaces
// ============================================================================

export interface PostMortem {
  incidentId: string
  generatedAt: Date
  summary: string
  rootCause: string
  impactAnalysis: {
    affectedUsers: number
    affectedResources: string[]
    duration: number
    dataCompromised: boolean
  }
  timeline: IncidentEvent[]
  responseEffectiveness: number
  lessonsLearned: string[]
  recommendations: string[]
  preventiveMeasures: string[]
}

export interface IncidentFilter {
  status?: IncidentStatus
  category?: IncidentCategory
  severity?: string
  assignedTo?: string
  startDate?: Date
  endDate?: Date
}

export interface IncidentStatistics {
  totalIncidents: number
  byCategory: Record<string, number>
  bySeverity: Record<string, number>
  byStatus: Record<string, number>
  avgResolutionTime: number
  automatedResponseRate: number
}

export interface Evidence {
  type: string
  timestamp: Date
  data: any
  verified: boolean
}

export interface DateRange {
  startDate: Date
  endDate: Date
}
