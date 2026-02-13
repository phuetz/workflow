/**
 * Comprehensive Unit Tests for Analytics and ML Models
 * Tests WITHOUT mocks - using real implementations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FeatureExtractor,
  WorkflowExecutionData,
  ModelMetrics,
  PredictionResult,
} from '../analytics/MLModels';
import {
  PredictiveAnalyticsEngine,
  TimeSeriesDataPoint,
  TrendForecast,
  ResourcePrediction,
  PerformanceInsight,
  HistoricalAnalysis,
  PredictionBundle,
} from '../analytics/PredictiveAnalytics';

// Helper function to create test execution data
function createExecutionData(overrides: Partial<WorkflowExecutionData> = {}): WorkflowExecutionData {
  return {
    id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    workflowId: 'wf_test',
    nodeCount: 5,
    edgeCount: 4,
    complexity: 10,
    duration: 5000,
    success: true,
    errorCount: 0,
    retryCount: 0,
    cpuUsage: 25,
    memoryUsage: 128,
    networkCalls: 3,
    dbQueries: 2,
    cost: 0.05,
    timestamp: Date.now(),
    timeOfDay: 14,
    dayOfWeek: 3,
    hasLoops: false,
    hasConditionals: true,
    hasParallelExecution: false,
    maxDepth: 3,
    avgNodeComplexity: 2,
    ...overrides,
  };
}

// Generate sample training data
function generateTrainingData(count: number): WorkflowExecutionData[] {
  const data: WorkflowExecutionData[] = [];
  for (let i = 0; i < count; i++) {
    const nodeCount = Math.floor(Math.random() * 20) + 1;
    const complexity = Math.floor(Math.random() * 50) + 1;
    const duration = nodeCount * 500 + complexity * 100 + Math.random() * 1000;

    data.push(
      createExecutionData({
        id: `exec_${i}`,
        nodeCount,
        edgeCount: nodeCount - 1,
        complexity,
        duration,
        success: Math.random() > 0.1,
        errorCount: Math.floor(Math.random() * 3),
        networkCalls: Math.floor(Math.random() * 10),
        dbQueries: Math.floor(Math.random() * 5),
        cost: duration / 100000,
        timeOfDay: Math.floor(Math.random() * 24),
        dayOfWeek: Math.floor(Math.random() * 7),
        hasLoops: Math.random() > 0.7,
        hasConditionals: Math.random() > 0.5,
        hasParallelExecution: Math.random() > 0.8,
        maxDepth: Math.floor(Math.random() * 5) + 1,
        avgNodeComplexity: Math.random() * 5,
      })
    );
  }
  return data;
}

describe('FeatureExtractor', () => {
  describe('extractFeatures', () => {
    it('should extract features from execution data', () => {
      const data = createExecutionData();
      const features = FeatureExtractor.extractFeatures(data);

      expect(features).toBeDefined();
      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBe(14); // 14 features
    });

    it('should include nodeCount as first feature', () => {
      const data = createExecutionData({ nodeCount: 10 });
      const features = FeatureExtractor.extractFeatures(data);

      expect(features[0]).toBe(10);
    });

    it('should include edgeCount as second feature', () => {
      const data = createExecutionData({ edgeCount: 8 });
      const features = FeatureExtractor.extractFeatures(data);

      expect(features[1]).toBe(8);
    });

    it('should include complexity as third feature', () => {
      const data = createExecutionData({ complexity: 25 });
      const features = FeatureExtractor.extractFeatures(data);

      expect(features[2]).toBe(25);
    });

    it('should normalize timeOfDay to 0-1', () => {
      const data = createExecutionData({ timeOfDay: 12 });
      const features = FeatureExtractor.extractFeatures(data);

      expect(features[7]).toBe(0.5); // 12/24 = 0.5
    });

    it('should normalize dayOfWeek to 0-1', () => {
      const data = createExecutionData({ dayOfWeek: 7 });
      const features = FeatureExtractor.extractFeatures(data);

      expect(features[8]).toBe(1); // 7/7 = 1
    });

    it('should encode boolean features as 0 or 1', () => {
      const dataWithLoops = createExecutionData({ hasLoops: true });
      const dataWithoutLoops = createExecutionData({ hasLoops: false });

      const featuresWithLoops = FeatureExtractor.extractFeatures(dataWithLoops);
      const featuresWithoutLoops = FeatureExtractor.extractFeatures(dataWithoutLoops);

      expect(featuresWithLoops[9]).toBe(1);
      expect(featuresWithoutLoops[9]).toBe(0);
    });

    it('should encode hasConditionals correctly', () => {
      const data = createExecutionData({ hasConditionals: true });
      const features = FeatureExtractor.extractFeatures(data);

      expect(features[10]).toBe(1);
    });

    it('should encode hasParallelExecution correctly', () => {
      const data = createExecutionData({ hasParallelExecution: true });
      const features = FeatureExtractor.extractFeatures(data);

      expect(features[11]).toBe(1);
    });

    it('should include maxDepth', () => {
      const data = createExecutionData({ maxDepth: 5 });
      const features = FeatureExtractor.extractFeatures(data);

      expect(features[12]).toBe(5);
    });

    it('should include avgNodeComplexity', () => {
      const data = createExecutionData({ avgNodeComplexity: 3.5 });
      const features = FeatureExtractor.extractFeatures(data);

      expect(features[13]).toBe(3.5);
    });
  });

  describe('getFeatureNames', () => {
    it('should return array of feature names', () => {
      const names = FeatureExtractor.getFeatureNames();

      expect(names).toBeDefined();
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBe(14);
    });

    it('should include expected feature names', () => {
      const names = FeatureExtractor.getFeatureNames();

      expect(names).toContain('nodeCount');
      expect(names).toContain('edgeCount');
      expect(names).toContain('complexity');
      expect(names).toContain('networkCalls');
      expect(names).toContain('dbQueries');
      expect(names).toContain('timeOfDay');
      expect(names).toContain('hasLoops');
      expect(names).toContain('hasConditionals');
    });

    it('should have matching length with extractFeatures output', () => {
      const data = createExecutionData();
      const features = FeatureExtractor.extractFeatures(data);
      const names = FeatureExtractor.getFeatureNames();

      expect(features.length).toBe(names.length);
    });
  });

  describe('normalizeFeatures', () => {
    it('should normalize features using z-score', () => {
      const features = [
        [10, 20, 30],
        [20, 40, 60],
        [30, 60, 90],
      ];

      const { normalized, scaler } = FeatureExtractor.normalizeFeatures(features);

      expect(normalized).toBeDefined();
      expect(scaler).toBeDefined();
      expect(normalized.length).toBe(3);
    });

    it('should calculate mean and std for scaler', () => {
      const features = [
        [10, 100],
        [20, 200],
        [30, 300],
      ];

      const { scaler } = FeatureExtractor.normalizeFeatures(features);

      expect(scaler.mean.length).toBe(2);
      expect(scaler.std.length).toBe(2);
      expect(scaler.mean[0]).toBe(20); // Mean of [10, 20, 30]
      expect(scaler.mean[1]).toBe(200); // Mean of [100, 200, 300]
    });

    it('should produce normalized values centered around 0', () => {
      const features = [
        [10, 100],
        [20, 200],
        [30, 300],
      ];

      const { normalized } = FeatureExtractor.normalizeFeatures(features);

      // First feature of middle row should be close to 0 (it's the mean)
      expect(Math.abs(normalized[1][0])).toBeLessThan(0.001);
    });

    it('should use provided scaler if given', () => {
      const features = [[10, 20]];
      const scaler = { mean: [5, 10], std: [5, 10] };

      const { normalized, scaler: returnedScaler } = FeatureExtractor.normalizeFeatures(
        features,
        scaler
      );

      expect(returnedScaler).toBe(scaler);
      expect(normalized[0][0]).toBe(1); // (10 - 5) / 5 = 1
      expect(normalized[0][1]).toBe(1); // (20 - 10) / 10 = 1
    });

    it('should throw error for empty feature set', () => {
      expect(() => FeatureExtractor.normalizeFeatures([])).toThrow(
        'Cannot normalize empty feature set'
      );
    });
  });

  describe('calculateComplexity', () => {
    it('should calculate complexity score', () => {
      const data: Partial<WorkflowExecutionData> = {
        nodeCount: 10,
        edgeCount: 8,
        maxDepth: 3,
        hasLoops: false,
        hasConditionals: true,
        hasParallelExecution: false,
        networkCalls: 5,
        dbQueries: 3,
      };

      const complexity = FeatureExtractor.calculateComplexity(data);

      expect(complexity).toBeGreaterThan(0);
      expect(typeof complexity).toBe('number');
    });

    it('should increase complexity with nodeCount', () => {
      const low = FeatureExtractor.calculateComplexity({ nodeCount: 5 });
      const high = FeatureExtractor.calculateComplexity({ nodeCount: 20 });

      expect(high).toBeGreaterThan(low);
    });

    it('should add 5 points for loops', () => {
      const withoutLoops = FeatureExtractor.calculateComplexity({ hasLoops: false });
      const withLoops = FeatureExtractor.calculateComplexity({ hasLoops: true });

      expect(withLoops - withoutLoops).toBe(5);
    });

    it('should add 3 points for conditionals', () => {
      const without = FeatureExtractor.calculateComplexity({ hasConditionals: false });
      const with_ = FeatureExtractor.calculateComplexity({ hasConditionals: true });

      expect(with_ - without).toBe(3);
    });

    it('should add 4 points for parallel execution', () => {
      const without = FeatureExtractor.calculateComplexity({ hasParallelExecution: false });
      const with_ = FeatureExtractor.calculateComplexity({ hasParallelExecution: true });

      expect(with_ - without).toBe(4);
    });

    it('should handle missing properties gracefully', () => {
      const complexity = FeatureExtractor.calculateComplexity({});

      expect(complexity).toBe(0);
    });
  });
});

describe('WorkflowExecutionData Structure', () => {
  it('should create valid execution data', () => {
    const data = createExecutionData();

    expect(data.id).toBeDefined();
    expect(data.workflowId).toBeDefined();
    expect(data.nodeCount).toBeGreaterThan(0);
    expect(data.duration).toBeGreaterThan(0);
    expect(typeof data.success).toBe('boolean');
    expect(data.timestamp).toBeGreaterThan(0);
  });

  it('should support custom overrides', () => {
    const data = createExecutionData({
      nodeCount: 100,
      duration: 60000,
      success: false,
    });

    expect(data.nodeCount).toBe(100);
    expect(data.duration).toBe(60000);
    expect(data.success).toBe(false);
  });

  it('should have valid timeOfDay range', () => {
    const data = createExecutionData({ timeOfDay: 14 });

    expect(data.timeOfDay).toBeGreaterThanOrEqual(0);
    expect(data.timeOfDay).toBeLessThanOrEqual(23);
  });

  it('should have valid dayOfWeek range', () => {
    const data = createExecutionData({ dayOfWeek: 3 });

    expect(data.dayOfWeek).toBeGreaterThanOrEqual(0);
    expect(data.dayOfWeek).toBeLessThanOrEqual(6);
  });
});

describe('Training Data Generation', () => {
  it('should generate requested number of samples', () => {
    const data = generateTrainingData(50);

    expect(data.length).toBe(50);
  });

  it('should generate unique IDs', () => {
    const data = generateTrainingData(20);
    const ids = data.map((d) => d.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(20);
  });

  it('should generate varied data', () => {
    const data = generateTrainingData(100);
    const nodeCounts = data.map((d) => d.nodeCount);
    const uniqueNodeCounts = new Set(nodeCounts);

    expect(uniqueNodeCounts.size).toBeGreaterThan(5);
  });

  it('should correlate duration with complexity', () => {
    const data = generateTrainingData(50);

    // Sort by complexity
    const sorted = [...data].sort((a, b) => a.complexity - b.complexity);

    // Average duration of low complexity should be less than high complexity
    const lowComplexity = sorted.slice(0, 10);
    const highComplexity = sorted.slice(-10);

    const avgLow = lowComplexity.reduce((sum, d) => sum + d.duration, 0) / 10;
    const avgHigh = highComplexity.reduce((sum, d) => sum + d.duration, 0) / 10;

    // High complexity workflows should generally take longer
    // (Not guaranteed due to randomness, but should be true most of the time)
    expect(avgHigh).toBeGreaterThan(avgLow * 0.5);
  });
});

describe('ResourcePrediction Structure', () => {
  it('should define valid resource prediction interface', () => {
    const prediction: ResourcePrediction = {
      cpu: { average: 30, peak: 50, confidence: 0.8 },
      memory: { average: 256, peak: 512, confidence: 0.75 },
      network: { bandwidth: 10, requests: 20 },
      storage: { reads: 100, writes: 50 },
    };

    expect(prediction.cpu.average).toBeLessThanOrEqual(prediction.cpu.peak);
    expect(prediction.memory.average).toBeLessThanOrEqual(prediction.memory.peak);
    expect(prediction.cpu.confidence).toBeGreaterThanOrEqual(0);
    expect(prediction.cpu.confidence).toBeLessThanOrEqual(1);
  });
});

describe('PerformanceInsight Structure', () => {
  it('should define valid performance insight interface', () => {
    const insight: PerformanceInsight = {
      type: 'bottleneck',
      severity: 'high',
      title: 'High Memory Usage',
      description: 'Memory usage exceeds recommended threshold',
      metric: 'memory_usage',
      currentValue: 512,
      expectedValue: 256,
      impact: 'May cause slowdowns',
      recommendation: 'Optimize data processing',
      confidence: 0.85,
    };

    expect(['bottleneck', 'optimization', 'warning', 'trend']).toContain(insight.type);
    expect(['low', 'medium', 'high', 'critical']).toContain(insight.severity);
    expect(insight.confidence).toBeGreaterThanOrEqual(0);
    expect(insight.confidence).toBeLessThanOrEqual(1);
  });
});

describe('PredictionResult Structure', () => {
  it('should define valid prediction result interface', () => {
    const result: PredictionResult = {
      value: 5000,
      confidence: 0.85,
      confidenceInterval: [4000, 6000],
      features: { nodeCount: 10, complexity: 20 },
      modelVersion: '1.0.0',
    };

    expect(result.value).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.confidenceInterval[0]).toBeLessThan(result.confidenceInterval[1]);
    expect(result.confidenceInterval[0]).toBeLessThanOrEqual(result.value);
    expect(result.confidenceInterval[1]).toBeGreaterThanOrEqual(result.value);
  });
});

describe('ModelMetrics Structure', () => {
  it('should define valid model metrics interface', () => {
    const metrics: ModelMetrics = {
      mse: 1000,
      rmse: 31.62,
      mae: 25,
      r2: 0.92,
      accuracy: 0.95,
      precision: 0.93,
      recall: 0.91,
      f1Score: 0.92,
      trainingTime: 5000,
      sampleCount: 1000,
    };

    expect(metrics.r2).toBeGreaterThanOrEqual(0);
    expect(metrics.r2).toBeLessThanOrEqual(1);
    expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
    expect(metrics.accuracy).toBeLessThanOrEqual(1);
    expect(metrics.sampleCount).toBeGreaterThan(0);
  });

  it('should have consistent RMSE calculation', () => {
    const mse = 100;
    const rmse = Math.sqrt(mse);

    expect(rmse).toBe(10);
  });
});

describe('TimeSeriesDataPoint Structure', () => {
  it('should define valid time series data point', () => {
    const point: TimeSeriesDataPoint = {
      timestamp: Date.now(),
      value: 42,
      workflowId: 'wf_test',
    };

    expect(point.timestamp).toBeGreaterThan(0);
    expect(typeof point.value).toBe('number');
  });

  it('should allow optional workflowId', () => {
    const point: TimeSeriesDataPoint = {
      timestamp: Date.now(),
      value: 100,
    };

    expect(point.workflowId).toBeUndefined();
  });
});

describe('TrendForecast Structure', () => {
  it('should define valid trend forecast', () => {
    const forecast: TrendForecast = {
      predictions: [
        { timestamp: Date.now(), value: 100, lower: 90, upper: 110 },
        { timestamp: Date.now() + 3600000, value: 105, lower: 93, upper: 117 },
      ],
      trend: 'increasing',
      trendStrength: 0.75,
      seasonality: {
        detected: true,
        period: 86400000, // Daily
        strength: 0.6,
      },
    };

    expect(['increasing', 'decreasing', 'stable']).toContain(forecast.trend);
    expect(forecast.trendStrength).toBeGreaterThanOrEqual(0);
    expect(forecast.trendStrength).toBeLessThanOrEqual(1);
    expect(forecast.predictions.length).toBeGreaterThan(0);
  });

  it('should have valid prediction bounds', () => {
    const forecast: TrendForecast = {
      predictions: [{ timestamp: Date.now(), value: 100, lower: 80, upper: 120 }],
      trend: 'stable',
      trendStrength: 0.5,
    };

    const pred = forecast.predictions[0];
    expect(pred.lower).toBeLessThanOrEqual(pred.value);
    expect(pred.upper).toBeGreaterThanOrEqual(pred.value);
  });
});

describe('HistoricalAnalysis Structure', () => {
  it('should define valid historical analysis', () => {
    const analysis: HistoricalAnalysis = {
      totalExecutions: 1000,
      successRate: 0.95,
      averageDuration: 5000,
      medianDuration: 4500,
      p95Duration: 12000,
      p99Duration: 20000,
      failureRate: 0.05,
      averageCost: 0.05,
      totalCost: 50,
      trends: {
        duration: 'improving',
        successRate: 'stable',
        cost: 'degrading',
      },
      timeDistribution: {
        hour: { 9: 100, 10: 150, 11: 200 },
        dayOfWeek: { 1: 200, 2: 250, 3: 180 },
      },
      insights: [],
    };

    expect(analysis.successRate + analysis.failureRate).toBeCloseTo(1, 5);
    expect(analysis.medianDuration).toBeLessThanOrEqual(analysis.p95Duration);
    expect(analysis.p95Duration).toBeLessThanOrEqual(analysis.p99Duration);
    expect(['improving', 'degrading', 'stable']).toContain(analysis.trends.duration);
  });
});

describe('Feature Engineering Integration', () => {
  it('should extract and normalize features correctly', () => {
    const data = generateTrainingData(10);
    const features = data.map((d) => FeatureExtractor.extractFeatures(d));
    const { normalized, scaler } = FeatureExtractor.normalizeFeatures(features);

    expect(normalized.length).toBe(10);
    expect(normalized[0].length).toBe(14);
    expect(scaler.mean.length).toBe(14);
    expect(scaler.std.length).toBe(14);
  });

  it('should maintain feature order consistency', () => {
    const data1 = createExecutionData({ nodeCount: 10 });
    const data2 = createExecutionData({ nodeCount: 20 });

    const features1 = FeatureExtractor.extractFeatures(data1);
    const features2 = FeatureExtractor.extractFeatures(data2);

    // NodeCount is first feature
    expect(features1[0]).toBe(10);
    expect(features2[0]).toBe(20);
  });

  it('should calculate complexity consistently', () => {
    const data1 = createExecutionData({
      nodeCount: 10,
      edgeCount: 9,
      hasLoops: true,
      hasConditionals: true,
    });

    const data2 = createExecutionData({
      nodeCount: 10,
      edgeCount: 9,
      hasLoops: true,
      hasConditionals: true,
    });

    const c1 = FeatureExtractor.calculateComplexity(data1);
    const c2 = FeatureExtractor.calculateComplexity(data2);

    expect(c1).toBe(c2);
  });
});
