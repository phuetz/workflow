/**
 * Anomaly Detection System
 *
 * Provides comprehensive anomaly detection for workflow executions:
 * - Statistical methods (Z-score, IQR, Modified Z-score)
 * - Machine learning methods (Isolation Forest simulation)
 * - Real-time anomaly detection
 * - Automated alerting
 * - Root cause analysis
 * - Automatic remediation recommendations
 *
 * @module AnomalyDetection
 */

import { WorkflowExecutionData } from './MLModels';
import { mean, standardDeviation, quantile, median } from 'simple-statistics';
import { logger } from '../services/LoggingService';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface Anomaly {
  id: string;
  executionId: string;
  workflowId: string;
  timestamp: number;
  type: 'performance' | 'error' | 'resource' | 'cost' | 'pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number; // Anomaly score (higher = more anomalous)
  metric: string;
  actualValue: number;
  expectedValue: number;
  deviation: number; // Standard deviations from normal
  description: string;
  rootCauses: RootCause[];
  recommendations: string[];
  autoRemediation?: AutoRemediation;
}

export interface RootCause {
  factor: string;
  likelihood: number; // 0-1
  description: string;
  evidence: string[];
}

export interface AutoRemediation {
  action: string;
  confidence: number;
  description: string;
  script?: string;
  requiresApproval: boolean;
}

export interface AnomalyDetectionConfig {
  methods: Array<'zscore' | 'iqr' | 'modified_zscore' | 'isolation_forest'>;
  sensitivity: 'low' | 'medium' | 'high';
  minSamples: number;
  alertThreshold: number; // Minimum anomaly score to alert
  autoRemediate: boolean;
}

export interface AnomalyPattern {
  pattern: string;
  frequency: number;
  lastOccurrence: number;
  affectedWorkflows: string[];
  commonFactors: string[];
}

export interface AnomalyReport {
  totalAnomalies: number;
  anomaliesByType: Record<string, number>;
  anomaliesBySeverity: Record<string, number>;
  topAnomalies: Anomaly[];
  patterns: AnomalyPattern[];
  trends: {
    increasing: boolean;
    rate: number; // Anomalies per day
  };
  recommendations: string[];
}

// ============================================================================
// Statistical Anomaly Detection
// ============================================================================

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
   * Calculate anomaly score (0-1)
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
}

// ============================================================================
// Isolation Forest Implementation
// ============================================================================

class IsolationTree {
  private splitFeature: number | null = null;
  private splitValue: number | null = null;
  private left: IsolationTree | null = null;
  private right: IsolationTree | null = null;
  private size: number;

  constructor(
    data: number[][],
    currentHeight: number,
    maxHeight: number
  ) {
    this.size = data.length;

    // Termination conditions
    if (currentHeight >= maxHeight || data.length <= 1) {
      return;
    }

    // Randomly select feature and split value
    const numFeatures = data[0].length;
    this.splitFeature = Math.floor(Math.random() * numFeatures);

    const featureValues = data.map((d) => d[this.splitFeature!]);
    const min = Math.min(...featureValues);
    const max = Math.max(...featureValues);

    if (min === max) {
      return;
    }

    this.splitValue = min + Math.random() * (max - min);

    // Split data
    const leftData = data.filter((d) => d[this.splitFeature!] < this.splitValue!);
    const rightData = data.filter((d) => d[this.splitFeature!] >= this.splitValue!);

    if (leftData.length > 0) {
      this.left = new IsolationTree(leftData, currentHeight + 1, maxHeight);
    }
    if (rightData.length > 0) {
      this.right = new IsolationTree(rightData, currentHeight + 1, maxHeight);
    }
  }

  pathLength(point: number[], currentHeight: number): number {
    // External node
    if (this.splitFeature === null || this.splitValue === null) {
      return currentHeight + this.averagePathLength(this.size);
    }

    // Internal node
    if (point[this.splitFeature] < this.splitValue) {
      return this.left
        ? this.left.pathLength(point, currentHeight + 1)
        : currentHeight + 1 + this.averagePathLength(this.size);
    } else {
      return this.right
        ? this.right.pathLength(point, currentHeight + 1)
        : currentHeight + 1 + this.averagePathLength(this.size);
    }
  }

  private averagePathLength(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
  }
}

export class IsolationForestDetector {
  private trees: IsolationTree[] = [];
  private numTrees = 100;
  private sampleSize = 256;

  train(data: number[][]): void {
    logger.debug(`Training Isolation Forest with ${data.length} samples...`);

    const maxHeight = Math.ceil(Math.log2(this.sampleSize));

    for (let i = 0; i < this.numTrees; i++) {
      // Sample data
      const sample: number[][] = [];
      for (let j = 0; j < Math.min(this.sampleSize, data.length); j++) {
        const randomIndex = Math.floor(Math.random() * data.length);
        sample.push(data[randomIndex]);
      }

      // Build tree
      this.trees.push(new IsolationTree(sample, 0, maxHeight));
    }

    logger.debug('Isolation Forest trained successfully');
  }

  predict(point: number[]): number {
    if (this.trees.length === 0) {
      throw new Error('Model not trained');
    }

    const avgPathLength =
      this.trees.reduce((sum, tree) => sum + tree.pathLength(point, 0), 0) / this.trees.length;

    const expectedPathLength = 2 * (Math.log(this.sampleSize - 1) + 0.5772156649) - (2 * (this.sampleSize - 1)) / this.sampleSize;

    // Anomaly score: 2^(-avgPathLength / expectedPathLength)
    const score = Math.pow(2, -avgPathLength / expectedPathLength);

    return score;
  }

  detectAnomalies(data: number[][], threshold = 0.6): boolean[] {
    return data.map((point) => this.predict(point) > threshold);
  }
}

// ============================================================================
// Anomaly Detection Engine
// ============================================================================

export class AnomalyDetectionEngine {
  private config: AnomalyDetectionConfig;
  private historicalData: WorkflowExecutionData[] = [];
  private detectedAnomalies: Anomaly[] = [];
  private isolationForest: IsolationForestDetector | null = null;

  constructor(config?: Partial<AnomalyDetectionConfig>) {
    this.config = {
      methods: ['zscore', 'iqr', 'isolation_forest'],
      sensitivity: 'medium',
      minSamples: 30,
      alertThreshold: 0.7,
      autoRemediate: false,
      ...config,
    };
  }

  /**
   * Initialize with historical data
   */
  initialize(data: WorkflowExecutionData[]): void {
    logger.debug(`Initializing Anomaly Detection with ${data.length} samples...`);

    if (data.length < this.config.minSamples) {
      logger.warn(`Insufficient data (${data.length} < ${this.config.minSamples}). Using available data.`);
    }

    this.historicalData = data;

    // Train Isolation Forest if enabled
    if (this.config.methods.includes('isolation_forest') && data.length >= 10) {
      this.trainIsolationForest(data);
    }

    logger.debug('Anomaly Detection Engine initialized');
  }

  /**
   * Train Isolation Forest model
   */
  private trainIsolationForest(data: WorkflowExecutionData[]): void {
    const features = data.map((d) => [
      d.duration,
      d.cpuUsage,
      d.memoryUsage,
      d.networkCalls,
      d.dbQueries,
      d.errorCount,
      d.retryCount,
    ]);

    this.isolationForest = new IsolationForestDetector();
    this.isolationForest.train(features);
  }

  /**
   * Detect anomalies in new execution
   */
  async detectAnomalies(execution: WorkflowExecutionData): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Get baseline data for this workflow
    const baseline = this.historicalData.filter(
      (d) => d.workflowId === execution.workflowId && d.success
    );

    if (baseline.length < 3) {
      logger.warn(`Insufficient baseline data for workflow ${execution.workflowId}`);
      return anomalies;
    }

    // Check execution time anomaly
    const durationAnomaly = this.detectDurationAnomaly(execution, baseline);
    if (durationAnomaly) {
      anomalies.push(durationAnomaly);
    }

    // Check resource anomalies
    const resourceAnomalies = this.detectResourceAnomalies(execution, baseline);
    anomalies.push(...resourceAnomalies);

    // Check error pattern anomalies
    const errorAnomaly = this.detectErrorAnomaly(execution, baseline);
    if (errorAnomaly) {
      anomalies.push(errorAnomaly);
    }

    // Check cost anomaly
    const costAnomaly = this.detectCostAnomaly(execution, baseline);
    if (costAnomaly) {
      anomalies.push(costAnomaly);
    }

    // Use Isolation Forest if available
    if (this.isolationForest) {
      const mlAnomaly = this.detectWithIsolationForest(execution);
      if (mlAnomaly) {
        anomalies.push(mlAnomaly);
      }
    }

    // Store detected anomalies
    this.detectedAnomalies.push(...anomalies);

    // Alert if necessary
    if (anomalies.length > 0) {
      await this.handleAnomalies(anomalies);
    }

    return anomalies;
  }

  /**
   * Detect duration anomalies
   */
  private detectDurationAnomaly(
    execution: WorkflowExecutionData,
    baseline: WorkflowExecutionData[]
  ): Anomaly | null {
    const durations = baseline.map((d) => d.duration);
    const threshold = this.getSensitivityThreshold();

    const isAnomaly = StatisticalAnomalyDetector.detectWithModifiedZScore(
      [...durations, execution.duration],
      threshold
    ).pop();

    if (!isAnomaly) {
      return null;
    }

    const expectedDuration = mean(durations);
    const score = StatisticalAnomalyDetector.calculateAnomalyScore(execution.duration, durations);

    const severity = this.calculateSeverity(score);

    // Root cause analysis
    const rootCauses = this.analyzeRootCauses(execution, baseline, 'duration');

    return {
      id: `anomaly-${Date.now()}-duration`,
      executionId: execution.id,
      workflowId: execution.workflowId,
      timestamp: execution.timestamp,
      type: 'performance',
      severity,
      score,
      metric: 'execution_time',
      actualValue: execution.duration,
      expectedValue: expectedDuration,
      deviation: (execution.duration - expectedDuration) / standardDeviation(durations),
      description: `Execution time (${(execution.duration / 1000).toFixed(1)}s) is ${execution.duration > expectedDuration ? 'significantly higher' : 'significantly lower'} than expected (${(expectedDuration / 1000).toFixed(1)}s)`,
      rootCauses,
      recommendations: this.generateRecommendations(rootCauses),
      autoRemediation: this.suggestAutoRemediation(rootCauses),
    };
  }

  /**
   * Detect resource anomalies
   */
  private detectResourceAnomalies(
    execution: WorkflowExecutionData,
    baseline: WorkflowExecutionData[]
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // CPU anomaly
    const cpuValues = baseline.map((d) => d.cpuUsage);
    const cpuScore = StatisticalAnomalyDetector.calculateAnomalyScore(
      execution.cpuUsage,
      cpuValues
    );

    if (cpuScore > this.config.alertThreshold) {
      anomalies.push({
        id: `anomaly-${Date.now()}-cpu`,
        executionId: execution.id,
        workflowId: execution.workflowId,
        timestamp: execution.timestamp,
        type: 'resource',
        severity: this.calculateSeverity(cpuScore),
        score: cpuScore,
        metric: 'cpu_usage',
        actualValue: execution.cpuUsage,
        expectedValue: mean(cpuValues),
        deviation: (execution.cpuUsage - mean(cpuValues)) / standardDeviation(cpuValues),
        description: `CPU usage (${execution.cpuUsage.toFixed(1)}%) is abnormally high`,
        rootCauses: this.analyzeRootCauses(execution, baseline, 'cpu'),
        recommendations: ['Optimize computationally intensive nodes', 'Consider parallel execution'],
        autoRemediation: undefined,
      });
    }

    // Memory anomaly
    const memValues = baseline.map((d) => d.memoryUsage);
    const memScore = StatisticalAnomalyDetector.calculateAnomalyScore(
      execution.memoryUsage,
      memValues
    );

    if (memScore > this.config.alertThreshold) {
      anomalies.push({
        id: `anomaly-${Date.now()}-memory`,
        executionId: execution.id,
        workflowId: execution.workflowId,
        timestamp: execution.timestamp,
        type: 'resource',
        severity: this.calculateSeverity(memScore),
        score: memScore,
        metric: 'memory_usage',
        actualValue: execution.memoryUsage,
        expectedValue: mean(memValues),
        deviation: (execution.memoryUsage - mean(memValues)) / standardDeviation(memValues),
        description: `Memory usage (${execution.memoryUsage.toFixed(0)}MB) is abnormally high`,
        rootCauses: this.analyzeRootCauses(execution, baseline, 'memory'),
        recommendations: ['Implement data streaming', 'Reduce in-memory data storage'],
        autoRemediation: undefined,
      });
    }

    return anomalies;
  }

  /**
   * Detect error pattern anomalies
   */
  private detectErrorAnomaly(
    execution: WorkflowExecutionData,
    baseline: WorkflowExecutionData[]
  ): Anomaly | null {
    if (execution.success) {
      return null;
    }

    const errorCounts = baseline.map((d) => d.errorCount);
    const avgErrors = mean(errorCounts);

    if (execution.errorCount > avgErrors * 2) {
      return {
        id: `anomaly-${Date.now()}-errors`,
        executionId: execution.id,
        workflowId: execution.workflowId,
        timestamp: execution.timestamp,
        type: 'error',
        severity: 'high',
        score: 0.9,
        metric: 'error_count',
        actualValue: execution.errorCount,
        expectedValue: avgErrors,
        deviation: (execution.errorCount - avgErrors) / standardDeviation(errorCounts),
        description: `Execution failed with ${execution.errorCount} errors (avg: ${avgErrors.toFixed(1)})`,
        rootCauses: this.analyzeRootCauses(execution, baseline, 'errors'),
        recommendations: ['Review error logs', 'Check external service availability', 'Improve error handling'],
        autoRemediation: {
          action: 'retry_with_exponential_backoff',
          confidence: 0.7,
          description: 'Automatically retry execution with exponential backoff',
          requiresApproval: true,
        },
      };
    }

    return null;
  }

  /**
   * Detect cost anomalies
   */
  private detectCostAnomaly(
    execution: WorkflowExecutionData,
    baseline: WorkflowExecutionData[]
  ): Anomaly | null {
    const costs = baseline.map((d) => d.cost);
    const score = StatisticalAnomalyDetector.calculateAnomalyScore(execution.cost, costs);

    if (score > this.config.alertThreshold) {
      return {
        id: `anomaly-${Date.now()}-cost`,
        executionId: execution.id,
        workflowId: execution.workflowId,
        timestamp: execution.timestamp,
        type: 'cost',
        severity: this.calculateSeverity(score),
        score,
        metric: 'cost',
        actualValue: execution.cost,
        expectedValue: mean(costs),
        deviation: (execution.cost - mean(costs)) / standardDeviation(costs),
        description: `Execution cost ($${execution.cost.toFixed(4)}) is abnormally high`,
        rootCauses: this.analyzeRootCauses(execution, baseline, 'cost'),
        recommendations: ['Audit API usage', 'Optimize expensive operations', 'Review pricing tier'],
        autoRemediation: undefined,
      };
    }

    return null;
  }

  /**
   * Detect anomalies using Isolation Forest
   */
  private detectWithIsolationForest(execution: WorkflowExecutionData): Anomaly | null {
    if (!this.isolationForest) {
      return null;
    }

    const features = [
      execution.duration,
      execution.cpuUsage,
      execution.memoryUsage,
      execution.networkCalls,
      execution.dbQueries,
      execution.errorCount,
      execution.retryCount,
    ];

    const score = this.isolationForest.predict(features);

    if (score > this.config.alertThreshold) {
      return {
        id: `anomaly-${Date.now()}-ml`,
        executionId: execution.id,
        workflowId: execution.workflowId,
        timestamp: execution.timestamp,
        type: 'pattern',
        severity: this.calculateSeverity(score),
        score,
        metric: 'pattern_anomaly',
        actualValue: score,
        expectedValue: 0.5,
        deviation: score,
        description: 'ML model detected unusual execution pattern',
        rootCauses: [],
        recommendations: ['Investigate execution details', 'Compare with similar executions'],
        autoRemediation: undefined,
      };
    }

    return null;
  }

  /**
   * Analyze root causes
   */
  private analyzeRootCauses(
    execution: WorkflowExecutionData,
    baseline: WorkflowExecutionData[],
    metric: string
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
  private generateRecommendations(rootCauses: RootCause[]): string[] {
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
   * Suggest automatic remediation
   */
  private suggestAutoRemediation(rootCauses: RootCause[]): AutoRemediation | undefined {
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
  private calculateSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score > 0.9) return 'critical';
    if (score > 0.8) return 'high';
    if (score > 0.7) return 'medium';
    return 'low';
  }

  /**
   * Get sensitivity threshold based on config
   */
  private getSensitivityThreshold(): number {
    switch (this.config.sensitivity) {
      case 'low':
        return 4.0;
      case 'medium':
        return 3.5;
      case 'high':
        return 2.5;
    }
  }

  /**
   * Handle detected anomalies (alerting, remediation)
   */
  private async handleAnomalies(anomalies: Anomaly[]): Promise<void> {
    for (const anomaly of anomalies) {
      logger.debug(`[ANOMALY DETECTED] ${anomaly.description}`);
      logger.debug(`  Severity: ${anomaly.severity}, Score: ${anomaly.score.toFixed(2)}`);

      // Send alerts for high severity
      if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
        await this.sendAlert(anomaly);
      }

      // Auto-remediate if configured and available
      if (this.config.autoRemediate && anomaly.autoRemediation && !anomaly.autoRemediation.requiresApproval) {
        await this.executeAutoRemediation(anomaly);
      }
    }
  }

  /**
   * Send alert for anomaly
   */
  private async sendAlert(anomaly: Anomaly): Promise<void> {
    // Placeholder for actual alert implementation
    logger.debug(`[ALERT] Sending alert for ${anomaly.type} anomaly: ${anomaly.description}`);
    // In production, this would send to Slack, email, PagerDuty, etc.
  }

  /**
   * Execute automatic remediation
   */
  private async executeAutoRemediation(anomaly: Anomaly): Promise<void> {
    if (!anomaly.autoRemediation) return;

    logger.debug(`[AUTO-REMEDIATION] Executing: ${anomaly.autoRemediation.action}`);
    // In production, this would execute the actual remediation action
  }

  /**
   * Generate anomaly report
   */
  generateReport(timeRange?: { start: number; end: number }): AnomalyReport {
    let anomalies = this.detectedAnomalies;

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
    const topAnomalies = [...anomalies]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

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
    const firstHalfRate = mid / ((sorted[mid - 1].timestamp - firstTimestamp) / (24 * 60 * 60 * 1000));
    const secondHalfRate =
      (sorted.length - mid) / ((lastTimestamp - sorted[mid].timestamp) / (24 * 60 * 60 * 1000));

    return {
      increasing: secondHalfRate > firstHalfRate * 1.2,
      rate,
    };
  }

  /**
   * Generate global recommendations
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

  getDetectedAnomalies(): Anomaly[] {
    return this.detectedAnomalies;
  }

  getConfig(): AnomalyDetectionConfig {
    return this.config;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let detectorInstance: AnomalyDetectionEngine | null = null;

export function getAnomalyDetectionEngine(): AnomalyDetectionEngine {
  if (!detectorInstance) {
    detectorInstance = new AnomalyDetectionEngine();
  }
  return detectorInstance;
}
