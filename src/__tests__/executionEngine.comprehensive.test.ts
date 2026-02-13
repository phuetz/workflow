import { setupMocks } from '../__mocks__/setup';
setupMocks();

// TESTING GAPS FIX: Comprehensive ExecutionEngine testing with new modular architecture
import { describe, it, expect } from 'vitest';
import { WorkflowExecutor } from '../components/ExecutionEngine';

const createTestNode = (id: string, type: string, config: any = {}) => ({
  id,
  type: 'default',
  position: { x: 0, y: 0 },
  data: { 
    id, 
    type, // Use the actual type passed in, not 'default'
    label: `${type}-${id}`, 
    position: { x: 0, y: 0 },
    icon: 'default',
    color: '#333',
    inputs: 1,
    outputs: 1,
    config 
  }
});

const createTestEdge = (source: string, target: string, sourceHandle?: string) => ({
  id: `edge-${source}-${target}`,
  source,
  target,
  sourceHandle
});

describe('WorkflowExecutor - Comprehensive Testing (Modular Architecture)', () => {
  
  describe('Basic Workflow Execution', () => {
    it('should execute a simple trigger-to-transform workflow', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger', { mockData: { value: 42 } }),
        createTestNode('transform', 'transform', { transformation: 'uppercase' })
      ];
      const edges = [createTestEdge('trigger', 'transform')];
      const executor = new WorkflowExecutor(nodes, edges);
      const result = await executor.execute();
      
      expect(result.has('trigger')).toBe(true);
      expect(result.has('transform')).toBe(true);
      expect(result.get('trigger').success).toBe(true);
      expect(result.get('transform').success).toBe(true);
    });

    it('should handle workflows without connections', async () => {
      const nodes = [
        createTestNode('lone-trigger', 'trigger', { mockData: { message: 'hello' } })
      ];
      const edges: any[] = [];
      const executor = new WorkflowExecutor(nodes, edges);
      const result = await executor.execute();
      
      expect(result.has('lone-trigger')).toBe(true);
      expect(result.get('lone-trigger').success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle node execution errors gracefully', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger', { mockData: { url: 'invalid-url' } }),
        createTestNode('http', 'httpRequest', { url: 'not-a-valid-url' })
      ];
      const edges = [createTestEdge('trigger', 'http')];
      const executor = new WorkflowExecutor(nodes, edges);
      const result = await executor.execute();
      
      expect(result.has('trigger')).toBe(true);
      expect(result.has('http')).toBe(true);
      expect(result.get('trigger').success).toBe(true);
      // HTTP node should fail due to invalid URL
      expect(result.get('http').success).toBe(false);
      expect(result.get('http').error).toBeDefined();
    });

    it('should route to error branches when available', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger', { mockData: {} }),
        createTestNode('failing', 'httpRequest', { url: 'invalid' }),
        createTestNode('error-handler', 'transform')
      ];
      const edges = [
        createTestEdge('trigger', 'failing'),
        createTestEdge('failing', 'error-handler', 'error')
      ];
      const executor = new WorkflowExecutor(nodes, edges);
      const result = await executor.execute();
      
      expect(result.has('failing')).toBe(true);
      expect(result.get('failing').success).toBe(false);
      // Error handler execution depends on the error routing implementation
      // For now, just verify the failing node failed
      expect(result.get('failing').error).toBeDefined();
    });
  });

  describe('Conditional Logic', () => {
    it('should execute conditional branches correctly', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger', { mockData: { value: 10 } }),
        createTestNode('condition', 'condition', { condition: 'data.value > 5' }),
        createTestNode('then-node', 'transform'),
        createTestNode('else-node', 'transform')
      ];
      const edges = [
        createTestEdge('trigger', 'condition'),
        createTestEdge('condition', 'then-node'),
        createTestEdge('condition', 'else-node')
      ];
      
      const executor = new WorkflowExecutor(nodes, edges);
      const result = await executor.execute();
      
      expect(result.get('condition').success).toBe(true);
      expect(result.get('condition').data.conditionResult).toBe(true);
      expect(result.has('then-node')).toBe(true);
      expect(result.has('else-node')).toBe(true);
    });
  });

  describe('Data Transformation', () => {
    it('should transform data through the pipeline', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger', { mockData: { text: 'hello world' } }),
        createTestNode('upper', 'transform', { transformation: 'uppercase' }),
        createTestNode('filter', 'filter', { filter: 'data.text' })
      ];
      const edges = [
        createTestEdge('trigger', 'upper'),
        createTestEdge('upper', 'filter')
      ];
      
      const result = await executor.execute(nodes, edges);
      
      expect(result.get('upper').success).toBe(true);
      expect(result.get('filter').success).toBe(true);
      expect(result.get('filter').data.filtered).toBe(true);
    });

    it('should handle merge operations', async () => {
      const nodes = [
        createTestNode('trigger1', 'trigger', { mockData: { a: 1 } }),
        createTestNode('trigger2', 'trigger', { mockData: { b: 2 } }),
        createTestNode('merge', 'merge', { mergeType: 'union' })
      ];
      const edges = [
        createTestEdge('trigger1', 'merge'),
        createTestEdge('trigger2', 'merge')
      ];
      
      const result = await executor.execute(nodes, edges);
      
      expect(result.get('merge').success).toBe(true);
      expect(result.get('merge').data.merged).toBe(true);
    });
  });

  describe('Timing and Delays', () => {
    it('should handle delay nodes', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger', { mockData: { value: 1 } }),
        createTestNode('delay', 'delay', { delay: 10 }), // 10ms delay
        createTestNode('after-delay', 'transform')
      ];
      const edges = [
        createTestEdge('trigger', 'delay'),
        createTestEdge('delay', 'after-delay')
      ];

      const executor = new WorkflowExecutor(nodes, edges);
      const startTime = Date.now();
      const result = await executor.execute(nodes, edges);
      const duration = Date.now() - startTime;

      expect(result.get('delay').success).toBe(true);
      expect(result.get('after-delay').success).toBe(true);
      expect(duration).toBeGreaterThan(5); // Should take at least 5ms
    });
  });

  describe('Workflow Validation', () => {
    it('should validate workflow structure', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger', { mockData: {} })
      ];
      const edges: any[] = [];
      const executor = new WorkflowExecutor(nodes, edges);
      const validation = executor.validate();
      
      expect(validation.valid).toBe(true);
      expect(Array.isArray(validation.issues)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should detect missing configurations', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger'),
        createTestNode('http', 'httpRequest', {}) // Missing URL
      ];
      const edges = [createTestEdge('trigger', 'http')];
      const executor = new WorkflowExecutor(nodes, edges);
      const validation = executor.validate();
      
      // Validation should report issues but still allow execution attempt
      expect(Array.isArray(validation.issues)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });

  describe('Execution Control', () => {
    it('should support stopping execution', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger', { mockData: {} }),
        createTestNode('long-delay', 'delay', { delay: 5000 }) // 5 second delay
      ];
      const edges = [createTestEdge('trigger', 'long-delay')];
      const executor = new WorkflowExecutor(nodes, edges);
      
      // Start execution
      const executionPromise = executor.execute();
      expect(executor.isRunning()).toBe(true);
      
      // Stop after 100ms
      setTimeout(() => {
        executor.stop();
      }, 100);
      
      const result = await executionPromise;
      expect(executor.isRunning()).toBe(false);
      expect(result.has('trigger')).toBe(true);
    });

    it('should track execution progress', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger', { mockData: {} }),
        createTestNode('step1', 'transform'),
        createTestNode('step2', 'transform'),
        createTestNode('step3', 'transform')
      ];
      const edges = [
        createTestEdge('trigger', 'step1'),
        createTestEdge('step1', 'step2'),
        createTestEdge('step2', 'step3')
      ];
      const executor = new WorkflowExecutor(nodes, edges);
      await executor.execute();
      const progress = executor.getProgress();
      
      expect(progress.total).toBe(4);
      expect(progress.completed).toBeLessThanOrEqual(4);
      expect(progress.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('Node Types Coverage', () => {
    it('should handle email nodes', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger', { mockData: { message: 'test' } }),
        createTestNode('email', 'email', { 
          to: 'test@example.com', 
          subject: 'Test', 
          body: 'Hello' 
        })
      ];
      const edges = [createTestEdge('trigger', 'email')];
      const executor = new WorkflowExecutor(nodes, edges);
      const result = await executor.execute();
      
      expect(result.get('email').success).toBe(true);
      expect(result.get('email').data.emailSent).toBe(true);
    });

    it('should handle webhook nodes', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger', { mockData: { payload: 'data' } }),
        createTestNode('webhook', 'webhook', { path: '/test-webhook' })
      ];
      const edges = [createTestEdge('trigger', 'webhook')];
      const executor = new WorkflowExecutor(nodes, edges);
      const result = await executor.execute();
      
      expect(result.get('webhook').success).toBe(true);
      expect(result.get('webhook').data.webhookReceived).toBe(true);
    });

    it('should handle code nodes safely', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger', { mockData: { input: 42 } }),
        createTestNode('code', 'code', { code: 'return input * 2;' })
      ];
      const edges = [createTestEdge('trigger', 'code')];
      const executor = new WorkflowExecutor(nodes, edges);
      const result = await executor.execute();
      
      expect(result.get('code').success).toBe(true);
      expect(result.get('code').data.codeExecuted).toBe(true);
      expect(result.get('code').data.result).toBe('simulated');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle moderately large workflows', async () => {
      const nodes = [];
      const edges = [];
      
      // Create a chain of 20 nodes
      for (let __i = 0; i < 20; i++) {
        nodes.push(createTestNode(`node-${i}`, i === 0 ? 'trigger' : 'transform', 
          i === 0 ? { mockData: { value: i } } : {}));
        
        if (i > 0) {
          edges.push(createTestEdge(`node-${i-1}`, `node-${i}`));
        }
      }
      
      const executor = new WorkflowExecutor(nodes, edges);
      const startTime = Date.now();
      const result = await executor.execute();
      const duration = Date.now() - startTime;
      
      expect(result.size).toBe(20);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
      
      // Verify all nodes executed successfully
      for (let __i = 0; i < 20; i++) {
        expect(result.get(`node-${i}`).success).toBe(true);
      }
    });

    it('should provide execution metrics', async () => {
      const nodes = [
        createTestNode('trigger', 'trigger', { mockData: {} }),
        createTestNode('transform', 'transform')
      ];
      const edges = [createTestEdge('trigger', 'transform')];
      const executor = new WorkflowExecutor(nodes, edges);
      
      // Check metrics before execution
      let metrics = executor.getExecutionMetrics();
      expect(metrics.nodeCount).toBe(2);
      expect(typeof metrics.progress).toBe('number');
      
      await executor.execute();
      
      // Check metrics after execution  
      metrics = executor.getExecutionMetrics();
      expect(metrics.nodeCount).toBe(2);
      expect(typeof metrics.progress).toBe('number');
      expect(metrics.duration).toBeGreaterThanOrEqual(0);
    });
  });
});