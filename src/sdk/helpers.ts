/**
 * Helper functions for SDK usage
 */

import { NodeBase } from './NodeBase';
import { INodeTypeDescription, INodeExecutionData, IDataObject } from './NodeInterface';
import { ICredentialType } from './CredentialUtils';

/**
 * Create a new node class
 */
export function createNode(description: INodeTypeDescription, execute: Function): typeof NodeBase {
  class CustomNode extends NodeBase {
    description = description;

    async execute(this: any): Promise<INodeExecutionData[][]> {
      return await execute.call(this);
    }
  }

  return CustomNode;
}

/**
 * Create a credential definition
 */
export function createCredential(credential: ICredentialType): ICredentialType {
  return credential;
}

/**
 * Create a node manifest (workflow.json)
 */
export function createNodeManifest(config: {
  name: string;
  version: string;
  description: string;
  nodes: string[];
  credentials?: string[];
  permissions?: string[];
  dependencies?: Record<string, string>;
  author?: string;
  license?: string;
  keywords?: string[];
  repository?: string;
}): any {
  return {
    name: config.name,
    version: config.version,
    description: config.description,
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    author: config.author || '',
    license: config.license || 'MIT',
    keywords: config.keywords || [],
    repository: config.repository || '',
    n8n: {
      nodes: config.nodes,
      credentials: config.credentials || [],
    },
    permissions: config.permissions || [],
    dependencies: config.dependencies || {},
    devDependencies: {
      '@workflow/sdk': '^1.0.0',
      typescript: '^5.0.0',
      '@types/node': '^20.0.0',
    },
    scripts: {
      build: 'tsc',
      dev: 'tsc --watch',
      test: 'npm run build && node test.js',
    },
  };
}

/**
 * Helper to create simple string property
 */
export function stringProperty(config: {
  displayName: string;
  name: string;
  default?: string;
  required?: boolean;
  description?: string;
  placeholder?: string;
}): any {
  return {
    displayName: config.displayName,
    name: config.name,
    type: 'string',
    default: config.default || '',
    required: config.required || false,
    description: config.description,
    placeholder: config.placeholder,
  };
}

/**
 * Helper to create number property
 */
export function numberProperty(config: {
  displayName: string;
  name: string;
  default?: number;
  required?: boolean;
  description?: string;
  min?: number;
  max?: number;
}): any {
  return {
    displayName: config.displayName,
    name: config.name,
    type: 'number',
    default: config.default || 0,
    required: config.required || false,
    description: config.description,
    typeOptions: {
      minValue: config.min,
      maxValue: config.max,
    },
  };
}

/**
 * Helper to create boolean property
 */
export function booleanProperty(config: {
  displayName: string;
  name: string;
  default?: boolean;
  description?: string;
}): any {
  return {
    displayName: config.displayName,
    name: config.name,
    type: 'boolean',
    default: config.default || false,
    description: config.description,
  };
}

/**
 * Helper to create options property
 */
export function optionsProperty(config: {
  displayName: string;
  name: string;
  options: Array<{ name: string; value: string | number }>;
  default?: string | number;
  required?: boolean;
  description?: string;
}): any {
  return {
    displayName: config.displayName,
    name: config.name,
    type: 'options',
    options: config.options,
    default: config.default || config.options[0]?.value,
    required: config.required || false,
    description: config.description,
  };
}

/**
 * Helper to create JSON property
 */
export function jsonProperty(config: {
  displayName: string;
  name: string;
  default?: any;
  required?: boolean;
  description?: string;
}): any {
  return {
    displayName: config.displayName,
    name: config.name,
    type: 'json',
    default: config.default || {},
    required: config.required || false,
    description: config.description,
  };
}

/**
 * Convert simple data to node execution data
 */
export function toNodeExecutionData(data: IDataObject | IDataObject[]): INodeExecutionData[] {
  const dataArray = Array.isArray(data) ? data : [data];
  return dataArray.map(item => ({ json: item }));
}

/**
 * Extract JSON data from node execution data
 */
export function fromNodeExecutionData(data: INodeExecutionData[]): IDataObject[] {
  return data.map(item => item.json);
}

/**
 * Create error result
 */
export function createError(message: string, data?: IDataObject): INodeExecutionData {
  return {
    json: {
      error: message,
      ...data,
    },
    error: new Error(message),
  };
}

/**
 * Create success result
 */
export function createSuccess(data: IDataObject): INodeExecutionData {
  return {
    json: {
      success: true,
      ...data,
    },
  };
}

/**
 * Batch process items
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  batchSize = 10
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, index) => processor(item, i + index))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts || 3;
  const initialDelay = options.initialDelay || 1000;
  const maxDelay = options.maxDelay || 10000;
  const backoffMultiplier = options.backoffMultiplier || 2;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt === maxAttempts) {
        break;
      }

      const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay);
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Parse expressions in strings
 */
export function parseExpression(
  text: string,
  context: IDataObject
): string {
  return text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
    try {
      const value = getNestedValue(context, expression.trim());
      return value !== undefined ? String(value) : match;
    } catch {
      return match;
    }
  });
}

/**
 * Get nested value from object
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    // Handle array access like items[0]
    const arrayMatch = key.match(/^([^[]+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      return current?.[arrayKey]?.[parseInt(index)];
    }
    return current?.[key];
  }, obj);
}

/**
 * Set nested value in object
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format duration to human readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

/**
 * Generate unique ID
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;

  const source = sources.shift();

  if (source) {
    for (const key in source) {
      if (typeof source[key] === 'object' && source[key] !== null && key in target) {
        Object.assign(source[key], deepMerge(target[key] as any, source[key] as any));
      }
    }
  }

  Object.assign(target, source);
  return deepMerge(target, ...sources);
}

/**
 * Check if value is empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Pick properties from object
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit properties from object
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}
