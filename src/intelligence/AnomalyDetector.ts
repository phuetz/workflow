/**
 * Anomaly Detector
 * Detects unusual patterns in workflow metrics using statistical methods
 */

import {
  Anomaly,
  AnomalyType,
  AnomalyDetectionConfig,
  AnomalyBaseline,
  TimeSeriesData,
  Recommendation,
} from '../types/intelligence';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_CONFIG: AnomalyDetectionConfig = {
  sigmaThreshold: 3,
  minimumDataPoints: 10,
  lookbackDays: 30,
  realTime: true,
  alerts: {
    enabled: true,
    severityThreshold: 'medium',
    channels: ['email'],
  },
  methods: {
    statistical: true,
    pattern: true,
    ml: false,
    threshold: true,
  },
};

/**
 * Detect anomalies in workflow metrics
 */
export class AnomalyDetector {
  private config: AnomalyDetectionConfig;
  private baselines: Map<string, AnomalyBaseline> = new Map();
  private detectedAnomalies: Map<string, Anomaly> = new Map();

  constructor(config: Partial<AnomalyDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Detect anomalies in a metric
   */
  public detect(
    metric: string,
    currentValue: number,
    historicalData: TimeSeriesData[],
    workflowId?: string
  ): Anomaly | null {
    // Validate data
    if (historicalData.length < this.config.minimumDataPoints) {
      return null;
    }

    // Calculate or get baseline
    let baseline = this.baselines.get(metric);
    if (!baseline) {
      baseline = this.calculateBaseline(metric, historicalData);
      this.baselines.set(metric, baseline);
    }

    // Detect anomalies using enabled methods
    const anomalies: Anomaly[] = [];

    if (this.config.methods.statistical) {
      const statisticalAnomaly = this.detectStatistical(
        metric,
        currentValue,
        baseline,
        workflowId
      );
      if (statisticalAnomaly) anomalies.push(statisticalAnomaly);
    }

    if (this.config.methods.threshold) {
      const thresholdAnomaly = this.detectThreshold(
        metric,
        currentValue,
        baseline,
        workflowId
      );
      if (thresholdAnomaly) anomalies.push(thresholdAnomaly);
    }

    if (this.config.methods.pattern) {
      const patternAnomaly = this.detectPattern(
        metric,
        currentValue,
        historicalData,
        baseline,
        workflowId
      );
      if (patternAnomaly) anomalies.push(patternAnomaly);
    }

    // Return the most severe anomaly
    if (anomalies.length > 0) {
      anomalies.sort((a, b) => this.getSeverityScore(b.severity) - this.getSeverityScore(a.severity));
      const topAnomaly = anomalies[0];
      this.detectedAnomalies.set(topAnomaly.id, topAnomaly);
      return topAnomaly;
    }

    return null;
  }

  /**
   * Batch detect anomalies across multiple metrics
   */
  public detectBatch(
    metrics: Record<string, { current: number; historical: TimeSeriesData[] }>,
    workflowId?: string
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];

    for (const [metric, data] of Object.entries(metrics)) {
      const anomaly = this.detect(metric, data.current, data.historical, workflowId);
      if (anomaly) {
        anomalies.push(anomaly);
      }
    }

    return anomalies;
  }

  /**
   * Get active anomalies
   */
  public getActiveAnomalies(workflowId?: string): Anomaly[] {
    const anomalies = Array.from(this.detectedAnomalies.values()).filter(
      (a) => !a.resolved
    );

    if (workflowId) {
      return anomalies.filter((a) => a.workflowId === workflowId);
    }

    return anomalies;
  }

  /**
   * Resolve an anomaly
   */
  public resolveAnomaly(anomalyId: string): boolean {
    const anomaly = this.detectedAnomalies.get(anomalyId);
    if (anomaly) {
      anomaly.resolved = true;
      anomaly.resolvedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Calculate baseline statistics for a metric
   */
  public calculateBaseline(
    metric: string,
    data: TimeSeriesData[]
  ): AnomalyBaseline {
    const values = data.map((d) => d.value);
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;

    // Calculate statistics
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const median = this.calculatePercentile(sorted, 50);
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const min = sorted[0];
    const max = sorted[n - 1];
    const p25 = this.calculatePercentile(sorted, 25);
    const p75 = this.calculatePercentile(sorted, 75);
    const iqr = p75 - p25;

    return {
      metric,
      mean,
      median,
      stdDev,
      min,
      max,
      p25,
      p75,
      iqr,
      calculatedFrom: {
        dataPoints: n,
        startDate: data[0].timestamp,
        endDate: data[n - 1].timestamp,
      },
    };
  }

  /**
   * Update baseline with new data
   */
  public updateBaseline(metric: string, data: TimeSeriesData[]): void {
    const baseline = this.calculateBaseline(metric, data);
    this.baselines.set(metric, baseline);
  }

  /**
   * Get baseline for a metric
   */
  public getBaseline(metric: string): AnomalyBaseline | undefined {
    return this.baselines.get(metric);
  }

  // ============================================================================
  // Private Methods - Detection Algorithms
  // ============================================================================

  /**
   * Statistical anomaly detection using 3-sigma method
   */
  private detectStatistical(
    metric: string,
    currentValue: number,
    baseline: AnomalyBaseline,
    workflowId?: string
  ): Anomaly | null {
    // Calculate z-score (number of standard deviations from mean)
    const zScore = baseline.stdDev > 0
      ? Math.abs((currentValue - baseline.mean) / baseline.stdDev)
      : 0;

    // Check if anomaly (beyond threshold sigma)
    if (zScore < this.config.sigmaThreshold) {
      return null;
    }

    // Determine anomaly type based on metric name
    const anomalyType = this.determineAnomalyType(metric, currentValue, baseline);

    // Determine severity based on sigma level
    let severity: Anomaly['severity'];
    if (zScore > 5) severity = 'critical';
    else if (zScore > 4) severity = 'high';
    else if (zScore > 3) severity = 'medium';
    else severity = 'low';

    const deviation = currentValue - baseline.mean;
    const deviationPercent = baseline.mean !== 0
      ? (deviation / baseline.mean) * 100
      : 0;

    return {
      id: uuidv4(),
      type: anomalyType,
      severity,
      metric,
      currentValue,
      expectedValue: baseline.mean,
      deviation,
      sigmaLevel: zScore,
      description: this.generateAnomalyDescription(
        anomalyType,
        currentValue,
        baseline.mean,
        deviationPercent
      ),
      detectedAt: new Date(),
      workflowId,
      detectionMethod: 'statistical',
      confidence: Math.min(zScore / 5, 1), // Normalize to 0-1
      alert: {
        sent: false,
      },
      resolved: false,
      recommendations: this.generateAnomalyRecommendations(anomalyType, workflowId),
    };
  }

  /**
   * Threshold-based anomaly detection
   */
  private detectThreshold(
    metric: string,
    currentValue: number,
    baseline: AnomalyBaseline,
    workflowId?: string
  ): Anomaly | null {
    // Use IQR method for outlier detection
    const lowerBound = baseline.p25 - 1.5 * baseline.iqr;
    const upperBound = baseline.p75 + 1.5 * baseline.iqr;

    if (currentValue >= lowerBound && currentValue <= upperBound) {
      return null;
    }

    const anomalyType = this.determineAnomalyType(metric, currentValue, baseline);
    const deviation = currentValue < lowerBound
      ? currentValue - lowerBound
      : currentValue - upperBound;
    const expectedValue = currentValue < lowerBound ? lowerBound : upperBound;

    // Calculate severity based on how far outside bounds
    const extremeness = Math.abs(deviation) / baseline.iqr;
    let severity: Anomaly['severity'];
    if (extremeness > 3) severity = 'critical';
    else if (extremeness > 2) severity = 'high';
    else if (extremeness > 1) severity = 'medium';
    else severity = 'low';

    return {
      id: uuidv4(),
      type: anomalyType,
      severity,
      metric,
      currentValue,
      expectedValue,
      deviation,
      sigmaLevel: 0, // Not applicable for threshold method
      description: this.generateAnomalyDescription(
        anomalyType,
        currentValue,
        expectedValue,
        (deviation / expectedValue) * 100
      ),
      detectedAt: new Date(),
      workflowId,
      detectionMethod: 'threshold',
      confidence: 0.8,
      alert: {
        sent: false,
      },
      resolved: false,
      recommendations: this.generateAnomalyRecommendations(anomalyType, workflowId),
    };
  }

  /**
   * Pattern-based anomaly detection
   */
  private detectPattern(
    metric: string,
    currentValue: number,
    historicalData: TimeSeriesData[],
    baseline: AnomalyBaseline,
    workflowId?: string
  ): Anomaly | null {
    // Check for sudden changes in pattern
    const recentWindow = 5;
    const recentData = historicalData.slice(-recentWindow);

    if (recentData.length < recentWindow) {
      return null;
    }

    // Calculate recent average
    const recentAvg = recentData.reduce((sum, d) => sum + d.value, 0) / recentWindow;

    // Check if current value breaks the recent pattern
    const patternDeviation = Math.abs(currentValue - recentAvg);
    const recentStdDev = this.calculateStdDev(recentData.map(d => d.value));

    if (recentStdDev === 0 || patternDeviation < 2 * recentStdDev) {
      return null;
    }

    const anomalyType = this.determineAnomalyType(metric, currentValue, baseline);

    return {
      id: uuidv4(),
      type: 'pattern_break',
      severity: 'medium',
      metric,
      currentValue,
      expectedValue: recentAvg,
      deviation: currentValue - recentAvg,
      sigmaLevel: patternDeviation / recentStdDev,
      description: `${metric} broke recent pattern. Expected ~${recentAvg.toFixed(2)}, got ${currentValue.toFixed(2)}`,
      detectedAt: new Date(),
      workflowId,
      detectionMethod: 'pattern',
      confidence: 0.7,
      alert: {
        sent: false,
      },
      resolved: false,
      recommendations: this.generateAnomalyRecommendations(anomalyType, workflowId),
    };
  }

  // ============================================================================
  // Private Methods - Helper Functions
  // ============================================================================

  /**
   * Determine anomaly type based on metric and values
   */
  private determineAnomalyType(
    metric: string,
    currentValue: number,
    baseline: AnomalyBaseline
  ): AnomalyType {
    const metricLower = metric.toLowerCase();
    const isIncrease = currentValue > baseline.mean;

    if (metricLower.includes('execution') && metricLower.includes('time')) {
      return isIncrease ? 'execution_time_spike' : 'throughput_degradation';
    }

    if (metricLower.includes('error')) {
      return isIncrease ? 'error_rate_increase' : 'error_rate_increase';
    }

    if (metricLower.includes('cost')) {
      return 'cost_anomaly';
    }

    if (metricLower.includes('usage') || metricLower.includes('execution')) {
      return isIncrease ? 'throughput_degradation' : 'usage_drop';
    }

    if (metricLower.includes('memory')) {
      return 'memory_spike';
    }

    return 'pattern_break';
  }

  /**
   * Generate description for anomaly
   */
  private generateAnomalyDescription(
    type: AnomalyType,
    currentValue: number,
    expectedValue: number,
    deviationPercent: number
  ): string {
    const direction = currentValue > expectedValue ? 'increased' : 'decreased';
    const absPercent = Math.abs(deviationPercent).toFixed(1);

    const descriptions: Record<AnomalyType, string> = {
      execution_time_spike: `Execution time spiked by ${absPercent}%. Current: ${currentValue.toFixed(2)}ms, Expected: ${expectedValue.toFixed(2)}ms`,
      error_rate_increase: `Error rate ${direction} by ${absPercent}%. Current: ${currentValue.toFixed(2)}%, Expected: ${expectedValue.toFixed(2)}%`,
      cost_anomaly: `Cost ${direction} by ${absPercent}%. Current: $${currentValue.toFixed(2)}, Expected: $${expectedValue.toFixed(2)}`,
      usage_drop: `Usage dropped by ${absPercent}%. Current: ${currentValue.toFixed(0)} executions, Expected: ${expectedValue.toFixed(0)}`,
      throughput_degradation: `Throughput degraded by ${absPercent}%. Current: ${currentValue.toFixed(2)}/hr, Expected: ${expectedValue.toFixed(2)}/hr`,
      memory_spike: `Memory usage spiked by ${absPercent}%. Current: ${currentValue.toFixed(2)}MB, Expected: ${expectedValue.toFixed(2)}MB`,
      pattern_break: `Pattern broken. Current value: ${currentValue.toFixed(2)}, Expected: ${expectedValue.toFixed(2)}`,
      seasonal_deviation: `Seasonal pattern deviated by ${absPercent}%`,
    };

    return descriptions[type] || `Anomaly detected: ${direction} by ${absPercent}%`;
  }

  /**
   * Generate recommendations based on anomaly type
   */
  private generateAnomalyRecommendations(
    type: AnomalyType,
    workflowId?: string
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const baseId = workflowId || 'global';

    switch (type) {
      case 'execution_time_spike':
        recommendations.push({
          id: `${baseId}-perf-${Date.now()}`,
          type: 'performance_improvement',
          priority: 'high',
          title: 'Optimize Slow Execution',
          description: 'Execution time has spiked. Investigate bottleneck nodes and add caching.',
          impact: {
            metric: 'Execution Time',
            currentValue: 100,
            expectedValue: 40,
            improvement: 60,
            improvementPercent: 60,
            unit: '%',
          },
          effort: 'medium',
          steps: [
            'Use performance profiler to identify slow nodes',
            'Add caching for frequently accessed data',
            'Consider parallelizing independent operations',
          ],
          workflowId,
          createdAt: new Date(),
          status: 'pending',
          confidence: 0.8,
          autoImplementable: false,
        });
        break;

      case 'error_rate_increase':
        recommendations.push({
          id: `${baseId}-error-${Date.now()}`,
          type: 'add_error_handling',
          priority: 'critical',
          title: 'Add Error Handling',
          description: 'Error rate has increased significantly. Add retry logic and error handlers.',
          impact: {
            metric: 'Error Rate',
            currentValue: 20,
            expectedValue: 5,
            improvement: 15,
            improvementPercent: 75,
            unit: '%',
          },
          effort: 'medium',
          steps: [
            'Add Try/Catch nodes around failing operations',
            'Configure exponential backoff retry',
            'Set up error notifications',
          ],
          workflowId,
          createdAt: new Date(),
          status: 'pending',
          confidence: 0.9,
          autoImplementable: false,
        });
        break;

      case 'cost_anomaly':
        recommendations.push({
          id: `${baseId}-cost-${Date.now()}`,
          type: 'cost_optimization',
          priority: 'high',
          title: 'Reduce Costs',
          description: 'Cost has increased unexpectedly. Review API usage and optimize.',
          impact: {
            metric: 'Monthly Cost',
            currentValue: 200,
            expectedValue: 100,
            improvement: 100,
            improvementPercent: 50,
            unit: '$',
          },
          effort: 'medium',
          steps: [
            'Review API call frequency',
            'Switch to cheaper AI models (e.g., GPT-4o-mini)',
            'Implement request batching',
          ],
          workflowId,
          createdAt: new Date(),
          status: 'pending',
          confidence: 0.85,
          autoImplementable: false,
        });
        break;

      case 'usage_drop':
        recommendations.push({
          id: `${baseId}-usage-${Date.now()}`,
          type: 'archive_unused',
          priority: 'low',
          title: 'Investigate Usage Drop',
          description: 'Workflow usage has dropped significantly. Investigate or consider archiving.',
          impact: {
            metric: 'Maintenance Overhead',
            currentValue: 1,
            expectedValue: 0,
            improvement: 1,
            improvementPercent: 100,
          },
          effort: 'low',
          steps: [
            'Check if workflow is still needed',
            'Review recent changes that may have affected usage',
            'Consider archiving if obsolete',
          ],
          workflowId,
          createdAt: new Date(),
          status: 'pending',
          confidence: 0.7,
          autoImplementable: false,
        });
        break;
    }

    return recommendations;
  }

  /**
   * Get severity score for sorting
   */
  private getSeverityScore(severity: Anomaly['severity']): number {
    const scores = { critical: 4, high: 3, medium: 2, low: 1 };
    return scores[severity] || 0;
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sortedValues[lower];
    }

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Clear all anomalies and baselines
   */
  public clear(): void {
    this.detectedAnomalies.clear();
    this.baselines.clear();
  }
}

/**
 * Create a default anomaly detector instance
 */
export function createAnomalyDetector(
  config?: Partial<AnomalyDetectionConfig>
): AnomalyDetector {
  return new AnomalyDetector(config);
}
