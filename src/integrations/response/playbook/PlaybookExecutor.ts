/**
 * Playbook Executor
 * Handles execution of playbook actions with retry logic and rollback support
 *
 * @module playbook/PlaybookExecutor
 */

import * as crypto from 'crypto';
import { ActionHandlers } from './ActionHandlers';
import { ConditionEvaluator } from './ConditionEvaluator';
import type {
  PlaybookDefinition,
  PlaybookAction,
  VariableContext,
  ActionExecutionResult,
  ExecutionRecord,
  ConditionalBranch
} from './types';

/**
 * PlaybookExecutor class
 * Manages execution of playbook actions including parallel execution,
 * retries, and rollback functionality
 */
export class PlaybookExecutor {
  private actionHandlers: ActionHandlers;
  private conditionEvaluator: ConditionEvaluator;

  constructor() {
    this.actionHandlers = new ActionHandlers();
    this.conditionEvaluator = new ConditionEvaluator();
  }

  /**
   * Execute a playbook with given event context
   *
   * @param playbook - The playbook definition to execute
   * @param eventData - Event data that triggered the playbook
   * @param triggeredBy - User or system that triggered the execution
   * @returns ExecutionRecord with results
   */
  public async execute(
    playbook: PlaybookDefinition,
    eventData: Record<string, unknown>,
    triggeredBy: string = 'system'
  ): Promise<ExecutionRecord> {
    const executionId = crypto.randomUUID();
    const startTime = new Date().toISOString();

    const variables: VariableContext = {
      event: eventData,
      timestamp: startTime,
      playbookId: playbook.metadata.id,
      executionId,
      previousActions: {}
    };

    const execution: ExecutionRecord = {
      executionId,
      playbookId: playbook.metadata.id,
      playbookVersion: playbook.metadata.version,
      triggeredBy,
      startTime,
      status: 'running',
      actions: [],
      variables,
      approvals: [],
      metrics: {
        totalDuration: 0,
        actionsCompleted: 0,
        actionsFailed: 0
      }
    };

    try {
      // Handle approval if configured
      if (playbook.approval && playbook.approval.mode === 'manual') {
        const approved = await this.requestApproval(playbook.metadata.id, eventData, playbook.approval);
        if (!approved) {
          execution.status = 'cancelled';
          return execution;
        }
      }

      // Execute actions
      const actionResults = await this.executeActions(
        playbook.actions,
        variables,
        playbook.conditionalBranches
      );

      execution.actions = actionResults;
      execution.metrics.actionsCompleted = actionResults.filter((a) => a.status === 'success').length;
      execution.metrics.actionsFailed = actionResults.filter((a) => a.status === 'failed').length;
      execution.status = execution.metrics.actionsFailed === 0 ? 'success' : 'failed';

      // Calculate timing
      const endTime = new Date().toISOString();
      execution.endTime = endTime;
      execution.metrics.totalDuration = new Date(endTime).getTime() - new Date(startTime).getTime();
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date().toISOString();
      await this.rollbackActions(execution, playbook);
      execution.status = 'rolled_back';
    }

    return execution;
  }

  /**
   * Execute actions sequentially or in parallel based on configuration
   */
  public async executeActions(
    actions: PlaybookAction[],
    variables: VariableContext,
    conditionalBranches?: ConditionalBranch[]
  ): Promise<ActionExecutionResult[]> {
    const results: ActionExecutionResult[] = [];

    // Evaluate conditional branches first
    let actionsToExecute = [...actions];
    if (conditionalBranches) {
      for (const branch of conditionalBranches) {
        if (this.conditionEvaluator.evaluate(branch.condition, variables)) {
          actionsToExecute = [...actionsToExecute, ...branch.actions];
        } else if (branch.elseActions) {
          actionsToExecute = [...actionsToExecute, ...branch.elseActions];
        }
      }
    }

    // Group actions by parallel execution
    const parallelGroups: PlaybookAction[][] = [];
    const sequentialActions: PlaybookAction[] = [];

    for (const action of actionsToExecute) {
      if (action.runInParallel) {
        let group = parallelGroups.find((g) => g.some((a) => a.id === action.dependsOn?.[0]));
        if (!group) {
          group = [];
          parallelGroups.push(group);
        }
        group.push(action);
      } else {
        sequentialActions.push(action);
      }
    }

    // Execute sequential actions
    for (const action of sequentialActions) {
      const result = await this.executeAction(action, variables);
      results.push(result);
      variables.previousActions[action.id] = result.result;
    }

    // Execute parallel actions
    for (const group of parallelGroups) {
      const parallelResults = await Promise.all(
        group.map((action) => this.executeAction(action, variables))
      );
      results.push(...parallelResults);
      parallelResults.forEach((result) => {
        const action = group.find((a) => a.id === result.actionId);
        if (action) {
          variables.previousActions[action.id] = result.result;
        }
      });
    }

    return results;
  }

  /**
   * Execute a single action with retry logic
   */
  public async executeAction(
    action: PlaybookAction,
    variables: VariableContext
  ): Promise<ActionExecutionResult> {
    const startTime = new Date().getTime();
    let lastError: Error | null = null;
    let retryCount = 0;

    const maxRetries = action.retryPolicy?.maxRetries ?? 3;
    const backoffMultiplier = action.retryPolicy?.backoffMultiplier ?? 2;
    const initialDelayMs = action.retryPolicy?.initialDelayMs ?? 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const handler = this.actionHandlers.getHandler(action.type);
        if (!handler) throw new Error(`No handler for action type: ${action.type}`);

        const result = await handler(action, variables);
        const duration = new Date().getTime() - startTime;

        return {
          actionId: action.id,
          status: 'success',
          result,
          duration,
          timestamp: new Date().toISOString(),
          retryCount: attempt
        };
      } catch (error) {
        lastError = error as Error;
        retryCount = attempt;

        if (attempt < maxRetries) {
          const delayMs = initialDelayMs * Math.pow(backoffMultiplier, attempt);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    const duration = new Date().getTime() - startTime;
    return {
      actionId: action.id,
      status: 'failed',
      error: lastError?.message,
      duration,
      timestamp: new Date().toISOString(),
      retryCount
    };
  }

  /**
   * Rollback actions in reverse order
   */
  public async rollbackActions(
    execution: ExecutionRecord,
    playbook: PlaybookDefinition
  ): Promise<void> {
    const successfulActions = execution.actions
      .filter((a) => a.status === 'success')
      .reverse();

    for (const actionResult of successfulActions) {
      const action = playbook.actions.find((a) => a.id === actionResult.actionId);
      if (action?.rollbackAction) {
        try {
          const handler = this.actionHandlers.getHandler(action.rollbackAction.type);
          if (handler) {
            await handler(action.rollbackAction, execution.variables);
          }
        } catch (error) {
          console.error(`Rollback failed for action ${action.id}:`, error);
        }
      }
    }
  }

  /**
   * Request manual approval for playbook execution
   */
  private async requestApproval(
    playbookId: string,
    _eventData: Record<string, unknown>,
    approvalConfig: PlaybookDefinition['approval']
  ): Promise<boolean> {
    if (!approvalConfig) return true;

    const timeoutMs = approvalConfig.timeoutMs ?? 3600000; // 1 hour default
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (approvalConfig.timeoutAction === 'auto_approve') {
          resolve(true);
        } else if (approvalConfig.timeoutAction === 'escalate') {
          resolve(false);
        } else {
          resolve(false);
        }
      }, timeoutMs);

      // In real implementation, this would integrate with approval service
      console.log(`Approval requested for playbook ${playbookId}`);
      clearTimeout(timer);
      resolve(true); // Default to approval for testing
    });
  }

  /**
   * Get the action handlers instance
   */
  public getActionHandlers(): ActionHandlers {
    return this.actionHandlers;
  }

  /**
   * Get the condition evaluator instance
   */
  public getConditionEvaluator(): ConditionEvaluator {
    return this.conditionEvaluator;
  }
}
