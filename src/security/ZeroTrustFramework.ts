/**
 * Zero-Trust Security Framework
 * "Never trust, always verify" - Continuous verification and least privilege access
 */

import { logger } from '../services/SimpleLogger';
import type {
  ZeroTrustContext,
  TrustScore,
  TrustFactor,
  AccessPolicy,
  MicroSegment,
  ThreatDetection,
  ThreatIndicator,
  GeolocationData,
  NetworkContext,
} from '../types/security';

export class ZeroTrustFramework {
  private trustScores: Map<string, TrustScore> = new Map();
  private accessPolicies: Map<string, AccessPolicy> = new Map();
  private microSegments: Map<string, MicroSegment> = new Map();
  private threats: Map<string, ThreatDetection> = new Map();
  private verificationHistory: Map<string, ZeroTrustContext[]> = new Map();

  // Configuration
  private config = {
    minTrustScore: 70, // Minimum score to grant access
    verificationInterval: 300000, // 5 minutes
    maxFailedVerifications: 3,
    anomalyThreshold: 0.8,
  };

  // ================================
  // CONTINUOUS VERIFICATION
  // ================================

  /**
   * Verify access request - core of zero-trust
   */
  async verifyAccess(
    userId: string,
    resourceId: string,
    context: ZeroTrustContext
  ): Promise<{
    granted: boolean;
    trustScore: TrustScore;
    reason: string;
    requiresMFA?: boolean;
  }> {
    logger.info('Zero-trust access verification', { userId, resourceId });

    try {
      // Step 1: Calculate trust score
      const trustScore = await this.calculateTrustScore(context);

      // Step 2: Get access policy for resource
      const policy = this.accessPolicies.get(resourceId);
      if (!policy) {
        logger.warn('No access policy defined for resource', { resourceId });
        return {
          granted: false,
          trustScore,
          reason: 'No access policy defined',
        };
      }

      // Step 3: Check minimum trust score
      if (trustScore.overall < policy.minTrustScore) {
        logger.warn('Trust score below threshold', {
          userId,
          score: trustScore.overall,
          required: policy.minTrustScore,
        });
        return {
          granted: false,
          trustScore,
          reason: `Trust score ${trustScore.overall} below required ${policy.minTrustScore}`,
        };
      }

      // Step 4: Check required factors
      const factorsMet = this.checkRequiredFactors(trustScore, policy.requiredFactors);
      if (!factorsMet) {
        return {
          granted: false,
          trustScore,
          reason: 'Required trust factors not met',
        };
      }

      // Step 5: Check location restrictions
      if (!this.checkLocationRestrictions(context.location, policy)) {
        return {
          granted: false,
          trustScore,
          reason: 'Location not allowed',
        };
      }

      // Step 6: Check network restrictions
      if (!this.checkNetworkRestrictions(context.network, policy)) {
        return {
          granted: false,
          trustScore,
          reason: 'Network not allowed',
        };
      }

      // Step 7: Check for anomalies
      const anomaly = await this.detectAnomalies(userId, context);
      if (anomaly.isAnomaly && anomaly.severity === 'high' || anomaly.severity === 'critical') {
        logger.warn('Anomalous access pattern detected', { userId, anomaly });
        return {
          granted: false,
          trustScore,
          reason: anomaly.description,
        };
      }

      // Step 8: Check MFA requirement
      const requiresMFA = policy.requireMFA || trustScore.overall < 85;

      // Store verification history
      this.recordVerification(userId, context);

      logger.info('Access granted', { userId, resourceId, trustScore: trustScore.overall });
      return {
        granted: true,
        trustScore,
        reason: 'All checks passed',
        requiresMFA,
      };
    } catch (error) {
      logger.error('Access verification failed', error);
      return {
        granted: false,
        trustScore: { overall: 0, identity: 0, device: 0, location: 0, behavior: 0, factors: [], timestamp: new Date().toISOString() },
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate comprehensive trust score
   */
  async calculateTrustScore(context: ZeroTrustContext): Promise<TrustScore> {
    const factors: TrustFactor[] = [];

    // Identity verification (weight: 30%)
    const identityScore = await this.scoreIdentity(context.userId);
    factors.push({
      name: 'Identity Verification',
      score: identityScore,
      weight: 0.3,
      details: 'User identity and authentication strength',
    });

    // Device verification (weight: 25%)
    const deviceScore = await this.scoreDevice(context.deviceId);
    factors.push({
      name: 'Device Trust',
      score: deviceScore,
      weight: 0.25,
      details: 'Device registration and security status',
    });

    // Location verification (weight: 20%)
    const locationScore = this.scoreLocation(context.location);
    factors.push({
      name: 'Location Risk',
      score: locationScore,
      weight: 0.2,
      details: 'Geographic and IP-based risk assessment',
    });

    // Network verification (weight: 15%)
    const networkScore = this.scoreNetwork(context.network);
    factors.push({
      name: 'Network Security',
      score: networkScore,
      weight: 0.15,
      details: 'Network security and reputation',
    });

    // Behavioral analysis (weight: 10%)
    const behaviorScore = await this.scoreBehavior(context.userId, context);
    factors.push({
      name: 'Behavior Pattern',
      score: behaviorScore,
      weight: 0.1,
      details: 'User behavior and access patterns',
    });

    // Calculate weighted overall score
    const overall = factors.reduce((sum, factor) => {
      return sum + factor.score * factor.weight;
    }, 0);

    const trustScore: TrustScore = {
      overall: Math.round(overall),
      identity: identityScore,
      device: deviceScore,
      location: locationScore,
      behavior: behaviorScore,
      factors,
      timestamp: new Date().toISOString(),
    };

    // Cache trust score
    this.trustScores.set(`${context.userId}:${context.sessionId}`, trustScore);

    return trustScore;
  }

  // ================================
  // LEAST PRIVILEGE ACCESS
  // ================================

  /**
   * Create access policy with least privilege principle
   */
  createAccessPolicy(
    resourceId: string,
    policy: Omit<AccessPolicy, 'resourceId'>
  ): AccessPolicy {
    logger.info('Creating access policy', { resourceId, minTrustScore: policy.minTrustScore });

    const accessPolicy: AccessPolicy = {
      resourceId,
      ...policy,
    };

    this.accessPolicies.set(resourceId, accessPolicy);
    return accessPolicy;
  }

  /**
   * Update access policy
   */
  updateAccessPolicy(
    resourceId: string,
    updates: Partial<AccessPolicy>
  ): AccessPolicy | undefined {
    const existing = this.accessPolicies.get(resourceId);
    if (!existing) {
      logger.warn('Access policy not found', { resourceId });
      return undefined;
    }

    const updated = { ...existing, ...updates };
    this.accessPolicies.set(resourceId, updated);

    logger.info('Access policy updated', { resourceId });
    return updated;
  }

  /**
   * Revoke access policy
   */
  revokeAccessPolicy(resourceId: string): boolean {
    const deleted = this.accessPolicies.delete(resourceId);
    if (deleted) {
      logger.info('Access policy revoked', { resourceId });
    }
    return deleted;
  }

  // ================================
  // MICRO-SEGMENTATION
  // ================================

  /**
   * Create micro-segment for resource isolation
   */
  createMicroSegment(segment: MicroSegment): void {
    logger.info('Creating micro-segment', {
      id: segment.id,
      resources: segment.resources.length,
      isolationLevel: segment.isolationLevel,
    });

    this.microSegments.set(segment.id, segment);

    // Create policies for each resource
    for (const resourceId of segment.resources) {
      if (!this.accessPolicies.has(resourceId)) {
        this.createAccessPolicy(resourceId, segment.policies[0]);
      }
    }
  }

  /**
   * Check if user has access to segment
   */
  async checkSegmentAccess(
    userId: string,
    deviceId: string,
    segmentId: string
  ): Promise<{ granted: boolean; reason: string }> {
    const segment = this.microSegments.get(segmentId);
    if (!segment) {
      return { granted: false, reason: 'Segment not found' };
    }

    // Check allowed users
    if (!segment.allowedUsers.includes(userId) && !segment.allowedUsers.includes('*')) {
      return { granted: false, reason: 'User not in allowed list' };
    }

    // Check allowed devices
    if (!segment.allowedDevices.includes(deviceId) && !segment.allowedDevices.includes('*')) {
      return { granted: false, reason: 'Device not in allowed list' };
    }

    return { granted: true, reason: 'Access granted to segment' };
  }

  // ================================
  // ASSUME BREACH MINDSET
  // ================================

  /**
   * Detect threats assuming breach has occurred
   */
  async detectThreats(
    context: ZeroTrustContext
  ): Promise<ThreatDetection[]> {
    const threats: ThreatDetection[] = [];

    // Check for anomalous behavior
    const anomaly = await this.detectAnomalies(context.userId, context);
    if (anomaly.isAnomaly) {
      threats.push(this.createThreatFromAnomaly(anomaly, context));
    }

    // Check for suspicious network activity
    const networkThreats = this.detectNetworkThreats(context.network);
    threats.push(...networkThreats);

    // Check for location-based threats
    const locationThreats = this.detectLocationThreats(context.location);
    threats.push(...locationThreats);

    // Store threats
    for (const threat of threats) {
      this.threats.set(threat.threatId, threat);
    }

    if (threats.length > 0) {
      logger.warn('Threats detected', { count: threats.length, userId: context.userId });
    }

    return threats;
  }

  /**
   * Mitigate detected threat
   */
  async mitigateThreat(
    threatId: string,
    action: 'block' | 'monitor' | 'alert'
  ): Promise<{ success: boolean; details: string }> {
    const threat = this.threats.get(threatId);
    if (!threat) {
      return { success: false, details: 'Threat not found' };
    }

    logger.info('Mitigating threat', { threatId, action, type: threat.type });

    switch (action) {
      case 'block':
        // Block access
        threat.mitigated = true;
        this.threats.set(threatId, threat);
        return { success: true, details: 'Access blocked' };

      case 'monitor':
        // Increase monitoring
        return { success: true, details: 'Monitoring increased' };

      case 'alert':
        // Send alert
        await this.sendSecurityAlert(threat);
        return { success: true, details: 'Alert sent' };

      default:
        return { success: false, details: 'Unknown action' };
    }
  }

  // ================================
  // REAL-TIME THREAT DETECTION
  // ================================

  /**
   * Detect anomalous behavior patterns
   */
  private async detectAnomalies(
    userId: string,
    context: ZeroTrustContext
  ): Promise<{
    isAnomaly: boolean;
    score: number;
    type: 'rate' | 'pattern' | 'behavior' | 'resource' | 'other';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  }> {
    const history = this.verificationHistory.get(userId) || [];

    // Check access rate
    const recentAccesses = history.filter(
      h => Date.now() - new Date(h.timestamp).getTime() < 300000 // 5 minutes
    );

    if (recentAccesses.length > 50) {
      return {
        isAnomaly: true,
        score: 0.95,
        type: 'rate',
        description: 'Abnormally high access rate detected',
        severity: 'high',
        recommendations: ['Implement rate limiting', 'Verify user activity'],
      };
    }

    // Check location changes
    if (history.length > 0) {
      const lastLocation = history[history.length - 1].location;
      const timeDiff = Date.now() - new Date(history[history.length - 1].timestamp).getTime();
      const distanceKm = this.calculateDistance(lastLocation, context.location);

      // Impossible travel (>500km in <1 hour)
      if (distanceKm > 500 && timeDiff < 3600000) {
        return {
          isAnomaly: true,
          score: 0.98,
          type: 'pattern',
          description: 'Impossible travel detected',
          severity: 'critical',
          recommendations: ['Require MFA', 'Verify account credentials'],
        };
      }
    }

    return {
      isAnomaly: false,
      score: 0,
      type: 'other',
      description: 'No anomalies detected',
      severity: 'low',
      recommendations: [],
    };
  }

  // ================================
  // TRUST SCORING METHODS
  // ================================

  private async scoreIdentity(userId: string): Promise<number> {
    // Mock identity scoring - in production would check:
    // - MFA enabled
    // - Password strength
    // - Account age
    // - Verification status
    logger.debug('Scoring identity', { userId });
    return 85;
  }

  private async scoreDevice(deviceId: string): Promise<number> {
    // Mock device scoring - in production would check:
    // - Device registration
    // - Security patches
    // - Antivirus status
    // - Encryption enabled
    logger.debug('Scoring device', { deviceId });
    return 80;
  }

  private scoreLocation(location: GeolocationData): number {
    let score = 100;

    // High-risk countries
    const highRiskCountries = ['XX', 'YY']; // Example codes
    if (highRiskCountries.includes(location.country)) {
      score -= 30;
    }

    // Known VPN/proxy
    // In production, would check IP reputation databases

    return Math.max(score, 0);
  }

  private scoreNetwork(network: NetworkContext): number {
    let score = 100;

    // VPN penalty
    if (network.vpn) {
      score -= 10;
    }

    // Proxy penalty
    if (network.proxy) {
      score -= 15;
    }

    // Tor penalty
    if (network.tor) {
      score -= 40;
    }

    // High risk score penalty
    if (network.riskScore > 70) {
      score -= 25;
    }

    return Math.max(score, 0);
  }

  private async scoreBehavior(userId: string, context: ZeroTrustContext): Promise<number> {
    const history = this.verificationHistory.get(userId) || [];

    if (history.length === 0) {
      return 70; // Default for new users
    }

    let score = 100;

    // Check time of access
    const hour = new Date(context.timestamp).getHours();
    const typicalHours = this.getTypicalAccessHours(history);

    if (!typicalHours.includes(hour)) {
      score -= 10;
    }

    return Math.max(score, 0);
  }

  // ================================
  // HELPER METHODS
  // ================================

  private checkRequiredFactors(trustScore: TrustScore, requiredFactors: string[]): boolean {
    for (const required of requiredFactors) {
      const factor = trustScore.factors.find(f => f.name === required);
      if (!factor || factor.score < 70) {
        return false;
      }
    }
    return true;
  }

  private checkLocationRestrictions(location: GeolocationData, policy: AccessPolicy): boolean {
    if (policy.allowedLocations && policy.allowedLocations.length > 0) {
      return policy.allowedLocations.includes(location.country);
    }

    if (policy.blockedLocations && policy.blockedLocations.length > 0) {
      return !policy.blockedLocations.includes(location.country);
    }

    return true;
  }

  private checkNetworkRestrictions(network: NetworkContext, policy: AccessPolicy): boolean {
    if (policy.allowedNetworks && policy.allowedNetworks.length > 0) {
      return policy.allowedNetworks.includes(network.ipAddress);
    }

    // Block Tor by default
    if (network.tor) {
      return false;
    }

    return true;
  }

  private recordVerification(userId: string, context: ZeroTrustContext): void {
    const history = this.verificationHistory.get(userId) || [];
    history.push(context);

    // Keep last 100 verifications
    if (history.length > 100) {
      history.shift();
    }

    this.verificationHistory.set(userId, history);
  }

  private createThreatFromAnomaly(
    anomaly: { type: string; description: string; severity: 'low' | 'medium' | 'high' | 'critical'; score: number },
    context: ZeroTrustContext
  ): ThreatDetection {
    return {
      threatId: `threat_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: 'anomaly',
      severity: anomaly.severity,
      confidence: anomaly.score,
      indicators: [
        { type: anomaly.type, value: anomaly.description, confidence: anomaly.score },
      ],
      timestamp: new Date().toISOString(),
      mitigated: false,
    };
  }

  private detectNetworkThreats(network: NetworkContext): ThreatDetection[] {
    const threats: ThreatDetection[] = [];

    if (network.tor) {
      threats.push({
        threatId: `threat_tor_${Date.now()}`,
        type: 'intrusion',
        severity: 'high',
        confidence: 0.95,
        indicators: [{ type: 'tor', value: network.ipAddress, confidence: 0.95 }],
        timestamp: new Date().toISOString(),
        mitigated: false,
      });
    }

    return threats;
  }

  private detectLocationThreats(location: GeolocationData): ThreatDetection[] {
    // In production, would check against threat intelligence feeds
    return [];
  }

  private async sendSecurityAlert(threat: ThreatDetection): Promise<void> {
    logger.warn('SECURITY ALERT', threat);
    // In production, would send to SIEM, email, Slack, etc.
  }

  private calculateDistance(loc1: GeolocationData, loc2: GeolocationData): number {
    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(loc2.latitude - loc1.latitude);
    const dLon = this.toRad(loc2.longitude - loc1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(loc1.latitude)) *
        Math.cos(this.toRad(loc2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private getTypicalAccessHours(history: ZeroTrustContext[]): number[] {
    const hours = history.map(h => new Date(h.timestamp).getHours());
    // Return most common hours
    return [...new Set(hours)];
  }

  // ================================
  // PUBLIC UTILITY METHODS
  // ================================

  /**
   * Get trust score for user session
   */
  getTrustScore(userId: string, sessionId: string): TrustScore | undefined {
    return this.trustScores.get(`${userId}:${sessionId}`);
  }

  /**
   * Get all active threats
   */
  getActiveThreats(): ThreatDetection[] {
    return Array.from(this.threats.values()).filter(t => !t.mitigated);
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      trustScores: this.trustScores.size,
      accessPolicies: this.accessPolicies.size,
      microSegments: this.microSegments.size,
      activeThreats: this.getActiveThreats().length,
      totalThreats: this.threats.size,
    };
  }
}

// Export singleton instance
export const zeroTrustFramework = new ZeroTrustFramework();
