/**
 * Prompt Testing Framework
 * Test prompts with test cases, A/B testing, and quality scoring
 */

import { logger } from '../../services/SimpleLogger';
import type {
  PromptTemplate,
  PromptTestCase,
  PromptTestResult,
  QualityScore,
} from '../types/llmops';

export interface TestSuite {
  id: string;
  name: string;
  promptId: string;
  testCases: PromptTestCase[];
  createdAt: Date;
}

export interface TestRun {
  id: string;
  suiteId: string;
  promptVersion: string;
  results: PromptTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    avgQuality: number;
    avgLatency: number;
    totalCost: number;
  };
  startedAt: Date;
  completedAt?: Date;
}

export class PromptTesting {
  private testSuites: Map<string, TestSuite> = new Map();
  private testRuns: Map<string, TestRun> = new Map();

  /**
   * Create test suite
   */
  async createTestSuite(
    name: string,
    promptId: string,
    testCases: PromptTestCase[]
  ): Promise<TestSuite> {
    const suite: TestSuite = {
      id: this.generateId('suite'),
      name,
      promptId,
      testCases,
      createdAt: new Date(),
    };

    this.testSuites.set(suite.id, suite);

    logger.debug(`[PromptTesting] Created test suite: ${suite.id} with ${testCases.length} cases`);
    return suite;
  }

  /**
   * Run test suite
   */
  async runTests(
    suiteId: string,
    prompt: PromptTemplate
  ): Promise<TestRun> {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite not found: ${suiteId}`);
    }

    logger.debug(`[PromptTesting] Running ${suite.testCases.length} tests...`);

    const run: TestRun = {
      id: this.generateId('run'),
      suiteId,
      promptVersion: prompt.version,
      results: [],
      summary: {
        total: suite.testCases.length,
        passed: 0,
        failed: 0,
        avgQuality: 0,
        avgLatency: 0,
        totalCost: 0,
      },
      startedAt: new Date(),
    };

    // Run each test case
    for (const testCase of suite.testCases) {
      const result = await this.runTestCase(testCase, prompt);
      run.results.push(result);

      if (result.passed) {
        run.summary.passed++;
      } else {
        run.summary.failed++;
      }

      run.summary.avgLatency += result.latency;
      run.summary.totalCost += result.cost;
    }

    // Calculate averages
    run.summary.avgLatency /= suite.testCases.length;
    run.summary.avgQuality =
      run.results.reduce((sum, r) => sum + r.qualityScore, 0) /
      run.results.length;

    run.completedAt = new Date();

    this.testRuns.set(run.id, run);

    logger.debug(
      `[PromptTesting] Test run complete: ${run.summary.passed}/${run.summary.total} passed`
    );

    return run;
  }

  /**
   * Run single test case
   */
  private async runTestCase(
    testCase: PromptTestCase,
    prompt: PromptTemplate
  ): Promise<PromptTestResult> {
    const startTime = Date.now();

    // Render prompt with variables
    const renderedPrompt = this.renderPrompt(prompt.template, testCase.variables);

    // Simulate LLM call (in production, call actual model)
    const output = await this.callModel(renderedPrompt, prompt.modelConfig.model);

    const latency = Date.now() - startTime;

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(output, testCase);

    // Check if passed
    let passed = true;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check expected output
    if (testCase.expectedOutput && output !== testCase.expectedOutput) {
      const similarity = this.calculateSimilarity(output, testCase.expectedOutput);
      if (similarity < 0.8) {
        errors.push(`Output mismatch (similarity: ${(similarity * 100).toFixed(1)}%)`);
        passed = false;
      } else {
        warnings.push(`Output similar but not exact (${(similarity * 100).toFixed(1)}%)`);
      }
    }

    // Check expected patterns
    if (testCase.expectedPatterns) {
      for (const pattern of testCase.expectedPatterns) {
        const regex = new RegExp(pattern);
        if (!regex.test(output)) {
          errors.push(`Pattern not matched: ${pattern}`);
          passed = false;
        }
      }
    }

    // Check minimum quality score
    if (testCase.minQualityScore && qualityScore < testCase.minQualityScore) {
      errors.push(
        `Quality score below threshold: ${qualityScore.toFixed(2)} < ${testCase.minQualityScore}`
      );
      passed = false;
    }

    // Estimate cost
    const cost = this.estimateCost(renderedPrompt, output, prompt.modelConfig.model);

    return {
      testCaseId: testCase.id,
      passed,
      output,
      qualityScore,
      latency,
      cost,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(output: string, testCase: PromptTestCase): number {
    let score = 0.5; // Base score

    // Length check
    if (output.length > 10) {
      score += 0.1;
    }

    // Expected output similarity
    if (testCase.expectedOutput) {
      const similarity = this.calculateSimilarity(output, testCase.expectedOutput);
      score = similarity;
    }

    // Pattern matching
    if (testCase.expectedPatterns) {
      let matches = 0;
      for (const pattern of testCase.expectedPatterns) {
        if (new RegExp(pattern).test(output)) {
          matches++;
        }
      }
      score = matches / testCase.expectedPatterns.length;
    }

    return Math.min(1, score);
  }

  /**
   * Calculate similarity between strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Render prompt with variables
   */
  private renderPrompt(template: string, variables: Record<string, any>): string {
    let rendered = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, String(value));
    }

    return rendered;
  }

  /**
   * Call model (simulated)
   */
  private async callModel(prompt: string, model: string): Promise<string> {
    // Simulate API latency
    await this.sleep(100 + Math.random() * 200);

    // Simulate response
    return `Response to: ${prompt.substring(0, 50)}...`;
  }

  /**
   * Estimate cost
   */
  private estimateCost(prompt: string, output: string, model: string): number {
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(output.length / 4);

    // Rough pricing (per 1K tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
    };

    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];

    return (
      (inputTokens / 1000) * modelPricing.input +
      (outputTokens / 1000) * modelPricing.output
    );
  }

  /**
   * Get test suite
   */
  getTestSuite(suiteId: string): TestSuite | undefined {
    return this.testSuites.get(suiteId);
  }

  /**
   * Get test run
   */
  getTestRun(runId: string): TestRun | undefined {
    return this.testRuns.get(runId);
  }

  /**
   * List test suites for prompt
   */
  listTestSuites(promptId: string): TestSuite[] {
    return Array.from(this.testSuites.values()).filter(
      (s) => s.promptId === promptId
    );
  }

  /**
   * List test runs for suite
   */
  listTestRuns(suiteId: string): TestRun[] {
    return Array.from(this.testRuns.values()).filter(
      (r) => r.suiteId === suiteId
    );
  }

  /**
   * Compare test runs
   */
  compareRuns(runId1: string, runId2: string): {
    run1: TestRun;
    run2: TestRun;
    comparison: {
      qualityImprovement: number;
      latencyImprovement: number;
      costImprovement: number;
      passRateImprovement: number;
    };
  } {
    const run1 = this.testRuns.get(runId1);
    const run2 = this.testRuns.get(runId2);

    if (!run1 || !run2) {
      throw new Error('Test run not found');
    }

    const comparison = {
      qualityImprovement:
        ((run2.summary.avgQuality - run1.summary.avgQuality) /
          run1.summary.avgQuality) *
        100,
      latencyImprovement:
        ((run1.summary.avgLatency - run2.summary.avgLatency) /
          run1.summary.avgLatency) *
        100,
      costImprovement:
        ((run1.summary.totalCost - run2.summary.totalCost) /
          run1.summary.totalCost) *
        100,
      passRateImprovement:
        ((run2.summary.passed / run2.summary.total -
          run1.summary.passed / run1.summary.total) /
          (run1.summary.passed / run1.summary.total)) *
        100,
    };

    return { run1, run2, comparison };
  }

  /**
   * Generate test report
   */
  generateReport(runId: string): string {
    const run = this.testRuns.get(runId);
    if (!run) {
      throw new Error('Test run not found');
    }

    const suite = this.testSuites.get(run.suiteId);
    if (!suite) {
      throw new Error('Test suite not found');
    }

    let report = `# Test Report: ${suite.name}\n\n`;
    report += `**Run ID:** ${run.id}\n`;
    report += `**Prompt Version:** ${run.promptVersion}\n`;
    report += `**Started:** ${run.startedAt.toISOString()}\n`;
    report += `**Completed:** ${run.completedAt?.toISOString()}\n\n`;

    report += `## Summary\n\n`;
    report += `- **Total Tests:** ${run.summary.total}\n`;
    report += `- **Passed:** ${run.summary.passed} (${((run.summary.passed / run.summary.total) * 100).toFixed(1)}%)\n`;
    report += `- **Failed:** ${run.summary.failed}\n`;
    report += `- **Avg Quality:** ${run.summary.avgQuality.toFixed(2)}\n`;
    report += `- **Avg Latency:** ${run.summary.avgLatency.toFixed(0)}ms\n`;
    report += `- **Total Cost:** $${run.summary.totalCost.toFixed(4)}\n\n`;

    report += `## Test Results\n\n`;

    for (const result of run.results) {
      const testCase = suite.testCases.find((tc) => tc.id === result.testCaseId);
      if (!testCase) continue;

      report += `### ${testCase.name} ${result.passed ? '✅' : '❌'}\n\n`;
      report += `- **Quality Score:** ${result.qualityScore.toFixed(2)}\n`;
      report += `- **Latency:** ${result.latency}ms\n`;
      report += `- **Cost:** $${result.cost.toFixed(4)}\n`;

      if (result.errors && result.errors.length > 0) {
        report += `- **Errors:**\n`;
        for (const error of result.errors) {
          report += `  - ${error}\n`;
        }
      }

      if (result.warnings && result.warnings.length > 0) {
        report += `- **Warnings:**\n`;
        for (const warning of result.warnings) {
          report += `  - ${warning}\n`;
        }
      }

      report += `\n`;
    }

    return report;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate ID
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
