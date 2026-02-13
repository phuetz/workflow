import {
  Agent,
  AgentTask,
  AgentOutput,
  AgentOrchestrator as IAgentOrchestrator,
  HealthReport,
  HealthStatus,
  AgentHealth,
  QueueHealth,
  MemoryHealth,
  TaskStatus,
  AgentCollaboration,
  CollaborationType,
} from '../../types/agents';
import { AgentBase } from './AgentBase';
import { AgentRegistry } from './AgentRegistry';
import { AgentCommunicator } from './AgentCommunicator';
import { AgentToolWrapper, AgentToolFactory } from './AgentTool';
import { ToolDiscovery } from './ToolDiscovery';
import { DelegationManager } from './DelegationManager';
import { AgentCache, GlobalAgentCache } from '../optimization/AgentCache';
import { LoadBalancer } from '../optimization/LoadBalancer';
import { PerformanceMonitor } from '../optimization/PerformanceMonitor';
import { logger } from '../../services/SimpleLogger';

/**
 * Agent Orchestrator - Main coordination engine for the multi-agent system
 * Manages agent lifecycle, task delegation, health monitoring, and coordination
 */
export class AgentOrchestrator implements IAgentOrchestrator {
  private registry: AgentRegistry;
  private communicator: AgentCommunicator;
  private activeTasks: Map<string, AgentTask> = new Map();
  private taskQueue: AgentTask[] = [];
  private collaborations: Map<string, AgentCollaboration> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private config: OrchestratorConfig;
  private isRunning = false;

  // Agent-as-tool capabilities
  private toolDiscovery: ToolDiscovery;
  private delegationManager: DelegationManager;
  private cache: AgentCache;
  private loadBalancer: LoadBalancer;
  private performanceMonitor: PerformanceMonitor;
  private toolFactory: AgentToolFactory;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = {
      maxConcurrentAgents: config.maxConcurrentAgents || 50,
      maxConcurrentTasks: config.maxConcurrentTasks || 100,
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      taskProcessingInterval: config.taskProcessingInterval || 1000, // 1 second
      enableAutoScaling: config.enableAutoScaling ?? true,
      enableLoadBalancing: config.enableLoadBalancing ?? true,
    };

    this.registry = new AgentRegistry();
    this.communicator = new AgentCommunicator({
      maxQueueSize: 10000,
      messageTimeout: 30000,
    });

    // Initialize agent-as-tool capabilities
    this.toolFactory = AgentToolFactory.getInstance();
    this.toolDiscovery = new ToolDiscovery(this.registry);
    this.delegationManager = new DelegationManager(this.registry);
    this.cache = GlobalAgentCache.getInstance();
    this.loadBalancer = new LoadBalancer(this.registry);
    this.performanceMonitor = new PerformanceMonitor();

    logger.info('AgentOrchestrator initialized with agent-as-tool capabilities', this.config);
  }

  /**
   * Start the orchestrator
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Orchestrator already running');
      return;
    }

    this.isRunning = true;
    this.startHealthCheck();
    this.startTaskProcessing();
    logger.info('AgentOrchestrator started');
  }

  /**
   * Register a new agent
   */
  async registerAgent(agent: Agent): Promise<void> {
    if (this.registry.size() >= this.config.maxConcurrentAgents) {
      throw new Error('Maximum number of agents reached');
    }

    // Convert Agent to AgentBase if needed
    const agentBase = agent instanceof AgentBase ? agent : this.createAgentBase(agent);

    await this.registry.register(agentBase);

    // Subscribe agent to message bus
    this.communicator.subscribe(agent.id, async (message) => {
      logger.debug(`Agent ${agent.id} received message:`, message.type);
      // Agents can handle messages in their execute method
    });

    logger.info(`Agent registered in orchestrator: ${agent.name} (${agent.id})`);
  }

  /**
   * Unregister an agent
   */
  async unregisterAgent(agentId: string): Promise<void> {
    await this.registry.unregister(agentId);
    this.communicator.unsubscribe(agentId);

    // Cancel any active tasks for this agent
    for (const [taskId, task] of this.activeTasks.entries()) {
      if (task.agentId === agentId) {
        task.status = 'cancelled';
        this.activeTasks.delete(taskId);
      }
    }

    logger.info(`Agent unregistered from orchestrator: ${agentId}`);
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.registry.get(agentId);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): Agent[] {
    return this.registry.getAll();
  }

  /**
   * Execute a task with automatic agent selection
   */
  async executeTask(task: AgentTask): Promise<AgentOutput> {
    if (!this.isRunning) {
      throw new Error('Orchestrator is not running');
    }

    if (this.activeTasks.size >= this.config.maxConcurrentTasks) {
      // Queue the task
      this.taskQueue.push(task);
      logger.info(`Task ${task.id} queued (queue size: ${this.taskQueue.length})`);

      // Wait for task to be picked up
      return this.waitForTaskCompletion(task.id);
    }

    // Select best agent for the task
    const agent = task.agentId
      ? this.registry.get(task.agentId)
      : this.selectAgentForTask(task);

    if (!agent) {
      throw new Error('No suitable agent available for task');
    }

    task.agentId = agent.id;
    return this.delegateTask(task, agent.id);
  }

  /**
   * Delegate a task to a specific agent
   */
  async delegateTask(task: AgentTask, targetAgentId: string): Promise<AgentOutput> {
    const agent = this.registry.get(targetAgentId);
    if (!agent) {
      throw new Error(`Agent ${targetAgentId} not found`);
    }

    // Mark task as active
    task.agentId = targetAgentId;
    task.status = 'running';
    task.startedAt = new Date().toISOString();
    this.activeTasks.set(task.id, task);

    const startTime = Date.now();

    try {
      logger.info(`Delegating task ${task.id} to agent ${agent.name}`);

      // Execute task through agent
      const output = await agent.executeTask(task);

      // Update task status
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.output = output;

      // Update metrics
      const executionTime = Date.now() - startTime;
      this.registry.updateMetrics(targetAgentId, true, executionTime);

      // Remove from active tasks
      this.activeTasks.delete(task.id);

      logger.info(`Task ${task.id} completed by agent ${agent.name} in ${executionTime}ms`);
      return output;
    } catch (error) {
      // Update task status
      task.status = 'failed';
      task.completedAt = new Date().toISOString();

      // Update metrics
      const executionTime = Date.now() - startTime;
      this.registry.updateMetrics(targetAgentId, false, executionTime);

      // Remove from active tasks
      this.activeTasks.delete(task.id);

      // Try fallback agent if configured
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        logger.warn(`Task ${task.id} failed, retrying (${task.retryCount}/${task.maxRetries})`);
        return this.executeTask(task);
      }

      logger.error(`Task ${task.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Execute a collaboration between multiple agents
   */
  async executeCollaboration(
    type: CollaborationType,
    agentIds: string[],
    task: AgentTask
  ): Promise<AgentOutput> {
    const collaborationId = this.generateId();
    const collaboration: AgentCollaboration = {
      id: collaborationId,
      participants: agentIds,
      type,
      status: 'active',
      startedAt: new Date().toISOString(),
      messageCount: 0,
      metadata: {},
    };

    this.collaborations.set(collaborationId, collaboration);

    try {
      let result: AgentOutput;

      switch (type) {
        case 'sequential':
          result = await this.executeSequential(agentIds, task);
          break;
        case 'parallel':
          result = await this.executeParallel(agentIds, task);
          break;
        case 'hierarchical':
          result = await this.executeHierarchical(agentIds, task);
          break;
        default:
          throw new Error(`Unsupported collaboration type: ${type}`);
      }

      collaboration.status = 'completed';
      collaboration.completedAt = new Date().toISOString();
      collaboration.result = result;

      return result;
    } catch (error) {
      collaboration.status = 'failed';
      collaboration.completedAt = new Date().toISOString();
      throw error;
    }
  }

  /**
   * Monitor health of all agents
   */
  async monitorHealth(): Promise<HealthReport> {
    const agentHealths: AgentHealth[] = [];

    for (const agent of this.registry.getAll()) {
      try {
        const health = await agent.healthCheck();
        const analytics = agent.getAnalytics();

        agentHealths.push({
          agentId: agent.id,
          status: this.calculateHealthStatus(health.successRate, agent.status),
          uptime: health.uptime,
          taskCount: health.taskCount,
          successRate: health.successRate,
          averageResponseTime: analytics.averageExecutionTime,
          errorRate: analytics.totalTasks > 0
            ? analytics.failedTasks / analytics.totalTasks
            : 0,
          lastError: health.lastError,
        });
      } catch (error) {
        logger.error(`Health check failed for agent ${agent.id}:`, error);
        agentHealths.push({
          agentId: agent.id,
          status: 'down',
          uptime: 0,
          taskCount: 0,
          successRate: 0,
          averageResponseTime: 0,
          errorRate: 1,
        });
      }
    }

    const commStats = this.communicator.getStats();
    const queueHealth: QueueHealth = {
      size: commStats.queueSize,
      processingRate: 0, // Would need to track this
      averageWaitTime: 0, // Would need to track this
    };

    const memoryHealth: MemoryHealth = {
      totalSize: 0, // Would need memory manager
      utilizationPercent: 0,
      itemCount: 0,
      compressionEnabled: false,
      evictionRate: 0,
    };

    const overall = this.calculateOverallHealth(agentHealths);

    return {
      overall,
      agents: agentHealths,
      messageQueue: queueHealth,
      memory: memoryHealth,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Register an agent as a tool (agent-as-tool capability)
   */
  registerAgentAsTool(agent: AgentBase): AgentToolWrapper {
    const tool = this.toolDiscovery.registerAgentTool(agent);
    logger.info(`Agent registered as tool: ${tool.name}`);
    return tool;
  }

  /**
   * Discover available agent tools for a task
   */
  async discoverTools(description: string, maxTools = 10) {
    return this.toolDiscovery.discoverByDescription(description, { maxTools });
  }

  /**
   * Execute task with caching
   */
  async executeTaskWithCache(
    agentId: string,
    task: AgentTask
  ): Promise<AgentOutput> {
    const agent = this.registry.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Check cache first
    const cached = await this.cache.get(agentId, task.input);
    if (cached) {
      logger.debug(`Cache hit for agent ${agentId}`);
      return cached;
    }

    // Execute task
    const startTime = Date.now();
    const output = await this.delegateTask(task, agentId);
    const executionTime = Date.now() - startTime;

    // Record performance
    this.performanceMonitor.recordExecution(agent, task, output, executionTime);

    // Cache result
    await this.cache.set(agentId, task.input, output);

    return output;
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    return this.performanceMonitor.getReport();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Get load balancer statistics
   */
  getLoadBalancerStats() {
    return this.loadBalancer.getStats();
  }

  /**
   * Get delegation statistics
   */
  getDelegationStats() {
    return this.delegationManager.getStats();
  }

  /**
   * Get tool discovery statistics
   */
  getToolDiscoveryStats() {
    return this.toolDiscovery.getStats();
  }

  /**
   * Shutdown the orchestrator
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down AgentOrchestrator');

    this.isRunning = false;

    // Stop health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Cancel all active tasks
    for (const task of this.activeTasks.values()) {
      task.status = 'cancelled';
    }
    this.activeTasks.clear();
    this.taskQueue = [];

    // Shutdown all agents
    await this.registry.shutdown();

    // Shutdown communicator
    await this.communicator.shutdown();

    // Shutdown agent-as-tool components
    this.toolDiscovery.shutdown();
    this.delegationManager.shutdown();
    this.cache.shutdown();

    logger.info('AgentOrchestrator shut down complete');
  }

  // Private methods

  private createAgentBase(agent: Agent): AgentBase {
    // This is a simplified conversion - in practice, you'd need to properly
    // instantiate the correct AgentBase subclass
    throw new Error('Agent must be an instance of AgentBase');
  }

  private selectAgentForTask(task: AgentTask): AgentBase | undefined {
    // Use the registry to find the best agent
    return this.registry.getBestAgent({
      capabilities: task.input.constraints?.allowedTools as never[],
    });
  }

  private async waitForTaskCompletion(taskId: string): Promise<AgentOutput> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const task = this.activeTasks.get(taskId);
        if (!task) {
          // Task not in active tasks, check if completed
          clearInterval(checkInterval);
          reject(new Error('Task not found'));
          return;
        }

        if (task.status === 'completed' && task.output) {
          clearInterval(checkInterval);
          resolve(task.output);
        } else if (task.status === 'failed') {
          clearInterval(checkInterval);
          reject(task.error || new Error('Task failed'));
        }
      }, 100);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Task completion timeout'));
      }, 300000);
    });
  }

  private async executeSequential(agentIds: string[], task: AgentTask): Promise<AgentOutput> {
    let currentOutput: AgentOutput = {
      result: task.input.data,
      metadata: {},
    };

    for (const agentId of agentIds) {
      const agent = this.registry.get(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Pass previous output as input to next agent
      const subtask: AgentTask = {
        ...task,
        id: this.generateId(),
        agentId,
        input: {
          ...task.input,
          data: currentOutput.result,
        },
      };

      currentOutput = await this.delegateTask(subtask, agentId);
    }

    return currentOutput;
  }

  private async executeParallel(agentIds: string[], task: AgentTask): Promise<AgentOutput> {
    const subtasks = agentIds.map(agentId => {
      const subtask: AgentTask = {
        ...task,
        id: this.generateId(),
        agentId,
      };
      return this.delegateTask(subtask, agentId);
    });

    const results = await Promise.all(subtasks);

    return {
      result: results.map(r => r.result),
      metadata: {
        parallelResults: results,
      },
    };
  }

  private async executeHierarchical(agentIds: string[], task: AgentTask): Promise<AgentOutput> {
    // First agent is the coordinator
    const [coordinatorId, ...workerIds] = agentIds;

    // Execute workers in parallel
    const workerResults = await this.executeParallel(workerIds, task);

    // Coordinator aggregates results
    const coordinatorTask: AgentTask = {
      ...task,
      id: this.generateId(),
      agentId: coordinatorId,
      input: {
        ...task.input,
        data: workerResults.result,
      },
    };

    return this.delegateTask(coordinatorTask, coordinatorId);
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.monitorHealth();
        logger.debug('Health check:', {
          overall: health.overall,
          agentCount: health.agents.length,
          queueSize: health.messageQueue.size,
        });

        // Alert if health is degraded or critical
        if (health.overall === 'degraded' || health.overall === 'critical') {
          logger.warn('System health degraded:', health);
        }
      } catch (error) {
        logger.error('Health check failed:', error);
      }
    }, this.config.healthCheckInterval);
  }

  private startTaskProcessing(): void {
    setInterval(() => {
      if (this.taskQueue.length > 0 && this.activeTasks.size < this.config.maxConcurrentTasks) {
        const task = this.taskQueue.shift();
        if (task) {
          this.executeTask(task).catch(error => {
            logger.error(`Queued task ${task.id} failed:`, error);
          });
        }
      }
    }, this.config.taskProcessingInterval);
  }

  private calculateHealthStatus(successRate: number, agentStatus: Agent['status']): HealthStatus {
    if (agentStatus === 'error' || successRate < 0.5) {
      return 'critical';
    }
    if (successRate < 0.8 || agentStatus === 'paused') {
      return 'degraded';
    }
    if (agentStatus === 'stopped') {
      return 'down';
    }
    return 'healthy';
  }

  private calculateOverallHealth(agentHealths: AgentHealth[]): HealthStatus {
    if (agentHealths.length === 0) {
      return 'down';
    }

    const criticalCount = agentHealths.filter(h => h.status === 'critical').length;
    const degradedCount = agentHealths.filter(h => h.status === 'degraded').length;

    const criticalRatio = criticalCount / agentHealths.length;
    const degradedRatio = (criticalCount + degradedCount) / agentHealths.length;

    if (criticalRatio > 0.5) {
      return 'critical';
    }
    if (degradedRatio > 0.3) {
      return 'degraded';
    }
    return 'healthy';
  }

  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public getters
  getActiveTasks(): AgentTask[] {
    return Array.from(this.activeTasks.values());
  }

  getQueuedTasks(): AgentTask[] {
    return [...this.taskQueue];
  }

  getStats(): OrchestratorStats {
    return {
      activeAgents: this.registry.size(),
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      activeCollaborations: this.collaborations.size,
      ...this.registry.getStats(),
    };
  }
}

// Configuration types
interface OrchestratorConfig {
  maxConcurrentAgents: number;
  maxConcurrentTasks: number;
  healthCheckInterval: number;
  taskProcessingInterval: number;
  enableAutoScaling: boolean;
  enableLoadBalancing: boolean;
}

interface OrchestratorStats {
  activeAgents: number;
  activeTasks: number;
  queuedTasks: number;
  activeCollaborations: number;
  totalAgents: number;
  agentsByStatus: Record<string, number>;
  agentsByType: Record<string, number>;
  agentsByCapability: Record<string, number>;
  availableAgents: number;
}
