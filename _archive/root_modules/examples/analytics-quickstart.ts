/**
 * Advanced Analytics - Quick Start Example
 *
 * This example demonstrates how to use the Advanced Analytics system
 * to track workflow executions, analyze costs, and get AI-powered recommendations.
 */

import { analyticsEngine } from '../src/analytics/AdvancedAnalyticsEngine';
import { costCalculator } from '../src/analytics/cost/CostCalculator';
import { costBreakdown } from '../src/analytics/cost/CostBreakdown';
import { budgetMonitor } from '../src/analytics/cost/BudgetMonitor';
import { costOptimizer } from '../src/analytics/cost/CostOptimizer';

// ============================================================================
// Example 1: Track a Complete Workflow Execution
// ============================================================================

async function trackWorkflowExecution() {
  console.log('\n=== Example 1: Track Workflow Execution ===\n');

  const workflowId = 'data-processing-pipeline';
  const executionId = `exec-${Date.now()}`;

  // Start workflow
  analyticsEngine.trackWorkflowExecution(workflowId, executionId, 'start');
  console.log(`Started workflow: ${workflowId}`);

  // Simulate node executions

  // Node 1: Fetch data via HTTP
  analyticsEngine.trackNodeExecution(executionId, 'fetch-data', 'http', 'start');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
  analyticsEngine.trackNodeExecution(executionId, 'fetch-data', 'http', 'complete', {
    apiCalls: 1,
    dataSize: 1024 * 100, // 100KB
  });
  console.log('  ✓ Fetched data from API');

  // Node 2: Process with LLM
  analyticsEngine.trackNodeExecution(executionId, 'process-llm', 'llm', 'start');
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work
  analyticsEngine.trackNodeExecution(executionId, 'process-llm', 'llm', 'complete', {
    apiCalls: 1,
  });
  console.log('  ✓ Processed with LLM');

  // Node 3: Save to database
  analyticsEngine.trackNodeExecution(executionId, 'save-db', 'database', 'start');
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work
  analyticsEngine.trackNodeExecution(executionId, 'save-db', 'database', 'complete', {
    apiCalls: 1,
  });
  console.log('  ✓ Saved to database');

  // Complete workflow
  analyticsEngine.trackWorkflowExecution(workflowId, executionId, 'complete');
  console.log(`Completed workflow: ${workflowId}`);

  // Get execution metrics
  const stats = analyticsEngine.getStatistics();
  console.log(`\nTotal events tracked: ${stats.collector.totalEvents}`);
}

// ============================================================================
// Example 2: Analyze Costs
// ============================================================================

function analyzeCosts() {
  console.log('\n=== Example 2: Analyze Costs ===\n');

  const dateRange = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    end: new Date(),
  };

  // Get cost summary
  const summary = costBreakdown.getCostSummary(dateRange);
  console.log('Cost Summary:');
  console.log(`  Total Cost: $${summary.totalCost.toFixed(2)}`);
  console.log(`  Avg per Execution: $${summary.avgCostPerExecution.toFixed(4)}`);
  console.log(`  Trend: ${summary.trend > 0 ? '+' : ''}${summary.trend.toFixed(1)}%`);
  console.log(`  Most Expensive Category: ${summary.mostExpensiveCategory}`);

  // Get cost breakdown by category
  console.log('\nCost by Category:');
  Object.entries(summary.byCategory).forEach(([category, cost]) => {
    console.log(`  ${category}: $${cost.toFixed(2)}`);
  });

  // Get most expensive workflows
  const expensiveWorkflows = costBreakdown.getMostExpensiveWorkflows(dateRange, 5);
  console.log('\nTop 5 Expensive Workflows:');
  expensiveWorkflows.forEach((workflow, index) => {
    console.log(`  ${index + 1}. ${workflow.workflowId.slice(0, 20)}...`);
    console.log(`     Total: $${workflow.totalCost.toFixed(2)}, Avg: $${workflow.avgCost.toFixed(4)}`);
  });

  // Calculate LLM model savings
  console.log('\nLLM Model Comparison:');
  const savings = costCalculator.calculateModelSavings(
    'gpt-4',
    'gpt-3.5-turbo',
    10000, // 10K input tokens
    5000   // 5K output tokens
  );
  console.log(`  GPT-4 Cost: $${savings.currentCost.toFixed(2)}`);
  console.log(`  GPT-3.5-Turbo Cost: $${savings.proposedCost.toFixed(2)}`);
  console.log(`  Savings: $${savings.savings.toFixed(2)} (${savings.savingsPercentage.toFixed(1)}%)`);
}

// ============================================================================
// Example 3: Budget Management
// ============================================================================

function manageBudgets() {
  console.log('\n=== Example 3: Budget Management ===\n');

  // Create monthly budget
  const budget = budgetMonitor.createBudget(
    'Production Monthly Budget',
    1000, // $1000 limit
    'monthly'
  );
  console.log(`Created budget: ${budget.name}`);
  console.log(`  Limit: $${budget.limit.toFixed(2)}`);
  console.log(`  Period: ${budget.period}`);

  // Set up alert handler
  budgetMonitor.onAlert(budget.id, (budget, alert) => {
    console.log(`\n🚨 BUDGET ALERT!`);
    console.log(`  Budget: ${budget.name}`);
    console.log(`  Threshold: ${alert.threshold}%`);
    console.log(`  Current: $${budget.current.toFixed(2)} (${budget.percentage.toFixed(1)}%)`);
    console.log(`  Channels: ${alert.channels.join(', ')}`);
  });

  // Update budget usage
  budgetMonitor.updateBudgetUsage(budget.id);
  console.log('\nBudget Status:');
  console.log(`  Current: $${budget.current.toFixed(2)}`);
  console.log(`  Used: ${budget.percentage.toFixed(1)}%`);
  console.log(`  Remaining: $${budgetMonitor.getRemainingBudget(budget.id)?.toFixed(2)}`);

  // Get projected cost
  const projected = budgetMonitor.getProjectedCost(budget.id);
  if (projected) {
    console.log(`  Projected End-of-Period: $${projected.toFixed(2)}`);
  }

  // Check budgets approaching limit
  const approaching = budgetMonitor.getBudgetsApproachingLimit(80);
  if (approaching.length > 0) {
    console.log(`\n⚠️  ${approaching.length} budget(s) approaching limit (>80%)`);
  }
}

// ============================================================================
// Example 4: Get Optimization Recommendations
// ============================================================================

function getOptimizations() {
  console.log('\n=== Example 4: Optimization Recommendations ===\n');

  const dateRange = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    end: new Date(),
  };

  // Get all optimizations
  const optimizations = costOptimizer.getAllOptimizations(dateRange);
  console.log(`Found ${optimizations.length} optimization opportunities\n`);

  // Display top 3 optimizations
  optimizations.slice(0, 3).forEach((opt, index) => {
    console.log(`${index + 1}. Workflow: ${opt.workflowId.slice(0, 20)}...`);
    console.log(`   Current Cost: $${opt.currentCost.toFixed(2)}`);
    console.log(`   Optimized Cost: $${opt.optimizedCost.toFixed(2)}`);
    console.log(`   Savings: $${opt.savings.toFixed(2)} (${opt.savingsPercentage.toFixed(1)}%)`);
    console.log(`   Actions:`);

    opt.optimizations.forEach((action) => {
      console.log(`     • ${action.description}`);
      console.log(`       Effort: ${action.effort}, Impact: $${action.impact.toFixed(2)}`);
    });
    console.log('');
  });

  // Get quick wins
  const quickWins = costOptimizer.getQuickWins(dateRange);
  console.log(`Quick Wins (low effort, high impact): ${quickWins.length}`);
  quickWins.slice(0, 5).forEach((win, index) => {
    console.log(`  ${index + 1}. ${win.description}`);
    console.log(`     Impact: $${win.impact.toFixed(2)}`);
  });

  // Get total potential savings
  const totalSavings = costOptimizer.getTotalPotentialSavings(dateRange);
  console.log('\nTotal Potential Savings:');
  console.log(`  Current: $${totalSavings.current.toFixed(2)}`);
  console.log(`  Optimized: $${totalSavings.optimized.toFixed(2)}`);
  console.log(`  Savings: $${totalSavings.savings.toFixed(2)} (${totalSavings.savingsPercentage.toFixed(1)}%)`);
}

// ============================================================================
// Example 5: Performance Insights
// ============================================================================

function getPerformanceInsights() {
  console.log('\n=== Example 5: Performance Insights ===\n');

  const dateRange = {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    end: new Date(),
  };

  // Get aggregated metrics
  const metrics = analyticsEngine.getAggregatedMetrics(dateRange);

  console.log('Execution Metrics:');
  console.log(`  Total: ${metrics.metrics.executions.total}`);
  console.log(`  Successful: ${metrics.metrics.executions.successful}`);
  console.log(`  Failed: ${metrics.metrics.executions.failed}`);
  console.log(`  Success Rate: ${metrics.metrics.executions.successRate.toFixed(1)}%`);

  console.log('\nPerformance Metrics:');
  console.log(`  Avg Latency: ${(metrics.metrics.performance.avgLatency / 1000).toFixed(2)}s`);
  console.log(`  P50 Latency: ${(metrics.metrics.performance.p50Latency / 1000).toFixed(2)}s`);
  console.log(`  P95 Latency: ${(metrics.metrics.performance.p95Latency / 1000).toFixed(2)}s`);
  console.log(`  P99 Latency: ${(metrics.metrics.performance.p99Latency / 1000).toFixed(2)}s`);
  console.log(`  Throughput: ${metrics.metrics.performance.throughput.toFixed(1)} exec/hr`);

  // Get performance anomalies
  const anomalies = analyticsEngine.getPerformanceAnomalies(dateRange);
  if (anomalies.length > 0) {
    console.log(`\n⚠️  Detected ${anomalies.length} performance anomalies:`);
    anomalies.forEach((anomaly, index) => {
      console.log(`  ${index + 1}. ${anomaly.detectedAt.toLocaleString()}`);
      console.log(`     Expected: ${(anomaly.expected / 1000).toFixed(2)}s, Actual: ${(anomaly.actual / 1000).toFixed(2)}s`);
      console.log(`     Deviation: ${anomaly.deviation.toFixed(1)}%, Severity: ${anomaly.severity}`);
    });
  }
}

// ============================================================================
// Example 6: AI-Powered Recommendations
// ============================================================================

function getAIRecommendations() {
  console.log('\n=== Example 6: AI-Powered Recommendations ===\n');

  const dateRange = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    end: new Date(),
  };

  // Get insights
  const insights = analyticsEngine.getInsights(dateRange);
  console.log(`Generated ${insights.length} AI-powered insights\n`);

  // Display insights by severity
  const critical = insights.filter(i => i.severity === 'critical');
  const warnings = insights.filter(i => i.severity === 'warning');
  const info = insights.filter(i => i.severity === 'info');

  console.log(`Critical: ${critical.length}, Warnings: ${warnings.length}, Info: ${info.length}\n`);

  // Display top insights
  insights.slice(0, 3).forEach((insight, index) => {
    console.log(`${index + 1}. ${insight.title} [${insight.severity.toUpperCase()}]`);
    console.log(`   Type: ${insight.type}`);
    console.log(`   ${insight.description}`);
    console.log(`   Impact: ${insight.impact.improvement.toFixed(1)}% improvement`);

    if (insight.impact.estimatedSavings) {
      console.log(`   Estimated Savings: $${insight.impact.estimatedSavings.toFixed(2)}/month`);
    }

    console.log(`   Recommendations:`);
    insight.recommendations.forEach((rec, i) => {
      console.log(`     ${i + 1}. ${rec.action} (${rec.effort} effort, ${rec.impact} impact)`);
      console.log(`        ${rec.description}`);
    });
    console.log('');
  });
}

// ============================================================================
// Main Function - Run All Examples
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Advanced Analytics System - Quick Start Examples      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Run examples
    await trackWorkflowExecution();
    analyzeCosts();
    manageBudgets();
    getOptimizations();
    getPerformanceInsights();
    getAIRecommendations();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  All Examples Completed!                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Next Steps:');
    console.log('  1. Integrate analytics tracking in your workflows');
    console.log('  2. Set up budgets and alerts');
    console.log('  3. Review optimization recommendations');
    console.log('  4. Monitor performance metrics');
    console.log('  5. Export data for reporting\n');

    console.log('Documentation: See ADVANCED_ANALYTICS_GUIDE.md\n');

  } catch (error) {
    console.error('Error running examples:', error);
  } finally {
    // Clean up
    analyticsEngine.stop();
  }
}

// Run examples if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  trackWorkflowExecution,
  analyzeCosts,
  manageBudgets,
  getOptimizations,
  getPerformanceInsights,
  getAIRecommendations,
};
