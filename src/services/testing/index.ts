/**
 * Testing Module Barrel Export
 * Re-exports all testing-related functionality
 */

// Core classes
export { TestRunner, testRunner } from './TestRunner';
export { TestValidator, testValidator } from './TestValidator';
export { CoverageCalculator, coverageCalculator } from './CoverageCalculator';
export { TestReporter, testReporter } from './TestReporter';

// Types
export type {
  TestExecutionOptions,
  TestSuiteOptions,
  CreateTestCaseParams,
  CoverageMetric,
  ReportOptions,
  ExportFormat,
  TestLogEntry,
  AssertionResult,
  StoreExecutionResult,
  NodeExecutionResult,
  ExecuteWorkflowFn,
  TestMetrics,
  TestReportSummary
} from './types';

// Re-export main testing types from types file
export type {
  WorkflowTestCase,
  WorkflowTestResult,
  TestExecutionContext,
  TestAssertion,
  TestCoverage,
  TestReport
} from '../../types/testing';
