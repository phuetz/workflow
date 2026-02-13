/**
 * Incident Response System - Facade
 * Automated detection, classification, and response to security incidents
 * Supports 8+ incident categories with configurable playbooks and detection rules
 *
 * This file serves as a facade that re-exports from modular components.
 * For direct access to modules, import from './responder'
 */

import { EventEmitter } from 'events'
import { ResponseCoordinator } from './responder/ResponseCoordinator'
import { EscalationManager } from './responder/EscalationManager'
import { ActionExecutor } from './responder/ActionExecutor'
import { getDefaultDetectionRules, getDefaultPlaybooks } from './responder/DefaultConfig'
import {
  Incident,
  IncidentCategory,
  IncidentStatus,
  IncidentFilter,
  IncidentEvent,
  DetectionRule,
  ResponsePlaybook,
  SecurityEvent,
  DateRange,
  IncidentStatistics,
  PostMortem,
  ForensicData,
  Evidence,
  ResponseAction
} from './responder/types'

// Re-export all types for backward compatibility
export * from './responder/types'

// Re-export modules for direct access
export { ResponseCoordinator } from './responder/ResponseCoordinator'
export { EscalationManager } from './responder/EscalationManager'
export { ActionExecutor } from './responder/ActionExecutor'
export { getDefaultDetectionRules, getDefaultPlaybooks } from './responder/DefaultConfig'

/**
 * Main IncidentResponder Facade Class
 * Maintains backward compatibility with existing API
 */
export class IncidentResponder extends EventEmitter {
  private coordinator: ResponseCoordinator
  private escalation: EscalationManager
  private executor: ActionExecutor

  constructor() {
    super()
    this.coordinator = new ResponseCoordinator()
    this.escalation = new EscalationManager()
    this.executor = new ActionExecutor()

    this.initializeDefaults()
    this.setupEventForwarding()
  }

  private initializeDefaults(): void {
    getDefaultDetectionRules().forEach((rule) => this.coordinator.addDetectionRule(rule))
    getDefaultPlaybooks().forEach((playbook) => this.coordinator.addPlaybook(playbook))
  }

  private setupEventForwarding(): void {
    // Forward coordinator events
    const coordEvents = ['incident:created', 'incident:status-changed', 'incident:assigned',
      'incident:resolved', 'incident:closed', 'incidents:linked', 'rule:added', 'rule:removed',
      'playbook:added', 'playbook:executing', 'playbook:executed', 'timeline:event-added']
    coordEvents.forEach((e) => this.coordinator.on(e, (d) => this.emit(e, d)))

    // Forward escalation events
    this.escalation.on('incident:escalated', (d) => this.emit('incident:escalated', d))
    this.escalation.on('postmortem:generated', (d) => this.emit('postmortem:generated', d))

    // Forward executor events
    const execEvents = ['action:executing', 'action:executed', 'error:action-failed', 'ip:blocked',
      'ip:unblocked', 'account:locked', 'account:unlocked', 'session:terminated', 'token:revoked',
      'api-key:disabled', 'resource:quarantined', 'system:isolated', 'backup:triggered',
      'security-team:alerted', 'forensics:captured']
    execEvents.forEach((e) => this.executor.on(e, (d) => this.emit(e, d)))
  }

  // Incident Lifecycle
  createIncident(data: Partial<Incident>): Incident {
    const incident = this.coordinator.createIncident(data)
    if (incident.severity === 'critical' || incident.severity === 'high') {
      this.respondToIncident(incident).catch((err) => this.emit('error', err))
    }
    this.escalation.setEscalationTimer(incident)
    return incident
  }

  getIncident(id: string): Incident | undefined { return this.coordinator.getIncident(id) }
  getAllIncidents(filter?: IncidentFilter): Incident[] { return this.coordinator.getAllIncidents(filter) }

  async updateIncidentStatus(id: string, status: IncidentStatus): Promise<void> {
    await this.coordinator.updateIncidentStatus(id, status)
    if (status === IncidentStatus.RESOLVED) this.escalation.clearEscalationTimer(id)
  }

  async assignIncident(id: string, userId: string): Promise<void> {
    return this.coordinator.assignIncident(id, userId)
  }

  async resolveIncident(id: string, resolution: string): Promise<void> {
    await this.coordinator.resolveIncident(id, resolution)
    const incident = this.coordinator.getIncident(id)
    if (incident) incident.postMortem = await this.escalation.generatePostMortem(incident)
  }

  addTimelineEvent(incidentId: string, event: IncidentEvent): void {
    this.coordinator.addTimelineEvent(incidentId, event)
  }

  getTimeline(incidentId: string): IncidentEvent[] { return this.coordinator.getTimeline(incidentId) }
  linkIncidents(incidentId: string, relatedId: string): void { this.coordinator.linkIncidents(incidentId, relatedId) }
  closeIncident(incidentId: string): void { this.coordinator.closeIncident(incidentId) }

  // Detection & Playbooks
  addDetectionRule(rule: DetectionRule): void { this.coordinator.addDetectionRule(rule) }
  removeDetectionRule(ruleId: string): void { this.coordinator.removeDetectionRule(ruleId) }
  getDetectionRules(): DetectionRule[] { return this.coordinator.getDetectionRules() }
  detectIncidents(events: SecurityEvent[]): Incident[] { return this.coordinator.detectIncidents(events) }
  evaluateDetectionRules(event: SecurityEvent): Partial<Incident> | null {
    return this.coordinator.evaluateDetectionRules(event)
  }
  addPlaybook(playbook: ResponsePlaybook): void { this.coordinator.addPlaybook(playbook) }
  getPlaybook(category: IncidentCategory): ResponsePlaybook | undefined {
    return this.coordinator.getPlaybook(category)
  }
  getPlaybooks(): ResponsePlaybook[] { return this.coordinator.getPlaybooks() }
  async executePlaybook(playbookId: string, incident: Incident): Promise<void> {
    return this.coordinator.executePlaybook(playbookId, incident)
  }

  // Response & Execution
  async respondToIncident(incident: Incident): Promise<ResponseAction[]> {
    await this.updateIncidentStatus(incident.id, IncidentStatus.ANALYZING)
    const actions: ResponseAction[] = []
    const playbook = this.coordinator.getPlaybook(incident.category)
    if (playbook && incident.severity === 'critical') {
      await this.coordinator.executePlaybook(playbook.id, incident)
    }
    for (const actionType of this.coordinator.getAutomaticResponseActions(incident)) {
      const action = await this.executor.createAndExecuteAction(actionType, incident)
      actions.push(action)
      incident.responseActions.push(action)
    }
    await this.updateIncidentStatus(incident.id, IncidentStatus.CONTAINED)
    this.emit('incident:responded', { incident, actions })
    return actions
  }

  async executeAction(action: ResponseAction, incident: Incident): Promise<void> {
    return this.executor.executeAction(action, incident)
  }
  async blockIP(ipAddress: string, duration: number): Promise<void> {
    return this.executor.blockIP(ipAddress, duration)
  }
  async lockAccount(userId: string, reason: string): Promise<void> {
    return this.executor.lockAccount(userId, reason)
  }
  async unlockAccount(userId: string): Promise<void> { return this.executor.unlockAccount(userId) }
  async terminateSession(sessionId: string): Promise<void> {
    return this.executor.terminateSession(sessionId)
  }
  async revokeToken(token: string): Promise<void> { return this.executor.revokeToken(token) }
  async disableAPIKey(apiKey: string): Promise<void> { return this.executor.disableAPIKey(apiKey) }
  async captureForensics(incident: Incident): Promise<ForensicData> {
    return this.executor.captureForensics(incident)
  }
  async alertSecurityTeam(incident: Incident): Promise<void> {
    return this.executor.alertSecurityTeam(incident)
  }
  async gatherEvidence(incident: Incident): Promise<Evidence[]> {
    return this.executor.gatherEvidence(incident)
  }
  isIPBlocked(ipAddress: string): boolean { return this.executor.isIPBlocked(ipAddress) }
  isAccountLocked(userId: string): boolean { return this.executor.isAccountLocked(userId) }
  isTokenRevoked(token: string): boolean { return this.executor.isTokenRevoked(token) }
  isAPIKeyDisabled(apiKey: string): boolean { return this.executor.isAPIKeyDisabled(apiKey) }

  // Statistics & Metrics
  getIncidentStats(dateRange: DateRange): IncidentStatistics {
    return this.escalation.getIncidentStats(this.coordinator.getIncidentHistory(), dateRange)
  }
  getMTTD(): number { return this.escalation.getMTTD(this.coordinator.getIncidentHistory()) }
  getMTTR(): number { return this.escalation.getMTTR(this.coordinator.getIncidentHistory()) }
  getMTTRe(): number { return this.escalation.getMTTRe(this.coordinator.getIncidentHistory()) }
  getAutomationRate(): number {
    return this.escalation.getAutomationRate(this.coordinator.getIncidentHistory())
  }
  async generatePostMortem(incidentId: string): Promise<PostMortem> {
    const incident = this.coordinator.getIncident(incidentId)
    if (!incident) throw new Error(`Incident ${incidentId} not found`)
    return this.escalation.generatePostMortem(incident)
  }
}

export default IncidentResponder
