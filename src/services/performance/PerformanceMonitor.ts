/**
 * Performance Module - PerformanceMonitor
 *
 * Real-time performance monitoring service built on MetricsBase.
 * Provides comprehensive monitoring with:
 * - System metrics collection
 * - Application metrics tracking
 * - Default alert rules
 * - Prometheus export
 *
 * Replaces functionality from:
 * - PerformanceMonitoringService
 * - MetricsCollector
 * - PerformanceMonitoringHub
 */

import { MetricsBase } from './MetricsBase';
import { SystemMetricsCollector, collectSystemMetrics } from './SystemMetrics';
import { logger } from '../SimpleLogger';
import type {
  AlertConfig,
  MetricDefinition,
  SystemMetrics,
  MetricsCollectorConfig,
} from './types';

/**
 * Application-level metrics tracking
 */
interface ApplicationMetrics {
  // Workflow tracking
  workflowsActive: number;
  workflowsCompleted: number;
  workflowsFailed: number;
  workflowDurations: number[];

  // Queue tracking
  queuePending: number;
  queueProcessing: number;
  queueCompleted: number;
  queueFailed: number;
  queueWaitTimes: number[];

  // Cache tracking
  cacheHits: number;
  cacheMisses: number;
  cacheSize: number;
  cacheEvictions: number;

  // Error tracking
  errorCount: number;
  errorsByType: Record<string, number>;
  recentErrors: Array<{ type: string; message: string; timestamp: number }>;
}

/**
 * Real-time performance monitoring service
 */
export class PerformanceMonitor extends MetricsBase {
  private static instance: PerformanceMonitor | null = null;

  private systemCollector: SystemMetricsCollector;
  private appMetrics: ApplicationMetrics;
  private systemMetricsHistory: SystemMetrics[] = [];

  private constructor(config?: Partial<MetricsCollectorConfig>) {
    super(config);
    this.systemCollector = new SystemMetricsCollector();
    this.appMetrics = this.createEmptyAppMetrics();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<MetricsCollectorConfig>): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(config);
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    if (PerformanceMonitor.instance) {
      PerformanceMonitor.instance.stop();
      PerformanceMonitor.instance = null;
    }
  }

  /**
   * Initialize the service
   */
  protected initializeService(): void {
    this.registerDefaultMetrics();
    this.setupDefaultAlerts();
    logger.info('PerformanceMonitor initialized');
  }

  /**
   * Collect metrics - called by interval
   */
  protected collectMetrics(): void {
    try {
      // Collect system metrics
      const systemMetrics = collectSystemMetrics();

      // Store system metrics history
      this.systemMetricsHistory.push(systemMetrics);
      if (this.systemMetricsHistory.length > this.config.maxDataPoints) {
        this.systemMetricsHistory = this.systemMetricsHistory.slice(-this.config.maxDataPoints);
      }

      // Record as typed metrics
      this.recordSystemMetrics(systemMetrics);

      // Emit metrics event
      this.emit('metrics:collected', systemMetrics);
    } catch (error) {
      logger.error('Error collecting metrics:', error);
    }
  }

  /**
   * Record system metrics as individual typed metrics
   */
  private recordSystemMetrics(metrics: SystemMetrics): void {
    // CPU metrics
    this.gauge('system.cpu.usage', metrics.cpu.usage);
    this.gauge('system.cpu.user', metrics.cpu.user || 0);
    this.gauge('system.cpu.system', metrics.cpu.system || 0);
    this.gauge('system.cpu.idle', metrics.cpu.idle || 0);
    this.gauge('system.cpu.load_1m', metrics.cpu.loadAverage[0]);
    this.gauge('system.cpu.load_5m', metrics.cpu.loadAverage[1]);
    this.gauge('system.cpu.load_15m', metrics.cpu.loadAverage[2]);

    // Memory metrics
    this.gauge('system.memory.used', metrics.memory.used);
    this.gauge('system.memory.free', metrics.memory.free);
    this.gauge('system.memory.total', metrics.memory.total);
    this.gauge('system.memory.percentage', metrics.memory.percentage);

    if (metrics.memory.heapUsed !== undefined) {
      this.gauge('system.memory.heap_used', metrics.memory.heapUsed);
    }
    if (metrics.memory.heapTotal !== undefined) {
      this.gauge('system.memory.heap_total', metrics.memory.heapTotal);
    }

    // Disk metrics
    if (metrics.disk) {
      this.gauge('system.disk.used', metrics.disk.used);
      this.gauge('system.disk.free', metrics.disk.free);
      this.gauge('system.disk.percentage', metrics.disk.percentage);
    }

    // Network metrics
    if (metrics.network) {
      this.increment('system.network.bytes_in', metrics.network.bytesIn);
      this.increment('system.network.bytes_out', metrics.network.bytesOut);
    }

    // Uptime
    if (metrics.uptime !== undefined) {
      this.gauge('system.uptime', metrics.uptime);
    }
  }

  // ============================================================================
  // Application Metrics Tracking
  // ============================================================================

  /**
   * Track workflow start
   */
  trackWorkflowStart(workflowId?: string): void {
    this.appMetrics.workflowsActive++;
    this.gauge('app.workflows.active', this.appMetrics.workflowsActive);
    this.increment('app.workflows.started');
    this.emit('workflow:started', { workflowId });
  }

  /**
   * Track workflow completion
   */
  trackWorkflowComplete(durationMs: number, workflowId?: string): void {
    this.appMetrics.workflowsActive = Math.max(0, this.appMetrics.workflowsActive - 1);
    this.appMetrics.workflowsCompleted++;
    this.appMetrics.workflowDurations.push(durationMs);

    // Keep only last 1000 durations
    if (this.appMetrics.workflowDurations.length > 1000) {
      this.appMetrics.workflowDurations = this.appMetrics.workflowDurations.slice(-1000);
    }

    this.gauge('app.workflows.active', this.appMetrics.workflowsActive);
    this.increment('app.workflows.completed');
    this.histogram('app.workflows.duration', durationMs);

    this.emit('workflow:completed', { workflowId, duration: durationMs });
  }

  /**
   * Track workflow failure
   */
  trackWorkflowFailed(error?: string, workflowId?: string): void {
    this.appMetrics.workflowsActive = Math.max(0, this.appMetrics.workflowsActive - 1);
    this.appMetrics.workflowsFailed++;

    this.gauge('app.workflows.active', this.appMetrics.workflowsActive);
    this.increment('app.workflows.failed');

    if (error) {
      this.trackError('workflow_failure', error);
    }

    this.emit('workflow:failed', { workflowId, error });
  }

  /**
   * Track queue item added
   */
  trackQueueAdd(): void {
    this.appMetrics.queuePending++;
    this.gauge('app.queue.pending', this.appMetrics.queuePending);
  }

  /**
   * Track queue processing started
   */
  trackQueueProcessingStart(waitTimeMs: number): void {
    this.appMetrics.queuePending = Math.max(0, this.appMetrics.queuePending - 1);
    this.appMetrics.queueProcessing++;
    this.appMetrics.queueWaitTimes.push(waitTimeMs);

    if (this.appMetrics.queueWaitTimes.length > 1000) {
      this.appMetrics.queueWaitTimes = this.appMetrics.queueWaitTimes.slice(-1000);
    }

    this.gauge('app.queue.pending', this.appMetrics.queuePending);
    this.gauge('app.queue.processing', this.appMetrics.queueProcessing);
    this.histogram('app.queue.wait_time', waitTimeMs);
  }

  /**
   * Track queue item completed
   */
  trackQueueComplete(): void {
    this.appMetrics.queueProcessing = Math.max(0, this.appMetrics.queueProcessing - 1);
    this.appMetrics.queueCompleted++;

    this.gauge('app.queue.processing', this.appMetrics.queueProcessing);
    this.increment('app.queue.completed');
  }

  /**
   * Track queue item failed
   */
  trackQueueFailed(): void {
    this.appMetrics.queueProcessing = Math.max(0, this.appMetrics.queueProcessing - 1);
    this.appMetrics.queueFailed++;

    this.gauge('app.queue.processing', this.appMetrics.queueProcessing);
    this.increment('app.queue.failed');
  }

  /**
   * Track cache hit
   */
  trackCacheHit(): void {
    this.appMetrics.cacheHits++;
    this.increment('app.cache.hits');
    this.updateCacheHitRate();
  }

  /**
   * Track cache miss
   */
  trackCacheMiss(): void {
    this.appMetrics.cacheMisses++;
    this.increment('app.cache.misses');
    this.updateCacheHitRate();
  }

  /**
   * Update cache size
   */
  updateCacheSize(size: number): void {
    this.appMetrics.cacheSize = size;
    this.gauge('app.cache.size', size);
  }

  /**
   * Track cache eviction
   */
  trackCacheEviction(): void {
    this.appMetrics.cacheEvictions++;
    this.increment('app.cache.evictions');
  }

  /**
   * Track an error
   */
  trackError(type: string, message: string): void {
    this.appMetrics.errorCount++;
    this.appMetrics.errorsByType[type] = (this.appMetrics.errorsByType[type] || 0) + 1;

    this.appMetrics.recentErrors.push({
      type,
      message,
      timestamp: Date.now(),
    });

    // Keep only last 100 errors
    if (this.appMetrics.recentErrors.length > 100) {
      this.appMetrics.recentErrors = this.appMetrics.recentErrors.slice(-100);
    }

    this.increment('app.errors.total');
    this.increment('app.errors.by_type', 1, { type });

    this.emit('error:tracked', { type, message });
  }

  private updateCacheHitRate(): void {
    const total = this.appMetrics.cacheHits + this.appMetrics.cacheMisses;
    if (total > 0) {
      const hitRate = this.appMetrics.cacheHits / total;
      this.gauge('app.cache.hit_rate', hitRate);
    }
  }

  // ============================================================================
  // Data Retrieval
  // ============================================================================

  /**
   * Get current system metrics
   */
  getCurrentSystemMetrics(): SystemMetrics | null {
    return this.systemMetricsHistory[this.systemMetricsHistory.length - 1] || null;
  }

  /**
   * Get system metrics history
   */
  getSystemMetricsHistory(periodMs?: number): SystemMetrics[] {
    if (!periodMs) {
      return [...this.systemMetricsHistory];
    }

    const cutoff = Date.now() - periodMs;
    return this.systemMetricsHistory.filter((m) => m.timestamp > cutoff);
  }

  /**
   * Get average system metrics over a period
   */
  getAverageSystemMetrics(periodMs?: number): Partial<SystemMetrics> {
    const history = this.getSystemMetricsHistory(periodMs);

    if (history.length === 0) {
      return {};
    }

    const sum = history.reduce(
      (acc, m) => ({
        cpu: acc.cpu + m.cpu.usage,
        memory: acc.memory + m.memory.percentage,
      }),
      { cpu: 0, memory: 0 }
    );

    return {
      cpu: {
        usage: sum.cpu / history.length,
        cores: history[0].cpu.cores,
        loadAverage: history[0].cpu.loadAverage,
      },
      memory: {
        percentage: sum.memory / history.length,
        total: history[0].memory.total,
        used: 0,
        free: 0,
      },
    };
  }

  /**
   * Get application metrics
   */
  getApplicationMetrics(): ApplicationMetrics {
    return { ...this.appMetrics };
  }

  /**
   * Get workflow statistics
   */
  getWorkflowStats(): {
    active: number;
    completed: number;
    failed: number;
    avgDuration: number;
    successRate: number;
  } {
    const total = this.appMetrics.workflowsCompleted + this.appMetrics.workflowsFailed;
    const avgDuration = this.average(this.appMetrics.workflowDurations);
    const successRate = total > 0 ? this.appMetrics.workflowsCompleted / total : 0;

    return {
      active: this.appMetrics.workflowsActive,
      completed: this.appMetrics.workflowsCompleted,
      failed: this.appMetrics.workflowsFailed,
      avgDuration,
      successRate,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private createEmptyAppMetrics(): ApplicationMetrics {
    return {
      workflowsActive: 0,
      workflowsCompleted: 0,
      workflowsFailed: 0,
      workflowDurations: [],
      queuePending: 0,
      queueProcessing: 0,
      queueCompleted: 0,
      queueFailed: 0,
      queueWaitTimes: [],
      cacheHits: 0,
      cacheMisses: 0,
      cacheSize: 0,
      cacheEvictions: 0,
      errorCount: 0,
      errorsByType: {},
      recentErrors: [],
    };
  }

  private registerDefaultMetrics(): void {
    const definitions: MetricDefinition[] = [
      {
        name: 'system.cpu.usage',
        type: 'gauge',
        unit: 'percent',
        description: 'CPU usage percentage',
      },
      {
        name: 'system.memory.percentage',
        type: 'gauge',
        unit: 'percent',
        description: 'Memory usage percentage',
      },
      {
        name: 'system.memory.used',
        type: 'gauge',
        unit: 'bytes',
        description: 'Memory used in bytes',
      },
      {
        name: 'app.workflows.active',
        type: 'gauge',
        description: 'Number of active workflows',
      },
      {
        name: 'app.workflows.duration',
        type: 'histogram',
        unit: 'milliseconds',
        description: 'Workflow execution duration',
      },
      {
        name: 'app.queue.pending',
        type: 'gauge',
        description: 'Number of pending queue items',
      },
      {
        name: 'app.cache.hit_rate',
        type: 'gauge',
        description: 'Cache hit rate',
      },
      {
        name: 'app.errors.total',
        type: 'counter',
        description: 'Total error count',
      },
    ];

    for (const def of definitions) {
      this.metricDefinitions.set(def.name, def);
    }
  }

  private setupDefaultAlerts(): void {
    const defaultAlerts: AlertConfig[] = [
      {
        id: 'high-cpu',
        name: 'High CPU Usage',
        metricName: 'system.cpu.usage',
        operator: 'gt',
        threshold: 80,
        severity: 'warning',
        message: 'CPU usage is above 80%',
        cooldownMs: 300000, // 5 minutes
        enabled: true,
      },
      {
        id: 'critical-cpu',
        name: 'Critical CPU Usage',
        metricName: 'system.cpu.usage',
        operator: 'gt',
        threshold: 95,
        severity: 'critical',
        message: 'CPU usage is above 95%',
        cooldownMs: 60000, // 1 minute
        enabled: true,
      },
      {
        id: 'high-memory',
        name: 'High Memory Usage',
        metricName: 'system.memory.percentage',
        operator: 'gt',
        threshold: 85,
        severity: 'warning',
        message: 'Memory usage is above 85%',
        cooldownMs: 300000,
        enabled: true,
      },
      {
        id: 'critical-memory',
        name: 'Critical Memory Usage',
        metricName: 'system.memory.percentage',
        operator: 'gt',
        threshold: 95,
        severity: 'critical',
        message: 'Memory usage is above 95%',
        cooldownMs: 60000,
        enabled: true,
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        metricName: 'app.errors.total',
        operator: 'gt',
        threshold: 100,
        severity: 'warning',
        message: 'Error count is above 100',
        cooldownMs: 300000,
        enabled: true,
      },
    ];

    for (const alert of defaultAlerts) {
      this.addAlert(alert);
    }
  }

  /**
   * Reset application metrics
   */
  override reset(): void {
    super.reset();
    this.appMetrics = this.createEmptyAppMetrics();
    this.systemMetricsHistory = [];
  }
}

// Export singleton factory
export function getPerformanceMonitor(config?: Partial<MetricsCollectorConfig>): PerformanceMonitor {
  return PerformanceMonitor.getInstance(config);
}
