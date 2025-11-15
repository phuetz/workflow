/**
 * Workflow Testing Framework
 * Comprehensive testing utilities for workflows
 */

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  input: any;
  expectedOutput?: any;
  expectedDuration?: number; // Max duration in ms
  assertions?: TestAssertion[];
  tags?: string[];
  skip?: boolean;
  only?: boolean;
}

export interface TestAssertion {
  type: 'equals' | 'contains' | 'matches' | 'greaterThan' | 'lessThan' | 'exists' | 'notExists' | 'custom';
  path?: string; // JSON path to value
  expected?: any;
  matcher?: (actual: any) => boolean;
  message?: string;
}

export interface TestResult {
  testCase: TestCase;
  passed: boolean;
  duration: number;
  output: any;
  assertions: AssertionResult[];
  error?: {
    message: string;
    stack?: string;
  };
  executionId?: string;
}

export interface AssertionResult {
  assertion: TestAssertion;
  passed: boolean;
  actual: any;
  expected: any;
  message: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description?: string;
  workflowId: string;
  testCases: TestCase[];
  beforeAll?: () => Promise<void>;
  afterAll?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
  timeout?: number; // Suite timeout
  createdAt: string;
  updatedAt: string;
}

export interface TestReport {
  suite: TestSuite;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    successRate: number;
  };
  startTime: string;
  endTime: string;
}

class WorkflowTestRunner {
  private suites: Map<string, TestSuite> = new Map();
  private executionEngine: any; // Workflow execution engine

  constructor(executionEngine?: any) {
    this.executionEngine = executionEngine;
    this.loadFromStorage();
  }

  /**
   * Create test suite
   */
  createSuite(
    name: string,
    workflowId: string,
    options?: {
      description?: string;
      beforeAll?: () => Promise<void>;
      afterAll?: () => Promise<void>;
      beforeEach?: () => Promise<void>;
      afterEach?: () => Promise<void>;
      timeout?: number;
    }
  ): TestSuite {
    const suite: TestSuite = {
      id: this.generateId(),
      name,
      description: options?.description,
      workflowId,
      testCases: [],
      beforeAll: options?.beforeAll,
      afterAll: options?.afterAll,
      beforeEach: options?.beforeEach,
      afterEach: options?.afterEach,
      timeout: options?.timeout,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.suites.set(suite.id, suite);
    this.saveToStorage();

    return suite;
  }

  /**
   * Add test case to suite
   */
  addTestCase(suiteId: string, testCase: Omit<TestCase, 'id'>): TestCase {
    const suite = this.suites.get(suiteId);

    if (!suite) {
      throw new Error('Suite not found');
    }

    const fullTestCase: TestCase = {
      id: this.generateId(),
      ...testCase
    };

    suite.testCases.push(fullTestCase);
    suite.updatedAt = new Date().toISOString();

    this.suites.set(suiteId, suite);
    this.saveToStorage();

    return fullTestCase;
  }

  /**
   * Run test suite
   */
  async runSuite(suiteId: string, options?: {
    parallel?: boolean;
    bail?: boolean; // Stop on first failure
    grep?: string; // Run tests matching pattern
  }): Promise<TestReport> {
    const suite = this.suites.get(suiteId);

    if (!suite) {
      throw new Error('Suite not found');
    }

    const startTime = new Date().toISOString();
    const results: TestResult[] = [];

    // Run beforeAll hook
    if (suite.beforeAll) {
      await suite.beforeAll();
    }

    // Filter test cases
    let testCases = suite.testCases;

    if (options?.grep) {
      const pattern = new RegExp(options.grep, 'i');
      testCases = testCases.filter(tc =>
        pattern.test(tc.name) || pattern.test(tc.description || '')
      );
    }

    // Handle .only and .skip
    const onlyTests = testCases.filter(tc => tc.only);
    if (onlyTests.length > 0) {
      testCases = onlyTests;
    }

    testCases = testCases.filter(tc => !tc.skip);

    // Run tests
    if (options?.parallel) {
      const promises = testCases.map(tc => this.runTestCase(suite, tc));
      const allResults = await Promise.all(promises);
      results.push(...allResults);
    } else {
      for (const testCase of testCases) {
        const result = await this.runTestCase(suite, testCase);
        results.push(result);

        if (options?.bail && !result.passed) {
          break;
        }
      }
    }

    // Run afterAll hook
    if (suite.afterAll) {
      await suite.afterAll();
    }

    const endTime = new Date().toISOString();
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const skipped = suite.testCases.length - results.length;

    const report: TestReport = {
      suite,
      results,
      summary: {
        total: suite.testCases.length,
        passed,
        failed,
        skipped,
        duration: new Date(endTime).getTime() - new Date(startTime).getTime(),
        successRate: results.length > 0 ? (passed / results.length) * 100 : 0
      },
      startTime,
      endTime
    };

    return report;
  }

  /**
   * Run single test case
   */
  private async runTestCase(suite: TestSuite, testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Run beforeEach hook
      if (suite.beforeEach) {
        await suite.beforeEach();
      }

      // Execute workflow with test input
      const output = await this.executeWorkflow(suite.workflowId, testCase.input);
      const duration = Date.now() - startTime;

      // Run assertions
      const assertionResults = await this.runAssertions(testCase, output);
      const allPassed = assertionResults.every(r => r.passed);

      // Check duration if specified
      let durationPassed = true;
      if (testCase.expectedDuration && duration > testCase.expectedDuration) {
        durationPassed = false;
        assertionResults.push({
          assertion: {
            type: 'lessThan',
            message: `Duration ${duration}ms exceeded expected ${testCase.expectedDuration}ms`
          },
          passed: false,
          actual: duration,
          expected: testCase.expectedDuration,
          message: `Duration assertion failed`
        });
      }

      // Run afterEach hook
      if (suite.afterEach) {
        await suite.afterEach();
      }

      return {
        testCase,
        passed: allPassed && durationPassed,
        duration,
        output,
        assertions: assertionResults
      };
    } catch (error: any) {
      return {
        testCase,
        passed: false,
        duration: Date.now() - startTime,
        output: null,
        assertions: [],
        error: {
          message: error.message,
          stack: error.stack
        }
      };
    }
  }

  /**
   * Run assertions
   */
  private async runAssertions(testCase: TestCase, output: any): Promise<AssertionResult[]> {
    const results: AssertionResult[] = [];

    // Check expected output
    if (testCase.expectedOutput !== undefined) {
      const passed = JSON.stringify(output) === JSON.stringify(testCase.expectedOutput);
      results.push({
        assertion: {
          type: 'equals',
          expected: testCase.expectedOutput,
          message: 'Output should match expected'
        },
        passed,
        actual: output,
        expected: testCase.expectedOutput,
        message: passed ? 'Output matches expected' : 'Output does not match expected'
      });
    }

    // Run custom assertions
    if (testCase.assertions) {
      for (const assertion of testCase.assertions) {
        const result = await this.runAssertion(assertion, output);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Run single assertion
   */
  private async runAssertion(assertion: TestAssertion, output: any): Promise<AssertionResult> {
    const actual = assertion.path ? this.getValueByPath(output, assertion.path) : output;

    let passed = false;
    let message = assertion.message || 'Assertion failed';

    switch (assertion.type) {
      case 'equals':
        passed = JSON.stringify(actual) === JSON.stringify(assertion.expected);
        message = passed ? 'Values are equal' : `Expected ${JSON.stringify(assertion.expected)} but got ${JSON.stringify(actual)}`;
        break;

      case 'contains':
        if (Array.isArray(actual)) {
          passed = actual.includes(assertion.expected);
        } else if (typeof actual === 'string') {
          passed = actual.includes(assertion.expected);
        } else if (typeof actual === 'object') {
          passed = JSON.stringify(actual).includes(JSON.stringify(assertion.expected));
        }
        message = passed ? 'Value contains expected' : 'Value does not contain expected';
        break;

      case 'matches':
        if (typeof assertion.expected === 'string') {
          const regex = new RegExp(assertion.expected);
          passed = regex.test(String(actual));
        }
        message = passed ? 'Value matches pattern' : 'Value does not match pattern';
        break;

      case 'greaterThan':
        passed = Number(actual) > Number(assertion.expected);
        message = passed ? `${actual} > ${assertion.expected}` : `${actual} is not greater than ${assertion.expected}`;
        break;

      case 'lessThan':
        passed = Number(actual) < Number(assertion.expected);
        message = passed ? `${actual} < ${assertion.expected}` : `${actual} is not less than ${assertion.expected}`;
        break;

      case 'exists':
        passed = actual !== undefined && actual !== null;
        message = passed ? 'Value exists' : 'Value does not exist';
        break;

      case 'notExists':
        passed = actual === undefined || actual === null;
        message = passed ? 'Value does not exist' : 'Value exists';
        break;

      case 'custom':
        if (assertion.matcher) {
          passed = assertion.matcher(actual);
          message = passed ? 'Custom matcher passed' : 'Custom matcher failed';
        }
        break;
    }

    return {
      assertion,
      passed,
      actual,
      expected: assertion.expected,
      message
    };
  }

  /**
   * Execute workflow (mock implementation)
   */
  private async executeWorkflow(workflowId: string, input: any): Promise<any> {
    if (this.executionEngine) {
      return this.executionEngine.execute(workflowId, input);
    }

    // Mock execution for demo
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, data: input });
      }, Math.random() * 1000);
    });
  }

  /**
   * Get value by JSON path
   */
  private getValueByPath(obj: any, path: string): any {
    const parts = path.split('.');
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
   * Generate test report HTML
   */
  generateHtmlReport(report: TestReport): string {
    const passedClass = 'color: #10b981';
    const failedClass = 'color: #ef4444';
    const skippedClass = 'color: #6b7280';

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Test Report - ${report.suite.name}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 40px auto; padding: 0 20px; }
    .summary { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .stat { display: inline-block; margin-right: 30px; }
    .stat-value { font-size: 32px; font-weight: bold; }
    .stat-label { font-size: 14px; color: #6b7280; }
    .test-case { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .passed { border-left: 4px solid #10b981; }
    .failed { border-left: 4px solid #ef4444; }
    .assertion { padding: 10px; background: #f9fafb; margin: 10px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Test Report: ${report.suite.name}</h1>
  <p>${report.suite.description || ''}</p>

  <div class="summary">
    <div class="stat">
      <div class="stat-value">${report.summary.total}</div>
      <div class="stat-label">Total Tests</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="${passedClass}">${report.summary.passed}</div>
      <div class="stat-label">Passed</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="${failedClass}">${report.summary.failed}</div>
      <div class="stat-label">Failed</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="${skippedClass}">${report.summary.skipped}</div>
      <div class="stat-label">Skipped</div>
    </div>
    <div class="stat">
      <div class="stat-value">${report.summary.successRate.toFixed(1)}%</div>
      <div class="stat-label">Success Rate</div>
    </div>
    <div class="stat">
      <div class="stat-value">${report.summary.duration}ms</div>
      <div class="stat-label">Duration</div>
    </div>
  </div>

  <h2>Test Results</h2>
  ${report.results.map(result => `
    <div class="test-case ${result.passed ? 'passed' : 'failed'}">
      <h3>${result.passed ? '✓' : '✗'} ${result.testCase.name}</h3>
      <p>${result.testCase.description || ''}</p>
      <p><strong>Duration:</strong> ${result.duration}ms</p>

      ${result.error ? `
        <div style="background: #fee2e2; padding: 10px; border-radius: 4px; margin: 10px 0;">
          <strong>Error:</strong> ${result.error.message}
        </div>
      ` : ''}

      ${result.assertions.length > 0 ? `
        <h4>Assertions:</h4>
        ${result.assertions.map(assertion => `
          <div class="assertion" style="border-left: 3px solid ${assertion.passed ? '#10b981' : '#ef4444'}">
            ${assertion.passed ? '✓' : '✗'} ${assertion.message}
          </div>
        `).join('')}
      ` : ''}
    </div>
  `).join('')}

  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
    Generated on ${new Date(report.endTime).toLocaleString()}
  </footer>
</body>
</html>
    `;
  }

  /**
   * Export report as JSON
   */
  exportReport(report: TestReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Get all suites
   */
  getAllSuites(): TestSuite[] {
    return Array.from(this.suites.values());
  }

  /**
   * Get suite
   */
  getSuite(id: string): TestSuite | undefined {
    return this.suites.get(id);
  }

  /**
   * Delete suite
   */
  deleteSuite(id: string): void {
    this.suites.delete(id);
    this.saveToStorage();
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save to storage
   */
  private saveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const data = Array.from(this.suites.entries());
        localStorage.setItem('workflow-test-suites', JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save test suites:', error);
      }
    }
  }

  /**
   * Load from storage
   */
  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('workflow-test-suites');
        if (stored) {
          const data = JSON.parse(stored);
          this.suites = new Map(data);
        }
      } catch (error) {
        console.error('Failed to load test suites:', error);
      }
    }
  }
}

// Singleton instance
export const testRunner = new WorkflowTestRunner();

/**
 * Helper function to create test suite
 */
export function describe(name: string, workflowId: string, fn: (suite: TestSuite) => void): TestSuite {
  const suite = testRunner.createSuite(name, workflowId);
  fn(suite);
  return suite;
}

/**
 * Helper function to add test case
 */
export function it(
  suite: TestSuite,
  name: string,
  input: any,
  assertions: TestAssertion[]
): TestCase {
  return testRunner.addTestCase(suite.id, {
    name,
    input,
    assertions
  });
}

/**
 * Assertion builders
 */
export const expect = {
  equals: (path: string, expected: any): TestAssertion => ({
    type: 'equals',
    path,
    expected
  }),

  contains: (path: string, expected: any): TestAssertion => ({
    type: 'contains',
    path,
    expected
  }),

  matches: (path: string, pattern: string): TestAssertion => ({
    type: 'matches',
    path,
    expected: pattern
  }),

  greaterThan: (path: string, value: number): TestAssertion => ({
    type: 'greaterThan',
    path,
    expected: value
  }),

  lessThan: (path: string, value: number): TestAssertion => ({
    type: 'lessThan',
    path,
    expected: value
  }),

  exists: (path: string): TestAssertion => ({
    type: 'exists',
    path
  }),

  notExists: (path: string): TestAssertion => ({
    type: 'notExists',
    path
  }),

  custom: (path: string, matcher: (value: any) => boolean, message?: string): TestAssertion => ({
    type: 'custom',
    path,
    matcher,
    message
  })
};
