/**
 * Metrics Collector
 *
 * Handles collection and initialization of system, API, database,
 * workflow, and cache metrics.
 * @module monitoring/performance/MetricsCollector
 */

import { logger } from '../../SimpleLogger';
import type {
  SystemMetrics,
  APIMetrics,
  DatabaseMetrics,
  WorkflowMetrics,
  CacheMetrics,
  InternalPerformanceMetrics,
  APIRequestData,
  APIResponseData,
  DatabaseQueryData,
  WorkflowExecutionData,
  CacheAccessData,
  ErrorData,
  ErrorMetric
} from './types';

/**
 * MetricsCollector handles initialization and recording of all metric types
 */
export class MetricsCollector {
  private responseTimes: number[] = [];
  private readonly startTime = Date.now();

  /**
   * Initialize complete metrics structure
   */
  public initializeMetrics(): InternalPerformanceMetrics {
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

  public initializeSystemMetrics(): SystemMetrics {
    return {
      cpu: {
        usage: 0,
        cores: this.getCPUCores(),
        loadAverage: [0, 0, 0]
      },
      memory: { total: 0, used: 0, free: 0, usagePercent: 0 },
      disk: { total: 0, used: 0, free: 0, usagePercent: 0 },
      network: { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0 },
      uptime: 0
    };
  }

  public initializeAPIMetrics(): APIMetrics {
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

  public initializeDatabaseMetrics(): DatabaseMetrics {
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

  public initializeWorkflowMetrics(): WorkflowMetrics {
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

  public initializeCacheMetrics(): CacheMetrics {
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
   * Collect system metrics
   */
  public async collectSystemMetrics(metrics: InternalPerformanceMetrics): Promise<void> {
    // CPU metrics
    metrics.system.cpu.usage = this.getCPUUsage();
    metrics.system.cpu.loadAverage = this.getLoadAverage();

    // Memory metrics
    const memoryInfo = this.getMemoryInfo();
    metrics.system.memory = {
      ...memoryInfo,
      usagePercent: (memoryInfo.used / memoryInfo.total) * 100
    };

    // Disk metrics
    const diskInfo = this.getDiskInfo();
    metrics.system.disk = {
      ...diskInfo,
      usagePercent: (diskInfo.used / diskInfo.total) * 100
    };

    // Network and uptime
    metrics.system.network = this.getNetworkInfo();
    metrics.system.uptime = this.getUptime();
  }

  /**
   * Record API request
   */
  public recordAPIRequest(metrics: InternalPerformanceMetrics, data: APIRequestData): void {
    metrics.api.totalRequests++;

    const key = `${data.method.toUpperCase()} ${data.endpoint}`;
    const endpointMetric = metrics.api.endpointMetrics.get(key) || {
      count: 0,
      totalTime: 0,
      errors: 0
    };
    endpointMetric.count++;
    metrics.api.endpointMetrics.set(key, endpointMetric);
  }

  /**
   * Record API response
   */
  public recordAPIResponse(metrics: InternalPerformanceMetrics, data: APIResponseData): void {
    if (data.status >= 200 && data.status < 400) {
      metrics.api.successfulRequests++;
    } else {
      metrics.api.failedRequests++;
    }

    this.updateResponseTimeMetrics(metrics, data.duration);

    const key = `${data.method.toUpperCase()} ${data.endpoint}`;
    const endpointMetric = metrics.api.endpointMetrics.get(key);
    if (endpointMetric) {
      endpointMetric.totalTime += data.duration;
      if (data.status >= 400) {
        endpointMetric.errors++;
      }
    }

    metrics.api.responseTimeHistory.push({
      timestamp: data.timestamp,
      avgTime: data.duration
    });

    if (metrics.api.responseTimeHistory.length > 100) {
      metrics.api.responseTimeHistory.shift();
    }
  }

  /**
   * Record database query
   */
  public recordDatabaseQuery(metrics: InternalPerformanceMetrics, data: DatabaseQueryData): void {
    metrics.database.totalQueries++;

    if (!data.success) {
      metrics.database.queryErrors++;
    }

    const currentAvg = metrics.database.avgQueryTime;
    metrics.database.avgQueryTime =
      (currentAvg * (metrics.database.totalQueries - 1) + data.duration) /
      metrics.database.totalQueries;

    if (data.duration > 100) {
      metrics.database.slowQueries.push({
        query: data.query,
        duration: data.duration,
        timestamp: data.timestamp
      });

      if (metrics.database.slowQueries.length > 50) {
        metrics.database.slowQueries.shift();
      }
    }
  }

  /**
   * Record workflow execution
   */
  public recordWorkflowExecution(metrics: InternalPerformanceMetrics, data: WorkflowExecutionData): void {
    switch (data.status) {
      case 'started':
        metrics.workflows.totalExecutions++;
        metrics.workflows.activeExecutions++;
        break;
      case 'completed':
        metrics.workflows.successfulExecutions++;
        metrics.workflows.activeExecutions--;
        if (data.duration) {
          this.updateWorkflowExecutionTime(metrics, data.duration);
        }
        break;
      case 'failed':
        metrics.workflows.failedExecutions++;
        metrics.workflows.activeExecutions--;
        break;
    }
  }

  /**
   * Record cache access
   */
  public recordCacheAccess(metrics: InternalPerformanceMetrics, data: CacheAccessData): void {
    if (data.hit) {
      metrics.cache.hits++;
    } else {
      metrics.cache.misses++;
    }

    if (data.size !== undefined) {
      metrics.cache.size = data.size;
    }
  }

  /**
   * Record error
   */
  public recordError(metrics: InternalPerformanceMetrics, data: ErrorData): void {
    const existingError = metrics.errors.find(
      e => e.code === data.code && e.message === data.message
    );

    if (existingError) {
      existingError.count++;
      existingError.lastOccurred = data.timestamp;
    } else {
      const newError: ErrorMetric = {
        ...data,
        count: 1,
        lastOccurred: data.timestamp
      };
      metrics.errors.push(newError);
    }

    metrics.errors = metrics.errors
      .sort((a, b) => b.lastOccurred.getTime() - a.lastOccurred.getTime())
      .slice(0, 100);
  }

  // Private helper methods

  private updateResponseTimeMetrics(metrics: InternalPerformanceMetrics, duration: number): void {
    const count = metrics.api.totalRequests;
    const currentAvg = metrics.api.avgResponseTime;
    metrics.api.avgResponseTime = (currentAvg * (count - 1) + duration) / count;

    this.responseTimes.push(duration);
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    metrics.api.p95ResponseTime = sorted[p95Index] || duration;
    metrics.api.p99ResponseTime = sorted[p99Index] || duration;
  }

  private updateWorkflowExecutionTime(metrics: InternalPerformanceMetrics, duration: number): void {
    const total = metrics.workflows.successfulExecutions + metrics.workflows.failedExecutions;
    const currentAvg = metrics.workflows.avgExecutionTime;
    metrics.workflows.avgExecutionTime = (currentAvg * (total - 1) + duration) / total;
  }

  // System info methods (mock implementations)

  private getCPUCores(): number {
    return typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  }

  private getCPUUsage(): number {
    return Math.random() * 30 + 20;
  }

  private getLoadAverage(): [number, number, number] {
    return [Math.random() * 2, Math.random() * 2, Math.random() * 2];
  }

  private getMemoryInfo(): { total: number; used: number; free: number } {
    const total = 8 * 1024 * 1024 * 1024;
    const used = Math.floor(total * (0.4 + Math.random() * 0.3));
    return { total, used, free: total - used };
  }

  private getDiskInfo(): { total: number; used: number; free: number } {
    const total = 500 * 1024 * 1024 * 1024;
    const used = Math.floor(total * (0.5 + Math.random() * 0.3));
    return { total, used, free: total - used };
  }

  private getNetworkInfo(): { bytesIn: number; bytesOut: number; packetsIn: number; packetsOut: number } {
    return {
      bytesIn: Math.floor(Math.random() * 1000000),
      bytesOut: Math.floor(Math.random() * 1000000),
      packetsIn: Math.floor(Math.random() * 10000),
      packetsOut: Math.floor(Math.random() * 10000)
    };
  }

  private getUptime(): number {
    return Date.now() - this.startTime;
  }
}
