/**
 * Performance Monitoring Service - Layer 2: Advanced Monitoring
 *
 * Responsibilities:
 * - Comprehensive system metrics (CPU, memory, disk, network)
 * - API performance metrics (requests, response times, error rates)
 * - Database metrics (queries, connections, cache hits)
 * - Workflow execution metrics
 * - Cache performance metrics
 * - Error tracking with stack traces
 * - Alert rules with configurable thresholds
 *
 * Use Cases:
 * - Get all metrics: performanceMonitor.getMetrics()
 * - Track API request: performanceMonitor.recordMetric('api.request', data)
 * - Track DB query: performanceMonitor.recordMetric('db.query', data)
 * - Add alert rule: performanceMonitor.addAlertRule(rule)
 *
 * Note: This service extends MonitoringService with detailed subsystem metrics.
 * For basic Prometheus metrics, use MonitoringService.
 * For auto-optimization, use PerformanceOptimizationService.
 *
 * @see src/services/monitoring/index.ts for architecture overview
 * @module PerformanceMonitoringService
 */

import { EventEmitter } from 'events';
import { logger } from './SimpleLogger';
import { BaseService } from './BaseService';
import { MetricsCollector } from './monitoring/performance/MetricsCollector';
import { PerformanceAnalyzer } from './monitoring/performance/PerformanceAnalyzer';
import { AlertManager } from './monitoring/performance/AlertManager';
import { ReportGenerator } from './monitoring/performance/ReportGenerator';
import type {
  InternalPerformanceMetrics,
  MetricSnapshot,
  AlertRule,
  HistoryBucket,
  ExportFormat,
  PerformanceAlert,
  APIRequestData,
  APIResponseData,
  DatabaseQueryData,
  WorkflowExecutionData,
  CacheAccessData,
  ErrorData
} from './monitoring/performance/types';

// Re-export types for external consumers
export type {
  InternalPerformanceMetrics,
  MetricSnapshot,
  AlertRule,
  HistoryBucket,
  ExportFormat,
  PerformanceAlert
};

export class PerformanceMonitoringService extends BaseService {
  private metrics: InternalPerformanceMetrics;
  private eventEmitter: EventEmitter;
  private collectionInterval: NodeJS.Timeout | null = null;

  // Delegated components
  private readonly metricsCollector: MetricsCollector;
  private readonly analyzer: PerformanceAnalyzer;
  private readonly alertManager: AlertManager;
  private readonly reportGenerator: ReportGenerator;

  constructor() {
    super('PerformanceMonitoring');
    this.eventEmitter = new EventEmitter();

    // Initialize components
    this.metricsCollector = new MetricsCollector();
    this.analyzer = new PerformanceAnalyzer();
    this.alertManager = new AlertManager(this.eventEmitter);
    this.reportGenerator = new ReportGenerator();

    // Initialize metrics
    this.metrics = this.metricsCollector.initializeMetrics();

    // Start collection
    this.startMetricCollection();
  }

  /**
   * Start metric collection
   */
  private startMetricCollection(): void {
    this.collectionInterval = setInterval(() => {
      this.collectMetrics().catch(err => {
        logger.error('Failed to collect metrics:', err);
      });
    }, 5000);

    this.eventEmitter.on('metric', this.recordMetric.bind(this));
  }

  /**
   * Collect all metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      await this.metricsCollector.collectSystemMetrics(this.metrics);
      this.analyzer.calculateDerivedMetrics(this.metrics);
      this.alertManager.checkAlertRules(this.metrics);
      this.analyzer.storeMetricSnapshot(this.metrics);
      this.eventEmitter.emit('metrics-updated', this.metrics);
    } catch (error) {
      logger.error('Error collecting metrics:', error);
    }
  }

  /**
   * Record a metric event
   */
  public recordMetric(type: string, data: unknown): void {
    try {
      switch (type) {
        case 'api.request':
          this.metricsCollector.recordAPIRequest(this.metrics, data as APIRequestData);
          break;
        case 'api.response':
          this.metricsCollector.recordAPIResponse(this.metrics, data as APIResponseData);
          break;
        case 'db.query':
          this.metricsCollector.recordDatabaseQuery(this.metrics, data as DatabaseQueryData);
          break;
        case 'workflow.execution':
          this.metricsCollector.recordWorkflowExecution(this.metrics, data as WorkflowExecutionData);
          break;
        case 'cache.access':
          this.metricsCollector.recordCacheAccess(this.metrics, data as CacheAccessData);
          break;
        case 'error':
          this.metricsCollector.recordError(this.metrics, data as ErrorData);
          break;
        default:
          logger.debug(`Unknown metric type: ${type}`);
      }
    } catch (error) {
      logger.error('Failed to record metric:', error);
    }
  }

  /**
   * Get current metrics
   */
  public getMetrics(): InternalPerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metric history
   */
  public getMetricHistory(bucket: HistoryBucket = '5m', limit?: number): MetricSnapshot[] {
    return this.analyzer.getMetricHistory(bucket, limit);
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): PerformanceAlert[] {
    return this.alertManager.getActiveAlerts();
  }

  /**
   * Add custom alert rule
   */
  public addAlertRule(rule: AlertRule): void {
    this.alertManager.addAlertRule(rule);
  }

  /**
   * Remove alert rule
   */
  public removeAlertRule(ruleId: string): void {
    this.alertManager.removeAlertRule(ruleId);
  }

  /**
   * Export metrics data
   */
  public exportMetrics(format: ExportFormat = 'json'): string {
    return this.reportGenerator.exportMetrics(this.metrics, format);
  }

  /**
   * Get query optimization suggestions
   */
  public async getQueryOptimizationSuggestions(query: string): Promise<string[]> {
    return this.analyzer.getQueryOptimizationSuggestions(query);
  }

  /**
   * Subscribe to metric updates
   */
  public on(event: string, listener: (...args: unknown[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Unsubscribe from metric updates
   */
  public off(event: string, listener: (...args: unknown[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
    this.eventEmitter.removeAllListeners();
    super.cleanup();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitoringService();
