/**
 * Node Tester
 * Interactive testing for custom nodes
 */

import {
  NodeTestConfig,
  NodeTestCase,
  NodeTestResult,
  TestCaseResult,
  AssertionResult,
  TestAssertion,
  NodeBuilderConfig,
} from '../types/nodebuilder';

export class NodeTester {
  private config: NodeBuilderConfig;
  private testConfig: NodeTestConfig;

  constructor(config: NodeBuilderConfig, testConfig?: NodeTestConfig) {
    this.config = config;
    this.testConfig = testConfig || this.createDefaultTestConfig();
  }

  /**
   * Create default test configuration
   */
  private createDefaultTestConfig(): NodeTestConfig {
    return {
      nodeId: this.config.id,
      testCases: [],
      timeout: 30000, // 30 seconds
    };
  }

  /**
   * Run all tests
   */
  async runTests(): Promise<NodeTestResult> {
    const startTime = Date.now();
    const results: TestCaseResult[] = [];

    let passed = 0;
    let failed = 0;
    const skipped = 0;

    for (const testCase of this.testConfig.testCases) {
      try {
        const result = await this.runTestCase(testCase);
        results.push(result);

        if (result.passed) {
          passed++;
        } else {
          failed++;
        }
      } catch (error: any) {
        results.push({
          testCaseId: testCase.id,
          passed: false,
          duration: 0,
          error: error.message,
          assertions: [],
        });
        failed++;
      }
    }

    const duration = Date.now() - startTime;

    return {
      success: failed === 0,
      totalTests: this.testConfig.testCases.length,
      passed,
      failed,
      skipped,
      results,
      duration,
    };
  }

  /**
   * Run a single test case
   */
  async runTestCase(testCase: NodeTestCase): Promise<TestCaseResult> {
    const startTime = Date.now();

    try {
      // Execute the operation
      const output = await this.executeOperation(testCase.operation, testCase.input);

      // Run assertions
      const assertionResults = await this.runAssertions(testCase.assertions, output);

      const passed = assertionResults.every((a) => a.passed);
      const duration = Date.now() - startTime;

      return {
        testCaseId: testCase.id,
        passed,
        duration,
        output,
        assertions: assertionResults,
      };
    } catch (error: any) {
      return {
        testCaseId: testCase.id,
        passed: false,
        duration: Date.now() - startTime,
        error: error.message,
        assertions: [],
      };
    }
  }

  /**
   * Execute an operation (mock implementation)
   */
  private async executeOperation(operation: string, input: Record<string, unknown>): Promise<any> {
    // In a real implementation, this would actually execute the node operation
    // For now, return mock data
    return {
      success: true,
      data: input,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Run assertions on output
   */
  private async runAssertions(
    assertions: TestAssertion[],
    output: any
  ): Promise<AssertionResult[]> {
    return assertions.map((assertion) => this.runAssertion(assertion, output));
  }

  /**
   * Run a single assertion
   */
  private runAssertion(assertion: TestAssertion, output: any): AssertionResult {
    try {
      const actual = this.getValueAtPath(output, assertion.path);

      switch (assertion.type) {
        case 'equals':
          return {
            passed: actual === assertion.expected,
            message: assertion.message,
            expected: assertion.expected,
            actual,
          };

        case 'contains':
          const contains =
            typeof actual === 'string'
              ? actual.includes(assertion.expected as string)
              : Array.isArray(actual)
              ? actual.includes(assertion.expected)
              : false;

          return {
            passed: contains,
            message: assertion.message,
            expected: assertion.expected,
            actual,
          };

        case 'matches':
          const regex = new RegExp(assertion.expected as string);
          return {
            passed: regex.test(actual?.toString() || ''),
            message: assertion.message,
            expected: assertion.expected,
            actual,
          };

        case 'exists':
          return {
            passed: actual !== undefined && actual !== null,
            message: assertion.message,
            expected: 'value to exist',
            actual,
          };

        case 'type':
          const actualType = Array.isArray(actual)
            ? 'array'
            : actual === null
            ? 'null'
            : typeof actual;

          return {
            passed: actualType === assertion.expected,
            message: assertion.message,
            expected: assertion.expected,
            actual: actualType,
          };

        case 'custom':
          // For custom assertions, we would evaluate a custom function
          return {
            passed: true,
            message: assertion.message,
          };

        default:
          return {
            passed: false,
            message: `Unknown assertion type: ${assertion.type}`,
          };
      }
    } catch (error: any) {
      return {
        passed: false,
        message: `Assertion failed: ${error.message}`,
      };
    }
  }

  /**
   * Get value at path in object
   */
  private getValueAtPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }

      // Handle array indices
      const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        current = current[key]?.[parseInt(index)];
      } else {
        current = current[part];
      }
    }

    return current;
  }

  /**
   * Add test case
   */
  addTestCase(testCase: NodeTestCase): void {
    this.testConfig.testCases.push(testCase);
  }

  /**
   * Remove test case
   */
  removeTestCase(testCaseId: string): void {
    this.testConfig.testCases = this.testConfig.testCases.filter(
      (tc) => tc.id !== testCaseId
    );
  }

  /**
   * Generate test cases from operations
   */
  generateTestCasesFromOperations(): NodeTestCase[] {
    const testCases: NodeTestCase[] = [];

    this.config.operations?.forEach((operation, index) => {
      // Generate basic test case for each operation
      const testInput: Record<string, unknown> = {};

      // Populate with default values
      operation.parameters.forEach((param) => {
        if (param.default !== undefined) {
          testInput[param.name] = param.default;
        } else {
          testInput[param.name] = this.getDefaultValueForType(param.type);
        }
      });

      testCases.push({
        id: `test_${operation.id}_${index}`,
        name: `Test ${operation.displayName}`,
        description: `Test case for ${operation.description}`,
        operation: operation.name,
        input: testInput,
        assertions: [
          {
            type: 'exists',
            path: 'success',
            message: 'Response should have success field',
          },
          {
            type: 'equals',
            path: 'success',
            expected: true,
            message: 'Operation should succeed',
          },
        ],
      });
    });

    return testCases;
  }

  /**
   * Get default value for field type
   */
  private getDefaultValueForType(type: string): unknown {
    switch (type) {
      case 'string':
      case 'password':
      case 'url':
      case 'email':
        return 'test';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'json':
        return {};
      case 'multi_select':
        return [];
      default:
        return '';
    }
  }

  /**
   * Export test configuration
   */
  exportTestConfig(): string {
    return JSON.stringify(this.testConfig, null, 2);
  }

  /**
   * Import test configuration
   */
  importTestConfig(config: string): void {
    try {
      this.testConfig = JSON.parse(config);
    } catch (error) {
      throw new Error(`Failed to import test configuration: ${error}`);
    }
  }

  /**
   * Get test coverage
   */
  getTestCoverage(): {
    operationsCovered: number;
    totalOperations: number;
    percentage: number;
  } {
    const totalOperations = this.config.operations?.length || 0;
    const testedOperations = new Set(
      this.testConfig.testCases.map((tc) => tc.operation)
    ).size;

    return {
      operationsCovered: testedOperations,
      totalOperations,
      percentage: totalOperations > 0 ? (testedOperations / totalOperations) * 100 : 0,
    };
  }

  /**
   * Generate test report
   */
  async generateTestReport(results: NodeTestResult): Promise<string> {
    const coverage = this.getTestCoverage();

    const report = `
# Node Test Report

## Summary
- **Total Tests**: ${results.totalTests}
- **Passed**: ${results.passed} ✓
- **Failed**: ${results.failed} ✗
- **Skipped**: ${results.skipped}
- **Duration**: ${results.duration}ms
- **Success Rate**: ${results.totalTests > 0 ? ((results.passed / results.totalTests) * 100).toFixed(2) : 0}%

## Coverage
- **Operations Covered**: ${coverage.operationsCovered}/${coverage.totalOperations}
- **Coverage Percentage**: ${coverage.percentage.toFixed(2)}%

## Test Results

${results.results
  .map(
    (result) => `
### ${this.getTestCaseName(result.testCaseId)} ${result.passed ? '✓' : '✗'}
- **Duration**: ${result.duration}ms
- **Status**: ${result.passed ? 'PASSED' : 'FAILED'}
${result.error ? `- **Error**: ${result.error}` : ''}

**Assertions**:
${result.assertions.map((a) => `- ${a.passed ? '✓' : '✗'} ${a.message}`).join('\n')}
`
  )
  .join('\n')}

---
*Generated on ${new Date().toISOString()}*
`;

    return report;
  }

  /**
   * Get test case name by ID
   */
  private getTestCaseName(testCaseId: string): string {
    const testCase = this.testConfig.testCases.find((tc) => tc.id === testCaseId);
    return testCase?.name || testCaseId;
  }
}
