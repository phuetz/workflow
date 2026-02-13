/**
 * Type definitions for SecurityAnalyticsQueryEngine
 */

// ============================================================================
// Query Configuration Types
// ============================================================================

export interface QueryConfig {
  timeout?: number;
  maxRows?: number;
  enableCache?: boolean;
  cacheTTL?: number;
  mode?: 'realtime' | 'batch';
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityQuery {
  id: string;
  name: string;
  description: string;
  sql: string;
  category: QueryCategory;
  parameters?: QueryParameter[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isPublic: boolean;
  version: number;
}

export type QueryCategory =
  | 'threat_hunting'
  | 'ioc_search'
  | 'anomaly_detection'
  | 'correlation'
  | 'compliance'
  | 'forensics'
  | 'custom';

export interface QueryParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'array' | 'boolean';
  required: boolean;
  defaultValue?: unknown;
  description?: string;
}

// ============================================================================
// Query Result Types
// ============================================================================

export interface QueryResult {
  queryId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  data: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  bytesScanned: number;
  fromCache: boolean;
  warnings?: string[];
  error?: string;
  metadata: QueryMetadata;
}

export interface QueryMetadata {
  columns: ColumnInfo[];
  startTime: Date;
  endTime?: Date;
  queryHash: string;
  costEstimate: CostEstimate;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface CostEstimate {
  bytesToScan: number;
  estimatedTimeMs: number;
  estimatedCost: number;
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  recommendations?: string[];
}

// ============================================================================
// Parsed Query Types
// ============================================================================

export interface ParsedQuery {
  type: 'select' | 'insert' | 'update' | 'delete' | 'create' | 'drop';
  tables: string[];
  columns: string[];
  conditions: QueryCondition[];
  joins: JoinClause[];
  groupBy: string[];
  orderBy: OrderByClause[];
  limit?: number;
  offset?: number;
  parameters: Map<string, unknown>;
}

export interface QueryCondition {
  field: string;
  operator: string;
  value: unknown;
  conjunction: 'AND' | 'OR';
}

export interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  condition: string;
}

export interface OrderByClause {
  field: string;
  direction: 'ASC' | 'DESC';
}

// ============================================================================
// Materialized View Types
// ============================================================================

export interface MaterializedView {
  id: string;
  name: string;
  query: string;
  refreshSchedule: string;
  lastRefresh?: Date;
  nextRefresh?: Date;
  status: 'active' | 'refreshing' | 'stale' | 'error';
  rowCount: number;
  sizeBytes: number;
  createdAt: Date;
  createdBy: string;
}

// ============================================================================
// Scheduling Types
// ============================================================================

export interface ScheduledQuery {
  id: string;
  queryId: string;
  schedule: string;
  enabled: boolean;
  alertConfig?: AlertConfig;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  failureCount: number;
  createdAt: Date;
  createdBy: string;
}

export interface AlertConfig {
  condition: AlertCondition;
  channels: AlertChannel[];
  severity: 'info' | 'warning' | 'critical';
  throttleMinutes?: number;
  lastTriggered?: Date;
}

export interface AlertCondition {
  type: 'row_count' | 'threshold' | 'change' | 'custom';
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'exists' | 'not_exists';
  value?: number;
  field?: string;
  expression?: string;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'teams';
  config: Record<string, unknown>;
}

// ============================================================================
// Sharing Types
// ============================================================================

export interface SharedQuery {
  id: string;
  queryId: string;
  sharedWith: ShareTarget[];
  permissions: SharePermission[];
  expiresAt?: Date;
  accessCount: number;
  createdAt: Date;
  createdBy: string;
}

export interface ShareTarget {
  type: 'user' | 'team' | 'organization' | 'public';
  id?: string;
}

export type SharePermission = 'view' | 'execute' | 'edit' | 'share' | 'delete';

// ============================================================================
// Export Types
// ============================================================================

export interface ExportOptions {
  format: 'json' | 'csv' | 'parquet' | 'excel';
  compression?: 'none' | 'gzip' | 'snappy';
  includeHeaders?: boolean;
  dateFormat?: string;
  nullValue?: string;
  maxFileSize?: number;
}

export interface ExportResult {
  data: Buffer | string;
  filename: string;
  mimeType: string;
}

// ============================================================================
// BI Integration Types
// ============================================================================

export interface BIIntegration {
  type: 'tableau' | 'powerbi' | 'looker' | 'metabase' | 'grafana';
  connectionString: string;
  credentials?: Record<string, string>;
  refreshInterval?: number;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheEntry {
  result: QueryResult;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

export interface CacheStats {
  size: number;
  hitRate: number;
  avgAccessCount: number;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface EngineStatistics {
  savedQueries: number;
  scheduledQueries: number;
  materializedViews: number;
  sharedQueries: number;
  runningQueries: number;
  cacheStats: CacheStats;
  biIntegrations: number;
}
