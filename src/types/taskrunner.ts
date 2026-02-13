/**
 * Task Runner Type Definitions
 * Comprehensive types for distributed task execution system
 */

import { WorkflowNode, WorkflowEdge } from './workflow';
import { SafeExecutionResult, SafeObject } from '../utils/TypeSafetyUtils';

// ============================================================================
// Task Types
// ============================================================================

export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';
export type TaskStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
export type WorkerStatus = 'idle' | 'busy' | 'starting' | 'stopping' | 'crashed' | 'healthy' | 'unhealthy';
export type LoadBalancingStrategy = 'round-robin' | 'least-busy' | 'random' | 'weighted';

export interface Task {
  id: string;
  workflowId: string;
  nodeId: string;
  node: WorkflowNode;
  inputData: SafeObject;
  priority: TaskPriority;
  status: TaskStatus;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  timeout: number;
  dependencies: string[]; // Node IDs that must complete first
  metadata?: Record<string, unknown>;
}

export interface TaskResult {
  taskId: string;
  nodeId: string;
  success: boolean;
  result: SafeExecutionResult;
  executionTime: number;
  workerId: string;
  timestamp: number;
}

// ============================================================================
// Worker Types
// ============================================================================

export interface WorkerConfig {
  id: string;
  maxConcurrentTasks: number;
  heartbeatInterval: number; // ms
  healthCheckInterval: number; // ms
  shutdownTimeout: number; // ms
}

export interface WorkerMetrics {
  workerId: string;
  status: WorkerStatus;
  tasksProcessed: number;
  tasksSucceeded: number;
  tasksFailed: number;
  currentLoad: number; // 0-1
  cpuUsage: number; // 0-100
  memoryUsageMB: number;
  uptime: number; // ms
  lastHeartbeat: number;
}

export interface WorkerHealth {
  workerId: string;
  isHealthy: boolean;
  status: WorkerStatus;
  consecutiveFailures: number;
  lastError?: string;
  lastErrorTimestamp?: number;
  cpuThreshold: number;
  memoryThreshold: number;
}

// ============================================================================
// Worker Pool Types
// ============================================================================

export interface WorkerPoolConfig {
  minWorkers: number;
  maxWorkers: number;
  workerStartupTimeout: number; // ms
  workerShutdownTimeout: number; // ms
  scaleUpThreshold: number; // queue depth to trigger scale up
  scaleDownThreshold: number; // idle time to trigger scale down
  healthCheckInterval: number; // ms
  autoRestart: boolean;
  loadBalancing: LoadBalancingStrategy;
}

export interface WorkerPoolMetrics {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  unhealthyWorkers: number;
  totalTasksProcessed: number;
  totalTasksSucceeded: number;
  totalTasksFailed: number;
  averageTaskTime: number;
  throughput: number; // tasks per second
  queueDepth: number;
}

// ============================================================================
// Task Queue Types
// ============================================================================

export interface TaskQueueConfig {
  maxQueueSize: number;
  priorityLevels: Record<TaskPriority, number>;
  taskTimeout: number; // ms
  enableDeduplication: boolean;
  deduplicationWindow: number; // ms
}

export interface TaskQueueMetrics {
  totalQueued: number;
  pendingTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageWaitTime: number;
  averageExecutionTime: number;
  queueSize: number;
  priorityDistribution: Record<TaskPriority, number>;
}

// ============================================================================
// Connection Pool Types
// ============================================================================

export interface ConnectionPoolConfig {
  http: {
    maxConnections: number;
    keepAlive: boolean;
    keepAliveTimeout: number; // ms
    timeout: number; // ms
    maxRedirects: number;
  };
  database: {
    maxConnections: number;
    idleTimeout: number; // ms
    connectionTimeout: number; // ms
    enablePreparedStatements: boolean;
  };
}

export interface ConnectionPoolMetrics {
  http: {
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
    requestsServed: number;
    avgResponseTime: number;
  };
  database: {
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
    queriesExecuted: number;
    avgQueryTime: number;
  };
}

// ============================================================================
// Result Cache Types
// ============================================================================

export interface CacheConfig {
  maxSize: number; // MB
  maxEntries: number;
  ttl: number; // ms
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
  compressionEnabled: boolean;
  compressionThreshold: number; // bytes
}

export interface CacheEntry {
  key: string;
  value: SafeExecutionResult;
  size: number; // bytes
  hits: number;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
  compressed: boolean;
}

export interface CacheMetrics {
  totalEntries: number;
  totalSizeMB: number;
  hitRate: number; // 0-1
  missRate: number; // 0-1
  evictions: number;
  compressionRatio: number; // 0-1
}

// ============================================================================
// Retry & Circuit Breaker Types
// ============================================================================

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // number of failures before opening
  successThreshold: number; // number of successes before closing
  timeout: number; // ms in open state
  halfOpenRequests: number; // requests to try in half-open state
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  successes: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}

// ============================================================================
// Distributed Execution Types
// ============================================================================

export interface WorkflowPartition {
  id: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  dependencies: string[]; // IDs of partitions that must complete first
  estimatedComplexity: number;
  estimatedDuration: number;
}

export interface DistributedExecutionPlan {
  workflowId: string;
  partitions: WorkflowPartition[];
  executionOrder: string[][]; // Array of partition IDs that can run in parallel
  totalEstimatedDuration: number;
}

export interface AggregatedResult {
  workflowId: string;
  success: boolean;
  partitionResults: Map<string, Map<string, SafeExecutionResult>>;
  totalExecutionTime: number;
  errors: Array<{ partitionId: string; nodeId: string; error: string }>;
}

// ============================================================================
// Performance Monitoring Types
// ============================================================================

export interface PerformanceMetrics {
  timestamp: number;

  // Execution metrics
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  p50ExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;

  // Throughput metrics
  executionsPerSecond: number;
  tasksPerSecond: number;

  // Resource metrics
  totalMemoryUsageMB: number;
  averageMemoryPerWorker: number;
  totalCpuUsage: number;
  averageCpuPerWorker: number;

  // Worker metrics
  activeWorkers: number;
  idleWorkers: number;

  // Queue metrics
  queueDepth: number;
  averageQueueWaitTime: number;

  // Cache metrics
  cacheHitRate: number;
  cacheSizeMB: number;

  // Connection metrics
  activeHttpConnections: number;
  activeDatabaseConnections: number;
}

export interface PerformanceAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  type: 'slow_execution' | 'high_memory' | 'high_cpu' | 'queue_backlog' | 'worker_crash';
  message: string;
  timestamp: number;
  metric?: string;
  threshold?: number;
  currentValue?: number;
  recommendation?: string;
}

export interface Bottleneck {
  type: 'node' | 'worker' | 'connection' | 'memory' | 'cpu';
  identifier: string;
  impact: 'low' | 'medium' | 'high';
  description: string;
  metrics: Record<string, number>;
  recommendations: string[];
}

// ============================================================================
// Task Runner Service Types
// ============================================================================

export interface TaskRunnerConfig {
  workerPool: WorkerPoolConfig;
  taskQueue: TaskQueueConfig;
  connectionPool: ConnectionPoolConfig;
  cache: CacheConfig;
  retry: RetryConfig;
  circuitBreaker: CircuitBreakerConfig;
  enableDistributedExecution: boolean;
  enablePerformanceMonitoring: boolean;
  enableAutoScaling: boolean;
}

export interface TaskRunnerMetrics {
  workerPool: WorkerPoolMetrics;
  taskQueue: TaskQueueMetrics;
  connectionPool: ConnectionPoolMetrics;
  cache: CacheMetrics;
  performance: PerformanceMetrics;
}

export interface TaskRunnerStatus {
  isRunning: boolean;
  startedAt: number;
  uptime: number;
  config: TaskRunnerConfig;
  metrics: TaskRunnerMetrics;
  workers: WorkerMetrics[];
  health: {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    workers: WorkerHealth[];
    alerts: PerformanceAlert[];
    bottlenecks: Bottleneck[];
  };
}

// ============================================================================
// Event Types
// ============================================================================

export interface TaskRunnerEvent {
  type: 'task_queued' | 'task_started' | 'task_completed' | 'task_failed' |
        'worker_started' | 'worker_stopped' | 'worker_crashed' |
        'performance_alert' | 'bottleneck_detected' | 'scale_up' | 'scale_down';
  timestamp: number;
  data: unknown;
}

// ============================================================================
// Callbacks & Hooks
// ============================================================================

export interface TaskRunnerCallbacks {
  onTaskQueued?: (task: Task) => void;
  onTaskStarted?: (task: Task, workerId: string) => void;
  onTaskCompleted?: (result: TaskResult) => void;
  onTaskFailed?: (task: Task, error: Error) => void;
  onWorkerStarted?: (workerId: string) => void;
  onWorkerStopped?: (workerId: string) => void;
  onWorkerCrashed?: (workerId: string, error: Error) => void;
  onPerformanceAlert?: (alert: PerformanceAlert) => void;
  onBottleneckDetected?: (bottleneck: Bottleneck) => void;
}

// ============================================================================
// Message Passing (Worker Communication)
// ============================================================================

export type WorkerMessageType =
  | 'execute_task'
  | 'task_result'
  | 'heartbeat'
  | 'health_check'
  | 'shutdown'
  | 'error';

export interface WorkerMessage {
  type: WorkerMessageType;
  workerId: string;
  timestamp: number;
  data?: unknown;
}

export interface ExecuteTaskMessage extends WorkerMessage {
  type: 'execute_task';
  data: {
    task: Task;
  };
}

export interface TaskResultMessage extends WorkerMessage {
  type: 'task_result';
  data: {
    result: TaskResult;
  };
}

export interface HeartbeatMessage extends WorkerMessage {
  type: 'heartbeat';
  data: {
    metrics: WorkerMetrics;
  };
}

export interface HealthCheckMessage extends WorkerMessage {
  type: 'health_check';
  data: {
    health: WorkerHealth;
  };
}

export interface ErrorMessage extends WorkerMessage {
  type: 'error';
  data: {
    error: string;
    taskId?: string;
  };
}

// ============================================================================
// Benchmarking Types
// ============================================================================

export interface BenchmarkConfig {
  workflowSize: number; // number of nodes
  iterations: number;
  concurrency: number;
  enableCache: boolean;
  enableConnectionPool: boolean;
  enableDistributed: boolean;
}

export interface BenchmarkResult {
  config: BenchmarkConfig;
  totalExecutions: number;
  totalTimeMs: number;
  avgTimePerExecution: number;
  executionsPerSecond: number;
  memoryUsageMB: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  p50: number;
  p95: number;
  p99: number;
  throughputImprovement: number; // compared to baseline
  memoryImprovement: number; // compared to baseline
}

// ============================================================================
// Workflow Execution Context
// ============================================================================

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  startTime: number;
  timeout: number;
  variables: Map<string, unknown>;
  credentials?: Map<string, unknown>;
  callbacks?: TaskRunnerCallbacks;
}

export interface ExecutionCheckpoint {
  executionId: string;
  completedNodes: string[];
  results: Map<string, SafeExecutionResult>;
  timestamp: number;
}
