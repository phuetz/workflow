/**
 * Trust Scorer
 *
 * Calculates trust scores for users, devices, networks, and sessions.
 *
 * @module TrustScorer
 */

import {
  UserContext,
  DeviceContext,
  NetworkContext,
  EvaluationContext,
  TrustScoreComponents,
  TrustScoreWeights,
  TrustLevel,
  RiskLevel,
  RiskThresholds
} from './types'

/**
 * Default trust score weights
 */
export const DEFAULT_TRUST_WEIGHTS: TrustScoreWeights = {
  user: 0.35,
  device: 0.30,
  network: 0.20,
  session: 0.15
}

/**
 * Default risk thresholds
 */
export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  critical: 0.9,
  high: 0.7,
  medium: 0.4,
  low: 0.0
}

/**
 * Trust scoring system for zero trust evaluation
 */
export class TrustScorer {
  private weights: TrustScoreWeights
  private riskThresholds: RiskThresholds

  constructor(
    weights: TrustScoreWeights = DEFAULT_TRUST_WEIGHTS,
    riskThresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
  ) {
    this.weights = weights
    this.riskThresholds = riskThresholds
  }

  /**
   * Calculate all trust scores for a context
   */
  calculateTrustScores(context: EvaluationContext): TrustScoreComponents {
    const userTrustScore = this.calculateUserTrustScore(context.user)
    const deviceTrustScore = this.calculateDeviceTrustScore(context.device)
    const networkTrustScore = this.calculateNetworkTrustScore(context.network)
    const sessionTrustScore = this.calculateSessionTrustScore(context)

    return {
      userTrustScore,
      deviceTrustScore,
      networkTrustScore,
      sessionTrustScore,
      riskAdjustment: 0
    }
  }

  /**
   * Calculate composite trust score (0-100)
   */
  calculateCompositeTrustScore(scores: TrustScoreComponents): number {
    const weighted =
      scores.userTrustScore * this.weights.user +
      scores.deviceTrustScore * this.weights.device +
      scores.networkTrustScore * this.weights.network +
      scores.sessionTrustScore * this.weights.session -
      scores.riskAdjustment

    return Math.max(0, Math.min(100, weighted))
  }

  /**
   * Calculate trust level from score
   */
  calculateTrustLevel(score: number): TrustLevel {
    if (score < 20) return TrustLevel.CRITICAL
    if (score < 40) return TrustLevel.LOW
    if (score < 70) return TrustLevel.MEDIUM
    if (score < 85) return TrustLevel.HIGH
    return TrustLevel.VERY_HIGH
  }

  /**
   * Assess risk level from trust scores
   */
  assessRiskLevel(trustScores: TrustScoreComponents): RiskLevel {
    const compositeTrustScore = this.calculateCompositeTrustScore(trustScores)
    const riskScore = 100 - compositeTrustScore

    if (riskScore >= this.riskThresholds.critical) return RiskLevel.CRITICAL
    if (riskScore >= this.riskThresholds.high) return RiskLevel.HIGH
    if (riskScore >= this.riskThresholds.medium) return RiskLevel.MEDIUM
    return RiskLevel.LOW
  }

  /**
   * Calculate appropriate session timeout based on risk
   */
  calculateSessionTimeout(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return 600000 // 10 minutes
      case RiskLevel.HIGH:
        return 1800000 // 30 minutes
      case RiskLevel.MEDIUM:
        return 3600000 // 1 hour
      case RiskLevel.LOW:
        return 28800000 // 8 hours
    }
  }

  /**
   * Update trust score weights
   */
  setWeights(weights: Partial<TrustScoreWeights>): void {
    this.weights = { ...this.weights, ...weights }
  }

  /**
   * Get current weights
   */
  getWeights(): TrustScoreWeights {
    return { ...this.weights }
  }

  /**
   * Calculate user trust score (0-100)
   */
  private calculateUserTrustScore(user: UserContext): number {
    let score = 70 // Baseline

    // MFA bonus
    if (user.mfaEnabled) score += 15

    // Auth method considerations
    if (user.authMethods.includes('biometric') || user.authMethods.includes('hardware_token')) {
      score += 10
    }

    // Risk profile adjustment
    if (user.riskProfile === 'high') score -= 20
    else if (user.riskProfile === 'medium') score -= 10

    // Recent authentication
    const authAge = Date.now() - user.lastAuthTime
    if (authAge > 3600000) score -= 5 // More than 1 hour
    if (authAge > 86400000) score -= 15 // More than 1 day

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calculate device trust score (0-100)
   */
  private calculateDeviceTrustScore(device: DeviceContext): number {
    let score = 50 // Baseline

    // Compliance check
    if (device.complianceStatus === 'compliant') score += 30

    // Security features
    if (device.encryptionEnabled) score += 15
    if (device.antivirusStatus === 'active') score += 15
    if (!device.isJailbroken) score += 10

    // Network security
    if (device.vpnConnected) score += 10

    // Recent health check
    const healthAge = Date.now() - device.lastHealthCheck
    if (healthAge > 604800000) score -= 20 // More than 7 days

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calculate network trust score (0-100)
   */
  private calculateNetworkTrustScore(network: NetworkContext): number {
    let score = 60 // Baseline

    // VPN/Proxy usage
    if (network.isVPN) score += 20
    if (network.isProxy) score += 10

    // Geographic considerations
    if (network.geolocation) {
      // Risk countries
      const riskCountries = ['KP', 'IR', 'SY'] // Example
      if (riskCountries.includes(network.geolocation.country)) {
        score -= 40
      }
    }

    // ASN reputation (simplified)
    if (network.asn) {
      score += 5 // Trust reputation if available
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calculate session trust score (0-100)
   */
  private calculateSessionTrustScore(_context: EvaluationContext): number {
    let score = 75 // Baseline

    // Continuous verification
    const requestCount = 1 // Would be tracked in real implementation
    if (requestCount > 100) score -= 5

    return Math.max(0, Math.min(100, score))
  }
}

export default TrustScorer
