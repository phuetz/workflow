/**
 * Data Warehouse Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataWarehouse } from '../../analytics/DataWarehouse';
import type { DateRange, TimeInterval } from '../../types/advanced-analytics';

describe('DataWarehouse', () => {
  let warehouse: DataWarehouse;

  beforeEach(() => {
    warehouse = new DataWarehouse();
  });

  describe('Metric Storage', () => {
    it('should store a metric', () => {
      warehouse.storeMetric('test.metric', 100);

      const stats = warehouse.getStatistics();
      expect(stats.rawDataPoints).toBe(1);
    });

    it('should store multiple metrics', () => {
      warehouse.storeMetric('test.metric1', 100);
      warehouse.storeMetric('test.metric2', 200);
      warehouse.storeMetric('test.metric3', 300);

      const stats = warehouse.getStatistics();
      expect(stats.rawDataPoints).toBe(3);
    });

    it('should store metrics with metadata', () => {
      warehouse.storeMetric('test.metric', 100, {
        workflowId: 'workflow-1',
        nodeId: 'node-1',
      });

      const stats = warehouse.getStatistics();
      expect(stats.rawDataPoints).toBe(1);
    });
  });

  describe('Batch Storage', () => {
    it('should store batch of metrics', () => {
      const metrics = [
        { metric: 'test.metric1', value: 100 },
        { metric: 'test.metric2', value: 200 },
        { metric: 'test.metric3', value: 300 },
      ];

      warehouse.storeBatch(metrics);

      const stats = warehouse.getStatistics();
      expect(stats.rawDataPoints).toBe(3);
    });
  });

  describe('Time Series Data', () => {
    it('should get time series data', () => {
      const now = new Date();
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Store some data
      for (let i = 0; i < 10; i++) {
        warehouse.storeMetric('test.metric', Math.random() * 100);
      }

      const dateRange: DateRange = { start, end: now };
      const timeSeries = warehouse.getTimeSeries(
        'test.metric',
        dateRange,
        '1h',
        'avg'
      );

      if (timeSeries) {
        expect(timeSeries.metric).toBe('test.metric');
        expect(timeSeries.interval).toBe('1h');
        expect(timeSeries.aggregation).toBe('avg');
        expect(Array.isArray(timeSeries.dataPoints)).toBe(true);
      }
    });

    it('should return null for non-existent metric', () => {
      const now = new Date();
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const dateRange: DateRange = { start, end: now };

      const timeSeries = warehouse.getTimeSeries(
        'non.existent.metric',
        dateRange,
        '1h',
        'avg'
      );

      expect(timeSeries).toBeNull();
    });

    it('should aggregate data correctly', () => {
      const now = new Date();
      const start = new Date(now.getTime() - 1000);

      // Store known values
      warehouse.storeMetric('test.sum', 10);
      warehouse.storeMetric('test.sum', 20);
      warehouse.storeMetric('test.sum', 30);

      const dateRange: DateRange = { start, end: now };
      const timeSeries = warehouse.getTimeSeries(
        'test.sum',
        dateRange,
        '1h',
        'sum'
      );

      if (timeSeries && timeSeries.dataPoints.length > 0) {
        const total = timeSeries.dataPoints.reduce((sum, dp) => sum + dp.value, 0);
        expect(total).toBe(60);
      }
    });
  });

  describe('Pre-Aggregation', () => {
    it('should pre-aggregate data', () => {
      // Store some data
      for (let i = 0; i < 20; i++) {
        warehouse.storeMetric('test.metric', Math.random() * 100);
      }

      warehouse.preAggregate();

      const stats = warehouse.getStatistics();
      expect(stats.timeSeriesCount).toBeGreaterThan(0);
    });
  });

  describe('Event Processing', () => {
    it('should process analytics events', () => {
      const events = [
        {
          id: '1',
          type: 'workflow.started' as const,
          timestamp: new Date(),
          workflowId: 'workflow-1',
          executionId: 'exec-1',
          data: {},
        },
        {
          id: '2',
          type: 'workflow.completed' as const,
          timestamp: new Date(),
          workflowId: 'workflow-1',
          executionId: 'exec-1',
          data: { duration: 5000 },
        },
      ];

      warehouse.processEvents(events);

      const stats = warehouse.getStatistics();
      expect(stats.rawDataPoints).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should clean up old data', () => {
      // Store some old data
      for (let i = 0; i < 10; i++) {
        warehouse.storeMetric('test.metric', i);
      }

      const deleted = warehouse.cleanup();

      expect(deleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Statistics', () => {
    it('should get warehouse statistics', () => {
      warehouse.storeMetric('test.metric1', 100);
      warehouse.storeMetric('test.metric2', 200);

      const stats = warehouse.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.rawMetrics).toBeGreaterThan(0);
      expect(stats.rawDataPoints).toBeGreaterThan(0);
      expect(stats.timeSeriesCount).toBeGreaterThanOrEqual(0);
      expect(stats.totalDataPoints).toBeGreaterThanOrEqual(0);
      expect(stats.estimatedSizeBytes).toBeGreaterThan(0);
    });
  });

  describe('Export/Import', () => {
    it('should export data', () => {
      warehouse.storeMetric('test.metric', 100);

      const exported = warehouse.export();

      expect(exported).toBeDefined();
      expect(exported.rawData).toBeDefined();
      expect(exported.timeSeries).toBeDefined();
      expect(Array.isArray(exported.rawData)).toBe(true);
      expect(Array.isArray(exported.timeSeries)).toBe(true);
    });

    it('should import data', () => {
      const data = {
        rawData: [
          {
            metric: 'test.metric',
            dataPoints: [
              { timestamp: new Date(), value: 100 },
              { timestamp: new Date(), value: 200 },
            ],
          },
        ],
        timeSeries: [],
      };

      warehouse.import(data);

      const stats = warehouse.getStatistics();
      expect(stats.rawDataPoints).toBe(2);
    });

    it('should preserve data through export/import', () => {
      warehouse.storeMetric('test.metric', 100);
      warehouse.storeMetric('test.metric', 200);

      const exported = warehouse.export();
      const newWarehouse = new DataWarehouse();
      newWarehouse.import(exported);

      const stats = newWarehouse.getStatistics();
      expect(stats.rawDataPoints).toBe(2);
    });
  });
});
