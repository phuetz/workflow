/**
 * Execution Type Definitions
 * PROJET SAUVÉ - Phase 5.3: Execution History & Logs
 */

/**
 * Execution status
 */
export type ExecutionStatus =
  | 'running'
  | 'success'
  | 'error'
  | 'cancelled'
  | 'timeout'
  | 'waiting';

/**
 * Node execution status
 */
export type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'skipped'
  | 'cancelled';

/**
 * Log level
 */
export type LogLevel =
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal';

/**
 * Workflow execution record
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowVersion?: string;
  status: ExecutionStatus;
  mode: 'manual' | 'trigger' | 'webhook' | 'schedule' | 'test';
  startedAt: Date;
  finishedAt?: Date;
  duration?: number; // milliseconds
  triggeredBy?: string; // user ID or trigger name
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: ExecutionError;
  nodeExecutions: NodeExecution[];
  metadata?: Record<string, any>;
  tags?: string[];
}

/**
 * Node execution record
 */
export interface NodeExecution {
  id: string;
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: NodeExecutionStatus;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number; // milliseconds
  retryCount: number;
  maxRetries: number;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: NodeExecutionError;
  logs: ExecutionLog[];
  metadata?: Record<string, any>;
}

/**
 * Execution error
 */
export interface ExecutionError {
  message: string;
  code?: string;
  stack?: string;
  nodeId?: string;
  nodeName?: string;
  timestamp: Date;
  recoverable: boolean;
  context?: Record<string, any>;
}

/**
 * Node execution error
 */
export interface NodeExecutionError {
  message: string;
  code?: string;
  stack?: string;
  timestamp: Date;
  retry: boolean;
  httpStatus?: number;
  context?: Record<string, any>;
}

/**
 * Execution log entry
 */
export interface ExecutionLog {
  id: string;
  executionId: string;
  nodeExecutionId?: string;
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: Record<string, any>;
  source?: string;
  category?: string;
}

/**
 * Execution filter
 */
export interface ExecutionFilter {
  workflowId?: string;
  status?: ExecutionStatus | ExecutionStatus[];
  mode?: string;
  triggeredBy?: string;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'startedAt' | 'finishedAt' | 'duration' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Node execution filter
 */
export interface NodeExecutionFilter {
  executionId?: string;
  nodeId?: string;
  nodeType?: string;
  status?: NodeExecutionStatus | NodeExecutionStatus[];
  hasError?: boolean;
  minDuration?: number;
  maxDuration?: number;
}

/**
 * Execution log filter
 */
export interface ExecutionLogFilter {
  executionId?: string;
  nodeExecutionId?: string;
  level?: LogLevel | LogLevel[];
  startDate?: Date;
  endDate?: Date;
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

/**
 * Execution statistics
 */
export interface ExecutionStatistics {
  total: number;
  byStatus: Record<ExecutionStatus, number>;
  byMode: Record<string, number>;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  errorRate: number;
  totalDuration: number;
}

/**
 * Node execution statistics
 */
export interface NodeExecutionStatistics {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  lastExecution?: Date;
}

/**
 * Execution timeline event
 */
export interface ExecutionTimelineEvent {
  id: string;
  executionId: string;
  type: 'start' | 'node_start' | 'node_end' | 'end' | 'error' | 'log';
  timestamp: Date;
  nodeId?: string;
  nodeName?: string;
  message: string;
  status?: ExecutionStatus | NodeExecutionStatus;
  duration?: number;
  data?: Record<string, any>;
}

/**
 * Execution export options
 */
export interface ExecutionExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  includeInput?: boolean;
  includeOutput?: boolean;
  includeLogs?: boolean;
  includeNodeExecutions?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Export job status
 */
export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

/**
 * Export format type
 */
export type ExportFormat = 'json' | 'csv' | 'xlsx';

/**
 * Async export job filter options
 */
export interface ExportJobOptions {
  format: ExportFormat;
  workflowId?: string;
  status?: 'success' | 'error' | 'all';
  dateFrom?: string;
  dateTo?: string;
  includeData?: boolean;
  includeNodeExecutions?: boolean;
  includeLogs?: boolean;
  limit?: number;
}

/**
 * Export job metadata
 */
export interface ExportJob {
  id: string;
  status: ExportJobStatus;
  options: ExportJobOptions;
  progress: number;
  totalRecords: number;
  processedRecords: number;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  error?: string;
  userId?: string;
}

/**
 * Export job API response
 */
export interface ExportJobResponse {
  id: string;
  status: ExportJobStatus;
  format: ExportFormat;
  progress: number;
  totalRecords: number;
  processedRecords: number;
  fileSize?: number;
  fileName?: string;
  mimeType?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * Create export request body
 */
export interface CreateExportRequest {
  format: ExportFormat;
  workflowId?: string;
  status?: 'success' | 'error' | 'all';
  dateFrom?: string;
  dateTo?: string;
  includeData?: boolean;
  includeNodeExecutions?: boolean;
  includeLogs?: boolean;
  limit?: number;
}

/**
 * Create export response
 */
export interface CreateExportResponse {
  success: boolean;
  message: string;
  export: {
    id: string;
    status: ExportJobStatus;
    options: ExportJobOptions;
    progress: number;
    createdAt: string;
    expiresAt?: string;
  };
  links: {
    status: string;
    download: string;
  };
}

/**
 * List exports response
 */
export interface ListExportsResponse {
  success: boolean;
  exports: ExportJobResponse[];
  count: number;
}

/**
 * Execution retention policy
 */
export interface ExecutionRetentionPolicy {
  enabled: boolean;
  retentionDays: number;
  keepSuccessful?: boolean;
  keepFailed?: boolean;
  maxExecutions?: number;
  autoCleanup?: boolean;
}

/**
 * Execution webhook payload
 */
export interface ExecutionWebhookPayload {
  event: 'execution.started' | 'execution.completed' | 'execution.failed';
  execution: WorkflowExecution;
  workflow: {
    id: string;
    name: string;
  };
  timestamp: Date;
}

/**
 * Execution metrics
 */
export interface ExecutionMetrics {
  period: 'hour' | 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgDuration: number;
  executionsByHour: Array<{ hour: number; count: number }>;
  executionsByStatus: Record<ExecutionStatus, number>;
  executionsByMode: Record<string, number>;
  topFailingNodes: Array<{
    nodeId: string;
    nodeName: string;
    failureCount: number;
  }>;
  slowestNodes: Array<{
    nodeId: string;
    nodeName: string;
    avgDuration: number;
  }>;
}

/**
 * Execution replay options
 */
export interface ExecutionReplayOptions {
  executionId: string;
  fromNode?: string;
  withModifications?: boolean;
  newInput?: Record<string, any>;
  debugMode?: boolean;
}

/**
 * Execution comparison
 */
export interface ExecutionComparison {
  execution1: WorkflowExecution;
  execution2: WorkflowExecution;
  differences: {
    input?: any;
    output?: any;
    duration?: number;
    nodeExecutions?: Array<{
      nodeId: string;
      difference: string;
    }>;
  };
}

/**
 * Execution alert
 */
export interface ExecutionAlert {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    status?: ExecutionStatus[];
    duration?: { min?: number; max?: number };
    errorPattern?: string;
    consecutiveFailures?: number;
  };
  actions: {
    email?: string[];
    webhook?: string;
    slack?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
}

/**
 * Execution context
 */
export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  userId?: string;
  variables: Map<string, any>;
  credentials: Map<string, string>; // credential ID to credential data
  nodeOutputs: Map<string, any>;
  startTime: Date;
  mode: string;
  metadata: Record<string, any>;
}

/**
 * Execution summary
 */
export interface ExecutionSummary {
  id: string;
  workflowName: string;
  status: ExecutionStatus;
  duration: number;
  startedAt: Date;
  finishedAt?: Date;
  mode: string;
  successfulNodes: number;
  failedNodes: number;
  totalNodes: number;
}
