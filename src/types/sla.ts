/**
 * SLA Monitoring and Metrics Types
 * Service Level Agreement monitoring and workflow metrics system
 */

import type { WorkflowExecution } from './execution';

export interface SLA {
  id: string;
  name: string;
  description?: string;
  workflowId?: string; // Optional - can be global or workflow-specific
  targets: SLATarget[];
  schedule: SLASchedule;
  alerting: SLAAlertConfig;
  reporting: SLAReportConfig;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SLATarget {
  id: string;
  metric: SLAMetric;
  operator: ComparisonOperator;
  threshold: number;
  unit: MetricUnit;
  window: TimeWindow;
  criticality: CriticalityLevel;
  description?: string;
}

export interface SLAMetric {
  type: MetricType;
  name: string;
  aggregation: AggregationType;
  filters?: MetricFilter[];
  customQuery?: string;
}

export type MetricType = 
  | 'availability'
  | 'response_time'
  | 'throughput'
  | 'error_rate'
  | 'success_rate'
  | 'execution_time'
  | 'queue_length'
  | 'resource_usage'
  | 'custom';

export type AggregationType = 'avg' | 'sum' | 'min' | 'max' | 'count' | 'p50' | 'p90' | 'p95' | 'p99';

export type ComparisonOperator = '<' | '>' | '<=' | '>=' | '=' | '!=';

export type MetricUnit = 
  | 'milliseconds'
  | 'seconds'
  | 'minutes'
  | 'hours'
  | 'percentage'
  | 'count'
  | 'bytes'
  | 'kilobytes'
  | 'megabytes'
  | 'gigabytes';

export interface TimeWindow {
  duration: number;
  unit: TimeUnit;
  rolling: boolean;
  alignToCalendar?: boolean;
}

export type TimeUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export type CriticalityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface MetricFilter {
  field: string;
  operator: ComparisonOperator;
  value: unknown;
}

export interface SLASchedule {
  type: 'always' | 'business_hours' | 'custom';
  businessHours?: BusinessHours;
  customSchedule?: CustomSchedule;
  timezone: string;
  excludeHolidays: boolean;
  holidays?: Holiday[];
}

export interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

export interface DaySchedule {
  enabled: boolean;
  start: string; // HH:MM
  end: string; // HH:MM
}

export interface CustomSchedule {
  periods: SchedulePeriod[];
}

export interface SchedulePeriod {
  start: Date;
  end: Date;
  recurring?: RecurrenceRule;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  until?: Date;
  count?: number;
}

export interface Holiday {
  name: string;
  date: Date;
  recurring: boolean;
}

export interface SLAAlertConfig {
  enabled: boolean;
  channels: AlertChannel[];
  escalation: EscalationPolicy[];
  cooldownPeriod: number; // minutes
  groupBy?: string[];
  includeContext: boolean;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'sms';
  config: Record<string, unknown>;
  recipients: string[];
  template?: string;
}

export interface EscalationPolicy {
  level: number;
  afterMinutes: number;
  channels: string[]; // channel types
  recipients: string[];
}

export interface SLAReportConfig {
  enabled: boolean;
  frequency: ReportFrequency;
  recipients: string[];
  format: ReportFormat;
  includeCharts: boolean;
  includeRawData: boolean;
  customTemplate?: string;
}

export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'html';

export interface SLAViolation {
  id: string;
  slaId: string;
  targetId: string;
  timestamp: Date;
  value: number;
  threshold: number;
  severity: CriticalityLevel;
  duration: number; // how long the violation lasted
  resolved: boolean;
  resolvedAt?: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  notes?: string;
  context: ViolationContext;
}

export interface ViolationContext {
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  environment?: string;
  metadata: Record<string, unknown>;
}

export interface SLAStatus {
  slaId: string;
  status: 'healthy' | 'warning' | 'violation' | 'unknown';
  targets: TargetStatus[];
  lastChecked: Date;
  uptime: number; // percentage
  violationCount: number;
  lastViolation?: Date;
}

export interface TargetStatus {
  targetId: string;
  metric: string;
  currentValue: number;
  threshold: number;
  status: 'ok' | 'warning' | 'violation';
  trend: 'improving' | 'stable' | 'degrading';
  percentageOfTarget: number;
}

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  labels?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface MetricTimeSeries {
  metric: SLAMetric;
  dataPoints: MetricDataPoint[];
  summary: {
    min: number;
    max: number;
    avg: number;
    sum: number;
    count: number;
    percentiles?: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
  };
}

export interface SLAReport {
  id: string;
  slaId: string;
  period: { start: Date; end: Date };
  generatedAt: Date;
  summary: {
    uptime: number;
    violations: number;
    mttr: number; // mean time to recovery
    availability: number;
    performance: number;
  };
  targets: Array<{
    target: SLATarget;
    achievement: number;
    violations: number;
    timeSeries: MetricTimeSeries;
  }>;
  incidents: SLAViolation[];
  recommendations: string[];
}

export interface WorkflowMetrics {
  workflowId: string;
  timeRange: { start: Date; end: Date };
  executions: {
    total: number;
    successful: number;
    failed: number;
    cancelled: number;
    running: number;
  };
  performance: {
    avgExecutionTime: number;
    minExecutionTime: number;
    maxExecutionTime: number;
    p50ExecutionTime: number;
    p90ExecutionTime: number;
    p95ExecutionTime: number;
    p99ExecutionTime: number;
  };
  throughput: {
    executionsPerMinute: number;
    executionsPerHour: number;
    peakThroughput: number;
    peakTime: Date;
  };
  reliability: {
    successRate: number;
    errorRate: number;
    mtbf: number; // mean time between failures
    mttr: number; // mean time to recovery
  };
  resources: {
    avgCpuUsage: number;
    avgMemoryUsage: number;
    totalDataProcessed: number;
    avgNetworkIO: number;
  };
}

export interface GlobalMetrics {
  timeRange: { start: Date; end: Date };
  workflows: {
    total: number;
    active: number;
    inactive: number;
  };
  executions: {
    total: number;
    successRate: number;
    avgExecutionTime: number;
    throughput: number;
  };
  users: {
    total: number;
    active: number;
    new: number;
  };
  system: {
    uptime: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
  topWorkflows: Array<{
    workflowId: string;
    name: string;
    executions: number;
    successRate: number;
  }>;
  errorHotspots: Array<{
    location: string;
    errorCount: number;
    errorRate: number;
    lastError: Date;
  }>;
}

export interface MetricAggregation {
  id: string;
  name: string;
  description?: string;
  metrics: string[]; // metric IDs
  formula: string; // e.g., "(metric1 + metric2) / metric3 * 100"
  unit: MetricUnit;
  targets: AggregationTarget[];
}

export interface AggregationTarget {
  operator: ComparisonOperator;
  value: number;
  severity: CriticalityLevel;
}

export interface SLAService {
  // SLA Management
  createSLA(sla: Omit<SLA, 'id' | 'createdAt' | 'updatedAt'>): Promise<SLA>;
  updateSLA(id: string, updates: Partial<SLA>): Promise<void>;
  deleteSLA(id: string): Promise<void>;
  getSLA(id: string): Promise<SLA | null>;
  listSLAs(filters?: SLAFilters): Promise<SLA[]>;
  
  // Monitoring
  checkSLA(slaId: string): Promise<SLAStatus>;
  checkAllSLAs(): Promise<SLAStatus[]>;
  getViolations(slaId: string, timeRange?: TimeRange): Promise<SLAViolation[]>;
  acknowledgeViolation(violationId: string, userId: string, notes?: string): Promise<void>;
  
  // Metrics Collection
  collectMetrics(workflowId: string, execution: WorkflowExecution): Promise<void>;
  getMetrics(metric: SLAMetric, timeRange: TimeRange): Promise<MetricTimeSeries>;
  getWorkflowMetrics(workflowId: string, timeRange: TimeRange): Promise<WorkflowMetrics>;
  getGlobalMetrics(timeRange: TimeRange): Promise<GlobalMetrics>;
  
  // Reporting
  generateReport(slaId: string, period: TimeRange): Promise<SLAReport>;
  scheduleReport(slaId: string, config: SLAReportConfig): Promise<void>;
  getReports(slaId: string): Promise<SLAReport[]>;
  
  // Alerting
  testAlert(slaId: string, channel: AlertChannel): Promise<boolean>;
  getAlertHistory(slaId: string): Promise<Alert[]>;
  
  // Custom Metrics
  defineCustomMetric(metric: SLAMetric): Promise<void>;
  recordCustomMetric(metricName: string, value: number, labels?: Record<string, string>): Promise<void>;
  
  // Aggregations
  createAggregation(aggregation: Omit<MetricAggregation, 'id'>): Promise<MetricAggregation>;
  evaluateAggregation(aggregationId: string, timeRange: TimeRange): Promise<number>;
}

export interface SLAFilters {
  workflowId?: string;
  enabled?: boolean;
  search?: string;
  tags?: string[];
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface Alert {
  id: string;
  slaId: string;
  violationId: string;
  timestamp: Date;
  channel: string;
  recipients: string[];
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  content: string;
}