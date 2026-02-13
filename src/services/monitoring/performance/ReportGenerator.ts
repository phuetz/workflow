/**
 * Report Generator
 *
 * Handles exporting metrics in various formats (JSON, CSV).
 * @module monitoring/performance/ReportGenerator
 */

import type { InternalPerformanceMetrics, ExportFormat } from './types';

/**
 * ReportGenerator handles metric export and report generation
 */
export class ReportGenerator {
  /**
   * Export metrics data in specified format
   */
  public exportMetrics(metrics: InternalPerformanceMetrics, format: ExportFormat = 'json'): string {
    if (format === 'json') {
      return this.exportAsJSON(metrics);
    }
    return this.exportAsCSV(metrics);
  }

  /**
   * Export metrics as JSON
   */
  private exportAsJSON(metrics: InternalPerformanceMetrics): string {
    return JSON.stringify(metrics, this.mapReplacer, 2);
  }

  /**
   * Export metrics as CSV
   */
  private exportAsCSV(metrics: InternalPerformanceMetrics): string {
    const rows: string[] = [];
    rows.push('Metric,Value,Timestamp');
    rows.push(`CPU Usage,${metrics.system.cpu.usage},${metrics.timestamp}`);
    rows.push(`Memory Usage,${metrics.system.memory.usagePercent},${metrics.timestamp}`);
    rows.push(`Disk Usage,${metrics.system.disk.usagePercent},${metrics.timestamp}`);
    rows.push(`API Response Time,${metrics.api.avgResponseTime},${metrics.timestamp}`);
    rows.push(`Error Rate,${metrics.api.errorRate},${metrics.timestamp}`);
    rows.push(`Active Workflows,${metrics.workflows.activeExecutions},${metrics.timestamp}`);
    rows.push(`Total Requests,${metrics.api.totalRequests},${metrics.timestamp}`);
    rows.push(`Cache Hit Rate,${metrics.cache.hitRate},${metrics.timestamp}`);
    rows.push(`Database Queries,${metrics.database.totalQueries},${metrics.timestamp}`);
    rows.push(`Query Errors,${metrics.database.queryErrors},${metrics.timestamp}`);

    return rows.join('\n');
  }

  /**
   * JSON replacer to handle Map serialization
   */
  private mapReplacer(_key: string, value: unknown): unknown {
    if (value instanceof Map) {
      return Object.fromEntries(value);
    }
    return value;
  }
}
