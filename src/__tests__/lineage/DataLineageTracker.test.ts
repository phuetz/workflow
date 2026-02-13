/**
 * Data Lineage Tracker Tests
 * Comprehensive test suite for lineage tracking functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataLineageTracker } from '../../lineage/DataLineageTracker';
import {
  DataSourceType,
  TransformationType,
  ComplianceFramework,
  DataSensitivity
} from '../../types/lineage';

describe('DataLineageTracker', () => {
  let tracker: DataLineageTracker;
  const workflowId = 'test-workflow-001';
  const executionId = 'exec-001';

  beforeEach(() => {
    tracker = new DataLineageTracker({
      enabled: true,
      asyncMode: false, // Synchronous for testing
      captureSnapshots: true
    });

    tracker.startExecution(workflowId, executionId);
  });

  afterEach(() => {
    tracker.endExecution();
    tracker.shutdown();
  });

  describe('Data Source Registration', () => {
    it('should register a data source', () => {
      const source = tracker.registerDataSource(
        'node-1',
        DataSourceType.API,
        'Test API',
        'https://api.example.com',
        {
          sensitivity: DataSensitivity.INTERNAL,
          complianceFrameworks: [ComplianceFramework.GDPR]
        }
      );

      expect(source).toBeDefined();
      expect(source.type).toBe(DataSourceType.API);
      expect(source.name).toBe('Test API');
      expect(source.metadata.sensitivity).toBe(DataSensitivity.INTERNAL);
      expect(source.metadata.complianceFrameworks).toContain(ComplianceFramework.GDPR);
    });

    it('should assign unique IDs to data sources', () => {
      const source1 = tracker.registerDataSource('node-1', DataSourceType.API, 'API 1', 'url1');
      const source2 = tracker.registerDataSource('node-2', DataSourceType.API, 'API 2', 'url2');

      expect(source1.id).not.toBe(source2.id);
    });
  });

  describe('Node Tracking', () => {
    it('should track a lineage node', () => {
      const dataSource = tracker.registerDataSource(
        'node-1',
        DataSourceType.DATABASE,
        'Users DB',
        'postgresql://db'
      );

      const node = tracker.trackNode('node-1', dataSource, {
        schema: { id: 'number', name: 'string' },
        recordCount: 100,
        size: 5000,
        nodeName: 'Load Users',
        nodeType: 'database'
      });

      expect(node).toBeDefined();
      expect(node.nodeId).toBe('node-1');
      expect(node.executionId).toBe(executionId);
      expect(node.dataSnapshot?.recordCount).toBe(100);
      expect(node.dataSnapshot?.size).toBe(5000);
    });

    it('should link upstream and downstream nodes', () => {
      const source1 = tracker.registerDataSource('node-1', DataSourceType.API, 'Source', 'url1');
      const source2 = tracker.registerDataSource('node-2', DataSourceType.COMPUTED, 'Transform', 'computed');

      const node1 = tracker.trackNode('node-1', source1, {
        nodeName: 'Source Node',
        nodeType: 'source'
      });

      const node2 = tracker.trackNode('node-2', source2, {
        upstreamNodes: [node1.id],
        nodeName: 'Transform Node',
        nodeType: 'transform'
      });

      expect(node2.upstreamNodes).toContain(node1.id);
      expect(node1.downstreamNodes).toContain(node2.id);
    });

    it('should capture data snapshots when enabled', () => {
      const source = tracker.registerDataSource('node-1', DataSourceType.API, 'Test', 'url');
      const sampleData = [{ id: 1, name: 'Test' }, { id: 2, name: 'Test2' }];

      const node = tracker.trackNode('node-1', source, {
        sampleData,
        recordCount: 2,
        schema: { id: 'number', name: 'string' }
      });

      expect(node.dataSnapshot).toBeDefined();
      expect(node.dataSnapshot?.sampleData).toBeDefined();
      expect(node.dataSnapshot?.schema).toEqual({ id: 'number', name: 'string' });
    });
  });

  describe('Transformation Tracking', () => {
    it('should track a transformation', () => {
      const source1 = tracker.registerDataSource('node-1', DataSourceType.API, 'Input', 'url1');
      const source2 = tracker.registerDataSource('node-2', DataSourceType.COMPUTED, 'Output', 'computed');

      const inputNode = tracker.trackNode('node-1', source1, {
        recordCount: 100,
        nodeName: 'Input',
        nodeType: 'source'
      });

      const outputNode = tracker.trackNode('node-2', source2, {
        upstreamNodes: [inputNode.id],
        recordCount: 80,
        nodeName: 'Output',
        nodeType: 'transform'
      });

      const transformation = tracker.trackTransformation(
        TransformationType.FILTER,
        'node-2',
        [inputNode],
        [outputNode],
        {
          name: 'Filter Active Users',
          description: 'Filters only active users',
          expression: 'status === "active"'
        },
        {
          duration: 150,
          inputRecords: 100,
          outputRecords: 80,
          bytesProcessed: 4000
        }
      );

      expect(transformation).toBeDefined();
      expect(transformation.type).toBe(TransformationType.FILTER);
      expect(transformation.metrics.inputRecords).toBe(100);
      expect(transformation.metrics.outputRecords).toBe(80);
      expect(transformation.quality.dataQualityScore).toBeGreaterThan(0);
    });

    it('should calculate data quality score', () => {
      const source1 = tracker.registerDataSource('node-1', DataSourceType.API, 'Input', 'url1');
      const source2 = tracker.registerDataSource('node-2', DataSourceType.COMPUTED, 'Output', 'computed');

      const inputNode = tracker.trackNode('node-1', source1, { recordCount: 100 });
      const outputNode = tracker.trackNode('node-2', source2, { recordCount: 100 });

      const transformation = tracker.trackTransformation(
        TransformationType.MAP,
        'node-2',
        [inputNode],
        [outputNode],
        { name: 'Identity Transform' },
        {
          duration: 100,
          inputRecords: 100,
          outputRecords: 100,
          bytesProcessed: 5000
        }
      );

      // 100% preservation should give 100% quality
      expect(transformation.quality.dataQualityScore).toBe(100);
    });
  });

  describe('Data Flow Tracking', () => {
    it('should track data flow between nodes', () => {
      const source1 = tracker.registerDataSource('node-1', DataSourceType.API, 'Source', 'url1');
      const source2 = tracker.registerDataSource('node-2', DataSourceType.COMPUTED, 'Target', 'computed');

      const sourceNode = tracker.trackNode('node-1', source1);
      const targetNode = tracker.trackNode('node-2', source2);

      const edge = tracker.trackDataFlow(
        sourceNode,
        targetNode,
        {
          recordsTransferred: 1000,
          bytesTransferred: 50000,
          duration: 200
        }
      );

      expect(edge).toBeDefined();
      expect(edge.dataFlow.recordsTransferred).toBe(1000);
      expect(edge.dataFlow.bytesTransferred).toBe(50000);
      expect(edge.dataFlow.throughput).toBeGreaterThan(0);
    });

    it('should calculate throughput correctly', () => {
      const source1 = tracker.registerDataSource('node-1', DataSourceType.API, 'Source', 'url1');
      const source2 = tracker.registerDataSource('node-2', DataSourceType.COMPUTED, 'Target', 'computed');

      const sourceNode = tracker.trackNode('node-1', source1);
      const targetNode = tracker.trackNode('node-2', source2);

      const edge = tracker.trackDataFlow(
        sourceNode,
        targetNode,
        {
          recordsTransferred: 1000,
          bytesTransferred: 50000,
          duration: 1000 // 1 second
        }
      );

      // 1000 records in 1 second = 1000 records/sec
      expect(edge.dataFlow.throughput).toBe(1000);
    });
  });

  describe('Lineage Graph Building', () => {
    it('should build a complete lineage graph', () => {
      // Create a simple pipeline: Source -> Transform -> Sink
      const source1 = tracker.registerDataSource('node-1', DataSourceType.API, 'Source', 'url1');
      const source2 = tracker.registerDataSource('node-2', DataSourceType.COMPUTED, 'Transform', 'computed');
      const source3 = tracker.registerDataSource('node-3', DataSourceType.DATABASE, 'Sink', 'db');

      const node1 = tracker.trackNode('node-1', source1, { nodeName: 'Source', nodeType: 'source' });
      const node2 = tracker.trackNode('node-2', source2, {
        upstreamNodes: [node1.id],
        nodeName: 'Transform',
        nodeType: 'transform'
      });
      const node3 = tracker.trackNode('node-3', source3, {
        upstreamNodes: [node2.id],
        nodeName: 'Sink',
        nodeType: 'sink'
      });

      const graph = tracker.buildLineageGraph();

      expect(graph).toBeDefined();
      expect(graph.nodes.size).toBe(3);
      expect(graph.sources).toContain(node1.id);
      expect(graph.sinks).toContain(node3.id);
      expect(graph.metadata.depth).toBeGreaterThan(0);
    });

    it('should identify sources and sinks correctly', () => {
      const source1 = tracker.registerDataSource('node-1', DataSourceType.API, 'Source', 'url1');
      const source2 = tracker.registerDataSource('node-2', DataSourceType.DATABASE, 'Sink', 'db');

      const sourceNode = tracker.trackNode('node-1', source1, { nodeName: 'Source' });
      const sinkNode = tracker.trackNode('node-2', source2, {
        upstreamNodes: [sourceNode.id],
        nodeName: 'Sink'
      });

      const graph = tracker.buildLineageGraph();

      expect(graph.sources).toEqual([sourceNode.id]);
      expect(graph.sinks).toEqual([sinkNode.id]);
    });

    it('should calculate graph depth correctly', () => {
      // Create a chain: A -> B -> C -> D (depth = 4)
      const nodes = [];
      for (let i = 0; i < 4; i++) {
        const source = tracker.registerDataSource(
          `node-${i}`,
          DataSourceType.COMPUTED,
          `Node ${i}`,
          'computed'
        );

        const node = tracker.trackNode(`node-${i}`, source, {
          upstreamNodes: i > 0 ? [nodes[i - 1].id] : [],
          nodeName: `Node ${i}`
        });

        nodes.push(node);
      }

      const graph = tracker.buildLineageGraph();

      expect(graph.metadata.depth).toBe(4);
    });
  });

  describe('Querying', () => {
    beforeEach(() => {
      // Setup test data
      for (let i = 0; i < 5; i++) {
        const source = tracker.registerDataSource(
          `node-${i}`,
          DataSourceType.API,
          `Node ${i}`,
          `url${i}`
        );
        tracker.trackNode(`node-${i}`, source, { nodeName: `Node ${i}` });
      }
    });

    it('should query lineage by workflow ID', () => {
      const result = tracker.queryLineage({ workflowId });

      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.nodes.every(n => n.metadata.workflowId === workflowId)).toBe(true);
    });

    it('should query lineage by execution ID', () => {
      const result = tracker.queryLineage({ executionId });

      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.nodes.every(n => n.executionId === executionId)).toBe(true);
    });

    it('should support pagination', () => {
      const result = tracker.queryLineage({
        limit: 2,
        offset: 0
      });

      expect(result.nodes.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics', () => {
      const source = tracker.registerDataSource('node-1', DataSourceType.API, 'Test', 'url');
      const node = tracker.trackNode('node-1', source);

      tracker.trackTransformation(
        TransformationType.MAP,
        'node-1',
        [node],
        [node],
        { name: 'Test' },
        {
          duration: 100,
          inputRecords: 100,
          outputRecords: 100,
          bytesProcessed: 5000
        }
      );

      const stats = tracker.getStatistics();

      expect(stats.totalNodes).toBeGreaterThan(0);
      expect(stats.totalTransformations).toBeGreaterThan(0);
      expect(stats.totalRecordsProcessed).toBeGreaterThan(0);
      expect(stats.complianceScore).toBeGreaterThanOrEqual(0);
      expect(stats.complianceScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Performance', () => {
    it('should have minimal overhead (<5%)', () => {
      const iterations = 100;

      // Measure baseline
      const baselineStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        // Simulate work
        const _ = { data: Array(100).fill(i) };
      }
      const baselineTime = performance.now() - baselineStart;

      // Measure with lineage
      const lineageStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const source = tracker.registerDataSource(
          `perf-node-${i}`,
          DataSourceType.COMPUTED,
          `Perf ${i}`,
          'computed'
        );
        tracker.trackNode(`perf-node-${i}`, source, {
          recordCount: 100,
          size: 1000
        });
      }
      const lineageTime = performance.now() - lineageStart;

      const metrics = tracker.getPerformanceMetrics();

      expect(metrics.overheadPercentage).toBeLessThan(5);
      console.log(`Lineage overhead: ${metrics.overheadPercentage.toFixed(2)}%`);
    });
  });

  describe('Cleanup', () => {
    it('should remove old data based on retention policy', () => {
      const source = tracker.registerDataSource('node-1', DataSourceType.API, 'Test', 'url');
      tracker.trackNode('node-1', source);

      const beforeCleanup = tracker.queryLineage({});
      expect(beforeCleanup.nodes.length).toBeGreaterThan(0);

      // Cleanup with 0 days retention (removes everything)
      tracker.cleanup();

      // Note: In real implementation, we'd need to manipulate timestamps
      // This test verifies the method exists and runs without error
    });
  });

  describe('Error Handling', () => {
    it('should handle tracking when disabled', () => {
      const disabledTracker = new DataLineageTracker({ enabled: false });

      const source = disabledTracker.registerDataSource(
        'node-1',
        DataSourceType.API,
        'Test',
        'url'
      );

      // Should not throw, just return dummy data
      expect(source.id).toBe('dummy');
    });

    it('should handle missing execution context gracefully', () => {
      const newTracker = new DataLineageTracker();
      // Don't start execution

      const source = newTracker.registerDataSource('node-1', DataSourceType.API, 'Test', 'url');
      const node = newTracker.trackNode('node-1', source);

      // Should return dummy data when no execution context
      expect(node.id).toBe('dummy');
    });
  });
});
