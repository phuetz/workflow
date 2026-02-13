/**
 * Test Validator
 * Handles assertion evaluation and validation logic
 */

import type { WorkflowExecution } from '../../types/workflowTypes';
import type { TestAssertion, TestExecutionContext } from '../../types/testing';

/**
 * TestValidator handles assertion evaluation
 */
export class TestValidator {
  /**
   * Run all assertions against execution results
   */
  async runAssertions(
    assertions: TestAssertion[],
    execution: WorkflowExecution,
    context: TestExecutionContext
  ): Promise<TestAssertion[]> {
    const results: TestAssertion[] = [];

    for (const assertion of assertions) {
      const result = await this.evaluateAssertion(assertion, execution, context);
      results.push(result);

      // Log assertion result
      context.logs.push({
        timestamp: new Date(),
        level: result.passed ? 'info' : 'error',
        message: `Assertion ${result.passed ? 'passed' : 'failed'}: ${assertion.description}`,
        data: {
          expected: assertion.expected,
          actual: result.actual,
          error: result.error
        }
      });
    }

    return results;
  }

  /**
   * Evaluate a single assertion
   */
  async evaluateAssertion(
    assertion: TestAssertion,
    execution: WorkflowExecution,
    context: TestExecutionContext
  ): Promise<TestAssertion> {
    try {
      let actual: unknown;
      let passed = false;

      // Get actual value based on assertion type
      actual = this.getActualValue(assertion, execution, context);

      // Evaluate based on operator
      passed = this.evaluateOperator(assertion.operator, actual, assertion.expected);

      return {
        ...assertion,
        actual,
        passed,
        executedAt: new Date()
      };

    } catch (error) {
      return {
        ...assertion,
        actual: undefined,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        executedAt: new Date()
      };
    }
  }

  /**
   * Get the actual value based on assertion type
   */
  private getActualValue(
    assertion: TestAssertion,
    execution: WorkflowExecution,
    context: TestExecutionContext
  ): unknown {
    switch (assertion.type) {
      case 'output':
        return this.getValueFromPath(execution.output as Record<string, unknown>, assertion.path || '');

      case 'node': {
        const nodeExecution = execution.nodeExecutions?.find(
          n => n.nodeId === assertion.nodeId
        );
        return nodeExecution
          ? this.getValueFromPath(nodeExecution.output as Record<string, unknown>, assertion.path || '')
          : undefined;
      }

      case 'variable':
        return context.variables[assertion.variableName || ''];

      case 'duration':
        return execution.duration;

      case 'status':
        return execution.status;

      default:
        return undefined;
    }
  }

  /**
   * Evaluate assertion operator
   */
  private evaluateOperator(operator: string, actual: unknown, expected: unknown): boolean {
    switch (operator) {
      case 'equals':
        return this.deepEqual(actual, expected);

      case 'not_equals':
        return !this.deepEqual(actual, expected);

      case 'contains':
        return String(actual).includes(String(expected));

      case 'greater_than':
        return Number(actual) > Number(expected);

      case 'less_than':
        return Number(actual) < Number(expected);

      case 'matches':
        return new RegExp(String(expected)).test(String(actual));

      case 'exists':
        return actual !== undefined && actual !== null;

      case 'not_exists':
        return actual === undefined || actual === null;

      case 'type':
        return typeof actual === expected;

      case 'length':
        return Array.isArray(actual)
          ? actual.length === Number(expected)
          : String(actual).length === Number(expected);

      default:
        return false;
    }
  }

  /**
   * Get value from object using dot notation path
   */
  getValueFromPath(obj: Record<string, unknown>, path: string): unknown {
    if (!path) return obj;

    return path.split('.').reduce((current, key) => {
      return (current as Record<string, unknown>)?.[key];
    }, obj as unknown);
  }

  /**
   * Deep equality comparison
   */
  deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      const keysA = Object.keys(a as Record<string, unknown>);
      const keysB = Object.keys(b as Record<string, unknown>);

      if (keysA.length !== keysB.length) return false;

      return keysA.every(key =>
        this.deepEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key]
        )
      );
    }

    return false;
  }
}

// Export singleton instance
export const testValidator = new TestValidator();
