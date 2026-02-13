/**
 * Execution Factory
 * Generate test workflow executions
 */

import { PrismaClient, WorkflowExecution, ExecutionStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface ExecutionFactoryOptions {
  workflowId?: string;
  userId?: string;
  status?: ExecutionStatus;
  trigger?: Record<string, unknown>;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: Record<string, unknown>;
  duration?: number;
  startedAt?: Date;
  finishedAt?: Date;
}

export class ExecutionFactory {
  static async create(workflowId: string, userId: string, options: ExecutionFactoryOptions = {}): Promise<WorkflowExecution> {
    const startedAt = options.startedAt || new Date(Date.now() - (options.duration || 1000));
    const finishedAt = options.finishedAt || (options.status === ExecutionStatus.RUNNING ? null : new Date());

    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        userId,
        status: options.status || ExecutionStatus.SUCCESS,
        trigger: options.trigger || { type: 'manual' },
        input: options.input || {},
        output: options.output,
        error: options.error,
        duration: options.duration,
        startedAt,
        finishedAt
      }
    });

    return execution;
  }

  static async createMany(workflowId: string, userId: string, count: number, options: ExecutionFactoryOptions = {}): Promise<WorkflowExecution[]> {
    const executions: WorkflowExecution[] = [];
    for (let i = 0; i < count; i++) {
      executions.push(await ExecutionFactory.create(workflowId, userId, options));
    }
    return executions;
  }

  static async createSuccess(workflowId: string, userId: string, options: ExecutionFactoryOptions = {}): Promise<WorkflowExecution> {
    return ExecutionFactory.create(workflowId, userId, {
      ...options,
      status: ExecutionStatus.SUCCESS,
      output: options.output || { result: 'success' },
      duration: options.duration || 1500
    });
  }

  static async createFailed(workflowId: string, userId: string, options: ExecutionFactoryOptions = {}): Promise<WorkflowExecution> {
    return ExecutionFactory.create(workflowId, userId, {
      ...options,
      status: ExecutionStatus.FAILED,
      error: options.error || { message: 'Test error', code: 'TEST_ERROR' },
      duration: options.duration || 500
    });
  }

  static async createRunning(workflowId: string, userId: string, options: ExecutionFactoryOptions = {}): Promise<WorkflowExecution> {
    return ExecutionFactory.create(workflowId, userId, {
      ...options,
      status: ExecutionStatus.RUNNING,
      finishedAt: undefined
    });
  }

  static async createCancelled(workflowId: string, userId: string, options: ExecutionFactoryOptions = {}): Promise<WorkflowExecution> {
    return ExecutionFactory.create(workflowId, userId, {
      ...options,
      status: ExecutionStatus.CANCELLED,
      duration: options.duration || 300
    });
  }

  static async createTimedOut(workflowId: string, userId: string, options: ExecutionFactoryOptions = {}): Promise<WorkflowExecution> {
    return ExecutionFactory.create(workflowId, userId, {
      ...options,
      status: ExecutionStatus.TIMEOUT,
      error: options.error || { message: 'Execution timeout', code: 'TIMEOUT' },
      duration: options.duration || 30000
    });
  }

  static async createWithNodeExecutions(workflowId: string, userId: string, nodeCount: number = 3): Promise<WorkflowExecution> {
    const execution = await ExecutionFactory.createSuccess(workflowId, userId);

    // Create node executions
    for (let i = 1; i <= nodeCount; i++) {
      await prisma.nodeExecution.create({
        data: {
          executionId: execution.id,
          nodeId: `node-${i}`,
          status: ExecutionStatus.SUCCESS,
          input: { nodeInput: `test-${i}` },
          output: { nodeOutput: `result-${i}` },
          duration: 100 * i,
          startedAt: new Date(execution.startedAt.getTime() + (i - 1) * 100),
          finishedAt: new Date(execution.startedAt.getTime() + i * 100)
        }
      });
    }

    return execution;
  }
}
