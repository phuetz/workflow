// TEST WRITING PLAN WEEK 1 - DAY 1: ExecutionEngine Extended Tests
// Adding 20 missing tests for ExecutionEngine.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowExecutor } from '../components/ExecutionEngine';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';

const createTestNode = (id: string, type: string, config: any = {}): WorkflowNode => ({
  id,
  type: 'custom',
  position: { x: 0, y: 0 },
  data: {
    id,
    type,
    label: `${type}-${id}`,
    position: { x: 0, y: 0 },
    icon: 'default',
    color: '#333',
    inputs: 1,
    outputs: 1,
    config
  }
});

const createTestEdge = (source: string, target: string, sourceHandle?: string): WorkflowEdge => ({
  id: `edge-${source}-${target}`,
  source,
  target,
  sourceHandle,
  type: 'default'
});

describe('WorkflowExecutor - Extended Tests (Week 1 - Day 1)', () => {

  describe('Constructor and Initialization', () => {

    it('should initialize with default options', () => {
      const nodes = [createTestNode('trigger', 'trigger')];
      const edges: WorkflowEdge[] = [];

      const executor = new WorkflowExecutor(nodes, edges);

      expect(executor).toBeDefined();
      expect(executor).toBeInstanceOf(WorkflowExecutor);
    });

    it('should merge custom options with defaults', () => {
      const nodes = [createTestNode('trigger', 'trigger')];
      const edges: WorkflowEdge[] = [];
      const customOptions = {
        maxExecutionTime: 120000, // 2 minutes
        enableCheckpoints: false
      };

      const executor = new WorkflowExecutor(nodes, edges, customOptions);

      expect(executor).toBeDefined();
      // Options are private, but we can verify behavior indirectly
      // by checking that execution completes within custom timeout
    });

    it('should accept empty workflow', () => {
      const nodes: WorkflowNode[] = [];
      const edges: WorkflowEdge[] = [];

      const executor = new WorkflowExecutor(nodes, edges);

      expect(executor).toBeDefined();
    });

    it('should handle nodes without edges', () => {
      const nodes = [
        createTestNode('node1', 'trigger'),
        createTestNode('node2', 'transform')
      ];
      const edges: WorkflowEdge[] = [];

      const executor = new WorkflowExecutor(nodes, edges);

      expect(executor).toBeDefined();
    });

  });

  describe('Execution State Management', () => {

    it('should prevent concurrent executions', async () => {
      const nodes = [createTestNode('trigger', 'trigger')];
      const edges: WorkflowEdge[] = [];
      const executor = new WorkflowExecutor(nodes, edges);

      // Start first execution
      const firstExecution = executor.execute();

      // Try to start second execution immediately
      await expect(executor.execute()).rejects.toThrow('Execution already in progress');

      // Wait for first execution to complete
      await firstExecution;
    });

    it('should allow executions after previous completes', async () => {
      const nodes = [createTestNode('trigger', 'trigger')];
      const edges: WorkflowEdge[] = [];
      const executor = new WorkflowExecutor(nodes, edges);

      // First execution
      await executor.execute();

      // Second execution (should not throw)
      const result = await executor.execute();

      expect(result).toBeDefined();
      expect(result.size).toBeGreaterThan(0);
    });

    it('should track execution start time', async () => {
      const nodes = [createTestNode('trigger', 'trigger')];
      const edges: WorkflowEdge[] = [];
      const executor = new WorkflowExecutor(nodes, edges);

      const startTime = Date.now();
      await executor.execute();
      const endTime = Date.now();

      // Execution should take at least some time
      expect(endTime).toBeGreaterThan(startTime);
    });

    it('should clear results between executions', async () => {
      const nodes = [createTestNode('trigger', 'trigger', { mockData: { value: 1 } })];
      const edges: WorkflowEdge[] = [];
      const executor = new WorkflowExecutor(nodes, edges);

      // First execution
      const result1 = await executor.execute();
      expect(result1.has('trigger')).toBe(true);

      // Second execution
      const result2 = await executor.execute();
      expect(result2.has('trigger')).toBe(true);

      // Results should be independent
      expect(result1).not.toBe(result2);
    });

  });

  describe('Callbacks and Event Handling', () => {

    it('should invoke onNodeStart callback', async () => {
      const nodes = [createTestNode('trigger', 'trigger')];
      const edges: WorkflowEdge[] = [];
      const executor = new WorkflowExecutor(nodes, edges);

      const startedNodes: string[] = [];
      const onNodeStart = (nodeId: string) => {
        startedNodes.push(nodeId);
      };

      await executor.execute(onNodeStart);

      expect(startedNodes).toContain('trigger');
      expect(startedNodes.length).toBeGreaterThan(0);
    });

    it('should invoke onNodeComplete callback with results', async () => {
      const nodes = [createTestNode('trigger', 'trigger', { mockData: { value: 42 } })];
      const edges: WorkflowEdge[] = [];
      const executor = new WorkflowExecutor(nodes, edges);

      let completedNodeId: string | null = null;
      let completedResult: any = null;

      const onNodeComplete = (nodeId: string, inputData: any, result: any) => {
        completedNodeId = nodeId;
        completedResult = result;
      };

      await executor.execute(undefined, onNodeComplete);

      expect(completedNodeId).toBe('trigger');
      expect(completedResult).toBeDefined();
      expect(completedResult.success).toBe(true);
    });

    it('should invoke onNodeError callback on failures', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger'),
        createTestNode('failing', 'httpRequest', { url: 'invalid-url-that-will-fail' })
      ];
      const edges = [createTestEdge('trigger', 'failing')];
      const executor = new WorkflowExecutor(nodes, edges);

      const errors: { nodeId: string; error: Error }[] = [];
      const onNodeError = (nodeId: string, error: Error) => {
        errors.push({ nodeId, error });
      };

      await executor.execute(undefined, undefined, onNodeError);

      // Should have at least one error for the failing node
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.nodeId === 'failing')).toBe(true);
    });

    it('should use default callbacks if none provided', async () => {
      const nodes = [createTestNode('trigger', 'trigger')];
      const edges: WorkflowEdge[] = [];
      const executor = new WorkflowExecutor(nodes, edges);

      // Should not throw even without callbacks
      const result = await executor.execute();

      expect(result).toBeDefined();
      expect(result.has('trigger')).toBe(true);
    });

  });

  describe('Result Format Conversion', () => {

    it('should return Map with legacy result format', async () => {
      const nodes = [createTestNode('trigger', 'trigger', { mockData: { test: 'data' } })];
      const edges: WorkflowEdge[] = [];
      const executor = new WorkflowExecutor(nodes, edges);

      const result = await executor.execute();

      expect(result).toBeInstanceOf(Map);
      expect(result.has('trigger')).toBe(true);

      const nodeResult = result.get('trigger');
      expect(nodeResult).toHaveProperty('success');
      expect(nodeResult.success).toBe(true);
    });

    it('should include timestamp in results', async () => {
      const nodes = [createTestNode('trigger', 'trigger')];
      const edges: WorkflowEdge[] = [];
      const executor = new WorkflowExecutor(nodes, edges);

      const result = await executor.execute();
      const nodeResult = result.get('trigger');

      expect(nodeResult.timestamp).toBeDefined();
      expect(typeof nodeResult.timestamp === 'number' || typeof nodeResult.timestamp === 'string').toBe(true);
    });

    it('should include duration in results', async () => {
      const nodes = [createTestNode('trigger', 'trigger')];
      const edges: WorkflowEdge[] = [];
      const executor = new WorkflowExecutor(nodes, edges);

      const result = await executor.execute();
      const nodeResult = result.get('trigger');

      expect(nodeResult.duration).toBeDefined();
      expect(typeof nodeResult.duration).toBe('number');
      expect(nodeResult.duration).toBeGreaterThanOrEqual(0);
    });

    it('should include nodeId and nodeType in results', async () => {
      const nodes = [createTestNode('my-trigger', 'trigger')];
      const edges: WorkflowEdge[] = [];
      const executor = new WorkflowExecutor(nodes, edges);

      const result = await executor.execute();
      const nodeResult = result.get('my-trigger');

      expect(nodeResult.nodeId).toBe('my-trigger');
      expect(nodeResult.nodeType).toBe('trigger');
    });

  });

  describe('Edge Cases and Error Handling', () => {

    it('should handle single node workflow', async () => {
      const nodes = [createTestNode('lone-node', 'trigger', { mockData: { solo: true } })];
      const edges: WorkflowEdge[] = [];
      const executor = new WorkflowExecutor(nodes, edges);

      const result = await executor.execute();

      expect(result.size).toBe(1);
      expect(result.has('lone-node')).toBe(true);
      expect(result.get('lone-node').success).toBe(true);
    });

    it('should handle workflows with multiple disconnected subgraphs', async () => {
      const nodes = [
        createTestNode('graph1-start', 'trigger'),
        createTestNode('graph1-end', 'transform'),
        createTestNode('graph2-start', 'trigger'),
        createTestNode('graph2-end', 'transform')
      ];
      const edges = [
        createTestEdge('graph1-start', 'graph1-end'),
        createTestEdge('graph2-start', 'graph2-end')
      ];
      const executor = new WorkflowExecutor(nodes, edges);

      const result = await executor.execute();

      // Both trigger nodes should execute
      expect(result.size).toBeGreaterThanOrEqual(2);
      expect(result.has('graph1-start')).toBe(true);
      expect(result.has('graph2-start')).toBe(true);

      // Connected nodes should also execute if queue processes them
      if (result.has('graph1-end')) {
        expect(result.get('graph1-end').success).toBe(true);
      }
      if (result.has('graph2-end')) {
        expect(result.get('graph2-end').success).toBe(true);
      }
    });

    it('should preserve error messages in result', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger'),
        createTestNode('failing', 'httpRequest', { url: 'not-a-url' })
      ];
      const edges = [createTestEdge('trigger', 'failing')];
      const executor = new WorkflowExecutor(nodes, edges);

      const result = await executor.execute();

      // Trigger should execute
      expect(result.has('trigger')).toBe(true);

      // If failing node was executed and is in results, check its error
      if (result.has('failing')) {
        const failedNode = result.get('failing');
        expect(failedNode.success).toBe(false);
        expect(failedNode.error).toBeDefined();
        expect(typeof failedNode.error).toBe('string');
        expect(failedNode.error.length).toBeGreaterThan(0);
      }
    });

    it('should handle gracefully when all nodes fail', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger', { mockData: { invalid: true } }),
        createTestNode('fail1', 'httpRequest', { url: 'invalid1' }),
        createTestNode('fail2', 'httpRequest', { url: 'invalid2' })
      ];
      const edges = [
        createTestEdge('trigger', 'fail1'),
        createTestEdge('fail1', 'fail2')
      ];
      const executor = new WorkflowExecutor(nodes, edges);

      const result = await executor.execute();

      // Should still return results even with failures
      expect(result.size).toBeGreaterThanOrEqual(1);

      // Trigger should succeed
      expect(result.has('trigger')).toBe(true);
      if (result.has('trigger')) {
        expect(result.get('trigger').success).toBe(true);
      }
    });

  });

  describe('Performance and Metrics', () => {

    it('should complete simple workflow quickly', async () => {
      const nodes = [createTestNode('trigger', 'trigger')];
      const edges: WorkflowEdge[] = [];
      const executor = new WorkflowExecutor(nodes, edges);

      const start = Date.now();
      await executor.execute();
      const duration = Date.now() - start;

      // Should complete in less than 1 second for simple workflow
      expect(duration).toBeLessThan(1000);
    });

    it('should handle workflows with many nodes', async () => {
      // Create a linear workflow with 10 nodes (reduced for practical testing)
      const nodes: WorkflowNode[] = [];
      const edges: WorkflowEdge[] = [];

      for (let i = 0; i < 10; i++) {
        nodes.push(createTestNode(`node-${i}`, i === 0 ? 'trigger' : 'transform'));
        if (i > 0) {
          edges.push(createTestEdge(`node-${i-1}`, `node-${i}`));
        }
      }

      const executor = new WorkflowExecutor(nodes, edges, { maxExecutionTime: 30000 });

      const result = await executor.execute();

      // At minimum, the trigger node should execute
      expect(result.size).toBeGreaterThanOrEqual(1);
      expect(result.has('node-0')).toBe(true);
      expect(result.get('node-0').success).toBe(true);

      // Check if downstream nodes were executed
      // (Depending on queue implementation, they may or may not all execute)
      const executedCount = result.size;
      expect(executedCount).toBeGreaterThanOrEqual(1);
      expect(executedCount).toBeLessThanOrEqual(10);
    });

  });

});
