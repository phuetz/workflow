/**
 * ResponseMetrics.ts
 *
 * Handles dashboard metrics calculation and incident analytics.
 *
 * @module integrations/response/orchestrator/ResponseMetrics
 */

import type {
  Logger,
  Incident,
  PlaybookExecution,
  DashboardMetrics
} from './types'
import { IncidentSeverity, IncidentStatus } from './types'

/**
 * Calculates and provides dashboard metrics for incident response
 */
export class ResponseMetrics {
  protected readonly logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  /**
   * Get dashboard metrics summary
   */
  async getDashboardMetrics(
    incidents: Incident[],
    executions: PlaybookExecution[]
  ): Promise<DashboardMetrics> {
    const allIncidents = incidents
    const activeIncidents = allIncidents.filter(i => i.status !== IncidentStatus.CLOSED)
    const criticalIncidents = allIncidents.filter(i => i.severity === IncidentSeverity.CRITICAL)

    // Calculate MTTD/MTTR/MTTC averages
    const completedIncidents = allIncidents.filter(i => i.status === IncidentStatus.CLOSED)
    const mttdValues = completedIncidents.map(i => i.metrics.mttd).filter(v => v > 0)
    const mttrValues = completedIncidents.map(i => i.metrics.mttr).filter(v => v > 0)
    const mttcValues = completedIncidents.map(i => i.metrics.mttc).filter(v => v > 0)

    const averageMTTD = mttdValues.length > 0 ? mttdValues.reduce((a, b) => a + b, 0) / mttdValues.length : 0
    const averageMTTR = mttrValues.length > 0 ? mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length : 0
    const averageMTTC = mttcValues.length > 0 ? mttcValues.reduce((a, b) => a + b, 0) / mttcValues.length : 0

    // Calculate response effectiveness
    const effectivenessScores = completedIncidents.map(i => i.metrics.effectivenessScore)
    const responseEffectiveness = effectivenessScores.length > 0
      ? effectivenessScores.reduce((a, b) => a + b, 0) / effectivenessScores.length
      : 0

    // Calculate playbook success rates
    const playbookSuccessRates = this.calculatePlaybookSuccessRates(executions)

    // Determine top threats
    const topThreats = this.calculateTopThreats(activeIncidents)

    // Get team workload
    const teamWorkload = this.calculateTeamWorkload(activeIncidents)

    return {
      totalIncidents: allIncidents.length,
      activeIncidents: activeIncidents.length,
      criticalIncidents: criticalIncidents.length,
      averageMTTD,
      averageMTTR,
      averageMTTC,
      responseEffectiveness,
      teamWorkload,
      playbookSuccessRates,
      recentIncidents: allIncidents.slice(-10),
      topThreats
    }
  }

  /**
   * Calculate playbook success rates from executions
   */
  calculatePlaybookSuccessRates(executions: PlaybookExecution[]): Map<string, number> {
    const playbookSuccessRates = new Map<string, number>()
    const playbookCounts = new Map<string, number>()
    const playbookTotals = new Map<string, number>()

    for (const execution of executions) {
      const currentCount = playbookCounts.get(execution.playbookId) || 0
      const currentTotal = playbookTotals.get(execution.playbookId) || 0

      playbookCounts.set(execution.playbookId, currentCount + 1)
      playbookTotals.set(execution.playbookId, currentTotal + execution.successRate)
    }

    for (const [playbookId, count] of playbookCounts.entries()) {
      const total = playbookTotals.get(playbookId) || 0
      playbookSuccessRates.set(playbookId, total / count)
    }

    return playbookSuccessRates
  }

  /**
   * Calculate top threats from active incidents
   */
  calculateTopThreats(activeIncidents: Incident[]): string[] {
    const threatCounts = new Map<string, number>()

    for (const incident of activeIncidents) {
      const count = threatCounts.get(incident.type) || 0
      threatCounts.set(incident.type, count + 1)
    }

    return Array.from(threatCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([threat]) => threat)
  }

  /**
   * Calculate team workload from active incidents
   */
  calculateTeamWorkload(activeIncidents: Incident[]): Map<string, number> {
    const teamWorkload = new Map<string, number>()

    for (const incident of activeIncidents) {
      if (incident.assignedTeam) {
        const count = teamWorkload.get(incident.assignedTeam) || 0
        teamWorkload.set(incident.assignedTeam, count + 1)
      }
    }

    return teamWorkload
  }

  /**
   * Calculate incident severity distribution
   */
  calculateSeverityDistribution(incidents: Incident[]): Map<IncidentSeverity, number> {
    const distribution = new Map<IncidentSeverity, number>()

    for (const severity of Object.values(IncidentSeverity)) {
      distribution.set(severity, 0)
    }

    for (const incident of incidents) {
      const count = distribution.get(incident.severity) || 0
      distribution.set(incident.severity, count + 1)
    }

    return distribution
  }

  /**
   * Calculate incident status distribution
   */
  calculateStatusDistribution(incidents: Incident[]): Map<IncidentStatus, number> {
    const distribution = new Map<IncidentStatus, number>()

    for (const status of Object.values(IncidentStatus)) {
      distribution.set(status, 0)
    }

    for (const incident of incidents) {
      const count = distribution.get(incident.status) || 0
      distribution.set(incident.status, count + 1)
    }

    return distribution
  }

  /**
   * Calculate average response time by severity
   */
  calculateResponseTimeBySeverity(incidents: Incident[]): Map<IncidentSeverity, number> {
    const responseTimes = new Map<IncidentSeverity, number[]>()

    for (const severity of Object.values(IncidentSeverity)) {
      responseTimes.set(severity, [])
    }

    for (const incident of incidents) {
      if (incident.metrics.mttr > 0) {
        const times = responseTimes.get(incident.severity) || []
        times.push(incident.metrics.mttr)
        responseTimes.set(incident.severity, times)
      }
    }

    const averages = new Map<IncidentSeverity, number>()
    for (const [severity, times] of responseTimes.entries()) {
      if (times.length > 0) {
        averages.set(severity, times.reduce((a, b) => a + b, 0) / times.length)
      } else {
        averages.set(severity, 0)
      }
    }

    return averages
  }

  /**
   * Get incidents by time period
   */
  getIncidentsByTimePeriod(
    incidents: Incident[],
    periodDays: number
  ): Incident[] {
    const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
    return incidents.filter(i => i.detectionTime >= cutoff)
  }

  /**
   * Calculate incident trend (increase/decrease percentage)
   */
  calculateIncidentTrend(
    incidents: Incident[],
    comparePeriodDays: number
  ): number {
    const now = Date.now()
    const periodMs = comparePeriodDays * 24 * 60 * 60 * 1000

    const currentPeriodStart = new Date(now - periodMs)
    const previousPeriodStart = new Date(now - 2 * periodMs)

    const currentCount = incidents.filter(
      i => i.detectionTime >= currentPeriodStart
    ).length

    const previousCount = incidents.filter(
      i => i.detectionTime >= previousPeriodStart && i.detectionTime < currentPeriodStart
    ).length

    if (previousCount === 0) {
      return currentCount > 0 ? 100 : 0
    }

    return ((currentCount - previousCount) / previousCount) * 100
  }
}

export default ResponseMetrics
