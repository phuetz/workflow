/**
 * Trigger Node Executor
 * Base trigger node that starts workflow execution
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';

export const triggerExecutor: NodeExecutor = {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = context.config || {};

    const triggerType = (config.triggerType || 'manual') as string;
    const description = (config.description || 'Workflow triggered') as string;

    return {
      success: true,
      data: {
        ...(typeof context.input === 'object' && context.input !== null ? context.input : {}),
        trigger: {
          type: triggerType,
          nodeId: context.nodeId,
          description,
          timestamp: new Date().toISOString(),
          metadata: {
            workflowId: context.workflowId,
            executionId: context.executionId,
          }
        }
      },
      timestamp: new Date().toISOString(),
    };
  },
};
