/**
 * Healing Strategy Library
 * 20+ pre-built healing strategies for common error scenarios
 */

import {
  HealingStrategy,
  StrategyCategory,
  WorkflowError,
  HealingContext,
  HealingResult,
  ActionType,
  ErrorType
} from '../types/healing';
import { logger } from '../services/SimpleLogger';

// Strategy implementations will be added here
export const ALL_HEALING_STRATEGIES: HealingStrategy[] = [];

export class HealingStrategyRegistry {
  private strategies: Map<string, HealingStrategy> = new Map();

  constructor() {
    for (const strategy of ALL_HEALING_STRATEGIES) {
      this.register(strategy);
    }
  }

  register(strategy: HealingStrategy): void {
    this.strategies.set(strategy.id, strategy);
    logger.info(`Registered healing strategy: ${strategy.name}`);
  }

  get(strategyId: string): HealingStrategy | undefined {
    return this.strategies.get(strategyId);
  }

  getAll(): HealingStrategy[] {
    return Array.from(this.strategies.values());
  }

  getByErrorType(errorType: ErrorType): HealingStrategy[] {
    return this.getAll()
      .filter(s => s.applicableErrors.includes(errorType))
      .sort((a, b) => a.priority - b.priority);
  }

  getByCategory(category: StrategyCategory): HealingStrategy[] {
    return this.getAll().filter(s => s.category === category);
  }
}

export const healingStrategyRegistry = new HealingStrategyRegistry();
