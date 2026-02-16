/**
 * Filter Node Executor
 * Filters data based on conditions
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';

function getValueFromPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  return path.split('.').reduce((current: unknown, key) => {
    const objCurrent = current as Record<string, unknown>;
    const match = key.match(/^(\w+)\[(\d+)\]$/);
    if (match) {
      const [, arrayKey, index] = match;
      const arrayValue = objCurrent?.[arrayKey];
      if (Array.isArray(arrayValue)) {
        return arrayValue[parseInt(index)];
      }
      return undefined;
    }
    return objCurrent?.[key];
  }, obj);
}

function evaluateSimpleCondition(
  data: unknown,
  field: string,
  operator: string,
  value: unknown
): boolean {
  if (!data || typeof data !== 'object') return false;
  const fieldValue = getValueFromPath(data, field);

  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'not_equals':
      return fieldValue !== value;
    case 'contains':
      return String(fieldValue).includes(String(value));
    case 'not_contains':
      return !String(fieldValue).includes(String(value));
    case 'starts_with':
      return String(fieldValue).startsWith(String(value));
    case 'ends_with':
      return String(fieldValue).endsWith(String(value));
    case 'greater_than':
      return Number(fieldValue) > Number(value);
    case 'less_than':
      return Number(fieldValue) < Number(value);
    case 'greater_than_or_equal':
      return Number(fieldValue) >= Number(value);
    case 'less_than_or_equal':
      return Number(fieldValue) <= Number(value);
    case 'is_empty':
      return !fieldValue ||
             (typeof fieldValue === 'string' && fieldValue.trim() === '') ||
             (Array.isArray(fieldValue) && fieldValue.length === 0) ||
             (typeof fieldValue === 'object' && Object.keys(fieldValue as Record<string, unknown>).length === 0);
    case 'is_not_empty':
      return !evaluateSimpleCondition(data, field, 'is_empty', value);
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);
    case 'not_in':
      return Array.isArray(value) && !value.includes(fieldValue);
    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

export const filterExecutor: NodeExecutor = {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = context.config || {};
    const input = context.input || {};

    const field = config.field as string | undefined;
    const operator = (config.operator || 'equals') as string;
    const value = config.value;
    const filterType = (config.filterType || 'simple') as string;

    try {
      if (filterType === 'simple') {
        if (!field) throw new Error('Field is required for simple filter');
        const passed = evaluateSimpleCondition(input, field, operator, value);
        return {
          success: true,
          data: { passed, data: passed ? input : null },
          timestamp: new Date().toISOString(),
        };
      } else if (filterType === 'array') {
        if (!Array.isArray(input)) throw new Error('Input must be an array for array filter');
        if (!field) throw new Error('Field is required for array filter');
        const filtered = input.filter((item: any) =>
          evaluateSimpleCondition(item, field, operator, value)
        );
        return {
          success: true,
          data: { passed: filtered.length > 0, data: filtered, count: filtered.length },
          timestamp: new Date().toISOString(),
        };
      }
      throw new Error(`Unknown filter type: ${filterType}`);
    } catch (error) {
      throw new Error(`Filter failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};
