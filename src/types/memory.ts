// Persistent Agent Memory System Types

/**
 * Core Memory Types
 */
export interface Memory {
  id: string;
  agentId: string;
  userId: string;
  timestamp: Date;
  content: string;
  embedding: number[];
  importance: number; // 0-1 scale
  type: MemoryType;
  metadata: MemoryMetadata;
  version: number;
  compressed: boolean;
  accessCount: number;
  lastAccessed: Date;
  expiresAt?: Date;
}

export type MemoryType =
  | 'conversation'
  | 'preference'
  | 'workflow'
  | 'feedback'
  | 'error_resolution'
  | 'pattern'
  | 'skill'
  | 'context';

export interface MemoryMetadata {
  source?: string;
  tags?: string[];
  category?: string;
  relatedMemories?: string[];
  confidence?: number;
  verified?: boolean;
  location?: string;
  sentiment?: SentimentScore;
  entities?: ExtractedEntity[];
  summary?: string;
  language?: string;
  [key: string]: unknown;
}

export interface SentimentScore {
  label: 'positive' | 'negative' | 'neutral';
  score: number;
}

export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  start?: number;
  end?: number;
}

/**
 * Memory Storage and Retrieval
 */
export interface MemoryQuery {
  query?: string;
  embedding?: number[];
  userId?: string;
  agentId?: string;
  type?: MemoryType | MemoryType[];
  tags?: string[];
  timeRange?: TimeRange;
  minImportance?: number;
  maxImportance?: number;
  limit?: number;
  offset?: number;
  includeExpired?: boolean;
  sortBy?: MemorySortField;
  sortOrder?: 'asc' | 'desc';
  filters?: MemoryFilter[];
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export type MemorySortField =
  | 'timestamp'
  | 'importance'
  | 'relevance'
  | 'accessCount'
  | 'lastAccessed';

export interface MemoryFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'contains'
  | 'startsWith'
  | 'endsWith';

export interface MemorySearchResult {
  memories: MemoryWithScore[];
  total: number;
  executionTime: number;
  query: MemoryQuery;
}

export interface MemoryWithScore extends Memory {
  score: number;
  relevance: number;
  explanation?: string;
}

/**
 * Memory Pruning and Compression
 */
export interface PruneCriteria {
  maxAge?: number; // milliseconds
  minImportance?: number;
  maxMemories?: number;
  strategy?: PruneStrategy;
  preserveTypes?: MemoryType[];
  preserveTags?: string[];
  dryRun?: boolean;
}

export type PruneStrategy =
  | 'lru' // Least Recently Used
  | 'lfu' // Least Frequently Used
  | 'importance' // Lowest importance
  | 'age' // Oldest first
  | 'combined'; // Weighted combination

export interface PruneResult {
  deleted: number;
  preserved: number;
  freedSpace: number;
  duration: number;
  strategy: PruneStrategy;
  deletedIds: string[];
}

export interface CompressionConfig {
  enabled: boolean;
  minSize: number; // bytes
  algorithm: 'gzip' | 'lz4' | 'snappy';
  level?: number; // 1-9 for gzip
  threshold?: number; // importance threshold for compression
}

/**
 * User Profile and Preferences
 */
export interface UserProfile {
  userId: string;
  agentId: string;
  preferences: UserPreferences;
  patterns: UserPattern[];
  commonWorkflows: WorkflowPattern[];
  statistics: UserStatistics;
  learningHistory: LearningEvent[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface UserPreferences {
  language?: string;
  timezone?: string;
  notificationSettings?: NotificationPreferences;
  workflowDefaults?: WorkflowDefaults;
  uiPreferences?: UIPreferences;
  privacySettings?: PrivacySettings;
  customPreferences?: Record<string, unknown>;
}

export interface NotificationPreferences {
  email: boolean;
  slack: boolean;
  webhook: boolean;
  inApp: boolean;
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  quiet_hours?: QuietHours;
}

export interface QuietHours {
  enabled: boolean;
  start: string; // HH:mm format
  end: string; // HH:mm format
  timezone: string;
}

export interface WorkflowDefaults {
  retryAttempts?: number;
  timeout?: number;
  errorHandling?: 'stop' | 'continue' | 'retry';
  loggingLevel?: 'verbose' | 'normal' | 'minimal';
  preferredNodes?: string[];
}

export interface UIPreferences {
  theme?: 'light' | 'dark' | 'auto';
  compactMode?: boolean;
  showHints?: boolean;
  autoSave?: boolean;
  gridSnap?: boolean;
  animationsEnabled?: boolean;
}

export interface PrivacySettings {
  dataCollection: boolean;
  analytics: boolean;
  memoryEnabled: boolean;
  retentionDays: number;
  shareData: boolean;
  gdprConsent: boolean;
  consentDate?: Date;
  exportRequested?: boolean;
  deleteRequested?: boolean;
}

export interface UserPattern {
  id: string;
  type: 'temporal' | 'workflow' | 'interaction' | 'error';
  pattern: string;
  frequency: number;
  confidence: number;
  lastSeen: Date;
  metadata: Record<string, unknown>;
}

export interface WorkflowPattern {
  id: string;
  name: string;
  nodes: string[];
  frequency: number;
  successRate: number;
  avgExecutionTime: number;
  lastUsed: Date;
  tags: string[];
}

export interface UserStatistics {
  totalWorkflows: number;
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  mostUsedNodes: Record<string, number>;
  errorPatterns: Record<string, number>;
  activeHours: number[];
  preferredDays: number[];
  learningRate: number;
}

export interface LearningEvent {
  id: string;
  timestamp: Date;
  type: 'correction' | 'preference' | 'pattern' | 'feedback';
  description: string;
  impact: number;
  applied: boolean;
  metadata: Record<string, unknown>;
}

/**
 * Context Management
 */
export interface ContextState {
  sessionId: string;
  userId: string;
  agentId: string;
  shortTermMemory: Memory[];
  workingMemory: WorkingMemoryItem[];
  contextWindow: ContextWindow;
  activeTask?: TaskContext;
  conversationHistory: ConversationTurn[];
  variables: Record<string, unknown>;
  state: Record<string, unknown>;
  createdAt: Date;
  lastActivity: Date;
  expiresAt?: Date;
}

export interface WorkingMemoryItem {
  id: string;
  key: string;
  value: unknown;
  type: 'variable' | 'result' | 'intermediate' | 'cache';
  priority: number;
  ttl?: number; // milliseconds
  createdAt: Date;
  lastAccessed: Date;
}

export interface ContextWindow {
  size: number;
  maxSize: number;
  tokens: number;
  maxTokens: number;
  items: ContextItem[];
  strategy: 'sliding' | 'summarize' | 'priority';
}

export interface ContextItem {
  id: string;
  content: string;
  type: 'message' | 'memory' | 'data';
  tokens: number;
  priority: number;
  timestamp: Date;
}

export interface TaskContext {
  taskId: string;
  type: string;
  startedAt: Date;
  state: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number; // 0-100
  metadata: Record<string, unknown>;
}

export interface ConversationTurn {
  id: string;
  timestamp: Date;
  role: 'user' | 'agent' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Memory Search and Embeddings
 */
export interface EmbeddingConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'custom';
  model: string;
  dimensions: number;
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  batchSize?: number;
  cache?: boolean;
}

export interface EmbeddingRequest {
  texts: string[];
  model?: string;
  metadata?: Record<string, unknown>;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    totalTokens: number;
    promptTokens: number;
  };
  executionTime: number;
}

export interface SimilaritySearchConfig {
  metric: 'cosine' | 'euclidean' | 'dotproduct';
  threshold?: number;
  maxResults: number;
  includeScores: boolean;
  filters?: MemoryFilter[];
}

/**
 * Memory Analytics and Metrics
 */
export interface MemoryAnalytics {
  userId: string;
  agentId: string;
  periodStart: Date;
  periodEnd: Date;
  totalMemories: number;
  memoryByType: Record<MemoryType, number>;
  totalSize: number;
  compressionRatio: number;
  avgImportance: number;
  recallAccuracy: number;
  searchLatency: number;
  storageEfficiency: number;
  pruneEvents: number;
  userEngagement: number;
}

export interface MemoryHealth {
  status: 'healthy' | 'degraded' | 'critical';
  totalMemories: number;
  storageUsed: number;
  storageLimit: number;
  utilizationPercent: number;
  avgSearchLatency: number;
  recallAccuracy: number;
  lastPruned?: Date;
  issues: MemoryIssue[];
  recommendations: string[];
}

export interface MemoryIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  timestamp: Date;
  affectedMemories?: string[];
}

/**
 * GDPR Compliance
 */
export interface GDPRRequest {
  userId: string;
  type: 'export' | 'delete' | 'modify' | 'consent';
  requestedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completedAt?: Date;
  data?: unknown;
  error?: string;
}

export interface DataExport {
  userId: string;
  requestedAt: Date;
  completedAt: Date;
  format: 'json' | 'csv' | 'xml';
  data: {
    memories: Memory[];
    profile: UserProfile;
    analytics: MemoryAnalytics;
    metadata: Record<string, unknown>;
  };
  downloadUrl?: string;
  expiresAt: Date;
}

/**
 * Memory Store Configuration
 */
export interface MemoryStoreConfig {
  provider: 'in-memory' | 'redis' | 'postgresql' | 'mongodb' | 'hybrid';
  connectionString?: string;
  poolSize?: number;
  timeout?: number;
  compression: CompressionConfig;
  embedding: EmbeddingConfig;
  pruning: AutoPruneConfig;
  caching: CacheConfig;
  replication?: ReplicationConfig;
  backup?: BackupConfig;
}

export interface AutoPruneConfig {
  enabled: boolean;
  schedule: string; // cron expression
  criteria: PruneCriteria;
  notifications: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  maxSize: number; // MB
  strategy: 'lru' | 'lfu' | 'fifo';
}

export interface ReplicationConfig {
  enabled: boolean;
  replicas: number;
  syncInterval: number; // seconds
  consistency: 'eventual' | 'strong';
}

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // cron expression
  destination: string;
  retention: number; // days
  compression: boolean;
}

/**
 * Events and Notifications
 */
export interface MemoryEvent {
  id: string;
  type: MemoryEventType;
  timestamp: Date;
  userId: string;
  agentId: string;
  memoryId?: string;
  metadata: Record<string, unknown>;
}

export type MemoryEventType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'accessed'
  | 'pruned'
  | 'compressed'
  | 'exported'
  | 'error';

export interface MemoryEventListener {
  on(event: MemoryEventType, callback: (event: MemoryEvent) => void): void;
  off(event: MemoryEventType, callback: (event: MemoryEvent) => void): void;
  emit(event: MemoryEvent): void;
}

/**
 * API Types
 */
export interface CreateMemoryRequest {
  agentId: string;
  userId: string;
  content: string;
  type: MemoryType;
  importance?: number;
  metadata?: MemoryMetadata;
  tags?: string[];
  expiresAt?: Date;
}

export interface UpdateMemoryRequest {
  id: string;
  content?: string;
  importance?: number;
  metadata?: MemoryMetadata;
  tags?: string[];
  expiresAt?: Date;
}

export interface BulkMemoryOperation {
  operation: 'create' | 'update' | 'delete';
  memories: (CreateMemoryRequest | UpdateMemoryRequest | string)[];
}

export interface BulkMemoryResult {
  successful: number;
  failed: number;
  errors: Array<{ id?: string; error: string }>;
  duration: number;
}

/**
 * Personalization Types
 */
export interface PersonalizationConfig {
  enabled: boolean;
  learningRate: number;
  adaptationSpeed: 'slow' | 'medium' | 'fast';
  suggestionThreshold: number;
  patternRecognition: boolean;
  behavioralAnalysis: boolean;
  feedbackLoop: boolean;
}

export interface Suggestion {
  id: string;
  type: 'workflow' | 'node' | 'optimization' | 'alternative';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  source: 'pattern' | 'preference' | 'feedback';
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface FeedbackRecord {
  id: string;
  suggestionId?: string;
  memoryId?: string;
  userId: string;
  type: 'positive' | 'negative' | 'neutral';
  comment?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Performance Metrics
 */
export interface PerformanceMetrics {
  recallLatency: LatencyMetrics;
  storeLatency: LatencyMetrics;
  searchAccuracy: AccuracyMetrics;
  storageEfficiency: StorageMetrics;
  timestamp: Date;
}

export interface LatencyMetrics {
  p50: number; // ms
  p90: number; // ms
  p95: number; // ms
  p99: number; // ms
  avg: number; // ms
  max: number; // ms
  min: number; // ms
}

export interface AccuracyMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  relevanceScore: number;
}

export interface StorageMetrics {
  totalSize: number; // bytes
  compressedSize: number; // bytes
  compressionRatio: number;
  memoryCount: number;
  avgMemorySize: number; // bytes
  storagePerUser: number; // bytes
}
