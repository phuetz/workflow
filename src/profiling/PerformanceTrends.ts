/**
 * Performance Trends Analyzer
 *
 * Analyzes performance trends over time:
 * - 30-day historical trends
 * - Trend detection (improving, degrading, stable)
 * - Forecasting future performance
 * - Comparative analysis (week-over-week, month-over-month)
 * - Regression detection
 *
 * Usage:
 * const analyzer = PerformanceTrends.getInstance();
 * const trends = analyzer.analyzeTrends('api.response_time');
 */

import { continuousMonitor, HistoricalData, MetricStatistics } from './ContinuousMonitor';
import { logger } from '../services/SimpleLogger';

export interface TrendAnalysis {
  metric: string;
  timeRange: {
    start: number;
    end: number;
  };
  trend: 'improving' | 'stable' | 'degrading';
  trendStrength: number; // -1 to 1 (negative = degrading, positive = improving)
  currentValue: number;
  previousValue: number;
  percentChange: number;
  forecast: ForecastData;
  statistics: TrendStatistics;
  dataPoints: DataPoint[];
}

export interface ForecastData {
  nextDay: number;
  nextWeek: number;
  nextMonth: number;
  confidence: number; // 0-1
}

export interface TrendStatistics {
  mean: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  stdDev: number;
  variance: number;
  sampleSize: number;
}

export interface DataPoint {
  timestamp: number;
  value: number;
  smoothedValue?: number;
}

export interface ComparativeAnalysis {
  metric: string;
  current: TrendStatistics;
  previous: TrendStatistics;
  weekOverWeek: {
    change: number;
    percentChange: number;
    significant: boolean;
  };
  monthOverMonth: {
    change: number;
    percentChange: number;
    significant: boolean;
  };
}

export interface PerformanceRegression {
  metric: string;
  detectedAt: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  previousBaseline: number;
  currentValue: number;
  degradation: number; // percentage
  affectedPeriod: {
    start: number;
    end: number;
  };
  possibleCauses: string[];
}

export class PerformanceTrends {
  private static instance: PerformanceTrends;
  private regressions: PerformanceRegression[] = [];
  private trendCache: Map<string, TrendAnalysis> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.loadRegressions();
  }

  public static getInstance(): PerformanceTrends {
    if (!PerformanceTrends.instance) {
      PerformanceTrends.instance = new PerformanceTrends();
    }
    return PerformanceTrends.instance;
  }

  /**
   * Analyze trends for a metric
   */
  public analyzeTrends(
    metric: string,
    timeRangeDays: number = 30
  ): TrendAnalysis | null {
    // Check cache
    const cached = this.trendCache.get(metric);
    if (cached && Date.now() - cached.timeRange.end < this.cacheExpiry) {
      return cached;
    }

    const endTime = Date.now();
    const startTime = endTime - (timeRangeDays * 24 * 60 * 60 * 1000);

    const data = continuousMonitor.getHistoricalData(metric, startTime, endTime);

    if (data.length === 0) {
      return null;
    }

    // Convert to data points
    const dataPoints: DataPoint[] = data.map(d => ({
      timestamp: d.timestamp,
      value: d.value,
    }));

    // Apply exponential smoothing
    const smoothedPoints = this.exponentialSmoothing(dataPoints, 0.3);

    // Calculate statistics
    const statistics = this.calculateStatistics(dataPoints);

    // Detect trend
    const trend = this.detectTrend(smoothedPoints);

    // Calculate change metrics
    const midPoint = Math.floor(dataPoints.length / 2);
    const firstHalf = dataPoints.slice(0, midPoint);
    const secondHalf = dataPoints.slice(midPoint);

    const previousValue = this.average(firstHalf.map(d => d.value));
    const currentValue = this.average(secondHalf.map(d => d.value));
    const percentChange = ((currentValue - previousValue) / previousValue) * 100;

    // Generate forecast
    const forecast = this.forecast(smoothedPoints);

    const analysis: TrendAnalysis = {
      metric,
      timeRange: { start: startTime, end: endTime },
      trend: trend.direction,
      trendStrength: trend.strength,
      currentValue,
      previousValue,
      percentChange,
      forecast,
      statistics,
      dataPoints: smoothedPoints,
    };

    // Cache the analysis
    this.trendCache.set(metric, analysis);

    return analysis;
  }

  /**
   * Apply exponential smoothing to data points
   */
  private exponentialSmoothing(
    dataPoints: DataPoint[],
    alpha: number = 0.3
  ): DataPoint[] {
    if (dataPoints.length === 0) return [];

    const smoothed: DataPoint[] = [];
    let smoothedValue = dataPoints[0].value;

    dataPoints.forEach(point => {
      smoothedValue = alpha * point.value + (1 - alpha) * smoothedValue;
      smoothed.push({
        ...point,
        smoothedValue,
      });
    });

    return smoothed;
  }

  /**
   * Detect trend direction and strength
   */
  private detectTrend(dataPoints: DataPoint[]): {
    direction: 'improving' | 'stable' | 'degrading';
    strength: number;
  } {
    if (dataPoints.length < 2) {
      return { direction: 'stable', strength: 0 };
    }

    // Use linear regression to detect trend
    const n = dataPoints.length;
    const x = dataPoints.map((_, i) => i);
    const y = dataPoints.map(d => d.smoothedValue || d.value);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const meanY = sumY / n;

    // Normalize slope to get strength (-1 to 1)
    const strength = slope / meanY;

    // Determine direction based on slope
    let direction: 'improving' | 'stable' | 'degrading';

    if (Math.abs(strength) < 0.05) {
      direction = 'stable';
    } else if (slope < 0) {
      // For performance metrics, lower is better
      direction = 'improving';
    } else {
      direction = 'degrading';
    }

    return { direction, strength };
  }

  /**
   * Calculate statistics for data points
   */
  private calculateStatistics(dataPoints: DataPoint[]): TrendStatistics {
    const values = dataPoints.map(d => d.value).sort((a, b) => a - b);
    const n = values.length;
    const mean = this.average(values);

    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const p95Index = Math.floor(n * 0.95);
    const p99Index = Math.floor(n * 0.99);
    const medianIndex = Math.floor(n * 0.5);

    return {
      mean,
      median: values[medianIndex],
      p95: values[p95Index],
      p99: values[p99Index],
      min: values[0],
      max: values[n - 1],
      stdDev,
      variance,
      sampleSize: n,
    };
  }

  /**
   * Forecast future values
   */
  private forecast(dataPoints: DataPoint[]): ForecastData {
    if (dataPoints.length < 2) {
      const currentValue = dataPoints[0]?.value || 0;
      return {
        nextDay: currentValue,
        nextWeek: currentValue,
        nextMonth: currentValue,
        confidence: 0,
      };
    }

    // Use simple linear extrapolation
    const n = dataPoints.length;
    const lastPoints = dataPoints.slice(-10); // Use last 10 points

    const x = lastPoints.map((_, i) => i);
    const y = lastPoints.map(d => d.smoothedValue || d.value);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);

    const m = lastPoints.length;
    const slope = (m * sumXY - sumX * sumY) / (m * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / m;

    // Forecast (assuming one data point per hour)
    const hoursInDay = 24;
    const hoursInWeek = 24 * 7;
    const hoursInMonth = 24 * 30;

    const nextDay = slope * (n + hoursInDay) + intercept;
    const nextWeek = slope * (n + hoursInWeek) + intercept;
    const nextMonth = slope * (n + hoursInMonth) + intercept;

    // Calculate confidence based on R-squared
    const meanY = sumY / m;
    const ssTotal = y.reduce((acc, yi) => acc + Math.pow(yi - meanY, 2), 0);
    const ssPredicted = x.reduce((acc, xi, i) => {
      const predicted = slope * xi + intercept;
      return acc + Math.pow(predicted - meanY, 2);
    }, 0);
    const confidence = Math.min(ssPredicted / ssTotal, 1);

    return {
      nextDay: Math.max(0, nextDay),
      nextWeek: Math.max(0, nextWeek),
      nextMonth: Math.max(0, nextMonth),
      confidence,
    };
  }

  /**
   * Perform comparative analysis
   */
  public comparePerformance(metric: string): ComparativeAnalysis | null {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    // Current period (last week)
    const currentData = continuousMonitor.getHistoricalData(
      metric,
      now - oneWeek,
      now
    );

    // Previous week
    const previousWeekData = continuousMonitor.getHistoricalData(
      metric,
      now - 2 * oneWeek,
      now - oneWeek
    );

    // Previous month
    const previousMonthData = continuousMonitor.getHistoricalData(
      metric,
      now - 2 * oneMonth,
      now - oneMonth
    );

    if (currentData.length === 0) {
      return null;
    }

    const currentStats = this.calculateStatistics(
      currentData.map(d => ({ timestamp: d.timestamp, value: d.value }))
    );

    const previousWeekStats = previousWeekData.length > 0
      ? this.calculateStatistics(
          previousWeekData.map(d => ({ timestamp: d.timestamp, value: d.value }))
        )
      : currentStats;

    const previousMonthStats = previousMonthData.length > 0
      ? this.calculateStatistics(
          previousMonthData.map(d => ({ timestamp: d.timestamp, value: d.value }))
        )
      : currentStats;

    // Week-over-week comparison
    const wowChange = currentStats.mean - previousWeekStats.mean;
    const wowPercentChange = (wowChange / previousWeekStats.mean) * 100;
    const wowSignificant = this.isStatisticallySignificant(
      currentStats,
      previousWeekStats
    );

    // Month-over-month comparison
    const momChange = currentStats.mean - previousMonthStats.mean;
    const momPercentChange = (momChange / previousMonthStats.mean) * 100;
    const momSignificant = this.isStatisticallySignificant(
      currentStats,
      previousMonthStats
    );

    return {
      metric,
      current: currentStats,
      previous: previousWeekStats,
      weekOverWeek: {
        change: wowChange,
        percentChange: wowPercentChange,
        significant: wowSignificant,
      },
      monthOverMonth: {
        change: momChange,
        percentChange: momPercentChange,
        significant: momSignificant,
      },
    };
  }

  /**
   * Check if difference is statistically significant (t-test)
   */
  private isStatisticallySignificant(
    stats1: TrendStatistics,
    stats2: TrendStatistics
  ): boolean {
    // Simple pooled variance t-test
    const pooledStdDev = Math.sqrt(
      ((stats1.sampleSize - 1) * stats1.variance + (stats2.sampleSize - 1) * stats2.variance) /
      (stats1.sampleSize + stats2.sampleSize - 2)
    );

    const tStatistic = Math.abs(stats1.mean - stats2.mean) /
      (pooledStdDev * Math.sqrt(1 / stats1.sampleSize + 1 / stats2.sampleSize));

    // Critical value for 95% confidence (approximation)
    const criticalValue = 1.96;

    return tStatistic > criticalValue;
  }

  /**
   * Detect performance regressions
   */
  public detectRegressions(metric: string): PerformanceRegression | null {
    const analysis = this.analyzeTrends(metric);

    if (!analysis) {
      return null;
    }

    // Check if there's a significant degradation
    if (analysis.trend !== 'degrading' || Math.abs(analysis.trendStrength) < 0.1) {
      return null;
    }

    // Calculate degradation percentage
    const degradation = Math.abs(analysis.percentChange);

    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical';
    if (degradation > 50) severity = 'critical';
    else if (degradation > 30) severity = 'high';
    else if (degradation > 15) severity = 'medium';
    else severity = 'low';

    const regression: PerformanceRegression = {
      metric,
      detectedAt: Date.now(),
      severity,
      previousBaseline: analysis.previousValue,
      currentValue: analysis.currentValue,
      degradation,
      affectedPeriod: {
        start: analysis.timeRange.start + (analysis.timeRange.end - analysis.timeRange.start) / 2,
        end: analysis.timeRange.end,
      },
      possibleCauses: this.identifyPossibleCauses(metric, analysis),
    };

    // Save regression
    this.regressions.push(regression);
    this.saveRegressions();

    return regression;
  }

  /**
   * Identify possible causes of regression
   */
  private identifyPossibleCauses(metric: string, analysis: TrendAnalysis): string[] {
    const causes: string[] = [];

    // Check for correlated metrics
    const allMetrics = continuousMonitor.getAvailableMetrics();

    allMetrics.forEach(otherMetric => {
      if (otherMetric === metric) return;

      const otherAnalysis = this.analyzeTrends(otherMetric);
      if (!otherAnalysis) return;

      // If both metrics are degrading at the same time, they might be related
      if (otherAnalysis.trend === 'degrading' && Math.abs(otherAnalysis.trendStrength) > 0.1) {
        causes.push(`Correlated with degradation in ${otherMetric}`);
      }
    });

    // Common causes based on metric name
    if (metric.includes('memory')) {
      causes.push('Possible memory leak');
      causes.push('Increased data processing load');
    }

    if (metric.includes('api') || metric.includes('response')) {
      causes.push('Database query performance degradation');
      causes.push('Network latency increase');
      causes.push('Third-party API slowdown');
    }

    if (metric.includes('workflow')) {
      causes.push('Complex workflow additions');
      causes.push('Node execution time increase');
    }

    return causes.length > 0 ? causes : ['Unknown cause - requires investigation'];
  }

  /**
   * Get all detected regressions
   */
  public getRegressions(limit: number = 100): PerformanceRegression[] {
    return this.regressions.slice(-limit);
  }

  /**
   * Clear regression for a metric
   */
  public clearRegression(metric: string): void {
    this.regressions = this.regressions.filter(r => r.metric !== metric);
    this.saveRegressions();
  }

  /**
   * Get trend summary for all metrics
   */
  public getTrendSummary(): {
    improving: string[];
    stable: string[];
    degrading: string[];
  } {
    const metrics = continuousMonitor.getAvailableMetrics();
    const improving: string[] = [];
    const stable: string[] = [];
    const degrading: string[] = [];

    metrics.forEach(metric => {
      const analysis = this.analyzeTrends(metric, 7); // Last week
      if (!analysis) return;

      switch (analysis.trend) {
        case 'improving':
          improving.push(metric);
          break;
        case 'stable':
          stable.push(metric);
          break;
        case 'degrading':
          degrading.push(metric);
          break;
      }
    });

    return { improving, stable, degrading };
  }

  /**
   * Calculate average of array
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Save regressions to storage
   */
  private saveRegressions(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          'performanceTrends.regressions',
          JSON.stringify(this.regressions.slice(-100))
        );
      } catch (error) {
        logger.warn('Failed to save regressions:', error);
      }
    }
  }

  /**
   * Load regressions from storage
   */
  private loadRegressions(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('performanceTrends.regressions');
        if (saved) {
          this.regressions = JSON.parse(saved);
        }
      } catch (error) {
        logger.warn('Failed to load regressions:', error);
      }
    }
  }

  /**
   * Clear trend cache
   */
  public clearCache(): void {
    this.trendCache.clear();
  }
}

// Export singleton instance
export const performanceTrends = PerformanceTrends.getInstance();
