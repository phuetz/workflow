import { Agent, AgentCapability } from '../../types/agents';
import { AgentBase } from './AgentBase';
import { AgentRegistry } from './AgentRegistry';
import { AgentToolWrapper, AgentToolFactory } from './AgentTool';
import { logger } from '../../services/SimpleLogger';

/**
 * ToolDiscovery - Dynamic discovery of agent tools
 * Finds and selects the best agent tools for specific tasks
 */
export class ToolDiscovery {
  private registry: AgentRegistry;
  private toolFactory: AgentToolFactory;
  private discoveryCache: Map<string, DiscoveryResult> = new Map();
  private cacheTTL = 60000; // 1 minute cache
  private indexUpdateInterval?: NodeJS.Timeout;
  private capabilityIndex: Map<string, Set<string>> = new Map();
  private semanticIndex: Map<string, string[]> = new Map();

  constructor(registry: AgentRegistry) {
    this.registry = registry;
    this.toolFactory = AgentToolFactory.getInstance();

    // Build initial indexes
    this.buildIndexes();

    // Auto-update indexes every minute
    this.startIndexUpdates();

    logger.info('ToolDiscovery initialized');
  }

  /**
   * Discover available agent tools for a task
   */
  async discover(query: DiscoveryQuery): Promise<DiscoveryResult> {
    const cacheKey = this.getCacheKey(query);

    // Check cache first
    const cached = this.discoveryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      logger.debug('Tool discovery cache hit', { query });
      return cached;
    }

    const startTime = Date.now();

    // Find matching agents
    const candidates = this.findCandidateAgents(query);

    // Score and rank agents
    const scoredAgents = this.scoreAgents(candidates, query);

    // Create tools from top agents
    const tools = this.createToolsFromAgents(scoredAgents, query);

    const result: DiscoveryResult = {
      query,
      tools,
      totalCandidates: candidates.length,
      selectedCount: tools.length,
      executionTime: Date.now() - startTime,
      timestamp: Date.now(),
    };

    // Cache result
    this.discoveryCache.set(cacheKey, result);

    // Clean old cache entries
    this.cleanCache();

    logger.debug('Tool discovery completed', {
      query,
      candidates: candidates.length,
      selected: tools.length,
      executionTime: result.executionTime,
    });

    return result;
  }

  /**
   * Discover tools by capability
   */
  async discoverByCapability(
    capabilities: AgentCapability[],
    options: DiscoveryOptions = {}
  ): Promise<AgentToolWrapper[]> {
    const query: DiscoveryQuery = {
      capabilities,
      maxTools: options.maxTools || 10,
      minConfidence: options.minConfidence || 0.5,
    };

    const result = await this.discover(query);
    return result.tools;
  }

  /**
   * Discover tools by task description (semantic search)
   */
  async discoverByDescription(
    description: string,
    options: DiscoveryOptions = {}
  ): Promise<AgentToolWrapper[]> {
    const query: DiscoveryQuery = {
      description,
      maxTools: options.maxTools || 10,
      minConfidence: options.minConfidence || 0.5,
    };

    const result = await this.discover(query);
    return result.tools;
  }

  /**
   * Get the best tool for a specific task
   */
  async getBestTool(
    taskDescription: string,
    requiredCapabilities?: AgentCapability[]
  ): Promise<AgentToolWrapper | null> {
    const query: DiscoveryQuery = {
      description: taskDescription,
      capabilities: requiredCapabilities,
      maxTools: 1,
      minConfidence: 0.7,
    };

    const result = await this.discover(query);
    return result.tools[0] || null;
  }

  /**
   * Get all available tools
   */
  getAllTools(): AgentToolWrapper[] {
    return this.toolFactory.getAllTools();
  }

  /**
   * Register an agent and create its tool
   */
  registerAgentTool(agent: AgentBase): AgentToolWrapper {
    const tool = this.toolFactory.createTool(agent);
    this.updateIndexesForAgent(agent);

    logger.info(`Registered agent tool: ${tool.name}`);
    return tool;
  }

  /**
   * Unregister an agent tool
   */
  unregisterAgentTool(agentId: string): boolean {
    const tool = this.findToolByAgentId(agentId);
    if (!tool) {
      return false;
    }

    this.toolFactory.removeTool(tool.id);
    this.removeFromIndexes(agentId);

    logger.info(`Unregistered agent tool for agent: ${agentId}`);
    return true;
  }

  /**
   * Get discovery statistics
   */
  getStats(): ToolDiscoveryStats {
    const factoryStats = this.toolFactory.getStats();

    return {
      totalTools: factoryStats.totalTools,
      cacheSize: this.discoveryCache.size,
      cacheHitRate: this.calculateCacheHitRate(),
      indexedCapabilities: this.capabilityIndex.size,
      indexedTerms: this.semanticIndex.size,
      averageDiscoveryTime: 0, // Would need to track this
      ...factoryStats,
    };
  }

  /**
   * Clear discovery cache
   */
  clearCache(): void {
    this.discoveryCache.clear();
    logger.debug('Tool discovery cache cleared');
  }

  /**
   * Rebuild indexes
   */
  rebuildIndexes(): void {
    this.buildIndexes();
    logger.info('Tool discovery indexes rebuilt');
  }

  /**
   * Shutdown the discovery service
   */
  shutdown(): void {
    if (this.indexUpdateInterval) {
      clearInterval(this.indexUpdateInterval);
    }
    this.discoveryCache.clear();
    logger.info('ToolDiscovery shut down');
  }

  // Private methods

  private findCandidateAgents(query: DiscoveryQuery): AgentBase[] {
    let candidates: AgentBase[] = [];

    // Filter by capabilities if specified
    if (query.capabilities && query.capabilities.length > 0) {
      candidates = this.registry.findByCapabilities(query.capabilities);
    } else {
      candidates = this.registry.findAvailable();
    }

    // Filter by description if specified (keyword matching)
    if (query.description) {
      candidates = this.filterByDescription(candidates, query.description);
    }

    // Filter by type if specified
    if (query.agentType) {
      candidates = candidates.filter(agent => agent.type === query.agentType);
    }

    // Filter by status - only available agents
    candidates = candidates.filter(agent =>
      agent.status === 'idle' || agent.status === 'running'
    );

    return candidates;
  }

  private scoreAgents(agents: AgentBase[], query: DiscoveryQuery): ScoredAgent[] {
    return agents
      .map(agent => ({
        agent,
        score: this.calculateAgentScore(agent, query),
      }))
      .filter(scored => scored.score >= (query.minConfidence || 0))
      .sort((a, b) => b.score - a.score);
  }

  private calculateAgentScore(agent: AgentBase, query: DiscoveryQuery): number {
    let score = 0;

    // Capability match score (40%)
    if (query.capabilities) {
      const matchedCaps = query.capabilities.filter(cap =>
        agent.capabilities.includes(cap)
      );
      score += (matchedCaps.length / query.capabilities.length) * 0.4;
    } else {
      score += 0.4; // No capability requirement
    }

    // Performance score (30%)
    const analytics = agent.getAnalytics();
    const successRate = analytics.totalTasks > 0
      ? analytics.completedTasks / analytics.totalTasks
      : 1;
    score += successRate * 0.3;

    // Availability score (15%)
    const availabilityScore = agent.status === 'idle' ? 1 : 0.5;
    score += availabilityScore * 0.15;

    // Description match score (15%)
    if (query.description) {
      const descriptionScore = this.calculateDescriptionMatch(agent, query.description);
      score += descriptionScore * 0.15;
    } else {
      score += 0.15;
    }

    return Math.min(1, score);
  }

  private calculateDescriptionMatch(agent: AgentBase, description: string): number {
    const lowerDesc = description.toLowerCase();
    const agentDesc = agent.description.toLowerCase();
    const agentName = agent.name.toLowerCase();

    // Simple keyword matching
    const keywords = lowerDesc.split(/\s+/).filter(w => w.length > 3);
    if (keywords.length === 0) {
      return 0.5;
    }

    const matches = keywords.filter(kw =>
      agentDesc.includes(kw) || agentName.includes(kw)
    );

    return matches.length / keywords.length;
  }

  private filterByDescription(agents: AgentBase[], description: string): AgentBase[] {
    return agents.filter(agent =>
      this.calculateDescriptionMatch(agent, description) > 0.3
    );
  }

  private createToolsFromAgents(
    scoredAgents: ScoredAgent[],
    query: DiscoveryQuery
  ): AgentToolWrapper[] {
    const maxTools = query.maxTools || 10;
    const topAgents = scoredAgents.slice(0, maxTools);

    return topAgents.map(({ agent, score }) => {
      // Check if tool already exists
      let tool = this.findToolByAgentId(agent.id);

      if (!tool) {
        // Create new tool
        tool = this.toolFactory.createTool(agent, {
          metadata: {
            discoveryScore: score,
            discoveryQuery: query.description || 'capability-based',
          },
        });
      }

      return tool;
    });
  }

  private findToolByAgentId(agentId: string): AgentToolWrapper | undefined {
    return this.toolFactory.getAllTools().find(tool =>
      tool.getAgent().id === agentId
    );
  }

  private buildIndexes(): void {
    this.capabilityIndex.clear();
    this.semanticIndex.clear();

    const agents = this.registry.getAll();

    agents.forEach(agent => {
      this.updateIndexesForAgent(agent);
    });

    logger.debug('Tool discovery indexes built', {
      capabilities: this.capabilityIndex.size,
      terms: this.semanticIndex.size,
    });
  }

  private updateIndexesForAgent(agent: Agent): void {
    // Index by capabilities
    agent.capabilities.forEach(cap => {
      const agentSet = this.capabilityIndex.get(cap) || new Set();
      agentSet.add(agent.id);
      this.capabilityIndex.set(cap, agentSet);
    });

    // Index by keywords from description
    const keywords = this.extractKeywords(agent.description + ' ' + agent.name);
    keywords.forEach(kw => {
      const agentIds = this.semanticIndex.get(kw) || [];
      if (!agentIds.includes(agent.id)) {
        agentIds.push(agent.id);
      }
      this.semanticIndex.set(kw, agentIds);
    });
  }

  private removeFromIndexes(agentId: string): void {
    // Remove from capability index
    this.capabilityIndex.forEach((agentSet, cap) => {
      agentSet.delete(agentId);
      if (agentSet.size === 0) {
        this.capabilityIndex.delete(cap);
      }
    });

    // Remove from semantic index
    this.semanticIndex.forEach((agentIds, kw) => {
      const index = agentIds.indexOf(agentId);
      if (index > -1) {
        agentIds.splice(index, 1);
        if (agentIds.length === 0) {
          this.semanticIndex.delete(kw);
        }
      }
    });
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'that', 'this', 'with', 'from', 'have', 'will', 'would',
      'could', 'should', 'about', 'which', 'their', 'there',
    ]);
    return stopWords.has(word);
  }

  private startIndexUpdates(): void {
    this.indexUpdateInterval = setInterval(() => {
      this.buildIndexes();
    }, 60000); // Update every minute
  }

  private getCacheKey(query: DiscoveryQuery): string {
    return JSON.stringify({
      desc: query.description,
      caps: query.capabilities?.sort(),
      type: query.agentType,
      max: query.maxTools,
      min: query.minConfidence,
    });
  }

  private cleanCache(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.discoveryCache.forEach((result, key) => {
      if (now - result.timestamp > this.cacheTTL * 2) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => this.discoveryCache.delete(key));
  }

  private calculateCacheHitRate(): number {
    // This would require tracking hits/misses
    // For now, return 0
    return 0;
  }
}

// Types

export interface DiscoveryQuery {
  description?: string;
  capabilities?: AgentCapability[];
  agentType?: Agent['type'];
  maxTools?: number;
  minConfidence?: number;
  excludeAgents?: string[];
}

export interface DiscoveryOptions {
  maxTools?: number;
  minConfidence?: number;
}

export interface DiscoveryResult {
  query: DiscoveryQuery;
  tools: AgentToolWrapper[];
  totalCandidates: number;
  selectedCount: number;
  executionTime: number;
  timestamp: number;
}

interface ScoredAgent {
  agent: AgentBase;
  score: number;
}

export interface ToolDiscoveryStats {
  totalTools: number;
  cacheSize: number;
  cacheHitRate: number;
  indexedCapabilities: number;
  indexedTerms: number;
  averageDiscoveryTime: number;
  toolsByCategory: Record<string, number>;
  toolsByCapability: Record<string, number>;
  totalExecutions: number;
  totalSuccesses: number;
  totalFailures: number;
  totalCost: number;
  averageSuccessRate: number;
}
