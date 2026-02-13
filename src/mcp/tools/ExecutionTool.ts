/**
 * Execution Control MCP Tools
 * Expose workflow execution operations as MCP tools
 */

import type {
  MCPTool,
  MCPToolDefinition,
  MCPToolCallResult,
} from '../../types/mcp';
import type { ExecutionStatus } from '../../types/workflow';

export interface ExecutionToolsConfig {
  executeWorkflow: (workflowId: string, input?: Record<string, unknown>) => Promise<string>;
  getExecutionStatus: (executionId: string) => Promise<ExecutionStatus[]>;
  stopExecution: (executionId: string) => Promise<void>;
  getExecutionHistory: (workflowId: string, limit?: number) => Promise<Array<{
    id: string;
    timestamp: string;
    status: string;
    duration: number;
  }>>;
  getExecutionLogs: (executionId: string) => Promise<string[]>;
}

export class ExecutionTools {
  private config: ExecutionToolsConfig;

  constructor(config: ExecutionToolsConfig) {
    this.config = config;
  }

  /**
   * Get all execution tools
   */
  getTools(): MCPToolDefinition[] {
    return [
      this.createExecuteWorkflowTool(),
      this.createGetExecutionStatusTool(),
      this.createStopExecutionTool(),
      this.createGetExecutionHistoryTool(),
      this.createGetExecutionLogsTool(),
    ];
  }

  /**
   * Execute workflow tool
   */
  private createExecuteWorkflowTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'execute_workflow',
      description: 'Execute a workflow with optional input data',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'The ID of the workflow to execute',
            required: true,
          },
          input: {
            type: 'object',
            description: 'Input data for the workflow (optional)',
          },
        },
        required: ['workflowId'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        const executionId = await this.config.executeWorkflow(
          params.workflowId as string,
          params.input as Record<string, unknown> | undefined
        );

        return {
          content: [
            {
              type: 'text',
              text: `Workflow execution started with ID: ${executionId}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing workflow: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * Get execution status tool
   */
  private createGetExecutionStatusTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'get_execution_status',
      description: 'Get the status of a workflow execution',
      inputSchema: {
        type: 'object',
        properties: {
          executionId: {
            type: 'string',
            description: 'The ID of the execution',
            required: true,
          },
        },
        required: ['executionId'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        const status = await this.config.getExecutionStatus(params.executionId as string);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting execution status: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * Stop execution tool
   */
  private createStopExecutionTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'stop_execution',
      description: 'Stop a running workflow execution',
      inputSchema: {
        type: 'object',
        properties: {
          executionId: {
            type: 'string',
            description: 'The ID of the execution to stop',
            required: true,
          },
        },
        required: ['executionId'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        await this.config.stopExecution(params.executionId as string);

        return {
          content: [
            {
              type: 'text',
              text: 'Execution stopped successfully',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error stopping execution: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * Get execution history tool
   */
  private createGetExecutionHistoryTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'get_execution_history',
      description: 'Get execution history for a workflow',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'The ID of the workflow',
            required: true,
          },
          limit: {
            type: 'number',
            description: 'Maximum number of executions to return (default: 10)',
          },
        },
        required: ['workflowId'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        const history = await this.config.getExecutionHistory(
          params.workflowId as string,
          params.limit as number | undefined
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(history, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting execution history: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * Get execution logs tool
   */
  private createGetExecutionLogsTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'get_execution_logs',
      description: 'Get logs for a workflow execution',
      inputSchema: {
        type: 'object',
        properties: {
          executionId: {
            type: 'string',
            description: 'The ID of the execution',
            required: true,
          },
        },
        required: ['executionId'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        const logs = await this.config.getExecutionLogs(params.executionId as string);

        return {
          content: [
            {
              type: 'text',
              text: logs.join('\n'),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting execution logs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }
}
