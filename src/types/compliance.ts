/**
 * Compliance Framework Type Definitions
 * Supporting SOC2, ISO 27001, HIPAA, and GDPR
 */

// ============================================================================
// Core Compliance Types
// ============================================================================

export enum ComplianceFramework {
  SOC2 = 'SOC2',
  ISO27001 = 'ISO27001',
  HIPAA = 'HIPAA',
  GDPR = 'GDPR',
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  IN_PROGRESS = 'in_progress',
  NOT_APPLICABLE = 'not_applicable',
  NEEDS_REVIEW = 'needs_review',
}

export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  PHI = 'phi', // Protected Health Information
  PII = 'pii', // Personally Identifiable Information
}

export enum DataResidency {
  EU = 'eu',
  US = 'us',
  APAC = 'apac',
  UK = 'uk',
  CANADA = 'canada',
  AUSTRALIA = 'australia',
  GLOBAL = 'global',
}

export enum ControlCategory {
  ACCESS_CONTROL = 'access_control',
  ENCRYPTION = 'encryption',
  AUDIT_LOGGING = 'audit_logging',
  INCIDENT_RESPONSE = 'incident_response',
  BUSINESS_CONTINUITY = 'business_continuity',
  CHANGE_MANAGEMENT = 'change_management',
  RISK_ASSESSMENT = 'risk_assessment',
  VENDOR_MANAGEMENT = 'vendor_management',
  DATA_PROTECTION = 'data_protection',
  PRIVACY = 'privacy',
  PHYSICAL_SECURITY = 'physical_security',
  NETWORK_SECURITY = 'network_security',
  APPLICATION_SECURITY = 'application_security',
  TRAINING = 'training',
}

// ============================================================================
// Control Definitions
// ============================================================================

export interface ComplianceControl {
  id: string;
  framework: ComplianceFramework;
  name: string;
  description: string;
  category: ControlCategory;
  requirements: string[];
  testProcedures: string[];
  evidence: string[];
  automationLevel: 'manual' | 'semi-automated' | 'automated';
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  status: ComplianceStatus;
  lastAssessed?: Date;
  nextAssessment?: Date;
  assignedTo?: string;
  metadata?: Record<string, unknown>;
}

export interface ControlMapping {
  sourceFramework: ComplianceFramework;
  targetFramework: ComplianceFramework;
  sourceControlId: string;
  targetControlIds: string[];
  mappingRationale: string;
}

export interface ControlAssessment {
  id: string;
  controlId: string;
  assessedBy: string;
  assessedAt: Date;
  status: ComplianceStatus;
  findings: string[];
  remediation?: string;
  evidenceLinks: string[];
  nextReviewDate: Date;
  notes?: string;
}

// ============================================================================
// Evidence & Attestation
// ============================================================================

export interface Evidence {
  id: string;
  controlId: string;
  type: 'document' | 'screenshot' | 'log' | 'report' | 'attestation' | 'automated';
  title: string;
  description: string;
  location: string; // File path, URL, or storage reference
  collectedAt: Date;
  collectedBy: string;
  validUntil?: Date;
  classification: DataClassification;
  metadata?: Record<string, unknown>;
}

export interface Attestation {
  id: string;
  controlId: string;
  attestedBy: string;
  attestedAt: Date;
  statement: string;
  validUntil: Date;
  signature?: string; // Digital signature
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

// ============================================================================
// Data Residency & Retention
// ============================================================================

export interface DataResidencyPolicy {
  id: string;
  region: DataResidency;
  dataTypes: string[];
  restrictions: string[];
  allowedOperations: string[];
  enforced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetentionPolicy {
  id: string;
  resourceType: 'executions' | 'workflows' | 'credentials' | 'audit_logs' | 'user_data' | 'custom';
  retentionPeriodDays: number;
  archiveAfterDays?: number;
  autoDelete: boolean;
  legalHoldExempt: boolean;
  classification: DataClassification[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetentionRecord {
  id: string;
  resourceType: string;
  resourceId: string;
  policyId: string;
  createdAt: Date;
  expiresAt: Date;
  archivedAt?: Date;
  deletedAt?: Date;
  onLegalHold: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Privacy & Consent
// ============================================================================

export enum ConsentPurpose {
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  PERSONALIZATION = 'personalization',
  THIRD_PARTY_SHARING = 'third_party_sharing',
  DATA_PROCESSING = 'data_processing',
  COMMUNICATION = 'communication',
}

export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: ConsentPurpose;
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  version: string; // Consent policy version
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export enum DataSubjectRight {
  ACCESS = 'access', // Right to access
  RECTIFICATION = 'rectification', // Right to rectify
  ERASURE = 'erasure', // Right to be forgotten
  PORTABILITY = 'portability', // Right to data portability
  RESTRICTION = 'restriction', // Right to restrict processing
  OBJECTION = 'objection', // Right to object
}

export interface DataSubjectRequest {
  id: string;
  userId: string;
  requestType: DataSubjectRight;
  requestedAt: Date;
  requestedBy: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  completedAt?: Date;
  completedBy?: string;
  rejectionReason?: string;
  dataExportUrl?: string; // For portability requests
  verificationMethod: string;
  verified: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// PII Detection
// ============================================================================

export enum PIIType {
  EMAIL = 'email',
  PHONE = 'phone',
  SSN = 'ssn',
  CREDIT_CARD = 'credit_card',
  IP_ADDRESS = 'ip_address',
  NAME = 'name',
  ADDRESS = 'address',
  DATE_OF_BIRTH = 'date_of_birth',
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  MEDICAL_RECORD = 'medical_record',
  FINANCIAL_ACCOUNT = 'financial_account',
}

export interface PIIDetectionResult {
  detected: boolean;
  types: PIIType[];
  locations: Array<{
    type: PIIType;
    field: string;
    value: string; // Masked value
    confidence: number; // 0-1
  }>;
  classification: DataClassification;
  recommendations: string[];
}

// ============================================================================
// Audit Trail
// ============================================================================

export interface ComplianceAuditEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  framework?: ComplianceFramework;
  userId: string;
  username?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  complianceImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  relatedControls: string[];
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  immutableHash?: string; // Cryptographic hash for integrity
  previousHash?: string; // Chain to previous event
}

// ============================================================================
// Gap Analysis
// ============================================================================

export interface ComplianceGap {
  id: string;
  framework: ComplianceFramework;
  controlId: string;
  gapDescription: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  currentState: string;
  requiredState: string;
  remediationSteps: string[];
  estimatedEffort: string;
  priority: number;
  assignedTo?: string;
  dueDate?: Date;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface GapAnalysisReport {
  id: string;
  framework: ComplianceFramework;
  generatedAt: Date;
  generatedBy: string;
  totalControls: number;
  compliantControls: number;
  nonCompliantControls: number;
  gaps: ComplianceGap[];
  overallScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  nextReviewDate: Date;
}

// ============================================================================
// Reporting
// ============================================================================

export interface ComplianceReport {
  id: string;
  framework: ComplianceFramework;
  reportType: 'assessment' | 'gap_analysis' | 'audit' | 'certification' | 'executive_summary';
  generatedAt: Date;
  generatedBy: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalControls: number;
    compliantControls: number;
    complianceScore: number; // 0-100
    criticalFindings: number;
    openGaps: number;
  };
  controlAssessments: ControlAssessment[];
  gaps: ComplianceGap[];
  recommendations: string[];
  evidenceCount: number;
  attestationCount: number;
  format: 'json' | 'pdf' | 'excel' | 'html';
  downloadUrl?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Compliance Manager Configuration
// ============================================================================

export interface ComplianceConfig {
  enabledFrameworks: ComplianceFramework[];
  dataResidency: DataResidency;
  defaultRetentionDays: number;
  enableAutomatedEvidence: boolean;
  enableContinuousMonitoring: boolean;
  auditLogRetentionDays: number;
  requireAttestations: boolean;
  enablePIIDetection: boolean;
  notifyOnNonCompliance: boolean;
  autoRemediationEnabled: boolean;
}

export interface ComplianceMetrics {
  framework: ComplianceFramework;
  totalControls: number;
  compliantControls: number;
  nonCompliantControls: number;
  inProgressControls: number;
  complianceScore: number; // 0-100
  lastAssessmentDate?: Date;
  nextAssessmentDue?: Date;
  openGaps: number;
  criticalGaps: number;
  evidenceCount: number;
  attestationCount: number;
  auditEventsToday: number;
  dataBreaches: number;
}

// ============================================================================
// Data Breach Management
// ============================================================================

export enum BreachSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface DataBreach {
  id: string;
  detectedAt: Date;
  detectedBy: string;
  severity: BreachSeverity;
  affectedRecords: number;
  affectedDataTypes: PIIType[];
  affectedUsers: string[];
  description: string;
  rootCause?: string;
  containedAt?: Date;
  notificationRequired: boolean;
  notifiedAuthorities: boolean;
  notifiedAt?: Date;
  regulatoryDeadline?: Date;
  status: 'detected' | 'investigating' | 'contained' | 'remediated' | 'closed';
  remediationSteps: string[];
  lessonsLearned?: string;
  relatedControls: string[];
  impactedFrameworks: ComplianceFramework[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Compliance Dashboard Data
// ============================================================================

export interface ComplianceDashboardData {
  overallComplianceScore: number;
  frameworkMetrics: ComplianceMetrics[];
  recentAuditEvents: ComplianceAuditEvent[];
  openGaps: ComplianceGap[];
  upcomingAssessments: Array<{
    controlId: string;
    controlName: string;
    dueDate: Date;
  }>;
  dataResidencyStatus: {
    region: DataResidency;
    compliant: boolean;
    violations: string[];
  };
  retentionPolicyStatus: {
    totalPolicies: number;
    activeRecords: number;
    expiringSoon: number;
    overdue: number;
  };
  privacyMetrics: {
    totalConsentRecords: number;
    activeConsents: number;
    pendingDSRs: number; // Data Subject Requests
    PIIDetections: number;
  };
  recentBreaches: DataBreach[];
  alerts: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
    framework?: ComplianceFramework;
  }>;
}

// ============================================================================
// Export Types
// ============================================================================

export interface ComplianceExport {
  framework: ComplianceFramework;
  exportedAt: Date;
  exportedBy: string;
  format: 'json' | 'csv' | 'xml' | 'pdf';
  data: {
    controls: ComplianceControl[];
    assessments: ControlAssessment[];
    evidence: Evidence[];
    attestations: Attestation[];
    gaps: ComplianceGap[];
  };
  metadata?: Record<string, unknown>;
}
