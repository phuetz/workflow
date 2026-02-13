/**
 * Anomaly Detection System
 *
 * Main orchestrator for comprehensive anomaly detection in workflow executions.
 * Delegates to specialized modules for:
 * - Statistical methods (Z-score, IQR, Modified Z-score)
 * - Machine learning methods (Isolation Forest)
 * - Alert generation and root cause analysis
 * - Anomaly storage and reporting
 *
 * @module AnomalyDetection
 */

import { WorkflowExecutionData } from './MLModels';
import { logger } from '../services/SimpleLogger';
import { mean, standardDeviation } from 'simple-statistics';

// Import from anomaly submodules
import {
  Anomaly,
  AnomalyDetectionConfig,
  AnomalyReport,
  RootCause,
  AutoRemediation,
  AnomalyPattern,
} from './anomaly/types';
import { StatisticalAnomalyDetector } from './anomaly/StatisticalDetector';
import { IsolationForestDetector } from './anomaly/MLDetector';
import { AlertGenerator } from './anomaly/AlertGenerator';
import { AnomalyStore } from './anomaly/AnomalyStore';

// Re-export types for backwards compatibility
export type {
  Anomaly,
  RootCause,
  AutoRemediation,
  AnomalyDetectionConfig,
  AnomalyPattern,
  AnomalyReport,
};

// Re-export classes for backwards compatibility
export { StatisticalAnomalyDetector, IsolationForestDetector };

/** Main Anomaly Detection Engine */
export class AnomalyDetectionEngine {
  private config: AnomalyDetectionConfig;
  private historicalData: WorkflowExecutionData[] = [];
  private isolationForest: IsolationForestDetector | null = null;
  private alertGenerator: AlertGenerator;
  private anomalyStore: AnomalyStore;

  constructor(config?: Partial<AnomalyDetectionConfig>) {
    this.config = {
      methods: ['zscore', 'iqr', 'isolation_forest'],
      sensitivity: 'medium',
      minSamples: 30,
      alertThreshold: 0.7,
      autoRemediate: false,
      ...config,
    };
    this.alertGenerator = new AlertGenerator(this.config);
    this.anomalyStore = new AnomalyStore();
  }

  /** Initialize with historical data */
  initialize(data: WorkflowExecutionData[]): void {
    logger.debug(`Initializing Anomaly Detection with ${data.length} samples...`);
    if (data.length < this.config.minSamples) {
      logger.warn(`Insufficient data (${data.length} < ${this.config.minSamples}). Using available data.`);
    }
    this.historicalData = data;
    if (this.config.methods.includes('isolation_forest') && data.length >= 10) {
      this.trainIsolationForest(data);
    }
    logger.debug('Anomaly Detection Engine initialized');
  }

  private trainIsolationForest(data: WorkflowExecutionData[]): void {
    const features = data.map((d) => [d.duration, d.cpuUsage, d.memoryUsage, d.networkCalls, d.dbQueries, d.errorCount, d.retryCount]);
    this.isolationForest = new IsolationForestDetector();
    this.isolationForest.train(features);
  }

  /** Detect anomalies in new execution */
  async detectAnomalies(execution: WorkflowExecutionData): Promise<Anomaly[]> {
    const baseline = this.historicalData.filter((d) => d.workflowId === execution.workflowId && d.success);
    if (baseline.length < 3) {
      logger.warn(`Insufficient baseline data for workflow ${execution.workflowId}`);
      return [];
    }

    const anomalies: Anomaly[] = [];
    const durationAnomaly = this.detectDurationAnomaly(execution, baseline);
    if (durationAnomaly) anomalies.push(durationAnomaly);
    anomalies.push(...this.detectResourceAnomalies(execution, baseline));
    const errorAnomaly = this.detectErrorAnomaly(execution, baseline);
    if (errorAnomaly) anomalies.push(errorAnomaly);
    const costAnomaly = this.detectCostAnomaly(execution, baseline);
    if (costAnomaly) anomalies.push(costAnomaly);
    if (this.isolationForest) {
      const mlAnomaly = this.detectWithIsolationForest(execution);
      if (mlAnomaly) anomalies.push(mlAnomaly);
    }

    this.anomalyStore.addAnomalies(anomalies);
    if (anomalies.length > 0) await this.alertGenerator.handleAnomalies(anomalies);
    return anomalies;
  }

  private createAnomaly(execution: WorkflowExecutionData, type: Anomaly['type'], metric: string, score: number, actualValue: number, expectedValue: number, deviation: number, description: string, rootCauses: RootCause[], recommendations: string[], autoRemediation?: AutoRemediation): Anomaly {
    return {
      id: `anomaly-${Date.now()}-${metric}`,
      executionId: execution.id,
      workflowId: execution.workflowId,
      timestamp: execution.timestamp,
      type, severity: this.alertGenerator.calculateSeverity(score),
      score, metric, actualValue, expectedValue, deviation, description,
      rootCauses, recommendations, autoRemediation,
    };
  }

  private detectDurationAnomaly(execution: WorkflowExecutionData, baseline: WorkflowExecutionData[]): Anomaly | null {
    const durations = baseline.map((d) => d.duration);
    const isAnomaly = StatisticalAnomalyDetector.detectWithModifiedZScore([...durations, execution.duration], this.getSensitivityThreshold()).pop();
    if (!isAnomaly) return null;

    const expected = mean(durations);
    const score = StatisticalAnomalyDetector.calculateAnomalyScore(execution.duration, durations);
    const rootCauses = this.alertGenerator.analyzeRootCauses(execution, baseline, 'duration');
    const desc = `Execution time (${(execution.duration / 1000).toFixed(1)}s) is ${execution.duration > expected ? 'significantly higher' : 'significantly lower'} than expected (${(expected / 1000).toFixed(1)}s)`;
    return this.createAnomaly(execution, 'performance', 'execution_time', score, execution.duration, expected, (execution.duration - expected) / standardDeviation(durations), desc, rootCauses, this.alertGenerator.generateRecommendations(rootCauses), this.alertGenerator.suggestAutoRemediation(rootCauses));
  }

  private detectResourceAnomalies(execution: WorkflowExecutionData, baseline: WorkflowExecutionData[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const cpuValues = baseline.map((d) => d.cpuUsage);
    const cpuScore = StatisticalAnomalyDetector.calculateAnomalyScore(execution.cpuUsage, cpuValues);
    if (cpuScore > this.config.alertThreshold) {
      anomalies.push(this.createAnomaly(execution, 'resource', 'cpu_usage', cpuScore, execution.cpuUsage, mean(cpuValues), (execution.cpuUsage - mean(cpuValues)) / standardDeviation(cpuValues), `CPU usage (${execution.cpuUsage.toFixed(1)}%) is abnormally high`, this.alertGenerator.analyzeRootCauses(execution, baseline, 'cpu'), ['Optimize computationally intensive nodes', 'Consider parallel execution']));
    }
    const memValues = baseline.map((d) => d.memoryUsage);
    const memScore = StatisticalAnomalyDetector.calculateAnomalyScore(execution.memoryUsage, memValues);
    if (memScore > this.config.alertThreshold) {
      anomalies.push(this.createAnomaly(execution, 'resource', 'memory_usage', memScore, execution.memoryUsage, mean(memValues), (execution.memoryUsage - mean(memValues)) / standardDeviation(memValues), `Memory usage (${execution.memoryUsage.toFixed(0)}MB) is abnormally high`, this.alertGenerator.analyzeRootCauses(execution, baseline, 'memory'), ['Implement data streaming', 'Reduce in-memory data storage']));
    }
    return anomalies;
  }

  private detectErrorAnomaly(execution: WorkflowExecutionData, baseline: WorkflowExecutionData[]): Anomaly | null {
    if (execution.success) return null;
    const errorCounts = baseline.map((d) => d.errorCount);
    const avgErrors = mean(errorCounts);
    if (execution.errorCount <= avgErrors * 2) return null;
    return this.createAnomaly(execution, 'error', 'error_count', 0.9, execution.errorCount, avgErrors, (execution.errorCount - avgErrors) / standardDeviation(errorCounts), `Execution failed with ${execution.errorCount} errors (avg: ${avgErrors.toFixed(1)})`, this.alertGenerator.analyzeRootCauses(execution, baseline, 'errors'), ['Review error logs', 'Check external service availability', 'Improve error handling'], { action: 'retry_with_exponential_backoff', confidence: 0.7, description: 'Automatically retry execution with exponential backoff', requiresApproval: true });
  }

  private detectCostAnomaly(execution: WorkflowExecutionData, baseline: WorkflowExecutionData[]): Anomaly | null {
    const costs = baseline.map((d) => d.cost);
    const score = StatisticalAnomalyDetector.calculateAnomalyScore(execution.cost, costs);
    if (score <= this.config.alertThreshold) return null;
    return this.createAnomaly(execution, 'cost', 'cost', score, execution.cost, mean(costs), (execution.cost - mean(costs)) / standardDeviation(costs), `Execution cost ($${execution.cost.toFixed(4)}) is abnormally high`, this.alertGenerator.analyzeRootCauses(execution, baseline, 'cost'), ['Audit API usage', 'Optimize expensive operations', 'Review pricing tier']);
  }

  private detectWithIsolationForest(execution: WorkflowExecutionData): Anomaly | null {
    if (!this.isolationForest) return null;
    const features = [execution.duration, execution.cpuUsage, execution.memoryUsage, execution.networkCalls, execution.dbQueries, execution.errorCount, execution.retryCount];
    const score = this.isolationForest.predict(features);
    if (score <= this.config.alertThreshold) return null;
    return this.createAnomaly(execution, 'pattern', 'pattern_anomaly', score, score, 0.5, score, 'ML model detected unusual execution pattern', [], ['Investigate execution details', 'Compare with similar executions']);
  }

  private getSensitivityThreshold(): number {
    return this.config.sensitivity === 'low' ? 4.0 : this.config.sensitivity === 'medium' ? 3.5 : 2.5;
  }

  generateReport(timeRange?: { start: number; end: number }): AnomalyReport {
    return this.anomalyStore.generateReport(timeRange);
  }

  getDetectedAnomalies(): Anomaly[] {
    return this.anomalyStore.getAnomalies();
  }

  getConfig(): AnomalyDetectionConfig {
    return this.config;
  }
}

// Singleton Instance
let detectorInstance: AnomalyDetectionEngine | null = null;

export function getAnomalyDetectionEngine(): AnomalyDetectionEngine {
  if (!detectorInstance) {
    detectorInstance = new AnomalyDetectionEngine();
  }
  return detectorInstance;
}
