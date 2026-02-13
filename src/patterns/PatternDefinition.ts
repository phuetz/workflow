/**
 * Pattern Definition Schema and Utilities
 * Provides schema validation and helper functions for pattern definitions
 */

import type {
  PatternDefinition,
  PatternStructure,
  PatternConstraint,
  PatternCategory,
  PatternComplexity,
  EdgePattern,
  TopologyType,
} from '../types/patterns';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';

/**
 * Creates a pattern definition with validation
 */
export function createPatternDefinition(
  params: Omit<PatternDefinition, 'version'>
): PatternDefinition {
  validatePatternDefinition(params);

  return {
    ...params,
    version: '1.0.0',
  };
}

/**
 * Validates a pattern definition
 */
function validatePatternDefinition(pattern: Omit<PatternDefinition, 'version'>): void {
  if (!pattern.id || !pattern.name) {
    throw new Error('Pattern must have id and name');
  }

  if (!pattern.category) {
    throw new Error('Pattern must have a category');
  }

  if (!pattern.structure) {
    throw new Error('Pattern must have a structure definition');
  }

  if (pattern.structure.minNodes < 1) {
    throw new Error('Pattern must have at least 1 node');
  }

  if (pattern.structure.maxNodes && pattern.structure.maxNodes < pattern.structure.minNodes) {
    throw new Error('maxNodes must be greater than or equal to minNodes');
  }
}

/**
 * Creates a pattern structure definition
 */
export function createPatternStructure(params: {
  minNodes: number;
  maxNodes?: number;
  requiredNodeTypes: string[];
  optionalNodeTypes?: string[];
  requiredEdges: EdgePattern[];
  topology: TopologyType;
  constraints?: PatternConstraint[];
}): PatternStructure {
  return {
    minNodes: params.minNodes,
    maxNodes: params.maxNodes,
    requiredNodeTypes: params.requiredNodeTypes,
    optionalNodeTypes: params.optionalNodeTypes || [],
    requiredEdges: params.requiredEdges,
    topology: params.topology,
    constraints: params.constraints || [],
  };
}

/**
 * Creates an edge pattern
 */
export function createEdgePattern(
  from: string,
  to: string,
  type?: 'sequential' | 'conditional' | 'parallel' | 'error',
  required = true
): EdgePattern {
  return { from, to, type, required };
}

/**
 * Common constraint factories
 */
export const PatternConstraints = {
  /**
   * Node count constraint
   */
  nodeCount(min: number, max?: number): PatternConstraint {
    return {
      type: 'node-count',
      description: `Must have ${min}${max ? `-${max}` : '+'} nodes`,
      validate: (nodes) => {
        const count = nodes.length;
        return count >= min && (max === undefined || count <= max);
      },
    };
  },

  /**
   * Edge count constraint
   */
  edgeCount(min: number, max?: number): PatternConstraint {
    return {
      type: 'edge-count',
      description: `Must have ${min}${max ? `-${max}` : '+'} edges`,
      validate: (_, edges) => {
        const count = edges.length;
        return count >= min && (max === undefined || count <= max);
      },
    };
  },

  /**
   * Max depth constraint
   */
  maxDepth(depth: number): PatternConstraint {
    return {
      type: 'depth',
      description: `Maximum depth of ${depth}`,
      validate: (nodes, edges) => {
        const maxDepth = calculateMaxDepth(nodes, edges);
        return maxDepth <= depth;
      },
    };
  },

  /**
   * Max breadth constraint
   */
  maxBreadth(breadth: number): PatternConstraint {
    return {
      type: 'breadth',
      description: `Maximum breadth of ${breadth}`,
      validate: (nodes, edges) => {
        const maxBreadth = calculateMaxBreadth(nodes, edges);
        return maxBreadth <= breadth;
      },
    };
  },

  /**
   * Required node type constraint
   */
  requiresNodeType(nodeType: string): PatternConstraint {
    return {
      type: 'config',
      description: `Must contain at least one ${nodeType} node`,
      validate: (nodes) => {
        return nodes.some((node) => node.type === nodeType);
      },
    };
  },

  /**
   * No cycles constraint
   */
  noCycles(): PatternConstraint {
    return {
      type: 'custom',
      description: 'Must not contain cycles',
      validate: (nodes, edges) => {
        return !hasCycles(nodes, edges);
      },
    };
  },

  /**
   * Error handling constraint
   */
  hasErrorHandling(): PatternConstraint {
    return {
      type: 'config',
      description: 'Must have error handling',
      validate: (nodes, edges) => {
        return edges.some((edge) => edge.data?.condition?.includes('error'));
      },
    };
  },
};

/**
 * Calculate maximum depth of workflow graph
 */
function calculateMaxDepth(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
  const adjList = buildAdjacencyList(nodes, edges);
  const startNodes = findStartNodes(nodes, edges);

  let maxDepth = 0;

  function dfs(nodeId: string, depth: number, visited: Set<string>): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    maxDepth = Math.max(maxDepth, depth);

    const neighbors = adjList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      dfs(neighbor, depth + 1, visited);
    }
  }

  for (const startNode of startNodes) {
    dfs(startNode, 1, new Set());
  }

  return maxDepth;
}

/**
 * Calculate maximum breadth of workflow graph
 */
function calculateMaxBreadth(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
  const adjList = buildAdjacencyList(nodes, edges);
  const startNodes = findStartNodes(nodes, edges);

  const levels = new Map<number, Set<string>>();

  function bfs(startNode: string): void {
    const queue: [string, number][] = [[startNode, 0]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [nodeId, level] = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      if (!levels.has(level)) {
        levels.set(level, new Set());
      }
      levels.get(level)!.add(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push([neighbor, level + 1]);
        }
      }
    }
  }

  for (const startNode of startNodes) {
    bfs(startNode);
  }

  let maxBreadth = 0;
  for (const nodeSet of levels.values()) {
    maxBreadth = Math.max(maxBreadth, nodeSet.size);
  }

  return maxBreadth;
}

/**
 * Check if graph has cycles
 */
function hasCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
  const adjList = buildAdjacencyList(nodes, edges);
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (!visited.has(nodeId)) {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (dfs(node.id)) return true;
  }

  return false;
}

/**
 * Build adjacency list from nodes and edges
 */
function buildAdjacencyList(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Map<string, string[]> {
  const adjList = new Map<string, string[]>();

  // Initialize with all nodes
  for (const node of nodes) {
    adjList.set(node.id, []);
  }

  // Add edges
  for (const edge of edges) {
    const neighbors = adjList.get(edge.source) || [];
    neighbors.push(edge.target);
    adjList.set(edge.source, neighbors);
  }

  return adjList;
}

/**
 * Find start nodes (nodes with no incoming edges)
 */
function findStartNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  const nodesWithIncoming = new Set(edges.map((e) => e.target));
  return nodes.filter((node) => !nodesWithIncoming.has(node.id)).map((n) => n.id);
}

/**
 * Pattern category descriptions
 */
export const PATTERN_CATEGORIES: Record<
  PatternCategory,
  { label: string; description: string; icon: string }
> = {
  messaging: {
    label: 'Messaging Patterns',
    description: 'Communication and message passing patterns',
    icon: '💬',
  },
  integration: {
    label: 'Integration Patterns',
    description: 'System integration and API patterns',
    icon: '🔗',
  },
  reliability: {
    label: 'Reliability Patterns',
    description: 'Error handling and resilience patterns',
    icon: '🛡️',
  },
  data: {
    label: 'Data Patterns',
    description: 'Data processing and transformation patterns',
    icon: '📊',
  },
  workflow: {
    label: 'Workflow Patterns',
    description: 'Process orchestration and control flow patterns',
    icon: '⚙️',
  },
  architecture: {
    label: 'Architecture Patterns',
    description: 'System architecture and design patterns',
    icon: '🏗️',
  },
};

/**
 * Pattern complexity descriptions
 */
export const PATTERN_COMPLEXITY: Record<
  PatternComplexity,
  { label: string; description: string; color: string }
> = {
  beginner: {
    label: 'Beginner',
    description: 'Easy to understand and implement',
    color: 'green',
  },
  intermediate: {
    label: 'Intermediate',
    description: 'Requires some experience',
    color: 'blue',
  },
  advanced: {
    label: 'Advanced',
    description: 'Complex pattern requiring experience',
    color: 'orange',
  },
  expert: {
    label: 'Expert',
    description: 'Very complex, for experienced developers',
    color: 'red',
  },
};
