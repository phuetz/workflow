/**
 * Workflow Worker Process
 * Processes workflow execution jobs from Redis queue
 * Can be scaled horizontally for load distribution
 */

import { Job } from 'bullmq';
import { WorkflowQueueService, WorkflowJobData, JobResult } from '../queue/WorkflowQueue';
import { WorkflowExecutor } from '../../components/ExecutionEngine';
import { logger } from '../services/LogService';
import type { Workflow, WorkflowNode } from '../../types/workflow';

// Mock workflow store for worker
// In production, this would fetch from database
const workflowStore = {
  workflows: new Map<string, Workflow>(),

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  },

  addWorkflow(workflow: Workflow) {
    this.workflows.set(workflow.id, workflow);
  },
};

/**
 * Process workflow execution job
 */
async function processWorkflowJob(job: Job<WorkflowJobData>): Promise<JobResult> {
  const { workflowId, executionId, inputData, triggerNode, mode } = job.data;

  logger.info(`Worker processing workflow: ${workflowId}`, {
    executionId,
    mode,
    attempt: job.attemptsMade + 1,
  });

  try {
    // Fetch workflow from database/store
    const workflow = workflowStore.getWorkflow(workflowId);

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Create executor
    const executor = new WorkflowExecutor(workflow.nodes, workflow.edges);

    // Find trigger node
    const startNode = triggerNode
      ? workflow.nodes.find((n: WorkflowNode) => n.id === triggerNode)
      : workflow.nodes.find((n: WorkflowNode) => n.data.type === 'trigger' || n.data.type === 'schedule');

    if (!startNode) {
      throw new Error('No trigger node found in workflow');
    }

    // Update job progress
    await job.updateProgress(10);

    // Execute workflow
    logger.info(`Starting workflow execution: ${executionId}`);
    const result = await executor.execute(startNode.id, inputData);

    await job.updateProgress(90);

    // Check execution result
    if (!result.success) {
      throw new Error(`Workflow execution failed: ${result.error || 'Unknown error'}`);
    }

    await job.updateProgress(100);

    logger.info(`Workflow execution completed: ${executionId}`, {
      outputNodes: Object.keys(result.outputs || {}),
    });

    return {
      success: true,
      executionId,
      output: result.outputs,
      duration: 0, // Will be set by queue service
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`Workflow execution failed: ${executionId}`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Update job with error data
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

  // Start worker with processor function
  await queueService.startWorker(processWorkflowJob);

  logger.info('Workflow worker started and listening for jobs');

  // Graceful shutdown
  const gracefulShutdown = async () => {
    logger.info('Received shutdown signal, closing worker...');

    await queueService.stopWorker();
    await queueService.close();

    logger.info('Worker shut down gracefully');
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  // Health check interval
  setInterval(async () => {
    const health = await queueService.healthCheck();
    logger.debug('Worker health check', health);
  }, 60000); // Every minute
}

// Start worker if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startWorker().catch((error) => {
    logger.error('Failed to start worker', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  });
}

export { startWorker, processWorkflowJob };
