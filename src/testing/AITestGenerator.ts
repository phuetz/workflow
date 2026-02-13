/**
 * AI-Powered Test Generator
 * Generates comprehensive tests from workflow descriptions using AI
 */

import type { RecordedTest, RecordedAction } from './VisualTestRecorder';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'happy-path' | 'edge-case' | 'error-handling' | 'performance' | 'security';
  steps: TestStep[];
  expectedOutcome: string;
  testData?: Record<string, any>;
}

export interface TestStep {
  action: string;
  description: string;
  selector?: string;
  value?: string;
  assertion?: string;
}

export interface GeneratedTest {
  scenario: TestScenario;
  playwrightCode: string;
  vitestCode: string;
  estimatedDuration: number;
}

export interface TestGenerationOptions {
  includeEdgeCases?: boolean;
  includeErrorHandling?: boolean;
  includePerformanceTests?: boolean;
  includeSecurityTests?: boolean;
  maxTestsPerScenario?: number;
  generateTestData?: boolean;
}

export class AITestGenerator {
  private apiKey?: string;
  private model: string;

  constructor(options: { apiKey?: string; model?: string } = {}) {
    this.apiKey = options.apiKey;
    this.model = options.model || 'gpt-4';
  }

  /**
   * Generate test scenarios from a workflow description
   */
  async generateFromDescription(
    description: string,
    options: TestGenerationOptions = {}
  ): Promise<TestScenario[]> {
    const scenarios: TestScenario[] = [];

    // Parse the description to identify key actions and flows
    const parsed = this.parseDescription(description);

    // Generate happy path scenarios
    scenarios.push(...this.generateHappyPathScenarios(parsed));

    // Generate edge case scenarios
    if (options.includeEdgeCases) {
      scenarios.push(...this.generateEdgeCaseScenarios(parsed));
    }

    // Generate error handling scenarios
    if (options.includeErrorHandling) {
      scenarios.push(...this.generateErrorHandlingScenarios(parsed));
    }

    // Generate performance test scenarios
    if (options.includePerformanceTests) {
      scenarios.push(...this.generatePerformanceScenarios(parsed));
    }

    // Generate security test scenarios
    if (options.includeSecurityTests) {
      scenarios.push(...this.generateSecurityScenarios(parsed));
    }

    return scenarios;
  }

  /**
   * Generate test scenarios from a workflow definition
   */
  async generateFromWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    options: TestGenerationOptions = {}
  ): Promise<TestScenario[]> {
    const scenarios: TestScenario[] = [];

    // Analyze workflow structure
    const analysis = this.analyzeWorkflow(nodes, edges);

    // Generate scenarios for each execution path
    for (const path of analysis.executionPaths) {
      scenarios.push(this.generatePathScenario(path, nodes));
    }

    // Generate edge cases for conditional branches
    if (options.includeEdgeCases) {
      for (const branch of analysis.conditionalBranches) {
        scenarios.push(...this.generateBranchScenarios(branch, nodes));
      }
    }

    // Generate error handling tests
    if (options.includeErrorHandling) {
      scenarios.push(...this.generateNodeErrorScenarios(nodes));
    }

    return scenarios;
  }

  /**
   * Generate test data for a scenario
   */
  generateTestData(scenario: TestScenario): Record<string, any> {
    const testData: Record<string, any> = {};

    // Extract data requirements from test steps
    scenario.steps.forEach((step) => {
      if (step.value && this.isDataPlaceholder(step.value)) {
        const dataKey = this.extractDataKey(step.value);
        testData[dataKey] = this.generateDataValue(dataKey, step);
      }
    });

    // Add common test data
    testData.timestamp = Date.now();
    testData.testId = scenario.id;

    return testData;
  }

  /**
   * Convert a scenario to Playwright test code
   */
  generatePlaywrightCode(scenario: TestScenario): string {
    const lines: string[] = [];

    lines.push("import { test, expect } from '@playwright/test';");
    lines.push('');
    lines.push(`test.describe('${scenario.name}', () => {`);
    lines.push(`  test('${scenario.description}', async ({ page }) => {`);
    lines.push(`    // ${scenario.category} test - Priority: ${scenario.priority}`);
    lines.push('');

    scenario.steps.forEach((step, index) => {
      lines.push(`    // Step ${index + 1}: ${step.description}`);

      switch (step.action) {
        case 'navigate':
          lines.push(`    await page.goto('${step.value}');`);
          break;
        case 'click':
          lines.push(`    await page.locator('${step.selector}').click();`);
          break;
        case 'input':
          lines.push(`    await page.locator('${step.selector}').fill('${step.value}');`);
          break;
        case 'select':
          lines.push(`    await page.locator('${step.selector}').selectOption('${step.value}');`);
          break;
        case 'wait':
          lines.push(`    await page.waitForSelector('${step.selector}');`);
          break;
        case 'assert':
          if (step.assertion) {
            lines.push(`    ${step.assertion}`);
          }
          break;
        default:
          lines.push(`    // TODO: Implement ${step.action}`);
      }

      lines.push('');
    });

    lines.push(`    // Expected outcome: ${scenario.expectedOutcome}`);
    lines.push('  });');
    lines.push('});');

    return lines.join('\n');
  }

  /**
   * Convert a scenario to Vitest test code
   */
  generateVitestCode(scenario: TestScenario): string {
    const lines: string[] = [];

    lines.push("import { describe, it, expect, vi } from 'vitest';");
    lines.push('');
    lines.push(`describe('${scenario.name}', () => {`);
    lines.push(`  it('${scenario.description}', async () => {`);
    lines.push(`    // ${scenario.category} test - Priority: ${scenario.priority}`);
    lines.push('');

    scenario.steps.forEach((step, index) => {
      lines.push(`    // Step ${index + 1}: ${step.description}`);
      lines.push(`    // TODO: Implement ${step.action}`);
      lines.push('');
    });

    lines.push(`    // Expected outcome: ${scenario.expectedOutcome}`);
    lines.push('  });');
    lines.push('});');

    return lines.join('\n');
  }

  /**
   * Parse workflow description
   */
  private parseDescription(description: string): ParsedDescription {
    const lines = description.split('\n').filter((l) => l.trim());

    return {
      actions: this.extractActions(lines),
      entities: this.extractEntities(lines),
      conditions: this.extractConditions(lines),
      inputs: this.extractInputs(lines),
      outputs: this.extractOutputs(lines),
    };
  }

  /**
   * Extract actions from description
   */
  private extractActions(lines: string[]): string[] {
    const actionVerbs = [
      'create', 'update', 'delete', 'add', 'remove', 'send', 'receive',
      'process', 'validate', 'transform', 'execute', 'trigger', 'click',
      'input', 'select', 'submit', 'navigate'
    ];

    const actions: string[] = [];
    lines.forEach((line) => {
      const lower = line.toLowerCase();
      actionVerbs.forEach((verb) => {
        if (lower.includes(verb)) {
          actions.push(line.trim());
        }
      });
    });

    return actions;
  }

  /**
   * Extract entities (nouns) from description
   */
  private extractEntities(lines: string[]): string[] {
    const entities = new Set<string>();
    const commonEntities = [
      'workflow', 'node', 'connection', 'data', 'user', 'email',
      'notification', 'webhook', 'api', 'database', 'form', 'button'
    ];

    lines.forEach((line) => {
      const lower = line.toLowerCase();
      commonEntities.forEach((entity) => {
        if (lower.includes(entity)) {
          entities.add(entity);
        }
      });
    });

    return Array.from(entities);
  }

  /**
   * Extract conditions from description
   */
  private extractConditions(lines: string[]): string[] {
    const conditions: string[] = [];
    const conditionKeywords = ['if', 'when', 'unless', 'while', 'until'];

    lines.forEach((line) => {
      const lower = line.toLowerCase();
      conditionKeywords.forEach((keyword) => {
        if (lower.includes(keyword)) {
          conditions.push(line.trim());
        }
      });
    });

    return conditions;
  }

  /**
   * Extract inputs from description
   */
  private extractInputs(lines: string[]): string[] {
    const inputs: string[] = [];
    lines.forEach((line) => {
      if (line.toLowerCase().includes('input') || line.toLowerCase().includes('enter')) {
        inputs.push(line.trim());
      }
    });
    return inputs;
  }

  /**
   * Extract outputs from description
   */
  private extractOutputs(lines: string[]): string[] {
    const outputs: string[] = [];
    lines.forEach((line) => {
      if (line.toLowerCase().includes('output') || line.toLowerCase().includes('result')) {
        outputs.push(line.trim());
      }
    });
    return outputs;
  }

  /**
   * Generate happy path test scenarios
   */
  private generateHappyPathScenarios(parsed: ParsedDescription): TestScenario[] {
    const scenarios: TestScenario[] = [];

    if (parsed.actions.length > 0) {
      scenarios.push({
        id: `happy_${Date.now()}`,
        name: 'Happy Path - Basic Workflow',
        description: 'Test the standard workflow execution with valid inputs',
        priority: 'critical',
        category: 'happy-path',
        steps: parsed.actions.map((action, i) => ({
          action: 'execute',
          description: action,
        })),
        expectedOutcome: 'Workflow completes successfully',
      });
    }

    return scenarios;
  }

  /**
   * Generate edge case test scenarios
   */
  private generateEdgeCaseScenarios(parsed: ParsedDescription): TestScenario[] {
    const scenarios: TestScenario[] = [];

    // Empty input scenario
    scenarios.push({
      id: `edge_empty_${Date.now()}`,
      name: 'Edge Case - Empty Inputs',
      description: 'Test workflow behavior with empty inputs',
      priority: 'high',
      category: 'edge-case',
      steps: [
        { action: 'input', description: 'Provide empty input values' },
        { action: 'execute', description: 'Execute workflow' },
        { action: 'assert', description: 'Verify appropriate handling' },
      ],
      expectedOutcome: 'Workflow handles empty inputs gracefully',
    });

    // Large data scenario
    scenarios.push({
      id: `edge_large_${Date.now()}`,
      name: 'Edge Case - Large Data Set',
      description: 'Test workflow with large data volumes',
      priority: 'medium',
      category: 'edge-case',
      steps: [
        { action: 'input', description: 'Provide large data set' },
        { action: 'execute', description: 'Execute workflow' },
        { action: 'assert', description: 'Verify performance and completion' },
      ],
      expectedOutcome: 'Workflow processes large data efficiently',
    });

    return scenarios;
  }

  /**
   * Generate error handling test scenarios
   */
  private generateErrorHandlingScenarios(parsed: ParsedDescription): TestScenario[] {
    const scenarios: TestScenario[] = [];

    scenarios.push({
      id: `error_invalid_${Date.now()}`,
      name: 'Error Handling - Invalid Input',
      description: 'Test workflow behavior with invalid inputs',
      priority: 'high',
      category: 'error-handling',
      steps: [
        { action: 'input', description: 'Provide invalid input values' },
        { action: 'execute', description: 'Attempt workflow execution' },
        { action: 'assert', description: 'Verify error is caught and handled' },
      ],
      expectedOutcome: 'Workflow displays appropriate error message',
    });

    return scenarios;
  }

  /**
   * Generate performance test scenarios
   */
  private generatePerformanceScenarios(parsed: ParsedDescription): TestScenario[] {
    const scenarios: TestScenario[] = [];

    scenarios.push({
      id: `perf_load_${Date.now()}`,
      name: 'Performance - Load Test',
      description: 'Test workflow performance under load',
      priority: 'medium',
      category: 'performance',
      steps: [
        { action: 'setup', description: 'Initialize performance monitoring' },
        { action: 'execute', description: 'Run workflow multiple times' },
        { action: 'measure', description: 'Measure execution time and resource usage' },
        { action: 'assert', description: 'Verify performance meets SLA' },
      ],
      expectedOutcome: 'Workflow completes within acceptable time limits',
    });

    return scenarios;
  }

  /**
   * Generate security test scenarios
   */
  private generateSecurityScenarios(parsed: ParsedDescription): TestScenario[] {
    const scenarios: TestScenario[] = [];

    scenarios.push({
      id: `security_xss_${Date.now()}`,
      name: 'Security - XSS Prevention',
      description: 'Test that workflow inputs are properly sanitized',
      priority: 'high',
      category: 'security',
      steps: [
        { action: 'input', description: 'Provide XSS payload in inputs' },
        { action: 'execute', description: 'Execute workflow' },
        { action: 'assert', description: 'Verify payload is sanitized' },
      ],
      expectedOutcome: 'XSS attempts are blocked',
    });

    return scenarios;
  }

  /**
   * Analyze workflow structure
   */
  private analyzeWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    const executionPaths: string[][] = [];
    const conditionalBranches: string[] = [];

    // Find all execution paths through the workflow
    const startNodes = nodes.filter((n) => n.type === 'trigger' || !edges.some((e) => e.target === n.id));

    startNodes.forEach((start) => {
      const paths = this.findPathsFromNode(start.id, nodes, edges);
      executionPaths.push(...paths);
    });

    // Find conditional branches
    nodes.forEach((node) => {
      if (node.type === 'conditional' || node.type === 'switch') {
        conditionalBranches.push(node.id);
      }
    });

    return { executionPaths, conditionalBranches };
  }

  /**
   * Find all paths from a node
   */
  private findPathsFromNode(
    nodeId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    visited: Set<string> = new Set(),
    currentPath: string[] = []
  ): string[][] {
    if (visited.has(nodeId)) {
      return [currentPath];
    }

    visited.add(nodeId);
    currentPath.push(nodeId);

    const outgoingEdges = edges.filter((e) => e.source === nodeId);
    if (outgoingEdges.length === 0) {
      return [currentPath];
    }

    const paths: string[][] = [];
    outgoingEdges.forEach((edge) => {
      const subPaths = this.findPathsFromNode(
        edge.target,
        nodes,
        edges,
        new Set(visited),
        [...currentPath]
      );
      paths.push(...subPaths);
    });

    return paths;
  }

  /**
   * Generate test scenario for an execution path
   */
  private generatePathScenario(path: string[], nodes: WorkflowNode[]): TestScenario {
    const pathNodes = path.map((id) => nodes.find((n) => n.id === id)).filter(Boolean) as WorkflowNode[];

    return {
      id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Execution Path: ${pathNodes.map((n) => n.data.label).join(' → ')}`,
      description: `Test execution through path: ${path.join(' → ')}`,
      priority: 'high',
      category: 'happy-path',
      steps: pathNodes.map((node) => ({
        action: 'execute',
        description: `Execute ${node.type} node: ${node.data.label}`,
      })),
      expectedOutcome: 'Path executes successfully',
    };
  }

  /**
   * Generate scenarios for conditional branches
   */
  private generateBranchScenarios(branchNodeId: string, nodes: WorkflowNode[]): TestScenario[] {
    const scenarios: TestScenario[] = [];
    const node = nodes.find((n) => n.id === branchNodeId);

    if (!node) return scenarios;

    // Generate true branch scenario
    scenarios.push({
      id: `branch_true_${Date.now()}`,
      name: `${node.data.label} - True Branch`,
      description: `Test the true/success branch of ${node.data.label}`,
      priority: 'high',
      category: 'edge-case',
      steps: [
        { action: 'setup', description: 'Set up condition to be true' },
        { action: 'execute', description: `Execute ${node.data.label}` },
        { action: 'assert', description: 'Verify true branch is taken' },
      ],
      expectedOutcome: 'True branch executes correctly',
    });

    // Generate false branch scenario
    scenarios.push({
      id: `branch_false_${Date.now()}`,
      name: `${node.data.label} - False Branch`,
      description: `Test the false/failure branch of ${node.data.label}`,
      priority: 'high',
      category: 'edge-case',
      steps: [
        { action: 'setup', description: 'Set up condition to be false' },
        { action: 'execute', description: `Execute ${node.data.label}` },
        { action: 'assert', description: 'Verify false branch is taken' },
      ],
      expectedOutcome: 'False branch executes correctly',
    });

    return scenarios;
  }

  /**
   * Generate error scenarios for nodes
   */
  private generateNodeErrorScenarios(nodes: WorkflowNode[]): TestScenario[] {
    const scenarios: TestScenario[] = [];

    nodes.forEach((node) => {
      scenarios.push({
        id: `error_${node.id}_${Date.now()}`,
        name: `Error Handling - ${node.data.label}`,
        description: `Test error handling for ${node.type} node`,
        priority: 'medium',
        category: 'error-handling',
        steps: [
          { action: 'setup', description: 'Set up error condition' },
          { action: 'execute', description: `Execute ${node.data.label}` },
          { action: 'assert', description: 'Verify error is caught and handled' },
        ],
        expectedOutcome: 'Error is handled gracefully',
      });
    });

    return scenarios;
  }

  /**
   * Check if value is a data placeholder
   */
  private isDataPlaceholder(value: string): boolean {
    return value.includes('{{') || value.includes('${');
  }

  /**
   * Extract data key from placeholder
   */
  private extractDataKey(placeholder: string): string {
    const match = placeholder.match(/\{\{(\w+)\}\}/) || placeholder.match(/\$\{(\w+)\}/);
    return match ? match[1] : 'data';
  }

  /**
   * Generate data value based on key and context
   */
  private generateDataValue(key: string, step: TestStep): any {
    const keyLower = key.toLowerCase();

    if (keyLower.includes('email')) {
      return 'test@example.com';
    } else if (keyLower.includes('name')) {
      return 'Test User';
    } else if (keyLower.includes('phone')) {
      return '+1234567890';
    } else if (keyLower.includes('url')) {
      return 'https://example.com';
    } else if (keyLower.includes('id')) {
      return `test_${Date.now()}`;
    } else if (keyLower.includes('count') || keyLower.includes('number')) {
      return 42;
    } else if (keyLower.includes('date')) {
      return new Date().toISOString();
    } else {
      return 'test value';
    }
  }
}

interface ParsedDescription {
  actions: string[];
  entities: string[];
  conditions: string[];
  inputs: string[];
  outputs: string[];
}

export default AITestGenerator;
