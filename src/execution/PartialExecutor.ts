/**
 * Partial Execution Engine
 * Allows executing workflow from any specific node with injected test data
 */

import { logger } from '../services/SimpleLogger';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { SafeExecutionResult, SafeObject } from '../utils/TypeSafetyUtils';

export interface PartialExecutionOptions {
  startNodeId: string;
  testData?: SafeObject;
  stopAtNodeId?: string;
  skipPinnedNodes?: boolean;
  validateBeforeExecution?: boolean;
  maxExecutionTime?: number;
}

export interface PartialExecutionResult {
  success: boolean;
  status: 'success' | 'error' | 'partial' | 'stopped';
  results: Map<string, SafeExecutionResult>;
  errors: Array<{ nodeId: string; error: string; timestamp: string }>;
  nodesExecuted: number;
  executionTimeMs: number;
  executionPath: string[];
}

export interface ExecutionSubgraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  startNode: WorkflowNode;
  reachableNodes: Set<string>;
  isolatedNodes: string[];
}

/**
 * Partial Executor - Execute workflow from specific node
 */
export class PartialExecutor {
  private executionState = {
    isRunning: false,
    startTime: 0,
    results: new Map<string, SafeExecutionResult>(),
    executionPath: [] as string[]
  };

  constructor(
    private nodes: WorkflowNode[],
    private edges: WorkflowEdge[]
  ) {}

  /**
   * Execute workflow from a specific node
   */
  async executeFromNode(
    options: PartialExecutionOptions,
    onNodeStart?: (nodeId: string) => void,
    onNodeComplete?: (nodeId: string, result: SafeExecutionResult) => void,
    onNodeError?: (nodeId: string, error: Error) => void
  ): Promise<PartialExecutionResult> {

    if (this.executionState.isRunning) {
      throw new Error('Partial execution already in progress');
    }

    this.executionState.isRunning = true;
    this.executionState.startTime = Date.now();
    this.executionState.results.clear();
    this.executionState.executionPath = [];

    logger.info(`🎯 Starting partial execution from node: ${options.startNodeId}`);

    try {
      // Validate start node exists
      const startNode = this.nodes.find(n => n.id === options.startNodeId);
      if (!startNode) {
        throw new Error(`Start node not found: ${options.startNodeId}`);
      }

      // Build execution subgraph
      const subgraph = this.buildExecutionSubgraph(options.startNodeId);

      if (subgraph.nodes.length === 0) {
        throw new Error('No nodes to execute in subgraph');
      }

      logger.info(`📊 Execution subgraph: ${subgraph.nodes.length} nodes, ${subgraph.edges.length} edges`);

      // Validate if required
      if (options.validateBeforeExecution !== false) {
        const validation = this.validateSubgraph(subgraph, options.testData);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Execute nodes in subgraph
      const result = await this.executeSubgraph(
        subgraph,
        options,
        onNodeStart,
        onNodeComplete,
        onNodeError
      );

      logger.info(`✅ Partial execution completed: ${result.nodesExecuted} nodes executed`);

      return result;

    } catch (error) {
      logger.error('Partial execution failed:', error);

      return {
        success: false,
        status: 'error',
        results: this.executionState.results,
        errors: [{
          nodeId: options.startNodeId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }],
        nodesExecuted: this.executionState.results.size,
        executionTimeMs: Date.now() - this.executionState.startTime,
        executionPath: this.executionState.executionPath
      };

    } finally {
      this.executionState.isRunning = false;
    }
  }

  /**
   * Build execution subgraph from start node onwards
   */
  buildExecutionSubgraph(startNodeId: string): ExecutionSubgraph {
    const startNode = this.nodes.find(n => n.id === startNodeId);
    if (!startNode) {
      throw new Error(`Start node not found: ${startNodeId}`);
    }

    const reachableNodes = new Set<string>();
    const subgraphEdges: WorkflowEdge[] = [];
    const queue: string[] = [startNodeId];
    const visited = new Set<string>();

    // BFS to find all reachable nodes
    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;

      if (visited.has(currentNodeId)) {
        continue;
      }

      visited.add(currentNodeId);
      reachableNodes.add(currentNodeId);

      // Find all outgoing edges
      const outgoingEdges = this.edges.filter(e => e.source === currentNodeId);

      for (const edge of outgoingEdges) {
        subgraphEdges.push(edge);
        if (!visited.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    const subgraphNodes = this.nodes.filter(n => reachableNodes.has(n.id));
    const isolatedNodes = this.nodes
      .filter(n => !reachableNodes.has(n.id))
      .map(n => n.id);

    return {
      nodes: subgraphNodes,
      edges: subgraphEdges,
      startNode,
      reachableNodes,
      isolatedNodes
    };
  }

  /**
   * Validate execution subgraph
   */
  validateSubgraph(
    subgraph: ExecutionSubgraph,
    testData?: SafeObject
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if subgraph has nodes
    if (subgraph.nodes.length === 0) {
      errors.push('Subgraph contains no nodes');
      return { isValid: false, errors, warnings };
    }

    // Check for cycles in subgraph
    const hasCycles = this.detectCycles(subgraph);
    if (hasCycles) {
      warnings.push('Subgraph contains cycles - may cause infinite execution');
    }

    // Validate test data if start node expects input
    const startNode = subgraph.startNode;
    if (startNode.data.inputs > 0 && !testData) {
      warnings.push('Start node expects input but no test data provided');
    }

    // Check for disconnected nodes in subgraph
    const disconnectedNodes = subgraph.nodes.filter(node => {
      const hasIncoming = subgraph.edges.some(e => e.target === node.id);
      const hasOutgoing = subgraph.edges.some(e => e.source === node.id);
      return !hasIncoming && !hasOutgoing && node.id !== startNode.id;
    });

    if (disconnectedNodes.length > 0) {
      warnings.push(`Found ${disconnectedNodes.length} disconnected nodes in subgraph`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Execute the subgraph
   */
  private async executeSubgraph(
    subgraph: ExecutionSubgraph,
    options: PartialExecutionOptions,
    onNodeStart?: (nodeId: string) => void,
    onNodeComplete?: (nodeId: string, result: SafeExecutionResult) => void,
    onNodeError?: (nodeId: string, error: Error) => void
  ): Promise<PartialExecutionResult> {

    const errors: Array<{ nodeId: string; error: string; timestamp: string }> = [];
    const executedNodes = new Set<string>();
    const queue: Array<{ nodeId: string; inputData: SafeObject }> = [];

    // Start with the start node and test data
    queue.push({
      nodeId: options.startNodeId,
      inputData: options.testData || {}
    });

    while (queue.length > 0) {
      const { nodeId, inputData } = queue.shift()!;

      // Check if we should stop
      if (options.stopAtNodeId && nodeId === options.stopAtNodeId) {
        logger.info(`⏹️ Stopping execution at node: ${nodeId}`);
        break;
      }

      // Check timeout
      if (options.maxExecutionTime) {
        const elapsed = Date.now() - this.executionState.startTime;
        if (elapsed > options.maxExecutionTime) {
          errors.push({
            nodeId,
            error: 'Execution timeout exceeded',
            timestamp: new Date().toISOString()
          });
          break;
        }
      }

      // Skip if already executed
      if (executedNodes.has(nodeId)) {
        continue;
      }

      const node = subgraph.nodes.find(n => n.id === nodeId);
      if (!node) {
        continue;
      }

      try {
        // Notify start
        this.executionState.executionPath.push(nodeId);
        onNodeStart?.(nodeId);

        // Execute node
        const result = await this.executeNode(node, inputData, options);

        // Store result
        this.executionState.results.set(nodeId, result);
        executedNodes.add(nodeId);

        // Notify completion
        onNodeComplete?.(nodeId, result);

        // Queue downstream nodes
        const downstreamEdges = subgraph.edges.filter(e => e.source === nodeId);
        for (const edge of downstreamEdges) {
          queue.push({
            nodeId: edge.target,
            inputData: result.data || {}
          });
        }

      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));

        logger.error(`Node execution failed: ${nodeId}`, errorObj);

        errors.push({
          nodeId,
          error: errorObj.message,
          timestamp: new Date().toISOString()
        });

        // Store error result
        this.executionState.results.set(nodeId, {
          success: false,
          status: 'error',
          error: errorObj.message,
          data: {},
          nodeId,
          timestamp: Date.now()
        });

        onNodeError?.(nodeId, errorObj);

        // Check if we should continue on error
        // For partial execution, we typically stop on error
        break;
      }
    }

    const executionTimeMs = Date.now() - this.executionState.startTime;
    const success = errors.length === 0 && executedNodes.size > 0;

    return {
      success,
      status: errors.length > 0 ? 'error' : executedNodes.size > 0 ? 'success' : 'partial',
      results: this.executionState.results,
      errors,
      nodesExecuted: executedNodes.size,
      executionTimeMs,
      executionPath: this.executionState.executionPath
    };
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    node: WorkflowNode,
    inputData: SafeObject,
    options: PartialExecutionOptions
  ): Promise<SafeExecutionResult> {

    const startTime = Date.now();

    logger.debug(`Executing node: ${node.id} (${node.data.type})`);

    // Simulate node execution based on type
    // In real implementation, this would call actual node executors
    await new Promise(resolve => setTimeout(resolve, 100));

    const result: SafeExecutionResult = {
      success: true,
      status: 'success',
      data: {
        ...inputData,
        nodeId: node.id,
        nodeType: node.data.type,
        executedAt: new Date().toISOString(),
        partialExecution: true
      },
      nodeId: node.id,
      timestamp: Date.now(),
      duration: Date.now() - startTime
    };

    return result;
  }

  /**
   * Detect cycles in subgraph
   */
  private detectCycles(subgraph: ExecutionSubgraph): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = subgraph.edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (hasCycle(edge.target)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of subgraph.nodes) {
      if (hasCycle(node.id)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get execution metrics
   */
  getExecutionMetrics() {
    return {
      isRunning: this.executionState.isRunning,
      nodesExecuted: this.executionState.results.size,
      executionPath: this.executionState.executionPath,
      duration: this.executionState.isRunning
        ? Date.now() - this.executionState.startTime
        : 0
    };
  }

  /**
   * Stop execution
   */
  stop(): void {
    if (this.executionState.isRunning) {
      logger.info('Stopping partial execution');
      this.executionState.isRunning = false;
    }
  }

  /**
   * Check if execution is running
   */
  isRunning(): boolean {
    return this.executionState.isRunning;
  }
}

/**
 * Factory function to create partial executor
 */
export const createPartialExecutor = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): PartialExecutor => {
  return new PartialExecutor(nodes, edges);
};
