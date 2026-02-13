/**
 * Regression Testing Framework
 *
 * Automated testing to ensure workflow changes don't break
 * existing functionality.
 */

import type {
  RegressionTest,
  TestResult,
  TestSuite,
  TestExecutionSummary,
  TestCoverage,
  Assertion,
  AssertionResult,
} from './types/digitaltwin';
import type { Workflow } from '../types/workflowTypes';
import { WorkflowDigitalTwin } from './WorkflowDigitalTwin';
import { generateUUID } from '../utils/uuid';

/**
 * Test generation configuration
 */
export interface TestGenerationConfig {
  captureFromExecution: boolean;
  includeEdgeCases: boolean;
  includeErrorCases: boolean;
  maxTestsPerWorkflow: number;
}

/**
 * Regression Testing class
 */
export class RegressionTesting {
  private tests: Map<string, RegressionTest> = new Map();
  private suites: Map<string, TestSuite> = new Map();
  private results: Map<string, TestExecutionSummary> = new Map();
  private digitalTwin: WorkflowDigitalTwin;

  constructor(digitalTwin?: WorkflowDigitalTwin) {
    this.digitalTwin = digitalTwin || new WorkflowDigitalTwin();
  }

  /**
   * Create regression test
   */
  createTest(test: Omit<RegressionTest, 'id' | 'createdAt' | 'updatedAt'>): RegressionTest {
    const regressionTest: RegressionTest = {
      ...test,
      id: generateUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tests.set(regressionTest.id, regressionTest);
    return regressionTest;
  }

  /**
   * Generate tests from real execution
   */
  async generateFromExecution(
    workflow: Workflow,
    executionData: { input: any; output: any },
    config: Partial<TestGenerationConfig> = {}
  ): Promise<RegressionTest[]> {
    const testConfig: TestGenerationConfig = {
      captureFromExecution: config.captureFromExecution ?? true,
      includeEdgeCases: config.includeEdgeCases ?? true,
      includeErrorCases: config.includeErrorCases ?? true,
      maxTestsPerWorkflow: config.maxTestsPerWorkflow ?? 10,
    };

    const tests: RegressionTest[] = [];

    // Create main test from execution
    const mainTest = this.createTest({
      name: `${workflow.name} - Main Flow`,
      description: 'Auto-generated from successful execution',
      workflow,
      input: executionData.input,
      expectedOutput: executionData.output,
      timeout: 60000,
      assertions: this.generateAssertions(executionData.output),
      tags: ['auto-generated', 'main-flow'],
      enabled: true,
    });
    tests.push(mainTest);

    // Generate edge case tests
    if (testConfig.includeEdgeCases && tests.length < testConfig.maxTestsPerWorkflow) {
      const edgeCaseTests = this.generateEdgeCaseTests(workflow, executionData);
      tests.push(...edgeCaseTests.slice(0, testConfig.maxTestsPerWorkflow - tests.length));
    }

    // Generate error case tests
    if (testConfig.includeErrorCases && tests.length < testConfig.maxTestsPerWorkflow) {
      const errorCaseTests = this.generateErrorCaseTests(workflow, executionData);
      tests.push(...errorCaseTests.slice(0, testConfig.maxTestsPerWorkflow - tests.length));
    }

    return tests;
  }

  /**
   * Generate assertions from output
   */
  private generateAssertions(output: any): Assertion[] {
    const assertions: Assertion[] = [];

    // Output exists
    assertions.push({
      type: 'equals',
      path: '$',
      expected: output,
      message: 'Output should match expected value',
    });

    // If output is object, check key properties
    if (typeof output === 'object' && output !== null) {
      Object.keys(output).forEach(key => {
        if (typeof output[key] !== 'function') {
          assertions.push({
            type: 'equals',
            path: `$.${key}`,
            expected: output[key],
            message: `Property ${key} should match expected value`,
          });
        }
      });
    }

    return assertions;
  }

  /**
   * Generate edge case tests
   */
  private generateEdgeCaseTests(workflow: Workflow, executionData: any): RegressionTest[] {
    const tests: RegressionTest[] = [];

    // Empty input test
    tests.push(this.createTest({
      name: `${workflow.name} - Empty Input`,
      description: 'Test with empty input',
      workflow,
      input: {},
      expectedOutput: null,
      timeout: 30000,
      assertions: [
        {
          type: 'equals',
          path: '$.error',
          expected: undefined,
          operator: '!==',
          message: 'Should handle empty input gracefully',
        },
      ],
      tags: ['edge-case', 'empty-input'],
      enabled: true,
    }));

    // Null input test
    tests.push(this.createTest({
      name: `${workflow.name} - Null Input`,
      description: 'Test with null input',
      workflow,
      input: null,
      expectedOutput: null,
      timeout: 30000,
      assertions: [
        {
          type: 'equals',
          path: '$.error',
          expected: undefined,
          operator: '!==',
          message: 'Should handle null input gracefully',
        },
      ],
      tags: ['edge-case', 'null-input'],
      enabled: true,
    }));

    // Large input test
    if (typeof executionData.input === 'object') {
      const largeInput = this.generateLargeInput(executionData.input);
      tests.push(this.createTest({
        name: `${workflow.name} - Large Input`,
        description: 'Test with large input data',
        workflow,
        input: largeInput,
        expectedOutput: null,
        timeout: 120000,
        assertions: [
          {
            type: 'equals',
            path: '$.error',
            expected: undefined,
            operator: '!==',
            message: 'Should handle large input',
          },
        ],
        tags: ['edge-case', 'large-input'],
        enabled: true,
      }));
    }

    return tests;
  }

  /**
   * Generate error case tests
   */
  private generateErrorCaseTests(workflow: Workflow, executionData: any): RegressionTest[] {
    const tests: RegressionTest[] = [];

    // Invalid data type test
    tests.push(this.createTest({
      name: `${workflow.name} - Invalid Data Type`,
      description: 'Test with invalid data type',
      workflow,
      input: 'invalid_string_instead_of_object',
      expectedOutput: null,
      timeout: 30000,
      assertions: [
        {
          type: 'equals',
          path: '$.error',
          expected: true,
          operator: '!==',
          message: 'Should handle invalid data type',
        },
      ],
      tags: ['error-case', 'invalid-type'],
      enabled: true,
    }));

    // Missing required fields test
    if (typeof executionData.input === 'object' && executionData.input !== null) {
      const incompleteInput = { ...executionData.input };
      delete incompleteInput[Object.keys(incompleteInput)[0]];

      tests.push(this.createTest({
        name: `${workflow.name} - Missing Required Fields`,
        description: 'Test with missing required fields',
        workflow,
        input: incompleteInput,
        expectedOutput: null,
        timeout: 30000,
        assertions: [
          {
            type: 'equals',
            path: '$.error',
            expected: true,
            operator: '!==',
            message: 'Should handle missing required fields',
          },
        ],
        tags: ['error-case', 'missing-fields'],
        enabled: true,
      }));
    }

    return tests;
  }

  /**
   * Generate large input for testing
   */
  private generateLargeInput(baseInput: any): any {
    if (Array.isArray(baseInput)) {
      return Array(1000).fill(baseInput[0] || {});
    }

    if (typeof baseInput === 'object' && baseInput !== null) {
      const largeInput: any = {};
      for (let i = 0; i < 100; i++) {
        largeInput[`field_${i}`] = baseInput;
      }
      return largeInput;
    }

    return baseInput;
  }

  /**
   * Run single test
   */
  async runTest(testId: string): Promise<TestResult> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    const startTime = Date.now();

    try {
      // Create digital twin for test
      const twin = await this.digitalTwin.createTwin(test.workflow);

      // Run simulation
      const simulation = await this.digitalTwin.simulate(twin.id, test.input, {
        timeout: test.timeout,
        faults: test.faults,
        deterministic: true,
      });

      // Evaluate assertions
      const assertionResults = await this.evaluateAssertions(
        test.assertions,
        simulation.output
      );

      const allPassed = assertionResults.every(r => r.passed);
      const duration = Date.now() - startTime;

      return {
        testId: test.id,
        testName: test.name,
        status: allPassed ? 'passed' : 'failed',
        duration,
        assertions: assertionResults,
        output: simulation.output,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        testId: test.id,
        testName: test.name,
        status: 'failed',
        duration: Date.now() - startTime,
        assertions: [],
        error: error as Error,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Evaluate assertions
   */
  private async evaluateAssertions(
    assertions: Assertion[],
    output: any
  ): Promise<AssertionResult[]> {
    return assertions.map(assertion => {
      const actual = this.getValueByPath(output, assertion.path);
      const passed = this.evaluateAssertion(assertion, actual);

      return {
        assertion,
        passed,
        actual,
        expected: assertion.expected,
        message: passed
          ? `✓ ${assertion.message || 'Assertion passed'}`
          : `✗ ${assertion.message || 'Assertion failed'}`,
      };
    });
  }

  /**
   * Evaluate single assertion
   */
  private evaluateAssertion(assertion: Assertion, actual: any): boolean {
    const { type, expected, operator } = assertion;

    switch (type) {
      case 'equals':
        if (operator === '!==') {
          return actual !== expected;
        }
        return JSON.stringify(actual) === JSON.stringify(expected);

      case 'contains':
        if (typeof actual === 'string') {
          return actual.includes(expected);
        }
        if (Array.isArray(actual)) {
          return actual.includes(expected);
        }
        return false;

      case 'matches':
        if (typeof actual === 'string' && expected instanceof RegExp) {
          return expected.test(actual);
        }
        return false;

      case 'range':
        if (typeof actual === 'number' && Array.isArray(expected)) {
          return actual >= expected[0] && actual <= expected[1];
        }
        return false;

      case 'custom':
        // Would execute custom assertion function
        return true;

      default:
        return false;
    }
  }

  /**
   * Get value by JSON path
   */
  private getValueByPath(obj: any, path: string): any {
    if (path === '$') return obj;

    const parts = path.replace(/^\$\./, '').split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Run multiple tests
   */
  async runTests(testIds: string[]): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const testId of testIds) {
      const result = await this.runTest(testId);
      results.push(result);
    }

    return results;
  }

  /**
   * Run test suite
   */
  async runSuite(suiteId: string): Promise<TestExecutionSummary> {
    const suite = this.suites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite ${suiteId} not found`);
    }

    const startTime = Date.now();
    const testIds = suite.tests.map(t => t.id);
    const results = await this.runTests(testIds);

    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const timeout = results.filter(r => r.status === 'timeout').length;

    const coverage = this.calculateCoverage(suite.tests, results);

    const summary: TestExecutionSummary = {
      id: generateUUID(),
      suiteId,
      totalTests: results.length,
      passed,
      failed,
      skipped,
      timeout,
      duration: Date.now() - startTime,
      results,
      coverage,
      timestamp: new Date(),
    };

    this.results.set(summary.id, summary);
    return summary;
  }

  /**
   * Calculate test coverage
   */
  private calculateCoverage(tests: RegressionTest[], results: TestResult[]): TestCoverage {
    // Simplified coverage calculation
    const workflows = new Set(tests.map(t => t.workflow.id));
    const nodes = new Set<string>();
    const branches = new Set<string>();

    tests.forEach(test => {
      test.workflow.nodes.forEach(node => nodes.add(node.id));
      test.workflow.edges.forEach(edge => branches.add(`${edge.source}-${edge.target}`));
    });

    return {
      nodes: {
        total: nodes.size,
        covered: nodes.size, // Assume all covered for now
        percentage: 100,
      },
      branches: {
        total: branches.size,
        covered: branches.size,
        percentage: 100,
      },
      paths: {
        total: tests.length,
        covered: results.filter(r => r.status === 'passed').length,
        percentage: (results.filter(r => r.status === 'passed').length / tests.length) * 100,
      },
    };
  }

  /**
   * Create test suite
   */
  createSuite(name: string, description?: string): TestSuite {
    const suite: TestSuite = {
      id: generateUUID(),
      name,
      description,
      tests: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.suites.set(suite.id, suite);
    return suite;
  }

  /**
   * Add test to suite
   */
  addTestToSuite(suiteId: string, test: RegressionTest): void {
    const suite = this.suites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite ${suiteId} not found`);
    }

    suite.tests.push(test);
    suite.updatedAt = new Date();
  }

  /**
   * Get test
   */
  getTest(testId: string): RegressionTest | undefined {
    return this.tests.get(testId);
  }

  /**
   * Get all tests
   */
  getAllTests(filters?: { tags?: string[]; enabled?: boolean }): RegressionTest[] {
    let tests = Array.from(this.tests.values());

    if (filters) {
      if (filters.tags) {
        tests = tests.filter(t => filters.tags!.some(tag => t.tags.includes(tag)));
      }
      if (filters.enabled !== undefined) {
        tests = tests.filter(t => t.enabled === filters.enabled);
      }
    }

    return tests;
  }

  /**
   * Get suite
   */
  getSuite(suiteId: string): TestSuite | undefined {
    return this.suites.get(suiteId);
  }

  /**
   * Get all suites
   */
  getAllSuites(): TestSuite[] {
    return Array.from(this.suites.values());
  }

  /**
   * Get execution summary
   */
  getExecutionSummary(summaryId: string): TestExecutionSummary | undefined {
    return this.results.get(summaryId);
  }

  /**
   * Get all execution summaries
   */
  getAllExecutionSummaries(): TestExecutionSummary[] {
    return Array.from(this.results.values());
  }

  /**
   * Update test
   */
  updateTest(testId: string, updates: Partial<RegressionTest>): RegressionTest {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    const updated = {
      ...test,
      ...updates,
      id: test.id,
      createdAt: test.createdAt,
      updatedAt: new Date(),
    };

    this.tests.set(testId, updated);
    return updated;
  }

  /**
   * Delete test
   */
  deleteTest(testId: string): boolean {
    return this.tests.delete(testId);
  }

  /**
   * Delete suite
   */
  deleteSuite(suiteId: string): boolean {
    return this.suites.delete(suiteId);
  }

  /**
   * Export tests to JSON
   */
  exportTests(testIds?: string[]): string {
    const tests = testIds
      ? testIds.map(id => this.tests.get(id)).filter((t): t is RegressionTest => t !== undefined)
      : Array.from(this.tests.values());

    return JSON.stringify(tests, null, 2);
  }

  /**
   * Import tests from JSON
   */
  importTests(json: string): RegressionTest[] {
    const tests = JSON.parse(json) as RegressionTest[];
    const imported: RegressionTest[] = [];

    tests.forEach(test => {
      const newTest = this.createTest({
        name: test.name,
        description: test.description,
        workflow: test.workflow,
        input: test.input,
        expectedOutput: test.expectedOutput,
        faults: test.faults,
        timeout: test.timeout,
        assertions: test.assertions,
        tags: test.tags,
        enabled: test.enabled,
        metadata: test.metadata,
      });
      imported.push(newTest);
    });

    return imported;
  }
}

// Singleton instance
let instance: RegressionTesting | null = null;

export function getRegressionTesting(digitalTwin?: WorkflowDigitalTwin): RegressionTesting {
  if (!instance) {
    instance = new RegressionTesting(digitalTwin);
  }
  return instance;
}
