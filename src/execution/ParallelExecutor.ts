/**
 * Parallel Node Executor
 * Executes independent workflow nodes in parallel for maximum throughput
 * Implements n8n-like parallel execution with dependency tracking
 */

import { logger } from '../services/SimpleLogger';
import { getExecutionManager, ExecutionManager } from './ExecutionManager';

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  data: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface ExecutionResult {
  nodeId: string;
  status: 'success' | 'error' | 'skipped';
  output?: unknown;
  error?: Error;
  duration: number;
  startedAt: Date;
  finishedAt: Date;
}

export interface ParallelExecutionConfig {
  maxParallel?: number; // Max nodes to execute in parallel
  timeout?: number; // Per-node timeout in ms
  continueOnError?: boolean; // Continue if a node fails
  retryOnError?: number; // Number of retries on error
  retryDelay?: number; // Delay between retries in ms
  priorityNodes?: string[]; // Nodes to execute first
}

export interface ExecutionProgress {
  total: number;
  completed: number;
  running: number;
  pending: number;
  failed: number;
  skipped: number;
  percentage: number;
}

type NodeExecutorFn = (
  node: WorkflowNode,
  inputs: Map<string, unknown>,
  context: ExecutionContext
) => Promise<unknown>;

interface ExecutionContext {
  executionId: string;
  workflowId: string;
  variables: Map<string, unknown>;
  credentials: Map<string, unknown>;
  nodeOutputs: Map<string, unknown>;
  abortController: AbortController;
}

interface DependencyGraph {
  nodes: Map<string, WorkflowNode>;
  inDegree: Map<string, number>; // Number of incoming edges
  outEdges: Map<string, string[]>; // Outgoing edges for each node
  inEdges: Map<string, string[]>; // Incoming edges for each node
}

export class ParallelExecutor {
  private config: Required<ParallelExecutionConfig>;
  private executionManager: ExecutionManager;
  private nodeExecutor: NodeExecutorFn;
  private results: Map<string, ExecutionResult> = new Map();
  private runningNodes: Set<string> = new Set();
  private completedNodes: Set<string> = new Set();
  private failedNodes: Set<string> = new Set();
  private skippedNodes: Set<string> = new Set();
  private abortController: AbortController | null = null;
  private progressCallback: ((progress: ExecutionProgress) => void) | null = null;
  private nodeStartCallback: ((nodeId: string) => void) | null = null;
  private nodeCompleteCallback: ((nodeId: string, result: ExecutionResult) => void) | null = null;

  constructor(
    nodeExecutor: NodeExecutorFn,
    config: ParallelExecutionConfig = {}
  ) {
    this.nodeExecutor = nodeExecutor;
    this.executionManager = getExecutionManager();
    this.config = {
      maxParallel: config.maxParallel ?? 10,
      timeout: config.timeout ?? 30000, // 30 seconds default
      continueOnError: config.continueOnError ?? true,
      retryOnError: config.retryOnError ?? 0,
      retryDelay: config.retryDelay ?? 1000,
      priorityNodes: config.priorityNodes ?? []
    };

    logger.info('ParallelExecutor initialized', { config: this.config });
  }

  /**
   * Execute a workflow with parallel node execution
   */
  async execute(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    context: Omit<ExecutionContext, 'abortController'>
  ): Promise<Map<string, ExecutionResult>> {
    this.reset();
    this.abortController = new AbortController();

    const fullContext: ExecutionContext = {
      ...context,
      abortController: this.abortController
    };

    // Build dependency graph
    const graph = this.buildDependencyGraph(nodes, edges);

    // Find initial nodes (no dependencies)
    const readyNodes = this.findReadyNodes(graph);

    logger.info('Starting parallel execution', {
      totalNodes: nodes.length,
      initialReadyNodes: readyNodes.length
    });

    // Execute in waves
    await this.executeWaves(graph, readyNodes, fullContext);

    logger.info('Parallel execution completed', {
      completed: this.completedNodes.size,
      failed: this.failedNodes.size,
      skipped: this.skippedNodes.size
    });

    return this.results;
  }

  /**
   * Abort the current execution
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      logger.info('Parallel execution aborted');
    }
  }

  /**
   * Set progress callback
   */
  onProgress(callback: (progress: ExecutionProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Set node start callback
   */
  onNodeStart(callback: (nodeId: string) => void): void {
    this.nodeStartCallback = callback;
  }

  /**
   * Set node complete callback
   */
  onNodeComplete(callback: (nodeId: string, result: ExecutionResult) => void): void {
    this.nodeCompleteCallback = callback;
  }

  /**
   * Get current execution progress
   */
  getProgress(): ExecutionProgress {
    const total = this.results.size + this.runningNodes.size + this.getPendingCount();
    return {
      total,
      completed: this.completedNodes.size,
      running: this.runningNodes.size,
      pending: this.getPendingCount(),
      failed: this.failedNodes.size,
      skipped: this.skippedNodes.size,
      percentage: total > 0 ? Math.round((this.completedNodes.size / total) * 100) : 0
    };
  }

  /**
   * Get execution results
   */
  getResults(): Map<string, ExecutionResult> {
    return new Map(this.results);
  }

  // Private methods

  private reset(): void {
    this.results.clear();
    this.runningNodes.clear();
    this.completedNodes.clear();
    this.failedNodes.clear();
    this.skippedNodes.clear();
    this.abortController = null;
  }

  private buildDependencyGraph(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): DependencyGraph {
    const graph: DependencyGraph = {
      nodes: new Map(),
      inDegree: new Map(),
      outEdges: new Map(),
      inEdges: new Map()
    };

    // Initialize all nodes
    for (const node of nodes) {
      graph.nodes.set(node.id, node);
      graph.inDegree.set(node.id, 0);
      graph.outEdges.set(node.id, []);
      graph.inEdges.set(node.id, []);
    }

    // Process edges
    for (const edge of edges) {
      // Increment in-degree of target
      const currentInDegree = graph.inDegree.get(edge.target) || 0;
      graph.inDegree.set(edge.target, currentInDegree + 1);

      // Add to outEdges of source
      const sourceOutEdges = graph.outEdges.get(edge.source) || [];
      sourceOutEdges.push(edge.target);
      graph.outEdges.set(edge.source, sourceOutEdges);

      // Add to inEdges of target
      const targetInEdges = graph.inEdges.get(edge.target) || [];
      targetInEdges.push(edge.source);
      graph.inEdges.set(edge.target, targetInEdges);
    }

    return graph;
  }

  private findReadyNodes(graph: DependencyGraph): string[] {
    const ready: string[] = [];

    for (const [nodeId, inDegree] of graph.inDegree.entries()) {
      if (
        inDegree === 0 &&
        !this.completedNodes.has(nodeId) &&
        !this.runningNodes.has(nodeId) &&
        !this.failedNodes.has(nodeId) &&
        !this.skippedNodes.has(nodeId)
      ) {
        ready.push(nodeId);
      }
    }

    // Sort by priority
    return this.sortByPriority(ready);
  }

  private sortByPriority(nodeIds: string[]): string[] {
    const prioritySet = new Set(this.config.priorityNodes);

    return nodeIds.sort((a, b) => {
      const aPriority = prioritySet.has(a) ? 0 : 1;
      const bPriority = prioritySet.has(b) ? 0 : 1;
      return aPriority - bPriority;
    });
  }

  private async executeWaves(
    graph: DependencyGraph,
    initialReady: string[],
    context: ExecutionContext
  ): Promise<void> {
    const pendingNodes = new Set(initialReady);

    while (pendingNodes.size > 0 || this.runningNodes.size > 0) {
      // Check for abort
      if (context.abortController.signal.aborted) {
        // Mark all pending as skipped
        for (const nodeId of pendingNodes) {
          this.skipNode(nodeId, 'Execution aborted');
        }
        break;
      }

      // Start as many nodes as we can
      while (
        pendingNodes.size > 0 &&
        this.runningNodes.size < this.config.maxParallel
      ) {
        const nodeId = pendingNodes.values().next().value;
        if (nodeId) {
          pendingNodes.delete(nodeId);

          // Check if all dependencies are completed
          const dependencies = graph.inEdges.get(nodeId) || [];
          const allDepsCompleted = dependencies.every(
            dep => this.completedNodes.has(dep)
          );
          const anyDepFailed = dependencies.some(
            dep => this.failedNodes.has(dep) || this.skippedNodes.has(dep)
          );

          if (anyDepFailed && !this.config.continueOnError) {
            this.skipNode(nodeId, 'Dependency failed');
            this.updateReadyNodes(graph, nodeId, pendingNodes);
            continue;
          }

          if (allDepsCompleted || dependencies.length === 0) {
            this.executeNode(graph.nodes.get(nodeId)!, graph, context)
              .then(() => {
                this.updateReadyNodes(graph, nodeId, pendingNodes);
              })
              .catch(error => {
                logger.error(`Node ${nodeId} execution failed:`, error);
                this.updateReadyNodes(graph, nodeId, pendingNodes);
              });
          }
        }
      }

      // Wait a bit before checking again
      if (this.runningNodes.size > 0) {
        await this.sleep(10);
      }
    }
  }

  private updateReadyNodes(
    graph: DependencyGraph,
    completedNodeId: string,
    pendingNodes: Set<string>
  ): void {
    // Check downstream nodes
    const downstream = graph.outEdges.get(completedNodeId) || [];

    for (const targetId of downstream) {
      // Decrement in-degree
      const currentInDegree = graph.inDegree.get(targetId) || 0;
      graph.inDegree.set(targetId, currentInDegree - 1);

      // Check if node is now ready
      if (
        graph.inDegree.get(targetId) === 0 &&
        !this.completedNodes.has(targetId) &&
        !this.runningNodes.has(targetId) &&
        !this.failedNodes.has(targetId) &&
        !this.skippedNodes.has(targetId)
      ) {
        pendingNodes.add(targetId);
      }
    }

    this.emitProgress();
  }

  private async executeNode(
    node: WorkflowNode,
    graph: DependencyGraph,
    context: ExecutionContext
  ): Promise<void> {
    const startedAt = new Date();
    this.runningNodes.add(node.id);

    if (this.nodeStartCallback) {
      this.nodeStartCallback(node.id);
    }

    this.emitProgress();

    let lastError: Error | undefined;
    let attempt = 0;
    const maxAttempts = this.config.retryOnError + 1;

    while (attempt < maxAttempts) {
      attempt++;

      try {
        // Gather inputs from dependencies
        const inputs = this.gatherInputs(node.id, graph, context);

        // Execute with timeout
        const output = await this.executeWithTimeout(
          () => this.nodeExecutor(node, inputs, context),
          this.config.timeout
        );

        // Store result
        const finishedAt = new Date();
        const result: ExecutionResult = {
          nodeId: node.id,
          status: 'success',
          output,
          duration: finishedAt.getTime() - startedAt.getTime(),
          startedAt,
          finishedAt
        };

        this.results.set(node.id, result);
        this.runningNodes.delete(node.id);
        this.completedNodes.add(node.id);

        // Store output for downstream nodes
        context.nodeOutputs.set(node.id, output);

        if (this.nodeCompleteCallback) {
          this.nodeCompleteCallback(node.id, result);
        }

        logger.debug(`Node ${node.id} completed successfully`, {
          duration: result.duration,
          attempt
        });

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxAttempts) {
          logger.warn(`Node ${node.id} failed, retrying (${attempt}/${maxAttempts})`, {
            error: lastError.message
          });
          await this.sleep(this.config.retryDelay);
        }
      }
    }

    // All retries failed
    const finishedAt = new Date();
    const result: ExecutionResult = {
      nodeId: node.id,
      status: 'error',
      error: lastError,
      duration: finishedAt.getTime() - startedAt.getTime(),
      startedAt,
      finishedAt
    };

    this.results.set(node.id, result);
    this.runningNodes.delete(node.id);
    this.failedNodes.add(node.id);

    if (this.nodeCompleteCallback) {
      this.nodeCompleteCallback(node.id, result);
    }

    logger.error(`Node ${node.id} failed after ${maxAttempts} attempts`, {
      error: lastError?.message
    });
  }

  private gatherInputs(
    nodeId: string,
    graph: DependencyGraph,
    context: ExecutionContext
  ): Map<string, unknown> {
    const inputs = new Map<string, unknown>();
    const dependencies = graph.inEdges.get(nodeId) || [];

    for (const depId of dependencies) {
      const output = context.nodeOutputs.get(depId);
      if (output !== undefined) {
        inputs.set(depId, output);
      }
    }

    return inputs;
  }

  private skipNode(nodeId: string, reason: string): void {
    const result: ExecutionResult = {
      nodeId,
      status: 'skipped',
      error: new Error(reason),
      duration: 0,
      startedAt: new Date(),
      finishedAt: new Date()
    };

    this.results.set(nodeId, result);
    this.skippedNodes.add(nodeId);

    if (this.nodeCompleteCallback) {
      this.nodeCompleteCallback(nodeId, result);
    }

    logger.debug(`Node ${nodeId} skipped: ${reason}`);
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Execution timed out after ${timeout}ms`));
        }, timeout);
      })
    ]);
  }

  private emitProgress(): void {
    if (this.progressCallback) {
      this.progressCallback(this.getProgress());
    }
  }

  private getPendingCount(): number {
    // This is an approximation - would need to track pending explicitly
    return 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a parallel executor instance
 */
export function createParallelExecutor(
  nodeExecutor: NodeExecutorFn,
  config?: ParallelExecutionConfig
): ParallelExecutor {
  return new ParallelExecutor(nodeExecutor, config);
}

/**
 * Utility to find parallel groups in a workflow
 * Returns groups of node IDs that can be executed in parallel
 */
export function findParallelGroups(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string[][] {
  const groups: string[][] = [];
  const visited = new Set<string>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Build in-degree map
  const inDegree = new Map<string, number>();
  const outEdges = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    outEdges.set(node.id, []);
  }

  for (const edge of edges) {
    const current = inDegree.get(edge.target) || 0;
    inDegree.set(edge.target, current + 1);

    const outs = outEdges.get(edge.source) || [];
    outs.push(edge.target);
    outEdges.set(edge.source, outs);
  }

  // Find groups using topological sort levels
  while (visited.size < nodes.length) {
    const group: string[] = [];

    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0 && !visited.has(nodeId)) {
        group.push(nodeId);
      }
    }

    if (group.length === 0) {
      // Cycle detected or all nodes visited
      break;
    }

    groups.push(group);

    // Mark as visited and update in-degrees
    for (const nodeId of group) {
      visited.add(nodeId);
      const downstream = outEdges.get(nodeId) || [];
      for (const targetId of downstream) {
        const current = inDegree.get(targetId) || 0;
        inDegree.set(targetId, current - 1);
      }
    }
  }

  return groups;
}

/**
 * Calculate maximum parallel width of a workflow
 */
export function calculateMaxParallelism(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): number {
  const groups = findParallelGroups(nodes, edges);
  return Math.max(...groups.map(g => g.length), 1);
}

export default ParallelExecutor;
