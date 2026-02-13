/**
 * Transform Node Executor
 * Transforms data using JavaScript expressions or mappings
 */

import { Node } from '@xyflow/react';
import { NodeExecutor } from './index';
import { /* SafeTransform, */ evaluateExpression } from '../../../utils/SecureExpressionEvaluator';
import type { WorkflowContext /*, NodeExecutionResult */ } from '../../../types/common';

// Helper functions moved outside the object literal
function getValueFromPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  return path.split('.').reduce((current: unknown, key) => {
    // Handle array indices
    const match = key.match(/(\w+)\[(\d+)\]/);
    if (match) {
      const [, arrayKey, index] = match;
      const currentObj = current as Record<string, unknown>;
      const arr = currentObj?.[arrayKey] as unknown[];
      return arr?.[parseInt(index)];
    }
    const currentObj = current as Record<string, unknown>;
    return currentObj?.[key];
  }, obj);
}

function setValueAtPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  const lastKey = keys.pop();

  let current: Record<string, unknown> = obj;
  for (const key of keys) {
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  if (lastKey) {
    current[lastKey] = value;
  }
}

function applyMapping(input: unknown, mapping: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [targetPath, sourcePath] of Object.entries(mapping)) {
    const value = getValueFromPath(input, sourcePath);
    setValueAtPath(result, targetPath, value);
  }

  return result;
}

function evaluateExpressionWithContext(input: unknown, expression: string, context: WorkflowContext): unknown {
  // Use secure expression evaluator instead of dangerous new Function()
  try {
    const result = evaluateExpression(expression, {
      input,
      results: context?.results || {},
      variables: context?.variables || {}
    });

    if (!result.success) {
      throw new Error(result.error || 'Expression evaluation failed');
    }

    return result.value;
  } catch (error) {
    throw new Error(`Invalid expression: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function applyTemplate(input: unknown, template: string): string {
  // Replace ${variable} with values from input using secure evaluator
  return template.replace(/\$\{([^}]+)\}/g, (match, expression) => {
    try {
      const result = evaluateExpression(expression, { input });
      if (result.success && result.value !== undefined) {
        return String(result.value);
      }
      return match;
    } catch {
      return match;
    }
  });
}

export const transformExecutor: NodeExecutor = {
  async execute(node: Node, context: unknown): Promise<unknown> {
    // Cast context to specific type
    const ctx = context as WorkflowContext;

    const data = node.data as {
      transformType?: string;
      mapping?: Record<string, string>;
      expression?: string;
      template?: string;
    };

    const {
      transformType = 'mapping',
      mapping,
      expression,
      template
    } = data;

    // Extract input from context - use results from previous nodes or raw input
    const input = ctx?.results?.[node.id] || ctx?.input || {};

    try {
      switch (transformType) {
        case 'mapping':
          return applyMapping(input, mapping || {});

        case 'expression':
          return evaluateExpressionWithContext(input, expression || 'input', ctx);

        case 'template':
          return applyTemplate(input, template || '');

        default:
          throw new Error(`Unknown transform type: ${transformType}`);
      }
    } catch (error) {
      throw new Error(`Transform failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  validate(node: Node): string[] {
    const errors: string[] = [];
    const config = node.data;

    if (!config.transformType) {
      errors.push('Transform type is required');
    }

    switch (config.transformType) {
      case 'mapping':
        if (!config.mapping || Object.keys(config.mapping).length === 0) {
          errors.push('Field mapping is required');
        }
        break;

      case 'expression':
        if (!config.expression) {
          errors.push('Expression is required');
        }
        break;

      case 'template':
        if (!config.template) {
          errors.push('Template is required');
        }
        break;
    }

    return errors;
  }
};