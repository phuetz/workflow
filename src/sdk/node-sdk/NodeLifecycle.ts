/**
 * Node Lifecycle
 * Handles testing, debugging, packaging, and publishing of nodes
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../services/SimpleLogger';
import {
  INodeType,
  INodeExecutionData,
  IExecuteFunctions,
  NodeDebugInfo,
  NodeOperationError,
  NodeTestSuite,
  TestResults,
  SuiteResult,
  TestCaseResult,
  TestSetup,
  TestTeardown,
  NodeTestCase,
  PublishOptions,
  MarketplaceMetadata,
  PackageOptions
} from './types';
import { NodeGenerator } from './NodeBuilder';

/**
 * TestRunner executes test suites for nodes
 */
export class TestRunner {
  constructor(private node: INodeType) {}

  /**
   * Run multiple test suites
   */
  async runSuites(suites: NodeTestSuite[]): Promise<TestResults> {
    const results: TestResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: []
    };

    for (const suite of suites) {
      const suiteResult = await this.runSuite(suite);
      results.suites.push(suiteResult);
      results.total += suiteResult.total;
      results.passed += suiteResult.passed;
      results.failed += suiteResult.failed;
      results.skipped += suiteResult.skipped;
    }

    return results;
  }

  /**
   * Run a single test suite
   */
  private async runSuite(suite: NodeTestSuite): Promise<SuiteResult> {
    const result: SuiteResult = {
      name: suite.name,
      total: suite.testCases.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      testCases: []
    };

    // Run setup
    if (suite.setup) {
      await this.runSetup(suite.setup);
    }

    // Run test cases
    for (const testCase of suite.testCases) {
      if (testCase.skip) {
        result.skipped++;
        continue;
      }

      const caseResult = await this.runTestCase(testCase);
      result.testCases.push(caseResult);

      if (caseResult.passed) {
        result.passed++;
      } else {
        result.failed++;
      }
    }

    // Run teardown
    if (suite.teardown) {
      await this.runTeardown(suite.teardown);
    }

    return result;
  }

  /**
   * Run a single test case
   */
  private async runTestCase(testCase: NodeTestCase): Promise<TestCaseResult> {
    try {
      const context = this.createMockContext(testCase);
      const output = await this.node.execute!.call(context);

      if (testCase.expectedOutput) {
        const passed = this.compareOutput(output, testCase.expectedOutput);
        return {
          name: testCase.name,
          passed,
          error: passed ? undefined : 'Output mismatch'
        };
      }

      return { name: testCase.name, passed: true };
    } catch (error) {
      return {
        name: testCase.name,
        passed: false,
        error: (error as Error).message
      };
    }
  }

  private createMockContext(testCase: NodeTestCase): IExecuteFunctions {
    return {
      getInputData: () => testCase.input[0] || [],
      getNodeParameter: (name: string) => testCase.parameters[name],
      getWorkflowStaticData: () => ({}),
      getCredentials: async () => testCase.credentials || {},
      getRestApiUrl: () => 'https://api.example.com',
      getTimezone: () => 'UTC',
      getWorkflow: () => ({ id: 'test', name: 'Test', active: true }),
      getExecutionId: () => 'test-execution',
      getMode: () => 'manual',
      continueOnFail: () => false,
      helpers: {} as any
    };
  }

  private compareOutput(actual: any, expected: any): boolean {
    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  private async runSetup(setup: TestSetup): Promise<void> {
    if (setup.commands) {
      for (const _command of setup.commands) {
        // Execute command - placeholder for actual implementation
      }
    }
  }

  private async runTeardown(teardown: TestTeardown): Promise<void> {
    if (teardown.commands) {
      for (const _command of teardown.commands) {
        // Execute command - placeholder for actual implementation
      }
    }
  }
}

/**
 * NodeDebugger provides debugging capabilities for nodes
 */
export class NodeDebugger {
  /**
   * Debug a node execution
   */
  async debug(
    node: INodeType,
    input: INodeExecutionData[][],
    parameters: Record<string, any>
  ): Promise<NodeDebugInfo> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    const errors: NodeOperationError[] = [];
    const warnings: string[] = [];
    const logs: string[] = [];

    try {
      const context = this.createDebugContext(input, parameters, logs, warnings);
      const output = await node.execute!.call(context);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;

      return {
        executionTime: endTime - startTime,
        memoryUsage: endMemory - startMemory,
        inputSize: JSON.stringify(input).length,
        outputSize: JSON.stringify(output).length,
        errors,
        warnings,
        logs
      };
    } catch (error) {
      errors.push(error as NodeOperationError);

      return {
        executionTime: Date.now() - startTime,
        memoryUsage: 0,
        inputSize: JSON.stringify(input).length,
        outputSize: 0,
        errors,
        warnings,
        logs
      };
    }
  }

  private createDebugContext(
    input: INodeExecutionData[][],
    parameters: Record<string, any>,
    logs: string[],
    _warnings: string[]
  ): IExecuteFunctions {
    return {
      getInputData: () => input[0] || [],
      getNodeParameter: (name: string) => parameters[name],
      getWorkflowStaticData: () => ({}),
      getCredentials: async () => ({}),
      getRestApiUrl: () => 'https://api.example.com',
      getTimezone: () => 'UTC',
      getWorkflow: () => ({ id: 'debug', name: 'Debug', active: false }),
      getExecutionId: () => 'debug-execution',
      getMode: () => 'manual',
      continueOnFail: () => false,
      helpers: {
        httpRequest: async (options: any) => {
          logs.push(`HTTP Request: ${options.method} ${options.url}`);
          return {};
        }
      } as any
    };
  }
}

/**
 * NodePackager handles packaging nodes for distribution
 */
export class NodePackager {
  /**
   * Package a node for distribution
   */
  async package(
    node: INodeType,
    outputDir: string,
    _options?: PackageOptions
  ): Promise<string> {
    const packageName = `n8n-nodes-${node.description.name.toLowerCase()}`;
    const packagePath = path.join(outputDir, packageName);

    // Create directories
    fs.mkdirSync(packagePath, { recursive: true });
    fs.mkdirSync(path.join(packagePath, 'src'), { recursive: true });
    fs.mkdirSync(path.join(packagePath, 'dist'), { recursive: true });

    // Generate files
    const generator = new NodeGenerator();
    const files = generator.generateFiles(node.description);

    // Write files
    for (const [filePath, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(packagePath, filePath), content);
    }

    return packagePath;
  }

  /**
   * Build a packaged node
   */
  async build(packagePath: string): Promise<void> {
    logger.debug(`Building package at ${packagePath}`);
    // This would execute actual build in production
  }
}

/**
 * NodePublisher handles publishing nodes
 */
export class NodePublisher {
  /**
   * Publish a node to npm
   */
  async publish(node: INodeType, options?: PublishOptions): Promise<void> {
    logger.debug(`Publishing node ${node.description.name}`);

    if (options?.dryRun) {
      logger.debug('Dry run - not actually publishing');
      return;
    }

    // Would execute actual npm publish in production
  }
}

/**
 * MarketplaceClient handles marketplace interactions
 */
export class MarketplaceClient {
  /**
   * Publish a node to the marketplace
   */
  async publish(node: INodeType, _metadata: MarketplaceMetadata): Promise<void> {
    logger.debug(`Publishing ${node.description.name} to marketplace`);
  }
}

/**
 * DocumentationGenerator creates documentation for nodes
 */
export class DocumentationGenerator {
  /**
   * Generate markdown documentation for a node
   */
  generate(node: INodeType): string {
    const def = node.description;

    let doc = `# ${def.displayName}\n\n`;
    doc += `${def.description}\n\n`;

    doc += `## Properties\n\n`;
    for (const prop of def.properties) {
      doc += `### ${prop.displayName}\n`;
      doc += `- **Name**: ${prop.name}\n`;
      doc += `- **Type**: ${prop.type}\n`;
      if (prop.description) {
        doc += `- **Description**: ${prop.description}\n`;
      }
      doc += '\n';
    }

    if (def.credentials) {
      doc += `## Credentials\n\n`;
      for (const cred of def.credentials) {
        doc += `- ${cred.displayName} (${cred.type})\n`;
      }
      doc += '\n';
    }

    return doc;
  }
}

export default TestRunner;
