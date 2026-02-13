/**
 * SecurityOrchestrationHub - Enterprise SOAR Hub
 * Centralized incident response coordination with multi-tool integration,
 * automated playbooks, containment actions, and comprehensive audit logging.
 * @module soc/SecurityOrchestrationHub
 */

import { EventEmitter } from 'events'
export * from './orchestration/types'

import { IncidentManager } from './orchestration/IncidentManager'
import { PlaybookRunner } from './orchestration/PlaybookRunner'
import { ContainmentManager } from './orchestration/ContainmentManager'
import { RemediationManager } from './orchestration/RemediationManager'
import { IntegrationManager } from './orchestration/IntegrationManager'
import { ReportGenerator } from './orchestration/ReportGenerator'
import { getDefaultPlaybooks } from './orchestration/DefaultPlaybooks'

import {
  SecurityIncident, ResponsePlaybook, PlaybookExecution, PlaybookExecutionStatus,
  ContainmentAction, RemediationAction, ContainmentRequest, RemediationRequest,
  RollbackRequest, RollbackResult, IntegrationConfig, IntegrationHealth,
  IntegrationSystem, IncidentState, IncidentReport, ActionAuditLog, HubConfig, ThreatSeverity
} from './orchestration/types'

export class SecurityOrchestrationHub extends EventEmitter {
  private static instance: SecurityOrchestrationHub | null = null
  private incidentManager: IncidentManager
  private playbookRunner: PlaybookRunner
  private containmentManager: ContainmentManager
  private remediationManager: RemediationManager
  private integrationManager: IntegrationManager
  private reportGenerator: ReportGenerator
  private config: HubConfig
  private cleanupTimer?: NodeJS.Timeout

  private constructor(config?: Partial<HubConfig>) {
    super()
    this.config = {
      autoContainCritical: true, autoContainHigh: false, requireApprovalForContainment: false,
      containmentApprovers: ['security_manager', 'soc_lead'],
      remediationApprovers: ['security_manager', 'ciso'],
      maxConcurrentPlaybooks: 10, defaultPlaybookTimeout: 3600000, auditRetentionDays: 365,
      healthCheckIntervalMs: 60000, escalationTimeoutMs: 1800000, enabledIntegrations: [],
      ...config
    }
    this.incidentManager = new IncidentManager(this.config.auditRetentionDays)
    this.playbookRunner = new PlaybookRunner(this.config.maxConcurrentPlaybooks)
    this.containmentManager = new ContainmentManager()
    this.remediationManager = new RemediationManager(this.config.remediationApprovers)
    this.integrationManager = new IntegrationManager(this.config.healthCheckIntervalMs)
    this.reportGenerator = new ReportGenerator()
    this.forwardEvents()
    getDefaultPlaybooks().forEach(p => this.playbookRunner.registerPlaybook(p))
    this.integrationManager.startHealthMonitoring()
    this.cleanupTimer = setInterval(() => {
      const removed = this.incidentManager.cleanupOldData()
      if (removed > 0) this.emit('cleanup:completed', { auditLogsRemoved: removed })
    }, 86400000)
  }

  private forwardEvents(): void {
    [this.incidentManager, this.playbookRunner, this.containmentManager,
     this.remediationManager, this.integrationManager, this.reportGenerator].forEach(m => {
      m.on('error', err => this.emit('error', err))
      const orig = m.emit.bind(m)
      m.emit = (e: string, ...a: unknown[]) => { this.emit(e, ...a); return orig(e, ...a) }
    })
  }

  public static getInstance(config?: Partial<HubConfig>): SecurityOrchestrationHub {
    if (!SecurityOrchestrationHub.instance) {
      SecurityOrchestrationHub.instance = new SecurityOrchestrationHub(config)
    }
    return SecurityOrchestrationHub.instance
  }

  public static resetInstance(): void {
    SecurityOrchestrationHub.instance?.destroy()
    SecurityOrchestrationHub.instance = null
  }

  // Playbook Management
  public registerPlaybook(playbook: ResponsePlaybook): ResponsePlaybook {
    const result = this.playbookRunner.registerPlaybook(playbook)
    this.incidentManager.logAudit({
      actor: 'system', actionType: 'playbook_register', target: playbook.id,
      targetType: 'playbook', status: 'completed',
      details: { name: playbook.name, version: playbook.version }
    })
    return result
  }

  public getPlaybook(id: string): ResponsePlaybook | undefined {
    return this.playbookRunner.getPlaybook(id)
  }

  public findMatchingPlaybooks(threatType: string, severity: ThreatSeverity): ResponsePlaybook[] {
    return this.playbookRunner.findMatchingPlaybooks(threatType, severity)
  }

  public async executePlaybook(playbookId: string, incidentId: string, executor: string,
    variables: Record<string, unknown> = {}): Promise<PlaybookExecution> {
    const incident = this.incidentManager.getIncident(incidentId)
    if (!incident) throw new Error(`Incident ${incidentId} not found`)
    const exec = await this.playbookRunner.executePlaybook(playbookId, incident, executor, variables)
    this.incidentManager.addPlaybookExecution(incidentId, exec.id)
    for (const [aid, res] of exec.actionResults) {
      this.incidentManager.addTimelineEntry(incidentId, executor, `Executed action: ${aid}`,
        { actionId: aid, status: res.status, duration: res.duration }, true)
    }
    this.incidentManager.logAudit({
      actor: executor, actionType: 'playbook_execute', target: playbookId,
      targetType: 'playbook', incidentId, executionId: exec.id,
      status: exec.status === PlaybookExecutionStatus.COMPLETED ? 'completed' : 'failed',
      details: { ...exec.metrics } as Record<string, unknown>
    })
    return exec
  }

  // Threat Containment
  public async containThreat(incidentId: string, actions: ContainmentRequest[],
    initiator: string): Promise<ContainmentAction[]> {
    const incident = this.incidentManager.getIncident(incidentId)
    if (!incident) throw new Error(`Incident ${incidentId} not found`)
    const results = await this.containmentManager.containThreat(
      incident, actions, initiator, this.config.requireApprovalForContainment)
    if (incident.state === IncidentState.INVESTIGATING) {
      this.incidentManager.updateIncidentState(incidentId, IncidentState.CONTAINING, initiator)
    }
    if (incident.containmentActions.length === actions.length) {
      this.incidentManager.updateMTTC(incidentId)
    }
    results.forEach(r => this.incidentManager.logAudit({
      actor: initiator, actionType: `containment_${r.type}`, target: r.target,
      targetType: r.targetType, incidentId,
      status: r.status === 'active' ? 'completed' : r.status === 'failed' ? 'failed' : 'initiated',
      details: { containmentId: r.id, type: r.type }
    }))
    return results
  }

  public async releaseContainment(id: string, by: string, reason: string): Promise<ContainmentAction> {
    const action = await this.containmentManager.releaseContainment(id, by, reason)
    this.incidentManager.logAudit({
      actor: by, actionType: 'containment_release', target: action.target,
      targetType: action.targetType, status: 'completed', details: { containmentId: id, reason }
    })
    return action
  }

  // Incident Remediation
  public async remediateIncident(incidentId: string, actions: RemediationRequest[],
    initiator: string): Promise<RemediationAction[]> {
    const incident = this.incidentManager.getIncident(incidentId)
    if (!incident) throw new Error(`Incident ${incidentId} not found`)
    const results = await this.remediationManager.remediateIncident(incident, actions, initiator)
    if (incident.state === IncidentState.CONTAINING) {
      this.incidentManager.updateIncidentState(incidentId, IncidentState.ERADICATING, initiator)
    }
    results.forEach(r => this.incidentManager.logAudit({
      actor: initiator, actionType: `remediation_${r.type}`, target: r.target,
      targetType: 'system', incidentId,
      status: r.status === 'completed' ? 'completed' : 'initiated',
      details: { remediationId: r.id, type: r.type }
    }))
    return results
  }

  public async approveRemediation(remediationId: string, approver: string): Promise<RemediationAction> {
    const incident = this.incidentManager.getIncidents().find(i =>
      i.remediationActions.some(a => a.id === remediationId))
    if (!incident) throw new Error(`Incident for remediation ${remediationId} not found`)
    return this.remediationManager.approveRemediation(remediationId, approver, incident)
  }

  // Integration Management
  public integrateSystem(config: IntegrationConfig): void {
    this.integrationManager.integrateSystem(config)
    this.incidentManager.logAudit({
      actor: 'system', actionType: 'integration_register', target: config.system,
      targetType: 'integration', status: 'completed',
      details: { name: config.name, baseUrl: config.baseUrl }
    })
  }

  public async checkHealth(): Promise<Map<IntegrationSystem, IntegrationHealth>> {
    return this.integrationManager.checkHealth()
  }

  // Rollback
  public async rollbackAction(request: RollbackRequest): Promise<RollbackResult> {
    const exec = this.playbookRunner.getExecution(request.executionId)
    if (!exec) throw new Error(`Execution ${request.executionId} not found`)
    if (!exec.rollbackAvailable) throw new Error(`Rollback not available for ${request.executionId}`)
    if (exec.rollbackExecuted) throw new Error(`Rollback already executed for ${request.executionId}`)

    const rolledBack: string[] = [], failed: string[] = [], errors: string[] = []
    const toRollback = (request.actionIds || Array.from(exec.actionResults.keys())).reverse()

    for (const aid of toRollback) {
      const res = exec.actionResults.get(aid)
      if (!res || res.rollbackStatus === 'not_available') continue
      try {
        await this.playbookRunner.executeActionRollback(aid, exec)
        res.rollbackStatus = 'executed'
        rolledBack.push(aid)
      } catch (e) {
        res.rollbackStatus = 'failed'
        failed.push(aid)
        errors.push(`${aid}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    exec.rollbackExecuted = true
    if (failed.length === 0) exec.status = PlaybookExecutionStatus.ROLLED_BACK

    this.incidentManager.logAudit({
      actor: request.requestedBy, actionType: 'rollback', target: request.executionId,
      targetType: 'execution', status: failed.length === 0 ? 'completed' : 'failed',
      details: { reason: request.reason, rolledBackActions: rolledBack, failedActions: failed }
    })
    this.emit('execution:rolled_back', { executionId: request.executionId, rolledBackActions: rolledBack, failedActions: failed })
    return { success: failed.length === 0, rolledBackActions: rolledBack, failedActions: failed, errors }
  }

  // Incident Management
  public createIncident(data: Partial<SecurityIncident>): SecurityIncident {
    const incident = this.incidentManager.createIncident(data)
    if ((incident.severity === ThreatSeverity.CRITICAL && this.config.autoContainCritical) ||
        (incident.severity === ThreatSeverity.HIGH && this.config.autoContainHigh)) {
      this.containmentManager.autoContainIncident(incident, this.config.autoContainCritical,
        this.config.autoContainHigh).catch(e => this.emit('error', e))
    }
    const playbook = this.findMatchingPlaybooks(incident.threatType, incident.severity)
      .find(p => p.autoExecute)
    if (playbook) {
      this.executePlaybook(playbook.id, incident.id, 'system').catch(e => this.emit('error', e))
    }
    return incident
  }

  public getIncident(id: string): SecurityIncident | undefined {
    return this.incidentManager.getIncident(id)
  }

  public updateIncidentState(id: string, state: IncidentState, by: string): SecurityIncident {
    return this.incidentManager.updateIncidentState(id, state, by)
  }

  public generateIncidentReport(incidentId: string, generatedBy: string): IncidentReport {
    const incident = this.incidentManager.getIncident(incidentId)
    if (!incident) throw new Error(`Incident ${incidentId} not found`)
    return this.reportGenerator.generateIncidentReport(incident, generatedBy)
  }

  // Public Getters
  public getPlaybooks(): ResponsePlaybook[] { return this.playbookRunner.getPlaybooks() }
  public getIncidents(): SecurityIncident[] { return this.incidentManager.getIncidents() }
  public getExecution(id: string): PlaybookExecution | undefined { return this.playbookRunner.getExecution(id) }
  public getAuditLogs(limit?: number): ActionAuditLog[] { return this.incidentManager.getAuditLogs(limit) }
  public getActiveContainments(): ContainmentAction[] { return this.containmentManager.getActiveContainments() }
  public getConfig(): HubConfig { return { ...this.config } }

  public getPendingApprovals(): Map<string, { type: 'containment' | 'remediation'; actionId: string; incidentId: string }> {
    return new Map([...this.containmentManager.getPendingApprovals(),
      ...this.remediationManager.getPendingApprovals()] as [string, { type: 'containment' | 'remediation'; actionId: string; incidentId: string }][])
  }

  public updateConfig(updates: Partial<HubConfig>): void {
    this.config = { ...this.config, ...updates }
    this.emit('config:updated', this.config)
  }

  public destroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer)
    this.incidentManager.clear()
    this.playbookRunner.clear()
    this.containmentManager.clear()
    this.remediationManager.clear()
    this.integrationManager.clear()
    this.removeAllListeners()
  }
}

export default SecurityOrchestrationHub
