/**
 * Trigger Node Executor
 * Base trigger node that starts workflow execution
 */

import { Node } from '@xyflow/react';
import { NodeExecutor } from './index';

export const triggerExecutor: NodeExecutor = {
  async execute(node: Node, context: unknown): Promise<Record<string, unknown>> {
    // Extract config from node data
    const config = (node.data?.config || {}) as {
      triggerType?: string;
      description?: string;
    };

    const {
      triggerType = 'manual',
      description = 'Workflow triggered'
    } = config;

    // Cast context to expected type
    const ctx = (context || {}) as Record<string, unknown>;
    const input = ctx.input as Record<string, unknown> | undefined;

    // Trigger nodes primarily pass through their input
    // and add metadata about the trigger
    return {
      ...(input || {}),
      trigger: {
        type: triggerType,
        nodeId: node.id,
        description,
        timestamp: new Date().toISOString(),
        metadata: {
          workflowId: ctx.workflowId,
          executionId: ctx.executionId,
          userId: ctx.userId
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