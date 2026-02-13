/**
 * Twin Comparison Utility
 *
 * Advanced comparison between virtual twin simulations and real
 * workflow executions to measure accuracy and identify discrepancies.
 */

import type {
  ComparisonResult,
  ExecutionDifference,
  ComparisonMetrics,
  SimulationResult,
} from './types/digitaltwin';
import type { WorkflowExecution } from '../types/workflowTypes';
import { generateUUID } from '../utils/uuid';

/**
 * Comparison configuration
 */
export interface ComparisonConfig {
  compareOutputs: boolean;
  compareDurations: boolean;
  compareErrors: boolean;
  compareStates: boolean;
  compareMetadata: boolean;
  toleranceDuration: number; // ms
  toleranceNumeric: number; // percentage
  deepCompare: boolean;
}

/**
 * Comparison report
 */
export interface ComparisonReport {
  id: string;
  comparisons: ComparisonResult[];
  overallAccuracy: number;
  totalDifferences: number;
  criticalDifferences: number;
  summary: {
    identical: number;
    similar: number;
    different: number;
    failed: number;
  };
  recommendations: string[];
  timestamp: Date;
}

/**
 * Twin Comparison class
 */
export class TwinComparison {
  private comparisons: Map<string, ComparisonResult> = new Map();
  private reports: Map<string, ComparisonReport> = new Map();
  private config: ComparisonConfig;

  constructor(config: Partial<ComparisonConfig> = {}) {
    this.config = {
      compareOutputs: config.compareOutputs ?? true,
      compareDurations: config.compareDurations ?? true,
      compareErrors: config.compareErrors ?? true,
      compareStates: config.compareStates ?? true,
      compareMetadata: config.compareMetadata ?? false,
      toleranceDuration: config.toleranceDuration ?? 1000, // 1 second
      toleranceNumeric: config.toleranceNumeric ?? 0.01, // 1%
      deepCompare: config.deepCompare ?? true,
    };
  }

  /**
   * Compare virtual and real executions
   */
  async compare(
    twinId: string,
    virtualExecution: SimulationResult,
    realExecution: WorkflowExecution
  ): Promise<ComparisonResult> {
    const differences: ExecutionDifference[] = [];

    // Compare outputs
    if (this.config.compareOutputs) {
      const outputDiffs = this.compareOutputs(
        virtualExecution.output,
        realExecution.output
      );
      differences.push(...outputDiffs);
    }

    // Compare durations
    if (this.config.compareDurations) {
      const durationDiffs = this.compareDurations(
        virtualExecution.duration,
        this.getExecutionDuration(realExecution)
      );
      differences.push(...durationDiffs);
    }

    // Compare errors
    if (this.config.compareErrors) {
      const errorDiffs = this.compareErrors(
        virtualExecution.error,
        realExecution.error
      );
      differences.push(...errorDiffs);
    }

    // Compare states
    if (this.config.compareStates) {
      const stateDiffs = this.compareStates(virtualExecution, realExecution);
      differences.push(...stateDiffs);
    }

    // Compare metadata
    if (this.config.compareMetadata) {
      const metadataDiffs = this.compareMetadata(
        virtualExecution,
        realExecution
      );
      differences.push(...metadataDiffs);
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(differences);

    // Determine status
    const status = this.getComparisonStatus(metrics.overallAccuracy);

    const result: ComparisonResult = {
      id: generateUUID(),
      twinId,
      virtualExecutionId: virtualExecution.id,
      realExecutionId: realExecution.id,
      status,
      accuracy: metrics.overallAccuracy,
      differences,
      metrics,
      timestamp: new Date(),
    };

    this.comparisons.set(result.id, result);
    return result;
  }

  /**
   * Compare outputs
   */
  private compareOutputs(
    virtualOutput: any,
    realOutput: any
  ): ExecutionDifference[] {
    const differences: ExecutionDifference[] = [];

    if (this.config.deepCompare) {
      const deepDiffs = this.deepCompare(virtualOutput, realOutput, '$');
      differences.push(...deepDiffs);
    } else {
      // Shallow comparison
      const virtualJson = JSON.stringify(virtualOutput);
      const realJson = JSON.stringify(realOutput);

      if (virtualJson !== realJson) {
        differences.push({
          type: 'output',
          location: 'root',
          virtualValue: virtualOutput,
          realValue: realOutput,
          severity: 'critical',
          description: 'Root output differs between virtual and real execution',
        });
      }
    }

    return differences;
  }

  /**
   * Deep compare two objects
   */
  private deepCompare(
    virtual: any,
    real: any,
    path: string
  ): ExecutionDifference[] {
    const differences: ExecutionDifference[] = [];

    // Type comparison
    if (typeof virtual !== typeof real) {
      differences.push({
        type: 'output',
        location: path,
        virtualValue: virtual,
        realValue: real,
        severity: 'major',
        description: `Type mismatch at ${path}: ${typeof virtual} vs ${typeof real}`,
      });
      return differences;
    }

    // Null/undefined comparison
    if (virtual === null || real === null || virtual === undefined || real === undefined) {
      if (virtual !== real) {
        differences.push({
          type: 'output',
          location: path,
          virtualValue: virtual,
          realValue: real,
          severity: 'major',
          description: `Value mismatch at ${path}`,
        });
      }
      return differences;
    }

    // Primitive comparison
    if (typeof virtual !== 'object') {
      if (!this.valuesEqual(virtual, real)) {
        differences.push({
          type: 'output',
          location: path,
          virtualValue: virtual,
          realValue: real,
          severity: this.getSeverityByPath(path),
          description: `Value mismatch at ${path}`,
        });
      }
      return differences;
    }

    // Array comparison
    if (Array.isArray(virtual) && Array.isArray(real)) {
      if (virtual.length !== real.length) {
        differences.push({
          type: 'output',
          location: path,
          virtualValue: virtual.length,
          realValue: real.length,
          severity: 'major',
          description: `Array length mismatch at ${path}: ${virtual.length} vs ${real.length}`,
        });
      }

      const minLength = Math.min(virtual.length, real.length);
      for (let i = 0; i < minLength; i++) {
        const itemDiffs = this.deepCompare(virtual[i], real[i], `${path}[${i}]`);
        differences.push(...itemDiffs);
      }
      return differences;
    }

    // Object comparison
    if (typeof virtual === 'object' && typeof real === 'object') {
      const virtualKeys = Object.keys(virtual);
      const realKeys = Object.keys(real);

      // Check for missing keys
      const missingInReal = virtualKeys.filter(k => !(k in real));
      const missingInVirtual = realKeys.filter(k => !(k in virtual));

      missingInReal.forEach(key => {
        differences.push({
          type: 'output',
          location: `${path}.${key}`,
          virtualValue: virtual[key],
          realValue: undefined,
          severity: 'minor',
          description: `Key "${key}" exists in virtual but not in real`,
        });
      });

      missingInVirtual.forEach(key => {
        differences.push({
          type: 'output',
          location: `${path}.${key}`,
          virtualValue: undefined,
          realValue: real[key],
          severity: 'minor',
          description: `Key "${key}" exists in real but not in virtual`,
        });
      });

      // Compare common keys
      const commonKeys = virtualKeys.filter(k => k in real);
      commonKeys.forEach(key => {
        const propDiffs = this.deepCompare(
          virtual[key],
          real[key],
          `${path}.${key}`
        );
        differences.push(...propDiffs);
      });
    }

    return differences;
  }

  /**
   * Check if values are equal within tolerance
   */
  private valuesEqual(virtual: any, real: any): boolean {
    // Exact equality
    if (virtual === real) return true;

    // Numeric comparison with tolerance
    if (typeof virtual === 'number' && typeof real === 'number') {
      const diff = Math.abs(virtual - real);
      const tolerance = Math.abs(real * this.config.toleranceNumeric);
      return diff <= tolerance;
    }

    // String comparison (case-insensitive for some cases)
    if (typeof virtual === 'string' && typeof real === 'string') {
      return virtual === real;
    }

    return false;
  }

  /**
   * Get severity based on path
   */
  private getSeverityByPath(path: string): 'critical' | 'major' | 'minor' | 'info' {
    // Critical paths
    if (path.includes('error') || path.includes('status')) {
      return 'critical';
    }

    // Major paths
    if (path.includes('result') || path.includes('output')) {
      return 'major';
    }

    // Minor paths
    if (path.includes('metadata') || path.includes('timestamp')) {
      return 'minor';
    }

    return 'info';
  }

  /**
   * Compare durations
   */
  private compareDurations(
    virtualDuration: number,
    realDuration: number
  ): ExecutionDifference[] {
    const differences: ExecutionDifference[] = [];
    const diff = Math.abs(virtualDuration - realDuration);

    if (diff > this.config.toleranceDuration) {
      const severity = diff > realDuration * 0.5 ? 'major' : 'minor';
      differences.push({
        type: 'duration',
        location: 'execution_duration',
        virtualValue: virtualDuration,
        realValue: realDuration,
        severity,
        description: `Duration differs by ${diff.toFixed(0)}ms (${((diff / realDuration) * 100).toFixed(1)}%)`,
      });
    }

    return differences;
  }

  /**
   * Compare errors
   */
  private compareErrors(
    virtualError: Error | undefined,
    realError: any
  ): ExecutionDifference[] {
    const differences: ExecutionDifference[] = [];

    const hasVirtualError = virtualError !== undefined;
    const hasRealError = realError !== undefined;

    if (hasVirtualError !== hasRealError) {
      differences.push({
        type: 'error',
        location: 'error_state',
        virtualValue: virtualError?.message,
        realValue: realError,
        severity: 'critical',
        description: 'Error state differs between virtual and real execution',
      });
    } else if (hasVirtualError && hasRealError) {
      // Compare error messages
      if (virtualError!.message !== realError.message) {
        differences.push({
          type: 'error',
          location: 'error_message',
          virtualValue: virtualError!.message,
          realValue: realError.message,
          severity: 'minor',
          description: 'Error messages differ',
        });
      }
    }

    return differences;
  }

  /**
   * Compare states
   */
  private compareStates(
    virtualExecution: SimulationResult,
    realExecution: WorkflowExecution
  ): ExecutionDifference[] {
    const differences: ExecutionDifference[] = [];

    // Compare status
    const virtualStatus = virtualExecution.status;
    const realStatus = this.getRealStatus(realExecution);

    if (virtualStatus !== realStatus) {
      differences.push({
        type: 'state',
        location: 'execution_status',
        virtualValue: virtualStatus,
        realValue: realStatus,
        severity: 'critical',
        description: 'Execution status differs',
      });
    }

    return differences;
  }

  /**
   * Compare metadata
   */
  private compareMetadata(
    virtualExecution: SimulationResult,
    realExecution: WorkflowExecution
  ): ExecutionDifference[] {
    const differences: ExecutionDifference[] = [];

    // Compare node counts
    const virtualNodeCount = virtualExecution.nodeResults.length;
    const realNodeCount = 0; // Would get from real execution

    if (virtualNodeCount !== realNodeCount && realNodeCount > 0) {
      differences.push({
        type: 'metadata',
        location: 'node_count',
        virtualValue: virtualNodeCount,
        realValue: realNodeCount,
        severity: 'info',
        description: 'Node execution count differs',
      });
    }

    return differences;
  }

  /**
   * Calculate comparison metrics
   */
  private calculateMetrics(differences: ExecutionDifference[]): ComparisonMetrics {
    const outputDiffs = differences.filter(d => d.type === 'output').length;
    const durationDiffs = differences.filter(d => d.type === 'duration').length;
    const errorDiffs = differences.filter(d => d.type === 'error').length;
    const stateDiffs = differences.filter(d => d.type === 'state').length;

    const criticalDiffs = differences.filter(d => d.severity === 'critical').length;
    const totalDiffs = differences.length;

    // Calculate match scores
    const outputMatch = outputDiffs === 0 ? 1.0 : Math.max(0, 1 - outputDiffs * 0.1);
    const durationMatch = durationDiffs === 0 ? 1.0 : 0.8;
    const errorMatch = errorDiffs === 0 ? 1.0 : 0.0;
    const stateMatch = stateDiffs === 0 ? 1.0 : 0.0;

    // Calculate overall accuracy
    const weights = {
      output: 0.5,
      duration: 0.2,
      error: 0.2,
      state: 0.1,
    };

    const overallAccuracy =
      outputMatch * weights.output +
      durationMatch * weights.duration +
      errorMatch * weights.error +
      stateMatch * weights.state;

    return {
      outputMatch,
      durationMatch,
      errorMatch,
      stateMatch,
      overallAccuracy: Math.max(0, Math.min(1, overallAccuracy)),
      totalDifferences: totalDiffs,
      criticalDifferences: criticalDiffs,
    };
  }

  /**
   * Get comparison status from accuracy
   */
  private getComparisonStatus(
    accuracy: number
  ): 'identical' | 'similar' | 'different' | 'failed' {
    if (accuracy >= 0.99) return 'identical';
    if (accuracy >= 0.90) return 'similar';
    if (accuracy >= 0.50) return 'different';
    return 'failed';
  }

  /**
   * Get execution duration from real execution
   */
  private getExecutionDuration(execution: WorkflowExecution): number {
    if (!execution.endTime) return 0;
    return execution.endTime.getTime() - execution.startTime.getTime();
  }

  /**
   * Get real execution status
   */
  private getRealStatus(execution: WorkflowExecution): string {
    if (execution.error) return 'failed';
    if (execution.endTime) return 'success';
    return 'running';
  }

  /**
   * Compare multiple executions
   */
  async compareMultiple(
    twinId: string,
    virtualExecutions: SimulationResult[],
    realExecutions: WorkflowExecution[]
  ): Promise<ComparisonReport> {
    const comparisons: ComparisonResult[] = [];

    const minLength = Math.min(virtualExecutions.length, realExecutions.length);

    for (let i = 0; i < minLength; i++) {
      const comparison = await this.compare(
        twinId,
        virtualExecutions[i],
        realExecutions[i]
      );
      comparisons.push(comparison);
    }

    // Calculate summary
    const summary = {
      identical: comparisons.filter(c => c.status === 'identical').length,
      similar: comparisons.filter(c => c.status === 'similar').length,
      different: comparisons.filter(c => c.status === 'different').length,
      failed: comparisons.filter(c => c.status === 'failed').length,
    };

    const totalDifferences = comparisons.reduce(
      (sum, c) => sum + c.differences.length,
      0
    );

    const criticalDifferences = comparisons.reduce(
      (sum, c) => sum + c.metrics.criticalDifferences,
      0
    );

    const overallAccuracy =
      comparisons.reduce((sum, c) => sum + c.accuracy, 0) / comparisons.length;

    const recommendations = this.generateRecommendations(comparisons);

    const report: ComparisonReport = {
      id: generateUUID(),
      comparisons,
      overallAccuracy,
      totalDifferences,
      criticalDifferences,
      summary,
      recommendations,
      timestamp: new Date(),
    };

    this.reports.set(report.id, report);
    return report;
  }

  /**
   * Generate recommendations from comparisons
   */
  private generateRecommendations(comparisons: ComparisonResult[]): string[] {
    const recommendations = new Set<string>();

    const avgAccuracy =
      comparisons.reduce((sum, c) => sum + c.accuracy, 0) / comparisons.length;

    if (avgAccuracy < 0.90) {
      recommendations.add('Review and improve simulation accuracy');
    }

    const criticalDiffs = comparisons.reduce(
      (sum, c) => sum + c.metrics.criticalDifferences,
      0
    );

    if (criticalDiffs > 0) {
      recommendations.add('Address critical differences before production deployment');
    }

    const outputMismatches = comparisons.filter(
      c => c.metrics.outputMatch < 0.95
    ).length;

    if (outputMismatches > comparisons.length * 0.2) {
      recommendations.add('Improve output matching - over 20% of comparisons have mismatches');
    }

    const durationIssues = comparisons.filter(
      c => c.metrics.durationMatch < 0.80
    ).length;

    if (durationIssues > comparisons.length * 0.3) {
      recommendations.add('Review time compression settings - duration predictions are off');
    }

    return Array.from(recommendations);
  }

  /**
   * Get comparison
   */
  getComparison(comparisonId: string): ComparisonResult | undefined {
    return this.comparisons.get(comparisonId);
  }

  /**
   * Get all comparisons
   */
  getAllComparisons(): ComparisonResult[] {
    return Array.from(this.comparisons.values());
  }

  /**
   * Get report
   */
  getReport(reportId: string): ComparisonReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Get all reports
   */
  getAllReports(): ComparisonReport[] {
    return Array.from(this.reports.values());
  }

  /**
   * Get accuracy statistics
   */
  getAccuracyStatistics(): {
    avgAccuracy: number;
    minAccuracy: number;
    maxAccuracy: number;
    totalComparisons: number;
  } {
    const comparisons = Array.from(this.comparisons.values());

    if (comparisons.length === 0) {
      return {
        avgAccuracy: 0,
        minAccuracy: 0,
        maxAccuracy: 0,
        totalComparisons: 0,
      };
    }

    const accuracies = comparisons.map(c => c.accuracy);
    const avgAccuracy = accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length;
    const minAccuracy = Math.min(...accuracies);
    const maxAccuracy = Math.max(...accuracies);

    return {
      avgAccuracy,
      minAccuracy,
      maxAccuracy,
      totalComparisons: comparisons.length,
    };
  }
}

// Singleton instance
let instance: TwinComparison | null = null;

export function getTwinComparison(config?: Partial<ComparisonConfig>): TwinComparison {
  if (!instance) {
    instance = new TwinComparison(config);
  }
  return instance;
}
