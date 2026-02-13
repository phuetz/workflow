/**
 * Workflow Testing Service
 * Main orchestrator for workflow testing functionality
 */

import { logger } from './SimpleLogger';
import { BaseService } from './BaseService';
import { performanceMonitor } from './PerformanceMonitoringService';
import type {
  WorkflowTestCase,
  WorkflowTestResult,
  TestExecutionContext,
  TestReport
} from '../types/testing';
import type {
  TestExecutionOptions,
  TestSuiteOptions,
  CreateTestCaseParams,
  ExportFormat
} from './testing/types';

// Import extracted modules
import { testRunner } from './testing/TestRunner';
import { testValidator } from './testing/TestValidator';
import { coverageCalculator } from './testing/CoverageCalculator';
import { testReporter } from './testing/TestReporter';

export class WorkflowTestingService extends BaseService {
  private testExecutions: Map<string, WorkflowTestResult> = new Map();
  private mockServices: Map<string, unknown> = new Map();
  private breakpoints: Map<string, Set<string>> = new Map();

  constructor() {
    super('WorkflowTesting', {
      enableRetry: false,
      enableCaching: false
    });
  }

  /**
   * Create a test case for a workflow
   */
  public createTestCase(params: CreateTestCaseParams): WorkflowTestCase {
    const testCase: WorkflowTestCase = {
      id: this.generateTestId(),
      name: params.name,
      description: params.description,
      workflowId: params.workflowId,
      input: params.input,
      expectedOutput: params.expectedOutput,
      assertions: params.assertions,
      timeout: params.timeout || 30000,
      tags: params.tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    logger.info('Test case created', {
      testId: testCase.id,
      workflowId: params.workflowId
    });

    return testCase;
  }

  /**
   * Execute a single test case
   */
  public async executeTest(
    testCase: WorkflowTestCase,
    options: TestExecutionOptions = {}
  ): Promise<WorkflowTestResult> {
    const executionId = `test_${Date.now()}`;
    const startTime = Date.now();

    logger.info('Starting test execution', {
      testId: testCase.id,
      executionId
    });

    try {
      // Setup test context
      const context = this.createTestContext(testCase, options);

      // Setup breakpoints if debugging
      if (options.breakpoints) {
        this.setBreakpoints(testCase.workflowId, options.breakpoints);
      }

      // Execute workflow
      const execution = await testRunner.executeWorkflow(
        testCase.workflowId,
        testCase.input,
        context
      );

      // Run assertions
      const assertions = await testValidator.runAssertions(
        testCase.assertions,
        execution,
        context
      );
      const passed = assertions.every(a => a.passed);

      // Calculate coverage if requested
      const coverage = options.coverage
        ? await coverageCalculator.calculateCoverage(testCase.workflowId, execution)
        : undefined;

      const duration = Date.now() - startTime;

      const result: WorkflowTestResult = {
        id: executionId,
        testCaseId: testCase.id,
        workflowId: testCase.workflowId,
        executionId: execution.id,
        status: passed ? 'passed' : 'failed',
        startTime: new Date(startTime),
        endTime: new Date(),
        duration,
        input: testCase.input,
        output: execution.output,
        assertions,
        coverage,
        error: execution.error ? new Error(execution.error.message) : undefined,
        logs: context.logs,
        metrics: {
          nodesExecuted: execution.nodeExecutions.length,
          assertionsPassed: assertions.filter(a => a.passed).length,
          assertionsFailed: assertions.filter(a => !a.passed).length
        }
      };

      this.testExecutions.set(executionId, result);

      performanceMonitor.recordMetric('test.execution', {
        testId: testCase.id,
        duration,
        status: result.status
      });

      logger.info('Test execution completed', {
        testId: testCase.id,
        executionId,
        status: result.status,
        duration
      });

      return result;

    } catch (error) {
      const result: WorkflowTestResult = {
        id: executionId,
        testCaseId: testCase.id,
        workflowId: testCase.workflowId,
        executionId: '',
        status: 'error',
        startTime: new Date(startTime),
        endTime: new Date(),
        duration: Date.now() - startTime,
        input: testCase.input,
        output: undefined,
        assertions: [],
        error: error instanceof Error ? error : new Error(String(error)),
        logs: [],
        metrics: {
          nodesExecuted: 0,
          assertionsPassed: 0,
          assertionsFailed: 0
        }
      };

      this.testExecutions.set(executionId, result);
      logger.error('Test execution failed', { testId: testCase.id, error });

      return result;
    } finally {
      this.clearBreakpoints(testCase.workflowId);
      this.clearMocks();
    }
  }

  /**
   * Execute multiple test cases
   */
  public async executeTestSuite(
    testCases: WorkflowTestCase[],
    options: TestSuiteOptions = {}
  ): Promise<TestReport> {
    const results: WorkflowTestResult[] = [];

    logger.info('Starting test suite execution', {
      testCount: testCases.length,
      parallel: options.parallel
    });

    if (options.parallel) {
      const promises = testCases.map(testCase =>
        this.executeTest(testCase, { coverage: options.coverage })
      );

      const settled = await Promise.allSettled(promises);

      for (const result of settled) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (options.stopOnFailure && result.value.status === 'failed') {
            break;
          }
        }
      }
    } else {
      for (const testCase of testCases) {
        const result = await this.executeTest(testCase, {
          coverage: options.coverage
        });
        results.push(result);

        if (options.stopOnFailure && result.status === 'failed') {
          break;
        }
      }
    }

    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
    const report = testReporter.generateReport(results, {
      duration: totalDuration,
      coverage: options.coverage
    });

    logger.info('Test suite execution completed', {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length
    });

    return report;
  }

  /**
   * Create test execution context
   */
  private createTestContext(
    testCase: WorkflowTestCase,
    options: TestExecutionOptions
  ): TestExecutionContext {
    return {
      testId: testCase.id,
      mockData: options.mockData || {},
      logs: [],
      variables: {},
      startTime: Date.now(),
      timeout: testCase.timeout,
      debug: options.debug || false
    };
  }

  /**
   * Setup mock services for testing
   */
  public setupMocks(mocks: Record<string, unknown>): void {
    Object.entries(mocks).forEach(([key, value]) => {
      this.mockServices.set(key, value);
    });
  }

  /**
   * Clear all mocks
   */
  private clearMocks(): void {
    this.mockServices.clear();
  }

  /**
   * Set breakpoints for debugging
   */
  public setBreakpoints(workflowId: string, nodeIds: string[]): void {
    this.breakpoints.set(workflowId, new Set(nodeIds));
  }

  /**
   * Clear breakpoints
   */
  private clearBreakpoints(workflowId: string): void {
    this.breakpoints.delete(workflowId);
  }

  /**
   * Export test results
   */
  public exportTestResults(format: ExportFormat = 'json'): string {
    const results = Array.from(this.testExecutions.values());
    return testReporter.exportResults(results, format);
  }

  /**
   * Get test execution by ID
   */
  public getTestExecution(executionId: string): WorkflowTestResult | undefined {
    return this.testExecutions.get(executionId);
  }

  /**
   * Get all test executions
   */
  public getAllTestExecutions(): WorkflowTestResult[] {
    return Array.from(this.testExecutions.values());
  }

  /**
   * Clear test executions
   */
  public clearTestExecutions(): void {
    this.testExecutions.clear();
  }

  /**
   * Generate unique test ID
   */
  private generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const workflowTesting = new WorkflowTestingService();
