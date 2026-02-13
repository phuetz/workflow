import {
  Agent,
  AgentTask,
  AgentInput,
  AgentOutput,
  AgentCapability,
  TaskPriority,
} from '../../types/agents';
import { AgentBase } from './AgentBase';
import { AgentRegistry } from './AgentRegistry';
import { AgentToolWrapper } from './AgentTool';
import { ToolDiscovery } from './ToolDiscovery';
import { logger } from '../../services/SimpleLogger';

/**
 * DelegationManager - Manages autonomous task delegation between agents
 * Enables agents to delegate tasks to other agents based on capabilities
 */
export class DelegationManager {
  private registry: AgentRegistry;
  private toolDiscovery: ToolDiscovery;
  private activeDelegations: Map<string, Delegation> = new Map();
  private delegationHistory: Delegation[] = [];
  private maxHistorySize = 1000;
  private config: DelegationConfig;

  constructor(registry: AgentRegistry, config: Partial<DelegationConfig> = {}) {
    this.registry = registry;
    this.toolDiscovery = new ToolDiscovery(registry);

    this.config = {
      maxDelegationDepth: config.maxDelegationDepth || 5,
      maxConcurrentDelegations: config.maxConcurrentDelegations || 50,
      delegationTimeout: config.delegationTimeout || 300000, // 5 minutes
      enableAutoDelegation: config.enableAutoDelegation ?? true,
      minConfidenceThreshold: config.minConfidenceThreshold || 0.7,
      trackHistory: config.trackHistory ?? true,
    };

    logger.info('DelegationManager initialized', this.config);
  }

  /**
   * Delegate a task to the best available agent
   */
  async delegate(
    fromAgent: AgentBase,
    task: DelegationTask
  ): Promise<DelegationResult> {
    const startTime = Date.now();
    const delegationId = this.generateDelegationId();

    // Check delegation depth
    const currentDepth = task.delegationChain?.length || 0;
    if (currentDepth >= this.config.maxDelegationDepth) {
      throw new Error(`Maximum delegation depth (${this.config.maxDelegationDepth}) exceeded`);
    }

    // Check concurrent delegations limit
    if (this.activeDelegations.size >= this.config.maxConcurrentDelegations) {
      throw new Error(`Maximum concurrent delegations (${this.config.maxConcurrentDelegations}) reached`);
    }

    logger.info(`Delegating task from ${fromAgent.name}`, {
      task: task.description,
      depth: currentDepth,
    });

    try {
      // Find the best agent for the task
      const targetAgent = await this.selectTargetAgent(task);

      if (!targetAgent) {
        throw new Error('No suitable agent found for delegation');
      }

      // Create delegation record
      const delegation: Delegation = {
        id: delegationId,
        fromAgentId: fromAgent.id,
        toAgentId: targetAgent.id,
        task,
        status: 'active',
        startedAt: new Date().toISOString(),
        depth: currentDepth + 1,
      };

      this.activeDelegations.set(delegationId, delegation);

      // Execute the delegated task
      const agentTask = this.createAgentTask(task, targetAgent.id, fromAgent.id, currentDepth + 1);
      const output = await targetAgent.executeTask(agentTask);

      // Update delegation status
      delegation.status = 'completed';
      delegation.completedAt = new Date().toISOString();
      delegation.result = output;
      delegation.executionTime = Date.now() - startTime;

      // Move to history
      this.activeDelegations.delete(delegationId);
      if (this.config.trackHistory) {
        this.addToHistory(delegation);
      }

      const result: DelegationResult = {
        delegationId,
        fromAgent: fromAgent.name,
        toAgent: targetAgent.name,
        output,
        executionTime: delegation.executionTime,
        depth: delegation.depth,
        success: true,
      };

      logger.info(`Delegation completed successfully`, {
        delegationId,
        from: fromAgent.name,
        to: targetAgent.name,
        time: delegation.executionTime,
      });

      return result;
    } catch (error) {
      const delegation = this.activeDelegations.get(delegationId);
      if (delegation) {
        delegation.status = 'failed';
        delegation.completedAt = new Date().toISOString();
        delegation.error = {
          code: error instanceof Error ? error.name : 'DELEGATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
          recoverable: true,
          timestamp: new Date().toISOString(),
        };

        this.activeDelegations.delete(delegationId);
        if (this.config.trackHistory) {
          this.addToHistory(delegation);
        }
      }

      logger.error(`Delegation failed`, {
        delegationId,
        from: fromAgent.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Delegate to a specific agent by ID
   */
  async delegateTo(
    fromAgent: AgentBase,
    toAgentId: string,
    task: DelegationTask
  ): Promise<DelegationResult> {
    const targetAgent = this.registry.get(toAgentId);
    if (!targetAgent) {
      throw new Error(`Target agent not found: ${toAgentId}`);
    }

    // Override auto-selection
    task.targetAgentId = toAgentId;

    return this.delegate(fromAgent, task);
  }

  /**
   * Delegate a task and wait for multiple agents to complete (parallel delegation)
   */
  async delegateParallel(
    fromAgent: AgentBase,
    task: DelegationTask,
    agentCount: number
  ): Promise<DelegationResult[]> {
    const tools = await this.toolDiscovery.discoverByDescription(
      task.description,
      { maxTools: agentCount }
    );

    if (tools.length === 0) {
      throw new Error('No suitable agents found for parallel delegation');
    }

    const delegations = tools.map(tool =>
      this.delegateTo(fromAgent, tool.getAgent().id, {
        ...task,
        priority: 'high', // Parallel tasks get higher priority
      })
    );

    return Promise.all(delegations);
  }

  /**
   * Auto-delegate: Agent automatically discovers and delegates to the best tool
   */
  async autoDelegateByCapability(
    fromAgent: AgentBase,
    capabilities: AgentCapability[],
    input: AgentInput
  ): Promise<DelegationResult> {
    if (!this.config.enableAutoDelegation) {
      throw new Error('Auto-delegation is disabled');
    }

    const task: DelegationTask = {
      description: `Task requiring capabilities: ${capabilities.join(', ')}`,
      input,
      requiredCapabilities: capabilities,
      priority: 'medium',
    };

    return this.delegate(fromAgent, task);
  }

  /**
   * Get active delegations
   */
  getActiveDelegations(): Delegation[] {
    return Array.from(this.activeDelegations.values());
  }

  /**
   * Get delegation history
   */
  getDelegationHistory(limit = 100): Delegation[] {
    return this.delegationHistory.slice(-limit);
  }

  /**
   * Get delegation by ID
   */
  getDelegation(delegationId: string): Delegation | undefined {
    return this.activeDelegations.get(delegationId) ||
      this.delegationHistory.find(d => d.id === delegationId);
  }

  /**
   * Cancel an active delegation
   */
  async cancelDelegation(delegationId: string): Promise<boolean> {
    const delegation = this.activeDelegations.get(delegationId);
    if (!delegation) {
      return false;
    }

    delegation.status = 'cancelled';
    delegation.completedAt = new Date().toISOString();

    this.activeDelegations.delete(delegationId);
    if (this.config.trackHistory) {
      this.addToHistory(delegation);
    }

    logger.info(`Delegation cancelled: ${delegationId}`);
    return true;
  }

  /**
   * Get delegation statistics
   */
  getStats(): DelegationStats {
    const history = this.delegationHistory;
    const completed = history.filter(d => d.status === 'completed');
    const failed = history.filter(d => d.status === 'failed');

    const totalTime = completed.reduce((sum, d) => sum + (d.executionTime || 0), 0);
    const avgTime = completed.length > 0 ? totalTime / completed.length : 0;

    // Calculate delegation patterns
    const byDepth: Record<number, number> = {};
    const byAgent: Record<string, number> = {};
    const byCapability: Record<string, number> = {};

    history.forEach(d => {
      byDepth[d.depth] = (byDepth[d.depth] || 0) + 1;
      byAgent[d.toAgentId] = (byAgent[d.toAgentId] || 0) + 1;

      if (d.task.requiredCapabilities) {
        d.task.requiredCapabilities.forEach(cap => {
          byCapability[cap] = (byCapability[cap] || 0) + 1;
        });
      }
    });

    return {
      totalDelegations: history.length,
      activeDelegations: this.activeDelegations.size,
      completedDelegations: completed.length,
      failedDelegations: failed.length,
      cancelledDelegations: history.filter(d => d.status === 'cancelled').length,
      successRate: history.length > 0 ? completed.length / history.length : 0,
      averageExecutionTime: avgTime,
      averageDepth: history.length > 0
        ? history.reduce((sum, d) => sum + d.depth, 0) / history.length
        : 0,
      maxDepth: Math.max(...history.map(d => d.depth), 0),
      delegationsByDepth: byDepth,
      delegationsByAgent: byAgent,
      delegationsByCapability: byCapability,
    };
  }

  /**
   * Clear delegation history
   */
  clearHistory(): void {
    this.delegationHistory = [];
    logger.info('Delegation history cleared');
  }

  /**
   * Shutdown the delegation manager
   */
  shutdown(): void {
    this.toolDiscovery.shutdown();
    this.activeDelegations.clear();
    logger.info('DelegationManager shut down');
  }

  // Private methods

  private async selectTargetAgent(task: DelegationTask): Promise<AgentBase | undefined> {
    // If target agent is specified, use it
    if (task.targetAgentId) {
      return this.registry.get(task.targetAgentId);
    }

    // If capabilities are specified, search by capability
    if (task.requiredCapabilities && task.requiredCapabilities.length > 0) {
      const tools = await this.toolDiscovery.discoverByCapability(
        task.requiredCapabilities,
        { maxTools: 1, minConfidence: this.config.minConfidenceThreshold }
      );

      if (tools.length > 0) {
        return tools[0].getAgent();
      }
    }

    // Search by description
    if (task.description) {
      const tool = await this.toolDiscovery.getBestTool(
        task.description,
        task.requiredCapabilities
      );

      if (tool) {
        return tool.getAgent();
      }
    }

    // Fallback to best available agent
    return this.registry.getBestAgent({
      capabilities: task.requiredCapabilities,
    });
  }

  private createAgentTask(
    delegationTask: DelegationTask,
    targetAgentId: string,
    fromAgentId: string,
    depth: number
  ): AgentTask {
    const delegationChain = delegationTask.delegationChain || [];
    delegationChain.push(fromAgentId);

    return {
      id: this.generateTaskId(),
      agentId: targetAgentId,
      type: 'custom',
      input: delegationTask.input,
      status: 'pending',
      priority: delegationTask.priority || 'medium',
      createdAt: new Date().toISOString(),
      metadata: {
        delegated: true,
        delegatedBy: fromAgentId,
        delegationDepth: depth,
        delegationChain,
        ...delegationTask.metadata,
      },
      retryCount: 0,
      maxRetries: delegationTask.maxRetries || 3,
    };
  }

  private addToHistory(delegation: Delegation): void {
    this.delegationHistory.push(delegation);

    // Trim history if too large
    if (this.delegationHistory.length > this.maxHistorySize) {
      this.delegationHistory.shift();
    }
  }

  private generateDelegationId(): string {
    return `delegation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Types

export interface DelegationConfig {
  maxDelegationDepth: number;
  maxConcurrentDelegations: number;
  delegationTimeout: number;
  enableAutoDelegation: boolean;
  minConfidenceThreshold: number;
  trackHistory: boolean;
}

export interface DelegationTask {
  description: string;
  input: AgentInput;
  requiredCapabilities?: AgentCapability[];
  priority?: TaskPriority;
  targetAgentId?: string;
  maxRetries?: number;
  metadata?: Record<string, unknown>;
  delegationChain?: string[]; // Track delegation path
}

export interface Delegation {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  task: DelegationTask;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  result?: AgentOutput;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    recoverable: boolean;
    timestamp: string;
  };
  executionTime?: number;
  depth: number;
}

export interface DelegationResult {
  delegationId: string;
  fromAgent: string;
  toAgent: string;
  output: AgentOutput;
  executionTime: number;
  depth: number;
  success: boolean;
  error?: string;
}

export interface DelegationStats {
  totalDelegations: number;
  activeDelegations: number;
  completedDelegations: number;
  failedDelegations: number;
  cancelledDelegations: number;
  successRate: number;
  averageExecutionTime: number;
  averageDepth: number;
  maxDepth: number;
  delegationsByDepth: Record<number, number>;
  delegationsByAgent: Record<string, number>;
  delegationsByCapability: Record<string, number>;
}
