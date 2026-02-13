import { Agent, AgentCapability, AgentStatus } from '../../types/agents';
import { AgentBase } from './AgentBase';
import { logger } from '../../services/SimpleLogger';

/**
 * Agent Registry - Central repository for agent discovery and management
 * Provides registration, lookup, and filtering capabilities for agents
 */
export class AgentRegistry {
  private agents: Map<string, AgentBase> = new Map();
  private agentsByType: Map<string, Set<string>> = new Map();
  private agentsByCapability: Map<AgentCapability, Set<string>> = new Map();
  private agentMetrics: Map<string, AgentMetrics> = new Map();

  constructor() {
    logger.info('AgentRegistry initialized');
  }

  /**
   * Register a new agent in the registry
   */
  async register(agent: AgentBase): Promise<void> {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent with ID ${agent.id} already registered`);
    }

    try {
      // Add to main registry
      this.agents.set(agent.id, agent);

      // Index by type
      const typeSet = this.agentsByType.get(agent.type) || new Set();
      typeSet.add(agent.id);
      this.agentsByType.set(agent.type, typeSet);

      // Index by capabilities
      agent.capabilities.forEach(capability => {
        const capSet = this.agentsByCapability.get(capability) || new Set();
        capSet.add(agent.id);
        this.agentsByCapability.set(capability, capSet);
      });

      // Initialize metrics
      this.agentMetrics.set(agent.id, {
        registeredAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
      });

      // Start the agent
      await agent.start();

      logger.info(`Agent registered: ${agent.name} (${agent.id})`);
    } catch (error) {
      // Rollback registration on failure
      this.agents.delete(agent.id);
      logger.error(`Failed to register agent ${agent.name}:`, error);
      throw error;
    }
  }

  /**
   * Unregister an agent from the registry
   */
  async unregister(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      logger.warn(`Attempted to unregister non-existent agent: ${agentId}`);
      return false;
    }

    try {
      // Stop the agent
      await agent.stop();

      // Remove from main registry
      this.agents.delete(agentId);

      // Remove from type index
      const typeSet = this.agentsByType.get(agent.type);
      if (typeSet) {
        typeSet.delete(agentId);
        if (typeSet.size === 0) {
          this.agentsByType.delete(agent.type);
        }
      }

      // Remove from capability indexes
      agent.capabilities.forEach(capability => {
        const capSet = this.agentsByCapability.get(capability);
        if (capSet) {
          capSet.delete(agentId);
          if (capSet.size === 0) {
            this.agentsByCapability.delete(capability);
          }
        }
      });

      // Remove metrics
      this.agentMetrics.delete(agentId);

      logger.info(`Agent unregistered: ${agent.name} (${agentId})`);
      return true;
    } catch (error) {
      logger.error(`Failed to unregister agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get an agent by ID
   */
  get(agentId: string): AgentBase | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAll(): AgentBase[] {
    return Array.from(this.agents.values());
  }

  /**
   * Find agents by type
   */
  findByType(type: Agent['type']): AgentBase[] {
    const agentIds = this.agentsByType.get(type) || new Set();
    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((agent): agent is AgentBase => agent !== undefined);
  }

  /**
   * Find agents by capability
   */
  findByCapability(capability: AgentCapability): AgentBase[] {
    const agentIds = this.agentsByCapability.get(capability) || new Set();
    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((agent): agent is AgentBase => agent !== undefined);
  }

  /**
   * Find agents by multiple capabilities (must have ALL)
   */
  findByCapabilities(capabilities: AgentCapability[]): AgentBase[] {
    if (capabilities.length === 0) {
      return this.getAll();
    }

    // Get intersection of all capability sets
    const sets = capabilities.map(cap => this.agentsByCapability.get(cap) || new Set<string>());
    const intersection = sets.reduce((acc, set) => {
      return new Set([...acc].filter(x => set.has(x as string)));
    });

    return Array.from(intersection)
      .map(id => this.agents.get(id as string))
      .filter((agent): agent is AgentBase => agent !== undefined);
  }

  /**
   * Find agents by status
   */
  findByStatus(status: AgentStatus): AgentBase[] {
    return this.getAll().filter(agent => agent.status === status);
  }

  /**
   * Find available agents (idle or running with capacity)
   */
  findAvailable(capability?: AgentCapability): AgentBase[] {
    const agents = capability
      ? this.findByCapability(capability)
      : this.getAll();

    return agents.filter(agent => {
      const status = agent.status;
      return status === 'idle' || status === 'running';
    });
  }

  /**
   * Get the best agent for a task based on performance metrics
   */
  getBestAgent(
    criteria: {
      type?: Agent['type'];
      capabilities?: AgentCapability[];
      excludeIds?: string[];
    } = {}
  ): AgentBase | undefined {
    let candidates = this.getAll();

    // Filter by type
    if (criteria.type) {
      candidates = candidates.filter(agent => agent.type === criteria.type);
    }

    // Filter by capabilities
    if (criteria.capabilities && criteria.capabilities.length > 0) {
      candidates = candidates.filter(agent =>
        criteria.capabilities!.every(cap => agent.capabilities.includes(cap))
      );
    }

    // Exclude specific agents
    if (criteria.excludeIds) {
      candidates = candidates.filter(agent => !criteria.excludeIds!.includes(agent.id));
    }

    // Filter to only available agents
    candidates = candidates.filter(agent => {
      const status = agent.status;
      return status === 'idle' || status === 'running';
    });

    if (candidates.length === 0) {
      return undefined;
    }

    // Score agents based on metrics
    const scoredAgents = candidates.map(agent => {
      const metrics = this.agentMetrics.get(agent.id)!;
      const successRate = metrics.totalRequests > 0
        ? metrics.successfulRequests / metrics.totalRequests
        : 1;

      // Scoring formula: prioritize success rate, then response time
      const score = (successRate * 1000) - (metrics.averageResponseTime || 0);

      return { agent, score };
    });

    // Return agent with highest score
    scoredAgents.sort((a, b) => b.score - a.score);
    return scoredAgents[0].agent;
  }

  /**
   * Update agent metrics after task execution
   */
  updateMetrics(
    agentId: string,
    success: boolean,
    responseTime: number
  ): void {
    const metrics = this.agentMetrics.get(agentId);
    if (!metrics) {
      logger.warn(`Cannot update metrics for unknown agent: ${agentId}`);
      return;
    }

    metrics.lastActive = new Date().toISOString();
    metrics.totalRequests += 1;

    if (success) {
      metrics.successfulRequests += 1;
    } else {
      metrics.failedRequests += 1;
    }

    // Update average response time
    const totalTime = metrics.averageResponseTime * (metrics.totalRequests - 1);
    metrics.averageResponseTime = (totalTime + responseTime) / metrics.totalRequests;

    this.agentMetrics.set(agentId, metrics);
  }

  /**
   * Get metrics for a specific agent
   */
  getMetrics(agentId: string): AgentMetrics | undefined {
    return this.agentMetrics.get(agentId);
  }

  /**
   * Get all agents with their metrics
   */
  getAllMetrics(): Map<string, AgentMetrics> {
    return new Map(this.agentMetrics);
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const agents = this.getAll();
    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const capabilityCounts: Record<string, number> = {};

    agents.forEach(agent => {
      // Count by status
      statusCounts[agent.status] = (statusCounts[agent.status] || 0) + 1;

      // Count by type
      typeCounts[agent.type] = (typeCounts[agent.type] || 0) + 1;

      // Count by capabilities
      agent.capabilities.forEach(cap => {
        capabilityCounts[cap] = (capabilityCounts[cap] || 0) + 1;
      });
    });

    return {
      totalAgents: agents.length,
      agentsByStatus: statusCounts,
      agentsByType: typeCounts,
      agentsByCapability: capabilityCounts,
      availableAgents: this.findAvailable().length,
    };
  }

  /**
   * Health check for all agents
   */
  async healthCheckAll(): Promise<Map<string, { status: AgentStatus; healthy: boolean }>> {
    const healthResults = new Map<string, { status: AgentStatus; healthy: boolean }>();

    for (const agent of this.agents.values()) {
      try {
        const health = await agent.healthCheck();
        healthResults.set(agent.id, {
          status: health.status,
          healthy: health.successRate >= 0.5 && health.status !== 'error',
        });
      } catch (error) {
        logger.error(`Health check failed for agent ${agent.id}:`, error);
        healthResults.set(agent.id, {
          status: 'error',
          healthy: false,
        });
      }
    }

    return healthResults;
  }

  /**
   * Shutdown all agents
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down all agents in registry');

    const shutdownPromises = Array.from(this.agents.values()).map(agent =>
      agent.destroy().catch(error => {
        logger.error(`Failed to shutdown agent ${agent.id}:`, error);
      })
    );

    await Promise.all(shutdownPromises);

    this.agents.clear();
    this.agentsByType.clear();
    this.agentsByCapability.clear();
    this.agentMetrics.clear();

    logger.info('All agents shut down');
  }

  /**
   * Get number of registered agents
   */
  size(): number {
    return this.agents.size;
  }

  /**
   * Check if an agent exists
   */
  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Clear all agents (for testing)
   */
  clear(): void {
    this.agents.clear();
    this.agentsByType.clear();
    this.agentsByCapability.clear();
    this.agentMetrics.clear();
  }
}

// Types
interface AgentMetrics {
  registeredAt: string;
  lastActive: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
}

interface RegistryStats {
  totalAgents: number;
  agentsByStatus: Record<string, number>;
  agentsByType: Record<string, number>;
  agentsByCapability: Record<string, number>;
  availableAgents: number;
}
