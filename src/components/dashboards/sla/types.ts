/**
 * SLA Dashboard Component Types
 */

import type {
  SLA,
  SLAStatus,
  SLAViolation,
  SLAReport,
  WorkflowMetrics,
  GlobalMetrics,
  MetricType,
  AggregationType,
  ComparisonOperator,
  MetricUnit,
  TimeUnit,
  CriticalityLevel,
  ReportFrequency
} from '../../../types/sla';

// Re-export commonly used types
export type {
  SLA,
  SLAStatus,
  SLAViolation,
  SLAReport,
  WorkflowMetrics,
  GlobalMetrics,
  MetricType,
  AggregationType,
  ComparisonOperator,
  MetricUnit,
  TimeUnit,
  CriticalityLevel,
  ReportFrequency
};

// Dashboard-specific types
export type TimeRangeOption = '24h' | '7d' | '30d' | '90d';
export type TabType = 'overview' | 'slas' | 'violations' | 'reports' | 'metrics';

export interface SLADashboardProps {
  workflowId?: string;
}

export interface SLAFormData {
  name: string;
  description: string;
  metric: MetricType;
  aggregation: AggregationType;
  operator: ComparisonOperator;
  threshold: number;
  unit: MetricUnit;
  windowDuration: number;
  windowUnit: TimeUnit;
  criticality: CriticalityLevel;
  scheduleType: 'always';
  alertingEnabled: boolean;
  reportingEnabled: boolean;
  reportFrequency: ReportFrequency;
}

export interface SLADataState {
  slas: SLA[];
  slaStatuses: Map<string, SLAStatus>;
  violations: SLAViolation[];
  reports: SLAReport[];
  globalMetrics: GlobalMetrics | null;
  workflowMetrics: WorkflowMetrics | null;
  loading: boolean;
}

export interface SLACalculations {
  healthySLAs: number;
  warningSLAs: number;
  violatingSLAs: number;
  recentViolations: SLAViolation[];
  activeSLAsCount: number;
  compliancePercentage: number;
  unresolvedViolationsCount: number;
}

// Utility type for status-related styling
export type StatusType = 'healthy' | 'warning' | 'violation' | 'unknown';

// Default form data
export const DEFAULT_FORM_DATA: SLAFormData = {
  name: '',
  description: '',
  metric: 'response_time',
  aggregation: 'avg',
  operator: '<=',
  threshold: 1000,
  unit: 'milliseconds',
  windowDuration: 1,
  windowUnit: 'hours',
  criticality: 'high',
  scheduleType: 'always',
  alertingEnabled: true,
  reportingEnabled: true,
  reportFrequency: 'weekly'
};
