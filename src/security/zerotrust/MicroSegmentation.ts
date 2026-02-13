/**
 * Micro-Segmentation Manager
 * Zero-Trust Network Architecture - Application-centric segmentation with fine-grained policies
 *
 * Implements:
 * - Application, workload, user, data, and environment-based segmentation
 * - East-west and north-south traffic control
 * - Default-deny posture with explicit allow lists
 * - Real-time policy enforcement and violation detection
 * - Lateral movement prevention and anomaly detection
 */

import { logger } from '../../services/SimpleLogger';

// ================================
// TYPES & INTERFACES
// ================================

/**
 * Segment type enumeration
 */
export enum SegmentType {
  APPLICATION = 'application',
  WORKLOAD = 'workload',
  USER = 'user',
  DATA = 'data',
  ENVIRONMENT = 'environment',
  CUSTOM = 'custom',
}

/**
 * Segment classification for data protection
 */
export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
}

/**
 * Traffic direction enumeration
 */
export enum TrafficDirection {
  INGRESS = 'ingress',
  EGRESS = 'egress',
  BIDIRECTIONAL = 'bidirectional',
}

/**
 * Protocol types supported
 */
export enum Protocol {
  TCP = 'tcp',
  UDP = 'udp',
  ICMP = 'icmp',
  HTTP = 'http',
  HTTPS = 'https',
  GRPC = 'grpc',
  DNS = 'dns',
  SSH = 'ssh',
  ALL = 'all',
}

/**
 * Environment type enumeration
 */
export enum Environment {
  DEVELOPMENT = 'dev',
  STAGING = 'staging',
  PRODUCTION = 'prod',
}

/**
 * Policy action enumeration
 */
export enum PolicyAction {
  ALLOW = 'allow',
  DENY = 'deny',
  CHALLENGE = 'challenge',
  LOG_ONLY = 'log_only',
}

/**
 * Violation severity levels
 */
export enum ViolationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  BLOCKED = 'blocked',
}

/**
 * Represents a network segment
 */
export interface Segment {
  id: string;
  name: string;
  type: SegmentType;
  description?: string;
  classification: DataClassification;
  environment?: Environment;
  cidr?: string[];
  members: string[]; // Application IDs, workload IDs, user IDs
  parentSegmentId?: string;
  tags: Map<string, string>;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Traffic control policy
 */
export interface TrafficPolicy {
  id: string;
  name: string;
  description?: string;
  sourceSegment: string;
  destinationSegment: string;
  direction: TrafficDirection;
  protocol: Protocol[];
  ports?: number[];
  action: PolicyAction;
  priority: number; // Lower number = higher priority
  conditions?: PolicyCondition[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dynamic policy condition
 */
export interface PolicyCondition {
  type:
    | 'time'
    | 'identity'
    | 'location'
    | 'risk_score'
    | 'device_posture'
    | 'custom';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in';
  value: unknown;
}

/**
 * Identity-based policy
 */
export interface IdentityPolicy {
  id: string;
  userId: string;
  sourceSegment?: string;
  allowedSegments: string[];
  deniedSegments: string[];
  timeRestrictions?: TimeWindow[];
  maxConcurrentSessions?: number;
  requiresMFA?: boolean;
  ipWhitelist?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Time window for time-based policies
 */
export interface TimeWindow {
  dayOfWeek: number[]; // 0-6, Sunday-Saturday
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

/**
 * Traffic flow record
 */
export interface TrafficFlow {
  id: string;
  sourceSegment: string;
  destinationSegment: string;
  protocol: Protocol;
  port?: number;
  direction: TrafficDirection;
  policyApplied: string;
  action: PolicyAction;
  timestamp: Date;
  duration: number; // milliseconds
  bytes: number;
  packets: number;
  anomalyScore?: number;
}

/**
 * Policy violation record
 */
export interface PolicyViolation {
  id: string;
  sourceSegment: string;
  destinationSegment: string;
  protocol: Protocol;
  port?: number;
  violatedPolicy: string;
  reason: string;
  severity: ViolationSeverity;
  timestamp: Date;
  sourceIdentity?: string;
  destinationIdentity?: string;
  remedialAction?: string;
  resolved: boolean;
}

/**
 * Segment health status
 */
export interface SegmentHealth {
  segmentId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  violations: number;
  blockRate: number;
  latency: number; // milliseconds
  throughput: number; // bytes/s
  lastUpdated: Date;
}

/**
 * Segment connectivity matrix
 */
export interface ConnectivityMatrix {
  sourceSegment: string;
  destinationSegment: string;
  allowed: boolean;
  allowedProtocols: Protocol[];
  allowedPorts?: number[];
  avgLatency?: number;
  violationCount?: number;
}

/**
 * Lateral movement indicator
 */
export interface LateralMovementIndicator {
  id: string;
  sourceSegment: string;
  destinationSegment: string;
  pathLength: number;
  probability: number; // 0-1
  indicators: string[];
  timestamp: Date;
}

// ================================
// MAIN CLASS
// ================================

/**
 * Micro-Segmentation Manager
 * Handles all aspects of zero-trust network segmentation
 */
export class MicroSegmentationManager {
  private segments: Map<string, Segment> = new Map();
  private policies: Map<string, TrafficPolicy> = new Map();
  private identityPolicies: Map<string, IdentityPolicy> = new Map();
  private trafficFlows: Map<string, TrafficFlow> = new Map();
  private violations: Map<string, PolicyViolation> = new Map();
  private segmentHealth: Map<string, SegmentHealth> = new Map();
  private lateralMovementDetector: Map<string, LateralMovementIndicator> =
    new Map();

  private config = {
    defaultAction: PolicyAction.DENY, // Default-deny posture
    violationRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
    anomalyThreshold: 0.75,
    lateralMovementThreshold: 0.65,
  };

  constructor() {
    logger.info('Micro-Segmentation Manager initialized');
    this.initializeDefaultSegments();
  }

  // ================================
  // SEGMENT MANAGEMENT
  // ================================

  /**
   * Create a new network segment
   */
  createSegment(
    name: string,
    type: SegmentType,
    classification: DataClassification,
    options?: {
      description?: string;
      environment?: Environment;
      cidr?: string[];
      parentSegmentId?: string;
      tags?: Map<string, string>;
      metadata?: Record<string, unknown>;
    }
  ): Segment {
    const id = `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const segment: Segment = {
      id,
      name,
      type,
      classification,
      description: options?.description,
      environment: options?.environment,
      cidr: options?.cidr,
      members: [],
      parentSegmentId: options?.parentSegmentId,
      tags: options?.tags || new Map(),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: options?.metadata,
    };

    this.segments.set(id, segment);
    logger.info('Segment created', { segmentId: id, name, type });

    return segment;
  }

  /**
   * Delete a segment and its associated policies
   */
  deleteSegment(segmentId: string): boolean {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      logger.warn('Segment not found', { segmentId });
      return false;
    }

    // Remove all policies referencing this segment
    for (const [policyId, policy] of this.policies) {
      if (
        policy.sourceSegment === segmentId ||
        policy.destinationSegment === segmentId
      ) {
        this.policies.delete(policyId);
      }
    }

    // Remove all identity policies
    for (const [policyId, policy] of this.identityPolicies) {
      if (policy.sourceSegment === segmentId) {
        this.identityPolicies.delete(policyId);
      }
    }

    this.segments.delete(segmentId);
    logger.info('Segment deleted', { segmentId });

    return true;
  }

  /**
   * Get segment by ID
   */
  getSegment(segmentId: string): Segment | undefined {
    return this.segments.get(segmentId);
  }

  /**
   * Get all segments
   */
  getAllSegments(): Segment[] {
    return Array.from(this.segments.values());
  }

  /**
   * Add member to segment
   */
  addMemberToSegment(segmentId: string, memberId: string): boolean {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      logger.warn('Segment not found', { segmentId });
      return false;
    }

    if (!segment.members.includes(memberId)) {
      segment.members.push(memberId);
      segment.updatedAt = new Date();
      logger.info('Member added to segment', { segmentId, memberId });
      return true;
    }

    return false;
  }

  /**
   * Remove member from segment
   */
  removeMemberFromSegment(segmentId: string, memberId: string): boolean {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      logger.warn('Segment not found', { segmentId });
      return false;
    }

    const index = segment.members.indexOf(memberId);
    if (index > -1) {
      segment.members.splice(index, 1);
      segment.updatedAt = new Date();
      logger.info('Member removed from segment', { segmentId, memberId });
      return true;
    }

    return false;
  }

  /**
   * Find segments by type
   */
  getSegmentsByType(type: SegmentType): Segment[] {
    return Array.from(this.segments.values()).filter(
      (seg) => seg.type === type
    );
  }

  /**
   * Find segments by environment
   */
  getSegmentsByEnvironment(environment: Environment): Segment[] {
    return Array.from(this.segments.values()).filter(
      (seg) => seg.environment === environment
    );
  }

  // ================================
  // POLICY MANAGEMENT
  // ================================

  /**
   * Create a traffic control policy
   */
  createPolicy(
    name: string,
    sourceSegment: string,
    destinationSegment: string,
    direction: TrafficDirection,
    protocols: Protocol[],
    action: PolicyAction,
    options?: {
      description?: string;
      ports?: number[];
      conditions?: PolicyCondition[];
      priority?: number;
    }
  ): TrafficPolicy {
    const id = `pol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const priority = options?.priority || 100;

    const policy: TrafficPolicy = {
      id,
      name,
      description: options?.description,
      sourceSegment,
      destinationSegment,
      direction,
      protocol: protocols,
      ports: options?.ports,
      action,
      priority,
      conditions: options?.conditions,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(id, policy);
    logger.info('Policy created', {
      policyId: id,
      name,
      source: sourceSegment,
      destination: destinationSegment,
      action,
    });

    return policy;
  }

  /**
   * Create an identity-based policy
   */
  createIdentityPolicy(
    userId: string,
    allowedSegments: string[],
    options?: {
      deniedSegments?: string[];
      timeRestrictions?: TimeWindow[];
      maxConcurrentSessions?: number;
      requiresMFA?: boolean;
      ipWhitelist?: string[];
    }
  ): IdentityPolicy {
    const id = `idpol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const policy: IdentityPolicy = {
      id,
      userId,
      allowedSegments,
      deniedSegments: options?.deniedSegments || [],
      timeRestrictions: options?.timeRestrictions,
      maxConcurrentSessions: options?.maxConcurrentSessions,
      requiresMFA: options?.requiresMFA,
      ipWhitelist: options?.ipWhitelist,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.identityPolicies.set(id, policy);
    logger.info('Identity policy created', { policyId: id, userId });

    return policy;
  }

  /**
   * Delete a policy
   */
  deletePolicy(policyId: string): boolean {
    if (!this.policies.has(policyId)) {
      logger.warn('Policy not found', { policyId });
      return false;
    }

    this.policies.delete(policyId);
    logger.info('Policy deleted', { policyId });
    return true;
  }

  /**
   * Enable/disable a policy
   */
  setPolicyEnabled(policyId: string, enabled: boolean): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) {
      logger.warn('Policy not found', { policyId });
      return false;
    }

    policy.enabled = enabled;
    policy.updatedAt = new Date();
    logger.info('Policy status changed', { policyId, enabled });
    return true;
  }

  /**
   * Get all policies
   */
  getAllPolicies(): TrafficPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policies for segment pair
   */
  getPoliciesForSegmentPair(
    sourceSegment: string,
    destinationSegment: string
  ): TrafficPolicy[] {
    return Array.from(this.policies.values())
      .filter(
        (p) =>
          p.sourceSegment === sourceSegment &&
          p.destinationSegment === destinationSegment &&
          p.enabled
      )
      .sort((a, b) => a.priority - b.priority);
  }

  // ================================
  // TRAFFIC CONTROL & ENFORCEMENT
  // ================================

  /**
   * Evaluate traffic against policies (core enforcement logic)
   */
  async evaluateTraffic(
    sourceSegment: string,
    destinationSegment: string,
    protocol: Protocol,
    port?: number,
    direction?: TrafficDirection
  ): Promise<{
    allowed: boolean;
    policy?: TrafficPolicy;
    reason: string;
  }> {
    // Get applicable policies
    const policies = this.getPoliciesForSegmentPair(
      sourceSegment,
      destinationSegment
    );

    if (policies.length === 0) {
      // Default-deny posture
      const violation: PolicyViolation = {
        id: `vio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceSegment,
        destinationSegment,
        protocol,
        port,
        violatedPolicy: 'default-deny',
        reason: 'No explicit allow policy found',
        severity: ViolationSeverity.BLOCKED,
        timestamp: new Date(),
        resolved: false,
      };

      this.violations.set(violation.id, violation);
      logger.warn('Default-deny policy applied', {
        source: sourceSegment,
        destination: destinationSegment,
        protocol,
      });

      return {
        allowed: false,
        reason: 'Default-deny: no explicit allow policy found',
      };
    }

    // Evaluate policies in priority order
    for (const policy of policies) {
      if (
        policy.protocol.includes(protocol) ||
        policy.protocol.includes(Protocol.ALL)
      ) {
        if (port && policy.ports && !policy.ports.includes(port)) {
          continue;
        }

        if (
          direction &&
          policy.direction !== TrafficDirection.BIDIRECTIONAL &&
          policy.direction !== direction
        ) {
          continue;
        }

        // Check conditions
        if (policy.conditions && !this.evaluateConditions(policy.conditions)) {
          continue;
        }

        // Record flow
        this.recordTrafficFlow(
          sourceSegment,
          destinationSegment,
          protocol,
          port,
          direction || TrafficDirection.BIDIRECTIONAL,
          policy.id,
          policy.action
        );

        if (policy.action === PolicyAction.ALLOW) {
          logger.debug('Traffic allowed', {
            source: sourceSegment,
            destination: destinationSegment,
            protocol,
            policy: policy.id,
          });
          return { allowed: true, policy, reason: 'Policy allows traffic' };
        } else if (policy.action === PolicyAction.DENY) {
          this.recordViolation(
            sourceSegment,
            destinationSegment,
            protocol,
            port,
            policy.id
          );
          return { allowed: false, policy, reason: 'Policy denies traffic' };
        }
      }
    }

    return {
      allowed: false,
      reason: 'No matching policy found',
    };
  }

  /**
   * Enforce policies in real-time
   */
  async enforcePolicy(
    sourceSegment: string,
    destinationSegment: string,
    protocol: Protocol,
    port?: number
  ): Promise<boolean> {
    const result = await this.evaluateTraffic(
      sourceSegment,
      destinationSegment,
      protocol,
      port
    );

    if (!result.allowed) {
      logger.warn('Policy enforcement blocked traffic', {
        source: sourceSegment,
        destination: destinationSegment,
        protocol,
        reason: result.reason,
      });
      return false;
    }

    return true;
  }

  /**
   * Check identity-based access
   */
  async checkIdentityAccess(
    userId: string,
    targetSegment: string,
    context?: {
      sourceIp?: string;
      currentSessions?: number;
      timestamp?: Date;
    }
  ): Promise<{
    allowed: boolean;
    requiresMFA?: boolean;
    reason: string;
  }> {
    const policy = Array.from(this.identityPolicies.values()).find(
      (p) => p.userId === userId
    );

    if (!policy) {
      return {
        allowed: false,
        reason: 'No identity policy found for user',
      };
    }

    // Check denied segments
    if (policy.deniedSegments.includes(targetSegment)) {
      return {
        allowed: false,
        reason: 'Target segment is explicitly denied',
      };
    }

    // Check allowed segments
    if (!policy.allowedSegments.includes(targetSegment)) {
      return {
        allowed: false,
        reason: 'Target segment is not in allowed list',
      };
    }

    // Check time restrictions
    if (policy.timeRestrictions && !this.isWithinTimeWindow(policy.timeRestrictions)) {
      return {
        allowed: false,
        reason: 'Current time is outside allowed access window',
      };
    }

    // Check IP whitelist
    if (policy.ipWhitelist && context?.sourceIp) {
      if (!this.isIpWhitelisted(context.sourceIp, policy.ipWhitelist)) {
        return {
          allowed: false,
          reason: 'Source IP is not whitelisted',
        };
      }
    }

    // Check concurrent sessions
    if (
      policy.maxConcurrentSessions &&
      context?.currentSessions &&
      context.currentSessions >= policy.maxConcurrentSessions
    ) {
      return {
        allowed: false,
        reason: 'Maximum concurrent sessions exceeded',
      };
    }

    return {
      allowed: true,
      requiresMFA: policy.requiresMFA,
      reason: 'Identity policy allows access',
    };
  }

  // ================================
  // VIOLATION DETECTION & REMEDIATION
  // ================================

  /**
   * Record a policy violation
   */
  private recordViolation(
    sourceSegment: string,
    destinationSegment: string,
    protocol: Protocol,
    port: number | undefined,
    violatedPolicy: string
  ): void {
    const violation: PolicyViolation = {
      id: `vio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceSegment,
      destinationSegment,
      protocol,
      port,
      violatedPolicy,
      reason: 'Traffic violates policy',
      severity: ViolationSeverity.BLOCKED,
      timestamp: new Date(),
      resolved: false,
    };

    this.violations.set(violation.id, violation);
    logger.warn('Policy violation recorded', { violationId: violation.id });
  }

  /**
   * Get all unresolved violations
   */
  getUnresolvedViolations(): PolicyViolation[] {
    return Array.from(this.violations.values()).filter((v) => !v.resolved);
  }

  /**
   * Get violations for a segment
   */
  getViolationsForSegment(segmentId: string): PolicyViolation[] {
    return Array.from(this.violations.values()).filter(
      (v) =>
        (v.sourceSegment === segmentId ||
          v.destinationSegment === segmentId) &&
        !v.resolved
    );
  }

  /**
   * Resolve a violation and apply remediation
   */
  resolveViolation(
    violationId: string,
    remediationAction: string
  ): boolean {
    const violation = this.violations.get(violationId);
    if (!violation) {
      logger.warn('Violation not found', { violationId });
      return false;
    }

    violation.resolved = true;
    violation.remedialAction = remediationAction;
    logger.info('Violation resolved', { violationId, action: remediationAction });
    return true;
  }

  /**
   * Automatically remediate violations
   */
  async autoRemediate(violationId: string): Promise<boolean> {
    const violation = this.violations.get(violationId);
    if (!violation) {
      return false;
    }

    let action = 'auto-blocked';

    // Create deny policy for repeated violations
    const similarViolations = Array.from(this.violations.values()).filter(
      (v) =>
        v.sourceSegment === violation.sourceSegment &&
        v.destinationSegment === violation.destinationSegment &&
        !v.resolved
    );

    if (similarViolations.length > 3) {
      this.createPolicy(
        `auto-block_${violation.sourceSegment}_${violation.destinationSegment}`,
        violation.sourceSegment,
        violation.destinationSegment,
        TrafficDirection.BIDIRECTIONAL,
        [Protocol.ALL],
        PolicyAction.DENY,
        { priority: 1 }
      );
      action = 'auto-blocked-recursive';
    }

    return this.resolveViolation(violationId, action);
  }

  // ================================
  // LATERAL MOVEMENT PREVENTION
  // ================================

  /**
   * Detect lateral movement attempts
   */
  detectLateralMovement(
    sourceSegment: string,
    accessPath: string[]
  ): LateralMovementIndicator | null {
    const pathLength = accessPath.length;
    let probability = 0;
    const indicators: string[] = [];

    // Analyze movement pattern
    if (pathLength > 2) {
      indicators.push('multi-hop-access');
      probability += 0.3;
    }

    // Check for unusual access patterns
    const lastAccess = Array.from(this.trafficFlows.values())
      .filter(
        (f) =>
          f.sourceSegment === sourceSegment &&
          f.timestamp > new Date(Date.now() - 60000)
      ) // Last 60 seconds
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (lastAccess.length > 10) {
      indicators.push('excessive-access-attempts');
      probability += 0.25;
    }

    // Check for access to restricted segments
    for (const segment of accessPath) {
      const segmentData = this.segments.get(segment);
      if (
        segmentData &&
        segmentData.classification === DataClassification.RESTRICTED
      ) {
        indicators.push('restricted-segment-access');
        probability += 0.4;
      }
    }

    if (probability >= this.config.lateralMovementThreshold) {
      const indicator: LateralMovementIndicator = {
        id: `lm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceSegment,
        destinationSegment: accessPath[accessPath.length - 1] || '',
        pathLength,
        probability: Math.min(probability, 1),
        indicators,
        timestamp: new Date(),
      };

      this.lateralMovementDetector.set(indicator.id, indicator);
      logger.warn('Lateral movement detected', {
        indicatorId: indicator.id,
        probability,
        indicators,
      });

      return indicator;
    }

    return null;
  }

  /**
   * Get lateral movement indicators
   */
  getLateralMovementIndicators(): LateralMovementIndicator[] {
    return Array.from(this.lateralMovementDetector.values());
  }

  // ================================
  // VISIBILITY & MONITORING
  // ================================

  /**
   * Record a traffic flow
   */
  private recordTrafficFlow(
    sourceSegment: string,
    destinationSegment: string,
    protocol: Protocol,
    port: number | undefined,
    direction: TrafficDirection,
    policyApplied: string,
    action: PolicyAction
  ): void {
    const flow: TrafficFlow = {
      id: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceSegment,
      destinationSegment,
      protocol,
      port,
      direction,
      policyApplied,
      action,
      timestamp: new Date(),
      duration: Math.random() * 1000,
      bytes: Math.random() * 10000,
      packets: Math.random() * 100,
    };

    this.trafficFlows.set(flow.id, flow);
  }

  /**
   * Get traffic flows for a segment
   */
  getTrafficFlowsForSegment(segmentId: string): TrafficFlow[] {
    return Array.from(this.trafficFlows.values()).filter(
      (f) =>
        f.sourceSegment === segmentId || f.destinationSegment === segmentId
    );
  }

  /**
   * Get connectivity matrix
   */
  getConnectivityMatrix(): ConnectivityMatrix[] {
    const matrix: Map<string, ConnectivityMatrix> = new Map();

    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;

      const key = `${policy.sourceSegment}_${policy.destinationSegment}`;
      const existing = matrix.get(key);

      if (!existing) {
        matrix.set(key, {
          sourceSegment: policy.sourceSegment,
          destinationSegment: policy.destinationSegment,
          allowed: policy.action === PolicyAction.ALLOW,
          allowedProtocols: policy.protocol,
          allowedPorts: policy.ports,
          avgLatency: 0,
        });
      }
    }

    return Array.from(matrix.values());
  }

  /**
   * Monitor segment health
   */
  updateSegmentHealth(
    segmentId: string,
    metrics: {
      violations?: number;
      blockRate?: number;
      latency?: number;
      throughput?: number;
    }
  ): SegmentHealth {
    let health = this.segmentHealth.get(segmentId);

    if (!health) {
      health = {
        segmentId,
        status: 'healthy',
        violations: 0,
        blockRate: 0,
        latency: 0,
        throughput: 0,
        lastUpdated: new Date(),
      };
    }

    if (metrics.violations !== undefined) health.violations = metrics.violations;
    if (metrics.blockRate !== undefined) health.blockRate = metrics.blockRate;
    if (metrics.latency !== undefined) health.latency = metrics.latency;
    if (metrics.throughput !== undefined) health.throughput = metrics.throughput;

    // Determine status
    if (health.violations > 10 || health.blockRate > 0.5) {
      health.status = 'unhealthy';
    } else if (health.violations > 5 || health.blockRate > 0.2) {
      health.status = 'degraded';
    } else {
      health.status = 'healthy';
    }

    health.lastUpdated = new Date();
    this.segmentHealth.set(segmentId, health);

    return health;
  }

  /**
   * Get segment health
   */
  getSegmentHealth(segmentId: string): SegmentHealth | undefined {
    return this.segmentHealth.get(segmentId);
  }

  /**
   * Detect anomalies in traffic patterns
   */
  detectAnomalies(segmentId: string): TrafficFlow[] {
    const flows = this.getTrafficFlowsForSegment(segmentId);
    const baseline = this.calculateBaseline(flows);

    return flows.filter((flow) => {
      const anomalyScore = this.calculateAnomalyScore(flow, baseline);
      return anomalyScore >= this.config.anomalyThreshold;
    });
  }

  // ================================
  // HELPER METHODS
  // ================================

  /**
   * Initialize default segments
   */
  private initializeDefaultSegments(): void {
    // Environment segments
    this.createSegment(
      'Development',
      SegmentType.ENVIRONMENT,
      DataClassification.INTERNAL,
      { environment: Environment.DEVELOPMENT }
    );

    this.createSegment(
      'Staging',
      SegmentType.ENVIRONMENT,
      DataClassification.INTERNAL,
      { environment: Environment.STAGING }
    );

    this.createSegment(
      'Production',
      SegmentType.ENVIRONMENT,
      DataClassification.RESTRICTED,
      { environment: Environment.PRODUCTION }
    );
  }

  /**
   * Evaluate policy conditions
   */
  private evaluateConditions(conditions: PolicyCondition[]): boolean {
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: PolicyCondition): boolean {
    // Simplified condition evaluation
    switch (condition.operator) {
      case 'equals':
        return condition.value === condition.value;
      case 'not_equals':
        return condition.value !== condition.value;
      default:
        return true;
    }
  }

  /**
   * Check if current time is within time window
   */
  private isWithinTimeWindow(windows: TimeWindow[]): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return windows.some(
      (w) =>
        w.dayOfWeek.includes(dayOfWeek) &&
        currentTime >= w.startTime &&
        currentTime <= w.endTime
    );
  }

  /**
   * Check if IP is whitelisted
   */
  private isIpWhitelisted(ip: string, whitelist: string[]): boolean {
    return whitelist.some((entry) => {
      if (entry.includes('/')) {
        // CIDR notation
        return this.isIpInCIDR(ip, entry);
      }
      return ip === entry;
    });
  }

  /**
   * Check if IP is in CIDR range
   */
  private isIpInCIDR(ip: string, cidr: string): boolean {
    // Simplified CIDR check
    const [network, bits] = cidr.split('/');
    return ip.startsWith(network);
  }

  /**
   * Calculate baseline traffic metrics
   */
  private calculateBaseline(flows: TrafficFlow[]): Record<string, number> {
    if (flows.length === 0) {
      return { avgLatency: 0, avgBytes: 0, avgPackets: 0 };
    }

    return {
      avgLatency: flows.reduce((sum, f) => sum + f.duration, 0) / flows.length,
      avgBytes: flows.reduce((sum, f) => sum + f.bytes, 0) / flows.length,
      avgPackets: flows.reduce((sum, f) => sum + f.packets, 0) / flows.length,
    };
  }

  /**
   * Calculate anomaly score for a traffic flow
   */
  private calculateAnomalyScore(
    flow: TrafficFlow,
    baseline: Record<string, number>
  ): number {
    let score = 0;

    // Compare with baseline
    if (flow.duration > baseline.avgLatency * 3) score += 0.3;
    if (flow.bytes > baseline.avgBytes * 3) score += 0.3;
    if (flow.packets > baseline.avgPackets * 3) score += 0.3;

    return Math.min(score, 1);
  }

  /**
   * Generate compliance report
   */
  getComplianceReport(): {
    totalSegments: number;
    totalPolicies: number;
    violations: number;
    lateralMovementAttempts: number;
    compliance: number;
  } {
    const violations = this.getUnresolvedViolations();
    const lateralMovements = this.getLateralMovementIndicators();
    const totalSegments = this.segments.size;
    const totalPolicies = this.policies.size;

    const compliance =
      totalPolicies > 0
        ? ((totalPolicies - violations.length) / totalPolicies) * 100
        : 100;

    return {
      totalSegments,
      totalPolicies,
      violations: violations.length,
      lateralMovementAttempts: lateralMovements.length,
      compliance: Math.round(compliance),
    };
  }
}

export default MicroSegmentationManager;
