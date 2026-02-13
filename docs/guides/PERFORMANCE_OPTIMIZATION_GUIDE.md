# Performance Optimization Guide

Complete guide to using the advanced performance profiling and optimization system.

## Table of Contents

1. [Continuous Performance Monitoring](#continuous-performance-monitoring)
2. [Performance Trends Analysis](#performance-trends-analysis)
3. [Performance Budgets](#performance-budgets)
4. [Budget Enforcement](#budget-enforcement)
5. [Automatic Optimization](#automatic-optimization)
6. [A/B Performance Testing](#ab-performance-testing)
7. [Cost Profiling](#cost-profiling)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Continuous Performance Monitoring

### Overview

The Continuous Monitor provides 24/7 performance tracking with minimal overhead (<2%).

### Getting Started

```typescript
import { continuousMonitor } from './profiling/ContinuousMonitor';

// Start monitoring
continuousMonitor.start();

// Configure monitoring
continuousMonitor.updateConfig({
  samplingRate: 1.0,        // Monitor 100% of requests
  retentionDays: 30,        // Keep 30 days of data
  anomalyThreshold: 3,      // 3 sigma for anomaly detection
  alertChannels: [
    {
      type: 'slack',
      config: { url: 'https://hooks.slack.com/...' },
      enabled: true
    }
  ]
});
```

### Features

#### Real-time Metric Collection

Automatically collects:
- Execution times
- Memory usage
- API call counts
- Error rates
- Custom metrics

#### Anomaly Detection

Detects performance anomalies using statistical analysis:

```typescript
// Anomalies are automatically detected and logged
// Get recent anomalies
const anomalies = continuousMonitor.getAnomalies(50);

anomalies.forEach(anomaly => {
  console.log(`Anomaly in ${anomaly.metric}`);
  console.log(`Value: ${anomaly.value}, Expected: ${anomaly.expectedValue}`);
  console.log(`Severity: ${anomaly.severity}`);
});
```

#### Historical Data

Access historical performance data:

```typescript
// Get historical data for a metric
const data = continuousMonitor.getHistoricalData(
  'workflow.execution_time',
  startTime,
  endTime
);

// Get statistics
const stats = continuousMonitor.getStatistics('workflow.execution_time');
console.log(`Mean: ${stats.mean}ms`);
console.log(`P95: ${stats.p95}ms`);
console.log(`P99: ${stats.p99}ms`);
```

#### Alert Configuration

Configure alerts for different channels:

```typescript
continuousMonitor.updateConfig({
  alertChannels: [
    // Slack alerts
    {
      type: 'slack',
      config: { url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL' },
      enabled: true
    },
    // Email alerts
    {
      type: 'email',
      config: { email: 'alerts@example.com' },
      enabled: true
    },
    // Webhook alerts
    {
      type: 'webhook',
      config: { webhook: 'https://api.example.com/alerts' },
      enabled: true
    }
  ]
});
```

### Monitoring Overhead

The continuous monitor is designed for minimal overhead:

```typescript
// Check current overhead
const overhead = continuousMonitor.getOverhead();
console.log(`Monitoring overhead: ${overhead.toFixed(2)}%`);
// Expected: < 2%
```

---

## Performance Trends Analysis

### Overview

Analyze performance trends over time with statistical forecasting and regression detection.

### Trend Analysis

```typescript
import { performanceTrends } from './profiling/PerformanceTrends';

// Analyze 30-day trend
const analysis = performanceTrends.analyzeTrends('workflow.execution_time', 30);

if (analysis) {
  console.log(`Trend: ${analysis.trend}`); // improving, stable, or degrading
  console.log(`Current: ${analysis.currentValue}ms`);
  console.log(`Previous: ${analysis.previousValue}ms`);
  console.log(`Change: ${analysis.percentChange.toFixed(2)}%`);

  // Forecast
  console.log(`Forecast (next week): ${analysis.forecast.nextWeek}ms`);
  console.log(`Confidence: ${(analysis.forecast.confidence * 100).toFixed(1)}%`);
}
```

### Comparative Analysis

Compare performance across time periods:

```typescript
// Week-over-week and month-over-month comparison
const comparison = performanceTrends.comparePerformance('api.response_time');

if (comparison) {
  // Week-over-week
  console.log(`WoW Change: ${comparison.weekOverWeek.percentChange.toFixed(2)}%`);
  console.log(`WoW Significant: ${comparison.weekOverWeek.significant}`);

  // Month-over-month
  console.log(`MoM Change: ${comparison.monthOverMonth.percentChange.toFixed(2)}%`);
  console.log(`MoM Significant: ${comparison.monthOverMonth.significant}`);
}
```

### Regression Detection

Automatically detect performance regressions:

```typescript
// Detect regressions for a metric
const regression = performanceTrends.detectRegressions('workflow.execution_time');

if (regression) {
  console.log(`Regression detected!`);
  console.log(`Severity: ${regression.severity}`);
  console.log(`Degradation: ${regression.degradation.toFixed(2)}%`);
  console.log(`Possible causes:`);
  regression.possibleCauses.forEach(cause => console.log(`  - ${cause}`));
}

// Get all regressions
const allRegressions = performanceTrends.getRegressions(50);
```

### Trend Summary

Get a quick overview of all metrics:

```typescript
const summary = performanceTrends.getTrendSummary();

console.log(`Improving metrics: ${summary.improving.join(', ')}`);
console.log(`Stable metrics: ${summary.stable.join(', ')}`);
console.log(`Degrading metrics: ${summary.degrading.join(', ')}`);
```

---

## Performance Budgets

### Overview

Define and enforce performance budgets to maintain system quality.

### Creating Budgets

```typescript
import { performanceBudgetManager } from './profiling/PerformanceBudget';

// Create a workflow execution time budget
const budget = performanceBudgetManager.setBudget({
  name: 'Workflow Execution Time',
  metric: 'workflow.execution_time',
  enabled: true,
  limits: {
    maxTime: 5000,        // Max 5 seconds
    maxMemory: 100,       // Max 100 MB
    maxApiCalls: 50,      // Max 50 API calls
    maxCost: 1.0          // Max $1 per execution
  },
  scope: {
    type: 'workflow',
    targetId: 'my-workflow-id'
  }
});
```

### Budget Types

#### Global Budgets

Apply to all workflows:

```typescript
performanceBudgetManager.setBudget({
  name: 'Global Performance Budget',
  metric: 'execution_time',
  enabled: true,
  limits: { maxTime: 10000 },
  scope: { type: 'global' }
});
```

#### Workflow-Specific Budgets

Apply to specific workflows:

```typescript
performanceBudgetManager.setBudget({
  name: 'Critical Workflow Budget',
  metric: 'execution_time',
  enabled: true,
  limits: { maxTime: 2000 },
  scope: { type: 'workflow', targetId: 'critical-workflow' }
});
```

#### Node-Type Budgets

Apply to specific node types:

```typescript
performanceBudgetManager.setBudget({
  name: 'HTTP Request Budget',
  metric: 'node.http.response_time',
  enabled: true,
  limits: { maxTime: 500 },
  scope: { type: 'node', targetId: 'http-request' }
});
```

### Checking Budgets

```typescript
// Check if metrics are within budget
const result = performanceBudgetManager.checkBudget(
  'workflow.execution_time',
  {
    time: 6000,
    memory: 120,
    apiCalls: 45,
    cost: 0.80
  },
  { type: 'workflow', targetId: 'my-workflow' }
);

if (result.passed) {
  console.log('Within budget!');
} else {
  console.log('Budget violations:');
  result.violations.forEach(violation => {
    console.log(`  ${violation.limit}: ${violation.actualValue} / ${violation.budgetValue}`);
    console.log(`  Exceeded by: ${violation.exceeded.toFixed(1)}%`);
    console.log(`  Severity: ${violation.severity}`);
  });
}
```

### Budget Reports

```typescript
// Generate 7-day budget report
const report = performanceBudgetManager.generateReport(7);

console.log(`Total budgets: ${report.summary.totalBudgets}`);
console.log(`Active budgets: ${report.summary.activeBudgets}`);
console.log(`Compliance rate: ${report.summary.overallComplianceRate.toFixed(1)}%`);
console.log(`Critical violations: ${report.summary.criticalViolations}`);

// Budget-by-budget breakdown
report.budgets.forEach(budget => {
  console.log(`\n${budget.name}:`);
  console.log(`  Compliance: ${budget.complianceRate.toFixed(1)}%`);
  console.log(`  Violations: ${budget.failed}`);
});
```

---

## Budget Enforcement

### Overview

Automatically enforce budgets during execution, builds, and CI/CD.

### Configuration

```typescript
import { budgetEnforcer } from './profiling/BudgetEnforcement';

// Configure enforcement
budgetEnforcer.updateConfig({
  mode: 'strict',              // 'strict', 'warning', or 'off'
  failOnCritical: true,        // Fail on critical violations
  failOnError: true,           // Fail on error violations
  failOnWarning: false,        // Don't fail on warnings
  blockExecution: true,        // Block execution on violations
  sendAlerts: true,            // Send alerts
  alertChannels: {
    slack: 'https://hooks.slack.com/...',
    email: 'team@example.com'
  }
});
```

### Enforcement Modes

#### Strict Mode

Fails on any violation:

```typescript
budgetEnforcer.updateConfig({ mode: 'strict' });
```

#### Warning Mode

Logs violations but doesn't fail:

```typescript
budgetEnforcer.updateConfig({ mode: 'warning' });
```

#### Off Mode

Disables enforcement:

```typescript
budgetEnforcer.updateConfig({ mode: 'off' });
```

### Enforcing Budgets

```typescript
// Enforce budget for an execution
const result = await budgetEnforcer.enforce(
  'workflow.execution_time',
  {
    time: 7000,
    memory: 150,
    apiCalls: 60
  },
  { type: 'workflow', targetId: 'my-workflow' }
);

if (result.blocked) {
  console.error('Execution blocked due to budget violation!');
  console.error(result.message);

  // Show recommendations
  result.recommendations?.forEach(rec => {
    console.log(`  - ${rec}`);
  });

  throw new Error('Budget exceeded');
}
```

### CI/CD Integration

```javascript
// In your CI/CD pipeline
const { budgetEnforcer } = require('./profiling/BudgetEnforcement');

budgetEnforcer.updateConfig({
  mode: 'strict',
  failOnCritical: true,
  failOnError: true
});

// Run tests
await runTests();

// Check budgets
const result = await budgetEnforcer.enforce(
  'build.time',
  { time: buildTime },
  { type: 'global' }
);

if (result.action === 'fail') {
  console.error('Build failed: Performance budget exceeded');
  process.exit(1);
}
```

### Enforcement Reports

```typescript
// Generate enforcement report
const report = budgetEnforcer.generateReport(7);

console.log(`Total enforcements: ${report.enforcements.total}`);
console.log(`Passed: ${report.enforcements.passed}`);
console.log(`Warned: ${report.enforcements.warned}`);
console.log(`Blocked: ${report.enforcements.blocked}`);
console.log(`Failed: ${report.enforcements.failed}`);

// Top violators
console.log('\nTop Violators:');
report.topViolators.forEach(violator => {
  console.log(`  ${violator.metric}: ${violator.violationCount} violations`);
  console.log(`  Average exceeded: ${violator.averageExceeded.toFixed(1)}%`);
});
```

---

## Automatic Optimization

### Overview

AI-powered optimization suggestions with one-click apply.

### Analyzing Workflows

```typescript
import { autoOptimizer } from './profiling/AutoOptimizer';

// Analyze workflow for optimizations
const suggestions = await autoOptimizer.analyzeWorkflow('my-workflow-id');

suggestions.forEach(suggestion => {
  console.log(`\n${suggestion.title}`);
  console.log(`Type: ${suggestion.type}`);
  console.log(`Difficulty: ${suggestion.difficulty}`);
  console.log(`Estimated improvement: ${suggestion.estimatedImprovement}%`);
  console.log(`Description: ${suggestion.description}`);

  // Show expected impact
  if (suggestion.impact.timeReduction) {
    console.log(`  Time reduction: ${suggestion.impact.timeReduction}ms`);
  }
  if (suggestion.impact.costReduction) {
    console.log(`  Cost reduction: $${suggestion.impact.costReduction.toFixed(2)}`);
  }
});
```

### Optimization Types

The system suggests various optimization types:

- **Caching**: Cache frequently accessed data (90% faster)
- **Parallelization**: Execute independent nodes in parallel (50% faster)
- **Batching**: Combine multiple requests (70% fewer API calls)
- **Lazy Loading**: Load data only when needed (60% less memory)
- **Compression**: Compress data (40% less memory)
- **Debouncing**: Prevent excessive requests (80% fewer calls)
- **Memoization**: Cache expensive computations
- **Connection Pooling**: Reuse database connections
- **Query Optimization**: Optimize database queries
- **Indexing**: Add database indexes

### Applying Optimizations

```typescript
// Get suggestions
const suggestions = await autoOptimizer.analyzeWorkflow('my-workflow');

// Apply the first suggestion
const suggestion = suggestions[0];
const result = await autoOptimizer.applyOptimization(suggestion.id);

if (result.success) {
  console.log('Optimization applied successfully!');
  console.log(`Actual improvement: ${result.actualImprovement?.toFixed(1)}%`);

  // Compare metrics
  console.log('Before:');
  console.log(`  Time: ${result.metricsBeore.executionTime}ms`);
  console.log(`  Cost: $${result.metricsBeore.cost.toFixed(2)}`);

  console.log('After:');
  console.log(`  Time: ${result.metricsAfter?.executionTime}ms`);
  console.log(`  Cost: $${result.metricsAfter?.cost.toFixed(2)}`);
} else {
  console.error('Optimization failed:', result.error);
  if (result.rollback) {
    console.log('Changes were rolled back');
  }
}
```

### Managing Suggestions

```typescript
// Get all suggestions
const allSuggestions = autoOptimizer.getAllSuggestions();

// Get suggestions by status
const applied = autoOptimizer.getSuggestionsByStatus('applied');
const pending = autoOptimizer.getSuggestionsByStatus('suggested');

// Reject a suggestion
autoOptimizer.rejectSuggestion(suggestion.id);
```

---

## A/B Performance Testing

### Overview

Compare performance between workflow versions with statistical significance.

### Creating Tests

```typescript
import { abPerformanceTester } from './profiling/ABPerformanceTester';

// Create A/B test
const test = abPerformanceTester.createTest(
  'Workflow Optimization Test',
  // Variant A (current version)
  {
    name: 'Current Version',
    version: '1.0',
    description: 'Current production workflow',
    config: { /* current config */ }
  },
  // Variant B (optimized version)
  {
    name: 'Optimized Version',
    version: '2.0',
    description: 'Workflow with caching enabled',
    config: { /* optimized config */ }
  },
  // Configuration
  {
    trafficSplit: 0.5,              // 50/50 split
    minSampleSize: 100,             // Minimum 100 samples per variant
    maxDuration: 7 * 24 * 60 * 60 * 1000, // Max 7 days
    targetMetrics: ['execution_time', 'memory_usage', 'cost'],
    successCriteria: {
      minImprovement: 10,           // At least 10% improvement
      minConfidence: 0.95,          // 95% confidence
      primaryMetric: 'execution_time'
    },
    autoPromote: true                // Auto-promote winner
  }
);

console.log(`Test created: ${test.id}`);
```

### Running Tests

```typescript
// Start the test
await abPerformanceTester.startTest(test.id);

// In your workflow execution code:
function executeWorkflow(workflowId) {
  // Select variant for this execution
  const variant = abPerformanceTester.selectVariant(test.id);

  if (!variant) {
    // No test running, use default
    return executeDefaultWorkflow(workflowId);
  }

  // Execute the selected variant
  const startTime = Date.now();
  let success = true;
  let error;

  try {
    if (variant === 'A') {
      await executeVariantA(workflowId);
    } else {
      await executeVariantB(workflowId);
    }
  } catch (e) {
    success = false;
    error = e.message;
  }

  const executionTime = Date.now() - startTime;

  // Record execution
  abPerformanceTester.recordExecution(
    test.id,
    variant,
    {
      execution_time: executionTime,
      memory_usage: process.memoryUsage().heapUsed / 1024 / 1024,
      cost: calculateCost()
    },
    success,
    error
  );
}
```

### Analyzing Results

```typescript
// Complete test (or it will auto-complete)
const results = await abPerformanceTester.completeTest(test.id);

if (results) {
  console.log(`\nTest Results:`);
  console.log(`Winner: ${results.winner}`);
  console.log(`Confidence: ${(results.confidence * 100).toFixed(1)}%`);
  console.log(`Recommendation: ${results.recommendation}`);

  // Variant A results
  console.log(`\nVariant A (${results.variantA.sampleSize} samples):`);
  const aTime = results.variantA.metrics['execution_time'];
  console.log(`  Mean: ${aTime.mean.toFixed(2)}ms`);
  console.log(`  P95: ${aTime.p95.toFixed(2)}ms`);

  // Variant B results
  console.log(`\nVariant B (${results.variantB.sampleSize} samples):`);
  const bTime = results.variantB.metrics['execution_time'];
  console.log(`  Mean: ${bTime.mean.toFixed(2)}ms`);
  console.log(`  P95: ${bTime.p95.toFixed(2)}ms`);

  // Comparison
  console.log(`\nComparison:`);
  console.log(`  Improvement: ${results.comparison.improvement.toFixed(1)}%`);
  console.log(`  Significant: ${results.comparison.significant}`);
  console.log(`  P-value: ${results.comparison.pValue.toFixed(4)}`);
}
```

### Test Management

```typescript
// Get running tests
const runningTests = abPerformanceTester.getRunningTests();

// Pause a test
abPerformanceTester.pauseTest(test.id);

// Resume a paused test
abPerformanceTester.startTest(test.id);

// Cancel a test
abPerformanceTester.cancelTest(test.id);
```

---

## Cost Profiling

### Overview

Track and optimize costs per execution with detailed breakdowns.

### Tracking Costs

```typescript
import { costProfiler, ExecutionOperation } from './profiling/CostProfiler';

// Define operations for an execution
const operations: ExecutionOperation[] = [
  // API calls
  {
    type: 'api',
    service: 'stripe',
    callCount: 5,
    duration: 1500
  },
  // LLM usage
  {
    type: 'llm',
    model: 'gpt-4',
    tokens: 2500,
    duration: 3000
  },
  // Compute
  {
    type: 'compute',
    duration: 8000,
    memory: 0.5  // GB
  },
  // Storage
  {
    type: 'storage',
    operation: 'write',
    size: 10485760  // 10 MB in bytes
  },
  // Network
  {
    type: 'network',
    operation: 'upload',
    size: 5242880  // 5 MB in bytes
  }
];

// Calculate cost
const cost = costProfiler.calculateExecutionCost(
  'exec-123',
  'workflow-456',
  operations
);

console.log(`Total cost: $${cost.totalCost.toFixed(4)}`);
console.log(`Duration: ${cost.duration}ms`);
console.log(`Cost per second: $${cost.costPerSecond.toFixed(6)}`);
console.log(`Cost per node: $${cost.costPerNode.toFixed(6)}`);

// Breakdown by category
console.log('\nCost Breakdown:');
console.log(`  API: $${cost.breakdown.api.reduce((sum, item) => sum + item.totalCost, 0).toFixed(4)}`);
console.log(`  LLM: $${cost.breakdown.llm.reduce((sum, item) => sum + item.totalCost, 0).toFixed(4)}`);
console.log(`  Compute: $${cost.breakdown.compute.reduce((sum, item) => sum + item.totalCost, 0).toFixed(4)}`);
console.log(`  Storage: $${cost.breakdown.storage.reduce((sum, item) => sum + item.totalCost, 0).toFixed(4)}`);
console.log(`  Network: $${cost.breakdown.network.reduce((sum, item) => sum + item.totalCost, 0).toFixed(4)}`);
```

### Cost Reports

```typescript
// Generate 30-day cost report
const report = costProfiler.generateReport(30);

console.log(`\nCost Summary (last 30 days):`);
console.log(`Total cost: $${report.summary.totalCost.toFixed(2)}`);
console.log(`Executions: ${report.summary.executionCount}`);
console.log(`Average cost: $${report.summary.averageCostPerExecution.toFixed(4)}`);

// Top cost drivers
console.log(`\nTop Cost Drivers:`);
report.summary.topCostDrivers.forEach(driver => {
  console.log(`  ${driver.service}: $${driver.totalCost.toFixed(2)} (${driver.percentage.toFixed(1)}%)`);
  console.log(`    ${driver.callCount} calls, $${driver.averageCost.toFixed(4)} avg`);
});

// Daily trends
console.log(`\nDaily Trends:`);
report.trends.daily.slice(-7).forEach(day => {
  console.log(`  ${day.date}: $${day.cost.toFixed(2)} (${day.executionCount} executions)`);
});

// By workflow
console.log(`\nCost by Workflow:`);
report.trends.byWorkflow.slice(0, 5).forEach(wf => {
  console.log(`  ${wf.workflowName}: $${wf.totalCost.toFixed(2)}`);
  console.log(`    ${wf.executionCount} executions, $${wf.averageCost.toFixed(4)} avg`);
});

// Forecast
console.log(`\nCost Forecast:`);
console.log(`  Next week: $${report.forecast.nextWeek.toFixed(2)}`);
console.log(`  Next month: $${report.forecast.nextMonth.toFixed(2)}`);
console.log(`  Confidence: ${(report.forecast.confidence * 100).toFixed(1)}%`);
```

### Cost Optimization

```typescript
// Get optimization suggestions
const optimizations = costProfiler.getOptimizations(30);

console.log(`\nCost Optimization Opportunities:`);
optimizations.forEach((opt, i) => {
  console.log(`\n${i + 1}. ${opt.title} (${opt.difficulty} difficulty)`);
  console.log(`   ${opt.description}`);
  console.log(`   Current cost: $${opt.currentCost.toFixed(2)}`);
  console.log(`   Potential savings: $${opt.potentialSavings.toFixed(2)} (${opt.savingsPercentage}%)`);
  console.log(`   Actions:`);
  opt.actions.forEach(action => console.log(`     - ${action}`));
});
```

### Custom Cost Configuration

```typescript
// Update cost configuration
costProfiler.updateConfig({
  apiCosts: {
    'custom-api': 0.001,  // $0.001 per call
  },
  llmCosts: {
    'custom-model': 0.05   // $0.05 per 1K tokens
  },
  computeCosts: {
    perSecond: 0.000002,
    perGB: 0.0000002
  }
});
```

---

## Best Practices

### 1. Monitoring

- **Enable continuous monitoring** for all production workflows
- Set **sampling rate to 100%** for critical workflows
- Configure **alerts** for anomalies
- Keep **30 days of historical data** for trend analysis
- Review **anomalies daily**

### 2. Budgets

- Define **budgets early** in development
- Set **realistic limits** based on baseline performance
- Use **workflow-specific budgets** for critical workflows
- Review **budget compliance weekly**
- Adjust budgets as requirements change

### 3. Enforcement

- Use **warning mode** in development
- Use **strict mode** in production
- Enable **automatic alerts** for violations
- Review **enforcement reports** regularly
- Act on **recommendations** promptly

### 4. Optimization

- Run **optimization analysis weekly**
- Prioritize **high-impact, low-difficulty** optimizations
- Use **A/B testing** to validate optimizations
- Monitor **actual improvements** vs. estimates
- Rollback if **performance degrades**

### 5. A/B Testing

- Use **50/50 traffic split** for unbiased results
- Collect **minimum 100 samples** per variant
- Wait for **statistical significance** (95%+)
- Monitor **secondary metrics** (not just primary)
- **Document results** for future reference

### 6. Cost Management

- Track **costs from day one**
- Set **cost budgets** for workflows
- Review **cost reports monthly**
- Implement **cost optimizations** when >20% savings available
- Monitor **cost trends** and forecast

---

## Troubleshooting

### High Monitoring Overhead

If overhead exceeds 2%:

```typescript
// Reduce sampling rate
continuousMonitor.updateConfig({
  samplingRate: 0.5  // Monitor 50% of requests
});
```

### Budget Violations

If consistently violating budgets:

1. Check if budgets are realistic
2. Analyze trends to identify root cause
3. Apply optimization suggestions
4. Consider adjusting budgets if necessary

### False Anomalies

If getting too many false positives:

```typescript
// Increase anomaly threshold
continuousMonitor.updateConfig({
  anomalyThreshold: 4  // 4 sigma instead of 3
});
```

### A/B Test Not Completing

If test doesn't reach significance:

1. Check sample sizes (may need more data)
2. Verify variants are actually different
3. Check if variance is too high
4. Consider increasing max duration

### Cost Tracking Inaccurate

If costs don't match actual:

1. Verify cost configuration is correct
2. Check all operations are being tracked
3. Update unit costs if pricing changed
4. Ensure custom services are configured

---

## API Reference

See individual module documentation for complete API details:

- [ContinuousMonitor](./src/profiling/ContinuousMonitor.ts)
- [PerformanceTrends](./src/profiling/PerformanceTrends.ts)
- [PerformanceBudget](./src/profiling/PerformanceBudget.ts)
- [BudgetEnforcement](./src/profiling/BudgetEnforcement.ts)
- [AutoOptimizer](./src/profiling/AutoOptimizer.ts)
- [ABPerformanceTester](./src/profiling/ABPerformanceTester.ts)
- [CostProfiler](./src/profiling/CostProfiler.ts)

---

## Support

For issues or questions:
1. Check this guide first
2. Review module documentation
3. Check test files for examples
4. File an issue on GitHub

---

**Version:** 1.0.0
**Last Updated:** 2025-10-18
**Agent:** Agent 50 - Session 8
