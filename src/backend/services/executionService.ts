/**
 * Workflow Execution Service
 * Unified execution engine with Prisma persistence and SSE events.
 * Hot cache (Map) for in-flight executions, Prisma for durable storage.
 */

import { Workflow, workflowRepository } from '../database/workflowRepository';
import { getNodeExecutor, NodeExecutionContext } from './nodeExecutors';
import { credentialResolver } from './CredentialResolver';
import { analyticsService } from './analyticsService';
import { emailService } from './emailService';
import { userRepository } from '../database/userRepository';
import { logger } from '../../services/SimpleLogger';
import type { BackendNode } from './nodeExecutors/types';
import {
  createExecution as prismaCreateExecution,
  updateExecution as prismaUpdateExecution,
  getExecution as prismaGetExecution,
  startNodeExecution,
  finishNodeExecution,
} from '../api/repositories/adapters';
import {
  emitExecutionStarted,
  emitExecutionFinished,
  emitNodeStarted,
  emitNodeFinished,
} from '../api/services/events';
import { evaluateExpression, type EvalContext } from '../api/services/expressions';

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

/** Backend-native edge (no React dependency) */
interface BackendEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: { condition?: string; [key: string]: unknown };
}

function getEnvVars(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('WORKFLOW_ENV_') && value !== undefined) {
      env[key.replace('WORKFLOW_ENV_', '')] = value;
    }
  }
  return env;
}

/** Serialize Map<string, NodeExecutionResult> to plain object for Prisma JSON */
function serializeNodeResults(results: Map<string, NodeExecutionResult>): Record<string, any> {
  const obj: Record<string, any> = {};
  for (const [key, val] of results) {
    obj[key] = {
      ...val,
      startTime: val.startTime.toISOString(),
      endTime: val.endTime.toISOString(),
    };
  }
  return obj;
}

/** Recursively resolve {{ expr }} in a config object */
function resolveConfigExpressions(config: any, ctx: EvalContext): any {
  if (typeof config === 'string') {
    if (config.includes('{{') && config.includes('}}')) {
      // If the whole string is one expression, return the raw value (preserve type)
      const trimmed = config.trim();
      if (trimmed.startsWith('{{') && trimmed.endsWith('}}') && trimmed.indexOf('{{', 2) === -1) {
        try {
          return evaluateExpression(trimmed, ctx);
        } catch {
          return config;
        }
      }
      // Inline expressions within a longer string
      return config.replace(/\{\{(.+?)\}\}/g, (_match: string, expr: string) => {
        try {
          const val = evaluateExpression(`{{ ${expr} }}`, ctx);
          return val == null ? '' : String(val);
        } catch {
          return _match;
        }
      });
    }
    return config;
  }
  if (Array.isArray(config)) {
    return config.map(item => resolveConfigExpressions(item, ctx));
  }
  if (config && typeof config === 'object') {
    const resolved: Record<string, any> = {};
    for (const [k, v] of Object.entries(config)) {
      resolved[k] = resolveConfigExpressions(v, ctx);
    }
    return resolved;
  }
  return config;
}

export class ExecutionService {
  private executions: Map<string, WorkflowExecution> = new Map();
  private activeExecutions: Set<string> = new Set();
  private executionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start workflow execution — creates a Prisma record, then executes asynchronously.
   */
  async startExecution(
    workflow: Workflow,
    input: any,
    userId: string
  ): Promise<WorkflowExecution> {
    // Create Prisma-backed execution record
    let dbId: string | undefined;
    try {
      const dbExec = await prismaCreateExecution(workflow.id, input);
      dbId = dbExec?.id;
    } catch (err) {
      logger.warn('Failed to create Prisma execution record, using local ID', { error: String(err) });
    }

    const execution: WorkflowExecution = {
      id: dbId || this.generateExecutionId(),
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

    // Hot cache for in-flight access
    this.executions.set(execution.id, execution);
    this.activeExecutions.add(execution.id);

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
   * Execute workflow — updates Prisma on status changes and emits SSE events.
   */
  private async executeWorkflow(
    execution: WorkflowExecution,
    workflow: Workflow
  ): Promise<void> {
    try {
      execution.status = 'running';
      this.log(execution, 'info', 'Workflow execution started');

      // Persist running status
      await this.persistStatus(execution.id, 'running');
      emitExecutionStarted({
        id: execution.id,
        workflowId: execution.workflowId,
        startedAt: execution.startTime.toISOString(),
      });

      analyticsService.trackEvent({
        type: 'workflow_start',
        timestamp: new Date(),
        workflowId: workflow.id,
        userId: execution.executedBy
      });

      const nodes = workflow.nodes as BackendNode[];
      const edges = workflow.edges as BackendEdge[];

      const startNodes = this.findStartNodes(nodes, edges);

      if (startNodes.length === 0) {
        throw new Error('No start nodes found in workflow');
      }

      const context: ExecutionContext = {
        input: execution.input,
        variables: {},
        results: {} as Record<string, any>
      };

      for (const startNode of startNodes) {
        await this.executeNode(startNode, workflow, execution, context);
      }

      execution.status = 'success';
      execution.output = context.results;
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      this.log(execution, 'info', 'Workflow execution completed successfully');

      // Persist success to Prisma
      await this.persistCompletion(execution);

      emitExecutionFinished({
        id: execution.id,
        workflowId: execution.workflowId,
        status: 'success',
        finishedAt: execution.endTime.toISOString(),
      });

      await workflowRepository.updateStatistics(workflow.id, {
        success: true,
        duration: execution.duration
      });

      await this.sendNotification(execution, workflow);

    } catch (error) {
      execution.status = 'failure';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      this.log(execution, 'error', 'Workflow execution failed', { error: execution.error });

      // Persist failure to Prisma
      await this.persistCompletion(execution);

      emitExecutionFinished({
        id: execution.id,
        workflowId: execution.workflowId,
        status: 'failure',
        finishedAt: execution.endTime.toISOString(),
        error: execution.error,
      });

      await workflowRepository.updateStatistics(workflow.id, {
        success: false,
        duration: execution.duration
      });

      // Trigger error workflow if configured
      await this.triggerErrorWorkflow(execution, workflow);

      if (workflow.settings.retryOnFailure &&
          execution.retryCount < (workflow.settings.maxRetries || 3)) {
        await this.retryExecution(execution, workflow);
      } else {
        await this.sendNotification(execution, workflow);
      }
    } finally {
      this.activeExecutions.delete(execution.id);
      this.cleanupExecution(execution.id);
      // Remove from hot cache after a delay (allow SSE clients to catch up)
      setTimeout(() => {
        this.executions.delete(execution.id);
      }, 60_000);
    }

    await this.trackExecutionMetrics(execution);
  }

  /**
   * Execute a single node with credential resolution, expression resolution,
   * and Prisma per-node persistence.
   */
  private async executeNode(
    node: BackendNode,
    workflow: Workflow,
    execution: WorkflowExecution,
    context: ExecutionContext
  ): Promise<void> {
    const nodeData = node.data;
    const nodeType = nodeData.type || node.type;
    const nodeResult: NodeExecutionResult = {
      nodeId: node.id,
      nodeType,
      status: 'success',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      input: context
    };

    // Persist node start to Prisma
    try {
      await startNodeExecution(execution.id, { id: node.id, name: nodeData.label || node.id, type: nodeType });
    } catch (err) {
      logger.warn('Failed to persist node start', { nodeId: node.id, error: String(err) });
    }

    emitNodeStarted({
      execId: execution.id,
      nodeId: node.id,
      type: nodeType,
      ts: Date.now(),
    });

    try {
      this.log(execution, 'debug', `Executing node: ${node.id} (${nodeType})`);
      execution.executionPath.push(node.id);

      // Resolve credentials if configured
      let credentials: Record<string, any> | undefined;
      const credentialId = nodeData.credentialId || nodeData.config?.credentialId;
      if (credentialId) {
        try {
          credentials = await credentialResolver.resolve(credentialId as string, execution.executedBy);
        } catch (err) {
          logger.warn(`Failed to resolve credential ${credentialId} for node ${node.id}`, { error: String(err) });
        }
      }

      // Resolve expressions in node config
      const env = getEnvVars();
      const rawConfig = nodeData.config || nodeData;
      const evalCtx: EvalContext = {
        json: context.results[node.id] || context.input || {},
        node: context.results,
        env,
        vars: context.variables,
        items: Object.values(context.results),
      };
      const resolvedConfig = resolveConfigExpressions(rawConfig, evalCtx);

      // Build execution context for the executor
      const execContext: NodeExecutionContext = {
        nodeId: node.id,
        workflowId: workflow.id,
        executionId: execution.id,
        input: context.results[node.id] || context.input,
        config: resolvedConfig,
        credentials,
        env,
        previousNodes: context.results,
      };

      const executor = getNodeExecutor(nodeType);
      const output = await executor.execute(execContext);

      nodeResult.output = output;
      nodeResult.endTime = new Date();
      nodeResult.duration = nodeResult.endTime.getTime() - nodeResult.startTime.getTime();

      // Store result in context (unwrap NodeExecutionResult.data for downstream nodes)
      context.results[node.id] = output.data !== undefined ? output.data : output;

      this.log(execution, 'debug', `Node ${node.id} executed successfully`);

      // Persist node success to Prisma
      try {
        await finishNodeExecution(execution.id, node.id, 'success', output);
      } catch (err) {
        logger.warn('Failed to persist node finish', { nodeId: node.id, error: String(err) });
      }

      emitNodeFinished({
        execId: execution.id,
        nodeId: node.id,
        type: nodeType,
        ts: Date.now(),
        status: 'success',
        durationMs: nodeResult.duration,
      });

      // Find and execute next nodes
      const edges = workflow.edges as BackendEdge[];
      const nextEdges = edges.filter(edge => edge.source === node.id);

      for (const edge of nextEdges) {
        const nodes = workflow.nodes as BackendNode[];
        const nextNode = nodes.find(n => n.id === edge.target);

        if (nextNode) {
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

      // Persist node failure to Prisma
      try {
        await finishNodeExecution(execution.id, node.id, 'failure', undefined, nodeResult.error);
      } catch (err) {
        logger.warn('Failed to persist node failure', { nodeId: node.id, error: String(err) });
      }

      emitNodeFinished({
        execId: execution.id,
        nodeId: node.id,
        type: nodeType,
        ts: Date.now(),
        status: 'failure',
        durationMs: nodeResult.duration,
      });

      throw error;
    } finally {
      execution.nodeResults.set(node.id, nodeResult);
    }
  }

  /** Persist status change to Prisma (fire-and-forget with warning) */
  private async persistStatus(executionId: string, status: string): Promise<void> {
    try {
      await prismaUpdateExecution(executionId, {
        status,
        startedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.warn('Failed to persist execution status', { executionId, status, error: String(err) });
    }
  }

  /** Persist final execution state to Prisma */
  private async persistCompletion(execution: WorkflowExecution): Promise<void> {
    try {
      await prismaUpdateExecution(execution.id, {
        status: execution.status,
        finishedAt: execution.endTime?.toISOString(),
        durationMs: execution.duration,
        output: serializeNodeResults(execution.nodeResults),
        error: execution.error,
      });
    } catch (err) {
      logger.warn('Failed to persist execution completion', { executionId: execution.id, error: String(err) });
    }
  }

  /**
   * Trigger error workflow if configured
   */
  private async triggerErrorWorkflow(
    execution: WorkflowExecution,
    workflow: Workflow
  ): Promise<void> {
    const errorWorkflowId = workflow.settings?.errorWorkflow;
    if (!errorWorkflowId) return;

    try {
      const errorWorkflow = await workflowRepository.findById(errorWorkflowId);
      if (!errorWorkflow) {
        logger.warn(`Error workflow not found: ${errorWorkflowId}`);
        return;
      }

      const errorContext = {
        $error: {
          message: execution.error,
          workflowId: execution.workflowId,
          workflowName: execution.workflowName,
          executionId: execution.id,
          failedNodeId: execution.executionPath[execution.executionPath.length - 1],
          timestamp: new Date().toISOString(),
        }
      };

      logger.info('Triggering error workflow', { errorWorkflowId, executionId: execution.id });
      await this.startExecution(errorWorkflow, errorContext, execution.executedBy);
    } catch (err) {
      logger.error('Failed to trigger error workflow', { errorWorkflowId, error: String(err) });
    }
  }

  private findStartNodes(nodes: BackendNode[], edges: BackendEdge[]): BackendNode[] {
    const nodesWithIncoming = new Set(edges.map(edge => edge.target));
    return nodes.filter(node => !nodesWithIncoming.has(node.id));
  }

  private async evaluateCondition(edge: BackendEdge, context: ExecutionContext): Promise<boolean> {
    if (!edge.data?.condition) return true;

    try {
      const condition = String(edge.data.condition);

      if (condition.includes('===')) {
        const [left, right] = condition.split('===').map(s => s.trim());
        return this.resolveValue(left, context) === this.resolveValue(right, context);
      }

      if (condition.includes('!==')) {
        const [left, right] = condition.split('!==').map(s => s.trim());
        return this.resolveValue(left, context) !== this.resolveValue(right, context);
      }

      return true;
    } catch (error) {
      logger.error('Error evaluating condition:', error);
      return true;
    }
  }

  private resolveValue(path: string, context: ExecutionContext): any {
    if (path.startsWith('"') && path.endsWith('"')) return path.slice(1, -1);
    if (!isNaN(Number(path))) return Number(path);

    const parts = path.split('.');
    let value: any = context;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }

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

    await this.persistCompletion(execution);
    emitExecutionFinished({
      id: execution.id,
      workflowId: execution.workflowId,
      status: 'timeout',
      finishedAt: execution.endTime.toISOString(),
      error: execution.error,
    });
  }

  private async retryExecution(
    execution: WorkflowExecution,
    workflow: Workflow
  ): Promise<void> {
    execution.retryCount++;
    this.log(execution, 'info', `Retrying execution (attempt ${execution.retryCount})`);

    await new Promise(resolve =>
      setTimeout(resolve, workflow.settings.retryDelay || 1000)
    );

    execution.status = 'pending';
    execution.error = undefined;
    execution.nodeResults.clear();
    execution.executionPath = [];

    await this.executeWorkflow(execution, workflow);
  }

  private async sendNotification(
    execution: WorkflowExecution,
    workflow: Workflow
  ): Promise<void> {
    try {
      const user = await userRepository.findById(execution.executedBy);
      if (!user || !user.emailVerified) return;

      await emailService.sendWorkflowNotification(
        { email: user.email, firstName: user.firstName },
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

  private async trackExecutionMetrics(execution: WorkflowExecution): Promise<void> {
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
        metadata: { nodeType: result.nodeType }
      });
    }
  }

  private cleanupExecution(executionId: string): void {
    const timeout = this.executionTimeouts.get(executionId);
    if (timeout) {
      clearTimeout(timeout);
      this.executionTimeouts.delete(executionId);
    }
  }

  private log(
    execution: WorkflowExecution,
    level: ExecutionLog['level'],
    message: string,
    data?: any
  ): void {
    execution.logs.push({ timestamp: new Date(), level, message, data });
  }

  /** Get execution — hot cache first, then Prisma fallback */
  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    const cached = this.executions.get(executionId);
    if (cached) return cached;

    // Fall back to Prisma
    try {
      const dbExec = await prismaGetExecution(executionId);
      if (!dbExec) return null;

      // Map Prisma record to WorkflowExecution shape
      const record = dbExec as Record<string, any>;
      return {
        id: record.id,
        workflowId: record.workflowId,
        workflowName: '',
        status: (record.status || 'pending').toLowerCase() as WorkflowExecution['status'],
        startTime: record.startedAt ? new Date(record.startedAt) : new Date(),
        endTime: record.finishedAt ? new Date(record.finishedAt) : undefined,
        duration: record.durationMs,
        input: record.input,
        output: record.output,
        error: record.error,
        executionPath: [],
        nodeResults: new Map(),
        executedBy: record.userId || '',
        retryCount: 0,
        logs: [],
      };
    } catch {
      return null;
    }
  }

  async getExecutions(
    workflowId: string,
    options?: { page?: number; limit?: number; status?: string }
  ): Promise<WorkflowExecution[]> {
    let executions = Array.from(this.executions.values())
      .filter(e => e.workflowId === workflowId);

    if (options?.status) {
      executions = executions.filter(e => e.status === options.status);
    }

    executions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const start = (page - 1) * limit;

    return executions.slice(start, start + limit);
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') return false;

    execution.status = 'cancelled';
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

    this.log(execution, 'info', 'Execution cancelled by user');
    this.activeExecutions.delete(executionId);
    this.cleanupExecution(executionId);

    await this.persistCompletion(execution);
    emitExecutionFinished({
      id: execution.id,
      workflowId: execution.workflowId,
      status: 'cancelled',
      finishedAt: execution.endTime.toISOString(),
    });

    return true;
  }

  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions);
  }

  private generateExecutionId(): string {
    return 'exec_' + Math.random().toString(36).substring(2, 15);
  }
}

// Singleton instance
export const executionService = new ExecutionService();
