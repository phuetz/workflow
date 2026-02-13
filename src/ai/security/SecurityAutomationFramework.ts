/**
 * SecurityAutomationFramework.ts
 * Enterprise-grade security automation system with workflow management,
 * trigger handling, condition evaluation, and action execution
 */

import { EventEmitter } from 'events'

/**
 * Workflow trigger types
 */
export enum TriggerType {
  EVENT = 'event',
  SCHEDULE = 'schedule',
  THRESHOLD = 'threshold',
  API = 'api',
  MANUAL = 'manual'
}

/**
 * Condition operators for evaluation
 */
export enum ConditionOperator {
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  EQUALS = 'equals',
  NOT_EQUALS = 'notEquals',
  GREATER_THAN = 'greaterThan',
  LESS_THAN = 'lessThan',
  REGEX = 'regex',
  IN_RANGE = 'inRange',
  CONTAINS = 'contains'
}

/**
 * Action types for security automation
 */
export enum ActionType {
  BLOCK = 'block',
  ISOLATE = 'isolate',
  QUARANTINE = 'quarantine',
  NOTIFY_EMAIL = 'notifyEmail',
  NOTIFY_SLACK = 'notifySlack',
  CREATE_TICKET = 'createTicket',
  EXECUTE_SCRIPT = 'executeScript',
  LOOKUP_THREAT_INTEL = 'lookupThreatIntel',
  CORRELATE_EVENTS = 'correlateEvents',
  PATCH_SYSTEM = 'patchSystem',
  UPDATE_WAF = 'updateWAF',
  RESTART_SERVICE = 'restartService',
  REVOKE_TOKEN = 'revokeToken',
  RESET_PASSWORD = 'resetPassword',
  DISABLE_ACCOUNT = 'disableAccount',
  EXPORT_LOGS = 'exportLogs',
  SNAPSHOT_VM = 'snapshotVM',
  KILL_SESSION = 'killSession',
  BACKUP_DATA = 'backupData',
  ENCRYPT_DATA = 'encryptData',
  ROTATE_CREDENTIALS = 'rotateCredentials',
  UPDATE_FIREWALL = 'updateFirewall',
  BLOCK_IP = 'blockIP',
  BLACKLIST_DOMAIN = 'blacklistDomain',
  ESCALATE_INCIDENT = 'escalateIncident',
  PAGE_ONCALL = 'pageOncall',
  SNAPSHOT_PROCESS = 'snapshotProcess',
  CAPTURE_TRAFFIC = 'captureTraffic',
  UPDATE_IDS = 'updateIDS',
  SYNC_TO_SIEM = 'syncToSIEM'
}

/**
 * Execution status
 */
export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

/**
 * Approval status for governance
 */
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

/**
 * Trigger definition
 */
export interface Trigger {
  type: TriggerType
  config: Record<string, unknown>
  enabled: boolean
}

/**
 * Condition for workflow execution
 */
export interface Condition {
  operator: ConditionOperator
  field: string
  value: unknown
  children?: Condition[]
}

/**
 * Action to execute
 */
export interface Action {
  type: ActionType
  config: Record<string, unknown>
  retryPolicy?: RetryPolicy
  timeout?: number
}

/**
 * Retry policy for actions
 */
export interface RetryPolicy {
  maxRetries: number
  backoffMs: number
  backoffMultiplier: number
}

/**
 * Workflow definition
 */
export interface SecurityWorkflow {
  id: string
  name: string
  description: string
  version: number
  enabled: boolean
  trigger: Trigger
  conditions: Condition[]
  actions: Action[]
  parallel: boolean
  requiresApproval: boolean
  chainedWorkflows?: string[]
  schedule?: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  lastExecutedAt?: Date
  executionCount: number
  successCount: number
  failureCount: number
  averageExecutionTimeMs: number
}

/**
 * Workflow execution record
 */
export interface WorkflowExecution {
  id: string
  workflowId: string
  triggerId: string
  status: ExecutionStatus
  startedAt: Date
  completedAt?: Date
  durationMs?: number
  context: Record<string, unknown>
  actionResults: ActionResult[]
  error?: string
  approvalRequired: boolean
  approvalStatus?: ApprovalStatus
  approvedBy?: string
  auditLog: AuditLogEntry[]
}

/**
 * Result of action execution
 */
export interface ActionResult {
  actionType: ActionType
  status: ExecutionStatus
  output?: unknown
  error?: string
  durationMs: number
  timestamp: Date
}

/**
 * Audit log entry for governance
 */
export interface AuditLogEntry {
  timestamp: Date
  action: string
  actor: string
  details: Record<string, unknown>
  ipAddress?: string
}

/**
 * Workflow template for quick creation
 */
export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  trigger: Trigger
  conditions: Condition[]
  actions: Action[]
  createdAt: Date
}

/**
 * Security Automation Framework
 * Manages security workflows with triggers, conditions, and actions
 */
export class SecurityAutomationFramework extends EventEmitter {
  private workflows: Map<string, SecurityWorkflow> = new Map()
  private executions: Map<string, WorkflowExecution> = new Map()
  private templates: Map<string, WorkflowTemplate> = new Map()
  private executionSchedules: Map<string, NodeJS.Timeout> = new Map()
  private auditLog: AuditLogEntry[] = []
  private rateLimitMap: Map<string, RateLimitEntry> = new Map()

  constructor(private config: SecurityAutomationConfig = {}) {
    super()
    this.initializeTemplates()
  }

  /**
   * Initialize built-in workflow templates
   */
  private initializeTemplates(): void {
    const templates: WorkflowTemplate[] = [
      {
        id: 'tmpl_malware_detection',
        name: 'Malware Detection Response',
        description: 'Automatic response to malware detection',
        category: 'malware',
        trigger: { type: TriggerType.EVENT, config: { eventType: 'malwareDetected' }, enabled: true },
        conditions: [
          { operator: ConditionOperator.EQUALS, field: 'severity', value: 'high' }
        ],
        actions: [
          { type: ActionType.ISOLATE, config: {} },
          { type: ActionType.SNAPSHOT_PROCESS, config: {} },
          { type: ActionType.NOTIFY_SLACK, config: {} }
        ],
        createdAt: new Date()
      },
      {
        id: 'tmpl_suspicious_login',
        name: 'Suspicious Login Detection',
        description: 'Response to suspicious login attempts',
        category: 'authentication',
        trigger: { type: TriggerType.EVENT, config: { eventType: 'suspiciousLogin' }, enabled: true },
        conditions: [
          { operator: ConditionOperator.GREATER_THAN, field: 'failedAttempts', value: 5 }
        ],
        actions: [
          { type: ActionType.DISABLE_ACCOUNT, config: {} },
          { type: ActionType.NOTIFY_EMAIL, config: {} }
        ],
        createdAt: new Date()
      },
      {
        id: 'tmpl_data_exfiltration',
        name: 'Data Exfiltration Prevention',
        description: 'Automatic response to potential data exfiltration',
        category: 'data-protection',
        trigger: { type: TriggerType.THRESHOLD, config: { metric: 'dataVolume', threshold: 1000000000 }, enabled: true },
        conditions: [
          { operator: ConditionOperator.IN_RANGE, field: 'timeWindow', value: { min: 0, max: 3600 } }
        ],
        actions: [
          { type: ActionType.KILL_SESSION, config: {} },
          { type: ActionType.BACKUP_DATA, config: {} },
          { type: ActionType.CREATE_TICKET, config: {} }
        ],
        createdAt: new Date()
      },
      {
        id: 'tmpl_vulnerability_patch',
        name: 'Vulnerability Auto-Patch',
        description: 'Automatic patching of discovered vulnerabilities',
        category: 'vulnerability',
        trigger: { type: TriggerType.EVENT, config: { eventType: 'vulnerabilityDiscovered' }, enabled: true },
        conditions: [
          { operator: ConditionOperator.EQUALS, field: 'cvssScore', value: { operator: '>', value: 7 } }
        ],
        actions: [
          { type: ActionType.PATCH_SYSTEM, config: {} },
          { type: ActionType.NOTIFY_SLACK, config: {} }
        ],
        createdAt: new Date()
      },
      {
        id: 'tmpl_ddos_detection',
        name: 'DDoS Attack Detection',
        description: 'Response to DDoS attacks',
        category: 'network',
        trigger: { type: TriggerType.THRESHOLD, config: { metric: 'requestRate', threshold: 100000 }, enabled: true },
        conditions: [
          { operator: ConditionOperator.GREATER_THAN, field: 'anomalyScore', value: 0.8 }
        ],
        actions: [
          { type: ActionType.BLOCK_IP, config: {} },
          { type: ActionType.UPDATE_WAF, config: {} },
          { type: ActionType.PAGE_ONCALL, config: {} }
        ],
        createdAt: new Date()
      },
      {
        id: 'tmpl_credential_exposure',
        name: 'Credential Exposure Response',
        description: 'Automatic response to exposed credentials',
        category: 'credentials',
        trigger: { type: TriggerType.EVENT, config: { eventType: 'credentialExposed' }, enabled: true },
        conditions: [
          { operator: ConditionOperator.CONTAINS, field: 'credentialType', value: 'apiKey' }
        ],
        actions: [
          { type: ActionType.ROTATE_CREDENTIALS, config: {} },
          { type: ActionType.REVOKE_TOKEN, config: {} },
          { type: ActionType.NOTIFY_EMAIL, config: {} }
        ],
        createdAt: new Date()
      },
      {
        id: 'tmpl_unauthorized_access',
        name: 'Unauthorized Access Detection',
        description: 'Response to unauthorized access attempts',
        category: 'access-control',
        trigger: { type: TriggerType.EVENT, config: { eventType: 'unauthorizedAccess' }, enabled: true },
        conditions: [
          { operator: ConditionOperator.EQUALS, field: 'accessType', value: 'privilegedEscalation' }
        ],
        actions: [
          { type: ActionType.DISABLE_ACCOUNT, config: {} },
          { type: ActionType.ESCALATE_INCIDENT, config: {} },
          { type: ActionType.CAPTURE_TRAFFIC, config: {} }
        ],
        createdAt: new Date()
      },
      {
        id: 'tmpl_compliance_violation',
        name: 'Compliance Violation Response',
        description: 'Response to compliance policy violations',
        category: 'compliance',
        trigger: { type: TriggerType.EVENT, config: { eventType: 'complianceViolation' }, enabled: true },
        conditions: [
          { operator: ConditionOperator.IN_RANGE, field: 'severity', value: { min: 'medium', max: 'critical' } }
        ],
        actions: [
          { type: ActionType.EXPORT_LOGS, config: {} },
          { type: ActionType.CREATE_TICKET, config: {} },
          { type: ActionType.NOTIFY_EMAIL, config: {} }
        ],
        createdAt: new Date()
      },
      {
        id: 'tmpl_insider_threat',
        name: 'Insider Threat Detection',
        description: 'Response to potential insider threats',
        category: 'insider-threat',
        trigger: { type: TriggerType.EVENT, config: { eventType: 'insiderThreatDetected' }, enabled: true },
        conditions: [
          { operator: ConditionOperator.GREATER_THAN, field: 'riskScore', value: 0.75 }
        ],
        actions: [
          { type: ActionType.KILL_SESSION, config: {} },
          { type: ActionType.DISABLE_ACCOUNT, config: {} },
          { type: ActionType.ESCALATE_INCIDENT, config: {} }
        ],
        createdAt: new Date()
      },
      {
        id: 'tmpl_apt_detection',
        name: 'APT Campaign Detection',
        description: 'Response to detected APT campaigns',
        category: 'threat-intelligence',
        trigger: { type: TriggerType.EVENT, config: { eventType: 'aptDetected' }, enabled: true },
        conditions: [
          { operator: ConditionOperator.EQUALS, field: 'threatLevel', value: 'critical' }
        ],
        actions: [
          { type: ActionType.ISOLATE, config: {} },
          { type: ActionType.SNAPSHOT_VM, config: {} },
          { type: ActionType.SYNC_TO_SIEM, config: {} }
        ],
        createdAt: new Date()
      },
      {
        id: 'tmpl_ransomware_detection',
        name: 'Ransomware Detection Response',
        description: 'Emergency response to ransomware detection',
        category: 'malware',
        trigger: { type: TriggerType.EVENT, config: { eventType: 'ransomwareDetected' }, enabled: true },
        conditions: [
          { operator: ConditionOperator.EQUALS, field: 'confidence', value: { operator: '>', value: 0.9 } }
        ],
        actions: [
          { type: ActionType.QUARANTINE, config: {} },
          { type: ActionType.KILL_SESSION, config: {} },
          { type: ActionType.BACKUP_DATA, config: {} }
        ],
        createdAt: new Date()
      },
      {
        id: 'tmpl_web_attack',
        name: 'Web Attack Detection',
        description: 'Response to web application attacks',
        category: 'web-security',
        trigger: { type: TriggerType.EVENT, config: { eventType: 'webAttack' }, enabled: true },
        conditions: [
          { operator: ConditionOperator.REGEX, field: 'attackType', value: '(SQLi|XSS|RFI|LFI)' }
        ],
        actions: [
          { type: ActionType.BLOCK_IP, config: {} },
          { type: ActionType.UPDATE_WAF, config: {} },
          { type: ActionType.NOTIFY_SLACK, config: {} }
        ],
        createdAt: new Date()
      },
      {
        id: 'tmpl_certificate_expiry',
        name: 'Certificate Expiry Alert',
        description: 'Renewal reminder and automation for expiring certificates',
        category: 'certificate-management',
        trigger: { type: TriggerType.SCHEDULE, config: { cronExpression: '0 0 * * *' }, enabled: true },
        conditions: [
          { operator: ConditionOperator.LESS_THAN, field: 'daysUntilExpiry', value: 30 }
        ],
        actions: [
          { type: ActionType.NOTIFY_EMAIL, config: {} },
          { type: ActionType.CREATE_TICKET, config: {} }
        ],
        createdAt: new Date()
      },
      {
        id: 'tmpl_privilege_escalation',
        name: 'Privilege Escalation Detection',
        description: 'Response to detected privilege escalation attempts',
        category: 'access-control',
        trigger: { type: TriggerType.EVENT, config: { eventType: 'privilegeEscalation' }, enabled: true },
        conditions: [
          { operator: ConditionOperator.EQUALS, field: 'escalationType', value: 'vertical' }
        ],
        actions: [
          { type: ActionType.DISABLE_ACCOUNT, config: {} },
          { type: ActionType.REVOKE_TOKEN, config: {} },
          { type: ActionType.ESCALATE_INCIDENT, config: {} }
        ],
        createdAt: new Date()
      },
      {
        id: 'tmpl_encryption_key_rotation',
        name: 'Encryption Key Rotation',
        description: 'Scheduled encryption key rotation',
        category: 'encryption',
        trigger: { type: TriggerType.SCHEDULE, config: { cronExpression: '0 0 1 * *' }, enabled: true },
        conditions: [
          { operator: ConditionOperator.GREATER_THAN, field: 'daysOld', value: 90 }
        ],
        actions: [
          { type: ActionType.ROTATE_CREDENTIALS, config: {} },
          { type: ActionType.NOTIFY_SLACK, config: {} }
        ],
        createdAt: new Date()
      },
      {
        id: 'tmpl_configuration_drift',
        name: 'Configuration Drift Detection',
        description: 'Response to unauthorized configuration changes',
        category: 'configuration-management',
        trigger: { type: TriggerType.EVENT, config: { eventType: 'configurationDrift' }, enabled: true },
        conditions: [
          { operator: ConditionOperator.NOT_EQUALS, field: 'expectedHash', value: 'actualHash' }
        ],
        actions: [
          { type: ActionType.NOTIFY_EMAIL, config: {} },
          { type: ActionType.CREATE_TICKET, config: {} }
        ],
        createdAt: new Date()
      },
      {
        id: 'tmpl_policy_violation',
        name: 'Security Policy Violation',
        description: 'Response to security policy violations',
        category: 'policy',
        trigger: { type: TriggerType.EVENT, config: { eventType: 'policyViolation' }, enabled: true },
        conditions: [
          { operator: ConditionOperator.EQUALS, field: 'severity', value: 'high' }
        ],
        actions: [
          { type: ActionType.CREATE_TICKET, config: {} },
          { type: ActionType.NOTIFY_EMAIL, config: {} }
        ],
        createdAt: new Date()
      }
    ]

    templates.forEach(t => this.templates.set(t.id, t))
  }

  /**
   * Create a new workflow from template
   */
  createWorkflowFromTemplate(templateId: string, workflowName: string, userId: string): SecurityWorkflow {
    const template = this.templates.get(templateId)
    if (!template) throw new Error(`Template not found: ${templateId}`)

    const workflow: SecurityWorkflow = {
      id: `wf_${Date.now()}`,
      name: workflowName,
      description: template.description,
      version: 1,
      enabled: true,
      trigger: template.trigger,
      conditions: template.conditions,
      actions: template.actions,
      parallel: false,
      requiresApproval: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      averageExecutionTimeMs: 0
    }

    this.workflows.set(workflow.id, workflow)
    this.logAudit('WORKFLOW_CREATED', userId, { workflowId: workflow.id, templateId })
    return workflow
  }

  /**
   * Create a custom workflow
   */
  createWorkflow(definition: Omit<SecurityWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'successCount' | 'failureCount' | 'averageExecutionTimeMs'>, userId: string): SecurityWorkflow {
    const workflow: SecurityWorkflow = {
      ...definition,
      id: `wf_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      averageExecutionTimeMs: 0
    }

    this.workflows.set(workflow.id, workflow)
    this.logAudit('WORKFLOW_CREATED', userId, { workflowId: workflow.id })
    return workflow
  }

  /**
   * Update workflow
   */
  updateWorkflow(workflowId: string, updates: Partial<SecurityWorkflow>, userId: string): SecurityWorkflow {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`)

    const updated = { ...workflow, ...updates, version: workflow.version + 1, updatedAt: new Date() }
    this.workflows.set(workflowId, updated)
    this.logAudit('WORKFLOW_UPDATED', userId, { workflowId, changes: updates })
    return updated
  }

  /**
   * Delete workflow
   */
  deleteWorkflow(workflowId: string, userId: string): void {
    this.workflows.delete(workflowId)
    const scheduleId = `schedule_${workflowId}`
    const timeout = this.executionSchedules.get(scheduleId)
    if (timeout) clearTimeout(timeout)
    this.executionSchedules.delete(scheduleId)
    this.logAudit('WORKFLOW_DELETED', userId, { workflowId })
  }

  /**
   * Get workflow
   */
  getWorkflow(workflowId: string): SecurityWorkflow {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`)
    return workflow
  }

  /**
   * List all workflows
   */
  listWorkflows(): SecurityWorkflow[] {
    return Array.from(this.workflows.values())
  }

  /**
   * Get workflow template
   */
  getTemplate(templateId: string): WorkflowTemplate {
    const template = this.templates.get(templateId)
    if (!template) throw new Error(`Template not found: ${templateId}`)
    return template
  }

  /**
   * List all templates
   */
  listTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(workflowId: string, context: Record<string, unknown>): Promise<WorkflowExecution> {
    const workflow = this.getWorkflow(workflowId)
    if (!workflow.enabled) throw new Error('Workflow is disabled')

    // Check rate limiting
    if (!this.checkRateLimit(workflowId)) {
      throw new Error('Workflow execution rate limit exceeded')
    }

    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}`,
      workflowId,
      triggerId: `trigger_${Date.now()}`,
      status: ExecutionStatus.PENDING,
      startedAt: new Date(),
      context,
      actionResults: [],
      approvalRequired: workflow.requiresApproval,
      auditLog: []
    }

    this.executions.set(execution.id, execution)

    if (workflow.requiresApproval) {
      execution.approvalStatus = ApprovalStatus.PENDING
      return execution
    }

    return this.runExecution(execution, workflow)
  }

  /**
   * Run workflow execution
   */
  private async runExecution(execution: WorkflowExecution, workflow: SecurityWorkflow): Promise<WorkflowExecution> {
    execution.status = ExecutionStatus.RUNNING

    try {
      // Evaluate conditions
      if (!this.evaluateConditions(workflow.conditions, execution.context)) {
        execution.status = ExecutionStatus.SUCCESS
        execution.completedAt = new Date()
        execution.durationMs = execution.completedAt.getTime() - execution.startedAt.getTime()
        return execution
      }

      // Execute actions
      if (workflow.parallel) {
        await this.executeActionsParallel(execution, workflow.actions)
      } else {
        await this.executeActionsSequential(execution, workflow.actions)
      }

      execution.status = ExecutionStatus.SUCCESS
      workflow.successCount++
    } catch (error) {
      execution.status = ExecutionStatus.FAILED
      execution.error = error instanceof Error ? error.message : 'Unknown error'
      workflow.failureCount++
    }

    execution.completedAt = new Date()
    execution.durationMs = execution.completedAt.getTime() - execution.startedAt.getTime()

    // Update workflow metrics
    const totalExecutions = workflow.successCount + workflow.failureCount
    workflow.averageExecutionTimeMs = (workflow.averageExecutionTimeMs * (totalExecutions - 1) + execution.durationMs) / totalExecutions
    workflow.lastExecutedAt = new Date()
    workflow.executionCount++

    this.emit('execution:completed', execution)
    return execution
  }

  /**
   * Execute actions sequentially
   */
  private async executeActionsSequential(execution: WorkflowExecution, actions: Action[]): Promise<void> {
    for (const action of actions) {
      const result = await this.executeAction(execution, action)
      execution.actionResults.push(result)

      if (result.status === ExecutionStatus.FAILED) {
        throw new Error(`Action failed: ${action.type}`)
      }
    }
  }

  /**
   * Execute actions in parallel
   */
  private async executeActionsParallel(execution: WorkflowExecution, actions: Action[]): Promise<void> {
    const promises = actions.map(action => this.executeAction(execution, action))
    const results = await Promise.all(promises)
    execution.actionResults.push(...results)

    if (results.some(r => r.status === ExecutionStatus.FAILED)) {
      throw new Error('One or more actions failed')
    }
  }

  /**
   * Execute single action
   */
  private async executeAction(execution: WorkflowExecution, action: Action): Promise<ActionResult> {
    const startTime = Date.now()
    const result: ActionResult = {
      actionType: action.type,
      status: ExecutionStatus.RUNNING,
      timestamp: new Date(),
      durationMs: 0
    }

    try {
      // Timeout handling
      const timeout = action.timeout || 30000
      const actionPromise = this.performAction(action, execution.context)
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Action timeout')), timeout))

      result.output = await Promise.race([actionPromise, timeoutPromise])
      result.status = ExecutionStatus.SUCCESS
    } catch (error) {
      result.status = ExecutionStatus.FAILED
      result.error = error instanceof Error ? error.message : 'Unknown error'

      // Retry logic
      if (action.retryPolicy && action.retryPolicy.maxRetries > 0) {
        result.status = await this.retryAction(action, execution.context, action.retryPolicy)
      }
    }

    result.durationMs = Date.now() - startTime
    return result
  }

  /**
   * Perform action based on type
   */
  private async performAction(action: Action, context: Record<string, unknown>): Promise<unknown> {
    const handler = this.getActionHandler(action.type)
    return handler(action.config, context)
  }

  /**
   * Retry action with backoff
   */
  private async retryAction(action: Action, context: Record<string, unknown>, policy: RetryPolicy): Promise<ExecutionStatus> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < policy.maxRetries; attempt++) {
      try {
        const backoffMs = policy.backoffMs * Math.pow(policy.backoffMultiplier, attempt)
        await new Promise(resolve => setTimeout(resolve, backoffMs))
        await this.performAction(action, context)
        return ExecutionStatus.SUCCESS
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
      }
    }

    throw lastError || new Error('Retry exhausted')
  }

  /**
   * Get action handler
   */
  private getActionHandler(actionType: ActionType): (config: Record<string, unknown>, context: Record<string, unknown>) => Promise<unknown> {
    const handlers: Record<ActionType, (config: Record<string, unknown>, context: Record<string, unknown>) => Promise<unknown>> = {
      [ActionType.BLOCK]: async (config, context) => ({ action: 'blocked', target: config.target }),
      [ActionType.ISOLATE]: async (config, context) => ({ action: 'isolated', resource: config.resource }),
      [ActionType.QUARANTINE]: async (config, context) => ({ action: 'quarantined', item: config.item }),
      [ActionType.NOTIFY_EMAIL]: async (config, context) => ({ action: 'email_sent', recipient: config.recipient }),
      [ActionType.NOTIFY_SLACK]: async (config, context) => ({ action: 'slack_sent', channel: config.channel }),
      [ActionType.CREATE_TICKET]: async (config, context) => ({ ticketId: `ticket_${Date.now()}` }),
      [ActionType.EXECUTE_SCRIPT]: async (config, context) => ({ scriptExecuted: true }),
      [ActionType.LOOKUP_THREAT_INTEL]: async (config, context) => ({ threatLevel: 'medium', found: true }),
      [ActionType.CORRELATE_EVENTS]: async (config, context) => ({ correlatedEvents: 3 }),
      [ActionType.PATCH_SYSTEM]: async (config, context) => ({ patched: true, systemId: config.systemId }),
      [ActionType.UPDATE_WAF]: async (config, context) => ({ ruleId: `rule_${Date.now()}`, updated: true }),
      [ActionType.RESTART_SERVICE]: async (config, context) => ({ restarted: true, service: config.service }),
      [ActionType.REVOKE_TOKEN]: async (config, context) => ({ tokensRevoked: 1 }),
      [ActionType.RESET_PASSWORD]: async (config, context) => ({ resetCode: `reset_${Date.now()}` }),
      [ActionType.DISABLE_ACCOUNT]: async (config, context) => ({ accountDisabled: true }),
      [ActionType.EXPORT_LOGS]: async (config, context) => ({ exportUrl: 'https://example.com/logs.zip' }),
      [ActionType.SNAPSHOT_VM]: async (config, context) => ({ snapshotId: `snap_${Date.now()}` }),
      [ActionType.KILL_SESSION]: async (config, context) => ({ sessionKilled: true }),
      [ActionType.BACKUP_DATA]: async (config, context) => ({ backupId: `backup_${Date.now()}` }),
      [ActionType.ENCRYPT_DATA]: async (config, context) => ({ encrypted: true }),
      [ActionType.ROTATE_CREDENTIALS]: async (config, context) => ({ rotated: true }),
      [ActionType.UPDATE_FIREWALL]: async (config, context) => ({ ruleId: `fw_rule_${Date.now()}` }),
      [ActionType.BLOCK_IP]: async (config, context) => ({ ipBlocked: config.ip, duration: config.duration }),
      [ActionType.BLACKLIST_DOMAIN]: async (config, context) => ({ domainBlacklisted: config.domain }),
      [ActionType.ESCALATE_INCIDENT]: async (config, context) => ({ escalated: true, level: 'critical' }),
      [ActionType.PAGE_ONCALL]: async (config, context) => ({ pageId: `page_${Date.now()}` }),
      [ActionType.SNAPSHOT_PROCESS]: async (config, context) => ({ snapshotId: `proc_snap_${Date.now()}` }),
      [ActionType.CAPTURE_TRAFFIC]: async (config, context) => ({ captureId: `capture_${Date.now()}` }),
      [ActionType.UPDATE_IDS]: async (config, context) => ({ ruleId: `ids_rule_${Date.now()}` }),
      [ActionType.SYNC_TO_SIEM]: async (config, context) => ({ synced: true, eventCount: 1 })
    }

    return handlers[actionType] || (async () => ({ success: true }))
  }

  /**
   * Evaluate workflow conditions
   */
  private evaluateConditions(conditions: Condition[], context: Record<string, unknown>): boolean {
    if (conditions.length === 0) return true

    return conditions.every(condition => this.evaluateCondition(condition, context))
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(condition: Condition, context: Record<string, unknown>): boolean {
    const value = this.getContextValue(condition.field, context)

    switch (condition.operator) {
      case ConditionOperator.AND:
        return condition.children?.every(c => this.evaluateCondition(c, context)) ?? true
      case ConditionOperator.OR:
        return condition.children?.some(c => this.evaluateCondition(c, context)) ?? false
      case ConditionOperator.NOT:
        return !this.evaluateCondition(condition.children?.[0] || condition, context)
      case ConditionOperator.EQUALS:
        return value === condition.value
      case ConditionOperator.NOT_EQUALS:
        return value !== condition.value
      case ConditionOperator.GREATER_THAN:
        return Number(value) > Number(condition.value)
      case ConditionOperator.LESS_THAN:
        return Number(value) < Number(condition.value)
      case ConditionOperator.REGEX:
        return new RegExp(String(condition.value)).test(String(value))
      case ConditionOperator.IN_RANGE:
        const rangeVal = condition.value as { min: unknown; max: unknown }
        return Number(value) >= Number(rangeVal.min) && Number(value) <= Number(rangeVal.max)
      case ConditionOperator.CONTAINS:
        return String(value).includes(String(condition.value))
      default:
        return false
    }
  }

  /**
   * Get value from context using dot notation
   */
  private getContextValue(path: string, context: Record<string, unknown>): unknown {
    return path.split('.').reduce((obj: unknown, key) => {
      return obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[key] : undefined
    }, context)
  }

  /**
   * Approve workflow execution
   */
  approveExecution(executionId: string, userId: string): WorkflowExecution {
    const execution = this.executions.get(executionId)
    if (!execution) throw new Error(`Execution not found: ${executionId}`)

    execution.approvalStatus = ApprovalStatus.APPROVED
    execution.approvedBy = userId
    this.logAudit('EXECUTION_APPROVED', userId, { executionId })

    // Run execution after approval
    const workflow = this.getWorkflow(execution.workflowId)
    return this.runExecution(execution, workflow) as unknown as WorkflowExecution
  }

  /**
   * Reject workflow execution
   */
  rejectExecution(executionId: string, userId: string, reason: string): WorkflowExecution {
    const execution = this.executions.get(executionId)
    if (!execution) throw new Error(`Execution not found: ${executionId}`)

    execution.approvalStatus = ApprovalStatus.REJECTED
    execution.status = ExecutionStatus.CANCELLED
    execution.error = `Rejected: ${reason}`
    execution.completedAt = new Date()
    execution.durationMs = execution.completedAt.getTime() - execution.startedAt.getTime()

    this.logAudit('EXECUTION_REJECTED', userId, { executionId, reason })
    return execution
  }

  /**
   * Get execution
   */
  getExecution(executionId: string): WorkflowExecution {
    const execution = this.executions.get(executionId)
    if (!execution) throw new Error(`Execution not found: ${executionId}`)
    return execution
  }

  /**
   * List executions for workflow
   */
  listExecutions(workflowId: string): WorkflowExecution[] {
    return Array.from(this.executions.values()).filter(e => e.workflowId === workflowId)
  }

  /**
   * Chain workflows
   */
  chainWorkflows(workflowIds: string[], userId: string): void {
    if (workflowIds.length < 2) throw new Error('At least 2 workflows required for chaining')

    for (let i = 0; i < workflowIds.length - 1; i++) {
      const current = this.getWorkflow(workflowIds[i])
      current.chainedWorkflows = [workflowIds[i + 1]]
      this.updateWorkflow(workflowIds[i], current, userId)
    }

    this.logAudit('WORKFLOWS_CHAINED', userId, { workflowIds })
  }

  /**
   * Schedule workflow
   */
  scheduleWorkflow(workflowId: string, cronExpression: string, userId: string): void {
    const workflow = this.getWorkflow(workflowId)
    workflow.schedule = cronExpression
    this.updateWorkflow(workflowId, workflow, userId)

    // Simplified scheduling - in production use node-cron
    const scheduleId = `schedule_${workflowId}`
    const timeout = this.executionSchedules.get(scheduleId)
    if (timeout) clearTimeout(timeout)

    // Schedule at next hour for simplicity
    const nextHour = new Date()
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
    const delayMs = nextHour.getTime() - Date.now()

    const newTimeout = setTimeout(() => {
      this.executeWorkflow(workflowId, { scheduled: true }).catch(err => console.error(err))
      this.scheduleWorkflow(workflowId, cronExpression, 'system')
    }, delayMs)

    this.executionSchedules.set(scheduleId, newTimeout)
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(workflowId: string): boolean {
    const limit = this.config.rateLimitPerMinute || 10
    const now = Date.now()
    const key = `ratelimit_${workflowId}`

    const entry = this.rateLimitMap.get(key)
    if (!entry) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + 60000 })
      return true
    }

    if (now > entry.resetTime) {
      entry.count = 1
      entry.resetTime = now + 60000
      return true
    }

    if (entry.count >= limit) {
      return false
    }

    entry.count++
    return true
  }

  /**
   * Log audit entry
   */
  private logAudit(action: string, actor: string, details: Record<string, unknown>): void {
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      action,
      actor,
      details
    }
    this.auditLog.push(entry)
    this.emit('audit:log', entry)
  }

  /**
   * Get audit log
   */
  getAuditLog(limit = 100): AuditLogEntry[] {
    return this.auditLog.slice(-limit)
  }

  /**
   * Get framework metrics
   */
  getMetrics(): FrameworkMetrics {
    const workflows = Array.from(this.workflows.values())
    const executions = Array.from(this.executions.values())

    return {
      totalWorkflows: workflows.length,
      enabledWorkflows: workflows.filter(w => w.enabled).length,
      totalExecutions: executions.length,
      successfulExecutions: executions.filter(e => e.status === ExecutionStatus.SUCCESS).length,
      failedExecutions: executions.filter(e => e.status === ExecutionStatus.FAILED).length,
      averageExecutionTime: workflows.length > 0 ? workflows.reduce((sum, w) => sum + w.averageExecutionTimeMs, 0) / workflows.length : 0,
      successRate: executions.length > 0 ? executions.filter(e => e.status === ExecutionStatus.SUCCESS).length / executions.length : 0
    }
  }
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number
  resetTime: number
}

/**
 * Framework configuration
 */
interface SecurityAutomationConfig {
  rateLimitPerMinute?: number
}

/**
 * Framework metrics
 */
export interface FrameworkMetrics {
  totalWorkflows: number
  enabledWorkflows: number
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageExecutionTime: number
  successRate: number
}
