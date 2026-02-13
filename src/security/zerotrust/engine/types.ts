/**
 * Zero Trust Policy Engine Types
 *
 * All interfaces, enums, and type definitions for the Zero Trust system.
 *
 * @module ZeroTrustTypes
 */

/**
 * Policy action types
 */
export enum PolicyAction {
  ALLOW = 'allow',
  DENY = 'deny',
  CHALLENGE = 'challenge',
  AUDIT = 'audit',
  QUARANTINE = 'quarantine'
}

/**
 * Policy types
 */
export enum PolicyType {
  ACCESS = 'access',
  DEVICE = 'device',
  NETWORK = 'network',
  DATA = 'data',
  APPLICATION = 'application'
}

/**
 * Trust level classification
 */
export enum TrustLevel {
  CRITICAL = 'critical',      // < 20
  LOW = 'low',                 // 20-40
  MEDIUM = 'medium',           // 40-70
  HIGH = 'high',               // 70-85
  VERY_HIGH = 'very_high'      // > 85
}

/**
 * Risk level classification
 */
export enum RiskLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * User context for policy evaluation
 */
export interface UserContext {
  userId: string
  email: string
  roles: string[]
  groups: string[]
  department?: string
  riskProfile?: 'low' | 'medium' | 'high'
  lastAuthTime: number
  authMethods: string[]
  mfaEnabled: boolean
}

/**
 * Device context for policy evaluation
 */
export interface DeviceContext {
  deviceId: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'iot'
  osType: string
  osVersion: string
  hardwareId: string
  encryptionEnabled: boolean
  antivirusStatus: 'active' | 'outdated' | 'disabled'
  lastHealthCheck: number
  complianceStatus: 'compliant' | 'non_compliant'
  isJailbroken?: boolean
  vpnConnected: boolean
}

/**
 * Network context for policy evaluation
 */
export interface NetworkContext {
  ipAddress: string
  isVPN: boolean
  isProxy: boolean
  geolocation?: {
    country: string
    city?: string
    latitude: number
    longitude: number
  }
  asn?: string
  networkSegment?: string
  bandwidth?: number
  latency?: number
}

/**
 * Resource context for policy evaluation
 */
export interface ResourceContext {
  resourceId: string
  resourceType: string
  classification: 'public' | 'internal' | 'confidential' | 'restricted'
  owner?: string
  accessLevel: 'read' | 'write' | 'execute' | 'admin'
  requiredMfa?: boolean
  requiredEncryption?: boolean
}

/**
 * Complete request context for evaluation
 */
export interface EvaluationContext {
  requestId: string
  timestamp: number
  user: UserContext
  device: DeviceContext
  network: NetworkContext
  resource: ResourceContext
  action: string
  metadata?: Record<string, unknown>
}

/**
 * Policy condition for evaluation
 */
export interface PolicyCondition {
  type: 'user' | 'device' | 'network' | 'time' | 'resource' | 'risk' | 'custom'
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'contains' | 'matches'
  field: string
  value: unknown
  negate?: boolean
}

/**
 * Policy definition
 */
export interface ZeroTrustPolicy {
  id: string
  version: number
  name: string
  description?: string
  type: PolicyType
  enabled: boolean
  priority: number
  conditions: PolicyCondition[]
  action: PolicyAction
  stepUpRequired?: boolean
  minimumTrustScore?: number
  metadata?: Record<string, unknown>
  createdAt: number
  updatedAt: number
  createdBy: string
}

/**
 * Trust score components
 */
export interface TrustScoreComponents {
  userTrustScore: number
  deviceTrustScore: number
  networkTrustScore: number
  sessionTrustScore: number
  riskAdjustment: number
}

/**
 * Policy evaluation result
 */
export interface PolicyEvaluationResult {
  requestId: string
  decision: PolicyAction
  matchedPolicies: string[]
  trustScores: TrustScoreComponents
  compositeTrustScore: number
  trustLevel: TrustLevel
  riskLevel: RiskLevel
  requiresStepUp: boolean
  requiresMfa: boolean
  sessionTimeout?: number
  reasoning: string
  timestamp: number
}

/**
 * Trust score weights configuration
 */
export interface TrustScoreWeights {
  user: number
  device: number
  network: number
  session: number
}

/**
 * Risk thresholds configuration
 */
export interface RiskThresholds {
  critical: number
  high: number
  medium: number
  low: number
}

/**
 * Policy store statistics
 */
export interface PolicyStatistics {
  totalPolicies: number
  enabledPolicies: number
  policyTypes: Record<string, number>
  cacheSize: number
}
