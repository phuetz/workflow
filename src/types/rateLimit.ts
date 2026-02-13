/**
 * API Rate Limiting and Quota Management Types
 * Advanced rate limiting, quotas, and usage analytics
 */

export interface RateLimitConfig {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  rules: RateLimitRule[];
  quotas: QuotaConfig[];
  enforcement: EnforcementConfig;
  monitoring: MonitoringConfig;
  notifications: NotificationConfig;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface RateLimitRule {
  id: string;
  name: string;
  type: RateLimitType;
  scope: RateLimitScope;
  window: TimeWindow;
  limit: number;
  burst?: number; // Burst limit for token bucket
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
}

export type RateLimitType = 
  | 'fixed-window'
  | 'sliding-window'
  | 'token-bucket'
  | 'leaky-bucket'
  | 'concurrent'
  | 'adaptive';

export type RateLimitScope = 
  | 'global'
  | 'per-user'
  | 'per-api-key'
  | 'per-ip'
  | 'per-endpoint'
  | 'per-plan'
  | 'per-organization'
  | 'custom';

export interface TimeWindow {
  duration: number; // in seconds
  unit: TimeUnit;
}

export type TimeUnit = 'second' | 'minute' | 'hour' | 'day' | 'month';

export interface RuleCondition {
  type: ConditionType;
  field: string;
  operator: ConditionOperator;
  value: unknown;
  caseSensitive?: boolean;
}

export type ConditionType = 
  | 'header'
  | 'query-param'
  | 'body-field'
  | 'path'
  | 'method'
  | 'user-attribute'
  | 'time-of-day'
  | 'day-of-week'
  | 'geo-location';

export type ConditionOperator = 
  | 'equals'
  | 'not-equals'
  | 'contains'
  | 'not-contains'
  | 'starts-with'
  | 'ends-with'
  | 'regex'
  | 'in'
  | 'not-in'
  | 'greater-than'
  | 'less-than'
  | 'between';

export interface RuleAction {
  type: ActionType;
  config: ActionConfig;
}

export type ActionType = 
  | 'block'
  | 'throttle'
  | 'queue'
  | 'redirect'
  | 'custom-response'
  | 'log'
  | 'alert'
  | 'charge-credits';

export interface ActionConfig {
  // Block action
  blockDuration?: number; // seconds
  blockMessage?: string;
  
  // Throttle action
  throttleDelay?: number; // milliseconds
  
  // Queue action
  queueSize?: number;
  queueTimeout?: number;
  
  // Redirect action
  redirectUrl?: string;
  redirectCode?: number;
  
  // Custom response
  responseCode?: number;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  
  // Log action
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logMessage?: string;
  
  // Alert action
  alertChannels?: string[];
  alertMessage?: string;
  
  // Charge credits
  creditAmount?: number;
  creditType?: string;
}

export interface QuotaConfig {
  id: string;
  name: string;
  type: QuotaType;
  scope: QuotaScope;
  period: QuotaPeriod;
  limit: QuotaLimit;
  tracking: QuotaTracking;
  overagePolicy: OveragePolicy;
  reset: QuotaReset;
  enabled: boolean;
}

export type QuotaType = 
  | 'request-count'
  | 'data-transfer'
  | 'compute-time'
  | 'storage-space'
  | 'api-calls'
  | 'workflow-executions'
  | 'node-operations'
  | 'custom-metric';

export type QuotaScope = 
  | 'user'
  | 'organization'
  | 'api-key'
  | 'plan'
  | 'resource'
  | 'global';

export interface QuotaPeriod {
  type: 'rolling' | 'fixed';
  duration: number;
  unit: TimeUnit;
  timezone?: string;
}

export interface QuotaLimit {
  value: number;
  unit: string;
  softLimit?: number; // Warning threshold
  burstLimit?: number; // Temporary burst allowance
}

export interface QuotaTracking {
  granularity: 'real-time' | 'batch';
  batchInterval?: number; // seconds
  precision: 'exact' | 'approximate';
  storage: 'memory' | 'database' | 'redis';
}

export interface OveragePolicy {
  action: OverageAction;
  config: OverageConfig;
}

export type OverageAction = 
  | 'block'
  | 'throttle'
  | 'charge'
  | 'warn'
  | 'upgrade-prompt';

export interface OverageConfig {
  // Block
  blockMessage?: string;
  
  // Throttle
  throttleRate?: number; // percentage of normal rate
  
  // Charge
  overageRate?: number; // cost per unit over quota
  currency?: string;
  
  // Warn
  warningThresholds?: number[]; // percentages
  warningChannels?: string[];
  
  // Upgrade prompt
  upgradeOptions?: UpgradeOption[];
}

export interface UpgradeOption {
  planId: string;
  planName: string;
  price: number;
  currency: string;
  benefits: string[];
}

export interface QuotaReset {
  type: 'automatic' | 'manual' | 'on-payment';
  schedule?: string; // cron expression for automatic reset
  resetValue?: number; // value to reset to (default: 0)
}

export interface EnforcementConfig {
  mode: EnforcementMode;
  bypassTokens: BypassToken[];
  gracePeriod: GracePeriod;
  errorHandling: ErrorHandling;
}

export type EnforcementMode = 
  | 'strict'
  | 'lenient'
  | 'monitoring-only'
  | 'adaptive';

export interface BypassToken {
  token: string;
  description: string;
  scopes: string[];
  expiresAt?: Date;
  usageCount: number;
  maxUsage?: number;
}

export interface GracePeriod {
  enabled: boolean;
  duration: number; // seconds
  allowedExcess: number; // percentage over limit
}

export interface ErrorHandling {
  retryAfterHeader: boolean;
  includeQuotaHeaders: boolean;
  customErrorPages: boolean;
  errorPageUrl?: string;
  logViolations: boolean;
}

export interface MonitoringConfig {
  metrics: MetricConfig[];
  alerts: AlertConfig[];
  dashboards: DashboardConfig[];
  retention: RetentionConfig;
}

export interface MetricConfig {
  name: string;
  type: MetricType;
  aggregation: AggregationType;
  dimensions: string[];
  enabled: boolean;
}

export type MetricType = 
  | 'counter'
  | 'gauge'
  | 'histogram'
  | 'distribution';

export type AggregationType = 
  | 'sum'
  | 'average'
  | 'min'
  | 'max'
  | 'percentile'
  | 'count';

export interface AlertConfig {
  name: string;
  condition: AlertCondition;
  channels: AlertChannel[];
  severity: AlertSeverity;
  enabled: boolean;
}

export interface AlertCondition {
  metric: string;
  operator: 'greater-than' | 'less-than' | 'equals' | 'not-equals';
  threshold: number;
  duration: number; // seconds
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty';
  config: Record<string, unknown>;
}

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DashboardConfig {
  name: string;
  widgets: WidgetConfig[];
  refreshInterval: number;
  public: boolean;
}

export interface WidgetConfig {
  type: 'chart' | 'metric' | 'table' | 'alert-status';
  title: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; width: number; height: number };
}

export interface RetentionConfig {
  rawData: number; // days
  aggregatedData: number; // days
  compressionEnabled: boolean;
}

export interface NotificationConfig {
  quotaWarnings: NotificationChannel[];
  quotaExceeded: NotificationChannel[];
  rateLimitViolations: NotificationChannel[];
  systemAlerts: NotificationChannel[];
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'in-app';
  recipients: string[];
  template?: string;
  frequency: 'immediate' | 'batched' | 'daily' | 'weekly';
}

// Usage and Analytics Types
export interface UsageMetrics {
  id: string;
  timestamp: Date;
  scope: string;
  scopeId: string;
  metrics: MetricValue[];
  metadata: Record<string, unknown>;
}

export interface MetricValue {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

export interface UsageReport {
  id: string;
  reportType: ReportType;
  period: ReportPeriod;
  scope: string;
  scopeId: string;
  data: UsageData;
  generatedAt: Date;
  format: ReportFormat;
}

export type ReportType = 
  | 'usage-summary'
  | 'quota-utilization'
  | 'rate-limit-violations'
  | 'top-consumers'
  | 'trend-analysis'
  | 'cost-analysis';

export interface ReportPeriod {
  start: Date;
  end: Date;
  timezone: string;
}

export interface UsageData {
  summary: UsageSummary;
  details: UsageDetail[];
  trends: TrendData[];
  violations: ViolationData[];
}

export interface UsageSummary {
  totalRequests: number;
  uniqueUsers: number;
  quotaUtilization: number; // percentage
  averageResponseTime: number;
  errorRate: number;
  topEndpoints: EndpointUsage[];
}

export interface EndpointUsage {
  endpoint: string;
  requests: number;
  errorRate: number;
  avgResponseTime: number;
}

export interface UsageDetail {
  timestamp: Date;
  userId?: string;
  apiKey?: string;
  endpoint: string;
  method: string;
  responseCode: number;
  responseTime: number;
  quotaUsed: number;
  rateLimitHit: boolean;
}

export interface TrendData {
  metric: string;
  dataPoints: DataPoint[];
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
}

export interface DataPoint {
  timestamp: Date;
  value: number;
}

export interface ViolationData {
  type: 'rate-limit' | 'quota-exceeded';
  timestamp: Date;
  userId?: string;
  apiKey?: string;
  rule: string;
  severity: string;
  action: string;
}

export type ReportFormat = 'json' | 'csv' | 'pdf' | 'html';

// Plan and Billing Integration
export interface UsagePlan {
  id: string;
  name: string;
  description: string;
  type: PlanType;
  pricing: PricingModel;
  limits: PlanLimits;
  features: PlanFeature[];
  rateLimits: PlanRateLimit[];
  quotas: PlanQuota[];
  active: boolean;
}

export type PlanType = 'free' | 'basic' | 'professional' | 'enterprise' | 'custom';

export interface PricingModel {
  type: 'fixed' | 'usage-based' | 'tiered' | 'hybrid';
  basePrice: number;
  currency: string;
  billingCycle: 'monthly' | 'annually';
  usageRates?: UsageRate[];
  tiers?: PricingTier[];
}

export interface UsageRate {
  metric: string;
  rate: number;
  unit: string;
  includedQuantity?: number;
}

export interface PricingTier {
  from: number;
  to?: number;
  rate: number;
}

export interface PlanLimits {
  maxUsers?: number;
  maxApiKeys?: number;
  maxWorkflows?: number;
  maxExecutions?: number;
  maxStorage?: number;
  maxBandwidth?: number;
}

export interface PlanFeature {
  name: string;
  enabled: boolean;
  limit?: number;
  description?: string;
}

export interface PlanRateLimit {
  scope: string;
  limit: number;
  window: TimeWindow;
}

export interface PlanQuota {
  type: string;
  limit: number;
  period: QuotaPeriod;
}

// Service Interfaces
export interface IRateLimitService {
  // Configuration
  createConfig(config: Partial<RateLimitConfig>): Promise<RateLimitConfig>;
  updateConfig(id: string, updates: Partial<RateLimitConfig>): Promise<RateLimitConfig>;
  deleteConfig(id: string): Promise<void>;
  getConfig(id: string): Promise<RateLimitConfig | null>;
  listConfigs(): Promise<RateLimitConfig[]>;
  
  // Rate Limiting
  checkRateLimit(request: RateLimitRequest): Promise<RateLimitResult>;
  consumeQuota(request: QuotaRequest): Promise<QuotaResult>;
  resetQuota(scope: string, scopeId: string, quotaId?: string): Promise<void>;
  
  // Usage Tracking
  trackUsage(metrics: UsageMetrics): Promise<void>;
  getUsage(scope: string, scopeId: string, period: ReportPeriod): Promise<UsageData>;
  generateReport(request: ReportRequest): Promise<UsageReport>;
  
  // Plans and Billing
  createPlan(plan: Partial<UsagePlan>): Promise<UsagePlan>;
  updatePlan(id: string, updates: Partial<UsagePlan>): Promise<UsagePlan>;
  assignPlan(userId: string, planId: string): Promise<void>;
  calculateUsageCost(usage: UsageData, planId: string): Promise<CostCalculation>;
  
  // Monitoring
  getMetrics(query: MetricQuery): Promise<MetricResult[]>;
  createAlert(alert: AlertConfig): Promise<string>;
  testAlert(alertId: string): Promise<void>;
}

export interface RateLimitRequest {
  userId?: string;
  apiKey?: string;
  ip: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  timestamp: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  rule?: RateLimitRule;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
  quotaInfo?: QuotaInfo;
  headers: Record<string, string>;
}

export interface QuotaRequest {
  userId?: string;
  apiKey?: string;
  quotaType: string;
  amount: number;
  metadata?: Record<string, unknown>;
}

export interface QuotaResult {
  allowed: boolean;
  quota: QuotaConfig;
  used: number;
  remaining: number;
  resetTime: Date;
  overageAllowed: boolean;
  overage?: number;
}

export interface QuotaInfo {
  quotaId: string;
  used: number;
  limit: number;
  remaining: number;
  resetTime: Date;
  percentage: number;
}

export interface ReportRequest {
  type: ReportType;
  period: ReportPeriod;
  scope: string;
  scopeId?: string;
  format: ReportFormat;
  filters?: Record<string, unknown>;
}

export interface CostCalculation {
  baseAmount: number;
  usageAmount: number;
  overageAmount: number;
  totalAmount: number;
  currency: string;
  breakdown: CostBreakdown[];
}

export interface CostBreakdown {
  component: string;
  quantity: number;
  rate: number;
  amount: number;
  unit: string;
}

export interface MetricQuery {
  metric: string;
  scope?: string;
  scopeId?: string;
  startTime: Date;
  endTime: Date;
  granularity: number; // seconds
  aggregation?: AggregationType;
  dimensions?: string[];
}

export interface MetricResult {
  metric: string;
  timestamp: Date;
  value: number;
  dimensions: Record<string, string>;
}