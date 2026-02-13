/**
 * Workflow Analyzer
 * Analyzes workflow structure, connections, and dependencies
 */

import type {
  WorkflowAnalysis,
  WorkflowMetadata,
  NodeDocumentation,
  ConnectionInfo,
  VariableDocumentation,
  BranchInfo,
  LoopInfo,
} from '../types/workflowDocumentation';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { logger } from '../services/SimpleLogger';

export class WorkflowAnalyzer {
  /**
   * Analyze complete workflow structure
   */
  async analyzeWorkflow(
    workflowId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    metadata?: Partial<WorkflowMetadata>
  ): Promise<WorkflowAnalysis> {
    const startTime = performance.now();

    // Extract metadata
    const workflowMetadata = this.extractMetadata(workflowId, nodes, metadata);

    // Document nodes
    const nodeDocumentation = this.documentNodes(nodes, edges);

    // Extract connections
    const connections = this.extractConnections(edges, nodes);

    // Extract variables
    const variables = this.extractVariables(nodes);

    // Calculate statistics
    const statistics = this.calculateStatistics(nodes, edges);

    // Analyze structure
    const structure = this.analyzeStructure(nodes, edges);

    // Extract dependencies
    const dependencies = this.extractDependencies(nodes);

    const analysisTime = performance.now() - startTime;
    logger.debug(`Workflow analysis completed in ${analysisTime.toFixed(2)}ms`);

    return {
      metadata: workflowMetadata,
      nodes: nodeDocumentation,
      connections,
      variables,
      statistics,
      structure,
      dependencies,
    };
  }

  /**
   * Extract workflow metadata
   */
  private extractMetadata(
    workflowId: string,
    nodes: WorkflowNode[],
    metadata?: Partial<WorkflowMetadata>
  ): WorkflowMetadata {
    return {
      id: workflowId,
      name: metadata?.name || `Workflow ${workflowId}`,
      description: metadata?.description,
      version: metadata?.version || '1.0.0',
      author: metadata?.author,
      organization: metadata?.organization,
      tags: metadata?.tags || [],
      category: metadata?.category,
      createdAt: metadata?.createdAt || new Date(),
      updatedAt: metadata?.updatedAt || new Date(),
      lastExecutedAt: metadata?.lastExecutedAt,
      executionCount: metadata?.executionCount,
      status: metadata?.status || 'active',
    };
  }

  /**
   * Document all nodes
   */
  private documentNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): NodeDocumentation[] {
    return nodes.map((node) => {
      const inputs = edges.filter((e) => e.target === node.id);
      const outputs = edges.filter((e) => e.source === node.id);

      return {
        id: node.id,
        name: node.data.label || node.type,
        type: node.type,
        category: this.getNodeCategory(node.type),
        description: this.getNodeDescription(node.type),
        position: node.position,
        config: (node.data.config as Record<string, any>) || {},
        inputs: inputs.map((e) => this.createConnectionInfo(e, 'input')),
        outputs: outputs.map((e) => this.createConnectionInfo(e, 'output')),
        notes: node.data.config?.['notes'] as string | undefined,
      };
    });
  }

  /**
   * Extract connection information
   */
  private extractConnections(edges: WorkflowEdge[], nodes: WorkflowNode[]): ConnectionInfo[] {
    return edges.map((edge) => this.createConnectionInfo(edge));
  }

  /**
   * Create connection info from edge
   */
  private createConnectionInfo(edge: WorkflowEdge, direction?: 'input' | 'output'): ConnectionInfo {
    return {
      id: edge.id,
      sourceNode: edge.source,
      targetNode: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.data?.condition,
      type: this.getConnectionType(edge),
    };
  }

  /**
   * Extract variables used in workflow
   */
  private extractVariables(nodes: WorkflowNode[]): VariableDocumentation[] {
    const variables = new Map<string, VariableDocumentation>();

    nodes.forEach((node) => {
      const config = node.data.config as Record<string, any>;
      if (!config) return;

      // Search for variable references in config
      this.findVariableReferences(config, node.id, variables);
    });

    return Array.from(variables.values());
  }

  /**
   * Find variable references in config
   */
  private findVariableReferences(
    obj: any,
    nodeId: string,
    variables: Map<string, VariableDocumentation>,
    path: string = ''
  ): void {
    if (typeof obj === 'string') {
      // Match {{variableName}} or ${variableName}
      const matches = obj.matchAll(/\{\{([^}]+)\}\}|\$\{([^}]+)\}/g);
      for (const match of matches) {
        const varName = match[1] || match[2];
        if (varName) {
          const existing = variables.get(varName);
          if (existing) {
            if (!existing.usedIn.includes(nodeId)) {
              existing.usedIn.push(nodeId);
            }
          } else {
            variables.set(varName, {
              name: varName,
              type: 'unknown',
              scope: this.inferVariableScope(varName),
              usedIn: [nodeId],
            });
          }
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        this.findVariableReferences(value, nodeId, variables, path ? `${path}.${key}` : key);
      }
    }
  }

  /**
   * Calculate workflow statistics
   */
  private calculateStatistics(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    const nodesByCategory: Record<string, number> = {};

    nodes.forEach((node) => {
      const category = this.getNodeCategory(node.type);
      nodesByCategory[category] = (nodesByCategory[category] || 0) + 1;
    });

    const maxDepth = this.calculateMaxDepth(nodes, edges);

    return {
      totalNodes: nodes.length,
      nodesByCategory,
      totalConnections: edges.length,
      maxDepth,
    };
  }

  /**
   * Analyze workflow structure (branches, loops, entry/exit points)
   */
  private analyzeStructure(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    const entryPoints = this.findEntryPoints(nodes, edges);
    const exitPoints = this.findExitPoints(nodes, edges);
    const branches = this.findBranches(nodes, edges);
    const loops = this.findLoops(nodes, edges);

    return {
      entryPoints,
      exitPoints,
      branches,
      loops,
    };
  }

  /**
   * Find entry points (nodes with no inputs)
   */
  private findEntryPoints(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    return nodes
      .filter((node) => {
        const hasInputs = edges.some((e) => e.target === node.id);
        return !hasInputs || this.isTriggerNode(node.type);
      })
      .map((node) => node.id);
  }

  /**
   * Find exit points (nodes with no outputs)
   */
  private findExitPoints(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    return nodes
      .filter((node) => {
        const hasOutputs = edges.some((e) => e.source === node.id);
        return !hasOutputs;
      })
      .map((node) => node.id);
  }

  /**
   * Find conditional branches
   */
  private findBranches(nodes: WorkflowNode[], edges: WorkflowEdge[]): BranchInfo[] {
    const branches: BranchInfo[] = [];

    nodes.forEach((node) => {
      const outputs = edges.filter((e) => e.source === node.id);

      // If node has multiple outputs or is a conditional node
      if (outputs.length > 1 || this.isConditionalNode(node.type)) {
        const branchPaths = outputs.map((edge) => ({
          path: this.getPathFromNode(edge.target, nodes, edges),
          condition: edge.data?.condition,
        }));

        branches.push({
          id: `branch_${node.id}`,
          startNode: node.id,
          condition: node.data.config?.['condition'] as string | undefined,
          branches: branchPaths,
        });
      }
    });

    return branches;
  }

  /**
   * Find loops in workflow
   */
  private findLoops(nodes: WorkflowNode[], edges: WorkflowEdge[]): LoopInfo[] {
    const loops: LoopInfo[] = [];
    const visited = new Set<string>();

    const findCycle = (nodeId: string, path: string[], currentPath: Set<string>): void => {
      if (currentPath.has(nodeId)) {
        // Found a loop
        const loopStart = path.indexOf(nodeId);
        const loopPath = path.slice(loopStart);
        loops.push({
          id: `loop_${loops.length}`,
          startNode: nodeId,
          endNode: path[path.length - 1],
          path: loopPath,
        });
        return;
      }

      if (visited.has(nodeId)) return;

      currentPath.add(nodeId);
      path.push(nodeId);

      const outputs = edges.filter((e) => e.source === nodeId);
      outputs.forEach((edge) => {
        findCycle(edge.target, [...path], new Set(currentPath));
      });

      currentPath.delete(nodeId);
      visited.add(nodeId);
    };

    nodes.forEach((node) => {
      if (this.isTriggerNode(node.type)) {
        findCycle(node.id, [], new Set());
      }
    });

    return loops;
  }

  /**
   * Extract workflow dependencies
   */
  private extractDependencies(nodes: WorkflowNode[]) {
    const credentials = new Set<string>();
    const integrations = new Set<string>();
    const subWorkflows = new Set<string>();

    nodes.forEach((node) => {
      const config = node.data.config as Record<string, any>;

      // Extract credentials
      if (config?.credentialId) {
        credentials.add(config.credentialId as string);
      }

      // Extract integrations
      const integration = this.getIntegrationName(node.type);
      if (integration) {
        integrations.add(integration);
      }

      // Extract sub-workflows
      if (node.type === 'subworkflow' && config?.workflowId) {
        subWorkflows.add(config.workflowId as string);
      }
    });

    return {
      credentials: Array.from(credentials),
      integrations: Array.from(integrations),
      subWorkflows: Array.from(subWorkflows),
    };
  }

  /**
   * Calculate maximum workflow depth
   */
  private calculateMaxDepth(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    const entryPoints = this.findEntryPoints(nodes, edges);
    let maxDepth = 0;

    const calculateDepth = (nodeId: string, visited: Set<string>, depth: number): number => {
      if (visited.has(nodeId)) return depth;
      visited.add(nodeId);

      const outputs = edges.filter((e) => e.source === nodeId);
      if (outputs.length === 0) return depth;

      let childMaxDepth = depth;
      outputs.forEach((edge) => {
        const childDepth = calculateDepth(edge.target, new Set(visited), depth + 1);
        childMaxDepth = Math.max(childMaxDepth, childDepth);
      });

      return childMaxDepth;
    };

    entryPoints.forEach((entryId) => {
      const depth = calculateDepth(entryId, new Set(), 1);
      maxDepth = Math.max(maxDepth, depth);
    });

    return maxDepth;
  }

  /**
   * Get path from node to end
   */
  private getPathFromNode(nodeId: string, nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const path: string[] = [nodeId];
    const visited = new Set<string>([nodeId]);

    let current = nodeId;
    while (true) {
      const next = edges.find((e) => e.source === current && !visited.has(e.target));
      if (!next) break;

      path.push(next.target);
      visited.add(next.target);
      current = next.target;
    }

    return path;
  }

  /**
   * Helper: Get node category
   */
  private getNodeCategory(type: string): string {
    const categoryMap: Record<string, string> = {
      webhook: 'Triggers',
      schedule: 'Triggers',
      trigger: 'Triggers',
      http: 'Actions',
      email: 'Actions',
      slack: 'Actions',
      filter: 'Data Processing',
      transform: 'Data Processing',
      merge: 'Data Processing',
      split: 'Data Processing',
      delay: 'Flow Control',
      condition: 'Flow Control',
      switch: 'Flow Control',
    };

    return categoryMap[type.toLowerCase()] || 'Other';
  }

  /**
   * Helper: Get node description
   */
  private getNodeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      webhook: 'Receives HTTP webhook requests',
      schedule: 'Triggers on a schedule',
      http: 'Makes HTTP requests',
      email: 'Sends email messages',
      slack: 'Sends Slack messages',
      filter: 'Filters data based on conditions',
      transform: 'Transforms data structure',
      merge: 'Merges data from multiple sources',
      split: 'Splits data into multiple paths',
      delay: 'Delays execution',
      condition: 'Conditional branching',
      switch: 'Multi-way branching',
    };

    return descriptions[type.toLowerCase()] || `${type} node`;
  }

  /**
   * Helper: Get connection type
   */
  private getConnectionType(edge: WorkflowEdge): 'default' | 'error' | 'conditional' {
    if (edge.sourceHandle?.includes('error')) return 'error';
    if (edge.data?.condition) return 'conditional';
    return 'default';
  }

  /**
   * Helper: Check if node is a trigger
   */
  private isTriggerNode(type: string): boolean {
    const triggers = ['webhook', 'schedule', 'trigger', 'email-trigger', 'slack-trigger'];
    return triggers.includes(type.toLowerCase());
  }

  /**
   * Helper: Check if node is conditional
   */
  private isConditionalNode(type: string): boolean {
    const conditional = ['condition', 'if', 'switch', 'filter', 'router'];
    return conditional.includes(type.toLowerCase());
  }

  /**
   * Helper: Infer variable scope
   */
  private inferVariableScope(varName: string): 'workflow' | 'global' | 'environment' {
    if (varName.startsWith('env.')) return 'environment';
    if (varName.startsWith('global.')) return 'global';
    return 'workflow';
  }

  /**
   * Helper: Get integration name from node type
   */
  private getIntegrationName(type: string): string | null {
    const integrations = [
      'slack',
      'email',
      'http',
      'mongodb',
      'mysql',
      'postgres',
      'redis',
      'salesforce',
      'hubspot',
      'stripe',
      'twilio',
      'sendgrid',
      'aws',
      'gcp',
      'azure',
    ];

    const typeLower = type.toLowerCase();
    return integrations.find((int) => typeLower.includes(int)) || null;
  }
}

export default WorkflowAnalyzer;
