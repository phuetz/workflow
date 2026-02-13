/**
 * Performance Monitoring Service
 * Collects and manages performance metrics across the application
 */

import { EventEmitter } from 'events';
import { logger } from './LoggingService';
import { BaseService } from './BaseService';
import type { 
  PerformanceMetrics, 
  SystemMetrics, 
  APIMetrics,
  DatabaseMetrics,
  WorkflowMetrics,
  CacheMetrics,
  MetricSnapshot,
  AlertRule,
  PerformanceAlert
} from '../types/performance';

export class PerformanceMonitoringService extends BaseService {
  private metrics: PerformanceMetrics;
  private eventEmitter: EventEmitter;
  private collectionInterval: NodeJS.Timeout | null = null;
  private alertRules: AlertRule[] = [];
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private metricHistory: Map<string, MetricSnapshot[]> = new Map();
  private readonly maxHistorySize = 1000;

  constructor() {
    super('PerformanceMonitoring');
    this.eventEmitter = new EventEmitter();
    this.metrics = this.initializeMetrics();
    this.setupDefaultAlertRules();
    this.startMetricCollection();
  }

  /**
   * Initialize metrics structure
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      timestamp: new Date(),
      system: this.initializeSystemMetrics(),
      api: this.initializeAPIMetrics(),
      database: this.initializeDatabaseMetrics(),
      workflows: this.initializeWorkflowMetrics(),
      cache: this.initializeCacheMetrics(),
      errors: [],
      alerts: []
    };
  }

  private initializeSystemMetrics(): SystemMetrics {
    return {
      cpu: {
        usage: 0,
        cores: this.getCPUCores(),
        loadAverage: [0, 0, 0]
      },
      memory: {
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0
      },
      disk: {
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0
      },
      network: {
        bytesIn: 0,
        bytesOut: 0,
        packetsIn: 0,
        packetsOut: 0
      },
      uptime: 0
    };
  }

  private initializeAPIMetrics(): APIMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      responseTimeHistory: [],
      endpointMetrics: new Map()
    };
  }

  private initializeDatabaseMetrics(): DatabaseMetrics {
    return {
      totalQueries: 0,
      avgQueryTime: 0,
      slowQueries: [],
      connectionPoolSize: 0,
      activeConnections: 0,
      cacheHitRate: 0,
      queryErrors: 0
    };
  }

  private initializeWorkflowMetrics(): WorkflowMetrics {
    return {
      totalExecutions: 0,
      activeExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      avgExecutionTime: 0,
      executionQueue: 0,
      nodeExecutions: new Map()
    };
  }

  private initializeCacheMetrics(): CacheMetrics {
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictions: 0,
      size: 0,
      memoryUsage: 0
    };
  }

  /**
   * Start metric collection
   */
  private startMetricCollection(): void {
    this.collectionInterval = setInterval(() => {
      this.collectMetrics().catch(err => {
        logger.error('Failed to collect metrics:', err);
      });
    }, 5000); // Collect every 5 seconds

    // Also collect on demand
    this.eventEmitter.on('metric', this.recordMetric.bind(this));
  }

  /**
   * Collect all metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      // Collect system metrics
      await this.collectSystemMetrics();

      // Calculate derived metrics
      this.calculateDerivedMetrics();

      // Check alert rules
      this.checkAlertRules();

      // Store snapshot
      this.storeMetricSnapshot();

      // Emit update event
      this.eventEmitter.emit('metrics-updated', this.metrics);

    } catch (error) {
      logger.error('Error collecting metrics:', error);
    }
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    // In a real implementation, these would come from OS-specific APIs
    // For now, using mock data
    
    // CPU metrics
    this.metrics.system.cpu.usage = this.getCPUUsage();
    this.metrics.system.cpu.loadAverage = this.getLoadAverage();

    // Memory metrics
    this.metrics.system.memory = {
      ...memoryInfo,
      usagePercent: (memoryInfo.used / memoryInfo.total) * 100
    };

    // Disk metrics
    this.metrics.system.disk = {
      ...diskInfo,
      usagePercent: (diskInfo.used / diskInfo.total) * 100
    };

    // Network metrics
    this.metrics.system.network = this.getNetworkInfo();

    // Uptime
    this.metrics.system.uptime = this.getUptime();
  }

  /**
   * Calculate derived metrics
   */
  private calculateDerivedMetrics(): void {
    // API metrics
    if (this.metrics.api.totalRequests > 0) {
      this.metrics.api.errorRate = 
        (this.metrics.api.failedRequests / this.metrics.api.totalRequests) * 100;
    }

    // Cache metrics
    if (totalCacheAccess > 0) {
      this.metrics.cache.hitRate = this.metrics.cache.hits / totalCacheAccess;
    }

    // Workflow success rate
                          this.metrics.workflows.failedExecutions;
    if (totalWorkflows > 0) {
      this.metrics.workflows.successRate = 
        this.metrics.workflows.successfulExecutions / totalWorkflows;
    }
  }

  /**
   * Record a metric event
   */
  public recordMetric(type: string, data: unknown): void {
    try {
      switch (type) {
        case 'api.request':
          this.recordAPIRequest(data);
          break;
        case 'api.response':
          this.recordAPIResponse(data);
          break;
        case 'db.query':
          this.recordDatabaseQuery(data);
          break;
        case 'workflow.execution':
          this.recordWorkflowExecution(data);
          break;
        case 'cache.access':
          this.recordCacheAccess(data);
          break;
        case 'error':
          this.recordError(data);
          break;
        default:
          logger.debug(`Unknown metric type: ${type}`);
      }
    } catch (error) {
      logger.error('Failed to record metric:', error);
    }
  }

  /**
   * Record API request
   */
  private recordAPIRequest(data: {
    endpoint: string;
    method: string;
    timestamp: Date;
  }): void {
    this.metrics.api.totalRequests++;
    
    // Track per-endpoint metrics
      count: 0,
      totalTime: 0,
      errors: 0
    };
    endpointMetric.count++;
    this.metrics.api.endpointMetrics.set(key, endpointMetric);
  }

  /**
   * Record API response
   */
  private recordAPIResponse(data: {
    endpoint: string;
    method: string;
    status: number;
    duration: number;
    timestamp: Date;
  }): void {
    if (data.status >= 200 && data.status < 400) {
      this.metrics.api.successfulRequests++;
    } else {
      this.metrics.api.failedRequests++;
    }

    // Update response time metrics
    this.updateResponseTimeMetrics(data.duration);

    // Update endpoint metrics
    if (endpointMetric) {
      endpointMetric.totalTime += data.duration;
      if (data.status >= 400) {
        endpointMetric.errors++;
      }
    }

    // Add to history
    this.metrics.api.responseTimeHistory.push({
      timestamp: data.timestamp,
      avgTime: data.duration
    });

    // Keep history size in check
    if (this.metrics.api.responseTimeHistory.length > 100) {
      this.metrics.api.responseTimeHistory.shift();
    }
  }

  /**
   * Update response time metrics
   */
  private updateResponseTimeMetrics(duration: number): void {
    // Simple moving average for avg response time
    this.metrics.api.avgResponseTime = 
      (currentAvg * (count - 1) + duration) / count;

    // Update percentiles (simplified - in production use proper algorithm)
    // Store recent response times and calculate percentiles
    if (!this.responseTimes) {
      this.responseTimes = [];
    }
    this.responseTimes.push(duration);
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }

    // Calculate percentiles
    
    this.metrics.api.p95ResponseTime = sorted[p95Index] || duration;
    this.metrics.api.p99ResponseTime = sorted[p99Index] || duration;
  }

  private responseTimes: number[] = [];

  /**
   * Record database query
   */
  private recordDatabaseQuery(data: {
    query: string;
    duration: number;
    success: boolean;
    timestamp: Date;
  }): void {
    this.metrics.database.totalQueries++;

    if (!data.success) {
      this.metrics.database.queryErrors++;
    }

    // Update average query time
    this.metrics.database.avgQueryTime = 
      (currentAvg * (this.metrics.database.totalQueries - 1) + data.duration) / 
      this.metrics.database.totalQueries;

    // Track slow queries
    if (data.duration > 100) { // 100ms threshold
      this.metrics.database.slowQueries.push({
        query: data.query,
        duration: data.duration,
        timestamp: data.timestamp
      });

      // Keep only recent slow queries
      if (this.metrics.database.slowQueries.length > 50) {
        this.metrics.database.slowQueries.shift();
      }
    }
  }

  /**
   * Record workflow execution
   */
  private recordWorkflowExecution(data: {
    workflowId: string;
    status: 'started' | 'completed' | 'failed';
    duration?: number;
    nodeCount?: number;
    timestamp: Date;
  }): void {
    switch (data.status) {
      case 'started':
        this.metrics.workflows.totalExecutions++;
        this.metrics.workflows.activeExecutions++;
        break;
      case 'completed':
        this.metrics.workflows.successfulExecutions++;
        this.metrics.workflows.activeExecutions--;
        if (data.duration) {
          this.updateWorkflowExecutionTime(data.duration);
        }
        break;
      case 'failed':
        this.metrics.workflows.failedExecutions++;
        this.metrics.workflows.activeExecutions--;
        break;
    }
  }

  /**
   * Update workflow execution time
   */
  private updateWorkflowExecutionTime(duration: number): void {
                  this.metrics.workflows.failedExecutions;
    this.metrics.workflows.avgExecutionTime = 
      (currentAvg * (total - 1) + duration) / total;
  }

  /**
   * Record cache access
   */
  private recordCacheAccess(data: {
    hit: boolean;
    key: string;
    size?: number;
    timestamp: Date;
  }): void {
    if (data.hit) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }

    if (data.size !== undefined) {
      this.metrics.cache.size = data.size;
    }
  }

  /**
   * Record error
   */
  private recordError(data: {
    code: string;
    message: string;
    source: string;
    timestamp: Date;
    stack?: string;
  }): void {
    // Find or create error entry
      e => e.code === data.code && e.message === data.message
    );

    if (existingError) {
      existingError.count++;
      existingError.lastOccurred = data.timestamp;
    } else {
      this.metrics.errors.push({
        ...data,
        count: 1,
        lastOccurred: data.timestamp
      });
    }

    // Keep only recent errors
    this.metrics.errors = this.metrics.errors
      .sort((a, b) => b.lastOccurred.getTime() - a.lastOccurred.getTime())
      .slice(0, 100);
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'high-cpu',
        name: 'High CPU Usage',
        condition: (metrics) => metrics.system.cpu.usage > 80,
        threshold: 80,
        severity: 'warning',
        cooldown: 300000 // 5 minutes
      },
      {
        id: 'high-memory',
        name: 'High Memory Usage',
        condition: (metrics) => metrics.system.memory.usagePercent > 85,
        threshold: 85,
        severity: 'warning',
        cooldown: 300000
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: (metrics) => metrics.api.errorRate > 5,
        threshold: 5,
        severity: 'critical',
        cooldown: 60000 // 1 minute
      },
      {
        id: 'slow-response',
        name: 'Slow Response Time',
        condition: (metrics) => metrics.api.avgResponseTime > 1000,
        threshold: 1000,
        severity: 'warning',
        cooldown: 300000
      },
      {
        id: 'database-slow',
        name: 'Database Performance Degraded',
        condition: (metrics) => metrics.database.avgQueryTime > 50,
        threshold: 50,
        severity: 'warning',
        cooldown: 300000
      }
    ];
  }

  /**
   * Check alert rules
   */
  private checkAlertRules(): void {

    for (const rule of this.alertRules) {

      if (isTriggered) {
        if (!existingAlert || now - existingAlert.lastTriggered > rule.cooldown) {
          const alert: PerformanceAlert = {
            id: rule.id,
            name: rule.name,
            severity: rule.severity,
            triggeredAt: new Date(),
            lastTriggered: now,
            value: this.getAlertValue(rule),
            threshold: rule.threshold
          };

          this.activeAlerts.set(rule.id, alert);
          this.metrics.alerts.push(alert);
          this.eventEmitter.emit('alert', alert);

          logger.warn(`Performance alert triggered: ${rule.name}`, {
            value: alert.value,
            threshold: alert.threshold
          });
        }
      } else if (existingAlert) {
        // Alert condition cleared
        this.activeAlerts.delete(rule.id);
        this.eventEmitter.emit('alert-cleared', existingAlert);
      }
    }
  }

  /**
   * Get alert value based on rule
   */
  private getAlertValue(rule: AlertRule): number {
    switch (rule.id) {
      case 'high-cpu':
        return this.metrics.system.cpu.usage;
      case 'high-memory':
        return this.metrics.system.memory.usagePercent;
      case 'high-error-rate':
        return this.metrics.api.errorRate;
      case 'slow-response':
        return this.metrics.api.avgResponseTime;
      case 'database-slow':
        return this.metrics.database.avgQueryTime;
      default:
        return 0;
    }
  }

  /**
   * Store metric snapshot
   */
  private storeMetricSnapshot(): void {
    const snapshot: MetricSnapshot = {
      timestamp: new Date(),
      cpu: this.metrics.system.cpu.usage,
      memory: this.metrics.system.memory.usagePercent,
      disk: this.metrics.system.disk.usagePercent,
      responseTime: this.metrics.api.avgResponseTime,
      errorRate: this.metrics.api.errorRate,
      activeWorkflows: this.metrics.workflows.activeExecutions
    };

    // Store in appropriate history buckets
    this.addToHistory('1m', snapshot);
    this.addToHistory('5m', snapshot);
    this.addToHistory('1h', snapshot);
  }

  /**
   * Add snapshot to history
   */
  private addToHistory(bucket: string, snapshot: MetricSnapshot): void {
    history.push(snapshot);

    // Keep history size in check
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.metricHistory.set(bucket, history);
  }

  /**
   * Get current metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metric history
   */
  public getMetricHistory(
    bucket: '1m' | '5m' | '1h' = '5m',
    limit?: number
  ): MetricSnapshot[] {
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Add custom alert rule
   */
  public addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  /**
   * Remove alert rule
   */
  public removeAlertRule(ruleId: string): void {
    this.alertRules = this.alertRules.filter(r => r.id !== ruleId);
    this.activeAlerts.delete(ruleId);
  }

  /**
   * Export metrics data
   */
  public exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.metrics, null, 2);
    }

    // CSV export
    rows.push('Metric,Value,Timestamp');
    rows.push(`CPU Usage,${this.metrics.system.cpu.usage},${this.metrics.timestamp}`);
    rows.push(`Memory Usage,${this.metrics.system.memory.usagePercent},${this.metrics.timestamp}`);
    rows.push(`Disk Usage,${this.metrics.system.disk.usagePercent},${this.metrics.timestamp}`);
    rows.push(`API Response Time,${this.metrics.api.avgResponseTime},${this.metrics.timestamp}`);
    rows.push(`Error Rate,${this.metrics.api.errorRate},${this.metrics.timestamp}`);
    rows.push(`Active Workflows,${this.metrics.workflows.activeExecutions},${this.metrics.timestamp}`);
    
    return rows.join('\n');
  }

  /**
   * Get query optimization suggestions
   */
  public async getQueryOptimizationSuggestions(query: string): Promise<string[]> {
    const suggestions: string[] = [];

    // Basic pattern matching for common issues

    if (queryLower.includes('select *')) {
      suggestions.push('Avoid SELECT *, specify only needed columns');
    }

    if (!queryLower.includes('limit') && queryLower.includes('select')) {
      suggestions.push('Consider adding LIMIT clause for large result sets');
    }

    if (queryLower.includes('like \'%')) {
      suggestions.push('Leading wildcard in LIKE prevents index usage');
    }

    if (queryLower.match(/join.*join.*join/)) {
      suggestions.push('Multiple JOINs detected, ensure indexes exist on join columns');
    }

    if (queryLower.includes(' or ')) {
      suggestions.push('OR conditions may prevent index usage, consider UNION');
    }

    return suggestions;
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

  // Mock implementations for system metrics
  // In production, these would use actual OS APIs

  private getCPUCores(): number {
    return typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  }

  private getCPUUsage(): number {
    // Mock implementation
    return Math.random() * 30 + 20; // 20-50%
  }

  private getLoadAverage(): [number, number, number] {
    // Mock implementation
    return [
      Math.random() * 2,
      Math.random() * 2,
      Math.random() * 2
    ];
  }

  private getMemoryInfo(): { total: number; used: number; free: number } {
    // Mock implementation
    return {
      total,
      used,
      free: total - used
    };
  }

  private getDiskInfo(): { total: number; used: number; free: number } {
    // Mock implementation
    return {
      total,
      used,
      free: total - used
    };
  }

  private getNetworkInfo(): {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  } {
    // Mock implementation
    return {
      bytesIn: Math.floor(Math.random() * 1000000),
      bytesOut: Math.floor(Math.random() * 1000000),
      packetsIn: Math.floor(Math.random() * 10000),
      packetsOut: Math.floor(Math.random() * 10000)
    };
  }

  private getUptime(): number {
    // Mock implementation - time since service started
    return Date.now() - (this.startTime || Date.now());
  }

  private startTime = Date.now();
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitoringService();