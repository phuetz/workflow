/**
 * Data Transform Backend Executors
 * Handles: sort, merge, filter, set, editFields, aggregate, limit,
 * removeDuplicates, splitInBatches, renameKeys, splitOut, summarize,
 * compareDatasets, itemLists, condition
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current) || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

function deleteNestedValue(obj: Record<string, unknown>, path: string): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) return;
    current = current[keys[i]] as Record<string, unknown>;
  }
  delete current[keys[keys.length - 1]];
}

function resolveExpressionValue(value: unknown, data: Record<string, unknown>): unknown {
  if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
    const path = value.slice(2, -2).trim();
    return getNestedValue(data, path.replace('$json.', ''));
  }
  return value;
}

function getItems(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (input && typeof input === 'object' && 'items' in (input as Record<string, unknown>)) {
    return (input as Record<string, unknown>).items as unknown[];
  }
  return [input];
}

function ok(data: any): NodeExecutionResult {
  return { success: true, data, timestamp: new Date().toISOString() };
}

// --- Executors ---

export const sortExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const field = String(ctx.config.field || ctx.config.sortField || 'name');
    const order = String(ctx.config.order || ctx.config.sortOrder || 'asc');
    const items = getItems(ctx.input);
    const sorted = [...items].sort((a, b) => {
      const aVal = getNestedValue(a as Record<string, unknown>, field);
      const bVal = getNestedValue(b as Record<string, unknown>, field);
      if (aVal === bVal) return 0;
      const cmp = (aVal as any) > (bVal as any) ? 1 : -1;
      return order === 'asc' || order === 'ascending' ? cmp : -cmp;
    });
    return ok({ field, order, count: sorted.length, items: sorted });
  },
};

export const mergeExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const mode = (ctx.config.mode || 'append') as string;
    const input = ctx.input || {};
    const input1 = input.input1 || input.items || [];
    const input2 = input.input2 || [];

    let merged: unknown[];
    switch (mode) {
      case 'append':
        merged = [...(Array.isArray(input1) ? input1 : [input1]), ...(Array.isArray(input2) ? input2 : [input2])];
        break;
      case 'combine':
        merged = [{ ...(typeof input1 === 'object' ? input1 : {}), ...(typeof input2 === 'object' ? input2 : {}) }];
        break;
      default:
        merged = [...(Array.isArray(input1) ? input1 : [input1]), ...(Array.isArray(input2) ? input2 : [input2])];
    }
    return ok({ items: merged, count: merged.length, mode });
  },
};

export const filterExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const items = getItems(ctx.input);
    const field = ctx.config.field as string;
    const operator = (ctx.config.operator || 'equals') as string;
    const value = ctx.config.value;

    if (!field) {
      return ok({ items, originalCount: items.length, filteredCount: items.length });
    }

    const filtered = items.filter((item) => {
      const itemVal = getNestedValue(item as Record<string, unknown>, field);
      switch (operator) {
        case 'equals': return itemVal === value;
        case 'notEquals': return itemVal !== value;
        case 'contains': return String(itemVal).includes(String(value));
        case 'gt': return Number(itemVal) > Number(value);
        case 'gte': return Number(itemVal) >= Number(value);
        case 'lt': return Number(itemVal) < Number(value);
        case 'lte': return Number(itemVal) <= Number(value);
        case 'exists': return itemVal !== undefined && itemVal !== null;
        case 'notExists': return itemVal === undefined || itemVal === null;
        case 'regex': return new RegExp(String(value)).test(String(itemVal));
        default: return true;
      }
    });

    return ok({ items: filtered, originalCount: items.length, filteredCount: filtered.length });
  },
};

export const setExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const mode = (ctx.config.mode || 'manual') as string;
    const keepOnlySet = ctx.config.keepOnlySet === true;
    const values = (ctx.config.values || {}) as Record<string, unknown>;
    const assignments = (ctx.config.assignments || []) as Array<{ name: string; value: unknown }>;
    const inputObj = typeof ctx.input === 'object' && ctx.input !== null ? ctx.input : {};

    let result: Record<string, unknown> = keepOnlySet ? {} : { ...inputObj };

    if (mode === 'manual' || mode === 'keyValue') {
      for (const [key, val] of Object.entries(values)) {
        setNestedValue(result, key, val);
      }
      for (const a of assignments) {
        setNestedValue(result, a.name, resolveExpressionValue(a.value, inputObj as Record<string, unknown>));
      }
    }

    if (mode === 'raw' && ctx.config.jsonData) {
      try {
        const raw = typeof ctx.config.jsonData === 'string' ? JSON.parse(ctx.config.jsonData) : ctx.config.jsonData;
        result = keepOnlySet ? raw : { ...result, ...raw };
      } catch {
        result.error = 'Invalid JSON data';
      }
    }

    return ok(result);
  },
};

export const editFieldsExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const operations = (ctx.config.operations || []) as Array<{
      action: string; field: string; value?: unknown; newField?: string;
    }>;
    const inputObj = typeof ctx.input === 'object' && ctx.input !== null ? ctx.input : {};
    const result = { ...inputObj } as Record<string, unknown>;

    for (const op of operations) {
      switch (op.action) {
        case 'set':
          setNestedValue(result, op.field, resolveExpressionValue(op.value, inputObj as Record<string, unknown>));
          break;
        case 'remove':
          deleteNestedValue(result, op.field);
          break;
        case 'rename':
        case 'move':
          if (op.newField) {
            const v = getNestedValue(result, op.field);
            deleteNestedValue(result, op.field);
            setNestedValue(result, op.newField, v);
          }
          break;
        case 'copy':
          if (op.newField) {
            setNestedValue(result, op.newField, getNestedValue(result, op.field));
          }
          break;
      }
    }

    return ok(result);
  },
};

export const aggregateExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const items = getItems(ctx.input);
    const aggregations = (ctx.config.aggregations || []) as Array<{
      field: string; operation: string; outputField?: string;
    }>;

    const result: Record<string, unknown> = { itemCount: items.length };

    for (const agg of aggregations) {
      const values = items.map(item => getNestedValue(item as Record<string, unknown>, agg.field));
      const out = agg.outputField || `${agg.field}_${agg.operation}`;

      switch (agg.operation) {
        case 'sum': result[out] = values.reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0); break;
        case 'avg': {
          const nums = values.filter(v => !isNaN(Number(v))).map(Number);
          result[out] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
          break;
        }
        case 'min': result[out] = Math.min(...values.map(v => Number(v) || 0)); break;
        case 'max': result[out] = Math.max(...values.map(v => Number(v) || 0)); break;
        case 'count': result[out] = values.filter(v => v !== null && v !== undefined).length; break;
        case 'first': result[out] = values[0]; break;
        case 'last': result[out] = values[values.length - 1]; break;
        case 'concat': result[out] = values.flat(); break;
        case 'unique': result[out] = [...new Set(values.map(v => JSON.stringify(v)))].map(v => JSON.parse(v)); break;
      }
    }

    return ok(result);
  },
};

export const limitExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const items = getItems(ctx.input);
    const max = (ctx.config.maxItems || ctx.config.limit || 10) as number;
    const offset = (ctx.config.offset || ctx.config.skip || 0) as number;
    const limited = items.slice(offset, offset + max);
    return ok({ items: limited, totalItems: items.length, limitedTo: max, offset, returned: limited.length });
  },
};

export const removeDuplicatesExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const items = getItems(ctx.input);
    const field = ctx.config.compareField as string;
    const seen = new Set<string>();
    const unique: unknown[] = [];

    for (const item of items) {
      const key = field
        ? JSON.stringify(getNestedValue(item as Record<string, unknown>, field))
        : JSON.stringify(item);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return ok({ items: unique, removed: items.length - unique.length });
  },
};

export const splitInBatchesExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const items = getItems(ctx.input);
    const batchSize = (ctx.config.batchSize || 10) as number;
    const batches: unknown[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return ok({ batches, totalBatches: batches.length, totalItems: items.length });
  },
};

export const renameKeysExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const mappings = (ctx.config.mappings || []) as Array<{ from: string; to: string }>;
    const inputObj = typeof ctx.input === 'object' && ctx.input !== null ? ctx.input : {};
    const result: Record<string, unknown> = { ...inputObj };
    for (const { from, to } of mappings) {
      if (from in result) {
        result[to] = result[from];
        delete result[from];
      }
    }
    return ok(result);
  },
};

export const splitOutExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const field = (ctx.config.fieldToSplit || 'items') as string;
    const inputObj = typeof ctx.input === 'object' && ctx.input !== null ? ctx.input : {};
    const arr = getNestedValue(inputObj as Record<string, unknown>, field);
    if (!Array.isArray(arr)) return ok({ items: [inputObj], error: 'Field is not an array' });
    return ok({
      items: arr.map((item, i) => ({ ...(typeof item === 'object' ? item : { value: item }), $index: i, $total: arr.length })),
    });
  },
};

export const summarizeExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const items = getItems(ctx.input);
    const aggregation = (ctx.config.aggregation || 'count') as string;
    const field = ctx.config.aggregateField as string;
    const groupBy = ctx.config.groupByField as string;

    function agg(arr: unknown[], op: string, f?: string): unknown {
      if (op === 'count') return arr.length;
      const vals = f ? arr.map(i => Number(getNestedValue(i as Record<string, unknown>, f)) || 0) : [];
      switch (op) {
        case 'sum': return vals.reduce((a, b) => a + b, 0);
        case 'avg': return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        case 'min': return Math.min(...vals);
        case 'max': return Math.max(...vals);
        default: return arr.length;
      }
    }

    if (groupBy) {
      const groups = new Map<string, unknown[]>();
      for (const item of items) {
        const key = String(getNestedValue(item as Record<string, unknown>, groupBy));
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
      }
      const result: Record<string, unknown> = {};
      for (const [key, group] of groups) {
        result[key] = agg(group, aggregation, field);
      }
      return ok({ result, groupedBy: groupBy });
    }

    return ok({ result: agg(items, aggregation, field) });
  },
};

export const compareDatasetsExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const input = ctx.input || {};
    const input1 = (input.input1 || []) as unknown[];
    const input2 = (input.input2 || []) as unknown[];
    const field1 = (ctx.config.comparisonField1 || 'id') as string;
    const field2 = (ctx.config.comparisonField2 || field1) as string;

    const getKey = (item: unknown, f: string) => String(getNestedValue(item as Record<string, unknown>, f));
    const set1 = new Map(input1.map(i => [getKey(i, field1), i]));
    const set2 = new Map(input2.map(i => [getKey(i, field2), i]));

    const onlyIn1: unknown[] = [], onlyIn2: unknown[] = [], inBoth: unknown[] = [], different: unknown[] = [];

    for (const [key, item] of set1) {
      if (set2.has(key)) {
        inBoth.push(item);
        if (JSON.stringify(item) !== JSON.stringify(set2.get(key))) {
          different.push({ input1: item, input2: set2.get(key) });
        }
      } else {
        onlyIn1.push(item);
      }
    }
    for (const [key, item] of set2) {
      if (!set1.has(key)) onlyIn2.push(item);
    }

    return ok({ onlyIn1, onlyIn2, inBoth, different });
  },
};

export const itemListsExecutor: NodeExecutor = {
  async execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult> {
    const operation = (ctx.config.operation || 'concatenate') as string;
    const items = getItems(ctx.input);

    switch (operation) {
      case 'concatenate': return ok({ items });
      case 'limit': {
        const max = (ctx.config.maxItems || 10) as number;
        return ok({ items: items.slice(0, max) });
      }
      case 'sort': {
        const field = ctx.config.sortField as string;
        const order = (ctx.config.sortOrder || 'ascending') as string;
        const sorted = [...items].sort((a, b) => {
          const av = String(getNestedValue(a as Record<string, unknown>, field));
          const bv = String(getNestedValue(b as Record<string, unknown>, field));
          const cmp = av.localeCompare(bv);
          return order === 'ascending' ? cmp : -cmp;
        });
        return ok({ items: sorted });
      }
      default: return ok({ items });
    }
  },
};
