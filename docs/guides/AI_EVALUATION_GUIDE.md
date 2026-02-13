# AI Workflow Evaluation Framework - Complete Guide

## Overview

The AI Workflow Evaluation Framework provides comprehensive testing and quality assurance for AI-powered workflows. This framework matches n8n's 2025 AI evaluation capabilities with support for multiple metrics, batch testing, and detailed analytics.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Getting Started](#getting-started)
3. [Metrics](#metrics)
4. [Creating Evaluations](#creating-evaluations)
5. [Running Evaluations](#running-evaluations)
6. [Analyzing Results](#analyzing-results)
7. [Debug Data Pinning](#debug-data-pinning)
8. [Advanced Features](#advanced-features)
9. [API Reference](#api-reference)
10. [Best Practices](#best-practices)

## Core Concepts

### Evaluations

An **Evaluation** is a test suite for your AI workflow. It consists of:
- **Metrics**: What to measure (correctness, toxicity, latency, etc.)
- **Test Inputs**: Data to run through your workflow
- **Expected Outputs**: What you expect to see (optional)
- **Thresholds**: Pass/fail criteria for each metric

### Metrics

Six built-in metrics are available:

1. **Correctness** - LLM-based evaluation of output accuracy
2. **Toxicity** - Detect harmful or inappropriate content
3. **Bias** - Identify demographic bias (gender, race, age, etc.)
4. **Tool Calling** - Validate AI agent tool/function calls
5. **Latency** - Measure response time
6. **Cost** - Track LLM token usage and costs

### Test Runs

A **Test Run** executes an evaluation against all test inputs and produces:
- Individual test results
- Aggregate metrics
- Pass/fail summary
- Detailed feedback

## Getting Started

### Installation

The evaluation framework is already integrated into your workflow platform. No additional installation required.

### Quick Start

```typescript
import { EvaluationEngine } from './evaluation/EvaluationEngine';
import { MetricRegistry } from './evaluation/MetricRegistry';
import { EvaluationRunner } from './evaluation/EvaluationRunner';
import { registerAllMetrics } from './evaluation/metrics';

// 1. Set up the engine
const registry = new MetricRegistry();
registerAllMetrics(registry);
const engine = new EvaluationEngine({ metricRegistry: registry });

// 2. Set execution callback
engine.setExecutionCallback(async (workflowId, input) => {
  // Execute your workflow and return output
  return await executeWorkflow(workflowId, input);
});

// 3. Create an evaluation
const evaluation = {
  id: 'eval-1',
  name: 'Customer Support Bot Evaluation',
  workflowId: 'my-workflow-id',
  metrics: [
    {
      id: 'metric-1',
      type: 'correctness',
      name: 'Correctness',
      description: 'Validate response accuracy',
      enabled: true,
      weight: 1,
      threshold: 0.8,
      config: {
        llmProvider: 'openai',
        model: 'gpt-4',
        temperature: 0,
      },
    },
  ],
  inputs: [
    {
      id: 'input-1',
      name: 'Basic Query',
      data: { question: 'What are your business hours?' },
      expectedOutput: 'We are open Monday-Friday, 9am-5pm EST',
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// 4. Run the evaluation
const runner = new EvaluationRunner(engine);
const run = await runner.run(evaluation);

console.log(`Tests passed: ${run.summary.passed}/${run.summary.totalTests}`);
console.log(`Average score: ${(run.summary.averageScore * 100).toFixed(1)}%`);
```

## Metrics

### 1. Correctness Metric

Evaluates output correctness using an LLM judge.

**Configuration:**
```typescript
{
  type: 'correctness',
  threshold: 0.8, // Pass if score >= 0.8
  config: {
    llmProvider: 'openai', // 'openai' | 'anthropic' | 'google' | 'azure'
    model: 'gpt-4',
    temperature: 0.0,
    criteria: ['Accuracy', 'Completeness', 'Relevance'], // Optional
    prompt: '...' // Optional custom evaluation prompt
  }
}
```

**How it works:**
1. Compares actual output with expected output
2. Uses LLM to evaluate based on criteria
3. Returns score (0-1) and detailed feedback

**Best for:**
- Text generation tasks
- Question answering
- Content creation
- Translation

### 2. Toxicity Metric

Detects harmful, toxic, or inappropriate content.

**Configuration:**
```typescript
{
  type: 'toxicity',
  threshold: 0.8, // Pass if toxicity <= 0.2
  config: {
    provider: 'local', // 'local' | 'llm' | 'perspective'
    categories: ['toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate']
  }
}
```

**Categories:**
- **toxic**: Rude, disrespectful content
- **severe_toxic**: Very hateful content
- **obscene**: Vulgar content
- **threat**: Threatening content
- **insult**: Insulting content
- **identity_hate**: Hate based on identity

**Best for:**
- Customer-facing chatbots
- Content moderation
- Social media responses
- Public-facing AI

### 3. Bias Metric

Analyzes content for demographic bias.

**Configuration:**
```typescript
{
  type: 'bias',
  threshold: 0.8, // Pass if bias score >= 0.8 (minimal bias)
  config: {
    categories: ['gender', 'race', 'age', 'religion', 'disability'],
    method: 'llm', // 'llm' | 'statistical' | 'embedding'
    llmProvider: 'openai',
    model: 'gpt-4'
  }
}
```

**Categories:**
- **gender**: Gender-based bias
- **race**: Racial/ethnic bias
- **age**: Age-based bias
- **religion**: Religious bias
- **disability**: Disability-based bias

**Best for:**
- HR and recruiting bots
- Content generation
- Decision-making systems
- Public-facing communications

### 4. Tool Calling Metric

Validates that AI agents call the correct tools with correct parameters.

**Configuration:**
```typescript
{
  type: 'toolCalling',
  threshold: 0.8,
  config: {
    expectedTools: ['search', 'calculator'], // Optional
    requireAllTools: false,
    validateParameters: true,
    parameterSchema: { // Optional
      search: {
        query: { required: true, type: 'string' }
      }
    }
  }
}
```

**Best for:**
- AI agents with tool access
- Function calling workflows
- Multi-step reasoning tasks

### 5. Latency Metric

Measures execution performance.

**Configuration:**
```typescript
{
  type: 'latency',
  threshold: 0.7,
  config: {
    maxLatency: 10000, // milliseconds
    includeNodeLatency: true,
    trackPerNode: true
  }
}
```

**Scoring:**
- Score = 1.0 if latency <= maxLatency/2
- Score = 0.0 if latency >= maxLatency
- Linear interpolation between

**Best for:**
- Real-time applications
- Performance optimization
- SLA compliance

### 6. Cost Metric

Tracks LLM token usage and costs.

**Configuration:**
```typescript
{
  type: 'cost',
  threshold: 0.7,
  config: {
    maxCost: 1.0, // USD
    trackTokenUsage: true,
    includeAPICallCosts: false,
    customPricing: { // Optional
      'gpt-4': { input: 30.0, output: 60.0 }
    }
  }
}
```

**Default Pricing (per 1M tokens):**
- GPT-4: $30 input / $60 output
- GPT-3.5-turbo: $0.50 input / $1.50 output
- Claude-3-Opus: $15 input / $75 output
- Claude-3-Sonnet: $3 input / $15 output

**Best for:**
- Cost optimization
- Budget compliance
- Cost forecasting

## Creating Evaluations

### Using the UI

1. Open your workflow
2. Click "Evaluations" in the sidebar
3. Click "+ New Evaluation"
4. Follow the 3-step wizard:
   - **Step 1**: Name and describe your evaluation
   - **Step 2**: Select metrics
   - **Step 3**: Add test inputs

### Programmatically

```typescript
import { Evaluation, EvaluationInput, MetricConfig } from './types/evaluation';

const evaluation: Evaluation = {
  id: 'eval-customer-support',
  name: 'Customer Support Bot Evaluation',
  description: 'Test customer support responses for quality',
  workflowId: 'workflow-123',
  metrics: [
    // Correctness
    {
      id: 'metric-correctness',
      type: 'correctness',
      name: 'Response Correctness',
      description: 'Validate accuracy of responses',
      enabled: true,
      weight: 2, // Double weight
      threshold: 0.8,
      config: {
        llmProvider: 'openai',
        model: 'gpt-4',
        temperature: 0,
      },
    },
    // Toxicity
    {
      id: 'metric-toxicity',
      type: 'toxicity',
      name: 'Toxicity Check',
      description: 'Ensure responses are appropriate',
      enabled: true,
      weight: 1,
      threshold: 0.9,
      config: {
        provider: 'llm',
      },
    },
    // Latency
    {
      id: 'metric-latency',
      type: 'latency',
      name: 'Response Time',
      description: 'Measure response speed',
      enabled: true,
      weight: 1,
      threshold: 0.7,
      config: {
        maxLatency: 5000, // 5 seconds
      },
    },
  ],
  inputs: [
    {
      id: 'input-1',
      name: 'Business Hours Query',
      data: { question: 'What are your business hours?' },
      expectedOutput: 'We are open Monday-Friday, 9am-5pm EST',
    },
    {
      id: 'input-2',
      name: 'Refund Policy Query',
      data: { question: 'What is your refund policy?' },
      expectedOutput: '30-day money-back guarantee on all products',
    },
    // Add more test inputs...
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

## Running Evaluations

### Sequential Execution

```typescript
const runner = new EvaluationRunner(engine);
const run = await runner.run(evaluation);
```

### Parallel Execution

```typescript
const evaluation: Evaluation = {
  // ... other config
  settings: {
    parallel: true,
    maxParallel: 5, // Run 5 tests at once
  },
};

const run = await runner.run(evaluation);
```

### With Progress Tracking

```typescript
const runner = new EvaluationRunner(engine, {
  onProgress: (progress) => {
    console.log(`Progress: ${progress.completed}/${progress.total}`);
    if (progress.current) {
      console.log(`Currently testing: ${progress.current}`);
    }
  },
  onComplete: (run) => {
    console.log('Evaluation complete!');
    console.log(`Score: ${(run.summary.averageScore * 100).toFixed(1)}%`);
  },
});

const run = await runner.run(evaluation);
```

### Test Suites

Group multiple evaluations:

```typescript
import { TestSuiteManager, TestSuiteRunner } from './evaluation/TestSuite';

// Create suite
const manager = new TestSuiteManager();
const suite = manager.create('Full Test Suite', [
  'eval-customer-support',
  'eval-sales-bot',
  'eval-technical-support',
], {
  runSequentially: true,
  stopOnFailure: false,
});

// Register evaluations
const suiteRunner = new TestSuiteRunner(runner);
suiteRunner.registerEvaluations([evaluation1, evaluation2, evaluation3]);

// Run suite
const suiteRun = await suiteRunner.runSuite(suite);

console.log(`Evaluations passed: ${suiteRun.summary.passed}/${suiteRun.summary.totalEvaluations}`);
console.log(`Total tests passed: ${suiteRun.summary.testsPassed}/${suiteRun.summary.totalTests}`);
```

## Analyzing Results

### View Results in UI

1. Go to Evaluations panel
2. Click "Recent Runs" tab
3. Click on a run to view details

### Programmatic Analysis

```typescript
// Overall summary
console.log(`Pass rate: ${(run.summary.passed / run.summary.totalTests * 100).toFixed(1)}%`);
console.log(`Average score: ${(run.summary.averageScore * 100).toFixed(1)}%`);

// Per-metric analysis
for (const [metricType, stats] of Object.entries(run.summary.metrics)) {
  console.log(`${metricType}:`);
  console.log(`  Average: ${(stats.average * 100).toFixed(1)}%`);
  console.log(`  Min: ${(stats.min * 100).toFixed(1)}%`);
  console.log(`  Max: ${(stats.max * 100).toFixed(1)}%`);
}

// Individual results
for (const result of run.results) {
  if (!result.passed) {
    console.log(`FAILED: ${result.inputName}`);
    console.log(`  Score: ${(result.overallScore * 100).toFixed(1)}%`);

    // Show failed metrics
    for (const metric of result.metrics) {
      if (!metric.passed) {
        console.log(`  - ${metric.metricName}: ${(metric.score * 100).toFixed(1)}%`);
        console.log(`    Feedback: ${metric.feedback}`);
      }
    }
  }
}
```

### Export Results

```typescript
// Export to JSON
const json = JSON.stringify(run, null, 2);
await fs.writeFile('evaluation-results.json', json);

// Export to CSV
const csv = convertToCSV(run.results);
await fs.writeFile('evaluation-results.csv', csv);

function convertToCSV(results) {
  const headers = ['Input Name', 'Passed', 'Overall Score', ...];
  const rows = results.map(r => [
    r.inputName,
    r.passed ? 'Yes' : 'No',
    r.overallScore.toFixed(2),
    // ... more columns
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}
```

## Debug Data Pinning

Pin failed execution data for replay and debugging.

### Automatic Pinning

```typescript
import { DebugDataPinner } from './evaluation/DebugDataPinner';

const pinner = new DebugDataPinner();

// Automatically pin failed results
for (const result of run.results) {
  if (!result.passed) {
    await pinner.pinFromEvaluationResult(result);
  }
}
```

### Manual Pinning

```typescript
const pinned = await pinner.pin({
  evaluationId: 'eval-1',
  evaluationResultId: 'result-1',
  inputId: 'input-1',
  nodeId: 'node-123',
  data: { input: 'test', output: 'result' },
  reason: 'interesting',
  notes: 'Edge case worth investigating',
});
```

### Apply to Editor

```typescript
// Apply pinned data to workflow editor
await pinner.applyToEditor(pinned.id, workflowStore);

// Now you can replay the workflow with this data
```

### Query Pinned Data

```typescript
// Get all pinned data for an evaluation
const pinnedData = await pinner.getForEvaluation('eval-1');

// Get pinned data for a specific node
const nodePinnedData = await pinner.getForNode('node-123');

// Get statistics
const stats = pinner.getStats();
console.log(`Total pinned: ${stats.total}`);
console.log(`By reason:`, stats.byReason);
```

## Advanced Features

### Custom Metrics

Create your own metrics:

```typescript
import type { RegisteredMetric, MetricResult, EvaluationInput, MetricConfig } from './types/evaluation';

const CustomMetric: RegisteredMetric = {
  type: 'custom',
  name: 'Custom Metric',
  description: 'Your custom evaluation logic',
  defaultConfig: {
    threshold: 0.7,
    weight: 1,
  },
  validator: (config: MetricConfig) => {
    // Validate config
    return true;
  },
  executor: async (input, output, config, context) => {
    // Your evaluation logic
    const score = calculateScore(output);

    return {
      metricId: config.id,
      metricType: 'custom',
      metricName: config.name,
      score,
      passed: score >= (config.threshold || 0.7),
      feedback: `Score: ${score}`,
      timestamp: new Date(),
    };
  },
};

// Register custom metric
registry.register(CustomMetric);
```

### Scheduled Evaluations

Run evaluations on a schedule:

```typescript
const evaluation: Evaluation = {
  // ... other config
  schedule: {
    enabled: true,
    cron: '0 2 * * *', // Daily at 2 AM
    timezone: 'America/New_York',
  },
  notifications: {
    onFailure: true,
    onSuccess: false,
    channels: [
      {
        type: 'email',
        config: { to: 'team@example.com' },
      },
      {
        type: 'slack',
        config: { webhook: 'https://hooks.slack.com/...' },
      },
    ],
  },
};
```

### Regression Testing

Compare results over time:

```typescript
import type { EvaluationComparison } from './types/evaluation';

function compareRuns(baseline: EvaluationRun, current: EvaluationRun): EvaluationComparison {
  const scoreDelta = current.summary.averageScore - baseline.summary.averageScore;
  const passRateDelta = (current.summary.passed / current.summary.totalTests) -
                       (baseline.summary.passed / baseline.summary.totalTests);

  // Find regressions
  const regressions = [];
  for (let i = 0; i < current.results.length; i++) {
    const currentResult = current.results[i];
    const baselineResult = baseline.results[i];

    if (currentResult.overallScore < baselineResult.overallScore - 0.1) {
      regressions.push({
        inputId: currentResult.inputId,
        inputName: currentResult.inputName,
        baselineScore: baselineResult.overallScore,
        currentScore: currentResult.overallScore,
        delta: currentResult.overallScore - baselineResult.overallScore,
      });
    }
  }

  return {
    evaluationId: current.evaluationId,
    baselineRunId: baseline.id,
    currentRunId: current.id,
    baselineRun: baseline,
    currentRun: current,
    comparison: {
      scoreDelta,
      passRateDelta,
      metricDeltas: {},
      regressions,
      improvements: [],
    },
    timestamp: new Date(),
  };
}
```

## API Reference

### EvaluationEngine

```typescript
class EvaluationEngine {
  constructor(options?: {
    metricRegistry?: MetricRegistry;
    executionCallback?: (workflowId: string, input: Record<string, unknown>) => Promise<unknown>;
    logger?: Logger;
  });

  setExecutionCallback(callback: (workflowId: string, input: Record<string, unknown>) => Promise<unknown>): void;
  evaluateInput(evaluation: Evaluation, input: EvaluationInput, context?: EvaluationContext): Promise<EvaluationResult>;
  validateEvaluation(evaluation: Evaluation): { valid: boolean; errors: string[] };
  getMetricRegistry(): MetricRegistry;
}
```

### MetricRegistry

```typescript
class MetricRegistry {
  register(metric: RegisteredMetric): void;
  unregister(type: MetricType): boolean;
  get(type: MetricType): RegisteredMetric | undefined;
  getAll(): RegisteredMetric[];
  has(type: MetricType): boolean;
  createConfig(type: MetricType, overrides?: Partial<MetricConfig>): MetricConfig | null;
  validate(config: MetricConfig): { valid: boolean; errors: string[] };
}
```

### EvaluationRunner

```typescript
class EvaluationRunner {
  constructor(engine: EvaluationEngine, options?: {
    logger?: Logger;
    onProgress?: (progress: { completed: number; total: number; current?: string }) => void;
    onComplete?: (run: EvaluationRun) => void;
  });

  run(evaluation: Evaluation, options?: {
    context?: Partial<EvaluationContext>;
    triggeredBy?: 'manual' | 'schedule' | 'api' | 'webhook';
    triggeredByUser?: string;
  }): Promise<EvaluationRun>;
}
```

## Best Practices

### 1. Start Small

Begin with 2-3 core metrics and 5-10 test inputs. Expand as you understand patterns.

### 2. Use Weighted Metrics

Prioritize important metrics with higher weights:

```typescript
metrics: [
  { type: 'correctness', weight: 2 }, // Most important
  { type: 'toxicity', weight: 1.5 }, // Important
  { type: 'latency', weight: 1 }, // Nice to have
]
```

### 3. Set Realistic Thresholds

- Start with lower thresholds (0.6-0.7)
- Gradually increase as your workflow improves
- Different metrics may need different thresholds

### 4. Test Edge Cases

Include challenging test cases:
- Ambiguous queries
- Multi-step reasoning
- Ethical dilemmas
- Performance stress tests

### 5. Monitor Trends

- Run evaluations regularly (daily/weekly)
- Track score trends over time
- Set up alerts for regressions

### 6. Document Expected Outputs

Clear expected outputs improve correctness evaluation:

```typescript
{
  data: { question: 'What is your refund policy?' },
  expectedOutput: '30-day money-back guarantee on all products. No questions asked.'
}
```

### 7. Use Test Suites for CI/CD

```typescript
// In your CI/CD pipeline
const suite = manager.create('CI Test Suite', ['eval-smoke', 'eval-critical']);
const suiteRun = await suiteRunner.runSuite(suite);

if (suiteRun.status !== 'completed' || suiteRun.summary.failed > 0) {
  throw new Error('Evaluation tests failed');
}
```

### 8. Pin and Investigate Failures

When tests fail:
1. Pin the data
2. Replay in the editor
3. Understand root cause
4. Fix and re-test

## Performance Considerations

### Optimization Tips

1. **Parallel Execution**: Use `parallel: true` with `maxParallel: 5-10`
2. **Metric Selection**: Only enable necessary metrics
3. **Batch Size**: Test with 10-50 inputs per run
4. **Caching**: Cache LLM evaluation results for identical outputs
5. **Timeouts**: Set appropriate timeouts (30-60s per test)

### Expected Performance

- **Single test**: 1-5 seconds (depends on workflow complexity)
- **10 tests parallel**: 5-15 seconds
- **100 tests parallel (10 at a time)**: 50-150 seconds
- **Metric calculation**: < 2 seconds per metric

## Troubleshooting

### Issue: Correctness metric always fails

**Solution**: Check expected output format. Ensure it matches actual output structure.

### Issue: High latency scores

**Solution**: Adjust `maxLatency` threshold or optimize workflow execution.

### Issue: Inconsistent results

**Solution**: Lower LLM temperature to 0 for deterministic evaluation.

### Issue: Tests timeout

**Solution**: Increase timeout in settings:

```typescript
settings: {
  timeout: 120000, // 2 minutes
}
```

## Support

For issues or questions:
- Check the [documentation](./README.md)
- Open an issue on GitHub
- Contact support@example.com

## License

MIT License - See LICENSE file for details.
