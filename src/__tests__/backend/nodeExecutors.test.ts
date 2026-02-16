/**
 * Tests for backend node executors
 * Covers: dataTransform, utility, code, subWorkflow, filter, and HTTP pagination
 */
import { describe, it, expect } from 'vitest';
import type { NodeExecutionContext } from '../../backend/services/nodeExecutors/types';

function ctx(overrides: Partial<NodeExecutionContext> = {}): NodeExecutionContext {
  return {
    nodeId: 'test-node',
    workflowId: 'test-wf',
    executionId: 'test-exec',
    input: {},
    config: {},
    ...overrides,
  };
}

// =============================================
// Data Transform Executors
// =============================================
describe('dataTransformExecutors', () => {
  describe('sortExecutor', () => {
    it('sorts items ascending by field', async () => {
      const { sortExecutor } = await import('../../backend/services/nodeExecutors/dataTransformExecutor');
      const result = await sortExecutor.execute(ctx({
        input: [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }],
        config: { field: 'name', order: 'asc' },
      }));
      expect(result.success).toBe(true);
      expect(result.data.items[0].name).toBe('Alice');
      expect(result.data.items[2].name).toBe('Charlie');
    });

    it('sorts items descending', async () => {
      const { sortExecutor } = await import('../../backend/services/nodeExecutors/dataTransformExecutor');
      const result = await sortExecutor.execute(ctx({
        input: [{ n: 1 }, { n: 3 }, { n: 2 }],
        config: { field: 'n', order: 'desc' },
      }));
      expect(result.data.items[0].n).toBe(3);
    });
  });

  describe('mergeExecutor', () => {
    it('appends two arrays', async () => {
      const { mergeExecutor } = await import('../../backend/services/nodeExecutors/dataTransformExecutor');
      const result = await mergeExecutor.execute(ctx({
        input: { input1: [1, 2], input2: [3, 4] },
        config: { mode: 'append' },
      }));
      expect(result.data.items).toEqual([1, 2, 3, 4]);
    });

    it('combines two objects', async () => {
      const { mergeExecutor } = await import('../../backend/services/nodeExecutors/dataTransformExecutor');
      const result = await mergeExecutor.execute(ctx({
        input: { input1: { a: 1 }, input2: { b: 2 } },
        config: { mode: 'combine' },
      }));
      expect(result.data.items[0]).toEqual({ a: 1, b: 2 });
    });
  });

  describe('setExecutor', () => {
    it('sets values on input', async () => {
      const { setExecutor } = await import('../../backend/services/nodeExecutors/dataTransformExecutor');
      const result = await setExecutor.execute(ctx({
        input: { existing: 'data' },
        config: { mode: 'manual', values: { newField: 'hello' } },
      }));
      expect(result.data.existing).toBe('data');
      expect(result.data.newField).toBe('hello');
    });

    it('keepOnlySet removes existing fields', async () => {
      const { setExecutor } = await import('../../backend/services/nodeExecutors/dataTransformExecutor');
      const result = await setExecutor.execute(ctx({
        input: { existing: 'data' },
        config: { mode: 'manual', values: { newField: 'hello' }, keepOnlySet: true },
      }));
      expect(result.data.existing).toBeUndefined();
      expect(result.data.newField).toBe('hello');
    });
  });

  describe('aggregateExecutor', () => {
    it('calculates sum', async () => {
      const { aggregateExecutor } = await import('../../backend/services/nodeExecutors/dataTransformExecutor');
      const result = await aggregateExecutor.execute(ctx({
        input: [{ val: 10 }, { val: 20 }, { val: 30 }],
        config: { aggregations: [{ field: 'val', operation: 'sum', outputField: 'total' }] },
      }));
      expect(result.data.total).toBe(60);
    });

    it('calculates avg', async () => {
      const { aggregateExecutor } = await import('../../backend/services/nodeExecutors/dataTransformExecutor');
      const result = await aggregateExecutor.execute(ctx({
        input: [{ val: 10 }, { val: 20 }, { val: 30 }],
        config: { aggregations: [{ field: 'val', operation: 'avg', outputField: 'avg' }] },
      }));
      expect(result.data.avg).toBe(20);
    });
  });

  describe('limitExecutor', () => {
    it('limits items', async () => {
      const { limitExecutor } = await import('../../backend/services/nodeExecutors/dataTransformExecutor');
      const result = await limitExecutor.execute(ctx({
        input: [1, 2, 3, 4, 5],
        config: { maxItems: 3 },
      }));
      expect(result.data.items).toEqual([1, 2, 3]);
      expect(result.data.returned).toBe(3);
    });

    it('supports offset', async () => {
      const { limitExecutor } = await import('../../backend/services/nodeExecutors/dataTransformExecutor');
      const result = await limitExecutor.execute(ctx({
        input: [1, 2, 3, 4, 5],
        config: { maxItems: 2, offset: 2 },
      }));
      expect(result.data.items).toEqual([3, 4]);
    });
  });

  describe('removeDuplicatesExecutor', () => {
    it('removes duplicates by field', async () => {
      const { removeDuplicatesExecutor } = await import('../../backend/services/nodeExecutors/dataTransformExecutor');
      const result = await removeDuplicatesExecutor.execute(ctx({
        input: [{ id: 1, v: 'a' }, { id: 2, v: 'b' }, { id: 1, v: 'c' }],
        config: { compareField: 'id' },
      }));
      expect(result.data.items).toHaveLength(2);
      expect(result.data.removed).toBe(1);
    });
  });

  describe('splitInBatchesExecutor', () => {
    it('splits into batches', async () => {
      const { splitInBatchesExecutor } = await import('../../backend/services/nodeExecutors/dataTransformExecutor');
      const result = await splitInBatchesExecutor.execute(ctx({
        input: [1, 2, 3, 4, 5],
        config: { batchSize: 2 },
      }));
      expect(result.data.totalBatches).toBe(3);
      expect(result.data.batches[0]).toEqual([1, 2]);
      expect(result.data.batches[2]).toEqual([5]);
    });
  });

  describe('renameKeysExecutor', () => {
    it('renames keys', async () => {
      const { renameKeysExecutor } = await import('../../backend/services/nodeExecutors/dataTransformExecutor');
      const result = await renameKeysExecutor.execute(ctx({
        input: { old_name: 'value' },
        config: { mappings: [{ from: 'old_name', to: 'newName' }] },
      }));
      expect(result.data.newName).toBe('value');
      expect(result.data.old_name).toBeUndefined();
    });
  });

  describe('summarizeExecutor', () => {
    it('groups and aggregates', async () => {
      const { summarizeExecutor } = await import('../../backend/services/nodeExecutors/dataTransformExecutor');
      const result = await summarizeExecutor.execute(ctx({
        input: [
          { category: 'A', val: 10 },
          { category: 'B', val: 20 },
          { category: 'A', val: 30 },
        ],
        config: { aggregation: 'sum', aggregateField: 'val', groupByField: 'category' },
      }));
      expect(result.data.result.A).toBe(40);
      expect(result.data.result.B).toBe(20);
    });
  });

  describe('compareDatasetsExecutor', () => {
    it('finds items in both and only in each', async () => {
      const { compareDatasetsExecutor } = await import('../../backend/services/nodeExecutors/dataTransformExecutor');
      const result = await compareDatasetsExecutor.execute(ctx({
        input: {
          input1: [{ id: '1' }, { id: '2' }],
          input2: [{ id: '2' }, { id: '3' }],
        },
        config: { comparisonField1: 'id' },
      }));
      expect(result.data.onlyIn1).toHaveLength(1);
      expect(result.data.onlyIn2).toHaveLength(1);
      expect(result.data.inBoth).toHaveLength(1);
    });
  });
});

// =============================================
// Utility Executors
// =============================================
describe('utilityExecutors', () => {
  describe('dateTimeExecutor', () => {
    it('returns current time in ISO', async () => {
      const { dateTimeExecutor } = await import('../../backend/services/nodeExecutors/utilityExecutor');
      const result = await dateTimeExecutor.execute(ctx({
        config: { operation: 'now' },
      }));
      expect(result.success).toBe(true);
      expect(result.data.result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('adds days to a date', async () => {
      const { dateTimeExecutor } = await import('../../backend/services/nodeExecutors/utilityExecutor');
      const result = await dateTimeExecutor.execute(ctx({
        input: { date: '2025-01-01T00:00:00.000Z' },
        config: { operation: 'add', inputField: 'date', amount: 5, unit: 'days' },
      }));
      expect(result.data.result).toContain('2025-01-06');
    });

    it('extracts year from date', async () => {
      const { dateTimeExecutor } = await import('../../backend/services/nodeExecutors/utilityExecutor');
      const result = await dateTimeExecutor.execute(ctx({
        input: { date: '2025-06-15T00:00:00.000Z' },
        config: { operation: 'extract', inputField: 'date', extractPart: 'month' },
      }));
      expect(result.data.result).toBe(6);
    });
  });

  describe('cryptoExecutor', () => {
    it('generates UUID', async () => {
      const { cryptoExecutor } = await import('../../backend/services/nodeExecutors/utilityExecutor');
      const result = await cryptoExecutor.execute(ctx({
        config: { operation: 'uuid' },
      }));
      expect(typeof result.data.result).toBe('string');
      expect(result.data.result.length).toBeGreaterThan(0);
    });

    it('hashes with SHA256', async () => {
      const { cryptoExecutor } = await import('../../backend/services/nodeExecutors/utilityExecutor');
      const result = await cryptoExecutor.execute(ctx({
        input: { message: 'hello' },
        config: { operation: 'hash', hashAlgorithm: 'sha256', inputField: 'message' },
      }));
      expect(result.data.result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it('generates random key', async () => {
      const { cryptoExecutor } = await import('../../backend/services/nodeExecutors/utilityExecutor');
      const result = await cryptoExecutor.execute(ctx({
        config: { operation: 'generateKey', keyLength: 16 },
      }));
      expect(result.data.result).toHaveLength(32); // 16 bytes = 32 hex chars
    });
  });

  describe('htmlExecutor', () => {
    it('extracts text from HTML', async () => {
      const { htmlExecutor } = await import('../../backend/services/nodeExecutors/utilityExecutor');
      const result = await htmlExecutor.execute(ctx({
        input: { html: '<h1>Hello</h1><p>World</p>' },
        config: { operation: 'extractText', sourceField: 'html' },
      }));
      expect(result.data.result).toContain('Hello');
      expect(result.data.result).toContain('World');
      expect(result.data.result).not.toContain('<');
    });

    it('extracts links from HTML', async () => {
      const { htmlExecutor } = await import('../../backend/services/nodeExecutors/utilityExecutor');
      const result = await htmlExecutor.execute(ctx({
        input: { html: '<a href="https://example.com">Example</a>' },
        config: { operation: 'extractLinks', sourceField: 'html' },
      }));
      expect(result.data.links).toHaveLength(1);
      expect(result.data.links[0].url).toBe('https://example.com');
    });
  });

  describe('noOperationExecutor', () => {
    it('passes through input', async () => {
      const { noOperationExecutor } = await import('../../backend/services/nodeExecutors/utilityExecutor');
      const result = await noOperationExecutor.execute(ctx({
        input: { keep: 'this' },
      }));
      expect(result.data.keep).toBe('this');
    });
  });

  describe('stopAndErrorExecutor', () => {
    it('throws configured error message', async () => {
      const { stopAndErrorExecutor } = await import('../../backend/services/nodeExecutors/utilityExecutor');
      await expect(stopAndErrorExecutor.execute(ctx({
        config: { errorMessage: 'Custom stop error' },
      }))).rejects.toThrow('Custom stop error');
    });
  });

  describe('loopExecutor', () => {
    it('iterates over items', async () => {
      const { loopExecutor } = await import('../../backend/services/nodeExecutors/utilityExecutor');
      const result = await loopExecutor.execute(ctx({
        input: { items: ['a', 'b', 'c'] },
        config: {},
      }));
      expect(result.data.iterations).toBe(3);
      expect(result.data.results[0].item).toBe('a');
    });

    it('respects maxIterations', async () => {
      const { loopExecutor } = await import('../../backend/services/nodeExecutors/utilityExecutor');
      const result = await loopExecutor.execute(ctx({
        input: { items: ['a', 'b', 'c', 'd', 'e'] },
        config: { maxIterations: 2 },
      }));
      expect(result.data.iterations).toBe(2);
    });
  });
});

// =============================================
// Code Executor
// =============================================
describe('codeExecutor', () => {
  it('executes simple JavaScript', async () => {
    const { codeExecutor } = await import('../../backend/services/nodeExecutors/codeExecutor');
    const result = await codeExecutor.execute(ctx({
      config: { code: 'return { sum: 1 + 2 }', language: 'javascript' },
    }));
    expect(result.success).toBe(true);
    expect(result.data.result.sum).toBe(3);
  });

  it('has access to $json context', async () => {
    const { codeExecutor } = await import('../../backend/services/nodeExecutors/codeExecutor');
    const result = await codeExecutor.execute(ctx({
      input: { name: 'Alice' },
      config: { code: 'return { greeting: "Hello " + $json.name }', language: 'javascript' },
    }));
    expect(result.data.result.greeting).toBe('Hello Alice');
  });

  it('captures console.log output', async () => {
    const { codeExecutor } = await import('../../backend/services/nodeExecutors/codeExecutor');
    const result = await codeExecutor.execute(ctx({
      config: { code: 'console.log("test output"); return { ok: true }', language: 'javascript' },
    }));
    expect(result.logs).toBeDefined();
    expect(result.logs![0]).toContain('test output');
  });

  it('blocks access to process and require', async () => {
    const { codeExecutor } = await import('../../backend/services/nodeExecutors/codeExecutor');
    await expect(codeExecutor.execute(ctx({
      config: { code: 'return process.env', language: 'javascript' },
    }))).rejects.toThrow();
  });

  it('returns python not-supported message', async () => {
    const { codeExecutor } = await import('../../backend/services/nodeExecutors/codeExecutor');
    const result = await codeExecutor.execute(ctx({
      config: { code: 'print("hello")', language: 'python' },
    }));
    expect(result.data.executed).toBe(false);
    expect(result.data.language).toBe('python');
  });

  it('runs per-item mode', async () => {
    const { codeExecutor } = await import('../../backend/services/nodeExecutors/codeExecutor');
    const result = await codeExecutor.execute(ctx({
      input: [{ json: { val: 1 } }, { json: { val: 2 } }],
      config: { code: 'return { doubled: $json.val * 2 }', language: 'javascript', mode: 'runOnceForEachItem' },
    }));
    expect(result.data.result).toHaveLength(2);
    expect(result.data.result[0].json.doubled).toBe(2);
    expect(result.data.result[1].json.doubled).toBe(4);
  });
});

describe('functionExecutor', () => {
  it('executes function code with $json', async () => {
    const { functionExecutor } = await import('../../backend/services/nodeExecutors/codeExecutor');
    const result = await functionExecutor.execute(ctx({
      input: { value: 42 },
      config: { code: 'return { doubled: $json.value * 2 }' },
    }));
    expect(result.data.result.doubled).toBe(84);
  });
});

describe('functionItemExecutor', () => {
  it('processes each item individually', async () => {
    const { functionItemExecutor } = await import('../../backend/services/nodeExecutors/codeExecutor');
    const result = await functionItemExecutor.execute(ctx({
      input: [{ json: { n: 10 } }, { json: { n: 20 } }],
      config: { code: 'return { n: $json.n + 1 }' },
    }));
    expect(result.data.items).toHaveLength(2);
    expect(result.data.items[0].json.n).toBe(11);
    expect(result.data.items[1].json.n).toBe(21);
  });
});

// =============================================
// Filter Executor (standalone)
// =============================================
describe('filterExecutor (standalone)', () => {
  it('filters with equals', async () => {
    const { filterExecutor } = await import('../../backend/services/nodeExecutors/filterExecutor');
    const result = await filterExecutor.execute(ctx({
      input: { status: 'active' },
      config: { field: 'status', operator: 'equals', value: 'active' },
    }));
    expect(result.data.passed).toBe(true);
  });

  it('filters with contains', async () => {
    const { filterExecutor } = await import('../../backend/services/nodeExecutors/filterExecutor');
    const result = await filterExecutor.execute(ctx({
      input: { email: 'user@example.com' },
      config: { field: 'email', operator: 'contains', value: 'example' },
    }));
    expect(result.data.passed).toBe(true);
  });

  it('filters arrays', async () => {
    const { filterExecutor } = await import('../../backend/services/nodeExecutors/filterExecutor');
    const result = await filterExecutor.execute(ctx({
      input: [{ score: 80 }, { score: 45 }, { score: 90 }],
      config: { filterType: 'array', field: 'score', operator: 'greater_than', value: 50 },
    }));
    expect(result.data.count).toBe(2);
  });

  it('handles is_empty operator', async () => {
    const { filterExecutor } = await import('../../backend/services/nodeExecutors/filterExecutor');
    const result = await filterExecutor.execute(ctx({
      input: { name: '' },
      config: { field: 'name', operator: 'is_empty', value: null },
    }));
    expect(result.data.passed).toBe(true);
  });
});

// =============================================
// Executor Registry
// =============================================
describe('nodeExecutors registry', () => {
  it('has all expected node types', async () => {
    const { nodeExecutors } = await import('../../backend/services/nodeExecutors/index');
    const expectedTypes = [
      'trigger', 'manualTrigger', 'webhook', 'schedule',
      'httpRequest', 'email', 'gmail',
      'database', 'mysql', 'postgres',
      'transform', 'filter', 'sort', 'merge', 'set', 'aggregate', 'limit',
      'code', 'function', 'functionItem',
      'ai', 'openai',
      'slack', 'discord',
      'googleSheets', 's3', 'mongodb',
      'dateTime', 'crypto', 'html', 'markdown',
      'delay', 'wait', 'loop', 'forEach', 'condition',
      'noOperation', 'stopAndError',
      'subWorkflow',
      'default',
    ];
    for (const type of expectedTypes) {
      expect(nodeExecutors[type]).toBeDefined();
      expect(typeof nodeExecutors[type].execute).toBe('function');
    }
  });

  it('getNodeExecutor returns default for unknown type', async () => {
    const { getNodeExecutor } = await import('../../backend/services/nodeExecutors/index');
    const executor = getNodeExecutor('nonExistentType');
    expect(executor).toBeDefined();
    const result = await executor.execute(ctx());
    expect(result.success).toBe(true);
  });
});
