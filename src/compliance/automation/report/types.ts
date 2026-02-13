/**
 * Types and Interfaces for Compliance Report Generator
 */

import type {
  ComplianceFramework,
  ComplianceGap,
  DataClassification,
} from '../../../types/compliance';

// ============================================================================
// Enums
// ============================================================================

export enum ReportType {
  EXECUTIVE_SUMMARY = 'executive_summary',
  DETAILED_ASSESSMENT = 'detailed_assessment',
  GAP_ANALYSIS = 'gap_analysis',
  AUDIT_REPORT = 'audit_report',
  CERTIFICATION_PACKAGE = 'certification_package',
  EVIDENCE_PACKAGE = 'evidence_package',
  REMEDIATION_REPORT = 'remediation_report',
  TREND_ANALYSIS = 'trend_analysis',
}

export enum ReportFormat {
  PDF = 'pdf',
  HTML = 'html',
  JSON = 'json',
  CSV = 'csv',
  XLSX = 'xlsx',
  WORD = 'docx',
}

export enum ScheduleFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
  ON_DEMAND = 'on_demand',
}

export enum DistributionChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  TEAMS = 'teams',
  S3 = 's3',
  WEBHOOK = 'webhook',
  SFTP = 'sftp',
}

export enum StakeholderView {
  BOARD = 'board',
  AUDITORS = 'auditors',
  IT = 'it',
  LEGAL = 'legal',
  EXECUTIVE = 'executive',
  OPERATIONS = 'operations',
  SECURITY = 'security',
}

export enum RiskPriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4,
  INFORMATIONAL = 5,
}

// ============================================================================
// Report Configuration Interfaces
// ============================================================================

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  reportType: ReportType;
  stakeholderView: StakeholderView;
  branding: ReportBranding;
  sections: ReportSection[];
  filters: ReportFilter[];
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  isDefault: boolean;
  metadata?: Record<string, unknown>;
}

export interface ReportBranding {
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  headerText?: string;
  footerText?: string;
  companyName: string;
  confidentialityNotice?: string;
  watermark?: string;
}

export interface ReportSection {
  id: string;
  name: string;
  type: 'summary' | 'table' | 'chart' | 'text' | 'metrics' | 'findings' | 'recommendations';
  order: number;
  visible: boolean;
  config: Record<string, unknown>;
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'between' | 'greater_than' | 'less_than';
  value: unknown;
}

export interface ReportSchedule {
  id: string;
  name: string;
  templateId: string;
  frequency: ScheduleFrequency;
  cronExpression?: string;
  nextRunAt: Date;
  lastRunAt?: Date;
  lastRunStatus?: 'success' | 'failed' | 'skipped';
  enabled: boolean;
  recipients: DistributionRecipient[];
  frameworks: ComplianceFramework[];
  formats: ReportFormat[];
  retentionDays: number;
  createdBy: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface DistributionRecipient {
  channel: DistributionChannel;
  destination: string;
  config: DistributionConfig;
  enabled: boolean;
}

export interface DistributionConfig {
  // Email config
  emailSubject?: string;
  emailBody?: string;
  ccRecipients?: string[];
  bccRecipients?: string[];

  // Slack config
  slackChannel?: string;
  slackWebhookUrl?: string;
  slackMention?: string[];

  // Teams config
  teamsWebhookUrl?: string;
  teamsChannel?: string;

  // S3 config
  s3Bucket?: string;
  s3Prefix?: string;
  s3Region?: string;

  // SFTP config
  sftpHost?: string;
  sftpPath?: string;
  sftpCredentialId?: string;

  // Webhook config
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;
}

// ============================================================================
// Generated Report Interfaces
// ============================================================================

export interface GeneratedReport {
  id: string;
  templateId?: string;
  scheduleId?: string;
  reportType: ReportType;
  format: ReportFormat;
  frameworks: ComplianceFramework[];
  stakeholderView: StakeholderView;
  period: ReportPeriod;
  generatedAt: Date;
  generatedBy: string;
  status: 'generating' | 'completed' | 'failed' | 'distributed';
  filePath?: string;
  fileSize?: number;
  downloadUrl?: string;
  expiresAt?: Date;
  content: ReportContent;
  metadata?: Record<string, unknown>;
}

export interface ReportPeriod {
  startDate: Date;
  endDate: Date;
  label?: string;
}

export interface ReportContent {
  title: string;
  subtitle?: string;
  executiveSummary?: ExecutiveSummary;
  frameworkAnalysis?: FrameworkAnalysis[];
  controlAssessments?: ControlAssessmentSection[];
  gapAnalysis?: GapAnalysisSection;
  riskMatrix?: RiskMatrixSection;
  trends?: TrendAnalysisSection;
  evidence?: EvidenceSection;
  recommendations?: RecommendationSection[];
  appendices?: ReportAppendix[];
}

export interface ExecutiveSummary {
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  keyFindings: string[];
  criticalIssues: number;
  complianceStatus: Record<ComplianceFramework, number>;
  improvementFromLastPeriod: number;
  recommendations: string[];
  nextSteps: string[];
}

export interface FrameworkAnalysis {
  framework: ComplianceFramework;
  totalControls: number;
  compliantControls: number;
  nonCompliantControls: number;
  inProgressControls: number;
  complianceScore: number;
  trend: 'improving' | 'stable' | 'declining';
  criticalGaps: number;
  controlsByCategory: Record<string, CategoryAnalysis>;
}

export interface CategoryAnalysis {
  category: string;
  totalControls: number;
  compliantControls: number;
  score: number;
}

export interface ControlAssessmentSection {
  framework: ComplianceFramework;
  assessments: ControlAssessmentDetail[];
  summary: {
    total: number;
    compliant: number;
    nonCompliant: number;
    needsReview: number;
  };
}

export interface ControlAssessmentDetail {
  controlId: string;
  controlName: string;
  category: string;
  status: string;
  lastAssessed: Date;
  assessedBy: string;
  findings: string[];
  evidenceCount: number;
  riskPriority: RiskPriority;
}

export interface GapAnalysisSection {
  totalGaps: number;
  criticalGaps: number;
  highGaps: number;
  mediumGaps: number;
  lowGaps: number;
  gapsByFramework: Record<ComplianceFramework, GapSummary>;
  prioritizedGaps: PrioritizedGap[];
  remediationTimeline: RemediationTimeline[];
}

export interface GapSummary {
  framework: ComplianceFramework;
  totalGaps: number;
  gapsByCategory: Record<string, number>;
  estimatedRemediationEffort: string;
}

export interface PrioritizedGap {
  gap: ComplianceGap;
  riskScore: number;
  businessImpact: string;
  remediationComplexity: 'low' | 'medium' | 'high';
  recommendedPriority: RiskPriority;
  estimatedCost: number;
}

export interface RemediationTimeline {
  phase: string;
  startDate: Date;
  endDate: Date;
  gaps: string[];
  milestones: string[];
  resources: string[];
}

export interface RiskMatrixSection {
  matrix: RiskMatrixCell[][];
  heatmap: RiskHeatmapData[];
  topRisks: RiskItem[];
  riskDistribution: Record<string, number>;
}

export interface RiskMatrixCell {
  likelihood: number;
  impact: number;
  count: number;
  controls: string[];
}

export interface RiskHeatmapData {
  category: string;
  riskLevel: number;
  controlCount: number;
  gapCount: number;
}

export interface RiskItem {
  id: string;
  description: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  mitigationStatus: string;
  owner?: string;
}

export interface TrendAnalysisSection {
  periods: TrendPeriod[];
  complianceTrend: TrendDataPoint[];
  gapTrend: TrendDataPoint[];
  riskTrend: TrendDataPoint[];
  frameworkTrends: Record<ComplianceFramework, TrendDataPoint[]>;
  insights: TrendInsight[];
}

export interface TrendPeriod {
  label: string;
  startDate: Date;
  endDate: Date;
}

export interface TrendDataPoint {
  date: Date;
  value: number;
  label?: string;
}

export interface TrendInsight {
  type: 'improvement' | 'decline' | 'stable' | 'warning';
  message: string;
  metric: string;
  change: number;
  recommendation?: string;
}

export interface EvidenceSection {
  totalEvidence: number;
  evidenceByType: Record<string, number>;
  evidenceByFramework: Record<ComplianceFramework, number>;
  recentEvidence: EvidenceSummary[];
  expiringEvidence: EvidenceSummary[];
  evidenceGaps: string[];
}

export interface EvidenceSummary {
  id: string;
  title: string;
  type: string;
  controlId: string;
  collectedAt: Date;
  validUntil?: Date;
  classification: DataClassification;
}

export interface RecommendationSection {
  priority: RiskPriority;
  category: string;
  title: string;
  description: string;
  rationale: string;
  estimatedEffort: string;
  estimatedCost?: number;
  deadline?: Date;
  relatedControls: string[];
  relatedGaps: string[];
}

export interface ReportAppendix {
  id: string;
  title: string;
  type: 'table' | 'document' | 'chart' | 'data';
  content: unknown;
}

// ============================================================================
// Dashboard Interfaces
// ============================================================================

export interface ExecutiveDashboard {
  id: string;
  title: string;
  generatedAt: Date;
  stakeholderView: StakeholderView;
  widgets: DashboardWidget[];
  drilldowns: DrilldownConfig[];
  filters: DashboardFilter[];
  refreshInterval: number;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'gauge' | 'heatmap' | 'timeline' | 'list';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  config: WidgetConfig;
  drilldownId?: string;
}

export interface WidgetConfig {
  dataSource: string;
  aggregation?: string;
  groupBy?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'radar';
  colors?: string[];
  thresholds?: { value: number; color: string; label: string }[];
  format?: string;
}

export interface DrilldownConfig {
  id: string;
  title: string;
  parentWidgetId: string;
  dataSource: string;
  columns: string[];
  filters: DashboardFilter[];
}

export interface DashboardFilter {
  field: string;
  label: string;
  type: 'select' | 'multiselect' | 'daterange' | 'search';
  options?: { value: string; label: string }[];
  defaultValue?: unknown;
}

// ============================================================================
// Certification Package Interfaces
// ============================================================================

export interface CertificationPackage {
  id: string;
  framework: ComplianceFramework;
  version: string;
  generatedAt: Date;
  generatedBy: string;
  status: 'draft' | 'review' | 'approved' | 'submitted' | 'certified';
  validFrom?: Date;
  validUntil?: Date;
  certifyingBody?: string;
  documents: CertificationDocument[];
  controlsIncluded: string[];
  evidenceIncluded: string[];
  attestations: CertificationAttestation[];
  auditTrail: CertificationAuditEntry[];
  signature?: DigitalSignature;
}

export interface CertificationDocument {
  id: string;
  type: 'policy' | 'procedure' | 'evidence' | 'attestation' | 'report' | 'supporting';
  title: string;
  description: string;
  filePath: string;
  fileSize: number;
  checksum: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface CertificationAttestation {
  id: string;
  controlId: string;
  statement: string;
  attestedBy: string;
  attestedAt: Date;
  validUntil: Date;
  signature: string;
}

export interface CertificationAuditEntry {
  timestamp: Date;
  action: string;
  performedBy: string;
  details: string;
  previousState?: string;
  newState?: string;
}

export interface DigitalSignature {
  algorithm: string;
  signedAt: Date;
  signedBy: string;
  certificate: string;
  signature: string;
}

// ============================================================================
// Historical Comparison Interfaces
// ============================================================================

export interface ReportComparison {
  id: string;
  baseReportId: string;
  compareReportId: string;
  generatedAt: Date;
  differences: ComparisonDifference[];
  summary: ComparisonSummary;
  insights: string[];
}

export interface ComparisonDifference {
  field: string;
  category: string;
  baseValue: unknown;
  compareValue: unknown;
  change: number;
  changeType: 'improved' | 'declined' | 'unchanged' | 'new' | 'removed';
  significance: 'high' | 'medium' | 'low';
}

export interface ComparisonSummary {
  totalChanges: number;
  improvements: number;
  declines: number;
  overallTrend: 'improving' | 'stable' | 'declining';
  keyChanges: string[];
}

export interface HistoricalTrendData {
  framework: ComplianceFramework;
  periods: HistoricalPeriod[];
  aggregations: TrendAggregation[];
  predictions?: TrendPrediction[];
}

export interface HistoricalPeriod {
  startDate: Date;
  endDate: Date;
  complianceScore: number;
  controlsAssessed: number;
  gapsIdentified: number;
  gapsResolved: number;
  evidenceCollected: number;
}

export interface TrendAggregation {
  metric: string;
  average: number;
  min: number;
  max: number;
  trend: 'up' | 'down' | 'stable';
  percentChange: number;
}

export interface TrendPrediction {
  metric: string;
  predictedValue: number;
  confidence: number;
  horizon: string;
}

// ============================================================================
// Generator Options Interfaces
// ============================================================================

export interface ReportGenerationOptions {
  reportType: ReportType;
  frameworks: ComplianceFramework[];
  format: ReportFormat;
  period: ReportPeriod;
  stakeholderView?: StakeholderView;
  templateId?: string;
  generatedBy: string;
  filters?: ReportFilter[];
  includeEvidence?: boolean;
  includeRecommendations?: boolean;
}

export interface ScheduleOptions {
  name: string;
  templateId: string;
  frequency: ScheduleFrequency;
  cronExpression?: string;
  recipients: DistributionRecipient[];
  frameworks: ComplianceFramework[];
  formats: ReportFormat[];
  retentionDays?: number;
  createdBy: string;
  startDate?: Date;
}

export interface CertificationPackageOptions {
  framework: ComplianceFramework;
  controlIds: string[];
  evidenceIds: string[];
  generatedBy: string;
  certifyingBody?: string;
}

export interface DashboardOptions {
  title: string;
  stakeholderView: StakeholderView;
  frameworks: ComplianceFramework[];
  createdBy: string;
}

export interface EvidencePackageOptions {
  framework: ComplianceFramework;
  controlIds?: string[];
  period?: ReportPeriod;
  format: ReportFormat;
  generatedBy: string;
}
