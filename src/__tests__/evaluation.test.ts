/**
 * Evaluation Framework Tests
 * Comprehensive tests for the AI evaluation framework
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EvaluationEngine } from '../evaluation/EvaluationEngine';
import { MetricRegistry } from '../evaluation/MetricRegistry';
import { EvaluationRunner } from '../evaluation/EvaluationRunner';
import { TestSuiteRunner, TestSuiteManager } from '../evaluation/TestSuite';
import { DebugDataPinner } from '../evaluation/DebugDataPinner';
import { registerAllMetrics } from '../evaluation/metrics';
import type { Evaluation, EvaluationInput, MetricConfig } from '../types/evaluation';

describe('EvaluationEngine', () => {
  let engine: EvaluationEngine;
  let registry: MetricRegistry;

  beforeEach(() => {
    registry = new MetricRegistry();
    registerAllMetrics(registry);
    engine = new EvaluationEngine({ metricRegistry: registry });
  });

  it('should create an evaluation engine', () => {
    expect(engine).toBeDefined();
    expect(engine.getMetricRegistry()).toBe(registry);
  });

  it('should validate evaluation configuration', () => {
    const evaluation: Evaluation = {
      id: 'test-eval-1',
      name: 'Test Evaluation',
      workflowId: 'workflow-1',
      metrics: [
        {
          id: 'metric-1',
          type: 'correctness',
          name: 'Correctness',
          description: 'Test correctness',
          enabled: true,
          weight: 1,
          threshold: 0.7,
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
          name: 'Test Input 1',
          data: { question: 'What is 2+2?' },
          expectedOutput: '4',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validation = engine.validateEvaluation(evaluation);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should reject invalid evaluation configuration', () => {
    const evaluation: Evaluation = {
      id: '',
      name: '',
      workflowId: '',
      metrics: [],
      inputs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validation = engine.validateEvaluation(evaluation);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should evaluate input with mock execution', async () => {
    const mockExecution = vi.fn().mockResolvedValue('4');
    engine.setExecutionCallback(mockExecution);

    const evaluation: Evaluation = {
      id: 'test-eval-1',
      name: 'Test Evaluation',
      workflowId: 'workflow-1',
      metrics: [
        {
          id: 'metric-latency',
          type: 'latency',
          name: 'Latency',
          description: 'Test latency',
          enabled: true,
          weight: 1,
          threshold: 0.7,
          config: {
            maxLatency: 10000,
          },
        },
      ],
      inputs: [
        {
          id: 'input-1',
          name: 'Test Input 1',
          data: { question: 'What is 2+2?' },
          expectedOutput: '4',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await engine.evaluateInput(evaluation, evaluation.inputs[0]);

    expect(result).toBeDefined();
    expect(result.inputId).toBe('input-1');
    expect(result.status).toBe('completed');
    expect(result.metrics).toHaveLength(1);
    expect(mockExecution).toHaveBeenCalledWith('workflow-1', { question: 'What is 2+2?' });
  });
});

describe('MetricRegistry', () => {
  let registry: MetricRegistry;

  beforeEach(() => {
    registry = new MetricRegistry();
  });

  it('should register metrics', () => {
    expect(registry.size()).toBe(0);
    registerAllMetrics(registry);
    expect(registry.size()).toBe(6); // 6 metrics
  });

  it('should get metric by type', () => {
    registerAllMetrics(registry);
    const metric = registry.get('correctness');
    expect(metric).toBeDefined();
    expect(metric?.type).toBe('correctness');
  });

  it('should create metric config with defaults', () => {
    registerAllMetrics(registry);
    const config = registry.createConfig('latency');
    expect(config).toBeDefined();
    expect(config?.type).toBe('latency');
    expect(config?.enabled).toBe(true);
  });

  it('should validate metric config', () => {
    registerAllMetrics(registry);
    const config: MetricConfig = {
      id: 'test-metric',
      type: 'latency',
      name: 'Latency Test',
      description: 'Test',
      enabled: true,
      weight: 1,
      config: {
        maxLatency: 5000,
      },
    };

    const validation = registry.validate(config);
    expect(validation.valid).toBe(true);
  });
});

describe('EvaluationRunner', () => {
  let engine: EvaluationEngine;
  let runner: EvaluationRunner;

  beforeEach(() => {
    const registry = new MetricRegistry();
    registerAllMetrics(registry);
    engine = new EvaluationEngine({ metricRegistry: registry });
    engine.setExecutionCallback(async () => 'test output');
    runner = new EvaluationRunner(engine);
  });

  it('should run evaluation sequentially', async () => {
    const evaluation: Evaluation = {
      id: 'test-eval-1',
      name: 'Test Evaluation',
      workflowId: 'workflow-1',
      metrics: [
        {
          id: 'metric-latency',
          type: 'latency',
          name: 'Latency',
          description: 'Test latency',
          enabled: true,
          weight: 1,
          config: {
            maxLatency: 10000,
          },
        },
      ],
      inputs: [
        {
          id: 'input-1',
          name: 'Test Input 1',
          data: { test: 'data1' },
        },
        {
          id: 'input-2',
          name: 'Test Input 2',
          data: { test: 'data2' },
        },
      ],
      settings: {
        parallel: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const run = await runner.run(evaluation);

    expect(run).toBeDefined();
    expect(run.status).toBe('completed');
    expect(run.results).toHaveLength(2);
    expect(run.summary.totalTests).toBe(2);
  });

  it('should handle evaluation failures gracefully', async () => {
    engine.setExecutionCallback(async () => {
      throw new Error('Execution failed');
    });

    const evaluation: Evaluation = {
      id: 'test-eval-1',
      name: 'Test Evaluation',
      workflowId: 'workflow-1',
      metrics: [
        {
          id: 'metric-latency',
          type: 'latency',
          name: 'Latency',
          description: 'Test latency',
          enabled: true,
          weight: 1,
          config: {
            maxLatency: 10000,
          },
        },
      ],
      inputs: [
        {
          id: 'input-1',
          name: 'Test Input 1',
          data: { test: 'data' },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const run = await runner.run(evaluation);

    expect(run).toBeDefined();
    expect(run.results).toHaveLength(1);
    expect(run.results[0].status).toBe('failed');
  });
});

describe('TestSuiteManager', () => {
  let manager: TestSuiteManager;

  beforeEach(() => {
    manager = new TestSuiteManager();
  });

  it('should create test suite', () => {
    const suite = manager.create('Test Suite', ['eval-1', 'eval-2']);
    expect(suite).toBeDefined();
    expect(suite.name).toBe('Test Suite');
    expect(suite.evaluations).toHaveLength(2);
  });

  it('should get test suite', () => {
    const suite = manager.create('Test Suite', ['eval-1']);
    const retrieved = manager.get(suite.id);
    expect(retrieved).toEqual(suite);
  });

  it('should add evaluation to suite', () => {
    const suite = manager.create('Test Suite', ['eval-1']);
    const success = manager.addEvaluation(suite.id, 'eval-2');
    expect(success).toBe(true);

    const updated = manager.get(suite.id);
    expect(updated?.evaluations).toHaveLength(2);
  });

  it('should remove evaluation from suite', () => {
    const suite = manager.create('Test Suite', ['eval-1', 'eval-2']);
    const success = manager.removeEvaluation(suite.id, 'eval-1');
    expect(success).toBe(true);

    const updated = manager.get(suite.id);
    expect(updated?.evaluations).toHaveLength(1);
    expect(updated?.evaluations[0]).toBe('eval-2');
  });
});

describe('DebugDataPinner', () => {
  let pinner: DebugDataPinner;

  beforeEach(() => {
    pinner = new DebugDataPinner();
  });

  it('should pin data', async () => {
    const pinned = await pinner.pin({
      evaluationId: 'eval-1',
      evaluationResultId: 'result-1',
      inputId: 'input-1',
      nodeId: 'node-1',
      data: { test: 'data' },
      reason: 'manual',
    });

    expect(pinned).toBeDefined();
    expect(pinned.evaluationId).toBe('eval-1');
    expect(pinned.nodeId).toBe('node-1');
  });

  it('should get pinned data by id', async () => {
    const pinned = await pinner.pin({
      evaluationId: 'eval-1',
      evaluationResultId: 'result-1',
      inputId: 'input-1',
      nodeId: 'node-1',
      data: { test: 'data' },
    });

    const retrieved = await pinner.get(pinned.id);
    expect(retrieved).toEqual(pinned);
  });

  it('should get pinned data for evaluation', async () => {
    await pinner.pin({
      evaluationId: 'eval-1',
      evaluationResultId: 'result-1',
      inputId: 'input-1',
      nodeId: 'node-1',
      data: { test: 'data1' },
    });

    await pinner.pin({
      evaluationId: 'eval-1',
      evaluationResultId: 'result-2',
      inputId: 'input-2',
      nodeId: 'node-2',
      data: { test: 'data2' },
    });

    const results = await pinner.getForEvaluation('eval-1');
    expect(results).toHaveLength(2);
  });

  it('should unpin data', async () => {
    const pinned = await pinner.pin({
      evaluationId: 'eval-1',
      evaluationResultId: 'result-1',
      inputId: 'input-1',
      nodeId: 'node-1',
      data: { test: 'data' },
    });

    const success = await pinner.unpin(pinned.id);
    expect(success).toBe(true);

    const retrieved = await pinner.get(pinned.id);
    expect(retrieved).toBeNull();
  });

  it('should get statistics', async () => {
    await pinner.pin({
      evaluationId: 'eval-1',
      evaluationResultId: 'result-1',
      inputId: 'input-1',
      nodeId: 'node-1',
      data: { test: 'data' },
      reason: 'failure',
    });

    await pinner.pin({
      evaluationId: 'eval-2',
      evaluationResultId: 'result-2',
      inputId: 'input-2',
      nodeId: 'node-2',
      data: { test: 'data' },
      reason: 'manual',
    });

    const stats = pinner.getStats();
    expect(stats.total).toBe(2);
    expect(stats.byReason.failure).toBe(1);
    expect(stats.byReason.manual).toBe(1);
  });
});

describe('Metric Integration Tests', () => {
  it('should execute latency metric', async () => {
    const registry = new MetricRegistry();
    registerAllMetrics(registry);

    const executor = registry.getExecutor('latency');
    expect(executor).toBeDefined();

    const input: EvaluationInput = {
      id: 'input-1',
      name: 'Test',
      data: { test: 'data' },
    };

    const config: MetricConfig = {
      id: 'metric-1',
      type: 'latency',
      name: 'Latency',
      description: 'Test',
      enabled: true,
      weight: 1,
      config: {
        maxLatency: 10000,
      },
    };

    const result = await executor!(input, 'output', config, {
      workflowId: 'workflow-1',
      startTime: new Date(),
      nodeResults: {
        duration: 500,
      },
    });

    expect(result).toBeDefined();
    expect(result.metricType).toBe('latency');
    expect(result.score).toBeGreaterThan(0);
  });

  it('should execute cost metric', async () => {
    const registry = new MetricRegistry();
    registerAllMetrics(registry);

    const executor = registry.getExecutor('cost');
    expect(executor).toBeDefined();

    const input: EvaluationInput = {
      id: 'input-1',
      name: 'Test',
      data: { test: 'data' },
    };

    const config: MetricConfig = {
      id: 'metric-1',
      type: 'cost',
      name: 'Cost',
      description: 'Test',
      enabled: true,
      weight: 1,
      config: {
        maxCost: 1.0,
      },
    };

    const result = await executor!(input, 'output', config, {
      workflowId: 'workflow-1',
      startTime: new Date(),
      nodeResults: {
        nodes: {
          'node-1': {
            usage: {
              model: 'gpt-4',
              promptTokens: 100,
              completionTokens: 50,
            },
          },
        },
      },
    });

    expect(result).toBeDefined();
    expect(result.metricType).toBe('cost');
    expect(result.score).toBeGreaterThan(0);
  });
});
