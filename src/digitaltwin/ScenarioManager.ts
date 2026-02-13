/**
 * Scenario Manager
 *
 * Manages pre-defined test scenarios for workflow quality assurance.
 * Supports golden path, edge cases, load testing, stress testing,
 * chaos testing, and performance testing.
 */

import type {
  TestScenario,
  ScenarioType,
  ScenarioParameters,
  ScenarioResult,
  ScenarioMetrics,
  ScenarioInsight,
  FaultScenario,
  FaultType,
} from './types/digitaltwin';
import type { Workflow } from '../types/workflowTypes';
import { SimulationEngine } from './SimulationEngine';
import { FaultInjectionEngine } from './FaultInjectionEngine';
import { generateUUID } from '../utils/uuid';

/**
 * Scenario Manager class
 */
export class ScenarioManager {
  private scenarios: Map<string, TestScenario> = new Map();
  private results: Map<string, ScenarioResult> = new Map();
  private simulationEngine: SimulationEngine;
  private faultEngine: FaultInjectionEngine;

  constructor(
    simulationEngine?: SimulationEngine,
    faultEngine?: FaultInjectionEngine
  ) {
    this.simulationEngine = simulationEngine || new SimulationEngine();
    this.faultEngine = faultEngine || new FaultInjectionEngine();
  }

  /**
   * Create test scenario
   */
  createScenario(scenario: Omit<TestScenario, 'id' | 'createdAt' | 'updatedAt'>): TestScenario {
    const testScenario: TestScenario = {
      ...scenario,
      id: generateUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.scenarios.set(testScenario.id, testScenario);
    return testScenario;
  }

  /**
   * Create golden path scenario
   */
  createGoldenPathScenario(
    workflow: Workflow,
    successfulInputs: any[],
    expectedOutputs?: any[]
  ): TestScenario {
    return this.createScenario({
      name: `${workflow.name} - Golden Path`,
      type: 'golden_path',
      description: 'Tests the expected happy path execution',
      workflow,
      inputs: successfulInputs,
      expectedOutputs,
      faults: [],
      parameters: {
        iterations: successfulInputs.length,
        timeout: 60000,
      },
      enabled: true,
    });
  }

  /**
   * Create edge cases scenario
   */
  createEdgeCasesScenario(
    workflow: Workflow,
    edgeCaseInputs: any[]
  ): TestScenario {
    return this.createScenario({
      name: `${workflow.name} - Edge Cases`,
      type: 'edge_cases',
      description: 'Tests boundary conditions and edge cases',
      workflow,
      inputs: edgeCaseInputs,
      faults: [],
      parameters: {
        iterations: edgeCaseInputs.length,
        timeout: 90000,
      },
      enabled: true,
    });
  }

  /**
   * Create load testing scenario
   */
  createLoadTestScenario(
    workflow: Workflow,
    input: any,
    config: {
      concurrentExecutions: number;
      executionsPerSecond: number;
      duration: number;
      rampUpTime?: number;
    }
  ): TestScenario {
    return this.createScenario({
      name: `${workflow.name} - Load Test`,
      type: 'load_testing',
      description: `Tests with ${config.concurrentExecutions} concurrent executions`,
      workflow,
      inputs: [input],
      faults: [],
      parameters: {
        concurrentExecutions: config.concurrentExecutions,
        executionsPerSecond: config.executionsPerSecond,
        duration: config.duration,
        rampUpTime: config.rampUpTime,
        timeout: config.duration + 30000,
      },
      enabled: true,
    });
  }

  /**
   * Create stress testing scenario
   */
  createStressTestScenario(
    workflow: Workflow,
    input: any,
    config: {
      maxConcurrent: number;
      memoryLimit?: number;
      cpuLimit?: number;
      duration: number;
    }
  ): TestScenario {
    const faults: FaultScenario[] = [
      this.faultEngine.createFromTemplate('Out of Memory', 'stress', {
        probability: 0.3,
      }),
      this.faultEngine.createFromTemplate('CPU Throttled', 'stress', {
        probability: 0.3,
      }),
    ];

    return this.createScenario({
      name: `${workflow.name} - Stress Test`,
      type: 'stress_testing',
      description: 'Tests workflow under extreme resource pressure',
      workflow,
      inputs: [input],
      faults,
      parameters: {
        maxConcurrent: config.maxConcurrent,
        memoryLimit: config.memoryLimit,
        cpuLimit: config.cpuLimit,
        duration: config.duration,
        timeout: config.duration + 60000,
      },
      enabled: true,
    });
  }

  /**
   * Create chaos testing scenario
   */
  createChaosTestScenario(
    workflow: Workflow,
    input: any,
    config: {
      faultProbability: number;
      faultTypes?: FaultType[];
      iterations: number;
      recoveryTime?: number;
    }
  ): TestScenario {
    const templates = this.faultEngine.listTemplates();
    const selectedTemplates = config.faultTypes
      ? templates.filter(t => config.faultTypes!.includes(t.name as FaultType))
      : templates;

    const faults: FaultScenario[] = selectedTemplates.map(template =>
      this.faultEngine.createFromTemplate(template.name, 'chaos', {
        probability: config.faultProbability,
      })
    );

    return this.createScenario({
      name: `${workflow.name} - Chaos Test`,
      type: 'chaos_testing',
      description: 'Tests resilience with random fault injection',
      workflow,
      inputs: [input],
      faults,
      parameters: {
        faultProbability: config.faultProbability,
        faultTypes: config.faultTypes,
        iterations: config.iterations,
        recoveryTime: config.recoveryTime,
        timeout: 120000,
      },
      enabled: true,
    });
  }

  /**
   * Create performance testing scenario
   */
  createPerformanceTestScenario(
    workflow: Workflow,
    input: any,
    config: {
      targetLatency: number;
      targetThroughput: number;
      duration: number;
      percentiles?: number[];
    }
  ): TestScenario {
    return this.createScenario({
      name: `${workflow.name} - Performance Test`,
      type: 'performance_testing',
      description: `Tests against ${config.targetLatency}ms latency and ${config.targetThroughput} ops/s`,
      workflow,
      inputs: [input],
      faults: [],
      parameters: {
        targetLatency: config.targetLatency,
        targetThroughput: config.targetThroughput,
        duration: config.duration,
        percentiles: config.percentiles || [50, 95, 99],
        timeout: config.duration + 30000,
      },
      enabled: true,
    });
  }

  /**
   * Execute scenario
   */
  async executeScenario(scenarioId: string): Promise<ScenarioResult> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    const startTime = Date.now();

    try {
      const result = await this.executeScenarioByType(scenario);
      this.results.set(result.scenarioId, result);
      return result;
    } catch (error) {
      const result: ScenarioResult = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        type: scenario.type,
        status: 'failed',
        executions: [],
        metrics: this.emptyMetrics(),
        insights: [
          {
            type: 'error',
            message: `Scenario execution failed: ${(error as Error).message}`,
            severity: 'critical',
          },
        ],
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
      this.results.set(result.scenarioId, result);
      return result;
    }
  }

  /**
   * Execute scenario based on type
   */
  private async executeScenarioByType(scenario: TestScenario): Promise<ScenarioResult> {
    switch (scenario.type) {
      case 'golden_path':
        return this.executeGoldenPath(scenario);
      case 'edge_cases':
        return this.executeEdgeCases(scenario);
      case 'load_testing':
        return this.executeLoadTest(scenario);
      case 'stress_testing':
        return this.executeStressTest(scenario);
      case 'chaos_testing':
        return this.executeChaosTest(scenario);
      case 'performance_testing':
        return this.executePerformanceTest(scenario);
      default:
        throw new Error(`Unknown scenario type: ${scenario.type}`);
    }
  }

  /**
   * Execute golden path scenario
   */
  private async executeGoldenPath(scenario: TestScenario): Promise<ScenarioResult> {
    const startTime = Date.now();

    // Create digital twin and run simulations
    const twin = await this.simulationEngine['digitalTwin'].createTwin(scenario.workflow);
    const executions = [];

    for (const input of scenario.inputs) {
      const simulation = await this.simulationEngine.runSimulation(twin.id, input, {
        deterministic: true,
        timeout: scenario.parameters.timeout,
      });
      executions.push(simulation);
    }

    const metrics = this.calculateMetrics(executions);
    const insights = this.generateInsights(scenario, executions, metrics);
    const status = executions.every(e => e.status === 'success') ? 'passed' : 'partial';

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      type: scenario.type,
      status,
      executions,
      metrics,
      insights,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }

  /**
   * Execute edge cases scenario
   */
  private async executeEdgeCases(scenario: TestScenario): Promise<ScenarioResult> {
    return this.executeGoldenPath(scenario); // Similar logic
  }

  /**
   * Execute load test scenario
   */
  private async executeLoadTest(scenario: TestScenario): Promise<ScenarioResult> {
    const startTime = Date.now();
    const twin = await this.simulationEngine['digitalTwin'].createTwin(scenario.workflow);

    const batchResult = await this.simulationEngine.runLoadTest(
      twin.id,
      scenario.inputs[0],
      {
        concurrentExecutions: scenario.parameters.concurrentExecutions!,
        executionsPerSecond: scenario.parameters.executionsPerSecond!,
        duration: scenario.parameters.duration!,
        rampUpTime: scenario.parameters.rampUpTime,
      }
    );

    const metrics = this.calculateMetrics(batchResult.results);
    const insights = this.generateInsights(scenario, batchResult.results, metrics);
    const status = batchResult.successRate >= 0.95 ? 'passed' : 'partial';

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      type: scenario.type,
      status,
      executions: batchResult.results,
      metrics,
      insights,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }

  /**
   * Execute stress test scenario
   */
  private async executeStressTest(scenario: TestScenario): Promise<ScenarioResult> {
    const startTime = Date.now();
    const twin = await this.simulationEngine['digitalTwin'].createTwin(scenario.workflow);

    const batchResult = await this.simulationEngine.runStressTest(
      twin.id,
      scenario.inputs[0],
      {
        maxConcurrent: scenario.parameters.maxConcurrent!,
        targetFailureRate: 0.3,
        duration: scenario.parameters.duration!,
      }
    );

    const metrics = this.calculateMetrics(batchResult.results);
    const insights = this.generateInsights(scenario, batchResult.results, metrics);
    const status = metrics.errorRate <= 0.5 ? 'passed' : 'failed';

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      type: scenario.type,
      status,
      executions: batchResult.results,
      metrics,
      insights,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }

  /**
   * Execute chaos test scenario
   */
  private async executeChaosTest(scenario: TestScenario): Promise<ScenarioResult> {
    const startTime = Date.now();
    const twin = await this.simulationEngine['digitalTwin'].createTwin(scenario.workflow);

    const batchResult = await this.simulationEngine.runChaosTest(
      twin.id,
      scenario.inputs[0],
      {
        chaosLevel: scenario.parameters.faultProbability || 0.3,
        iterations: scenario.parameters.iterations || 50,
        faultTypes: scenario.parameters.faultTypes,
      }
    );

    const metrics = this.calculateMetrics(batchResult.results);
    const insights = this.generateInsights(scenario, batchResult.results, metrics);
    const status = metrics.faultRecoveryRate >= 0.7 ? 'passed' : 'partial';

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      type: scenario.type,
      status,
      executions: batchResult.results,
      metrics,
      insights,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }

  /**
   * Execute performance test scenario
   */
  private async executePerformanceTest(scenario: TestScenario): Promise<ScenarioResult> {
    const startTime = Date.now();
    const twin = await this.simulationEngine['digitalTwin'].createTwin(scenario.workflow);

    const perfResult = await this.simulationEngine.runPerformanceTest(
      twin.id,
      scenario.inputs[0],
      {
        targetLatency: scenario.parameters.targetLatency!,
        targetThroughput: scenario.parameters.targetThroughput!,
        duration: scenario.parameters.duration!,
        percentiles: scenario.parameters.percentiles,
      }
    );

    const metrics = this.calculateMetrics(perfResult.batchResult.results);
    const insights = this.generateInsights(scenario, perfResult.batchResult.results, metrics);

    const targetsMet =
      perfResult.performanceMetrics.targetsMet.latency &&
      perfResult.performanceMetrics.targetsMet.throughput;

    const status = targetsMet ? 'passed' : 'failed';

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      type: scenario.type,
      status,
      executions: perfResult.batchResult.results,
      metrics,
      insights,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }

  /**
   * Calculate scenario metrics
   */
  private calculateMetrics(executions: any[]): ScenarioMetrics {
    const successful = executions.filter(e => e.status === 'success').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const durations = executions.map(e => e.duration).sort((a, b) => a - b);

    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = durations[0] || 0;
    const maxDuration = durations[durations.length - 1] || 0;

    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    const totalDuration = executions.reduce((sum, e) => sum + e.duration, 0);
    const throughput = executions.length / (totalDuration / 1000);

    return {
      totalExecutions: executions.length,
      successfulExecutions: successful,
      failedExecutions: failed,
      avgDuration,
      minDuration,
      maxDuration,
      p50Duration: durations[p50Index] || 0,
      p95Duration: durations[p95Index] || 0,
      p99Duration: durations[p99Index] || 0,
      throughput,
      errorRate: failed / executions.length,
      faultRecoveryRate: successful / executions.length,
    };
  }

  /**
   * Generate insights from scenario results
   */
  private generateInsights(
    scenario: TestScenario,
    executions: any[],
    metrics: ScenarioMetrics
  ): ScenarioInsight[] {
    const insights: ScenarioInsight[] = [];

    // Success rate insights
    if (metrics.errorRate === 0) {
      insights.push({
        type: 'success',
        message: 'All executions completed successfully',
        severity: 'info',
      });
    } else if (metrics.errorRate > 0.5) {
      insights.push({
        type: 'error',
        message: `High failure rate: ${(metrics.errorRate * 100).toFixed(1)}%`,
        severity: 'critical',
        recommendations: ['Investigate failure causes', 'Improve error handling'],
      });
    }

    // Performance insights
    if (metrics.p95Duration > 10000) {
      insights.push({
        type: 'performance',
        message: `95th percentile latency is high: ${metrics.p95Duration.toFixed(0)}ms`,
        severity: 'high',
        recommendations: ['Optimize slow nodes', 'Add caching'],
      });
    }

    // Throughput insights
    if (scenario.type === 'performance_testing' && scenario.parameters.targetThroughput) {
      if (metrics.throughput < scenario.parameters.targetThroughput) {
        insights.push({
          type: 'performance',
          message: `Throughput below target: ${metrics.throughput.toFixed(2)} ops/s`,
          severity: 'high',
          recommendations: ['Increase concurrency', 'Optimize bottlenecks'],
        });
      }
    }

    // Reliability insights
    if (scenario.type === 'chaos_testing') {
      if (metrics.faultRecoveryRate >= 0.9) {
        insights.push({
          type: 'reliability',
          message: 'Excellent fault recovery rate',
          severity: 'info',
        });
      } else if (metrics.faultRecoveryRate < 0.7) {
        insights.push({
          type: 'reliability',
          message: 'Poor fault recovery rate',
          severity: 'critical',
          recommendations: ['Add retry logic', 'Improve error handling'],
        });
      }
    }

    return insights;
  }

  /**
   * Get empty metrics
   */
  private emptyMetrics(): ScenarioMetrics {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      p50Duration: 0,
      p95Duration: 0,
      p99Duration: 0,
      throughput: 0,
      errorRate: 0,
      faultRecoveryRate: 0,
    };
  }

  /**
   * Get scenario
   */
  getScenario(scenarioId: string): TestScenario | undefined {
    return this.scenarios.get(scenarioId);
  }

  /**
   * Get all scenarios
   */
  getAllScenarios(type?: ScenarioType): TestScenario[] {
    let scenarios = Array.from(this.scenarios.values());
    if (type) {
      scenarios = scenarios.filter(s => s.type === type);
    }
    return scenarios;
  }

  /**
   * Get scenario result
   */
  getResult(scenarioId: string): ScenarioResult | undefined {
    return this.results.get(scenarioId);
  }

  /**
   * Get all results
   */
  getAllResults(): ScenarioResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Update scenario
   */
  updateScenario(scenarioId: string, updates: Partial<TestScenario>): TestScenario {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    const updated = {
      ...scenario,
      ...updates,
      id: scenario.id,
      createdAt: scenario.createdAt,
      updatedAt: new Date(),
    };

    this.scenarios.set(scenarioId, updated);
    return updated;
  }

  /**
   * Delete scenario
   */
  deleteScenario(scenarioId: string): boolean {
    this.results.delete(scenarioId);
    return this.scenarios.delete(scenarioId);
  }
}

// Singleton instance
let instance: ScenarioManager | null = null;

export function getScenarioManager(
  simulationEngine?: SimulationEngine,
  faultEngine?: FaultInjectionEngine
): ScenarioManager {
  if (!instance) {
    instance = new ScenarioManager(simulationEngine, faultEngine);
  }
  return instance;
}
