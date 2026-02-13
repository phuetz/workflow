/**
 * Workflow Intelligence System Tests
 * Comprehensive test suite for health scoring, trend analysis, anomaly detection, and recommendations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HealthScorer } from '../intelligence/HealthScorer';
import { TrendAnalyzer } from '../intelligence/TrendAnalyzer';
import { AnomalyDetector } from '../intelligence/AnomalyDetector';
import { RecommendationEngine } from '../intelligence/RecommendationEngine';
import { TimeSeriesData } from '../types/intelligence';

describe('HealthScorer', () => {
  let healthScorer: HealthScorer;

  beforeEach(() => {
    healthScorer = new HealthScorer();
  });

  it('should calculate health score with all components', () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const workflowData = {
      id: 'wf-1',
      name: 'Test Workflow',
      createdAt: oneYearAgo,
      lastModified: tenDaysAgo,
      lastRun: oneDayAgo,
    };

    const metrics = {
      totalExecutions: 1000,
      successfulExecutions: 950,
      failedExecutions: 50,
      successRate: 95,
      throughput: 50,
      averageExecutionTime: 2000,
      peakConcurrency: 5,
      uniqueUsers: 10,
    };

    const performance = {
      averageLatency: 2000,
      p50Latency: 1800,
      p95Latency: 3000,
      p99Latency: 4000,
      slowestExecution: { executionId: 'e1', duration: 5000, timestamp: new Date() },
      fastestExecution: { executionId: 'e2', duration: 500, timestamp: new Date() },
      bottleneckNodes: [],
      memoryUsage: { average: 100, peak: 200, timestamp: new Date() },
      cpuUsage: { average: 50, peak: 80, timestamp: new Date() },
    };

    const reliability = {
      uptime: 99.5,
      errorRate: 5,
      mtbf: 100,
      mttr: 5,
      errorDistribution: [],
      recentIncidents: [],
    };

    const costData = {
      totalCost: 100,
      executionCount: 1000,
      costPerExecution: 0.1,
      monthlyProjected: 150,
    };

    const score = healthScorer.calculateScore(
      workflowData,
      metrics,
      performance,
      reliability,
      costData
    );

    expect(score).toBeDefined();
    expect(score.overall).toBeGreaterThan(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(score.components.reliability).toBeGreaterThan(0);
    expect(score.components.performance).toBeGreaterThan(0);
    expect(score.components.cost).toBeGreaterThan(0);
    expect(score.components.usage).toBeGreaterThan(0);

    // Debug: Log the actual freshness score
    if (score.components.freshness === 0) {
      console.log('Freshness score is 0, debugging...');
      console.log('Workflow data:', workflowData);
      console.log('Full score:', JSON.stringify(score.components, null, 2));
    }

    expect(score.components.freshness).toBeGreaterThan(0);
  });

  it('should generate recommendations for low reliability', () => {
    const workflowData = {
      id: 'wf-2',
      name: 'Unreliable Workflow',
      createdAt: new Date('2024-01-01'),
      lastModified: new Date('2024-10-01'),
      lastRun: new Date('2024-10-18'),
    };

    const metrics = {
      totalExecutions: 100,
      successfulExecutions: 40,
      failedExecutions: 60,
      successRate: 40,
      throughput: 5,
      averageExecutionTime: 3000,
      peakConcurrency: 2,
      uniqueUsers: 3,
    };

    const performance = {
      averageLatency: 3000,
      p50Latency: 2500,
      p95Latency: 5000,
      p99Latency: 6000,
      slowestExecution: { executionId: 'e1', duration: 8000, timestamp: new Date() },
      fastestExecution: { executionId: 'e2', duration: 1000, timestamp: new Date() },
      bottleneckNodes: [],
      memoryUsage: { average: 100, peak: 200, timestamp: new Date() },
      cpuUsage: { average: 50, peak: 80, timestamp: new Date() },
    };

    const reliability = {
      uptime: 80,
      errorRate: 60,
      mtbf: 10,
      mttr: 30,
      errorDistribution: [],
      recentIncidents: [],
    };

    const costData = {
      totalCost: 50,
      executionCount: 100,
      costPerExecution: 0.5,
      monthlyProjected: 75,
    };

    const score = healthScorer.calculateScore(
      workflowData,
      metrics,
      performance,
      reliability,
      costData
    );

    expect(score.components.reliability).toBeLessThan(60);
    expect(score.recommendations.length).toBeGreaterThan(0);
    const reliabilityRec = score.recommendations.find(r => r.type === 'add_error_handling');
    expect(reliabilityRec).toBeDefined();
  });

  it('should detect degrading trend', () => {
    // Create workflow with decreasing health
    const workflowId = 'wf-trend';

    // Simulate multiple calculations with decreasing scores
    for (let i = 0; i < 10; i++) {
      const baseScore = 90 - i * 5; // Decreasing from 90 to 45

      const workflowData = {
        id: workflowId,
        name: 'Degrading Workflow',
        createdAt: new Date('2024-01-01'),
        lastModified: new Date(),
        lastRun: new Date(),
      };

      const metrics = {
        totalExecutions: 100,
        successfulExecutions: baseScore,
        failedExecutions: 100 - baseScore,
        successRate: baseScore,
        throughput: 10,
        averageExecutionTime: 2000,
        peakConcurrency: 2,
        uniqueUsers: 5,
      };

      const performance = {
        averageLatency: 2000,
        p50Latency: 1800,
        p95Latency: 3000,
        p99Latency: 4000,
        slowestExecution: { executionId: 'e1', duration: 5000, timestamp: new Date() },
        fastestExecution: { executionId: 'e2', duration: 500, timestamp: new Date() },
        bottleneckNodes: [],
        memoryUsage: { average: 100, peak: 200, timestamp: new Date() },
        cpuUsage: { average: 50, peak: 80, timestamp: new Date() },
      };

      const reliability = {
        uptime: baseScore,
        errorRate: 100 - baseScore,
        mtbf: 50,
        mttr: 10,
        errorDistribution: [],
        recentIncidents: [],
      };

      const costData = {
        totalCost: 100,
        executionCount: 100,
        costPerExecution: 1,
        monthlyProjected: 150,
      };

      healthScorer.calculateScore(workflowData, metrics, performance, reliability, costData);
    }

    // Get final score - should show degrading trend
    const workflowData = {
      id: workflowId,
      name: 'Degrading Workflow',
      createdAt: new Date('2024-01-01'),
      lastModified: new Date(),
      lastRun: new Date(),
    };

    const metrics = {
      totalExecutions: 100,
      successfulExecutions: 45,
      failedExecutions: 55,
      successRate: 45,
      throughput: 10,
      averageExecutionTime: 2000,
      peakConcurrency: 2,
      uniqueUsers: 5,
    };

    const performance = {
      averageLatency: 2000,
      p50Latency: 1800,
      p95Latency: 3000,
      p99Latency: 4000,
      slowestExecution: { executionId: 'e1', duration: 5000, timestamp: new Date() },
      fastestExecution: { executionId: 'e2', duration: 500, timestamp: new Date() },
      bottleneckNodes: [],
      memoryUsage: { average: 100, peak: 200, timestamp: new Date() },
      cpuUsage: { average: 50, peak: 80, timestamp: new Date() },
    };

    const reliability = {
      uptime: 45,
      errorRate: 55,
      mtbf: 50,
      mttr: 10,
      errorDistribution: [],
      recentIncidents: [],
    };

    const costData = {
      totalCost: 100,
      executionCount: 100,
      costPerExecution: 1,
      monthlyProjected: 150,
    };

    const finalScore = healthScorer.calculateScore(
      workflowData,
      metrics,
      performance,
      reliability,
      costData
    );

    expect(finalScore.trend).toBe('degrading');
  });

  it('should identify unhealthy workflows', () => {
    const workflowData = {
      id: 'wf-unhealthy',
      name: 'Unhealthy Workflow',
      createdAt: new Date('2024-01-01'),
      lastModified: new Date(),
      lastRun: new Date(),
    };

    const metrics = {
      totalExecutions: 10,
      successfulExecutions: 3,
      failedExecutions: 7,
      successRate: 30,
      throughput: 0.5,
      averageExecutionTime: 10000,
      peakConcurrency: 1,
      uniqueUsers: 1,
    };

    const performance = {
      averageLatency: 10000,
      p50Latency: 9000,
      p95Latency: 15000,
      p99Latency: 20000,
      slowestExecution: { executionId: 'e1', duration: 25000, timestamp: new Date() },
      fastestExecution: { executionId: 'e2', duration: 5000, timestamp: new Date() },
      bottleneckNodes: [],
      memoryUsage: { average: 100, peak: 200, timestamp: new Date() },
      cpuUsage: { average: 50, peak: 80, timestamp: new Date() },
    };

    const reliability = {
      uptime: 50,
      errorRate: 70,
      mtbf: 5,
      mttr: 60,
      errorDistribution: [],
      recentIncidents: [],
    };

    const costData = {
      totalCost: 200,
      executionCount: 10,
      costPerExecution: 20,
      monthlyProjected: 300,
    };

    const score = healthScorer.calculateScore(
      workflowData,
      metrics,
      performance,
      reliability,
      costData
    );

    expect(score.overall).toBeLessThan(60);

    const unhealthy = healthScorer.getUnhealthyWorkflows(60);
    expect(unhealthy).toContain('wf-unhealthy');
  });
});

describe('TrendAnalyzer', () => {
  let trendAnalyzer: TrendAnalyzer;

  beforeEach(() => {
    trendAnalyzer = new TrendAnalyzer();
  });

  it('should detect upward trend', () => {
    const data: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      value: 100 + i * 2, // Increasing trend
    }));

    const trend = trendAnalyzer.analyzeTrend('execution_count', data);

    expect(trend).toBeDefined();
    expect(trend!.direction).toBe('up');
    expect(trend!.strength).toBeGreaterThan(0.8);
  });

  it('should detect downward trend', () => {
    const data: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      value: 200 - i * 3, // Decreasing trend
    }));

    const trend = trendAnalyzer.analyzeTrend('performance', data);

    expect(trend).toBeDefined();
    expect(trend!.direction).toBe('down');
    expect(trend!.strength).toBeGreaterThan(0.8);
  });

  it('should detect stable trend', () => {
    // Use fixed values for truly stable trend
    const data: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      value: 150, // Completely stable
    }));

    const trend = trendAnalyzer.analyzeTrend('cost', data);

    expect(trend).toBeDefined();
    expect(trend!.direction).toBe('stable');
  });

  it('should generate forecast', () => {
    const data: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      value: 100 + i * 2,
    }));

    const forecast = trendAnalyzer.generateForecast(data, 'linear-regression', 7);

    expect(forecast).toBeDefined();
    expect(forecast.predictions).toHaveLength(7);
    expect(forecast.confidence).toBeGreaterThan(0);
    expect(forecast.predictions[0].value).toBeGreaterThan(data[data.length - 1].value);
  });

  it('should detect seasonality', () => {
    // Create data with weekly seasonality
    const data: TimeSeriesData[] = Array.from({ length: 28 }, (_, i) => ({
      timestamp: new Date(Date.now() - (27 - i) * 24 * 60 * 60 * 1000),
      value: 100 + Math.sin((i / 7) * 2 * Math.PI) * 20, // Weekly cycle
    }));

    const seasonality = trendAnalyzer.detectSeasonality(data);

    expect(seasonality).toBeDefined();
    expect(seasonality.period).toBeGreaterThan(0);
  });

  it('should handle insufficient data gracefully', () => {
    const data: TimeSeriesData[] = [
      { timestamp: new Date(), value: 100 },
      { timestamp: new Date(), value: 101 },
    ];

    const trend = trendAnalyzer.analyzeTrend('test', data);

    expect(trend).toBeNull();
  });

  it('should calculate forecast with confidence intervals', () => {
    const data: TimeSeriesData[] = Array.from({ length: 20 }, (_, i) => ({
      timestamp: new Date(Date.now() - (19 - i) * 24 * 60 * 60 * 1000),
      value: 100 + i + (Math.random() - 0.5) * 10,
    }));

    const forecast = trendAnalyzer.generateForecast(data, 'exponential-smoothing', 5);

    expect(forecast.predictions).toHaveLength(5);
    forecast.predictions.forEach(pred => {
      expect(pred.confidenceInterval.lower).toBeLessThan(pred.value);
      expect(pred.confidenceInterval.upper).toBeGreaterThan(pred.value);
    });
  });
});

describe('AnomalyDetector', () => {
  let anomalyDetector: AnomalyDetector;

  beforeEach(() => {
    anomalyDetector = new AnomalyDetector({ sigmaThreshold: 3 });
  });

  it('should detect statistical anomaly (3-sigma)', () => {
    const historicalData: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      value: 100 + (Math.random() - 0.5) * 10, // Normal range: ~95-105
    }));

    const anomaly = anomalyDetector.detect('execution_time', 200, historicalData, 'wf-1');

    expect(anomaly).toBeDefined();
    expect(anomaly!.type).toBe('execution_time_spike');
    expect(anomaly!.sigmaLevel).toBeGreaterThan(3);
  });

  it('should not detect normal values as anomalies', () => {
    const historicalData: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      value: 100 + (Math.random() - 0.5) * 10,
    }));

    const anomaly = anomalyDetector.detect('execution_time', 102, historicalData, 'wf-1');

    expect(anomaly).toBeNull();
  });

  it('should calculate baseline correctly', () => {
    const data: TimeSeriesData[] = Array.from({ length: 100 }, (_, i) => ({
      timestamp: new Date(Date.now() - (99 - i) * 60 * 60 * 1000),
      value: 100 + (Math.random() - 0.5) * 10,
    }));

    const baseline = anomalyDetector.calculateBaseline('test_metric', data);

    expect(baseline).toBeDefined();
    expect(baseline.mean).toBeCloseTo(100, 0);
    expect(baseline.stdDev).toBeGreaterThan(0);
    expect(baseline.median).toBeCloseTo(100, 0);
    expect(baseline.p75).toBeGreaterThan(baseline.p25);
  });

  it('should detect error rate increase', () => {
    const historicalData: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      value: 2 + (Math.random() - 0.5) * 1, // Normal error rate: ~1-3%
    }));

    const anomaly = anomalyDetector.detect('error_rate', 15, historicalData, 'wf-1');

    expect(anomaly).toBeDefined();
    expect(anomaly!.type).toBe('error_rate_increase');
    expect(anomaly!.severity).toBe('critical');
  });

  it('should detect cost anomaly', () => {
    const historicalData: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      value: 50 + (Math.random() - 0.5) * 5,
    }));

    const anomaly = anomalyDetector.detect('cost', 150, historicalData, 'wf-1');

    expect(anomaly).toBeDefined();
    expect(anomaly!.type).toBe('cost_anomaly');
  });

  it('should batch detect anomalies', () => {
    const normalData: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      value: 100 + (Math.random() - 0.5) * 10,
    }));

    const metrics = {
      execution_time: { current: 200, historical: normalData },
      error_rate: { current: 20, historical: normalData },
      cost: { current: 105, historical: normalData },
    };

    const anomalies = anomalyDetector.detectBatch(metrics, 'wf-1');

    expect(anomalies.length).toBeGreaterThan(0);
  });

  it('should track and resolve anomalies', () => {
    const historicalData: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      value: 100 + (Math.random() - 0.5) * 10,
    }));

    const anomaly = anomalyDetector.detect('test', 200, historicalData, 'wf-1');
    expect(anomaly).toBeDefined();

    const resolved = anomalyDetector.resolveAnomaly(anomaly!.id);
    expect(resolved).toBe(true);

    const activeAnomalies = anomalyDetector.getActiveAnomalies('wf-1');
    expect(activeAnomalies).toHaveLength(0);
  });

  it('should generate recommendations for anomalies', () => {
    const historicalData: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      value: 100 + (Math.random() - 0.5) * 10,
    }));

    const anomaly = anomalyDetector.detect('execution_time', 250, historicalData, 'wf-1');

    expect(anomaly).toBeDefined();
    expect(anomaly!.recommendations).toBeDefined();
    expect(anomaly!.recommendations.length).toBeGreaterThan(0);
  });
});

describe('RecommendationEngine', () => {
  let recommendationEngine: RecommendationEngine;

  beforeEach(() => {
    recommendationEngine = new RecommendationEngine({ minimumConfidence: 0.6 });
  });

  it('should generate recommendations based on health score', async () => {
    const context = {
      id: 'wf-1',
      name: 'Test Workflow',
      healthScore: {
        overall: 45,
        components: {
          reliability: 40,
          performance: 50,
          cost: 60,
          usage: 30,
          freshness: 50,
        },
        trend: 'degrading' as const,
        trendConfidence: 0.8,
        recommendations: [],
        history: [],
        metadata: {
          calculatedAt: new Date(),
          dataPoints: 100,
          timeRange: 30,
        },
      },
      metrics: {
        totalExecutions: 50,
        successfulExecutions: 20,
        failedExecutions: 30,
        successRate: 40,
        throughput: 2,
        averageExecutionTime: 5000,
        peakConcurrency: 1,
        uniqueUsers: 2,
      },
      anomalies: [],
      trends: [],
      lastRun: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000), // 50 days ago
      costPerExecution: 0.8,
      monthlyProjectedCost: 120,
    };

    const recommendations = await recommendationEngine.generateRecommendations(context);

    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);

    // Should have reliability recommendation
    const reliabilityRec = recommendations.find(r => r.type === 'add_error_handling');
    expect(reliabilityRec).toBeDefined();

    // Should have archive recommendation due to low usage
    const archiveRec = recommendations.find(r => r.type === 'archive_unused');
    expect(archiveRec).toBeDefined();
  });

  it('should prioritize recommendations correctly', async () => {
    const context = {
      id: 'wf-1',
      name: 'Test Workflow',
      healthScore: {
        overall: 30,
        components: {
          reliability: 20,
          performance: 30,
          cost: 40,
          usage: 50,
          freshness: 40,
        },
        trend: 'degrading' as const,
        trendConfidence: 0.9,
        recommendations: [],
        history: [],
        metadata: {
          calculatedAt: new Date(),
          dataPoints: 100,
          timeRange: 30,
        },
      },
      metrics: {
        totalExecutions: 1000,
        successfulExecutions: 200,
        failedExecutions: 800,
        successRate: 20,
        throughput: 10,
        averageExecutionTime: 8000,
        peakConcurrency: 5,
        uniqueUsers: 20,
      },
      anomalies: [],
      trends: [],
      costPerExecution: 2,
      monthlyProjectedCost: 600,
    };

    const recommendations = await recommendationEngine.generateRecommendations(context);

    expect(recommendations.length).toBeGreaterThan(0);

    // First recommendation should be critical or high priority
    expect(['critical', 'high']).toContain(recommendations[0].priority);
  });

  it('should accept and reject recommendations', async () => {
    const context = {
      id: 'wf-1',
      name: 'Test Workflow',
      healthScore: {
        overall: 50,
        components: {
          reliability: 50,
          performance: 50,
          cost: 50,
          usage: 50,
          freshness: 50,
        },
        trend: 'stable' as const,
        trendConfidence: 0.7,
        recommendations: [],
        history: [],
        metadata: {
          calculatedAt: new Date(),
          dataPoints: 100,
          timeRange: 30,
        },
      },
      metrics: {
        totalExecutions: 100,
        successfulExecutions: 50,
        failedExecutions: 50,
        successRate: 50,
        throughput: 5,
        averageExecutionTime: 3000,
        peakConcurrency: 2,
        uniqueUsers: 5,
      },
      anomalies: [],
      trends: [],
    };

    const recommendations = await recommendationEngine.generateRecommendations(context);
    expect(recommendations.length).toBeGreaterThan(0);

    const recId = recommendations[0].id;

    await recommendationEngine.acceptRecommendation(recId, 'user-1');
    const acceptedRec = recommendationEngine.getRecommendation(recId);
    expect(acceptedRec!.status).toBe('accepted');
    expect(acceptedRec!.actedBy).toBe('user-1');

    await recommendationEngine.rejectRecommendation(recId, 'user-1', 'Not applicable');
    const rejectedRec = recommendationEngine.getRecommendation(recId);
    expect(rejectedRec!.status).toBe('rejected');
  });

  it('should filter recommendations by confidence threshold', async () => {
    const lowConfidenceEngine = new RecommendationEngine({ minimumConfidence: 0.9 });

    const context = {
      id: 'wf-1',
      name: 'Test Workflow',
      healthScore: {
        overall: 50,
        components: {
          reliability: 55,
          performance: 55,
          cost: 55,
          usage: 20,
          freshness: 30,
        },
        trend: 'stable' as const,
        trendConfidence: 0.6,
        recommendations: [],
        history: [],
        metadata: {
          calculatedAt: new Date(),
          dataPoints: 100,
          timeRange: 30,
        },
      },
      metrics: {
        totalExecutions: 10,
        successfulExecutions: 5,
        failedExecutions: 5,
        successRate: 50,
        throughput: 1,
        averageExecutionTime: 3000,
        peakConcurrency: 1,
        uniqueUsers: 2,
      },
      anomalies: [],
      trends: [],
      lastRun: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
    };

    const recommendations = await lowConfidenceEngine.generateRecommendations(context);

    // Should filter out low confidence recommendations
    recommendations.forEach(rec => {
      expect(rec.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  it('should clear expired recommendations', async () => {
    const engine = new RecommendationEngine({ expiryDays: 0 });

    const context = {
      id: 'wf-1',
      name: 'Test Workflow',
      healthScore: {
        overall: 50,
        components: {
          reliability: 50,
          performance: 50,
          cost: 50,
          usage: 20,
          freshness: 50,
        },
        trend: 'stable' as const,
        trendConfidence: 0.7,
        recommendations: [],
        history: [],
        metadata: {
          calculatedAt: new Date(),
          dataPoints: 100,
          timeRange: 30,
        },
      },
      metrics: {
        totalExecutions: 10,
        successfulExecutions: 5,
        failedExecutions: 5,
        successRate: 50,
        throughput: 1,
        averageExecutionTime: 3000,
        peakConcurrency: 1,
        uniqueUsers: 2,
      },
      anomalies: [],
      trends: [],
      lastRun: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
    };

    await engine.generateRecommendations(context);

    // Wait a bit and clear expired
    await new Promise(resolve => setTimeout(resolve, 10));
    const cleared = engine.clearExpired();

    expect(cleared).toBeGreaterThan(0);
  });
});

describe('Integration Tests', () => {
  it('should work end-to-end: health scoring -> anomaly detection -> recommendations', async () => {
    const healthScorer = new HealthScorer();
    const anomalyDetector = new AnomalyDetector();
    const recommendationEngine = new RecommendationEngine();

    // 1. Calculate health score
    const workflowData = {
      id: 'wf-integration',
      name: 'Integration Test Workflow',
      createdAt: new Date('2024-01-01'),
      lastModified: new Date('2024-09-01'),
      lastRun: new Date(),
    };

    const metrics = {
      totalExecutions: 100,
      successfulExecutions: 60,
      failedExecutions: 40,
      successRate: 60,
      throughput: 10,
      averageExecutionTime: 4000,
      peakConcurrency: 3,
      uniqueUsers: 5,
    };

    const performance = {
      averageLatency: 4000,
      p50Latency: 3500,
      p95Latency: 6000,
      p99Latency: 8000,
      slowestExecution: { executionId: 'e1', duration: 10000, timestamp: new Date() },
      fastestExecution: { executionId: 'e2', duration: 1000, timestamp: new Date() },
      bottleneckNodes: [],
      memoryUsage: { average: 150, peak: 300, timestamp: new Date() },
      cpuUsage: { average: 60, peak: 90, timestamp: new Date() },
    };

    const reliability = {
      uptime: 90,
      errorRate: 40,
      mtbf: 20,
      mttr: 15,
      errorDistribution: [],
      recentIncidents: [],
    };

    const costData = {
      totalCost: 200,
      executionCount: 100,
      costPerExecution: 2,
      monthlyProjected: 300,
    };

    const healthScore = healthScorer.calculateScore(
      workflowData,
      metrics,
      performance,
      reliability,
      costData
    );

    // 2. Detect anomalies
    const executionTimeData: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      value: 3000 + (Math.random() - 0.5) * 500,
    }));

    const anomaly = anomalyDetector.detect(
      'execution_time',
      8000,
      executionTimeData,
      'wf-integration'
    );

    // 3. Generate recommendations
    const context = {
      id: 'wf-integration',
      name: 'Integration Test Workflow',
      healthScore,
      metrics,
      anomalies: anomaly ? [anomaly] : [],
      trends: [],
      costPerExecution: costData.costPerExecution,
      monthlyProjectedCost: costData.monthlyProjected,
    };

    const recommendations = await recommendationEngine.generateRecommendations(context);

    // Assertions
    expect(healthScore.overall).toBeDefined();
    expect(healthScore.overall).toBeGreaterThan(0);
    expect(anomaly).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);
  });
});
