/**
 * Type definitions for ComplianceAutomationEngine
 */

// ============================================================================
// Enums
// ============================================================================

export enum ComplianceFrameworkType {
  SOC2 = 'SOC2',
  ISO27001 = 'ISO27001',
  HIPAA = 'HIPAA',
  GDPR = 'GDPR',
  PCI_DSS = 'PCI_DSS',
  NIST = 'NIST',
  FEDRAMP = 'FEDRAMP',
  CCPA = 'CCPA',
  SOX = 'SOX',
  GLBA = 'GLBA',
}

export enum ControlStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  NOT_ASSESSED = 'not_assessed',
  IN_PROGRESS = 'in_progress',
  NOT_APPLICABLE = 'not_applicable',
  EXCEPTION_GRANTED = 'exception_granted',
}

export enum AssessmentType {
  AUTOMATED = 'automated',
  MANUAL = 'manual',
  HYBRID = 'hybrid',
  CONTINUOUS = 'continuous',
}

export enum EvidenceType {
  DOCUMENT = 'document',
  SCREENSHOT = 'screenshot',
  LOG = 'log',
  CONFIGURATION = 'configuration',
  REPORT = 'report',
  ATTESTATION = 'attestation',
  API_RESPONSE = 'api_response',
  SCAN_RESULT = 'scan_result',
}

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum RemediationType {
  AUTOMATIC = 'automatic',
  SEMI_AUTOMATIC = 'semi_automatic',
  MANUAL = 'manual',
  EXCEPTION = 'exception',
}

export enum GRCPlatform {
  SERVICENOW_GRC = 'servicenow_grc',
  RSA_ARCHER = 'rsa_archer',
  METRICSTREAM = 'metricstream',
  QUALYS = 'qualys',
  RAPID7 = 'rapid7',
}

// ============================================================================
// Interfaces
// ============================================================================

export interface AutomationControl {
  id: string;
  framework: ComplianceFrameworkType;
  name: string;
  description: string;
  category: string;
  requirements: string[];
  assessmentType: AssessmentType;
  automationScript?: string;
  evidenceRequirements: string[];
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  weight: number;
  status: ControlStatus;
  lastAssessedAt?: Date;
  nextAssessmentDue?: Date;
  assignedTo?: string;
  relatedControls: ControlMapping[];
  remediationSteps: RemediationStep[];
  metadata?: Record<string, unknown>;
}

export interface ControlMapping {
  sourceFramework: ComplianceFrameworkType;
  sourceControlId: string;
  targetFramework: ComplianceFrameworkType;
  targetControlId: string;
  mappingStrength: 'exact' | 'strong' | 'partial' | 'weak';
  notes?: string;
}

export interface Evidence {
  id: string;
  controlId: string;
  type: EvidenceType;
  title: string;
  description: string;
  content: string | Record<string, unknown>;
  collectedAt: Date;
  collectedBy: string;
  collectionMethod: 'automated' | 'manual';
  validUntil?: Date;
  checksum: string;
  storageLocation: string;
  metadata?: Record<string, unknown>;
}

export interface AssessmentResult {
  id: string;
  controlId: string;
  framework: ComplianceFrameworkType;
  status: ControlStatus;
  assessmentType: AssessmentType;
  assessedBy: string;
  assessedAt: Date;
  findings: Finding[];
  evidenceIds: string[];
  score: number;
  notes?: string;
  nextReviewDate: Date;
  remediationRequired: boolean;
  remediationPlan?: RemediationPlan;
}

export interface Finding {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  affectedResources: string[];
  recommendation: string;
  cweId?: string;
  cveId?: string;
  references: string[];
}

export interface RemediationStep {
  id: string;
  order: number;
  title: string;
  description: string;
  type: RemediationType;
  automationScript?: string;
  estimatedEffort: string;
  assignedTo?: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  completedAt?: Date;
  completedBy?: string;
}

export interface RemediationPlan {
  id: string;
  gapId: string;
  controlId: string;
  framework: ComplianceFrameworkType;
  title: string;
  description: string;
  steps: RemediationStep[];
  priority: number;
  estimatedEffort: string;
  estimatedCost?: number;
  assignedTo?: string;
  dueDate: Date;
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'on_hold';
  createdAt: Date;
  createdBy: string;
  approvedAt?: Date;
  approvedBy?: string;
  completedAt?: Date;
}

export interface ComplianceGap {
  id: string;
  framework: ComplianceFrameworkType;
  controlId: string;
  controlName: string;
  gapDescription: string;
  severity: AlertSeverity;
  riskScore: number;
  impact: string;
  currentState: string;
  requiredState: string;
  remediationPlan?: RemediationPlan;
  identifiedAt: Date;
  identifiedBy: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk' | 'deferred';
  resolvedAt?: Date;
  resolvedBy?: string;
  dueDate?: Date;
}

export interface ComplianceScore {
  framework: ComplianceFrameworkType;
  overallScore: number;
  weightedScore: number;
  controlScores: Map<string, number>;
  categoryScores: Map<string, number>;
  trend: 'improving' | 'stable' | 'declining';
  historicalScores: Array<{ date: Date; score: number }>;
  lastAssessed: Date;
  nextAssessmentDue: Date;
  criticalGaps: number;
  highGaps: number;
  mediumGaps: number;
  lowGaps: number;
}

export interface ComplianceAlert {
  id: string;
  framework: ComplianceFrameworkType;
  controlId?: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  source: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'suppressed';
  relatedAlerts: string[];
  metadata?: Record<string, unknown>;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  frameworks: ComplianceFrameworkType[];
  rules: PolicyRule[];
  enforcementLevel: 'strict' | 'moderate' | 'advisory';
  autoRemediation: boolean;
  enabled: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
}

export interface PolicyRule {
  id: string;
  condition: string;
  action: 'alert' | 'block' | 'remediate' | 'log';
  severity: AlertSeverity;
  remediationScript?: string;
  message: string;
}

export interface PolicyViolation {
  id: string;
  policyId: string;
  ruleId: string;
  framework: ComplianceFrameworkType;
  severity: AlertSeverity;
  description: string;
  affectedResource: string;
  detectedAt: Date;
  remediatedAt?: Date;
  remediationStatus: 'pending' | 'in_progress' | 'completed' | 'failed' | 'exception';
  autoRemediated: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  eventType: string;
  framework?: ComplianceFrameworkType;
  controlId?: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  result: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  immutableHash: string;
  previousHash?: string;
}

export interface GRCIntegrationConfig {
  platform: GRCPlatform;
  enabled: boolean;
  apiEndpoint: string;
  apiKey?: string;
  username?: string;
  clientId?: string;
  clientSecret?: string;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  syncDirection: 'bidirectional' | 'push' | 'pull';
  mappings: GRCFieldMapping[];
  lastSyncAt?: Date;
  lastSyncStatus?: 'success' | 'failure' | 'partial';
}

export interface GRCFieldMapping {
  localField: string;
  remoteField: string;
  transformation?: string;
}

export interface MonitoringConfig {
  enabled: boolean;
  checkIntervalMs: number;
  alertThresholds: Map<AlertSeverity, number>;
  notificationChannels: NotificationChannel[];
  retentionDays: number;
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty';
  config: Record<string, string>;
  severities: AlertSeverity[];
  enabled: boolean;
}

export interface UnifiedControl {
  id: string;
  name: string;
  description: string;
  category: string;
  frameworkMappings: Map<ComplianceFrameworkType, string[]>;
  commonRequirements: string[];
  assessmentCriteria: string[];
}

export interface AuditTrailExport {
  exportedAt: Date;
  exportedBy: string;
  framework?: ComplianceFrameworkType;
  dateRange: { start: Date; end: Date };
  totalEntries: number;
  entries: AuditLogEntry[];
  integrityVerification: {
    valid: boolean;
    errors: string[];
    checksum: string;
  };
  format: 'json' | 'csv' | 'pdf';
}

// ============================================================================
// Type aliases for frequency
// ============================================================================

export type ControlFrequency = 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
