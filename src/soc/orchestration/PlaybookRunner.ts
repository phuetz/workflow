/**
 * PlaybookRunner - Handles playbook registration and execution
 *
 * @module soc/orchestration/PlaybookRunner
 */

import { EventEmitter } from 'events'
import { randomBytes } from 'crypto'
import {
  ResponsePlaybook,
  PlaybookExecution,
  PlaybookExecutionStatus,
  PlaybookAction,
  PlaybookActionCategory,
  ActionResult,
  ActionCondition,
  ApprovalStatus,
  SecurityIncident,
  ThreatSeverity
} from './types'

export class PlaybookRunner extends EventEmitter {
  private playbooks: Map<string, ResponsePlaybook> = new Map()
  private executions: Map<string, PlaybookExecution> = new Map()
  private activePlaybooks: Set<string> = new Set()
  private maxConcurrentPlaybooks: number

  constructor(maxConcurrentPlaybooks: number = 10) {
    super()
    this.maxConcurrentPlaybooks = maxConcurrentPlaybooks
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${randomBytes(4).toString('hex')}`
  }

  /**
   * Register a response playbook
   */
  public registerPlaybook(playbook: ResponsePlaybook): ResponsePlaybook {
    this.playbooks.set(playbook.id, playbook)
    this.emit('playbook:registered', playbook)
    return playbook
  }

  /**
   * Get playbook by ID
   */
  public getPlaybook(playbookId: string): ResponsePlaybook | undefined {
    return this.playbooks.get(playbookId)
  }

  /**
   * Get all registered playbooks
   */
  public getPlaybooks(): ResponsePlaybook[] {
    return Array.from(this.playbooks.values())
  }

  /**
   * Find playbooks matching threat type and severity
   */
  public findMatchingPlaybooks(threatType: string, severity: ThreatSeverity): ResponsePlaybook[] {
    const matches: ResponsePlaybook[] = []
    for (const playbook of Array.from(this.playbooks.values())) {
      if (
        playbook.threatTypes.includes(threatType) &&
        playbook.severity.includes(severity)
      ) {
        matches.push(playbook)
      }
    }
    return matches.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  /**
   * Topological sort for action dependencies
   */
  private topologicalSortActions(actions: PlaybookAction[]): PlaybookAction[] {
    const sorted: PlaybookAction[] = []
    const visited = new Set<string>()
    const actionMap = new Map(actions.map(a => [a.id, a]))

    const visit = (action: PlaybookAction): void => {
      if (visited.has(action.id)) return

      for (const depId of action.dependencies) {
        const dep = actionMap.get(depId)
        if (dep) visit(dep)
      }

      visited.add(action.id)
      sorted.push(action)
    }

    for (const action of actions) {
      visit(action)
    }

    return sorted
  }

  /**
   * Check if action dependencies are met
   */
  private checkDependencies(action: PlaybookAction, execution: PlaybookExecution): boolean {
    for (const depId of action.dependencies) {
      const result = execution.actionResults.get(depId)
      if (!result || result.status !== 'success') {
        return false
      }
    }
    return true
  }

  /**
   * Get field value from incident or variables
   */
  private getFieldValue(field: string, incident: SecurityIncident, variables: Record<string, unknown>): unknown {
    if (field.startsWith('incident.')) {
      const path = field.substring(9).split('.')
      let value: unknown = incident
      for (const key of path) {
        value = (value as Record<string, unknown>)?.[key]
      }
      return value
    }
    return variables[field]
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: ActionCondition, value: unknown): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value
      case 'not_equals':
        return value !== condition.value
      case 'contains':
        return String(value).includes(String(condition.value))
      case 'greater_than':
        return Number(value) > Number(condition.value)
      case 'less_than':
        return Number(value) < Number(condition.value)
      case 'matches':
        return new RegExp(String(condition.value)).test(String(value))
      default:
        return false
    }
  }

  /**
   * Evaluate action conditions
   */
  private evaluateConditions(
    conditions: ActionCondition[],
    incident: SecurityIncident,
    variables: Record<string, unknown>
  ): boolean {
    for (const condition of conditions) {
      const value = this.getFieldValue(condition.field, incident, variables)
      if (!this.evaluateCondition(condition, value)) {
        return false
      }
    }
    return true
  }

  /**
   * Execute a playbook action
   */
  private async executeAction(
    action: PlaybookAction,
    incident: SecurityIncident,
    _variables: Record<string, unknown>
  ): Promise<ActionResult> {
    const startTime = new Date()
    const affectedEntities: string[] = []

    try {
      this.emit('action:executing', { actionId: action.id, incidentId: incident.id })

      // Simulate action execution
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100))

      // Track affected entities
      if (action.category === PlaybookActionCategory.CONTAINMENT) {
        affectedEntities.push(...incident.affectedAssets.map(a => a.identifier))
      }

      this.emit('action:executed', { actionId: action.id, incidentId: incident.id })

      return {
        actionId: action.id,
        status: 'success',
        startedAt: startTime,
        completedAt: new Date(),
        duration: Date.now() - startTime.getTime(),
        output: { message: `Action ${action.name} completed successfully` },
        rollbackStatus: action.rollbackEnabled ? 'available' : 'not_available',
        affectedEntities
      }
    } catch (error) {
      return {
        actionId: action.id,
        status: 'failed',
        startedAt: startTime,
        completedAt: new Date(),
        duration: Date.now() - startTime.getTime(),
        error: error instanceof Error ? error.message : String(error),
        rollbackStatus: 'not_available',
        affectedEntities
      }
    }
  }

  /**
   * Execute a playbook for an incident
   */
  public async executePlaybook(
    playbookId: string,
    incident: SecurityIncident,
    executor: string,
    variables: Record<string, unknown> = {}
  ): Promise<PlaybookExecution> {
    const playbook = this.playbooks.get(playbookId)
    if (!playbook) {
      throw new Error(`Playbook ${playbookId} not found`)
    }

    // Check concurrent execution limit
    if (this.activePlaybooks.size >= this.maxConcurrentPlaybooks) {
      throw new Error('Maximum concurrent playbook executions reached')
    }

    const executionId = this.generateId('exec')
    const execution: PlaybookExecution = {
      id: executionId,
      playbookId,
      incidentId: incident.id,
      status: PlaybookExecutionStatus.PENDING,
      startedAt: new Date(),
      executedBy: executor,
      actionResults: new Map(),
      approvalStatus: playbook.approvalRequired ? ApprovalStatus.PENDING : ApprovalStatus.AUTO_APPROVED,
      rollbackAvailable: false,
      rollbackExecuted: false,
      metrics: {
        totalActions: playbook.actions.length,
        completedActions: 0,
        failedActions: 0,
        skippedActions: 0,
        totalDuration: 0,
        successRate: 0
      },
      errors: []
    }

    this.executions.set(executionId, execution)
    this.activePlaybooks.add(executionId)

    this.emit('playbook:execution_started', { executionId, playbookId, incidentId: incident.id })

    try {
      // Check if approval is required
      if (playbook.approvalRequired && execution.approvalStatus === ApprovalStatus.PENDING) {
        execution.status = PlaybookExecutionStatus.AWAITING_APPROVAL
        this.emit('playbook:awaiting_approval', { executionId, playbookId, approvers: playbook.approvers })
        return execution
      }

      execution.status = PlaybookExecutionStatus.RUNNING

      // Execute actions in order, respecting dependencies
      const sortedActions = this.topologicalSortActions(playbook.actions)

      for (const action of sortedActions) {
        // Check dependencies
        const dependenciesMet = this.checkDependencies(action, execution)
        if (!dependenciesMet) {
          execution.actionResults.set(action.id, {
            actionId: action.id,
            status: 'skipped',
            startedAt: new Date(),
            duration: 0,
            error: 'Dependencies not met',
            affectedEntities: []
          })
          execution.metrics.skippedActions++
          continue
        }

        // Check conditions
        if (action.conditions && action.conditions.length > 0) {
          const conditionsMet = this.evaluateConditions(action.conditions, incident, variables)
          if (!conditionsMet) {
            execution.actionResults.set(action.id, {
              actionId: action.id,
              status: 'skipped',
              startedAt: new Date(),
              duration: 0,
              error: 'Conditions not met',
              affectedEntities: []
            })
            execution.metrics.skippedActions++
            continue
          }
        }

        // Execute action
        const result = await this.executeAction(action, incident, variables)
        execution.actionResults.set(action.id, result)

        if (result.status === 'success') {
          execution.metrics.completedActions++
          if (action.rollbackEnabled) {
            execution.rollbackAvailable = true
          }
        } else if (result.status === 'failed') {
          execution.metrics.failedActions++
          execution.errors.push({
            timestamp: new Date(),
            actionId: action.id,
            errorCode: 'ACTION_FAILED',
            message: result.error || 'Unknown error',
            recoverable: action.rollbackEnabled,
            context: { actionName: action.name }
          })

          // Stop execution on critical failures
          if (action.category === PlaybookActionCategory.CONTAINMENT) {
            break
          }
        }
      }

      // Calculate final metrics
      execution.metrics.totalDuration = Date.now() - execution.startedAt.getTime()
      execution.metrics.successRate =
        (execution.metrics.completedActions / execution.metrics.totalActions) * 100

      // Determine final status
      if (execution.metrics.failedActions === 0) {
        execution.status = PlaybookExecutionStatus.COMPLETED
      } else if (execution.metrics.completedActions > 0) {
        execution.status = PlaybookExecutionStatus.COMPLETED // Partial success
      } else {
        execution.status = PlaybookExecutionStatus.FAILED
      }

      execution.completedAt = new Date()

    } catch (error) {
      execution.status = PlaybookExecutionStatus.FAILED
      execution.completedAt = new Date()
      execution.errors.push({
        timestamp: new Date(),
        actionId: 'playbook',
        errorCode: 'PLAYBOOK_ERROR',
        message: error instanceof Error ? error.message : String(error),
        recoverable: false,
        context: {}
      })
    } finally {
      this.activePlaybooks.delete(executionId)
    }

    this.emit('playbook:execution_completed', execution)
    return execution
  }

  /**
   * Get execution by ID
   */
  public getExecution(executionId: string): PlaybookExecution | undefined {
    return this.executions.get(executionId)
  }

  /**
   * Execute rollback for a specific action
   */
  public async executeActionRollback(actionId: string, execution: PlaybookExecution): Promise<void> {
    const playbook = this.playbooks.get(execution.playbookId)
    if (!playbook) return

    const action = playbook.actions.find(a => a.id === actionId)
    if (!action || !action.rollbackEnabled) return

    this.emit('action:rolling_back', { actionId, executionId: execution.id })

    // Simulate rollback execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500))

    this.emit('action:rolled_back', { actionId, executionId: execution.id })
  }

  /**
   * Clear all data
   */
  public clear(): void {
    this.playbooks.clear()
    this.executions.clear()
    this.activePlaybooks.clear()
  }
}
