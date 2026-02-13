/**
 * Agent Registry
 *
 * Centralized agent discovery service with capability advertisement,
 * health checking, load balancing, and automatic failover.
 */

import { EventEmitter } from 'events';

// Agent Status
export enum AgentStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  DEGRADED = 'degraded',
  UNKNOWN = 'unknown'
}

// Agent Information
export interface AgentInfo {
  id: string;
  name: string;
  type: string;
  status: AgentStatus;
  capabilities: string[];
  protocols: string[];
  endpoint?: string;
  metadata: Record<string, unknown>;
  health: {
    lastHeartbeat: number;
    responseTime?: number;
    successRate?: number;
    errorRate?: number;
    load?: number;
  };
  resources?: {
    cpu?: number;
    memory?: number;
    activeConnections?: number;
    queueDepth?: number;
  };
  version?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

// Agent Query
export interface AgentQuery {
  capabilities?: string[];
  protocols?: string[];
  status?: AgentStatus[];
  tags?: string[];
  type?: string;
  minSuccessRate?: number;
  maxLoad?: number;
}

// Health Check Configuration
export interface HealthCheckConfig {
  interval: number;
  timeout: number;
  failureThreshold: number;
  successThreshold: number;
}

/**
 * Agent Registry
 */
export class AgentRegistry extends EventEmitter {
  private agents: Map<string, AgentInfo> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private healthCheckConfig: HealthCheckConfig = {
    interval: 30000, // 30s
    timeout: 5000, // 5s
    failureThreshold: 3,
    successThreshold: 2
  };
  private failureCounts: Map<string, number> = new Map();
  private successCounts: Map<string, number> = new Map();

  constructor(config?: Partial<HealthCheckConfig>) {
    super();
    if (config) {
      this.healthCheckConfig = { ...this.healthCheckConfig, ...config };
    }
  }

  /**
   * Register a new agent
   */
  register(agent: Omit<AgentInfo, 'createdAt' | 'updatedAt'>): void {
    const now = Date.now();

    const agentInfo: AgentInfo = {
      ...agent,
      createdAt: now,
      updatedAt: now
    };

    this.agents.set(agent.id, agentInfo);
    this.emit('agent-registered', agentInfo);
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.delete(agentId);
      this.failureCounts.delete(agentId);
      this.successCounts.delete(agentId);
      this.emit('agent-unregistered', agent);
    }
  }

  /**
   * Update agent information
   */
  update(agentId: string, updates: Partial<AgentInfo>): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      Object.assign(agent, updates, { updatedAt: Date.now() });
      this.emit('agent-updated', agent);
    }
  }

  /**
   * Update agent health
   */
  updateHealth(agentId: string, health: Partial<AgentInfo['health']>): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.health = { ...agent.health, ...health };
      agent.updatedAt = Date.now();
      this.emit('health-updated', agent);
    }
  }

  /**
   * Update agent resources
   */
  updateResources(agentId: string, resources: AgentInfo['resources']): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.resources = resources;
      agent.updatedAt = Date.now();
    }
  }

  /**
   * Record heartbeat
   */
  heartbeat(agentId: string, responseTime?: number): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.health.lastHeartbeat = Date.now();
      if (responseTime !== undefined) {
        agent.health.responseTime = responseTime;
      }

      // Update status based on heartbeat
      if (agent.status === AgentStatus.OFFLINE || agent.status === AgentStatus.UNKNOWN) {
        this.updateStatus(agentId, AgentStatus.ONLINE);
      }

      // Reset failure count
      this.failureCounts.set(agentId, 0);

      // Increment success count
      const successCount = (this.successCounts.get(agentId) || 0) + 1;
      this.successCounts.set(agentId, successCount);

      // Transition from degraded to online
      if (
        agent.status === AgentStatus.DEGRADED &&
        successCount >= this.healthCheckConfig.successThreshold
      ) {
        this.updateStatus(agentId, AgentStatus.ONLINE);
        this.successCounts.set(agentId, 0);
      }
    }
  }

  /**
   * Update agent status
   */
  updateStatus(agentId: string, status: AgentStatus): void {
    const agent = this.agents.get(agentId);
    if (agent && agent.status !== status) {
      const oldStatus = agent.status;
      agent.status = status;
      agent.updatedAt = Date.now();
      this.emit('status-changed', agent, oldStatus);
    }
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentInfo | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  /**
   * Find agents by query
   */
  findAgents(query: AgentQuery): AgentInfo[] {
    let results = Array.from(this.agents.values());

    // Filter by capabilities
    if (query.capabilities && query.capabilities.length > 0) {
      results = results.filter(agent =>
        query.capabilities!.every(cap => agent.capabilities.includes(cap))
      );
    }

    // Filter by protocols
    if (query.protocols && query.protocols.length > 0) {
      results = results.filter(agent =>
        query.protocols!.some(protocol => agent.protocols.includes(protocol))
      );
    }

    // Filter by status
    if (query.status && query.status.length > 0) {
      results = results.filter(agent => query.status!.includes(agent.status));
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(agent =>
        agent.tags && query.tags!.some(tag => agent.tags!.includes(tag))
      );
    }

    // Filter by type
    if (query.type) {
      results = results.filter(agent => agent.type === query.type);
    }

    // Filter by success rate
    if (query.minSuccessRate !== undefined) {
      results = results.filter(agent =>
        (agent.health.successRate || 0) >= query.minSuccessRate!
      );
    }

    // Filter by load
    if (query.maxLoad !== undefined) {
      results = results.filter(agent =>
        (agent.health.load || 0) <= query.maxLoad!
      );
    }

    return results;
  }

  /**
   * Discover agents by capability
   */
  discoverByCapability(capability: string): AgentInfo[] {
    return this.findAgents({ capabilities: [capability] });
  }

  /**
   * Discover agents by protocol
   */
  discoverByProtocol(protocol: string): AgentInfo[] {
    return this.findAgents({ protocols: [protocol] });
  }

  /**
   * Get available agents (online only)
   */
  getAvailableAgents(query?: AgentQuery): AgentInfo[] {
    const baseQuery: AgentQuery = {
      ...query,
      status: [AgentStatus.ONLINE]
    };

    return this.findAgents(baseQuery);
  }

  /**
   * Select best agent using load balancing
   */
  selectAgent(
    query: AgentQuery,
    strategy: 'round-robin' | 'least-load' | 'random' | 'best-performance' = 'least-load'
  ): AgentInfo | undefined {
    const candidates = this.getAvailableAgents(query);

    if (candidates.length === 0) {
      return undefined;
    }

    switch (strategy) {
      case 'round-robin':
        // Simple: return first
        return candidates[0];

      case 'least-load':
        return candidates.reduce((best, current) => {
          const currentLoad = current.health.load || 0;
          const bestLoad = best.health.load || 0;
          return currentLoad < bestLoad ? current : best;
        });

      case 'random':
        return candidates[Math.floor(Math.random() * candidates.length)];

      case 'best-performance':
        return candidates.reduce((best, current) => {
          const currentScore = this.calculatePerformanceScore(current);
          const bestScore = this.calculatePerformanceScore(best);
          return currentScore > bestScore ? current : best;
        });

      default:
        return candidates[0];
    }
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(agent: AgentInfo): number {
    let score = 100;

    // Penalize by load
    const load = agent.health.load || 0;
    score -= load * 50;

    // Penalize by response time
    const responseTime = agent.health.responseTime || 0;
    score -= Math.min(responseTime / 100, 30);

    // Bonus for high success rate
    const successRate = agent.health.successRate || 1;
    score += successRate * 30;

    // Penalize by error rate
    const errorRate = agent.health.errorRate || 0;
    score -= errorRate * 40;

    return Math.max(score, 0);
  }

  /**
   * Start health checking
   */
  startHealthChecking(): void {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckConfig.interval);

    this.emit('health-checking-started');
  }

  /**
   * Stop health checking
   */
  stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      this.emit('health-checking-stopped');
    }
  }

  /**
   * Perform health check on all agents
   */
  private async performHealthCheck(): Promise<void> {
    const now = Date.now();
    const timeout = this.healthCheckConfig.timeout;

    for (const agent of this.agents.values()) {
      const timeSinceHeartbeat = now - agent.health.lastHeartbeat;

      // Check if heartbeat is stale
      if (timeSinceHeartbeat > timeout) {
        const failureCount = (this.failureCounts.get(agent.id) || 0) + 1;
        this.failureCounts.set(agent.id, failureCount);
        this.successCounts.set(agent.id, 0);

        // Transition to degraded
        if (
          agent.status === AgentStatus.ONLINE &&
          failureCount >= 1
        ) {
          this.updateStatus(agent.id, AgentStatus.DEGRADED);
          this.emit('agent-degraded', agent);
        }

        // Transition to offline
        if (failureCount >= this.healthCheckConfig.failureThreshold) {
          this.updateStatus(agent.id, AgentStatus.OFFLINE);
          this.emit('agent-offline', agent);
        }
      }
    }
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const stats = {
      totalAgents: this.agents.size,
      online: 0,
      offline: 0,
      degraded: 0,
      unknown: 0,
      byType: {} as Record<string, number>,
      byProtocol: {} as Record<string, number>,
      capabilities: new Set<string>(),
      avgResponseTime: 0,
      avgLoad: 0
    };

    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let totalLoad = 0;
    let loadCount = 0;

    for (const agent of this.agents.values()) {
      // Count by status
      switch (agent.status) {
        case AgentStatus.ONLINE:
          stats.online++;
          break;
        case AgentStatus.OFFLINE:
          stats.offline++;
          break;
        case AgentStatus.DEGRADED:
          stats.degraded++;
          break;
        case AgentStatus.UNKNOWN:
          stats.unknown++;
          break;
      }

      // Count by type
      stats.byType[agent.type] = (stats.byType[agent.type] || 0) + 1;

      // Count by protocol
      for (const protocol of agent.protocols) {
        stats.byProtocol[protocol] = (stats.byProtocol[protocol] || 0) + 1;
      }

      // Collect capabilities
      for (const capability of agent.capabilities) {
        stats.capabilities.add(capability);
      }

      // Calculate averages
      if (agent.health.responseTime !== undefined) {
        totalResponseTime += agent.health.responseTime;
        responseTimeCount++;
      }

      if (agent.health.load !== undefined) {
        totalLoad += agent.health.load;
        loadCount++;
      }
    }

    stats.avgResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;
    stats.avgLoad = loadCount > 0 ? totalLoad / loadCount : 0;

    return {
      ...stats,
      capabilities: Array.from(stats.capabilities)
    };
  }

  /**
   * Export registry data
   */
  export(): AgentInfo[] {
    return this.getAllAgents();
  }

  /**
   * Import registry data
   */
  import(agents: AgentInfo[]): void {
    for (const agent of agents) {
      this.agents.set(agent.id, agent);
    }
    this.emit('registry-imported', agents.length);
  }

  /**
   * Clear registry
   */
  clear(): void {
    this.agents.clear();
    this.failureCounts.clear();
    this.successCounts.clear();
    this.emit('registry-cleared');
  }

  /**
   * Get agents sorted by performance
   */
  getTopPerformers(count: number = 10): AgentInfo[] {
    const agents = this.getAvailableAgents();

    return agents
      .map(agent => ({
        agent,
        score: this.calculatePerformanceScore(agent)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(item => item.agent);
  }

  /**
   * Get agents needing attention
   */
  getUnhealthyAgents(): AgentInfo[] {
    return Array.from(this.agents.values()).filter(agent =>
      agent.status === AgentStatus.DEGRADED ||
      agent.status === AgentStatus.OFFLINE ||
      (agent.health.errorRate || 0) > 0.1 ||
      (agent.health.load || 0) > 0.8
    );
  }
}

/**
 * Global agent registry instance
 */
export const globalRegistry = new AgentRegistry();
