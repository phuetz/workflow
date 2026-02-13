/**
 * Latency Metric
 * Measure response time and execution performance
 */

import type {
  MetricResult,
  LatencyMetricConfig,
  EvaluationInput,
  EvaluationContext,
  RegisteredMetric,
  MetricConfig,
} from '../../types/evaluation';

/**
 * Execute latency metric
 */
export async function executeLatencyMetric(
  input: EvaluationInput,
  output: unknown,
  config: LatencyMetricConfig,
  context?: EvaluationContext
): Promise<MetricResult> {
  const startTime = Date.now();

  try {
    // Get execution data from context
    const executionData = context?.nodeResults;
    const maxLatency = config.config.maxLatency || 10000; // Default 10 seconds
    const includeNodeLatency = config.config.includeNodeLatency ?? true;
    const trackPerNode = config.config.trackPerNode ?? false;

    // Calculate total latency
    let totalLatency = 0;
    const nodeLatencies: Record<string, number> = {};

    // Try to get latency from execution data
    if (executionData && typeof executionData === 'object') {
      // Check for overall execution time
      if ('duration' in executionData && typeof executionData.duration === 'number') {
        totalLatency = executionData.duration;
      } else if ('startTime' in executionData && 'endTime' in executionData) {
        const start = new Date(executionData.startTime as string | number | Date).getTime();
        const end = new Date(executionData.endTime as string | number | Date).getTime();
        totalLatency = end - start;
      }

      // Extract per-node latencies if requested
      if (trackPerNode && 'nodes' in executionData) {
        const nodes = executionData.nodes as Record<string, { duration?: number; startTime?: string | number; endTime?: string | number }>;

        for (const [nodeId, nodeData] of Object.entries(nodes)) {
          if (nodeData.duration) {
            nodeLatencies[nodeId] = nodeData.duration;
          } else if (nodeData.startTime && nodeData.endTime) {
            const start = new Date(nodeData.startTime).getTime();
            const end = new Date(nodeData.endTime).getTime();
            nodeLatencies[nodeId] = end - start;
          }
        }
      }
    }

    // If no latency data found, use a default (this shouldn't happen in real execution)
    if (totalLatency === 0) {
      totalLatency = Date.now() - startTime;
    }

    // Calculate score based on latency
    // Score = 1.0 if latency <= maxLatency/2
    // Score = 0.0 if latency >= maxLatency
    // Linear interpolation in between
    let score: number;
    if (totalLatency <= maxLatency / 2) {
      score = 1.0;
    } else if (totalLatency >= maxLatency) {
      score = 0.0;
    } else {
      // Linear interpolation
      score = 1.0 - ((totalLatency - maxLatency / 2) / (maxLatency / 2));
    }

    // Calculate percentiles for node latencies
    let nodeLatencyStats: { min: number; max: number; avg: number; p50: number; p95: number } | undefined;

    if (Object.keys(nodeLatencies).length > 0) {
      const latencies = Object.values(nodeLatencies).sort((a, b) => a - b);
      const sum = latencies.reduce((a, b) => a + b, 0);

      nodeLatencyStats = {
        min: Math.min(...latencies),
        max: Math.max(...latencies),
        avg: sum / latencies.length,
        p50: latencies[Math.floor(latencies.length * 0.5)],
        p95: latencies[Math.floor(latencies.length * 0.95)],
      };
    }

    // Determine pass/fail
    const threshold = config.threshold ?? 0.7;
    const passed = score >= threshold;

    return {
      metricId: config.id,
      metricType: 'latency',
      metricName: config.name,
      score,
      passed,
      threshold,
      actualValue: totalLatency,
      feedback: passed
        ? `Execution completed in ${totalLatency}ms (within acceptable range)`
        : `Execution took ${totalLatency}ms (exceeds ${maxLatency}ms threshold)`,
      details: {
        totalLatency,
        maxLatency,
        nodeLatencies: trackPerNode ? nodeLatencies : undefined,
        nodeLatencyStats,
        nodeCount: Object.keys(nodeLatencies).length,
      },
      timestamp: new Date(),
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      metricId: config.id,
      metricType: 'latency',
      metricName: config.name,
      score: 0,
      passed: false,
      feedback: `Latency evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date(),
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Validate latency metric config
 */
export function validateLatencyConfig(config: MetricConfig): boolean {
  const latencyConfig = config as LatencyMetricConfig;

  if (!latencyConfig.config) return true; // Config is optional

  // Validate maxLatency if provided
  if (latencyConfig.config.maxLatency !== undefined) {
    if (latencyConfig.config.maxLatency < 0) {
      return false;
    }
  }

  return true;
}

/**
 * Registered latency metric
 */
export const LatencyMetric: RegisteredMetric = {
  type: 'latency',
  name: 'Latency',
  description: 'Measure response time and execution performance',
  defaultConfig: {
    threshold: 0.7,
    weight: 1,
    config: {
      maxLatency: 10000, // 10 seconds
      includeNodeLatency: true,
      trackPerNode: true,
    },
  },
  validator: validateLatencyConfig,
  executor: executeLatencyMetric,
};

export default LatencyMetric;
