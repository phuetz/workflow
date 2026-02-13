/**
 * Agent Team Manager
 *
 * Manages agent specialization, team composition, load balancing, and health monitoring
 */

import { Agent, AgentCapability, AgentStatus, AgentTask } from '../types/agents';
import { logger } from '../services/SimpleLogger';

/**
 * Agent specialization type
 */
export type AgentSpecialization =
  | 'verification'
  | 'compliance'
  | 'processing'
  | 'communication'
  | 'analysis'
  | 'transformation'
  | 'coordination'
  | 'execution';

/**
 * Agent with specialization metadata
 */
export interface SpecializedAgent extends Agent {
  specialization: AgentSpecialization;
  skillLevel: number; // 0-100
  currentLoad: number;
  maxLoad: number;
  availability: number; // 0-1
}

/**
 * Team composition
 */
export interface AgentTeam {
  id: string;
  name: string;
  agents: SpecializedAgent[];
  coordinator?: SpecializedAgent;
  capabilities: AgentCapability[];
  maxConcurrency: number;
  metadata: Record<string, unknown>;
}

/**
 * Load balancing strategy
 */
export type LoadBalancingStrategy =
  | 'round-robin'
  | 'least-loaded'
  | 'skill-based'
  | 'random'
  | 'weighted';

/**
 * Health monitoring configuration
 */
export interface HealthMonitorConfig {
  checkInterval: number;
  failureThreshold: number;
  recoveryThreshold: number;
  autoFailover: boolean;
}

/**
 * Agent Team Manager
 */
export class AgentTeamManager {
  private agents: Map<string, SpecializedAgent>;
  private teams: Map<string, AgentTeam>;
  private loadBalancer: LoadBalancer;
  private healthMonitor: HealthMonitor;
  private specializationIndex: Map<AgentSpecialization, Set<string>>;
  private capabilityIndex: Map<AgentCapability, Set<string>>;

  constructor(config?: Partial<HealthMonitorConfig>) {
    this.agents = new Map();
    this.teams = new Map();
    this.specializationIndex = new Map();
    this.capabilityIndex = new Map();

    this.loadBalancer = new LoadBalancer(this.agents);
    this.healthMonitor = new HealthMonitor(this.agents, config);

    logger.info('AgentTeamManager initialized');
  }

  /**
   * Register an agent with automatic specialization detection
   */
  async registerAgent(agent: Agent): Promise<SpecializedAgent> {
    // Detect specialization based on capabilities
    const specialization = this.detectSpecialization(agent);

    const specializedAgent: SpecializedAgent = {
      ...agent,
      specialization,
      skillLevel: this.calculateSkillLevel(agent),
      currentLoad: 0,
      maxLoad: agent.config.maxConcurrentTasks || 10,
      availability: 1.0,
    };

    this.agents.set(agent.id, specializedAgent);

    // Update indexes
    this.updateSpecializationIndex(agent.id, specialization);
    agent.capabilities.forEach(cap => {
      this.updateCapabilityIndex(agent.id, cap);
    });

    logger.info(`Agent registered: ${agent.name} (${specialization}, skill: ${specializedAgent.skillLevel})`);

    return specializedAgent;
  }

  /**
   * Unregister an agent
   */
  async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      logger.warn(`Agent not found: ${agentId}`);
      return;
    }

    // Remove from indexes
    this.removeFromSpecializationIndex(agentId, agent.specialization);
    agent.capabilities.forEach(cap => {
      this.removeFromCapabilityIndex(agentId, cap);
    });

    // Remove from teams
    for (const team of this.teams.values()) {
      team.agents = team.agents.filter(a => a.id !== agentId);
    }

    this.agents.delete(agentId);
    logger.info(`Agent unregistered: ${agentId}`);
  }

  /**
   * Create a team with optimal composition
   */
  async createTeam(
    name: string,
    requirements: {
      capabilities?: AgentCapability[];
      specializations?: AgentSpecialization[];
      minSize?: number;
      maxSize?: number;
      coordinatorRequired?: boolean;
    }
  ): Promise<AgentTeam> {
    logger.info(`Creating team: ${name}`, requirements);

    const selectedAgents: SpecializedAgent[] = [];

    // Select coordinator if required
    let coordinator: SpecializedAgent | undefined;
    if (requirements.coordinatorRequired) {
      coordinator = this.findBestCoordinator();
      if (coordinator) {
        selectedAgents.push(coordinator);
      }
    }

    // Select agents by specialization
    if (requirements.specializations) {
      for (const spec of requirements.specializations) {
        const agents = this.getAgentsBySpecialization(spec);
        const best = this.selectBestAgent(agents);
        if (best && !selectedAgents.includes(best)) {
          selectedAgents.push(best);
        }
      }
    }

    // Select agents by capability
    if (requirements.capabilities) {
      for (const cap of requirements.capabilities) {
        const agents = this.getAgentsByCapability(cap);
        const best = this.selectBestAgent(agents);
        if (best && !selectedAgents.includes(best)) {
          selectedAgents.push(best);
        }
      }
    }

    // Ensure min/max size
    const minSize = requirements.minSize || 1;
    const maxSize = requirements.maxSize || 10;

    if (selectedAgents.length < minSize) {
      // Add more agents to meet minimum
      const additionalAgents = this.selectAdditionalAgents(
        minSize - selectedAgents.length,
        selectedAgents
      );
      selectedAgents.push(...additionalAgents);
    }

    if (selectedAgents.length > maxSize) {
      // Keep only the best agents
      selectedAgents.sort((a, b) => b.skillLevel - a.skillLevel);
      selectedAgents.splice(maxSize);
    }

    // Create team
    const team: AgentTeam = {
      id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      agents: selectedAgents,
      coordinator,
      capabilities: this.getTeamCapabilities(selectedAgents),
      maxConcurrency: selectedAgents.reduce((sum, a) => sum + a.maxLoad, 0),
      metadata: {},
    };

    this.teams.set(team.id, team);
    logger.info(`Team created: ${name} with ${selectedAgents.length} agents`);

    return team;
  }

  /**
   * Get optimal agent for a task using load balancing
   */
  async getOptimalAgent(
    task: AgentTask,
    strategy: LoadBalancingStrategy = 'least-loaded'
  ): Promise<SpecializedAgent | undefined> {
    return this.loadBalancer.selectAgent(task, strategy);
  }

  /**
   * Get agents by specialization
   */
  getAgentsBySpecialization(specialization: AgentSpecialization): SpecializedAgent[] {
    const agentIds = this.specializationIndex.get(specialization) || new Set();
    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((a): a is SpecializedAgent => a !== undefined);
  }

  /**
   * Get agents by capability
   */
  getAgentsByCapability(capability: AgentCapability): SpecializedAgent[] {
    const agentIds = this.capabilityIndex.get(capability) || new Set();
    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((a): a is SpecializedAgent => a !== undefined);
  }

  /**
   * Update agent load
   */
  updateAgentLoad(agentId: string, delta: number): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.currentLoad = Math.max(0, agent.currentLoad + delta);
      agent.availability = 1 - (agent.currentLoad / agent.maxLoad);
    }
  }

  /**
   * Get team by ID
   */
  getTeam(teamId: string): AgentTeam | undefined {
    return this.teams.get(teamId);
  }

  /**
   * Get all teams
   */
  getAllTeams(): AgentTeam[] {
    return Array.from(this.teams.values());
  }

  /**
   * Get health status of all agents
   */
  async getHealthStatus(): Promise<Map<string, AgentStatus>> {
    return this.healthMonitor.checkAll();
  }

  /**
   * Enable automatic failover
   */
  enableAutoFailover(): void {
    this.healthMonitor.enableAutoFailover();
  }

  /**
   * Disable automatic failover
   */
  disableAutoFailover(): void {
    this.healthMonitor.disableAutoFailover();
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalAgents: number;
    bySpecialization: Record<AgentSpecialization, number>;
    byStatus: Record<AgentStatus, number>;
    averageLoad: number;
    averageSkillLevel: number;
    totalTeams: number;
  } {
    const agents = Array.from(this.agents.values());

    const bySpecialization: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    agents.forEach(agent => {
      bySpecialization[agent.specialization] = (bySpecialization[agent.specialization] || 0) + 1;
      byStatus[agent.status] = (byStatus[agent.status] || 0) + 1;
    });

    const averageLoad = agents.reduce((sum, a) => sum + a.currentLoad, 0) / agents.length || 0;
    const averageSkillLevel = agents.reduce((sum, a) => sum + a.skillLevel, 0) / agents.length || 0;

    return {
      totalAgents: agents.length,
      bySpecialization: bySpecialization as never,
      byStatus: byStatus as never,
      averageLoad,
      averageSkillLevel,
      totalTeams: this.teams.size,
    };
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.healthMonitor.shutdown();
    this.agents.clear();
    this.teams.clear();
    this.specializationIndex.clear();
    this.capabilityIndex.clear();
    logger.info('AgentTeamManager shut down');
  }

  // Private helper methods

  private detectSpecialization(agent: Agent): AgentSpecialization {
    const caps = agent.capabilities;

    if (caps.includes('classification') || caps.includes('reasoning')) {
      return 'verification';
    }
    if (caps.includes('workflow-execution')) {
      return 'execution';
    }
    if (caps.includes('data-processing')) {
      return 'processing';
    }
    if (caps.includes('api-integration')) {
      return 'communication';
    }
    if (caps.includes('planning')) {
      return 'coordination';
    }
    if (caps.includes('code-execution')) {
      return 'transformation';
    }

    return 'processing'; // Default
  }

  private calculateSkillLevel(agent: Agent): number {
    // Base score from capabilities
    let score = agent.capabilities.length * 10;

    // Bonus for LLM model
    if (agent.config.llmModel?.includes('gpt-4')) score += 30;
    else if (agent.config.llmModel?.includes('claude')) score += 25;
    else if (agent.config.llmModel?.includes('gpt-3.5')) score += 15;

    // Bonus for tool usage
    if (agent.capabilities.includes('tool-usage')) score += 20;

    // Bonus for multi-step reasoning
    if (agent.capabilities.includes('multi-step')) score += 15;

    return Math.min(100, score);
  }

  private updateSpecializationIndex(agentId: string, specialization: AgentSpecialization): void {
    const agents = this.specializationIndex.get(specialization) || new Set();
    agents.add(agentId);
    this.specializationIndex.set(specialization, agents);
  }

  private removeFromSpecializationIndex(agentId: string, specialization: AgentSpecialization): void {
    const agents = this.specializationIndex.get(specialization);
    if (agents) {
      agents.delete(agentId);
    }
  }

  private updateCapabilityIndex(agentId: string, capability: AgentCapability): void {
    const agents = this.capabilityIndex.get(capability) || new Set();
    agents.add(agentId);
    this.capabilityIndex.set(capability, agents);
  }

  private removeFromCapabilityIndex(agentId: string, capability: AgentCapability): void {
    const agents = this.capabilityIndex.get(capability);
    if (agents) {
      agents.delete(agentId);
    }
  }

  private findBestCoordinator(): SpecializedAgent | undefined {
    const coordinators = this.getAgentsBySpecialization('coordination');
    return this.selectBestAgent(coordinators);
  }

  private selectBestAgent(agents: SpecializedAgent[]): SpecializedAgent | undefined {
    if (agents.length === 0) return undefined;

    // Select based on skill level and availability
    return agents.reduce((best, current) => {
      const bestScore = best.skillLevel * best.availability;
      const currentScore = current.skillLevel * current.availability;
      return currentScore > bestScore ? current : best;
    });
  }

  private selectAdditionalAgents(
    count: number,
    exclude: SpecializedAgent[]
  ): SpecializedAgent[] {
    const excludeIds = new Set(exclude.map(a => a.id));
    const available = Array.from(this.agents.values())
      .filter(a => !excludeIds.has(a.id) && a.availability > 0.5)
      .sort((a, b) => b.skillLevel - a.skillLevel);

    return available.slice(0, count);
  }

  private getTeamCapabilities(agents: SpecializedAgent[]): AgentCapability[] {
    const capabilities = new Set<AgentCapability>();
    agents.forEach(agent => {
      agent.capabilities.forEach(cap => capabilities.add(cap));
    });
    return Array.from(capabilities);
  }
}

/**
 * Load Balancer
 */
class LoadBalancer {
  private agents: Map<string, SpecializedAgent>;
  private roundRobinIndex = 0;

  constructor(agents: Map<string, SpecializedAgent>) {
    this.agents = agents;
  }

  selectAgent(
    task: AgentTask,
    strategy: LoadBalancingStrategy
  ): SpecializedAgent | undefined {
    const availableAgents = Array.from(this.agents.values())
      .filter(a => a.status === 'idle' || a.status === 'running');

    if (availableAgents.length === 0) return undefined;

    switch (strategy) {
      case 'round-robin':
        return this.roundRobin(availableAgents);
      case 'least-loaded':
        return this.leastLoaded(availableAgents);
      case 'skill-based':
        return this.skillBased(availableAgents, task);
      case 'weighted':
        return this.weighted(availableAgents);
      case 'random':
        return availableAgents[Math.floor(Math.random() * availableAgents.length)];
      default:
        return this.leastLoaded(availableAgents);
    }
  }

  private roundRobin(agents: SpecializedAgent[]): SpecializedAgent {
    const agent = agents[this.roundRobinIndex % agents.length];
    this.roundRobinIndex++;
    return agent;
  }

  private leastLoaded(agents: SpecializedAgent[]): SpecializedAgent {
    return agents.reduce((least, current) =>
      current.currentLoad < least.currentLoad ? current : least
    );
  }

  private skillBased(agents: SpecializedAgent[], task: AgentTask): SpecializedAgent {
    // Select agent with highest skill level for the task type
    return agents.reduce((best, current) =>
      current.skillLevel > best.skillLevel ? current : best
    );
  }

  private weighted(agents: SpecializedAgent[]): SpecializedAgent {
    // Weight by availability and skill level
    const weights = agents.map(a => a.availability * (a.skillLevel / 100));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < agents.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return agents[i];
      }
    }

    return agents[agents.length - 1];
  }
}

/**
 * Health Monitor
 */
class HealthMonitor {
  private agents: Map<string, SpecializedAgent>;
  private config: HealthMonitorConfig;
  private failureCounts: Map<string, number>;
  private interval?: NodeJS.Timeout;
  private autoFailover = false;

  constructor(agents: Map<string, SpecializedAgent>, config?: Partial<HealthMonitorConfig>) {
    this.agents = agents;
    this.config = {
      checkInterval: config?.checkInterval || 30000,
      failureThreshold: config?.failureThreshold || 3,
      recoveryThreshold: config?.recoveryThreshold || 2,
      autoFailover: config?.autoFailover ?? true,
    };
    this.failureCounts = new Map();

    this.startMonitoring();
  }

  async checkAll(): Promise<Map<string, AgentStatus>> {
    const statuses = new Map<string, AgentStatus>();

    for (const [id, agent] of this.agents) {
      const status = await this.checkAgent(agent);
      statuses.set(id, status);
    }

    return statuses;
  }

  private async checkAgent(agent: SpecializedAgent): Promise<AgentStatus> {
    // Simple health check based on status and load
    if (agent.currentLoad >= agent.maxLoad) {
      this.recordFailure(agent.id);
      return 'error';
    }

    if (agent.status === 'error') {
      this.recordFailure(agent.id);
      return 'error';
    }

    this.recordSuccess(agent.id);
    return agent.status;
  }

  private recordFailure(agentId: string): void {
    const count = (this.failureCounts.get(agentId) || 0) + 1;
    this.failureCounts.set(agentId, count);

    if (count >= this.config.failureThreshold && this.autoFailover) {
      logger.warn(`Agent ${agentId} exceeded failure threshold, triggering failover`);
      // Failover logic would go here
    }
  }

  private recordSuccess(agentId: string): void {
    const count = this.failureCounts.get(agentId) || 0;
    if (count > 0) {
      this.failureCounts.set(agentId, Math.max(0, count - 1));
    }
  }

  enableAutoFailover(): void {
    this.autoFailover = true;
  }

  disableAutoFailover(): void {
    this.autoFailover = false;
  }

  private startMonitoring(): void {
    this.interval = setInterval(async () => {
      await this.checkAll();
    }, this.config.checkInterval);
  }

  shutdown(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
