/**
 * WorkflowExecutor - Main orchestrator for workflow execution.
 * Coordinates node execution, data flow, and error handling.
 */

import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import type {
  NodeExecutionResult,
  ExecutorOptions,
  ExecutionError,
  OnNodeStart,
  OnNodeComplete,
  OnNodeError,
  NodeConfig
} from './execution/types';
import { DEFAULT_NODE_TIMEOUT } from './execution/types';

// Import data flow utilities
import {
  getStartNodes,
  getNextNodes,
  edgeConditionMet,
  combineInputData,
  getNextExecutionItems,
  getErrorBranchItems,
  shouldContinueAfterError
} from './execution/DataFlow';

// Import all node executors
import {
  executeTrigger,
  executeSchedule,
  executeDelay,
  executeRespondToWebhook,
  executeHttpRequest,
  executeEmail,
  executeSlack,
  executeDiscord,
  executeDatabase,
  executeMongoDB,
  executeGoogleSheets,
  executeS3,
  executeCondition,
  executeTransform,
  executeFilter,
  executeSort,
  executeMerge,
  executeItemLists,
  executeRemoveDuplicates,
  executeSplitInBatches,
  executeRenameKeys,
  executeSplitOut,
  executeSummarize,
  executeSet,
  executeEditFields,
  executeAggregate,
  executeLimit,
  executeCompareDatasets,
  executeCode,
  executeFunction,
  executeFunctionItem,
  executeOpenAI,
  executeDateTime,
  executeCrypto,
  executeCommand,
  executeHtml,
  executeMarkdown,
  executeCompression,
  executeETL,
  executeLoop,
  executeForEach,
  executeGeneric
} from './execution/executors';

/**
 * WorkflowExecutor handles the execution of workflow nodes in sequence,
 * managing data flow between nodes and handling errors appropriately.
 */
export class WorkflowExecutor {
  constructor(
    private nodes: WorkflowNode[],
    private edges: WorkflowEdge[],
    private options: ExecutorOptions = {}
  ) {}

  /**
   * Helper to wrap a promise with a timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage = 'Operation timed out'
  ): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${errorMessage} after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }

  /**
   * Execute a single node with timeout handling
   */
  async executeNode(node: WorkflowNode, inputData: Record<string, unknown> = {}): Promise<NodeExecutionResult> {
    const { type } = node.data;
    const startTime = Date.now();
    const timeout = node.data.timeout ?? DEFAULT_NODE_TIMEOUT;

    try {
      console.log(`Executing node: ${node.data.label} (${type}) [timeout: ${timeout}ms]`);

      const result = await this.withTimeout(
        this.executeNodeLogic(node, inputData),
        timeout,
        `Node "${node.data.label}" execution timed out`
      );

      return {
        status: 'success',
        success: true,
        data: result,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        nodeType: type
      };
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));
      const isTimeout = errorObj.message.includes('timed out after');

      return {
        status: 'error',
        success: false,
        error: {
          message: errorObj.message,
          stack: errorObj.stack,
          code: isTimeout ? 'TIMEOUT_ERROR' : ((error as { code?: string }).code || 'EXECUTION_ERROR')
        },
        duration,
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        nodeType: type,
        timedOut: isTimeout
      };
    }
  }

  /**
   * Route node execution to the appropriate executor
   */
  private async executeNodeLogic(node: WorkflowNode, inputData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { type, config = {} } = node.data;

    switch (type) {
      case 'trigger':
      case 'manualTrigger':
      case 'webhook':
        return executeTrigger(node, config, inputData);
      case 'schedule':
        return executeSchedule(node, config, inputData);
      case 'httpRequest':
        return executeHttpRequest(node, config, inputData);
      case 'email':
      case 'gmail':
        return executeEmail(node, config, inputData);
      case 'slack':
        return executeSlack(node, config, inputData);
      case 'discord':
        return executeDiscord(node, config, inputData);
      case 'mysql':
      case 'postgres':
        return executeDatabase(node, config, inputData);
      case 'mongodb':
        return executeMongoDB(node, config, inputData);
      case 'condition':
        return executeCondition(node, config, inputData);
      case 'transform':
        return executeTransform(node, config, inputData);
      case 'code':
        return executeCode(node, config, inputData);
      case 'function':
        return executeFunction(node, config, inputData);
      case 'functionItem':
        return executeFunctionItem(node, config, inputData);
      case 'openai':
        return executeOpenAI(node, config, inputData);
      case 'filter':
        return executeFilter(node, config, inputData);
      case 'sort':
        return executeSort(node, config, inputData);
      case 'merge':
        return executeMerge(node, config, inputData);
      case 'delay':
      case 'wait':
        return executeDelay(node, config, inputData);
      case 'subWorkflow':
        return this.executeSubWorkflow(node, config, inputData);
      case 'loop':
        return executeLoop(node, config, inputData);
      case 'forEach':
        return executeForEach(node, config, inputData);
      case 'etl':
        return executeETL(node, config, inputData);
      case 'googleSheets':
        return executeGoogleSheets(node, config, inputData);
      case 's3':
        return executeS3(node, config, inputData);
      case 'errorGenerator':
        throw new Error(String(config.message || 'Intentional error'));
      case 'stopAndError':
        throw new Error(String(config.errorMessage || 'Workflow stopped with error'));
      case 'noOperation':
        return inputData;
      case 'respondToWebhook':
        return executeRespondToWebhook(node, config, inputData);
      case 'itemLists':
        return executeItemLists(node, config, inputData);
      case 'removeDuplicates':
        return executeRemoveDuplicates(node, config, inputData);
      case 'dateTime':
        return executeDateTime(node, config, inputData);
      case 'crypto':
        return executeCrypto(node, config, inputData);
      case 'compareDatasets':
        return executeCompareDatasets(node, config, inputData);
      case 'executeCommand':
        return executeCommand(node, config, inputData);
      case 'html':
        return executeHtml(node, config, inputData);
      case 'markdown':
        return executeMarkdown(node, config, inputData);
      case 'compression':
        return executeCompression(node, config, inputData);
      case 'splitInBatches':
        return executeSplitInBatches(node, config, inputData);
      case 'renameKeys':
        return executeRenameKeys(node, config, inputData);
      case 'splitOut':
        return executeSplitOut(node, config, inputData);
      case 'summarize':
        return executeSummarize(node, config, inputData);
      case 'set':
        return executeSet(node, config, inputData);
      case 'edit':
      case 'editFields':
        return executeEditFields(node, config, inputData);
      case 'aggregate':
        return executeAggregate(node, config, inputData);
      case 'limit':
        return executeLimit(node, config, inputData);
      default:
        return executeGeneric(node, config, inputData);
    }
  }

  /**
   * Execute a sub-workflow
   */
  private async executeSubWorkflow(
    node: WorkflowNode,
    config: NodeConfig,
    inputData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const workflowId = String(config.workflowId);
    if (!workflowId) {
      throw new Error('No workflow selected');
    }
    if (typeof this.options.loadWorkflow !== 'function') {
      throw new Error('loadWorkflow option not provided');
    }

    const sub = await this.options.loadWorkflow(workflowId);
    if (!sub || !Array.isArray(sub.nodes)) {
      throw new Error('Workflow not found');
    }

    const executor = new WorkflowExecutor(sub.nodes, sub.edges || [], this.options);
    const res = await executor.execute(() => {}, () => {}, () => {});
    return { workflowId, result: Array.from(res.entries()) };
  }

  /**
   * Main workflow execution loop
   */
  async execute(
    onNodeStart?: OnNodeStart,
    onNodeComplete?: OnNodeComplete,
    onNodeError?: OnNodeError
  ): Promise<Map<string, NodeExecutionResult>> {
    const startTime = Date.now();
    const executionId = `exec_${Date.now()}`;

    console.log(`Starting workflow execution: ${executionId}`);

    const startNodes = getStartNodes(this.nodes, this.edges);
    if (startNodes.length === 0) {
      throw new Error('No start nodes found in workflow');
    }

    const executionQueue: Array<{ node: WorkflowNode; inputData: Record<string, unknown> }> =
      startNodes.map(node => ({ node, inputData: {} }));

    const executed = new Set<string>();
    const results = new Map<string, NodeExecutionResult>();
    const errors: Array<{ nodeId: string; error: ExecutionError }> = [];

    while (executionQueue.length > 0) {
      const { node, inputData } = executionQueue.shift()!;

      if (!node || executed.has(node.id)) continue;

      try {
        console.log(`Executing node: ${node.data.label} (${node.id})`);
        onNodeStart?.(node.id);

        // Combine input data from previous nodes
        const nodeInputData = combineInputData(node.id, this.edges, results, inputData);

        // Execute the node
        const result = await this.executeNode(node, nodeInputData);
        results.set(node.id, result);
        executed.add(node.id);

        if (result.status === 'error') {
          console.error(`Node returned error: ${node.data.label}`, result.error);
          errors.push({ nodeId: node.id, error: result.error! });
          onNodeError?.(node.id, result.error!);

          // Handle error branches
          const errorItems = getErrorBranchItems(node, result.error!, this.nodes, this.edges, executed);
          executionQueue.push(...errorItems);

          const errorEdges = getNextNodes(node.id, this.nodes, this.edges, 'error');
          if (!shouldContinueAfterError(node, errorEdges)) {
            break;
          }
          continue;
        }

        console.log(`Node completed: ${node.data.label}`, result);
        onNodeComplete?.(node.id, nodeInputData, result);

        // Get next nodes to execute
        const nextItems = getNextExecutionItems(node, result, this.nodes, this.edges, executed);
        executionQueue.push(...nextItems);

      } catch (error: unknown) {
        console.error(`Node failed: ${node.data.label}`, error);
        const errorObj = error instanceof Error ? error : new Error(String(error));
        const errorPayload: ExecutionError = {
          message: errorObj.message,
          stack: errorObj.stack,
          code: (error as { code?: string }).code || 'EXECUTION_ERROR'
        };

        errors.push({ nodeId: node.id, error: errorPayload });
        onNodeError?.(node.id, errorPayload);
        executed.add(node.id);

        // Handle error branches
        const errorItems = getErrorBranchItems(node, errorPayload, this.nodes, this.edges, executed);
        executionQueue.push(...errorItems);

        const errorEdges = getNextNodes(node.id, this.nodes, this.edges, 'error');
        if (!shouldContinueAfterError(node, errorEdges)) {
          break;
        }
      }
    }

    const duration = Date.now() - startTime;
    const status = errors.length === 0 ? 'success' : 'error';

    console.log(`Workflow execution completed: ${status} in ${duration}ms`);

    return results;
  }
}
