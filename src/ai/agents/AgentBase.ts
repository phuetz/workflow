import {
  Agent,
  AgentTask,
  AgentInput,
  AgentOutput,
  AgentStatus,
  AgentError,
  AgentLifecycleEvent,
  AgentAnalytics,
  ToolCall,
} from '../../types/agents';
import { logger } from '../../services/SimpleLogger';
import { LLMService } from '../../services/LLMService';
import { LLMMessage } from '../../types/llm';

/**
 * Base class for all AI agents in the multi-agent system
 * Provides core functionality for lifecycle management, execution, and communication
 */
export abstract class AgentBase implements Agent {
  id: string;
  name: string;
  description: string;
  type: Agent['type'];
  status: AgentStatus;
  capabilities: Agent['capabilities'];
  config: Agent['config'];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  version: string;

  protected llmService?: LLMService;
  protected taskHistory: AgentTask[] = [];
  protected analytics: Partial<AgentAnalytics> = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageExecutionTime: 0,
    averageConfidence: 0,
    toolUsage: {},
    errorDistribution: {},
    costTotal: 0,
  };
  protected lifecycleCallbacks: Map<string, ((event: AgentLifecycleEvent) => void)[]> = new Map();

  constructor(config: Partial<Agent>) {
    this.id = config.id || this.generateId();
    this.name = config.name || 'Unnamed Agent';
    this.description = config.description || '';
    this.type = config.type || 'custom';
    this.status = 'idle';
    this.capabilities = config.capabilities || [];
    this.config = config.config || {};
    this.metadata = config.metadata || {};
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
    this.version = config.version || '1.0.0';

    if (this.config.llmModel) {
      this.llmService = new LLMService();
    }
  }

  // Abstract methods that must be implemented by subclasses
  abstract execute(input: AgentInput): Promise<AgentOutput>;

  // Lifecycle management
  async start(): Promise<void> {
    try {
      logger.info(`Starting agent: ${this.name} (${this.id})`);
      this.status = 'initializing';
      this.emitLifecycleEvent('started');

      await this.onStart();

      this.status = 'idle';
      this.updatedAt = new Date().toISOString();
      logger.info(`Agent started successfully: ${this.name}`);
    } catch (error) {
      this.status = 'error';
      this.emitLifecycleEvent('error', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      logger.info(`Stopping agent: ${this.name} (${this.id})`);
      this.status = 'stopped';
      this.emitLifecycleEvent('stopped');

      await this.onStop();

      this.updatedAt = new Date().toISOString();
      logger.info(`Agent stopped successfully: ${this.name}`);
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  async pause(): Promise<void> {
    if (this.status !== 'running' && this.status !== 'idle') {
      throw new Error(`Cannot pause agent in ${this.status} status`);
    }
    this.status = 'paused';
    this.emitLifecycleEvent('paused');
    this.updatedAt = new Date().toISOString();
  }

  async resume(): Promise<void> {
    if (this.status !== 'paused') {
      throw new Error(`Cannot resume agent in ${this.status} status`);
    }
    this.status = 'idle';
    this.emitLifecycleEvent('resumed');
    this.updatedAt = new Date().toISOString();
  }

  async destroy(): Promise<void> {
    await this.stop();
    this.emitLifecycleEvent('destroyed');
    this.lifecycleCallbacks.clear();
    this.taskHistory = [];
  }

  // Task execution with error handling and retries
  async executeTask(task: AgentTask): Promise<AgentOutput> {
    if (this.status === 'stopped' || this.status === 'error') {
      throw new Error(`Agent is ${this.status} and cannot execute tasks`);
    }

    const startTime = Date.now();
    this.status = 'running';
    task.status = 'running';
    task.startedAt = new Date().toISOString();

    try {
      logger.info(`Agent ${this.name} executing task ${task.id}`);

      // Execute the task with timeout
      const output = await this.executeWithTimeout(
        () => this.execute(task.input),
        task.metadata.timeout as number || this.config.timeout || 300000 // Default 5 minutes
      );

      // Update task status
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.output = output;

      // Update analytics
      const executionTime = Date.now() - startTime;
      this.updateAnalytics(task, executionTime, output);

      // Store in history
      this.taskHistory.push(task);
      if (this.taskHistory.length > 100) {
        this.taskHistory.shift(); // Keep last 100 tasks
      }

      this.status = 'idle';
      this.updatedAt = new Date().toISOString();

      logger.info(`Agent ${this.name} completed task ${task.id} in ${executionTime}ms`);
      return output;
    } catch (error) {
      const agentError: AgentError = {
        code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
        stack: error instanceof Error ? error.stack : undefined,
        recoverable: task.retryCount < task.maxRetries,
        timestamp: new Date().toISOString(),
      };

      task.status = 'failed';
      task.error = agentError;
      task.completedAt = new Date().toISOString();

      // Update analytics
      this.analytics.failedTasks = (this.analytics.failedTasks || 0) + 1;
      this.analytics.errorDistribution = this.analytics.errorDistribution || {};
      this.analytics.errorDistribution[agentError.code] =
        (this.analytics.errorDistribution[agentError.code] || 0) + 1;

      this.status = 'error';
      this.updatedAt = new Date().toISOString();

      logger.error(`Agent ${this.name} failed task ${task.id}:`, error);
      throw agentError;
    }
  }

  // LLM integration
  protected async callLLM(messages: LLMMessage[], tools?: unknown[]): Promise<string> {
    if (!this.llmService || !this.config.llmModel) {
      throw new Error('LLM service not configured for this agent');
    }

    try {
      const response = await this.llmService.generateText(
        this.config.llmModel,
        messages,
        {
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        },
        tools as never[]
      );

      // Update cost tracking
      if (response.usage?.cost) {
        this.analytics.costTotal = (this.analytics.costTotal || 0) + response.usage.cost;
      }

      return response.content as string;
    } catch (error) {
      logger.error(`LLM call failed for agent ${this.name}:`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{
    status: AgentStatus;
    uptime: number;
    taskCount: number;
    successRate: number;
    lastError?: AgentError;
  }> {
    const uptime = Date.now() - new Date(this.createdAt).getTime();
    const total = this.analytics.totalTasks || 0;
    const successful = this.analytics.completedTasks || 0;
    const successRate = total > 0 ? successful / total : 1;

    const lastFailedTask = [...this.taskHistory]
      .reverse()
      .find(t => t.status === 'failed');

    this.emitLifecycleEvent('health-check', {
      status: this.status,
      successRate,
    });

    return {
      status: this.status,
      uptime,
      taskCount: total,
      successRate,
      lastError: lastFailedTask?.error,
    };
  }

  // Analytics
  getAnalytics(): AgentAnalytics {
    return {
      agentId: this.id,
      totalTasks: this.analytics.totalTasks || 0,
      completedTasks: this.analytics.completedTasks || 0,
      failedTasks: this.analytics.failedTasks || 0,
      averageExecutionTime: this.analytics.averageExecutionTime || 0,
      averageConfidence: this.analytics.averageConfidence || 0,
      toolUsage: this.analytics.toolUsage || {},
      errorDistribution: this.analytics.errorDistribution || {},
      costTotal: this.analytics.costTotal || 0,
      periodStart: this.createdAt,
      periodEnd: new Date().toISOString(),
    };
  }

  // Lifecycle hooks (can be overridden by subclasses)
  protected async onStart(): Promise<void> {
    // Override in subclasses if needed
  }

  protected async onStop(): Promise<void> {
    // Override in subclasses if needed
  }

  // Event management
  on(event: AgentLifecycleEvent['type'], callback: (event: AgentLifecycleEvent) => void): void {
    const callbacks = this.lifecycleCallbacks.get(event) || [];
    callbacks.push(callback);
    this.lifecycleCallbacks.set(event, callbacks);
  }

  off(event: AgentLifecycleEvent['type'], callback: (event: AgentLifecycleEvent) => void): void {
    const callbacks = this.lifecycleCallbacks.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
      this.lifecycleCallbacks.set(event, callbacks);
    }
  }

  protected emitLifecycleEvent(type: AgentLifecycleEvent['type'], metadata?: Record<string, unknown>): void {
    const event: AgentLifecycleEvent = {
      type,
      agentId: this.id,
      timestamp: new Date().toISOString(),
      metadata,
    };

    const callbacks = this.lifecycleCallbacks.get(type) || [];
    callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error(`Error in lifecycle callback for ${type}:`, error);
      }
    });
  }

  // Utility methods
  protected generateId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Task execution timeout')), timeoutMs)
      ),
    ]);
  }

  protected updateAnalytics(task: AgentTask, executionTime: number, output: AgentOutput): void {
    this.analytics.totalTasks = (this.analytics.totalTasks || 0) + 1;
    this.analytics.completedTasks = (this.analytics.completedTasks || 0) + 1;

    // Update average execution time
    const prevAvg = this.analytics.averageExecutionTime || 0;
    const total = this.analytics.totalTasks || 1;
    this.analytics.averageExecutionTime = (prevAvg * (total - 1) + executionTime) / total;

    // Update average confidence
    if (output.confidence !== undefined) {
      const prevConfAvg = this.analytics.averageConfidence || 0;
      this.analytics.averageConfidence = (prevConfAvg * (total - 1) + output.confidence) / total;
    }

    // Update tool usage
    if (output.toolCalls) {
      this.analytics.toolUsage = this.analytics.toolUsage || {};
      output.toolCalls.forEach((toolCall: ToolCall) => {
        this.analytics.toolUsage![toolCall.toolName] =
          (this.analytics.toolUsage![toolCall.toolName] || 0) + 1;

        if (toolCall.cost) {
          this.analytics.costTotal = (this.analytics.costTotal || 0) + toolCall.cost;
        }
      });
    }
  }

  // Getters
  getStatus(): AgentStatus {
    return this.status;
  }

  getCapabilities(): Agent['capabilities'] {
    return this.capabilities;
  }

  getConfig(): Agent['config'] {
    return this.config;
  }

  getTaskHistory(limit = 10): AgentTask[] {
    return this.taskHistory.slice(-limit);
  }

  // Serialization
  toJSON(): Agent {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      status: this.status,
      capabilities: this.capabilities,
      config: this.config,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
      executeTask: this.executeTask.bind(this),
    };
  }
}
