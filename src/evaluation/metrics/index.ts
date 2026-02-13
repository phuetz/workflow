/**
 * Evaluation Metrics Index
 * Export all available metrics
 */

export { CorrectnessMetric, executeCorrectnessMetric, validateCorrectnessConfig } from './CorrectnessMetric';
export { ToxicityMetric, executeToxicityMetric, validateToxicityConfig } from './ToxicityMetric';
export { BiasMetric, executeBiasMetric, validateBiasConfig } from './BiasMetric';
export { ToolCallingMetric, executeToolCallingMetric, validateToolCallingConfig } from './ToolCallingMetric';
export { LatencyMetric, executeLatencyMetric, validateLatencyConfig } from './LatencyMetric';
export { CostMetric, executeCostMetric, validateCostConfig } from './CostMetric';

import { CorrectnessMetric } from './CorrectnessMetric';
import { ToxicityMetric } from './ToxicityMetric';
import { BiasMetric } from './BiasMetric';
import { ToolCallingMetric } from './ToolCallingMetric';
import { LatencyMetric } from './LatencyMetric';
import { CostMetric } from './CostMetric';

import type { RegisteredMetric } from '../../types/evaluation';

/**
 * All available metrics
 */
export const ALL_METRICS: RegisteredMetric[] = [
  CorrectnessMetric,
  ToxicityMetric,
  BiasMetric,
  ToolCallingMetric,
  LatencyMetric,
  CostMetric,
];

/**
 * Register all metrics with a registry
 */
export function registerAllMetrics(registry: { register: (metric: RegisteredMetric) => void }): void {
  for (const metric of ALL_METRICS) {
    registry.register(metric);
  }
}

export default ALL_METRICS;
