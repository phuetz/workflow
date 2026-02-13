/**
 * TestingUtils - Utilities for testing custom nodes
 */

import { NodeBase, ExecutionContext } from './NodeBase';
import {
  INodeExecutionData,
  IDataObject,
  ICredentialDataDecryptedObject,
  INodeTypeDescription,
} from './NodeInterface';

export interface INodeTestData {
  description: string;
  input: {
    main: INodeExecutionData[][];
  };
  output: {
    main: INodeExecutionData[][];
  };
  credentials?: Record<string, ICredentialDataDecryptedObject>;
  parameters?: Record<string, any>;
}

export interface INodeTestResult {
  success: boolean;
  description: string;
  actualOutput?: INodeExecutionData[][];
  expectedOutput?: INodeExecutionData[][];
  error?: string;
  duration?: number;
}

/**
 * Testing utilities for custom nodes
 */
export class TestingUtils {
  /**
   * Create a test execution context
   */
  static createTestContext(config: {
    inputData?: INodeExecutionData[][];
    nodeParameters?: Record<string, any>;
    credentials?: Record<string, ICredentialDataDecryptedObject>;
    workflowMetadata?: any;
  }): ExecutionContext {
    return new ExecutionContext({
      inputData: config.inputData || [[]],
      nodeParameters: config.nodeParameters || {},
      credentials: config.credentials,
      workflowMetadata: config.workflowMetadata,
    });
  }

  /**
   * Create test input data from JSON objects
   */
  static createInputData(data: IDataObject[]): INodeExecutionData[][] {
    return [data.map(item => ({ json: item }))];
  }

  /**
   * Execute a node with test data
   */
  static async executeNode(
    node: NodeBase,
    testData: INodeTestData
  ): Promise<INodeTestResult> {
    const startTime = Date.now();

    try {
      // Create execution context
      const context = this.createTestContext({
        inputData: testData.input.main,
        nodeParameters: testData.parameters || {},
        credentials: testData.credentials,
      });

      // Execute node
      const output = await node.execute.call(context);

      // Compare output with expected
      const success = this.compareOutputs(output, testData.output.main);

      return {
        success,
        description: testData.description,
        actualOutput: output,
        expectedOutput: testData.output.main,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        description: testData.description,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Run multiple test cases for a node
   */
  static async runTests(
    node: NodeBase,
    testCases: INodeTestData[]
  ): Promise<INodeTestResult[]> {
    const results: INodeTestResult[] = [];

    for (const testCase of testCases) {
      const result = await this.executeNode(node, testCase);
      results.push(result);
    }

    return results;
  }

  /**
   * Compare actual output with expected output
   */
  static compareOutputs(
    actual: INodeExecutionData[][],
    expected: INodeExecutionData[][]
  ): boolean {
    if (actual.length !== expected.length) {
      return false;
    }

    for (let i = 0; i < actual.length; i++) {
      if (actual[i].length !== expected[i].length) {
        return false;
      }

      for (let j = 0; j < actual[i].length; j++) {
        if (!this.deepEqual(actual[i][j].json, expected[i][j].json)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Deep equality check
   */
  static deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
      return false;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      if (!keys2.includes(key)) {
        return false;
      }

      if (!this.deepEqual(obj1[key], obj2[key])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate test report
   */
  static generateTestReport(results: INodeTestResult[]): string {
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;

    let report = `\n${'='.repeat(60)}\n`;
    report += `NODE TEST REPORT\n`;
    report += `${'='.repeat(60)}\n\n`;
    report += `Total Tests: ${total}\n`;
    report += `Passed: ${passed} ✓\n`;
    report += `Failed: ${failed} ✗\n`;
    report += `Success Rate: ${((passed / total) * 100).toFixed(2)}%\n\n`;

    if (failed > 0) {
      report += `${'='.repeat(60)}\n`;
      report += `FAILED TESTS\n`;
      report += `${'='.repeat(60)}\n\n`;

      results
        .filter(r => !r.success)
        .forEach((result, index) => {
          report += `${index + 1}. ${result.description}\n`;
          if (result.error) {
            report += `   Error: ${result.error}\n`;
          } else {
            report += `   Output mismatch\n`;
            report += `   Expected: ${JSON.stringify(result.expectedOutput, null, 2)}\n`;
            report += `   Actual: ${JSON.stringify(result.actualOutput, null, 2)}\n`;
          }
          report += `   Duration: ${result.duration}ms\n\n`;
        });
    }

    report += `${'='.repeat(60)}\n`;
    return report;
  }

  /**
   * Create a mock HTTP request function for testing
   */
  static createMockRequest(responses: Map<string, any>): (options: any) => Promise<any> {
    return async (options: any) => {
      const key = `${options.method || 'GET'}:${options.url}`;
      const response = responses.get(key);

      if (!response) {
        throw new Error(`No mock response configured for ${key}`);
      }

      return response;
    };
  }

  /**
   * Create mock credentials
   */
  static createMockCredentials(type: string, data: IDataObject): ICredentialDataDecryptedObject {
    return {
      type,
      ...data,
    };
  }

  /**
   * Validate node description
   */
  static validateNodeDescription(description: INodeTypeDescription): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!description.displayName) {
      errors.push('displayName is required');
    }
    if (!description.name) {
      errors.push('name is required');
    }
    if (!description.group || description.group.length === 0) {
      errors.push('group is required and must not be empty');
    }
    if (description.version === undefined) {
      errors.push('version is required');
    }
    if (!description.description) {
      errors.push('description is required');
    }
    if (!description.defaults) {
      errors.push('defaults is required');
    }
    if (!description.inputs) {
      errors.push('inputs is required');
    }
    if (!description.outputs) {
      errors.push('outputs is required');
    }
    if (!description.properties) {
      errors.push('properties is required');
    }

    // Validate properties
    if (description.properties) {
      description.properties.forEach((prop, index) => {
        if (!prop.displayName) {
          errors.push(`Property ${index}: displayName is required`);
        }
        if (!prop.name) {
          errors.push(`Property ${index}: name is required`);
        }
        if (!prop.type) {
          errors.push(`Property ${index}: type is required`);
        }
        if (prop.default === undefined) {
          errors.push(`Property ${index}: default is required`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Benchmark node execution
   */
  static async benchmarkNode(
    node: NodeBase,
    inputData: INodeExecutionData[][],
    parameters: Record<string, any>,
    iterations = 100
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
    iterations: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const context = this.createTestContext({
        inputData,
        nodeParameters: parameters,
      });

      const startTime = Date.now();
      await node.execute.call(context);
      const duration = Date.now() - startTime;
      times.push(duration);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      averageTime,
      minTime,
      maxTime,
      totalTime,
      iterations,
    };
  }

  /**
   * Test node with error handling
   */
  static async testErrorHandling(
    node: NodeBase,
    testData: INodeTestData,
    expectedError?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const context = this.createTestContext({
        inputData: testData.input.main,
        nodeParameters: testData.parameters || {},
        credentials: testData.credentials,
      });

      await node.execute.call(context);

      // If we expected an error but didn't get one
      if (expectedError) {
        return {
          success: false,
          error: 'Expected an error but execution succeeded',
        };
      }

      return { success: true };
    } catch (error: any) {
      // If we expected an error and got one
      if (expectedError) {
        if (error.message.includes(expectedError)) {
          return { success: true };
        } else {
          return {
            success: false,
            error: `Expected error containing "${expectedError}", got "${error.message}"`,
          };
        }
      }

      // If we didn't expect an error
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create snapshot test
   */
  static createSnapshot(output: INodeExecutionData[][]): string {
    return JSON.stringify(output, null, 2);
  }

  /**
   * Compare snapshot
   */
  static compareSnapshot(actual: INodeExecutionData[][], snapshot: string): boolean {
    const actualSnapshot = this.createSnapshot(actual);
    return actualSnapshot === snapshot;
  }

  /**
   * Mock workflow metadata
   */
  static createMockWorkflow(config?: Partial<any>): any {
    return {
      id: config?.id || 'test-workflow',
      name: config?.name || 'Test Workflow',
      active: config?.active ?? true,
      ...config,
    };
  }
}

/**
 * Node test builder for fluent API
 */
export class NodeTestBuilder {
  private testData: Partial<INodeTestData> = {
    input: { main: [[]] },
    output: { main: [[]] },
  };

  withDescription(description: string): this {
    this.testData.description = description;
    return this;
  }

  withInput(data: IDataObject[]): this {
    this.testData.input = {
      main: [data.map(item => ({ json: item }))],
    };
    return this;
  }

  withOutput(data: IDataObject[]): this {
    this.testData.output = {
      main: [data.map(item => ({ json: item }))],
    };
    return this;
  }

  withParameters(parameters: Record<string, any>): this {
    this.testData.parameters = parameters;
    return this;
  }

  withCredentials(type: string, data: IDataObject): this {
    this.testData.credentials = {
      [type]: data,
    };
    return this;
  }

  build(): INodeTestData {
    if (!this.testData.description) {
      throw new Error('Test description is required');
    }

    return this.testData as INodeTestData;
  }
}

/**
 * Helper to create test data
 */
export function test(description: string): NodeTestBuilder {
  return new NodeTestBuilder().withDescription(description);
}
