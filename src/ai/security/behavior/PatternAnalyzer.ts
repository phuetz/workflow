/**
 * Pattern Analyzer
 *
 * Analyzes user activity patterns for anomaly detection.
 */

import type { UserBaseline, ActivityEvent, BehavioralAnomaly, AnomalyThresholds } from './types'

/**
 * Analyzes behavioral patterns for anomaly detection
 */
export class PatternAnalyzer {
  private thresholds: AnomalyThresholds

  constructor(thresholds: AnomalyThresholds) {
    this.thresholds = thresholds
  }

  /**
   * Update thresholds
   */
  setThresholds(thresholds: AnomalyThresholds): void {
    this.thresholds = thresholds
  }

  /**
   * Detect pattern anomalies (deviations from typical behavior sequences)
   */
  detectPatternAnomalies(userId: string, baseline: UserBaseline, recentEvents: ActivityEvent[]): BehavioralAnomaly[] {
    const anomalies: BehavioralAnomaly[] = []

    // Check for unusual privilege escalations
    const privElevationEvents = recentEvents.filter(e => e.type === 'privilege_elevation')
    const expectedElevations = baseline.privilegePatterns.elevationFrequency

    if (privElevationEvents.length > expectedElevations * 10) {
      const anomalyScore = Math.min(100, 85)

      anomalies.push({
        userId,
        anomalyId: `pattern_${Date.now()}_${Math.random()}`,
        timestamp: new Date(),
        anomalyType: 'pattern',
        anomalyScore,
        description: `Excessive privilege escalations detected`,
        evidencePoints: [
          `${privElevationEvents.length} escalations in 24 hours`,
          `Expected: ~${expectedElevations.toFixed(2)} per day`,
          `Current rate is ${(privElevationEvents.length / expectedElevations).toFixed(1)}x normal`
        ],
        expectedBehavior: `Privilege escalations ~${expectedElevations.toFixed(2)} times per day`,
        observedBehavior: `${privElevationEvents.length} escalations in 24 hours`,
        riskLevel: 'high',
        suggestedActions: [
          'Review privilege escalation logs',
          'Verify business justification',
          'Check for privilege abuse',
          'Monitor elevated privilege usage'
        ]
      })
    }

    return anomalies
  }

  /**
   * Analyze login patterns from historical data
   */
  analyzeLoginPatterns(
    events: ActivityEvent[],
    baseline: UserBaseline
  ): void {
    const loginEvents = events.filter(e => e.type === 'login')

    loginEvents.forEach(event => {
      if (event.timestamp) {
        const hour = event.timestamp.getHours()
        const day = event.timestamp.getDay()
        baseline.loginPatterns.timesOfDay.set(hour, (baseline.loginPatterns.timesOfDay.get(hour) || 0) + 1)
        baseline.loginPatterns.daysOfWeek.set(day, (baseline.loginPatterns.daysOfWeek.get(day) || 0) + 1)
      }
      if (event.location) {
        baseline.loginPatterns.frequentLocations.set(event.location, (baseline.loginPatterns.frequentLocations.get(event.location) || 0) + 1)
      }
      if (event.device) {
        baseline.loginPatterns.frequentDevices.set(event.device, (baseline.loginPatterns.frequentDevices.get(event.device) || 0) + 1)
      }
      if (event.duration) {
        baseline.loginPatterns.averageLoginTime = (baseline.loginPatterns.averageLoginTime + event.duration) / 2
      }
    })
  }

  /**
   * Analyze access patterns from historical data
   */
  analyzeAccessPatterns(
    events: ActivityEvent[],
    baseline: UserBaseline,
    initializationDays: number
  ): void {
    const accessEvents = events.filter(e => e.type === 'access')

    accessEvents.forEach(event => {
      if (event.resource) {
        baseline.accessPatterns.frequentResources.set(event.resource, (baseline.accessPatterns.frequentResources.get(event.resource) || 0) + 1)
      }
      if (event.privilegeLevel) {
        baseline.accessPatterns.privilegeLevelDistribution.set(event.privilegeLevel, (baseline.accessPatterns.privilegeLevelDistribution.get(event.privilegeLevel) || 0) + 1)
      }
    })
    baseline.accessPatterns.averageAccessFrequency = accessEvents.length / initializationDays
  }

  /**
   * Get typical login hours for a user
   */
  getTypicalLoginHours(baseline: UserBaseline): string {
    const hours = Array.from(baseline.loginPatterns.timesOfDay.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`)

    return hours.join(', ')
  }
}
