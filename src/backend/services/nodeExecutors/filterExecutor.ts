/**
 * Filter Node Executor
 * Filters data based on conditions
 */

import { Node } from '@xyflow/react';
import { SafeCondition } from '../../../utils/SecureExpressionEvaluator';

// Helper function to get value from nested path
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

// Helper function to evaluate simple condition
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

// Helper function to evaluate advanced condition
function evaluateAdvancedCondition(data: unknown, condition: string): boolean {
  // Use secure expression evaluator instead of dangerous new Function()
  try {
    return SafeCondition.evaluate(condition, data);
  } catch (error) {
    throw new Error(`Invalid condition: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const filterExecutor = {
  async execute(node: Node, context: unknown): Promise<{
    passed: boolean;
    data: unknown;
    count?: number;
  }> {
    // Extract config
    const config = (node.data?.config || node.data || {}) as {
      condition?: string;
      field?: string;
      operator?: string;
      value?: unknown;
      filterType?: string;
    };

    const {
      condition,
      field,
      operator = 'equals',
      value,
      filterType = 'simple'
    } = config;

    // Extract context
    const ctx = (context || {}) as Record<string, unknown>;
    const input = (ctx.previousNodeData || ctx.input || {}) as Record<string, unknown>;

    try {
      if (filterType === 'simple') {
        if (!field) {
          throw new Error('Field is required for simple filter');
        }
        const passed = evaluateSimpleCondition(input, field, operator, value);
        return {
          passed,
          data: passed ? input : null
        };
      } else if (filterType === 'advanced') {
        if (!condition) {
          throw new Error('Condition is required for advanced filter');
        }
        const passed = evaluateAdvancedCondition(input, condition);
        return {
          passed,
          data: passed ? input : null
        };
      } else if (filterType === 'array') {
        if (!Array.isArray(input)) {
          throw new Error('Input must be an array for array filter');
        }
        if (!field) {
          throw new Error('Field is required for array filter');
        }

        const filtered = input.filter(item =>
          evaluateSimpleCondition(item, field, operator, value)
        );

        return {
          passed: filtered.length > 0,
          data: filtered,
          count: filtered.length
        };
      }

      throw new Error(`Unknown filter type: ${filterType}`);
    } catch (error) {
      throw new Error(`Filter failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  validate(node: Node): string[] {
    const errors: string[] = [];
    const config = (node.data?.config || node.data || {}) as {
      filterType?: string;
      field?: string;
      operator?: string;
      value?: unknown;
      condition?: string;
    };

    if (config.filterType === 'simple' || !config.filterType) {
      if (!config.field) {
        errors.push('Field is required for simple filter');
      }
      if (!config.operator) {
        errors.push('Operator is required for simple filter');
      }
      if (config.value === undefined) {
        errors.push('Value is required for simple filter');
      }
    } else if (config.filterType === 'advanced') {
      if (!config.condition) {
        errors.push('Condition is required for advanced filter');
      }
    }

    return errors;
  }
};