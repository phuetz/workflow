/**
 * Evaluation Runner
 * Execute evaluations with support for parallel execution, retries, and timeouts
 */

import type {
  Evaluation,
  EvaluationRun,
  EvaluationResult,
  EvaluationStatus,
  EvaluationContext,
  MetricType,
} from '../types/evaluation';
import { EvaluationEngine } from './EvaluationEngine';

/**
 * EvaluationRunner - Execute evaluations with advanced features
 */
export class EvaluationRunner {
  private engine: EvaluationEngine;
  private logger?: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
  };
  private onProgress?: (progress: { completed: number; total: number; current?: string }) => void;
  private onComplete?: (run: EvaluationRun) => void;

  constructor(
    engine: EvaluationEngine,
    options?: {
      logger?: unknown;
      onProgress?: (progress: { completed: number; total: number; current?: string }) => void;
      onComplete?: (run: EvaluationRun) => void;
    }
  ) {
    this.engine = engine;
    this.logger = options?.logger as typeof this.logger;
    this.onProgress = options?.onProgress;
    this.onComplete = options?.onComplete;
  }

  /**
   * Run an evaluation
   */
  async run(
    evaluation: Evaluation,
    options?: {
      context?: Partial<EvaluationContext>;
      triggeredBy?: 'manual' | 'schedule' | 'api' | 'webhook';
      triggeredByUser?: string;
    }
  ): Promise<EvaluationRun> {
    const runId = this.generateId();
    const startTime = new Date();

    this.logger?.info('Starting evaluation run', {
      runId,
      evaluationId: evaluation.id,
      evaluationName: evaluation.name,
      inputCount: evaluation.inputs.length,
    });

    // Validate evaluation
    const validation = this.engine.validateEvaluation(evaluation);
    if (!validation.valid) {
      this.logger?.error('Evaluation validation failed', {
        runId,
        errors: validation.errors,
      });

      throw new Error(`Evaluation validation failed: ${validation.errors.join(', ')}`);
    }

    const results: EvaluationResult[] = [];
    let status: EvaluationStatus = 'running';

    try {
      // Execute based on settings
      if (evaluation.settings?.parallel) {
        // Parallel execution
        const maxParallel = evaluation.settings.maxParallel || 5;
        results.push(...(await this.executeParallel(evaluation, maxParallel, options?.context)));
      } else {
        // Sequential execution
        results.push(...(await this.executeSequential(evaluation, options?.context)));
      }

      status = 'completed';
    } catch (error) {
      this.logger?.error('Evaluation run failed', {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
      status = 'failed';
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    // Calculate summary
    const summary = this.calculateSummary(results);

    const run: EvaluationRun = {
      id: runId,
      evaluationId: evaluation.id,
      evaluationName: evaluation.name,
      status,
      startTime,
      endTime,
      duration,
      results,
      summary,
      triggeredBy: options?.triggeredBy || 'manual',
      triggeredByUser: options?.triggeredByUser,
    };

    this.logger?.info('Evaluation run completed', {
      runId,
      status,
      duration,
      totalTests: summary.totalTests,
      passed: summary.passed,
      failed: summary.failed,
      averageScore: summary.averageScore,
    });

    // Notify completion
    if (this.onComplete) {
      this.onComplete(run);
    }

    return run;
  }

  /**
   * Execute inputs sequentially
   */
  private async executeSequential(
    evaluation: Evaluation,
    context?: Partial<EvaluationContext>
  ): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];
    const timeout = evaluation.settings?.timeout || 60000; // Default 60s
    const maxRetries = evaluation.settings?.retryOnFailure ? evaluation.settings.maxRetries || 3 : 0;

    for (let i = 0; i < evaluation.inputs.length; i++) {
      const input = evaluation.inputs[i];

      this.notifyProgress(i, evaluation.inputs.length, input.name);

      let result: EvaluationResult | null = null;
      let retries = 0;

      while (retries <= maxRetries) {
        try {
          result = await this.executeWithTimeout(
            () => this.engine.evaluateInput(evaluation, input, context),
            timeout
          );
          break; // Success, exit retry loop
        } catch (error) {
          retries++;
          if (retries > maxRetries) {
            this.logger?.error('Input evaluation failed after retries', {
              inputId: input.id,
              inputName: input.name,
              retries,
              error: error instanceof Error ? error.message : String(error),
            });

            // Create failed result
            result = {
              id: this.generateId(),
              evaluationId: evaluation.id,
              inputId: input.id,
              inputName: input.name,
              status: 'failed',
              overallScore: 0,
              passed: false,
              metrics: [],
              timestamp: new Date(),
              executionData: {
                startTime: new Date(),
                endTime: new Date(),
                duration: 0,
                errors: [
                  {
                    nodeId: 'evaluation',
                    message: error instanceof Error ? error.message : String(error),
                  },
                ],
              },
            };
          } else {
            this.logger?.warn('Retrying input evaluation', {
              inputId: input.id,
              inputName: input.name,
              retry: retries,
            });
            await this.sleep(1000 * retries); // Exponential backoff
          }
        }
      }

      if (result) {
        results.push(result);
      }
    }

    this.notifyProgress(evaluation.inputs.length, evaluation.inputs.length);

    return results;
  }

  /**
   * Execute inputs in parallel with concurrency limit
   */
  private async executeParallel(
    evaluation: Evaluation,
    maxParallel: number,
    context?: Partial<EvaluationContext>
  ): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];
    const timeout = evaluation.settings?.timeout || 60000;
    const inputs = [...evaluation.inputs];

    let completed = 0;

    // Process in batches
    while (inputs.length > 0) {
      const batch = inputs.splice(0, maxParallel);

      const batchPromises = batch.map(async (input) => {
        try {
          const result = await this.executeWithTimeout(
            () => this.engine.evaluateInput(evaluation, input, context),
            timeout
          );
          completed++;
          this.notifyProgress(completed, evaluation.inputs.length, input.name);
          return result;
        } catch (error) {
          this.logger?.error('Input evaluation failed', {
            inputId: input.id,
            inputName: input.name,
            error: error instanceof Error ? error.message : String(error),
          });

          completed++;
          this.notifyProgress(completed, evaluation.inputs.length);

          // Return failed result
          return {
            id: this.generateId(),
            evaluationId: evaluation.id,
            inputId: input.id,
            inputName: input.name,
            status: 'failed' as EvaluationStatus,
            overallScore: 0,
            passed: false,
            metrics: [],
            timestamp: new Date(),
            executionData: {
              startTime: new Date(),
              endTime: new Date(),
              duration: 0,
              errors: [
                {
                  nodeId: 'evaluation',
                  message: error instanceof Error ? error.message : String(error),
                },
              ],
            },
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Execution timeout after ${timeout}ms`)), timeout)
      ),
    ]);
  }

  /**
   * Calculate run summary
   */
  private calculateSummary(results: EvaluationResult[]): EvaluationRun['summary'] {
    const totalTests = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = totalTests - passed;

    // Calculate average score
    const averageScore =
      results.length > 0 ? results.reduce((sum, r) => sum + r.overallScore, 0) / results.length : 0;

    // Calculate per-metric statistics
    const metricStats: Record<string, { average: number; min: number; max: number }> = {};

    // Collect all unique metric types
    const metricTypes = new Set<MetricType>();
    for (const result of results) {
      for (const metric of result.metrics) {
        metricTypes.add(metric.metricType);
      }
    }

    // Calculate stats for each metric type
    for (const metricType of metricTypes) {
      const scores = results
        .flatMap((r) => r.metrics)
        .filter((m) => m.metricType === metricType)
        .map((m) => m.score);

      if (scores.length > 0) {
        metricStats[metricType] = {
          average: scores.reduce((sum, s) => sum + s, 0) / scores.length,
          min: Math.min(...scores),
          max: Math.max(...scores),
        };
      }
    }

    return {
      totalTests,
      passed,
      failed,
      averageScore,
      metrics: metricStats,
    };
  }

  /**
   * Notify progress
   */
  private notifyProgress(completed: number, total: number, current?: string): void {
    if (this.onProgress) {
      this.onProgress({ completed, total, current });
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `eval-run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default EvaluationRunner;
