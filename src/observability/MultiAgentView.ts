/**
 * Multi-Agent View
 * Real-time agent coordination and communication visualization
 *
 * Features:
 * - Agent status and health monitoring
 * - Inter-agent communication tracking
 * - Resource utilization per agent
 * - Bottleneck detection
 * - Coordination pattern analysis
 */

import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';
import { globalMetricsCollector } from './RealTimeMetricsCollector';

/**
 * Agent status
 */
export type AgentStatus = 'idle' | 'busy' | 'waiting' | 'error' | 'offline';

/**
 * Agent health
 */
export interface AgentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  lastHeartbeat: number;
  errorRate: number;
  responseTime: number;
}

/**
 * Agent resource usage
 */
export interface AgentResourceUsage {
  cpuPercent: number;
  memoryMB: number;
  networkKBps: number;
  queueSize: number;
  activeTasks: number;
}

/**
 * Agent info
 */
export interface AgentInfo {
  agentId: string;
  agentType: string;
  name: string;
  status: AgentStatus;
  health: AgentHealth;
  resources: AgentResourceUsage;
  capabilities: string[];
  metadata?: Record<string, unknown>;
  startTime: number;
  lastActivity: number;
}

/**
 * Agent communication
 */
export interface AgentCommunication {
  id: string;
  fromAgent: string;
  toAgent: string;
  messageType: string;
  timestamp: number;
  duration?: number;
  success: boolean;
  payload?: unknown;
  error?: string;
}

/**
 * Coordination pattern
 */
export interface CoordinationPattern {
  pattern: 'sequential' | 'parallel' | 'hierarchical' | 'collaborative' | 'competitive';
  agents: string[];
  frequency: number;
  avgDuration: number;
  successRate: number;
}

/**
 * Bottleneck info
 */
export interface BottleneckInfo {
  agentId: string;
  type: 'cpu' | 'memory' | 'queue' | 'network' | 'dependency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impactedAgents: string[];
  detectedAt: number;
}

/**
 * Multi-Agent View Monitor
 */
export class MultiAgentView extends EventEmitter {
  private agents = new Map<string, AgentInfo>();
  private communications: AgentCommunication[] = [];
  private patterns: CoordinationPattern[] = [];
  private bottlenecks: BottleneckInfo[] = [];
  private maxCommunicationHistory = 1000;
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startPatternAnalysis();
    logger.info('MultiAgentView initialized');
  }

  /**
   * Register agent
   */
  registerAgent(
    agentId: string,
    agentType: string,
    name: string,
    capabilities: string[],
    metadata?: Record<string, unknown>
  ): void {
    const now = Date.now();

    const agentInfo: AgentInfo = {
      agentId,
      agentType,
      name,
      status: 'idle',
      health: {
        status: 'healthy',
        uptime: 0,
        lastHeartbeat: now,
        errorRate: 0,
        responseTime: 0
      },
      resources: {
        cpuPercent: 0,
        memoryMB: 0,
        networkKBps: 0,
        queueSize: 0,
        activeTasks: 0
      },
      capabilities,
      metadata,
      startTime: now,
      lastActivity: now
    };

    this.agents.set(agentId, agentInfo);

    this.emit('agent:registered', { agentId, agentInfo });

    logger.info('Agent registered', {
      agentId,
      agentType,
      name,
      capabilities
    });
  }

  /**
   * Unregister agent
   */
  unregisterAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    this.agents.delete(agentId);

    this.emit('agent:unregistered', { agentId });

    logger.info('Agent unregistered', { agentId });
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId: string, status: AgentStatus): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.status = status;
    agent.lastActivity = Date.now();

    this.emit('agent:status_changed', { agentId, status });

    logger.debug('Agent status updated', { agentId, status });
  }

  /**
   * Update agent health
   */
  updateAgentHealth(
    agentId: string,
    health: Partial<AgentHealth>
  ): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.health = {
      ...agent.health,
      ...health,
      lastHeartbeat: Date.now()
    };

    // Calculate uptime
    agent.health.uptime = Date.now() - agent.startTime;

    // Determine health status
    if (agent.health.errorRate > 0.5 || agent.health.responseTime > 5000) {
      agent.health.status = 'unhealthy';
    } else if (agent.health.errorRate > 0.1 || agent.health.responseTime > 2000) {
      agent.health.status = 'degraded';
    } else {
      agent.health.status = 'healthy';
    }

    this.emit('agent:health_changed', { agentId, health: agent.health });
  }

  /**
   * Update agent resources
   */
  updateAgentResources(
    agentId: string,
    resources: Partial<AgentResourceUsage>
  ): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.resources = {
      ...agent.resources,
      ...resources
    };

    // Record metrics
    if (resources.cpuPercent !== undefined) {
      globalMetricsCollector.setGauge('agent_cpu_usage_percent', resources.cpuPercent, {
        agent_id: agentId
      });
    }

    if (resources.memoryMB !== undefined) {
      globalMetricsCollector.setGauge('agent_memory_usage_mb', resources.memoryMB, {
        agent_id: agentId
      });
    }

    if (resources.queueSize !== undefined) {
      globalMetricsCollector.setGauge('agent_queue_size', resources.queueSize, {
        agent_id: agentId
      });
    }

    // Check for bottlenecks
    this.detectBottlenecks(agentId);

    this.emit('agent:resources_changed', { agentId, resources: agent.resources });
  }

  /**
   * Record agent communication
   */
  recordCommunication(
    fromAgent: string,
    toAgent: string,
    messageType: string,
    success: boolean,
    duration?: number,
    payload?: unknown,
    error?: string
  ): void {
    const communication: AgentCommunication = {
      id: `${fromAgent}-${toAgent}-${Date.now()}`,
      fromAgent,
      toAgent,
      messageType,
      timestamp: Date.now(),
      duration,
      success,
      payload,
      error
    };

    this.communications.push(communication);

    // Limit history size
    if (this.communications.length > this.maxCommunicationHistory) {
      this.communications = this.communications.slice(-this.maxCommunicationHistory);
    }

    // Record metric
    globalMetricsCollector.incrementCounter('agent_communications_total', {
      from_agent: fromAgent,
      to_agent: toAgent,
      message_type: messageType,
      success: success.toString()
    });

    if (duration) {
      globalMetricsCollector.observeHistogram('agent_communication_duration_ms', duration, {
        from_agent: fromAgent,
        to_agent: toAgent
      });
    }

    this.emit('communication:recorded', { communication });

    logger.debug('Agent communication recorded', {
      fromAgent,
      toAgent,
      messageType,
      success,
      duration
    });
  }

  /**
   * Get all agents
   */
  getAgents(filter?: {
    status?: AgentStatus[];
    agentType?: string;
    healthStatus?: AgentHealth['status'][];
  }): AgentInfo[] {
    let agents = Array.from(this.agents.values());

    if (filter) {
      if (filter.status) {
        agents = agents.filter(a => filter.status!.includes(a.status));
      }

      if (filter.agentType) {
        agents = agents.filter(a => a.agentType === filter.agentType);
      }

      if (filter.healthStatus) {
        agents = agents.filter(a => filter.healthStatus!.includes(a.health.status));
      }
    }

    return agents;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentInfo | null {
    return this.agents.get(agentId) || null;
  }

  /**
   * Get recent communications
   */
  getCommunications(
    agentId?: string,
    limit: number = 100
  ): AgentCommunication[] {
    let communications = [...this.communications];

    if (agentId) {
      communications = communications.filter(
        c => c.fromAgent === agentId || c.toAgent === agentId
      );
    }

    return communications.slice(-limit);
  }

  /**
   * Get communication graph
   */
  getCommunicationGraph(): {
    nodes: { id: string; label: string; type: string }[];
    edges: { source: string; target: string; weight: number }[];
  } {
    const nodes = Array.from(this.agents.values()).map(agent => ({
      id: agent.agentId,
      label: agent.name,
      type: agent.agentType
    }));

    // Count communications between agents
    const edgeMap = new Map<string, number>();

    for (const comm of this.communications) {
      const key = `${comm.fromAgent}-${comm.toAgent}`;
      edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
    }

    const edges = Array.from(edgeMap.entries()).map(([key, weight]) => {
      const [source, target] = key.split('-');
      return { source, target, weight };
    });

    return { nodes, edges };
  }

  /**
   * Get coordination patterns
   */
  getCoordinationPatterns(): CoordinationPattern[] {
    return [...this.patterns];
  }

  /**
   * Get bottlenecks
   */
  getBottlenecks(severity?: BottleneckInfo['severity'][]): BottleneckInfo[] {
    let bottlenecks = [...this.bottlenecks];

    if (severity) {
      bottlenecks = bottlenecks.filter(b => severity.includes(b.severity));
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    bottlenecks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return bottlenecks;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalAgents: number;
    activeAgents: number;
    idleAgents: number;
    unhealthyAgents: number;
    totalCommunications: number;
    avgCommunicationDuration: number;
    communicationSuccessRate: number;
    bottleneckCount: number;
  } {
    const totalAgents = this.agents.size;
    const activeAgents = Array.from(this.agents.values()).filter(
      a => a.status === 'busy'
    ).length;
    const idleAgents = Array.from(this.agents.values()).filter(
      a => a.status === 'idle'
    ).length;
    const unhealthyAgents = Array.from(this.agents.values()).filter(
      a => a.health.status === 'unhealthy'
    ).length;

    const totalCommunications = this.communications.length;
    const successfulCommunications = this.communications.filter(c => c.success).length;
    const communicationsWithDuration = this.communications.filter(c => c.duration);
    const totalDuration = communicationsWithDuration.reduce((sum, c) => sum + (c.duration || 0), 0);
    const avgCommunicationDuration = communicationsWithDuration.length > 0
      ? totalDuration / communicationsWithDuration.length
      : 0;
    const communicationSuccessRate = totalCommunications > 0
      ? (successfulCommunications / totalCommunications) * 100
      : 0;

    return {
      totalAgents,
      activeAgents,
      idleAgents,
      unhealthyAgents,
      totalCommunications,
      avgCommunicationDuration,
      communicationSuccessRate,
      bottleneckCount: this.bottlenecks.length
    };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.communications = [];
    this.bottlenecks = [];
    logger.info('Multi-agent history cleared');
  }

  /**
   * Shutdown monitor
   */
  shutdown(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    this.removeAllListeners();
    logger.info('MultiAgentView shutdown');
  }

  // Private methods

  private startPatternAnalysis(): void {
    // Analyze patterns every 30 seconds
    this.analysisInterval = setInterval(() => {
      this.analyzePatterns();
    }, 30000);
  }

  private analyzePatterns(): void {
    // Group communications by agent pairs
    const pairMap = new Map<string, AgentCommunication[]>();

    for (const comm of this.communications) {
      const key = [comm.fromAgent, comm.toAgent].sort().join('-');
      if (!pairMap.has(key)) {
        pairMap.set(key, []);
      }
      pairMap.get(key)!.push(comm);
    }

    // Analyze each pair
    const newPatterns: CoordinationPattern[] = [];

    for (const [key, comms] of pairMap) {
      if (comms.length < 5) continue; // Need minimum communications

      const agents = key.split('-');
      const durations = comms.filter(c => c.duration).map(c => c.duration!);
      const avgDuration = durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;
      const successCount = comms.filter(c => c.success).length;
      const successRate = (successCount / comms.length) * 100;

      // Determine pattern type
      let pattern: CoordinationPattern['pattern'] = 'collaborative';

      // Check if sequential (one-way mostly)
      const fromFirst = comms.filter(c => c.fromAgent === agents[0]).length;
      const fromSecond = comms.filter(c => c.fromAgent === agents[1]).length;
      if (Math.abs(fromFirst - fromSecond) / comms.length > 0.8) {
        pattern = 'sequential';
      }

      newPatterns.push({
        pattern,
        agents,
        frequency: comms.length,
        avgDuration,
        successRate
      });
    }

    this.patterns = newPatterns;

    logger.debug('Coordination patterns analyzed', {
      patternsFound: newPatterns.length
    });
  }

  private detectBottlenecks(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const newBottlenecks: BottleneckInfo[] = [];

    // CPU bottleneck
    if (agent.resources.cpuPercent > 90) {
      newBottlenecks.push({
        agentId,
        type: 'cpu',
        severity: agent.resources.cpuPercent > 95 ? 'critical' : 'high',
        description: `High CPU usage: ${agent.resources.cpuPercent.toFixed(1)}%`,
        impactedAgents: this.findDependentAgents(agentId),
        detectedAt: Date.now()
      });
    }

    // Memory bottleneck
    if (agent.resources.memoryMB > 8000) {
      newBottlenecks.push({
        agentId,
        type: 'memory',
        severity: agent.resources.memoryMB > 12000 ? 'critical' : 'high',
        description: `High memory usage: ${agent.resources.memoryMB.toFixed(0)}MB`,
        impactedAgents: this.findDependentAgents(agentId),
        detectedAt: Date.now()
      });
    }

    // Queue bottleneck
    if (agent.resources.queueSize > 100) {
      newBottlenecks.push({
        agentId,
        type: 'queue',
        severity: agent.resources.queueSize > 500 ? 'critical' : 'medium',
        description: `Large queue size: ${agent.resources.queueSize}`,
        impactedAgents: this.findDependentAgents(agentId),
        detectedAt: Date.now()
      });
    }

    // Add new bottlenecks
    for (const bottleneck of newBottlenecks) {
      // Check if already exists
      const exists = this.bottlenecks.some(
        b => b.agentId === bottleneck.agentId && b.type === bottleneck.type
      );

      if (!exists) {
        this.bottlenecks.push(bottleneck);
        this.emit('bottleneck:detected', { bottleneck });

        logger.warn('Bottleneck detected', {
          agentId: bottleneck.agentId,
          type: bottleneck.type,
          severity: bottleneck.severity
        });
      }
    }

    // Remove resolved bottlenecks
    this.bottlenecks = this.bottlenecks.filter(bottleneck => {
      if (bottleneck.agentId !== agentId) return true;

      const resolved =
        (bottleneck.type === 'cpu' && agent.resources.cpuPercent < 70) ||
        (bottleneck.type === 'memory' && agent.resources.memoryMB < 6000) ||
        (bottleneck.type === 'queue' && agent.resources.queueSize < 50);

      if (resolved) {
        this.emit('bottleneck:resolved', { bottleneck });
        logger.info('Bottleneck resolved', {
          agentId: bottleneck.agentId,
          type: bottleneck.type
        });
      }

      return !resolved;
    });
  }

  private findDependentAgents(agentId: string): string[] {
    const dependent = new Set<string>();

    // Find agents that communicate with this agent
    for (const comm of this.communications) {
      if (comm.fromAgent === agentId) {
        dependent.add(comm.toAgent);
      }
      if (comm.toAgent === agentId) {
        dependent.add(comm.fromAgent);
      }
    }

    return Array.from(dependent);
  }
}

/**
 * Global multi-agent view instance
 */
export const globalMultiAgentView = new MultiAgentView();
