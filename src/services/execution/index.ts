/**
 * Execution Services - Barrel Export (S2.1)
 *
 * This module provides the unified execution interface for the application.
 *
 * Recommended Usage:
 * ```typescript
 * import { workflowOrchestrator, WorkflowExecutionOrchestrator } from '@services/execution';
 *
 * const result = await workflowOrchestrator.execute(workflow, options);
 * ```
 *
 * For low-level access to execution modules, import from src/execution/ directly:
 * ```typescript
 * import { RetryManager } from '../../execution/RetryManager';
 * import { CircuitBreaker } from '../../execution/CircuitBreaker';
 * ```
 */

// Main orchestrator
export {
  WorkflowExecutionOrchestrator,
  workflowOrchestrator,
  type WorkflowDefinition,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowSettings,
  type ExecutionOptions,
  type ExecutionResult,
  type NodeResult,
  type ExecutionError as OrchestratorExecutionError,
  type ExecutionMetrics as OrchestratorExecutionMetrics
} from './WorkflowExecutionOrchestrator';

// Advanced execution engine types (extracted)
export type {
  ExecutionContext,
  ExecutionMetadata,
  NodeExecutionResult,
  ExecutionError,
  RetryPolicy,
  ErrorHandlingPolicy,
  ExecutionQueue,
  ExecutionPool,
  WorkflowExecution,
  ExecuteWorkflowOptions,
  EngineMetrics,
  TimelineEvent,
  ExecutionPriority,
  WorkflowExecutionStatus,
  NodeExecutionStatus,
  ExecutionProgress,
  ExecutionPerformance,
  ExecutionResult as AdvancedExecutionResult,
  RateLimitConfig,
  HealthCheckConfig,
  ScalingConfig,
  CircuitBreakerConfig,
  NodeExecutionMetadata
} from './types';

// Extracted modules from AdvancedExecutionEngine
export { ExecutionPoolManager } from './ExecutionPoolManager';
export { ExecutionHistoryManager } from './ExecutionHistoryManager';
export { ExecutionMetricsCollector } from './ExecutionMetricsCollector';
export { CircuitBreakerAdvanced, type CircuitState } from './CircuitBreakerAdvanced';
export { RateLimiter } from './RateLimiter';

// Re-export commonly used types from execution modules
export type { RetryConfig, RetryStrategy, RetryResult } from '../../execution/RetryManager';
export type { ExecutionStatus } from '../../types/execution';
