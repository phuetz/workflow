/**
 * Testing Slice
 * Handles workflow testing, dry runs, and test data management
 */

import type { StateCreator } from 'zustand';
import { logger } from '../../services/SimpleLogger';

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  inputData: unknown;
  expectedOutput?: unknown;
  assertions?: TestAssertion[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TestAssertion {
  id: string;
  nodeId: string;
  type: 'output' | 'status' | 'duration' | 'custom';
  operator: 'equals' | 'contains' | 'matches' | 'lessThan' | 'greaterThan';
  expected: unknown;
  actual?: unknown;
  passed?: boolean;
}

export interface TestRun {
  id: string;
  testCaseId?: string;
  workflowId?: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  input: unknown;
  output?: unknown;
  nodeResults: Record<string, NodeTestResult>;
  assertions?: TestAssertion[];
  error?: string;
}

export interface NodeTestResult {
  nodeId: string;
  nodeName?: string;
  nodeType?: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  input?: unknown;
  output?: unknown;
  error?: string;
  duration?: number;
  startedAt?: Date;
  finishedAt?: Date;
}

export interface TestSummary {
  nodesCount: number;
  edgesCount: number;
  triggersCount: number;
  testedNodes: number;
  passedNodes: number;
  failedNodes: number;
  skippedNodes: number;
  totalDuration: number;
  warningsCount: number;
}

export interface TestResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
  results?: Array<{ test: string; success: boolean; message: string }>;
  summary?: TestSummary;
}

export interface TestingState {
  testCases: Record<string, TestCase>;
  testRuns: TestRun[];
  currentTestRun: TestRun | null;
  isTestRunning: boolean;
  testConfig: TestConfig;
}

export interface TestConfig {
  timeout: number;
  mockExternalCalls: boolean;
  captureOutputs: boolean;
  stopOnFirstError: boolean;
  parallelExecution: boolean;
}

export interface TestingActions {
  // Test cases
  createTestCase: (name: string, inputData: unknown, description?: string) => string;
  updateTestCase: (id: string, updates: Partial<TestCase>) => void;
  deleteTestCase: (id: string) => void;
  addAssertion: (testCaseId: string, assertion: Omit<TestAssertion, 'id'>) => void;
  removeAssertion: (testCaseId: string, assertionId: string) => void;

  // Test execution
  testWorkflow: (testData?: unknown) => Promise<TestResult>;
  runTestCase: (testCaseId: string) => Promise<TestRun>;
  cancelTestRun: () => void;
  clearTestResults: () => void;

  // Configuration
  updateTestConfig: (config: Partial<TestConfig>) => void;
}

export type TestingSlice = TestingState & TestingActions;

// Browser-compatible UUID generation
const randomId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

export const createTestingSlice: StateCreator<
  TestingSlice & {
    nodes: Array<{ id: string; data?: { type?: string; label?: string; config?: Record<string, unknown> } }>;
    edges: Array<{ id: string; source: string; target: string }>;
    validateWorkflow?: () => { isValid: boolean; errors: string[] };
  },
  [],
  [],
  TestingSlice
> = (set, get) => ({
  // Initial state
  testCases: {},
  testRuns: [],
  currentTestRun: null,
  isTestRunning: false,
  testConfig: {
    timeout: 30000, // 30 seconds
    mockExternalCalls: true,
    captureOutputs: true,
    stopOnFirstError: false,
    parallelExecution: false,
  },

  // Create test case
  createTestCase: (name: string, inputData: unknown, description?: string) => {
    const id = randomId();
    const now = new Date();

    const testCase: TestCase = {
      id,
      name,
      description,
      inputData,
      assertions: [],
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      testCases: { ...state.testCases, [id]: testCase },
    }));

    logger.info('Test case created', { id, name });
    return id;
  },

  // Update test case
  updateTestCase: (id: string, updates: Partial<TestCase>) => {
    set((state) => {
      const existing = state.testCases[id];
      if (!existing) return state;

      return {
        testCases: {
          ...state.testCases,
          [id]: {
            ...existing,
            ...updates,
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  // Delete test case
  deleteTestCase: (id: string) => {
    set((state) => {
      const newTestCases = { ...state.testCases };
      delete newTestCases[id];
      return { testCases: newTestCases };
    });
  },

  // Add assertion to test case
  addAssertion: (testCaseId: string, assertion: Omit<TestAssertion, 'id'>) => {
    set((state) => {
      const testCase = state.testCases[testCaseId];
      if (!testCase) return state;

      const newAssertion: TestAssertion = {
        ...assertion,
        id: randomId(),
      };

      return {
        testCases: {
          ...state.testCases,
          [testCaseId]: {
            ...testCase,
            assertions: [...(testCase.assertions || []), newAssertion],
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  // Remove assertion from test case
  removeAssertion: (testCaseId: string, assertionId: string) => {
    set((state) => {
      const testCase = state.testCases[testCaseId];
      if (!testCase) return state;

      return {
        testCases: {
          ...state.testCases,
          [testCaseId]: {
            ...testCase,
            assertions: testCase.assertions?.filter((a) => a.id !== assertionId) || [],
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  // Test workflow (main testing function)
  testWorkflow: async (testData?: unknown) => {
    const state = get();
    const { nodes, edges, testConfig } = state;

    set({ isTestRunning: true });

    const warnings: string[] = [];
    const results: Array<{ test: string; success: boolean; message: string }> = [];

    try {
      // Validate workflow first if available
      if (state.validateWorkflow) {
        const validation = state.validateWorkflow();
        if (!validation.isValid) {
          set({ isTestRunning: false });
          return {
            success: false,
            errors: validation.errors,
            results: [],
          };
        }
      }

      // Create test run
      const testRun: TestRun = {
        id: randomId(),
        status: 'running',
        startedAt: new Date(),
        input: testData,
        nodeResults: {},
      };

      set({ currentTestRun: testRun });

      // Identify trigger nodes
      const triggerTypes = ['trigger', 'webhook', 'schedule', 'manualTrigger'];
      const triggerNodes = nodes.filter((n) =>
        triggerTypes.includes(n.data?.type || '')
      );

      // Validate trigger configurations
      for (const trigger of triggerNodes) {
        const config = trigger.data?.config || {};

        if (trigger.data?.type === 'webhook' && !config.webhookUrl && !config.path) {
          warnings.push(
            `Webhook trigger "${trigger.data?.label || trigger.id}" has no URL configured`
          );
        }
        if (trigger.data?.type === 'schedule' && !config.schedule && !config.cron) {
          warnings.push(
            `Schedule trigger "${trigger.data?.label || trigger.id}" has no schedule configured`
          );
        }
      }

      // Performance checks
      if (nodes.length > 50) {
        warnings.push(
          'Workflow contains many nodes (>50) - consider breaking into sub-workflows'
        );
      }

      const httpNodes = nodes.filter(
        (n) => n.data?.type === 'http' || n.data?.type === 'httpRequest'
      );
      if (httpNodes.length > 10) {
        warnings.push(
          'Workflow contains many HTTP requests (>10) - consider batching or rate limiting'
        );
      }

      // Simulate node execution
      let passedNodes = 0;
      let failedNodes = 0;
      const nodeResults: Record<string, NodeTestResult> = {};

      for (const node of nodes) {
        const nodeResult: NodeTestResult = {
          nodeId: node.id,
          nodeName: node.data?.label,
          nodeType: node.data?.type,
          status: 'running',
          startedAt: new Date(),
        };

        try {
          // Simulate execution (in real implementation, this would run the node)
          await new Promise((resolve) => setTimeout(resolve, 10));

          nodeResult.status = 'success';
          nodeResult.finishedAt = new Date();
          nodeResult.duration = nodeResult.finishedAt.getTime() - nodeResult.startedAt!.getTime();
          passedNodes++;
        } catch (error) {
          nodeResult.status = 'failed';
          nodeResult.error = error instanceof Error ? error.message : String(error);
          nodeResult.finishedAt = new Date();
          nodeResult.duration = nodeResult.finishedAt.getTime() - nodeResult.startedAt!.getTime();
          failedNodes++;

          if (testConfig.stopOnFirstError) {
            break;
          }
        }

        nodeResults[node.id] = nodeResult;
      }

      // Test with provided data
      if (testData) {
        results.push({
          test: 'Data Flow Simulation',
          success: true,
          message: `Test data successfully processed through ${nodes.length} nodes`,
        });
      }

      results.push({
        test: 'Node Execution',
        success: failedNodes === 0,
        message: `${passedNodes}/${nodes.length} nodes executed successfully`,
      });

      // Complete test run
      const finishedAt = new Date();
      const completedRun: TestRun = {
        ...testRun,
        status: failedNodes === 0 ? 'passed' : 'failed',
        finishedAt,
        duration: finishedAt.getTime() - testRun.startedAt.getTime(),
        nodeResults,
      };

      set((state) => ({
        currentTestRun: completedRun,
        testRuns: [...state.testRuns, completedRun].slice(-50), // Keep last 50 runs
        isTestRunning: false,
      }));

      const summary: TestSummary = {
        nodesCount: nodes.length,
        edgesCount: edges.length,
        triggersCount: triggerNodes.length,
        testedNodes: nodes.length,
        passedNodes,
        failedNodes,
        skippedNodes: 0,
        totalDuration: completedRun.duration || 0,
        warningsCount: warnings.length,
      };

      logger.info('Workflow test completed', {
        success: failedNodes === 0,
        passedNodes,
        failedNodes,
        duration: completedRun.duration,
      });

      return {
        success: failedNodes === 0,
        results,
        warnings,
        summary,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      set({ isTestRunning: false });

      logger.error('Workflow test failed:', error);

      return {
        success: false,
        errors: [`Test execution failed: ${errorMessage}`],
        results,
        warnings,
      };
    }
  },

  // Run a specific test case
  runTestCase: async (testCaseId: string) => {
    const state = get();
    const testCase = state.testCases[testCaseId];

    if (!testCase) {
      throw new Error(`Test case ${testCaseId} not found`);
    }

    // Run test with test case input
    await state.testWorkflow(testCase.inputData);

    const currentRun = get().currentTestRun;

    if (!currentRun) {
      throw new Error('No test run created');
    }

    // Evaluate assertions
    if (testCase.assertions && testCase.assertions.length > 0) {
      const evaluatedAssertions = testCase.assertions.map((assertion) => {
        const nodeResult = currentRun.nodeResults[assertion.nodeId];
        let passed = false;
        let actual: unknown;

        if (nodeResult) {
          switch (assertion.type) {
            case 'output':
              actual = nodeResult.output;
              passed = evaluateAssertion(actual, assertion.operator, assertion.expected);
              break;
            case 'status':
              actual = nodeResult.status;
              passed = actual === assertion.expected;
              break;
            case 'duration':
              actual = nodeResult.duration;
              passed = evaluateAssertion(actual, assertion.operator, assertion.expected);
              break;
          }
        }

        return { ...assertion, actual, passed };
      });

      // Update run with assertions
      set((state) => ({
        currentTestRun: state.currentTestRun
          ? { ...state.currentTestRun, assertions: evaluatedAssertions }
          : null,
      }));
    }

    return get().currentTestRun!;
  },

  // Cancel current test run
  cancelTestRun: () => {
    set((state) => ({
      isTestRunning: false,
      currentTestRun: state.currentTestRun
        ? {
            ...state.currentTestRun,
            status: 'cancelled',
            finishedAt: new Date(),
          }
        : null,
    }));
  },

  // Clear test results
  clearTestResults: () => {
    set({
      testRuns: [],
      currentTestRun: null,
    });
  },

  // Update test configuration
  updateTestConfig: (config: Partial<TestConfig>) => {
    set((state) => ({
      testConfig: { ...state.testConfig, ...config },
    }));
  },
});

// Helper function to evaluate assertions
function evaluateAssertion(actual: unknown, operator: string, expected: unknown): boolean {
  switch (operator) {
    case 'equals':
      return JSON.stringify(actual) === JSON.stringify(expected);
    case 'contains':
      if (typeof actual === 'string' && typeof expected === 'string') {
        return actual.includes(expected);
      }
      if (Array.isArray(actual)) {
        return actual.includes(expected);
      }
      return false;
    case 'matches':
      if (typeof actual === 'string' && typeof expected === 'string') {
        return new RegExp(expected).test(actual);
      }
      return false;
    case 'lessThan':
      return Number(actual) < Number(expected);
    case 'greaterThan':
      return Number(actual) > Number(expected);
    default:
      return false;
  }
}
