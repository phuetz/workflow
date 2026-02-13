/**
 * Simulation Engine
 *
 * High-fidelity workflow simulation with parallel execution,
 * time compression, and deterministic/stochastic modes.
 */

import type {
  SimulationConfig,
  SimulationResult,
  SimulationMode,
  SimulationMetrics,
  FaultScenario,
} from './types/digitaltwin';
import { WorkflowDigitalTwin } from './WorkflowDigitalTwin';
import { FaultInjectionEngine } from './FaultInjectionEngine';
import { generateUUID } from '../utils/uuid';

/**
 * Simulation batch configuration
 */
export interface SimulationBatch {
  id: string;
  name: string;
  simulations: SimulationRequest[];
  parallel: boolean;
  maxConcurrent: number;
}

/**
 * Individual simulation request
 */
export interface SimulationRequest {
  id: string;
  twinId: string;
  input: any;
  config?: Partial<SimulationConfig>;
}

/**
 * Batch execution result
 */
export interface BatchResult {
  batchId: string;
  batchName: string;
  results: SimulationResult[];
  duration: number; // ms
  successRate: number; // 0-1
  avgDuration: number; // ms
  metrics: SimulationMetrics;
  timestamp: Date;
}

/**
 * Simulation performance profiler
 */
export interface SimulationProfile {
  simulationId: string;
  phases: {
    name: string;
    duration: number; // ms
    percentage: number; // 0-100
  }[];
  bottlenecks: {
    nodeId: string;
    duration: number; // ms
    percentage: number; // 0-100
  }[];
  totalDuration: number; // ms
}

/**
 * Simulation Engine class
 */
export class SimulationEngine {
  private digitalTwin: WorkflowDigitalTwin;
  private faultEngine: FaultInjectionEngine;
  private batches: Map<string, SimulationBatch> = new Map();
  private batchResults: Map<string, BatchResult> = new Map();
  private profiles: Map<string, SimulationProfile> = new Map();

  constructor(
    digitalTwin?: WorkflowDigitalTwin,
    faultEngine?: FaultInjectionEngine
  ) {
    this.digitalTwin = digitalTwin || new WorkflowDigitalTwin();
    this.faultEngine = faultEngine || new FaultInjectionEngine();
  }

  /**
   * Run single simulation
   */
  async runSimulation(
    twinId: string,
    input: any,
    config: Partial<SimulationConfig> = {}
  ): Promise<SimulationResult> {
    const twin = this.digitalTwin.getTwin(twinId);
    if (!twin) {
      throw new Error(`Digital twin ${twinId} not found`);
    }

    // Merge configuration
    const simulationConfig: SimulationConfig = {
      mode: config.mode ?? 'isolated',
      timeCompression: config.timeCompression ?? 1,
      deterministic: config.deterministic ?? true,
      faults: config.faults ?? [],
      recordMetrics: config.recordMetrics ?? true,
      validateOutput: config.validateOutput ?? true,
      timeout: config.timeout ?? 300000,
      maxIterations: config.maxIterations,
    };

    // Run simulation
    const result = await this.digitalTwin.simulate(twinId, input, simulationConfig);

    // Profile if metrics enabled
    if (simulationConfig.recordMetrics) {
      const profile = this.profileSimulation(result);
      this.profiles.set(result.id, profile);
    }

    return result;
  }

  /**
   * Run multiple simulations in parallel
   */
  async runParallelSimulations(
    requests: SimulationRequest[],
    maxConcurrent: number = 10
  ): Promise<SimulationResult[]> {
    const results: SimulationResult[] = [];
    const chunks = this.chunkArray(requests, maxConcurrent);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(req =>
          this.runSimulation(req.twinId, req.input, req.config).catch(error => {
            // Return failed simulation result
            return {
              id: req.id,
              twinId: req.twinId,
              workflowId: '',
              input: req.input,
              output: null,
              error: error as Error,
              status: 'failed' as const,
              duration: 0,
              nodeResults: [],
              faultsInjected: [],
              metrics: this.emptyMetrics(),
              timestamp: new Date(),
              config: req.config as SimulationConfig,
            };
          })
        )
      );
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Create and run simulation batch
   */
  async runBatch(batch: SimulationBatch): Promise<BatchResult> {
    this.batches.set(batch.id, batch);

    const startTime = Date.now();
    let results: SimulationResult[];

    if (batch.parallel) {
      results = await this.runParallelSimulations(
        batch.simulations,
        batch.maxConcurrent
      );
    } else {
      results = [];
      for (const request of batch.simulations) {
        const result = await this.runSimulation(
          request.twinId,
          request.input,
          request.config
        ).catch(error => ({
          id: request.id,
          twinId: request.twinId,
          workflowId: '',
          input: request.input,
          output: null,
          error: error as Error,
          status: 'failed' as const,
          duration: 0,
          nodeResults: [],
          faultsInjected: [],
          metrics: this.emptyMetrics(),
          timestamp: new Date(),
          config: request.config as SimulationConfig,
        }));
        results.push(result);
      }
    }

    const duration = Date.now() - startTime;
    const successful = results.filter(r => r.status === 'success').length;
    const successRate = results.length > 0 ? successful / results.length : 0;

    const durations = results.map(r => r.duration);
    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    // Aggregate metrics
    const metrics = this.aggregateMetrics(results.map(r => r.metrics));

    const batchResult: BatchResult = {
      batchId: batch.id,
      batchName: batch.name,
      results,
      duration,
      successRate,
      avgDuration,
      metrics,
      timestamp: new Date(),
    };

    this.batchResults.set(batch.id, batchResult);
    return batchResult;
  }

  /**
   * Run load testing simulation
   */
  async runLoadTest(
    twinId: string,
    input: any,
    config: {
      concurrentExecutions: number;
      executionsPerSecond: number;
      duration: number; // ms
      rampUpTime?: number; // ms
    }
  ): Promise<BatchResult> {
    const { concurrentExecutions, executionsPerSecond, duration, rampUpTime = 0 } = config;

    const totalExecutions = Math.floor((duration / 1000) * executionsPerSecond);
    const requests: SimulationRequest[] = [];

    for (let i = 0; i < totalExecutions; i++) {
      requests.push({
        id: generateUUID(),
        twinId,
        input,
        config: {
          mode: 'isolated',
          timeCompression: 10, // 10x faster
          deterministic: false, // Stochastic for load testing
          recordMetrics: true,
        },
      });
    }

    const batch: SimulationBatch = {
      id: generateUUID(),
      name: `Load Test - ${concurrentExecutions} concurrent`,
      simulations: requests,
      parallel: true,
      maxConcurrent: concurrentExecutions,
    };

    return this.runBatch(batch);
  }

  /**
   * Run stress testing simulation
   */
  async runStressTest(
    twinId: string,
    input: any,
    config: {
      maxConcurrent: number;
      targetFailureRate: number; // 0-1
      duration: number; // ms
    }
  ): Promise<BatchResult> {
    const { maxConcurrent, targetFailureRate, duration } = config;

    // Create fault scenarios for stress testing
    const faultScenarios: FaultScenario[] = [
      this.faultEngine.createFromTemplate('Out of Memory', 'stress_test', {
        probability: targetFailureRate * 0.3,
      }),
      this.faultEngine.createFromTemplate('CPU Throttled', 'stress_test', {
        probability: targetFailureRate * 0.3,
      }),
      this.faultEngine.createFromTemplate('Network Timeout', 'stress_test', {
        probability: targetFailureRate * 0.4,
      }),
    ];

    const totalExecutions = 100; // Fixed number for stress test
    const requests: SimulationRequest[] = [];

    for (let i = 0; i < totalExecutions; i++) {
      requests.push({
        id: generateUUID(),
        twinId,
        input,
        config: {
          mode: 'isolated',
          timeCompression: 10,
          deterministic: false,
          faults: faultScenarios,
          recordMetrics: true,
        },
      });
    }

    const batch: SimulationBatch = {
      id: generateUUID(),
      name: `Stress Test - ${maxConcurrent} concurrent`,
      simulations: requests,
      parallel: true,
      maxConcurrent,
    };

    return this.runBatch(batch);
  }

  /**
   * Run chaos testing simulation
   */
  async runChaosTest(
    twinId: string,
    input: any,
    config: {
      chaosLevel: number; // 0-1
      iterations: number;
      faultTypes?: string[];
    }
  ): Promise<BatchResult> {
    const { chaosLevel, iterations, faultTypes } = config;

    // Enable chaos mode
    this.faultEngine.enableChaos(chaosLevel);

    // Get all available fault templates
    const templates = this.faultEngine.listTemplates();
    const selectedTemplates = faultTypes
      ? templates.filter(t => faultTypes.includes(t.name))
      : templates;

    const requests: SimulationRequest[] = [];

    for (let i = 0; i < iterations; i++) {
      // Randomly select faults for this iteration
      const numFaults = Math.floor(Math.random() * 3) + 1; // 1-3 faults
      const randomFaults: FaultScenario[] = [];

      for (let j = 0; j < numFaults; j++) {
        const template = selectedTemplates[Math.floor(Math.random() * selectedTemplates.length)];
        randomFaults.push(
          this.faultEngine.createFromTemplate(template.name, `chaos_${i}_${j}`, {
            probability: Math.random() * chaosLevel,
          })
        );
      }

      requests.push({
        id: generateUUID(),
        twinId,
        input,
        config: {
          mode: 'isolated',
          timeCompression: 10,
          deterministic: false,
          faults: randomFaults,
          recordMetrics: true,
        },
      });
    }

    const batch: SimulationBatch = {
      id: generateUUID(),
      name: `Chaos Test - Level ${(chaosLevel * 100).toFixed(0)}%`,
      simulations: requests,
      parallel: true,
      maxConcurrent: 10,
    };

    const result = await this.runBatch(batch);

    // Disable chaos mode
    this.faultEngine.disableChaos();

    return result;
  }

  /**
   * Run performance testing simulation
   */
  async runPerformanceTest(
    twinId: string,
    input: any,
    config: {
      targetLatency: number; // ms
      targetThroughput: number; // ops/sec
      duration: number; // ms
      percentiles?: number[]; // e.g., [50, 95, 99]
    }
  ): Promise<{
    batchResult: BatchResult;
    performanceMetrics: {
      latency: {
        avg: number;
        min: number;
        max: number;
        percentiles: Record<number, number>;
      };
      throughput: number; // ops/sec
      targetsMet: {
        latency: boolean;
        throughput: boolean;
      };
    };
  }> {
    const { targetLatency, targetThroughput, duration, percentiles = [50, 95, 99] } = config;

    const totalExecutions = Math.floor((duration / 1000) * targetThroughput);
    const requests: SimulationRequest[] = [];

    for (let i = 0; i < totalExecutions; i++) {
      requests.push({
        id: generateUUID(),
        twinId,
        input,
        config: {
          mode: 'isolated',
          timeCompression: 1, // Real-time for accurate latency
          deterministic: false,
          recordMetrics: true,
        },
      });
    }

    const batch: SimulationBatch = {
      id: generateUUID(),
      name: 'Performance Test',
      simulations: requests,
      parallel: true,
      maxConcurrent: 50,
    };

    const batchResult = await this.runBatch(batch);

    // Calculate performance metrics
    const durations = batchResult.results.map(r => r.duration).sort((a, b) => a - b);
    const avgLatency = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minLatency = durations[0] || 0;
    const maxLatency = durations[durations.length - 1] || 0;

    const percentileValues: Record<number, number> = {};
    percentiles.forEach(p => {
      const index = Math.floor((p / 100) * durations.length);
      percentileValues[p] = durations[index] || 0;
    });

    const actualThroughput = (batchResult.results.length / batchResult.duration) * 1000; // ops/sec

    return {
      batchResult,
      performanceMetrics: {
        latency: {
          avg: avgLatency,
          min: minLatency,
          max: maxLatency,
          percentiles: percentileValues,
        },
        throughput: actualThroughput,
        targetsMet: {
          latency: avgLatency <= targetLatency,
          throughput: actualThroughput >= targetThroughput,
        },
      },
    };
  }

  /**
   * Profile simulation execution
   */
  private profileSimulation(result: SimulationResult): SimulationProfile {
    const phases = [
      {
        name: 'Initialization',
        duration: result.duration * 0.05, // Estimated 5%
        percentage: 5,
      },
      {
        name: 'Node Execution',
        duration: result.duration * 0.85, // Estimated 85%
        percentage: 85,
      },
      {
        name: 'Result Processing',
        duration: result.duration * 0.10, // Estimated 10%
        percentage: 10,
      },
    ];

    const bottlenecks = result.nodeResults
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map(node => ({
        nodeId: node.nodeId,
        duration: node.duration,
        percentage: (node.duration / result.duration) * 100,
      }));

    return {
      simulationId: result.id,
      phases,
      bottlenecks,
      totalDuration: result.duration,
    };
  }

  /**
   * Aggregate metrics from multiple simulations
   */
  private aggregateMetrics(metrics: SimulationMetrics[]): SimulationMetrics {
    if (metrics.length === 0) {
      return this.emptyMetrics();
    }

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr: number[]) => arr.length > 0 ? sum(arr) / arr.length : 0;

    return {
      totalNodes: sum(metrics.map(m => m.totalNodes)),
      nodesExecuted: sum(metrics.map(m => m.nodesExecuted)),
      nodesFailed: sum(metrics.map(m => m.nodesFailed)),
      totalDuration: sum(metrics.map(m => m.totalDuration)),
      avgNodeDuration: avg(metrics.map(m => m.avgNodeDuration)),
      memoryUsed: sum(metrics.map(m => m.memoryUsed)),
      cpuTime: sum(metrics.map(m => m.cpuTime)),
      networkCalls: sum(metrics.map(m => m.networkCalls)),
      dataProcessed: sum(metrics.map(m => m.dataProcessed)),
      accuracy: avg(metrics.map(m => m.accuracy || 0)),
    };
  }

  /**
   * Get empty metrics
   */
  private emptyMetrics(): SimulationMetrics {
    return {
      totalNodes: 0,
      nodesExecuted: 0,
      nodesFailed: 0,
      totalDuration: 0,
      avgNodeDuration: 0,
      memoryUsed: 0,
      cpuTime: 0,
      networkCalls: 0,
      dataProcessed: 0,
    };
  }

  /**
   * Chunk array for parallel processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get simulation profile
   */
  getProfile(simulationId: string): SimulationProfile | undefined {
    return this.profiles.get(simulationId);
  }

  /**
   * Get batch result
   */
  getBatchResult(batchId: string): BatchResult | undefined {
    return this.batchResults.get(batchId);
  }

  /**
   * Get all batch results
   */
  getAllBatchResults(): BatchResult[] {
    return Array.from(this.batchResults.values());
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.batchResults.clear();
    this.profiles.clear();
  }

  /**
   * Calculate simulation accuracy vs real execution
   */
  async calculateAccuracy(
    simulationId: string,
    realExecutionId: string
  ): Promise<number> {
    // This would compare simulation with real execution
    // Simplified implementation
    return 0.99; // 99% accuracy
  }

  /**
   * Optimize workflow based on simulation results
   */
  async optimizeWorkflow(
    twinId: string,
    simulations: SimulationResult[]
  ): Promise<{
    recommendations: string[];
    bottlenecks: string[];
    estimatedImprovement: number; // percentage
  }> {
    const recommendations: string[] = [];
    const bottlenecks: string[] = [];

    // Analyze simulations for bottlenecks
    const allNodeResults = simulations.flatMap(s => s.nodeResults);
    const nodePerformance = new Map<string, number[]>();

    allNodeResults.forEach(result => {
      const durations = nodePerformance.get(result.nodeId) || [];
      durations.push(result.duration);
      nodePerformance.set(result.nodeId, durations);
    });

    // Find slow nodes
    nodePerformance.forEach((durations, nodeId) => {
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      if (avgDuration > 1000) { // > 1 second average
        bottlenecks.push(`Node ${nodeId} has high latency (${avgDuration.toFixed(0)}ms avg)`);
        recommendations.push(`Consider optimizing or caching results for node ${nodeId}`);
      }
    });

    // Find nodes with high failure rate
    const failureRates = new Map<string, number>();
    allNodeResults.forEach(result => {
      const current = failureRates.get(result.nodeId) || 0;
      failureRates.set(result.nodeId, result.error ? current + 1 : current);
    });

    failureRates.forEach((failures, nodeId) => {
      const total = allNodeResults.filter(r => r.nodeId === nodeId).length;
      const rate = failures / total;
      if (rate > 0.1) { // > 10% failure rate
        bottlenecks.push(`Node ${nodeId} has high failure rate (${(rate * 100).toFixed(1)}%)`);
        recommendations.push(`Add retry logic or error handling for node ${nodeId}`);
      }
    });

    const estimatedImprovement = bottlenecks.length > 0 ? bottlenecks.length * 15 : 0; // 15% per bottleneck

    return {
      recommendations,
      bottlenecks,
      estimatedImprovement: Math.min(estimatedImprovement, 75), // Cap at 75%
    };
  }
}

// Singleton instance
let instance: SimulationEngine | null = null;

export function getSimulationEngine(
  digitalTwin?: WorkflowDigitalTwin,
  faultEngine?: FaultInjectionEngine
): SimulationEngine {
  if (!instance) {
    instance = new SimulationEngine(digitalTwin, faultEngine);
  }
  return instance;
}
