// Multi-Agent AI System Types

import { LLMMessage, LLMResponse } from './llm';

// Agent Core Types
export interface Agent {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  status: AgentStatus;
  capabilities: AgentCapability[];
  config: AgentConfig;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  version: string;
  executeTask(task: AgentTask): Promise<AgentOutput>;
}

export type AgentType =
  | 'classifier'
  | 'router'
  | 'executor'
  | 'specialist'
  | 'coordinator'
  | 'monitor'
  | 'custom';

export type AgentStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'error'
  | 'initializing';

export type AgentCapability =
  | 'text-generation'
  | 'code-execution'
  | 'data-processing'
  | 'api-integration'
  | 'workflow-execution'
  | 'classification'
  | 'routing'
  | 'planning'
  | 'reasoning'
  | 'memory-management'
  | 'tool-usage'
  | 'multi-step'
  | 'collaboration';

export interface AgentConfig {
  llmModel?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: string[];
  memoryEnabled?: boolean;
  memoryType?: MemoryType[];
  maxConcurrentTasks?: number;
  timeout?: number;
  retryAttempts?: number;
  fallbackAgent?: string;
  customConfig?: Record<string, unknown>;
}

// Agent Execution Types
export interface AgentTask {
  id: string;
  agentId: string;
  type: TaskType;
  input: AgentInput;
  output?: AgentOutput;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: AgentError;
  metadata: Record<string, unknown>;
  parentTaskId?: string;
  childTaskIds?: string[];
  retryCount: number;
  maxRetries: number;
}

export type TaskType =
  | 'classify'
  | 'route'
  | 'execute'
  | 'plan'
  | 'reason'
  | 'generate'
  | 'transform'
  | 'validate'
  | 'custom';

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AgentInput {
  messages?: LLMMessage[];
  data?: unknown;
  context?: AgentContext;
  tools?: AgentTool[];
  constraints?: AgentConstraints;
}

export interface AgentOutput {
  result: unknown;
  confidence?: number;
  reasoning?: string;
  toolCalls?: ToolCall[];
  nextSteps?: string[];
  metadata: Record<string, unknown>;
}

export interface AgentContext {
  conversationId?: string;
  userId?: string;
  sessionId?: string;
  workflowId?: string;
  previousMessages?: LLMMessage[];
  shortTermMemory?: MemoryItem[];
  longTermMemory?: MemoryItem[];
  variables?: Record<string, unknown>;
  state?: Record<string, unknown>;
  previousAgent?: string;
  previousStep?: number;
}

export interface AgentConstraints {
  maxTokens?: number;
  maxTime?: number;
  maxCost?: number;
  allowedTools?: string[];
  forbiddenTools?: string[];
  allowedAPIs?: string[];
  securityLevel?: 'low' | 'medium' | 'high';
}

export interface AgentError {
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
  recoverable: boolean;
  timestamp: string;
}

// Memory Types
export type MemoryType = 'short-term' | 'long-term' | 'vector' | 'episodic' | 'semantic';

export interface MemoryItem {
  id: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  importance: number;
  accessCount: number;
  lastAccessed: string;
  createdAt: string;
  expiresAt?: string;
  tags?: string[];
  source?: string;
}

export interface MemoryQuery {
  text?: string;
  embedding?: number[];
  filter?: Record<string, unknown>;
  topK: number;
  minImportance?: number;
  timeRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
}

export interface MemoryStats {
  totalItems: number;
  byType: Record<MemoryType, number>;
  totalSize: number;
  averageImportance: number;
  oldestItem?: string;
  newestItem?: string;
  compressionRatio?: number;
}

// Communication Types
export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string | string[];
  type: MessageType;
  content: unknown;
  priority: TaskPriority;
  timestamp: string;
  requiresResponse: boolean;
  responseTimeout?: number;
  metadata: Record<string, unknown>;
}

export type MessageType =
  | 'request'
  | 'response'
  | 'notification'
  | 'broadcast'
  | 'command'
  | 'status'
  | 'error';

export interface MessageBus {
  subscribe(agentId: string, callback: MessageCallback): void;
  unsubscribe(agentId: string): void;
  publish(message: AgentMessage): Promise<void>;
  request(message: AgentMessage): Promise<AgentMessage>;
  broadcast(message: Omit<AgentMessage, 'toAgentId'>): Promise<void>;
}

export type MessageCallback = (message: AgentMessage) => void | Promise<void>;

// Tool Types
export interface AgentTool {
  id: string;
  name: string;
  description: string;
  type: ToolType;
  category: ToolCategory;
  parameters: ToolParameter[];
  returns: ToolReturn;
  examples?: ToolExample[];
  permissions?: string[];
  cost?: number;
  rateLimit?: RateLimit;
  metadata: Record<string, unknown>;
}

export type ToolType =
  | 'workflow'
  | 'node'
  | 'api'
  | 'function'
  | 'custom';

export type ToolCategory =
  | 'data-processing'
  | 'api-integration'
  | 'code-execution'
  | 'file-operations'
  | 'database'
  | 'communication'
  | 'ai-ml'
  | 'utilities'
  | 'custom';

export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: unknown;
  enum?: unknown[];
  validation?: ParameterValidation;
}

export interface ParameterValidation {
  min?: number;
  max?: number;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  custom?: (value: unknown) => boolean;
}

export interface ToolReturn {
  type: string;
  description: string;
  schema?: Record<string, unknown>;
}

export interface ToolExample {
  name: string;
  description: string;
  input: Record<string, unknown>;
  output: unknown;
}

export interface ToolCall {
  toolId: string;
  toolName: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  error?: AgentError;
  executionTime: number;
  cost?: number;
  timestamp: string;
}

export interface RateLimit {
  maxCalls: number;
  windowMs: number;
  currentCount: number;
  resetAt: string;
}

// Routing Types
export interface RoutingDecision {
  targetAgentId: string;
  targetAgentName: string;
  confidence: number;
  reasoning: string;
  fallbackAgentId?: string;
  estimatedDuration?: number;
  estimatedCost?: number;
  route: RoutingPath[];
}

export interface RoutingPath {
  agentId: string;
  stepNumber: number;
  action: string;
  estimatedDuration: number;
}

export interface RoutingRule {
  id: string;
  name: string;
  description: string;
  condition: RuleCondition;
  targetAgentId: string;
  priority: number;
  enabled: boolean;
  metadata: Record<string, unknown>;
}

export interface RuleCondition {
  type: 'keyword' | 'intent' | 'entity' | 'custom';
  operator: 'contains' | 'equals' | 'matches' | 'gt' | 'lt' | 'in';
  value: unknown;
  field?: string;
}

export interface ClassificationResult {
  intent: string;
  confidence: number;
  entities: Entity[];
  sentiment?: Sentiment;
  language?: string;
  topics?: Topic[];
  keywords?: string[];
}

export interface Entity {
  type: string;
  value: string;
  confidence: number;
  start?: number;
  end?: number;
}

export interface Sentiment {
  label: 'positive' | 'negative' | 'neutral';
  score: number;
}

export interface Topic {
  name: string;
  relevance: number;
}

// Orchestration Types
export interface AgentOrchestrator {
  registerAgent(agent: Agent): Promise<void>;
  unregisterAgent(agentId: string): Promise<void>;
  getAgent(agentId: string): Agent | undefined;
  executeTask(task: AgentTask): Promise<AgentOutput>;
  delegateTask(task: AgentTask, targetAgentId: string): Promise<AgentOutput>;
  monitorHealth(): Promise<HealthReport>;
  shutdown(): Promise<void>;
}

export interface HealthReport {
  overall: HealthStatus;
  agents: AgentHealth[];
  messageQueue: QueueHealth;
  memory: MemoryHealth;
  timestamp: string;
}

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'down';

export interface AgentHealth {
  agentId: string;
  status: HealthStatus;
  uptime: number;
  taskCount: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  lastError?: AgentError;
  cpuUsage?: number;
  memoryUsage?: number;
}

export interface QueueHealth {
  size: number;
  processingRate: number;
  averageWaitTime: number;
  oldestMessage?: string;
}

export interface MemoryHealth {
  totalSize: number;
  utilizationPercent: number;
  itemCount: number;
  compressionEnabled: boolean;
  evictionRate: number;
}

// Lifecycle Events
export interface AgentLifecycleEvent {
  type: LifecycleEventType;
  agentId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type LifecycleEventType =
  | 'created'
  | 'started'
  | 'stopped'
  | 'paused'
  | 'resumed'
  | 'destroyed'
  | 'error'
  | 'health-check';

// Analytics Types
export interface AgentAnalytics {
  agentId: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  averageConfidence: number;
  toolUsage: Record<string, number>;
  errorDistribution: Record<string, number>;
  costTotal: number;
  periodStart: string;
  periodEnd: string;
}

// Collaboration Types
export interface AgentCollaboration {
  id: string;
  participants: string[];
  type: CollaborationType;
  status: 'active' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  result?: unknown;
  messageCount: number;
  metadata: Record<string, unknown>;
}

export type CollaborationType =
  | 'sequential'
  | 'parallel'
  | 'hierarchical'
  | 'peer-to-peer'
  | 'custom';

// Configuration Types
export interface MultiAgentConfig {
  maxConcurrentAgents: number;
  maxConcurrentTasks: number;
  defaultTimeout: number;
  defaultRetries: number;
  messageBusConfig: MessageBusConfig;
  memoryConfig: MemoryConfig;
  routingConfig: RoutingConfig;
  monitoringConfig: MonitoringConfig;
}

export interface MessageBusConfig {
  maxQueueSize: number;
  messageTimeout: number;
  retryAttempts: number;
  persistMessages: boolean;
}

export interface MemoryConfig {
  maxShortTermItems: number;
  maxLongTermItems: number;
  compressionThreshold: number;
  evictionPolicy: 'lru' | 'lfu' | 'importance';
  persistenceEnabled: boolean;
  vectorStoreConfig?: {
    provider: string;
    dimensions: number;
  };
}

export interface RoutingConfig {
  defaultStrategy: 'round-robin' | 'least-loaded' | 'intelligent';
  enableFallback: boolean;
  maxRoutingDepth: number;
  cachingEnabled: boolean;
}

export interface MonitoringConfig {
  enabled: boolean;
  healthCheckInterval: number;
  metricsCollectionInterval: number;
  alertThresholds: AlertThresholds;
}

export interface AlertThresholds {
  errorRate: number;
  responseTime: number;
  queueSize: number;
  memoryUsage: number;
}
