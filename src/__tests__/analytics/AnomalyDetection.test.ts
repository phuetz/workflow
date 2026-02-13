/**
 * Tests for Anomaly Detection System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  StatisticalAnomalyDetector,
  IsolationForestDetector,
  AnomalyDetectionEngine,
  getAnomalyDetectionEngine,
} from '../../analytics/AnomalyDetection';
import { WorkflowExecutionData } from '../../analytics/MLModels';

describe('StatisticalAnomalyDetector', () => {
  describe('Z-score method', () => {
    it('should detect anomalies using z-score', () => {
      const values = [10, 12, 11, 13, 10, 12, 100]; // 100 is anomaly
      const anomalies = StatisticalAnomalyDetector.detectWithZScore(values, 2); // Lower threshold

      expect(anomalies).toHaveLength(7);
      expect(anomalies[6]).toBe(true); // Last value is anomaly
    });

    it('should handle small datasets', () => {
      const values = [1, 2];
      const anomalies = StatisticalAnomalyDetector.detectWithZScore(values);

      expect(anomalies).toHaveLength(2);
      expect(anomalies.every((a) => !a)).toBe(true);
    });

    it('should handle constant values', () => {
      const values = [5, 5, 5, 5, 5];
      const anomalies = StatisticalAnomalyDetector.detectWithZScore(values);

      expect(anomalies.every((a) => !a)).toBe(true);
    });
  });

  describe('Modified Z-score method', () => {
    it('should detect anomalies using modified z-score', () => {
      const values = [10, 12, 11, 13, 10, 12, 100];
      const anomalies = StatisticalAnomalyDetector.detectWithModifiedZScore(values);

      expect(anomalies[6]).toBe(true);
    });

    it('should be robust to outliers', () => {
      const values = [10, 12, 11, 100, 13, 10, 12]; // Outlier in middle
      const anomalies = StatisticalAnomalyDetector.detectWithModifiedZScore(
        values,
        3.5
      );

      expect(anomalies[3]).toBe(true);
    });
  });

  describe('IQR method', () => {
    it('should detect anomalies using IQR', () => {
      const values = [10, 12, 11, 13, 10, 12, 100];
      const anomalies = StatisticalAnomalyDetector.detectWithIQR(values);

      expect(anomalies[6]).toBe(true);
    });

    it('should handle different multipliers', () => {
      const values = [10, 12, 11, 13, 10, 12, 20];
      const anomalies1 = StatisticalAnomalyDetector.detectWithIQR(values, 1.5);
      const anomalies2 = StatisticalAnomalyDetector.detectWithIQR(values, 3);

      // More lenient threshold should detect fewer anomalies
      const count1 = anomalies1.filter((a) => a).length;
      const count2 = anomalies2.filter((a) => a).length;

      expect(count2).toBeLessThanOrEqual(count1);
    });
  });

  describe('Anomaly score', () => {
    it('should calculate anomaly score', () => {
      const values = [10, 12, 11, 13, 10, 12];
      const normalScore = StatisticalAnomalyDetector.calculateAnomalyScore(11, values);
      const anomalyScore = StatisticalAnomalyDetector.calculateAnomalyScore(
        100,
        values
      );

      expect(normalScore).toBeGreaterThanOrEqual(0);
      expect(normalScore).toBeLessThanOrEqual(1);
      expect(anomalyScore).toBeGreaterThanOrEqual(0);
      expect(anomalyScore).toBeLessThanOrEqual(1);
      expect(anomalyScore).toBeGreaterThan(normalScore);
    });
  });
});

describe('IsolationForestDetector', () => {
  it('should train on data', () => {
    const detector = new IsolationForestDetector();
    const data = generateNormalData(100);

    expect(() => detector.train(data)).not.toThrow();
  });

  it('should detect anomalies', () => {
    const detector = new IsolationForestDetector();
    const normalData = generateNormalData(100);

    detector.train(normalData);

    // Normal point
    const normalScore = detector.predict([50, 50]);
    expect(normalScore).toBeGreaterThanOrEqual(0);
    expect(normalScore).toBeLessThanOrEqual(1);

    // Anomaly point
    const anomalyScore = detector.predict([1000, 1000]);
    expect(anomalyScore).toBeGreaterThan(normalScore);
  });

  it('should detect multiple anomalies', () => {
    const detector = new IsolationForestDetector();
    const data = generateNormalData(100);

    detector.train(data);

    const testData = [
      ...generateNormalData(10),
      [1000, 1000],
      [2000, 2000],
    ];

    const anomalies = detector.detectAnomalies(testData, 0.6);

    expect(anomalies).toHaveLength(12);
    expect(anomalies[10]).toBe(true); // Anomaly
    expect(anomalies[11]).toBe(true); // Anomaly
  });
});

describe('AnomalyDetectionEngine', () => {
  let engine: AnomalyDetectionEngine;
  let trainingData: WorkflowExecutionData[];

  beforeEach(() => {
    engine = new AnomalyDetectionEngine();
    trainingData = generateMockExecutionData(50);
  });

  it('should initialize with data', () => {
    expect(() => engine.initialize(trainingData)).not.toThrow();
  });

  it('should detect duration anomalies', async () => {
    engine.initialize(trainingData);

    const anomaly: WorkflowExecutionData = {
      ...trainingData[0],
      id: 'anomaly-1',
      duration: 200000, // Very high
      timestamp: Date.now(),
    };

    const detected = await engine.detectAnomalies(anomaly);

    const durationAnomaly = detected.find((a) => a.metric === 'execution_time');
    expect(durationAnomaly).toBeDefined();
    if (durationAnomaly) {
      expect(durationAnomaly.severity).toMatch(/^(low|medium|high|critical)$/);
    }
  });

  it('should detect resource anomalies', async () => {
    engine.initialize(trainingData);

    const anomaly: WorkflowExecutionData = {
      ...trainingData[0],
      id: 'anomaly-2',
      cpuUsage: 95,
      memoryUsage: 1000,
      timestamp: Date.now(),
    };

    const detected = await engine.detectAnomalies(anomaly);

    const resourceAnomaly = detected.find((a) => a.type === 'resource');
    expect(resourceAnomaly).toBeDefined();
  });

  it('should detect error anomalies', async () => {
    engine.initialize(trainingData);

    const anomaly: WorkflowExecutionData = {
      ...trainingData[0],
      id: 'anomaly-3',
      success: false,
      errorCount: 10,
      timestamp: Date.now(),
    };

    const detected = await engine.detectAnomalies(anomaly);

    const errorAnomaly = detected.find((a) => a.type === 'error');
    expect(errorAnomaly).toBeDefined();
  });

  it('should detect cost anomalies', async () => {
    engine.initialize(trainingData);

    const anomaly: WorkflowExecutionData = {
      ...trainingData[0],
      id: 'anomaly-4',
      cost: 1.0, // Very high
      timestamp: Date.now(),
    };

    const detected = await engine.detectAnomalies(anomaly);

    const costAnomaly = detected.find((a) => a.type === 'cost');
    expect(costAnomaly).toBeDefined();
  });

  it('should generate root cause analysis', async () => {
    engine.initialize(trainingData);

    const anomaly: WorkflowExecutionData = {
      ...trainingData[0],
      id: 'anomaly-5',
      duration: 100000,
      networkCalls: 50,
      dbQueries: 30,
      retryCount: 3,
      timestamp: Date.now(),
    };

    const detected = await engine.detectAnomalies(anomaly);

    if (detected.length > 0) {
      const firstAnomaly = detected[0];
      expect(firstAnomaly.rootCauses).toBeDefined();
      expect(Array.isArray(firstAnomaly.rootCauses)).toBe(true);

      if (firstAnomaly.rootCauses.length > 0) {
        const cause = firstAnomaly.rootCauses[0];
        expect(cause.factor).toBeTruthy();
        expect(cause.likelihood).toBeGreaterThanOrEqual(0);
        expect(cause.likelihood).toBeLessThanOrEqual(1);
        expect(cause.description).toBeTruthy();
      }
    }
  });

  it('should provide recommendations', async () => {
    engine.initialize(trainingData);

    const anomaly: WorkflowExecutionData = {
      ...trainingData[0],
      id: 'anomaly-6',
      duration: 100000,
      timestamp: Date.now(),
    };

    const detected = await engine.detectAnomalies(anomaly);

    if (detected.length > 0) {
      const firstAnomaly = detected[0];
      expect(firstAnomaly.recommendations).toBeDefined();
      expect(Array.isArray(firstAnomaly.recommendations)).toBe(true);
    }
  });

  it('should generate anomaly report', async () => {
    engine.initialize(trainingData);

    // Detect some anomalies
    for (let i = 0; i < 5; i++) {
      const anomaly: WorkflowExecutionData = {
        ...trainingData[0],
        id: `anomaly-${i}`,
        duration: 100000 + i * 10000,
        timestamp: Date.now() - i * 3600000,
      };
      await engine.detectAnomalies(anomaly);
    }

    const report = engine.generateReport();

    expect(report).toBeDefined();
    expect(report.totalAnomalies).toBeGreaterThanOrEqual(0);
    expect(report.anomaliesByType).toBeDefined();
    expect(report.anomaliesBySeverity).toBeDefined();
    expect(report.patterns).toBeInstanceOf(Array);
    expect(report.trends).toBeDefined();
  });

  it('should detect patterns', async () => {
    engine.initialize(trainingData);

    // Create pattern of similar anomalies
    for (let i = 0; i < 5; i++) {
      const anomaly: WorkflowExecutionData = {
        ...trainingData[0],
        id: `pattern-${i}`,
        cpuUsage: 95,
        timestamp: Date.now() - i * 3600000,
      };
      await engine.detectAnomalies(anomaly);
    }

    const report = engine.generateReport();
    expect(report.patterns.length).toBeGreaterThan(0);
  });

  it('should respect sensitivity settings', () => {
    const lowSensitivity = new AnomalyDetectionEngine({ sensitivity: 'low' });
    const highSensitivity = new AnomalyDetectionEngine({ sensitivity: 'high' });

    expect(lowSensitivity.getConfig().sensitivity).toBe('low');
    expect(highSensitivity.getConfig().sensitivity).toBe('high');
  });
});

describe('getAnomalyDetectionEngine (singleton)', () => {
  it('should return the same instance', () => {
    const instance1 = getAnomalyDetectionEngine();
    const instance2 = getAnomalyDetectionEngine();

    expect(instance1).toBe(instance2);
  });
});

// Helper functions
function generateNormalData(count: number): number[][] {
  const data: number[][] = [];

  for (let i = 0; i < count; i++) {
    data.push([
      50 + (Math.random() - 0.5) * 20,
      50 + (Math.random() - 0.5) * 20,
    ]);
  }

  return data;
}

function generateMockExecutionData(count: number): WorkflowExecutionData[] {
  const data: WorkflowExecutionData[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const nodeCount = 5 + Math.floor(Math.random() * 10);

    data.push({
      id: `exec-${i}`,
      workflowId: 'wf-test',
      nodeCount,
      edgeCount: nodeCount - 1,
      complexity: 10 + Math.random() * 20,
      duration: 20000 + Math.random() * 30000,
      success: Math.random() > 0.1,
      errorCount: Math.random() > 0.9 ? Math.floor(Math.random() * 2) : 0,
      retryCount: Math.random() > 0.8 ? 1 : 0,
      cpuUsage: 30 + Math.random() * 40,
      memoryUsage: 150 + Math.random() * 200,
      networkCalls: Math.floor(Math.random() * 8),
      dbQueries: Math.floor(Math.random() * 6),
      cost: 0.005 + Math.random() * 0.02,
      timestamp: now - i * 3600000,
      timeOfDay: Math.floor(Math.random() * 24),
      dayOfWeek: Math.floor(Math.random() * 7),
      hasLoops: Math.random() > 0.7,
      hasConditionals: Math.random() > 0.5,
      hasParallelExecution: Math.random() > 0.6,
      maxDepth: 3 + Math.floor(Math.random() * 4),
      avgNodeComplexity: 1 + Math.random() * 2,
    });
  }

  return data;
}
