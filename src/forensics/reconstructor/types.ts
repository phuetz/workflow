/**
 * Shared type definitions for Incident Reconstructor modules
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type AttackPhase =
  | 'reconnaissance'
  | 'resource_development'
  | 'initial_access'
  | 'execution'
  | 'persistence'
  | 'privilege_escalation'
  | 'defense_evasion'
  | 'credential_access'
  | 'discovery'
  | 'lateral_movement'
  | 'collection'
  | 'command_and_control'
  | 'exfiltration'
  | 'impact';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export type AssetType = 'workstation' | 'server' | 'database' | 'cloud_instance' | 'network_device' | 'user_account' | 'service_account' | 'application' | 'container';

export type MovementMethod = 'rdp' | 'ssh' | 'smb' | 'wmi' | 'psexec' | 'winrm' | 'pass_the_hash' | 'pass_the_ticket' | 'golden_ticket' | 'dcom' | 'api_call' | 'container_escape';

export type ImpactType = 'data_breach' | 'ransomware' | 'data_destruction' | 'service_disruption' | 'credential_theft' | 'cryptomining' | 'backdoor' | 'espionage';

export interface IncidentReconstructorConfig {
  enableAutomaticCorrelation: boolean;
  correlationTimeWindowMs: number;
  killChainMappingVersion: string;
  maxTimelineEvents: number;
  maxGraphNodes: number;
  enableThreatIntelEnrichment: boolean;
  threatIntelSources: string[];
  confidenceThreshold: number;
}

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  sourceSystem: string;
  eventType: string;
  severity: SeverityLevel;
  sourceIp?: string;
  destinationIp?: string;
  sourceHost?: string;
  destinationHost?: string;
  sourceUser?: string;
  destinationUser?: string;
  processName?: string;
  processId?: number;
  parentProcessId?: number;
  commandLine?: string;
  filePath?: string;
  fileHash?: string;
  networkPort?: number;
  protocol?: string;
  action?: string;
  outcome?: 'success' | 'failure' | 'unknown';
  rawData: Record<string, unknown>;
  tags: string[];
  indicators: string[];
}

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  phase: AttackPhase;
  description: string;
  severity: SeverityLevel;
  confidence: number;
  sourceEvents: string[];
  assets: string[];
  techniques: MitreTechnique[];
  indicators: string[];
  actor?: string;
  notes?: string;
}

export interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
  subTechniqueId?: string;
  description: string;
  platforms: string[];
  detection: string[];
  mitigation: string[];
  url: string;
  dataSourcesUsed: string[];
}

export interface LateralMovement {
  id: string;
  timestamp: Date;
  sourceAsset: Asset;
  destinationAsset: Asset;
  method: MovementMethod;
  credentialsUsed?: CredentialUsage;
  techniques: MitreTechnique[];
  success: boolean;
  confidence: number;
  sourceEvents: string[];
  duration?: number;
  dataTransferred?: number;
}

export interface Asset {
  id: string;
  type: AssetType;
  hostname?: string;
  ipAddress?: string;
  domain?: string;
  operatingSystem?: string;
  criticality: SeverityLevel;
  owner?: string;
  department?: string;
  compromisedAt?: Date;
  accessLevel?: string;
  services: string[];
  vulnerabilities: string[];
}

export interface CredentialUsage {
  accountName: string;
  accountType: 'domain' | 'local' | 'service' | 'application';
  domain?: string;
  authMethod: string;
  privilegeLevel: string;
  compromiseMethod?: string;
  validCredential: boolean;
}

export interface KillChainMapping {
  incidentId: string;
  phases: KillChainPhase[];
  completeness: number;
  attackVector: string;
  attackObjective?: string;
  dwellTime?: number;
  firstActivity: Date;
  lastActivity: Date;
  attackerProfile?: ThreatActorProfile;
}

export interface KillChainPhase {
  phase: AttackPhase;
  detected: boolean;
  startTime?: Date;
  endTime?: Date;
  techniques: MitreTechnique[];
  events: string[];
  confidence: number;
  notes: string;
}

export interface ThreatActorProfile {
  id: string;
  name: string;
  aliases: string[];
  motivation: 'financial' | 'espionage' | 'hacktivism' | 'destruction' | 'unknown';
  sophistication: 'low' | 'medium' | 'high' | 'advanced';
  targetSectors: string[];
  knownTechniques: string[];
  attribution: string;
  confidence: number;
}

export interface RootCauseAnalysis {
  incidentId: string;
  analysisTimestamp: Date;
  primaryCause: CauseNode;
  contributingFactors: ContributingFactor[];
  entryPoint: EntryPoint;
  vulnerabilitiesExploited: Vulnerability[];
  securityGaps: SecurityGap[];
  recommendations: Recommendation[];
  confidenceLevel: number;
}

export interface CauseNode {
  id: string;
  description: string;
  category: 'technical' | 'process' | 'human' | 'external';
  evidence: string[];
  children: CauseNode[];
  confidence: number;
}

export interface ContributingFactor {
  id: string;
  description: string;
  category: string;
  impact: SeverityLevel;
  remediation: string;
}

export interface EntryPoint {
  type: 'phishing' | 'exploit' | 'credential_compromise' | 'supply_chain' | 'insider' | 'physical' | 'misconfiguration';
  description: string;
  asset: Asset;
  timestamp: Date;
  technique?: MitreTechnique;
  indicators: string[];
}

export interface Vulnerability {
  id: string;
  cveId?: string;
  name: string;
  description: string;
  severity: SeverityLevel;
  cvssScore?: number;
  affectedAssets: string[];
  exploitedAt?: Date;
  patchAvailable: boolean;
}

export interface SecurityGap {
  id: string;
  category: 'detection' | 'prevention' | 'response' | 'recovery';
  description: string;
  impact: string;
  currentState: string;
  recommendedState: string;
  priority: SeverityLevel;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: SeverityLevel;
  category: 'immediate' | 'short_term' | 'long_term';
  effort: 'low' | 'medium' | 'high';
  cost: 'low' | 'medium' | 'high';
  frameworks: string[];
}

export interface ImpactAssessment {
  incidentId: string;
  assessmentTimestamp: Date;
  overallImpact: SeverityLevel;
  impactTypes: ImpactType[];
  businessImpact: BusinessImpact;
  technicalImpact: TechnicalImpact;
  regulatoryImpact: RegulatoryImpact;
  reputationalImpact: ReputationalImpact;
  financialImpact: FinancialImpact;
  recoveryAssessment: RecoveryAssessment;
}

export interface BusinessImpact {
  affectedProcesses: string[];
  operationalDowntime: number;
  productivityLoss: number;
  customerImpact: string;
  partnerImpact: string;
  serviceDisruption: boolean;
}

export interface TechnicalImpact {
  systemsCompromised: number;
  accountsCompromised: number;
  dataRecordsAffected: number;
  dataVolume: number;
  integrityImpacted: boolean;
  availabilityImpacted: boolean;
  confidentialityImpacted: boolean;
  assetsAffected: Asset[];
}

export interface RegulatoryImpact {
  applicableRegulations: string[];
  notificationRequired: boolean;
  notificationDeadline?: Date;
  potentialFines: number;
  complianceViolations: string[];
  reportingObligations: string[];
}

export interface ReputationalImpact {
  publicExposure: boolean;
  mediaAttention: boolean;
  customerNotificationRequired: boolean;
  estimatedCustomerChurn: number;
  brandDamageAssessment: string;
}

export interface FinancialImpact {
  directCosts: number;
  indirectCosts: number;
  recoveryEstimate: number;
  legalCosts: number;
  regulatoryFines: number;
  insuranceCoverage: number;
  totalEstimatedLoss: number;
}

export interface RecoveryAssessment {
  recoveryTimeObjective: number;
  recoveryPointObjective: number;
  estimatedRecoveryTime: number;
  recoveryPriorities: string[];
  resourcesRequired: string[];
  recoveryPlan: RecoveryStep[];
}

export interface RecoveryStep {
  order: number;
  description: string;
  owner: string;
  estimatedDuration: number;
  dependencies: number[];
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

export interface AttackGraph {
  id: string;
  incidentId: string;
  generatedAt: Date;
  nodes: AttackGraphNode[];
  edges: AttackGraphEdge[];
  entryPoints: string[];
  objectives: string[];
  criticalPaths: string[][];
  riskScore: number;
}

export interface AttackGraphNode {
  id: string;
  type: 'asset' | 'technique' | 'indicator' | 'credential' | 'data';
  label: string;
  properties: Record<string, unknown>;
  compromised: boolean;
  compromisedAt?: Date;
  severity: SeverityLevel;
  position?: { x: number; y: number };
}

export interface AttackGraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'lateral_movement' | 'technique_used' | 'credential_access' | 'data_access' | 'persistence' | 'c2_communication';
  label: string;
  timestamp?: Date;
  confidence: number;
  properties: Record<string, unknown>;
}

// ============================================================================
// MITRE ATT&CK Database
// ============================================================================

export const MITRE_TECHNIQUES: Map<string, MitreTechnique> = new Map([
  ['T1566', { id: 'T1566', name: 'Phishing', tactic: 'Initial Access', description: 'Adversaries may send phishing messages to gain access', platforms: ['Windows', 'macOS', 'Linux'], detection: ['Email gateway logs', 'User reports'], mitigation: ['User training', 'Email filtering'], url: 'https://attack.mitre.org/techniques/T1566/', dataSourcesUsed: [] }],
  ['T1566.001', { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access', subTechniqueId: '001', description: 'Spearphishing with malicious attachment', platforms: ['Windows', 'macOS', 'Linux'], detection: ['Email analysis', 'Sandbox detonation'], mitigation: ['Attachment scanning'], url: 'https://attack.mitre.org/techniques/T1566/001/', dataSourcesUsed: [] }],
  ['T1059', { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'Execution', description: 'Adversaries may abuse command interpreters', platforms: ['Windows', 'macOS', 'Linux'], detection: ['Process monitoring', 'Command-line logging'], mitigation: ['Script blocking', 'Application whitelisting'], url: 'https://attack.mitre.org/techniques/T1059/', dataSourcesUsed: [] }],
  ['T1059.001', { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution', subTechniqueId: '001', description: 'Adversaries may abuse PowerShell', platforms: ['Windows'], detection: ['PowerShell logging', 'ScriptBlock logging'], mitigation: ['Constrained Language Mode'], url: 'https://attack.mitre.org/techniques/T1059/001/', dataSourcesUsed: [] }],
  ['T1078', { id: 'T1078', name: 'Valid Accounts', tactic: 'Defense Evasion', description: 'Adversaries may use valid accounts', platforms: ['Windows', 'Azure AD', 'Office 365'], detection: ['Authentication logs', 'Anomaly detection'], mitigation: ['MFA', 'Privileged access management'], url: 'https://attack.mitre.org/techniques/T1078/', dataSourcesUsed: [] }],
  ['T1003', { id: 'T1003', name: 'OS Credential Dumping', tactic: 'Credential Access', description: 'Adversaries may dump credentials from OS', platforms: ['Windows', 'Linux'], detection: ['LSASS access', 'Process creation'], mitigation: ['Credential Guard', 'LSASS protection'], url: 'https://attack.mitre.org/techniques/T1003/', dataSourcesUsed: [] }],
  ['T1003.001', { id: 'T1003.001', name: 'LSASS Memory', tactic: 'Credential Access', subTechniqueId: '001', description: 'Adversaries may access LSASS memory', platforms: ['Windows'], detection: ['LSASS memory access'], mitigation: ['Credential Guard'], url: 'https://attack.mitre.org/techniques/T1003/001/', dataSourcesUsed: [] }],
  ['T1021', { id: 'T1021', name: 'Remote Services', tactic: 'Lateral Movement', description: 'Adversaries may use remote services', platforms: ['Windows', 'Linux'], detection: ['Network monitoring', 'Authentication logs'], mitigation: ['Network segmentation', 'MFA'], url: 'https://attack.mitre.org/techniques/T1021/', dataSourcesUsed: [] }],
  ['T1021.001', { id: 'T1021.001', name: 'Remote Desktop Protocol', tactic: 'Lateral Movement', subTechniqueId: '001', description: 'Adversaries may use RDP', platforms: ['Windows'], detection: ['RDP logs', 'Network monitoring'], mitigation: ['Disable RDP', 'Network level auth'], url: 'https://attack.mitre.org/techniques/T1021/001/', dataSourcesUsed: [] }],
  ['T1021.002', { id: 'T1021.002', name: 'SMB/Windows Admin Shares', tactic: 'Lateral Movement', subTechniqueId: '002', description: 'Adversaries may use SMB shares', platforms: ['Windows'], detection: ['SMB traffic analysis'], mitigation: ['Disable admin shares'], url: 'https://attack.mitre.org/techniques/T1021/002/', dataSourcesUsed: [] }],
  ['T1055', { id: 'T1055', name: 'Process Injection', tactic: 'Defense Evasion', description: 'Adversaries may inject code into processes', platforms: ['Windows', 'Linux'], detection: ['Process monitoring', 'API monitoring'], mitigation: ['Behavior prevention'], url: 'https://attack.mitre.org/techniques/T1055/', dataSourcesUsed: [] }],
  ['T1547', { id: 'T1547', name: 'Boot or Logon Autostart Execution', tactic: 'Persistence', description: 'Adversaries may configure persistence via autostart', platforms: ['Windows', 'macOS', 'Linux'], detection: ['Registry monitoring', 'File monitoring'], mitigation: ['Restrict registry permissions'], url: 'https://attack.mitre.org/techniques/T1547/', dataSourcesUsed: [] }],
  ['T1071', { id: 'T1071', name: 'Application Layer Protocol', tactic: 'Command and Control', description: 'Adversaries may use app layer protocols for C2', platforms: ['Windows', 'macOS', 'Linux'], detection: ['Network traffic analysis'], mitigation: ['Network intrusion detection'], url: 'https://attack.mitre.org/techniques/T1071/', dataSourcesUsed: [] }],
  ['T1048', { id: 'T1048', name: 'Exfiltration Over Alternative Protocol', tactic: 'Exfiltration', description: 'Adversaries may exfiltrate via alternative protocols', platforms: ['Windows', 'macOS', 'Linux'], detection: ['Network DLP', 'DNS monitoring'], mitigation: ['Network segmentation'], url: 'https://attack.mitre.org/techniques/T1048/', dataSourcesUsed: [] }],
  ['T1486', { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact', description: 'Adversaries may encrypt data for ransomware', platforms: ['Windows', 'macOS', 'Linux'], detection: ['File modification monitoring'], mitigation: ['Data backup'], url: 'https://attack.mitre.org/techniques/T1486/', dataSourcesUsed: [] }],
  ['T1087', { id: 'T1087', name: 'Account Discovery', tactic: 'Discovery', description: 'Adversaries may attempt to get account listings', platforms: ['Windows', 'Azure AD', 'Linux'], detection: ['Command monitoring', 'API auditing'], mitigation: ['Audit policies'], url: 'https://attack.mitre.org/techniques/T1087/', dataSourcesUsed: [] }],
  ['T1083', { id: 'T1083', name: 'File and Directory Discovery', tactic: 'Discovery', description: 'Adversaries may enumerate files and directories', platforms: ['Windows', 'macOS', 'Linux'], detection: ['Process command-line'], mitigation: ['N/A - legitimate activity'], url: 'https://attack.mitre.org/techniques/T1083/', dataSourcesUsed: [] }],
  ['T1105', { id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command and Control', description: 'Adversaries may transfer tools into environment', platforms: ['Windows', 'macOS', 'Linux'], detection: ['Network monitoring', 'File monitoring'], mitigation: ['Network intrusion prevention'], url: 'https://attack.mitre.org/techniques/T1105/', dataSourcesUsed: [] }],
]);

// ============================================================================
// Utility Functions
// ============================================================================

export function generateId(prefix: string): string {
  const crypto = require('crypto');
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

export function getMaxSeverity(severities: SeverityLevel[]): SeverityLevel {
  const order: SeverityLevel[] = ['informational', 'low', 'medium', 'high', 'critical'];
  return order[Math.max(...severities.map(s => order.indexOf(s)))];
}

export const PHASE_ORDER: AttackPhase[] = ['reconnaissance', 'resource_development', 'initial_access', 'execution', 'persistence', 'privilege_escalation', 'defense_evasion', 'credential_access', 'discovery', 'lateral_movement', 'collection', 'command_and_control', 'exfiltration', 'impact'];
