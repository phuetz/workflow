/**
 * Testing Service Types
 * Type definitions for workflow testing functionality
 */

import type { WorkflowExecution } from '../../types/workflowTypes';

// Re-export testing types from main types file
export type {
  WorkflowTestCase,
  WorkflowTestResult,
  TestExecutionContext,
  TestAssertion,
  TestCoverage,
  TestReport
} from '../../types/testing';

/**
 * Test execution options
 */
export interface TestExecutionOptions {
  mockData?: Record<string, unknown>;
  breakpoints?: string[];
  coverage?: boolean;
  debug?: boolean;
}

/**
 * Test suite execution options
 */
export interface TestSuiteOptions {
  parallel?: boolean;
  stopOnFailure?: boolean;
  coverage?: boolean;
}

/**
 * Test case creation parameters
 */
export interface CreateTestCaseParams {
  name: string;
  description?: string;
  workflowId: string;
  input: Record<string, unknown>;
  expectedOutput?: unknown;
  assertions: import('../../types/testing').TestAssertion[];
  timeout?: number;
  tags?: string[];
}

/**
 * Coverage metrics for nodes or paths
 */
export interface CoverageMetric {
  total: number;
  covered: number;
  percentage: number;
}

/**
 * Test report generation options
 */
export interface ReportOptions {
  duration: number;
  coverage?: boolean;
}

/**
 * Export format for test results
 */
export type ExportFormat = 'json' | 'junit' | 'html';

/**
 * Test execution log entry
 */
export interface TestLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Assertion evaluation result
 */
export interface AssertionResult {
  passed: boolean;
  actual: unknown;
  error?: string;
  executedAt: Date;
}

/**
 * Workflow execution result from store
 */
export interface StoreExecutionResult {
  success: boolean;
  error?: string;
  output?: unknown;
  executionTime?: number;
  results?: NodeExecutionResult[];
}

/**
 * Node execution result from store
 */
export interface NodeExecutionResult {
  nodeId?: string;
  success?: boolean;
  error?: Error;
  duration?: number;
  input?: unknown;
  output?: unknown;
}

/**
 * Workflow execution function signature
 */
export type ExecuteWorkflowFn = (
  id: string,
  input: Record<string, unknown>
) => Promise<StoreExecutionResult>;

/**
 * Test metrics summary
 */
export interface TestMetrics {
  nodesExecuted: number;
  assertionsPassed: number;
  assertionsFailed: number;
}

/**
 * Test report summary
 */
export interface TestReportSummary {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  passRate: number;
}
