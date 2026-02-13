/**
 * Model Router
 * Intelligent routing to best model based on criteria (cost, latency, quality)
 */

import { logger } from '../../services/SimpleLogger';
import type {
  RoutingCriteria,
  RoutingDecision,
  ModelMetadata,
  ModelProvider,
} from '../types/llmops';

export class ModelRouter {
  private models: Map<string, ModelMetadata> = new Map();

  /**
   * Register model
   */
  registerModel(model: ModelMetadata): void {
    this.models.set(model.id, model);
    logger.debug(`[ModelRouter] Registered model: ${model.name} (${model.provider})`);
  }

  /**
   * Route to best model
   */
  async route(
    prompt: string,
    criteria: RoutingCriteria
  ): Promise<RoutingDecision> {
    logger.debug(`[ModelRouter] Routing with priority: ${criteria.priority}`);

    // Filter models by constraints
    let candidates = Array.from(this.models.values());

    // Filter by preferred providers
    if (criteria.preferredProviders && criteria.preferredProviders.length > 0) {
      candidates = candidates.filter((m) =>
        criteria.preferredProviders!.includes(m.provider)
      );
    }

    // Filter by excluded models
    if (criteria.excludedModels && criteria.excludedModels.length > 0) {
      candidates = candidates.filter(
        (m) => !criteria.excludedModels!.includes(m.id)
      );
    }

    // Filter by required capabilities
    if (criteria.requiredCapabilities && criteria.requiredCapabilities.length > 0) {
      candidates = candidates.filter((m) =>
        criteria.requiredCapabilities!.every((cap) => this.hasCapability(m, cap))
      );
    }

    // Filter by constraints
    if (criteria.maxCost !== undefined) {
      candidates = candidates.filter((m) => this.estimateCost(m, prompt) <= criteria.maxCost!);
    }

    if (criteria.maxLatency !== undefined) {
      candidates = candidates.filter((m) => m.averageLatency <= criteria.maxLatency!);
    }

    if (criteria.minQuality !== undefined) {
      // Assume all models meet minimum quality for now
      // In production, track quality scores per model
    }

    if (candidates.length === 0) {
      throw new Error('No models match the criteria');
    }

    // Score and rank candidates
    const scored = candidates.map((model) => ({
      model,
      score: this.scoreModel(model, criteria, prompt),
    }));

    scored.sort((a, b) => b.score - a.score);

    // Select best model
    const best = scored[0];

    // Prepare alternatives
    const alternatives = scored.slice(1, 4).map((s) => ({
      model: s.model.id,
      score: s.score,
      reason: this.getScoreReason(s.model, criteria),
    }));

    // Prepare fallback chain
    const fallbackModels = scored.slice(1, 6).map((s) => s.model.id);

    const decision: RoutingDecision = {
      selectedModel: best.model.id,
      provider: best.model.provider,
      reason: this.getScoreReason(best.model, criteria),
      score: best.score,
      alternatives,
      fallbackModels,
    };

    logger.debug(
      `[ModelRouter] Selected ${best.model.name} (score: ${best.score.toFixed(2)})`
    );

    return decision;
  }

  /**
   * Score model based on criteria
   */
  private scoreModel(
    model: ModelMetadata,
    criteria: RoutingCriteria,
    prompt: string
  ): number {
    let score = 0;

    switch (criteria.priority) {
      case 'cost':
        // Lower cost = higher score
        const cost = this.estimateCost(model, prompt);
        score = 1 / (1 + cost * 1000); // Normalize
        break;

      case 'latency':
        // Lower latency = higher score
        score = 1 / (1 + model.averageLatency / 1000);
        break;

      case 'quality':
        // Assume more expensive models are higher quality
        score = model.pricing.output;
        break;
    }

    // Boost for preferred providers
    if (
      criteria.preferredProviders &&
      criteria.preferredProviders.includes(model.provider)
    ) {
      score *= 1.2;
    }

    return score;
  }

  /**
   * Get score reason
   */
  private getScoreReason(model: ModelMetadata, criteria: RoutingCriteria): string {
    switch (criteria.priority) {
      case 'cost':
        return `Selected for lowest cost (${model.pricing.output.toFixed(4)}/1K output tokens)`;
      case 'latency':
        return `Selected for lowest latency (${model.averageLatency}ms avg)`;
      case 'quality':
        return `Selected for highest quality`;
      default:
        return 'Selected based on overall score';
    }
  }

  /**
   * Check if model has capability
   */
  private hasCapability(model: ModelMetadata, capability: string): boolean {
    const caps = model.capabilities as Record<string, boolean>;
    return caps[capability] === true;
  }

  /**
   * Estimate cost for prompt
   */
  private estimateCost(model: ModelMetadata, prompt: string): number {
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = 500; // Assume average response

    return (
      (inputTokens / 1000) * model.pricing.input +
      (outputTokens / 1000) * model.pricing.output
    );
  }

  /**
   * Get model
   */
  getModel(modelId: string): ModelMetadata | undefined {
    return this.models.get(modelId);
  }

  /**
   * List models
   */
  listModels(provider?: ModelProvider): ModelMetadata[] {
    const models = Array.from(this.models.values());

    if (provider) {
      return models.filter((m) => m.provider === provider);
    }

    return models;
  }

  /**
   * Get cheapest model
   */
  getCheapestModel(): ModelMetadata {
    const models = Array.from(this.models.values());
    return models.reduce((cheapest, model) => {
      const cheapestCost = cheapest.pricing.input + cheapest.pricing.output;
      const modelCost = model.pricing.input + model.pricing.output;

      return modelCost < cheapestCost ? model : cheapest;
    });
  }

  /**
   * Get fastest model
   */
  getFastestModel(): ModelMetadata {
    const models = Array.from(this.models.values());
    return models.reduce((fastest, model) =>
      model.averageLatency < fastest.averageLatency ? model : fastest
    );
  }

  /**
   * Get models by capability
   */
  getModelsByCapability(capability: string): ModelMetadata[] {
    return Array.from(this.models.values()).filter((m) =>
      this.hasCapability(m, capability)
    );
  }
}
