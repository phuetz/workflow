/**
 * Monitoring Services - Barrel Export
 *
 * Architecture Overview (4 Layers):
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Layer 4: UNIFIED HUB (PerformanceMonitoringHub)                    │
 * │  - APM, Distributed tracing, Profiling                              │
 * │  - Custom dashboards, Comprehensive observability                   │
 * │  - Use for: Full observability stack                                │
 * └─────────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Layer 3: OPTIMIZATION (PerformanceOptimizationService)             │
 * │  - Performance profiles, Auto-optimization rules                    │
 * │  - Resource pool management, Query analytics                        │
 * │  - Use for: Auto-tuning and optimization                            │
 * └─────────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Layer 2: ADVANCED MONITORING (PerformanceMonitoringService)        │
 * │  - System, API, DB, Workflow, Cache metrics                         │
 * │  - Alert rules, Metric history                                      │
 * │  - Use for: Detailed performance monitoring                         │
 * └─────────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Layer 1: BASIC MONITORING (MonitoringService)                      │
 * │  - Simple counters, gauges, histograms                              │
 * │  - Prometheus export, Health checks                                 │
 * │  - Use for: Basic metrics and health endpoints                      │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Usage Guide:
 *
 * - For basic health/metrics endpoints: Use monitoringService
 * - For detailed system monitoring: Use performanceMonitoringService
 * - For auto-optimization: Use performanceOptimizationService.getInstance()
 * - For full observability (tracing, profiling): Use performanceMonitoringHub
 *
 * Note: In most cases, start with MonitoringService for basic needs.
 * Escalate to more advanced services as requirements grow.
 *
 * @module monitoring
 * @created 2026-01-07
 */

// ============================================
// Layer 1: Basic Monitoring
// ============================================

export {
  MonitoringService,
  default as monitoringService
} from '../MonitoringService';

// ============================================
// Layer 2: Advanced Monitoring
// ============================================

export { PerformanceMonitoringService } from '../PerformanceMonitoringService';

// ============================================
// Layer 3: Optimization
// ============================================

export { PerformanceOptimizationService } from '../PerformanceOptimizationService';

// ============================================
// Layer 4: Unified Hub
// ============================================

export {
  PerformanceMonitoringHub,
  type Metric,
  type MetricDefinition,
  type MetricAlert,
  type AlertAction,
  type PerformanceSnapshot,
  type CPUMetrics,
  type MemoryMetrics,
  type IOMetrics,
  type NetworkMetrics,
  type Trace,
  type TraceLog,
  type Profile,
  type ProfileSample,
  type ProfileSummary,
  type Dashboard
} from '../core/PerformanceMonitoringHub';

// ============================================
// Common Types
// ============================================

export type { PerformanceAlert } from '../../types/performance';
