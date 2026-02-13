/**
 * Webhook Analytics System
 * Comprehensive request logging, tracking, and analysis
 */

import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';

export interface WebhookLog {
  id: string;
  webhookId: string;
  timestamp: Date;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: any;
  bodySize: number;
  ip?: string;
  userAgent?: string;
  statusCode: number;
  responseTime: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AnalyticsSummary {
  webhookId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsByMethod: Record<string, number>;
  requestsByStatus: Record<number, number>;
  requestsByHour: Record<number, number>;
  topIPs: Array<{ ip: string; count: number }>;
  topUserAgents: Array<{ userAgent: string; count: number }>;
  errorsByType: Record<string, number>;
  dataTransferred: number; // bytes
}

export interface ErrorAnalysis {
  webhookId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalErrors: number;
  errorRate: number;
  errorsByStatus: Record<number, number>;
  errorsByType: Record<string, number>;
  topErrors: Array<{
    error: string;
    count: number;
    lastOccurrence: Date;
  }>;
  errorTrends: Array<{
    hour: number;
    count: number;
  }>;
}

export interface PerformanceMetrics {
  webhookId: string;
  period: {
    start: Date;
    end: Date;
  };
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  slowestRequests: Array<{
    timestamp: Date;
    responseTime: number;
    path: string;
  }>;
}

export class WebhookAnalytics extends EventEmitter {
  private logs: Map<string, WebhookLog> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  // Configuration
  private readonly MAX_LOGS = 10000; // Maximum logs to keep in memory
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  private readonly LOG_RETENTION = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    super();
    this.startCleanupTask();
    logger.info('WebhookAnalytics initialized');
  }

  /**
   * Log a webhook request
   */
  logRequest(log: Omit<WebhookLog, 'id' | 'timestamp'>): WebhookLog {
    const webhookLog: WebhookLog = {
      ...log,
      id: this.generateLogId(),
      timestamp: new Date()
    };

    this.logs.set(webhookLog.id, webhookLog);

    // Emit event for real-time monitoring
    this.emit('log:created', webhookLog);

    // Cleanup if we've exceeded max logs
    if (this.logs.size > this.MAX_LOGS) {
      this.cleanupOldLogs();
    }

    return webhookLog;
  }

  /**
   * Get logs for a webhook
   */
  getLogs(
    webhookId?: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      success?: boolean;
      method?: string;
      minResponseTime?: number;
      maxResponseTime?: number;
    }
  ): WebhookLog[] {
    let logs = Array.from(this.logs.values());

    // Filter by webhook ID
    if (webhookId) {
      logs = logs.filter(log => log.webhookId === webhookId);
    }

    // Filter by date range
    if (options?.startDate) {
      logs = logs.filter(log => log.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      logs = logs.filter(log => log.timestamp <= options.endDate!);
    }

    // Filter by success/failure
    if (options?.success !== undefined) {
      logs = logs.filter(log => log.success === options.success);
    }

    // Filter by method
    if (options?.method) {
      logs = logs.filter(log => log.method === options.method);
    }

    // Filter by response time
    if (options?.minResponseTime !== undefined) {
      logs = logs.filter(log => log.responseTime >= options.minResponseTime!);
    }
    if (options?.maxResponseTime !== undefined) {
      logs = logs.filter(log => log.responseTime <= options.maxResponseTime!);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;

    return logs.slice(offset, offset + limit);
  }

  /**
   * Get analytics summary
   */
  getSummary(
    webhookId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): AnalyticsSummary {
    const logs = this.getLogs(webhookId, {
      startDate: options?.startDate,
      endDate: options?.endDate,
      limit: Infinity
    });

    const totalRequests = logs.length;
    const successfulRequests = logs.filter(log => log.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    // Response time metrics
    const responseTimes = logs.map(log => log.responseTime).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
    const medianResponseTime = this.calculatePercentile(responseTimes, 50);
    const p95ResponseTime = this.calculatePercentile(responseTimes, 95);
    const p99ResponseTime = this.calculatePercentile(responseTimes, 99);

    // Requests by method
    const requestsByMethod: Record<string, number> = {};
    logs.forEach(log => {
      requestsByMethod[log.method] = (requestsByMethod[log.method] || 0) + 1;
    });

    // Requests by status code
    const requestsByStatus: Record<number, number> = {};
    logs.forEach(log => {
      requestsByStatus[log.statusCode] = (requestsByStatus[log.statusCode] || 0) + 1;
    });

    // Requests by hour
    const requestsByHour: Record<number, number> = {};
    logs.forEach(log => {
      const hour = log.timestamp.getHours();
      requestsByHour[hour] = (requestsByHour[hour] || 0) + 1;
    });

    // Top IPs
    const ipCounts: Record<string, number> = {};
    logs.forEach(log => {
      if (log.ip) {
        ipCounts[log.ip] = (ipCounts[log.ip] || 0) + 1;
      }
    });
    const topIPs = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top User Agents
    const uaCounts: Record<string, number> = {};
    logs.forEach(log => {
      if (log.userAgent) {
        uaCounts[log.userAgent] = (uaCounts[log.userAgent] || 0) + 1;
      }
    });
    const topUserAgents = Object.entries(uaCounts)
      .map(([userAgent, count]) => ({ userAgent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Errors by type
    const errorsByType: Record<string, number> = {};
    logs.forEach(log => {
      if (!log.success && log.error) {
        const errorType = this.categorizeError(log.error);
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      }
    });

    // Data transferred
    const dataTransferred = logs.reduce((sum, log) => sum + log.bodySize, 0);

    return {
      webhookId,
      period: {
        start: options?.startDate || new Date(Math.min(...logs.map(l => l.timestamp.getTime()))),
        end: options?.endDate || new Date(Math.max(...logs.map(l => l.timestamp.getTime())))
      },
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate,
      averageResponseTime,
      medianResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      requestsByMethod,
      requestsByStatus,
      requestsByHour,
      topIPs,
      topUserAgents,
      errorsByType,
      dataTransferred
    };
  }

  /**
   * Get error analysis
   */
  getErrorAnalysis(
    webhookId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): ErrorAnalysis {
    const logs = this.getLogs(webhookId, {
      startDate: options?.startDate,
      endDate: options?.endDate,
      success: false,
      limit: Infinity
    });

    const totalRequests = this.getLogs(webhookId, {
      startDate: options?.startDate,
      endDate: options?.endDate,
      limit: Infinity
    }).length;

    const totalErrors = logs.length;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    // Errors by status code
    const errorsByStatus: Record<number, number> = {};
    logs.forEach(log => {
      errorsByStatus[log.statusCode] = (errorsByStatus[log.statusCode] || 0) + 1;
    });

    // Errors by type
    const errorsByType: Record<string, number> = {};
    const errorDetails: Record<string, { count: number; lastOccurrence: Date }> = {};

    logs.forEach(log => {
      if (log.error) {
        const errorType = this.categorizeError(log.error);
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;

        if (!errorDetails[log.error] || errorDetails[log.error].lastOccurrence < log.timestamp) {
          errorDetails[log.error] = {
            count: (errorDetails[log.error]?.count || 0) + 1,
            lastOccurrence: log.timestamp
          };
        }
      }
    });

    // Top errors
    const topErrors = Object.entries(errorDetails)
      .map(([error, details]) => ({
        error,
        count: details.count,
        lastOccurrence: details.lastOccurrence
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Error trends by hour
    const errorTrends: Record<number, number> = {};
    logs.forEach(log => {
      const hour = log.timestamp.getHours();
      errorTrends[hour] = (errorTrends[hour] || 0) + 1;
    });

    return {
      webhookId,
      period: {
        start: options?.startDate || new Date(Math.min(...logs.map(l => l.timestamp.getTime()))),
        end: options?.endDate || new Date(Math.max(...logs.map(l => l.timestamp.getTime())))
      },
      totalErrors,
      errorRate,
      errorsByStatus,
      errorsByType,
      topErrors,
      errorTrends: Object.entries(errorTrends)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => a.hour - b.hour)
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(
    webhookId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): PerformanceMetrics {
    const logs = this.getLogs(webhookId, {
      startDate: options?.startDate,
      endDate: options?.endDate,
      limit: Infinity
    });

    const responseTimes = logs.map(log => log.responseTime).sort((a, b) => a - b);

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
    const medianResponseTime = this.calculatePercentile(responseTimes, 50);
    const p95ResponseTime = this.calculatePercentile(responseTimes, 95);
    const p99ResponseTime = this.calculatePercentile(responseTimes, 99);

    // Calculate requests per time unit
    const periodMs = options?.endDate && options?.startDate
      ? options.endDate.getTime() - options.startDate.getTime()
      : 24 * 60 * 60 * 1000; // Default to 24 hours

    const periodSeconds = periodMs / 1000;
    const periodMinutes = periodMs / (60 * 1000);
    const periodHours = periodMs / (60 * 60 * 1000);

    const requestsPerSecond = logs.length / periodSeconds;
    const requestsPerMinute = logs.length / periodMinutes;
    const requestsPerHour = logs.length / periodHours;

    // Slowest requests
    const slowestRequests = [...logs]
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 10)
      .map(log => ({
        timestamp: log.timestamp,
        responseTime: log.responseTime,
        path: log.path
      }));

    return {
      webhookId,
      period: {
        start: options?.startDate || new Date(Math.min(...logs.map(l => l.timestamp.getTime()))),
        end: options?.endDate || new Date(Math.max(...logs.map(l => l.timestamp.getTime())))
      },
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      medianResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      requestsPerSecond,
      requestsPerMinute,
      requestsPerHour,
      slowestRequests
    };
  }

  /**
   * Get real-time statistics
   */
  getRealtimeStats(webhookId?: string): {
    last1min: number;
    last5min: number;
    last15min: number;
    last1hour: number;
    currentRPS: number;
  } {
    const now = new Date();

    const getLast = (minutes: number) => {
      const start = new Date(now.getTime() - minutes * 60 * 1000);
      return this.getLogs(webhookId, {
        startDate: start,
        endDate: now,
        limit: Infinity
      }).length;
    };

    const last1min = getLast(1);
    const last5min = getLast(5);
    const last15min = getLast(15);
    const last1hour = getLast(60);

    const currentRPS = last1min / 60;

    return {
      last1min,
      last5min,
      last15min,
      last1hour,
      currentRPS
    };
  }

  /**
   * Get IP analysis
   */
  getIPAnalysis(
    webhookId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Array<{
    ip: string;
    requests: number;
    successRate: number;
    averageResponseTime: number;
    lastSeen: Date;
  }> {
    const logs = this.getLogs(webhookId, {
      startDate: options?.startDate,
      endDate: options?.endDate,
      limit: Infinity
    });

    const ipData: Record<string, {
      requests: number;
      successful: number;
      totalResponseTime: number;
      lastSeen: Date;
    }> = {};

    logs.forEach(log => {
      if (!log.ip) return;

      if (!ipData[log.ip]) {
        ipData[log.ip] = {
          requests: 0,
          successful: 0,
          totalResponseTime: 0,
          lastSeen: log.timestamp
        };
      }

      ipData[log.ip].requests++;
      if (log.success) ipData[log.ip].successful++;
      ipData[log.ip].totalResponseTime += log.responseTime;
      if (log.timestamp > ipData[log.ip].lastSeen) {
        ipData[log.ip].lastSeen = log.timestamp;
      }
    });

    return Object.entries(ipData)
      .map(([ip, data]) => ({
        ip,
        requests: data.requests,
        successRate: (data.successful / data.requests) * 100,
        averageResponseTime: data.totalResponseTime / data.requests,
        lastSeen: data.lastSeen
      }))
      .sort((a, b) => b.requests - a.requests);
  }

  /**
   * Export logs to CSV
   */
  exportToCSV(webhookId?: string, options?: {
    startDate?: Date;
    endDate?: Date;
  }): string {
    const logs = this.getLogs(webhookId, {
      startDate: options?.startDate,
      endDate: options?.endDate,
      limit: Infinity
    });

    const headers = [
      'Timestamp',
      'Webhook ID',
      'Method',
      'Path',
      'IP',
      'User Agent',
      'Status Code',
      'Response Time (ms)',
      'Success',
      'Error',
      'Body Size (bytes)'
    ];

    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.webhookId,
      log.method,
      log.path,
      log.ip || '',
      log.userAgent || '',
      log.statusCode,
      log.responseTime,
      log.success,
      log.error || '',
      log.bodySize
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * Categorize error by message
   */
  private categorizeError(error: string): string {
    if (error.includes('timeout') || error.includes('timed out')) return 'timeout';
    if (error.includes('authentication') || error.includes('unauthorized')) return 'authentication';
    if (error.includes('rate limit')) return 'rate_limit';
    if (error.includes('not found') || error.includes('404')) return 'not_found';
    if (error.includes('validation') || error.includes('invalid')) return 'validation';
    if (error.includes('network') || error.includes('connection')) return 'network';
    if (error.includes('server') || error.includes('500')) return 'server_error';
    return 'other';
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Start cleanup task
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldLogs();
    }, this.CLEANUP_INTERVAL);

    logger.info('Analytics cleanup task started');
  }

  /**
   * Cleanup old logs
   */
  private cleanupOldLogs(): void {
    const now = Date.now();
    const threshold = now - this.LOG_RETENTION;
    let cleaned = 0;

    for (const [id, log] of this.logs.entries()) {
      if (log.timestamp.getTime() < threshold) {
        this.logs.delete(id);
        cleaned++;
      }
    }

    // If still over limit, remove oldest logs
    if (this.logs.size > this.MAX_LOGS) {
      const sortedLogs = Array.from(this.logs.entries())
        .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());

      const toRemove = sortedLogs.slice(0, this.logs.size - this.MAX_LOGS);
      toRemove.forEach(([id]) => {
        this.logs.delete(id);
        cleaned++;
      });
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old webhook logs`);
    }
  }

  /**
   * Clear all logs for a webhook
   */
  clearLogs(webhookId?: string): number {
    let cleared = 0;

    if (webhookId) {
      for (const [id, log] of this.logs.entries()) {
        if (log.webhookId === webhookId) {
          this.logs.delete(id);
          cleared++;
        }
      }
    } else {
      cleared = this.logs.size;
      this.logs.clear();
    }

    logger.info(`Cleared ${cleared} webhook logs`);
    return cleared;
  }

  /**
   * Get total statistics
   */
  getTotalStatistics(): {
    totalLogs: number;
    totalWebhooks: number;
    oldestLog?: Date;
    newestLog?: Date;
    memoryUsage: number;
  } {
    const logs = Array.from(this.logs.values());
    const webhooks = new Set(logs.map(log => log.webhookId));

    return {
      totalLogs: this.logs.size,
      totalWebhooks: webhooks.size,
      oldestLog: logs.length > 0
        ? new Date(Math.min(...logs.map(l => l.timestamp.getTime())))
        : undefined,
      newestLog: logs.length > 0
        ? new Date(Math.max(...logs.map(l => l.timestamp.getTime())))
        : undefined,
      memoryUsage: this.logs.size * 1024 // Rough estimate
    };
  }

  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.logs.clear();
    this.removeAllListeners();

    logger.info('WebhookAnalytics shut down');
  }
}

// Export singleton instance
export const webhookAnalytics = new WebhookAnalytics();
