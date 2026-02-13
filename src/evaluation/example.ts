/**
 * AI Workflow Evaluation Framework - Example Usage
 * Complete example demonstrating all features
 */

import { createEvaluationFramework } from './index';
import type { Evaluation } from '../types/evaluation';
import { logger } from '../services/SimpleLogger';

/**
 * Example: Customer Support Bot Evaluation
 */
async function runCustomerSupportEvaluation() {
  logger.debug('=== AI Workflow Evaluation Framework Demo ===\n');

  // 1. Create the evaluation framework
  const { engine, registry, runner, pinner } = createEvaluationFramework({
    executionCallback: async (workflowId, input) => {
      // Simulate workflow execution
      logger.debug(`Executing workflow ${workflowId} with input:`, input);

      // In real usage, this would call your actual workflow
      // For demo, return a mock response
      const question = (input as { question?: string }).question;

      if (question?.includes('hours')) {
        return 'We are open Monday-Friday, 9am-5pm EST. Closed on weekends.';
      } else if (question?.includes('refund')) {
        return 'We offer a 30-day money-back guarantee on all products. No questions asked!';
      } else if (question?.includes('shipping')) {
        return 'Free shipping on orders over $50. Standard delivery is 3-5 business days.';
      }

      return 'I apologize, but I need more information to answer your question accurately.';
    },
    logger: {
      info: (msg: string, meta?: Record<string, unknown>) => logger.debug(`[INFO] ${msg}`, meta || ''),
      error: (msg: string, meta?: Record<string, unknown>) => logger.error(`[ERROR] ${msg}`, meta || ''),
      warn: (msg: string, meta?: Record<string, unknown>) => logger.warn(`[WARN] ${msg}`, meta || ''),
    },
  });

  // 2. Create an evaluation
  const evaluation: Evaluation = {
    id: 'eval-customer-support-v1',
    name: 'Customer Support Bot - Quality Evaluation',
    description: 'Comprehensive evaluation of customer support responses',
    workflowId: 'customer-support-workflow',
    metrics: [
      // Correctness - Most important (weight = 2)
      registry.createConfig('correctness', {
        name: 'Response Correctness',
        description: 'Validate accuracy of support responses',
        weight: 2,
        threshold: 0.8,
        config: {
          llmProvider: 'openai',
          model: 'gpt-4',
          temperature: 0.0,
          criteria: ['Accuracy', 'Completeness', 'Helpfulness'],
        },
      }),
      // Toxicity - Critical for customer-facing
      registry.createConfig('toxicity', {
        name: 'Content Safety',
        description: 'Ensure responses are appropriate',
        weight: 1.5,
        threshold: 0.9,
        config: {
          provider: 'local',
          categories: ['toxic', 'insult', 'threat'],
        },
      }),
      // Bias - Important for fairness
      registry.createConfig('bias', {
        name: 'Bias Detection',
        description: 'Check for demographic bias',
        weight: 1.5,
        threshold: 0.85,
        config: {
          categories: ['gender', 'race', 'age'],
          method: 'llm',
        },
      }),
      // Latency - Performance requirement
      registry.createConfig('latency', {
        name: 'Response Time',
        description: 'Measure response speed',
        weight: 1,
        threshold: 0.7,
        config: {
          maxLatency: 5000, // 5 seconds max
          trackPerNode: true,
        },
      }),
      // Cost - Budget tracking
      registry.createConfig('cost', {
        name: 'Cost Efficiency',
        description: 'Track LLM usage costs',
        weight: 0.5,
        threshold: 0.7,
        config: {
          maxCost: 0.5, // $0.50 per query max
          trackTokenUsage: true,
        },
      }),
    ] as never[],
    inputs: [
      {
        id: 'input-1',
        name: 'Business Hours Query',
        description: 'Simple factual query',
        data: { question: 'What are your business hours?' },
        expectedOutput: 'We are open Monday-Friday, 9am-5pm EST',
      },
      {
        id: 'input-2',
        name: 'Refund Policy Query',
        description: 'Policy-related query',
        data: { question: 'What is your refund policy?' },
        expectedOutput: '30-day money-back guarantee on all products',
      },
      {
        id: 'input-3',
        name: 'Shipping Information',
        description: 'Logistics query',
        data: { question: 'How long does shipping take?' },
        expectedOutput: 'Standard shipping takes 3-5 business days',
      },
      {
        id: 'input-4',
        name: 'Complex Query',
        description: 'Multi-part question',
        data: {
          question: 'I need to return a product I bought last week. How do I do that and how long will the refund take?',
        },
        expectedOutput: 'You can return products within 30 days. Refunds are processed within 5-7 business days.',
      },
      {
        id: 'input-5',
        name: 'Edge Case',
        description: 'Unclear question',
        data: { question: 'Help me with stuff' },
        expectedOutput: 'Request for more specific information',
      },
    ],
    settings: {
      parallel: true,
      maxParallel: 3,
      timeout: 30000,
      retryOnFailure: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 3. Validate evaluation
  logger.debug('Validating evaluation configuration...');
  const validation = engine.validateEvaluation(evaluation);

  if (!validation.valid) {
    logger.error('Validation failed:', validation.errors);
    return;
  }

  logger.debug('✓ Evaluation configuration is valid\n');

  // 4. Run the evaluation
  logger.debug('Running evaluation with progress tracking...\n');

  const runnerWithProgress = new (runner.constructor as typeof import('./EvaluationRunner').EvaluationRunner)(engine, {
    onProgress: (progress) => {
      const percentage = ((progress.completed / progress.total) * 100).toFixed(1);
      logger.debug(`Progress: ${percentage}% (${progress.completed}/${progress.total})`);
      if (progress.current) {
        logger.debug(`  Testing: ${progress.current}`);
      }
    },
  });

  const run = await runnerWithProgress.run(evaluation, {
    triggeredBy: 'manual',
    triggeredByUser: 'demo-user',
  });

  // 5. Analyze results
  logger.debug('\n=== Evaluation Results ===\n');
  logger.debug(`Status: ${run.status}`);
  logger.debug(`Duration: ${run.duration}ms`);
  logger.debug(`\nSummary:`);
  logger.debug(`  Total Tests: ${run.summary.totalTests}`);
  logger.debug(`  Passed: ${run.summary.passed} (${((run.summary.passed / run.summary.totalTests) * 100).toFixed(1)}%)`);
  logger.debug(`  Failed: ${run.summary.failed}`);
  logger.debug(`  Average Score: ${(run.summary.averageScore * 100).toFixed(1)}%`);

  // 6. Per-metric analysis
  logger.debug(`\n=== Metric Scores ===\n`);
  for (const [metricType, stats] of Object.entries(run.summary.metrics)) {
    logger.debug(`${metricType.toUpperCase()}:`);
    logger.debug(`  Average: ${(stats.average * 100).toFixed(1)}%`);
    logger.debug(`  Range: ${(stats.min * 100).toFixed(1)}% - ${(stats.max * 100).toFixed(1)}%`);
  }

  // 7. Show individual results
  logger.debug(`\n=== Individual Test Results ===\n`);
  for (const result of run.results) {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    logger.debug(`${status} - ${result.inputName}`);
    logger.debug(`  Score: ${(result.overallScore * 100).toFixed(1)}%`);
    logger.debug(`  Duration: ${result.executionData?.duration || 0}ms`);

    if (!result.passed) {
      logger.debug(`  Failed metrics:`);
      for (const metric of result.metrics) {
        if (!metric.passed) {
          logger.debug(`    - ${metric.metricName}: ${(metric.score * 100).toFixed(1)}%`);
          logger.debug(`      ${metric.feedback}`);
        }
      }
    }

    logger.debug('');
  }

  // 8. Pin failed data for debugging
  logger.debug('=== Debug Data Pinning ===\n');
  let pinnedCount = 0;

  for (const result of run.results) {
    if (!result.passed) {
      const pinned = await pinner.pinFromEvaluationResult(result);
      pinnedCount += pinned.length;
      logger.debug(`Pinned ${pinned.length} data points from failed test: ${result.inputName}`);
    }
  }

  if (pinnedCount > 0) {
    logger.debug(`\nTotal pinned data points: ${pinnedCount}`);
    const stats = pinner.getStats();
    logger.debug('Pinned data statistics:', stats);
  } else {
    logger.debug('No data pinned (all tests passed!)');
  }

  // 9. Export results
  logger.debug('\n=== Export Options ===\n');
  logger.debug('Results can be exported to:');
  logger.debug('  - JSON: Full detailed results');
  logger.debug('  - CSV: Tabular format for analysis');
  logger.debug('  - PDF: Professional report');

  // Example JSON export
  const jsonExport = JSON.stringify(run, null, 2);
  logger.debug(`\nJSON export size: ${jsonExport.length} characters`);

  // 10. Recommendations
  logger.debug('\n=== Recommendations ===\n');

  if (run.summary.averageScore < 0.7) {
    logger.debug('⚠ Overall score is below 70%. Consider:');
    logger.debug('  - Reviewing failed test cases');
    logger.debug('  - Improving workflow prompts');
    logger.debug('  - Adding more training data');
  } else if (run.summary.averageScore < 0.85) {
    logger.debug('✓ Good performance. Areas for improvement:');

    for (const [metricType, stats] of Object.entries(run.summary.metrics)) {
      if (stats.average < 0.8) {
        logger.debug(`  - ${metricType}: ${(stats.average * 100).toFixed(1)}% (target: 80%+)`);
      }
    }
  } else {
    logger.debug('✓ Excellent performance! Workflow is production-ready.');
  }

  logger.debug('\n=== Demo Complete ===\n');

  return run;
}

// Run the example if executed directly
if (require.main === module) {
  runCustomerSupportEvaluation()
    .then(() => {
      logger.debug('Example completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Example failed:', error);
      process.exit(1);
    });
}

export default runCustomerSupportEvaluation;
