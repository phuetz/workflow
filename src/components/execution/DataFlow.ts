/**
 * Data flow management between workflow nodes.
 * Handles edge traversal, condition evaluation, and data routing.
 */

import type { WorkflowNode, WorkflowEdge } from './types';
import { parseExpression } from './ExpressionEvaluator';

/**
 * Checks if an edge condition is met based on the provided data.
 * @param edge - The edge to check
 * @param data - The data context for condition evaluation
 * @returns True if the condition is met or no condition exists
 */
export function edgeConditionMet(edge: WorkflowEdge, data: Record<string, unknown>): boolean {
  if (edge.data && edge.data.condition) {
    return parseExpression(edge.data.condition as string, data);
  }
  return true;
}

/**
 * Gets the next nodes to execute based on the current node and optional branch.
 * @param nodeId - The current node ID
 * @param nodes - All workflow nodes
 * @param edges - All workflow edges
 * @param branch - Optional branch filter (e.g., 'true' or 'false' for condition nodes)
 * @returns Array of next nodes with their edges
 */
export function getNextNodes(
  nodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  branch?: string
): Array<{ node: WorkflowNode | undefined; edge: WorkflowEdge }> {
  const outgoingEdges = edges.filter(edge => {
    if (edge.source !== nodeId) return false;
    if (branch && edge.sourceHandle && edge.sourceHandle !== branch) return false;
    return true;
  });

  return outgoingEdges.map(edge => {
    const node = nodes.find(n => n.id === edge.target);
    return { node, edge };
  });
}

/**
 * Gets the starting nodes of a workflow (nodes with no incoming edges).
 * @param nodes - All workflow nodes
 * @param edges - All workflow edges
 * @returns Array of starting nodes
 */
export function getStartNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const nodesWithInputs = new Set(edges.map(edge => edge.target));
  return nodes.filter(node => !nodesWithInputs.has(node.id));
}

/**
 * Combines input data from multiple source nodes.
 * @param targetNodeId - The node receiving data
 * @param edges - All workflow edges
 * @param results - Map of node execution results
 * @param currentInputData - Current input data to merge with
 * @returns Combined input data
 */
export function combineInputData(
  targetNodeId: string,
  edges: WorkflowEdge[],
  results: Map<string, { data?: Record<string, unknown> }>,
  currentInputData: Record<string, unknown>
): Record<string, unknown> {
  const incomingEdges = edges.filter(edge => edge.target === targetNodeId);

  if (incomingEdges.length === 0) {
    return currentInputData;
  }

  const combinedData: Record<string, unknown> = {};

  for (const edge of incomingEdges) {
    const sourceResult = results.get(edge.source);
    if (sourceResult?.data && typeof sourceResult.data === 'object') {
      Object.assign(combinedData, sourceResult.data);
    }
  }

  return { ...currentInputData, ...combinedData };
}

/**
 * Validates that a workflow has at least one start node.
 * @param nodes - All workflow nodes
 * @param edges - All workflow edges
 * @throws Error if no start nodes are found
 */
export function validateWorkflowHasStartNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): void {
  const startNodes = getStartNodes(nodes, edges);
  if (startNodes.length === 0) {
    throw new Error('No start nodes found in workflow');
  }
}

/**
 * Creates the initial execution queue from start nodes.
 * @param nodes - All workflow nodes
 * @param edges - All workflow edges
 * @returns Initial execution queue
 */
export function createInitialExecutionQueue(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Array<{ node: WorkflowNode; inputData: Record<string, unknown> }> {
  const startNodes = getStartNodes(nodes, edges);
  return startNodes.map(node => ({
    node,
    inputData: {}
  }));
}

/**
 * Gets the next execution items based on the current result and node type.
 * Handles branching for condition nodes and error routing.
 * @param currentNode - The node that just executed
 * @param result - The execution result
 * @param nodes - All workflow nodes
 * @param edges - All workflow edges
 * @param executed - Set of already executed node IDs
 * @returns Array of next execution items
 */
export function getNextExecutionItems(
  currentNode: WorkflowNode,
  result: { status: 'success' | 'error'; data?: Record<string, unknown> },
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  executed: Set<string>
): Array<{ node: WorkflowNode; inputData: Record<string, unknown> }> {
  const items: Array<{ node: WorkflowNode; inputData: Record<string, unknown> }> = [];

  let nextNodes: Array<{ node: WorkflowNode | undefined; edge: WorkflowEdge }> = [];

  if (result.status === 'success' && currentNode.data.type === 'condition' && result.data?.branch) {
    // For conditions, use the specific branch
    nextNodes = getNextNodes(currentNode.id, nodes, edges, result.data.branch as string);
  } else if (result.status === 'success') {
    // For other successful nodes, take all outputs
    nextNodes = getNextNodes(currentNode.id, nodes, edges);
  }

  // Add next nodes to the items
  for (const { node: nextNode, edge } of nextNodes) {
    if (nextNode && !executed.has(nextNode.id) && edgeConditionMet(edge, result.data || {})) {
      items.push({
        node: nextNode,
        inputData: result.data || {}
      });
    }
  }

  return items;
}

/**
 * Gets error branch execution items for failed nodes.
 * @param currentNode - The node that failed
 * @param error - The error payload
 * @param nodes - All workflow nodes
 * @param edges - All workflow edges
 * @param executed - Set of already executed node IDs
 * @returns Array of error branch execution items
 */
export function getErrorBranchItems(
  currentNode: WorkflowNode,
  error: { message: string; stack?: string; code: string },
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  executed: Set<string>
): Array<{ node: WorkflowNode; inputData: Record<string, unknown> }> {
  const items: Array<{ node: WorkflowNode; inputData: Record<string, unknown> }> = [];
  const errorEdges = getNextNodes(currentNode.id, nodes, edges, 'error');

  for (const { node: nextNode, edge } of errorEdges) {
    if (nextNode && !executed.has(nextNode.id) && edgeConditionMet(edge, { error })) {
      items.push({
        node: nextNode,
        inputData: { error }
      });
    }
  }

  return items;
}

/**
 * Checks if execution should continue after an error.
 * @param node - The node that errored
 * @param errorEdges - Available error edges
 * @returns True if execution should continue
 */
export function shouldContinueAfterError(
  node: WorkflowNode,
  errorEdges: Array<{ node: WorkflowNode | undefined; edge: WorkflowEdge }>
): boolean {
  const config = node.data.config as Record<string, unknown> | undefined;
  return Boolean(config?.continueOnFail) || errorEdges.length > 0;
}
