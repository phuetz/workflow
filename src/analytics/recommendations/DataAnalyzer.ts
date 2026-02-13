/**
 * Data Analyzer for AI Recommendations
 *
 * Handles workflow structure analysis, node depth calculation,
 * and identification of patterns in workflow data.
 *
 * @module recommendations/DataAnalyzer
 */

import {
  Workflow,
  WorkflowNode,
  WorkflowExecutionData,
  DuplicateNodeInfo,
} from './types';

/**
 * Analyzes workflow data to identify patterns and opportunities
 */
export class DataAnalyzer {
  /**
   * Check if a node is a terminal node (end of workflow)
   */
  isTerminalNode(node: WorkflowNode): boolean {
    return node.type === 'end' || node.type === 'response' || node.type === 'webhook';
  }

  /**
   * Find duplicate sequential nodes in the workflow
   */
  findDuplicateSequentialNodes(workflow: Workflow): DuplicateNodeInfo[] {
    const duplicates: DuplicateNodeInfo[] = [];

    for (let i = 0; i < workflow.nodes.length; i++) {
      const node1 = workflow.nodes[i];

      // Find edges where node1 is source
      const outgoingEdges = workflow.edges.filter((e) => e.source === node1.id);

      for (const edge of outgoingEdges) {
        const node2 = workflow.nodes.find((n) => n.id === edge.target);

        if (node2 && this.areNodesSimilar(node1, node2)) {
          duplicates.push({ id: node2.id, node: node2, mergeWith: node1.id });
        }
      }
    }

    return duplicates;
  }

  /**
   * Check if two nodes are similar (same type and data)
   */
  areNodesSimilar(node1: WorkflowNode, node2: WorkflowNode): boolean {
    if (node1.type !== node2.type) return false;

    // Simple similarity check (can be enhanced)
    return JSON.stringify(node1.data) === JSON.stringify(node2.data);
  }

  /**
   * Find groups of nodes that can be parallelized
   */
  findParallelizableNodes(workflow: Workflow): string[][] {
    const groups: string[][] = [];

    // Find nodes at the same depth level without dependencies
    const depths = this.calculateNodeDepths(workflow);
    const depthGroups: Record<number, string[]> = {};

    for (const [nodeId, depth] of Object.entries(depths)) {
      if (!depthGroups[depth]) depthGroups[depth] = [];
      depthGroups[depth].push(nodeId);
    }

    for (const group of Object.values(depthGroups)) {
      if (group.length > 1) {
        // Check if nodes are truly independent
        const independent = this.areNodesIndependent(group, workflow);
        if (independent) {
          groups.push(group);
        }
      }
    }

    return groups;
  }

  /**
   * Calculate the depth of each node in the workflow graph
   */
  calculateNodeDepths(workflow: Workflow): Record<string, number> {
    const depths: Record<string, number> = {};
    const visited = new Set<string>();

    const calculateDepth = (nodeId: string, currentDepth: number): void => {
      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      depths[nodeId] = currentDepth;

      const outgoingEdges = workflow.edges.filter((e) => e.source === nodeId);
      for (const edge of outgoingEdges) {
        calculateDepth(edge.target, currentDepth + 1);
      }
    };

    // Find start nodes (nodes with no incoming edges)
    const nodesWithInputs = new Set(workflow.edges.map((e) => e.target));
    const startNodes = workflow.nodes.filter((n) => !nodesWithInputs.has(n.id));

    for (const node of startNodes) {
      calculateDepth(node.id, 0);
    }

    return depths;
  }

  /**
   * Check if a group of nodes are independent (no dependencies between them)
   */
  areNodesIndependent(nodeIds: string[], workflow: Workflow): boolean {
    // Check if any node depends on another in the group
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = 0; j < nodeIds.length; j++) {
        if (i === j) continue;

        const hasDependency = workflow.edges.some(
          (e) => e.source === nodeIds[i] && e.target === nodeIds[j]
        );

        if (hasDependency) return false;
      }
    }

    return true;
  }

  /**
   * Check if a node is cacheable based on its type and data
   */
  isCacheable(node: WorkflowNode, _executionData?: WorkflowExecutionData[]): boolean {
    // Simple heuristic: GET requests are cacheable
    if (node.type === 'httpRequest' && node.data.method === 'GET') {
      return true;
    }

    // Database SELECT queries are cacheable
    if (node.type === 'database' && node.data.operation === 'SELECT') {
      return true;
    }

    return false;
  }

  /**
   * Check if a node has error handling configured
   */
  hasErrorHandling(node: WorkflowNode, workflow: Workflow): boolean {
    // Check if there's an error edge from this node
    const errorEdge = workflow.edges.find(
      (e) => e.source === node.id && e.sourceHandle === 'error'
    );

    return !!errorEdge;
  }

  /**
   * Check if a node may contain hardcoded secrets
   */
  mayContainSecrets(node: WorkflowNode): boolean {
    const dataStr = JSON.stringify(node.data).toLowerCase();

    const secretPatterns = [
      'password',
      'apikey',
      'api_key',
      'secret',
      'token',
      'bearer',
      'credential',
    ];

    return secretPatterns.some((pattern) => dataStr.includes(pattern));
  }

  /**
   * Find dead-end nodes (nodes with no outgoing edges that aren't terminal)
   */
  findDeadEndNodes(workflow: Workflow): WorkflowNode[] {
    const nodesWithOutputs = new Set(workflow.edges.map((e) => e.source));
    return workflow.nodes.filter(
      (node) => !nodesWithOutputs.has(node.id) && !this.isTerminalNode(node)
    );
  }

  /**
   * Find nodes that make repeated API calls
   */
  findRepeatableApiNodes(workflow: Workflow): WorkflowNode[] {
    return workflow.nodes.filter(
      (node) =>
        node.type === 'httpRequest' ||
        node.type === 'database' ||
        node.type === 'api'
    );
  }

  /**
   * Find nodes without error handling
   */
  findNodesWithoutErrorHandling(workflow: Workflow): WorkflowNode[] {
    return workflow.nodes.filter(
      (node) => !this.hasErrorHandling(node, workflow)
    );
  }

  /**
   * Find expensive AI/ML nodes
   */
  findExpensiveNodes(workflow: Workflow): WorkflowNode[] {
    return workflow.nodes.filter(
      (node) =>
        node.type.includes('premium') ||
        node.type.includes('ai') ||
        node.type.includes('ml')
    );
  }

  /**
   * Find data processing nodes
   */
  findDataProcessingNodes(workflow: Workflow): WorkflowNode[] {
    return workflow.nodes.filter(
      (node) =>
        node.type === 'transform' ||
        node.type === 'filter' ||
        node.type === 'map'
    );
  }

  /**
   * Find HTTP nodes using insecure connections
   */
  findInsecureHttpNodes(workflow: Workflow): WorkflowNode[] {
    const httpNodes = workflow.nodes.filter((node) => node.type === 'httpRequest');
    return httpNodes.filter(
      (node) => node.data.url && node.data.url.startsWith('http://')
    );
  }

  /**
   * Find polling-based trigger nodes
   */
  findPollingNodes(workflow: Workflow): WorkflowNode[] {
    return workflow.nodes.filter(
      (node) => node.type === 'schedule' || node.type === 'poll'
    );
  }

  /**
   * Find commercial service nodes that may have free alternatives
   */
  findCommercialNodes(workflow: Workflow): WorkflowNode[] {
    return workflow.nodes.filter(
      (node) => node.type === 'sendgrid' || node.type === 'twilio'
    );
  }
}
