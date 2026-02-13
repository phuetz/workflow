/**
 * Error Workflow Types
 * Comprehensive error handling and retry logic system
 */

export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  SERVER_ERROR = 'server_error',
  CLIENT_ERROR = 'client_error',
  EXECUTION_ERROR = 'execution_error',
  CONFIGURATION_ERROR = 'configuration_error',
  UNKNOWN_ERROR = 'unknown_error',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RetryStrategy {
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  FIXED_DELAY = 'fixed_delay',
  IMMEDIATE = 'immediate',
  CUSTOM = 'custom',
}

export interface RetryPolicy {
  enabled: boolean;
  maxRetries: number;
  strategy: RetryStrategy;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier?: number; // for exponential backoff
  retryableErrors?: ErrorType[]; // specific errors to retry
  nonRetryableErrors?: ErrorType[]; // errors to not retry
  retryCondition?: (error: WorkflowError) => boolean; // custom retry condition
}

export interface ErrorHandlingConfig {
  continueOnError: boolean;
  defaultErrorWorkflow?: string; // workflow ID to execute on error
  errorOutputEnabled: boolean; // enable error output on nodes
  captureStackTrace: boolean;
  notifyOnError: boolean;
  notificationChannels?: string[]; // email, slack, etc.
  retryPolicy?: RetryPolicy;
}

export interface WorkflowError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  timestamp: Date;
  workflowId: string;
  workflowName: string;
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  input?: Record<string, any>;
  stackTrace?: string;
  context?: Record<string, any>;
  httpStatus?: number;
  retryCount: number;
  isRetryable: boolean;
  metadata?: Record<string, any>;
}

export interface ErrorWorkflow {
  id: string;
  name: string;
  description?: string;
  triggerConditions: ErrorTriggerCondition[];
  workflowId: string; // the error handling workflow to execute
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ErrorTriggerCondition {
  errorTypes?: ErrorType[];
  severities?: ErrorSeverity[];
  workflowIds?: string[]; // specific workflows to monitor
  nodeTypes?: string[]; // specific node types
  customCondition?: string; // JavaScript expression
}

export interface ErrorRecovery {
  id: string;
  errorId: string;
  strategy: RecoveryStrategy;
  status: RecoveryStatus;
  attempts: number;
  lastAttempt?: Date;
  nextAttempt?: Date;
  recoveredAt?: Date;
  recoveredBy?: string; // user ID or 'system'
}

export enum RecoveryStrategy {
  RETRY = 'retry',
  SKIP_NODE = 'skip_node',
  USE_DEFAULT_VALUE = 'use_default_value',
  EXECUTE_FALLBACK_WORKFLOW = 'execute_fallback_workflow',
  MANUAL_INTERVENTION = 'manual_intervention',
  ROLLBACK = 'rollback',
}

export enum RecoveryStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  ABANDONED = 'abandoned',
}

export interface ErrorAlert {
  id: string;
  errorId: string;
  severity: ErrorSeverity;
  title: string;
  message: string;
  workflowId: string;
  executionId: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  channels: AlertChannel[];
}

export enum AlertChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  SMS = 'sms',
  PUSH_NOTIFICATION = 'push_notification',
  IN_APP = 'in_app',
}

export interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByWorkflow: Array<{
    workflowId: string;
    workflowName: string;
    count: number;
  }>;
  errorsByNode: Array<{
    nodeType: string;
    count: number;
  }>;
  retryStatistics: {
    totalRetries: number;
    successfulRetries: number;
    failedRetries: number;
    averageRetries: number;
  };
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface CreateErrorWorkflowRequest {
  name: string;
  description?: string;
  triggerConditions: ErrorTriggerCondition[];
  workflowId: string;
  priority?: number;
}

export interface UpdateErrorWorkflowRequest {
  name?: string;
  description?: string;
  triggerConditions?: ErrorTriggerCondition[];
  workflowId?: string;
  enabled?: boolean;
  priority?: number;
}

export interface ErrorQueryFilter {
  startDate?: Date;
  endDate?: Date;
  errorTypes?: ErrorType[];
  severities?: ErrorSeverity[];
  workflowIds?: string[];
  nodeTypes?: string[];
  executionIds?: string[];
  isRetryable?: boolean;
  minRetryCount?: number;
  limit?: number;
  offset?: number;
}

export interface RetryExecutionRequest {
  errorId: string;
  strategy?: RecoveryStrategy;
  forceRetry?: boolean; // retry even if not retryable
  customInput?: Record<string, any>; // override input data
}

export interface ErrorResolutionRequest {
  errorId: string;
  resolution: ErrorResolution;
  notes?: string;
}

export enum ErrorResolution {
  FIXED = 'fixed',
  IGNORED = 'ignored',
  WORKROUND = 'workaround',
  ESCALATED = 'escalated',
  DUPLICATE = 'duplicate',
}

export interface ErrorDashboardMetrics {
  current: {
    activeErrors: number;
    criticalErrors: number;
    pendingRecoveries: number;
  };
  trends: {
    errorRate: number; // errors per hour
    recoveryRate: number; // percentage
    mttr: number; // mean time to recovery (minutes)
  };
  topErrors: Array<{
    type: ErrorType;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  recentErrors: WorkflowError[];
}
