/**
 * Deviation Detector
 *
 * Detects anomalies by comparing current behavior to baselines.
 */

import type { UserBaseline, ActivityEvent, BehavioralAnomaly, AnomalyThresholds } from './types'
import { PatternAnalyzer } from './PatternAnalyzer'

/**
 * Detects behavioral deviations from established baselines
 */
export class DeviationDetector {
  private thresholds: AnomalyThresholds
  private patternAnalyzer: PatternAnalyzer

  constructor(thresholds: AnomalyThresholds, patternAnalyzer: PatternAnalyzer) {
    this.thresholds = thresholds
    this.patternAnalyzer = patternAnalyzer
  }

  /**
   * Update thresholds
   */
  setThresholds(thresholds: AnomalyThresholds): void {
    this.thresholds = thresholds
    this.patternAnalyzer.setThresholds(thresholds)
  }

  /**
   * Detect temporal anomalies (unusual access times)
   */
  detectTemporalAnomalies(userId: string, baseline: UserBaseline, recentEvents: ActivityEvent[]): BehavioralAnomaly[] {
    const anomalies: BehavioralAnomaly[] = []
    const loginEvents = recentEvents.filter(e => e.type === 'login')

    loginEvents.forEach(event => {
      if (!event.timestamp) return

      const hour = event.timestamp.getHours()
      const frequency = baseline.loginPatterns.timesOfDay.get(hour) || 0
      const totalLogins = Array.from(baseline.loginPatterns.timesOfDay.values()).reduce((a, b) => a + b, 1)
      const likelihood = frequency / totalLogins

      if (likelihood < 0.1) { // Access during unusual hours
        const anomalyScore = Math.min(100, Math.max(70, (1 - likelihood) * 100))

        if (anomalyScore >= this.thresholds.temporal) {
          anomalies.push({
            userId,
            anomalyId: `temporal_${Date.now()}_${Math.random()}`,
            timestamp: event.timestamp,
            anomalyType: 'temporal',
            anomalyScore,
            description: `Login at unusual time (${hour}:00)`,
            evidencePoints: [
              `Hour ${hour} accounts for only ${(likelihood * 100).toFixed(1)}% of logins`,
              `Access outside typical login windows`
            ],
            expectedBehavior: `Typical logins between ${this.patternAnalyzer.getTypicalLoginHours(baseline)}`,
            observedBehavior: `Login at ${hour}:00`,
            riskLevel: anomalyScore > 85 ? 'high' : 'medium',
            suggestedActions: [
              'Verify user identity',
              'Check for account compromise',
              'Review recent access history'
            ]
          })
        }
      }
    })

    return anomalies
  }

  /**
   * Detect spatial anomalies (impossible travel, unusual locations)
   */
  detectSpatialAnomalies(userId: string, baseline: UserBaseline, recentEvents: ActivityEvent[]): BehavioralAnomaly[] {
    const anomalies: BehavioralAnomaly[] = []
    const locationEvents = recentEvents.filter(e => e.location)

    const sortedEvents = locationEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    for (let i = 1; i < sortedEvents.length; i++) {
      const prev = sortedEvents[i - 1]
      const curr = sortedEvents[i]
      const timeDiffMinutes = (curr.timestamp.getTime() - prev.timestamp.getTime()) / (1000 * 60)

      // Check if locations are different and travel time is impossible
      if (prev.location !== curr.location && timeDiffMinutes < 15) {
        const anomalyScore = Math.min(100, 80 + (timeDiffMinutes / 15) * 10)

        if (anomalyScore >= this.thresholds.spatial) {
          anomalies.push({
            userId,
            anomalyId: `spatial_${Date.now()}_${Math.random()}`,
            timestamp: curr.timestamp,
            anomalyType: 'spatial',
            anomalyScore,
            description: `Impossible travel detected between ${prev.location} and ${curr.location}`,
            evidencePoints: [
              `Location change from ${prev.location} to ${curr.location}`,
              `Travel time: ${timeDiffMinutes.toFixed(1)} minutes`,
              `Previous location is not in frequent locations for this user`
            ],
            expectedBehavior: `Access from frequent locations: ${Array.from(baseline.loginPatterns.frequentLocations.keys()).join(', ')}`,
            observedBehavior: `Access from ${curr.location}`,
            riskLevel: 'high',
            suggestedActions: [
              'Immediately verify user identity',
              'Check for account compromise',
              'Disable session from suspicious location',
              'Require MFA for next login'
            ]
          })
        }
      }
    }

    return anomalies
  }

  /**
   * Detect volumetric anomalies (unusual data transfer volumes)
   */
  detectVolumetricAnomalies(userId: string, baseline: UserBaseline, recentEvents: ActivityEvent[]): BehavioralAnomaly[] {
    const anomalies: BehavioralAnomaly[] = []
    const dataAccessEvents = recentEvents.filter(e => e.type === 'data_access')

    const totalBytes = dataAccessEvents.reduce((sum, e) => sum + (e.dataSize || 0), 0)
    const averageDailyBytes = baseline.dataAccessPatterns.averageBytesPerDay
    const dailyThreshold = averageDailyBytes * 3 // 3x normal

    if (totalBytes > dailyThreshold) {
      const volumeRatio = totalBytes / averageDailyBytes
      const anomalyScore = Math.min(100, Math.max(75, (volumeRatio - 1) * 15))

      if (anomalyScore >= this.thresholds.volumetric) {
        anomalies.push({
          userId,
          anomalyId: `volumetric_${Date.now()}_${Math.random()}`,
          timestamp: new Date(),
          anomalyType: 'volumetric',
          anomalyScore,
          description: `Unusual data transfer volume detected`,
          evidencePoints: [
            `Data transfer: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`,
            `Daily baseline: ${(averageDailyBytes / 1024 / 1024).toFixed(2)} MB`,
            `Current transfer is ${volumeRatio.toFixed(1)}x normal`
          ],
          expectedBehavior: `Average daily data access: ${(averageDailyBytes / 1024 / 1024).toFixed(2)} MB`,
          observedBehavior: `${(totalBytes / 1024 / 1024).toFixed(2)} MB in last 24 hours`,
          riskLevel: volumeRatio > 5 ? 'critical' : 'high',
          suggestedActions: [
            'Verify data access is legitimate',
            'Check for data exfiltration',
            'Review data classification',
            'Audit data access logs'
          ]
        })
      }
    }

    return anomalies
  }

  /**
   * Analyze all anomalies for a user
   */
  analyzeUserActivity(userId: string, baseline: UserBaseline, recentEvents: ActivityEvent[]): BehavioralAnomaly[] {
    const anomalies: BehavioralAnomaly[] = []

    // Detect temporal anomalies
    const temporalAnomalies = this.detectTemporalAnomalies(userId, baseline, recentEvents)
    anomalies.push(...temporalAnomalies)

    // Detect spatial anomalies
    const spatialAnomalies = this.detectSpatialAnomalies(userId, baseline, recentEvents)
    anomalies.push(...spatialAnomalies)

    // Detect volumetric anomalies
    const volumetricAnomalies = this.detectVolumetricAnomalies(userId, baseline, recentEvents)
    anomalies.push(...volumetricAnomalies)

    // Detect pattern anomalies
    const patternAnomalies = this.patternAnalyzer.detectPatternAnomalies(userId, baseline, recentEvents)
    anomalies.push(...patternAnomalies)

    return anomalies
  }
}
