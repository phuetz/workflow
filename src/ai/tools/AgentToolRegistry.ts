import { AgentTool, ToolCall, AgentError } from '../../types/agents';
import { logger } from '../../services/SimpleLogger';

/**
 * Agent Tool Registry - Manages available tools for agent execution
 * Provides registration, discovery, and execution of tools
 */
export class AgentToolRegistry {
  private tools: Map<string, AgentTool> = new Map();
  private toolsByCategory: Map<string, Set<string>> = new Map();
  private executors: Map<string, ToolExecutor> = new Map();
  private usageStats: Map<string, ToolStats> = new Map();

  constructor() {
    logger.info('AgentToolRegistry initialized');
  }

  /**
   * Register a tool
   */
  register(tool: AgentTool, executor: ToolExecutor): void {
    if (this.tools.has(tool.id)) {
      logger.warn(`Tool ${tool.id} already registered, overwriting`);
    }

    this.tools.set(tool.id, tool);
    this.executors.set(tool.id, executor);

    // Index by category
    const categorySet = this.toolsByCategory.get(tool.category) || new Set();
    categorySet.add(tool.id);
    this.toolsByCategory.set(tool.category, categorySet);

    // Initialize stats
    this.usageStats.set(tool.id, {
      callCount: 0,
      successCount: 0,
      errorCount: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      lastUsed: null,
    });

    logger.debug(`Registered tool: ${tool.name} (${tool.id})`);
  }

  /**
   * Unregister a tool
   */
  unregister(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return false;
    }

    this.tools.delete(toolId);
    this.executors.delete(toolId);
    this.usageStats.delete(toolId);

    // Remove from category index
    const categorySet = this.toolsByCategory.get(tool.category);
    if (categorySet) {
      categorySet.delete(toolId);
      if (categorySet.size === 0) {
        this.toolsByCategory.delete(tool.category);
      }
    }

    logger.debug(`Unregistered tool: ${toolId}`);
    return true;
  }

  /**
   * Get a tool by ID
   */
  getTool(toolId: string): AgentTool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Get all tools
   */
  getAllTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Find tools by category
   */
  findByCategory(category: AgentTool['category']): AgentTool[] {
    const toolIds = this.toolsByCategory.get(category) || new Set();
    return Array.from(toolIds)
      .map(id => this.tools.get(id))
      .filter((tool): tool is AgentTool => tool !== undefined);
  }

  /**
   * Search tools by name or description
   */
  search(query: string): AgentTool[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.tools.values()).filter(
      tool =>
        tool.name.toLowerCase().includes(searchTerm) ||
        tool.description.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Execute a tool
   */
  async execute(toolCall: Omit<ToolCall, 'result' | 'error' | 'executionTime' | 'timestamp'>): Promise<ToolCall> {
    const startTime = Date.now();
    const tool = this.tools.get(toolCall.toolId);

    if (!tool) {
      const error: AgentError = {
        code: 'TOOL_NOT_FOUND',
        message: `Tool ${toolCall.toolId} not found`,
        recoverable: false,
        timestamp: new Date().toISOString(),
      };

      return {
        ...toolCall,
        error,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    const executor = this.executors.get(toolCall.toolId);
    if (!executor) {
      const error: AgentError = {
        code: 'EXECUTOR_NOT_FOUND',
        message: `Executor for tool ${toolCall.toolId} not found`,
        recoverable: false,
        timestamp: new Date().toISOString(),
      };

      return {
        ...toolCall,
        error,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Validate parameters
      this.validateParameters(tool, toolCall.parameters);

      // Execute tool
      const result = await executor(toolCall.parameters);

      // Update stats
      const executionTime = Date.now() - startTime;
      this.updateStats(toolCall.toolId, true, executionTime);

      logger.debug(`Tool ${tool.name} executed successfully in ${executionTime}ms`);

      return {
        ...toolCall,
        result,
        executionTime,
        cost: tool.cost,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateStats(toolCall.toolId, false, executionTime);

      const agentError: AgentError = {
        code: 'TOOL_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
        recoverable: true,
        timestamp: new Date().toISOString(),
      };

      logger.error(`Tool ${tool.name} execution failed:`, error);

      return {
        ...toolCall,
        error: agentError,
        executionTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Validate tool parameters
   */
  private validateParameters(tool: AgentTool, parameters: Record<string, unknown>): void {
    for (const param of tool.parameters) {
      const value = parameters[param.name];

      // Check required parameters
      if (param.required && (value === undefined || value === null)) {
        throw new Error(`Required parameter '${param.name}' is missing`);
      }

      // Validate with custom validation if provided
      if (value !== undefined && param.validation?.custom) {
        if (!param.validation.custom(value)) {
          throw new Error(`Parameter '${param.name}' failed custom validation`);
        }
      }

      // Type-based validation
      if (value !== undefined) {
        this.validateParameterType(param.name, value, param.type, param.validation);
      }
    }
  }

  /**
   * Validate parameter type and constraints
   */
  private validateParameterType(
    name: string,
    value: unknown,
    type: string,
    validation?: AgentTool['parameters'][0]['validation']
  ): void {
    // Basic type checking
    const actualType = typeof value;
    if (actualType !== type && type !== 'any') {
      throw new Error(`Parameter '${name}' must be of type ${type}, got ${actualType}`);
    }

    if (!validation) return;

    // Numeric validations
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        throw new Error(`Parameter '${name}' must be >= ${validation.min}`);
      }
      if (validation.max !== undefined && value > validation.max) {
        throw new Error(`Parameter '${name}' must be <= ${validation.max}`);
      }
    }

    // String validations
    if (typeof value === 'string') {
      if (validation.minLength !== undefined && value.length < validation.minLength) {
        throw new Error(`Parameter '${name}' must have length >= ${validation.minLength}`);
      }
      if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        throw new Error(`Parameter '${name}' must have length <= ${validation.maxLength}`);
      }
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          throw new Error(`Parameter '${name}' does not match required pattern`);
        }
      }
    }
  }

  /**
   * Update usage statistics
   */
  private updateStats(toolId: string, success: boolean, executionTime: number): void {
    const stats = this.usageStats.get(toolId);
    if (!stats) return;

    stats.callCount++;
    if (success) {
      stats.successCount++;
    } else {
      stats.errorCount++;
    }

    stats.totalExecutionTime += executionTime;
    stats.averageExecutionTime = stats.totalExecutionTime / stats.callCount;
    stats.lastUsed = new Date().toISOString();

    this.usageStats.set(toolId, stats);
  }

  /**
   * Get tool statistics
   */
  getStats(toolId?: string): Map<string, ToolStats> | ToolStats | undefined {
    if (toolId) {
      return this.usageStats.get(toolId);
    }
    return new Map(this.usageStats);
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): {
    totalTools: number;
    toolsByCategory: Record<string, number>;
    mostUsedTools: Array<{ toolId: string; callCount: number }>;
  } {
    const toolsByCategory: Record<string, number> = {};

    for (const [category, toolIds] of this.toolsByCategory.entries()) {
      toolsByCategory[category] = toolIds.size;
    }

    const mostUsedTools = Array.from(this.usageStats.entries())
      .map(([toolId, stats]) => ({ toolId, callCount: stats.callCount }))
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, 10);

    return {
      totalTools: this.tools.size,
      toolsByCategory,
      mostUsedTools,
    };
  }

  /**
   * Clear all tools
   */
  clearAll(): void {
    this.tools.clear();
    this.toolsByCategory.clear();
    this.executors.clear();
    this.usageStats.clear();
    logger.info('All tools cleared from registry');
  }
}

// Types
type ToolExecutor = (parameters: Record<string, unknown>) => Promise<unknown>;

interface ToolStats {
  callCount: number;
  successCount: number;
  errorCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  lastUsed: string | null;
}
