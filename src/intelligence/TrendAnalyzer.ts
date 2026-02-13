/**
 * Trend Analyzer
 * Analyzes time-series data to detect trends, forecast future values, and identify patterns
 */

import {
  TrendAnalysis,
  TrendForecast,
  TimeSeriesData,
  SeasonalityAnalysis,
} from '../types/intelligence';

export interface TrendAnalyzerConfig {
  /** Minimum data points required for analysis */
  minimumDataPoints: number;
  /** Significance level for statistical tests (default: 0.05) */
  significanceLevel: number;
  /** Lookback period in days */
  lookbackDays: number;
  /** Smoothing factor for exponential smoothing (0-1) */
  smoothingAlpha: number;
}

const DEFAULT_CONFIG: TrendAnalyzerConfig = {
  minimumDataPoints: 7,
  significanceLevel: 0.05,
  lookbackDays: 30,
  smoothingAlpha: 0.3,
};

/**
 * Analyze trends in time-series data with forecasting
 */
export class TrendAnalyzer {
  private config: TrendAnalyzerConfig;

  constructor(config: Partial<TrendAnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze trend for a metric
   */
  public analyzeTrend(
    metric: string,
    data: TimeSeriesData[],
    comparisonPeriodDays: number = 7
  ): TrendAnalysis | null {
    // Validate data
    if (data.length < this.config.minimumDataPoints) {
      return null;
    }

    // Sort by timestamp
    const sortedData = [...data].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Calculate period bounds
    const endDate = sortedData[sortedData.length - 1].timestamp;
    const startDate = sortedData[0].timestamp;
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Get current and previous values
    const currentValue = sortedData[sortedData.length - 1].value;
    const comparisonIndex = Math.max(
      0,
      sortedData.length - comparisonPeriodDays - 1
    );
    const previousValue = sortedData[comparisonIndex]?.value || currentValue;

    // Calculate changes
    const changeAbsolute = currentValue - previousValue;
    const changePercent =
      previousValue !== 0 ? (changeAbsolute / previousValue) * 100 : 0;

    // Perform linear regression to determine trend
    const regression = this.linearRegression(sortedData);

    // Determine trend direction based on slope
    let direction: 'up' | 'down' | 'stable';
    if (Math.abs(regression.slope) < 0.01) {
      direction = 'stable';
    } else if (regression.slope > 0) {
      direction = 'up';
    } else {
      direction = 'down';
    }

    // Calculate trend strength based on R-squared
    const strength = regression.rSquared;

    // Calculate statistical significance using t-test
    const significance = this.calculateSignificance(sortedData, regression);

    // Generate forecast
    const forecast = this.generateForecast(sortedData, 'exponential-smoothing');

    return {
      metric,
      direction,
      strength,
      significance,
      currentValue,
      previousValue,
      changePercent,
      changeAbsolute,
      forecast: {
        value: forecast.predictions[0]?.value || currentValue,
        confidenceInterval: {
          lower: forecast.predictions[0]?.confidenceInterval.lower || currentValue,
          upper: forecast.predictions[0]?.confidenceInterval.upper || currentValue,
        },
        confidence: forecast.confidence,
      },
      dataPoints: sortedData,
      period: {
        start: startDate,
        end: endDate,
        days,
      },
    };
  }

  /**
   * Generate forecast for future values
   */
  public generateForecast(
    data: TimeSeriesData[],
    method: TrendForecast['method'] = 'exponential-smoothing',
    periods: number = 7
  ): TrendForecast {
    const sortedData = [...data].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    let predictions: TrendForecast['predictions'] = [];
    let confidence = 0;

    switch (method) {
      case 'moving-average':
        ({ predictions, confidence } = this.movingAverageForecast(
          sortedData,
          periods
        ));
        break;

      case 'exponential-smoothing':
        ({ predictions, confidence } = this.exponentialSmoothingForecast(
          sortedData,
          periods
        ));
        break;

      case 'linear-regression':
        ({ predictions, confidence } = this.linearRegressionForecast(
          sortedData,
          periods
        ));
        break;
    }

    return {
      metric: 'forecast',
      period: periods > 7 ? 'month' : periods > 1 ? 'week' : 'day',
      predictions,
      confidence,
      method,
    };
  }

  /**
   * Detect seasonality in data
   */
  public detectSeasonality(data: TimeSeriesData[]): SeasonalityAnalysis {
    if (data.length < 14) {
      return {
        hasSeasonality: false,
        period: 0,
        confidence: 0,
        seasonalComponent: [],
        trendComponent: [],
        residualComponent: [],
      };
    }

    // Sort data
    const sortedData = [...data].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
    const values = sortedData.map((d) => d.value);

    // Try different periods (7 days, 14 days, 30 days)
    const periodsToTest = [7, 14, 30];
    let bestPeriod = 0;
    let bestScore = 0;

    for (const period of periodsToTest) {
      if (values.length < period * 2) continue;

      const score = this.autocorrelation(values, period);
      if (score > bestScore) {
        bestScore = score;
        bestPeriod = period;
      }
    }

    const hasSeasonality = bestScore > 0.5; // Threshold for seasonality
    const confidence = bestScore;

    // Decompose into components if seasonality detected
    let seasonalComponent: number[] = [];
    let trendComponent: number[] = [];
    let residualComponent: number[] = [];

    if (hasSeasonality && bestPeriod > 0) {
      ({ seasonal: seasonalComponent, trend: trendComponent, residual: residualComponent } =
        this.decomposeTimeSeries(values, bestPeriod));
    }

    return {
      hasSeasonality,
      period: bestPeriod,
      confidence,
      seasonalComponent,
      trendComponent,
      residualComponent,
    };
  }

  /**
   * Batch analyze multiple metrics
   */
  public analyzeMultipleMetrics(
    metricsData: Record<string, TimeSeriesData[]>
  ): Record<string, TrendAnalysis | null> {
    const results: Record<string, TrendAnalysis | null> = {};

    for (const [metric, data] of Object.entries(metricsData)) {
      results[metric] = this.analyzeTrend(metric, data);
    }

    return results;
  }

  // ============================================================================
  // Private Methods - Statistical Calculations
  // ============================================================================

  /**
   * Calculate linear regression
   */
  private linearRegression(data: TimeSeriesData[]): {
    slope: number;
    intercept: number;
    rSquared: number;
  } {
    const n = data.length;
    if (n === 0) {
      return { slope: 0, intercept: 0, rSquared: 0 };
    }

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;

    data.forEach((point, i) => {
      const x = i;
      const y = point.value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
      sumYY += y * y;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    let ssTotal = 0;
    let ssResidual = 0;

    data.forEach((point, i) => {
      const predicted = slope * i + intercept;
      ssTotal += Math.pow(point.value - meanY, 2);
      ssResidual += Math.pow(point.value - predicted, 2);
    });

    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    return {
      slope: isFinite(slope) ? slope : 0,
      intercept: isFinite(intercept) ? intercept : 0,
      rSquared: isFinite(rSquared) ? Math.max(0, Math.min(1, rSquared)) : 0,
    };
  }

  /**
   * Calculate statistical significance using t-test
   */
  private calculateSignificance(
    data: TimeSeriesData[],
    regression: { slope: number; intercept: number; rSquared: number }
  ): number {
    const n = data.length;
    if (n < 3) return 1; // Not enough data

    // Calculate residuals
    const residuals = data.map((point, i) => {
      const predicted = regression.slope * i + regression.intercept;
      return point.value - predicted;
    });

    // Calculate standard error
    const sumSquaredResiduals = residuals.reduce(
      (sum, r) => sum + r * r,
      0
    );
    const standardError = Math.sqrt(sumSquaredResiduals / (n - 2));

    if (standardError === 0) return 0;

    // Calculate t-statistic
    const tStat = Math.abs(regression.slope) / standardError;

    // Approximate p-value using t-distribution
    // Simplified approximation
    const pValue = 2 * (1 - this.tDistributionCDF(tStat, n - 2));

    return Math.max(0, Math.min(1, pValue));
  }

  /**
   * Approximate CDF of t-distribution
   */
  private tDistributionCDF(t: number, df: number): number {
    // Simplified approximation for large df
    if (df > 30) {
      // Use normal approximation
      return this.normalCDF(t);
    }

    // For small df, use a rough approximation
    const x = df / (df + t * t);
    return 1 - 0.5 * Math.pow(x, df / 2);
  }

  /**
   * Normal distribution CDF (approximate)
   */
  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  }

  /**
   * Moving average forecast
   */
  private movingAverageForecast(
    data: TimeSeriesData[],
    periods: number,
    window: number = 7
  ): { predictions: TrendForecast['predictions']; confidence: number } {
    const lastTimestamp = data[data.length - 1].timestamp;
    const avgInterval = this.calculateAverageInterval(data);

    // Calculate moving average
    const ma = this.calculateMovingAverage(
      data.map((d) => d.value),
      window
    );
    const lastMA = ma[ma.length - 1] || data[data.length - 1].value;

    const predictions: TrendForecast['predictions'] = [];

    for (let i = 1; i <= periods; i++) {
      const timestamp = new Date(lastTimestamp.getTime() + i * avgInterval);
      const stdDev = this.calculateStdDev(data.map((d) => d.value));
      const margin = 1.96 * stdDev; // 95% confidence interval

      predictions.push({
        timestamp,
        value: lastMA,
        confidenceInterval: {
          lower: lastMA - margin,
          upper: lastMA + margin,
        },
      });
    }

    return {
      predictions,
      confidence: 0.7, // Moving average has moderate confidence
    };
  }

  /**
   * Exponential smoothing forecast
   */
  private exponentialSmoothingForecast(
    data: TimeSeriesData[],
    periods: number
  ): { predictions: TrendForecast['predictions']; confidence: number } {
    const alpha = this.config.smoothingAlpha;
    const values = data.map((d) => d.value);
    const lastTimestamp = data[data.length - 1].timestamp;
    const avgInterval = this.calculateAverageInterval(data);

    // Calculate smoothed value
    let smoothed = values[0];
    for (let i = 1; i < values.length; i++) {
      smoothed = alpha * values[i] + (1 - alpha) * smoothed;
    }

    const predictions: TrendForecast['predictions'] = [];
    const stdDev = this.calculateStdDev(values);
    const margin = 1.96 * stdDev;

    for (let i = 1; i <= periods; i++) {
      const timestamp = new Date(lastTimestamp.getTime() + i * avgInterval);
      predictions.push({
        timestamp,
        value: smoothed,
        confidenceInterval: {
          lower: smoothed - margin,
          upper: smoothed + margin,
        },
      });
    }

    return {
      predictions,
      confidence: 0.75, // Exponential smoothing has good confidence
    };
  }

  /**
   * Linear regression forecast
   */
  private linearRegressionForecast(
    data: TimeSeriesData[],
    periods: number
  ): { predictions: TrendForecast['predictions']; confidence: number } {
    const regression = this.linearRegression(data);
    const lastTimestamp = data[data.length - 1].timestamp;
    const avgInterval = this.calculateAverageInterval(data);
    const n = data.length;

    const predictions: TrendForecast['predictions'] = [];
    const residuals = data.map((point, i) => {
      const predicted = regression.slope * i + regression.intercept;
      return point.value - predicted;
    });
    const stdDev = this.calculateStdDev(residuals);

    for (let i = 1; i <= periods; i++) {
      const timestamp = new Date(lastTimestamp.getTime() + i * avgInterval);
      const x = n + i - 1;
      const value = regression.slope * x + regression.intercept;
      const margin = 1.96 * stdDev * Math.sqrt(1 + 1 / n);

      predictions.push({
        timestamp,
        value,
        confidenceInterval: {
          lower: value - margin,
          upper: value + margin,
        },
      });
    }

    return {
      predictions,
      confidence: Math.max(0.5, regression.rSquared),
    };
  }

  /**
   * Calculate autocorrelation for lag
   */
  private autocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < values.length - lag; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }

    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Decompose time series into seasonal, trend, and residual components
   */
  private decomposeTimeSeries(
    values: number[],
    period: number
  ): { seasonal: number[]; trend: number[]; residual: number[] } {
    const n = values.length;

    // Calculate trend using moving average
    const trend = this.calculateMovingAverage(values, period);

    // Calculate seasonal component
    const seasonal: number[] = new Array(n).fill(0);
    const seasonalAverages: number[] = new Array(period).fill(0);
    const seasonalCounts: number[] = new Array(period).fill(0);

    // Detrend and calculate seasonal averages
    for (let i = 0; i < n; i++) {
      if (trend[i] !== undefined && trend[i] !== 0) {
        const detrended = values[i] - trend[i];
        const seasonIndex = i % period;
        seasonalAverages[seasonIndex] += detrended;
        seasonalCounts[seasonIndex]++;
      }
    }

    // Average the seasonal components
    for (let i = 0; i < period; i++) {
      if (seasonalCounts[i] > 0) {
        seasonalAverages[i] /= seasonalCounts[i];
      }
    }

    // Apply seasonal pattern
    for (let i = 0; i < n; i++) {
      seasonal[i] = seasonalAverages[i % period];
    }

    // Calculate residuals
    const residual = values.map((v, i) => v - trend[i] - seasonal[i]);

    return { seasonal, trend, residual };
  }

  /**
   * Calculate moving average
   */
  private calculateMovingAverage(values: number[], window: number): number[] {
    const result: number[] = [];

    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(values.length, i + Math.ceil(window / 2));
      const windowValues = values.slice(start, end);
      const avg =
        windowValues.reduce((sum, v) => sum + v, 0) / windowValues.length;
      result.push(avg);
    }

    return result;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance =
      squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate average interval between data points
   */
  private calculateAverageInterval(data: TimeSeriesData[]): number {
    if (data.length < 2) return 24 * 60 * 60 * 1000; // Default to 1 day

    let totalInterval = 0;
    for (let i = 1; i < data.length; i++) {
      totalInterval +=
        data[i].timestamp.getTime() - data[i - 1].timestamp.getTime();
    }

    return totalInterval / (data.length - 1);
  }
}

/**
 * Create a default trend analyzer instance
 */
export function createTrendAnalyzer(
  config?: Partial<TrendAnalyzerConfig>
): TrendAnalyzer {
  return new TrendAnalyzer(config);
}
