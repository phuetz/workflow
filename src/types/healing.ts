/**
 * Auto-Healing Workflow System Types
 *
 * Provides comprehensive type definitions for the self-diagnosing and
 * self-repairing workflow system with learning capabilities.
 */

// ============================================================================
// Error Types
// ============================================================================

export enum ErrorType {
  // Network Errors
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  DNS_FAILURE = 'DNS_FAILURE',
  SSL_ERROR = 'SSL_ERROR',

  // API Errors
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  CONFLICT = 'CONFLICT',

  // Data Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  SCHEMA_MISMATCH = 'SCHEMA_MISMATCH',
  ENCODING_ERROR = 'ENCODING_ERROR',

  // Service Errors
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TEMPORARY_FAILURE = 'TEMPORARY_FAILURE',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  DEPRECATED_API = 'DEPRECATED_API',

  // Resource Errors
  MEMORY_LIMIT = 'MEMORY_LIMIT',
  CPU_LIMIT = 'CPU_LIMIT',
  DISK_FULL = 'DISK_FULL',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',

  // Logic Errors
  INFINITE_LOOP = 'INFINITE_LOOP',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  DEADLOCK = 'DEADLOCK',

  // Unknown
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// ============================================================================
// Workflow Error
// ============================================================================

export interface WorkflowError {
  id: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  timestamp: Date;

  // Error details
  message: string;
  stack?: string;
  code?: string;
  statusCode?: number;

  // Context
  context: ErrorContext;

  // Metadata
  attempt: number;
  previousErrors?: WorkflowError[];
  relatedErrors?: WorkflowError[];
}

export interface ErrorContext {
  input?: unknown;
  output?: unknown;
  config?: Record<string, unknown>;
  environment?: Record<string, string>;
  executionTime?: number;
  memoryUsage?: number;
  retryCount?: number;

  // HTTP specific
  httpMethod?: string;
  httpUrl?: string;
  httpHeaders?: Record<string, string>;
  httpBody?: unknown;
  httpResponse?: {
    status: number;
    headers: Record<string, string>;
    body: unknown;
  };
}

// ============================================================================
// Diagnosis
// ============================================================================

export interface Diagnosis {
  errorId: string;
  errorType: ErrorType;
  rootCause: string;
  severity: ErrorSeverity;
  healable: boolean;
  confidence: number; // 0-1

  // Analysis
  analysis: {
    patterns: ErrorPattern[];
    similarErrors: string[];
    affectedNodes: string[];
    timelineAnalysis: string;
  };

  // Recommendations
  suggestedStrategies: HealingStrategyReference[];
  estimatedSuccessRate: number;
  estimatedRecoveryTime: number; // ms

  // Metadata
  diagnosisTime: number; // ms
  timestamp: Date;
}

export interface ErrorPattern {
  pattern: string;
  frequency: number;
  lastOccurrence: Date;
  averageInterval?: number; // ms between occurrences
  trending: 'increasing' | 'decreasing' | 'stable';
}

export interface HealingStrategyReference {
  strategyId: string;
  expectedSuccessRate: number;
  estimatedDuration: number; // ms
  priority: number;
  requirements?: string[];
}

// ============================================================================
// Healing Strategy
// ============================================================================

export interface HealingStrategy {
  id: string;
  name: string;
  description: string;
  category: StrategyCategory;

  // Applicability
  applicableErrors: ErrorType[];
  requiredContext?: string[];

  // Execution
  apply: (error: WorkflowError, context: HealingContext) => Promise<HealingResult>;

  // Metadata
  successRate: number; // Overall success rate (0-1)
  averageDuration: number; // ms
  priority: number; // 1-10, higher = higher priority
  costMultiplier: number; // Resource cost multiplier

  // Learning
  adaptivePriority?: number; // Learned priority based on history
  historicalData?: StrategyHistoricalData;
}

export enum StrategyCategory {
  RETRY = 'RETRY',
  FAILOVER = 'FAILOVER',
  DEGRADATION = 'DEGRADATION',
  CONFIGURATION = 'CONFIGURATION',
  RESOURCE = 'RESOURCE',
  DATA = 'DATA',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER'
}

export interface StrategyHistoricalData {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  averageSuccessTime: number;
  averageFailureTime: number;
  lastUpdated: Date;
  successByErrorType: Record<ErrorType, number>;
}

// ============================================================================
// Healing Context
// ============================================================================

export interface HealingContext {
  workflowId: string;
  executionId: string;
  nodeId: string;

  // Configuration
  maxAttempts: number;
  maxDuration: number; // ms
  allowedStrategies?: string[];
  disallowedStrategies?: string[];

  // Environment
  backupServices?: BackupService[];
  cacheAvailable: boolean;
  resourceLimits?: ResourceLimits;

  // State
  attemptNumber: number;
  startTime: Date;
  previousAttempts: HealingAttempt[];

  // Callbacks
  onProgress?: (progress: HealingProgress) => void;
  onStrategyStart?: (strategy: HealingStrategy) => void;
  onStrategyComplete?: (strategy: HealingStrategy, result: HealingResult) => void;
}

export interface BackupService {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  credentials?: string;
  healthStatus?: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked?: Date;
}

export interface ResourceLimits {
  maxMemory?: number; // bytes
  maxCpu?: number; // percentage
  maxDuration?: number; // ms
  maxRetries?: number;
}

// ============================================================================
// Healing Result
// ============================================================================

export interface HealingResult {
  success: boolean;
  strategyId: string;
  strategyName: string;

  // Execution details
  attempts: number;
  duration: number; // ms

  // Outcome
  output?: unknown;
  error?: string;
  partialSuccess?: boolean;

  // Actions taken
  actionsTaken: HealingAction[];

  // Metadata
  timestamp: Date;
  resourceUsage?: ResourceUsage;
  escalated?: boolean;
  escalationReason?: string;
}

export interface HealingAction {
  type: ActionType;
  description: string;
  timestamp: Date;
  success: boolean;
  details?: Record<string, unknown>;
}

export enum ActionType {
  RETRY = 'RETRY',
  FAILOVER = 'FAILOVER',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  CACHE_USE = 'CACHE_USE',
  TIMEOUT_ADJUST = 'TIMEOUT_ADJUST',
  PAYLOAD_REDUCE = 'PAYLOAD_REDUCE',
  AUTH_REFRESH = 'AUTH_REFRESH',
  ENDPOINT_SWITCH = 'ENDPOINT_SWITCH',
  CIRCUIT_BREAK = 'CIRCUIT_BREAK',
  DEGRADED_MODE = 'DEGRADED_MODE',
  ESCALATION = 'ESCALATION'
}

export interface ResourceUsage {
  memoryUsed: number; // bytes
  cpuUsed: number; // percentage
  networkCalls: number;
  cacheHits: number;
  cacheMisses: number;
}

// ============================================================================
// Healing Attempt
// ============================================================================

export interface HealingAttempt {
  id: string;
  strategyId: string;
  strategyName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // ms
  result: HealingResult | null;
  error?: string;
}

export interface HealingProgress {
  currentStrategy: string;
  attemptNumber: number;
  totalAttempts: number;
  elapsedTime: number; // ms
  estimatedTimeRemaining?: number; // ms
  message: string;
}

// ============================================================================
// Analytics
// ============================================================================

export interface HealingAnalytics {
  // Overall stats
  totalHealingAttempts: number;
  successfulHealings: number;
  failedHealings: number;
  successRate: number; // 0-1

  // Performance
  averageHealingTime: number; // ms
  medianHealingTime: number; // ms
  p95HealingTime: number; // ms

  // By error type
  healingByErrorType: Record<ErrorType, ErrorTypeStats>;

  // By strategy
  strategyPerformance: Record<string, StrategyPerformance>;

  // Trends
  dailyStats: DailyHealingStats[];

  // Impact
  mttrReduction: number; // percentage
  uptimeImprovement: number; // percentage
  manualInterventionReduction: number; // percentage

  // ROI
  timesSaved: number; // hours
  errorsPrevented: number;
  costSavings: number; // USD
}

export interface ErrorTypeStats {
  count: number;
  healed: number;
  failed: number;
  successRate: number;
  averageHealingTime: number;
  mostEffectiveStrategy: string;
}

export interface StrategyPerformance {
  strategyId: string;
  strategyName: string;
  timesUsed: number;
  timesSucceeded: number;
  timesFailed: number;
  successRate: number;
  averageDuration: number;
  totalTimeSaved: number; // ms
  trend: 'improving' | 'declining' | 'stable';
}

export interface DailyHealingStats {
  date: string; // YYYY-MM-DD
  attempts: number;
  successes: number;
  failures: number;
  averageTime: number;
  topErrorTypes: Array<{ type: ErrorType; count: number }>;
  topStrategies: Array<{ id: string; count: number }>;
}

// ============================================================================
// Configuration
// ============================================================================

export interface HealingConfiguration {
  enabled: boolean;

  // Global settings
  maxHealingAttempts: number;
  maxHealingDuration: number; // ms
  minConfidenceThreshold: number; // 0-1

  // Strategy settings
  enabledStrategies: string[];
  disabledStrategies: string[];
  strategyTimeout: number; // ms

  // Learning settings
  learningEnabled: boolean;
  adaptivePriority: boolean;
  minSampleSize: number; // Minimum attempts before learning

  // Escalation settings
  escalateAfterAttempts: number;
  escalateAfterDuration: number; // ms
  escalationNotifications: EscalationNotification[];

  // Monitoring
  trackAnalytics: boolean;
  detailedLogging: boolean;

  // Per-workflow overrides
  workflowOverrides?: Record<string, WorkflowHealingConfig>;
}

export interface WorkflowHealingConfig {
  enabled: boolean;
  maxAttempts?: number;
  maxDuration?: number;
  allowedStrategies?: string[];
  disallowedStrategies?: string[];
}

export interface EscalationNotification {
  channel: 'email' | 'slack' | 'webhook' | 'pagerduty';
  recipients: string[];
  severity: ErrorSeverity[];
}

// ============================================================================
// Learning
// ============================================================================

export interface LearningData {
  strategyId: string;
  errorType: ErrorType;

  // Outcome
  success: boolean;
  duration: number;
  timestamp: Date;

  // Context features
  features: LearningFeatures;

  // Feedback
  userFeedback?: 'helpful' | 'not_helpful';
  manualOverride?: boolean;
}

export interface LearningFeatures {
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  errorFrequency: number;
  nodeType: string;
  previousAttempts: number;
  serviceHealth?: 'healthy' | 'degraded' | 'unhealthy';
  loadLevel?: 'low' | 'medium' | 'high';
}

export interface LearningModel {
  version: string;
  trainedAt: Date;
  accuracy: number;

  // Strategy rankings by error type
  strategyRankings: Record<ErrorType, string[]>;

  // Confidence scores
  confidenceScores: Record<string, number>; // strategyId-errorType -> confidence

  // Feature importance
  featureWeights: Record<string, number>;
}

// ============================================================================
// Events
// ============================================================================

export interface HealingEvent {
  type: HealingEventType;
  timestamp: Date;
  workflowId: string;
  executionId: string;
  data: unknown;
}

export enum HealingEventType {
  HEALING_STARTED = 'HEALING_STARTED',
  DIAGNOSIS_COMPLETE = 'DIAGNOSIS_COMPLETE',
  STRATEGY_STARTED = 'STRATEGY_STARTED',
  STRATEGY_SUCCEEDED = 'STRATEGY_SUCCEEDED',
  STRATEGY_FAILED = 'STRATEGY_FAILED',
  HEALING_SUCCEEDED = 'HEALING_SUCCEEDED',
  HEALING_FAILED = 'HEALING_FAILED',
  ESCALATED = 'ESCALATED',
  MANUAL_INTERVENTION = 'MANUAL_INTERVENTION'
}

// ============================================================================
// Circuit Breaker
// ============================================================================

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number; // ms
  halfOpenRequests: number;
}
