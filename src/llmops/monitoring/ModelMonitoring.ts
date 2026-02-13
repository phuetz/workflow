/**
 * Model Performance Monitoring
 * Real-time monitoring with 30-day retention, metrics tracking, and alerting
 */

import { logger } from '../../services/SimpleLogger';
import type {
  ModelMetrics,
  TimeRange,
  Metric,
  AlertCondition,
  PerformanceReport,
} from '../types/llmops';

export interface MonitoringConfig {
  modelId: string;
  retentionDays: number;
  sampleRate?: number; // 0-1
  enableAlerting?: boolean;
}

export class ModelMonitoring {
  private metrics: Map<string, Metric[]> = new Map();
  private alerts: Map<string, AlertCondition> = new Map();
  private retentionDays: number;

  constructor(config: MonitoringConfig) {
    this.retentionDays = config.retentionDays;
    this.startCleanupTask();
  }

  /**
   * Record request metrics
   */
  recordRequest(
    modelId: string,
    metrics: {
      latency: number;
      inputTokens: number;
      outputTokens: number;
      cost: number;
      success: boolean;
      userRating?: number;
      qualityScore?: number;
    }
  ): void {
    const timestamp = new Date();

    // Record latency
    this.recordMetric(modelId, 'latency', metrics.latency, 'ms', timestamp);

    // Record tokens
    this.recordMetric(modelId, 'input_tokens', metrics.inputTokens, 'tokens', timestamp);
    this.recordMetric(modelId, 'output_tokens', metrics.outputTokens, 'tokens', timestamp);
    this.recordMetric(
      modelId,
      'total_tokens',
      metrics.inputTokens + metrics.outputTokens,
      'tokens',
      timestamp
    );

    // Record cost
    this.recordMetric(modelId, 'cost', metrics.cost, 'usd', timestamp);

    // Record success/failure
    this.recordMetric(modelId, 'success', metrics.success ? 1 : 0, 'boolean', timestamp);

    // Record quality
    if (metrics.userRating !== undefined) {
      this.recordMetric(modelId, 'user_rating', metrics.userRating, 'score', timestamp);
    }

    if (metrics.qualityScore !== undefined) {
      this.recordMetric(modelId, 'quality_score', metrics.qualityScore, 'score', timestamp);
    }

    // Check alerts
    this.checkAlerts(modelId, metrics);
  }

  /**
   * Get metrics for time range
   */
  getMetrics(modelId: string, timeRange: TimeRange): ModelMetrics {
    const latencyMetrics = this.getMetricValues(modelId, 'latency', timeRange);
    const tokenMetrics = {
      input: this.getMetricValues(modelId, 'input_tokens', timeRange),
      output: this.getMetricValues(modelId, 'output_tokens', timeRange),
      total: this.getMetricValues(modelId, 'total_tokens', timeRange),
    };
    const costMetrics = this.getMetricValues(modelId, 'cost', timeRange);
    const successMetrics = this.getMetricValues(modelId, 'success', timeRange);
    const ratingMetrics = this.getMetricValues(modelId, 'user_rating', timeRange);
    const qualityMetrics = this.getMetricValues(modelId, 'quality_score', timeRange);

    return {
      modelId,
      timeRange,
      latency: {
        p50: this.percentile(latencyMetrics, 50),
        p95: this.percentile(latencyMetrics, 95),
        p99: this.percentile(latencyMetrics, 99),
        avg: this.average(latencyMetrics),
        max: Math.max(...latencyMetrics, 0),
      },
      tokenUsage: {
        inputTokens: this.sum(tokenMetrics.input),
        outputTokens: this.sum(tokenMetrics.output),
        totalTokens: this.sum(tokenMetrics.total),
        avgInputTokens: this.average(tokenMetrics.input),
        avgOutputTokens: this.average(tokenMetrics.output),
      },
      cost: {
        totalCost: this.sum(costMetrics),
        inputCost: this.sum(costMetrics) * 0.4, // Estimate
        outputCost: this.sum(costMetrics) * 0.6, // Estimate
        avgCostPerRequest: this.average(costMetrics),
      },
      quality: {
        avgUserRating: ratingMetrics.length > 0 ? this.average(ratingMetrics) : undefined,
        avgAutomatedScore: qualityMetrics.length > 0 ? this.average(qualityMetrics) : undefined,
        errorRate: 1 - this.average(successMetrics),
        successRate: this.average(successMetrics),
      },
      requests: {
        total: latencyMetrics.length,
        successful: successMetrics.filter((s) => s === 1).length,
        failed: successMetrics.filter((s) => s === 0).length,
        retried: 0, // Would track separately
      },
    };
  }

  /**
   * Add alert condition
   */
  addAlert(alert: AlertCondition): void {
    this.alerts.set(alert.id, alert);
    logger.debug(`[ModelMonitoring] Added alert: ${alert.name}`);
  }

  /**
   * Remove alert
   */
  removeAlert(alertId: string): void {
    this.alerts.delete(alertId);
  }

  /**
   * Get performance report
   */
  async report(modelId: string, timeRange: TimeRange): Promise<PerformanceReport> {
    const metrics = this.getMetrics(modelId, timeRange);

    // Calculate trends (compare with previous period)
    const previousRange: TimeRange = {
      start: new Date(timeRange.start.getTime() - (timeRange.end.getTime() - timeRange.start.getTime())),
      end: timeRange.start,
    };

    const previousMetrics = this.getMetrics(modelId, previousRange);

    const trends = {
      latencyTrend: this.compareTrend(
        metrics.latency.avg,
        previousMetrics.latency.avg,
        true
      ),
      costTrend: this.compareTrend(
        metrics.cost.totalCost,
        previousMetrics.cost.totalCost,
        true
      ),
      qualityTrend: this.compareTrend(
        metrics.quality.avgAutomatedScore || 0,
        previousMetrics.quality.avgAutomatedScore || 0,
        false
      ),
    };

    // Detect anomalies
    const anomalies = this.detectAnomalies(modelId, metrics);

    return {
      modelId,
      timeRange,
      summary: {
        totalRequests: metrics.requests.total,
        totalCost: metrics.cost.totalCost,
        avgLatency: metrics.latency.avg,
        successRate: metrics.quality.successRate,
      },
      metrics,
      trends,
      anomalies,
      generatedAt: new Date(),
    };
  }

  /**
   * Record metric
   */
  private recordMetric(
    modelId: string,
    name: string,
    value: number,
    unit: string,
    timestamp: Date
  ): void {
    const key = `${modelId}:${name}`;
    const metrics = this.metrics.get(key) || [];

    metrics.push({ name, value, unit, timestamp });

    this.metrics.set(key, metrics);
  }

  /**
   * Get metric values for time range
   */
  private getMetricValues(
    modelId: string,
    metricName: string,
    timeRange: TimeRange
  ): number[] {
    const key = `${modelId}:${metricName}`;
    const metrics = this.metrics.get(key) || [];

    return metrics
      .filter(
        (m) =>
          m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      )
      .map((m) => m.value);
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;

    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate average
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate sum
   */
  private sum(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0);
  }

  /**
   * Check alerts
   */
  private checkAlerts(modelId: string, metrics: any): void {
    for (const [id, alert] of this.alerts.entries()) {
      if (!alert.enabled) continue;

      let value: number | undefined;

      // Get metric value
      switch (alert.metric) {
        case 'latency':
          value = metrics.latency;
          break;
        case 'cost':
          value = metrics.cost;
          break;
        case 'error_rate':
          value = metrics.success ? 0 : 1;
          break;
        case 'quality_score':
          value = metrics.qualityScore;
          break;
      }

      if (value === undefined) continue;

      // Check condition
      let triggered = false;

      switch (alert.operator) {
        case '>':
          triggered = value > alert.threshold;
          break;
        case '<':
          triggered = value < alert.threshold;
          break;
        case '>=':
          triggered = value >= alert.threshold;
          break;
        case '<=':
          triggered = value <= alert.threshold;
          break;
        case '==':
          triggered = value === alert.threshold;
          break;
        case '!=':
          triggered = value !== alert.threshold;
          break;
      }

      if (triggered) {
        this.triggerAlert(alert, value);
      }
    }
  }

  /**
   * Trigger alert
   */
  private triggerAlert(alert: AlertCondition, value: number): void {
    alert.triggeredCount++;
    alert.lastTriggered = new Date();

    logger.debug(
      `[ModelMonitoring] 🚨 ALERT: ${alert.name} - ${alert.metric} ${alert.operator} ${alert.threshold} (current: ${value})`
    );

    // Execute actions
    for (const action of alert.actions) {
      this.executeAlertAction(action, alert, value);
    }
  }

  /**
   * Execute alert action
   */
  private async executeAlertAction(
    action: AlertCondition['actions'][0],
    alert: AlertCondition,
    value: number
  ): Promise<void> {
    // In production, implement actual integrations
    logger.debug(
      `[ModelMonitoring] Executing ${action.type} action for alert: ${alert.name}`
    );
  }

  /**
   * Compare trend
   */
  private compareTrend(
    current: number,
    previous: number,
    lowerIsBetter: boolean
  ): 'improving' | 'stable' | 'degrading' {
    const change = ((current - previous) / previous) * 100;

    if (Math.abs(change) < 5) {
      return 'stable';
    }

    if (lowerIsBetter) {
      return change < 0 ? 'improving' : 'degrading';
    } else {
      return change > 0 ? 'improving' : 'degrading';
    }
  }

  /**
   * Detect anomalies
   */
  private detectAnomalies(
    modelId: string,
    metrics: ModelMetrics
  ): PerformanceReport['anomalies'] {
    const anomalies: PerformanceReport['anomalies'] = [];

    // High latency
    if (metrics.latency.p99 > 5000) {
      anomalies.push({
        timestamp: new Date(),
        type: 'high-latency',
        description: `P99 latency is ${metrics.latency.p99}ms`,
        severity: 'high',
      });
    }

    // High error rate
    if (metrics.quality.errorRate > 0.1) {
      anomalies.push({
        timestamp: new Date(),
        type: 'high-error-rate',
        description: `Error rate is ${(metrics.quality.errorRate * 100).toFixed(1)}%`,
        severity: 'high',
      });
    }

    // Low quality
    if (
      metrics.quality.avgAutomatedScore !== undefined &&
      metrics.quality.avgAutomatedScore < 0.5
    ) {
      anomalies.push({
        timestamp: new Date(),
        type: 'low-quality',
        description: `Quality score is ${metrics.quality.avgAutomatedScore.toFixed(2)}`,
        severity: 'medium',
      });
    }

    return anomalies;
  }

  /**
   * Start cleanup task
   */
  private startCleanupTask(): void {
    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.retentionDays);

    let removed = 0;

    for (const [key, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter((m) => m.timestamp >= cutoff);
      this.metrics.set(key, filtered);
      removed += metrics.length - filtered.length;
    }

    if (removed > 0) {
      logger.debug(`[ModelMonitoring] Cleaned up ${removed} old metrics`);
    }
  }
}
