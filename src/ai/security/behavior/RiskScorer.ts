/**
 * Risk Scorer
 *
 * Calculates risk scores and manages risk profiles.
 */

import type {
  UserRiskProfile,
  BehavioralAnomaly,
  PeerGroup,
  BehaviorAlert,
  AnomalyThresholds
} from './types'

/**
 * Calculates and manages risk scores
 */
export class RiskScorer {
  private riskDecayRate: number
  private thresholds: AnomalyThresholds

  constructor(riskDecayRate: number, thresholds: AnomalyThresholds) {
    this.riskDecayRate = riskDecayRate
    this.thresholds = thresholds
  }

  /**
   * Update thresholds
   */
  setThresholds(thresholds: AnomalyThresholds): void {
    this.thresholds = thresholds
  }

  /**
   * Calculate component-specific risk score
   */
  calculateComponentRisk(anomalies: BehavioralAnomaly[], anomalyType: BehavioralAnomaly['anomalyType']): number {
    const relevantAnomalies = anomalies.filter(a => a.anomalyType === anomalyType)
    if (relevantAnomalies.length === 0) return 0

    const maxScore = Math.max(...relevantAnomalies.map(a => a.anomalyScore))
    return Math.min(100, maxScore * 0.8 + relevantAnomalies.length * 2)
  }

  /**
   * Calculate comprehensive user risk profile
   */
  calculateUserRiskProfile(
    userId: string,
    anomalies: BehavioralAnomaly[],
    peerOutlierScore: number,
    existingProfile?: UserRiskProfile
  ): UserRiskProfile {
    const components = {
      temporalRisk: this.calculateComponentRisk(anomalies, 'temporal'),
      spatialRisk: this.calculateComponentRisk(anomalies, 'spatial'),
      volumetricRisk: this.calculateComponentRisk(anomalies, 'volumetric'),
      patternRisk: this.calculateComponentRisk(anomalies, 'pattern'),
      peerGroupRisk: peerOutlierScore
    }

    const overallRiskScore = (
      components.temporalRisk * 0.2 +
      components.spatialRisk * 0.3 +
      components.volumetricRisk * 0.2 +
      components.patternRisk * 0.2 +
      components.peerGroupRisk * 0.1
    )

    // Apply risk decay for stable users
    let adjustedRiskScore = overallRiskScore
    if (existingProfile && anomalies.length === 0) {
      const daysSinceUpdate = (Date.now() - existingProfile.lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
      adjustedRiskScore = Math.max(0, overallRiskScore - (this.riskDecayRate * daysSinceUpdate * 100))
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical'
    if (adjustedRiskScore >= 80) {
      riskLevel = 'critical'
    } else if (adjustedRiskScore >= 60) {
      riskLevel = 'high'
    } else if (adjustedRiskScore >= 40) {
      riskLevel = 'medium'
    } else {
      riskLevel = 'low'
    }

    // Calculate trend
    let riskTrend: 'improving' | 'stable' | 'degrading' = 'stable'
    let riskTrendScore = 0
    if (existingProfile) {
      const riskDelta = adjustedRiskScore - existingProfile.overallRiskScore
      riskTrendScore = riskDelta
      if (riskDelta > 5) {
        riskTrend = 'degrading'
      } else if (riskDelta < -5) {
        riskTrend = 'improving'
      }
    }

    return {
      userId,
      overallRiskScore: adjustedRiskScore,
      riskLevel,
      components,
      recentAnomalies: anomalies.slice(0, 10),
      riskTrend,
      riskTrendScore,
      lastUpdated: new Date(),
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  }

  /**
   * Compare user to peer group and calculate outlier score
   */
  compareToPeerGroup(
    userRiskScore: number,
    peerGroups: Map<string, PeerGroup>,
    userId: string
  ): { outlierScore: number; groupId: string | null } {
    let bestMatch: { groupId: string; outlierScore: number } = { groupId: '', outlierScore: 0 }

    for (const [groupId, group] of peerGroups) {
      if (!group.members.includes(userId)) continue

      const zscore = (userRiskScore - group.baselineMetrics.averageRiskScore) /
                     (group.baselineMetrics.standardDeviation || 1)
      const outlierScore = Math.min(100, Math.abs(zscore) * 10)

      if (outlierScore > bestMatch.outlierScore) {
        bestMatch = { groupId, outlierScore }
      }
    }

    return bestMatch
  }

  /**
   * Detect peer group anomalies
   */
  detectPeerGroupAnomalies(
    group: PeerGroup,
    riskProfiles: Map<string, UserRiskProfile>
  ): BehavioralAnomaly[] {
    const anomalies: BehavioralAnomaly[] = []

    for (const userId of group.members) {
      const profile = riskProfiles.get(userId)
      if (!profile) continue

      const zscore = (profile.overallRiskScore - group.baselineMetrics.averageRiskScore) /
                     (group.baselineMetrics.standardDeviation || 1)

      if (Math.abs(zscore) > 2) { // 2 standard deviations
        const outlierScore = Math.min(100, Math.abs(zscore) * 10)

        if (outlierScore >= this.thresholds.peerGroup) {
          anomalies.push({
            userId,
            anomalyId: `peer_${Date.now()}_${Math.random()}`,
            timestamp: new Date(),
            anomalyType: 'peer_group',
            anomalyScore: outlierScore,
            description: `User is an outlier in peer group "${group.name}"`,
            evidencePoints: [
              `Risk score: ${profile.overallRiskScore.toFixed(1)}`,
              `Group average: ${group.baselineMetrics.averageRiskScore.toFixed(1)}`,
              `Deviation: ${zscore.toFixed(2)} standard deviations`
            ],
            expectedBehavior: `Risk score within ${(group.baselineMetrics.averageRiskScore - group.baselineMetrics.standardDeviation).toFixed(1)}-${(group.baselineMetrics.averageRiskScore + group.baselineMetrics.standardDeviation).toFixed(1)}`,
            observedBehavior: `Risk score: ${profile.overallRiskScore.toFixed(1)}`,
            riskLevel: zscore > 0 ? 'high' : 'low',
            suggestedActions: [
              'Investigate high-risk outliers',
              'Review access patterns',
              'Check for anomalous activities'
            ]
          })
        }
      }
    }

    return anomalies
  }

  /**
   * Update peer group metrics
   */
  updatePeerGroupMetrics(group: PeerGroup, riskProfiles: Map<string, UserRiskProfile>): void {
    const riskScores = group.members
      .map(userId => riskProfiles.get(userId)?.overallRiskScore || 0)
      .sort((a, b) => a - b)

    group.baselineMetrics.averageRiskScore = riskScores.reduce((a, b) => a + b, 0) / riskScores.length
    group.baselineMetrics.medianRiskScore = riskScores[Math.floor(riskScores.length / 2)]

    const variance = riskScores.reduce((sum, score) => {
      return sum + Math.pow(score - group.baselineMetrics.averageRiskScore, 2)
    }, 0) / riskScores.length
    group.baselineMetrics.standardDeviation = Math.sqrt(variance)

    group.updatedAt = new Date()
  }

  /**
   * Generate security recommendations based on anomalies
   */
  generateRecommendations(anomalies: BehavioralAnomaly[], severity: BehaviorAlert['severity']): string[] {
    const recommendations: string[] = []

    if (severity === 'critical') {
      recommendations.push('Immediately isolate affected account/entity')
      recommendations.push('Trigger incident response procedures')
      recommendations.push('Notify security team immediately')
    }

    const hasLocationAnomaly = anomalies.some(a => a.anomalyType === 'spatial')
    if (hasLocationAnomaly) {
      recommendations.push('Verify user identity with multi-factor authentication')
      recommendations.push('Review location-based access controls')
    }

    const hasVolumeAnomaly = anomalies.some(a => a.anomalyType === 'volumetric')
    if (hasVolumeAnomaly) {
      recommendations.push('Investigate data classification of accessed resources')
      recommendations.push('Review data loss prevention (DLP) policies')
    }

    const hasPrivilegeAnomaly = anomalies.some(a => a.anomalyType === 'pattern')
    if (hasPrivilegeAnomaly) {
      recommendations.push('Audit privilege elevation justification')
      recommendations.push('Review privileged access management (PAM) logs')
    }

    return recommendations
  }
}
