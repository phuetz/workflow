/**
 * ResponseCoordinator.ts
 *
 * Handles incident creation, status updates, and playbook selection/registration.
 *
 * @module integrations/response/orchestrator/ResponseCoordinator
 */

import { EventEmitter } from 'events'
import type {
  Logger,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  Playbook,
  TimelineEntry,
  CreateIncidentParams,
  EscalationChain
} from './types'

/**
 * Manages incident lifecycle and playbook coordination
 */
export class ResponseCoordinator extends EventEmitter {
  protected incidents: Map<string, Incident> = new Map()
  protected playbooks: Map<string, Playbook> = new Map()
  protected escalationChains: Map<string, EscalationChain[]> = new Map()
  protected readonly logger: Logger

  constructor(logger: Logger) {
    super()
    this.logger = logger
  }

  /**
   * Create a new incident and initialize tracking
   */
  async createIncident(data: CreateIncidentParams): Promise<Incident> {
    const incidentId = `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const detectionTime = new Date()
    const timeline: TimelineEntry[] = [
      {
        timestamp: detectionTime,
        actor: data.reportedBy,
        action: 'Incident created',
        details: { severity: data.severity, type: data.type }
      }
    ]

    const incident: Incident = {
      id: incidentId,
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: IncidentStatus.NEW,
      type: data.type,
      detectionTime,
      reportedBy: data.reportedBy,
      affectedSystems: data.affectedSystems || [],
      affectedUsers: data.affectedUsers || [],
      timeline,
      metrics: {
        mttd: 0,
        mttr: 0,
        mttc: 0,
        impactScore: this.calculateImpactScore(data.severity, data.affectedSystems?.length || 0),
        effectivenessScore: 0
      },
      tags: data.tags || [],
      metadata: data.metadata || {}
    }

    this.incidents.set(incidentId, incident)
    this.logger.info(`Incident created: ${incidentId}`, { incident })
    this.emit('incident:created', incident)

    return incident
  }

  /**
   * Update incident status and track in timeline
   */
  async updateIncidentStatus(
    incidentId: string,
    newStatus: IncidentStatus,
    actor: string,
    details: Record<string, unknown> = {}
  ): Promise<Incident> {
    const incident = this.incidents.get(incidentId)
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`)
    }

    const oldStatus = incident.status
    incident.status = newStatus

    // Update metrics based on status
    if (newStatus === IncidentStatus.INVESTIGATING && !incident.metrics.responseStartTime) {
      incident.metrics.responseStartTime = new Date()
      incident.metrics.mttr = Date.now() - incident.detectionTime.getTime()
    }

    if (newStatus === IncidentStatus.CONTAINING && !incident.metrics.containmentTime) {
      incident.metrics.containmentTime = new Date()
      incident.metrics.mttc = Date.now() - incident.detectionTime.getTime()
    }

    incident.timeline.push({
      timestamp: new Date(),
      actor,
      action: `Status changed from ${oldStatus} to ${newStatus}`,
      details
    })

    this.logger.info(`Incident ${incidentId} status updated: ${oldStatus} -> ${newStatus}`)
    this.emit('incident:status_changed', { incidentId, oldStatus, newStatus, incident })

    return incident
  }

  /**
   * Register a playbook for incident response
   */
  async registerPlaybook(playbook: Playbook): Promise<Playbook> {
    this.playbooks.set(playbook.id, playbook)
    this.logger.info(`Playbook registered: ${playbook.id}`, { name: playbook.name })
    return playbook
  }

  /**
   * Find and select appropriate playbooks for an incident
   */
  async selectPlaybooks(incident: Incident): Promise<Playbook[]> {
    const candidates: Playbook[] = []

    for (const playbook of Array.from(this.playbooks.values())) {
      // Check if playbook matches incident type
      if (playbook.incidentType !== incident.type) {
        continue
      }

      // Check severity match
      const severityRank = this.getSeverityRank(playbook.severityLevel)
      const incidentRank = this.getSeverityRank(incident.severity)
      if (severityRank > incidentRank) {
        continue
      }

      // Verify prerequisites
      const prereqsMet = await this.checkPrerequisites(playbook.prerequisites)
      if (!prereqsMet) {
        this.logger.warn(`Playbook ${playbook.id} prerequisites not met`, { prerequisites: playbook.prerequisites })
        continue
      }

      candidates.push(playbook)
    }

    // Sort by severity match and expected duration
    candidates.sort((a, b) => {
      const aRank = this.getSeverityRank(a.severityLevel)
      const bRank = this.getSeverityRank(b.severityLevel)
      if (aRank !== bRank) return bRank - aRank
      return a.expectedDuration - b.expectedDuration
    })

    this.logger.info(`Selected ${candidates.length} playbooks for incident ${incident.id}`)
    return candidates
  }

  /**
   * Register escalation chain for incident severity
   */
  async registerEscalationChain(
    incidentType: string,
    chain: EscalationChain[]
  ): Promise<void> {
    this.escalationChains.set(incidentType, chain)
    this.logger.info(`Escalation chain registered for ${incidentType}`, {
      levels: chain.length
    })
  }

  /**
   * Get an incident by ID
   */
  getIncident(incidentId: string): Incident | undefined {
    return this.incidents.get(incidentId)
  }

  /**
   * Get a playbook by ID
   */
  getPlaybook(playbookId: string): Playbook | undefined {
    return this.playbooks.get(playbookId)
  }

  /**
   * Get all incidents
   */
  getAllIncidents(): Incident[] {
    return Array.from(this.incidents.values())
  }

  /**
   * Get all playbooks
   */
  getAllPlaybooks(): Playbook[] {
    return Array.from(this.playbooks.values())
  }

  /**
   * Get escalation chain by type
   */
  getEscalationChain(incidentType: string): EscalationChain[] | undefined {
    return this.escalationChains.get(incidentType)
  }

  /**
   * Calculate incident impact score based on severity and affected systems
   */
  protected calculateImpactScore(severity: IncidentSeverity, affectedSystemsCount: number): number {
    const severityScores: Record<IncidentSeverity, number> = {
      [IncidentSeverity.CRITICAL]: 25,
      [IncidentSeverity.HIGH]: 20,
      [IncidentSeverity.MEDIUM]: 15,
      [IncidentSeverity.LOW]: 10
    }

    const baseScore = severityScores[severity]
    const systemImpact = Math.min(affectedSystemsCount * 2, 25)

    return Math.min(baseScore + systemImpact, 100)
  }

  /**
   * Get numeric rank for severity level (higher = more severe)
   */
  protected getSeverityRank(severity: IncidentSeverity): number {
    const ranks: Record<IncidentSeverity, number> = {
      [IncidentSeverity.CRITICAL]: 4,
      [IncidentSeverity.HIGH]: 3,
      [IncidentSeverity.MEDIUM]: 2,
      [IncidentSeverity.LOW]: 1
    }
    return ranks[severity]
  }

  /**
   * Check if playbook prerequisites are satisfied
   */
  protected async checkPrerequisites(_prerequisites: string[]): Promise<boolean> {
    // Implementation would check system state, available tools, etc.
    return true
  }
}

export default ResponseCoordinator
