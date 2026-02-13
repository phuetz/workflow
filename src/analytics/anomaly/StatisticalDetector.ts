/**
 * Statistical Anomaly Detection Methods
 *
 * Provides statistical anomaly detection using:
 * - Z-score method
 * - Modified Z-score (more robust to outliers)
 * - IQR (Interquartile Range) method
 *
 * @module anomaly/StatisticalDetector
 */

import { mean, standardDeviation, quantile, median } from 'simple-statistics';

export class StatisticalAnomalyDetector {
  /**
   * Z-score method: Detect anomalies based on standard deviations
   */
  static detectWithZScore(values: number[], threshold = 3): boolean[] {
    if (values.length < 3) {
      return values.map(() => false);
    }

    const avg = mean(values);
    const std = standardDeviation(values);

    if (std === 0) {
      return values.map(() => false);
    }

    return values.map((value) => {
      const zScore = Math.abs((value - avg) / std);
      return zScore > threshold;
    });
  }

  /**
   * Modified Z-score method: More robust to outliers
   * Uses Median Absolute Deviation (MAD) instead of standard deviation
   */
  static detectWithModifiedZScore(values: number[], threshold = 3.5): boolean[] {
    if (values.length < 3) {
      return values.map(() => false);
    }

    const med = median(values);
    const deviations = values.map((v) => Math.abs(v - med));
    const mad = median(deviations); // Median Absolute Deviation

    if (mad === 0) {
      return values.map(() => false);
    }

    return values.map((value) => {
      const modifiedZScore = (0.6745 * Math.abs(value - med)) / mad;
      return modifiedZScore > threshold;
    });
  }

  /**
   * IQR method: Detect anomalies using Interquartile Range
   */
  static detectWithIQR(values: number[], multiplier = 1.5): boolean[] {
    if (values.length < 4) {
      return values.map(() => false);
    }

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const iqr = q3 - q1;

    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;

    return values.map((value) => value < lowerBound || value > upperBound);
  }

  /**
   * Calculate anomaly score (0-1) based on z-score
   * Uses sigmoid-like function for smooth probability mapping
   */
  static calculateAnomalyScore(value: number, values: number[]): number {
    if (values.length < 3) {
      return 0;
    }

    const avg = mean(values);
    const std = standardDeviation(values);

    if (std === 0) {
      return 0;
    }

    const zScore = Math.abs((value - avg) / std);

    // Convert z-score to probability (0-1)
    // Using sigmoid-like function
    return 1 / (1 + Math.exp(-0.5 * (zScore - 2)));
  }

  /**
   * Get z-score for a value
   */
  static getZScore(value: number, values: number[]): number {
    if (values.length < 2) {
      return 0;
    }

    const avg = mean(values);
    const std = standardDeviation(values);

    if (std === 0) {
      return 0;
    }

    return (value - avg) / std;
  }

  /**
   * Get bounds for IQR method
   */
  static getIQRBounds(
    values: number[],
    multiplier = 1.5
  ): { lower: number; upper: number } | null {
    if (values.length < 4) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const iqr = q3 - q1;

    return {
      lower: q1 - multiplier * iqr,
      upper: q3 + multiplier * iqr,
    };
  }
}
