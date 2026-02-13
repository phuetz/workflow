/**
 * ReportGenerator - Generates incident reports and analytics
 *
 * @module soc/orchestration/ReportGenerator
 */

import { EventEmitter } from 'events'
import {
  SecurityIncident,
  IncidentReport,
  ThreatSeverity
} from './types'

export class ReportGenerator extends EventEmitter {
  constructor() {
    super()
  }

  /**
   * Generate incident summary
   */
  private generateIncidentSummary(incident: SecurityIncident): string {
    const duration = incident.state === 'closed'
      ? `Duration: ${Math.round((Date.now() - incident.detectedAt.getTime()) / 60000)} minutes`
      : `Ongoing since ${incident.detectedAt.toISOString()}`

    return `${incident.title} - ${incident.severity.toUpperCase()} severity ${incident.threatType} incident. ` +
      `Affected ${incident.affectedAssets.length} assets and detected ${incident.indicators.length} indicators. ` +
      `${incident.containmentActions.length} containment actions taken. ${duration}.`
  }

  /**
   * Generate lessons learned
   */
  private generateLessonsLearned(incident: SecurityIncident): string[] {
    const lessons: string[] = []

    if (incident.metrics.mttd > 3600000) {
      lessons.push('Detection time exceeded 1 hour - review detection capabilities')
    }
    if (incident.metrics.mttc > 1800000) {
      lessons.push('Containment took over 30 minutes - improve automated containment procedures')
    }
    if (incident.containmentActions.some(a => a.status === 'failed')) {
      lessons.push('Some containment actions failed - review integration health and permissions')
    }
    if (incident.affectedAssets.filter(a => a.criticality === 'critical').length > 0) {
      lessons.push('Critical assets were affected - review access controls and segmentation')
    }

    return lessons.length > 0 ? lessons : ['Incident handled within expected parameters']
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(incident: SecurityIncident): string[] {
    const recommendations: string[] = []

    recommendations.push(`Implement additional monitoring for ${incident.threatType} threats`)
    recommendations.push('Review and update incident response playbooks')
    recommendations.push('Conduct security awareness training related to this incident type')

    if (incident.severity === ThreatSeverity.CRITICAL || incident.severity === ThreatSeverity.HIGH) {
      recommendations.push('Schedule a post-incident review meeting')
      recommendations.push('Update threat intelligence feeds with new indicators')
    }

    return recommendations
  }

  /**
   * Determine applicable compliance frameworks
   */
  private determineComplianceFrameworks(incident: SecurityIncident): string[] {
    const frameworks: string[] = []

    // Check for PII/PHI data
    const hasSensitiveData = incident.affectedAssets.some(a =>
      a.type === 'database' || a.metadata.containsPII || a.metadata.containsPHI
    )

    if (hasSensitiveData) {
      frameworks.push('GDPR')
      if (incident.affectedAssets.some(a => a.metadata.containsPHI)) {
        frameworks.push('HIPAA')
      }
    }

    // All incidents should be logged for SOC2
    frameworks.push('SOC2')

    return frameworks
  }

  /**
   * Generate incident report
   */
  public generateIncidentReport(incident: SecurityIncident, generatedBy: string): IncidentReport {
    const successfulContainments = incident.containmentActions.filter(a => a.status === 'active' || a.status === 'released').length
    const failedContainments = incident.containmentActions.filter(a => a.status === 'failed').length
    const activeContainments = incident.containmentActions.filter(a => a.status === 'active').length

    const completedRemediations = incident.remediationActions.filter(a => a.status === 'completed').length
    const pendingRemediations = incident.remediationActions.filter(a => a.status === 'pending' || a.status === 'awaiting_approval' || a.status === 'in_progress').length
    const failedRemediations = incident.remediationActions.filter(a => a.status === 'failed').length

    const report: IncidentReport = {
      incidentId: incident.id,
      generatedAt: new Date(),
      generatedBy,
      summary: this.generateIncidentSummary(incident),
      timeline: incident.timeline,
      affectedAssets: incident.affectedAssets,
      containmentSummary: {
        totalActions: incident.containmentActions.length,
        successfulActions: successfulContainments,
        failedActions: failedContainments,
        currentContainments: activeContainments
      },
      remediationSummary: {
        totalActions: incident.remediationActions.length,
        completedActions: completedRemediations,
        pendingActions: pendingRemediations,
        failedActions: failedRemediations
      },
      indicators: incident.indicators,
      metrics: incident.metrics,
      lessonsLearned: this.generateLessonsLearned(incident),
      recommendations: this.generateRecommendations(incident),
      compliance: {
        frameworks: this.determineComplianceFrameworks(incident),
        notificationRequired: incident.severity === ThreatSeverity.CRITICAL,
        notificationSent: false,
        dueDate: incident.severity === ThreatSeverity.CRITICAL
          ? new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours for GDPR
          : undefined
      }
    }

    this.emit('report:generated', { incidentId: incident.id, report })
    return report
  }
}
