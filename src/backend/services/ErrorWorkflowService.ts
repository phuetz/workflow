/**
 * Error Workflow Service
 * Triggers error workflows when workflow executions fail.
 * This is also integrated directly into ExecutionService.triggerErrorWorkflow().
 */

import { executionService } from './executionService';
import { prisma } from '../database/prisma';
import { logger } from '../../services/SimpleLogger';

interface ErrorContext {
  message: string;
  workflowId: string;
  workflowName: string;
  executionId: string;
  failedNodeId?: string;
  timestamp: string;
}

class ErrorWorkflowService {
  /**
   * Trigger an error workflow with the given error context
   */
  async triggerErrorWorkflow(
    errorWorkflowId: string,
    errorContext: ErrorContext,
    userId: string
  ): Promise<string | null> {
    try {
      const workflow = await prisma.workflow.findUnique({
        where: { id: errorWorkflowId },
      });

      if (!workflow) {
        logger.warn(`Error workflow not found: ${errorWorkflowId}`);
        return null;
      }

      const execution = await executionService.startExecution(
        workflow as any,
        { $error: errorContext },
        userId
      );

      logger.info('Error workflow triggered', {
        errorWorkflowId,
        executionId: execution.id,
        originalWorkflowId: errorContext.workflowId,
      });

      return execution.id;
    } catch (err) {
      logger.error('Failed to trigger error workflow', {
        errorWorkflowId,
        error: String(err),
      });
      return null;
    }
  }
}

export const errorWorkflowService = new ErrorWorkflowService();
