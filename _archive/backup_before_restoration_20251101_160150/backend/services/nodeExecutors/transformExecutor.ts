/**
 * Transform Node Executor
 * Transforms data using JavaScript expressions or mappings
 */

import { Node } from 'reactflow';
import { NodeExecutor } from './index';
import { /* SafeTransform, */ evaluateExpression } from '../../../utils/SecureExpressionEvaluator';
import type { WorkflowContext /*, NodeExecutionResult */ } from '../../../types/common';

export const transformExecutor: NodeExecutor = {
  async execute(node: Node, context: WorkflowContext): Promise<unknown> {
    const {
      transformType = 'mapping',
      mapping,
      expression,
      template
    } = node.data;

    // Extract input from context - use results from previous nodes or raw input
    const input = context?.results?.[node.id] || context?.input || {};

    try {
      switch (transformType) {
        case 'mapping':
          return this.applyMapping(input, mapping || {});
        
        case 'expression':
          return this.evaluateExpression(input, expression || 'input', context);
        
        case 'template':
          return this.applyTemplate(input, template || '');
        
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
  },

  // Helper methods
  applyMapping(input: unknown, mapping: Record<string, string>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [targetPath, sourcePath] of Object.entries(mapping)) {
      const value = this.getValueFromPath(input, sourcePath);
      this.setValueAtPath(result, targetPath, value);
    }

    return result;
  },

  evaluateExpression(input: unknown, expression: string, context: WorkflowContext): unknown {
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
  },

  applyTemplate(input: unknown, template: string): string {
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
  },

  getValueFromPath(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;
    return path.split('.').reduce((current: unknown, key) => {
      // Handle array indices
      const match = key.match(/(\w+)\[(\d+)\]/);
      if (match) {
        const [, arrayKey, index] = match;
        return current?.[arrayKey]?.[parseInt(index)];
      }
      return current?.[key];
    }, obj);
  },

  setValueAtPath(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    const lastKey = keys.pop();

    let current: unknown = obj;
    for (const key of keys) {
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    if (lastKey) {
      current[lastKey] = value;
    }
  }
};