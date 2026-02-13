import { logger } from '../services/SimpleLogger';
/**
 * A/B Performance Testing Framework
 *
 * Compare performance between different workflow versions:
 * - Run A/B tests with statistical significance
 * - Traffic splitting
 * - Performance comparison
 * - Automated winner selection
 * - Gradual rollout
 *
 * Usage:
 * const tester = ABPerformanceTester.getInstance();
 * const test = await tester.createTest('Workflow Optimization', 'wf-v1', 'wf-v2');
 * await tester.startTest(test.id);
 */

export interface ABTest {
  id: string;
  name: string;
  description: string;
  variantA: TestVariant;
  variantB: TestVariant;
  config: ABTestConfig;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  results?: ABTestResults;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface TestVariant {
  id: string;
  name: string;
  version: string;
  description: string;
  config: any; // Workflow configuration
}

export interface ABTestConfig {
  trafficSplit: number; // 0-1, percentage to variant B
  minSampleSize: number;
  maxDuration: number; // milliseconds
  targetMetrics: string[];
  successCriteria: SuccessCriteria;
  autoPromote: boolean; // Automatically promote winner
}

export interface SuccessCriteria {
  minImprovement: number; // percentage
  minConfidence: number; // 0-1 (e.g., 0.95 for 95%)
  primaryMetric: string; // Which metric to optimize for
}

export interface ABTestResults {
  variantA: VariantResults;
  variantB: VariantResults;
  comparison: ComparisonResults;
  winner?: 'A' | 'B' | 'tie';
  confidence: number;
  recommendation: string;
}

export interface VariantResults {
  sampleSize: number;
  metrics: Record<string, MetricStats>;
  errors: number;
  errorRate: number;
}

export interface MetricStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
}

export interface ComparisonResults {
  metric: string;
  improvement: number; // percentage
  significant: boolean;
  confidence: number;
  pValue: number;
}

export interface TestExecution {
  testId: string;
  variant: 'A' | 'B';
  timestamp: number;
  metrics: Record<string, number>;
  success: boolean;
  error?: string;
}

export class ABPerformanceTester {
  private static instance: ABPerformanceTester;
  private tests: Map<string, ABTest> = new Map();
  private executions: Map<string, TestExecution[]> = new Map();
  private readonly MAX_EXECUTIONS_PER_TEST = 10000;

  private constructor() {
    this.loadTests();
  }

  public static getInstance(): ABPerformanceTester {
    if (!ABPerformanceTester.instance) {
      ABPerformanceTester.instance = new ABPerformanceTester();
    }
    return ABPerformanceTester.instance;
  }

  /**
   * Create new A/B test
   */
  public createTest(
    name: string,
    variantA: Omit<TestVariant, 'id'>,
    variantB: Omit<TestVariant, 'id'>,
    config: Partial<ABTestConfig> = {}
  ): ABTest {
    const id = this.generateTestId();

    const test: ABTest = {
      id,
      name,
      description: `A/B test comparing ${variantA.name} vs ${variantB.name}`,
      variantA: { ...variantA, id: `${id}-A` },
      variantB: { ...variantB, id: `${id}-B` },
      config: {
        trafficSplit: config.trafficSplit || 0.5,
        minSampleSize: config.minSampleSize || 100,
        maxDuration: config.maxDuration || 7 * 24 * 60 * 60 * 1000, // 7 days
        targetMetrics: config.targetMetrics || ['execution_time', 'memory_usage', 'cost'],
        successCriteria: config.successCriteria || {
          minImprovement: 10,
          minConfidence: 0.95,
          primaryMetric: 'execution_time',
        },
        autoPromote: config.autoPromote ?? false,
      },
      status: 'draft',
      createdAt: Date.now(),
    };

    this.tests.set(id, test);
    this.executions.set(id, []);
    this.saveTests();

    return test;
  }

  /**
   * Generate test ID
   */
  private generateTestId(): string {
    return `abtest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start A/B test
   */
  public async startTest(testId: string): Promise<boolean> {
    const test = this.tests.get(testId);
    if (!test) return false;

    if (test.status !== 'draft' && test.status !== 'paused') {
      return false;
    }

    test.status = 'running';
    test.startedAt = Date.now();
    this.tests.set(testId, test);
    this.saveTests();

    return true;
  }

  /**
   * Pause A/B test
   */
  public pauseTest(testId: string): boolean {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return false;

    test.status = 'paused';
    this.tests.set(testId, test);
    this.saveTests();

    return true;
  }

  /**
   * Complete A/B test
   */
  public async completeTest(testId: string): Promise<ABTestResults | null> {
    const test = this.tests.get(testId);
    if (!test) return null;

    // Calculate results
    const results = this.calculateResults(testId);

    test.status = 'completed';
    test.completedAt = Date.now();
    test.results = results;
    this.tests.set(testId, test);
    this.saveTests();

    // Auto-promote winner if configured
    if (test.config.autoPromote && results.winner && results.winner !== 'tie') {
      await this.promoteWinner(testId);
    }

    return results;
  }

  /**
   * Cancel A/B test
   */
  public cancelTest(testId: string): boolean {
    const test = this.tests.get(testId);
    if (!test) return false;

    test.status = 'cancelled';
    this.tests.set(testId, test);
    this.saveTests();

    return true;
  }

  /**
   * Record test execution
   */
  public recordExecution(
    testId: string,
    variant: 'A' | 'B',
    metrics: Record<string, number>,
    success: boolean,
    error?: string
  ): void {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return;

    const execution: TestExecution = {
      testId,
      variant,
      timestamp: Date.now(),
      metrics,
      success,
      error,
    };

    const executions = this.executions.get(testId) || [];
    executions.push(execution);

    // Keep only recent executions
    if (executions.length > this.MAX_EXECUTIONS_PER_TEST) {
      this.executions.set(testId, executions.slice(-this.MAX_EXECUTIONS_PER_TEST));
    } else {
      this.executions.set(testId, executions);
    }

    // Check if test should complete
    this.checkTestCompletion(testId);
  }

  /**
   * Select variant for request (traffic splitting)
   */
  public selectVariant(testId: string): 'A' | 'B' | null {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return null;

    // Use traffic split to determine variant
    return Math.random() < test.config.trafficSplit ? 'B' : 'A';
  }

  /**
   * Check if test should complete
   */
  private checkTestCompletion(testId: string): void {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return;

    const executions = this.executions.get(testId) || [];
    const variantACount = executions.filter(e => e.variant === 'A').length;
    const variantBCount = executions.filter(e => e.variant === 'B').length;

    // Check minimum sample size
    const minSampleSize = test.config.minSampleSize;
    if (variantACount >= minSampleSize && variantBCount >= minSampleSize) {
      // Check for statistical significance
      const results = this.calculateResults(testId);

      if (results.comparison.significant &&
          results.confidence >= test.config.successCriteria.minConfidence) {
        // Test is complete
        this.completeTest(testId);
        return;
      }
    }

    // Check max duration
    if (test.startedAt) {
      const elapsed = Date.now() - test.startedAt;
      if (elapsed >= test.config.maxDuration) {
        this.completeTest(testId);
      }
    }
  }

  /**
   * Calculate A/B test results
   */
  private calculateResults(testId: string): ABTestResults {
    const test = this.tests.get(testId)!;
    const executions = this.executions.get(testId) || [];

    const variantAExecutions = executions.filter(e => e.variant === 'A' && e.success);
    const variantBExecutions = executions.filter(e => e.variant === 'B' && e.success);

    // Calculate variant results
    const variantAResults = this.calculateVariantResults(variantAExecutions);
    const variantBResults = this.calculateVariantResults(variantBExecutions);

    // Calculate comparison for primary metric
    const primaryMetric = test.config.successCriteria.primaryMetric;
    const comparison = this.compareVariants(
      variantAResults.metrics[primaryMetric],
      variantBResults.metrics[primaryMetric],
      variantAExecutions.length,
      variantBExecutions.length
    );

    // Determine winner
    let winner: 'A' | 'B' | 'tie' = 'tie';
    if (comparison.significant) {
      if (comparison.improvement > test.config.successCriteria.minImprovement) {
        winner = 'B';
      } else if (comparison.improvement < -test.config.successCriteria.minImprovement) {
        winner = 'A';
      }
    }

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      winner,
      comparison,
      test.config.successCriteria
    );

    return {
      variantA: variantAResults,
      variantB: variantBResults,
      comparison,
      winner,
      confidence: comparison.confidence,
      recommendation,
    };
  }

  /**
   * Calculate results for a variant
   */
  private calculateVariantResults(executions: TestExecution[]): VariantResults {
    const metrics: Record<string, MetricStats> = {};

    if (executions.length === 0) {
      return {
        sampleSize: 0,
        metrics: {},
        errors: 0,
        errorRate: 0,
      };
    }

    // Get all metric names
    const metricNames = new Set<string>();
    executions.forEach(e => {
      Object.keys(e.metrics).forEach(name => metricNames.add(name));
    });

    // Calculate stats for each metric
    metricNames.forEach(metricName => {
      const values = executions
        .map(e => e.metrics[metricName])
        .filter(v => v !== undefined)
        .sort((a, b) => a - b);

      if (values.length === 0) return;

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      const medianIndex = Math.floor(values.length * 0.5);
      const p95Index = Math.floor(values.length * 0.95);
      const p99Index = Math.floor(values.length * 0.99);

      metrics[metricName] = {
        mean,
        median: values[medianIndex],
        stdDev,
        min: values[0],
        max: values[values.length - 1],
        p95: values[p95Index],
        p99: values[p99Index],
      };
    });

    return {
      sampleSize: executions.length,
      metrics,
      errors: 0,
      errorRate: 0,
    };
  }

  /**
   * Compare two variants using t-test
   */
  private compareVariants(
    statsA: MetricStats,
    statsB: MetricStats,
    nA: number,
    nB: number
  ): ComparisonResults {
    if (!statsA || !statsB || nA === 0 || nB === 0) {
      return {
        metric: 'unknown',
        improvement: 0,
        significant: false,
        confidence: 0,
        pValue: 1,
      };
    }

    // Calculate improvement (negative means A is better for performance metrics)
    const improvement = ((statsA.mean - statsB.mean) / statsA.mean) * 100;

    // Two-sample t-test
    const pooledStdDev = Math.sqrt(
      ((nA - 1) * statsA.stdDev * statsA.stdDev +
       (nB - 1) * statsB.stdDev * statsB.stdDev) /
      (nA + nB - 2)
    );

    const tStatistic = Math.abs(statsA.mean - statsB.mean) /
      (pooledStdDev * Math.sqrt(1 / nA + 1 / nB));

    // Degrees of freedom
    const df = nA + nB - 2;

    // Approximate p-value (simplified)
    // In practice, use a proper t-distribution table
    const pValue = this.approximatePValue(tStatistic, df);

    // Statistical significance at 95% confidence
    const significant = pValue < 0.05;
    const confidence = 1 - pValue;

    return {
      metric: 'performance',
      improvement,
      significant,
      confidence,
      pValue,
    };
  }

  /**
   * Approximate p-value for t-test
   */
  private approximatePValue(tStatistic: number, df: number): number {
    // Simplified approximation
    // For large df, t-distribution ≈ normal distribution
    if (df > 30) {
      // Using standard normal approximation
      const z = tStatistic;
      return 2 * (1 - this.normalCDF(Math.abs(z)));
    }

    // For smaller df, use conservative estimate
    return tStatistic > 2 ? 0.05 : 0.1;
  }

  /**
   * Normal cumulative distribution function
   */
  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - probability : probability;
  }

  /**
   * Generate recommendation
   */
  private generateRecommendation(
    winner: 'A' | 'B' | 'tie',
    comparison: ComparisonResults,
    criteria: SuccessCriteria
  ): string {
    if (winner === 'tie') {
      if (!comparison.significant) {
        return 'No significant performance difference detected. Either variant can be used.';
      }
      return 'Performance difference is below the minimum threshold. Continue with current version.';
    }

    const improvedVariant = winner === 'B' ? 'new' : 'current';
    const improvement = Math.abs(comparison.improvement).toFixed(1);

    return `The ${improvedVariant} variant shows a ${improvement}% improvement with ${(comparison.confidence * 100).toFixed(1)}% confidence. Recommended to proceed with variant ${winner}.`;
  }

  /**
   * Promote winning variant
   */
  private async promoteWinner(testId: string): Promise<void> {
    const test = this.tests.get(testId);
    if (!test || !test.results || !test.results.winner) return;

    logger.debug(`Promoting variant ${test.results.winner} for test ${test.name}`);

    // In practice, this would:
    // 1. Update production configuration
    // 2. Gradually roll out to all traffic
    // 3. Send notifications
  }

  /**
   * Get test by ID
   */
  public getTest(testId: string): ABTest | undefined {
    return this.tests.get(testId);
  }

  /**
   * Get all tests
   */
  public getAllTests(): ABTest[] {
    return Array.from(this.tests.values())
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get running tests
   */
  public getRunningTests(): ABTest[] {
    return Array.from(this.tests.values())
      .filter(t => t.status === 'running')
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get test executions
   */
  public getExecutions(testId: string): TestExecution[] {
    return this.executions.get(testId) || [];
  }

  /**
   * Save tests to storage
   */
  private saveTests(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const tests = Array.from(this.tests.values());
        localStorage.setItem('abTests', JSON.stringify(tests.slice(-50)));
      } catch (error) {
        logger.warn('Failed to save A/B tests:', error);
      }
    }
  }

  /**
   * Load tests from storage
   */
  private loadTests(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('abTests');
        if (saved) {
          const tests: ABTest[] = JSON.parse(saved);
          tests.forEach(test => this.tests.set(test.id, test));
        }
      } catch (error) {
        logger.warn('Failed to load A/B tests:', error);
      }
    }
  }

  /**
   * Clear all tests
   */
  public clearAll(): void {
    this.tests.clear();
    this.executions.clear();
    this.saveTests();
  }
}

// Export singleton instance
export const abPerformanceTester = ABPerformanceTester.getInstance();
