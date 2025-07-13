import { describe, it, expect } from 'vitest';
import { WorkflowExecutor } from '../components/ExecutionEngine';

const dummyNode = (id: string, type: string, config: any = {}) => ({
  id,
  data: { id, type, label: type, config }
});

describe('WorkflowExecutor advanced nodes', () => {
  it('loops with delay', async () => {
    const node = dummyNode('1', 'loop', { maxIterations: 2, delayMs: 0 });
    const executor = new WorkflowExecutor([node], []);
    const result: any = await executor.executeLoop(node, node.data.config, { items: [1, 2, 3] });
    expect(result.iterations).toBe(2);
    expect(result.results.length).toBe(2);
  });

  it('performs ETL filtering and selection', async () => {
    const node = dummyNode('1', 'etl', { selectFields: ['name'], filterField: 'active', filterValue: true });
    const executor = new WorkflowExecutor([node], []);
    const data = [
      { name: 'Alice', active: true, age: 30 },
      { name: 'Bob', active: false, age: 40 }
    ];
    const res: any = await executor.executeETL(node, node.data.config, { data });
    expect(res.data.length).toBe(1);
    expect(res.data[0]).toEqual({ name: 'Alice' });
  });

  it('routes to error handle when node fails', async () => {
    const n1 = dummyNode('1', 'errorGenerator');
    const n2 = dummyNode('2', 'transform');
    const edges = [
      { id: 'e1-2', source: '1', target: '2', sourceHandle: 'error', type: 'default' }
    ];
    const executor = new WorkflowExecutor([n1, n2], edges);
    const res: any = await executor.execute(() => {}, () => {}, () => {});
    expect(Object.keys(res.results)).toContain('2');
  });

  it('respects edge expression conditions', async () => {
    const start = dummyNode('s', 'trigger', { mockData: { value: 5 } });
    const yes = dummyNode('y', 'transform');
    const no = dummyNode('n', 'transform');
    const edges = [
      { id: 'e1', source: 's', target: 'y', type: 'default', data: { condition: '$json.data.value > 3' } },
      { id: 'e2', source: 's', target: 'n', type: 'default', data: { condition: '$json.data.value < 3' } }
    ];
    const exec = new WorkflowExecutor([start, yes, no], edges);
    const res: any = await exec.execute(() => {}, () => {}, () => {});
    expect(Object.keys(res.results)).toContain('y');
    expect(Object.keys(res.results)).not.toContain('n');
  });
});
