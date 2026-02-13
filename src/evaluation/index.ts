/**
 * AI Workflow Evaluation Framework
 * Export all evaluation components
 */

// Core - Import first, then re-export
import { EvaluationEngine } from './EvaluationEngine';
import { MetricRegistry } from './MetricRegistry';
import { EvaluationRunner } from './EvaluationRunner';
import { TestSuiteRunner, TestSuiteManager } from './TestSuite';
import { DebugDataPinner } from './DebugDataPinner';

// Metrics - Import first, then re-export
import {
  CorrectnessMetric,
  ToxicityMetric,
  BiasMetric,
  ToolCallingMetric,
  LatencyMetric,
  CostMetric,
  ALL_METRICS,
  registerAllMetrics,
} from './metrics';

// Re-export core classes
export { EvaluationEngine } from './EvaluationEngine';
export { MetricRegistry } from './MetricRegistry';
export { EvaluationRunner } from './EvaluationRunner';
export { TestSuiteRunner, TestSuiteManager } from './TestSuite';
export { DebugDataPinner } from './DebugDataPinner';

// Re-export metrics
export {
  CorrectnessMetric,
  ToxicityMetric,
  BiasMetric,
  ToolCallingMetric,
  LatencyMetric,
  CostMetric,
  ALL_METRICS,
  registerAllMetrics,
} from './metrics';

// Types (re-export from types/evaluation.ts)
export type {
  Evaluation,
  EvaluationInput,
  EvaluationResult,
  EvaluationRun,
  EvaluationContext,
  EvaluationStatus,
  MetricConfig,
  MetricResult,
  MetricType,
  RegisteredMetric,
  TestSuite,
  TestSuiteRun,
  PinnedData,
  EvaluationComparison,
  EvaluationStats,
  CorrectnessMetricConfig,
  ToxicityMetricConfig,
  BiasMetricConfig,
  ToolCallingMetricConfig,
  LatencyMetricConfig,
  CostMetricConfig,
  BiasCategory,
  ComparisonOperator,
  ExportOptions,
} from '../types/evaluation';

/**
 * Quick setup function for easy integration
 */
export function createEvaluationFramework(options?: {
  executionCallback?: (workflowId: string, input: Record<string, unknown>) => Promise<unknown>;
  logger?: unknown;
}) {
  const registry = new MetricRegistry();
  registerAllMetrics(registry);

  const engine = new EvaluationEngine({
    metricRegistry: registry,
    executionCallback: options?.executionCallback,
    logger: options?.logger,
  });

  const runner = new EvaluationRunner(engine, {
    logger: options?.logger,
  });

  const pinner = new DebugDataPinner({
    logger: options?.logger,
  });

  return {
    engine,
    registry,
    runner,
    pinner,
  };
}

export default {
  EvaluationEngine,
  MetricRegistry,
  EvaluationRunner,
  TestSuiteRunner,
  TestSuiteManager,
  DebugDataPinner,
  createEvaluationFramework,
};
