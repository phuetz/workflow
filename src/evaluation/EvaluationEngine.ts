/**
 * AI Workflow Evaluation Engine
 * Core logic for evaluating AI workflows with customizable metrics
 */

import type {
  Evaluation,
  EvaluationInput,
  EvaluationResult,
  EvaluationContext,
  MetricResult,
  MetricConfig,
  EvaluationStatus,
} from '../types/evaluation';
import { MetricRegistry } from './MetricRegistry';

/**
 * EvaluationEngine - Core evaluation logic
 * Executes workflow evaluations with multiple metrics
 */
export class EvaluationEngine {
  private metricRegistry: MetricRegistry;
  private executionCallback?: (workflowId: string, input: Record<string, unknown>) => Promise<unknown>;
  private logger?: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
  };

  constructor(options?: {
    metricRegistry?: MetricRegistry;
    executionCallback?: (workflowId: string, input: Record<string, unknown>) => Promise<unknown>;
    logger?: unknown;
  }) {
    this.metricRegistry = options?.metricRegistry || new MetricRegistry();
    this.executionCallback = options?.executionCallback;
    this.logger = options?.logger as typeof this.logger;
  }

  /**
   * Set the workflow execution callback
   */
  setExecutionCallback(callback: (workflowId: string, input: Record<string, unknown>) => Promise<unknown>): void {
    this.executionCallback = callback;
  }

  /**
   * Evaluate a single input
   */
  async evaluateInput(
    evaluation: Evaluation,
    input: EvaluationInput,
    context?: Partial<EvaluationContext>
  ): Promise<EvaluationResult> {
    const startTime = new Date();
    const resultId = this.generateId();

    this.logger?.info('Starting evaluation for input', {
      evaluationId: evaluation.id,
      inputId: input.id,
      inputName: input.name,
    });

    let status: EvaluationStatus = 'running';
    let workflowOutput: unknown = null;
    let executionData: EvaluationResult['executionData'];
    const metricResults: MetricResult[] = [];

    try {
      // Execute workflow with input data
      const execStartTime = new Date();
      workflowOutput = await this.executeWorkflow(evaluation.workflowId, input.data);
      const execEndTime = new Date();

      executionData = {
        startTime: execStartTime,
        endTime: execEndTime,
        duration: execEndTime.getTime() - execStartTime.getTime(),
        nodeResults: context?.nodeResults,
      };

      // Build evaluation context
      const evaluationContext: EvaluationContext = {
        workflowId: evaluation.workflowId,
        executionId: context?.executionId,
        nodeResults: context?.nodeResults,
        startTime: execStartTime,
        services: context?.services,
      };

      // Execute all enabled metrics
      const metricPromises = evaluation.metrics
        .filter((metric) => metric.enabled)
        .map((metric) => this.executeMetric(metric, input, workflowOutput, evaluationContext));

      metricResults.push(...(await Promise.all(metricPromises)));

      // Calculate overall score (weighted average)
      const overallScore = this.calculateOverallScore(metricResults, evaluation.metrics);

      // Determine pass/fail
      const passed = this.determinePassFail(metricResults, evaluation.metrics);

      status = 'completed';
      const endTime = new Date();

      this.logger?.info('Evaluation completed', {
        evaluationId: evaluation.id,
        inputId: input.id,
        overallScore,
        passed,
        duration: endTime.getTime() - startTime.getTime(),
      });

      return {
        id: resultId,
        evaluationId: evaluation.id,
        inputId: input.id,
        inputName: input.name,
        status,
        overallScore,
        passed,
        metrics: metricResults,
        workflowOutput,
        executionData,
        timestamp: endTime,
      };
    } catch (error) {
      this.logger?.error('Evaluation failed', {
        evaluationId: evaluation.id,
        inputId: input.id,
        error: error instanceof Error ? error.message : String(error),
      });

      status = 'failed';
      const endTime = new Date();

      return {
        id: resultId,
        evaluationId: evaluation.id,
        inputId: input.id,
        inputName: input.name,
        status,
        overallScore: 0,
        passed: false,
        metrics: metricResults,
        workflowOutput,
        executionData: executionData || {
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          errors: [
            {
              nodeId: 'evaluation',
              message: error instanceof Error ? error.message : String(error),
            },
          ],
        },
        timestamp: endTime,
      };
    }
  }

  /**
   * Execute a single metric
   */
  private async executeMetric(
    metric: MetricConfig,
    input: EvaluationInput,
    output: unknown,
    context: EvaluationContext
  ): Promise<MetricResult> {
    const startTime = Date.now();

    try {
      const executor = this.metricRegistry.getExecutor(metric.type);
      if (!executor) {
        throw new Error(`No executor found for metric type: ${metric.type}`);
      }

      const result = await executor(input, output, metric, context);
      result.executionTime = Date.now() - startTime;

      return result;
    } catch (error) {
      this.logger?.error('Metric execution failed', {
        metricId: metric.id,
        metricType: metric.type,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        metricId: metric.id,
        metricType: metric.type,
        metricName: metric.name,
        score: 0,
        passed: false,
        threshold: metric.threshold,
        feedback: `Metric execution failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Calculate weighted overall score
   */
  private calculateOverallScore(results: MetricResult[], metrics: MetricConfig[]): number {
    if (results.length === 0) return 0;

    const metricMap = new Map(metrics.map((m) => [m.id, m]));
    let totalWeight = 0;
    let weightedSum = 0;

    for (const result of results) {
      const metric = metricMap.get(result.metricId);
      if (!metric) continue;

      const weight = metric.weight || 1;
      totalWeight += weight;
      weightedSum += result.score * weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Determine pass/fail based on metric results
   */
  private determinePassFail(results: MetricResult[], metrics: MetricConfig[]): boolean {
    // All metrics with thresholds must pass
    const metricsWithThresholds = metrics.filter((m) => m.threshold !== undefined);

    if (metricsWithThresholds.length === 0) {
      // No thresholds defined, consider passing if average score >= 0.7
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      return avgScore >= 0.7;
    }

    // Check if all threshold-based metrics passed
    return results.every((result) => result.passed);
  }

  /**
   * Execute workflow with input data
   */
  private async executeWorkflow(workflowId: string, input: Record<string, unknown>): Promise<unknown> {
    if (!this.executionCallback) {
      throw new Error('Execution callback not configured');
    }

    try {
      const output = await this.executionCallback(workflowId, input);
      return output;
    } catch (error) {
      this.logger?.error('Workflow execution failed', {
        workflowId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validate evaluation configuration
   */
  validateEvaluation(evaluation: Evaluation): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate basic fields
    if (!evaluation.id || evaluation.id.trim() === '') {
      errors.push('Evaluation ID is required');
    }

    if (!evaluation.name || evaluation.name.trim() === '') {
      errors.push('Evaluation name is required');
    }

    if (!evaluation.workflowId || evaluation.workflowId.trim() === '') {
      errors.push('Workflow ID is required');
    }

    // Validate metrics
    if (!evaluation.metrics || evaluation.metrics.length === 0) {
      errors.push('At least one metric is required');
    } else {
      for (const metric of evaluation.metrics) {
        const validator = this.metricRegistry.getValidator(metric.type);
        if (!validator) {
          errors.push(`Unknown metric type: ${metric.type}`);
        } else if (!validator(metric)) {
          errors.push(`Invalid configuration for metric: ${metric.name} (${metric.type})`);
        }
      }
    }

    // Validate inputs
    if (!evaluation.inputs || evaluation.inputs.length === 0) {
      errors.push('At least one test input is required');
    } else {
      for (const input of evaluation.inputs) {
        if (!input.id || input.id.trim() === '') {
          errors.push('Input ID is required');
        }
        if (!input.name || input.name.trim() === '') {
          errors.push('Input name is required');
        }
        if (!input.data || typeof input.data !== 'object') {
          errors.push(`Input data must be an object for input: ${input.name}`);
        }
      }
    }

    // Validate settings
    if (evaluation.settings) {
      if (evaluation.settings.parallel && evaluation.settings.maxParallel) {
        if (evaluation.settings.maxParallel < 1 || evaluation.settings.maxParallel > 100) {
          errors.push('maxParallel must be between 1 and 100');
        }
      }

      if (evaluation.settings.timeout && evaluation.settings.timeout < 1000) {
        errors.push('timeout must be at least 1000ms');
      }

      if (evaluation.settings.retryOnFailure && evaluation.settings.maxRetries) {
        if (evaluation.settings.maxRetries < 1 || evaluation.settings.maxRetries > 10) {
          errors.push('maxRetries must be between 1 and 10');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get metric registry
   */
  getMetricRegistry(): MetricRegistry {
    return this.metricRegistry;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `eval-result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default EvaluationEngine;
