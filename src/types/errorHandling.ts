/**
 * Advanced Error Handling and Recovery Types
 * Comprehensive error management, recovery strategies, and fault tolerance
 */

export interface WorkflowError {
  id: string;
  code: string;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: Date;
  workflowId: string;
  executionId: string;
  nodeId?: string;
  context: ErrorContext;
  stack?: string;
  cause?: WorkflowError;
  recoverable: boolean;
  retryable: boolean;
  userActionRequired: boolean;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical' | 'fatal';

export type ErrorCategory = 
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'timeout'
  | 'rate_limit'
  | 'resource'
  | 'data'
  | 'configuration'
  | 'system'
  | 'external_service'
  | 'user_input'
  | 'logic'
  | 'security';

export interface ErrorContext {
  environment: 'development' | 'staging' | 'production';
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  requestId?: string;
  sessionId?: string;
  nodeConfig?: Record<string, unknown>;
  inputData?: unknown;
  variables?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  applicable: (error: WorkflowError) => boolean;
  execute: (error: WorkflowError, context: RecoveryContext) => Promise<RecoveryResult>;
  config: RecoveryConfig;
  priority: number;
}

export interface RecoveryConfig {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number;
  backoffStrategy: BackoffStrategy;
  conditions: RecoveryCondition[];
  skipConditions?: RecoveryCondition[];
  timeout: number;
  parallel: boolean; // Can run parallel to other strategies
}

export type BackoffStrategy = 'linear' | 'exponential' | 'fixed' | 'custom';

export interface RecoveryCondition {
  field: string; // Error field to check
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
  value: unknown;
  description?: string;
}

export interface RecoveryContext {
  workflowId: string;
  executionId: string;
  nodeId?: string;
  attemptNumber: number;
  previousAttempts: RecoveryAttempt[];
  variables: Map<string, unknown>;
  config: Record<string, unknown>;
  environment: 'development' | 'staging' | 'production';
}

export interface RecoveryAttempt {
  strategyId: string;
  attemptNumber: number;
  timestamp: Date;
  result: RecoveryResult;
  duration: number;
  error?: WorkflowError;
}

export interface RecoveryResult {
  success: boolean;
  action: RecoveryAction;
  message: string;
  data?: unknown;
  nextRetryDelay?: number;
  shouldContinue: boolean;
  modifiedContext?: Partial<RecoveryContext>;
  newError?: WorkflowError;
  recommendations?: string[];
}

export type RecoveryAction = 
  | 'retry'
  | 'skip_node'
  | 'use_fallback'
  | 'use_cached_data'
  | 'wait_and_retry'
  | 'escalate'
  | 'fail_gracefully'
  | 'rollback'
  | 'switch_endpoint'
  | 'reduce_load'
  | 'refresh_credentials'
  | 'clear_cache'
  | 'restart_service';

export interface ErrorPattern {
  id: string;
  name: string;
  description: string;
  conditions: RecoveryCondition[];
  commonCauses: string[];
  recommendedActions: string[];
  preventionTips: string[];
  severity: ErrorSeverity;
  frequency: number;
  lastSeen: Date;
  examples: WorkflowError[];
}

export interface CircuitBreaker {
  id: string;
  name: string;
  serviceUrl?: string;
  nodeType?: string;
  state: CircuitBreakerState;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  halfOpenMaxCalls: number;
  metrics: CircuitBreakerMetrics;
  lastStateChange: Date;
  config: CircuitBreakerConfig;
}

export type CircuitBreakerState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  consecutiveFailures: number;
  averageResponseTime: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  slidingWindowSize: number;
  minimumNumberOfCalls: number;
  slowCallDurationThreshold: number;
  slowCallRateThreshold: number;
  automaticTransitionFromOpenToHalfOpenEnabled: boolean;
  waitDurationInOpenState: number;
}

export interface FaultTolerance {
  workflowId: string;
  config: FaultToleranceConfig;
  strategies: RecoveryStrategy[];
  circuitBreakers: CircuitBreaker[];
  bulkheads: Bulkhead[];
  rateLimiters: RateLimiter[];
  healthChecks: HealthCheck[];
  metrics: FaultToleranceMetrics;
}

export interface FaultToleranceConfig {
  enabled: boolean;
  maxConcurrentRecoveries: number;
  defaultTimeout: number;
  enableCircuitBreakers: boolean;
  enableBulkheads: boolean;
  enableRateLimiting: boolean;
  enableHealthChecks: boolean;
  gracefulDegradation: boolean;
  emergencyMode: boolean;
}

export interface Bulkhead {
  id: string;
  name: string;
  maxConcurrentCalls: number;
  maxWaitTime: number;
  queueCapacity: number;
  currentCalls: number;
  queuedCalls: number;
  rejectedCalls: number;
  averageWaitTime: number;
}

export interface RateLimiter {
  id: string;
  name: string;
  limit: number;
  window: number; // milliseconds
  currentCount: number;
  windowStart: Date;
  strategy: 'token_bucket' | 'sliding_window' | 'fixed_window';
  burst: boolean;
  burstCapacity?: number;
}

export interface HealthCheck {
  id: string;
  name: string;
  url?: string;
  nodeType?: string;
  interval: number;
  timeout: number;
  retries: number;
  status: HealthStatus;
  lastCheck: Date;
  lastSuccess?: Date;
  lastFailure?: Date;
  consecutiveFailures: number;
  metrics: HealthMetrics;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthMetrics {
  uptime: number;
  availability: number; // percentage
  averageResponseTime: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
}

export interface FaultToleranceMetrics {
  totalErrors: number;
  recoveredErrors: number;
  unrecoveredErrors: number;
  averageRecoveryTime: number;
  recoverySuccessRate: number;
  mostCommonErrors: Array<{ code: string; count: number; category: ErrorCategory }>;
  errorTrends: Array<{ timestamp: Date; errorCount: number; recoveryCount: number }>;
  systemHealth: {
    overall: HealthStatus;
    components: Record<string, HealthStatus>;
  };
}

export interface ErrorDashboard {
  timeRange: { start: Date; end: Date };
  summary: {
    totalErrors: number;
    errorRate: number;
    recoveryRate: number;
    averageResolutionTime: number;
    criticalErrors: number;
    systemHealth: HealthStatus;
  };
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  topErrors: Array<{
    code: string;
    message: string;
    count: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  recoveryStrategies: Array<{
    strategyId: string;
    name: string;
    successRate: number;
    averageTime: number;
    usageCount: number;
  }>;
  systemComponents: Array<{
    name: string;
    status: HealthStatus;
    uptime: number;
    errorCount: number;
  }>;
  timeline: Array<{
    timestamp: Date;
    errors: number;
    recoveries: number;
    criticalEvents: number;
  }>;
}

export interface ErrorHandlingService {
  // Error Management
  logError(error: WorkflowError): Promise<void>;
  getError(errorId: string): Promise<WorkflowError | null>;
  getErrors(filters: ErrorFilters): Promise<WorkflowError[]>;
  updateError(errorId: string, updates: Partial<WorkflowError>): Promise<void>;
  deleteError(errorId: string): Promise<void>;
  
  // Recovery Strategies
  registerRecoveryStrategy(strategy: RecoveryStrategy): Promise<void>;
  removeRecoveryStrategy(strategyId: string): Promise<void>;
  executeRecovery(error: WorkflowError): Promise<RecoveryResult>;
  getRecoveryHistory(errorId: string): Promise<RecoveryAttempt[]>;
  
  // Circuit Breakers
  createCircuitBreaker(config: Omit<CircuitBreaker, 'id' | 'metrics' | 'lastStateChange'>): Promise<CircuitBreaker>;
  updateCircuitBreaker(breakerId: string, updates: Partial<CircuitBreaker>): Promise<void>;
  getCircuitBreaker(breakerId: string): Promise<CircuitBreaker | null>;
  checkCircuitBreaker(breakerId: string): Promise<boolean>;
  recordCircuitBreakerCall(breakerId: string, success: boolean, duration: number): Promise<void>;
  
  // Fault Tolerance
  enableFaultTolerance(workflowId: string, config: FaultToleranceConfig): Promise<void>;
  disableFaultTolerance(workflowId: string): Promise<void>;
  getFaultTolerance(workflowId: string): Promise<FaultTolerance | null>;
  
  // Health Checks
  createHealthCheck(healthCheck: Omit<HealthCheck, 'id' | 'metrics' | 'lastCheck'>): Promise<HealthCheck>;
  performHealthCheck(healthCheckId: string): Promise<HealthStatus>;
  getSystemHealth(): Promise<{ overall: HealthStatus; components: Record<string, HealthStatus> }>;
  
  // Pattern Recognition
  detectErrorPatterns(): Promise<ErrorPattern[]>;
  createErrorPattern(pattern: Omit<ErrorPattern, 'id' | 'frequency' | 'lastSeen' | 'examples'>): Promise<ErrorPattern>;
  
  // Metrics and Analytics
  getErrorDashboard(timeRange: { start: Date; end: Date }): Promise<ErrorDashboard>;
  getMetrics(workflowId?: string): Promise<FaultToleranceMetrics>;
  exportErrorReport(filters: ErrorFilters): Promise<string>; // CSV format
}

export interface ErrorFilters {
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  severity?: ErrorSeverity[];
  category?: ErrorCategory[];
  code?: string[];
  timeRange?: { start: Date; end: Date };
  recoverable?: boolean;
  retryable?: boolean;
  resolved?: boolean;
  limit?: number;
  offset?: number;
}

export interface ErrorNotification {
  id: string;
  errorId: string;
  type: NotificationType;
  recipients: string[];
  subject: string;
  message: string;
  channels: NotificationChannel[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sentAt: Date;
  delivered: boolean;
  acknowledged: boolean;
}

export type NotificationType = 'immediate' | 'escalation' | 'summary' | 'recovery_failed' | 'pattern_detected';

export type NotificationChannel = 'email' | 'sms' | 'slack' | 'webhook' | 'push' | 'in_app';