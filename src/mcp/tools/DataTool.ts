/**
 * Data Access MCP Tools
 * Expose data operations as MCP tools
 */

import type {
  MCPTool,
  MCPToolDefinition,
  MCPToolCallResult,
} from '../../types/mcp';

export interface DataToolsConfig {
  getData: (key: string) => Promise<unknown>;
  setData: (key: string, value: unknown) => Promise<void>;
  deleteData: (key: string) => Promise<void>;
  listKeys: (prefix?: string) => Promise<string[]>;
  query: (filter: Record<string, unknown>) => Promise<unknown[]>;
}

export class DataTools {
  private config: DataToolsConfig;

  constructor(config: DataToolsConfig) {
    this.config = config;
  }

  /**
   * Get all data tools
   */
  getTools(): MCPToolDefinition[] {
    return [
      this.createGetDataTool(),
      this.createSetDataTool(),
      this.createDeleteDataTool(),
      this.createListKeysTool(),
      this.createQueryDataTool(),
    ];
  }

  /**
   * Get data tool
   */
  private createGetDataTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'get_data',
      description: 'Retrieve data by key',
      inputSchema: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'The key of the data to retrieve',
            required: true,
          },
        },
        required: ['key'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        const data = await this.config.getData(params.key as string);

        if (data === undefined || data === null) {
          return {
            content: [
              {
                type: 'text',
                text: `No data found for key: ${params.key}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting data: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * Set data tool
   */
  private createSetDataTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'set_data',
      description: 'Store data with a key',
      inputSchema: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'The key to store the data under',
            required: true,
          },
          value: {
            type: 'object',
            description: 'The data to store',
            required: true,
          },
        },
        required: ['key', 'value'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        await this.config.setData(params.key as string, params.value);

        return {
          content: [
            {
              type: 'text',
              text: `Data stored successfully under key: ${params.key}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error setting data: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * Delete data tool
   */
  private createDeleteDataTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'delete_data',
      description: 'Delete data by key',
      inputSchema: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'The key of the data to delete',
            required: true,
          },
        },
        required: ['key'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        await this.config.deleteData(params.key as string);

        return {
          content: [
            {
              type: 'text',
              text: `Data deleted successfully for key: ${params.key}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting data: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * List keys tool
   */
  private createListKeysTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'list_keys',
      description: 'List all data keys, optionally filtered by prefix',
      inputSchema: {
        type: 'object',
        properties: {
          prefix: {
            type: 'string',
            description: 'Optional prefix to filter keys',
          },
        },
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        const keys = await this.config.listKeys(params.prefix as string | undefined);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(keys, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing keys: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }

  /**
   * Query data tool
   */
  private createQueryDataTool(): MCPToolDefinition {
    const tool: MCPTool = {
      name: 'query_data',
      description: 'Query data using filters',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'object',
            description: 'Filter criteria as key-value pairs',
            required: true,
          },
        },
        required: ['filter'],
      },
    };

    const handler = async (params: Record<string, unknown>): Promise<MCPToolCallResult> => {
      try {
        const results = await this.config.query(params.filter as Record<string, unknown>);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error querying data: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };

    return { tool, handler };
  }
}
