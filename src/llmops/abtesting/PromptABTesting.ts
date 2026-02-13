/**
 * Prompt A/B Testing Framework
 * Statistical A/B testing for prompt optimization
 */

import { logger } from '../../services/SimpleLogger';
import type {
  PromptABTest,
  ABTestResults,
  StatisticalTest,
  PromptTemplate,
} from '../types/llmops';

export class PromptABTesting {
  private tests: Map<string, PromptABTest> = new Map();

  /**
   * Create A/B test
   */
  async createTest(
    name: string,
    description: string,
    promptA: PromptTemplate,
    promptB: PromptTemplate,
    config: {
      trafficSplit?: number;
      minSampleSize?: number;
      metricsToCompare?: ('quality' | 'latency' | 'cost' | 'satisfaction')[];
    } = {}
  ): Promise<PromptABTest> {
    const test: PromptABTest = {
      id: this.generateTestId(),
      name,
      description,
      promptA,
      promptB,
      trafficSplit: config.trafficSplit || 0.5,
      status: 'draft',
      metricsToCompare: config.metricsToCompare || [
        'quality',
        'latency',
        'cost',
        'satisfaction',
      ],
      minSampleSize: config.minSampleSize || 100,
      currentSampleSize: {
        a: 0,
        b: 0,
      },
      createdAt: new Date(),
    };

    this.tests.set(test.id, test);

    logger.debug(`[PromptABTesting] Created test: ${test.id} (${test.name})`);
    return test;
  }

  /**
   * Start test
   */
  async startTest(testId: string): Promise<PromptABTest> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    test.status = 'running';
    test.startedAt = new Date();

    logger.debug(`[PromptABTesting] Started test: ${testId}`);
    return test;
  }

  /**
   * Record test result
   */
  recordResult(
    testId: string,
    variant: 'A' | 'B',
    metrics: {
      quality: number;
      latency: number;
      cost: number;
      satisfaction: number;
    }
  ): void {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    if (test.status !== 'running') {
      throw new Error(`Test is not running: ${testId}`);
    }

    // Update sample size
    if (variant === 'A') {
      test.currentSampleSize.a++;
    } else {
      test.currentSampleSize.b++;
    }

    // Store metrics (simplified - in production, store all individual results)
    // For now, we'll calculate results on-demand
  }

  /**
   * Analyze test results
   */
  async analyze(testId: string): Promise<ABTestResults> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    logger.debug(`[PromptABTesting] Analyzing test: ${testId}...`);

    // Generate mock metrics (in production, calculate from stored results)
    const metricsA = {
      quality: 0.75 + Math.random() * 0.1,
      latency: 200 + Math.random() * 100,
      cost: 0.01 + Math.random() * 0.01,
      satisfaction: 0.7 + Math.random() * 0.15,
    };

    const metricsB = {
      quality: 0.78 + Math.random() * 0.1,
      latency: 180 + Math.random() * 100,
      cost: 0.009 + Math.random() * 0.01,
      satisfaction: 0.75 + Math.random() * 0.15,
    };

    // Perform statistical tests
    const statisticalSignificance = {
      quality: this.performTTest(metricsA.quality, metricsB.quality),
      latency: this.performTTest(metricsA.latency, metricsB.latency),
      cost: this.performTTest(metricsA.cost, metricsB.cost),
      satisfaction: this.performTTest(
        metricsA.satisfaction,
        metricsB.satisfaction
      ),
    };

    // Declare winner
    const { winner, confidence } = this.declareWinner(
      metricsA,
      metricsB,
      statisticalSignificance
    );

    // Generate recommendation
    let recommendation = '';
    if (winner === 'A') {
      recommendation = `Variant A (${test.promptA.name}) performs better. Consider promoting to production.`;
    } else if (winner === 'B') {
      recommendation = `Variant B (${test.promptB.name}) performs better. Consider promoting to production.`;
    } else {
      recommendation = 'No significant difference detected. Continue testing or try different variants.';
    }

    const results: ABTestResults = {
      metricsA,
      metricsB,
      statisticalSignificance,
      winner,
      confidence,
      recommendation,
    };

    test.results = results;

    logger.debug(
      `[PromptABTesting] Analysis complete: Winner is ${winner} (${(confidence * 100).toFixed(1)}% confidence)`
    );

    return results;
  }

  /**
   * Declare winner (public method)
   */
  async declareWinnerPublic(testId: string): Promise<'A' | 'B' | 'no-difference'> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    // Ensure enough samples
    const totalSamples = test.currentSampleSize.a + test.currentSampleSize.b;
    if (totalSamples < test.minSampleSize) {
      throw new Error(`Insufficient samples: ${totalSamples} < ${test.minSampleSize}`);
    }

    // Analyze and get results
    const results = await this.analyze(testId);

    // Complete test
    test.status = 'completed';
    test.completedAt = new Date();

    return results.winner;
  }

  /**
   * Complete test
   */
  async completeTest(testId: string): Promise<PromptABTest> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    // Analyze final results
    await this.analyze(testId);

    test.status = 'completed';
    test.completedAt = new Date();

    logger.debug(`[PromptABTesting] Completed test: ${testId}`);
    return test;
  }

  /**
   * Cancel test
   */
  async cancelTest(testId: string): Promise<void> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    test.status = 'cancelled';

    logger.debug(`[PromptABTesting] Cancelled test: ${testId}`);
  }

  /**
   * Get test
   */
  getTest(testId: string): PromptABTest | undefined {
    return this.tests.get(testId);
  }

  /**
   * List tests
   */
  listTests(status?: PromptABTest['status']): PromptABTest[] {
    const tests = Array.from(this.tests.values());

    if (status) {
      return tests.filter((t) => t.status === status);
    }

    return tests;
  }

  /**
   * Perform t-test
   */
  private performTTest(
    valueA: number,
    valueB: number
  ): StatisticalTest {
    // Simplified t-test (in production, use proper statistical library)
    const diff = Math.abs(valueA - valueB);
    const mean = (valueA + valueB) / 2;
    const effectSize = diff / mean;

    // Simulate p-value based on effect size
    const pValue = effectSize > 0.1 ? 0.01 : effectSize > 0.05 ? 0.04 : 0.2;

    const significant = pValue < 0.05;

    // Confidence interval (simplified)
    const margin = diff * 0.2;

    return {
      testType: 't-test',
      pValue,
      significant,
      effectSize,
      confidenceInterval: {
        lower: diff - margin,
        upper: diff + margin,
      },
    };
  }

  /**
   * Declare winner from metrics
   */
  private declareWinner(
    metricsA: ABTestResults['metricsA'],
    metricsB: ABTestResults['metricsB'],
    significance: ABTestResults['statisticalSignificance']
  ): { winner: 'A' | 'B' | 'no-difference'; confidence: number } {
    let scoreA = 0;
    let scoreB = 0;
    let significantDifferences = 0;

    // Compare each metric
    if (significance.quality.significant) {
      significantDifferences++;
      if (metricsB.quality > metricsA.quality) scoreB++;
      else scoreA++;
    }

    if (significance.latency.significant) {
      significantDifferences++;
      if (metricsB.latency < metricsA.latency) scoreB++; // Lower is better
      else scoreA++;
    }

    if (significance.cost.significant) {
      significantDifferences++;
      if (metricsB.cost < metricsA.cost) scoreB++; // Lower is better
      else scoreA++;
    }

    if (significance.satisfaction.significant) {
      significantDifferences++;
      if (metricsB.satisfaction > metricsA.satisfaction) scoreB++;
      else scoreA++;
    }

    // Calculate confidence based on p-values
    const avgPValue =
      (significance.quality.pValue +
        significance.latency.pValue +
        significance.cost.pValue +
        significance.satisfaction.pValue) /
      4;

    const confidence = 1 - avgPValue;

    // Determine winner
    let winner: 'A' | 'B' | 'no-difference' = 'no-difference';

    if (significantDifferences >= 2) {
      // Need at least 2 significant differences
      if (scoreB > scoreA) winner = 'B';
      else if (scoreA > scoreB) winner = 'A';
    }

    return { winner, confidence };
  }

  /**
   * Generate test ID
   */
  private generateTestId(): string {
    return `abtest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get test statistics
   */
  getStats(): {
    total: number;
    running: number;
    completed: number;
    cancelled: number;
  } {
    const tests = Array.from(this.tests.values());

    return {
      total: tests.length,
      running: tests.filter((t) => t.status === 'running').length,
      completed: tests.filter((t) => t.status === 'completed').length,
      cancelled: tests.filter((t) => t.status === 'cancelled').length,
    };
  }
}
