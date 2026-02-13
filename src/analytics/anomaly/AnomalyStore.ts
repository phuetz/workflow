/**
 * Anomaly Storage and History Management
 *
 * Handles storage, retrieval, pattern detection, and reporting of anomalies.
 *
 * @module anomaly/AnomalyStore
 */

import { Anomaly, AnomalyPattern, AnomalyReport } from './types';

/**
 * Anomaly Store for persisting and querying anomalies
 */
export class AnomalyStore {
  private anomalies: Anomaly[] = [];

  /**
   * Add anomalies to the store
   */
  addAnomalies(anomalies: Anomaly[]): void {
    this.anomalies.push(...anomalies);
  }

  /**
   * Get all detected anomalies
   */
  getAnomalies(): Anomaly[] {
    return this.anomalies;
  }

  /**
   * Get anomalies within a time range
   */
  getAnomaliesInRange(start: number, end: number): Anomaly[] {
    return this.anomalies.filter((a) => a.timestamp >= start && a.timestamp <= end);
  }

  /**
   * Get anomalies by workflow ID
   */
  getAnomaliesByWorkflow(workflowId: string): Anomaly[] {
    return this.anomalies.filter((a) => a.workflowId === workflowId);
  }

  /**
   * Get anomalies by severity
   */
  getAnomaliesBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): Anomaly[] {
    return this.anomalies.filter((a) => a.severity === severity);
  }

  /**
   * Clear all stored anomalies
   */
  clear(): void {
    this.anomalies = [];
  }

  /**
   * Generate anomaly report
   */
  generateReport(timeRange?: { start: number; end: number }): AnomalyReport {
    let anomalies = this.anomalies;

    if (timeRange) {
      anomalies = anomalies.filter(
        (a) => a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
      );
    }

    const anomaliesByType: Record<string, number> = {};
    const anomaliesBySeverity: Record<string, number> = {};

    for (const anomaly of anomalies) {
      anomaliesByType[anomaly.type] = (anomaliesByType[anomaly.type] || 0) + 1;
      anomaliesBySeverity[anomaly.severity] = (anomaliesBySeverity[anomaly.severity] || 0) + 1;
    }

    // Detect patterns
    const patterns = this.detectPatterns(anomalies);

    // Calculate trend
    const trend = this.calculateAnomalyTrend(anomalies);

    // Top anomalies by score
    const topAnomalies = [...anomalies].sort((a, b) => b.score - a.score).slice(0, 10);

    return {
      totalAnomalies: anomalies.length,
      anomaliesByType,
      anomaliesBySeverity,
      topAnomalies,
      patterns,
      trends: trend,
      recommendations: this.generateGlobalRecommendations(patterns),
    };
  }

  /**
   * Detect anomaly patterns
   */
  private detectPatterns(anomalies: Anomaly[]): AnomalyPattern[] {
    const patternMap: Record<string, AnomalyPattern> = {};

    for (const anomaly of anomalies) {
      const key = `${anomaly.type}-${anomaly.metric}`;

      if (!patternMap[key]) {
        patternMap[key] = {
          pattern: `${anomaly.type}:${anomaly.metric}`,
          frequency: 0,
          lastOccurrence: anomaly.timestamp,
          affectedWorkflows: [],
          commonFactors: [],
        };
      }

      patternMap[key].frequency++;
      patternMap[key].lastOccurrence = Math.max(
        patternMap[key].lastOccurrence,
        anomaly.timestamp
      );

      if (!patternMap[key].affectedWorkflows.includes(anomaly.workflowId)) {
        patternMap[key].affectedWorkflows.push(anomaly.workflowId);
      }
    }

    return Object.values(patternMap).filter((p) => p.frequency > 2);
  }

  /**
   * Calculate anomaly trend
   */
  private calculateAnomalyTrend(anomalies: Anomaly[]): {
    increasing: boolean;
    rate: number;
  } {
    if (anomalies.length < 2) {
      return { increasing: false, rate: 0 };
    }

    const sorted = [...anomalies].sort((a, b) => a.timestamp - b.timestamp);
    const firstTimestamp = sorted[0].timestamp;
    const lastTimestamp = sorted[sorted.length - 1].timestamp;
    const daysSpan = (lastTimestamp - firstTimestamp) / (24 * 60 * 60 * 1000);

    const rate = anomalies.length / Math.max(1, daysSpan);

    // Check if increasing by comparing first and second half
    const mid = Math.floor(sorted.length / 2);
    const firstHalfSpan = (sorted[mid - 1].timestamp - firstTimestamp) / (24 * 60 * 60 * 1000);
    const secondHalfSpan = (lastTimestamp - sorted[mid].timestamp) / (24 * 60 * 60 * 1000);

    const firstHalfRate = mid / Math.max(1, firstHalfSpan);
    const secondHalfRate = (sorted.length - mid) / Math.max(1, secondHalfSpan);

    return {
      increasing: secondHalfRate > firstHalfRate * 1.2,
      rate,
    };
  }

  /**
   * Generate global recommendations based on patterns
   */
  private generateGlobalRecommendations(patterns: AnomalyPattern[]): string[] {
    const recommendations: string[] = [];

    // Check for frequent patterns
    const frequentPatterns = patterns.filter((p) => p.frequency > 5);

    if (frequentPatterns.length > 0) {
      recommendations.push(
        `${frequentPatterns.length} anomaly patterns detected frequently. Investigate root causes.`
      );
    }

    // Check for widespread issues
    const widespreadPatterns = patterns.filter((p) => p.affectedWorkflows.length > 3);

    if (widespreadPatterns.length > 0) {
      recommendations.push(
        'Some anomaly patterns affect multiple workflows. Check for systemic issues.'
      );
    }

    return recommendations;
  }
}
