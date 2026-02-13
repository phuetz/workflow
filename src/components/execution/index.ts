/**
 * Execution Engine Module
 *
 * This module provides the workflow execution engine components:
 * - Types and interfaces for execution
 * - Expression evaluation utilities
 * - Data flow management
 * - Node executors for all supported node types
 */

// Types and interfaces
export type {
  NodeExecutionResult,
  ExecutionError,
  ExecutorOptions,
  OnNodeStart,
  OnNodeComplete,
  OnNodeError,
  NodeConfig,
  BatchItem,
  BatchResult,
  AggregationOperation,
  AggregationConfig,
  EditFieldOperation,
  SetAssignment,
  HttpAuthentication,
  HttpResponse,
  ExecutionQueueItem,
  WorkflowNode,
  WorkflowEdge
} from './types';

export { DEFAULT_NODE_TIMEOUT } from './types';

// Expression evaluation utilities
export {
  interpolateString,
  getValueByPath,
  getNestedValue,
  setNestedValue,
  deleteNestedValue,
  resolveExpressionValue,
  parseExpression,
  getMilliseconds,
  aggregate
} from './ExpressionEvaluator';

// Data flow utilities
export {
  edgeConditionMet,
  getNextNodes,
  getStartNodes,
  combineInputData,
  validateWorkflowHasStartNodes,
  createInitialExecutionQueue,
  getNextExecutionItems,
  getErrorBranchItems,
  shouldContinueAfterError
} from './DataFlow';

// Node executors
export * from './executors';
