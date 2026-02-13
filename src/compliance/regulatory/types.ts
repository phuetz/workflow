/**
 * Regulatory Framework Types
 * Extracted types for regulatory compliance management
 */

// Testing Requirement
export interface TestingRequirement {
  name: string
  frequency: string
  methodology: string
  documentationNeeded: string[]
  acceptanceCriteria: string[]
  estimatedHours: number
}

// Control Definition
export interface ControlDefinition {
  id: string
  title: string
  description: string
  controlCategory: string
  controlType: 'preventive' | 'detective' | 'corrective' | 'directive'
  implementationLevel: 'basic' | 'intermediate' | 'advanced'
  frequency: string
  parentControl?: string
  subControls?: string[]
  testingRequirements: TestingRequirement[]
  evidence: string[]
  priority: number
  riskMitigation: string[]
  relatedControls: {
    framework: string
    controlIds: string[]
  }[]
  auditSteps: string[]
  commonControlId?: string
}

// Principle
export interface Principle {
  id: string
  name: string
  description: string
  controlIds: string[]
  trustComponent: string
}

// Framework Section
export interface FrameworkSection {
  id: string
  name: string
  description: string
  controlIds: string[]
  parentSectionId?: string
  subSections?: FrameworkSection[]
}

// Control Hierarchy
export interface ControlHierarchy {
  rootControls: string[]
  childMap: Map<string, string[]>
  parentMap: Map<string, string>
}

// Framework Update
export interface FrameworkUpdate {
  version: string
  releaseDate: Date
  changes: ControlChange[]
  impactAssessment: ImpactAssessment
}

// Control Change
export interface ControlChange {
  type: 'added' | 'removed' | 'modified' | 'deprecated'
  controlId: string
  description: string
  affectedSystems: string[]
  migrationPath?: string
}

// Impact Assessment
export interface ImpactAssessment {
  affectedControlCount: number
  implementationEffort: 'low' | 'medium' | 'high'
  backwardCompatibility: boolean
  estimatedComplianceCost: number
  riskLevel: 'low' | 'medium' | 'high'
}

// Compliance Framework
export interface ComplianceFramework {
  id: string
  name: string
  fullName: string
  version: string
  lastUpdated: Date
  releaseDate: Date
  applicableIndustries: string[]
  applicableGeographies: string[]
  controls: ControlDefinition[]
  sections?: FrameworkSection[]
  principles?: Principle[]
  controlHierarchy: ControlHierarchy
  updateHistory: FrameworkUpdate[]
  deprecated: boolean
  successorFrameworkId?: string
}

// Common Control Mapping
export interface CommonControlMapping {
  frameworkId: string
  frameworkControlId: string
  commonControlId: string
  mappingStrength: 'exact' | 'strong' | 'partial' | 'weak'
  gapAnalysis: string
  additionalControls: string[]
}

// Applicable Frameworks
export interface ApplicableFrameworks {
  frameworkId: string
  frameworkName: string
  applicabilityScore: number
  reasoning: string[]
  mandatoryControls: string[]
  optionalControls: string[]
  estimatedImplementationEffort: number
}

// Regulatory Update
export interface RegulatoryUpdate {
  id: string
  frameworkId: string
  date: Date
  updateType: 'new_control' | 'amended_control' | 'deprecated_control' | 'guidance'
  controlId: string
  description: string
  effectiveDate: Date
  impactLevel: 'critical' | 'high' | 'medium' | 'low'
  affectedIndustries: string[]
  migrationPath?: string
}

// Custom Framework
export interface CustomFramework {
  id: string
  name: string
  description: string
  baseFrameworks: string[]
  customControls: ControlDefinition[]
  organizationId: string
  createdDate: Date
  modifiedDate: Date
  active: boolean
}

// Certification Status
export interface CertificationStatus {
  frameworkId: string
  certificationId: string
  status: 'active' | 'expired' | 'pending' | 'suspended' | 'revoked'
  issuedDate: Date
  expiryDate: Date
  certifyingBody: string
  scope: string[]
  controlsCovered: ControlCertification[]
  nextAuditDate: Date
  auditFrequency: string
  lastAuditResult: AuditResult
}

// Control Certification
export interface ControlCertification {
  controlId: string
  certificationStatus: 'certified' | 'conditional' | 'non-compliant'
  evidenceUrl: string
  lastVerificationDate: Date
  auditorNotes: string
}

// Audit Result
export interface AuditResult {
  auditId: string
  date: Date
  auditorName: string
  findings: AuditFinding[]
  overallRating: 'compliant' | 'conditionally_compliant' | 'non_compliant'
  estimatedRemediationCost: number
}

// Audit Finding
export interface AuditFinding {
  controlId: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  remediationPlan: string
  targetRemediationDate: Date
}

// Coverage Report
export interface CoverageReport {
  frameworkId: string
  totalControls: number
  implementedControls: number
  partiallyImplementedControls: number
  notImplementedControls: number
  coveragePercentage: number
  implementationByCategory: Record<string, number>
  gaps: ControlDefinition[]
  recommendations: string[]
  estimatedCompletionDate: Date
}

// Organization Profile
export interface OrganizationProfile {
  industry: string
  geography: string[]
  dataTypes: string[]
  regulations: string[]
  organizationSize: string
  businessModel: string
  dataProcessingAreas: string[]
}

// Custom Framework Definition (for creation)
export interface CustomFrameworkDefinition {
  name: string
  description: string
  baseFrameworks: string[]
  customControls: ControlDefinition[]
  organizationId: string
}
