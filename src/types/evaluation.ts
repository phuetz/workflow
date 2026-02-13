/**
 * AI Workflow Evaluation Framework Types
 * Comprehensive types for evaluating AI workflows with customizable metrics
 */

export type MetricType =
  | 'correctness'
  | 'toxicity'
  | 'bias'
  | 'toolCalling'
  | 'latency'
  | 'cost'
  | 'custom';

export type BiasCategory = 'gender' | 'race' | 'age' | 'religion' | 'disability';

export type EvaluationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type ComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'contains' | 'notContains';

/**
 * Base metric configuration
 */
export interface MetricConfig {
  id: string;
  type: MetricType;
  name: string;
  description: string;
  enabled: boolean;
  weight: number; // 0-1, for weighted scoring
  threshold?: number; // Pass/fail threshold
  thresholdOperator?: ComparisonOperator;
  config?: Record<string, unknown>; // Metric-specific config
}

/**
 * Correctness metric config (LLM-based)
 */
export interface CorrectnessMetricConfig extends MetricConfig {
  type: 'correctness';
  config: {
    llmProvider: 'openai' | 'anthropic' | 'google' | 'azure';
    model: string;
    temperature: number;
    prompt?: string; // Custom evaluation prompt
    criteria?: string[]; // Evaluation criteria
  };
}

/**
 * Toxicity metric config
 */
export interface ToxicityMetricConfig extends MetricConfig {
  type: 'toxicity';
  config: {
    provider: 'perspective' | 'local' | 'llm';
    apiKey?: string;
    categories?: string[]; // toxic, severe_toxic, obscene, threat, insult, identity_hate
    threshold?: number;
  };
}

/**
 * Bias metric config
 */
export interface BiasMetricConfig extends MetricConfig {
  type: 'bias';
  config: {
    categories: BiasCategory[];
    method: 'llm' | 'statistical' | 'embedding';
    llmProvider?: string;
    model?: string;
  };
}

/**
 * Tool calling metric config
 */
export interface ToolCallingMetricConfig extends MetricConfig {
  type: 'toolCalling';
  config: {
    expectedTools?: string[]; // Expected tool names
    requireAllTools?: boolean;
    validateParameters?: boolean;
    parameterSchema?: Record<string, unknown>;
  };
}

/**
 * Latency metric config
 */
export interface LatencyMetricConfig extends MetricConfig {
  type: 'latency';
  config: {
    maxLatency?: number; // milliseconds
    includeNodeLatency?: boolean;
    trackPerNode?: boolean;
  };
}

/**
 * Cost metric config
 */
export interface CostMetricConfig extends MetricConfig {
  type: 'cost';
  config: {
    maxCost?: number; // USD
    trackTokenUsage?: boolean;
    includeAPICallCosts?: boolean;
    customPricing?: Record<string, { input: number; output: number }>;
  };
}

/**
 * Test input for evaluation
 */
export interface EvaluationInput {
  id: string;
  name: string;
  description?: string;
  data: Record<string, unknown>; // Input data for workflow
  expectedOutput?: unknown; // Expected result
  metadata?: Record<string, unknown>;
}

/**
 * Metric result from a single evaluation
 */
export interface MetricResult {
  metricId: string;
  metricType: MetricType;
  metricName: string;
  score: number; // 0-1
  passed: boolean;
  threshold?: number;
  actualValue?: number | string | Record<string, unknown>;
  expectedValue?: unknown;
  details?: Record<string, unknown>;
  feedback?: string;
  timestamp: Date;
  executionTime?: number; // milliseconds
}

/**
 * Single evaluation result
 */
export interface EvaluationResult {
  id: string;
  evaluationId: string;
  inputId: string;
  inputName: string;
  status: EvaluationStatus;
  overallScore: number; // Weighted average of all metrics
  passed: boolean;
  metrics: MetricResult[];
  workflowOutput?: unknown;
  executionData?: {
    executionId?: string;
    startTime: Date;
    endTime: Date;
    duration: number; // milliseconds
    nodeResults?: Record<string, unknown>;
    errors?: Array<{ nodeId: string; message: string }>;
  };
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Evaluation definition
 */
export interface Evaluation {
  id: string;
  name: string;
  description?: string;
  workflowId: string;
  workflowVersion?: string;
  metrics: MetricConfig[];
  inputs: EvaluationInput[];
  schedule?: {
    enabled: boolean;
    cron: string;
    timezone?: string;
  };
  notifications?: {
    onFailure: boolean;
    onSuccess: boolean;
    channels: Array<{ type: 'email' | 'slack' | 'webhook'; config: Record<string, unknown> }>;
  };
  settings?: {
    parallel: boolean;
    maxParallel?: number;
    timeout?: number; // milliseconds
    retryOnFailure?: boolean;
    maxRetries?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/**
 * Test suite grouping multiple evaluations
 */
export interface TestSuite {
  id: string;
  name: string;
  description?: string;
  evaluations: string[]; // Evaluation IDs
  settings?: {
    runSequentially: boolean;
    stopOnFailure: boolean;
    timeout?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Evaluation run
 */
export interface EvaluationRun {
  id: string;
  evaluationId: string;
  evaluationName: string;
  status: EvaluationStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  results: EvaluationResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    averageScore: number;
    metrics: Record<string, { average: number; min: number; max: number }>;
  };
  triggeredBy?: 'manual' | 'schedule' | 'api' | 'webhook';
  triggeredByUser?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Test suite run
 */
export interface TestSuiteRun {
  id: string;
  suiteId: string;
  suiteName: string;
  status: EvaluationStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  evaluationRuns: EvaluationRun[];
  summary: {
    totalEvaluations: number;
    passed: number;
    failed: number;
    totalTests: number;
    testsPassed: number;
    testsFailed: number;
  };
  triggeredBy?: 'manual' | 'schedule' | 'api';
  triggeredByUser?: string;
}

/**
 * Evaluation comparison for tracking changes over time
 */
export interface EvaluationComparison {
  evaluationId: string;
  baselineRunId: string;
  currentRunId: string;
  baselineRun: EvaluationRun;
  currentRun: EvaluationRun;
  comparison: {
    scoreDelta: number;
    passRateDelta: number;
    metricDeltas: Record<string, number>;
    regressions: Array<{
      inputId: string;
      inputName: string;
      metricType: MetricType;
      baselineScore: number;
      currentScore: number;
      delta: number;
    }>;
    improvements: Array<{
      inputId: string;
      inputName: string;
      metricType: MetricType;
      baselineScore: number;
      currentScore: number;
      delta: number;
    }>;
  };
  timestamp: Date;
}

/**
 * Metric registry entry
 */
export interface RegisteredMetric {
  type: MetricType;
  name: string;
  description: string;
  defaultConfig: Partial<MetricConfig>;
  validator: (config: MetricConfig) => boolean;
  executor: (input: EvaluationInput, output: unknown, config: MetricConfig, context?: EvaluationContext) => Promise<MetricResult>;
}

/**
 * Evaluation context
 */
export interface EvaluationContext {
  workflowId: string;
  executionId?: string;
  nodeResults?: Record<string, unknown>;
  startTime: Date;
  services?: {
    llm?: unknown; // LLMService
    storage?: unknown;
    logger?: unknown;
  };
}

/**
 * Debug data pinning
 */
export interface PinnedData {
  id: string;
  evaluationId: string;
  evaluationResultId: string;
  inputId: string;
  nodeId: string;
  data: unknown;
  timestamp: Date;
  metadata?: {
    reason?: 'failure' | 'manual' | 'interesting';
    notes?: string;
  };
}

/**
 * Evaluation report export options
 */
export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'html';
  includeDetails: boolean;
  includeCharts: boolean;
  includeRawData: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: {
    status?: EvaluationStatus[];
    minScore?: number;
    maxScore?: number;
    metrics?: MetricType[];
  };
}

/**
 * Evaluation statistics for dashboard
 */
export interface EvaluationStats {
  evaluationId: string;
  evaluationName: string;
  totalRuns: number;
  lastRun?: Date;
  averageScore: number;
  passRate: number; // 0-1
  averageDuration: number; // milliseconds
  metricStats: Record<MetricType, {
    average: number;
    min: number;
    max: number;
    trend: 'improving' | 'declining' | 'stable';
  }>;
  recentRuns: Array<{
    runId: string;
    timestamp: Date;
    score: number;
    passed: boolean;
  }>;
}
