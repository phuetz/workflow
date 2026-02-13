/**
 * Advanced Expression Evaluator
 * n8n-like expression language with $json, $node, $item, $parameter support
 * AGENT 2 - DATA TRANSFORMATION & EXPRESSION ENGINE
 */

import { logger } from '../services/SimpleLogger';

/**
 * Expression context for evaluation
 */
export interface ExpressionContext {
  // Current item data
  $json?: Record<string, any>;
  $item?: {
    json: Record<string, any>;
    binary?: Record<string, any>;
    index: number;
  };

  // Previous node outputs
  $node?: Record<string, {
    json: Record<string, any>[];
    binary?: Record<string, any>[];
  }>;

  // Workflow parameters
  $parameter?: Record<string, any>;

  // Environment variables
  $env?: Record<string, any>;

  // Workflow metadata
  $workflow?: {
    id: string;
    name: string;
    active: boolean;
  };

  // Execution metadata
  $execution?: {
    id: string;
    mode: 'manual' | 'trigger' | 'webhook';
    resumeUrl?: string;
  };

  // Custom variables
  $vars?: Record<string, any>;

  // Now/Today
  $now?: Date;
  $today?: Date;
}

/**
 * Built-in expression functions
 */
export class ExpressionFunctions {
  /**
   * Date manipulation functions
   */
  static date = {
    // Format date
    format(date: Date | string | number, format: string = 'yyyy-MM-dd'): string {
      const d = new Date(date);
      const tokens: Record<string, string> = {
        yyyy: d.getFullYear().toString(),
        MM: String(d.getMonth() + 1).padStart(2, '0'),
        dd: String(d.getDate()).padStart(2, '0'),
        HH: String(d.getHours()).padStart(2, '0'),
        mm: String(d.getMinutes()).padStart(2, '0'),
        ss: String(d.getSeconds()).padStart(2, '0'),
      };

      let result = format;
      for (const [token, value] of Object.entries(tokens)) {
        result = result.replace(token, value);
      }
      return result;
    },

    // Add/subtract days
    addDays(date: Date | string | number, days: number): Date {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    },

    // Add/subtract hours
    addHours(date: Date | string | number, hours: number): Date {
      const d = new Date(date);
      d.setHours(d.getHours() + hours);
      return d;
    },

    // Get timestamp
    timestamp(date?: Date | string | number): number {
      return date ? new Date(date).getTime() : Date.now();
    },

    // Parse ISO string
    parse(dateString: string): Date {
      return new Date(dateString);
    },

    // Get day of week (0 = Sunday)
    dayOfWeek(date: Date | string | number): number {
      return new Date(date).getDay();
    },

    // Check if date is between two dates
    isBetween(date: Date | string | number, start: Date | string | number, end: Date | string | number): boolean {
      const d = new Date(date).getTime();
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      return d >= s && d <= e;
    }
  };

  /**
   * String manipulation functions
   */
  static string = {
    // Convert to uppercase
    upper(str: string): string {
      return str.toUpperCase();
    },

    // Convert to lowercase
    lower(str: string): string {
      return str.toLowerCase();
    },

    // Capitalize first letter
    capitalize(str: string): string {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    // Trim whitespace
    trim(str: string): string {
      return str.trim();
    },

    // Replace all occurrences
    replaceAll(str: string, search: string, replace: string): string {
      return str.split(search).join(replace);
    },

    // Extract substring
    substring(str: string, start: number, length?: number): string {
      return length !== undefined ? str.substr(start, length) : str.substring(start);
    },

    // Split string
    split(str: string, separator: string): string[] {
      return str.split(separator);
    },

    // Join array
    join(arr: any[], separator: string = ','): string {
      return arr.join(separator);
    },

    // Check if string contains substring
    contains(str: string, search: string): boolean {
      return str.includes(search);
    },

    // Get string length
    length(str: string): number {
      return str.length;
    },

    // Pad string
    padStart(str: string, length: number, padChar: string = ' '): string {
      return str.padStart(length, padChar);
    },

    padEnd(str: string, length: number, padChar: string = ' '): string {
      return str.padEnd(length, padChar);
    },

    // Extract regex matches
    match(str: string, pattern: string, flags?: string): string[] | null {
      const regex = new RegExp(pattern, flags);
      return str.match(regex);
    },

    // Test regex
    test(str: string, pattern: string, flags?: string): boolean {
      const regex = new RegExp(pattern, flags);
      return regex.test(str);
    },

    // Slugify
    slugify(str: string): string {
      return str
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  };

  /**
   * Array manipulation functions
   */
  static array = {
    // Map array
    map<T, U>(arr: T[], fn: (item: T, index: number) => U): U[] {
      return arr.map(fn);
    },

    // Filter array
    filter<T>(arr: T[], fn: (item: T, index: number) => boolean): T[] {
      return arr.filter(fn);
    },

    // Reduce array
    reduce<T, U>(arr: T[], fn: (acc: U, item: T, index: number) => U, initial: U): U {
      return arr.reduce(fn, initial);
    },

    // Find item
    find<T>(arr: T[], fn: (item: T, index: number) => boolean): T | undefined {
      return arr.find(fn);
    },

    // Find index
    findIndex<T>(arr: T[], fn: (item: T, index: number) => boolean): number {
      return arr.findIndex(fn);
    },

    // Check if array includes item
    includes<T>(arr: T[], item: T): boolean {
      return arr.includes(item);
    },

    // Get array length
    length<T>(arr: T[]): number {
      return arr.length;
    },

    // Get first item
    first<T>(arr: T[]): T | undefined {
      return arr[0];
    },

    // Get last item
    last<T>(arr: T[]): T | undefined {
      return arr[arr.length - 1];
    },

    // Get unique items
    unique<T>(arr: T[]): T[] {
      return [...new Set(arr)];
    },

    // Sort array
    sort<T>(arr: T[], fn?: (a: T, b: T) => number): T[] {
      return [...arr].sort(fn);
    },

    // Reverse array
    reverse<T>(arr: T[]): T[] {
      return [...arr].reverse();
    },

    // Flatten array
    flatten<T>(arr: T[]): T[] {
      return arr.flat(Infinity) as T[];
    },

    // Chunk array
    chunk<T>(arr: T[], size: number): T[][] {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    },

    // Sum numbers in array
    sum(arr: number[]): number {
      return arr.reduce((sum, num) => sum + num, 0);
    },

    // Average of numbers in array
    average(arr: number[]): number {
      return arr.length > 0 ? this.sum(arr) / arr.length : 0;
    },

    // Min value
    min(arr: number[]): number {
      return Math.min(...arr);
    },

    // Max value
    max(arr: number[]): number {
      return Math.max(...arr);
    }
  };

  /**
   * Object manipulation functions
   */
  static object = {
    // Get object keys
    keys(obj: Record<string, any>): string[] {
      return Object.keys(obj);
    },

    // Get object values
    values(obj: Record<string, any>): any[] {
      return Object.values(obj);
    },

    // Get object entries
    entries(obj: Record<string, any>): [string, any][] {
      return Object.entries(obj);
    },

    // Check if object has property
    has(obj: Record<string, any>, key: string): boolean {
      return key in obj;
    },

    // Get nested property
    get(obj: Record<string, any>, path: string, defaultValue?: any): any {
      const keys = path.split('.');
      let result: any = obj;

      for (const key of keys) {
        if (result === null || result === undefined) {
          return defaultValue;
        }
        result = result[key];
      }

      return result !== undefined ? result : defaultValue;
    },

    // Merge objects
    merge(...objects: Record<string, any>[]): Record<string, any> {
      return Object.assign({}, ...objects);
    },

    // Pick properties
    pick(obj: Record<string, any>, keys: string[]): Record<string, any> {
      const result: Record<string, any> = {};
      for (const key of keys) {
        if (key in obj) {
          result[key] = obj[key];
        }
      }
      return result;
    },

    // Omit properties
    omit(obj: Record<string, any>, keys: string[]): Record<string, any> {
      const result = { ...obj };
      for (const key of keys) {
        delete result[key];
      }
      return result;
    }
  };

  /**
   * Number formatting functions
   */
  static number = {
    // Format number with decimals
    format(num: number, decimals: number = 2): string {
      return num.toFixed(decimals);
    },

    // Round number
    round(num: number, decimals: number = 0): number {
      const multiplier = Math.pow(10, decimals);
      return Math.round(num * multiplier) / multiplier;
    },

    // Ceil number
    ceil(num: number): number {
      return Math.ceil(num);
    },

    // Floor number
    floor(num: number): number {
      return Math.floor(num);
    },

    // Absolute value
    abs(num: number): number {
      return Math.abs(num);
    },

    // Random number
    random(min: number = 0, max: number = 1): number {
      return Math.random() * (max - min) + min;
    },

    // Random integer
    randomInt(min: number, max: number): number {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Check if number is even
    isEven(num: number): boolean {
      return num % 2 === 0;
    },

    // Check if number is odd
    isOdd(num: number): boolean {
      return num % 2 !== 0;
    }
  };

  /**
   * JSON functions
   */
  static json = {
    // Parse JSON string
    parse(str: string): any {
      return JSON.parse(str);
    },

    // Stringify object
    stringify(obj: any, pretty: boolean = false): string {
      return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
    }
  };

  /**
   * Utility functions
   */
  static util = {
    // Check if value is empty
    isEmpty(value: any): boolean {
      if (value === null || value === undefined) return true;
      if (typeof value === 'string') return value.trim().length === 0;
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'object') return Object.keys(value).length === 0;
      return false;
    },

    // Get type of value
    typeOf(value: any): string {
      if (value === null) return 'null';
      if (Array.isArray(value)) return 'array';
      return typeof value;
    },

    // Convert to boolean
    toBoolean(value: any): boolean {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        return lower === 'true' || lower === '1' || lower === 'yes';
      }
      return !!value;
    },

    // Convert to number
    toNumber(value: any): number {
      return Number(value);
    },

    // Convert to string
    toString(value: any): string {
      return String(value);
    },

    // Default value if undefined/null
    default(value: any, defaultValue: any): any {
      return value !== undefined && value !== null ? value : defaultValue;
    }
  };
}

/**
 * Advanced Expression Evaluator
 */
export class ExpressionEvaluator {
  private context: ExpressionContext = {};

  /**
   * Set evaluation context
   */
  setContext(context: ExpressionContext): void {
    this.context = {
      ...context,
      $now: new Date(),
      $today: new Date(new Date().setHours(0, 0, 0, 0))
    };
  }

  /**
   * Evaluate expression with template syntax
   * Supports: {{ $json.field }}, {{ $node["Node Name"].json[0].value }}
   */
  evaluate(expression: string): any {
    try {
      // Check if expression contains template syntax
      if (expression.includes('{{') && expression.includes('}}')) {
        return this.evaluateTemplate(expression);
      }

      // Direct evaluation
      return this.evaluateDirect(expression);
    } catch (error) {
      logger.error('Expression evaluation failed', { expression, error });
      throw error;
    }
  }

  /**
   * Evaluate template string with {{ }} syntax
   */
  private evaluateTemplate(template: string): string {
    return template.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
      const result = this.evaluateDirect(expr.trim());
      return this.valueToString(result);
    });
  }

  /**
   * Evaluate expression directly
   */
  private evaluateDirect(expression: string): any {
    try {
      // Create safe evaluation context
      const safeContext = this.createSafeContext();

      // Add function libraries to context
      const fullContext = {
        ...safeContext,
        date: ExpressionFunctions.date,
        string: ExpressionFunctions.string,
        array: ExpressionFunctions.array,
        object: ExpressionFunctions.object,
        number: ExpressionFunctions.number,
        json: ExpressionFunctions.json,
        util: ExpressionFunctions.util,
        Math: Math,
        Date: Date
      };

      // Use Function constructor with proper context binding
      // This is safer than eval() as it doesn't have access to local scope
      const func = new Function(...Object.keys(fullContext), `return ${expression}`);
      return func(...Object.values(fullContext));

    } catch (error) {
      logger.error('Direct evaluation failed', { expression, error });
      throw new Error(`Failed to evaluate expression: ${expression}`);
    }
  }

  /**
   * Create safe evaluation context
   */
  private createSafeContext(): Record<string, any> {
    return {
      $json: this.context.$json || {},
      $item: this.context.$item || { json: {}, index: 0 },
      $node: this.context.$node || {},
      $parameter: this.context.$parameter || {},
      $env: this.context.$env || {},
      $workflow: this.context.$workflow || {},
      $execution: this.context.$execution || {},
      $vars: this.context.$vars || {},
      $now: this.context.$now || new Date(),
      $today: this.context.$today || new Date(new Date().setHours(0, 0, 0, 0))
    };
  }

  /**
   * Convert value to string
   */
  private valueToString(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * Evaluate JMESPath query
   * Note: Full JMESPath support requires the 'jmespath' package
   */
  evaluateJMESPath(data: any, query: string): any {
    try {
      // Basic JSONPath implementation
      // For full JMESPath support, install: npm install jmespath
      logger.warn('JMESPath evaluation requires jmespath package');
      return this.evaluateJSONPath(data, query);
    } catch (error) {
      logger.error('JMESPath evaluation failed', { query, error });
      throw error;
    }
  }

  /**
   * Evaluate JSONPath query (basic implementation)
   */
  evaluateJSONPath(data: any, path: string): any {
    try {
      // Basic JSONPath support ($.field.nested[0])
      if (!path.startsWith('$')) {
        throw new Error('JSONPath must start with $');
      }

      const parts = path.slice(1).split(/[.\[\]]+/).filter(Boolean);
      let result = data;

      for (const part of parts) {
        if (result === null || result === undefined) {
          return undefined;
        }
        result = result[part];
      }

      return result;
    } catch (error) {
      logger.error('JSONPath evaluation failed', { path, error });
      throw error;
    }
  }
}

/**
 * Singleton instance
 */
let evaluatorInstance: ExpressionEvaluator | null = null;

export function getExpressionEvaluator(): ExpressionEvaluator {
  if (!evaluatorInstance) {
    evaluatorInstance = new ExpressionEvaluator();
  }
  return evaluatorInstance;
}

export function resetExpressionEvaluator(): void {
  evaluatorInstance = null;
}

/**
 * Convenience function for quick evaluation
 */
export function evaluateExpression(expression: string, context: ExpressionContext): any {
  const evaluator = getExpressionEvaluator();
  evaluator.setContext(context);
  return evaluator.evaluate(expression);
}
