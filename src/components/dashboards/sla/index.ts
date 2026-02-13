/**
 * SLA Dashboard Components - Barrel Export
 */

// Components
export { SLAOverview } from './SLAOverview';
export { SLAList } from './SLAList';
export { SLAViolations } from './SLAViolations';
export { SLAReports } from './SLAReports';
export { SLACreateModal } from './SLACreateModal';
export { ViolationDetailsModal } from './ViolationDetailsModal';

// Hooks
export { useSLAData } from './useSLAData';
export { useSLACalculations, getStatusColor, getSeverityBadge, getCriticalityBadge } from './useSLACalculations';

// Types
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
  ReportFrequency,
  TimeRangeOption,
  TabType,
  SLADashboardProps,
  SLAFormData,
  SLADataState,
  SLACalculations,
  StatusType
} from './types';

export { DEFAULT_FORM_DATA } from './types';
