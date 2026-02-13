/**
 * Workflow Execution Service
 * Handles real workflow execution with node processing
 */

import { Node, Edge } from '@xyflow/react';
import { Workflow, workflowRepository } from '../database/workflowRepository';
import { nodeExecutors } from './nodeExecutors';
import { analyticsService } from './analyticsService';
import { emailService } from './emailService';
import { userRepository } from '../database/userRepository';
import { logger } from '../../services/SimpleLogger';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'pending' | 'running' | 'success' | 'failure' | 'cancelled' | 'timeout';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input: any;
  output?: any;
  error?: string;
  executionPath: string[];
  nodeResults: Map<string, NodeExecutionResult>;
  executedBy: string;
  retryCount: number;
  logs: ExecutionLog[];
}

export interface NodeExecutionResult {
  nodeId: string;
  nodeType: string;
  status: 'success' | 'failure' | 'skipped';
  startTime: Date;
  endTime: Date;
  duration: number;
  input: any;
  output?: any;
  error?: string;
}

export interface ExecutionLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  nodeId?: string;
  message: string;
  data?: any;
}

export interface ExecutionContext {
  input: any;
  variables: Record<string, any>;
  results: Record<string, any>;
}

export class ExecutionService {
  private executions: Map<string, WorkflowExecution> = new Map();
  private activeExecutions: Set<string> = new Set();
  private executionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start workflow execution
   */
  async startExecution(
    workflow: Workflow,
    input: any,
    userId: string
  ): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: this.generateExecutionId(),
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: 'pending',
      startTime: new Date(),
      input,
      executionPath: [],
      nodeResults: new Map(),
      executedBy: userId,
      retryCount: 0,
      logs: []
    };

    this.executions.set(execution.id, execution);
    this.activeExecutions.add(execution.id);

    // Set timeout if configured
    if (workflow.settings.timeout) {
      const timeout = setTimeout(() => {
        this.timeoutExecution(execution.id);
      }, workflow.settings.timeout);
      this.executionTimeouts.set(execution.id, timeout);
    }

    // Start execution asynchronously
    this.executeWorkflow(execution, workflow).catch(error => {
      logger.error('Workflow execution failed:', error);
    });

    return execution;
  }

  /**
   * Execute workflow
   */
  private async executeWorkflow(
    execution: WorkflowExecution,
    workflow: Workflow
  ): Promise<void> {
    try {
      execution.status = 'running';
      this.log(execution, 'info', 'Workflow execution started');

      // Track workflow start
      analyticsService.trackEvent({
        type: 'workflow_start',
        timestamp: new Date(),
        workflowId: workflow.id,
        userId: execution.executedBy
      });

      // Find start nodes (nodes with no incoming edges)
      const startNodes = this.findStartNodes(workflow.nodes, workflow.edges);

      if (startNodes.length === 0) {
        throw new Error('No start nodes found in workflow');
      }

      // Execute workflow starting from start nodes
      const context: ExecutionContext = {
        input: execution.input,
        variables: {},
        results: {} as Record<string, any>
      };

      for (const startNode of startNodes) {
        await this.executeNode(startNode, workflow, execution, context);
      }

      // Mark execution as successful
      execution.status = 'success';
      execution.output = context.results;
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      this.log(execution, 'info', 'Workflow execution completed successfully');

      // Update workflow statistics
      await workflowRepository.updateStatistics(workflow.id, {
        success: true,
        duration: execution.duration
      });

      // Send notification if configured
      await this.sendNotification(execution, workflow);

    } catch (error) {
      execution.status = 'failure';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      this.log(execution, 'error', 'Workflow execution failed', { error: execution.error });

      // Update workflow statistics
      await workflowRepository.updateStatistics(workflow.id, {
        success: false,
        duration: execution.duration
      });

      // Handle retry if configured
      if (workflow.settings.retryOnFailure &&
          execution.retryCount < (workflow.settings.maxRetries || 3)) {
        await this.retryExecution(execution, workflow);
      } else {
        // Send failure notification
        await this.sendNotification(execution, workflow);
      }
    } finally {
      this.activeExecutions.delete(execution.id);
      this.cleanupExecution(execution.id);
    }

    // Track execution metrics
    await this.trackExecutionMetrics(execution);
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    node: Node,
    workflow: Workflow,
    execution: WorkflowExecution,
    context: ExecutionContext
  ): Promise<void> {
    const nodeData = node.data as Record<string, unknown>;
    const nodeType = nodeData.type as string;
    const nodeResult: NodeExecutionResult = {
      nodeId: node.id,
      nodeType,
      status: 'success',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      input: context
    };

    try {
      this.log(execution, 'debug', `Executing node: ${node.id} (${nodeType})`);
      execution.executionPath.push(node.id);

      // Get node executor
      const executor = nodeExecutors[nodeType];

      if (!executor) {
        throw new Error(`No executor found for node type: ${nodeType}`);
      }

      // Execute node
      const output = await executor.execute(nodeData as any, context);

      nodeResult.output = output;
      nodeResult.endTime = new Date();
      nodeResult.duration = nodeResult.endTime.getTime() - nodeResult.startTime.getTime();

      // Store result in context
      context.results[node.id] = output;

      this.log(execution, 'debug', `Node ${node.id} executed successfully`, { output });

      // Find and execute next nodes
      const nextEdges = workflow.edges.filter((edge: Edge) => edge.source === node.id);

      for (const edge of nextEdges) {
        const nextNode = workflow.nodes.find((n: Node) => n.id === edge.target);

        if (nextNode) {
          // Check if condition is met (for conditional nodes)
          if (await this.evaluateCondition(edge, context)) {
            await this.executeNode(nextNode, workflow, execution, context);
          }
        }
      }

    } catch (error) {
      nodeResult.status = 'failure';
      nodeResult.error = error instanceof Error ? error.message : 'Unknown error';
      nodeResult.endTime = new Date();
      nodeResult.duration = nodeResult.endTime.getTime() - nodeResult.startTime.getTime();

      this.log(execution, 'error', `Node ${node.id} failed`, { error: nodeResult.error });

      // Rethrow error to stop execution
      throw error;
    } finally {
      execution.nodeResults.set(node.id, nodeResult);
    }
  }

  /**
   * Find start nodes (nodes with no incoming edges)
   */
  private findStartNodes(nodes: Node[], edges: Edge[]): Node[] {
    const nodesWithIncoming = new Set(edges.map(edge => edge.target));
    return nodes.filter(node => !nodesWithIncoming.has(node.id));
  }

  /**
   * Evaluate edge condition
   */
  private async evaluateCondition(edge: Edge, context: ExecutionContext): Promise<boolean> {
    // If no condition, always proceed
    if (!(edge.data as Record<string, unknown>)?.condition) {
      return true;
    }

    try {
      // Simple condition evaluation
      // In production, use a proper expression evaluator
      const condition = String((edge.data as Record<string, unknown>)?.condition ?? '');

      // Handle basic comparisons
      if (condition.includes('===')) {
        const [left, right] = condition.split('===').map((s: string) => s.trim());
        return this.resolveValue(left, context) === this.resolveValue(right, context);
      }

      if (condition.includes('!==')) {
        const [left, right] = condition.split('!==').map((s: string) => s.trim());
        return this.resolveValue(left, context) !== this.resolveValue(right, context);
      }

      // Default to true if we can't evaluate
      return true;
    } catch (error) {
      logger.error('Error evaluating condition:', error);
      return true;
    }
  }

  /**
   * Resolve value from context
   */
  private resolveValue(path: string, context: ExecutionContext): any {
    // Remove quotes if present
    if (path.startsWith('"') && path.endsWith('"')) {
      return path.slice(1, -1);
    }

    // Parse numbers
    if (!isNaN(Number(path))) {
      return Number(path);
    }

    // Navigate context path
    const parts = path.split('.');
    let value: any = context;

    for (const part of parts) {
      value = value?.[part];
    }

    return value;
  }

  /**
   * Timeout execution
   */
  private async timeoutExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);

    if (!execution || execution.status !== 'running') return;

    execution.status = 'timeout';
    execution.error = 'Workflow execution timed out';
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

    this.log(execution, 'error', 'Workflow execution timed out');
    this.activeExecutions.delete(executionId);
    this.cleanupExecution(executionId);
  }

  /**
   * Retry execution
   */
  private async retryExecution(
    execution: WorkflowExecution,
    workflow: Workflow
  ): Promise<void> {
    execution.retryCount++;

    this.log(execution, 'info', `Retrying execution (attempt ${execution.retryCount})`);

    // Wait before retry
    await new Promise(resolve =>
      setTimeout(resolve, workflow.settings.retryDelay || 1000)
    );

    // Reset execution state
    execution.status = 'pending';
    execution.error = undefined;
    execution.nodeResults.clear();
    execution.executionPath = [];

    // Retry execution
    await this.executeWorkflow(execution, workflow);
  }

  /**
   * Send execution notification
   */
  private async sendNotification(
    execution: WorkflowExecution,
    workflow: Workflow
  ): Promise<void> {
    try {
      const user = await userRepository.findById(execution.executedBy);

      if (!user || !user.emailVerified) return;

      await emailService.sendWorkflowNotification(
        {
          email: user.email,
          firstName: user.firstName
        },
        {
          name: workflow.name,
          status: execution.status === 'success' ? 'success' : 'failure',
          executionTime: execution.duration || 0,
          error: execution.error
        }
      );
    } catch (error) {
      logger.error('Failed to send notification:', error);
    }
  }

  /**
   * Track execution metrics
   */
  private async trackExecutionMetrics(execution: WorkflowExecution): Promise<void> {
    // Track workflow metrics
    if (execution.status === 'success' || execution.status === 'failure') {
      analyticsService.trackEvent({
        type: execution.status === 'success' ? 'workflow_complete' : 'workflow_error',
        timestamp: execution.endTime || new Date(),
        workflowId: execution.workflowId,
        userId: execution.executedBy,
        duration: execution.duration,
        error: execution.error ? {
          type: 'ExecutionError',
          message: execution.error
        } : undefined,
        metadata: {
          nodesExecuted: execution.executionPath.length,
          totalNodes: execution.nodeResults.size,
          retryCount: execution.retryCount
        }
      });
    }

    // Track node metrics
    const nodeResultsArray = Array.from(execution.nodeResults.entries());
    for (const [nodeId, result] of nodeResultsArray) {
      analyticsService.trackEvent({
        type: result.status === 'success' ? 'node_complete' : 'node_error',
        timestamp: result.endTime,
        workflowId: execution.workflowId,
        nodeId,
        userId: execution.executedBy,
        duration: result.duration,
        error: result.error ? {
          type: 'NodeError',
          message: result.error
        } : undefined,
        metadata: {
          nodeType: result.nodeType
        }
      });
    }
  }

  /**
   * Cleanup execution
   */
  private cleanupExecution(executionId: string): void {
    const timeout = this.executionTimeouts.get(executionId);

    if (timeout) {
      clearTimeout(timeout);
      this.executionTimeouts.delete(executionId);
    }
  }

  /**
   * Log execution event
   */
  private log(
    execution: WorkflowExecution,
    level: ExecutionLog['level'],
    message: string,
    data?: any
  ): void {
    execution.logs.push({
      timestamp: new Date(),
      level,
      message,
      data
    });
  }

  /**
   * Get execution by ID
   */
  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    return this.executions.get(executionId) || null;
  }

  /**
   * Get executions for workflow
   */
  async getExecutions(
    workflowId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: string;
    }
  ): Promise<WorkflowExecution[]> {
    let executions = Array.from(this.executions.values())
      .filter(e => e.workflowId === workflowId);

    if (options?.status) {
      executions = executions.filter(e => e.status === options.status);
    }

    // Sort by start time (newest first)
    executions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    // Apply pagination
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const start = (page - 1) * limit;

    return executions.slice(start, start + limit);
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);

    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

    this.log(execution, 'info', 'Execution cancelled by user');
    this.activeExecutions.delete(executionId);
    this.cleanupExecution(executionId);

    return true;
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions);
  }

  private generateExecutionId(): string {
    return 'exec_' + Math.random().toString(36).substring(2, 15);
  }
}

// Singleton instance
export const executionService = new ExecutionService();
