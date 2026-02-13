/**
 * Workflow State Manager
 * Centralized workflow state operations to reduce duplication in stores
 */

import { logger } from '../services/SimpleLogger';

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: unknown;
  selected?: boolean;
  dragging?: boolean;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: unknown;
  selected?: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  category?: string;
  isPublic?: boolean;
  version?: string;
}

export interface ExecutionResult {
  nodeId: string;
  status: 'success' | 'error' | 'running' | 'pending';
  output?: unknown;
  error?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  variables: Record<string, unknown>;
  results: Record<string, ExecutionResult>;
  currentNodeId?: string;
  startTime: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
}

export class WorkflowStateManager {
  private static readonly MAX_EXECUTION_HISTORY = 100;
  private static readonly MAX_UNDO_STACK = 50;

  /**
   * Create a new workflow with default structure
   */
  static createWorkflow(
    name: string,
    options: {
      description?: string;
      category?: string;
      tags?: string[];
      template?: Partial<Workflow>;
    } = {}
  ): Workflow {
    const now = Date.now();

    return {
      id: this.generateId('workflow'),
      name,
      description: options.description || '',
      nodes: options.template?.nodes || [],
      edges: options.template?.edges || [],
      variables: options.template?.variables || {},
      settings: options.template?.settings || this.getDefaultSettings(),
      createdAt: now,
      updatedAt: now,
      tags: options.tags || [],
      category: options.category || 'General',
      isPublic: false,
      version: '1.0.0',
      ...options.template
    };
  }

  /**
   * Clone an existing workflow
   */
  static cloneWorkflow(workflow: Workflow, newName?: string): Workflow {
    const oldToNewNodeMap = new Map<string, string>();

    // Pre-generate new IDs for all nodes
    workflow.nodes.forEach((originalNode) => {
      oldToNewNodeMap.set(originalNode.id, this.generateId('node'));
    });

    const cloned: Workflow = {
      ...workflow,
      id: this.generateId('workflow'),
      name: newName || `${workflow.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: workflow.nodes.map(node => ({
        ...node,
        id: oldToNewNodeMap.get(node.id) || this.generateId('node'),
        selected: false
      })),
      edges: workflow.edges.map(edge => {
        return {
          ...edge,
          id: this.generateId('edge'),
          source: oldToNewNodeMap.get(edge.source) || edge.source,
          target: oldToNewNodeMap.get(edge.target) || edge.target,
          selected: false
        };
      })
    };

    logger.info('Workflow cloned', {
      originalId: workflow.id,
      clonedId: cloned.id,
      nodeCount: cloned.nodes.length,
      edgeCount: cloned.edges.length
    });

    return cloned;
  }

  /**
   * Validate workflow structure
   */
  static validateWorkflow(workflow: Workflow): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!workflow.id) errors.push('Workflow must have an ID');
    if (!workflow.name?.trim()) errors.push('Workflow must have a name');
    if (!Array.isArray(workflow.nodes)) errors.push('Workflow must have nodes array');
    if (!Array.isArray(workflow.edges)) errors.push('Workflow must have edges array');

    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();

    // Node validation
    for (const node of workflow.nodes || []) {
      if (!node.id) {
        errors.push('All nodes must have an ID');
        continue;
      }
      
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);

      if (!node.type) {
        errors.push(`Node ${node.id} must have a type`);
      }

      if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
        errors.push(`Node ${node.id} must have valid position`);
      }
    }

    // Edge validation
    for (const edge of workflow.edges || []) {
      if (!edge.id) {
        errors.push('All edges must have an ID');
        continue;
      }

      if (edgeIds.has(edge.id)) {
        errors.push(`Duplicate edge ID: ${edge.id}`);
      }
      edgeIds.add(edge.id);

      if (!edge.source) {
        errors.push(`Edge ${edge.id} must have a source`);
      } else if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`);
      }

      if (!edge.target) {
        errors.push(`Edge ${edge.id} must have a target`);
      } else if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`);
      }

      // Check for self-loops
      if (edge.source === edge.target) {
        warnings.push(`Edge ${edge.id} creates a self-loop on node ${edge.source}`);
      }
    }

    // Check for circular dependencies
    const cycles = this.detectCircularDependencies(workflow.nodes, workflow.edges);
    if (cycles.length > 0) {
      warnings.push(`Circular dependencies detected: ${cycles.join(', ')}`);
    }

    // Check for unreachable nodes
    const unreachableNodes = this.findUnreachableNodes(workflow.nodes, workflow.edges);
    if (unreachableNodes.length > 0) {
      warnings.push(`Unreachable nodes: ${unreachableNodes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Detect circular dependencies in workflow
   */
  static detectCircularDependencies(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const cycles: string[] = [];
    const graph = new Map<string, string[]>();

    // Build adjacency list
    for (const node of nodes) {
      graph.set(node.id, []);
    }

    for (const edge of edges) {
      const targets = graph.get(edge.source) || [];
      targets.push(edge.target);
      graph.set(edge.source, targets);
    }

    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): boolean => {
      const cyclePath = [...path, nodeId];

      if (recursionStack.has(nodeId)) {
        cycles.push(cyclePath.join(' → '));
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (dfs(neighbor, [...path, nodeId])) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    }

    return cycles;
  }

  /**
   * Find nodes that cannot be reached from unknown start node
   */
  static findUnreachableNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    if (nodes.length === 0) return [];

    const graph = new Map<string, string[]>();
    const hasIncomingEdge = new Set<string>();

    // Build adjacency list and track nodes with incoming edges
    for (const node of nodes) {
      graph.set(node.id, []);
    }

    for (const edge of edges) {
      const targets = graph.get(edge.source) || [];
      targets.push(edge.target);
      graph.set(edge.source, targets);
      hasIncomingEdge.add(edge.target);
    }

    // Find start nodes (nodes with no incoming edges)
    const startNodes = nodes
      .filter(node => !hasIncomingEdge.has(node.id))
      .map(node => node.id);

    if (startNodes.length === 0) {
      // If no start nodes, consider all nodes as potentially reachable
      return [];
    }

    // BFS from all start nodes to find reachable nodes
    const queue: string[] = [...startNodes];
    const reachable = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;

      reachable.add(current);

      const neighbors = graph.get(current) || [];
      for (const neighbor of neighbors) {
        if (!reachable.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    // Return nodes that are not reachable
    return nodes
      .filter(node => !reachable.has(node.id))
      .map(node => node.id);
  }

  /**
   * Create execution context for workflow
   */
  static createExecutionContext(
    workflow: Workflow,
    variables: Record<string, unknown> = {}
  ): ExecutionContext {
    return {
      workflowId: workflow.id,
      executionId: this.generateId('execution'),
      variables: { ...workflow.variables, ...variables },
      results: {},
      startTime: Date.now(),
      status: 'running'
    };
  }

  /**
   * Update execution result for a node
   */
  static updateExecutionResult(
    context: ExecutionContext,
    nodeId: string,
    result: Partial<ExecutionResult>
  ): ExecutionContext {
    const existingResult = context.results[nodeId];
    const updatedResult: ExecutionResult = {
      nodeId,
      status: 'pending',
      ...existingResult,
      ...result
    };

    // Calculate duration if both start and end times are available
    if (updatedResult.startTime && updatedResult.endTime) {
      updatedResult.duration = updatedResult.endTime - updatedResult.startTime;
    }

    return {
      ...context,
      results: {
        ...context.results,
        [nodeId]: updatedResult
      },
      currentNodeId: result.status === 'running' ? nodeId : context.currentNodeId
    };
  }

  /**
   * Get workflow execution statistics
   */
  static getExecutionStats(context: ExecutionContext): {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    runningNodes: number;
    pendingNodes: number;
    averageDuration: number;
    totalDuration: number;
  } {
    const results = Object.values(context.results);
    const totalNodes = results.length;
    let completedNodes = 0;
    let failedNodes = 0;
    let runningNodes = 0;
    let pendingNodes = 0;
    let totalDuration = 0;
    let durationCount = 0;

    for (const result of results) {
      switch (result.status) {
        case 'success':
          completedNodes++;
          break;
        case 'error':
          failedNodes++;
          break;
        case 'running':
          runningNodes++;
          break;
        case 'pending':
          pendingNodes++;
          break;
      }

      if (result.duration) {
        totalDuration += result.duration;
        durationCount++;
      }
    }

    return {
      totalNodes,
      completedNodes,
      failedNodes,
      runningNodes,
      pendingNodes,
      averageDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      totalDuration
    };
  }

  /**
   * Generate unique IDs
   */
  static generateId(prefix: string = 'item'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default workflow settings
   */
  static getDefaultSettings(): Record<string, unknown> {
    return {
      autoSave: true,
      autoSaveInterval: 30000, // 30 seconds
      maxExecutionTime: 300000, // 5 minutes
      enableDebugMode: false,
      enableStepByStep: false,
      retryFailedNodes: false,
      maxRetries: 3,
      parallel: false,
      pauseOnError: true,
      saveExecutionHistory: true,
      maxHistoryEntries: 100
    };
  }

  /**
   * Merge workflow states (useful for conflict resolution)
   */
  static mergeWorkflows(
    base: Workflow,
    incoming: Workflow,
    strategy: 'latest' | 'manual' | 'smart' = 'smart'
  ): Workflow {
    switch (strategy) {
      case 'latest':
        return base.updatedAt > incoming.updatedAt ? base : incoming;
        
      case 'manual':
        // Return both for manual resolution
        throw new Error('Manual merge required');
        
      case 'smart':
      default: {
        // Smart merge: combine changes intelligently
        const merged: Workflow = {
          ...base,
          updatedAt: Math.max(base.updatedAt, incoming.updatedAt),
          nodes: this.mergeNodes(base.nodes, incoming.nodes),
          edges: this.mergeEdges(base.edges, incoming.edges),
          variables: { ...base.variables, ...incoming.variables },
          settings: { ...base.settings, ...incoming.settings }
        };

        logger.info('Workflows merged using smart strategy', {
          baseId: base.id,
          incomingId: incoming.id,
          resultNodeCount: merged.nodes.length,
          resultEdgeCount: merged.edges.length
        });

        return merged;
      }
    }
  }

  // Private helper methods
  private static mergeNodes(baseNodes: WorkflowNode[], incomingNodes: WorkflowNode[]): WorkflowNode[] {
    const nodeMap = new Map<string, WorkflowNode>();

    // Add base nodes
    for (const node of baseNodes) {
      nodeMap.set(node.id, node);
    }

    // Merge or add incoming nodes
    for (const node of incomingNodes) {
      const existing = nodeMap.get(node.id);
      if (existing) {
        // Merge node data
        const existingData = existing.data as Record<string, unknown> | undefined;
        const nodeData = node.data as Record<string, unknown> | undefined;
        nodeMap.set(node.id, {
          ...existing,
          ...node,
          data: { ...(existingData || {}), ...(nodeData || {}) }
        });
      } else {
        nodeMap.set(node.id, node);
      }
    }
    
    return Array.from(nodeMap.values());
  }

  private static mergeEdges(baseEdges: WorkflowEdge[], incomingEdges: WorkflowEdge[]): WorkflowEdge[] {
    const edgeMap = new Map<string, WorkflowEdge>();

    // Add base edges
    for (const edge of baseEdges) {
      edgeMap.set(edge.id, edge);
    }

    // Merge or add incoming edges
    for (const edge of incomingEdges) {
      edgeMap.set(edge.id, edge);
    }

    return Array.from(edgeMap.values());
  }
}