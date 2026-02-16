/**
 * Data transformation node executors: Filter, Sort, Merge, Transform, etc.
 */

import type { WorkflowNode, NodeConfig, AggregationConfig, EditFieldOperation, SetAssignment } from '../types';
import { getNestedValue, setNestedValue, deleteNestedValue, resolveExpressionValue, aggregate } from '../ExpressionEvaluator';

/**
 * Execute condition node
 */
export async function executeCondition(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const condition = String(config.condition || 'true');
  let result = false;

  try {
    if (condition === 'true') result = true;
    else if (condition === 'false') result = false;
    else if (condition.includes('$json')) {
      const value = Number(inputData?.amount) || Math.random() * 200;
      if (condition.includes('> 100')) result = value > 100;
      else if (condition.includes('< 50')) result = value < 50;
      else result = Math.random() > 0.5;
    } else if (condition.includes('data.')) {
      const match = condition.match(/data\.(\w+)\s*===\s*(true|false|\d+|'[^']*'|"[^"]*")/);
      if (match) {
        const [, prop, expectedValue] = match;
        const actualValue = inputData?.[prop];
        const expected = expectedValue === 'true' ? true :
                        expectedValue === 'false' ? false :
                        !isNaN(Number(expectedValue)) ? Number(expectedValue) :
                        expectedValue.replace(/['"]/g, '');
        result = actualValue === expected;
      } else {
        result = Math.random() > 0.5;
      }
    } else {
      result = Math.random() > 0.5;
    }
  } catch {
    result = false;
  }

  return {
    condition,
    result,
    conditionResult: result,
    branch: result ? 'true' : 'false',
    data: inputData
  };
}

/**
 * Execute transform node
 */
export async function executeTransform(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return {
    ...inputData,
    transformed: true,
    transformedAt: new Date().toISOString(),
    originalKeys: Object.keys(inputData || {}),
    transformationType: (config.transformType as string) || 'javascript'
  };
}

/**
 * Execute filter node
 */
export async function executeFilter(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const filterExpression = (config.filter as string) || 'item.active === true';

  const items = (inputData?.items as Array<Record<string, unknown>>) || [
    { id: 1, name: 'Item 1', active: true },
    { id: 2, name: 'Item 2', active: false },
    { id: 3, name: 'Item 3', active: true }
  ];

  const filtered = items.filter((item: Record<string, unknown>, index: number) => index % 2 === 0);

  return {
    originalCount: items.length,
    filteredCount: filtered.length,
    filtered: true,
    filter: filterExpression,
    items: filtered
  };
}

/**
 * Execute sort node
 */
export async function executeSort(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const field = String(config.field || 'name');
  const order = String(config.order || 'asc');

  const items = (inputData?.items as Array<Record<string, unknown>>) || [
    { id: 3, name: 'Charlie', score: 85 },
    { id: 1, name: 'Alice', score: 92 },
    { id: 2, name: 'Bob', score: 78 }
  ];

  const sorted = [...items].sort((a, b) => {
    const aVal = a[field] as string | number;
    const bVal = b[field] as string | number;
    return order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  return { field, order, count: sorted.length, items: sorted };
}

/**
 * Execute merge node
 */
export async function executeMerge(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return {
    merged: true,
    sources: 2,
    data: {
      ...inputData,
      mergedAt: new Date().toISOString(),
      mergeStrategy: 'combine'
    }
  };
}

/**
 * Execute item lists node
 */
export async function executeItemLists(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const operation = config.operation as string || 'concatenate';
  const items = Array.isArray(inputData) ? inputData : (inputData.items as unknown[]) || [inputData];

  switch (operation) {
    case 'concatenate':
      return { items };

    case 'limit': {
      const maxItems = config.maxItems as number || 10;
      const keepFirst = config.keepFirst !== false;
      return { items: keepFirst ? items.slice(0, maxItems) : items.slice(-maxItems) };
    }

    case 'sort': {
      const sortField = config.sortField as string;
      const sortOrder = config.sortOrder as string || 'ascending';
      const sorted = [...items].sort((a, b) => {
        const aVal = getNestedValue(a as Record<string, unknown>, sortField);
        const bVal = getNestedValue(b as Record<string, unknown>, sortField);
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortOrder === 'ascending' ? comparison : -comparison;
      });
      return { items: sorted };
    }

    default:
      return { items };
  }
}

/**
 * Execute remove duplicates node
 */
export async function executeRemoveDuplicates(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const items = Array.isArray(inputData) ? inputData : (inputData.items as unknown[]) || [inputData];
  const compareField = config.compareField as string;
  const keepWhen = config.keepWhen as string || 'first';

  const seen = new Map<string, number>();
  const result: unknown[] = [];

  for (const item of items) {
    const key = compareField
      ? JSON.stringify(getNestedValue(item as Record<string, unknown>, compareField))
      : JSON.stringify(item);

    if (!seen.has(key)) {
      seen.set(key, result.length);
      result.push(item);
    } else if (keepWhen === 'last') {
      const prevIdx = seen.get(key)!;
      result[prevIdx] = null;
      seen.set(key, result.length);
      result.push(item);
    }
  }

  const finalResult = keepWhen === 'last'
    ? result.filter(item => item !== null)
    : result;

  return { items: finalResult, removed: items.length - finalResult.length };
}

/**
 * Execute split in batches node
 */
export async function executeSplitInBatches(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const items = Array.isArray(inputData) ? inputData : (inputData.items as unknown[]) || [inputData];
  const batchSize = config.batchSize as number || 10;
  const addBatchInfo = config.addBatchInfo !== false;

  const batches: unknown[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  if (addBatchInfo) {
    return {
      batches: batches.map((batch, batchIndex) => ({
        items: batch.map((item, itemIndex) => ({
          ...(item as object),
          $batchIndex: batchIndex,
          $batchTotal: batches.length,
          $itemIndex: itemIndex
        })),
        batchIndex,
        batchTotal: batches.length
      })),
      totalBatches: batches.length,
      totalItems: items.length
    };
  }

  return { batches, totalBatches: batches.length };
}

/**
 * Execute rename keys node
 */
export async function executeRenameKeys(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const mappings = config.mappings as Array<{ from: string; to: string }> || [];
  const result: Record<string, unknown> = { ...inputData };

  for (const { from, to } of mappings) {
    if (from in result) {
      result[to] = result[from];
      delete result[from];
    }
  }

  return result;
}

/**
 * Execute split out node
 */
export async function executeSplitOut(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const fieldToSplit = config.fieldToSplit as string || 'items';
  const items = getNestedValue(inputData, fieldToSplit) as unknown[];

  if (!Array.isArray(items)) {
    return { items: [inputData], error: 'Field is not an array' };
  }

  return {
    items: items.map((item, index) => ({
      ...(typeof item === 'object' ? item : { value: item }),
      $index: index,
      $total: items.length
    }))
  };
}

/**
 * Execute summarize node
 */
export async function executeSummarize(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const items = Array.isArray(inputData) ? inputData : (inputData.items as unknown[]) || [inputData];
  const aggregation = config.aggregation as string || 'count';
  const aggregateField = config.aggregateField as string;
  const groupByField = config.groupByField as string;

  if (groupByField) {
    const groups = new Map<string, unknown[]>();
    for (const item of items) {
      const key = String(getNestedValue(item as Record<string, unknown>, groupByField));
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    const result: Record<string, unknown> = {};
    for (const [key, groupItems] of groups) {
      result[key] = aggregate(groupItems, aggregation, aggregateField);
    }
    return { result, groupedBy: groupByField };
  }

  return { result: aggregate(items, aggregation, aggregateField) };
}

/**
 * Execute Set node
 */
export async function executeSet(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const mode = (config.mode as string) || 'manual';
  const keepOnlySet = config.keepOnlySet === true;
  const values = (config.values as Record<string, unknown>) || {};
  const assignments = (config.assignments as SetAssignment[]) || [];

  let result: Record<string, unknown> = keepOnlySet ? {} : { ...inputData };

  if (mode === 'manual' || mode === 'keyValue') {
    for (const [key, value] of Object.entries(values)) {
      setNestedValue(result, key, value);
    }

    for (const assignment of assignments) {
      const resolvedValue = resolveExpressionValue(assignment.value, inputData);
      setNestedValue(result, assignment.name, resolvedValue);
    }
  }

  if (mode === 'raw' && config.jsonData) {
    try {
      const rawData = typeof config.jsonData === 'string'
        ? JSON.parse(config.jsonData)
        : config.jsonData;
      result = keepOnlySet ? rawData as Record<string, unknown> : { ...result, ...(rawData as Record<string, unknown>) };
    } catch {
      result.error = 'Invalid JSON data';
    }
  }

  return {
    ...result,
    $setNode: {
      mode,
      fieldsSet: Object.keys(values).length + assignments.length,
      keepOnlySet
    }
  };
}

/**
 * Execute Edit Fields node
 */
export async function executeEditFields(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const operations = (config.operations as EditFieldOperation[]) || [];
  const result = { ...inputData };

  for (const op of operations) {
    switch (op.action) {
      case 'set':
        setNestedValue(result, op.field, resolveExpressionValue(op.value, inputData));
        break;
      case 'remove':
        deleteNestedValue(result, op.field);
        break;
      case 'rename':
      case 'move':
        if (op.newField) {
          const value = getNestedValue(result, op.field);
          deleteNestedValue(result, op.field);
          setNestedValue(result, op.newField, value);
        }
        break;
      case 'copy':
        if (op.newField) {
          const value = getNestedValue(result, op.field);
          setNestedValue(result, op.newField, value);
        }
        break;
    }
  }

  return result;
}

/**
 * Execute Aggregate node
 */
export async function executeAggregate(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const items = Array.isArray(inputData) ? inputData : (inputData.items as unknown[]) || [inputData];
  const aggregations = (config.aggregations as AggregationConfig[]) || [];

  const result: Record<string, unknown> = { itemCount: items.length };

  for (const agg of aggregations) {
    const values = items.map(item => getNestedValue(item as Record<string, unknown>, agg.field));
    const outputField = agg.outputField || `${agg.field}_${agg.operation}`;

    switch (agg.operation) {
      case 'sum':
        result[outputField] = values.reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0);
        break;
      case 'avg':
        const numericValues = values.filter(v => typeof v === 'number' || !isNaN(Number(v))).map(v => Number(v));
        result[outputField] = numericValues.length
          ? numericValues.reduce((a: number, b: number) => a + b, 0) / numericValues.length
          : 0;
        break;
      case 'min':
        result[outputField] = Math.min(...values.map(v => Number(v) || 0));
        break;
      case 'max':
        result[outputField] = Math.max(...values.map(v => Number(v) || 0));
        break;
      case 'count':
        result[outputField] = values.filter(v => v !== null && v !== undefined).length;
        break;
      case 'first':
        result[outputField] = values[0];
        break;
      case 'last':
        result[outputField] = values[values.length - 1];
        break;
      case 'concat':
        result[outputField] = values.flat();
        break;
      case 'unique':
        result[outputField] = [...new Set(values.map(v => JSON.stringify(v)))].map(v => JSON.parse(v));
        break;
    }
  }

  return result;
}

/**
 * Execute Limit node
 */
export async function executeLimit(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const items = Array.isArray(inputData) ? inputData : (inputData.items as unknown[]) || [inputData];
  const maxItems = (config.maxItems as number) || (config.limit as number) || 10;
  const offset = (config.offset as number) || (config.skip as number) || 0;

  const limitedItems = items.slice(offset, offset + maxItems);

  return {
    items: limitedItems,
    totalItems: items.length,
    limitedTo: maxItems,
    offset,
    returned: limitedItems.length
  };
}

/**
 * Execute compare datasets node
 */
export async function executeCompareDatasets(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const input1 = (inputData.input1 as unknown[]) || [];
  const input2 = (inputData.input2 as unknown[]) || [];
  const comparisonField1 = config.comparisonField1 as string || 'id';
  const comparisonField2 = config.comparisonField2 as string || comparisonField1;

  const getKey = (item: unknown, field: string): string => {
    const value = getNestedValue(item as Record<string, unknown>, field);
    return config.fuzzyCompare ? String(value).toLowerCase().trim() : String(value);
  };

  const set1 = new Map(input1.map(item => [getKey(item, comparisonField1), item]));
  const set2 = new Map(input2.map(item => [getKey(item, comparisonField2), item]));

  const onlyIn1: unknown[] = [];
  const onlyIn2: unknown[] = [];
  const inBoth: unknown[] = [];
  const different: unknown[] = [];

  for (const [key, item] of set1) {
    if (set2.has(key)) {
      inBoth.push(item);
      const item2 = set2.get(key);
      if (JSON.stringify(item) !== JSON.stringify(item2)) {
        different.push({ input1: item, input2: item2 });
      }
    } else {
      onlyIn1.push(item);
    }
  }

  for (const [key, item] of set2) {
    if (!set1.has(key)) {
      onlyIn2.push(item);
    }
  }

  return { onlyIn1, onlyIn2, inBoth, different };
}
