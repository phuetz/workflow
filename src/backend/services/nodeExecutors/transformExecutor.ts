/**
 * Transform Node Executor
 * Transforms data using mappings, expressions, or templates
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';

function getValueFromPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  return path.split('.').reduce((current: unknown, key) => {
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

function applyTemplate(input: unknown, template: string): string {
  return template.replace(/\$\{([^}]+)\}/g, (match, path) => {
    const value = getValueFromPath(input, path.trim());
    return value !== undefined ? String(value) : match;
  });
}

export const transformExecutor: NodeExecutor = {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = context.config || {};
    const input = context.input || {};

    const transformType = (config.transformType || 'mapping') as string;
    const mapping = config.mapping as Record<string, string> | undefined;
    const expression = config.expression as string | undefined;
    const template = config.template as string | undefined;

    try {
      let result: unknown;

      switch (transformType) {
        case 'mapping':
          result = applyMapping(input, mapping || {});
          break;
        case 'expression':
          // Simple JSON path evaluation for safety
          result = getValueFromPath(input, expression || 'input');
          break;
        case 'template':
          result = applyTemplate(input, template || '');
          break;
        default:
          throw new Error(`Unknown transform type: ${transformType}`);
      }

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Transform failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};
