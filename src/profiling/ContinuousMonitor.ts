/**
 * Continuous Performance Monitor
 *
 * Provides 24/7 performance monitoring with:
 * - Real-time metric collection
 * - Anomaly detection
 * - Alert triggering (Slack, Email)
 * - Historical data retention (30 days)
 * - Minimal overhead (<2%)
 *
 * Usage:
 * const monitor = ContinuousMonitor.getInstance();
 * monitor.start();
 */

import { performanceMonitor, PerformanceMetric } from '../performance/PerformanceMonitor';
import { logger } from '../services/SimpleLogger';

export interface MonitorConfig {
  enabled: boolean;
  samplingRate: number; // 0-1, percentage of requests to monitor
  retentionDays: number;
  anomalyThreshold: number; // Standard deviations from mean
  alertChannels: AlertChannel[];
}

export interface AlertChannel {
  type: 'slack' | 'email' | 'webhook';
  config: {
    url?: string;
    email?: string;
    webhook?: string;
  };
  enabled: boolean;
}

export interface PerformanceAnomaly {
  metric: string;
  timestamp: number;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export interface HistoricalData {
  metric: string;
  timestamp: number;
  value: number;
  tags?: Record<string, string | number>;
}

export interface MetricStatistics {
  metric: string;
  count: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  stdDev: number;
}

export class ContinuousMonitor {
  private static instance: ContinuousMonitor;
  private config: MonitorConfig;
  private historicalData: Map<string, HistoricalData[]> = new Map();
  private anomalies: PerformanceAnomaly[] = [];
  private statistics: Map<string, MetricStatistics> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private overheadTracker: number[] = [];
  private readonly MAX_OVERHEAD_SAMPLES = 100;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.loadHistoricalData();
  }

  public static getInstance(): ContinuousMonitor {
    if (!ContinuousMonitor.instance) {
      ContinuousMonitor.instance = new ContinuousMonitor();
    }
    return ContinuousMonitor.instance;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): MonitorConfig {
    return {
      enabled: true,
      samplingRate: 1.0, // Monitor 100% by default
      retentionDays: 30,
      anomalyThreshold: 3, // 3 sigma
      alertChannels: [],
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
  }

  /**
   * Get current configuration
   */
  public getConfig(): MonitorConfig {
    return { ...this.config };
  }

  /**
   * Start continuous monitoring
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn('Continuous monitoring already running');
      return;
    }

    this.isRunning = true;
    logger.debug('Starting continuous performance monitoring...');

    // Monitor metrics every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 5000);

    // Cleanup old data every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 3600000);

    // Initial collection
    this.collectMetrics();
  }

  /**
   * Stop continuous monitoring
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.debug('Stopping continuous performance monitoring...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Save data before stopping
    this.saveHistoricalData();
  }

  /**
   * Collect current metrics
   */
  private collectMetrics(): void {
    const startTime = performance.now();

    try {
      // Check sampling rate
      if (Math.random() > this.config.samplingRate) {
        return;
      }

      // Get current metrics from performance monitor
      const metrics = performanceMonitor.getMetrics();
      const apiMetrics = performanceMonitor.getAPIMetrics();
      const workflowMetrics = performanceMonitor.getWorkflowMetrics();
      const memoryMetrics = performanceMonitor.getMemoryMetrics();

      // Process and store metrics
      this.processMetrics(metrics);

      // Update statistics
      this.updateStatistics();

      // Detect anomalies
      this.detectAnomalies();

    } catch (error) {
      logger.error('Error collecting metrics:', error);
    } finally {
      // Track overhead
      const overhead = performance.now() - startTime;
      this.trackOverhead(overhead);
    }
  }

  /**
   * Process and store metrics
   */
  private processMetrics(metrics: PerformanceMetric[]): void {
    const now = Date.now();

    metrics.forEach(metric => {
      const key = metric.name;

      if (!this.historicalData.has(key)) {
        this.historicalData.set(key, []);
      }

      const data = this.historicalData.get(key)!;
      data.push({
        metric: key,
        timestamp: metric.timestamp || now,
        value: metric.value,
        tags: metric.tags,
      });

      // Keep only recent data in memory (last 1000 points per metric)
      if (data.length > 1000) {
        this.historicalData.set(key, data.slice(-1000));
      }
    });
  }

  /**
   * Update statistics for all metrics
   */
  private updateStatistics(): void {
    this.historicalData.forEach((data, metric) => {
      if (data.length === 0) return;

      const values = data.map(d => d.value).sort((a, b) => a - b);
      const count = values.length;
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / count;

      // Calculate standard deviation
      const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
      const stdDev = Math.sqrt(variance);

      // Calculate percentiles
      const p95Index = Math.floor(count * 0.95);
      const p99Index = Math.floor(count * 0.99);
      const medianIndex = Math.floor(count * 0.5);

      this.statistics.set(metric, {
        metric,
        count,
        mean,
        median: values[medianIndex],
        p95: values[p95Index],
        p99: values[p99Index],
        min: values[0],
        max: values[count - 1],
        stdDev,
      });
    });
  }

  /**
   * Detect anomalies in metrics
   */
  private detectAnomalies(): void {
    const now = Date.now();
    const recentWindow = 5 * 60 * 1000; // Last 5 minutes

    this.historicalData.forEach((data, metricName) => {
      const stats = this.statistics.get(metricName);
      if (!stats || stats.count < 10) return; // Need enough data

      // Get recent values
      const recentData = data.filter(d => now - d.timestamp < recentWindow);
      if (recentData.length === 0) return;

      const latestValue = recentData[recentData.length - 1].value;
      const deviation = Math.abs(latestValue - stats.mean) / stats.stdDev;

      // Check if anomaly
      if (deviation > this.config.anomalyThreshold) {
        const anomaly: PerformanceAnomaly = {
          metric: metricName,
          timestamp: now,
          value: latestValue,
          expectedValue: stats.mean,
          deviation,
          severity: this.calculateSeverity(deviation),
          message: `${metricName} is ${deviation.toFixed(2)}σ from normal (${latestValue.toFixed(2)} vs ${stats.mean.toFixed(2)})`,
        };

        this.anomalies.push(anomaly);

        // Keep only last 1000 anomalies
        if (this.anomalies.length > 1000) {
          this.anomalies = this.anomalies.slice(-1000);
        }

        // Trigger alert
        this.triggerAlert(anomaly);
      }
    });
  }

  /**
   * Calculate severity based on deviation
   */
  private calculateSeverity(deviation: number): 'low' | 'medium' | 'high' | 'critical' {
    if (deviation > 5) return 'critical';
    if (deviation > 4) return 'high';
    if (deviation > 3) return 'medium';
    return 'low';
  }

  /**
   * Trigger alert for anomaly
   */
  private async triggerAlert(anomaly: PerformanceAnomaly): Promise<void> {
    // Only alert on high and critical severity
    if (anomaly.severity !== 'high' && anomaly.severity !== 'critical') {
      return;
    }

    logger.warn('Performance anomaly detected:', anomaly);

    // Send to configured alert channels
    for (const channel of this.config.alertChannels) {
      if (!channel.enabled) continue;

      try {
        switch (channel.type) {
          case 'slack':
            await this.sendSlackAlert(channel.config.url!, anomaly);
            break;
          case 'email':
            await this.sendEmailAlert(channel.config.email!, anomaly);
            break;
          case 'webhook':
            await this.sendWebhookAlert(channel.config.webhook!, anomaly);
            break;
        }
      } catch (error) {
        logger.error(`Failed to send alert via ${channel.type}:`, error);
      }
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(url: string, anomaly: PerformanceAnomaly): Promise<void> {
    const color = anomaly.severity === 'critical' ? 'danger' : 'warning';
    const message = {
      attachments: [{
        color,
        title: `Performance Anomaly Detected: ${anomaly.metric}`,
        text: anomaly.message,
        fields: [
          {
            title: 'Current Value',
            value: anomaly.value.toFixed(2),
            short: true,
          },
          {
            title: 'Expected Value',
            value: anomaly.expectedValue.toFixed(2),
            short: true,
          },
          {
            title: 'Deviation',
            value: `${anomaly.deviation.toFixed(2)}σ`,
            short: true,
          },
          {
            title: 'Severity',
            value: anomaly.severity.toUpperCase(),
            short: true,
          },
        ],
        ts: Math.floor(anomaly.timestamp / 1000),
      }],
    };

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(email: string, anomaly: PerformanceAnomaly): Promise<void> {
    await fetch('/api/notifications/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: `Performance Anomaly: ${anomaly.metric}`,
        body: `
          Performance anomaly detected:

          Metric: ${anomaly.metric}
          Current Value: ${anomaly.value.toFixed(2)}
          Expected Value: ${anomaly.expectedValue.toFixed(2)}
          Deviation: ${anomaly.deviation.toFixed(2)} standard deviations
          Severity: ${anomaly.severity.toUpperCase()}

          ${anomaly.message}
        `,
      }),
    });
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(url: string, anomaly: PerformanceAnomaly): Promise<void> {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'performance_anomaly',
        anomaly,
        timestamp: anomaly.timestamp,
      }),
    });
  }

  /**
   * Track monitoring overhead
   */
  private trackOverhead(overhead: number): void {
    this.overheadTracker.push(overhead);

    if (this.overheadTracker.length > this.MAX_OVERHEAD_SAMPLES) {
      this.overheadTracker = this.overheadTracker.slice(-this.MAX_OVERHEAD_SAMPLES);
    }
  }

  /**
   * Get monitoring overhead percentage
   */
  public getOverhead(): number {
    if (this.overheadTracker.length === 0) return 0;

    const avgOverhead = this.overheadTracker.reduce((a, b) => a + b, 0) / this.overheadTracker.length;

    // Assuming 5 second collection interval
    return (avgOverhead / 5000) * 100;
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoffDate = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);

    this.historicalData.forEach((data, metric) => {
      const filteredData = data.filter(d => d.timestamp > cutoffDate);
      this.historicalData.set(metric, filteredData);
    });

    // Cleanup old anomalies
    this.anomalies = this.anomalies.filter(a => a.timestamp > cutoffDate);

    logger.debug(`Cleaned up data older than ${this.config.retentionDays} days`);
  }

  /**
   * Get historical data for a metric
   */
  public getHistoricalData(metric: string, startTime?: number, endTime?: number): HistoricalData[] {
    const data = this.historicalData.get(metric) || [];

    if (!startTime && !endTime) {
      return data;
    }

    return data.filter(d => {
      if (startTime && d.timestamp < startTime) return false;
      if (endTime && d.timestamp > endTime) return false;
      return true;
    });
  }

  /**
   * Get all metrics with data
   */
  public getAvailableMetrics(): string[] {
    return Array.from(this.historicalData.keys());
  }

  /**
   * Get statistics for a metric
   */
  public getStatistics(metric: string): MetricStatistics | undefined {
    return this.statistics.get(metric);
  }

  /**
   * Get all statistics
   */
  public getAllStatistics(): Map<string, MetricStatistics> {
    return new Map(this.statistics);
  }

  /**
   * Get recent anomalies
   */
  public getAnomalies(limit: number = 100): PerformanceAnomaly[] {
    return this.anomalies.slice(-limit);
  }

  /**
   * Save configuration
   */
  private saveConfig(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('continuousMonitor.config', JSON.stringify(this.config));
    }
  }

  /**
   * Load configuration
   */
  private loadConfig(): void {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('continuousMonitor.config');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    }
  }

  /**
   * Save historical data to storage
   */
  private saveHistoricalData(): void {
    if (typeof localStorage !== 'undefined') {
      // Save only last 100 points per metric to avoid storage issues
      const compactData: Record<string, HistoricalData[]> = {};

      this.historicalData.forEach((data, metric) => {
        compactData[metric] = data.slice(-100);
      });

      try {
        localStorage.setItem('continuousMonitor.historicalData', JSON.stringify(compactData));
        localStorage.setItem('continuousMonitor.anomalies', JSON.stringify(this.anomalies.slice(-100)));
      } catch (error) {
        logger.warn('Failed to save historical data to localStorage:', error);
      }
    }
  }

  /**
   * Load historical data from storage
   */
  private loadHistoricalData(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const savedData = localStorage.getItem('continuousMonitor.historicalData');
        if (savedData) {
          const data = JSON.parse(savedData);
          Object.entries(data).forEach(([metric, values]) => {
            this.historicalData.set(metric, values as HistoricalData[]);
          });
        }

        const savedAnomalies = localStorage.getItem('continuousMonitor.anomalies');
        if (savedAnomalies) {
          this.anomalies = JSON.parse(savedAnomalies);
        }
      } catch (error) {
        logger.warn('Failed to load historical data from localStorage:', error);
      }
    }

    this.loadConfig();
  }

  /**
   * Export data for analysis
   */
  public exportData(): {
    config: MonitorConfig;
    metrics: Record<string, HistoricalData[]>;
    statistics: Record<string, MetricStatistics>;
    anomalies: PerformanceAnomaly[];
  } {
    const metrics: Record<string, HistoricalData[]> = {};
    this.historicalData.forEach((data, metric) => {
      metrics[metric] = data;
    });

    const statistics: Record<string, MetricStatistics> = {};
    this.statistics.forEach((stats, metric) => {
      statistics[metric] = stats;
    });

    return {
      config: this.config,
      metrics,
      statistics,
      anomalies: this.anomalies,
    };
  }

  /**
   * Check if monitoring is running
   */
  public isActive(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const continuousMonitor = ContinuousMonitor.getInstance();
