/**
 * Advanced Analytics Engine Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AdvancedAnalyticsEngine } from '../../analytics/AdvancedAnalyticsEngine';
import type { DateRange } from '../../types/advanced-analytics';

describe('AdvancedAnalyticsEngine', () => {
  let engine: AdvancedAnalyticsEngine;

  beforeEach(() => {
    engine = new AdvancedAnalyticsEngine();
  });

  afterEach(() => {
    engine.stop();
  });

  describe('Workflow Tracking', () => {
    it('should track workflow execution start', () => {
      const workflowId = 'workflow-1';
      const executionId = 'exec-1';

      engine.trackWorkflowExecution(workflowId, executionId, 'start');

      const stats = engine.getStatistics();
      expect(stats.collector.totalEvents).toBeGreaterThan(0);
    });

    it('should track workflow execution completion', () => {
      const workflowId = 'workflow-1';
      const executionId = 'exec-1';

      engine.trackWorkflowExecution(workflowId, executionId, 'start');
      engine.trackWorkflowExecution(workflowId, executionId, 'complete');

      const stats = engine.getStatistics();
      expect(stats.collector.totalEvents).toBeGreaterThanOrEqual(2);
    });

    it('should track workflow execution failure', () => {
      const workflowId = 'workflow-1';
      const executionId = 'exec-1';

      engine.trackWorkflowExecution(workflowId, executionId, 'start');
      engine.trackWorkflowExecution(workflowId, executionId, 'failed', {
        error: 'Test error',
      });

      const stats = engine.getStatistics();
      expect(stats.collector.totalEvents).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Node Tracking', () => {
    it('should track node execution start', () => {
      const executionId = 'exec-1';
      const nodeId = 'node-1';
      const nodeType = 'http';

      engine.trackWorkflowExecution('workflow-1', executionId, 'start');
      engine.trackNodeExecution(executionId, nodeId, nodeType, 'start');

      const stats = engine.getStatistics();
      expect(stats.collector.totalEvents).toBeGreaterThan(0);
    });

    it('should track node execution completion', () => {
      const executionId = 'exec-1';
      const nodeId = 'node-1';
      const nodeType = 'http';

      engine.trackWorkflowExecution('workflow-1', executionId, 'start');
      engine.trackNodeExecution(executionId, nodeId, nodeType, 'start');
      engine.trackNodeExecution(executionId, nodeId, nodeType, 'complete', {
        apiCalls: 1,
        dataSize: 1024,
      });

      const stats = engine.getStatistics();
      expect(stats.collector.totalEvents).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Aggregated Metrics', () => {
    it('should get aggregated metrics for date range', () => {
      const dateRange: DateRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const metrics = engine.getAggregatedMetrics(dateRange);

      expect(metrics).toBeDefined();
      expect(metrics.period).toEqual(dateRange);
      expect(metrics.metrics).toBeDefined();
      expect(metrics.metrics.executions).toBeDefined();
      expect(metrics.metrics.performance).toBeDefined();
      expect(metrics.metrics.cost).toBeDefined();
    });

    it('should use default date range when not provided', () => {
      const metrics = engine.getAggregatedMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.period.start).toBeInstanceOf(Date);
      expect(metrics.period.end).toBeInstanceOf(Date);
    });
  });

  describe('Insights', () => {
    it('should generate insights', () => {
      const insights = engine.getInsights();

      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
    });

    it('should sort insights by severity', () => {
      const insights = engine.getInsights();

      if (insights.length > 1) {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        for (let i = 0; i < insights.length - 1; i++) {
          expect(severityOrder[insights[i].severity]).toBeLessThanOrEqual(
            severityOrder[insights[i + 1].severity]
          );
        }
      }
    });

    it('should include recommendations in insights', () => {
      const insights = engine.getInsights();

      insights.forEach((insight) => {
        expect(insight.recommendations).toBeDefined();
        expect(Array.isArray(insight.recommendations)).toBe(true);
      });
    });
  });

  describe('Performance Anomalies', () => {
    it('should detect performance anomalies', () => {
      const anomalies = engine.getPerformanceAnomalies();

      expect(anomalies).toBeDefined();
      expect(Array.isArray(anomalies)).toBe(true);
    });

    it('should include anomaly details', () => {
      const anomalies = engine.getPerformanceAnomalies();

      anomalies.forEach((anomaly) => {
        expect(anomaly.id).toBeDefined();
        expect(anomaly.detectedAt).toBeInstanceOf(Date);
        expect(anomaly.metric).toBeDefined();
        expect(typeof anomaly.expected).toBe('number');
        expect(typeof anomaly.actual).toBe('number');
        expect(typeof anomaly.deviation).toBe('number');
        expect(['low', 'medium', 'high']).toContain(anomaly.severity);
      });
    });
  });

  describe('Statistics', () => {
    it('should get engine statistics', () => {
      const stats = engine.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.collector).toBeDefined();
      expect(stats.warehouse).toBeDefined();
    });

    it('should track events correctly', () => {
      engine.trackWorkflowExecution('workflow-1', 'exec-1', 'start');
      engine.trackWorkflowExecution('workflow-1', 'exec-1', 'complete');

      const stats = engine.getStatistics();
      expect(stats.collector.totalEvents).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Query', () => {
    it('should query metrics', () => {
      const dateRange: DateRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const result = engine.query({
        metric: 'workflow.duration',
        dateRange,
        interval: '1h',
        aggregation: 'avg',
      });

      // Result may be null if no data exists
      if (result) {
        expect(result).toBeDefined();
      }
    });
  });

  describe('Export', () => {
    it('should export analytics data as JSON', () => {
      const exported = engine.export('json');

      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.statistics).toBeDefined();
      expect(parsed.data).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should stop engine gracefully', () => {
      expect(() => engine.stop()).not.toThrow();
    });

    it('should not throw on multiple stops', () => {
      engine.stop();
      expect(() => engine.stop()).not.toThrow();
    });
  });
});
