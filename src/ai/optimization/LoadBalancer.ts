import { Agent, AgentTask } from '../../types/agents';
import { AgentBase } from '../agents/AgentBase';
import { AgentRegistry } from '../agents/AgentRegistry';
import { logger } from '../../services/SimpleLogger';

/**
 * LoadBalancer - Distributes tasks across agents to optimize resource utilization
 * Implements round-robin, least-loaded, and weighted strategies
 */
export class LoadBalancer {
  private registry: AgentRegistry;
  private agentLoad: Map<string, number> = new Map();
  private roundRobinIndex = 0;
  private config: LoadBalancerConfig;

  constructor(registry: AgentRegistry, config: Partial<LoadBalancerConfig> = {}) {
    this.registry = registry;
    this.config = {
      strategy: config.strategy || 'least-loaded',
      maxLoadPerAgent: config.maxLoadPerAgent || 10,
      enableAutoScaling: config.enableAutoScaling ?? false,
      rebalanceInterval: config.rebalanceInterval || 60000, // 1 minute
    };

    logger.info('LoadBalancer initialized', this.config);
  }

  /**
   * Select best agent for a task based on load balancing strategy
   */
  selectAgent(task: AgentTask, candidates?: AgentBase[]): AgentBase | null {
    const availableAgents = candidates || this.registry.findAvailable();

    if (availableAgents.length === 0) {
      return null;
    }

    let selected: AgentBase | null = null;

    switch (this.config.strategy) {
      case 'round-robin':
        selected = this.roundRobin(availableAgents);
        break;

      case 'least-loaded':
        selected = this.leastLoaded(availableAgents);
        break;

      case 'weighted':
        selected = this.weighted(availableAgents);
        break;

      case 'random':
        selected = this.random(availableAgents);
        break;

      default:
        selected = this.leastLoaded(availableAgents);
    }

    if (selected) {
      this.incrementLoad(selected.id);
    }

    return selected;
  }

  /**
   * Mark task as completed for load tracking
   */
  taskCompleted(agentId: string): void {
    this.decrementLoad(agentId);
  }

  /**
   * Get current load for an agent
   */
  getLoad(agentId: string): number {
    return this.agentLoad.get(agentId) || 0;
  }

  /**
   * Get load statistics
   */
  getStats(): LoadBalancerStats {
    const loads: Record<string, number> = {};
    this.agentLoad.forEach((load, agentId) => {
      loads[agentId] = load;
    });

    const loadValues = Array.from(this.agentLoad.values());
    const totalLoad = loadValues.reduce((sum, val) => sum + val, 0);
    const avgLoad = loadValues.length > 0 ? totalLoad / loadValues.length : 0;
    const maxLoad = loadValues.length > 0 ? Math.max(...loadValues) : 0;
    const minLoad = loadValues.length > 0 ? Math.min(...loadValues) : 0;

    return {
      strategy: this.config.strategy,
      totalAgents: this.registry.size(),
      activeAgents: this.agentLoad.size,
      totalLoad,
      averageLoad: avgLoad,
      maxLoad,
      minLoad,
      loadByAgent: loads,
      utilizationPercent: (avgLoad / this.config.maxLoadPerAgent) * 100,
    };
  }

  /**
   * Rebalance load across agents
   */
  async rebalance(): Promise<void> {
    logger.info('Rebalancing load across agents');
    // This would require task migration, which is complex
    // For now, just log the current state
    const stats = this.getStats();
    logger.info('Current load distribution', stats);
  }

  /**
   * Clear all load tracking
   */
  clear(): void {
    this.agentLoad.clear();
    this.roundRobinIndex = 0;
  }

  // Load balancing strategies

  private roundRobin(agents: AgentBase[]): AgentBase {
    const agent = agents[this.roundRobinIndex % agents.length];
    this.roundRobinIndex++;
    return agent;
  }

  private leastLoaded(agents: AgentBase[]): AgentBase {
    let minLoad = Infinity;
    let selected = agents[0];

    agents.forEach(agent => {
      const load = this.getLoad(agent.id);
      if (load < minLoad) {
        minLoad = load;
        selected = agent;
      }
    });

    return selected;
  }

  private weighted(agents: AgentBase[]): AgentBase {
    // Weight by performance metrics
    const weights = agents.map(agent => {
      const analytics = agent.getAnalytics();
      const successRate = analytics.totalTasks > 0
        ? analytics.completedTasks / analytics.totalTasks
        : 1;
      const load = this.getLoad(agent.id);
      const loadFactor = Math.max(0, 1 - (load / this.config.maxLoadPerAgent));

      return {
        agent,
        weight: successRate * loadFactor,
      };
    });

    // Select based on weighted random
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;

    for (const { agent, weight } of weights) {
      random -= weight;
      if (random <= 0) {
        return agent;
      }
    }

    return weights[0].agent;
  }

  private random(agents: AgentBase[]): AgentBase {
    const index = Math.floor(Math.random() * agents.length);
    return agents[index];
  }

  private incrementLoad(agentId: string): void {
    const current = this.agentLoad.get(agentId) || 0;
    this.agentLoad.set(agentId, current + 1);
  }

  private decrementLoad(agentId: string): void {
    const current = this.agentLoad.get(agentId) || 0;
    if (current > 0) {
      this.agentLoad.set(agentId, current - 1);
    }
  }
}

// Types

export type LoadBalancingStrategy = 'round-robin' | 'least-loaded' | 'weighted' | 'random';

export interface LoadBalancerConfig {
  strategy: LoadBalancingStrategy;
  maxLoadPerAgent: number;
  enableAutoScaling: boolean;
  rebalanceInterval: number;
}

export interface LoadBalancerStats {
  strategy: LoadBalancingStrategy;
  totalAgents: number;
  activeAgents: number;
  totalLoad: number;
  averageLoad: number;
  maxLoad: number;
  minLoad: number;
  loadByAgent: Record<string, number>;
  utilizationPercent: number;
}
