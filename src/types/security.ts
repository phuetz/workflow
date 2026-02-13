/**
 * Advanced Security & Compliance Types
 * Enterprise-grade security for blockchain, edge devices, and multi-agent systems
 */

// ================================
// BLOCKCHAIN SECURITY TYPES
// ================================

export interface BlockchainTransaction {
  from: string;
  to: string;
  value: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
  nonce?: number;
  chainId?: number;
}

export interface TransactionSimulation {
  success: boolean;
  gasUsed: string;
  gasPrice: string;
  totalCost: string;
  changes: StateChange[];
  warnings: string[];
  errors: string[];
  timestamp: string;
}

export interface StateChange {
  address: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  type: 'balance' | 'storage' | 'code';
}

export interface SmartContractAudit {
  contractAddress: string;
  network: string;
  issues: SecurityIssue[];
  riskScore: number;
  timestamp: string;
  recommendations: string[];
}

export interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: string;
  description: string;
  location?: string;
  remediation: string;
}

export interface ApprovalCheck {
  token: string;
  spender: string;
  amount: string;
  isUnlimited: boolean;
  risk: 'high' | 'medium' | 'low';
}

// ================================
// EDGE DEVICE SECURITY TYPES
// ================================

export interface DeviceIdentity {
  deviceId: string;
  publicKey: string;
  certificate: string;
  certificateChain: string[];
  issuer: string;
  validFrom: string;
  validUntil: string;
}

export interface MutualTLSConfig {
  clientCert: string;
  clientKey: string;
  serverCA: string;
  verifyPeer: boolean;
  minTLSVersion: '1.2' | '1.3';
}

export interface EncryptedMessage {
  encryptedData: string;
  iv: string;
  authTag: string;
  algorithm: 'AES-256-GCM';
  keyId: string;
  timestamp: string;
}

export interface SecureBootStatus {
  enabled: boolean;
  firmwareHash: string;
  bootloaderHash: string;
  verified: boolean;
  trustChain: string[];
  lastVerified: string;
}

export interface OTAUpdate {
  version: string;
  signature: string;
  publicKey: string;
  checksum: string;
  algorithm: 'RSA-SHA256' | 'ECDSA-SHA256';
  payload: string;
  metadata: Record<string, unknown>;
}

export interface DeviceCertificate {
  deviceId: string;
  certificate: string;
  privateKey: string;
  issuer: string;
  validFrom: string;
  validUntil: string;
  revoked: boolean;
}

export interface KeyRotationPolicy {
  rotationInterval: number; // milliseconds
  keyType: 'RSA' | 'ECDSA' | 'AES';
  keySize: number;
  autoRotate: boolean;
  notifyBeforeExpiry: number; // milliseconds
}

// ================================
// ZERO-TRUST FRAMEWORK TYPES
// ================================

export interface ZeroTrustContext {
  userId: string;
  deviceId: string;
  location: GeolocationData;
  network: NetworkContext;
  timestamp: string;
  sessionId: string;
}

export interface GeolocationData {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  ipAddress: string;
}

export interface NetworkContext {
  ipAddress: string;
  vpn: boolean;
  proxy: boolean;
  tor: boolean;
  riskScore: number;
  asn: string;
  isp: string;
}

export interface TrustScore {
  overall: number; // 0-100
  identity: number;
  device: number;
  location: number;
  behavior: number;
  factors: TrustFactor[];
  timestamp: string;
}

export interface TrustFactor {
  name: string;
  score: number;
  weight: number;
  details: string;
}

export interface AccessPolicy {
  resourceId: string;
  minTrustScore: number;
  requiredFactors: string[];
  allowedLocations?: string[];
  blockedLocations?: string[];
  allowedNetworks?: string[];
  maxSessionDuration?: number;
  requireMFA?: boolean;
}

export interface MicroSegment {
  id: string;
  name: string;
  resources: string[];
  allowedUsers: string[];
  allowedDevices: string[];
  policies: AccessPolicy[];
  isolationLevel: 'strict' | 'moderate' | 'lenient';
}

export interface ThreatDetection {
  threatId: string;
  type: 'anomaly' | 'intrusion' | 'malware' | 'phishing' | 'ddos' | 'other';
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  indicators: ThreatIndicator[];
  timestamp: string;
  mitigated: boolean;
}

export interface ThreatIndicator {
  type: string;
  value: string;
  confidence: number;
}

// ================================
// WEB3 COMPLIANCE TYPES
// ================================

export interface AMLCheck {
  address: string;
  network: string;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: AMLFlag[];
  screening: ScreeningResult;
  timestamp: string;
}

export interface AMLFlag {
  type: 'sanctions' | 'pep' | 'darknet' | 'mixer' | 'scam' | 'hack' | 'other';
  description: string;
  confidence: number;
  source: string;
}

export interface ScreeningResult {
  ofac: boolean; // US Treasury OFAC
  eu: boolean; // EU Sanctions
  un: boolean; // UN Sanctions
  interpol: boolean;
  custom: boolean;
  matches: SanctionMatch[];
}

export interface SanctionMatch {
  listName: string;
  matchType: 'exact' | 'partial' | 'fuzzy';
  confidence: number;
  entity: string;
  details: Record<string, unknown>;
}

export interface KYCVerification {
  userId: string;
  walletAddress: string;
  status: 'pending' | 'approved' | 'rejected' | 'review';
  level: 'basic' | 'intermediate' | 'advanced';
  documents: KYCDocument[];
  verifiedAt?: string;
  expiresAt?: string;
}

export interface KYCDocument {
  type: 'passport' | 'id_card' | 'drivers_license' | 'proof_of_address' | 'selfie';
  status: 'pending' | 'verified' | 'rejected';
  url: string;
  uploadedAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface TransactionRisk {
  transactionId: string;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  requiresReview: boolean;
  autoApproved: boolean;
  timestamp: string;
}

export interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
}

export interface SuspiciousActivity {
  activityId: string;
  type: 'structuring' | 'large_transfer' | 'rapid_movement' | 'mixer' | 'new_address' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  addresses: string[];
  amounts: string[];
  timestamp: string;
  reported: boolean;
}

export interface ComplianceReport {
  reportId: string;
  type: 'sar' | 'ctr' | 'monthly' | 'quarterly' | 'annual' | 'custom';
  period: {
    start: string;
    end: string;
  };
  transactions: number;
  flagged: number;
  reported: number;
  data: Record<string, unknown>;
  generatedAt: string;
}

// ================================
// MULTI-AGENT AUDIT TYPES
// ================================

export interface AgentAuditEntry {
  id: string;
  agentId: string;
  agentType: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  duration: number;
  success: boolean;
  error?: string;
  userId?: string;
  sessionId: string;
  parentAgentId?: string;
  timestamp: string;
  signature: string;
}

export interface AgentAuthentication {
  agentId: string;
  publicKey: string;
  signature: string;
  timestamp: string;
  verified: boolean;
}

export interface AgentPermission {
  agentId: string;
  resource: string;
  actions: string[];
  conditions?: PermissionCondition[];
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
}

export interface PermissionCondition {
  type: 'time' | 'location' | 'rate' | 'data_size' | 'custom';
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: unknown;
}

export interface AgentActivity {
  agentId: string;
  totalActions: number;
  successRate: number;
  averageDuration: number;
  lastActive: string;
  resources: string[];
  errors: AgentError[];
}

export interface AgentError {
  timestamp: string;
  action: string;
  error: string;
  resourceId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  score: number; // 0-1
  type: 'rate' | 'pattern' | 'behavior' | 'resource' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

// ================================
// GENERAL SECURITY TYPES
// ================================

export interface SecurityMetrics {
  blockchain: {
    transactionsSimulated: number;
    contractsAudited: number;
    vulnerabilitiesFound: number;
    averageRiskScore: number;
  };
  edge: {
    devicesAuthenticated: number;
    certificatesIssued: number;
    certificatesRevoked: number;
    otaUpdatesVerified: number;
  };
  zeroTrust: {
    accessChecks: number;
    accessDenied: number;
    averageTrustScore: number;
    threatsDetected: number;
  };
  web3Compliance: {
    amlChecks: number;
    kycVerifications: number;
    suspiciousActivities: number;
    reportsGenerated: number;
  };
  multiAgent: {
    auditEntries: number;
    agentsMonitored: number;
    anomaliesDetected: number;
    permissionChecks: number;
  };
}

export interface SecurityConfig {
  blockchain: {
    enabled: boolean;
    simulateBeforeExecute: boolean;
    auditContracts: boolean;
    maxGasPrice: string;
    maxSlippage: number;
  };
  edge: {
    enabled: boolean;
    requireMutualTLS: boolean;
    encryptCommunication: boolean;
    verifySecureBoot: boolean;
    autoRotateKeys: boolean;
    keyRotationDays: number;
  };
  zeroTrust: {
    enabled: boolean;
    minTrustScore: number;
    requireMFA: boolean;
    verificationInterval: number;
    isolationLevel: 'strict' | 'moderate' | 'lenient';
  };
  web3Compliance: {
    enabled: boolean;
    requireKYC: boolean;
    amlCheckThreshold: number;
    sanctionsScreening: string[];
    autoReportThreshold: number;
  };
  multiAgent: {
    enabled: boolean;
    auditAllActions: boolean;
    requireAuthentication: boolean;
    detectAnomalies: boolean;
    anomalyThreshold: number;
  };
}
