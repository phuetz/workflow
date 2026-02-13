/**
 * Alert Generator for Anomaly Detection
 *
 * Handles alert generation, root cause analysis, and remediation recommendations.
 *
 * @module anomaly/AlertGenerator
 */

import { logger } from '../../services/SimpleLogger';
import { Anomaly, RootCause, AutoRemediation, AnomalyDetectionConfig } from './types';
import { WorkflowExecutionData } from '../MLModels';
import { mean } from 'simple-statistics';

/**
 * Alert Generator for anomaly detection
 */
export class AlertGenerator {
  private config: AnomalyDetectionConfig;

  constructor(config: AnomalyDetectionConfig) {
    this.config = config;
  }

  /**
   * Handle detected anomalies (alerting, remediation)
   */
  async handleAnomalies(anomalies: Anomaly[]): Promise<void> {
    for (const anomaly of anomalies) {
      logger.debug(`[ANOMALY DETECTED] ${anomaly.description}`);
      logger.debug(`  Severity: ${anomaly.severity}, Score: ${anomaly.score.toFixed(2)}`);

      // Send alerts for high severity
      if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
        await this.sendAlert(anomaly);
      }

      // Auto-remediate if configured and available
      if (
        this.config.autoRemediate &&
        anomaly.autoRemediation &&
        !anomaly.autoRemediation.requiresApproval
      ) {
        await this.executeAutoRemediation(anomaly);
      }
    }
  }

  /**
   * Send alert for anomaly
   */
  async sendAlert(anomaly: Anomaly): Promise<void> {
    // Placeholder for actual alert implementation
    logger.debug(`[ALERT] Sending alert for ${anomaly.type} anomaly: ${anomaly.description}`);
    // In production, this would send to Slack, email, PagerDuty, etc.
  }

  /**
   * Execute automatic remediation
   */
  async executeAutoRemediation(anomaly: Anomaly): Promise<void> {
    if (!anomaly.autoRemediation) return;

    logger.debug(`[AUTO-REMEDIATION] Executing: ${anomaly.autoRemediation.action}`);
    // In production, this would execute the actual remediation action
  }

  /**
   * Analyze root causes for an anomaly
   */
  analyzeRootCauses(
    execution: WorkflowExecutionData,
    baseline: WorkflowExecutionData[],
    _metric: string
  ): RootCause[] {
    const causes: RootCause[] = [];

    // Network calls
    const avgNetworkCalls = mean(baseline.map((d) => d.networkCalls));
    if (execution.networkCalls > avgNetworkCalls * 1.5) {
      causes.push({
        factor: 'high_network_calls',
        likelihood: 0.8,
        description: 'Higher than normal number of network calls',
        evidence: [`${execution.networkCalls} network calls vs avg ${avgNetworkCalls.toFixed(0)}`],
      });
    }

    // Database queries
    const avgDbQueries = mean(baseline.map((d) => d.dbQueries));
    if (execution.dbQueries > avgDbQueries * 1.5) {
      causes.push({
        factor: 'high_db_queries',
        likelihood: 0.7,
        description: 'Higher than normal number of database queries',
        evidence: [`${execution.dbQueries} queries vs avg ${avgDbQueries.toFixed(0)}`],
      });
    }

    // Retry count
    if (execution.retryCount > 0) {
      causes.push({
        factor: 'retries',
        likelihood: 0.9,
        description: 'Execution required retries',
        evidence: [`${execution.retryCount} retries performed`],
      });
    }

    // Time of day
    const hourCounts: Record<number, number> = {};
    baseline.forEach((d) => {
      const hour = new Date(d.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const executionHour = new Date(execution.timestamp).getHours();
    const avgExecutionsAtHour = hourCounts[executionHour] || 0;

    if (avgExecutionsAtHour < baseline.length * 0.05) {
      causes.push({
        factor: 'unusual_time',
        likelihood: 0.5,
        description: 'Execution at unusual time of day',
        evidence: [`Executed at ${executionHour}:00, which is uncommon for this workflow`],
      });
    }

    return causes;
  }

  /**
   * Generate recommendations based on root causes
   */
  generateRecommendations(rootCauses: RootCause[]): string[] {
    const recommendations: string[] = [];

    for (const cause of rootCauses) {
      switch (cause.factor) {
        case 'high_network_calls':
          recommendations.push('Implement request batching or caching');
          recommendations.push('Review API rate limits and quotas');
          break;
        case 'high_db_queries':
          recommendations.push('Optimize database queries or use query batching');
          recommendations.push('Consider adding database indexes');
          break;
        case 'retries':
          recommendations.push('Investigate and fix the underlying issue causing retries');
          recommendations.push('Implement circuit breaker pattern');
          break;
        case 'unusual_time':
          recommendations.push('Check for scheduled maintenance or system load');
          break;
      }
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Suggest automatic remediation based on root causes
   */
  suggestAutoRemediation(rootCauses: RootCause[]): AutoRemediation | undefined {
    const highLikelihoodCauses = rootCauses.filter((c) => c.likelihood > 0.7);

    if (highLikelihoodCauses.length === 0) {
      return undefined;
    }

    const primaryCause = highLikelihoodCauses[0];

    switch (primaryCause.factor) {
      case 'retries':
        return {
          action: 'increase_timeout',
          confidence: 0.6,
          description: 'Increase timeout values to reduce retries',
          requiresApproval: true,
        };
      case 'high_network_calls':
        return {
          action: 'enable_caching',
          confidence: 0.7,
          description: 'Enable response caching for repeated requests',
          requiresApproval: true,
        };
      default:
        return undefined;
    }
  }

  /**
   * Calculate severity based on anomaly score
   */
  calculateSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score > 0.9) return 'critical';
    if (score > 0.8) return 'high';
    if (score > 0.7) return 'medium';
    return 'low';
  }
}
