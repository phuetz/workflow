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
});
