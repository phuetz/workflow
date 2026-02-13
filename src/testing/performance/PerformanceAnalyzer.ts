/**
 * Performance Analyzer
 * Advanced analysis of performance test results
 */

import { logger } from '../../services/SimpleLogger';
import type {
  PerformanceResults,
  PerformanceMetrics,
  DataPoint,
} from '../types/testing';

export interface PerformanceAnalysis {
  summary: string;
  trends: PerformanceTrend[];
  bottlenecks: Bottleneck[];
  regressions: Regression[];
  improvements: Improvement[];
  recommendations: string[];
  score: number; // 0-100
}

export interface PerformanceTrend {
  metric: string;
  direction: 'improving' | 'degrading' | 'stable';
  change: number; // Percentage change
  confidence: number; // 0-1
}

export interface Bottleneck {
  type: 'response_time' | 'throughput' | 'error_rate' | 'resource';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  recommendation: string;
}

export interface Regression {
  metric: string;
  previousValue: number;
  currentValue: number;
  degradation: number; // Percentage
  threshold: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface Improvement {
  metric: string;
  previousValue: number;
  currentValue: number;
  improvement: number; // Percentage
}

export class PerformanceAnalyzer {
  private readonly REGRESSION_THRESHOLD = 10; // 10% degradation threshold
  private readonly BOTTLENECK_THRESHOLDS = {
    avgResponseTime: 200, // ms
    p95ResponseTime: 500, // ms
    p99ResponseTime: 1000, // ms
    errorRate: 1, // percentage
    throughput: 100, // req/s
  };

  /**
   * Analyze performance test results
   */
  analyze(
    currentResults: PerformanceResults,
    historicalResults?: PerformanceResults[]
  ): PerformanceAnalysis {
    logger.debug(`[PerformanceAnalyzer] Analyzing performance test results`);

    const trends = historicalResults && historicalResults.length > 0
      ? this.analyzeTrends(currentResults, historicalResults)
      : [];

    const bottlenecks = this.identifyBottlenecks(currentResults);
    const regressions = historicalResults && historicalResults.length > 0
      ? this.detectRegressions(currentResults, historicalResults[historicalResults.length - 1])
      : [];

    const improvements = historicalResults && historicalResults.length > 0
      ? this.detectImprovements(currentResults, historicalResults[historicalResults.length - 1])
      : [];

    const recommendations = this.generateRecommendations(
      currentResults,
      bottlenecks,
      regressions
    );

    const score = this.calculatePerformanceScore(currentResults, bottlenecks, regressions);

    const summary = this.generateSummary(
      currentResults,
      trends,
      bottlenecks,
      regressions,
      improvements,
      score
    );

    const analysis: PerformanceAnalysis = {
      summary,
      trends,
      bottlenecks,
      regressions,
      improvements,
      recommendations,
      score,
    };

    logger.debug(`[PerformanceAnalyzer] Analysis complete`);
    logger.debug(`  - Performance score: ${score}/100`);
    logger.debug(`  - Bottlenecks: ${bottlenecks.length}`);
    logger.debug(`  - Regressions: ${regressions.length}`);
    logger.debug(`  - Improvements: ${improvements.length}`);

    return analysis;
  }

  /**
   * Analyze performance trends
   */
  private analyzeTrends(
    current: PerformanceResults,
    historical: PerformanceResults[]
  ): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];

    if (historical.length < 2) {
      return trends;
    }

    // Calculate trends for key metrics
    const metrics = [
      'avgResponseTime',
      'p95ResponseTime',
      'p99ResponseTime',
      'throughput',
      'errorRate',
    ];

    metrics.forEach((metric) => {
      const values = [
        ...historical.map((r) => this.getMetricValue(r.metrics, metric)),
        this.getMetricValue(current.metrics, metric),
      ];

      const trend = this.calculateTrend(values);
      const change = this.calculatePercentageChange(
        values[values.length - 2],
        values[values.length - 1]
      );

      trends.push({
        metric,
        direction: trend.direction,
        change,
        confidence: trend.confidence,
      });
    });

    return trends;
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(values: number[]): {
    direction: 'improving' | 'degrading' | 'stable';
    confidence: number;
  } {
    if (values.length < 3) {
      return { direction: 'stable', confidence: 0 };
    }

    // Calculate linear regression
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Calculate R-squared for confidence
    const meanY = sumY / n;
    const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const predicted = values.map((_, x) => slope * x + (sumY - slope * sumX) / n);
    const ssResidual = values.reduce((sum, y, i) => sum + Math.pow(y - predicted[i], 2), 0);
    const rSquared = 1 - ssResidual / ssTotal;

    // Determine direction
    let direction: 'improving' | 'degrading' | 'stable';
    if (Math.abs(slope) < 0.01) {
      direction = 'stable';
    } else if (slope < 0) {
      direction = 'improving'; // Decreasing response time is improvement
    } else {
      direction = 'degrading';
    }

    return {
      direction,
      confidence: Math.max(0, Math.min(1, rSquared)),
    };
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(results: PerformanceResults): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // Check average response time
    if (results.metrics.responseTime.avg > this.BOTTLENECK_THRESHOLDS.avgResponseTime) {
      bottlenecks.push({
        type: 'response_time',
        severity: this.getSeverity(
          results.metrics.responseTime.avg,
          this.BOTTLENECK_THRESHOLDS.avgResponseTime,
          2
        ),
        description: `High average response time: ${results.metrics.responseTime.avg.toFixed(2)}ms`,
        impact: 'Users experience slow response times, affecting user satisfaction',
        recommendation: 'Optimize slow endpoints, add caching, or scale infrastructure',
      });
    }

    // Check P95 response time
    if (results.metrics.responseTime.p95 > this.BOTTLENECK_THRESHOLDS.p95ResponseTime) {
      bottlenecks.push({
        type: 'response_time',
        severity: this.getSeverity(
          results.metrics.responseTime.p95,
          this.BOTTLENECK_THRESHOLDS.p95ResponseTime,
          2
        ),
        description: `High P95 response time: ${results.metrics.responseTime.p95.toFixed(2)}ms`,
        impact: '5% of requests are experiencing significant delays',
        recommendation: 'Investigate outliers and optimize slow queries or external API calls',
      });
    }

    // Check P99 response time
    if (results.metrics.responseTime.p99 > this.BOTTLENECK_THRESHOLDS.p99ResponseTime) {
      bottlenecks.push({
        type: 'response_time',
        severity: this.getSeverity(
          results.metrics.responseTime.p99,
          this.BOTTLENECK_THRESHOLDS.p99ResponseTime,
          2
        ),
        description: `High P99 response time: ${results.metrics.responseTime.p99.toFixed(2)}ms`,
        impact: '1% of requests are experiencing severe delays',
        recommendation: 'Add monitoring for tail latencies and implement circuit breakers',
      });
    }

    // Check error rate
    if (results.metrics.errorRate > this.BOTTLENECK_THRESHOLDS.errorRate) {
      bottlenecks.push({
        type: 'error_rate',
        severity: this.getSeverity(
          results.metrics.errorRate,
          this.BOTTLENECK_THRESHOLDS.errorRate,
          5
        ),
        description: `High error rate: ${results.metrics.errorRate.toFixed(2)}%`,
        impact: 'Requests are failing, causing poor user experience and data loss',
        recommendation: 'Investigate error causes, implement retry logic, and add error handling',
      });
    }

    // Check throughput
    if (results.metrics.throughput < this.BOTTLENECK_THRESHOLDS.throughput) {
      bottlenecks.push({
        type: 'throughput',
        severity: 'medium',
        description: `Low throughput: ${results.metrics.throughput.toFixed(2)} req/s`,
        impact: 'System cannot handle expected load',
        recommendation: 'Scale horizontally, optimize database queries, or add load balancing',
      });
    }

    return bottlenecks;
  }

  /**
   * Detect performance regressions
   */
  private detectRegressions(
    current: PerformanceResults,
    previous: PerformanceResults
  ): Regression[] {
    const regressions: Regression[] = [];

    // Check response time metrics
    const avgRTChange = this.calculatePercentageChange(
      previous.metrics.responseTime.avg,
      current.metrics.responseTime.avg
    );

    if (avgRTChange > this.REGRESSION_THRESHOLD) {
      regressions.push({
        metric: 'Average Response Time',
        previousValue: previous.metrics.responseTime.avg,
        currentValue: current.metrics.responseTime.avg,
        degradation: avgRTChange,
        threshold: this.REGRESSION_THRESHOLD,
        severity: this.getRegressionSeverity(avgRTChange),
      });
    }

    const p95Change = this.calculatePercentageChange(
      previous.metrics.responseTime.p95,
      current.metrics.responseTime.p95
    );

    if (p95Change > this.REGRESSION_THRESHOLD) {
      regressions.push({
        metric: 'P95 Response Time',
        previousValue: previous.metrics.responseTime.p95,
        currentValue: current.metrics.responseTime.p95,
        degradation: p95Change,
        threshold: this.REGRESSION_THRESHOLD,
        severity: this.getRegressionSeverity(p95Change),
      });
    }

    // Check error rate
    const errorRateChange = this.calculatePercentageChange(
      previous.metrics.errorRate,
      current.metrics.errorRate
    );

    if (errorRateChange > this.REGRESSION_THRESHOLD) {
      regressions.push({
        metric: 'Error Rate',
        previousValue: previous.metrics.errorRate,
        currentValue: current.metrics.errorRate,
        degradation: errorRateChange,
        threshold: this.REGRESSION_THRESHOLD,
        severity: this.getRegressionSeverity(errorRateChange),
      });
    }

    // Check throughput (inverse - decrease is regression)
    const throughputChange = this.calculatePercentageChange(
      current.metrics.throughput,
      previous.metrics.throughput
    );

    if (throughputChange > this.REGRESSION_THRESHOLD) {
      regressions.push({
        metric: 'Throughput',
        previousValue: previous.metrics.throughput,
        currentValue: current.metrics.throughput,
        degradation: throughputChange,
        threshold: this.REGRESSION_THRESHOLD,
        severity: this.getRegressionSeverity(throughputChange),
      });
    }

    return regressions;
  }

  /**
   * Detect performance improvements
   */
  private detectImprovements(
    current: PerformanceResults,
    previous: PerformanceResults
  ): Improvement[] {
    const improvements: Improvement[] = [];

    // Check response time improvements (decrease is improvement)
    const avgRTChange = this.calculatePercentageChange(
      current.metrics.responseTime.avg,
      previous.metrics.responseTime.avg
    );

    if (avgRTChange > this.REGRESSION_THRESHOLD) {
      improvements.push({
        metric: 'Average Response Time',
        previousValue: previous.metrics.responseTime.avg,
        currentValue: current.metrics.responseTime.avg,
        improvement: avgRTChange,
      });
    }

    // Check throughput improvements (increase is improvement)
    const throughputChange = this.calculatePercentageChange(
      previous.metrics.throughput,
      current.metrics.throughput
    );

    if (throughputChange > this.REGRESSION_THRESHOLD) {
      improvements.push({
        metric: 'Throughput',
        previousValue: previous.metrics.throughput,
        currentValue: current.metrics.throughput,
        improvement: throughputChange,
      });
    }

    return improvements;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    results: PerformanceResults,
    bottlenecks: Bottleneck[],
    regressions: Regression[]
  ): string[] {
    const recommendations: string[] = [];

    // Add bottleneck recommendations
    bottlenecks.forEach((bottleneck) => {
      if (bottleneck.severity === 'critical' || bottleneck.severity === 'high') {
        recommendations.push(bottleneck.recommendation);
      }
    });

    // Add regression recommendations
    if (regressions.length > 0) {
      recommendations.push('Review recent code changes that may have introduced performance regressions');
      recommendations.push('Run performance profiling to identify slow code paths');
    }

    // General recommendations
    if (results.metrics.responseTime.avg > 100) {
      recommendations.push('Consider implementing response caching for frequently accessed data');
    }

    if (results.metrics.errorRate > 0.5) {
      recommendations.push('Implement comprehensive error handling and retry mechanisms');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Calculate performance score (0-100)
   */
  private calculatePerformanceScore(
    results: PerformanceResults,
    bottlenecks: Bottleneck[],
    regressions: Regression[]
  ): number {
    let score = 100;

    // Deduct points for bottlenecks
    bottlenecks.forEach((bottleneck) => {
      switch (bottleneck.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    });

    // Deduct points for regressions
    regressions.forEach((regression) => {
      switch (regression.severity) {
        case 'critical':
          score -= 15;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    });

    // Deduct points for high error rate
    if (results.metrics.errorRate > 5) {
      score -= 20;
    } else if (results.metrics.errorRate > 1) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate analysis summary
   */
  private generateSummary(
    results: PerformanceResults,
    trends: PerformanceTrend[],
    bottlenecks: Bottleneck[],
    regressions: Regression[],
    improvements: Improvement[],
    score: number
  ): string {
    let summary = `Performance score: ${score}/100. `;

    if (score >= 90) {
      summary += 'Excellent performance. ';
    } else if (score >= 70) {
      summary += 'Good performance with minor issues. ';
    } else if (score >= 50) {
      summary += 'Moderate performance issues detected. ';
    } else {
      summary += 'Critical performance issues require immediate attention. ';
    }

    if (bottlenecks.length > 0) {
      const criticalBottlenecks = bottlenecks.filter((b) => b.severity === 'critical').length;
      if (criticalBottlenecks > 0) {
        summary += `${criticalBottlenecks} critical bottleneck(s) found. `;
      } else {
        summary += `${bottlenecks.length} bottleneck(s) identified. `;
      }
    }

    if (regressions.length > 0) {
      summary += `${regressions.length} performance regression(s) detected. `;
    }

    if (improvements.length > 0) {
      summary += `${improvements.length} improvement(s) observed. `;
    }

    return summary;
  }

  /**
   * Get metric value by name
   */
  private getMetricValue(metrics: PerformanceMetrics, name: string): number {
    switch (name) {
      case 'avgResponseTime':
        return metrics.responseTime.avg;
      case 'p95ResponseTime':
        return metrics.responseTime.p95;
      case 'p99ResponseTime':
        return metrics.responseTime.p99;
      case 'throughput':
        return metrics.throughput;
      case 'errorRate':
        return metrics.errorRate;
      default:
        return 0;
    }
  }

  /**
   * Calculate percentage change
   */
  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Get severity based on threshold
   */
  private getSeverity(value: number, threshold: number, multiplier: number): 'critical' | 'high' | 'medium' | 'low' {
    if (value >= threshold * multiplier * 2) return 'critical';
    if (value >= threshold * multiplier) return 'high';
    if (value >= threshold) return 'medium';
    return 'low';
  }

  /**
   * Get regression severity
   */
  private getRegressionSeverity(degradation: number): 'critical' | 'high' | 'medium' | 'low' {
    if (degradation >= 50) return 'critical';
    if (degradation >= 30) return 'high';
    if (degradation >= 20) return 'medium';
    return 'low';
  }
}

export default PerformanceAnalyzer;
