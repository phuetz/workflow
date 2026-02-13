/**
 * Cost Metric
 * Estimate and track LLM and API costs
 */

import type {
  MetricResult,
  CostMetricConfig,
  EvaluationInput,
  EvaluationContext,
  RegisteredMetric,
  MetricConfig,
} from '../../types/evaluation';

/**
 * Default pricing per 1M tokens (USD)
 */
const DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4': { input: 30.0, output: 60.0 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4o': { input: 5.0, output: 15.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },

  // Anthropic
  'claude-3-opus': { input: 15.0, output: 75.0 },
  'claude-3-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3.5-sonnet': { input: 3.0, output: 15.0 },

  // Google
  'gemini-pro': { input: 0.5, output: 1.5 },
  'gemini-ultra': { input: 10.0, output: 30.0 },

  // Azure OpenAI (similar to OpenAI)
  'azure-gpt-4': { input: 30.0, output: 60.0 },
  'azure-gpt-35-turbo': { input: 0.5, output: 1.5 },
};

/**
 * Extract token usage from execution data
 */
interface TokenUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

function extractTokenUsage(executionData: unknown): TokenUsage[] {
  const usages: TokenUsage[] = [];

  if (!executionData || typeof executionData !== 'object') {
    return usages;
  }

  // Check for direct token usage
  if ('tokenUsage' in executionData && Array.isArray((executionData as { tokenUsage: unknown }).tokenUsage)) {
    return (executionData as { tokenUsage: TokenUsage[] }).tokenUsage;
  }

  // Check for usage in nodes
  if ('nodes' in executionData && typeof (executionData as { nodes: unknown }).nodes === 'object') {
    const nodes = (executionData as { nodes: Record<string, unknown> }).nodes;

    for (const nodeData of Object.values(nodes)) {
      if (nodeData && typeof nodeData === 'object' && 'usage' in nodeData) {
        const usage = (nodeData as { usage: unknown }).usage;

        if (usage && typeof usage === 'object') {
          const tokenUsage: Partial<TokenUsage> = {
            model: 'model' in usage ? String((usage as { model: unknown }).model) : 'unknown',
            inputTokens: 'promptTokens' in usage ? Number((usage as { promptTokens: unknown }).promptTokens) : 0,
            outputTokens: 'completionTokens' in usage ? Number((usage as { completionTokens: unknown }).completionTokens) : 0,
          };

          tokenUsage.totalTokens = (tokenUsage.inputTokens || 0) + (tokenUsage.outputTokens || 0);

          if (tokenUsage.totalTokens > 0) {
            usages.push(tokenUsage as TokenUsage);
          }
        }
      }
    }
  }

  return usages;
}

/**
 * Calculate cost from token usage
 */
function calculateCost(usage: TokenUsage, customPricing?: Record<string, { input: number; output: number }>): number {
  const pricing = customPricing?.[usage.model] || DEFAULT_PRICING[usage.model];

  if (!pricing) {
    // Unknown model, estimate $1 per 1M tokens
    return ((usage.inputTokens + usage.outputTokens) / 1_000_000) * 1.0;
  }

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Execute cost metric
 */
export async function executeCostMetric(
  input: EvaluationInput,
  output: unknown,
  config: CostMetricConfig,
  context?: EvaluationContext
): Promise<MetricResult> {
  const startTime = Date.now();

  try {
    const maxCost = config.config.maxCost || 1.0; // Default $1
    const trackTokenUsage = config.config.trackTokenUsage ?? true;
    const customPricing = config.config.customPricing;

    // Extract token usage from execution data
    const executionData = context?.nodeResults;
    const tokenUsages = extractTokenUsage(executionData);

    // Calculate total cost
    let totalCost = 0;
    const costBreakdown: Array<{ model: string; inputTokens: number; outputTokens: number; cost: number }> = [];

    for (const usage of tokenUsages) {
      const cost = calculateCost(usage, customPricing);
      totalCost += cost;

      costBreakdown.push({
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cost,
      });
    }

    // Calculate score based on cost
    // Score = 1.0 if cost <= maxCost/2
    // Score = 0.0 if cost >= maxCost
    // Linear interpolation in between
    let score: number;
    if (totalCost <= maxCost / 2) {
      score = 1.0;
    } else if (totalCost >= maxCost) {
      score = 0.0;
    } else {
      score = 1.0 - ((totalCost - maxCost / 2) / (maxCost / 2));
    }

    // Calculate token statistics
    const totalInputTokens = tokenUsages.reduce((sum, u) => sum + u.inputTokens, 0);
    const totalOutputTokens = tokenUsages.reduce((sum, u) => sum + u.outputTokens, 0);
    const totalTokens = totalInputTokens + totalOutputTokens;

    // Determine pass/fail
    const threshold = config.threshold ?? 0.7;
    const passed = score >= threshold;

    return {
      metricId: config.id,
      metricType: 'cost',
      metricName: config.name,
      score,
      passed,
      threshold,
      actualValue: totalCost,
      feedback: passed
        ? `Total cost: $${totalCost.toFixed(4)} (within budget)`
        : `Total cost: $${totalCost.toFixed(4)} (exceeds $${maxCost.toFixed(4)} budget)`,
      details: {
        totalCost,
        maxCost,
        costBreakdown,
        tokenUsage: trackTokenUsage
          ? {
              totalInputTokens,
              totalOutputTokens,
              totalTokens,
              modelsUsed: tokenUsages.length,
            }
          : undefined,
        costPerToken: totalTokens > 0 ? totalCost / totalTokens : 0,
      },
      timestamp: new Date(),
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      metricId: config.id,
      metricType: 'cost',
      metricName: config.name,
      score: 0,
      passed: false,
      feedback: `Cost evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date(),
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Validate cost metric config
 */
export function validateCostConfig(config: MetricConfig): boolean {
  const costConfig = config as CostMetricConfig;

  if (!costConfig.config) return true; // Config is optional

  // Validate maxCost if provided
  if (costConfig.config.maxCost !== undefined) {
    if (costConfig.config.maxCost < 0) {
      return false;
    }
  }

  // Validate custom pricing if provided
  if (costConfig.config.customPricing) {
    for (const [model, pricing] of Object.entries(costConfig.config.customPricing)) {
      if (!pricing || typeof pricing !== 'object') {
        return false;
      }
      if (typeof pricing.input !== 'number' || typeof pricing.output !== 'number') {
        return false;
      }
      if (pricing.input < 0 || pricing.output < 0) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Registered cost metric
 */
export const CostMetric: RegisteredMetric = {
  type: 'cost',
  name: 'Cost',
  description: 'Estimate and track LLM and API costs',
  defaultConfig: {
    threshold: 0.7,
    weight: 1,
    config: {
      maxCost: 1.0, // $1
      trackTokenUsage: true,
      includeAPICallCosts: false,
    },
  },
  validator: validateCostConfig,
  executor: executeCostMetric,
};

export default CostMetric;
