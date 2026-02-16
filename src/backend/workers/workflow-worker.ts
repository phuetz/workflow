/**
 * Workflow Worker Process
 * Processes workflow execution jobs from Redis queue
 * Uses the backend ExecutionService instead of the frontend ExecutionEngine
 */

import { Job } from 'bullmq';
import { WorkflowQueueService, WorkflowJobData, JobResult } from '../queue/WorkflowQueue';
import { executionService } from '../services/executionService';
import { prisma } from '../database/prisma';
import { logger } from '../services/LogService';

/**
 * Process workflow execution job
 */
async function processWorkflowJob(job: Job<WorkflowJobData>): Promise<JobResult> {
  const { workflowId, executionId, inputData, mode } = job.data;

  logger.info(`Worker processing workflow: ${workflowId}`, {
    executionId,
    mode,
    attempt: job.attemptsMade + 1,
  });

  try {
    // Fetch workflow from database
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    await job.updateProgress(10);

    // Execute via backend ExecutionService (with credential resolution)
    const userId = (workflow as any).userId || 'system';
    const execution = await executionService.startExecution(workflow as any, inputData || {}, userId);

    await job.updateProgress(50);

    // Wait for execution to complete (poll status)
    const maxWaitMs = 300000; // 5 minutes
    const pollIntervalMs = 500;
    let elapsed = 0;

    while (elapsed < maxWaitMs) {
      const current = await executionService.getExecution(execution.id);
      if (!current || current.status === 'success' || current.status === 'failure' || current.status === 'timeout' || current.status === 'cancelled') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      elapsed += pollIntervalMs;

      // Update progress proportionally
      const progress = Math.min(90, 50 + Math.floor((elapsed / maxWaitMs) * 40));
      await job.updateProgress(progress);
    }

    const finalExecution = await executionService.getExecution(execution.id);

    await job.updateProgress(100);

    if (!finalExecution || finalExecution.status === 'failure') {
      const errorMessage = finalExecution?.error || 'Execution failed';
      logger.error(`Workflow execution failed: ${executionId}`, { error: errorMessage });

      return {
        success: false,
        executionId: execution.id,
        error: errorMessage,
        duration: finalExecution?.duration || 0,
      };
    }

    // Convert results
    const outputs: Record<string, unknown> = {};
    if (finalExecution.output) {
      for (const [nodeId, nodeResult] of Object.entries(finalExecution.output)) {
        outputs[nodeId] = nodeResult;
      }
    }

    logger.info(`Workflow execution completed: ${execution.id}`, {
      outputNodes: Object.keys(outputs).length,
      duration: finalExecution.duration,
    });

    return {
      success: true,
      executionId: execution.id,
      output: outputs,
      duration: finalExecution.duration || 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`Workflow execution failed: ${executionId}`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    await job.log(`Execution failed: ${errorMessage}`);

    return {
      success: false,
      executionId,
      error: errorMessage,
      duration: 0,
    };
  }
}

/**
 * Start worker
 */
async function startWorker() {
  logger.info('Starting workflow worker...', {
    nodeEnv: process.env.NODE_ENV,
    redisUrl: process.env.REDIS_URL,
    concurrency: process.env.WORKER_CONCURRENCY || '10',
  });

  const queueService = new WorkflowQueueService(process.env.REDIS_URL);

  await queueService.startWorker(processWorkflowJob);

  logger.info('Workflow worker started and listening for jobs');

  const gracefulShutdown = async () => {
    logger.info('Received shutdown signal, closing worker...');

    await queueService.stopWorker();
    await queueService.close();

    logger.info('Worker shut down gracefully');
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  setInterval(async () => {
    const health = await queueService.healthCheck();
    logger.debug('Worker health check', health);
  }, 60000);
}

if (process.argv[1]?.includes('workflow-worker')) {
  startWorker().catch((error) => {
    logger.error('Failed to start worker', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  });
}

export { startWorker, processWorkflowJob };
