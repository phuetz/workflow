/**
 * MCP Tool Registry
 * Manages registration and execution of MCP tools
 */

import type {
  MCPTool,
  MCPToolDefinition,
  MCPToolRegistryConfig,
  MCPToolCallResult,
  MCPToolSchema,
} from '../types/mcp';
import { logger } from '../services/SimpleLogger';

export class MCPToolRegistry {
  private config: MCPToolRegistryConfig;
  private tools = new Map<string, MCPToolDefinition>();
  private executionStats = new Map<string, { calls: number; errors: number; totalTime: number }>();

  constructor(config: MCPToolRegistryConfig) {
    this.config = {
      namespace: '',
      versioning: false,
      validation: true,
      monitoring: true,
      ...config,
    };
  }

  /**
   * Register a tool
   */
  registerTool(definition: MCPToolDefinition): void {
    const toolName = this.getToolName(definition.tool.name, definition.version);

    // Validate tool definition
    if (this.config.validation) {
      this.validateToolDefinition(definition);
    }

    // Check for duplicates
    if (this.tools.has(toolName)) {
      throw new Error(`Tool already registered: ${toolName}`);
    }

    this.tools.set(toolName, definition);

    // Initialize stats
    if (this.config.monitoring) {
      this.executionStats.set(toolName, { calls: 0, errors: 0, totalTime: 0 });
    }
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string, version?: string): void {
    const toolName = this.getToolName(name, version);

    if (!this.tools.has(toolName)) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    this.tools.delete(toolName);
    this.executionStats.delete(toolName);
  }

  /**
   * Get a tool definition
   */
  getTool(name: string, version?: string): MCPToolDefinition | undefined {
    const toolName = this.getToolName(name, version);
    return this.tools.get(toolName);
  }

  /**
   * List all tools
   */
  listTools(): MCPTool[] {
    return Array.from(this.tools.values())
      .filter((def) => !def.deprecated)
      .map((def) => def.tool);
  }

  /**
   * Execute a tool
   */
  async executeTool(name: string, args: Record<string, unknown>): Promise<MCPToolCallResult> {
    const toolName = this.getToolName(name);
    const definition = this.tools.get(toolName);

    if (!definition) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool not found: ${name}`,
          },
        ],
        isError: true,
      };
    }

    // Check if deprecated
    if (definition.deprecated) {
      logger.warn(`Tool is deprecated: ${name}`);
    }

    // Validate arguments
    if (this.config.validation) {
      const validation = this.validateArguments(definition.tool.inputSchema, args);
      if (!validation.valid) {
        return {
          content: [
            {
              type: 'text',
              text: `Invalid arguments: ${validation.errors?.join(', ')}`,
            },
          ],
          isError: true,
        };
      }
    }

    // Execute tool
    const startTime = Date.now();
    try {
      const result = await definition.handler(args);

      // Update stats
      if (this.config.monitoring) {
        const stats = this.executionStats.get(toolName);
        if (stats) {
          stats.calls++;
          stats.totalTime += Date.now() - startTime;
        }
      }

      return result;
    } catch (error) {
      // Update error stats
      if (this.config.monitoring) {
        const stats = this.executionStats.get(toolName);
        if (stats) {
          stats.errors++;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `Tool execution error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Validate tool definition
   */
  private validateToolDefinition(definition: MCPToolDefinition): void {
    if (!definition.tool.name) {
      throw new Error('Tool name is required');
    }

    if (!definition.tool.description) {
      throw new Error('Tool description is required');
    }

    if (!definition.tool.inputSchema) {
      throw new Error('Tool input schema is required');
    }

    if (!definition.handler) {
      throw new Error('Tool handler is required');
    }

    if (typeof definition.handler !== 'function') {
      throw new Error('Tool handler must be a function');
    }

    // Validate schema structure
    if (definition.tool.inputSchema.type !== 'object') {
      throw new Error('Input schema type must be "object"');
    }

    if (!definition.tool.inputSchema.properties) {
      throw new Error('Input schema must have properties');
    }
  }

  /**
   * Validate tool arguments against schema
   */
  private validateArguments(
    schema: MCPToolSchema,
    args: Record<string, unknown>
  ): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Check required properties
    if (schema.required) {
      for (const required of schema.required) {
        if (!(required in args)) {
          errors.push(`Missing required argument: ${required}`);
        }
      }
    }

    // Validate each argument
    for (const [key, value] of Object.entries(args)) {
      const propSchema = schema.properties[key];
      if (!propSchema) {
        errors.push(`Unknown argument: ${key}`);
        continue;
      }

      // Type validation
      const valueType = Array.isArray(value) ? 'array' : typeof value;
      if (propSchema.type !== valueType) {
        errors.push(`Invalid type for ${key}: expected ${propSchema.type}, got ${valueType}`);
      }

      // Enum validation
      if (propSchema.enum && !propSchema.enum.includes(value as string)) {
        errors.push(`Invalid value for ${key}: must be one of ${propSchema.enum.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get tool name with namespace and version
   */
  private getToolName(name: string, version?: string): string {
    let toolName = name;

    if (this.config.namespace) {
      toolName = `${this.config.namespace}.${name}`;
    }

    if (this.config.versioning && version) {
      toolName = `${toolName}@${version}`;
    }

    return toolName;
  }

  /**
   * Get execution statistics
   */
  getStats(name?: string): Record<string, { calls: number; errors: number; avgTime: number }> {
    const stats: Record<string, { calls: number; errors: number; avgTime: number }> = {};

    for (const [toolName, toolStats] of this.executionStats.entries()) {
      if (name && !toolName.includes(name)) continue;

      stats[toolName] = {
        calls: toolStats.calls,
        errors: toolStats.errors,
        avgTime: toolStats.calls > 0 ? toolStats.totalTime / toolStats.calls : 0,
      };
    }

    return stats;
  }

  /**
   * Search tools by tag
   */
  searchByTag(tag: string): MCPTool[] {
    return Array.from(this.tools.values())
      .filter((def) => def.tags?.includes(tag) && !def.deprecated)
      .map((def) => def.tool);
  }

  /**
   * Search tools by name pattern
   */
  searchByName(pattern: string): MCPTool[] {
    const regex = new RegExp(pattern, 'i');
    return Array.from(this.tools.values())
      .filter((def) => regex.test(def.tool.name) && !def.deprecated)
      .map((def) => def.tool);
  }

  /**
   * Get tool metadata
   */
  getMetadata(name: string, version?: string): Record<string, unknown> | undefined {
    const toolName = this.getToolName(name, version);
    const definition = this.tools.get(toolName);
    return definition?.metadata;
  }

  /**
   * Update tool metadata
   */
  updateMetadata(name: string, metadata: Record<string, unknown>, version?: string): void {
    const toolName = this.getToolName(name, version);
    const definition = this.tools.get(toolName);

    if (!definition) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    definition.metadata = { ...definition.metadata, ...metadata };
  }

  /**
   * Mark tool as deprecated
   */
  deprecateTool(name: string, version?: string): void {
    const toolName = this.getToolName(name, version);
    const definition = this.tools.get(toolName);

    if (!definition) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    definition.deprecated = true;
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
    this.executionStats.clear();
  }

  /**
   * Get tool count
   */
  count(): number {
    return this.tools.size;
  }

  /**
   * Check if tool exists
   */
  has(name: string, version?: string): boolean {
    const toolName = this.getToolName(name, version);
    return this.tools.has(toolName);
  }

  /**
   * Get configuration
   */
  getConfig(): MCPToolRegistryConfig {
    return { ...this.config };
  }
}
