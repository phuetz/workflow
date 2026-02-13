/**
 * Trigger Node Executor
 * Base trigger node that starts workflow execution
 */

import { Node } from 'reactflow';
import { NodeExecutor } from './index';

export const triggerExecutor: NodeExecutor = {
  async execute(node: Node, context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const {
      triggerType = 'manual',
      description = 'Workflow triggered'
    } = config;

    // Trigger nodes primarily pass through their input
    // and add metadata about the trigger
    return {
      ...context.input,
      trigger: {
        type: triggerType,
        nodeId: node.id,
        description,
        timestamp: new Date().toISOString(),
        metadata: {
          workflowId: context.workflowId,
          executionId: context.executionId,
          userId: context.userId
        }
      }
    };
  },

  validate(): string[] {
    // Simplified validation without node parameter
    // Trigger nodes don't require validation
    return [];
  }
};