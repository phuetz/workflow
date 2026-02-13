/**
 * Workflow MCP Tools
 * Expose workflow operations as MCP tools
 */

import type {
  MCPTool,
  MCPToolDefinition,
  MCPToolCallResult,
  MCPToolSchema,
} from '../../types/mcp';
import type { WorkflowNode, WorkflowEdge } from '../../types/workflow';

export interface WorkflowToolsConfig {
  getWorkflows: () => Promise<Array<{ id: string; name: string; nodes: WorkflowNode[]; edges: WorkflowEdge[] }>>;
  getWorkflow: (id: string) => Promise<{ id: string; name: string; nodes: WorkflowNode[]; edges: WorkflowEdge[] } | null>;
  createWorkflow: (name: string, nodes?: WorkflowNode[], edges?: WorkflowEdge[]) => Promise<string>;
  updateWorkflow: (id: string, updates: Partial<{ name: string; nodes: WorkflowNode[]; edges: WorkflowEdge[] }>) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  validateWorkflow: (id: string) => Promise<{ valid: boolean; errors: string[] }>;
}

export class WorkflowTools {
  private config: WorkflowToolsConfig;

  constructor(config: WorkflowToolsConfig) {
    this.config = config;
  }

  /**
   * Get all workflow tools
   */
  getTools(): MCPToolDefinition[] {
    return [
      this.createListWorkflowsTool(),
      this.createGetWorkflowTool(),
      this.createCreateWorkflowTool(),
      this.createUpdateWorkflowTool(),
      this.createDeleteWorkflowTool(),
      this.createValidateWorkflowTool(),
      this.createAddNodeTool(),
      this.createRemoveNodeTool(),
      this.createConnectNodesTool(),
      this.createDisconnectNodesTool(),
    ];
  }

  /**
   * List all workflows tool
   */
  private createListWorkflowsTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'list_workflows',
      description: 'List all available workflows',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };

    const handler = async (): Promise<MCPToolCallResult> => {
      try {
        const workflows = await this.config.getWorkflows();
        const summary = workflows.map((w) => ({
          id: w.id,
          name: w.name,
          nodeCount: w.nodes.length,
          edgeCount: w.edges.length,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing workflows: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * Get workflow details tool
   */
  private createGetWorkflowTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'get_workflow',
      description: 'Get details of a specific workflow',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'The ID of the workflow to retrieve',
            required: true,
          },
        },
        required: ['workflowId'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        const workflow = await this.config.getWorkflow(params.workflowId as string);

        if (!workflow) {
          return {
            content: [
              {
                type: 'text',
                text: `Workflow not found: ${params.workflowId}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(workflow, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting workflow: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * Create workflow tool
   */
  private createCreateWorkflowTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'create_workflow',
      description: 'Create a new workflow',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the workflow',
            required: true,
          },
          nodes: {
            type: 'array',
            description: 'Initial nodes (optional)',
          },
          edges: {
            type: 'array',
            description: 'Initial edges (optional)',
          },
        },
        required: ['name'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        const workflowId = await this.config.createWorkflow(
          params.name as string,
          params.nodes as WorkflowNode[] | undefined,
          params.edges as WorkflowEdge[] | undefined
        );

        return {
          content: [
            {
              type: 'text',
              text: `Workflow created successfully with ID: ${workflowId}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating workflow: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * Update workflow tool
   */
  private createUpdateWorkflowTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'update_workflow',
      description: 'Update an existing workflow',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'The ID of the workflow to update',
            required: true,
          },
          name: {
            type: 'string',
            description: 'New name for the workflow (optional)',
          },
          nodes: {
            type: 'array',
            description: 'Updated nodes (optional)',
          },
          edges: {
            type: 'array',
            description: 'Updated edges (optional)',
          },
        },
        required: ['workflowId'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        const updates: Partial<{ name: string; nodes: WorkflowNode[]; edges: WorkflowEdge[] }> = {};

        if (params.name) updates.name = params.name as string;
        if (params.nodes) updates.nodes = params.nodes as WorkflowNode[];
        if (params.edges) updates.edges = params.edges as WorkflowEdge[];

        await this.config.updateWorkflow(params.workflowId as string, updates);

        return {
          content: [
            {
              type: 'text',
              text: 'Workflow updated successfully',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error updating workflow: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * Delete workflow tool
   */
  private createDeleteWorkflowTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'delete_workflow',
      description: 'Delete a workflow',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'The ID of the workflow to delete',
            required: true,
          },
        },
        required: ['workflowId'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        await this.config.deleteWorkflow(params.workflowId as string);

        return {
          content: [
            {
              type: 'text',
              text: 'Workflow deleted successfully',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting workflow: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * Validate workflow tool
   */
  private createValidateWorkflowTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'validate_workflow',
      description: 'Validate a workflow for errors',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'The ID of the workflow to validate',
            required: true,
          },
        },
        required: ['workflowId'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        const result = await this.config.validateWorkflow(params.workflowId as string);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          isError: !result.valid,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error validating workflow: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * Add node to workflow tool
   */
  private createAddNodeTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'add_node',
      description: 'Add a new node to a workflow',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'The ID of the workflow',
            required: true,
          },
          nodeType: {
            type: 'string',
            description: 'The type of node to add',
            required: true,
          },
          label: {
            type: 'string',
            description: 'The label for the node',
            required: true,
          },
          position: {
            type: 'object',
            description: 'The position of the node (x, y)',
            required: true,
          },
          config: {
            type: 'object',
            description: 'Node configuration (optional)',
          },
        },
        required: ['workflowId', 'nodeType', 'label', 'position'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        const workflow = await this.config.getWorkflow(params.workflowId as string);
        if (!workflow) {
          return {
            content: [{ type: 'text', text: 'Workflow not found' }],
            isError: true,
          };
        }

        const newNode: WorkflowNode = {
          id: `node-${Date.now()}`,
          type: params.nodeType as string,
          position: params.position as { x: number; y: number },
          data: {
            id: `node-${Date.now()}`,
            type: params.nodeType as string,
            label: params.label as string,
            position: params.position as { x: number; y: number },
            icon: 'cube',
            color: '#3b82f6',
            inputs: 1,
            outputs: 1,
            config: params.config as Record<string, unknown> | undefined,
          },
        };

        await this.config.updateWorkflow(params.workflowId as string, {
          nodes: [...workflow.nodes, newNode],
        });

        return {
          content: [
            {
              type: 'text',
              text: `Node added successfully with ID: ${newNode.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error adding node: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * Remove node from workflow tool
   */
  private createRemoveNodeTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'remove_node',
      description: 'Remove a node from a workflow',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'The ID of the workflow',
            required: true,
          },
          nodeId: {
            type: 'string',
            description: 'The ID of the node to remove',
            required: true,
          },
        },
        required: ['workflowId', 'nodeId'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        const workflow = await this.config.getWorkflow(params.workflowId as string);
        if (!workflow) {
          return {
            content: [{ type: 'text', text: 'Workflow not found' }],
            isError: true,
          };
        }

        const updatedNodes = workflow.nodes.filter((n) => n.id !== params.nodeId);
        const updatedEdges = workflow.edges.filter(
          (e) => e.source !== params.nodeId && e.target !== params.nodeId
        );

        await this.config.updateWorkflow(params.workflowId as string, {
          nodes: updatedNodes,
          edges: updatedEdges,
        });

        return {
          content: [
            {
              type: 'text',
              text: 'Node removed successfully',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error removing node: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * Connect nodes tool
   */
  private createConnectNodesTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'connect_nodes',
      description: 'Connect two nodes in a workflow',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'The ID of the workflow',
            required: true,
          },
          sourceNodeId: {
            type: 'string',
            description: 'The ID of the source node',
            required: true,
          },
          targetNodeId: {
            type: 'string',
            description: 'The ID of the target node',
            required: true,
          },
        },
        required: ['workflowId', 'sourceNodeId', 'targetNodeId'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        const workflow = await this.config.getWorkflow(params.workflowId as string);
        if (!workflow) {
          return {
            content: [{ type: 'text', text: 'Workflow not found' }],
            isError: true,
          };
        }

        const newEdge: WorkflowEdge = {
          id: `edge-${Date.now()}`,
          source: params.sourceNodeId as string,
          target: params.targetNodeId as string,
        };

        await this.config.updateWorkflow(params.workflowId as string, {
          edges: [...workflow.edges, newEdge],
        });

        return {
          content: [
            {
              type: 'text',
              text: `Nodes connected successfully with edge ID: ${newEdge.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error connecting nodes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * Disconnect nodes tool
   */
  private createDisconnectNodesTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'disconnect_nodes',
      description: 'Disconnect two nodes in a workflow',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'The ID of the workflow',
            required: true,
          },
          edgeId: {
            type: 'string',
            description: 'The ID of the edge to remove',
            required: true,
          },
        },
        required: ['workflowId', 'edgeId'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        const workflow = await this.config.getWorkflow(params.workflowId as string);
        if (!workflow) {
          return {
            content: [{ type: 'text', text: 'Workflow not found' }],
            isError: true,
          };
        }

        const updatedEdges = workflow.edges.filter((e) => e.id !== params.edgeId);

        await this.config.updateWorkflow(params.workflowId as string, {
          edges: updatedEdges,
        });

        return {
          content: [
            {
              type: 'text',
              text: 'Nodes disconnected successfully',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error disconnecting nodes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }
}
