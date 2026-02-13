/**
 * ResponseOrchestrator.ts
 *
 * Comprehensive incident response orchestration system with multi-playbook execution,
 * workflow integration, and advanced incident management capabilities.
 *
 * This file serves as a facade, re-exporting from modular components in ./orchestrator/
 *
 * @module integrations/response
 */

import { EventEmitter } from 'events'

// Re-export all types from the orchestrator module
export {
  // Enums
  IncidentSeverity,
  IncidentStatus,
  ActionType,
  NotificationChannel,
  PlaybookStatus,
  EvidenceType,
  // Interfaces
  type Logger,
  type TimelineEntry,
  type Incident,
  type IncidentMetrics,
  type Playbook,
  type PlaybookAction,
  type ActionConfig,
  type RetryPolicy,
  type PlaybookExecution,
  type ActionResult,
  type ExecutionError,
  type Evidence,
  type AccessLogEntry,
  type EscalationChain,
  type NotificationTemplate,
  type ResourceLock,
  type PostMortemReport,
  type ComplianceReport,
  type DashboardMetrics,
  type CreateIncidentParams,
  type WorkflowResult,
  type CollectEvidenceParams
} from './orchestrator'

// Import modules for composition
import { ResponseCoordinator } from './orchestrator/ResponseCoordinator'
import { ActionQueue } from './orchestrator/ActionQueue'
import { ResponsePipeline } from './orchestrator/ResponsePipeline'
import { ResponseMetrics } from './orchestrator/ResponseMetrics'

// Import types for class definition
import type {
  Logger,
  Incident,
  IncidentStatus,
  Playbook,
  PlaybookExecution,
  Evidence,
  NotificationChannel,
  PostMortemReport,
  ComplianceReport,
  DashboardMetrics,
  EscalationChain,
  NotificationTemplate,
  CreateIncidentParams,
  CollectEvidenceParams,
  WorkflowResult
} from './orchestrator'

/**
 * Central orchestration engine for incident response
 *
 * Manages the complete lifecycle of incident response including:
 * - Incident creation and tracking
 * - Multi-playbook orchestration
 * - Workflow integration
 * - Resource management
 * - Communication coordination
 * - Evidence collection and chain of custody
 * - Metrics and reporting
 *
 * @class ResponseOrchestrator
 * @extends EventEmitter
 */
export class ResponseOrchestrator extends EventEmitter {
  private readonly coordinator: ResponseCoordinator
  private readonly actionQueue: ActionQueue
  private readonly pipeline: ResponsePipeline
  private readonly metricsCalculator: ResponseMetrics
  private readonly logger: Logger

  /**
   * Initialize the ResponseOrchestrator
   *
   * @param logger - Logger instance for logging operations
   */
  constructor(logger: Logger) {
    super()
    this.logger = logger
    this.coordinator = new ResponseCoordinator(logger)
    this.actionQueue = new ActionQueue(logger)
    this.pipeline = new ResponsePipeline(logger)
    this.metricsCalculator = new ResponseMetrics(logger)

    // Forward events from sub-components
    this.forwardEvents()
  }

  /**
   * Create a new incident and initialize tracking
   */
  async createIncident(data: CreateIncidentParams): Promise<Incident> {
    return this.coordinator.createIncident(data)
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
    return this.coordinator.updateIncidentStatus(incidentId, newStatus, actor, details)
  }

  /**
   * Register a playbook for incident response
   */
  async registerPlaybook(playbook: Playbook): Promise<Playbook> {
    return this.coordinator.registerPlaybook(playbook)
  }

  /**
   * Find and select appropriate playbooks for an incident
   */
  async selectPlaybooks(incident: Incident): Promise<Playbook[]> {
    return this.coordinator.selectPlaybooks(incident)
  }

  /**
   * Execute a playbook for an incident
   */
  async executePlaybook(
    incidentId: string,
    playbookId: string,
    executor: string,
    variables: Record<string, unknown> = {}
  ): Promise<PlaybookExecution> {
    const incident = this.coordinator.getIncident(incidentId)
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`)
    }

    const playbook = this.coordinator.getPlaybook(playbookId)
    if (!playbook) {
      throw new Error(`Playbook ${playbookId} not found`)
    }

    return this.actionQueue.executePlaybook(incident, playbook, executor, variables)
  }

  /**
   * Trigger workflow execution for an incident
   */
  async triggerWorkflow(
    incidentId: string,
    workflowId: string,
    executor: string
  ): Promise<string> {
    const incident = this.coordinator.getIncident(incidentId)
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`)
    }

    return this.pipeline.triggerWorkflow(incident, workflowId, executor)
  }

  /**
   * Receive and process workflow execution results
   */
  async processWorkflowResult(
    incidentId: string,
    workflowExecutionId: string,
    result: WorkflowResult
  ): Promise<Incident> {
    const incident = this.coordinator.getIncident(incidentId)
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`)
    }

    return this.pipeline.processWorkflowResult(incident, workflowExecutionId, result)
  }

  /**
   * Send notifications via multiple channels
   */
  async sendNotification(
    incidentId: string,
    templateId: string,
    recipients: string[],
    channels: NotificationChannel[]
  ): Promise<Map<NotificationChannel, boolean>> {
    const incident = this.coordinator.getIncident(incidentId)
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`)
    }

    return this.pipeline.sendNotification(incident, templateId, recipients, channels)
  }

  /**
   * Register escalation chain for incident severity
   */
  async registerEscalationChain(
    incidentType: string,
    chain: EscalationChain[]
  ): Promise<void> {
    return this.coordinator.registerEscalationChain(incidentType, chain)
  }

  /**
   * Collect forensic evidence for incident
   */
  async collectEvidence(
    incidentId: string,
    data: CollectEvidenceParams,
    collectedBy: string = 'system'
  ): Promise<Evidence> {
    const incident = this.coordinator.getIncident(incidentId)
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`)
    }

    return this.pipeline.collectEvidence(incident, data, collectedBy)
  }

  /**
   * Access evidence with chain of custody tracking
   */
  async accessEvidence(
    evidenceId: string,
    accessor: string,
    purpose: string
  ): Promise<Evidence> {
    return this.pipeline.accessEvidence(evidenceId, accessor, purpose)
  }

  /**
   * Generate post-incident analysis and lessons learned
   */
  async generatePostMortem(
    incidentId: string,
    reviewers: string[]
  ): Promise<PostMortemReport> {
    const incident = this.coordinator.getIncident(incidentId)
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`)
    }

    return this.pipeline.generatePostMortem(incident, reviewers)
  }

  /**
   * Generate compliance reporting for regulated frameworks
   */
  async generateComplianceReport(
    incidentId: string,
    frameworks: ('GDPR' | 'HIPAA' | 'SOC2')[]
  ): Promise<ComplianceReport> {
    const incident = this.coordinator.getIncident(incidentId)
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`)
    }

    return this.pipeline.generateComplianceReport(incident, frameworks)
  }

  /**
   * Get dashboard metrics summary
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const incidents = this.coordinator.getAllIncidents()
    const executions = this.actionQueue.getAllExecutions()
    return this.metricsCalculator.getDashboardMetrics(incidents, executions)
  }

  /**
   * Acquire resource lock for action deconfliction
   */
  async acquireResourceLock(
    resourceId: string,
    lockedBy: string,
    reason: string,
    durationMs: number = 5 * 60 * 1000
  ): Promise<boolean> {
    return this.actionQueue.acquireResourceLock(resourceId, lockedBy, reason, durationMs)
  }

  /**
   * Release resource lock
   */
  async releaseResourceLock(resourceId: string, releasedBy: string): Promise<void> {
    return this.actionQueue.releaseResourceLock(resourceId, releasedBy)
  }

  /**
   * Forward events from sub-components to this orchestrator
   */
  private forwardEvents(): void {
    const components = [this.coordinator, this.actionQueue, this.pipeline]

    const events = [
      'incident:created',
      'incident:status_changed',
      'playbook:execution_started',
      'playbook:execution_completed',
      'playbook:execution_failed',
      'workflow:triggered',
      'workflow:result_processed',
      'notification:send',
      'evidence:collected',
      'evidence:accessed',
      'postmortem:generated',
      'compliance:notification_required'
    ]

    for (const component of components) {
      for (const event of events) {
        component.on(event, (...args) => this.emit(event, ...args))
      }
    }
  }
}

export default ResponseOrchestrator
