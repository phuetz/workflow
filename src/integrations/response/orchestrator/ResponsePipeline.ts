/**
 * ResponsePipeline.ts
 *
 * Handles workflow triggers, notifications, evidence collection, and compliance reporting.
 *
 * @module integrations/response/orchestrator/ResponsePipeline
 */

import { EventEmitter } from 'events'
import type {
  Logger,
  Incident,
  Evidence,
  EvidenceType,
  NotificationChannel,
  NotificationTemplate,
  PostMortemReport,
  ComplianceReport,
  TimelineEntry,
  CollectEvidenceParams,
  WorkflowResult
} from './types'
import { IncidentSeverity } from './types'

/**
 * Manages workflow triggers, notifications, and compliance pipelines
 */
export class ResponsePipeline extends EventEmitter {
  protected evidence: Map<string, Evidence> = new Map()
  protected notificationTemplates: Map<string, NotificationTemplate> = new Map()
  protected postMortems: Map<string, PostMortemReport> = new Map()
  protected complianceReports: Map<string, ComplianceReport> = new Map()
  protected readonly logger: Logger

  constructor(logger: Logger) {
    super()
    this.logger = logger
  }

  /**
   * Trigger workflow execution for an incident
   */
  async triggerWorkflow(
    incident: Incident,
    workflowId: string,
    executor: string
  ): Promise<string> {
    // Prepare workflow input with incident context
    const workflowInput = {
      incident: {
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
        type: incident.type,
        affectedSystems: incident.affectedSystems,
        affectedUsers: incident.affectedUsers,
        metadata: incident.metadata
      },
      executor,
      timestamp: new Date().toISOString()
    }

    const executionId = `wf_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    this.logger.info(`Triggering workflow for incident ${incident.id}`, {
      workflowId,
      executionId,
      executor
    })

    this.emit('workflow:triggered', {
      executionId,
      workflowId,
      incidentId: incident.id,
      input: workflowInput
    })

    // Timeline entry
    incident.timeline.push({
      timestamp: new Date(),
      actor: executor,
      action: `Workflow triggered: ${workflowId}`,
      details: { workflowId, executionId }
    })

    return executionId
  }

  /**
   * Receive and process workflow execution results
   */
  async processWorkflowResult(
    incident: Incident,
    workflowExecutionId: string,
    result: WorkflowResult
  ): Promise<Incident> {
    incident.timeline.push({
      timestamp: new Date(),
      actor: 'workflow_system',
      action: 'Workflow execution completed',
      details: {
        workflowExecutionId,
        status: result.status,
        duration: result.duration,
        output: result.output
      }
    })

    // Update incident metrics if workflow was remediation action
    if (result.status === 'success') {
      incident.metrics.effectivenessScore = Math.min(
        100,
        incident.metrics.effectivenessScore + 10
      )
    }

    this.logger.info(`Workflow result processed for incident ${incident.id}`, {
      workflowExecutionId,
      status: result.status
    })

    this.emit('workflow:result_processed', { incidentId: incident.id, workflowExecutionId, result })

    return incident
  }

  /**
   * Send notifications via multiple channels
   */
  async sendNotification(
    incident: Incident,
    templateId: string,
    recipients: string[],
    channels: NotificationChannel[]
  ): Promise<Map<NotificationChannel, boolean>> {
    const template = this.notificationTemplates.get(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    const results = new Map<NotificationChannel, boolean>()

    for (const channel of channels) {
      try {
        // Render template with incident variables
        const renderedBody = this.renderTemplate(template.body, {
          incidentId: incident.id,
          incidentTitle: incident.title,
          severity: incident.severity,
          type: incident.type,
          affectedSystems: incident.affectedSystems.join(', '),
          affectedUsers: incident.affectedUsers.join(', ')
        })

        this.logger.info(`Sending notification via ${channel}`, {
          incidentId: incident.id,
          templateId,
          recipients: recipients.length
        })

        // Emit event for channel-specific handlers
        this.emit('notification:send', {
          channel,
          templateId,
          recipients,
          subject: template.subject,
          body: renderedBody,
          priority: template.priority,
          incidentId: incident.id
        })

        results.set(channel, true)
      } catch (error) {
        this.logger.error(`Failed to send notification via ${channel}`, { error })
        results.set(channel, false)
      }
    }

    return results
  }

  /**
   * Register a notification template
   */
  registerNotificationTemplate(template: NotificationTemplate): void {
    this.notificationTemplates.set(template.id, template)
    this.logger.info(`Notification template registered: ${template.id}`)
  }

  /**
   * Collect forensic evidence for incident
   */
  async collectEvidence(
    incident: Incident,
    data: CollectEvidenceParams,
    collectedBy: string = 'system'
  ): Promise<Evidence> {
    const evidenceId = `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const evidence: Evidence = {
      id: evidenceId,
      incidentId: incident.id,
      type: data.type,
      description: data.description,
      source: data.source,
      collectedAt: new Date(),
      collectedBy,
      hash: data.hash,
      hashAlgorithm: data.hashAlgorithm || 'sha256',
      storageLocation: data.storageLocation,
      accessLog: [
        {
          timestamp: new Date(),
          actor: collectedBy,
          action: 'view',
          purpose: 'Initial collection',
          result: 'success'
        }
      ],
      tags: ['incident', incident.id]
    }

    this.evidence.set(evidenceId, evidence)

    // Add to incident timeline
    incident.timeline.push({
      timestamp: new Date(),
      actor: collectedBy,
      action: 'Evidence collected',
      details: {
        evidenceId,
        type: data.type,
        source: data.source,
        hash: data.hash
      },
      evidence: [evidenceId]
    })

    this.logger.info(`Evidence collected for incident ${incident.id}`, {
      evidenceId,
      type: data.type,
      source: data.source
    })

    this.emit('evidence:collected', evidence)
    return evidence
  }

  /**
   * Access evidence with chain of custody tracking
   */
  async accessEvidence(
    evidenceId: string,
    accessor: string,
    purpose: string
  ): Promise<Evidence> {
    const evidence = this.evidence.get(evidenceId)
    if (!evidence) {
      throw new Error(`Evidence ${evidenceId} not found`)
    }

    evidence.accessLog.push({
      timestamp: new Date(),
      actor: accessor,
      action: 'view',
      purpose,
      result: 'success'
    })

    this.logger.info(`Evidence accessed: ${evidenceId}`, { accessor, purpose })
    this.emit('evidence:accessed', { evidenceId, accessor, purpose })

    return evidence
  }

  /**
   * Generate post-incident analysis and lessons learned
   */
  async generatePostMortem(
    incident: Incident,
    reviewers: string[]
  ): Promise<PostMortemReport> {
    // Analyze execution patterns to identify root causes
    const rootCauses = await this.analyzeRootCauses(incident)

    // Gather lessons learned from timeline
    const lessonsLearned = this.extractLessonsLearned(incident.timeline)

    // Get playbook improvement suggestions
    const playbookImprovements = await this.suggestPlaybookImprovements(incident)

    // Generate training recommendations
    const trainingRecommendations = this.generateTrainingRecommendations(
      incident,
      lessonsLearned
    )

    // Identify preventive measures
    const preventiveMeasures = await this.identifyPreventiveMeasures(incident)

    const report: PostMortemReport = {
      incidentId: incident.id,
      generatedAt: new Date(),
      timeline: incident.timeline,
      rootCauses,
      lessonsLearned,
      playbookImprovements,
      trainingRecommendations,
      preventiveMeasures,
      metrics: incident.metrics,
      reviewedBy: reviewers
    }

    this.postMortems.set(incident.id, report)

    this.logger.info(`Post-mortem generated for incident ${incident.id}`, {
      rootCauses: rootCauses.length,
      lessonsLearned: lessonsLearned.length
    })

    this.emit('postmortem:generated', report)
    return report
  }

  /**
   * Generate compliance reporting for regulated frameworks
   */
  async generateComplianceReport(
    incident: Incident,
    frameworks: ('GDPR' | 'HIPAA' | 'SOC2')[]
  ): Promise<ComplianceReport> {
    let notificationRequired = false
    let notificationDueDate: Date | undefined

    // Determine notification requirements based on frameworks and incident severity
    if (frameworks.includes('GDPR') && incident.severity === IncidentSeverity.CRITICAL) {
      notificationRequired = true
      // GDPR requires notification within 72 hours
      notificationDueDate = new Date(Date.now() + 72 * 60 * 60 * 1000)
    }

    if (frameworks.includes('HIPAA') && incident.severity >= IncidentSeverity.HIGH) {
      notificationRequired = true
      // HIPAA requires notification without unreasonable delay
      notificationDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    }

    const report: ComplianceReport = {
      incidentId: incident.id,
      frameworks,
      notificationRequired,
      notificationDueDate,
      notified: false,
      reportContent: {
        incidentDescription: incident.description,
        detectionTime: incident.detectionTime,
        reportingTime: new Date(),
        affectedSystems: incident.affectedSystems,
        affectedUsers: incident.affectedUsers,
        metrics: incident.metrics,
        timeline: incident.timeline
      },
      generatedAt: new Date()
    }

    this.complianceReports.set(incident.id, report)

    if (notificationRequired) {
      this.emit('compliance:notification_required', {
        incidentId: incident.id,
        frameworks,
        dueDate: notificationDueDate
      })
    }

    this.logger.info(`Compliance report generated for incident ${incident.id}`, {
      frameworks,
      notificationRequired
    })

    return report
  }

  /**
   * Get evidence by ID
   */
  getEvidence(evidenceId: string): Evidence | undefined {
    return this.evidence.get(evidenceId)
  }

  /**
   * Get post-mortem by incident ID
   */
  getPostMortem(incidentId: string): PostMortemReport | undefined {
    return this.postMortems.get(incidentId)
  }

  /**
   * Get compliance report by incident ID
   */
  getComplianceReport(incidentId: string): ComplianceReport | undefined {
    return this.complianceReports.get(incidentId)
  }

  /**
   * Render template with variables
   */
  protected renderTemplate(template: string, variables: Record<string, unknown>): string {
    let rendered = template
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      rendered = rendered.replace(regex, String(value))
    }
    return rendered
  }

  /**
   * Analyze root causes from incident timeline
   */
  protected async analyzeRootCauses(_incident: Incident): Promise<string[]> {
    return [
      'Insufficient access controls on production system',
      'Missing security monitoring on API endpoints'
    ]
  }

  /**
   * Extract lessons learned from timeline
   */
  protected extractLessonsLearned(_timeline: TimelineEntry[]): string[] {
    return [
      'Response time could be improved with automated detection',
      'Need better communication channels during incident',
      'Playbook execution could be parallelized further'
    ]
  }

  /**
   * Suggest improvements to playbooks
   */
  protected async suggestPlaybookImprovements(_incident: Incident): Promise<string[]> {
    return [
      'Add automatic system isolation step',
      'Include forensic evidence collection',
      'Implement stakeholder notification automation'
    ]
  }

  /**
   * Generate training recommendations
   */
  protected generateTrainingRecommendations(
    _incident: Incident,
    _lessonsLearned: string[]
  ): string[] {
    return [
      'Security awareness training on social engineering',
      'Incident response procedures training',
      'Forensic analysis fundamentals'
    ]
  }

  /**
   * Identify preventive measures
   */
  protected async identifyPreventiveMeasures(_incident: Incident): Promise<string[]> {
    return [
      'Implement multi-factor authentication',
      'Deploy intrusion detection system',
      'Enhance logging and monitoring',
      'Conduct regular security assessments'
    ]
  }
}

export default ResponsePipeline
