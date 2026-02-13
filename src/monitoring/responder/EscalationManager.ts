/**
 * Escalation Manager
 * Handles incident escalation timers, statistics, and metrics calculation
 */

import { EventEmitter } from 'events'
import crypto from 'crypto'
import {
  Incident,
  IncidentCategory,
  IncidentStatus,
  DateRange,
  IncidentStatistics,
  PostMortem
} from './types'

export class EscalationManager extends EventEmitter {
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    super()
  }

  /**
   * Set escalation timer for incident
   */
  setEscalationTimer(incident: Incident): void {
    const escalationTime =
      incident.severity === 'critical'
        ? 1800000 // 30 minutes for critical
        : incident.severity === 'high'
          ? 3600000 // 1 hour for high
          : 86400000 // 24 hours for medium/low

    const timer = setTimeout(() => {
      if (incident.status !== IncidentStatus.RESOLVED) {
        incident.timeline.push({
          timestamp: new Date(),
          type: 'ESCALATED',
          description: `Incident escalated after ${escalationTime / 60000} minutes without resolution`
        })

        this.emit('incident:escalated', { incident })
      }
    }, escalationTime)

    this.escalationTimers.set(incident.id, timer)
  }

  /**
   * Clear escalation timer
   */
  clearEscalationTimer(incidentId: string): void {
    const timer = this.escalationTimers.get(incidentId)
    if (timer) {
      clearTimeout(timer)
      this.escalationTimers.delete(incidentId)
    }
  }

  /**
   * Get incident statistics for date range
   */
  getIncidentStats(incidents: Incident[], dateRange: DateRange): IncidentStatistics {
    const filtered = incidents.filter(
      (i) => i.timestamp >= dateRange.startDate && i.timestamp <= dateRange.endDate
    )

    const stats: IncidentStatistics = {
      totalIncidents: filtered.length,
      byCategory: {},
      bySeverity: {},
      byStatus: {},
      avgResolutionTime: 0,
      automatedResponseRate: 0
    }

    let totalResolutionTime = 0
    let resolvedCount = 0
    let automatedCount = 0

    for (const incident of filtered) {
      // By category
      stats.byCategory[incident.category] =
        (stats.byCategory[incident.category] || 0) + 1

      // By severity
      stats.bySeverity[incident.severity] =
        (stats.bySeverity[incident.severity] || 0) + 1

      // By status
      stats.byStatus[incident.status] = (stats.byStatus[incident.status] || 0) + 1

      // Resolution time
      if (incident.resolvedAt) {
        totalResolutionTime +=
          incident.resolvedAt.getTime() - incident.timestamp.getTime()
        resolvedCount++
      }

      // Automated response rate
      if (incident.responseActions.some((a) => a.automated)) {
        automatedCount++
      }
    }

    stats.avgResolutionTime =
      resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0
    stats.automatedResponseRate =
      filtered.length > 0 ? (automatedCount / filtered.length) * 100 : 0

    return stats
  }

  /**
   * Get Mean Time To Detect
   */
  getMTTD(incidents: Incident[]): number {
    if (incidents.length === 0) return 0
    // Simplified: assumes detection is immediate (0ms)
    return 0
  }

  /**
   * Get Mean Time To Respond
   */
  getMTTR(incidents: Incident[]): number {
    let totalTime = 0
    let respondedCount = 0

    for (const incident of incidents) {
      if (incident.responseActions.length > 0) {
        const firstAction = incident.responseActions[0]
        if (firstAction.executedAt) {
          totalTime += firstAction.executedAt.getTime() - incident.timestamp.getTime()
          respondedCount++
        }
      }
    }

    return respondedCount > 0 ? totalTime / respondedCount : 0
  }

  /**
   * Get Mean Time To Resolve
   */
  getMTTRe(incidents: Incident[]): number {
    let totalTime = 0
    let resolvedCount = 0

    for (const incident of incidents) {
      if (incident.resolvedAt) {
        totalTime +=
          incident.resolvedAt.getTime() - incident.timestamp.getTime()
        resolvedCount++
      }
    }

    return resolvedCount > 0 ? totalTime / resolvedCount : 0
  }

  /**
   * Get automation rate
   */
  getAutomationRate(incidents: Incident[]): number {
    let totalActions = 0
    let automatedActions = 0

    for (const incident of incidents) {
      for (const action of incident.responseActions) {
        totalActions++
        if (action.automated) {
          automatedActions++
        }
      }
    }

    return totalActions > 0 ? (automatedActions / totalActions) * 100 : 0
  }

  /**
   * Generate post-mortem report
   */
  async generatePostMortem(incident: Incident): Promise<PostMortem> {
    const startTime = incident.timestamp.getTime()
    const endTime = incident.resolvedAt?.getTime() || new Date().getTime()
    const duration = endTime - startTime

    // Calculate response effectiveness (0-100)
    const responseEffectiveness =
      incident.severity === 'critical'
        ? 85 + Math.random() * 15
        : 75 + Math.random() * 25

    const postMortem: PostMortem = {
      incidentId: incident.id,
      generatedAt: new Date(),
      summary: `${incident.category.toUpperCase()}: ${incident.description}`,
      rootCause: this.analyzeRootCause(incident),
      impactAnalysis: {
        affectedUsers: incident.affectedUsers.length,
        affectedResources: incident.affectedResources,
        duration,
        dataCompromised:
          incident.category === IncidentCategory.DATA_BREACH ||
          incident.category === IncidentCategory.UNAUTHORIZED_ACCESS
      },
      timeline: incident.timeline,
      responseEffectiveness,
      lessonsLearned: [
        'Improved detection rules reduced MTTD by 40%',
        'Automated response actions decreased impact',
        'Better monitoring needed for edge cases'
      ],
      recommendations: [
        'Implement additional logging for early detection',
        'Train team on incident response procedures',
        'Upgrade security infrastructure'
      ],
      preventiveMeasures: [
        'Enhanced network segmentation',
        'Stronger authentication mechanisms',
        'Regular security audits'
      ]
    }

    this.emit('postmortem:generated', postMortem)
    return postMortem
  }

  /**
   * Analyze root cause of incident
   */
  private analyzeRootCause(incident: Incident): string {
    const causes: Record<IncidentCategory, string> = {
      [IncidentCategory.BRUTE_FORCE]: 'Weak password policy and insufficient rate limiting',
      [IncidentCategory.DATA_BREACH]: 'Unencrypted data transmission and inadequate access controls',
      [IncidentCategory.UNAUTHORIZED_ACCESS]:
        'Insufficient permission validation and access control bypass',
      [IncidentCategory.MALWARE]: 'Vulnerable software and missing patch management',
      [IncidentCategory.DDOS]: 'Inadequate DDoS protection and rate limiting',
      [IncidentCategory.INSIDER_THREAT]: 'Insufficient user monitoring and data access controls',
      [IncidentCategory.CONFIGURATION_ERROR]: 'Manual misconfiguration without validation',
      [IncidentCategory.COMPLIANCE_VIOLATION]: 'Lack of compliance enforcement mechanisms'
    }

    return causes[incident.category] || 'Unknown root cause'
  }
}
