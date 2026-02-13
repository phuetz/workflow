/**
 * Response Coordinator
 * Manages incident lifecycle, detection rules, and playbook execution
 */

import { EventEmitter } from 'events'
import crypto from 'crypto'
import {
  Incident,
  IncidentCategory,
  IncidentStatus,
  IncidentEvent,
  IncidentFilter,
  DetectionRule,
  ResponsePlaybook,
  SecurityEvent,
  Condition,
  ResponseActionType
} from './types'
import { getAutomaticResponseActions as getAutoActions } from './DefaultConfig'

export class ResponseCoordinator extends EventEmitter {
  private incidents: Map<string, Incident> = new Map()
  private detectionRules: Map<string, DetectionRule> = new Map()
  private playbooks: Map<string, ResponsePlaybook> = new Map()
  private incidentHistory: Incident[] = []
  private readonly MAX_INCIDENTS = 500

  constructor() {
    super()
  }

  /**
   * Create a new incident
   */
  createIncident(data: Partial<Incident>): Incident {
    const incident: Incident = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      title: data.title || 'Unnamed Incident',
      description: data.description || '',
      severity: data.severity || 'medium',
      category: data.category || IncidentCategory.CONFIGURATION_ERROR,
      status: IncidentStatus.DETECTED,
      affectedResources: data.affectedResources || [],
      affectedUsers: data.affectedUsers || [],
      detectionMethod: data.detectionMethod || 'manual',
      indicators: data.indicators || [],
      timeline: [
        {
          timestamp: new Date(),
          type: 'INCIDENT_CREATED',
          description: 'Incident detected and created'
        },
        ...(data.timeline || [])
      ],
      responseActions: [],
      relatedIncidents: data.relatedIncidents || []
    }

    this.incidents.set(incident.id, incident)
    this.incidentHistory.push(incident)

    if (this.incidentHistory.length > this.MAX_INCIDENTS) {
      this.incidentHistory.shift()
    }

    this.emit('incident:created', incident)
    return incident
  }

  /**
   * Get incident by ID
   */
  getIncident(id: string): Incident | undefined {
    return this.incidents.get(id)
  }

  /**
   * Get all incidents with optional filtering
   */
  getAllIncidents(filter?: IncidentFilter): Incident[] {
    let results = Array.from(this.incidents.values())

    if (filter) {
      if (filter.status) {
        results = results.filter((i) => i.status === filter.status)
      }
      if (filter.category) {
        results = results.filter((i) => i.category === filter.category)
      }
      if (filter.severity) {
        results = results.filter((i) => i.severity === filter.severity)
      }
      if (filter.assignedTo) {
        results = results.filter((i) => i.assignedTo === filter.assignedTo)
      }
      if (filter.startDate) {
        results = results.filter((i) => i.timestamp >= filter.startDate!)
      }
      if (filter.endDate) {
        results = results.filter((i) => i.timestamp <= filter.endDate!)
      }
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(id: string, status: IncidentStatus): Promise<void> {
    const incident = this.incidents.get(id)
    if (!incident) throw new Error(`Incident ${id} not found`)

    const previousStatus = incident.status
    incident.status = status

    incident.timeline.push({
      timestamp: new Date(),
      type: 'STATUS_CHANGED',
      description: `Status changed from ${previousStatus} to ${status}`
    })

    this.emit('incident:status-changed', { incident, previousStatus, status })
  }

  /**
   * Assign incident to a user
   */
  async assignIncident(id: string, userId: string): Promise<void> {
    const incident = this.incidents.get(id)
    if (!incident) throw new Error(`Incident ${id} not found`)

    const previousAssignee = incident.assignedTo
    incident.assignedTo = userId

    incident.timeline.push({
      timestamp: new Date(),
      type: 'ASSIGNED',
      description: `Assigned to ${userId}`,
      actor: userId
    })

    this.emit('incident:assigned', { incident, previousAssignee, userId })
  }

  /**
   * Resolve an incident
   */
  async resolveIncident(id: string, resolution: string): Promise<void> {
    const incident = this.incidents.get(id)
    if (!incident) throw new Error(`Incident ${id} not found`)

    incident.status = IncidentStatus.RESOLVED
    incident.resolvedAt = new Date()

    incident.timeline.push({
      timestamp: new Date(),
      type: 'RESOLVED',
      description: resolution
    })

    this.emit('incident:resolved', { incident, resolution })
  }

  /**
   * Add event to incident timeline
   */
  addTimelineEvent(incidentId: string, event: IncidentEvent): void {
    const incident = this.incidents.get(incidentId)
    if (!incident) throw new Error(`Incident ${incidentId} not found`)

    incident.timeline.push(event)
    this.emit('timeline:event-added', { incidentId, event })
  }

  /**
   * Get incident timeline
   */
  getTimeline(incidentId: string): IncidentEvent[] {
    const incident = this.incidents.get(incidentId)
    if (!incident) throw new Error(`Incident ${incidentId} not found`)

    return incident.timeline
  }

  /**
   * Link related incidents
   */
  linkIncidents(incidentId: string, relatedId: string): void {
    const incident = this.incidents.get(incidentId)
    const related = this.incidents.get(relatedId)

    if (!incident || !related) {
      throw new Error('One or both incidents not found')
    }

    if (!incident.relatedIncidents) incident.relatedIncidents = []
    if (!related.relatedIncidents) related.relatedIncidents = []

    incident.relatedIncidents.push(relatedId)
    related.relatedIncidents.push(incidentId)

    this.emit('incidents:linked', { incidentId, relatedId })
  }

  /**
   * Close incident (soft delete)
   */
  closeIncident(incidentId: string): void {
    const incident = this.incidents.get(incidentId)
    if (incident) {
      incident.status = IncidentStatus.CLOSED
      incident.timeline.push({
        timestamp: new Date(),
        type: 'CLOSED',
        description: 'Incident closed'
      })
      this.emit('incident:closed', incident)
    }
  }

  // ============================================================================
  // Detection Rules Management
  // ============================================================================

  /**
   * Add a detection rule
   */
  addDetectionRule(rule: DetectionRule): void {
    const ruleId = rule.id || crypto.randomUUID()
    this.detectionRules.set(ruleId, { ...rule, id: ruleId })
    this.emit('rule:added', rule)
  }

  /**
   * Remove a detection rule
   */
  removeDetectionRule(ruleId: string): void {
    this.detectionRules.delete(ruleId)
    this.emit('rule:removed', ruleId)
  }

  /**
   * Get all detection rules
   */
  getDetectionRules(): DetectionRule[] {
    return Array.from(this.detectionRules.values())
  }

  /**
   * Detect incidents from security events
   */
  detectIncidents(events: SecurityEvent[]): Incident[] {
    const detectedIncidents: Incident[] = []

    for (const event of events) {
      const incident = this.evaluateDetectionRules(event)
      if (incident) {
        detectedIncidents.push(this.createIncident(incident))
      }
    }

    return detectedIncidents
  }

  /**
   * Evaluate detection rules against security event
   */
  evaluateDetectionRules(event: SecurityEvent): Partial<Incident> | null {
    for (const rule of this.detectionRules.values()) {
      if (!rule.enabled) continue

      if (this.matchesConditions(event, rule.conditions)) {
        return {
          title: rule.name,
          description: rule.description,
          category: rule.category,
          severity: rule.severity,
          detectionMethod: `Rule: ${rule.name}`,
          indicators: [
            {
              type: 'security_event',
              value: event,
              timestamp: event.timestamp,
              severity: rule.severity as any
            }
          ]
        }
      }
    }

    return null
  }

  /**
   * Check if event matches detection rule conditions
   */
  private matchesConditions(event: SecurityEvent, conditions: Condition[]): boolean {
    for (const condition of conditions) {
      const eventValue = (event.details as any)[condition.field]

      switch (condition.operator) {
        case 'equals':
          if (eventValue !== condition.value) return false
          break
        case 'greater_than':
          if (eventValue <= condition.value) return false
          break
        case 'less_than':
          if (eventValue >= condition.value) return false
          break
        case 'contains':
          if (!String(eventValue).includes(condition.value)) return false
          break
        case 'matches':
          if (!new RegExp(condition.value).test(eventValue)) return false
          break
      }
    }

    return true
  }

  // ============================================================================
  // Playbook Management
  // ============================================================================

  /**
   * Add a playbook
   */
  addPlaybook(playbook: ResponsePlaybook): void {
    this.playbooks.set(playbook.id, playbook)
    this.emit('playbook:added', playbook)
  }

  /**
   * Get playbook by category
   */
  getPlaybook(category: IncidentCategory): ResponsePlaybook | undefined {
    for (const playbook of this.playbooks.values()) {
      if (playbook.category === category) {
        return playbook
      }
    }
    return undefined
  }

  /**
   * Get all playbooks
   */
  getPlaybooks(): ResponsePlaybook[] {
    return Array.from(this.playbooks.values())
  }

  /**
   * Execute a playbook
   */
  async executePlaybook(playbookId: string, incident: Incident): Promise<void> {
    const playbook = this.playbooks.get(playbookId)
    if (!playbook) throw new Error(`Playbook ${playbookId} not found`)

    this.emit('playbook:executing', { playbook, incident })

    const sortedSteps = playbook.steps.sort((a, b) => a.order - b.order)

    for (const step of sortedSteps) {
      incident.timeline.push({
        timestamp: new Date(),
        type: 'PLAYBOOK_STEP',
        description: `Executing: ${step.action}`
      })

      if (step.automated) {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000))
      }

      incident.timeline.push({
        timestamp: new Date(),
        type: 'PLAYBOOK_STEP_COMPLETED',
        description: `Completed: ${step.action}`
      })
    }

    this.emit('playbook:executed', { playbook, incident })
  }

  /**
   * Get automatic response actions for incident category
   */
  getAutomaticResponseActions(incident: Incident): ResponseActionType[] {
    return getAutoActions(incident)
  }

  /**
   * Get incident history
   */
  getIncidentHistory(): Incident[] {
    return [...this.incidentHistory]
  }
}
