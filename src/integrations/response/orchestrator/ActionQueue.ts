/**
 * ActionQueue.ts
 *
 * Handles playbook action execution with dependency resolution and parallel execution.
 *
 * @module integrations/response/orchestrator/ActionQueue
 */

import { EventEmitter } from 'events'
import type {
  Logger,
  Incident,
  Playbook,
  PlaybookAction,
  PlaybookExecution,
  ActionResult,
  ExecutionError,
  PlaybookStatus,
  ResourceLock
} from './types'
import { IncidentSeverity } from './types'

/**
 * Manages action execution queue with dependency resolution
 */
export class ActionQueue extends EventEmitter {
  protected executions: Map<string, PlaybookExecution> = new Map()
  protected resourceLocks: Map<string, ResourceLock> = new Map()
  protected readonly logger: Logger

  constructor(logger: Logger) {
    super()
    this.logger = logger
  }

  /**
   * Execute a playbook for an incident
   */
  async executePlaybook(
    incident: Incident,
    playbook: Playbook,
    executor: string,
    variables: Record<string, unknown> = {}
  ): Promise<PlaybookExecution> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const execution: PlaybookExecution = {
      id: executionId,
      playbookId: playbook.id,
      incidentId: incident.id,
      status: PlaybookStatus.RUNNING,
      startTime: new Date(),
      actionResults: new Map(),
      successRate: 0,
      errors: [],
      executedBy: executor
    }

    this.executions.set(executionId, execution)
    this.emit('playbook:execution_started', { executionId, playbookId: playbook.id, incidentId: incident.id })

    try {
      // Build action dependency graph
      const actionGraph = this.buildActionGraph(playbook.actions)

      // Execute actions with dependency resolution
      const results = await this.executeActionGraph(
        actionGraph,
        execution,
        incident,
        variables
      )

      execution.actionResults = results
      execution.duration = Date.now() - execution.startTime.getTime()
      execution.endTime = new Date()

      // Calculate success rate
      const successCount = Array.from(results.values()).filter(r => r.status === 'success').length
      execution.successRate = (successCount / results.size) * 100

      // Determine overall status
      if (execution.successRate === 100) {
        execution.status = PlaybookStatus.SUCCESS
      } else if (execution.successRate >= 50) {
        execution.status = PlaybookStatus.PARTIAL
      } else {
        execution.status = PlaybookStatus.FAILED
      }

      // Update incident metrics
      incident.metrics.effectivenessScore = Math.max(
        incident.metrics.effectivenessScore,
        execution.successRate
      )

      // Add to incident timeline
      incident.timeline.push({
        timestamp: new Date(),
        actor: executor,
        action: `Playbook executed: ${playbook.name}`,
        details: {
          playbookId: playbook.id,
          executionId,
          status: execution.status,
          successRate: execution.successRate
        }
      })

      this.logger.info(`Playbook execution completed: ${executionId}`, {
        status: execution.status,
        successRate: execution.successRate
      })

      this.emit('playbook:execution_completed', execution)
    } catch (error) {
      execution.status = PlaybookStatus.FAILED
      execution.endTime = new Date()
      execution.duration = Date.now() - execution.startTime.getTime()

      const execError = error instanceof Error ? error : new Error(String(error))
      execution.errors.push({
        timestamp: new Date(),
        actionId: 'playbook',
        message: execError.message,
        code: 'PLAYBOOK_EXECUTION_ERROR',
        context: { playbookId: playbook.id, incidentId: incident.id }
      })

      this.logger.error(`Playbook execution failed: ${executionId}`, { error: execError.message })
      this.emit('playbook:execution_failed', { executionId, error: execError.message })
    }

    return execution
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): PlaybookExecution | undefined {
    return this.executions.get(executionId)
  }

  /**
   * Get all executions
   */
  getAllExecutions(): PlaybookExecution[] {
    return Array.from(this.executions.values())
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
    if (this.resourceLocks.has(resourceId)) {
      const existingLock = this.resourceLocks.get(resourceId)!
      if (existingLock.expiresAt > new Date()) {
        return false
      }
    }

    const lock: ResourceLock = {
      resourceId,
      lockedBy,
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + durationMs),
      reason
    }

    this.resourceLocks.set(resourceId, lock)

    // Auto-expire lock after duration
    setTimeout(() => {
      if (this.resourceLocks.get(resourceId)?.expiresAt <= new Date()) {
        this.resourceLocks.delete(resourceId)
      }
    }, durationMs)

    return true
  }

  /**
   * Release resource lock
   */
  async releaseResourceLock(resourceId: string, releasedBy: string): Promise<void> {
    this.resourceLocks.delete(resourceId)
    this.logger.info(`Resource lock released: ${resourceId}`, { releasedBy })
  }

  /**
   * Build action dependency graph from playbook actions
   */
  protected buildActionGraph(actions: PlaybookAction[]): Map<string, PlaybookAction> {
    const graph = new Map<string, PlaybookAction>()
    for (const action of actions) {
      graph.set(action.id, action)
    }
    return graph
  }

  /**
   * Execute action dependency graph with parallel execution support
   */
  protected async executeActionGraph(
    graph: Map<string, PlaybookAction>,
    execution: PlaybookExecution,
    incident: Incident,
    variables: Record<string, unknown>
  ): Promise<Map<string, ActionResult>> {
    const results = new Map<string, ActionResult>()
    const executed = new Set<string>()
    const executing = new Set<string>()

    // Topological sort for dependency resolution
    const sortedActions = this.topologicalSort(graph)

    for (const action of sortedActions) {
      // Wait for dependencies
      for (const dep of action.dependencies) {
        while (!executed.has(dep)) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Execute action
      try {
        executing.add(action.id)

        const result = await this.executeAction(action, incident, variables)
        results.set(action.id, result)

        if (result.status === 'failed' && !action.retryPolicy) {
          execution.errors.push({
            timestamp: new Date(),
            actionId: action.id,
            message: result.error || 'Action failed',
            code: 'ACTION_EXECUTION_FAILED',
            context: { action: action.name }
          })
        }

        executed.add(action.id)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.set(action.id, {
          actionId: action.id,
          status: 'failed',
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          error: errorMsg
        })

        execution.errors.push({
          timestamp: new Date(),
          actionId: action.id,
          message: errorMsg,
          code: 'ACTION_EXECUTION_ERROR',
          context: {}
        })

        executed.add(action.id)
      } finally {
        executing.delete(action.id)
      }
    }

    return results
  }

  /**
   * Execute a single action
   */
  protected async executeAction(
    action: PlaybookAction,
    _incident: Incident,
    _variables: Record<string, unknown>
  ): Promise<ActionResult> {
    const startTime = new Date()

    try {
      // Simulate action execution
      const result: ActionResult = {
        actionId: action.id,
        status: 'success',
        startTime,
        endTime: new Date(),
        duration: Math.random() * 1000,
        output: {
          type: action.type,
          target: action.config.target,
          timestamp: new Date().toISOString()
        }
      }

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      return {
        actionId: action.id,
        status: 'failed',
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime(),
        error: errorMsg
      }
    }
  }

  /**
   * Topological sort for action dependencies
   */
  protected topologicalSort(graph: Map<string, PlaybookAction>): PlaybookAction[] {
    const sorted: PlaybookAction[] = []
    const visited = new Set<string>()

    const visit = (action: PlaybookAction): void => {
      if (visited.has(action.id)) return

      for (const depId of action.dependencies) {
        const dep = graph.get(depId)
        if (dep) visit(dep)
      }

      visited.add(action.id)
      sorted.push(action)
    }

    for (const action of Array.from(graph.values())) {
      visit(action)
    }

    return sorted
  }
}

export default ActionQueue
