/**
 * Connection Validator
 * Validates workflow connections before they are created
 *
 * Features:
 * - Cycle detection (prevents infinite loops)
 * - Connection type validation (ensures compatible data types)
 * - Duplicate connection prevention
 * - Self-connection prevention
 * - Maximum connections per handle validation
 */

import type { Node, Edge, Connection } from '@xyflow/react';
import { nodeTypes } from '../data/nodeTypes';

/**
 * Connection validation result
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Data types that can flow through connections
 */
export type DataType =
  | 'any'        // Can accept any type
  | 'string'     // Text data
  | 'number'     // Numeric data
  | 'boolean'    // True/false
  | 'object'     // JSON object
  | 'array'      // Array of items
  | 'binary'     // Binary/file data
  | 'trigger'    // Trigger signal (no data)
  | 'error';     // Error output

/**
 * Handle type definition
 */
export interface HandleType {
  dataType: DataType;
  multiple?: boolean;    // Can have multiple connections
  required?: boolean;    // Must be connected
  label?: string;
}

/**
 * Node connection schema
 */
export interface NodeConnectionSchema {
  inputs?: Record<string, HandleType>;
  outputs?: Record<string, HandleType>;
  maxInputs?: number;
  maxOutputs?: number;
}

/**
 * Default connection schemas for node categories
 */
const DEFAULT_SCHEMAS: Record<string, NodeConnectionSchema> = {
  trigger: {
    inputs: {},
    outputs: { main: { dataType: 'trigger', multiple: true } },
    maxInputs: 0,
    maxOutputs: -1,
  },
  action: {
    inputs: { main: { dataType: 'any', multiple: true } },
    outputs: { main: { dataType: 'any', multiple: true } },
    maxInputs: -1,
    maxOutputs: -1,
  },
  condition: {
    inputs: { main: { dataType: 'any' } },
    outputs: {
      true: { dataType: 'any', label: 'True' },
      false: { dataType: 'any', label: 'False' },
    },
    maxInputs: 1,
    maxOutputs: 2,
  },
  loop: {
    inputs: { main: { dataType: 'array' } },
    outputs: {
      item: { dataType: 'any', label: 'Each Item' },
      done: { dataType: 'array', label: 'Complete' },
    },
    maxInputs: 1,
    maxOutputs: 2,
  },
  transform: {
    inputs: { main: { dataType: 'any' } },
    outputs: { main: { dataType: 'any' } },
    maxInputs: -1,
    maxOutputs: -1,
  },
  merge: {
    inputs: { main: { dataType: 'any', multiple: true } },
    outputs: { main: { dataType: 'array' } },
    maxInputs: -1,
    maxOutputs: 1,
  },
  split: {
    inputs: { main: { dataType: 'array' } },
    outputs: { main: { dataType: 'any', multiple: true } },
    maxInputs: 1,
    maxOutputs: -1,
  },
  error: {
    inputs: { main: { dataType: 'error' } },
    outputs: { main: { dataType: 'any' } },
    maxInputs: 1,
    maxOutputs: 1,
  },
};

/**
 * Data type compatibility matrix
 */
const TYPE_COMPATIBILITY: Record<DataType, DataType[]> = {
  any: ['any', 'string', 'number', 'boolean', 'object', 'array', 'binary', 'trigger', 'error'],
  string: ['any', 'string'],
  number: ['any', 'number', 'string'],
  boolean: ['any', 'boolean', 'string', 'number'],
  object: ['any', 'object'],
  array: ['any', 'array', 'object'],
  binary: ['any', 'binary'],
  trigger: ['any', 'trigger'],
  error: ['any', 'error'],
};

/**
 * Check if two data types are compatible
 */
function areTypesCompatible(sourceType: DataType, targetType: DataType): boolean {
  if (sourceType === 'any' || targetType === 'any') {
    return true;
  }
  return TYPE_COMPATIBILITY[sourceType]?.includes(targetType) || false;
}

/**
 * Get node category from type
 */
function getNodeCategory(nodeType: string): string {
  const node = nodeTypes[nodeType] || Object.values(nodeTypes).find(n => n.type === nodeType);
  return node?.category || 'action';
}

/**
 * Get connection schema for a node type
 */
function getConnectionSchema(nodeType: string): NodeConnectionSchema {
  const category = getNodeCategory(nodeType);
  return DEFAULT_SCHEMAS[category] || DEFAULT_SCHEMAS.action;
}

/**
 * Detect if adding a connection would create a cycle
 */
export function wouldCreateCycle(
  nodes: Node[],
  edges: Edge[],
  newConnection: Connection
): boolean {
  if (!newConnection.source || !newConnection.target) {
    return false;
  }

  // Self-connection is always a cycle
  if (newConnection.source === newConnection.target) {
    return true;
  }

  // Build adjacency list
  const graph = new Map<string, Set<string>>();

  // Initialize all nodes
  for (const node of nodes) {
    graph.set(node.id, new Set());
  }

  // Add existing edges
  for (const edge of edges) {
    const targets = graph.get(edge.source);
    if (targets) {
      targets.add(edge.target);
    }
  }

  // Add the new connection temporarily
  const sourceTargets = graph.get(newConnection.source);
  if (sourceTargets) {
    sourceTargets.add(newConnection.target);
  }

  // DFS to detect cycle starting from target
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycleDFS(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph.get(nodeId) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycleDFS(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check for cycle from the source node
  return hasCycleDFS(newConnection.source);
}

/**
 * Check if connection already exists
 */
export function connectionExists(
  edges: Edge[],
  connection: Connection
): boolean {
  return edges.some(
    edge =>
      edge.source === connection.source &&
      edge.target === connection.target &&
      edge.sourceHandle === connection.sourceHandle &&
      edge.targetHandle === connection.targetHandle
  );
}

/**
 * Get connection count for a handle
 */
function getConnectionCount(
  edges: Edge[],
  nodeId: string,
  handleId: string | null,
  type: 'source' | 'target'
): number {
  return edges.filter(edge => {
    if (type === 'source') {
      return edge.source === nodeId && edge.sourceHandle === handleId;
    }
    return edge.target === nodeId && edge.targetHandle === handleId;
  }).length;
}

/**
 * Validate a connection before it's created
 */
export function validateConnection(
  nodes: Node[],
  edges: Edge[],
  connection: Connection
): ValidationResult {
  // Basic validation
  if (!connection.source || !connection.target) {
    return { isValid: false, error: 'Invalid connection: missing source or target' };
  }

  // Find source and target nodes
  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);

  if (!sourceNode || !targetNode) {
    return { isValid: false, error: 'Invalid connection: node not found' };
  }

  // Check self-connection
  if (connection.source === connection.target) {
    return { isValid: false, error: 'Cannot connect a node to itself' };
  }

  // Check duplicate connection
  if (connectionExists(edges, connection)) {
    return { isValid: false, error: 'Connection already exists' };
  }

  // Check for cycles
  if (wouldCreateCycle(nodes, edges, connection)) {
    return {
      isValid: false,
      error: 'This connection would create a cycle (infinite loop)'
    };
  }

  // Get schemas
  const sourceSchema = getConnectionSchema(sourceNode.type || 'action');
  const targetSchema = getConnectionSchema(targetNode.type || 'action');

  // Check if source can have outputs
  if (sourceSchema.maxOutputs === 0) {
    return {
      isValid: false,
      error: `${sourceNode.data?.label || sourceNode.type} cannot have output connections`
    };
  }

  // Check if target can have inputs
  if (targetSchema.maxInputs === 0) {
    return {
      isValid: false,
      error: `${targetNode.data?.label || targetNode.type} cannot have input connections`
    };
  }

  // Check source output count
  if (sourceSchema.maxOutputs && sourceSchema.maxOutputs > 0) {
    const currentOutputs = getConnectionCount(edges, connection.source, connection.sourceHandle, 'source');
    if (currentOutputs >= sourceSchema.maxOutputs) {
      return {
        isValid: false,
        error: `${sourceNode.data?.label || sourceNode.type} has reached maximum output connections`
      };
    }
  }

  // Check target input count
  if (targetSchema.maxInputs && targetSchema.maxInputs > 0) {
    const currentInputs = getConnectionCount(edges, connection.target, connection.targetHandle, 'target');
    if (currentInputs >= targetSchema.maxInputs) {
      return {
        isValid: false,
        error: `${targetNode.data?.label || targetNode.type} has reached maximum input connections`
      };
    }
  }

  // Get data types
  const sourceHandle = connection.sourceHandle || 'main';
  const targetHandle = connection.targetHandle || 'main';

  const sourceOutput = sourceSchema.outputs?.[sourceHandle] || { dataType: 'any' as DataType };
  const targetInput = targetSchema.inputs?.[targetHandle] || { dataType: 'any' as DataType };

  // Check type compatibility
  if (!areTypesCompatible(sourceOutput.dataType, targetInput.dataType)) {
    return {
      isValid: false,
      error: `Type mismatch: ${sourceOutput.dataType} cannot connect to ${targetInput.dataType}`,
      warning: `Consider adding a transform node between these connections`
    };
  }

  // All checks passed
  return { isValid: true };
}

/**
 * Validate entire workflow for connection issues
 */
export function validateWorkflowConnections(
  nodes: Node[],
  edges: Edge[]
): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check each edge
  for (const edge of edges) {
    const connection: Connection = {
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
    };

    // Skip the edge itself when checking for duplicates
    const otherEdges = edges.filter(e => e.id !== edge.id);

    // Check for duplicates
    if (connectionExists(otherEdges, connection)) {
      results.push({
        isValid: false,
        error: `Duplicate connection from ${edge.source} to ${edge.target}`,
      });
    }
  }

  // Check for cycles in the entire graph
  const hasCycle = detectGraphCycles(nodes, edges);
  if (hasCycle) {
    results.push({
      isValid: false,
      error: 'Workflow contains circular dependencies',
    });
  }

  // Check for disconnected trigger nodes
  const triggerNodes = nodes.filter(n => getNodeCategory(n.type || '') === 'trigger');
  for (const trigger of triggerNodes) {
    const hasOutput = edges.some(e => e.source === trigger.id);
    if (!hasOutput) {
      results.push({
        isValid: false,
        error: `Trigger node "${trigger.data?.label || trigger.id}" is not connected to any node`,
        warning: 'Workflow will not execute without a connected trigger',
      });
    }
  }

  // Check for orphan nodes (no inputs or outputs except triggers)
  for (const node of nodes) {
    if (getNodeCategory(node.type || '') === 'trigger') continue;

    const hasInput = edges.some(e => e.target === node.id);
    const hasOutput = edges.some(e => e.source === node.id);

    if (!hasInput && !hasOutput) {
      results.push({
        isValid: false,
        error: `Node "${node.data?.label || node.id}" is not connected`,
        warning: 'This node will not be executed',
      });
    }
  }

  return results;
}

/**
 * Detect cycles in the workflow graph using DFS
 */
function detectGraphCycles(nodes: Node[], edges: Edge[]): boolean {
  const graph = new Map<string, Set<string>>();

  // Build adjacency list
  for (const node of nodes) {
    graph.set(node.id, new Set());
  }

  for (const edge of edges) {
    const targets = graph.get(edge.source);
    if (targets) {
      targets.add(edge.target);
    }
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycleDFS(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph.get(nodeId) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycleDFS(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check all nodes (handles disconnected components)
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycleDFS(node.id)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get visual feedback style for connection validation
 */
export function getConnectionStyle(isValid: boolean): React.CSSProperties {
  if (isValid) {
    return {
      stroke: '#22c55e', // Green
      strokeWidth: 2,
    };
  }
  return {
    stroke: '#ef4444', // Red
    strokeWidth: 2,
    strokeDasharray: '5,5',
  };
}

/**
 * Singleton instance for connection validation
 */
class ConnectionValidatorService {
  private validationCache = new Map<string, ValidationResult>();

  /**
   * Validate and cache result
   */
  validate(
    nodes: Node[],
    edges: Edge[],
    connection: Connection
  ): ValidationResult {
    const cacheKey = `${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`;

    // Check cache (but only if nodes/edges haven't changed)
    // For now, always validate fresh

    const result = validateConnection(nodes, edges, connection);
    this.validationCache.set(cacheKey, result);

    return result;
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
  }
}

export const connectionValidator = new ConnectionValidatorService();
