/**
 * LLMOps Types & Interfaces
 * Complete type definitions for LLM operations, fine-tuning, prompt management, and monitoring
 */

// ============================================================================
// MODEL TYPES
// ============================================================================

export type ModelProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure'
  | 'aws-bedrock'
  | 'ollama';

export interface ModelMetadata {
  id: string;
  provider: ModelProvider;
  name: string;
  version: string;

  // Capabilities
  capabilities: {
    chat: boolean;
    completion: boolean;
    embedding: boolean;
    fineTuning: boolean;
    vision: boolean;
    functionCalling: boolean;
  };

  // Limits
  contextWindow: number;
  maxTokens: number;

  // Pricing (per 1K tokens)
  pricing: {
    input: number;
    output: number;
  };

  // Performance
  averageLatency: number; // ms
  throughput: number; // tokens/sec

  // Metadata
  tags: string[];
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// FINE-TUNING TYPES
// ============================================================================

export interface TrainingExample {
  prompt: string;
  completion: string;
  metadata?: Record<string, any>;
}

export interface Dataset {
  id: string;
  name: string;
  format: 'jsonl' | 'csv';
  examples: TrainingExample[];

  // Statistics
  stats: {
    totalExamples: number;
    avgPromptLength: number;
    avgCompletionLength: number;
    minPromptLength: number;
    maxPromptLength: number;
    minCompletionLength: number;
    maxCompletionLength: number;
    tokenCount: number;
    totalTokens: number;
    avgTokensPerExample: number;
    uniquePrompts: number;
    duplicates: number;
  };

  // Split
  split?: {
    train: TrainingExample[];
    validation: TrainingExample[];
    test: TrainingExample[];
  };

  createdAt: Date;
}

export interface FineTuneConfig {
  // Model
  baseModel: string;
  modelName: string;

  // Dataset
  datasetId: string;

  // Hyperparameters
  hyperparameters: {
    epochs?: number;
    batchSize?: number;
    learningRate?: number;
    warmupSteps?: number;

    // LoRA-specific
    loraRank?: number;
    loraAlpha?: number;
    loraDropout?: number;
  };

  // Training method
  method: 'full' | 'lora' | 'qlora';

  // Validation
  validationSplit?: number;
  earlyStoppingPatience?: number;

  // Advanced
  seed?: number;
  gradientAccumulationSteps?: number;
  maxGradNorm?: number;
}

export interface FineTuneJob {
  id: string;
  config: FineTuneConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  // Progress
  progress: {
    currentEpoch: number;
    totalEpochs: number;
    currentStep: number;
    totalSteps: number;
    percentComplete: number;
  };

  // Metrics
  metrics: {
    trainingLoss: number[];
    validationLoss: number[];
    trainingAccuracy?: number[];
    validationAccuracy?: number[];
  };

  // Results
  fineTunedModelId?: string;
  error?: string;

  // Timestamps
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface EvaluationMetrics {
  // Loss metrics
  loss: number;
  perplexity: number;

  // Accuracy metrics
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;

  // Quality metrics
  bleuScore?: number;
  rougeScore?: {
    rouge1: number;
    rouge2: number;
    rougeL: number;
  };

  // Token metrics
  avgTokensPerResponse: number;

  // Custom metrics
  customMetrics?: Record<string, number>;

  // Test results
  testResults?: {
    input: string;
    expected: string;
    actual: string;
    score: number;
  }[];
}

export interface HyperparameterTuning {
  method: 'grid-search' | 'random-search' | 'bayesian';

  // Search space
  searchSpace: {
    learningRate: number[];
    batchSize: number[];
    epochs: number[];
  };

  // Results
  trials: {
    hyperparameters: Record<string, any>;
    metrics: EvaluationMetrics;
    score: number;
  }[];

  // Best configuration
  bestConfig?: Record<string, any>;
  bestScore?: number;
}

// ============================================================================
// PROMPT TYPES
// ============================================================================

export interface Variable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

export interface Example {
  variables: Record<string, any>;
  expectedOutput: string;
  explanation?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string; // Template with {{variables}}

  // Variables
  variables: Variable[];

  // Few-shot examples
  examples: Example[];

  // Model configuration
  modelConfig: {
    model: string;
    temperature: number;
    maxTokens: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
  };

  // Versioning
  version: string;
  previousVersion?: string;

  // Metadata
  tags: string[];
  author: string;
  status: 'draft' | 'active' | 'archived';

  // Analytics
  analytics?: {
    totalUses: number;
    avgLatency: number;
    avgCost: number;
    avgQualityScore: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface PromptVersion {
  version: string;
  promptId: string;
  template: string;
  changelog: string;
  author: string;
  createdAt: Date;
}

export interface PromptDiff {
  from: string;
  to: string;
  changes: {
    type: 'added' | 'removed' | 'modified';
    path: string;
    oldValue?: any;
    newValue?: any;
  }[];
}

export interface PromptTestCase {
  id: string;
  name: string;
  variables: Record<string, any>;
  expectedOutput?: string;
  expectedPatterns?: string[]; // Regex patterns
  minQualityScore?: number;
}

export interface PromptTestResult {
  testCaseId: string;
  passed: boolean;
  output: string;
  qualityScore: number;
  latency: number;
  cost: number;
  errors?: string[];
  warnings?: string[];
}

// ============================================================================
// HALLUCINATION TYPES
// ============================================================================

export interface HallucinationResult {
  isHallucinated: boolean;
  confidence: number; // 0-1

  // Detection methods
  detectionMethods: {
    factualConsistency?: {
      score: number;
      issues: string[];
    };
    selfConsistency?: {
      score: number;
      inconsistencies: string[];
    };
    externalValidation?: {
      score: number;
      unverifiedClaims: string[];
    };
  };

  // Detailed analysis
  claims: Claim[];

  // Recommendations
  recommendations: string[];
}

export interface Claim {
  text: string;
  verified: boolean;
  confidence: number;
  sources?: string[];
  reasoning?: string;
}

export interface ConfidenceScore {
  overall: number;

  // Component scores
  factualAccuracy: number;
  consistency: number;
  coherence: number;
  completeness: number;

  // Flags
  flags: {
    type: 'warning' | 'error';
    message: string;
    location?: string;
  }[];
}

export interface FactCheckResult {
  verified: boolean;
  confidence: number;

  // Per-claim results
  claims: {
    claim: string;
    verified: boolean;
    sources: {
      url: string;
      title: string;
      relevance: number;
      supports: boolean;
    }[];
  }[];

  // Overall assessment
  assessment: string;
  reliability: 'high' | 'medium' | 'low';
}

export interface ConsistencyScore {
  score: number; // 0-1

  // Agreement between responses
  agreement: number;

  // Inconsistencies
  inconsistencies: {
    question: string;
    responses: string[];
    explanation: string;
  }[];
}

// ============================================================================
// MONITORING TYPES
// ============================================================================

export interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
}

export interface ModelMetrics {
  modelId: string;
  timeRange: TimeRange;

  // Performance metrics
  latency: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    max: number;
  };

  // Token usage
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    avgInputTokens: number;
    avgOutputTokens: number;
  };

  // Cost tracking
  cost: {
    totalCost: number;
    inputCost: number;
    outputCost: number;
    avgCostPerRequest: number;
  };

  // Quality metrics
  quality: {
    avgUserRating?: number;
    avgAutomatedScore?: number;
    errorRate: number;
    successRate: number;
  };

  // Request metrics
  requests: {
    total: number;
    successful: number;
    failed: number;
    retried: number;
  };
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface Baseline {
  modelId: string;
  metrics: ModelMetrics;
  capturedAt: Date;
}

export interface ModelBehavior {
  modelId: string;
  metrics: ModelMetrics;
  patterns: {
    commonInputs: string[];
    commonOutputPatterns: string[];
    errorPatterns: string[];
  };
}

export interface DriftReport {
  isDrifting: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';

  // Drift analysis
  driftMetrics: {
    latencyDrift: number; // % change
    qualityDrift: number;
    errorRateDrift: number;
    behaviorDrift: number;
  };

  // Recommendations
  recommendations: string[];

  // Detailed findings
  findings: {
    category: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
  }[];

  detectedAt: Date;
}

export interface AlertCondition {
  id: string;
  name: string;
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;

  // Actions
  actions: {
    type: 'email' | 'slack' | 'webhook' | 'pagerduty';
    config: Record<string, any>;
  }[];

  // State
  enabled: boolean;
  triggeredCount: number;
  lastTriggered?: Date;
}

export interface PerformanceReport {
  modelId: string;
  timeRange: TimeRange;

  // Summary
  summary: {
    totalRequests: number;
    totalCost: number;
    avgLatency: number;
    successRate: number;
  };

  // Detailed metrics
  metrics: ModelMetrics;

  // Trends
  trends: {
    latencyTrend: 'improving' | 'stable' | 'degrading';
    costTrend: 'improving' | 'stable' | 'degrading';
    qualityTrend: 'improving' | 'stable' | 'degrading';
  };

  // Anomalies
  anomalies: {
    timestamp: Date;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];

  generatedAt: Date;
}

// ============================================================================
// A/B TESTING TYPES
// ============================================================================

export interface PromptABTest {
  id: string;
  name: string;
  description: string;

  // Variants
  promptA: PromptTemplate; // Control
  promptB: PromptTemplate; // Variant

  // Configuration
  trafficSplit: number; // 0-1 (proportion to variant B)

  // Status
  status: 'draft' | 'running' | 'completed' | 'cancelled';

  // Metrics to compare
  metricsToCompare: ('quality' | 'latency' | 'cost' | 'satisfaction')[];

  // Sample size
  minSampleSize: number;
  currentSampleSize: {
    a: number;
    b: number;
  };

  // Results
  results?: ABTestResults;

  // Timestamps
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface ABTestResults {
  // Metrics comparison
  metricsA: {
    quality: number;
    latency: number;
    cost: number;
    satisfaction: number;
  };

  metricsB: {
    quality: number;
    latency: number;
    cost: number;
    satisfaction: number;
  };

  // Statistical analysis
  statisticalSignificance: {
    quality: StatisticalTest;
    latency: StatisticalTest;
    cost: StatisticalTest;
    satisfaction: StatisticalTest;
  };

  // Winner declaration
  winner: 'A' | 'B' | 'no-difference';
  confidence: number; // 0-1

  // Recommendations
  recommendation: string;
}

export interface StatisticalTest {
  testType: 't-test' | 'chi-square' | 'mann-whitney';
  pValue: number;
  significant: boolean; // p < 0.05
  effectSize: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

// ============================================================================
// MODEL ROUTING TYPES
// ============================================================================

export interface RoutingCriteria {
  priority: 'cost' | 'latency' | 'quality';

  // Constraints
  maxCost?: number;
  maxLatency?: number;
  minQuality?: number;

  // Model preferences
  preferredProviders?: ModelProvider[];
  excludedModels?: string[];

  // Capabilities required
  requiredCapabilities?: string[];
}

export interface RoutingDecision {
  selectedModel: string;
  provider: ModelProvider;

  // Reasoning
  reason: string;
  score: number;

  // Alternatives
  alternatives: {
    model: string;
    score: number;
    reason: string;
  }[];

  // Fallback chain
  fallbackModels: string[];
}

export interface ModelCapability {
  name: string;
  description: string;
  supported: boolean;
  metadata?: Record<string, any>;
}

// ============================================================================
// DEPLOYMENT TYPES
// ============================================================================

export interface Deployment {
  id: string;
  modelId: string;
  environment: 'dev' | 'staging' | 'prod';

  // Configuration
  config: {
    autoScaling: boolean;
    minReplicas: number;
    maxReplicas: number;

    // Rate limiting
    rateLimit?: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    };

    // Monitoring
    enableMonitoring: boolean;
    enableLogging: boolean;
  };

  // Status
  status: 'deploying' | 'active' | 'failed' | 'scaling' | 'terminated';
  health: 'healthy' | 'degraded' | 'unhealthy';

  // Endpoints
  endpoints: {
    inference: string;
    health: string;
    metrics: string;
  };

  // Timestamps
  deployedAt: Date;
  lastHealthCheck?: Date;
}

// ============================================================================
// COST ATTRIBUTION TYPES
// ============================================================================

export interface CostAttribution {
  totalCost: number;

  // By model
  byModel: {
    modelId: string;
    cost: number;
    requests: number;
    tokens: number;
  }[];

  // By user
  byUser: {
    userId: string;
    cost: number;
    requests: number;
    tokens: number;
  }[];

  // By prompt
  byPrompt: {
    promptId: string;
    cost: number;
    requests: number;
    tokens: number;
  }[];

  // Time range
  timeRange: TimeRange;
}

// ============================================================================
// QUALITY SCORING TYPES
// ============================================================================

export interface QualityScore {
  overall: number; // 0-1

  // Component scores
  relevance: number;
  coherence: number;
  fluency: number;
  factuality: number;

  // Automated checks
  automatedChecks: {
    grammarScore: number;
    toxicityScore: number;
    biasScore: number;
  };

  // User feedback
  userRating?: number;

  timestamp: Date;
}
