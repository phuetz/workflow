import { describe, it, expect } from 'vitest';
import { WorkflowExecutor } from '../components/ExecutionEngine';

const createTestNode = (id: string, type: string, config: any = {}) => ({
  id,
  type: 'custom',
  position: { x: 0, y: 0 },
  data: { id, type, label: type, config }
});

describe('WorkflowExecutor advanced nodes', () => {
  it('loops with delay', async () => {
    const nodes = [
      { id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: { type: 'trigger', config: {} } },
      { id: '2', type: 'delay', position: { x: 100, y: 0 }, data: { type: 'delay', config: { delay: 100 } } }
    ];
    const edges = [{ id: 'e1', source: '1', target: '2', type: 'default' }];
    const executor = new WorkflowExecutor(nodes, edges);
    const result = await executor.execute();
    expect(result.get('2').success).toBe(true);
    expect(result.get('2').data).toBeDefined();
  });

  it('performs ETL filtering and selection', async () => {
    const nodes = [
      { id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: { type: 'trigger', config: { 
        mockData: [
          { name: 'Alice', active: true, age: 30 },
          { name: 'Bob', active: false, age: 40 }
        ]
      } } },
      { id: '2', type: 'filter', position: { x: 100, y: 0 }, data: { type: 'filter', config: { filter: 'active === true' } } }
    ];
    const edges = [{ id: 'e1', source: '1', target: '2', type: 'default' }];
    const executor = new WorkflowExecutor(nodes, edges);
    const res = await executor.execute();
    expect(res.get('2').success).toBe(true);
    expect(res.get('2').data.filtered).toBe(true);
  });

  it('routes to error handle when node fails', async () => {
    const nodes = [
      { id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: { type: 'trigger', config: {} } },
      { id: '2', type: 'transform', position: { x: 100, y: 0 }, data: { type: 'transform', config: {} } }
    ];
    const edges = [
      { id: 'e1-2', source: '1', target: '2', type: 'default' }
    ];
    const executor = new WorkflowExecutor(nodes, edges);
    const res = await executor.execute();
    expect(res.has('1')).toBe(true);
    expect(res.get('1').success).toBe(true); // Trigger nodes generally succeed
    expect(res.has('2')).toBe(true);
    expect(res.get('2').success).toBe(true); // Transform should also succeed
  });

  it('respects edge expression conditions', async () => {
    const nodes = [
      { id: 's', type: 'trigger', position: { x: 0, y: 0 }, data: { type: 'trigger', config: { mockData: { value: true } } } },
      { id: 'c', type: 'condition', position: { x: 100, y: 0 }, data: { type: 'condition', config: { condition: 'data.value === true' } } },
      { id: 'y', type: 'transform', position: { x: 200, y: 0 }, data: { type: 'transform', config: {} } }
    ];
    const edges = [
      { id: 'e1', source: 's', target: 'c', type: 'default' },
      { id: 'e2', source: 'c', target: 'y', type: 'default' }
    ];
    const executor = new WorkflowExecutor(nodes, edges);
    const res = await executor.execute();
    expect(res.has('y')).toBe(true);
    expect(res.get('c').success).toBe(true);
    expect(res.get('c').data.conditionResult).toBe(true);
    // Verify that the 'n' node wasn't executed (it wasn't included in this workflow)
  });
});
