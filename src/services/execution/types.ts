/**
 * Advanced Execution Engine Types
 * Type definitions for the execution engine (extracted from AdvancedExecutionEngine.ts)
 */

// ============================================================================
// EXECUTION CONTEXT TYPES
// ============================================================================

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  userId: string;
  triggerData?: unknown;
  variables: Map<string, unknown>;
  nodeResults: Map<string, NodeExecutionResult>;
  metadata: ExecutionMetadata;
  environment: 'development' | 'staging' | 'production';
  priority: ExecutionPriority;
  timeout: number; // milliseconds
  retryPolicy: RetryPolicy;
  errorHandling: ErrorHandlingPolicy;
}

export interface ExecutionMetadata {
  startTime: Date;
  parentExecutionId?: string;
  triggerType: string;
  triggerSource: string;
  executionMode: 'sync' | 'async' | 'streaming';
  tags: string[];
  customProperties: Record<string, unknown>;
}

// ============================================================================
// NODE EXECUTION TYPES
// ============================================================================

export interface NodeExecutionResult {
  nodeId: string;
  status: NodeExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  inputData: unknown[];
  outputData?: unknown[];
  error?: ExecutionError;
  metadata: NodeExecutionMetadata;
}

export type NodeExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped' | 'cancelled';

export interface NodeExecutionMetadata {
  memoryUsage: number;
  cpuTime: number;
  apiCalls: number;
  retryCount: number;
  cached: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ExecutionError {
  code: string;
  message: string;
  stack?: string;
  nodeId: string;
  timestamp: Date;
  recoverable: boolean;
  retryAfter?: number;
  context?: Record<string, unknown>;
}

// ============================================================================
// POLICY TYPES
// ============================================================================

export interface RetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  retryConditions: string[]; // Error codes that trigger retries
  circuitBreaker?: CircuitBreakerConfig;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number; // milliseconds
  halfOpenMaxCalls: number;
}

export interface ErrorHandlingPolicy {
  continueOnError: boolean;
  defaultErrorPath?: string;
  errorNotifications: boolean;
  rollbackOnError: boolean;
  savePartialResults: boolean;
}

// ============================================================================
// QUEUE AND POOL TYPES
// ============================================================================

export type ExecutionPriority = 'low' | 'normal' | 'high' | 'critical';

export interface ExecutionQueue {
  id: string;
  priority: ExecutionPriority;
  maxConcurrency: number;
  rateLimiting: RateLimitConfig;
  deadLetterQueue: boolean;
}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerSecond: number;
  burstSize: number;
}

export interface ExecutionPool {
  id: string;
  maxWorkers: number;
  queues: ExecutionQueue[];
  healthCheck: HealthCheckConfig;
  scaling: ScalingConfig;
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
}

export interface ScalingConfig {
  enabled: boolean;
  minWorkers: number;
  maxWorkers: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
}

// ============================================================================
// WORKFLOW EXECUTION TYPES
// ============================================================================

export type WorkflowExecutionStatus = 'queued' | 'running' | 'success' | 'error' | 'cancelled' | 'timeout';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowExecutionStatus;
  context: ExecutionContext;
  progress: ExecutionProgress;
  performance: ExecutionPerformance;
  result?: ExecutionResult;
}

export interface ExecutionProgress {
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  skippedNodes: number;
  currentNode?: string;
}

export interface ExecutionPerformance {
  totalDuration: number;
  queueTime: number;
  executionTime: number;
  memoryPeak: number;
  cpuTime: number;
}

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: ExecutionError;
  partialResults?: Map<string, unknown>;
}

// ============================================================================
// EXECUTION OPTIONS
// ============================================================================

export interface ExecuteWorkflowOptions {
  priority?: ExecutionPriority;
  timeout?: number;
  environment?: 'development' | 'staging' | 'production';
  variables?: Record<string, unknown>;
  parentExecutionId?: string;
  tags?: string[];
}

// ============================================================================
// METRICS TYPES
// ============================================================================

export interface EngineMetrics {
  activeExecutions: number;
  queuedExecutions: number;
  completedToday: number;
  errorRate: number;
  averageExecutionTime: number;
  poolUtilization: Record<string, number>;
}

// ============================================================================
// TIMELINE TYPES
// ============================================================================

export interface TimelineEvent {
  timestamp: number;
  event: string;
  nodeId?: string;
  duration?: number;
  data?: unknown;
}
