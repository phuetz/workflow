import {
  RoutingRule,
  RoutingDecision,
  ClassificationResult,
  RuleCondition,
} from '../../types/agents';
import { AgentRegistry } from '../agents/AgentRegistry';
import { logger } from '../../services/SimpleLogger';

/**
 * Routing Rules Engine - Evaluates rules to make routing decisions
 * Provides rule-based routing with priority and condition matching
 */
export class RoutingRules {
  private rules: Map<string, RoutingRule> = new Map();

  constructor() {
    logger.debug('RoutingRules initialized');
  }

  /**
   * Add a routing rule
   */
  addRule(rule: RoutingRule): void {
    if (this.rules.has(rule.id)) {
      logger.warn(`Rule ${rule.id} already exists, overwriting`);
    }

    this.rules.set(rule.id, rule);
    logger.debug(`Added routing rule: ${rule.name} (${rule.id})`);
  }

  /**
   * Remove a routing rule
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      logger.debug(`Removed routing rule: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Update a routing rule
   */
  updateRule(ruleId: string, updates: Partial<RoutingRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return false;
    }

    const updated: RoutingRule = {
      ...rule,
      ...updates,
      id: rule.id, // Preserve ID
    };

    this.rules.set(ruleId, updated);
    logger.debug(`Updated routing rule: ${ruleId}`);
    return true;
  }

  /**
   * Get a routing rule
   */
  getRule(ruleId: string): RoutingRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all routing rules
   */
  getAllRules(): RoutingRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Evaluate rules and make routing decision
   */
  async evaluate(
    classification: ClassificationResult,
    agentRegistry: AgentRegistry
  ): Promise<RoutingDecision | null> {
    // Get enabled rules sorted by priority
    const enabledRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    // Find first matching rule
    for (const rule of enabledRules) {
      if (this.evaluateCondition(rule.condition, classification)) {
        // Check if target agent exists and is available
        const agent = agentRegistry.get(rule.targetAgentId);
        if (!agent) {
          logger.warn(`Rule ${rule.id} targets non-existent agent: ${rule.targetAgentId}`);
          continue;
        }

        if (agent.status !== 'idle' && agent.status !== 'running') {
          logger.warn(`Rule ${rule.id} targets unavailable agent: ${rule.targetAgentId}`);
          continue;
        }

        logger.info(`Matched routing rule: ${rule.name} (${rule.id})`);

        return {
          targetAgentId: agent.id,
          targetAgentName: agent.name,
          confidence: 0.9, // High confidence for rule-based routing
          reasoning: `Matched routing rule: ${rule.name} - ${rule.description}`,
          route: [
            {
              agentId: agent.id,
              stepNumber: 1,
              action: 'execute',
              estimatedDuration: 5000,
            },
          ],
        };
      }
    }

    return null;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: RuleCondition,
    classification: ClassificationResult
  ): boolean {
    try {
      switch (condition.type) {
        case 'intent':
          return this.evaluateIntentCondition(condition, classification.intent);

        case 'keyword':
          return this.evaluateKeywordCondition(condition, classification.keywords || []);

        case 'entity':
          return this.evaluateEntityCondition(
            condition,
            classification.entities.map(e => e.type)
          );

        case 'custom':
          // Custom conditions would require additional implementation
          return false;

        default:
          logger.warn(`Unknown condition type: ${condition.type}`);
          return false;
      }
    } catch (error) {
      logger.error(`Error evaluating condition:`, error);
      return false;
    }
  }

  /**
   * Evaluate intent condition
   */
  private evaluateIntentCondition(condition: RuleCondition, intent: string): boolean {
    switch (condition.operator) {
      case 'equals':
        return intent === condition.value;
      case 'contains':
        return intent.includes(condition.value as string);
      case 'matches':
        if (typeof condition.value === 'string') {
          const regex = new RegExp(condition.value);
          return regex.test(intent);
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * Evaluate keyword condition
   */
  private evaluateKeywordCondition(condition: RuleCondition, keywords: string[]): boolean {
    switch (condition.operator) {
      case 'contains':
        if (typeof condition.value === 'string') {
          return keywords.includes(condition.value);
        }
        return false;

      case 'in':
        if (Array.isArray(condition.value)) {
          return keywords.some(k => (condition.value as string[]).includes(k));
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Evaluate entity condition
   */
  private evaluateEntityCondition(condition: RuleCondition, entityTypes: string[]): boolean {
    switch (condition.operator) {
      case 'contains':
        if (typeof condition.value === 'string') {
          return entityTypes.includes(condition.value);
        }
        return false;

      case 'in':
        if (Array.isArray(condition.value)) {
          return entityTypes.some(type => (condition.value as string[]).includes(type));
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Enable a rule
   */
  enableRule(ruleId: string): boolean {
    return this.updateRule(ruleId, { enabled: true });
  }

  /**
   * Disable a rule
   */
  disableRule(ruleId: string): boolean {
    return this.updateRule(ruleId, { enabled: false });
  }

  /**
   * Clear all rules
   */
  clearAll(): void {
    this.rules.clear();
    logger.info('All routing rules cleared');
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    disabledRules: number;
    rulesByPriority: Record<number, number>;
  } {
    const rules = Array.from(this.rules.values());
    const rulesByPriority: Record<number, number> = {};

    rules.forEach(rule => {
      rulesByPriority[rule.priority] = (rulesByPriority[rule.priority] || 0) + 1;
    });

    return {
      totalRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
      disabledRules: rules.filter(r => !r.enabled).length,
      rulesByPriority,
    };
  }
}
