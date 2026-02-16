/**
 * Sub-Workflow Executor
 * Executes a nested workflow within the current execution.
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import { logger } from '../../../services/SimpleLogger';

export const subWorkflowExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = ctx.config || {};
    const workflowId = (config.workflowId || config.subWorkflowId) as string;

    if (!workflowId) {
      throw new Error('Sub-workflow ID is required');
    }

    // Lazy import to avoid circular dependency
    const { executionService } = await import('../executionService');
    const { prisma } = await import('../../database/prisma');

    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) {
      throw new Error(`Sub-workflow not found: ${workflowId}`);
    }

    logger.info('Executing sub-workflow', { workflowId, parentExecution: ctx.executionId });

    // Pass input data to sub-workflow
    const subInput = config.inputData || ctx.input || {};
    const execution = await executionService.startExecution(workflow as any, subInput, 'system');

    // Wait for sub-workflow completion
    const maxWaitMs = (config.timeout || 300000) as number; // 5 min default
    const pollMs = 200;
    let elapsed = 0;

    while (elapsed < maxWaitMs) {
      const current = await executionService.getExecution(execution.id);
      if (!current) break;
      if (['success', 'failure', 'timeout', 'cancelled'].includes(current.status)) {
        if (current.status === 'failure') {
          throw new Error(`Sub-workflow failed: ${current.error || 'Unknown error'}`);
        }
        return {
          success: true,
          data: {
            executionId: execution.id,
            status: current.status,
            output: current.output,
            duration: current.duration,
          },
          timestamp: new Date().toISOString(),
        };
      }
      await new Promise(r => setTimeout(r, pollMs));
      elapsed += pollMs;
    }

    throw new Error(`Sub-workflow timed out after ${maxWaitMs}ms`);
  },
};
