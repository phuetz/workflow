/**
 * IncidentManager - Manages security incident lifecycle
 *
 * @module soc/orchestration/IncidentManager
 */

import { EventEmitter } from 'events'
import { randomBytes } from 'crypto'
import {
  SecurityIncident,
  ThreatSeverity,
  IncidentState,
  IncidentMetrics,
  AffectedAsset,
  ThreatIndicator,
  ActionAuditLog
} from './types'

export class IncidentManager extends EventEmitter {
  private incidents: Map<string, SecurityIncident> = new Map()
  private auditLogs: ActionAuditLog[] = []
  private auditRetentionDays: number

  constructor(auditRetentionDays: number = 365) {
    super()
    this.auditRetentionDays = auditRetentionDays
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${randomBytes(4).toString('hex')}`
  }

  /**
   * Log audit entry
   */
  public logAudit(entry: Omit<ActionAuditLog, 'id' | 'timestamp' | 'duration'>): void {
    const auditEntry: ActionAuditLog = {
      id: this.generateId('audit'),
      timestamp: new Date(),
      duration: 0,
      ...entry
    }

    this.auditLogs.push(auditEntry)

    // Trim old logs if needed
    const retentionCutoff = Date.now() - (this.auditRetentionDays * 24 * 60 * 60 * 1000)
    this.auditLogs = this.auditLogs.filter(log => log.timestamp.getTime() > retentionCutoff)

    this.emit('audit:logged', auditEntry)
  }

  /**
   * Calculate impact score based on severity and asset count
   */
  private calculateImpactScore(severity: ThreatSeverity, assetCount: number): number {
    const severityScores: Record<ThreatSeverity, number> = {
      [ThreatSeverity.CRITICAL]: 40,
      [ThreatSeverity.HIGH]: 30,
      [ThreatSeverity.MEDIUM]: 20,
      [ThreatSeverity.LOW]: 10,
      [ThreatSeverity.INFO]: 5
    }

    const baseScore = severityScores[severity]
    const assetImpact = Math.min(assetCount * 5, 30)

    return Math.min(baseScore + assetImpact, 100)
  }

  /**
   * Create a new security incident
   */
  public createIncident(data: Partial<SecurityIncident>): SecurityIncident {
    const incidentId = this.generateId('inc')
    const now = new Date()

    const incident: SecurityIncident = {
      id: incidentId,
      title: data.title || 'Unnamed Incident',
      description: data.description || '',
      severity: data.severity || ThreatSeverity.MEDIUM,
      state: IncidentState.DETECTED,
      threatType: data.threatType || 'unknown',
      detectedAt: now,
      reportedBy: data.reportedBy || 'system',
      affectedAssets: data.affectedAssets || [],
      indicators: data.indicators || [],
      timeline: [
        {
          timestamp: now,
          actor: data.reportedBy || 'system',
          action: 'Incident created',
          details: { severity: data.severity, threatType: data.threatType },
          automated: true
        }
      ],
      containmentActions: [],
      remediationActions: [],
      playbookExecutions: [],
      evidence: [],
      metrics: {
        mttd: 0,
        mttr: 0,
        mttc: 0,
        mtte: 0,
        mttre: 0,
        containmentEffectiveness: 0,
        remediationEffectiveness: 0,
        impactScore: this.calculateImpactScore(data.severity || ThreatSeverity.MEDIUM, data.affectedAssets?.length || 0)
      },
      tags: data.tags || [],
      relatedIncidents: data.relatedIncidents || []
    }

    this.incidents.set(incidentId, incident)
    this.emit('incident:created', incident)

    return incident
  }

  /**
   * Get incident by ID
   */
  public getIncident(incidentId: string): SecurityIncident | undefined {
    return this.incidents.get(incidentId)
  }

  /**
   * Get all incidents
   */
  public getIncidents(): SecurityIncident[] {
    return Array.from(this.incidents.values())
  }

  /**
   * Update incident state
   */
  public updateIncidentState(
    incidentId: string,
    newState: IncidentState,
    updatedBy: string
  ): SecurityIncident {
    const incident = this.incidents.get(incidentId)
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`)
    }

    const oldState = incident.state
    incident.state = newState

    incident.timeline.push({
      timestamp: new Date(),
      actor: updatedBy,
      action: `State changed: ${oldState} -> ${newState}`,
      details: { oldState, newState },
      automated: false
    })

    // Update metrics based on state
    if (newState === IncidentState.ERADICATING && incident.metrics.mtte === 0) {
      incident.metrics.mtte = Date.now() - incident.detectedAt.getTime()
    }
    if (newState === IncidentState.RECOVERING && incident.metrics.mttre === 0) {
      incident.metrics.mttre = Date.now() - incident.detectedAt.getTime()
    }

    this.emit('incident:state_changed', { incidentId, oldState, newState })
    return incident
  }

  /**
   * Add timeline entry to incident
   */
  public addTimelineEntry(
    incidentId: string,
    actor: string,
    action: string,
    details: Record<string, unknown>,
    automated: boolean = false
  ): void {
    const incident = this.incidents.get(incidentId)
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`)
    }

    incident.timeline.push({
      timestamp: new Date(),
      actor,
      action,
      details,
      automated
    })
  }

  /**
   * Add playbook execution to incident
   */
  public addPlaybookExecution(incidentId: string, executionId: string): void {
    const incident = this.incidents.get(incidentId)
    if (incident) {
      incident.playbookExecutions.push(executionId)
    }
  }

  /**
   * Update MTTC metric
   */
  public updateMTTC(incidentId: string): void {
    const incident = this.incidents.get(incidentId)
    if (incident && incident.metrics.mttc === 0) {
      incident.metrics.mttc = Date.now() - incident.detectedAt.getTime()
    }
  }

  /**
   * Get audit logs
   */
  public getAuditLogs(limit?: number): ActionAuditLog[] {
    const logs = [...this.auditLogs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    return limit ? logs.slice(0, limit) : logs
  }

  /**
   * Cleanup old data based on retention policy
   */
  public cleanupOldData(): number {
    const retentionCutoff = Date.now() - (this.auditRetentionDays * 24 * 60 * 60 * 1000)
    const originalLogCount = this.auditLogs.length
    this.auditLogs = this.auditLogs.filter(log => log.timestamp.getTime() > retentionCutoff)
    return originalLogCount - this.auditLogs.length
  }

  /**
   * Clear all data
   */
  public clear(): void {
    this.incidents.clear()
    this.auditLogs = []
  }
}
