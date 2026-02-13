/**
 * Integration Tests: Workflow Execution
 * Tests for workflow execution engine and execution flow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UserFactory, WorkflowFactory, ExecutionFactory } from '../../factories';
import { testUtils } from '../../setup/integration-setup';
import { WorkflowExecutor } from '../../../src/components/ExecutionEngine';
import { TestAssertions } from '../../utils/assertions';
import { ExecutionStatus } from '@prisma/client';

describe('Workflow Execution Integration Tests', () => {
  let user: Awaited<ReturnType<typeof UserFactory.create>>;
  let executor: WorkflowExecutor;

  beforeEach(async () => {
    user = await UserFactory.create();
    executor = new WorkflowExecutor();
  });

  describe('Basic Execution', () => {
    it('should execute simple workflow successfully', async () => {
      const workflow = await WorkflowFactory.create(user.id, {
        nodes: [
          {
            id: 'node-1',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: {
              label: 'Manual Trigger',
              nodeType: 'manual',
              config: {}
            }
          },
          {
            id: 'node-2',
            type: 'action',
            position: { x: 300, y: 100 },
            data: {
              label: 'Log Action',
              nodeType: 'log',
              config: {
                message: 'Test log message'
              }
            }
          }
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2' }
        ]
      });

      const executionResult = await executor.execute(workflow, { test: true });

      expect(executionResult.status).toBe('SUCCESS');
      expect(executionResult.error).toBeNull();
      expect(executionResult.nodeExecutions).toHaveLength(2);
      expect(executionResult.duration).toBeGreaterThan(0);
    });

    it('should handle parallel execution branches', async () => {
      const workflow = await WorkflowFactory.create(user.id, {
        nodes: [
          {
            id: 'node-1',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Start', nodeType: 'manual', config: {} }
          },
          {
            id: 'node-2a',
            type: 'action',
            position: { x: 300, y: 50 },
            data: { label: 'Branch A', nodeType: 'log', config: {} }
          },
          {
            id: 'node-2b',
            type: 'action',
            position: { x: 300, y: 150 },
            data: { label: 'Branch B', nodeType: 'log', config: {} }
          }
        ],
        edges: [
          { id: 'edge-1a', source: 'node-1', target: 'node-2a' },
          { id: 'edge-1b', source: 'node-1', target: 'node-2b' }
        ]
      });

      const executionResult = await executor.execute(workflow, {});

      expect(executionResult.status).toBe('SUCCESS');
      expect(executionResult.nodeExecutions).toHaveLength(3);

      // Both branches should execute
      const branchAExecution = executionResult.nodeExecutions.find(ne => ne.nodeId === 'node-2a');
      const branchBExecution = executionResult.nodeExecutions.find(ne => ne.nodeId === 'node-2b');

      expect(branchAExecution?.status).toBe('SUCCESS');
      expect(branchBExecution?.status).toBe('SUCCESS');
    });

    it('should execute workflow with data transformation', async () => {
      const workflow = await WorkflowFactory.create(user.id, {
        nodes: [
          {
            id: 'node-1',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Start', nodeType: 'manual', config: {} }
          },
          {
            id: 'node-2',
            type: 'transform',
            position: { x: 300, y: 100 },
            data: {
              label: 'Transform',
              nodeType: 'json-transform',
              config: {
                transformation: 'return { ...data, processed: true, count: (data.count || 0) + 1 }'
              }
            }
          }
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2' }
        ]
      });

      const inputData = { count: 5, value: 'test' };
      const executionResult = await executor.execute(workflow, inputData);

      expect(executionResult.status).toBe('SUCCESS');

      const transformNode = executionResult.nodeExecutions.find(ne => ne.nodeId === 'node-2');
      expect(transformNode?.output).toMatchObject({
        processed: true,
        count: 6,
        value: 'test'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle node execution errors', async () => {
      const workflow = await WorkflowFactory.create(user.id, {
        nodes: [
          {
            id: 'node-1',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Start', nodeType: 'manual', config: {} }
          },
          {
            id: 'node-2',
            type: 'action',
            position: { x: 300, y: 100 },
            data: {
              label: 'Failing Node',
              nodeType: 'http-request',
              config: {
                url: 'http://invalid-domain-that-does-not-exist.com',
                method: 'GET'
              }
            }
          }
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2' }
        ]
      });

      const executionResult = await executor.execute(workflow, {});

      expect(executionResult.status).toBe('FAILED');
      expect(executionResult.error).toBeDefined();

      const failingNode = executionResult.nodeExecutions.find(ne => ne.nodeId === 'node-2');
      expect(failingNode?.status).toBe('FAILED');
      expect(failingNode?.error).toBeDefined();
    });

    it('should execute error branch on node failure', async () => {
      const workflow = await WorkflowFactory.create(user.id, {
        nodes: [
          {
            id: 'node-1',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Start', nodeType: 'manual', config: {} }
          },
          {
            id: 'node-2',
            type: 'action',
            position: { x: 300, y: 100 },
            data: {
              label: 'Risky Operation',
              nodeType: 'http-request',
              config: {
                url: 'http://invalid-domain.com',
                method: 'GET'
              }
            }
          },
          {
            id: 'node-3-error',
            type: 'action',
            position: { x: 500, y: 150 },
            data: {
              label: 'Error Handler',
              nodeType: 'log',
              config: {
                message: 'Error occurred: {{$error.message}}'
              }
            }
          }
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2' },
          { id: 'edge-2', source: 'node-2', target: 'node-3-error', type: 'error' }
        ]
      });

      const executionResult = await executor.execute(workflow, {});

      // Error handler should execute
      const errorHandler = executionResult.nodeExecutions.find(ne => ne.nodeId === 'node-3-error');
      expect(errorHandler?.status).toBe('SUCCESS');
      expect(errorHandler).toBeDefined();
    });

    it('should handle timeout', async () => {
      const workflow = await WorkflowFactory.create(user.id, {
        nodes: [
          {
            id: 'node-1',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Start', nodeType: 'manual', config: {} }
          },
          {
            id: 'node-2',
            type: 'action',
            position: { x: 300, y: 100 },
            data: {
              label: 'Long Running',
              nodeType: 'delay',
              config: {
                duration: 60000 // 60 seconds
              }
            }
          }
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2' }
        ]
      });

      const executionResult = await executor.execute(workflow, {}, { timeout: 1000 });

      expect(executionResult.status).toBe('TIMEOUT');
      expect(executionResult.error?.code).toBe('EXECUTION_TIMEOUT');
    });
  });

  describe('Conditional Logic', () => {
    it('should execute conditional branches', async () => {
      const workflow = await WorkflowFactory.create(user.id, {
        nodes: [
          {
            id: 'node-1',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Start', nodeType: 'manual', config: {} }
          },
          {
            id: 'node-2',
            type: 'filter',
            position: { x: 300, y: 100 },
            data: {
              label: 'Filter',
              nodeType: 'filter',
              config: {
                condition: '{{$input.value}} > 10'
              }
            }
          },
          {
            id: 'node-3-true',
            type: 'action',
            position: { x: 500, y: 50 },
            data: { label: 'True Branch', nodeType: 'log', config: {} }
          },
          {
            id: 'node-3-false',
            type: 'action',
            position: { x: 500, y: 150 },
            data: { label: 'False Branch', nodeType: 'log', config: {} }
          }
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2' },
          { id: 'edge-2', source: 'node-2', target: 'node-3-true', label: 'true' },
          { id: 'edge-3', source: 'node-2', target: 'node-3-false', label: 'false' }
        ]
      });

      // Test true condition
      const trueResult = await executor.execute(workflow, { value: 15 });
      const trueBranchExecution = trueResult.nodeExecutions.find(ne => ne.nodeId === 'node-3-true');
      const falseBranchExecution = trueResult.nodeExecutions.find(ne => ne.nodeId === 'node-3-false');

      expect(trueBranchExecution).toBeDefined();
      expect(falseBranchExecution).toBeUndefined();

      // Test false condition
      const falseResult = await executor.execute(workflow, { value: 5 });
      const trueBranchExecution2 = falseResult.nodeExecutions.find(ne => ne.nodeId === 'node-3-true');
      const falseBranchExecution2 = falseResult.nodeExecutions.find(ne => ne.nodeId === 'node-3-false');

      expect(trueBranchExecution2).toBeUndefined();
      expect(falseBranchExecution2).toBeDefined();
    });

    it('should support switch/case logic', async () => {
      const workflow = await WorkflowFactory.create(user.id, {
        nodes: [
          {
            id: 'node-1',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Start', nodeType: 'manual', config: {} }
          },
          {
            id: 'node-2',
            type: 'switch',
            position: { x: 300, y: 100 },
            data: {
              label: 'Switch',
              nodeType: 'switch',
              config: {
                expression: '{{$input.type}}',
                cases: {
                  'type-a': 'node-3a',
                  'type-b': 'node-3b',
                  'default': 'node-3c'
                }
              }
            }
          },
          {
            id: 'node-3a',
            type: 'action',
            position: { x: 500, y: 50 },
            data: { label: 'Type A Handler', nodeType: 'log', config: {} }
          },
          {
            id: 'node-3b',
            type: 'action',
            position: { x: 500, y: 100 },
            data: { label: 'Type B Handler', nodeType: 'log', config: {} }
          },
          {
            id: 'node-3c',
            type: 'action',
            position: { x: 500, y: 150 },
            data: { label: 'Default Handler', nodeType: 'log', config: {} }
          }
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2' },
          { id: 'edge-2a', source: 'node-2', target: 'node-3a', label: 'type-a' },
          { id: 'edge-2b', source: 'node-2', target: 'node-3b', label: 'type-b' },
          { id: 'edge-2c', source: 'node-2', target: 'node-3c', label: 'default' }
        ]
      });

      const resultA = await executor.execute(workflow, { type: 'type-a' });
      expect(resultA.nodeExecutions.find(ne => ne.nodeId === 'node-3a')).toBeDefined();

      const resultB = await executor.execute(workflow, { type: 'type-b' });
      expect(resultB.nodeExecutions.find(ne => ne.nodeId === 'node-3b')).toBeDefined();

      const resultDefault = await executor.execute(workflow, { type: 'unknown' });
      expect(resultDefault.nodeExecutions.find(ne => ne.nodeId === 'node-3c')).toBeDefined();
    });
  });

  describe('Sub-Workflows', () => {
    it('should execute sub-workflows', async () => {
      // Create sub-workflow
      const subWorkflow = await WorkflowFactory.create(user.id, {
        name: 'Sub-Workflow',
        nodes: [
          {
            id: 'sub-node-1',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Sub Start', nodeType: 'manual', config: {} }
          },
          {
            id: 'sub-node-2',
            type: 'transform',
            position: { x: 300, y: 100 },
            data: {
              label: 'Sub Transform',
              nodeType: 'json-transform',
              config: {
                transformation: 'return { ...data, fromSubWorkflow: true }'
              }
            }
          }
        ],
        edges: [
          { id: 'sub-edge-1', source: 'sub-node-1', target: 'sub-node-2' }
        ]
      });

      // Create main workflow that calls sub-workflow
      const mainWorkflow = await WorkflowFactory.create(user.id, {
        nodes: [
          {
            id: 'node-1',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: { label: 'Start', nodeType: 'manual', config: {} }
          },
          {
            id: 'node-2',
            type: 'sub-workflow',
            position: { x: 300, y: 100 },
            data: {
              label: 'Call Sub-Workflow',
              nodeType: 'sub-workflow',
              config: {
                workflowId: subWorkflow.id
              }
            }
          }
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2' }
        ]
      });

      const result = await executor.execute(mainWorkflow, { test: true });

      expect(result.status).toBe('SUCCESS');

      const subWorkflowNode = result.nodeExecutions.find(ne => ne.nodeId === 'node-2');
      expect(subWorkflowNode?.output).toMatchObject({
        fromSubWorkflow: true,
        test: true
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large workflows efficiently', async () => {
      // Create workflow with 50 nodes
      const nodes = [];
      const edges = [];

      for (let i = 1; i <= 50; i++) {
        nodes.push({
          id: `node-${i}`,
          type: i === 1 ? 'trigger' : 'action',
          position: { x: 100 * i, y: 100 },
          data: {
            label: `Node ${i}`,
            nodeType: i === 1 ? 'manual' : 'log',
            config: {}
          }
        });

        if (i > 1) {
          edges.push({
            id: `edge-${i - 1}`,
            source: `node-${i - 1}`,
            target: `node-${i}`
          });
        }
      }

      const workflow = await WorkflowFactory.create(user.id, { nodes, edges });

      const startTime = Date.now();
      const result = await executor.execute(workflow, {});
      const duration = Date.now() - startTime;

      expect(result.status).toBe('SUCCESS');
      expect(result.nodeExecutions).toHaveLength(50);
      expect(duration).toBeLessThan(10000); // Should complete in less than 10 seconds
    });

    it('should handle concurrent executions', async () => {
      const workflow = await WorkflowFactory.create(user.id);

      const executions = Array(10).fill(null).map((_, i) =>
        executor.execute(workflow, { executionNumber: i })
      );

      const results = await Promise.all(executions);

      expect(results).toHaveLength(10);
      expect(results.every(r => r.status === 'SUCCESS')).toBe(true);
    });
  });

  describe('Execution Persistence', () => {
    it('should save execution to database', async () => {
      const workflow = await WorkflowFactory.create(user.id);

      const result = await executor.execute(workflow, { test: true });

      // Verify execution was saved
      const prisma = testUtils.prisma();
      const savedExecution = await prisma.workflowExecution.findFirst({
        where: {
          workflowId: workflow.id
        },
        include: {
          nodeExecutions: true
        }
      });

      expect(savedExecution).toBeDefined();
      TestAssertions.assertValidExecution(savedExecution!);
      expect(savedExecution!.status).toBe(ExecutionStatus.SUCCESS);
      expect(savedExecution!.nodeExecutions.length).toBeGreaterThan(0);
    });

    it('should track execution metrics', async () => {
      const workflow = await WorkflowFactory.create(user.id);

      await executor.execute(workflow, {});

      const prisma = testUtils.prisma();
      const execution = await prisma.workflowExecution.findFirst({
        where: { workflowId: workflow.id }
      });

      expect(execution?.duration).toBeGreaterThan(0);
      expect(execution?.startedAt).toBeInstanceOf(Date);
      expect(execution?.finishedAt).toBeInstanceOf(Date);
      TestAssertions.assertDatesClose(
        execution!.finishedAt!,
        new Date(execution!.startedAt.getTime() + execution!.duration!)
      );
    });
  });

  describe('Real-time Updates', () => {
    it('should emit execution progress events', async () => {
      const workflow = await WorkflowFactory.create(user.id);

      const events: unknown[] = [];

      executor.on('node-start', (event) => events.push({ type: 'node-start', ...event }));
      executor.on('node-complete', (event) => events.push({ type: 'node-complete', ...event }));
      executor.on('execution-complete', (event) => events.push({ type: 'execution-complete', ...event }));

      await executor.execute(workflow, {});

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'execution-complete')).toBe(true);
    });
  });
});
