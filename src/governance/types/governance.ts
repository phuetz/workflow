/**
 * Agent Governance Framework - Type Definitions
 * Complete type system for enterprise-grade agent governance
 */

import type { ComplianceFramework } from '../../types/compliance';

// ============================================================================
// Policy Types
// ============================================================================

/**
 * Policy category classification
 */
export enum PolicyCategory {
  SECURITY = 'security',
  COMPLIANCE = 'compliance',
  PERFORMANCE = 'performance',
  COST = 'cost',
  ETHICAL_AI = 'ethical_ai',
  DATA_GOVERNANCE = 'data_governance',
  OPERATIONAL = 'operational',
}

/**
 * Policy enforcement action
 */
export enum PolicyAction {
  ALLOW = 'allow',
  WARN = 'warn',
  BLOCK = 'block',
  REQUIRE_APPROVAL = 'require_approval',
  AUTO_REMEDIATE = 'auto_remediate',
}

/**
 * Policy severity level
 */
export enum PolicySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Policy definition
 */
export interface Policy {
  id: string;
  name: string;
  description: string;
  category: PolicyCategory;
  severity: PolicySeverity;
  enabled: boolean;
  action: PolicyAction;
  conditions: PolicyCondition[];
  remediationSteps?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: string;
  tags: string[];
}

/**
 * Policy condition types
 */
export type PolicyConditionType =
  | 'data_access'
  | 'api_call'
  | 'execution_time'
  | 'cost_threshold'
  | 'pii_detection'
  | 'user_permission'
  | 'data_residency'
  | 'compliance_framework'
  | 'resource_usage'
  | 'custom';

/**
 * Policy condition
 */
export interface PolicyCondition {
  type: PolicyConditionType;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'matches' | 'in' | 'not_in';
  value: any;
  metadata?: Record<string, any>;
}

/**
 * Policy evaluation context
 */
export interface PolicyContext {
  agentId: string;
  agentType: string;
  userId: string;
  taskId?: string;
  workflowId?: string;
  executionId?: string;
  requestedActions: string[];
  dataAccess: DataAccessInfo[];
  apiCalls: APICallInfo[];
  estimatedCost?: number;
  estimatedDuration?: number;
  environment: string;
  metadata: Record<string, any>;
}

/**
 * Data access information
 */
export interface DataAccessInfo {
  dataType: string;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  dataResidency?: string;
  containsPII: boolean;
  accessType: 'read' | 'write' | 'delete';
}

/**
 * API call information
 */
export interface APICallInfo {
  service: string;
  endpoint: string;
  method: string;
  isExternal: boolean;
  requiresAuth: boolean;
}

/**
 * Policy evaluation result
 */
export interface PolicyEvaluationResult {
  policyId: string;
  policyName: string;
  passed: boolean;
  action: PolicyAction;
  severity: PolicySeverity;
  violations: string[];
  recommendations: string[];
  evaluatedAt: Date;
  evaluationDurationMs: number;
  metadata?: Record<string, any>;
}

/**
 * Policy violation
 */
export interface PolicyViolation {
  id: string;
  policyId: string;
  agentId: string;
  userId: string;
  violationType: string;
  severity: PolicySeverity;
  description: string;
  context: PolicyContext;
  detectedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'false_positive';
}

// ============================================================================
// Risk Evaluation Types
// ============================================================================

/**
 * Risk score (0-100)
 */
export interface RiskScore {
  overall: number;
  factors: RiskFactors;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  recommendations: string[];
  calculatedAt: Date;
}

/**
 * Risk factors
 */
export interface RiskFactors {
  dataAccess: number;           // 0-100
  externalAPIs: number;          // 0-100
  userPermissions: number;       // 0-100
  executionHistory: number;      // 0-100
  complexity: number;            // 0-100
  piiExposure: number;           // 0-100
  complianceRisk: number;        // 0-100
  costRisk: number;              // 0-100
  performanceRisk: number;       // 0-100
  ethicalRisk: number;           // 0-100
}

/**
 * Risk evaluation history
 */
export interface RiskEvaluationHistory {
  agentId: string;
  evaluations: RiskScore[];
  trend: 'improving' | 'stable' | 'degrading';
  avgScore7d: number;
  avgScore30d: number;
  avgScore90d: number;
}

// ============================================================================
// Compliance Audit Types
// ============================================================================

/**
 * Compliance audit result
 */
export interface ComplianceAuditResult {
  id: string;
  framework: ComplianceFramework;
  agentId: string;
  auditedAt: Date;
  auditedBy: string;
  score: number;
  status: 'compliant' | 'non_compliant' | 'partial';
  findings: ComplianceFindings[];
  recommendations: string[];
  nextAuditDate: Date;
}

/**
 * Compliance findings
 */
export interface ComplianceFindings {
  controlId: string;
  controlName: string;
  status: 'pass' | 'fail' | 'warning';
  severity: PolicySeverity;
  description: string;
  evidence?: string[];
  remediationRequired: boolean;
}

/**
 * Compliance scan configuration
 */
export interface ComplianceScanConfig {
  frameworks: ComplianceFramework[];
  frequency: 'continuous' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  scope: 'all_agents' | 'high_risk_agents' | 'specific_agents';
  agentIds?: string[];
  autoRemediate: boolean;
  notifyOnFailure: boolean;
}

// ============================================================================
// Agent Identity Types
// ============================================================================

/**
 * Agent identity
 */
export interface AgentIdentity {
  id: string;
  name: string;
  type: string;
  version: string;
  description: string;
  owner: string;
  team?: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'suspended' | 'revoked';
  permissions: AgentPermission[];
  roles: string[];
  tags: string[];
  metadata: Record<string, any>;
}

/**
 * Agent permission
 */
export interface AgentPermission {
  resource: string;
  actions: string[];
  scope: 'global' | 'team' | 'user';
  constraints?: Record<string, any>;
  grantedAt: Date;
  grantedBy: string;
  expiresAt?: Date;
}

/**
 * Agent credential
 */
export interface AgentCredential {
  id: string;
  agentId: string;
  type: 'api_key' | 'certificate' | 'oauth_token' | 'jwt';
  credential: string;
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  rotationPolicy?: {
    enabled: boolean;
    frequencyDays: number;
  };
}

// ============================================================================
// Task Adherence Types
// ============================================================================

/**
 * Task adherence metrics
 */
export interface TaskAdherenceMetrics {
  agentId: string;
  taskId: string;
  adherenceScore: number;           // 0-100
  driftDetected: boolean;
  driftSeverity?: 'low' | 'medium' | 'high' | 'critical';
  metrics: {
    scopeAdherence: number;         // 0-100
    goalAlignment: number;          // 0-100
    constraintCompliance: number;   // 0-100
    outputQuality: number;          // 0-100
    timeAdherence: number;          // 0-100
  };
  violations: TaskViolation[];
  measuredAt: Date;
}

/**
 * Task violation
 */
export interface TaskViolation {
  type: 'scope_drift' | 'goal_deviation' | 'constraint_violation' | 'unauthorized_action';
  severity: PolicySeverity;
  description: string;
  detectedAt: Date;
  evidence: string[];
}

/**
 * Task specification
 */
export interface TaskSpecification {
  id: string;
  description: string;
  goals: string[];
  scope: string[];
  constraints: string[];
  expectedOutputs: string[];
  maxDurationMinutes?: number;
  requiredPermissions: string[];
}

// ============================================================================
// Prompt Injection Types
// ============================================================================

/**
 * Prompt injection detection result
 */
export interface PromptInjectionResult {
  isInjection: boolean;
  confidence: number;
  attackType?: PromptInjectionType;
  severity: PolicySeverity;
  detectedPatterns: string[];
  sanitizedInput?: string;
  blockedAt: Date;
}

/**
 * Prompt injection attack types
 */
export type PromptInjectionType =
  | 'instruction_override'
  | 'context_manipulation'
  | 'role_confusion'
  | 'goal_hijacking'
  | 'data_exfiltration'
  | 'privilege_escalation'
  | 'system_prompt_leak'
  | 'jailbreak';

/**
 * Injection pattern
 */
export interface InjectionPattern {
  id: string;
  name: string;
  type: PromptInjectionType;
  pattern: RegExp;
  severity: PolicySeverity;
  description: string;
}

// ============================================================================
// PII Detection Types
// ============================================================================

/**
 * PII detection result
 */
export interface PIIDetectionResult {
  containsPII: boolean;
  piiTypes: PIIType[];
  detections: PIIDetection[];
  riskScore: number;
  redactedText?: string;
  detectedAt: Date;
}

/**
 * PII types
 */
export type PIIType =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit_card'
  | 'passport'
  | 'drivers_license'
  | 'ip_address'
  | 'mac_address'
  | 'bank_account'
  | 'iban'
  | 'tax_id'
  | 'national_id'
  | 'medical_record'
  | 'biometric'
  | 'custom';

/**
 * PII detection
 */
export interface PIIDetection {
  type: PIIType;
  value: string;
  position: { start: number; end: number };
  confidence: number;
  masked: string;
}

/**
 * PII handling policy
 */
export interface PIIHandlingPolicy {
  autoRedact: boolean;
  autoMask: boolean;
  logDetections: boolean;
  notifyOnDetection: boolean;
  allowedPIITypes: PIIType[];
  dataResidencyRequired?: string;
}

// ============================================================================
// Governance Reporting Types
// ============================================================================

/**
 * Governance report
 */
export interface GovernanceReport {
  id: string;
  type: GovernanceReportType;
  title: string;
  generatedAt: Date;
  generatedBy: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: GovernanceSummary;
  sections: ReportSection[];
  recommendations: string[];
  format: 'json' | 'pdf' | 'html' | 'csv';
}

/**
 * Governance report types
 */
export type GovernanceReportType =
  | 'compliance_status'
  | 'policy_violations'
  | 'risk_assessment'
  | 'agent_activity'
  | 'pii_exposure'
  | 'security_incidents'
  | 'executive_summary';

/**
 * Governance summary
 */
export interface GovernanceSummary {
  totalAgents: number;
  activeAgents: number;
  suspendedAgents: number;
  totalPolicies: number;
  activePolicies: number;
  policyViolations: number;
  criticalViolations: number;
  averageRiskScore: number;
  complianceScore: number;
  piiDetections: number;
  promptInjections: number;
}

/**
 * Report section
 */
export interface ReportSection {
  title: string;
  content: string;
  data?: any;
  charts?: ChartData[];
}

/**
 * Chart data
 */
export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title: string;
  data: any[];
  labels: string[];
}

// ============================================================================
// Governance Configuration Types
// ============================================================================

/**
 * Governance configuration
 */
export interface GovernanceConfig {
  enablePolicyEnforcement: boolean;
  enableRiskEvaluation: boolean;
  enableComplianceAuditing: boolean;
  enableTaskAdherence: boolean;
  enablePromptInjectionShield: boolean;
  enablePIIDetection: boolean;
  enableAuditLogging: boolean;

  // Performance settings
  policyEvaluationTimeoutMs: number;
  maxConcurrentEvaluations: number;
  cacheEvaluationResults: boolean;
  cacheExpirationMinutes: number;

  // Alert settings
  notifyOnCriticalViolations: boolean;
  notifyOnPolicyChanges: boolean;
  notifyOnRiskThreshold: number;
  alertChannels: string[];

  // Compliance settings
  enabledFrameworks: ComplianceFramework[];
  complianceScanFrequency: 'continuous' | 'hourly' | 'daily' | 'weekly';
  autoRemediateViolations: boolean;

  // PII settings
  piiHandlingPolicy: PIIHandlingPolicy;

  // Audit settings
  auditLogRetentionDays: number;
  immutableAuditLog: boolean;
}

/**
 * Governance metrics
 */
export interface GovernanceMetrics {
  timestamp: Date;

  // Policy metrics
  totalPolicies: number;
  activePolicies: number;
  policyEvaluations24h: number;
  policyViolations24h: number;
  avgEvaluationTimeMs: number;

  // Risk metrics
  avgRiskScore: number;
  highRiskAgents: number;
  riskTrend: 'improving' | 'stable' | 'degrading';

  // Compliance metrics
  complianceScore: number;
  compliantAgents: number;
  nonCompliantAgents: number;
  openFindings: number;

  // Security metrics
  promptInjections24h: number;
  piiDetections24h: number;
  securityIncidents24h: number;

  // Performance metrics
  avgTaskAdherenceScore: number;
  taskDrifts24h: number;
}
