/**
 * Performance Module - Barrel Export
 *
 * Unified performance monitoring and optimization module.
 * Consolidates functionality from:
 * - PerformanceMonitoringService
 * - PerformanceOptimizationService
 * - PerformanceMonitoringHub
 * - MetricsCollector
 *
 * Usage:
 * ```typescript
 * import { getPerformanceMonitor, getPerformanceOptimizer } from '@services/performance';
 *
 * // Get performance monitor singleton
 * const monitor = getPerformanceMonitor();
 * monitor.start();
 *
 * // Track application metrics
 * monitor.trackWorkflowStart();
 * monitor.trackWorkflowComplete(1500);
 *
 * // Get performance optimizer singleton
 * const optimizer = getPerformanceOptimizer();
 * optimizer.start();
 *
 * // Record query for optimization analysis
 * optimizer.recordQuery('SELECT * FROM users', 150);
 * optimizer.recordResponseTime(250);
 * ```
 */

// Types
export * from './types';

// Base class
export { MetricsBase } from './MetricsBase';

// System metrics collection
export {
  SystemMetricsCollector,
  getSystemMetrics,
  collectSystemMetrics,
} from './SystemMetrics';

// Performance monitor
export {
  PerformanceMonitor,
  getPerformanceMonitor,
} from './PerformanceMonitor';

// Performance optimizer
export {
  PerformanceOptimizer,
  getPerformanceOptimizer,
  type PerformanceProfile,
  type OptimizationRule,
  type OptimizationMetrics,
  type ResourcePool,
} from './PerformanceOptimizer';

// ============================================================================
// Convenience Factories
// ============================================================================

import type { MetricsCollectorConfig } from './types';
import { PerformanceMonitor } from './PerformanceMonitor';
import { PerformanceOptimizer } from './PerformanceOptimizer';

/**
 * Create and start a performance monitor with default configuration
 */
export function createPerformanceMonitor(
  config?: Partial<MetricsCollectorConfig>
): PerformanceMonitor {
  const monitor = PerformanceMonitor.getInstance(config);
  monitor.start();
  return monitor;
}

/**
 * Create and start a performance optimizer with default configuration
 */
export function createPerformanceOptimizer(
  config?: Partial<MetricsCollectorConfig>
): PerformanceOptimizer {
  const optimizer = PerformanceOptimizer.getInstance(config);
  optimizer.start();
  return optimizer;
}

/**
 * Initialize both monitoring and optimization services
 */
export function initializePerformanceServices(config?: Partial<MetricsCollectorConfig>): {
  monitor: PerformanceMonitor;
  optimizer: PerformanceOptimizer;
} {
  const monitor = createPerformanceMonitor(config);
  const optimizer = createPerformanceOptimizer(config);

  return { monitor, optimizer };
}

// ============================================================================
// Default Instances (deprecated - use getters instead)
// ============================================================================

/**
 * @deprecated Use getPerformanceMonitor() instead
 */
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * @deprecated Use getPerformanceOptimizer() instead
 */
export const performanceOptimizer = PerformanceOptimizer.getInstance();
