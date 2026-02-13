/**
 * Tests for ML Models
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FeatureExtractor,
  ExecutionTimePredictionModel,
  FailurePredictionModel,
  CostPredictionModel,
  MLModelManager,
  WorkflowExecutionData,
} from '../../analytics/MLModels';

describe('FeatureExtractor', () => {
  it('should extract features from execution data', () => {
    const data: WorkflowExecutionData = {
      id: 'test-1',
      workflowId: 'wf-1',
      nodeCount: 10,
      edgeCount: 9,
      complexity: 15,
      duration: 30000,
      success: true,
      errorCount: 0,
      retryCount: 0,
      cpuUsage: 50,
      memoryUsage: 200,
      networkCalls: 5,
      dbQueries: 3,
      cost: 0.01,
      timestamp: Date.now(),
      timeOfDay: 14,
      dayOfWeek: 3,
      hasLoops: true,
      hasConditionals: true,
      hasParallelExecution: false,
      maxDepth: 4,
      avgNodeComplexity: 1.5,
    };

    const features = FeatureExtractor.extractFeatures(data);

    expect(features).toHaveLength(14);
    expect(features[0]).toBe(10); // nodeCount
    expect(features[1]).toBe(9); // edgeCount
    expect(features[2]).toBe(15); // complexity
  });

  it('should calculate workflow complexity', () => {
    const complexity = FeatureExtractor.calculateComplexity({
      nodeCount: 10,
      edgeCount: 9,
      maxDepth: 4,
      hasLoops: true,
      hasConditionals: true,
      networkCalls: 5,
      dbQueries: 3,
    });

    expect(complexity).toBeGreaterThan(0);
    expect(complexity).toBeLessThan(100);
  });

  it('should normalize features', () => {
    const features = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ];

    const { normalized, scaler } = FeatureExtractor.normalizeFeatures(features);

    expect(normalized).toHaveLength(3);
    expect(scaler.mean).toHaveLength(3);
    expect(scaler.std).toHaveLength(3);

    // Mean should be close to 0 after normalization
    const col0Mean =
      normalized.reduce((sum, f) => sum + f[0], 0) / normalized.length;
    expect(Math.abs(col0Mean)).toBeLessThan(0.1);
  });
});

describe('ExecutionTimePredictionModel', () => {
  let model: ExecutionTimePredictionModel;
  let trainingData: WorkflowExecutionData[];

  beforeEach(() => {
    model = new ExecutionTimePredictionModel();
    trainingData = generateMockData(50);
  });

  it('should train successfully', async () => {
    const metrics = await model.train(trainingData);

    expect(metrics).toBeDefined();
    expect(metrics.mse).toBeGreaterThan(0);
    expect(metrics.rmse).toBeGreaterThan(0);
    expect(metrics.mae).toBeGreaterThan(0);
    expect(metrics.r2).toBeDefined();
    expect(Number.isFinite(metrics.r2)).toBe(true);
    expect(metrics.sampleCount).toBe(50);
  });

  it('should make predictions after training', async () => {
    await model.train(trainingData);

    const prediction = await model.predict({
      nodeCount: 10,
      edgeCount: 9,
      complexity: 15,
      networkCalls: 5,
      dbQueries: 3,
    });

    expect(prediction).toBeDefined();
    expect(prediction.value).toBeGreaterThan(0);
    expect(prediction.confidence).toBeGreaterThanOrEqual(0);
    expect(prediction.confidence).toBeLessThanOrEqual(1);
    expect(prediction.confidenceInterval).toHaveLength(2);
    expect(prediction.confidenceInterval[0]).toBeLessThan(
      prediction.confidenceInterval[1]
    );
  });

  it('should update with online learning', async () => {
    await model.train(trainingData);

    const newData = generateMockData(10);
    await model.updateOnline(newData);

    // Model should still be able to predict
    const prediction = await model.predict({
      nodeCount: 5,
      edgeCount: 4,
      complexity: 8,
    });

    expect(prediction.value).toBeGreaterThan(0);
  });
});

describe('FailurePredictionModel', () => {
  let model: FailurePredictionModel;
  let trainingData: WorkflowExecutionData[];

  beforeEach(() => {
    model = new FailurePredictionModel();
    trainingData = generateMockData(50);
  });

  it('should train successfully', async () => {
    const metrics = await model.train(trainingData);

    expect(metrics).toBeDefined();
    expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
    expect(metrics.accuracy).toBeLessThanOrEqual(1);
    expect(metrics.precision).toBeGreaterThanOrEqual(0);
    expect(metrics.recall).toBeGreaterThanOrEqual(0);
    expect(metrics.f1Score).toBeGreaterThanOrEqual(0);
  });

  it('should predict failure probability', async () => {
    await model.train(trainingData);

    const prediction = await model.predict({
      nodeCount: 10,
      edgeCount: 9,
      complexity: 20,
      errorCount: 2,
      retryCount: 1,
    });

    expect(prediction.value).toBeGreaterThanOrEqual(0);
    expect(prediction.value).toBeLessThanOrEqual(1);
    expect(prediction.confidence).toBeGreaterThanOrEqual(0);
    expect(prediction.confidence).toBeLessThanOrEqual(1);
  });
});

describe('CostPredictionModel', () => {
  let model: CostPredictionModel;
  let trainingData: WorkflowExecutionData[];

  beforeEach(() => {
    model = new CostPredictionModel();
    trainingData = generateMockData(50);
  });

  it('should train successfully', async () => {
    const metrics = await model.train(trainingData);

    expect(metrics).toBeDefined();
    expect(metrics.mse).toBeDefined();
    expect(Number.isFinite(metrics.mse)).toBe(true);
    expect(metrics.r2).toBeDefined();
  });

  it('should predict cost', async () => {
    await model.train(trainingData);

    const prediction = await model.predict({
      nodeCount: 10,
      edgeCount: 9,
      networkCalls: 5,
      dbQueries: 3,
    });

    expect(prediction.value).toBeDefined();
    expect(Number.isFinite(prediction.value)).toBe(true);
  });
});

describe('MLModelManager', () => {
  let manager: MLModelManager;
  let trainingData: WorkflowExecutionData[];

  beforeEach(() => {
    manager = new MLModelManager();
    trainingData = generateMockData(50);
  });

  it('should train all models', async () => {
    const metrics = await manager.trainAll(trainingData);

    expect(metrics.executionTime).toBeDefined();
    expect(metrics.failure).toBeDefined();
    expect(metrics.cost).toBeDefined();
  });

  it('should predict all metrics', async () => {
    await manager.trainAll(trainingData);

    const predictions = await manager.predictAll({
      nodeCount: 10,
      edgeCount: 9,
      complexity: 15,
    });

    expect(predictions.executionTime).toBeDefined();
    expect(predictions.failureProbability).toBeDefined();
    expect(predictions.cost).toBeDefined();
  });
});

// Helper function to generate mock data
function generateMockData(count: number): WorkflowExecutionData[] {
  const data: WorkflowExecutionData[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const nodeCount = 5 + Math.floor(Math.random() * 15);
    const edgeCount = nodeCount - 1;
    const complexity = 10 + Math.random() * 20;
    const duration = 10000 + complexity * 1000 + Math.random() * 20000;
    const success = Math.random() > 0.1;

    data.push({
      id: `test-${i}`,
      workflowId: 'wf-test',
      nodeCount,
      edgeCount,
      complexity,
      duration,
      success,
      errorCount: success ? 0 : Math.floor(Math.random() * 3),
      retryCount: success ? 0 : Math.floor(Math.random() * 2),
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
