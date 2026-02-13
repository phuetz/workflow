/**
 * N8n Format Adapter
 * Handles conversion between internal format and n8n format
 */

import type { WorkflowExport, WorkflowNode, WorkflowEdge, FormatConverter } from './types';

// n8n specific types
interface N8nNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, unknown>;
}

interface N8nConnection {
  node: string;
  type: string;
  index: number;
}

interface N8nConnectionMap {
  main: N8nConnection[][];
}

interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, N8nConnectionMap>;
  settings: Record<string, unknown>;
  staticData: unknown;
}

export class N8nAdapter {
  /**
   * Creates the n8n format converter
   */
  createConverter(): FormatConverter {
    return {
      fromFormat: 'json',
      toFormat: 'n8n',
      convert: (data) => this.convertToN8nFormat(data as WorkflowExport),
      validate: (data) => this.validateN8nFormat(data)
    };
  }

  /**
   * Creates the n8n to JSON converter
   */
  createReverseConverter(): FormatConverter {
    return {
      fromFormat: 'n8n',
      toFormat: 'json',
      convert: (data) => this.convertFromN8nFormat(data as N8nWorkflow),
      validate: (data) => this.validateN8nFormat(data)
    };
  }

  /**
   * Converts internal workflow format to n8n format
   */
  convertToN8nFormat(workflow: WorkflowExport): N8nWorkflow {
    return {
      name: workflow.name,
      nodes: workflow.nodes.map(node => ({
        id: node.id,
        name: node.data.label || node.type,
        type: `n8n-nodes-base.${node.type}`,
        position: [node.position.x, node.position.y],
        parameters: node.data as Record<string, unknown>
      })),
      connections: this.convertEdgesToN8nConnections(workflow.edges),
      settings: {},
      staticData: null
    };
  }

  /**
   * Converts n8n format to internal workflow format
   */
  convertFromN8nFormat(n8nWorkflow: N8nWorkflow): WorkflowExport {
    const nodes: WorkflowNode[] = n8nWorkflow.nodes.map(n8nNode => ({
      id: n8nNode.id,
      type: this.stripN8nPrefix(n8nNode.type),
      position: { x: n8nNode.position[0], y: n8nNode.position[1] },
      data: {
        label: n8nNode.name,
        ...n8nNode.parameters
      }
    }));

    const edges = this.convertN8nConnectionsToEdges(n8nWorkflow.connections);

    return {
      id: `imported-${Date.now()}`,
      name: n8nWorkflow.name,
      description: '',
      version: '1.0.0',
      exportedAt: new Date(),
      exportedBy: 'n8n-import',
      format: 'json',
      metadata: {
        workflowId: '',
        executionId: '',
        startTime: new Date()
      },
      nodes,
      edges,
      checksum: ''
    };
  }

  /**
   * Validates n8n format
   */
  validateN8nFormat(data: unknown): boolean {
    const obj = data as { nodes?: unknown; connections?: unknown };
    return !!(obj && obj.nodes && obj.connections);
  }

  /**
   * Converts edges to n8n connections format
   */
  private convertEdgesToN8nConnections(edges: WorkflowEdge[]): Record<string, N8nConnectionMap> {
    const connections: Record<string, N8nConnectionMap> = {};

    edges.forEach(edge => {
      if (!connections[edge.source]) {
        connections[edge.source] = { main: [[]] };
      }
      connections[edge.source].main[0].push({
        node: edge.target,
        type: 'main',
        index: 0
      });
    });

    return connections;
  }

  /**
   * Converts n8n connections to edges
   */
  private convertN8nConnectionsToEdges(connections: Record<string, N8nConnectionMap>): WorkflowEdge[] {
    const edges: WorkflowEdge[] = [];

    for (const [sourceId, connectionMap] of Object.entries(connections)) {
      if (connectionMap.main) {
        for (const outputConnections of connectionMap.main) {
          for (const connection of outputConnections) {
            edges.push({
              id: `${sourceId}-${connection.node}`,
              source: sourceId,
              target: connection.node,
              sourceHandle: 'output',
              targetHandle: 'input'
            });
          }
        }
      }
    }

    return edges;
  }

  /**
   * Strips the n8n node type prefix
   */
  private stripN8nPrefix(type: string): string {
    return type.replace(/^n8n-nodes-base\./, '');
  }
}

export const n8nAdapter = new N8nAdapter();
