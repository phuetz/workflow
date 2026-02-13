/**
 * Validation Metrics System
 * Tracks and analyzes validation performance
 */

import { EventEmitter } from 'events';

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  tags?: Record<string, string>;
}

export interface ErrorTypeMetrics {
  errorType: string;
  totalAttempts: number;
  successfulCorrections: number;
  failedCorrections: number;
  successRate: number;
  avgResolutionTime: number;
  minResolutionTime: number;
  maxResolutionTime: number;
  lastAttempt: Date;
  trendDirection: 'improving' | 'degrading' | 'stable';
}

export interface TimeSeriesMetrics {
  successRateOverTime: MetricDataPoint[];
  resolutionTimeOverTime: MetricDataPoint[];
  errorRateOverTime: MetricDataPoint[];
  rollbackFrequencyOverTime: MetricDataPoint[];
}

export interface PerformanceImpactMetrics {
  avgCPUIncrease: number;
  avgMemoryIncrease: number;
  avgLatencyIncrease: number;
  affectedEndpoints: string[];
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface UserImpactMetrics {
  affectedUsers: number;
  downtime: number;
  degradedPerformance: number;
  errorCount: number;
  satisfactionScore: number;
  impactLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationMetricsSnapshot {
  timestamp: Date;
  overall: {
    totalValidations: number;
    successfulValidations: number;
    failedValidations: number;
    overallSuccessRate: number;
    avgResolutionTime: number;
  };
  byErrorType: Map<string, ErrorTypeMetrics>;
  timeSeries: TimeSeriesMetrics;
  performanceImpact: PerformanceImpactMetrics;
  userImpact: UserImpactMetrics;
  recommendations: string[];
}

export class ValidationMetricsCollector extends EventEmitter {
  private dataPoints: Map<string, MetricDataPoint[]> = new Map();
  private errorTypeStats: Map<string, any> = new Map();
  private maxDataPoints = 10000;
  private aggregationWindow = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super();
  }

  /**
   * Record validation attempt
   */
  recordValidation(
    errorType: string,
    success: boolean,
    resolutionTime: number,
    metadata?: any
  ): void {
    const timestamp = new Date();

    // Update error type statistics
    const stats = this.errorTypeStats.get(errorType) || {
      totalAttempts: 0,
      successfulCorrections: 0,
      failedCorrections: 0,
      resolutionTimes: [],
      lastAttempt: timestamp
    };

    stats.totalAttempts++;
    if (success) {
      stats.successfulCorrections++;
    } else {
      stats.failedCorrections++;
    }
    stats.resolutionTimes.push(resolutionTime);
    stats.lastAttempt = timestamp;

    this.errorTypeStats.set(errorType, stats);

    // Record time series data
    this.recordDataPoint('success_rate', success ? 1 : 0, { errorType });
    this.recordDataPoint('resolution_time', resolutionTime, { errorType });

    this.emit('validation-recorded', {
      errorType,
      success,
      resolutionTime,
      timestamp
    });
  }

  /**
   * Record false positive
   */
  recordFalsePositive(
    errorType: string,
    detectedAt: Date,
    confirmedAt: Date
  ): void {
    const detectionTime = confirmedAt.getTime() - detectedAt.getTime();

    this.recordDataPoint('false_positive', 1, { errorType });
    this.recordDataPoint('false_positive_detection_time', detectionTime, { errorType });

    this.emit('false-positive-recorded', {
      errorType,
      detectionTime,
      timestamp: new Date()
    });
  }

  /**
   * Record rollback
   */
  recordRollback(
    errorType: string,
    reason: string,
    timeSinceCorrection: number
  ): void {
    this.recordDataPoint('rollback', 1, { errorType, reason });
    this.recordDataPoint('time_to_rollback', timeSinceCorrection, { errorType });

    this.emit('rollback-recorded', {
      errorType,
      reason,
      timeSinceCorrection,
      timestamp: new Date()
    });
  }

  /**
   * Record performance impact
   */
  recordPerformanceImpact(
    cpuIncrease: number,
    memoryIncrease: number,
    latencyIncrease: number,
    duration: number
  ): void {
    this.recordDataPoint('cpu_impact', cpuIncrease);
    this.recordDataPoint('memory_impact', memoryIncrease);
    this.recordDataPoint('latency_impact', latencyIncrease);
    this.recordDataPoint('impact_duration', duration);
  }

  /**
   * Record user impact
   */
  recordUserImpact(
    affectedUsers: number,
    downtime: number,
    errorCount: number
  ): void {
    this.recordDataPoint('affected_users', affectedUsers);
    this.recordDataPoint('downtime', downtime);
    this.recordDataPoint('user_errors', errorCount);
  }

  /**
   * Record generic data point
   */
  private recordDataPoint(
    metricName: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    if (!this.dataPoints.has(metricName)) {
      this.dataPoints.set(metricName, []);
    }

    const points = this.dataPoints.get(metricName)!;
    points.push({
      timestamp: new Date(),
      value,
      tags
    });

    // Trim old data points
    if (points.length > this.maxDataPoints) {
      this.dataPoints.set(metricName, points.slice(-this.maxDataPoints));
    }
  }

  /**
   * Get metrics by error type
   */
  getMetricsByErrorType(errorType: string): ErrorTypeMetrics | null {
    const stats = this.errorTypeStats.get(errorType);
    if (!stats) return null;

    const successRate = stats.totalAttempts > 0
      ? stats.successfulCorrections / stats.totalAttempts
      : 0;

    const resolutionTimes = stats.resolutionTimes;
    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a: number, b: number) => a + b, 0) / resolutionTimes.length
      : 0;

    const minResolutionTime = resolutionTimes.length > 0
      ? Math.min(...resolutionTimes)
      : 0;

    const maxResolutionTime = resolutionTimes.length > 0
      ? Math.max(...resolutionTimes)
      : 0;

    // Calculate trend (last 10 vs previous 10)
    const recent = resolutionTimes.slice(-10);
    const previous = resolutionTimes.slice(-20, -10);

    let trendDirection: 'improving' | 'degrading' | 'stable' = 'stable';
    if (recent.length >= 5 && previous.length >= 5) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

      if (recentAvg < previousAvg * 0.9) {
        trendDirection = 'improving';
      } else if (recentAvg > previousAvg * 1.1) {
        trendDirection = 'degrading';
      }
    }

    return {
      errorType,
      totalAttempts: stats.totalAttempts,
      successfulCorrections: stats.successfulCorrections,
      failedCorrections: stats.failedCorrections,
      successRate,
      avgResolutionTime,
      minResolutionTime,
      maxResolutionTime,
      lastAttempt: stats.lastAttempt,
      trendDirection
    };
  }

  /**
   * Get time series metrics
   */
  getTimeSeriesMetrics(duration: number = 3600000): TimeSeriesMetrics {
    const cutoff = new Date(Date.now() - duration);

    const filterRecent = (points: MetricDataPoint[]) =>
      points.filter(p => p.timestamp >= cutoff);

    return {
      successRateOverTime: filterRecent(this.dataPoints.get('success_rate') || []),
      resolutionTimeOverTime: filterRecent(this.dataPoints.get('resolution_time') || []),
      errorRateOverTime: filterRecent(this.dataPoints.get('error_rate') || []),
      rollbackFrequencyOverTime: filterRecent(this.dataPoints.get('rollback') || [])
    };
  }

  /**
   * Get performance impact metrics
   */
  getPerformanceImpactMetrics(): PerformanceImpactMetrics {
    const cpuPoints = this.dataPoints.get('cpu_impact') || [];
    const memoryPoints = this.dataPoints.get('memory_impact') || [];
    const latencyPoints = this.dataPoints.get('latency_impact') || [];
    const durationPoints = this.dataPoints.get('impact_duration') || [];

    const avgCPUIncrease = this.calculateAverage(cpuPoints);
    const avgMemoryIncrease = this.calculateAverage(memoryPoints);
    const avgLatencyIncrease = this.calculateAverage(latencyPoints);
    const duration = this.calculateAverage(durationPoints);

    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (avgCPUIncrease > 50 || avgMemoryIncrease > 50 || avgLatencyIncrease > 1000) {
      severity = 'critical';
    } else if (avgCPUIncrease > 30 || avgMemoryIncrease > 30 || avgLatencyIncrease > 500) {
      severity = 'high';
    } else if (avgCPUIncrease > 15 || avgMemoryIncrease > 15 || avgLatencyIncrease > 200) {
      severity = 'medium';
    }

    return {
      avgCPUIncrease,
      avgMemoryIncrease,
      avgLatencyIncrease,
      affectedEndpoints: [], // TODO: Track affected endpoints
      duration,
      severity
    };
  }

  /**
   * Get user impact metrics
   */
  getUserImpactMetrics(): UserImpactMetrics {
    const affectedUsersPoints = this.dataPoints.get('affected_users') || [];
    const downtimePoints = this.dataPoints.get('downtime') || [];
    const errorPoints = this.dataPoints.get('user_errors') || [];

    const affectedUsers = this.calculateMax(affectedUsersPoints);
    const downtime = this.calculateSum(downtimePoints);
    const errorCount = this.calculateSum(errorPoints);

    // Calculate degraded performance time (when errors > 0 but system not fully down)
    const degradedPerformance = errorPoints.filter(p => p.value > 0).length * 60000; // Assume 1 min per data point

    // Calculate satisfaction score (0-10, 10 is best)
    let satisfactionScore = 10;
    if (downtime > 0) satisfactionScore -= 5;
    if (errorCount > 100) satisfactionScore -= 3;
    if (affectedUsers > 50) satisfactionScore -= 2;
    satisfactionScore = Math.max(0, satisfactionScore);

    // Determine impact level
    let impactLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
    if (downtime > 300000 || affectedUsers > 100 || errorCount > 500) {
      impactLevel = 'critical';
    } else if (downtime > 60000 || affectedUsers > 50 || errorCount > 200) {
      impactLevel = 'high';
    } else if (downtime > 10000 || affectedUsers > 20 || errorCount > 50) {
      impactLevel = 'medium';
    } else if (downtime > 0 || affectedUsers > 0 || errorCount > 0) {
      impactLevel = 'low';
    }

    return {
      affectedUsers,
      downtime,
      degradedPerformance,
      errorCount,
      satisfactionScore,
      impactLevel
    };
  }

  /**
   * Get complete metrics snapshot
   */
  getSnapshot(): ValidationMetricsSnapshot {
    const allErrorTypes = Array.from(this.errorTypeStats.keys());
    const byErrorType = new Map<string, ErrorTypeMetrics>();

    let totalValidations = 0;
    let successfulValidations = 0;
    let totalResolutionTime = 0;

    for (const errorType of allErrorTypes) {
      const metrics = this.getMetricsByErrorType(errorType);
      if (metrics) {
        byErrorType.set(errorType, metrics);
        totalValidations += metrics.totalAttempts;
        successfulValidations += metrics.successfulCorrections;
        totalResolutionTime += metrics.avgResolutionTime * metrics.totalAttempts;
      }
    }

    const overallSuccessRate = totalValidations > 0
      ? successfulValidations / totalValidations
      : 0;

    const avgResolutionTime = totalValidations > 0
      ? totalResolutionTime / totalValidations
      : 0;

    const recommendations = this.generateRecommendations(
      overallSuccessRate,
      avgResolutionTime,
      byErrorType
    );

    return {
      timestamp: new Date(),
      overall: {
        totalValidations,
        successfulValidations,
        failedValidations: totalValidations - successfulValidations,
        overallSuccessRate,
        avgResolutionTime
      },
      byErrorType,
      timeSeries: this.getTimeSeriesMetrics(),
      performanceImpact: this.getPerformanceImpactMetrics(),
      userImpact: this.getUserImpactMetrics(),
      recommendations
    };
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(
    successRate: number,
    avgResolutionTime: number,
    errorTypeMetrics: Map<string, ErrorTypeMetrics>
  ): string[] {
    const recommendations: string[] = [];

    // Success rate recommendations
    if (successRate < 0.8) {
      recommendations.push(
        'Success rate is below 80%. Review correction strategies and add more validation checks.'
      );
    }

    // Resolution time recommendations
    if (avgResolutionTime > 30000) {
      recommendations.push(
        'Average resolution time exceeds 30 seconds. Optimize correction procedures.'
      );
    }

    // Error type specific recommendations
    for (const [errorType, metrics] of errorTypeMetrics.entries()) {
      if (metrics.successRate < 0.7) {
        recommendations.push(
          `Low success rate (${(metrics.successRate * 100).toFixed(1)}%) for ${errorType}. Consider alternative correction methods.`
        );
      }

      if (metrics.trendDirection === 'degrading') {
        recommendations.push(
          `Performance degrading for ${errorType}. Investigation recommended.`
        );
      }
    }

    // Performance impact recommendations
    const perfImpact = this.getPerformanceImpactMetrics();
    if (perfImpact.severity === 'high' || perfImpact.severity === 'critical') {
      recommendations.push(
        'High performance impact detected. Consider running corrections during low-traffic periods.'
      );
    }

    // User impact recommendations
    const userImpact = this.getUserImpactMetrics();
    if (userImpact.impactLevel === 'high' || userImpact.impactLevel === 'critical') {
      recommendations.push(
        'Significant user impact detected. Implement better error isolation and gradual rollouts.'
      );
    }

    return recommendations;
  }

  /**
   * Calculate average from data points
   */
  private calculateAverage(points: MetricDataPoint[]): number {
    if (points.length === 0) return 0;
    const sum = points.reduce((acc, p) => acc + p.value, 0);
    return sum / points.length;
  }

  /**
   * Calculate sum from data points
   */
  private calculateSum(points: MetricDataPoint[]): number {
    return points.reduce((acc, p) => acc + p.value, 0);
  }

  /**
   * Calculate max from data points
   */
  private calculateMax(points: MetricDataPoint[]): number {
    if (points.length === 0) return 0;
    return Math.max(...points.map(p => p.value));
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    const snapshot = this.getSnapshot();
    return JSON.stringify(snapshot, null, 2);
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.dataPoints.clear();
    this.errorTypeStats.clear();
    this.emit('metrics-reset');
  }

  /**
   * Clean up old data
   */
  cleanup(retentionPeriod: number = 7 * 24 * 3600000): void {
    const cutoff = new Date(Date.now() - retentionPeriod);

    for (const [metricName, points] of this.dataPoints.entries()) {
      const filtered = points.filter(p => p.timestamp >= cutoff);
      this.dataPoints.set(metricName, filtered);
    }

    this.emit('metrics-cleaned');
  }
}

// Export singleton instance
export const validationMetrics = new ValidationMetricsCollector();
