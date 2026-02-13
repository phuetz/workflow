/**
 * Partial Execution Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PartialExecutor } from '../execution/PartialExecutor';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';

describe('PartialExecutor', () => {
  let nodes: WorkflowNode[];
  let edges: WorkflowEdge[];
  let executor: PartialExecutor;

  beforeEach(() => {
    // Create a simple workflow: A -> B -> C -> D
    nodes = [
      {
        id: 'node-a',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: {
          id: 'node-a',
          type: 'trigger',
          label: 'Node A',
          position: { x: 0, y: 0 },
          icon: 'play',
          color: '#3b82f6',
          inputs: 0,
          outputs: 1
        }
      },
      {
        id: 'node-b',
        type: 'action',
        position: { x: 200, y: 0 },
        data: {
          id: 'node-b',
          type: 'action',
          label: 'Node B',
          position: { x: 200, y: 0 },
          icon: 'zap',
          color: '#10b981',
          inputs: 1,
          outputs: 1
        }
      },
      {
        id: 'node-c',
        type: 'action',
        position: { x: 400, y: 0 },
        data: {
          id: 'node-c',
          type: 'action',
          label: 'Node C',
          position: { x: 400, y: 0 },
          icon: 'zap',
          color: '#10b981',
          inputs: 1,
          outputs: 1
        }
      },
      {
        id: 'node-d',
        type: 'action',
        position: { x: 600, y: 0 },
        data: {
          id: 'node-d',
          type: 'action',
          label: 'Node D',
          position: { x: 600, y: 0 },
          icon: 'zap',
          color: '#10b981',
          inputs: 1,
          outputs: 1
        }
      }
    ];

    edges = [
      {
        id: 'edge-ab',
        source: 'node-a',
        target: 'node-b'
      },
      {
        id: 'edge-bc',
        source: 'node-b',
        target: 'node-c'
      },
      {
        id: 'edge-cd',
        source: 'node-c',
        target: 'node-d'
      }
    ];

    executor = new PartialExecutor(nodes, edges);
  });

  describe('buildExecutionSubgraph', () => {
    it('should build subgraph from middle node', () => {
      const subgraph = executor.buildExecutionSubgraph('node-b');

      expect(subgraph.nodes).toHaveLength(3); // B, C, D
      expect(subgraph.edges).toHaveLength(2); // B->C, C->D
      expect(subgraph.startNode.id).toBe('node-b');
      expect(subgraph.reachableNodes.has('node-b')).toBe(true);
      expect(subgraph.reachableNodes.has('node-c')).toBe(true);
      expect(subgraph.reachableNodes.has('node-d')).toBe(true);
      expect(subgraph.reachableNodes.has('node-a')).toBe(false);
    });

    it('should build subgraph from first node', () => {
      const subgraph = executor.buildExecutionSubgraph('node-a');

      expect(subgraph.nodes).toHaveLength(4); // All nodes
      expect(subgraph.edges).toHaveLength(3); // All edges
      expect(subgraph.startNode.id).toBe('node-a');
    });

    it('should build subgraph from last node', () => {
      const subgraph = executor.buildExecutionSubgraph('node-d');

      expect(subgraph.nodes).toHaveLength(1); // Only D
      expect(subgraph.edges).toHaveLength(0); // No edges
      expect(subgraph.startNode.id).toBe('node-d');
    });

    it('should throw error for non-existent node', () => {
      expect(() => {
        executor.buildExecutionSubgraph('non-existent');
      }).toThrow('Start node not found');
    });
  });

  describe('executeFromNode', () => {
    it('should execute from middle node with test data', async () => {
      const testData = { value: 42 };

      const result = await executor.executeFromNode({
        startNodeId: 'node-b',
        testData
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
      expect(result.nodesExecuted).toBe(3); // B, C, D
      expect(result.executionPath).toEqual(['node-b', 'node-c', 'node-d']);
    });

    it('should execute from first node', async () => {
      const result = await executor.executeFromNode({
        startNodeId: 'node-a'
      });

      expect(result.success).toBe(true);
      expect(result.nodesExecuted).toBe(4); // All nodes
    });

    it('should execute from last node', async () => {
      const result = await executor.executeFromNode({
        startNodeId: 'node-d',
        testData: { final: true }
      });

      expect(result.success).toBe(true);
      expect(result.nodesExecuted).toBe(1); // Only D
    });

    it('should handle non-existent start node', async () => {
      const result = await executor.executeFromNode({
        startNodeId: 'non-existent'
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.errors).toHaveLength(1);
    });

    it('should stop at specified node', async () => {
      const result = await executor.executeFromNode({
        startNodeId: 'node-a',
        stopAtNodeId: 'node-c'
      });

      expect(result.success).toBe(true);
      // Should execute A, B, and stop at C
      expect(result.nodesExecuted).toBeLessThanOrEqual(3);
    });

    it('should call callbacks during execution', async () => {
      const onNodeStart = vi.fn();
      const onNodeComplete = vi.fn();
      const onNodeError = vi.fn();

      await executor.executeFromNode(
        { startNodeId: 'node-b' },
        onNodeStart,
        onNodeComplete,
        onNodeError
      );

      expect(onNodeStart).toHaveBeenCalled();
      expect(onNodeComplete).toHaveBeenCalled();
      expect(onNodeError).not.toHaveBeenCalled();
    });
  });

  describe('validateSubgraph', () => {
    it('should validate valid subgraph', () => {
      const subgraph = executor.buildExecutionSubgraph('node-a');
      const validation = executor.validateSubgraph(subgraph);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should warn if no test data provided for node with inputs', () => {
      const subgraph = executor.buildExecutionSubgraph('node-b');
      const validation = executor.validateSubgraph(subgraph);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it('should not warn if test data provided', () => {
      const subgraph = executor.buildExecutionSubgraph('node-b');
      const validation = executor.validateSubgraph(subgraph, { value: 1 });

      expect(validation.isValid).toBe(true);
    });
  });

  describe('getExecutionMetrics', () => {
    it('should return execution metrics', async () => {
      const promise = executor.executeFromNode({ startNodeId: 'node-a' });

      const metrics = executor.getExecutionMetrics();
      expect(metrics).toHaveProperty('isRunning');
      expect(metrics).toHaveProperty('nodesExecuted');
      expect(metrics).toHaveProperty('executionPath');

      await promise;
    });
  });

  describe('stop', () => {
    it('should stop execution', async () => {
      const promise = executor.executeFromNode({ startNodeId: 'node-a' });

      executor.stop();

      expect(executor.isRunning()).toBe(false);

      await promise;
    });
  });

  describe('complex workflows', () => {
    it('should handle branching workflows', () => {
      // Add branch: B -> E
      nodes.push({
        id: 'node-e',
        type: 'action',
        position: { x: 200, y: 200 },
        data: {
          id: 'node-e',
          type: 'action',
          label: 'Node E',
          position: { x: 200, y: 200 },
          icon: 'zap',
          color: '#10b981',
          inputs: 1,
          outputs: 1
        }
      });

      edges.push({
        id: 'edge-be',
        source: 'node-b',
        target: 'node-e'
      });

      const subgraph = executor.buildExecutionSubgraph('node-b');

      expect(subgraph.nodes).toHaveLength(4); // B, C, D, E
      expect(subgraph.edges).toHaveLength(3); // B->C, C->D, B->E
    });
  });
});
