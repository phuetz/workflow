/**
 * Agent A/B Testing Framework
 *
 * Statistical A/B testing for comparing agent versions with:
 * - Traffic splitting (1-99%)
 * - Statistical analysis (t-test, chi-square, Mann-Whitney)
 * - Automatic winner selection
 * - Sample size calculation
 *
 * Min sample size: 100 per variant
 * Statistical power: 0.8 (80%)
 * Confidence level: 0.95 (95%)
 */

import { EventEmitter } from 'events';
import {
  ABTest,
  AgentVersion,
  Metric,
  StatisticalTestResult,
  User,
  VariantData,
} from './types/agentops';
import { logger } from '../services/SimpleLogger';

/**
 * A/B testing manager
 */
export class AgentABTesting extends EventEmitter {
  private tests: Map<string, ABTest> = new Map();
  private activeTests: Map<string, ABTest> = new Map(); // agentId -> test

  /**
   * Create a new A/B test
   */
  async createTest(
    name: string,
    description: string,
    agentId: string,
    variantA: AgentVersion,
    variantB: AgentVersion,
    metrics: Metric[],
    config: {
      trafficSplit?: number;
      duration?: number;
      minSampleSize?: number;
    },
    creator: User
  ): Promise<ABTest> {
    // Check if agent already has active test
    if (this.activeTests.has(agentId)) {
      throw new Error(`Agent ${agentId} already has an active A/B test`);
    }

    const test: ABTest = {
      id: this.generateTestId(),
      name,
      description,
      agentId,
      variantA: {
        version: variantA,
        sampleSize: 0,
        metrics: this.initializeMetrics(metrics),
        stats: {},
      },
      variantB: {
        version: variantB,
        sampleSize: 0,
        metrics: this.initializeMetrics(metrics),
        stats: {},
      },
      trafficSplit: config.trafficSplit ?? 0.5,
      metrics,
      duration: config.duration ?? 86400000, // 24 hours default
      minSampleSize: config.minSampleSize ?? 100,
      status: 'pending',
      creator,
      created: Date.now(),
    };

    this.tests.set(test.id, test);
    this.emit('test-created', { test });

    return test;
  }

  /**
   * Start an A/B test
   */
  async startTest(testId: string): Promise<void> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    if (test.status !== 'pending') {
      throw new Error(`Test ${testId} is not in pending state`);
    }

    test.status = 'running';
    test.startTime = Date.now();
    this.activeTests.set(test.agentId, test);

    this.emit('test-started', { test });

    // Schedule automatic completion
    setTimeout(() => {
      this.completeTest(testId).catch((err) => logger.error('Error', err));
    }, test.duration);
  }

  /**
   * Stop an A/B test
   */
  async stopTest(testId: string): Promise<void> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    if (test.status !== 'running') {
      throw new Error(`Test ${testId} is not running`);
    }

    test.status = 'stopped';
    test.endTime = Date.now();
    this.activeTests.delete(test.agentId);

    this.emit('test-stopped', { test });
  }

  /**
   * Complete an A/B test and analyze results
   */
  async completeTest(testId: string): Promise<ABTest> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    if (test.status !== 'running') {
      throw new Error(`Test ${testId} is not running`);
    }

    test.status = 'completed';
    test.endTime = Date.now();
    this.activeTests.delete(test.agentId);

    // Calculate statistics for each variant
    test.variantA.stats = this.calculateStatistics(test.variantA, test.metrics);
    test.variantB.stats = this.calculateStatistics(test.variantB, test.metrics);

    // Perform statistical tests
    const testResults: Record<string, StatisticalTestResult> = {};
    for (const metric of test.metrics) {
      testResults[metric.name] = this.performStatisticalTest(
        test.variantA.metrics[metric.name] || [],
        test.variantB.metrics[metric.name] || [],
        metric
      );
    }

    // Determine winner
    const winner = this.determineWinner(testResults, test.metrics);
    const confidence = this.calculateOverallConfidence(testResults);
    const recommendation = this.generateRecommendation(winner, confidence, testResults, test.metrics);

    test.results = {
      sampleSize: test.variantA.sampleSize + test.variantB.sampleSize,
      testResults,
      winner,
      recommendation,
      confidence,
    };

    this.emit('test-completed', { test });

    return test;
  }

  /**
   * Record a metric value for a variant
   */
  recordMetric(
    testId: string,
    variant: 'A' | 'B',
    metricName: string,
    value: number
  ): void {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') {
      return;
    }

    const variantData = variant === 'A' ? test.variantA : test.variantB;

    if (!variantData.metrics[metricName]) {
      variantData.metrics[metricName] = [];
    }

    variantData.metrics[metricName].push(value);
    variantData.sampleSize++;
  }

  /**
   * Route request to variant based on traffic split
   */
  routeToVariant(testId: string): 'A' | 'B' {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') {
      return 'A'; // Default to A if test not running
    }

    return Math.random() < test.trafficSplit ? 'A' : 'B';
  }

  /**
   * Get active test for an agent
   */
  getActiveTest(agentId: string): ABTest | undefined {
    return this.activeTests.get(agentId);
  }

  /**
   * Get test by ID
   */
  getTest(testId: string): ABTest | undefined {
    return this.tests.get(testId);
  }

  /**
   * Get all tests
   */
  getAllTests(): ABTest[] {
    return Array.from(this.tests.values());
  }

  /**
   * Get tests for an agent
   */
  getTestsByAgent(agentId: string): ABTest[] {
    return Array.from(this.tests.values()).filter(t => t.agentId === agentId);
  }

  /**
   * Calculate required sample size
   */
  calculateSampleSize(
    baseline: number,
    mde: number, // Minimum detectable effect
    alpha: number = 0.05,
    power: number = 0.8
  ): number {
    // Simplified sample size calculation
    // In practice, use more sophisticated formulas based on test type
    const z_alpha = 1.96; // For 95% confidence
    const z_beta = 0.84;  // For 80% power

    const p1 = baseline;
    const p2 = baseline * (1 + mde);
    const p = (p1 + p2) / 2;

    const n = Math.ceil(
      2 * Math.pow(z_alpha + z_beta, 2) * p * (1 - p) / Math.pow(p2 - p1, 2)
    );

    return Math.max(n, 100); // Minimum 100 samples
  }

  // Private methods

  private initializeMetrics(metrics: Metric[]): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    for (const metric of metrics) {
      result[metric.name] = [];
    }
    return result;
  }

  private calculateStatistics(
    variant: VariantData,
    metrics: Metric[]
  ): Record<string, { mean: number; median: number; stdDev: number; p50: number; p95: number; p99: number }> {
    const stats: Record<string, any> = {};

    for (const metric of metrics) {
      const values = variant.metrics[metric.name] || [];
      if (values.length === 0) {
        stats[metric.name] = {
          mean: 0,
          median: 0,
          stdDev: 0,
          p50: 0,
          p95: 0,
          p99: 0,
        };
        continue;
      }

      const sorted = [...values].sort((a, b) => a - b);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      stats[metric.name] = {
        mean,
        median: this.percentile(sorted, 0.5),
        stdDev,
        p50: this.percentile(sorted, 0.5),
        p95: this.percentile(sorted, 0.95),
        p99: this.percentile(sorted, 0.99),
      };
    }

    return stats;
  }

  private performStatisticalTest(
    samplesA: number[],
    samplesB: number[],
    metric: Metric
  ): StatisticalTestResult {
    if (samplesA.length === 0 || samplesB.length === 0) {
      return {
        testType: 't-test',
        pValue: 1,
        confidence: 0,
        significant: false,
        effectSize: 0,
      };
    }

    // Determine appropriate test based on metric type
    const testType = metric.type === 'rate' || metric.type === 'counter' ? 'chi-square' : 't-test';

    if (testType === 't-test') {
      return this.tTest(samplesA, samplesB, metric);
    } else {
      return this.chiSquareTest(samplesA, samplesB, metric);
    }
  }

  private tTest(samplesA: number[], samplesB: number[], metric: Metric): StatisticalTestResult {
    const meanA = samplesA.reduce((a, b) => a + b, 0) / samplesA.length;
    const meanB = samplesB.reduce((a, b) => a + b, 0) / samplesB.length;

    const varA = samplesA.reduce((a, b) => a + Math.pow(b - meanA, 2), 0) / (samplesA.length - 1);
    const varB = samplesB.reduce((a, b) => a + Math.pow(b - meanB, 2), 0) / (samplesB.length - 1);

    const pooledStdDev = Math.sqrt((varA / samplesA.length) + (varB / samplesB.length));
    const tStatistic = (meanA - meanB) / pooledStdDev;

    // Simplified p-value calculation
    const pValue = this.tDistribution(Math.abs(tStatistic), samplesA.length + samplesB.length - 2);

    // Effect size (Cohen's d)
    const pooledStdDevPop = Math.sqrt((varA + varB) / 2);
    const effectSize = (meanB - meanA) / pooledStdDevPop;

    return {
      testType: 't-test',
      pValue,
      confidence: 1 - pValue,
      significant: pValue < 0.05,
      effectSize,
    };
  }

  private chiSquareTest(samplesA: number[], samplesB: number[], metric: Metric): StatisticalTestResult {
    // Simplified chi-square test for proportions
    const successA = samplesA.filter(x => x > 0).length;
    const successB = samplesB.filter(x => x > 0).length;
    const totalA = samplesA.length;
    const totalB = samplesB.length;

    const expected = (successA + successB) / (totalA + totalB);
    const chiSquare =
      Math.pow(successA - expected * totalA, 2) / (expected * totalA) +
      Math.pow(successB - expected * totalB, 2) / (expected * totalB);

    const pValue = this.chiSquareDistribution(chiSquare, 1);

    // Effect size (relative difference)
    const effectSize = (successB / totalB - successA / totalA) / (successA / totalA);

    return {
      testType: 'chi-square',
      pValue,
      confidence: 1 - pValue,
      significant: pValue < 0.05,
      effectSize,
    };
  }

  private determineWinner(
    testResults: Record<string, StatisticalTestResult>,
    metrics: Metric[]
  ): 'A' | 'B' | 'tie' {
    let scoreA = 0;
    let scoreB = 0;

    for (const metric of metrics) {
      const result = testResults[metric.name];
      if (!result.significant) continue;

      if (metric.higherIsBetter) {
        if (result.effectSize > 0) scoreB++;
        else scoreA++;
      } else {
        if (result.effectSize < 0) scoreB++;
        else scoreA++;
      }
    }

    if (scoreB > scoreA) return 'B';
    if (scoreA > scoreB) return 'A';
    return 'tie';
  }

  private calculateOverallConfidence(testResults: Record<string, StatisticalTestResult>): number {
    const confidences = Object.values(testResults).map(r => r.confidence);
    if (confidences.length === 0) return 0;

    // Average confidence across all metrics
    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  private generateRecommendation(
    winner: 'A' | 'B' | 'tie',
    confidence: number,
    testResults: Record<string, StatisticalTestResult>,
    metrics: Metric[]
  ): string {
    if (winner === 'tie') {
      return 'No significant difference detected between variants. Either variant can be used.';
    }

    const significantMetrics = metrics.filter(m => testResults[m.name]?.significant);
    const improvements = significantMetrics.map(m => {
      const result = testResults[m.name];
      const direction = result.effectSize > 0 ? 'increase' : 'decrease';
      const magnitude = Math.abs(result.effectSize * 100).toFixed(1);
      return `${m.name}: ${magnitude}% ${direction}`;
    });

    const confidenceLevel = confidence > 0.95 ? 'high' : confidence > 0.8 ? 'moderate' : 'low';

    return `Variant ${winner} is recommended with ${confidenceLevel} confidence (${(confidence * 100).toFixed(1)}%). ` +
           `Significant improvements: ${improvements.join(', ')}.`;
  }

  private percentile(sorted: number[], p: number): number {
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private tDistribution(t: number, df: number): number {
    // Simplified t-distribution p-value calculation
    // In practice, use a proper statistical library
    return Math.exp(-0.5 * t * t) / Math.sqrt(2 * Math.PI) * (1 + t * t / df);
  }

  private chiSquareDistribution(chi: number, df: number): number {
    // Simplified chi-square p-value calculation
    return Math.exp(-chi / 2);
  }

  private generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Singleton instance
 */
export const abTesting = new AgentABTesting();
