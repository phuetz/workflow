/**
 * Tests for Predictive Analytics Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PredictiveAnalyticsEngine,
  getPredictiveAnalyticsEngine,
} from '../../analytics/PredictiveAnalytics';
import { WorkflowExecutionData } from '../../analytics/MLModels';

describe('PredictiveAnalyticsEngine', () => {
  let engine: PredictiveAnalyticsEngine;
  let trainingData: WorkflowExecutionData[];

  beforeEach(() => {
    engine = new PredictiveAnalyticsEngine();
    trainingData = generateMockData(100);
  });

  it('should initialize with training data', async () => {
    await engine.initialize(trainingData);

    expect(engine.isReady()).toBe(true);
    expect(engine.getHistoricalDataSize()).toBe(100);
  });

  it('should throw error with insufficient data', async () => {
    const insufficientData = generateMockData(5);

    await expect(engine.initialize(insufficientData)).rejects.toThrow(
      'Insufficient data for training'
    );
  });

  it('should predict workflow metrics', async () => {
    await engine.initialize(trainingData);

    const prediction = await engine.predict({
      nodeCount: 10,
      edgeCount: 9,
      complexity: 15,
      networkCalls: 5,
      dbQueries: 3,
    });

    expect(prediction).toBeDefined();
    expect(prediction.executionTime).toBeDefined();
    expect(prediction.failureProbability).toBeDefined();
    expect(prediction.cost).toBeDefined();
    expect(prediction.resources).toBeDefined();
    expect(prediction.insights).toBeInstanceOf(Array);
    expect(prediction.confidence).toBeGreaterThanOrEqual(0);
    expect(prediction.confidence).toBeLessThanOrEqual(1);
  });

  it('should analyze historical data', async () => {
    await engine.initialize(trainingData);

    const analysis = await engine.analyzeHistory('wf-1');

    expect(analysis).toBeDefined();
    expect(analysis.totalExecutions).toBeGreaterThan(0);
    expect(analysis.successRate).toBeGreaterThanOrEqual(0);
    expect(analysis.successRate).toBeLessThanOrEqual(1);
    expect(analysis.averageDuration).toBeGreaterThan(0);
    expect(analysis.medianDuration).toBeGreaterThan(0);
    expect(analysis.trends).toBeDefined();
  });

  it('should forecast trends', async () => {
    await engine.initialize(trainingData);

    const timeSeriesData = generateTimeSeriesData(30);
    const forecast = await engine.forecastTrend(timeSeriesData, 7);

    expect(forecast).toBeDefined();
    expect(forecast.predictions).toHaveLength(7);
    expect(forecast.trend).toMatch(/^(increasing|decreasing|stable)$/);
    expect(forecast.trendStrength).toBeGreaterThanOrEqual(0);
    expect(forecast.trendStrength).toBeLessThanOrEqual(1);
  });

  it('should update with new data', async () => {
    await engine.initialize(trainingData);

    const newData = generateMockData(10);
    await engine.updateWithNewData(newData);

    expect(engine.getHistoricalDataSize()).toBe(110);
  });

  it('should generate performance insights', async () => {
    await engine.initialize(trainingData);

    const prediction = await engine.predict({
      nodeCount: 20,
      edgeCount: 19,
      complexity: 50,
      networkCalls: 15,
      dbQueries: 10,
    });

    expect(prediction.insights.length).toBeGreaterThan(0);

    const insight = prediction.insights[0];
    expect(insight.type).toBeDefined();
    expect(insight.severity).toMatch(/^(low|medium|high|critical)$/);
    expect(insight.title).toBeTruthy();
    expect(insight.description).toBeTruthy();
    expect(insight.recommendation).toBeTruthy();
  });

  it('should detect high failure risk', async () => {
    await engine.initialize(trainingData);

    const prediction = await engine.predict({
      nodeCount: 30,
      edgeCount: 29,
      complexity: 80,
      errorCount: 5,
      retryCount: 3,
    });

    const failureInsight = prediction.insights.find((i) =>
      i.title.includes('Failure')
    );

    if (prediction.failureProbability.value > 0.3) {
      expect(failureInsight).toBeDefined();
    }
  });

  it('should calculate model metrics', async () => {
    await engine.initialize(trainingData);

    const metrics = engine.getModelMetrics();

    expect(metrics.executionTime).toBeDefined();
    expect(metrics.failure).toBeDefined();
    expect(metrics.cost).toBeDefined();
  });
});

describe('getPredictiveAnalyticsEngine (singleton)', () => {
  it('should return the same instance', () => {
    const instance1 = getPredictiveAnalyticsEngine();
    const instance2 = getPredictiveAnalyticsEngine();

    expect(instance1).toBe(instance2);
  });
});

// Helper functions
function generateMockData(count: number): WorkflowExecutionData[] {
  const data: WorkflowExecutionData[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const nodeCount = 5 + Math.floor(Math.random() * 15);
    const complexity = 10 + Math.random() * 30;

    data.push({
      id: `exec-${i}`,
      workflowId: `wf-${Math.floor(Math.random() * 3)}`,
      nodeCount,
      edgeCount: nodeCount - 1,
      complexity,
      duration: 10000 + complexity * 1000 + Math.random() * 20000,
      success: Math.random() > 0.1,
      errorCount: Math.random() > 0.9 ? Math.floor(Math.random() * 3) : 0,
      retryCount: Math.random() > 0.8 ? Math.floor(Math.random() * 2) : 0,
      cpuUsage: 20 + Math.random() * 60,
      memoryUsage: 100 + Math.random() * 400,
      networkCalls: Math.floor(Math.random() * 10),
      dbQueries: Math.floor(Math.random() * 8),
      cost: 0.001 + Math.random() * 0.05,
      timestamp: now - i * 3600000,
      timeOfDay: Math.floor(Math.random() * 24),
      dayOfWeek: Math.floor(Math.random() * 7),
      hasLoops: Math.random() > 0.7,
      hasConditionals: Math.random() > 0.5,
      hasParallelExecution: Math.random() > 0.6,
      maxDepth: 3 + Math.floor(Math.random() * 5),
      avgNodeComplexity: 1 + Math.random() * 3,
    });
  }

  return data;
}

function generateTimeSeriesData(days: number) {
  const data = [];
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  for (let i = days; i >= 0; i--) {
    data.push({
      timestamp: now - i * msPerDay,
      value: 30000 + Math.random() * 20000,
    });
  }

  return data;
}
