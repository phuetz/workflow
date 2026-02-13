export interface LLMProvider {
  id: string;
  name: string;
  description: string;
  type: 'openai' | 'anthropic' | 'google' | 'local' | 'azure' | 'custom';
  status: 'active' | 'inactive' | 'error';
  models: LLMModel[];
  config: LLMConfig;
  capabilities: LLMCapabilities;
  pricing: LLMPricing;
  limits: LLMLimits;
  createdAt: string;
  updatedAt: string;
}

export interface LLMModel {
  id: string;
  name: string;
  providerId: string;
  version: string;
  description: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'multimodal';
  capabilities: ModelCapabilities;
  contextLength: number;
  maxTokens: number;
  costPerToken: {
    input: number;
    output: number;
  };
  performance: ModelPerformance;
  status: 'available' | 'deprecated' | 'beta' | 'maintenance';
  tags: string[];
}

export interface ModelCapabilities {
  textGeneration: boolean;
  codeGeneration: boolean;
  reasoning: boolean;
  planning: boolean;
  imageAnalysis: boolean;
  functionCalling: boolean;
  jsonMode: boolean;
  streaming: boolean;
  embedding: boolean;
  fineTuning: boolean;
}

export interface ModelPerformance {
  averageLatency: number; // ms
  tokensPerSecond: number;
  reliability: number; // 0-1
  accuracy: number; // 0-1
  lastBenchmark: string;
}

export interface LLMConfig {
  apiKey?: string;
  baseUrl?: string;
  organization?: string;
  project?: string;
  region?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface LLMCapabilities {
  streaming: boolean;
  functionCalling: boolean;
  imageInput: boolean;
  audioInput: boolean;
  videoInput: boolean;
  jsonMode: boolean;
  systemMessages: boolean;
  toolUse: boolean;
  contextWindow: number;
  batchProcessing: boolean;
  fineTuning: boolean;
}

export interface LLMPricing {
  model: string;
  currency: string;
  inputTokenPrice: number;
  outputTokenPrice: number;
  imagePrice?: number;
  audioPrice?: number;
  videoPrice?: number;
  monthlyMinimum?: number;
  freeTokens?: number;
}

export interface LLMLimits {
  maxRequestsPerMinute: number;
  maxTokensPerMinute: number;
  maxConcurrentRequests: number;
  maxContextLength: number;
  maxResponseTokens: number;
  dailyLimit?: number;
  monthlyLimit?: number;
}

export interface LLMRequest {
  id: string;
  providerId: string;
  modelId: string;
  messages: LLMMessage[];
  config: LLMRequestConfig;
  tools?: LLMTool[];
  timestamp: string;
  userId: string;
  organizationId: string;
  workflowId?: string;
  nodeId?: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | LLMContent[];
  name?: string;
  toolCallId?: string;
  toolCalls?: LLMToolCall[];
}

export interface LLMContent {
  type: 'text' | 'image' | 'audio' | 'video';
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
}

export interface LLMRequestConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  stopSequences?: string[];
  presencePenalty?: number;
  frequencyPenalty?: number;
  seed?: number;
  stream?: boolean;
  jsonMode?: boolean;
  responseFormat?: 'text' | 'json' | 'structured';
}

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: unknown; // JSON Schema
  };
}

export interface LLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMResponse {
  id: string;
  requestId: string;
  providerId: string;
  modelId: string;
  content: string;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'error';
  usage: LLMUsage;
  toolCalls?: LLMToolCall[];
  timestamp: string;
  latency: number;
  cached: boolean;
  metadata?: Record<string, unknown>;
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  currency: string;
}

export interface LLMError {
  code: string;
  message: string;
  type: 'auth' | 'rate_limit' | 'invalid_request' | 'server_error' | 'network_error';
  retryable: boolean;
  retryAfter?: number;
  details?: unknown;
}

export interface LLMStreamChunk {
  id: string;
  requestId: string;
  delta: string;
  finishReason?: string;
  usage?: Partial<LLMUsage>;
  toolCalls?: LLMToolCall[];
}

export interface LLMBenchmark {
  id: string;
  modelId: string;
  testSuite: string;
  metrics: {
    accuracy: number;
    latency: number;
    throughput: number;
    cost: number;
  };
  results: BenchmarkResult[];
  timestamp: string;
}

export interface BenchmarkResult {
  testName: string;
  score: number;
  details: unknown;
}

export interface LLMPool {
  id: string;
  name: string;
  description: string;
  providers: LLMProvider[];
  strategy: 'round_robin' | 'least_latency' | 'least_cost' | 'best_quality' | 'custom';
  fallbackEnabled: boolean;
  fallbackOrder: string[];
  healthCheck: boolean;
  monitoring: boolean;
  config: PoolConfig;
}

export interface PoolConfig {
  maxRetries: number;
  timeout: number;
  healthCheckInterval: number;
  failureThreshold: number;
  recoveryTime: number;
  loadBalancing: {
    algorithm: 'round_robin' | 'weighted' | 'least_connections' | 'random';
    weights?: Record<string, number>;
  };
}

export interface LLMMetrics {
  providerId: string;
  modelId: string;
  period: string;
  requests: number;
  tokens: number;
  cost: number;
  averageLatency: number;
  successRate: number;
  errorRate: number;
  errors: Record<string, number>;
  timestamp: string;
}

export interface LLMCache {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'fifo' | 'lfu';
  compression: boolean;
  sharedCache: boolean;
}

export interface LLMSecurity {
  encryption: boolean;
  tokenFilter: boolean;
  contentFilter: boolean;
  auditLogging: boolean;
  accessControl: boolean;
  rateLimiting: boolean;
  ddosProtection: boolean;
}

export interface LLMMonitoring {
  enabled: boolean;
  metrics: string[];
  alerting: {
    enabled: boolean;
    thresholds: Record<string, number>;
    webhooks: string[];
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    retention: number;
  };
}

export interface LLMConfigTemplate {
  id: string;
  name: string;
  description: string;
  type: 'chat' | 'completion' | 'embedding' | 'classification' | 'custom';
  config: LLMRequestConfig;
  systemPrompt?: string;
  examples?: LLMExample[];
  tags: string[];
}

export interface LLMExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface LLMWorkflow {
  id: string;
  name: string;
  description: string;
  steps: LLMWorkflowStep[];
  config: LLMWorkflowConfig;
  createdAt: string;
  updatedAt: string;
}

export interface LLMWorkflowStep {
  id: string;
  name: string;
  type: 'llm' | 'tool' | 'condition' | 'loop' | 'parallel';
  config: unknown;
  inputs: string[];
  outputs: string[];
  nextSteps: string[];
}

export interface LLMWorkflowConfig {
  concurrency: number;
  timeout: number;
  retryPolicy: {
    maxRetries: number;
    backoffFactor: number;
  };
  errorHandling: 'stop' | 'continue' | 'retry';
}

export interface LLMOptimization {
  enabled: boolean;
  strategies: OptimizationStrategy[];
  metrics: OptimizationMetric[];
  autotune: boolean;
  schedule: string;
}

export interface OptimizationStrategy {
  name: string;
  type: 'model_selection' | 'parameter_tuning' | 'prompt_optimization' | 'caching';
  config: unknown;
  enabled: boolean;
}

export interface OptimizationMetric {
  name: string;
  weight: number;
  target: 'minimize' | 'maximize';
  threshold?: number;
}