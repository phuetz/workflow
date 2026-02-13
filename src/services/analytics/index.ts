/**
 * Analytics Services - Barrel Export
 *
 * Architecture Overview (4 Layers):
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Layer 4: REPORTING (AdvancedAnalyticsService)                      │
 * │  - Dashboards, Funnel/Cohort analysis, Scheduled reports            │
 * │  - BI capabilities, data visualization support                      │
 * └─────────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Layer 3: AGGREGATION (AnalyticsService)                            │
 * │  - Workflow/Node metrics aggregation, Alert rules                   │
 * │  - Performance reports, Real-time monitoring                        │
 * └─────────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Layer 2: STORAGE (AnalyticsPersistence)                            │
 * │  - Time-series backends (InfluxDB, Prometheus, HTTP)                │
 * │  - Batching, retry, compression                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Layer 1: COLLECTION (WorkflowAnalyticsService)                     │
 * │  - Execution recording, Workflow-specific metrics                   │
 * │  - Insights generation, Trend analysis                              │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Usage Guide:
 *
 * - For recording workflow executions: Use workflowAnalytics.recordExecution()
 * - For querying aggregated metrics: Use analyticsService.getWorkflowMetrics()
 * - For persisting to time-series DB: Use analyticsPersistence.writeMetric()
 * - For BI dashboards/reports: Use advancedAnalyticsService.getDashboardData()
 *
 * Backend Note:
 * The backend analyticsService (src/backend/services/analyticsService.ts) handles
 * server-side event tracking and integrates with AnalyticsPersistence for storage.
 *
 * @module analytics
 * @created 2026-01-07
 */

// ============================================
// Layer 1: Collection
// ============================================

export {
  WorkflowAnalyticsService,
  workflowAnalytics
} from '../WorkflowAnalyticsService';

// ============================================
// Layer 2: Storage
// ============================================

export {
  AnalyticsPersistenceService,
  analyticsPersistence,
  type MetricDataPoint,
  type AnalyticsPersistenceConfig,
  type PersistenceBackend
} from '../AnalyticsPersistence';

// ============================================
// Layer 3: Aggregation
// ============================================

export {
  AnalyticsService,
  analyticsService,
  type WorkflowMetrics,
  type NodeMetrics,
  type ExecutionMetrics,
  type PerformanceReport,
  type ReportInsight,
  type ReportRecommendation,
  type BusinessMetrics,
  type AlertRule,
  type AlertAction,
  type Alert,
  type DashboardWidget
} from '../AnalyticsService';

// ============================================
// Layer 4: Reporting / BI
// ============================================

export {
  AdvancedAnalyticsService,
  advancedAnalyticsService
} from '../AdvancedAnalyticsService';

// ============================================
// Convenience type aliases
// ============================================

/** Type alias for workflow execution recording input */
export type { WorkflowExecution, NodeExecution } from '../../types/workflowTypes';

/** Type alias for analytics time ranges */
export type {
  AnalyticsTimeRange,
  WorkflowAnalytics,
  PerformanceMetrics,
  UsageMetrics,
  ReliabilityMetrics,
  TrendData,
  AnalyticsInsight
} from '../../types/analytics';
