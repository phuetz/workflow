/**
 * Workflow Type Definitions
 * Comprehensive type definitions for workflow-related structures
 */

import { Node, Edge } from '@xyflow/react';

// Workflow definition types
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: WorkflowVariable[];
  settings?: WorkflowSettings;
  metadata?: WorkflowMetadata;
  status: WorkflowStatus;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowNode extends Node {
  data: {
    label: string;
    type: NodeType;
    config?: Record<string, unknown>;
    validation?: {
      isValid: boolean;
      errors: string[];
    };
  };
}

export type WorkflowEdge = Edge & {
  data?: {
    condition?: string;
    priority?: number;
  };
};

export interface WorkflowVariable {
  name: string;
  type: VariableType;
  value: unknown;
  defaultValue?: unknown;
  required?: boolean;
  description?: string;
  validation?: VariableValidation;
}

export interface VariableValidation {
  pattern?: string;
  min?: number;
  max?: number;
  enum?: unknown[];
  custom?: (value: unknown) => boolean;
}

export interface WorkflowSettings {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  parallelExecution?: boolean;
  errorHandling?: ErrorHandlingStrategy;
  logging?: LoggingConfig;
  notifications?: NotificationConfig;
}

export interface WorkflowMetadata {
  author?: string;
  version?: string;
  created?: Date;
  modified?: Date;
  executionCount?: number;
  successRate?: number;
  averageExecutionTime?: number;
  lastExecutedAt?: Date;
  permissions?: WorkflowPermissions;
}

export interface WorkflowPermissions {
  view: string[];
  edit: string[];
  execute: string[];
  delete: string[];
}

// Execution types
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  userId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input?: Record<string, unknown>;
  output?: unknown;
  error?: ExecutionError;
  nodeExecutions: NodeExecution[];
  context?: ExecutionContext;
  metrics?: ExecutionMetrics;
}

export interface NodeExecution {
  nodeId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input?: unknown;
  output?: unknown;
  error?: NodeError;
  retryCount?: number;
  metadata?: Record<string, unknown>;
}

export interface ExecutionContext {
  variables: Record<string, unknown>;
  results: Record<string, unknown>;
  metadata: Record<string, unknown>;
  secrets?: Record<string, string>;
  environment?: Record<string, string>;
}

export interface ExecutionError {
  code: string;
  message: string;
  nodeId?: string;
  timestamp: Date;
  stack?: string;
  details?: Record<string, unknown>;
}

export interface NodeError extends ExecutionError {
  nodeType: string;
  input?: unknown;
  config?: Record<string, unknown>;
}

export interface ExecutionMetrics {
  totalNodes: number;
  executedNodes: number;
  successfulNodes: number;
  failedNodes: number;
  skippedNodes: number;
  totalDuration: number;
  memoryUsage?: number;
  cpuUsage?: number;
  apiCalls?: number;
  dataProcessed?: number;
}

// Enums
export enum WorkflowStatus {
  Draft = 'draft',
  Active = 'active',
  Inactive = 'inactive',
  Archived = 'archived',
  Deleted = 'deleted'
}

export enum ExecutionStatus {
  Pending = 'pending',
  Running = 'running',
  Success = 'success',
  Failed = 'failed',
  Cancelled = 'cancelled',
  Timeout = 'timeout',
  Skipped = 'skipped'
}

export enum NodeType {
  Start = 'start',
  End = 'end',
  Transform = 'transform',
  Filter = 'filter',
  API = 'api',
  Database = 'database',
  Email = 'email',
  Webhook = 'webhook',
  Conditional = 'conditional',
  Loop = 'loop',
  Delay = 'delay',
  Script = 'script',
  AI = 'ai',
  Storage = 'storage',
  Queue = 'queue',
  Custom = 'custom'
}

export enum VariableType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
  Date = 'date',
  File = 'file',
  Secret = 'secret'
}

export enum ErrorHandlingStrategy {
  StopOnError = 'stop',
  ContinueOnError = 'continue',
  RetryOnError = 'retry',
  FallbackOnError = 'fallback'
}

// Configuration types
export interface LoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  includeNodeData?: boolean;
  includeExecutionContext?: boolean;
  destinations?: LogDestination[];
}

export interface LogDestination {
  type: 'console' | 'file' | 'database' | 'external';
  config: Record<string, unknown>;
}

export interface NotificationConfig {
  onSuccess?: NotificationSettings;
  onFailure?: NotificationSettings;
  onTimeout?: NotificationSettings;
  channels?: NotificationChannel[];
}

export interface NotificationSettings {
  enabled: boolean;
  recipients: string[];
  template?: string;
  includeExecutionDetails?: boolean;
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'webhook' | 'slack' | 'teams';
  config: Record<string, unknown>;
}

// Template types
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  preview?: string;
  workflow: Partial<Workflow>;
  requirements?: TemplateRequirements;
  examples?: TemplateExample[];
  popularity?: number;
  rating?: number;
}

export interface TemplateRequirements {
  minVersion?: string;
  requiredNodes?: NodeType[];
  requiredIntegrations?: string[];
  requiredPermissions?: string[];
}

export interface TemplateExample {
  name: string;
  description: string;
  input: Record<string, unknown>;
  expectedOutput: unknown;
}

// Analytics types
export interface WorkflowAnalytics {
  workflowId: string;
  period: AnalyticsPeriod;
  executions: ExecutionAnalytics;
  performance: PerformanceAnalytics;
  errors: ErrorAnalytics;
  usage: UsageAnalytics;
}

export interface ExecutionAnalytics {
  total: number;
  successful: number;
  failed: number;
  cancelled: number;
  averageDuration: number;
  trend: TrendData[];
}

export interface PerformanceAnalytics {
  averageExecutionTime: number;
  p50ExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  slowestNodes: NodePerformance[];
  bottlenecks: string[];
}

export interface NodePerformance {
  nodeId: string;
  nodeType: NodeType;
  averageTime: number;
  executionCount: number;
}

export interface ErrorAnalytics {
  totalErrors: number;
  errorRate: number;
  commonErrors: ErrorSummary[];
  errorsByNode: Record<string, number>;
  errorTrend: TrendData[];
}

export interface ErrorSummary {
  code: string;
  message: string;
  count: number;
  lastOccurred: Date;
}

export interface UsageAnalytics {
  apiCalls: number;
  dataProcessed: number;
  storageUsed: number;
  computeTime: number;
  cost?: number;
}

export interface TrendData {
  timestamp: Date;
  value: number;
}

export enum AnalyticsPeriod {
  Hour = '1h',
  Day = '1d',
  Week = '1w',
  Month = '1m',
  Year = '1y'
}

// Type guards
export function isWorkflowNode(node: Node): node is WorkflowNode {
  return node.data && 'type' in node.data;
}

export function isExecutionError(error: unknown): error is ExecutionError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

export function isWorkflowTemplate(obj: unknown): obj is WorkflowTemplate {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'workflow' in obj &&
    'category' in obj
  );
}