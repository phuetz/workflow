/**
 * Tunnel Metrics
 * Monitoring, logging, and statistics collection for tunnels
 */

import * as crypto from 'crypto';
import { logger } from '../../services/SimpleLogger';
import type {
  TunnelConfig,
  TunnelRequest,
  TunnelResponse,
  TunnelStatistics,
  TunnelStatus,
  RequestInspection,
  ValidationResult,
  AlertRule
} from './types';

/**
 * Monitoring Service - collects and tracks metrics
 */
export class MonitoringService {
  private metrics: Map<string, any> = new Map();

  collect(tunnelId: string, metrics: any): void {
    const existing = this.metrics.get(tunnelId) || {};
    this.metrics.set(tunnelId, { ...existing, ...metrics, timestamp: new Date() });
  }

  alert(rule: AlertRule, value: number): void {
    logger.warn(`Alert triggered: ${rule.name} - ${rule.message}`, {
      severity: rule.severity,
      threshold: rule.condition.threshold,
      actual: value
    });
  }

  getMetrics(tunnelId: string): any {
    return this.metrics.get(tunnelId);
  }

  clearMetrics(tunnelId: string): void {
    this.metrics.delete(tunnelId);
  }
}

/**
 * Logging Service - handles tunnel-specific logging
 */
export class LoggingService {
  log(level: string, message: string, data?: any): void {
    logger.debug(`[${level.toUpperCase()}] ${message}`, data);
  }

  logRequest(tunnelId: string, request: TunnelRequest): void {
    this.log('info', `Request received on tunnel ${tunnelId}`, {
      method: request.method,
      url: request.url
    });
  }

  logResponse(tunnelId: string, response: TunnelResponse): void {
    this.log('info', `Response sent on tunnel ${tunnelId}`, {
      statusCode: response.statusCode,
      duration: response.duration
    });
  }

  logError(tunnelId: string, error: Error): void {
    this.log('error', `Error on tunnel ${tunnelId}`, {
      message: error.message,
      stack: error.stack
    });
  }
}

/**
 * Statistics Manager - manages tunnel statistics
 */
export class StatisticsManager {
  private statistics: Map<string, TunnelStatistics> = new Map();
  private latencyRecords: Map<string, number[]> = new Map();

  initializeStatistics(tunnelId: string): void {
    this.statistics.set(tunnelId, {
      tunnelId,
      startTime: new Date(),
      uptime: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalBytesIn: 0,
      totalBytesOut: 0,
      averageLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      requestsPerSecond: 0,
      errorsPerSecond: 0,
      topPaths: [],
      topMethods: [],
      topStatusCodes: [],
      topUserAgents: [],
      topIPs: []
    });
    this.latencyRecords.set(tunnelId, []);
  }

  getStatistics(tunnelId: string): TunnelStatistics | undefined {
    return this.statistics.get(tunnelId);
  }

  updateStatistics(
    tunnelId: string,
    updates: Partial<TunnelStatistics>
  ): void {
    const stats = this.statistics.get(tunnelId);
    if (stats) {
      Object.assign(stats, updates);
    }
  }

  recordRequest(
    tunnelId: string,
    bytesIn: number,
    success: boolean
  ): void {
    const stats = this.statistics.get(tunnelId);
    if (!stats) return;

    stats.totalRequests++;
    stats.totalBytesIn += bytesIn;
    if (success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }
  }

  recordResponse(tunnelId: string, bytesOut: number): void {
    const stats = this.statistics.get(tunnelId);
    if (stats) {
      stats.totalBytesOut += bytesOut;
    }
  }

  updateLatency(tunnelId: string, latency: number): void {
    const stats = this.statistics.get(tunnelId);
    if (!stats) return;

    // Update average latency
    const totalLatency = stats.averageLatency * (stats.totalRequests - 1) + latency;
    stats.averageLatency = totalLatency / stats.totalRequests;

    // Record for percentile calculation
    const records = this.latencyRecords.get(tunnelId) || [];
    records.push(latency);

    // Keep only last 1000 records for percentile calculation
    if (records.length > 1000) {
      records.shift();
    }
    this.latencyRecords.set(tunnelId, records);

    // Calculate percentiles
    const sorted = [...records].sort((a, b) => a - b);
    stats.p50Latency = sorted[Math.floor(sorted.length * 0.5)] || 0;
    stats.p95Latency = sorted[Math.floor(sorted.length * 0.95)] || 0;
    stats.p99Latency = sorted[Math.floor(sorted.length * 0.99)] || 0;
  }

  clearStatistics(tunnelId: string): void {
    this.statistics.delete(tunnelId);
    this.latencyRecords.delete(tunnelId);
  }
}

/**
 * Request History Manager - manages request inspection history
 */
export class RequestHistoryManager {
  private requests: Map<string, RequestInspection> = new Map();
  private maxHistorySize: number = 1000;

  storeInspection(
    tunnelId: string,
    request: TunnelRequest,
    response: TunnelResponse,
    additional: {
      validation?: ValidationResult;
      transformations?: any[];
      timing: { total: number };
    }
  ): void {
    const inspection: RequestInspection = {
      request,
      response,
      validation: additional.validation,
      transformations: additional.transformations,
      timing: additional.timing,
      metadata: {
        tunnelId,
        sessionId: crypto.randomBytes(16).toString('hex'),
        traceId: crypto.randomBytes(16).toString('hex')
      }
    };

    this.requests.set(request.id, inspection);

    // Limit history size
    if (this.requests.size > this.maxHistorySize) {
      const oldestKey = this.requests.keys().next().value;
      if (oldestKey) {
        this.requests.delete(oldestKey);
      }
    }
  }

  getHistory(
    tunnelId?: string,
    filter?: {
      startTime?: Date;
      endTime?: Date;
      method?: string;
      path?: string;
      statusCode?: number;
      limit?: number;
    }
  ): RequestInspection[] {
    let inspections = Array.from(this.requests.values());

    if (tunnelId) {
      inspections = inspections.filter((i) => i.metadata.tunnelId === tunnelId);
    }

    if (filter) {
      if (filter.startTime) {
        inspections = inspections.filter(
          (i) => i.request.timestamp >= filter.startTime!
        );
      }
      if (filter.endTime) {
        inspections = inspections.filter(
          (i) => i.request.timestamp <= filter.endTime!
        );
      }
      if (filter.method) {
        inspections = inspections.filter((i) => i.request.method === filter.method);
      }
      if (filter.path) {
        inspections = inspections.filter((i) =>
          i.request.url.includes(filter.path!)
        );
      }
      if (filter.statusCode) {
        inspections = inspections.filter(
          (i) => i.response?.statusCode === filter.statusCode
        );
      }
      if (filter.limit) {
        inspections = inspections.slice(0, filter.limit);
      }
    }

    return inspections;
  }

  getInspection(requestId: string): RequestInspection | undefined {
    return this.requests.get(requestId);
  }

  clearHistory(tunnelId?: string): void {
    if (tunnelId) {
      this.requests.forEach((inspection, requestId) => {
        if (inspection.metadata.tunnelId === tunnelId) {
          this.requests.delete(requestId);
        }
      });
    } else {
      this.requests.clear();
    }
  }

  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
  }
}

/**
 * Tunnel Metrics Service - combines all metrics functionality
 */
export class TunnelMetricsService {
  public monitoring: MonitoringService;
  public logging: LoggingService;
  public statistics: StatisticsManager;
  public history: RequestHistoryManager;

  constructor() {
    this.monitoring = new MonitoringService();
    this.logging = new LoggingService();
    this.statistics = new StatisticsManager();
    this.history = new RequestHistoryManager();
  }

  initializeTunnel(tunnelId: string): void {
    this.statistics.initializeStatistics(tunnelId);
  }

  cleanupTunnel(tunnelId: string): void {
    this.monitoring.clearMetrics(tunnelId);
    this.statistics.clearStatistics(tunnelId);
    this.history.clearHistory(tunnelId);
  }
}
