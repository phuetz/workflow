/**
 * Test Suite
 * Group and run multiple evaluations together
 */

import type {
  TestSuite,
  TestSuiteRun,
  Evaluation,
  EvaluationRun,
  EvaluationStatus,
  EvaluationContext,
} from '../types/evaluation';
import { EvaluationRunner } from './EvaluationRunner';

/**
 * TestSuiteRunner - Execute test suites with multiple evaluations
 */
export class TestSuiteRunner {
  private runner: EvaluationRunner;
  private evaluations: Map<string, Evaluation>;
  private logger?: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
  };

  constructor(
    runner: EvaluationRunner,
    options?: {
      logger?: unknown;
    }
  ) {
    this.runner = runner;
    this.evaluations = new Map();
    this.logger = options?.logger as typeof this.logger;
  }

  /**
   * Register evaluations
   */
  registerEvaluations(evaluations: Evaluation[]): void {
    for (const evaluation of evaluations) {
      this.evaluations.set(evaluation.id, evaluation);
    }
  }

  /**
   * Run a test suite
   */
  async runSuite(
    suite: TestSuite,
    options?: {
      context?: Partial<EvaluationContext>;
      triggeredBy?: 'manual' | 'schedule' | 'api';
      triggeredByUser?: string;
    }
  ): Promise<TestSuiteRun> {
    const runId = this.generateId();
    const startTime = new Date();

    this.logger?.info('Starting test suite run', {
      runId,
      suiteId: suite.id,
      suiteName: suite.name,
      evaluationCount: suite.evaluations.length,
    });

    const evaluationRuns: EvaluationRun[] = [];
    let status: EvaluationStatus = 'running';

    try {
      // Get evaluations
      const evaluationsToRun = suite.evaluations
        .map((id) => this.evaluations.get(id))
        .filter((e): e is Evaluation => e !== undefined);

      if (evaluationsToRun.length === 0) {
        throw new Error('No evaluations found for test suite');
      }

      // Execute based on settings
      if (suite.settings?.runSequentially) {
        // Sequential execution
        for (const evaluation of evaluationsToRun) {
          try {
            const run = await this.runner.run(evaluation, {
              context: options?.context,
              triggeredBy: options?.triggeredBy,
              triggeredByUser: options?.triggeredByUser,
            });

            evaluationRuns.push(run);

            // Stop on failure if configured
            if (suite.settings.stopOnFailure && run.status === 'failed') {
              this.logger?.warn('Stopping suite execution due to evaluation failure', {
                runId,
                evaluationId: evaluation.id,
                evaluationName: evaluation.name,
              });
              break;
            }
          } catch (error) {
            this.logger?.error('Evaluation failed in suite', {
              runId,
              evaluationId: evaluation.id,
              evaluationName: evaluation.name,
              error: error instanceof Error ? error.message : String(error),
            });

            if (suite.settings.stopOnFailure) {
              break;
            }
          }
        }
      } else {
        // Parallel execution
        const promises = evaluationsToRun.map((evaluation) =>
          this.runner
            .run(evaluation, {
              context: options?.context,
              triggeredBy: options?.triggeredBy,
              triggeredByUser: options?.triggeredByUser,
            })
            .catch((error) => {
              this.logger?.error('Evaluation failed in suite', {
                runId,
                evaluationId: evaluation.id,
                evaluationName: evaluation.name,
                error: error instanceof Error ? error.message : String(error),
              });
              return null;
            })
        );

        const results = await Promise.all(promises);
        evaluationRuns.push(...results.filter((r): r is EvaluationRun => r !== null));
      }

      status = this.determineOverallStatus(evaluationRuns);
    } catch (error) {
      this.logger?.error('Test suite run failed', {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
      status = 'failed';
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    // Calculate summary
    const summary = this.calculateSuiteSummary(evaluationRuns);

    const suiteRun: TestSuiteRun = {
      id: runId,
      suiteId: suite.id,
      suiteName: suite.name,
      status,
      startTime,
      endTime,
      duration,
      evaluationRuns,
      summary,
      triggeredBy: options?.triggeredBy || 'manual',
      triggeredByUser: options?.triggeredByUser,
    };

    this.logger?.info('Test suite run completed', {
      runId,
      status,
      duration,
      totalEvaluations: summary.totalEvaluations,
      passed: summary.passed,
      failed: summary.failed,
      totalTests: summary.totalTests,
      testsPassed: summary.testsPassed,
      testsFailed: summary.testsFailed,
    });

    return suiteRun;
  }

  /**
   * Determine overall status from evaluation runs
   */
  private determineOverallStatus(runs: EvaluationRun[]): EvaluationStatus {
    if (runs.length === 0) return 'failed';

    const hasRunning = runs.some((r) => r.status === 'running');
    if (hasRunning) return 'running';

    const hasFailed = runs.some((r) => r.status === 'failed');
    if (hasFailed) return 'failed';

    const allCompleted = runs.every((r) => r.status === 'completed');
    if (allCompleted) return 'completed';

    return 'failed';
  }

  /**
   * Calculate suite summary
   */
  private calculateSuiteSummary(runs: EvaluationRun[]): TestSuiteRun['summary'] {
    const totalEvaluations = runs.length;
    const passed = runs.filter((r) => r.status === 'completed' && r.summary.failed === 0).length;
    const failed = totalEvaluations - passed;

    let totalTests = 0;
    let testsPassed = 0;
    let testsFailed = 0;

    for (const run of runs) {
      totalTests += run.summary.totalTests;
      testsPassed += run.summary.passed;
      testsFailed += run.summary.failed;
    }

    return {
      totalEvaluations,
      passed,
      failed,
      totalTests,
      testsPassed,
      testsFailed,
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `suite-run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * TestSuiteManager - Manage test suites
 */
export class TestSuiteManager {
  private suites: Map<string, TestSuite>;

  constructor() {
    this.suites = new Map();
  }

  /**
   * Create a new test suite
   */
  create(
    name: string,
    evaluationIds: string[],
    options?: {
      description?: string;
      runSequentially?: boolean;
      stopOnFailure?: boolean;
      timeout?: number;
    }
  ): TestSuite {
    const id = this.generateId();
    const now = new Date();

    const suite: TestSuite = {
      id,
      name,
      description: options?.description,
      evaluations: evaluationIds,
      settings: {
        runSequentially: options?.runSequentially || false,
        stopOnFailure: options?.stopOnFailure || false,
        timeout: options?.timeout,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.suites.set(id, suite);
    return suite;
  }

  /**
   * Get a test suite
   */
  get(id: string): TestSuite | undefined {
    return this.suites.get(id);
  }

  /**
   * Update a test suite
   */
  update(id: string, updates: Partial<Omit<TestSuite, 'id' | 'createdAt'>>): TestSuite | null {
    const suite = this.suites.get(id);
    if (!suite) return null;

    const updated: TestSuite = {
      ...suite,
      ...updates,
      id: suite.id, // Preserve ID
      createdAt: suite.createdAt, // Preserve creation date
      updatedAt: new Date(),
    };

    this.suites.set(id, updated);
    return updated;
  }

  /**
   * Delete a test suite
   */
  delete(id: string): boolean {
    return this.suites.delete(id);
  }

  /**
   * Get all test suites
   */
  getAll(): TestSuite[] {
    return Array.from(this.suites.values());
  }

  /**
   * Add evaluation to suite
   */
  addEvaluation(suiteId: string, evaluationId: string): boolean {
    const suite = this.suites.get(suiteId);
    if (!suite) return false;

    if (!suite.evaluations.includes(evaluationId)) {
      suite.evaluations.push(evaluationId);
      suite.updatedAt = new Date();
    }

    return true;
  }

  /**
   * Remove evaluation from suite
   */
  removeEvaluation(suiteId: string, evaluationId: string): boolean {
    const suite = this.suites.get(suiteId);
    if (!suite) return false;

    const index = suite.evaluations.indexOf(evaluationId);
    if (index !== -1) {
      suite.evaluations.splice(index, 1);
      suite.updatedAt = new Date();
      return true;
    }

    return false;
  }

  /**
   * Clear all suites
   */
  clear(): void {
    this.suites.clear();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `suite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default TestSuiteRunner;
