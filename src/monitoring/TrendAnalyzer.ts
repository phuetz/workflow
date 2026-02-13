/**
 * Trend Analyzer
 *
 * Analyzes error trends and patterns over time:
 * - Detects error spikes and anomalies
 * - Correlates errors with deployments
 * - Identifies temporal patterns (hourly, daily, weekly)
 * - Predicts future error occurrences
 * - Provides actionable insights
 */

import { logger } from '../services/SimpleLogger';
import { ApplicationError, ErrorCategory, ErrorSeverity } from '../utils/ErrorHandler';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ErrorTrend {
  timeRange: { start: Date; end: Date };
  totalErrors: number;
  errorRate: number; // errors per minute
  growth: number; // percentage change from previous period
  trend: 'increasing' | 'decreasing' | 'stable';
  anomalyDetected: boolean;
  peak: { timestamp: Date; count: number };
  categories: Map<ErrorCategory, number>;
}

export interface ErrorSpike {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  errorCount: number;
  baselineRate: number;
  spikeRate: number;
  multiplier: number; // spike rate / baseline rate
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedCategories: ErrorCategory[];
  potentialCause?: string;
  correlatedEvents?: string[];
}

export interface TemporalPattern {
  type: 'hourly' | 'daily' | 'weekly';
  pattern: number[]; // error count for each time bucket
  peakHours?: number[]; // hours with highest errors
  lowHours?: number[]; // hours with lowest errors
  confidence: number;
  description: string;
}

export interface ErrorPrediction {
  timeRange: { start: Date; end: Date };
  predictedCount: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface Correlation {
  event: string;
  timestamp: Date;
  errorIncreasePercent: number;
  affectedCategories: ErrorCategory[];
  confidence: number;
}

export interface TrendInsight {
  id: string;
  type: 'anomaly' | 'pattern' | 'correlation' | 'prediction';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  data: Record<string, unknown>;
  actionable: boolean;
  recommendations: string[];
  timestamp: Date;
}

// ============================================================================
// Trend Analyzer
// ============================================================================

export class TrendAnalyzer {
  private errorHistory: ApplicationError[] = [];
  private deploymentHistory: Array<{ timestamp: Date; version: string }> = [];
  private readonly SPIKE_THRESHOLD = 3; // 3x baseline
  private readonly ANOMALY_THRESHOLD = 2; // 2 standard deviations
  private readonly MAX_HISTORY = 100000;

  /**
   * Add error to history for trend analysis
   */
  addError(error: ApplicationError): void {
    this.errorHistory.push(error);

    // Maintain history size
    if (this.errorHistory.length > this.MAX_HISTORY) {
      this.errorHistory = this.errorHistory.slice(-this.MAX_HISTORY);
    }

    // Real-time spike detection
    this.detectRealtimeSpike();
  }

  /**
   * Record deployment for correlation analysis
   */
  recordDeployment(version: string): void {
    this.deploymentHistory.push({
      timestamp: new Date(),
      version
    });

    // Keep last 100 deployments
    if (this.deploymentHistory.length > 100) {
      this.deploymentHistory = this.deploymentHistory.slice(-100);
    }
  }

  /**
   * Analyze error trends over time period
   */
  analyzeTrends(
    startDate: Date,
    endDate: Date,
    granularity: 'hour' | 'day' | 'week' = 'hour'
  ): ErrorTrend {
    const errors = this.errorHistory.filter(
      e => e.timestamp >= startDate.getTime() && e.timestamp <= endDate.getTime()
    );

    const totalErrors = errors.length;
    const duration = endDate.getTime() - startDate.getTime();
    const errorRate = totalErrors / (duration / 60000); // per minute

    // Calculate growth compared to previous period
    const previousStart = new Date(startDate.getTime() - duration);
    const previousErrors = this.errorHistory.filter(
      e => e.timestamp >= previousStart.getTime() && e.timestamp < startDate.getTime()
    );

    const growth = previousErrors.length > 0
      ? ((totalErrors - previousErrors.length) / previousErrors.length) * 100
      : 0;

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (growth > 10) trend = 'increasing';
    else if (growth < -10) trend = 'decreasing';
    else trend = 'stable';

    // Find peak
    const bucketSize = granularity === 'hour' ? 3600000 : granularity === 'day' ? 86400000 : 604800000;
    const buckets = new Map<number, number>();

    for (const error of errors) {
      const bucket = Math.floor(error.timestamp / bucketSize) * bucketSize;
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    }

    const peakBucket = Array.from(buckets.entries())
      .sort((a, b) => b[1] - a[1])[0];

    const peak = peakBucket
      ? { timestamp: new Date(peakBucket[0]), count: peakBucket[1] }
      : { timestamp: startDate, count: 0 };

    // Category breakdown
    const categories = new Map<ErrorCategory, number>();
    for (const error of errors) {
      categories.set(error.category, (categories.get(error.category) || 0) + 1);
    }

    // Anomaly detection
    const anomalyDetected = this.detectAnomaly(errors, granularity);

    return {
      timeRange: { start: startDate, end: endDate },
      totalErrors,
      errorRate,
      growth,
      trend,
      anomalyDetected,
      peak,
      categories
    };
  }

  /**
   * Detect error spikes
   */
  detectSpikes(timeWindow: number = 3600000): ErrorSpike[] {
    const now = Date.now();
    const windowStart = now - timeWindow;

    const recentErrors = this.errorHistory.filter(
      e => e.timestamp >= windowStart
    );

    // Calculate baseline (last 24 hours excluding recent window)
    const baselineStart = now - 86400000;
    const baselineEnd = windowStart;
    const baselineErrors = this.errorHistory.filter(
      e => e.timestamp >= baselineStart && e.timestamp < baselineEnd
    );

    const baselineRate = baselineErrors.length / (24 - (timeWindow / 3600000));
    const currentRate = recentErrors.length / (timeWindow / 3600000);

    const spikes: ErrorSpike[] = [];

    if (currentRate > baselineRate * this.SPIKE_THRESHOLD && baselineRate > 0) {
      const multiplier = currentRate / baselineRate;

      // Find spike duration
      let spikeStart: Date | null = null;
      let spikeEnd: Date | null = null;

      // Scan for continuous elevated error rate
      const bucketSize = 300000; // 5 minutes
      const buckets = new Map<number, number>();

      for (const error of recentErrors) {
        const bucket = Math.floor(error.timestamp / bucketSize) * bucketSize;
        buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
      }

      for (const [timestamp, count] of Array.from(buckets.entries()).sort((a, b) => a[0] - b[0])) {
        const bucketRate = count / (bucketSize / 3600000);

        if (bucketRate > baselineRate * this.SPIKE_THRESHOLD) {
          if (!spikeStart) spikeStart = new Date(timestamp);
          spikeEnd = new Date(timestamp + bucketSize);
        }
      }

      if (spikeStart && spikeEnd) {
        // Determine severity
        let severity: ErrorSpike['severity'];
        if (multiplier > 10) severity = 'critical';
        else if (multiplier > 5) severity = 'high';
        else if (multiplier > 3) severity = 'medium';
        else severity = 'low';

        // Affected categories
        const categoryMap = new Map<ErrorCategory, number>();
        for (const error of recentErrors) {
          categoryMap.set(error.category, (categoryMap.get(error.category) || 0) + 1);
        }

        const affectedCategories = Array.from(categoryMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat]) => cat);

        // Check for correlated deployment
        const correlatedDeployment = this.deploymentHistory.find(
          d => Math.abs(d.timestamp.getTime() - spikeStart!.getTime()) < 600000 // Within 10 minutes
        );

        spikes.push({
          id: `spike_${spikeStart.getTime()}`,
          startTime: spikeStart,
          endTime: spikeEnd,
          duration: spikeEnd.getTime() - spikeStart.getTime(),
          errorCount: recentErrors.length,
          baselineRate,
          spikeRate: currentRate,
          multiplier,
          severity,
          affectedCategories,
          potentialCause: correlatedDeployment
            ? `Deployment of version ${correlatedDeployment.version}`
            : undefined,
          correlatedEvents: correlatedDeployment ? [`Deployment: ${correlatedDeployment.version}`] : undefined
        });
      }
    }

    return spikes;
  }

  /**
   * Detect temporal patterns (hourly, daily, weekly)
   */
  detectTemporalPatterns(): TemporalPattern[] {
    if (this.errorHistory.length < 100) {
      return [];
    }

    const patterns: TemporalPattern[] = [];

    // Hourly pattern
    const hourlyPattern = this.analyzeHourlyPattern();
    if (hourlyPattern.confidence > 0.6) {
      patterns.push(hourlyPattern);
    }

    // Daily pattern
    const dailyPattern = this.analyzeDailyPattern();
    if (dailyPattern.confidence > 0.6) {
      patterns.push(dailyPattern);
    }

    // Weekly pattern
    const weeklyPattern = this.analyzeWeeklyPattern();
    if (weeklyPattern.confidence > 0.6) {
      patterns.push(weeklyPattern);
    }

    return patterns;
  }

  /**
   * Predict future errors
   */
  predictErrors(hoursAhead: number = 1): ErrorPrediction {
    if (this.errorHistory.length < 50) {
      return {
        timeRange: {
          start: new Date(),
          end: new Date(Date.now() + hoursAhead * 3600000)
        },
        predictedCount: 0,
        confidence: 0,
        trend: 'stable',
        riskLevel: 'low',
        recommendations: ['Insufficient data for prediction']
      };
    }

    // Simple linear regression on recent data
    const recentHours = 24;
    const now = Date.now();
    const buckets: number[] = [];

    for (let i = recentHours - 1; i >= 0; i--) {
      const bucketStart = now - (i + 1) * 3600000;
      const bucketEnd = now - i * 3600000;
      const count = this.errorHistory.filter(
        e => e.timestamp >= bucketStart && e.timestamp < bucketEnd
      ).length;
      buckets.push(count);
    }

    // Calculate trend
    const { slope, intercept } = this.linearRegression(buckets);
    const predictedCount = Math.max(0, Math.round(slope * (recentHours + hoursAhead) + intercept));

    // Determine trend and risk
    let trend: 'increasing' | 'decreasing' | 'stable';
    let riskLevel: 'low' | 'medium' | 'high';

    if (slope > 0.5) {
      trend = 'increasing';
      riskLevel = predictedCount > 100 ? 'high' : predictedCount > 50 ? 'medium' : 'low';
    } else if (slope < -0.5) {
      trend = 'decreasing';
      riskLevel = 'low';
    } else {
      trend = 'stable';
      riskLevel = predictedCount > 100 ? 'medium' : 'low';
    }

    // Calculate confidence based on data consistency
    const avgError = buckets.reduce((a, b) => a + b, 0) / buckets.length;
    const variance = buckets.reduce((sum, val) => sum + Math.pow(val - avgError, 2), 0) / buckets.length;
    const stdDev = Math.sqrt(variance);
    const confidence = Math.max(0, Math.min(1, 1 - (stdDev / (avgError + 1))));

    // Generate recommendations
    const recommendations: string[] = [];
    if (riskLevel === 'high') {
      recommendations.push('Monitor system closely for the next few hours');
      recommendations.push('Review recent deployments or changes');
      recommendations.push('Check external service status');
      recommendations.push('Ensure auto-scaling is enabled');
    } else if (trend === 'increasing') {
      recommendations.push('Investigate root cause of error increase');
      recommendations.push('Consider implementing rate limiting');
    }

    return {
      timeRange: {
        start: new Date(),
        end: new Date(now + hoursAhead * 3600000)
      },
      predictedCount,
      confidence,
      trend,
      riskLevel,
      recommendations
    };
  }

  /**
   * Find correlations with deployments
   */
  findDeploymentCorrelations(): Correlation[] {
    const correlations: Correlation[] = [];

    for (const deployment of this.deploymentHistory) {
      const deployTime = deployment.timestamp.getTime();

      // Check error rate before and after deployment
      const preDeploymentStart = deployTime - 3600000; // 1 hour before
      const preDeploymentErrors = this.errorHistory.filter(
        e => e.timestamp >= preDeploymentStart && e.timestamp < deployTime
      );

      const postDeploymentEnd = deployTime + 3600000; // 1 hour after
      const postDeploymentErrors = this.errorHistory.filter(
        e => e.timestamp >= deployTime && e.timestamp < postDeploymentEnd
      );

      if (preDeploymentErrors.length > 0) {
        const increase = ((postDeploymentErrors.length - preDeploymentErrors.length) / preDeploymentErrors.length) * 100;

        if (increase > 50) { // 50% increase
          // Category breakdown
          const categories = new Map<ErrorCategory, number>();
          for (const error of postDeploymentErrors) {
            categories.set(error.category, (categories.get(error.category) || 0) + 1);
          }

          const affectedCategories = Array.from(categories.keys());

          correlations.push({
            event: `Deployment: ${deployment.version}`,
            timestamp: deployment.timestamp,
            errorIncreasePercent: increase,
            affectedCategories,
            confidence: Math.min(increase / 100, 0.95)
          });
        }
      }
    }

    return correlations.sort((a, b) => b.errorIncreasePercent - a.errorIncreasePercent);
  }

  /**
   * Get all insights (spikes, patterns, correlations, predictions)
   */
  getInsights(): TrendInsight[] {
    const insights: TrendInsight[] = [];

    // Spikes
    const spikes = this.detectSpikes();
    for (const spike of spikes) {
      insights.push({
        id: spike.id,
        type: 'anomaly',
        severity: spike.severity === 'critical' || spike.severity === 'high' ? 'critical' : 'warning',
        title: `Error Spike Detected (${spike.multiplier.toFixed(1)}x baseline)`,
        description: `Error rate increased ${spike.multiplier.toFixed(1)}x from ${spike.baselineRate.toFixed(1)} to ${spike.spikeRate.toFixed(1)} errors/hour`,
        data: { spike },
        actionable: true,
        recommendations: [
          'Investigate recent changes or deployments',
          'Check system resource utilization',
          'Review affected error categories',
          spike.potentialCause ? `Potential cause: ${spike.potentialCause}` : 'Check external service dependencies'
        ],
        timestamp: spike.startTime
      });
    }

    // Patterns
    const patterns = this.detectTemporalPatterns();
    for (const pattern of patterns) {
      insights.push({
        id: `pattern_${pattern.type}`,
        type: 'pattern',
        severity: 'info',
        title: `${pattern.type.charAt(0).toUpperCase() + pattern.type.slice(1)} Error Pattern Detected`,
        description: pattern.description,
        data: { pattern },
        actionable: true,
        recommendations: [
          'Consider scheduling maintenance during low-error periods',
          'Adjust monitoring alerts based on expected patterns',
          'Optimize resource allocation for peak periods'
        ],
        timestamp: new Date()
      });
    }

    // Correlations
    const correlations = this.findDeploymentCorrelations().slice(0, 5);
    for (const correlation of correlations) {
      insights.push({
        id: `correlation_${correlation.timestamp.getTime()}`,
        type: 'correlation',
        severity: correlation.errorIncreasePercent > 100 ? 'critical' : 'warning',
        title: `Deployment Correlation: ${correlation.errorIncreasePercent.toFixed(0)}% Error Increase`,
        description: `Errors increased by ${correlation.errorIncreasePercent.toFixed(0)}% after ${correlation.event}`,
        data: { correlation },
        actionable: true,
        recommendations: [
          'Review deployment changes',
          'Consider rollback if errors persist',
          'Implement canary deployment strategy',
          'Add pre-deployment validation'
        ],
        timestamp: correlation.timestamp
      });
    }

    // Prediction
    const prediction = this.predictErrors(1);
    if (prediction.riskLevel === 'high' || prediction.riskLevel === 'medium') {
      insights.push({
        id: 'prediction_next_hour',
        type: 'prediction',
        severity: prediction.riskLevel === 'high' ? 'critical' : 'warning',
        title: `High Error Rate Predicted (${prediction.predictedCount} errors in next hour)`,
        description: `Based on current trends, ${prediction.predictedCount} errors expected with ${(prediction.confidence * 100).toFixed(0)}% confidence`,
        data: { prediction },
        actionable: true,
        recommendations: prediction.recommendations,
        timestamp: new Date()
      });
    }

    return insights.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private detectRealtimeSpike(): void {
    const recent = this.errorHistory.slice(-100);
    if (recent.length < 100) return;

    const last5min = recent.filter(e => e.timestamp > Date.now() - 300000);
    if (last5min.length > 50) {
      logger.warn('Real-time error spike detected', {
        count: last5min.length,
        rate: (last5min.length / 5).toFixed(1) + ' errors/min'
      });
    }
  }

  private detectAnomaly(errors: ApplicationError[], granularity: string): boolean {
    if (errors.length < 10) return false;

    const bucketSize = granularity === 'hour' ? 3600000 : 86400000;
    const buckets: number[] = [];

    const start = Math.min(...errors.map(e => e.timestamp));
    const end = Math.max(...errors.map(e => e.timestamp));

    for (let t = start; t <= end; t += bucketSize) {
      const count = errors.filter(e => e.timestamp >= t && e.timestamp < t + bucketSize).length;
      buckets.push(count);
    }

    const mean = buckets.reduce((a, b) => a + b, 0) / buckets.length;
    const variance = buckets.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / buckets.length;
    const stdDev = Math.sqrt(variance);

    return buckets.some(count => Math.abs(count - mean) > this.ANOMALY_THRESHOLD * stdDev);
  }

  private analyzeHourlyPattern(): TemporalPattern {
    const hourBuckets = new Array(24).fill(0);

    for (const error of this.errorHistory) {
      const hour = new Date(error.timestamp).getHours();
      hourBuckets[hour]++;
    }

    const total = hourBuckets.reduce((a, b) => a + b, 0);
    const avg = total / 24;
    const peakHours = hourBuckets
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count > avg * 1.5)
      .map(h => h.hour);

    const lowHours = hourBuckets
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count < avg * 0.5)
      .map(h => h.hour);

    const variance = hourBuckets.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / 24;
    const confidence = variance > avg * 0.1 ? 0.8 : 0.4;

    return {
      type: 'hourly',
      pattern: hourBuckets,
      peakHours,
      lowHours,
      confidence,
      description: `Peak error hours: ${peakHours.join(', ')}. Low error hours: ${lowHours.join(', ')}`
    };
  }

  private analyzeDailyPattern(): TemporalPattern {
    const dayBuckets = new Array(7).fill(0);

    for (const error of this.errorHistory) {
      const day = new Date(error.timestamp).getDay();
      dayBuckets[day]++;
    }

    const total = dayBuckets.reduce((a, b) => a + b, 0);
    const avg = total / 7;
    const variance = dayBuckets.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / 7;
    const confidence = variance > avg * 0.1 ? 0.7 : 0.3;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDay = days[dayBuckets.indexOf(Math.max(...dayBuckets))];
    const lowDay = days[dayBuckets.indexOf(Math.min(...dayBuckets))];

    return {
      type: 'daily',
      pattern: dayBuckets,
      confidence,
      description: `Peak day: ${peakDay}. Lowest day: ${lowDay}`
    };
  }

  private analyzeWeeklyPattern(): TemporalPattern {
    const weekBuckets: number[] = [];
    const now = Date.now();
    const oneWeek = 604800000;

    for (let i = 4; i >= 0; i--) {
      const weekStart = now - (i + 1) * oneWeek;
      const weekEnd = now - i * oneWeek;
      const count = this.errorHistory.filter(
        e => e.timestamp >= weekStart && e.timestamp < weekEnd
      ).length;
      weekBuckets.push(count);
    }

    const confidence = weekBuckets.length >= 4 ? 0.6 : 0.3;

    return {
      type: 'weekly',
      pattern: weekBuckets,
      confidence,
      description: `Weekly error trend over last ${weekBuckets.length} weeks`
    };
  }

  private linearRegression(values: number[]): { slope: number; intercept: number } {
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * Clear history (for testing)
   */
  clearHistory(): void {
    this.errorHistory = [];
    this.deploymentHistory = [];
    logger.info('Trend analyzer history cleared');
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalErrors: number;
    deployments: number;
    timeSpan: number;
    averageErrorRate: number;
  } {
    const timeSpan = this.errorHistory.length > 0
      ? Math.max(...this.errorHistory.map(e => e.timestamp)) - Math.min(...this.errorHistory.map(e => e.timestamp))
      : 0;

    return {
      totalErrors: this.errorHistory.length,
      deployments: this.deploymentHistory.length,
      timeSpan,
      averageErrorRate: timeSpan > 0 ? (this.errorHistory.length / (timeSpan / 60000)) : 0
    };
  }
}

// Singleton instance
export const trendAnalyzer = new TrendAnalyzer();
