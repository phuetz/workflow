/**
 * Context Analyzer for Intelligent Node Naming
 *
 * Analyzes workflow context to provide better naming suggestions
 * based on node position, connections, and workflow structure.
 */

import { WorkflowNode, WorkflowEdge, NodeData } from '../types/workflow';

export interface WorkflowContext {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  currentNode: WorkflowNode;
}

export interface NodeContext {
  position: 'first' | 'middle' | 'last';
  depth: number;
  previousNodes: WorkflowNode[];
  nextNodes: WorkflowNode[];
  connectedNodeTypes: string[];
  isInLoop: boolean;
  isInConditional: boolean;
  parallelBranches: number;
}

export class ContextAnalyzer {
  /**
   * Analyze node position and context in workflow
   */
  analyzeNodeContext(workflow: WorkflowContext): NodeContext {
    const { nodes, edges, currentNode } = workflow;

    const previousNodes = this.getPreviousNodes(currentNode, edges, nodes);
    const nextNodes = this.getNextNodes(currentNode, edges, nodes);

    return {
      position: this.determinePosition(currentNode, nodes, edges),
      depth: this.calculateNodeDepth(currentNode, edges, nodes),
      previousNodes,
      nextNodes,
      connectedNodeTypes: this.getConnectedNodeTypes(currentNode, edges, nodes),
      isInLoop: this.isNodeInLoop(currentNode, edges, nodes),
      isInConditional: this.isNodeInConditional(currentNode, edges, nodes),
      parallelBranches: this.countParallelBranches(currentNode, edges, nodes)
    };
  }

  /**
   * Determine if node is first, middle, or last in workflow
   */
  private determinePosition(
    node: WorkflowNode,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): 'first' | 'middle' | 'last' {
    const incomingEdges = edges.filter(e => e.target === node.id);
    const outgoingEdges = edges.filter(e => e.source === node.id);

    if (incomingEdges.length === 0 && outgoingEdges.length > 0) {
      return 'first';
    }

    if (outgoingEdges.length === 0 && incomingEdges.length > 0) {
      return 'last';
    }

    return 'middle';
  }

  /**
   * Calculate depth of node in workflow (distance from start)
   */
  private calculateNodeDepth(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    nodes: WorkflowNode[]
  ): number {
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; depth: number }> = [];

    // Find start nodes (no incoming edges)
    const startNodes = nodes.filter(n =>
      !edges.some(e => e.target === n.id)
    );

    // BFS from all start nodes
    for (const startNode of startNodes) {
      queue.push({ nodeId: startNode.id, depth: 0 });
    }

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.nodeId === node.id) {
        return current.depth;
      }

      if (visited.has(current.nodeId)) {
        continue;
      }

      visited.add(current.nodeId);

      // Add connected nodes
      const connectedEdges = edges.filter(e => e.source === current.nodeId);
      for (const edge of connectedEdges) {
        if (!visited.has(edge.target)) {
          queue.push({ nodeId: edge.target, depth: current.depth + 1 });
        }
      }
    }

    return 0;
  }

  /**
   * Get all nodes connected before this node
   */
  private getPreviousNodes(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    nodes: WorkflowNode[]
  ): WorkflowNode[] {
    const incomingEdges = edges.filter(e => e.target === node.id);
    const previousNodeIds = incomingEdges.map(e => e.source);

    return nodes.filter(n => previousNodeIds.includes(n.id));
  }

  /**
   * Get all nodes connected after this node
   */
  private getNextNodes(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    nodes: WorkflowNode[]
  ): WorkflowNode[] {
    const outgoingEdges = edges.filter(e => e.source === node.id);
    const nextNodeIds = outgoingEdges.map(e => e.target);

    return nodes.filter(n => nextNodeIds.includes(n.id));
  }

  /**
   * Get types of all connected nodes
   */
  private getConnectedNodeTypes(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    nodes: WorkflowNode[]
  ): string[] {
    const connectedEdges = edges.filter(
      e => e.source === node.id || e.target === node.id
    );

    const connectedNodeIds = new Set(
      connectedEdges.flatMap(e => [e.source, e.target])
    );

    connectedNodeIds.delete(node.id);

    return nodes
      .filter(n => connectedNodeIds.has(n.id))
      .map(n => n.type);
  }

  /**
   * Check if node is inside a loop structure
   */
  private isNodeInLoop(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    nodes: WorkflowNode[]
  ): boolean {
    // Look for loop nodes (forEach, whileLoop) in ancestors
    const ancestors = this.getAncestors(node, edges, nodes);

    return ancestors.some(n =>
      ['forEach', 'whileLoop', 'loop'].includes(n.type)
    );
  }

  /**
   * Check if node is inside a conditional branch
   */
  private isNodeInConditional(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    nodes: WorkflowNode[]
  ): boolean {
    // Look for conditional nodes (if, switch) in ancestors
    const ancestors = this.getAncestors(node, edges, nodes);

    return ancestors.some(n =>
      ['if', 'switch', 'conditional'].includes(n.type)
    );
  }

  /**
   * Count parallel branches at this node
   */
  private countParallelBranches(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    nodes: WorkflowNode[]
  ): number {
    const outgoingEdges = edges.filter(e => e.source === node.id);
    return outgoingEdges.length;
  }

  /**
   * Get all ancestor nodes (nodes that can reach this node)
   */
  private getAncestors(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    nodes: WorkflowNode[]
  ): WorkflowNode[] {
    const ancestors = new Set<string>();
    const queue = [node.id];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      const incomingEdges = edges.filter(e => e.target === currentId);

      for (const edge of incomingEdges) {
        if (edge.source !== node.id) {
          ancestors.add(edge.source);
          queue.push(edge.source);
        }
      }
    }

    return nodes.filter(n => ancestors.has(n.id));
  }

  /**
   * Suggest name prefix based on position
   */
  suggestPositionPrefix(position: 'first' | 'middle' | 'last'): string {
    switch (position) {
      case 'first':
        return 'Trigger: ';
      case 'last':
        return 'Final: ';
      default:
        return '';
    }
  }

  /**
   * Analyze workflow purpose based on node types
   */
  analyzeWorkflowPurpose(nodes: WorkflowNode[]): {
    purpose: string;
    category: string;
    keywords: string[];
  } {
    const nodeTypes = nodes.map(n => n.type);
    const keywords: string[] = [];

    // Detect common patterns
    const hasDatabase = nodeTypes.some(t =>
      ['database', 'mysql', 'postgres', 'mongodb'].includes(t)
    );
    const hasEmail = nodeTypes.some(t =>
      ['email', 'sendgrid', 'mailgun'].includes(t)
    );
    const hasPayment = nodeTypes.some(t =>
      ['stripe', 'paypal', 'payment'].includes(t)
    );
    const hasNotification = nodeTypes.some(t =>
      ['slack', 'discord', 'teams'].includes(t)
    );
    const hasAPI = nodeTypes.some(t => t === 'httpRequest');

    if (hasPayment && hasDatabase && hasEmail) {
      return {
        purpose: 'Payment Processing',
        category: 'e-commerce',
        keywords: ['payment', 'order', 'invoice']
      };
    }

    if (hasDatabase && hasNotification) {
      return {
        purpose: 'Data Monitoring',
        category: 'monitoring',
        keywords: ['alert', 'notify', 'monitor']
      };
    }

    if (hasAPI && hasEmail) {
      return {
        purpose: 'API Notification',
        category: 'integration',
        keywords: ['fetch', 'send', 'notify']
      };
    }

    return {
      purpose: 'General Automation',
      category: 'general',
      keywords: []
    };
  }

  /**
   * Detect naming anti-patterns
   */
  detectAntiPatterns(nodeName: string): string[] {
    const issues: string[] = [];

    // Too generic
    if (['node', 'new node', 'untitled'].includes(nodeName.toLowerCase())) {
      issues.push('Name is too generic');
    }

    // Too long
    if (nodeName.length > 50) {
      issues.push('Name is too long (>50 characters)');
    }

    // All caps
    if (nodeName === nodeName.toUpperCase() && nodeName.length > 3) {
      issues.push('Avoid all caps');
    }

    // Contains numbers only
    if (/^\d+$/.test(nodeName)) {
      issues.push('Name should be descriptive, not just a number');
    }

    // Unclear abbreviations
    const unclearAbbreviations = ['req', 'res', 'tmp', 'var'];
    const lowerName = nodeName.toLowerCase();

    for (const abbr of unclearAbbreviations) {
      if (lowerName.includes(abbr)) {
        issues.push(`Avoid unclear abbreviation: ${abbr}`);
      }
    }

    return issues;
  }

  /**
   * Suggest improvements for existing name
   */
  suggestNameImprovement(currentName: string, nodeType: string): string | null {
    const issues = this.detectAntiPatterns(currentName);

    if (issues.length === 0) {
      return null;
    }

    // Basic improvements
    let improved = currentName;

    // Expand common abbreviations
    improved = improved
      .replace(/\breq\b/gi, 'Request')
      .replace(/\bres\b/gi, 'Response')
      .replace(/\btmp\b/gi, 'Temporary')
      .replace(/\bvar\b/gi, 'Variable');

    // Fix casing
    if (improved === improved.toUpperCase()) {
      improved = improved
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Truncate if too long
    if (improved.length > 50) {
      improved = improved.substring(0, 47) + '...';
    }

    return improved !== currentName ? improved : null;
  }
}

export const contextAnalyzer = new ContextAnalyzer();
