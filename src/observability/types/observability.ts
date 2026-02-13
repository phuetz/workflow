/**
 * Agent Observability Platform - Type Definitions
 *
 * Comprehensive type system for distributed tracing, cost attribution,
 * SLA monitoring, and policy violation tracking for AI agents.
 */

/**
 * Trace status types
 */
export type TraceStatus = 'success' | 'error' | 'timeout' | 'cancelled';

/**
 * Span type categorization
 */
export type SpanType =
  | 'agent'           // Agent execution
  | 'tool'            // Tool invocation
  | 'llm'             // LLM API call
  | 'memory'          // Memory operation
  | 'routing'         // Routing decision
  | 'workflow'        // Workflow execution
  | 'http'            // HTTP request
  | 'database'        // Database operation
  | 'cache'           // Cache operation
  | 'custom';         // Custom span

/**
 * Cost category types
 */
export type CostCategory =
  | 'llm'             // LLM API costs
  | 'compute'         // CPU/memory costs
  | 'storage'         // Data storage costs
  | 'network'         // Network bandwidth costs
  | 'external';       // External API costs

/**
 * SLA metric types
 */
export type SLAMetric = 'uptime' | 'latency' | 'success_rate' | 'cost';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Sampling strategy types
 */
export type SamplingStrategy = 'always' | 'never' | 'percentage' | 'adaptive';

/**
 * Core trace span interface
 */
export interface TraceSpan {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  type: SpanType;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: TraceStatus;
  attributes: Record<string, any>;
  events: SpanEvent[];
  error?: SpanError;
  children: TraceSpan[];
}

/**
 * Span event (log within a span)
 */
export interface SpanEvent {
  timestamp: number;
  name: string;
  attributes: Record<string, any>;
}

/**
 * Span error details
 */
export interface SpanError {
  type: string;
  message: string;
  stack?: string;
  attributes?: Record<string, any>;
}

/**
 * Complete agent trace
 */
export interface AgentTrace {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  agentId: string;
  agentName: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: TraceStatus;
  metadata: TraceMetadata;
  spans: ToolSpan[];
  rootSpan: TraceSpan;
  totalCost: number;
  slaViolations: SLAViolation[];
}

/**
 * Trace metadata
 */
export interface TraceMetadata {
  workflowId?: string;
  userId?: string;
  teamId?: string;
  organizationId?: string;
  environment: 'development' | 'staging' | 'production';
  version: string;
  tags: Record<string, string>;
  context: Record<string, any>;
}

/**
 * Tool span tracking
 */
export interface ToolSpan {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  tool: string;
  toolVersion?: string;
  operation: string;
  input: any;
  output?: any;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: TraceStatus;
  cost: CostBreakdown;
  error?: SpanError;
  metadata: ToolSpanMetadata;
}

/**
 * Tool span metadata
 */
export interface ToolSpanMetadata {
  retryCount: number;
  cacheHit: boolean;
  apiProvider?: string;
  model?: string;
  tokens?: TokenUsage;
  rateLimit?: RateLimitInfo;
}

/**
 * Token usage for LLM calls
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens?: number;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Cost breakdown by category
 */
export interface CostBreakdown {
  total: number;
  breakdown: Partial<Record<CostCategory, number>>;
  currency: string;
  timestamp: number;
}

/**
 * Cost attribution result
 */
export interface CostAttribution {
  id: string;
  timestamp: number;
  period: {
    start: number;
    end: number;
  };
  total: number;
  byAgent: Record<string, number>;
  byWorkflow: Record<string, number>;
  byUser: Record<string, number>;
  byTeam: Record<string, number>;
  byOrganization: Record<string, number>;
  byCategory: Record<CostCategory, number>;
  currency: string;
  trends: CostTrends;
}

/**
 * Cost trends and forecasts
 */
export interface CostTrends {
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  growth: number; // Percentage
  forecast30Days: number;
  forecast90Days: number;
}

/**
 * SLA definition
 */
export interface SLADefinition {
  id: string;
  name: string;
  description: string;
  metric: SLAMetric;
  target: number;
  threshold: number; // Violation threshold
  unit: string;
  enabled: boolean;
  scope: SLAScope;
  monitoringInterval: number; // ms
  alertChannels: string[];
  autoRemediation?: SLARemediation;
}

/**
 * SLA scope
 */
export interface SLAScope {
  agentIds?: string[];
  workflowIds?: string[];
  userIds?: string[];
  teamIds?: string[];
  organizationIds?: string[];
  global: boolean;
}

/**
 * SLA remediation action
 */
export interface SLARemediation {
  enabled: boolean;
  actions: Array<{
    type: 'scale' | 'throttle' | 'fallback' | 'circuit_breaker';
    config: Record<string, any>;
  }>;
}

/**
 * SLA violation
 */
export interface SLAViolation {
  id: string;
  slaId: string;
  slaName: string;
  timestamp: number;
  metric: SLAMetric;
  target: number;
  actual: number;
  severity: AlertSeverity;
  scope: {
    agentId?: string;
    workflowId?: string;
    userId?: string;
    teamId?: string;
    organizationId?: string;
  };
  duration: number; // How long in violation
  remediated: boolean;
  remediationActions?: string[];
}

/**
 * SLA monitoring result
 */
export interface SLAMonitoringResult {
  timestamp: number;
  slaId: string;
  metric: SLAMetric;
  value: number;
  target: number;
  status: 'ok' | 'warning' | 'violation';
  violation?: SLAViolation;
}

/**
 * Policy violation types
 */
export type PolicyViolationType =
  | 'cost_exceeded'
  | 'rate_limit_exceeded'
  | 'unauthorized_access'
  | 'data_retention_violation'
  | 'compliance_violation'
  | 'security_violation'
  | 'performance_degradation'
  | 'resource_quota_exceeded';

/**
 * Policy violation
 */
export interface PolicyViolation {
  id: string;
  timestamp: number;
  type: PolicyViolationType;
  severity: AlertSeverity;
  agentId: string;
  workflowId?: string;
  userId?: string;
  description: string;
  details: Record<string, any>;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  actions: PolicyAction[];
}

/**
 * Policy action
 */
export interface PolicyAction {
  type: 'alert' | 'block' | 'throttle' | 'log' | 'quarantine';
  timestamp: number;
  result: 'success' | 'failed';
  details?: string;
}

/**
 * Performance profile
 */
export interface PerformanceProfile {
  agentId: string;
  timestamp: number;
  period: {
    start: number;
    end: number;
  };
  cpu: CPUProfile;
  memory: MemoryProfile;
  network: NetworkProfile;
  bottlenecks: Bottleneck[];
  recommendations: Recommendation[];
}

/**
 * CPU profiling data
 */
export interface CPUProfile {
  average: number; // Percentage
  peak: number;
  p50: number;
  p95: number;
  p99: number;
  samples: Array<{ timestamp: number; value: number }>;
}

/**
 * Memory profiling data
 */
export interface MemoryProfile {
  averageMB: number;
  peakMB: number;
  p50: number;
  p95: number;
  p99: number;
  heapUsed: number;
  heapTotal: number;
  leakDetected: boolean;
  samples: Array<{ timestamp: number; value: number }>;
}

/**
 * Network profiling data
 */
export interface NetworkProfile {
  totalRequests: number;
  totalBytes: number;
  averageLatency: number;
  p50: number;
  p95: number;
  p99: number;
  errors: number;
  timeouts: number;
}

/**
 * Performance bottleneck
 */
export interface Bottleneck {
  type: 'cpu' | 'memory' | 'network' | 'io' | 'database';
  severity: AlertSeverity;
  location: string; // Function/operation name
  impact: number; // Percentage of total time
  description: string;
  suggestions: string[];
}

/**
 * Optimization recommendation
 */
export interface Recommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'performance' | 'cost' | 'reliability' | 'security';
  title: string;
  description: string;
  expectedImpact: string;
  implementation: string;
  estimatedEffort: 'low' | 'medium' | 'high';
}

/**
 * Trace collection configuration
 */
export interface TraceCollectorConfig {
  enabled: boolean;
  samplingStrategy: SamplingStrategy;
  samplingRate: number; // 0.0 to 1.0
  maxSpansPerTrace: number;
  maxTraceAge: number; // ms
  storage: TraceStorageConfig;
  exporters: TraceExporter[];
}

/**
 * Trace storage configuration
 */
export interface TraceStorageConfig {
  backend: 'memory' | 'redis' | 'elasticsearch' | 'prometheus';
  hotRetentionDays: number;
  coldRetentionDays: number;
  compressionEnabled: boolean;
  indexingEnabled: boolean;
}

/**
 * Trace exporter configuration
 */
export interface TraceExporter {
  type: 'otlp' | 'jaeger' | 'zipkin' | 'datadog' | 'custom';
  endpoint: string;
  headers?: Record<string, string>;
  batchSize: number;
  batchTimeout: number; // ms
}

/**
 * Query filter for traces
 */
export interface TraceQueryFilter {
  traceIds?: string[];
  agentIds?: string[];
  workflowIds?: string[];
  userIds?: string[];
  status?: TraceStatus[];
  minDuration?: number;
  maxDuration?: number;
  startTime?: number;
  endTime?: number;
  tags?: Record<string, string>;
  limit?: number;
  offset?: number;
}

/**
 * Trace query result
 */
export interface TraceQueryResult {
  traces: AgentTrace[];
  total: number;
  hasMore: boolean;
  queryTime: number; // ms
}

/**
 * Trace statistics
 */
export interface TraceStatistics {
  totalTraces: number;
  totalSpans: number;
  averageDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  successRate: number;
  errorRate: number;
  timeoutRate: number;
  totalCost: number;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  refreshInterval: number; // ms
  timeRange: {
    start: number;
    end: number;
  };
  widgets: DashboardWidget[];
  filters: DashboardFilters;
}

/**
 * Dashboard widget
 */
export interface DashboardWidget {
  id: string;
  type: 'trace_flame_graph' | 'cost_breakdown' | 'sla_status' | 'policy_violations' | 'performance_metrics';
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  config: Record<string, any>;
  position: { x: number; y: number };
}

/**
 * Dashboard filters
 */
export interface DashboardFilters {
  agentIds?: string[];
  workflowIds?: string[];
  userIds?: string[];
  timeRange: 'last_hour' | 'last_24h' | 'last_7d' | 'last_30d' | 'custom';
  customRange?: { start: number; end: number };
}

/**
 * Real-time event for dashboard updates
 */
export interface ObservabilityEvent {
  type: 'trace_completed' | 'sla_violation' | 'policy_violation' | 'cost_threshold' | 'performance_alert';
  timestamp: number;
  data: any;
}
