import {
  Agent,
  AgentTask,
  AgentInput,
  AgentOutput,
  AgentTool,
  ToolParameter,
  ToolReturn,
  ToolCall,
  TaskPriority,
} from '../../types/agents';
import { AgentBase } from './AgentBase';
import { logger } from '../../services/SimpleLogger';

/**
 * AgentTool - Wraps an agent as an executable tool
 * Allows agents to use other agents as tools for autonomous delegation
 */
export class AgentToolWrapper implements AgentTool {
  id: string;
  name: string;
  description: string;
  type: 'custom';
  category: 'ai-ml';
  parameters: ToolParameter[];
  returns: ToolReturn;
  examples?: never[];
  permissions?: string[];
  cost?: number;
  metadata: Record<string, unknown>;

  private agent: AgentBase;
  private executionCount = 0;
  private totalExecutionTime = 0;
  private successCount = 0;
  private failureCount = 0;

  constructor(agent: AgentBase, config?: AgentToolConfig) {
    this.agent = agent;
    this.id = `agent-tool-${agent.id}`;
    this.name = config?.name || `${agent.name}-tool`;
    this.description = config?.description ||
      `Execute ${agent.name}: ${agent.description}`;
    this.type = 'custom';
    this.category = 'ai-ml';

    // Generate parameters based on agent capabilities
    this.parameters = this.generateParameters(agent, config?.parameters);

    this.returns = {
      type: 'object',
      description: 'Agent execution result',
      schema: {
        result: { type: 'any', description: 'The execution result' },
        confidence: { type: 'number', description: 'Confidence score (0-1)' },
        reasoning: { type: 'string', description: 'Reasoning behind the result' },
        metadata: { type: 'object', description: 'Additional metadata' },
      },
    };

    this.permissions = config?.permissions || ['agent:execute'];
    this.cost = config?.cost || 0;
    this.metadata = {
      agentId: agent.id,
      agentType: agent.type,
      capabilities: agent.capabilities,
      version: agent.version,
      ...config?.metadata,
    };

    logger.info(`Created agent tool: ${this.name} (${this.id})`);
  }

  /**
   * Execute the wrapped agent as a tool
   */
  async execute(parameters: Record<string, unknown>): Promise<ToolCall> {
    const startTime = Date.now();
    const toolCall: ToolCall = {
      toolId: this.id,
      toolName: this.name,
      parameters,
      executionTime: 0,
      timestamp: new Date().toISOString(),
    };

    try {
      logger.debug(`Executing agent tool: ${this.name}`, parameters);

      // Validate agent is ready
      if (this.agent.status === 'stopped' || this.agent.status === 'error') {
        throw new Error(`Agent ${this.agent.name} is not available (${this.agent.status})`);
      }

      // Convert tool parameters to agent input
      const agentInput = this.parametersToInput(parameters);

      // Create task for the agent
      const task: AgentTask = {
        id: `tool-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        agentId: this.agent.id,
        type: 'custom',
        input: agentInput,
        status: 'pending',
        priority: (parameters.priority as TaskPriority) || 'medium',
        createdAt: new Date().toISOString(),
        metadata: {
          toolCall: true,
          toolId: this.id,
          ...parameters.metadata as Record<string, unknown>,
        },
        retryCount: 0,
        maxRetries: (parameters.maxRetries as number) || 3,
      };

      // Execute the agent task
      const output = await this.agent.executeTask(task);

      // Update metrics
      this.executionCount++;
      this.successCount++;
      this.totalExecutionTime += Date.now() - startTime;

      toolCall.result = output;
      toolCall.executionTime = Date.now() - startTime;
      toolCall.cost = this.calculateCost(output);

      logger.debug(`Agent tool executed successfully: ${this.name}`, {
        executionTime: toolCall.executionTime,
        cost: toolCall.cost,
      });

      return toolCall;
    } catch (error) {
      this.executionCount++;
      this.failureCount++;
      this.totalExecutionTime += Date.now() - startTime;

      toolCall.error = {
        code: error instanceof Error ? error.name : 'TOOL_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
        stack: error instanceof Error ? error.stack : undefined,
        recoverable: true,
        timestamp: new Date().toISOString(),
      };
      toolCall.executionTime = Date.now() - startTime;

      logger.error(`Agent tool execution failed: ${this.name}`, error);
      throw error;
    }
  }

  /**
   * Get the wrapped agent
   */
  getAgent(): AgentBase {
    return this.agent;
  }

  /**
   * Get tool metrics
   */
  getMetrics(): AgentToolMetrics {
    return {
      toolId: this.id,
      executionCount: this.executionCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: this.executionCount > 0 ? this.successCount / this.executionCount : 0,
      averageExecutionTime: this.executionCount > 0
        ? this.totalExecutionTime / this.executionCount
        : 0,
      totalCost: this.cost ? this.cost * this.executionCount : 0,
    };
  }

  /**
   * Check if the agent tool can handle a specific task
   */
  canHandle(taskDescription: string, requiredCapabilities?: string[]): boolean {
    // Check if agent has required capabilities
    if (requiredCapabilities) {
      const hasCapabilities = requiredCapabilities.every(cap =>
        this.agent.capabilities.includes(cap as never)
      );
      if (!hasCapabilities) {
        return false;
      }
    }

    // Check if agent is available
    if (this.agent.status === 'stopped' || this.agent.status === 'error') {
      return false;
    }

    return true;
  }

  /**
   * Get a JSON representation suitable for LLM tool use
   */
  toToolDefinition(): LLMToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: this.parameters.reduce((acc, param) => {
          acc[param.name] = {
            type: param.type,
            description: param.description,
            enum: param.enum,
          };
          return acc;
        }, {} as Record<string, unknown>),
        required: this.parameters.filter(p => p.required).map(p => p.name),
      },
    };
  }

  // Private methods

  private generateParameters(agent: Agent, customParams?: ToolParameter[]): ToolParameter[] {
    if (customParams) {
      return customParams;
    }

    // Default parameters for agent execution
    const defaultParams: ToolParameter[] = [
      {
        name: 'task',
        type: 'string',
        description: 'The task description or prompt',
        required: true,
      },
      {
        name: 'data',
        type: 'object',
        description: 'Input data for the task',
        required: false,
      },
      {
        name: 'context',
        type: 'object',
        description: 'Additional context information',
        required: false,
      },
      {
        name: 'priority',
        type: 'string',
        description: 'Task priority (low, medium, high, critical)',
        required: false,
        default: 'medium',
        enum: ['low', 'medium', 'high', 'critical'],
      },
      {
        name: 'maxRetries',
        type: 'number',
        description: 'Maximum retry attempts',
        required: false,
        default: 3,
      },
    ];

    return defaultParams;
  }

  private parametersToInput(parameters: Record<string, unknown>): AgentInput {
    return {
      messages: parameters.messages as never[],
      data: parameters.data || parameters.task,
      context: parameters.context as never,
      constraints: {
        maxTokens: parameters.maxTokens as number,
        maxTime: parameters.maxTime as number,
        maxCost: parameters.maxCost as number,
      },
    };
  }

  private calculateCost(output: AgentOutput): number {
    // Base cost from tool config
    let cost = this.cost || 0;

    // Add cost from tool calls in output
    if (output.toolCalls) {
      cost += output.toolCalls.reduce((sum, call) => sum + (call.cost || 0), 0);
    }

    // Add cost from metadata if available
    if (output.metadata.cost) {
      cost += output.metadata.cost as number;
    }

    return cost;
  }
}

/**
 * Factory for creating agent tools
 */
export class AgentToolFactory {
  private static instance: AgentToolFactory;
  private createdTools: Map<string, AgentToolWrapper> = new Map();

  private constructor() {}

  static getInstance(): AgentToolFactory {
    if (!AgentToolFactory.instance) {
      AgentToolFactory.instance = new AgentToolFactory();
    }
    return AgentToolFactory.instance;
  }

  /**
   * Create a tool from an agent
   */
  createTool(agent: AgentBase, config?: AgentToolConfig): AgentToolWrapper {
    const tool = new AgentToolWrapper(agent, config);
    this.createdTools.set(tool.id, tool);

    logger.info(`Agent tool factory created tool: ${tool.name}`);
    return tool;
  }

  /**
   * Create tools from multiple agents
   */
  createTools(agents: AgentBase[], config?: AgentToolConfig): AgentToolWrapper[] {
    return agents.map(agent => this.createTool(agent, config));
  }

  /**
   * Get a created tool by ID
   */
  getTool(toolId: string): AgentToolWrapper | undefined {
    return this.createdTools.get(toolId);
  }

  /**
   * Get all created tools
   */
  getAllTools(): AgentToolWrapper[] {
    return Array.from(this.createdTools.values());
  }

  /**
   * Get tools by capability
   */
  getToolsByCapability(capability: string): AgentToolWrapper[] {
    return this.getAllTools().filter(tool =>
      tool.getAgent().capabilities.includes(capability as never)
    );
  }

  /**
   * Remove a tool
   */
  removeTool(toolId: string): boolean {
    return this.createdTools.delete(toolId);
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.createdTools.clear();
  }

  /**
   * Get factory statistics
   */
  getStats(): AgentToolFactoryStats {
    const tools = this.getAllTools();
    const totalMetrics = tools.reduce(
      (acc, tool) => {
        const metrics = tool.getMetrics();
        return {
          totalExecutions: acc.totalExecutions + metrics.executionCount,
          totalSuccesses: acc.totalSuccesses + metrics.successCount,
          totalFailures: acc.totalFailures + metrics.failureCount,
          totalCost: acc.totalCost + metrics.totalCost,
        };
      },
      { totalExecutions: 0, totalSuccesses: 0, totalFailures: 0, totalCost: 0 }
    );

    return {
      totalTools: tools.length,
      toolsByCategory: this.groupByCategory(tools),
      toolsByCapability: this.groupByCapability(tools),
      ...totalMetrics,
      averageSuccessRate: totalMetrics.totalExecutions > 0
        ? totalMetrics.totalSuccesses / totalMetrics.totalExecutions
        : 0,
    };
  }

  private groupByCategory(tools: AgentToolWrapper[]): Record<string, number> {
    return tools.reduce((acc, tool) => {
      acc[tool.category] = (acc[tool.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupByCapability(tools: AgentToolWrapper[]): Record<string, number> {
    const result: Record<string, number> = {};
    tools.forEach(tool => {
      tool.getAgent().capabilities.forEach(cap => {
        result[cap] = (result[cap] || 0) + 1;
      });
    });
    return result;
  }
}

// Types

export interface AgentToolConfig {
  name?: string;
  description?: string;
  parameters?: ToolParameter[];
  permissions?: string[];
  cost?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentToolMetrics {
  toolId: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  averageExecutionTime: number;
  totalCost: number;
}

export interface LLMToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface AgentToolFactoryStats {
  totalTools: number;
  toolsByCategory: Record<string, number>;
  toolsByCapability: Record<string, number>;
  totalExecutions: number;
  totalSuccesses: number;
  totalFailures: number;
  totalCost: number;
  averageSuccessRate: number;
}
