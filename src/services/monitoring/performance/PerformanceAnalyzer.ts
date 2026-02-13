/**
 * Performance Analyzer
 *
 * Handles calculation of derived metrics, analysis, and query optimization suggestions.
 * @module monitoring/performance/PerformanceAnalyzer
 */

import type { InternalPerformanceMetrics, MetricSnapshot, HistoryBucket } from './types';

/**
 * PerformanceAnalyzer calculates derived metrics and provides analysis
 */
export class PerformanceAnalyzer {
  private metricHistory: Map<string, MetricSnapshot[]> = new Map();
  private readonly maxHistorySize = 1000;

  /**
   * Calculate derived metrics from raw metrics
   */
  public calculateDerivedMetrics(metrics: InternalPerformanceMetrics): void {
    // API error rate
    if (metrics.api.totalRequests > 0) {
      metrics.api.errorRate =
        (metrics.api.failedRequests / metrics.api.totalRequests) * 100;
    }

    // Cache hit rate
    const totalCacheAccess = metrics.cache.hits + metrics.cache.misses;
    if (totalCacheAccess > 0) {
      metrics.cache.hitRate = metrics.cache.hits / totalCacheAccess;
    }

    // Workflow success rate
    const totalWorkflows = metrics.workflows.successfulExecutions +
                          metrics.workflows.failedExecutions;
    if (totalWorkflows > 0) {
      metrics.workflows.successRate =
        metrics.workflows.successfulExecutions / totalWorkflows;
    }
  }

  /**
   * Store a metric snapshot in history
   */
  public storeMetricSnapshot(metrics: InternalPerformanceMetrics): void {
    const snapshot: MetricSnapshot = {
      timestamp: new Date(),
      cpu: metrics.system.cpu.usage,
      memory: metrics.system.memory.usagePercent,
      disk: metrics.system.disk.usagePercent,
      responseTime: metrics.api.avgResponseTime,
      errorRate: metrics.api.errorRate,
      activeWorkflows: metrics.workflows.activeExecutions
    };

    this.addToHistory('1m', snapshot);
    this.addToHistory('5m', snapshot);
    this.addToHistory('1h', snapshot);
  }

  /**
   * Get metric history for a bucket
   */
  public getMetricHistory(bucket: HistoryBucket = '5m', limit?: number): MetricSnapshot[] {
    const history = this.metricHistory.get(bucket) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get query optimization suggestions
   */
  public async getQueryOptimizationSuggestions(query: string): Promise<string[]> {
    const suggestions: string[] = [];
    const queryLower = query.toLowerCase();

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
   * Add snapshot to history bucket
   */
  private addToHistory(bucket: string, snapshot: MetricSnapshot): void {
    const history = this.metricHistory.get(bucket) || [];
    history.push(snapshot);

    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.metricHistory.set(bucket, history);
  }
}
