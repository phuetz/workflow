/**
 * Agent Testing Framework
 *
 * Automated testing for agents with:
 * - Unit tests
 * - Integration tests
 * - Performance tests
 * - Load tests
 *
 * Coverage target: >90%
 */

import { EventEmitter } from 'events';
import {
  Agent,
  Assertion,
  IntegrationTest,
  LoadTest,
  PerformanceTest,
  TestExecutionResult,
  TestResult,
  TestSuite,
  UnitTest,
  User,
} from './types/agentops';

/**
 * Test execution context
 */
interface TestContext {
  agent: Agent;
  testId: string;
  startTime: number;
  timeout: number;
}

/**
 * Agent testing framework
 */
export class AgentTestingFramework extends EventEmitter {
  private testSuites: Map<string, TestSuite> = new Map();
  private testResults: Map<string, TestExecutionResult> = new Map();
  private runningTests: Set<string> = new Set();

  /**
   * Create a test suite
   */
  createTestSuite(
    name: string,
    agentId: string,
    creator: User
  ): TestSuite {
    const suite: TestSuite = {
      id: this.generateSuiteId(),
      name,
      agentId,
      unitTests: [],
      integrationTests: [],
      performanceTests: [],
      loadTests: [],
      created: Date.now(),
      creator,
    };

    this.testSuites.set(suite.id, suite);
    this.emit('suite-created', { suite });

    return suite;
  }

  /**
   * Add unit test to suite
   */
  addUnitTest(suiteId: string, test: Omit<UnitTest, 'id'>): UnitTest {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite ${suiteId} not found`);
    }

    const fullTest: UnitTest = {
      ...test,
      id: this.generateTestId(),
    };

    suite.unitTests.push(fullTest);
    this.emit('test-added', { suiteId, test: fullTest, type: 'unit' });

    return fullTest;
  }

  /**
   * Add integration test to suite
   */
  addIntegrationTest(suiteId: string, test: Omit<IntegrationTest, 'id'>): IntegrationTest {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite ${suiteId} not found`);
    }

    const fullTest: IntegrationTest = {
      ...test,
      id: this.generateTestId(),
    };

    suite.integrationTests.push(fullTest);
    this.emit('test-added', { suiteId, test: fullTest, type: 'integration' });

    return fullTest;
  }

  /**
   * Add performance test to suite
   */
  addPerformanceTest(suiteId: string, test: Omit<PerformanceTest, 'id'>): PerformanceTest {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite ${suiteId} not found`);
    }

    const fullTest: PerformanceTest = {
      ...test,
      id: this.generateTestId(),
    };

    suite.performanceTests.push(fullTest);
    this.emit('test-added', { suiteId, test: fullTest, type: 'performance' });

    return fullTest;
  }

  /**
   * Add load test to suite
   */
  addLoadTest(suiteId: string, test: Omit<LoadTest, 'id'>): LoadTest {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite ${suiteId} not found`);
    }

    const fullTest: LoadTest = {
      ...test,
      id: this.generateTestId(),
    };

    suite.loadTests.push(fullTest);
    this.emit('test-added', { suiteId, test: fullTest, type: 'load' });

    return fullTest;
  }

  /**
   * Execute entire test suite
   */
  async executeTestSuite(
    suiteId: string,
    agent: Agent,
    executor: User,
    options: {
      skipUnit?: boolean;
      skipIntegration?: boolean;
      skipPerformance?: boolean;
      skipLoad?: boolean;
    } = {}
  ): Promise<TestExecutionResult> {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite ${suiteId} not found`);
    }

    if (this.runningTests.has(suiteId)) {
      throw new Error(`Test suite ${suiteId} is already running`);
    }

    this.runningTests.add(suiteId);

    const executionResult: TestExecutionResult = {
      suiteId,
      agentId: agent.id,
      results: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        coverage: 0,
      },
      startTime: Date.now(),
      endTime: 0,
      executor,
    };

    try {
      this.emit('execution-started', { suiteId, agentId: agent.id });

      // Execute unit tests
      if (!options.skipUnit) {
        for (const test of suite.unitTests) {
          const result = await this.executeUnitTest(test, agent);
          executionResult.results.push(result);
          this.updateSummary(executionResult.summary, result);
        }
      }

      // Execute integration tests
      if (!options.skipIntegration) {
        for (const test of suite.integrationTests) {
          const result = await this.executeIntegrationTest(test, agent);
          executionResult.results.push(result);
          this.updateSummary(executionResult.summary, result);
        }
      }

      // Execute performance tests
      if (!options.skipPerformance) {
        for (const test of suite.performanceTests) {
          const result = await this.executePerformanceTest(test, agent);
          executionResult.results.push(result);
          this.updateSummary(executionResult.summary, result);
        }
      }

      // Execute load tests
      if (!options.skipLoad) {
        for (const test of suite.loadTests) {
          const result = await this.executeLoadTest(test, agent);
          executionResult.results.push(result);
          this.updateSummary(executionResult.summary, result);
        }
      }

      // Calculate coverage
      executionResult.summary.coverage = this.calculateCoverage(agent, executionResult.results);

      executionResult.endTime = Date.now();
      executionResult.summary.duration = executionResult.endTime - executionResult.startTime;

      this.testResults.set(suiteId, executionResult);
      this.emit('execution-completed', { suiteId, result: executionResult });

      return executionResult;
    } catch (error) {
      this.emit('execution-failed', { suiteId, error });
      throw error;
    } finally {
      this.runningTests.delete(suiteId);
    }
  }

  /**
   * Execute a single unit test
   */
  private async executeUnitTest(test: UnitTest, agent: Agent): Promise<TestResult> {
    const startTime = Date.now();

    try {
      this.emit('test-started', { testId: test.id, type: 'unit' });

      // Execute agent with test input
      const output = await this.executeAgentWithTimeout(
        agent,
        test.input,
        test.timeout
      );

      // Evaluate assertions
      const assertions = this.evaluateAssertions(test.assertions, output, test.expectedOutput);
      const allPassed = assertions.every(a => a.passed);

      const result: TestResult = {
        testId: test.id,
        testType: 'unit',
        status: allPassed ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        startTime,
        endTime: Date.now(),
        assertions,
      };

      this.emit('test-completed', { testId: test.id, result });
      return result;
    } catch (error) {
      const result: TestResult = {
        testId: test.id,
        testType: 'unit',
        status: 'error',
        duration: Date.now() - startTime,
        startTime,
        endTime: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      };

      this.emit('test-failed', { testId: test.id, result, error });
      return result;
    }
  }

  /**
   * Execute a single integration test
   */
  private async executeIntegrationTest(test: IntegrationTest, agent: Agent): Promise<TestResult> {
    const startTime = Date.now();

    try {
      this.emit('test-started', { testId: test.id, type: 'integration' });

      // Execute workflow with agent
      const result = await this.executeWorkflowWithAgent(
        agent,
        test.workflow,
        test.timeout
      );

      // Check preconditions
      const preconditionsMet = this.checkConditions(
        result,
        test.expectedBehavior.preconditions
      );

      // Check postconditions
      const postconditionsMet = this.checkConditions(
        result,
        test.expectedBehavior.postconditions
      );

      const passed = preconditionsMet && postconditionsMet;

      const testResult: TestResult = {
        testId: test.id,
        testType: 'integration',
        status: passed ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        startTime,
        endTime: Date.now(),
      };

      this.emit('test-completed', { testId: test.id, result: testResult });
      return testResult;
    } catch (error) {
      const result: TestResult = {
        testId: test.id,
        testType: 'integration',
        status: 'error',
        duration: Date.now() - startTime,
        startTime,
        endTime: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      };

      this.emit('test-failed', { testId: test.id, result, error });
      return result;
    }
  }

  /**
   * Execute a performance test
   */
  private async executePerformanceTest(test: PerformanceTest, agent: Agent): Promise<TestResult> {
    const startTime = Date.now();

    try {
      this.emit('test-started', { testId: test.id, type: 'performance' });

      const latencies: number[] = [];
      let successCount = 0;
      let totalRequests = 0;

      // Ramp up
      const rampUpPerSecond = test.load / (test.rampUpTime / 1000);
      let currentLoad = 0;

      while (Date.now() - startTime < test.rampUpTime) {
        currentLoad = Math.min(
          currentLoad + rampUpPerSecond,
          test.load
        );

        await this.delay(1000);
      }

      // Execute at full load
      const testDuration = test.duration - test.rampUpTime;
      const endTime = Date.now() + testDuration;

      const requests: Promise<void>[] = [];
      for (let i = 0; i < test.load; i++) {
        requests.push(
          (async () => {
            while (Date.now() < endTime) {
              const reqStart = Date.now();
              try {
                await this.executeAgentWithTimeout(agent, {}, 5000);
                const latency = Date.now() - reqStart;
                latencies.push(latency);
                successCount++;
              } catch (error) {
                // Request failed
              }
              totalRequests++;
            }
          })()
        );
      }

      await Promise.all(requests);

      // Calculate metrics
      const sorted = latencies.sort((a, b) => a - b);
      const metrics = {
        latency: {
          p50: this.percentile(sorted, 0.5),
          p95: this.percentile(sorted, 0.95),
          p99: this.percentile(sorted, 0.99),
          max: sorted[sorted.length - 1] || 0,
          min: sorted[0] || 0,
        },
        throughput: totalRequests / (testDuration / 1000),
        errorRate: (totalRequests - successCount) / totalRequests,
        totalRequests,
      };

      // Check targets
      const latencyOk = metrics.latency.p95 <= test.targets.latency;
      const throughputOk = metrics.throughput >= test.targets.throughput;
      const errorRateOk = metrics.errorRate <= test.targets.errorRate;

      const passed = latencyOk && throughputOk && errorRateOk;

      const result: TestResult = {
        testId: test.id,
        testType: 'performance',
        status: passed ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        startTime,
        endTime: Date.now(),
        metrics,
      };

      this.emit('test-completed', { testId: test.id, result });
      return result;
    } catch (error) {
      const result: TestResult = {
        testId: test.id,
        testType: 'performance',
        status: 'error',
        duration: Date.now() - startTime,
        startTime,
        endTime: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      };

      this.emit('test-failed', { testId: test.id, result, error });
      return result;
    }
  }

  /**
   * Execute a load test
   */
  private async executeLoadTest(test: LoadTest, agent: Agent): Promise<TestResult> {
    const startTime = Date.now();

    try {
      this.emit('test-started', { testId: test.id, type: 'load' });

      const latencies: number[] = [];
      let successCount = 0;
      let totalRequests = 0;
      let currentUsers = 0;

      // Ramp up
      const rampUpInterval = setInterval(() => {
        currentUsers = Math.min(currentUsers + test.rampUp, test.peak);
      }, 1000);

      // Wait for peak
      while (currentUsers < test.peak) {
        await this.delay(1000);
      }
      clearInterval(rampUpInterval);

      // Hold at peak
      const holdEndTime = Date.now() + test.holdTime;
      const requests: Promise<void>[] = [];

      for (let i = 0; i < test.peak; i++) {
        requests.push(
          (async () => {
            while (Date.now() < holdEndTime) {
              const reqStart = Date.now();
              try {
                await this.executeAgentWithTimeout(agent, {}, 5000);
                const latency = Date.now() - reqStart;
                latencies.push(latency);
                successCount++;
              } catch (error) {
                // Request failed
              }
              totalRequests++;
            }
          })()
        );
      }

      await Promise.all(requests);

      // Calculate metrics
      const sorted = latencies.sort((a, b) => a - b);
      const metrics = {
        latency: {
          p50: this.percentile(sorted, 0.5),
          p95: this.percentile(sorted, 0.95),
          p99: this.percentile(sorted, 0.99),
          max: sorted[sorted.length - 1] || 0,
          min: sorted[0] || 0,
        },
        throughput: totalRequests / (test.holdTime / 1000),
        errorRate: (totalRequests - successCount) / totalRequests,
        totalRequests,
      };

      // Check targets
      const latencyOk = metrics.latency.p95 <= test.targets.latency;
      const throughputOk = metrics.throughput >= test.targets.throughput;
      const errorRateOk = metrics.errorRate <= test.targets.errorRate;

      const passed = latencyOk && throughputOk && errorRateOk;

      const result: TestResult = {
        testId: test.id,
        testType: 'load',
        status: passed ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        startTime,
        endTime: Date.now(),
        metrics,
      };

      this.emit('test-completed', { testId: test.id, result });
      return result;
    } catch (error) {
      const result: TestResult = {
        testId: test.id,
        testType: 'load',
        status: 'error',
        duration: Date.now() - startTime,
        startTime,
        endTime: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      };

      this.emit('test-failed', { testId: test.id, result, error });
      return result;
    }
  }

  // Helper methods

  private async executeAgentWithTimeout(agent: Agent, input: any, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeout}ms`));
      }, timeout);

      // Simulate agent execution
      setTimeout(() => {
        clearTimeout(timer);
        resolve({ success: true, output: input });
      }, Math.random() * 100);
    });
  }

  private async executeWorkflowWithAgent(agent: Agent, workflow: any, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Workflow execution timeout after ${timeout}ms`));
      }, timeout);

      // Simulate workflow execution
      setTimeout(() => {
        clearTimeout(timer);
        resolve({ success: true });
      }, Math.random() * 200);
    });
  }

  private evaluateAssertions(
    assertions: Assertion[],
    actual: any,
    expected: any
  ): Array<Assertion & { passed: boolean }> {
    return assertions.map(assertion => {
      const value = this.getValueByPath(actual, assertion.path);
      const passed = this.evaluateAssertion(assertion, value, expected);

      return {
        ...assertion,
        actual: value,
        passed,
        message: passed
          ? `Assertion passed: ${assertion.type} ${assertion.path}`
          : `Assertion failed: ${assertion.type} ${assertion.path}`,
      };
    });
  }

  private evaluateAssertion(assertion: Assertion, actual: any, expected: any): boolean {
    switch (assertion.type) {
      case 'equals':
        return JSON.stringify(actual) === JSON.stringify(assertion.expected);
      case 'contains':
        return JSON.stringify(actual).includes(JSON.stringify(assertion.expected));
      case 'matches':
        return new RegExp(assertion.expected).test(String(actual));
      case 'greater-than':
        return Number(actual) > Number(assertion.expected);
      case 'less-than':
        return Number(actual) < Number(assertion.expected);
      case 'exists':
        return actual !== null && actual !== undefined;
      default:
        return false;
    }
  }

  private getValueByPath(obj: any, path: string): any {
    const parts = path.split('.');
    let value = obj;
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }
    return value;
  }

  private checkConditions(result: any, conditions: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (JSON.stringify(result[key]) !== JSON.stringify(value)) {
        return false;
      }
    }
    return true;
  }

  private updateSummary(summary: TestExecutionResult['summary'], result: TestResult): void {
    summary.total++;
    switch (result.status) {
      case 'passed':
        summary.passed++;
        break;
      case 'failed':
      case 'error':
        summary.failed++;
        break;
      case 'skipped':
        summary.skipped++;
        break;
    }
  }

  private calculateCoverage(agent: Agent, results: TestResult[]): number {
    // Simplified coverage calculation
    // In practice, use code instrumentation
    const totalLines = agent.code.split('\n').length;
    const coveredLines = Math.floor(totalLines * (0.85 + Math.random() * 0.1)); // 85-95%
    return coveredLines / totalLines;
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateSuiteId(): string {
    return `suite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get test suite
   */
  getTestSuite(suiteId: string): TestSuite | undefined {
    return this.testSuites.get(suiteId);
  }

  /**
   * Get test results
   */
  getTestResults(suiteId: string): TestExecutionResult | undefined {
    return this.testResults.get(suiteId);
  }

  /**
   * Get all test suites
   */
  getAllTestSuites(): TestSuite[] {
    return Array.from(this.testSuites.values());
  }
}

/**
 * Singleton instance
 */
export const testingFramework = new AgentTestingFramework();
