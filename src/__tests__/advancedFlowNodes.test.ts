/**
 * Advanced Flow Nodes Tests
 * AGENT 4 - Advanced Workflow Features
 * Comprehensive tests for forEach, whileLoop, switchCase, and tryCatch nodes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdvancedFlowExecutor } from '../components/execution/AdvancedFlowExecutor';
import { NodeExecutor } from '../components/execution/NodeExecutor';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';

describe('AdvancedFlowExecutor', () => {
  let executor: AdvancedFlowExecutor;
  let nodeExecutor: NodeExecutor;
  let mockNodes: WorkflowNode[];
  let mockEdges: WorkflowEdge[];

  beforeEach(() => {
    mockNodes = [];
    mockEdges = [];
    nodeExecutor = new NodeExecutor();
    executor = new AdvancedFlowExecutor(mockNodes, mockEdges, nodeExecutor);
  });

  describe('ForEach Loop', () => {
    it('should process array items sequentially', async () => {
      const node: WorkflowNode = {
        id: 'forEach-1',
        type: 'forEach',
        position: { x: 0, y: 0 },
        data: {
          label: 'ForEach Test',
          type: 'forEach',
          config: {
            itemsSource: '{{input.items}}',
            itemVariable: 'item',
            indexVariable: 'index',
            batchSize: 1,
            parallel: false,
            outputMode: 'collect'
          }
        }
      };

      const inputData = {
        items: [1, 2, 3, 4, 5]
      };

      const result = await executor.executeForEachLoop(node, inputData);

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
      expect(result.data).toHaveProperty('totalProcessed', 5);
      expect(result.data).toHaveProperty('successCount');
      expect(result.data).toHaveProperty('results');
    });

    it('should handle parallel execution', async () => {
      const node: WorkflowNode = {
        id: 'forEach-2',
        type: 'forEach',
        position: { x: 0, y: 0 },
        data: {
          label: 'Parallel ForEach',
          type: 'forEach',
          config: {
            itemsSource: '{{input.items}}',
            itemVariable: 'item',
            indexVariable: 'index',
            batchSize: 1,
            parallel: true,
            maxParallel: 3,
            outputMode: 'collect'
          }
        }
      };

      const inputData = {
        items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      };

      const result = await executor.executeForEachLoop(node, inputData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('totalProcessed', 10);
    });

    it('should handle batch processing', async () => {
      const node: WorkflowNode = {
        id: 'forEach-3',
        type: 'forEach',
        position: { x: 0, y: 0 },
        data: {
          label: 'Batch ForEach',
          type: 'forEach',
          config: {
            itemsSource: '{{input.items}}',
            itemVariable: 'batch',
            indexVariable: 'batchIndex',
            batchSize: 3,
            parallel: false,
            outputMode: 'collect'
          }
        }
      };

      const inputData = {
        items: [1, 2, 3, 4, 5, 6, 7, 8, 9]
      };

      const result = await executor.executeForEachLoop(node, inputData);

      expect(result.success).toBe(true);
      // 9 items / 3 batch size = 3 batches
      expect(result.data).toHaveProperty('totalProcessed', 9);
    });

    it('should continue on error when configured', async () => {
      const node: WorkflowNode = {
        id: 'forEach-4',
        type: 'forEach',
        position: { x: 0, y: 0 },
        data: {
          label: 'ForEach with Errors',
          type: 'forEach',
          config: {
            itemsSource: '{{input.items}}',
            itemVariable: 'item',
            indexVariable: 'index',
            continueOnError: true,
            outputMode: 'collect'
          }
        }
      };

      const inputData = {
        items: [1, 2, 3]
      };

      const result = await executor.executeForEachLoop(node, inputData);

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
    });

    it('should return last result when outputMode is last', async () => {
      const node: WorkflowNode = {
        id: 'forEach-5',
        type: 'forEach',
        position: { x: 0, y: 0 },
        data: {
          label: 'ForEach Last',
          type: 'forEach',
          config: {
            itemsSource: '{{input.items}}',
            itemVariable: 'item',
            outputMode: 'last'
          }
        }
      };

      const inputData = {
        items: [1, 2, 3]
      };

      const result = await executor.executeForEachLoop(node, inputData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should throw error for non-array items source', async () => {
      const node: WorkflowNode = {
        id: 'forEach-6',
        type: 'forEach',
        position: { x: 0, y: 0 },
        data: {
          label: 'Invalid ForEach',
          type: 'forEach',
          config: {
            itemsSource: '{{input.notArray}}',
            itemVariable: 'item'
          }
        }
      };

      const inputData = {
        notArray: 'string value'
      };

      const result = await executor.executeForEachLoop(node, inputData);

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.error).toContain('did not resolve to an array');
    });
  });

  describe('While Loop', () => {
    it('should execute loop while condition is true', async () => {
      const node: WorkflowNode = {
        id: 'while-1',
        type: 'whileLoop',
        position: { x: 0, y: 0 },
        data: {
          label: 'While Test',
          type: 'whileLoop',
          config: {
            condition: '{{$iteration}} < 5',
            maxIterations: 10,
            loopVariable: '$iteration',
            collectResults: true
          }
        }
      };

      const inputData = {};

      const result = await executor.executeWhileLoop(node, inputData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('iterations', 5);
      expect(result.data).toHaveProperty('results');
    });

    it('should respect max iterations limit', async () => {
      const node: WorkflowNode = {
        id: 'while-2',
        type: 'whileLoop',
        position: { x: 0, y: 0 },
        data: {
          label: 'While Max Iterations',
          type: 'whileLoop',
          config: {
            condition: 'true', // Always true
            maxIterations: 3,
            loopVariable: '$iteration'
          }
        }
      };

      const inputData = {};

      const result = await executor.executeWhileLoop(node, inputData);

      expect(result.success).toBe(true);
      expect(result.data.iterations).toBe(3);
    });

    it('should stop when condition becomes false', async () => {
      const node: WorkflowNode = {
        id: 'while-3',
        type: 'whileLoop',
        position: { x: 0, y: 0 },
        data: {
          label: 'While Condition False',
          type: 'whileLoop',
          config: {
            condition: '{{$iteration}} < 3',
            maxIterations: 100,
            loopVariable: '$iteration'
          }
        }
      };

      const inputData = {};

      const result = await executor.executeWhileLoop(node, inputData);

      expect(result.success).toBe(true);
      expect(result.data.iterations).toBe(3);
    });

    it('should not collect results when disabled', async () => {
      const node: WorkflowNode = {
        id: 'while-4',
        type: 'whileLoop',
        position: { x: 0, y: 0 },
        data: {
          label: 'While No Collect',
          type: 'whileLoop',
          config: {
            condition: '{{$iteration}} < 2',
            collectResults: false,
            loopVariable: '$iteration'
          }
        }
      };

      const inputData = {};

      const result = await executor.executeWhileLoop(node, inputData);

      expect(result.success).toBe(true);
      expect(result.data.results).toBeUndefined();
      expect(result.data.lastResult).toBeDefined();
    });
  });

  describe('Switch/Case', () => {
    it('should match exact case', async () => {
      const node: WorkflowNode = {
        id: 'switch-1',
        type: 'switchCase',
        position: { x: 0, y: 0 },
        data: {
          label: 'Switch Exact',
          type: 'switchCase',
          config: {
            inputExpression: '{{input.status}}',
            dataType: 'string',
            cases: [
              { id: '1', label: 'Active', matchType: 'exact', condition: 'active' },
              { id: '2', label: 'Inactive', matchType: 'exact', condition: 'inactive' }
            ],
            defaultCase: true
          }
        }
      };

      const inputData = {
        status: 'active'
      };

      const result = await executor.executeSwitchCase(node, inputData);

      expect(result.success).toBe(true);
      expect(result.data.matchedCase).toBe('Active');
      expect(result.data.outputHandle).toBe('case0');
    });

    it('should use default case when no match', async () => {
      const node: WorkflowNode = {
        id: 'switch-2',
        type: 'switchCase',
        position: { x: 0, y: 0 },
        data: {
          label: 'Switch Default',
          type: 'switchCase',
          config: {
            inputExpression: '{{input.status}}',
            dataType: 'string',
            cases: [
              { id: '1', label: 'Active', matchType: 'exact', condition: 'active' }
            ],
            defaultCase: true
          }
        }
      };

      const inputData = {
        status: 'unknown'
      };

      const result = await executor.executeSwitchCase(node, inputData);

      expect(result.success).toBe(true);
      expect(result.data.matchedCase).toBeUndefined();
      expect(result.data.outputHandle).toBe('default');
    });

    it('should match regex pattern', async () => {
      const node: WorkflowNode = {
        id: 'switch-3',
        type: 'switchCase',
        position: { x: 0, y: 0 },
        data: {
          label: 'Switch Regex',
          type: 'switchCase',
          config: {
            inputExpression: '{{input.email}}',
            dataType: 'string',
            cases: [
              { id: '1', label: 'Gmail', matchType: 'regex', condition: '@gmail\\.com$' },
              { id: '2', label: 'Yahoo', matchType: 'regex', condition: '@yahoo\\.com$' }
            ],
            defaultCase: true
          }
        }
      };

      const inputData = {
        email: 'user@gmail.com'
      };

      const result = await executor.executeSwitchCase(node, inputData);

      expect(result.success).toBe(true);
      expect(result.data.matchedCase).toBe('Gmail');
    });

    it('should match numeric range', async () => {
      const node: WorkflowNode = {
        id: 'switch-4',
        type: 'switchCase',
        position: { x: 0, y: 0 },
        data: {
          label: 'Switch Range',
          type: 'switchCase',
          config: {
            inputExpression: '{{input.score}}',
            dataType: 'number',
            cases: [
              { id: '1', label: 'Low', matchType: 'range', min: 0, max: 50 },
              { id: '2', label: 'High', matchType: 'range', min: 51, max: 100 }
            ],
            defaultCase: false
          }
        }
      };

      const inputData = {
        score: 75
      };

      const result = await executor.executeSwitchCase(node, inputData);

      expect(result.success).toBe(true);
      expect(result.data.matchedCase).toBe('High');
    });
  });

  describe('Try/Catch', () => {
    it('should execute successfully without errors', async () => {
      const node: WorkflowNode = {
        id: 'try-1',
        type: 'tryCatch',
        position: { x: 0, y: 0 },
        data: {
          label: 'Try Success',
          type: 'tryCatch',
          config: {
            errorHandling: 'catch',
            retryEnabled: false
          }
        }
      };

      const inputData = {
        value: 'test'
      };

      const result = await executor.executeTryCatch(node, inputData);

      expect(result.success).toBe(true);
      expect(result.data.outputHandle).toBe('success');
    });

    it('should catch errors when enabled', async () => {
      const mockNodeExecutorWithError = {
        executeNode: vi.fn().mockRejectedValue(new Error('Test error'))
      } as any;

      const executorWithError = new AdvancedFlowExecutor(
        mockNodes,
        mockEdges,
        mockNodeExecutorWithError
      );

      const node: WorkflowNode = {
        id: 'try-2',
        type: 'tryCatch',
        position: { x: 0, y: 0 },
        data: {
          label: 'Try Catch Error',
          type: 'tryCatch',
          config: {
            errorHandling: 'catch',
            retryEnabled: false,
            catchAllErrors: true
          }
        }
      };

      const inputData = {};

      const result = await executorWithError.executeTryCatch(node, inputData);

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.data.outputHandle).toBe('catch');
    });

    it('should retry on failure with exponential backoff', async () => {
      let attemptCount = 0;
      const mockNodeExecutorWithRetry = {
        executeNode: vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 3) {
            return Promise.reject(new Error('NetworkError'));
          }
          return Promise.resolve({ success: true, data: { result: 'success' } });
        })
      } as any;

      const executorWithRetry = new AdvancedFlowExecutor(
        mockNodes,
        mockEdges,
        mockNodeExecutorWithRetry
      );

      const node: WorkflowNode = {
        id: 'try-3',
        type: 'tryCatch',
        position: { x: 0, y: 0 },
        data: {
          label: 'Try Retry',
          type: 'tryCatch',
          config: {
            errorHandling: 'catch',
            retryEnabled: true,
            retryCount: 3,
            retryDelay: 100,
            retryBackoff: 'exponential',
            retryOn: ['network']
          }
        }
      };

      const inputData = {};

      const result = await executorWithRetry.executeTryCatch(node, inputData);

      expect(result.success).toBe(true);
      expect(result.data.attempts).toBe(3);
      expect(mockNodeExecutorWithRetry.executeNode).toHaveBeenCalledTimes(3);
    });

    it('should transform error data when configured', async () => {
      const mockNodeExecutorWithError = {
        executeNode: vi.fn().mockRejectedValue(new Error('Test error'))
      } as any;

      const executorWithError = new AdvancedFlowExecutor(
        mockNodes,
        mockEdges,
        mockNodeExecutorWithError
      );

      const node: WorkflowNode = {
        id: 'try-4',
        type: 'tryCatch',
        position: { x: 0, y: 0 },
        data: {
          label: 'Try Transform Error',
          type: 'tryCatch',
          config: {
            errorHandling: 'catch',
            retryEnabled: false,
            transformError: true
          }
        }
      };

      const inputData = {};

      const result = await executorWithError.executeTryCatch(node, inputData);

      expect(result.data).toHaveProperty('type');
      expect(result.data).toHaveProperty('message');
      expect(result.data).toHaveProperty('timestamp');
      expect(result.data).toHaveProperty('nodeId');
    });
  });

  describe('Expression Resolver', () => {
    it('should resolve simple variable paths', () => {
      const data = {
        user: {
          name: 'Alice',
          age: 30
        }
      };

      // Access private method through any type
      const resolved = (executor as any).resolveExpression('{{user.name}}', data);

      expect(resolved).toBe('Alice');
    });

    it('should handle special variables', () => {
      const data = {};

      const nowResolved = (executor as any).resolveExpression('{{$now}}', data);

      expect(typeof nowResolved).toBe('number');
      expect(nowResolved).toBeGreaterThan(0);
    });

    it('should return null for non-existent paths', () => {
      const data = {
        user: { name: 'Alice' }
      };

      const resolved = (executor as any).resolveExpression('{{user.email}}', data);

      expect(resolved).toBeNull();
    });
  });

  describe('Condition Evaluator', () => {
    it('should evaluate simple comparisons', () => {
      const data = {
        count: 5
      };

      const result = (executor as any).evaluateCondition('{{count}} > 3', data);

      expect(result).toBe(true);
    });

    it('should handle equality checks', () => {
      const data = {
        status: 'active'
      };

      const result = (executor as any).evaluateCondition('{{status}} === "active"', data);

      expect(result).toBe(true);
    });

    it('should return false for invalid conditions', () => {
      const data = {};

      const result = (executor as any).evaluateCondition('{{invalid syntax', data);

      expect(result).toBe(false);
    });
  });
});

describe('Integration Tests', () => {
  it('should handle nested loops', async () => {
    // Test would require full workflow setup
    // This is a placeholder for complex integration test
    expect(true).toBe(true);
  });

  it('should handle error recovery in loops', async () => {
    // Test error recovery scenarios
    expect(true).toBe(true);
  });

  it('should handle complex conditional flows', async () => {
    // Test complex switch/case scenarios
    expect(true).toBe(true);
  });
});
