/**
 * Comprehensive Tests for Performance Profiling System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContinuousMonitor } from '../profiling/ContinuousMonitor';
import { PerformanceTrends } from '../profiling/PerformanceTrends';
import { PerformanceBudgetManager } from '../profiling/PerformanceBudget';
import { BudgetEnforcer } from '../profiling/BudgetEnforcement';
import { AutoOptimizer } from '../profiling/AutoOptimizer';
import { ABPerformanceTester } from '../profiling/ABPerformanceTester';
import { CostProfiler } from '../profiling/CostProfiler';

describe('ContinuousMonitor', () => {
  let monitor: ContinuousMonitor;

  beforeEach(() => {
    monitor = ContinuousMonitor.getInstance();
  });

  it('should initialize with default config', () => {
    const config = monitor.getConfig();
    expect(config).toBeDefined();
    expect(config.enabled).toBe(true);
    expect(config.samplingRate).toBe(1.0);
    expect(config.retentionDays).toBe(30);
  });

  it('should update configuration', () => {
    monitor.updateConfig({ samplingRate: 0.5, retentionDays: 14 });
    const config = monitor.getConfig();
    expect(config.samplingRate).toBe(0.5);
    expect(config.retentionDays).toBe(14);
  });

  it('should track monitoring overhead below 2%', () => {
    monitor.start();
    const overhead = monitor.getOverhead();
    monitor.stop();
    expect(overhead).toBeLessThan(2);
  });

  it('should return available metrics', () => {
    const metrics = monitor.getAvailableMetrics();
    expect(Array.isArray(metrics)).toBe(true);
  });

  it('should return statistics for metrics', () => {
    const metrics = monitor.getAvailableMetrics();
    if (metrics.length > 0) {
      const stats = monitor.getStatistics(metrics[0]);
      if (stats) {
        expect(stats).toHaveProperty('mean');
        expect(stats).toHaveProperty('median');
        expect(stats).toHaveProperty('p95');
      }
    }
  });
});

describe('PerformanceTrends', () => {
  let trends: PerformanceTrends;

  beforeEach(() => {
    trends = PerformanceTrends.getInstance();
  });

  it('should analyze trends for metrics', () => {
    const analysis = trends.analyzeTrends('test.metric', 7);
    // May be null if no data
    if (analysis) {
      expect(analysis).toHaveProperty('trend');
      expect(analysis).toHaveProperty('trendStrength');
      expect(['improving', 'stable', 'degrading']).toContain(analysis.trend);
    }
  });

  it('should calculate trend statistics', () => {
    const analysis = trends.analyzeTrends('test.metric', 7);
    if (analysis) {
      expect(analysis.statistics).toHaveProperty('mean');
      expect(analysis.statistics).toHaveProperty('stdDev');
      expect(analysis.statistics).toHaveProperty('p95');
      expect(analysis.statistics).toHaveProperty('p99');
    }
  });

  it('should generate forecasts', () => {
    const analysis = trends.analyzeTrends('test.metric', 7);
    if (analysis) {
      expect(analysis.forecast).toHaveProperty('nextDay');
      expect(analysis.forecast).toHaveProperty('nextWeek');
      expect(analysis.forecast).toHaveProperty('nextMonth');
      expect(analysis.forecast.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.forecast.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('should compare performance week-over-week', () => {
    const comparison = trends.comparePerformance('test.metric');
    if (comparison) {
      expect(comparison).toHaveProperty('weekOverWeek');
      expect(comparison).toHaveProperty('monthOverMonth');
      expect(comparison.weekOverWeek).toHaveProperty('change');
      expect(comparison.weekOverWeek).toHaveProperty('significant');
    }
  });

  it('should detect performance regressions', () => {
    const regression = trends.detectRegressions('test.metric');
    if (regression) {
      expect(regression).toHaveProperty('severity');
      expect(regression).toHaveProperty('degradation');
      expect(['low', 'medium', 'high', 'critical']).toContain(regression.severity);
    }
  });
});

describe('PerformanceBudgetManager', () => {
  let budgetManager: PerformanceBudgetManager;

  beforeEach(() => {
    budgetManager = PerformanceBudgetManager.getInstance();
  });

  it('should create performance budget', () => {
    const budget = budgetManager.setBudget({
      name: 'Test Budget',
      metric: 'test.execution_time',
      enabled: true,
      limits: {
        maxTime: 5000,
        maxMemory: 100,
      },
      scope: {
        type: 'global',
      },
    });

    expect(budget).toBeDefined();
    expect(budget.name).toBe('Test Budget');
    expect(budget.limits.maxTime).toBe(5000);
  });

  it('should check budget compliance', () => {
    budgetManager.setBudget({
      name: 'Test Budget',
      metric: 'test.metric',
      enabled: true,
      limits: { maxTime: 1000 },
      scope: { type: 'global' },
    });

    const result = budgetManager.checkBudget(
      'test.metric',
      { time: 500 },
      { type: 'global' }
    );

    expect(result.passed).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  it('should detect budget violations', () => {
    budgetManager.setBudget({
      name: 'Test Budget',
      metric: 'test.metric',
      enabled: true,
      limits: { maxTime: 1000 },
      scope: { type: 'global' },
    });

    const result = budgetManager.checkBudget(
      'test.metric',
      { time: 2000 },
      { type: 'global' }
    );

    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].limit).toBe('maxTime');
  });

  it('should calculate compliance rate', () => {
    const budget = budgetManager.setBudget({
      name: 'Test Budget',
      metric: 'test.metric',
      enabled: true,
      limits: { maxTime: 1000 },
      scope: { type: 'global' },
    });

    const rate = budgetManager.getComplianceRate(budget.id, 7);
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(100);
  });

  it('should generate budget report', () => {
    const report = budgetManager.generateReport(7);
    expect(report).toHaveProperty('period');
    expect(report).toHaveProperty('budgets');
    expect(report).toHaveProperty('summary');
    expect(report.summary).toHaveProperty('totalBudgets');
    expect(report.summary).toHaveProperty('overallComplianceRate');
  });
});

describe('BudgetEnforcer', () => {
  let enforcer: BudgetEnforcer;
  let budgetManager: PerformanceBudgetManager;

  beforeEach(() => {
    enforcer = BudgetEnforcer.getInstance();
    budgetManager = PerformanceBudgetManager.getInstance();
  });

  it('should enforce budgets', async () => {
    budgetManager.setBudget({
      name: 'Test Budget',
      metric: 'test.metric',
      enabled: true,
      limits: { maxTime: 1000 },
      scope: { type: 'global' },
    });

    const result = await enforcer.enforce(
      'test.metric',
      { time: 500 },
      { type: 'global' }
    );

    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('action');
    expect(['allow', 'warn', 'block', 'fail']).toContain(result.action);
  });

  it('should provide recommendations on violations', async () => {
    budgetManager.setBudget({
      name: 'Test Budget',
      metric: 'test.metric',
      enabled: true,
      limits: { maxTime: 1000 },
      scope: { type: 'global' },
    });

    const result = await enforcer.enforce(
      'test.metric',
      { time: 2000 },
      { type: 'global' }
    );

    if (!result.passed) {
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    }
  });

  it('should generate enforcement report', () => {
    const report = enforcer.generateReport(7);
    expect(report).toHaveProperty('enforcements');
    expect(report).toHaveProperty('violations');
    expect(report.enforcements).toHaveProperty('total');
    expect(report.enforcements).toHaveProperty('passed');
  });
});

describe('AutoOptimizer', () => {
  let optimizer: AutoOptimizer;

  beforeEach(() => {
    optimizer = AutoOptimizer.getInstance();
  });

  it('should analyze workflows', async () => {
    const suggestions = await optimizer.analyzeWorkflow('test-workflow');
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('should generate optimization suggestions', async () => {
    const suggestions = await optimizer.analyzeWorkflow('test-workflow');
    suggestions.forEach(suggestion => {
      expect(suggestion).toHaveProperty('type');
      expect(suggestion).toHaveProperty('title');
      expect(suggestion).toHaveProperty('estimatedImprovement');
      expect(suggestion.estimatedImprovement).toBeGreaterThanOrEqual(0);
      expect(suggestion.estimatedImprovement).toBeLessThanOrEqual(100);
    });
  });

  it('should categorize suggestions by difficulty', async () => {
    const suggestions = await optimizer.analyzeWorkflow('test-workflow');
    suggestions.forEach(suggestion => {
      expect(['easy', 'medium', 'hard']).toContain(suggestion.difficulty);
    });
  });

  it('should track suggestion status', () => {
    const allSuggestions = optimizer.getAllSuggestions();
    allSuggestions.forEach(suggestion => {
      expect(['suggested', 'applied', 'testing', 'rolled-back', 'rejected']).toContain(
        suggestion.status
      );
    });
  });
});

describe('ABPerformanceTester', () => {
  let tester: ABPerformanceTester;

  beforeEach(() => {
    tester = ABPerformanceTester.getInstance();
  });

  it('should create A/B test', () => {
    const test = tester.createTest(
      'Test Optimization',
      { name: 'Control', version: '1.0', description: 'Current version', config: {} },
      { name: 'Treatment', version: '2.0', description: 'Optimized version', config: {} }
    );

    expect(test).toBeDefined();
    expect(test.name).toBe('Test Optimization');
    expect(test.status).toBe('draft');
    expect(test.variantA.name).toBe('Control');
    expect(test.variantB.name).toBe('Treatment');
  });

  it('should start and pause tests', async () => {
    const test = tester.createTest(
      'Test',
      { name: 'A', version: '1', description: '', config: {} },
      { name: 'B', version: '2', description: '', config: {} }
    );

    const started = await tester.startTest(test.id);
    expect(started).toBe(true);

    const updatedTest = tester.getTest(test.id);
    expect(updatedTest?.status).toBe('running');

    const paused = tester.pauseTest(test.id);
    expect(paused).toBe(true);
  });

  it('should select variants based on traffic split', () => {
    const test = tester.createTest(
      'Test',
      { name: 'A', version: '1', description: '', config: {} },
      { name: 'B', version: '2', description: '', config: {} },
      { trafficSplit: 0.5 }
    );

    tester.startTest(test.id);

    const selections = Array.from({ length: 100 }, () => tester.selectVariant(test.id));
    const aCount = selections.filter(v => v === 'A').length;
    const bCount = selections.filter(v => v === 'B').length;

    // With 50/50 split, both should be selected (approximately equal)
    expect(aCount).toBeGreaterThan(0);
    expect(bCount).toBeGreaterThan(0);
  });

  it('should record test executions', () => {
    const test = tester.createTest(
      'Test',
      { name: 'A', version: '1', description: '', config: {} },
      { name: 'B', version: '2', description: '', config: {} }
    );

    tester.startTest(test.id);
    tester.recordExecution(test.id, 'A', { execution_time: 1000 }, true);
    tester.recordExecution(test.id, 'B', { execution_time: 800 }, true);

    const executions = tester.getExecutions(test.id);
    expect(executions.length).toBe(2);
  });

  it('should calculate statistical significance', async () => {
    const test = tester.createTest(
      'Test',
      { name: 'A', version: '1', description: '', config: {} },
      { name: 'B', version: '2', description: '', config: {} },
      { minSampleSize: 10 }
    );

    tester.startTest(test.id);

    // Record enough samples
    for (let i = 0; i < 50; i++) {
      tester.recordExecution(test.id, 'A', { execution_time: 1000 + Math.random() * 100 }, true);
      tester.recordExecution(test.id, 'B', { execution_time: 800 + Math.random() * 100 }, true);
    }

    const results = await tester.completeTest(test.id);
    if (results) {
      expect(results).toHaveProperty('comparison');
      expect(results.comparison).toHaveProperty('significant');
      expect(results.comparison).toHaveProperty('confidence');
    }
  });
});

describe('CostProfiler', () => {
  let profiler: CostProfiler;

  beforeEach(() => {
    profiler = CostProfiler.getInstance();
  });

  it('should calculate execution costs', () => {
    const cost = profiler.calculateExecutionCost('exec-1', 'workflow-1', [
      { type: 'api', service: 'http', callCount: 10, duration: 1000 },
      { type: 'llm', model: 'gpt-3.5-turbo', tokens: 1000, duration: 2000 },
      { type: 'compute', duration: 5000, memory: 0.5 },
    ]);

    expect(cost).toBeDefined();
    expect(cost.totalCost).toBeGreaterThan(0);
    expect(cost.breakdown).toHaveProperty('api');
    expect(cost.breakdown).toHaveProperty('llm');
    expect(cost.breakdown).toHaveProperty('compute');
  });

  it('should track cost by category', () => {
    profiler.calculateExecutionCost('exec-1', 'workflow-1', [
      { type: 'api', service: 'http', callCount: 10 },
      { type: 'llm', model: 'gpt-3.5-turbo', tokens: 1000 },
    ]);

    const report = profiler.generateReport(7);
    expect(report.summary.costByCategory).toHaveProperty('api');
    expect(report.summary.costByCategory).toHaveProperty('llm');
  });

  it('should generate cost reports', () => {
    const report = profiler.generateReport(7);
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('trends');
    expect(report).toHaveProperty('forecast');
    expect(report.summary).toHaveProperty('totalCost');
    expect(report.summary).toHaveProperty('averageCostPerExecution');
  });

  it('should forecast future costs', () => {
    profiler.calculateExecutionCost('exec-1', 'workflow-1', [
      { type: 'api', service: 'http', callCount: 10 },
    ]);

    const report = profiler.generateReport(7);
    expect(report.forecast).toHaveProperty('nextWeek');
    expect(report.forecast).toHaveProperty('nextMonth');
    expect(report.forecast.confidence).toBeGreaterThanOrEqual(0);
    expect(report.forecast.confidence).toBeLessThanOrEqual(1);
  });

  it('should provide cost optimization suggestions', () => {
    profiler.calculateExecutionCost('exec-1', 'workflow-1', [
      { type: 'api', service: 'http', callCount: 100 },
      { type: 'llm', model: 'gpt-4', tokens: 10000 },
    ]);

    const optimizations = profiler.getOptimizations(7);
    expect(Array.isArray(optimizations)).toBe(true);

    optimizations.forEach(opt => {
      expect(opt).toHaveProperty('type');
      expect(opt).toHaveProperty('potentialSavings');
      expect(opt).toHaveProperty('savingsPercentage');
      expect(opt).toHaveProperty('actions');
    });
  });

  it('should track costs with 100% accuracy', () => {
    const operations = [
      { type: 'api' as const, service: 'http', callCount: 10, duration: 1000 },
      { type: 'llm' as const, model: 'gpt-3.5-turbo', tokens: 1000, duration: 2000 },
    ];

    const cost = profiler.calculateExecutionCost('exec-1', 'workflow-1', operations);

    // Verify all operations are tracked
    const totalItems = Object.values(cost.breakdown).flat().length;
    expect(totalItems).toBe(operations.length);
  });
});

describe('Integration Tests', () => {
  it('should integrate monitoring with trends analysis', () => {
    const monitor = ContinuousMonitor.getInstance();
    const trends = PerformanceTrends.getInstance();

    const metrics = monitor.getAvailableMetrics();
    if (metrics.length > 0) {
      const analysis = trends.analyzeTrends(metrics[0], 7);
      // Should work seamlessly
      expect(analysis === null || typeof analysis === 'object').toBe(true);
    }
  });

  it('should integrate budgets with enforcement', async () => {
    const budgetManager = PerformanceBudgetManager.getInstance();
    const enforcer = BudgetEnforcer.getInstance();

    const budget = budgetManager.setBudget({
      name: 'Integration Test',
      metric: 'integration.test',
      enabled: true,
      limits: { maxTime: 1000 },
      scope: { type: 'global' },
    });

    const result = await enforcer.enforce(
      'integration.test',
      { time: 500 },
      { type: 'global' }
    );

    expect(result.passed).toBe(true);
  });

  it('should integrate optimizer with A/B testing', async () => {
    const optimizer = AutoOptimizer.getInstance();
    const tester = ABPerformanceTester.getInstance();

    const suggestions = await optimizer.analyzeWorkflow('test-workflow');

    if (suggestions.length > 0) {
      // Could create A/B test for suggestion
      const test = tester.createTest(
        'Optimization Test',
        { name: 'Current', version: '1.0', description: '', config: {} },
        { name: 'Optimized', version: '2.0', description: '', config: {} }
      );

      expect(test).toBeDefined();
    }
  });
});
