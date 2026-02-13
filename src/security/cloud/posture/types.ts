/**
 * Cloud Security Posture Types
 *
 * Type definitions for cloud security posture management.
 *
 * @module posture/types
 */

/**
 * Supported cloud providers
 */
export enum CloudProvider {
  AWS = 'aws',
  AZURE = 'azure',
  GCP = 'gcp'
}

/**
 * Security assessment categories
 */
export enum AssessmentCategory {
  IDENTITY_ACCESS = 'identity_access',
  NETWORK_SECURITY = 'network_security',
  DATA_PROTECTION = 'data_protection',
  COMPUTE_SECURITY = 'compute_security',
  LOGGING_MONITORING = 'logging_monitoring',
  ENCRYPTION = 'encryption'
}

/**
 * Compliance frameworks
 */
export enum ComplianceFramework {
  CIS_BENCHMARKS = 'cis_benchmarks',
  SOC2 = 'soc2',
  PCI_DSS = 'pci_dss',
  HIPAA = 'hipaa',
  GDPR = 'gdpr'
}

/**
 * Risk severity levels
 */
export enum RiskSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

/**
 * Remediation status
 */
export enum RemediationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

/**
 * Remediation guidance
 */
export interface RemediationGuidance {
  automated: boolean;
  steps: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  estimatedCost: number; // In cents
  rollbackSteps?: string[];
  prerequisitePermissions: string[];
}

/**
 * Security finding
 */
export interface SecurityFinding {
  id: string;
  resourceId: string;
  resourceType: string;
  category: AssessmentCategory;
  severity: RiskSeverity;
  title: string;
  description: string;
  riskScore: number; // 0-100
  affectedFrameworks: ComplianceFramework[];
  evidence: Record<string, unknown>;
  remediation: RemediationGuidance;
  lastDetected: Date;
  firstDetected: Date;
  status: 'open' | 'acknowledged' | 'remediated' | 'accepted_risk';
}

/**
 * Resource risk profile
 */
export interface ResourceRiskProfile {
  resourceId: string;
  resourceType: string;
  provider: CloudProvider;
  riskScore: number; // 0-100
  findings: number;
  criticalFindings: number;
  complianceStatus: Record<ComplianceFramework, number>; // Percentage
  driftDetected: boolean;
  driftDetails?: string;
  lastAssessment: Date;
  trend: 'improving' | 'stable' | 'degrading';
}

/**
 * Account risk assessment
 */
export interface AccountRiskAssessment {
  accountId: string;
  provider: CloudProvider;
  overallRiskScore: number; // 0-100
  categoryScores: Record<AssessmentCategory, number>;
  complianceScores: Record<ComplianceFramework, number>;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  unremediatedFindings: number;
  assessmentDate: Date;
  trend: 'improving' | 'stable' | 'degrading';
  riskTrend: Array<{ date: Date; score: number }>;
}

/**
 * Remediation action
 */
export interface RemediationAction {
  id: string;
  findingId: string;
  findingTitle: string;
  provider: CloudProvider;
  status: RemediationStatus;
  automated: boolean;
  executedBy?: string;
  executedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  rollbackId?: string;
  auditLog: Array<{
    timestamp: Date;
    action: string;
    details: string;
    status: RemediationStatus;
  }>;
}

/**
 * Compliance report
 */
export interface ComplianceReport {
  reportId: string;
  framework: ComplianceFramework;
  accountId: string;
  provider: CloudProvider;
  generatedAt: Date;
  completionPercentage: number;
  categories: Array<{
    name: string;
    passed: number;
    failed: number;
    percentage: number;
  }>;
  failedControls: Array<{
    controlId: string;
    controlName: string;
    severity: RiskSeverity;
    affectedResources: number;
    remediation: string;
  }>;
  executiveSummary: string;
  recommendations: string[];
}

/**
 * Raw finding from provider assessment
 */
export interface RawFinding {
  title: string;
  description: string;
  riskScore: number;
  evidence: Record<string, unknown>;
  firstDetected?: Date;
}

/**
 * Cloud provider assessment interface
 */
export interface CloudProviderAdapter {
  /**
   * Assess a cloud resource
   */
  assessResource(
    resourceId: string,
    resourceType: string
  ): Promise<Array<{ category: AssessmentCategory }>>;

  /**
   * Run specific assessment category
   */
  runAssessment(
    resourceId: string,
    resourceType: string,
    category: AssessmentCategory
  ): Promise<RawFinding[]>;

  /**
   * Detect configuration drift
   */
  detectDrift(
    resourceId: string,
    resourceType: string
  ): Promise<{ detected: boolean; details?: string }>;

  /**
   * Enumerate all resources in account
   */
  enumerateResources(accountId: string): Promise<Array<{ id: string; type: string }>>;

  /**
   * Execute automated remediation
   */
  executeRemediation(finding: SecurityFinding): Promise<void>;

  /**
   * Rollback remediation
   */
  rollbackRemediation(action: RemediationAction): Promise<void>;
}

/**
 * Base implementation for cloud provider adapters
 */
export abstract class BaseCloudProviderAdapter implements CloudProviderAdapter {
  protected provider: CloudProvider;
  protected credentials: Record<string, unknown>;

  constructor(provider: CloudProvider, credentials: Record<string, unknown>) {
    this.provider = provider;
    this.credentials = credentials;
  }

  abstract assessResource(
    resourceId: string,
    resourceType: string
  ): Promise<Array<{ category: AssessmentCategory }>>;

  abstract runAssessment(
    resourceId: string,
    resourceType: string,
    category: AssessmentCategory
  ): Promise<RawFinding[]>;

  abstract detectDrift(
    resourceId: string,
    resourceType: string
  ): Promise<{ detected: boolean; details?: string }>;

  abstract enumerateResources(accountId: string): Promise<Array<{ id: string; type: string }>>;

  abstract executeRemediation(finding: SecurityFinding): Promise<void>;

  abstract rollbackRemediation(action: RemediationAction): Promise<void>;

  /**
   * Helper to create assessment for category
   */
  protected createAssessment(category: AssessmentCategory): { category: AssessmentCategory } {
    return { category };
  }
}
