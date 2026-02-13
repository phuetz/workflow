/**
 * Performance Testing Framework
 * Load testing with scenarios, metrics, and success criteria
 */

import type {
import { logger } from '../../services/LoggingService';
  PerformanceTest,
  PerformanceResults,
  PerformanceMetrics,
  ScenarioResults,
  PerformanceError,
  PerformanceScenario,
  ScenarioStep,
  LoadProfile,
  SuccessCriteria,
  HttpStepConfig,
  GraphQLStepConfig,
  WebSocketStepConfig,
  CustomStepConfig,
  DataPoint,
} from '../types/testing';

export class PerformanceTesting {
  private tests: Map<string, PerformanceTest> = new Map();
  private results: Map<string, PerformanceResults[]> = new Map();

  /**
   * Create a new performance test
   */
  createTest(
    name: string,
    load: LoadProfile,
    scenarios: PerformanceScenario[],
    criteria: SuccessCriteria
  ): PerformanceTest {
    const test: PerformanceTest = {
      id: this.generateId(),
      name,
      load,
      scenarios,
      criteria,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.tests.set(test.id, test);
    logger.debug(`[PerformanceTesting] Created test: ${name}`);
    logger.debug(`  - Users: ${load.users}`);
    logger.debug(`  - Duration: ${load.duration}s`);
    logger.debug(`  - Scenarios: ${scenarios.length}`);

    return test;
  }

  /**
   * Run a performance test
   */
  async run(testId: string): Promise<PerformanceResults> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = 'running';
    test.updatedAt = Date.now();

    logger.debug(`[PerformanceTesting] Running test: ${test.name}`);

    const startTime = Date.now();
    const errors: PerformanceError[] = [];
    const scenarioResults: ScenarioResults[] = [];

    // Metrics tracking
    const responseTimes: number[] = [];
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let dataTransferred = 0;

    // Response time over time
    const responseTimeOverTime: DataPoint[] = [];
    const throughputOverTime: DataPoint[] = [];
    const errorRateOverTime: DataPoint[] = [];

    // Calculate virtual users per scenario based on weight
    const scenarioUsers = this.calculateScenarioUsers(test.scenarios, test.load.users);

    // Run scenarios in parallel
    const scenarioPromises = test.scenarios.map(async (scenario, index) => {
      const users = scenarioUsers[index];
      logger.debug(`  [${scenario.name}] Starting with ${users} users (${scenario.weight}%)`);

      const scenarioStart = Date.now();
      const scenarioResponseTimes: number[] = [];
      let scenarioSuccessful = 0;
      let scenarioFailed = 0;
      let scenarioRequests = 0;

      try {
        // Setup
        if (scenario.setup) {
          await scenario.setup();
        }

        // Run user simulations
        const userPromises: Promise<void>[] = [];

        for (let i = 0; i < users; i++) {
          // Calculate ramp-up delay
          const rampUpDelay = (test.load.rampUp * 1000 * i) / users;

          const userPromise = new Promise<void>((resolve) => {
            setTimeout(async () => {
              const userStartTime = Date.now();
              const userEndTime = userStartTime + test.load.duration * 1000;

              // Keep executing scenario until duration is reached
              while (Date.now() < userEndTime) {
                try {
                  // Execute all steps in sequence
                  for (const step of scenario.steps) {
                    const stepStart = Date.now();

                    const result = await this.executeStep(step);

                    const stepDuration = Date.now() - stepStart;
                    scenarioResponseTimes.push(stepDuration);
                    responseTimes.push(stepDuration);

                    if (result.success) {
                      scenarioSuccessful++;
                      successfulRequests++;
                    } else {
                      scenarioFailed++;
                      failedRequests++;

                      errors.push({
                        timestamp: Date.now(),
                        scenario: scenario.name,
                        step: step.name,
                        error: result.error || 'Unknown error',
                        statusCode: result.statusCode,
                      });
                    }

                    scenarioRequests++;
                    totalRequests++;

                    if (result.dataSize) {
                      dataTransferred += result.dataSize;
                    }

                    // Record metrics over time (sample every second)
                    const elapsed = Math.floor((Date.now() - startTime) / 1000);
                    if (elapsed > 0 && scenarioRequests % 10 === 0) {
                      responseTimeOverTime.push({
                        timestamp: Date.now(),
                        value: stepDuration,
                      });
                    }

                    // Think time
                    const thinkTime = step.thinkTime || test.load.thinkTime;
                    if (thinkTime > 0) {
                      await this.sleep(thinkTime);
                    }
                  }
                } catch (error) {
                  scenarioFailed++;
                  failedRequests++;
                  scenarioRequests++;
                  totalRequests++;

                  errors.push({
                    timestamp: Date.now(),
                    scenario: scenario.name,
                    step: 'execution',
                    error: error instanceof Error ? error.message : String(error),
                  });
                }
              }

              resolve();
            }, rampUpDelay);
          });

          userPromises.push(userPromise);
        }

        // Wait for all users to complete
        await Promise.all(userPromises);

        // Teardown
        if (scenario.teardown) {
          await scenario.teardown();
        }

        const scenarioDuration = Date.now() - scenarioStart;

        scenarioResults.push({
          scenarioName: scenario.name,
          executions: scenarioRequests,
          successful: scenarioSuccessful,
          failed: scenarioFailed,
          avgDuration: scenarioResponseTimes.length > 0
            ? scenarioResponseTimes.reduce((a, b) => a + b, 0) / scenarioResponseTimes.length
            : 0,
          metrics: this.calculateMetrics(
            scenarioResponseTimes,
            scenarioSuccessful,
            scenarioFailed,
            scenarioDuration,
            0
          ),
        });

        logger.debug(`  [${scenario.name}] Completed: ${scenarioSuccessful} successful, ${scenarioFailed} failed`);
      } catch (error) {
        logger.error(`  [${scenario.name}] Error: ${error instanceof Error ? error.message : String(error)}`);
        scenarioResults.push({
          scenarioName: scenario.name,
          executions: 0,
          successful: 0,
          failed: 0,
          avgDuration: 0,
          metrics: this.calculateMetrics([], 0, 0, 0, 0),
        });
      }
    });

    await Promise.all(scenarioPromises);

    const duration = Date.now() - startTime;

    // Calculate overall metrics
    const metrics = this.calculateMetrics(
      responseTimes,
      successfulRequests,
      failedRequests,
      duration,
      dataTransferred
    );

    // Calculate throughput over time
    const durationSeconds = duration / 1000;
    for (let i = 0; i < durationSeconds; i++) {
      const timeWindow = responseTimeOverTime.filter(
        (dp) => Math.floor((dp.timestamp - startTime) / 1000) === i
      );
      throughputOverTime.push({
        timestamp: startTime + i * 1000,
        value: timeWindow.length,
      });

      const windowErrors = errors.filter(
        (e) => Math.floor((e.timestamp - startTime) / 1000) === i
      );
      const errorRate = timeWindow.length > 0
        ? (windowErrors.length / timeWindow.length) * 100
        : 0;
      errorRateOverTime.push({
        timestamp: startTime + i * 1000,
        value: errorRate,
      });
    }

    // Check success criteria
    const passedCriteria: string[] = [];
    const failedCriteria: string[] = [];

    if (metrics.responseTime.avg <= test.criteria.avgResponseTime) {
      passedCriteria.push(`Average response time: ${metrics.responseTime.avg.toFixed(2)}ms <= ${test.criteria.avgResponseTime}ms`);
    } else {
      failedCriteria.push(`Average response time: ${metrics.responseTime.avg.toFixed(2)}ms > ${test.criteria.avgResponseTime}ms`);
    }

    if (metrics.responseTime.p95 <= test.criteria.p95ResponseTime) {
      passedCriteria.push(`P95 response time: ${metrics.responseTime.p95.toFixed(2)}ms <= ${test.criteria.p95ResponseTime}ms`);
    } else {
      failedCriteria.push(`P95 response time: ${metrics.responseTime.p95.toFixed(2)}ms > ${test.criteria.p95ResponseTime}ms`);
    }

    if (metrics.responseTime.p99 <= test.criteria.p99ResponseTime) {
      passedCriteria.push(`P99 response time: ${metrics.responseTime.p99.toFixed(2)}ms <= ${test.criteria.p99ResponseTime}ms`);
    } else {
      failedCriteria.push(`P99 response time: ${metrics.responseTime.p99.toFixed(2)}ms > ${test.criteria.p99ResponseTime}ms`);
    }

    if (metrics.errorRate <= test.criteria.errorRate) {
      passedCriteria.push(`Error rate: ${metrics.errorRate.toFixed(2)}% <= ${test.criteria.errorRate}%`);
    } else {
      failedCriteria.push(`Error rate: ${metrics.errorRate.toFixed(2)}% > ${test.criteria.errorRate}%`);
    }

    if (metrics.throughput >= test.criteria.throughput) {
      passedCriteria.push(`Throughput: ${metrics.throughput.toFixed(2)} req/s >= ${test.criteria.throughput} req/s`);
    } else {
      failedCriteria.push(`Throughput: ${metrics.throughput.toFixed(2)} req/s < ${test.criteria.throughput} req/s`);
    }

    const passed = failedCriteria.length === 0;

    // Generate recommendations
    const recommendations: string[] = [];
    if (metrics.responseTime.avg > test.criteria.avgResponseTime) {
      recommendations.push('Consider optimizing slow endpoints or increasing server capacity');
    }
    if (metrics.errorRate > test.criteria.errorRate) {
      recommendations.push('Investigate error causes and implement retry logic or circuit breakers');
    }
    if (metrics.throughput < test.criteria.throughput) {
      recommendations.push('Scale horizontally by adding more instances or optimize database queries');
    }

    const results: PerformanceResults = {
      testId,
      passed,
      timestamp: Date.now(),
      duration,
      metrics,
      scenarios: scenarioResults,
      errors,
      report: {
        summary: passed
          ? `Performance test passed all ${passedCriteria.length} criteria`
          : `Performance test failed ${failedCriteria.length} of ${passedCriteria.length + failedCriteria.length} criteria`,
        passedCriteria,
        failedCriteria,
        recommendations,
        charts: {
          responseTimeOverTime,
          throughputOverTime,
          errorRateOverTime,
        },
      },
    };

    test.status = passed ? 'completed' : 'failed';
    test.updatedAt = Date.now();

    // Store results
    const testResults = this.results.get(testId) || [];
    testResults.push(results);
    this.results.set(testId, testResults);

    logger.debug(`[PerformanceTesting] Test ${passed ? 'PASSED' : 'FAILED'}`);
    logger.debug(`  - Duration: ${(duration / 1000).toFixed(2)}s`);
    logger.debug(`  - Requests: ${totalRequests} (${successfulRequests} successful, ${failedRequests} failed)`);
    logger.debug(`  - Avg response time: ${metrics.responseTime.avg.toFixed(2)}ms`);
    logger.debug(`  - P95: ${metrics.responseTime.p95.toFixed(2)}ms`);
    logger.debug(`  - Throughput: ${metrics.throughput.toFixed(2)} req/s`);
    logger.debug(`  - Error rate: ${metrics.errorRate.toFixed(2)}%`);

    return results;
  }

  /**
   * Execute a scenario step
   */
  private async executeStep(step: ScenarioStep): Promise<{
    success: boolean;
    error?: string;
    statusCode?: number;
    dataSize?: number;
  }> {
    try {
      switch (step.action) {
        case 'http':
          return await this.executeHttpStep(step.config as HttpStepConfig, step.assertions);

        case 'graphql':
          return await this.executeGraphQLStep(step.config as GraphQLStepConfig, step.assertions);

        case 'websocket':
          return await this.executeWebSocketStep(step.config as WebSocketStepConfig, step.assertions);

        case 'custom':
          return await this.executeCustomStep(step.config as CustomStepConfig, step.assertions);

        default:
          return {
            success: false,
            error: `Unknown step action: ${step.action}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute HTTP step
   */
  private async executeHttpStep(config: HttpStepConfig, assertions?: any[]): Promise<any> {
    // Simulate HTTP request
    // In a real implementation, this would use fetch or axios
    const dataSize = Math.floor(Math.random() * 10000) + 1000;

    return {
      success: Math.random() > 0.05, // 95% success rate simulation
      statusCode: 200,
      dataSize,
    };
  }

  /**
   * Execute GraphQL step
   */
  private async executeGraphQLStep(config: GraphQLStepConfig, assertions?: any[]): Promise<any> {
    // Simulate GraphQL request
    const dataSize = Math.floor(Math.random() * 5000) + 500;

    return {
      success: Math.random() > 0.05,
      statusCode: 200,
      dataSize,
    };
  }

  /**
   * Execute WebSocket step
   */
  private async executeWebSocketStep(config: WebSocketStepConfig, assertions?: any[]): Promise<any> {
    // Simulate WebSocket message
    const dataSize = Math.floor(Math.random() * 2000) + 100;

    return {
      success: Math.random() > 0.05,
      dataSize,
    };
  }

  /**
   * Execute custom step
   */
  private async executeCustomStep(config: CustomStepConfig, assertions?: any[]): Promise<any> {
    const result = await config.execute();

    return {
      success: true,
      dataSize: JSON.stringify(result).length,
    };
  }

  /**
   * Calculate scenario users based on weights
   */
  private calculateScenarioUsers(scenarios: PerformanceScenario[], totalUsers: number): number[] {
    const users: number[] = [];
    const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);

    scenarios.forEach((scenario) => {
      const scenarioUsers = Math.floor((scenario.weight / totalWeight) * totalUsers);
      users.push(scenarioUsers);
    });

    // Distribute remaining users due to rounding
    const distributedUsers = users.reduce((sum, u) => sum + u, 0);
    const remainingUsers = totalUsers - distributedUsers;

    for (let i = 0; i < remainingUsers; i++) {
      users[i % users.length]++;
    }

    return users;
  }

  /**
   * Calculate performance metrics
   */
  private calculateMetrics(
    responseTimes: number[],
    successful: number,
    failed: number,
    duration: number,
    dataTransferred: number
  ): PerformanceMetrics {
    const total = successful + failed;

    if (responseTimes.length === 0) {
      return {
        totalRequests: total,
        successfulRequests: successful,
        failedRequests: failed,
        responseTime: {
          min: 0,
          max: 0,
          avg: 0,
          median: 0,
          p90: 0,
          p95: 0,
          p99: 0,
        },
        throughput: 0,
        errorRate: 0,
        dataTransferred,
      };
    }

    const sorted = [...responseTimes].sort((a, b) => a - b);

    return {
      totalRequests: total,
      successfulRequests: successful,
      failedRequests: failed,
      responseTime: {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        median: this.percentile(sorted, 50),
        p90: this.percentile(sorted, 90),
        p95: this.percentile(sorted, 95),
        p99: this.percentile(sorted, 99),
      },
      throughput: (total / (duration / 1000)),
      errorRate: total > 0 ? (failed / total) * 100 : 0,
      dataTransferred,
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get test by ID
   */
  getTest(testId: string): PerformanceTest | undefined {
    return this.tests.get(testId);
  }

  /**
   * Get test results
   */
  getResults(testId: string): PerformanceResults[] {
    return this.results.get(testId) || [];
  }

  /**
   * Get all tests
   */
  getAllTests(): PerformanceTest[] {
    return Array.from(this.tests.values());
  }

  /**
   * Delete test
   */
  deleteTest(testId: string): boolean {
    this.results.delete(testId);
    return this.tests.delete(testId);
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default PerformanceTesting;
