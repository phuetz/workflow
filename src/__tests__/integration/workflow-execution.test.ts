import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkflowExecutor } from '../../components/ExecutionEngine';
import type { Workflow, Node, Edge } from '../../types/workflow';

// Mock external services
vi.mock('../../backend/api/services/queue', () => ({
  enqueueExecution: vi.fn((id) => Promise.resolve({ id: `exec_${id}`, status: 'pending' })),
}));

// TODO: Tests use wrong WorkflowExecutor API (executeWorkflow doesn't exist, constructor wrong). Needs rewrite.
describe.skip('Workflow Execution Integration Tests', () => {
  let executor: WorkflowExecutor;

  beforeEach(() => {
    executor = new WorkflowExecutor();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Simple Workflow Execution', () => {
    it('should execute single node workflow', async () => {
      const workflow: Workflow = {
        id: 'wf_simple',
        name: 'Simple Workflow',
        description: 'Single node test',
        nodes: [
          {
            id: 'node1',
            type: 'manualTrigger',
            position: { x: 0, y: 0 },
            data: {
              label: 'Start',
              config: {},
            },
          },
        ],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeWorkflow(workflow, { test: 'data' });

      expect(result).toBeDefined();
      expect(result.status).toBe('success');
      expect(result.results).toBeDefined();
    });

    it('should execute linear workflow with multiple nodes', async () => {
      const workflow: Workflow = {
        id: 'wf_linear',
        name: 'Linear Workflow',
        description: 'Multi-node linear flow',
        nodes: [
          {
            id: 'trigger',
            type: 'manualTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Start', config: {} },
          },
          {
            id: 'transform',
            type: 'dataMapper',
            position: { x: 200, y: 0 },
            data: {
              label: 'Transform',
              config: {
                mapping: { output: '{{ $json.input }}' },
              },
            },
          },
          {
            id: 'filter',
            type: 'filter',
            position: { x: 400, y: 0 },
            data: {
              label: 'Filter',
              config: {
                condition: 'true',
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trigger', target: 'transform' },
          { id: 'e2', source: 'transform', target: 'filter' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeWorkflow(workflow, { input: 'test' });

      expect(result.status).toBe('success');
      expect(Object.keys(result.results)).toHaveLength(3);
      expect(result.results.trigger).toBeDefined();
      expect(result.results.transform).toBeDefined();
      expect(result.results.filter).toBeDefined();
    });
  });

  describe('Branching Workflows', () => {
    it('should execute workflow with conditional branches', async () => {
      const workflow: Workflow = {
        id: 'wf_branch',
        name: 'Branching Workflow',
        description: 'Conditional branching',
        nodes: [
          {
            id: 'trigger',
            type: 'manualTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Start', config: {} },
          },
          {
            id: 'condition',
            type: 'condition',
            position: { x: 200, y: 0 },
            data: {
              label: 'Check',
              config: {
                condition: '{{ $json.value > 10 }}',
              },
            },
          },
          {
            id: 'path_true',
            type: 'code',
            position: { x: 400, y: -100 },
            data: {
              label: 'True Path',
              config: {
                code: 'return { result: "high" };',
              },
            },
          },
          {
            id: 'path_false',
            type: 'code',
            position: { x: 400, y: 100 },
            data: {
              label: 'False Path',
              config: {
                code: 'return { result: "low" };',
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trigger', target: 'condition' },
          { id: 'e2', source: 'condition', target: 'path_true', sourceHandle: 'true' },
          { id: 'e3', source: 'condition', target: 'path_false', sourceHandle: 'false' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const resultHigh = await executor.executeWorkflow(workflow, { value: 15 });
      expect(resultHigh.status).toBe('success');

      const resultLow = await executor.executeWorkflow(workflow, { value: 5 });
      expect(resultLow.status).toBe('success');
    });

    it('should execute workflow with merge point', async () => {
      const workflow: Workflow = {
        id: 'wf_merge',
        name: 'Merge Workflow',
        description: 'Branch and merge',
        nodes: [
          {
            id: 'start',
            type: 'manualTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Start', config: {} },
          },
          {
            id: 'branch1',
            type: 'code',
            position: { x: 200, y: -100 },
            data: {
              label: 'Branch 1',
              config: { code: 'return { from: "branch1" };' },
            },
          },
          {
            id: 'branch2',
            type: 'code',
            position: { x: 200, y: 100 },
            data: {
              label: 'Branch 2',
              config: { code: 'return { from: "branch2" };' },
            },
          },
          {
            id: 'merge',
            type: 'merge',
            position: { x: 400, y: 0 },
            data: {
              label: 'Merge',
              config: { mode: 'combine' },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'branch1' },
          { id: 'e2', source: 'start', target: 'branch2' },
          { id: 'e3', source: 'branch1', target: 'merge' },
          { id: 'e4', source: 'branch2', target: 'merge' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeWorkflow(workflow, {});
      expect(result.status).toBe('success');
      expect(result.results.merge).toBeDefined();
    });
  });

  describe('Error Handling in Workflows', () => {
    it('should handle node execution errors', async () => {
      const workflow: Workflow = {
        id: 'wf_error',
        name: 'Error Workflow',
        description: 'Test error handling',
        nodes: [
          {
            id: 'trigger',
            type: 'manualTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Start', config: {} },
          },
          {
            id: 'failing_node',
            type: 'code',
            position: { x: 200, y: 0 },
            data: {
              label: 'Failing Node',
              config: {
                code: 'throw new Error("Intentional error");',
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trigger', target: 'failing_node' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeWorkflow(workflow, {});
      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should route to error branch on failure', async () => {
      const workflow: Workflow = {
        id: 'wf_error_branch',
        name: 'Error Branch Workflow',
        description: 'Error branch routing',
        nodes: [
          {
            id: 'trigger',
            type: 'manualTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Start', config: {} },
          },
          {
            id: 'risky_node',
            type: 'code',
            position: { x: 200, y: 0 },
            data: {
              label: 'Risky Operation',
              config: {
                code: 'if ($json.fail) throw new Error("Failed"); return { success: true };',
              },
            },
          },
          {
            id: 'success_node',
            type: 'code',
            position: { x: 400, y: -100 },
            data: {
              label: 'Success Handler',
              config: { code: 'return { status: "success" };' },
            },
          },
          {
            id: 'error_node',
            type: 'code',
            position: { x: 400, y: 100 },
            data: {
              label: 'Error Handler',
              config: { code: 'return { status: "error_handled" };' },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trigger', target: 'risky_node' },
          { id: 'e2', source: 'risky_node', target: 'success_node' },
          { id: 'e3', source: 'risky_node', target: 'error_node', sourceHandle: 'error' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const resultSuccess = await executor.executeWorkflow(workflow, { fail: false });
      expect(resultSuccess.status).toBe('success');

      const resultError = await executor.executeWorkflow(workflow, { fail: true });
      // Should handle error and continue
      expect(resultError).toBeDefined();
    });
  });

  describe('Data Flow Between Nodes', () => {
    it('should pass data from previous node correctly', async () => {
      const workflow: Workflow = {
        id: 'wf_dataflow',
        name: 'Data Flow Workflow',
        description: 'Test data passing',
        nodes: [
          {
            id: 'source',
            type: 'manualTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Source', config: {} },
          },
          {
            id: 'processor',
            type: 'code',
            position: { x: 200, y: 0 },
            data: {
              label: 'Processor',
              config: {
                code: 'return { processed: $json.input.toUpperCase() };',
              },
            },
          },
          {
            id: 'validator',
            type: 'code',
            position: { x: 400, y: 0 },
            data: {
              label: 'Validator',
              config: {
                code: 'return { valid: $json.processed === "TEST" };',
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'source', target: 'processor' },
          { id: 'e2', source: 'processor', target: 'validator' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeWorkflow(workflow, { input: 'test' });
      expect(result.status).toBe('success');
    });

    it('should handle array data through workflow', async () => {
      const workflow: Workflow = {
        id: 'wf_array',
        name: 'Array Processing Workflow',
        description: 'Process arrays',
        nodes: [
          {
            id: 'source',
            type: 'manualTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Source', config: {} },
          },
          {
            id: 'mapper',
            type: 'code',
            position: { x: 200, y: 0 },
            data: {
              label: 'Map Array',
              config: {
                code: 'return { mapped: $json.items.map(i => i * 2) };',
              },
            },
          },
          {
            id: 'filter',
            type: 'code',
            position: { x: 400, y: 0 },
            data: {
              label: 'Filter Array',
              config: {
                code: 'return { filtered: $json.mapped.filter(i => i > 10) };',
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'source', target: 'mapper' },
          { id: 'e2', source: 'mapper', target: 'filter' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeWorkflow(workflow, { items: [1, 5, 10, 15] });
      expect(result.status).toBe('success');
    });
  });

  describe('Complex Workflow Patterns', () => {
    it('should execute loop workflow', async () => {
      const workflow: Workflow = {
        id: 'wf_loop',
        name: 'Loop Workflow',
        description: 'Iterate over items',
        nodes: [
          {
            id: 'trigger',
            type: 'manualTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Start', config: {} },
          },
          {
            id: 'loop',
            type: 'forEach',
            position: { x: 200, y: 0 },
            data: {
              label: 'For Each',
              config: {
                items: '{{ $json.items }}',
              },
            },
          },
          {
            id: 'process',
            type: 'code',
            position: { x: 400, y: 0 },
            data: {
              label: 'Process Item',
              config: {
                code: 'return { processed: $json.item };',
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trigger', target: 'loop' },
          { id: 'e2', source: 'loop', target: 'process' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeWorkflow(workflow, {
        items: ['a', 'b', 'c'],
      });

      expect(result).toBeDefined();
    });

    it('should execute workflow with aggregation', async () => {
      const workflow: Workflow = {
        id: 'wf_aggregate',
        name: 'Aggregate Workflow',
        description: 'Aggregate data',
        nodes: [
          {
            id: 'source',
            type: 'manualTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Source', config: {} },
          },
          {
            id: 'aggregate',
            type: 'aggregate',
            position: { x: 200, y: 0 },
            data: {
              label: 'Aggregate',
              config: {
                operation: 'sum',
                field: 'value',
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'source', target: 'aggregate' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeWorkflow(workflow, {
        items: [{ value: 10 }, { value: 20 }, { value: 30 }],
      });

      expect(result).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle workflow with many nodes efficiently', async () => {
      const numNodes = 50;
      const nodes: Node[] = [
        {
          id: 'trigger',
          type: 'manualTrigger',
          position: { x: 0, y: 0 },
          data: { label: 'Start', config: {} },
        },
      ];

      const edges: Edge[] = [];

      for (let i = 1; i < numNodes; i++) {
        nodes.push({
          id: `node${i}`,
          type: 'code',
          position: { x: i * 100, y: 0 },
          data: {
            label: `Node ${i}`,
            config: {
              code: `return { step: ${i}, data: $json };`,
            },
          },
        });

        edges.push({
          id: `e${i}`,
          source: i === 1 ? 'trigger' : `node${i - 1}`,
          target: `node${i}`,
        });
      }

      const workflow: Workflow = {
        id: 'wf_large',
        name: 'Large Workflow',
        description: 'Performance test',
        nodes,
        edges,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const startTime = Date.now();
      const result = await executor.executeWorkflow(workflow, { test: 'data' });
      const duration = Date.now() - startTime;

      expect(result.status).toBe('success');
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    it('should handle concurrent workflow executions', async () => {
      const workflow: Workflow = {
        id: 'wf_concurrent',
        name: 'Concurrent Workflow',
        description: 'Concurrent execution test',
        nodes: [
          {
            id: 'trigger',
            type: 'manualTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Start', config: {} },
          },
          {
            id: 'process',
            type: 'code',
            position: { x: 200, y: 0 },
            data: {
              label: 'Process',
              config: {
                code: 'return { id: $json.id, timestamp: Date.now() };',
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trigger', target: 'process' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const executions = Array.from({ length: 10 }, (_, i) =>
        executor.executeWorkflow(workflow, { id: i })
      );

      const results = await Promise.all(executions);

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.status).toBe('success');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle workflow with no edges', async () => {
      const workflow: Workflow = {
        id: 'wf_no_edges',
        name: 'No Edges Workflow',
        description: 'Workflow with isolated nodes',
        nodes: [
          {
            id: 'node1',
            type: 'manualTrigger',
            position: { x: 0, y: 0 },
            data: { label: 'Node 1', config: {} },
          },
          {
            id: 'node2',
            type: 'manualTrigger',
            position: { x: 200, y: 0 },
            data: { label: 'Node 2', config: {} },
          },
        ],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeWorkflow(workflow, {});
      expect(result).toBeDefined();
    });

    it('should handle empty workflow', async () => {
      const workflow: Workflow = {
        id: 'wf_empty',
        name: 'Empty Workflow',
        description: 'No nodes',
        nodes: [],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await executor.executeWorkflow(workflow, {});
      expect(result).toBeDefined();
    });

    it('should handle circular dependencies gracefully', async () => {
      const workflow: Workflow = {
        id: 'wf_circular',
        name: 'Circular Workflow',
        description: 'Has circular dependencies',
        nodes: [
          {
            id: 'node1',
            type: 'code',
            position: { x: 0, y: 0 },
            data: {
              label: 'Node 1',
              config: { code: 'return { from: "node1" };' },
            },
          },
          {
            id: 'node2',
            type: 'code',
            position: { x: 200, y: 0 },
            data: {
              label: 'Node 2',
              config: { code: 'return { from: "node2" };' },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'node1', target: 'node2' },
          { id: 'e2', source: 'node2', target: 'node1' }, // Circular
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Should detect circular dependency and handle it
      const result = await executor.executeWorkflow(workflow, {});
      expect(result).toBeDefined();
    });
  });
});
