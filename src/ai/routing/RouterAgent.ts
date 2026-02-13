import { AgentBase } from '../agents/AgentBase';
import { AgentRegistry } from '../agents/AgentRegistry';
import { ClassifierAgent } from './ClassifierAgent';
import { RoutingRules } from './RoutingRules';
import {
  AgentInput,
  AgentOutput,
  RoutingDecision,
  ClassificationResult,
  Agent,
} from '../../types/agents';
import { logger } from '../../services/SimpleLogger';

/**
 * Router Agent - Routes tasks to appropriate specialized agents
 * Uses classification and routing rules to make intelligent routing decisions
 */
export class RouterAgent extends AgentBase {
  private classifier: ClassifierAgent;
  private routingRules: RoutingRules;
  private agentRegistry: AgentRegistry;
  private routingHistory: RoutingHistoryEntry[] = [];

  constructor(config: {
    id?: string;
    classifier?: ClassifierAgent;
    agentRegistry: AgentRegistry;
    llmModel?: string;
  }) {
    super({
      id: config.id || 'router-agent',
      name: 'Router Agent',
      description: 'Routes tasks to specialized agents based on intent and capabilities',
      type: 'router',
      capabilities: ['routing', 'classification', 'planning'],
      config: {
        llmModel: config.llmModel || 'gpt-4',
        temperature: 0.2,
        maxTokens: 500,
      },
    });

    this.classifier = config.classifier || new ClassifierAgent({ llmModel: config.llmModel });
    this.routingRules = new RoutingRules();
    this.agentRegistry = config.agentRegistry;

    this.registerDefaultRules();
  }

  /**
   * Execute routing decision
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    try {
      // Classify the input
      const classification = await this.classifier.execute(input);
      const classificationResult = classification.result as ClassificationResult;

      // Make routing decision
      const routingDecision = await this.route(classificationResult, input);

      // Record in history
      this.routingHistory.push({
        timestamp: new Date().toISOString(),
        intent: classificationResult.intent,
        targetAgent: routingDecision.targetAgentId,
        confidence: routingDecision.confidence,
      });

      if (this.routingHistory.length > 1000) {
        this.routingHistory.shift();
      }

      logger.info(`Routed to ${routingDecision.targetAgentName} in ${Date.now() - startTime}ms`);

      return {
        result: routingDecision,
        confidence: routingDecision.confidence,
        reasoning: routingDecision.reasoning,
        metadata: {
          classification: classificationResult,
          route: routingDecision.route,
        },
      };
    } catch (error) {
      logger.error('Routing failed:', error);
      throw error;
    }
  }

  /**
   * Route based on classification
   */
  async route(
    classification: ClassificationResult,
    input: AgentInput
  ): Promise<RoutingDecision> {
    // Try rule-based routing first
    const ruleBasedDecision = await this.routingRules.evaluate(
      classification,
      this.agentRegistry
    );

    if (ruleBasedDecision && ruleBasedDecision.confidence > 0.8) {
      return ruleBasedDecision;
    }

    // Fallback to capability-based routing
    const capabilityBasedDecision = await this.routeByCapability(classification, input);

    if (capabilityBasedDecision) {
      return capabilityBasedDecision;
    }

    // Fallback to default agent or error
    return this.getDefaultRoute(classification);
  }

  /**
   * Route based on required capabilities
   */
  private async routeByCapability(
    classification: ClassificationResult,
    input: AgentInput
  ): Promise<RoutingDecision | null> {
    // Determine required capabilities based on intent
    const requiredCapabilities = this.getRequiredCapabilities(classification.intent);

    if (requiredCapabilities.length === 0) {
      return null;
    }

    // Find agents with required capabilities
    const suitableAgents = this.agentRegistry.findByCapabilities(requiredCapabilities);

    if (suitableAgents.length === 0) {
      return null;
    }

    // Select best agent based on performance
    const bestAgent = this.agentRegistry.getBestAgent({
      capabilities: requiredCapabilities,
    });

    if (!bestAgent) {
      return null;
    }

    return {
      targetAgentId: bestAgent.id,
      targetAgentName: bestAgent.name,
      confidence: 0.7,
      reasoning: `Selected agent based on capabilities: ${requiredCapabilities.join(', ')}`,
      route: [
        {
          agentId: bestAgent.id,
          stepNumber: 1,
          action: 'execute',
          estimatedDuration: 5000,
        },
      ],
    };
  }

  /**
   * Get required capabilities for an intent
   */
  private getRequiredCapabilities(intent: string): Agent['capabilities'] {
    const capabilityMap: Record<string, Agent['capabilities']> = {
      'workflow.create': ['workflow-execution', 'planning'],
      'workflow.execute': ['workflow-execution'],
      'workflow.edit': ['workflow-execution', 'planning'],
      'data.query': ['data-processing'],
      'data.transform': ['data-processing'],
      'code.execute': ['code-execution'],
      'api.call': ['api-integration'],
    };

    return capabilityMap[intent] || [];
  }

  /**
   * Get default/fallback route
   */
  private getDefaultRoute(classification: ClassificationResult): RoutingDecision {
    // Try to find any available agent
    const availableAgents = this.agentRegistry.findAvailable();

    if (availableAgents.length > 0) {
      const agent = availableAgents[0];
      return {
        targetAgentId: agent.id,
        targetAgentName: agent.name,
        confidence: 0.3,
        reasoning: 'No specific match found, using default available agent',
        route: [
          {
            agentId: agent.id,
            stepNumber: 1,
            action: 'execute',
            estimatedDuration: 10000,
          },
        ],
      };
    }

    // No agents available
    throw new Error('No suitable agents available for routing');
  }

  /**
   * Register default routing rules
   */
  private registerDefaultRules(): void {
    this.routingRules.addRule({
      id: 'workflow-create',
      name: 'Route workflow creation',
      description: 'Routes workflow creation requests to workflow agents',
      condition: {
        type: 'intent',
        operator: 'equals',
        value: 'workflow.create',
      },
      targetAgentId: 'workflow-agent',
      priority: 100,
      enabled: true,
      metadata: {},
    });

    this.routingRules.addRule({
      id: 'data-query',
      name: 'Route data queries',
      description: 'Routes data queries to data processing agents',
      condition: {
        type: 'intent',
        operator: 'equals',
        value: 'data.query',
      },
      targetAgentId: 'data-agent',
      priority: 90,
      enabled: true,
      metadata: {},
    });
  }

  /**
   * Get routing statistics
   */
  getStats(): {
    totalRoutes: number;
    routesByAgent: Record<string, number>;
    averageConfidence: number;
  } {
    const routesByAgent: Record<string, number> = {};
    let totalConfidence = 0;

    this.routingHistory.forEach(entry => {
      routesByAgent[entry.targetAgent] = (routesByAgent[entry.targetAgent] || 0) + 1;
      totalConfidence += entry.confidence;
    });

    return {
      totalRoutes: this.routingHistory.length,
      routesByAgent,
      averageConfidence:
        this.routingHistory.length > 0 ? totalConfidence / this.routingHistory.length : 0,
    };
  }

  /**
   * Get routing history
   */
  getHistory(limit = 100): RoutingHistoryEntry[] {
    return this.routingHistory.slice(-limit);
  }
}

// Types
interface RoutingHistoryEntry {
  timestamp: string;
  intent: string;
  targetAgent: string;
  confidence: number;
}
