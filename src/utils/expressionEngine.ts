/**
 * Workflow Expression Engine
 * n8n-like expression language for dynamic values
 * Supports: {{ $json.field }}, {{ $node["NodeName"].data }}, functions, etc.
 */

export interface ExpressionContext {
  $json?: any; // Current item data
  $binary?: Record<string, any>; // Binary data
  $node?: Record<string, any>; // Data from other nodes
  $workflow?: {
    id: string;
    name: string;
    active: boolean;
  };
  $execution?: {
    id: string;
    mode: 'manual' | 'trigger' | 'webhook';
    resumeUrl?: string;
  };
  $env?: Record<string, string>; // Environment variables
  $today?: Date;
  $now?: Date;
  $parameter?: Record<string, any>; // Node parameters
}

class ExpressionEngine {
  private expressionRegex = /\{\{(.+?)\}\}/g;

  /**
   * Resolve an expression with context
   */
  resolve(expression: string, context: ExpressionContext): any {
    if (!expression) return expression;

    // Check if it's a simple expression
    if (typeof expression !== 'string') return expression;

    // Find all {{ }} expressions
    const hasExpressions = expression.match(this.expressionRegex);

    if (!hasExpressions) {
      return expression;
    }

    // If the entire string is a single expression, return the evaluated value
    const trimmed = expression.trim();
    if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
      const expr = trimmed.slice(2, -2).trim();
      return this.evaluate(expr, context);
    }

    // Replace all expressions in the string
    return expression.replace(this.expressionRegex, (match, expr) => {
      const result = this.evaluate(expr.trim(), context);
      return result !== undefined ? String(result) : match;
    });
  }

  /**
   * Evaluate an expression
   */
  private evaluate(expression: string, context: ExpressionContext): any {
    try {
      // Create safe evaluation context
      const safeContext = {
        $json: context.$json,
        $binary: context.$binary,
        $node: context.$node,
        $workflow: context.$workflow,
        $execution: context.$execution,
        $env: context.$env,
        $today: context.$today || new Date(),
        $now: context.$now || new Date(),
        $parameter: context.$parameter,

        // Utility functions
        ...this.createUtilityFunctions()
      };

      // Use Function constructor for safe evaluation
      const func = new Function(...Object.keys(safeContext), `return ${expression}`);
      return func(...Object.values(safeContext));
    } catch (error) {
      console.error('Expression evaluation error:', error);
      return undefined;
    }
  }

  /**
   * Create utility functions available in expressions
   */
  private createUtilityFunctions() {
    return {
      // String functions
      $upper: (str: string) => str?.toUpperCase(),
      $lower: (str: string) => str?.toLowerCase(),
      $trim: (str: string) => str?.trim(),
      $length: (val: any) => val?.length || 0,
      $substring: (str: string, start: number, end?: number) => str?.substring(start, end),
      $replace: (str: string, search: string, replace: string) => str?.replace(new RegExp(search, 'g'), replace),
      $split: (str: string, separator: string) => str?.split(separator),
      $join: (arr: any[], separator: string) => arr?.join(separator),

      // Number functions
      $round: (num: number) => Math.round(num),
      $ceil: (num: number) => Math.ceil(num),
      $floor: (num: number) => Math.floor(num),
      $abs: (num: number) => Math.abs(num),
      $min: (...args: number[]) => Math.min(...args),
      $max: (...args: number[]) => Math.max(...args),
      $random: (min: number = 0, max: number = 1) => Math.random() * (max - min) + min,

      // Date functions
      $dateFormat: (date: Date | string, format?: string) => {
        const d = new Date(date);
        if (format === 'iso') return d.toISOString();
        if (format === 'date') return d.toLocaleDateString();
        if (format === 'time') return d.toLocaleTimeString();
        return d.toLocaleString();
      },
      $addDays: (date: Date | string, days: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
      },
      $addHours: (date: Date | string, hours: number) => {
        const d = new Date(date);
        d.setHours(d.getHours() + hours);
        return d;
      },
      $timestamp: () => Date.now(),

      // Array functions
      $first: (arr: any[]) => arr?.[0],
      $last: (arr: any[]) => arr?.[arr.length - 1],
      $unique: (arr: any[]) => [...new Set(arr)],
      $flatten: (arr: any[]) => arr?.flat(),
      $sort: (arr: any[], key?: string) => {
        if (!key) return [...arr].sort();
        return [...arr].sort((a, b) => a[key] > b[key] ? 1 : -1);
      },
      $filter: (arr: any[], predicate: (item: any) => boolean) => arr?.filter(predicate),
      $map: (arr: any[], mapper: (item: any) => any) => arr?.map(mapper),

      // Object functions
      $keys: (obj: any) => Object.keys(obj || {}),
      $values: (obj: any) => Object.values(obj || {}),
      $entries: (obj: any) => Object.entries(obj || {}),
      $pick: (obj: any, keys: string[]) => {
        const result: any = {};
        keys.forEach(key => {
          if (key in obj) result[key] = obj[key];
        });
        return result;
      },
      $omit: (obj: any, keys: string[]) => {
        const result = { ...obj };
        keys.forEach(key => delete result[key]);
        return result;
      },

      // JSON functions
      $toJson: (val: any) => JSON.stringify(val),
      $fromJson: (str: string) => JSON.parse(str),
      $parseJson: (str: string) => {
        try {
          return JSON.parse(str);
        } catch {
          return null;
        }
      },

      // Type checking
      $isEmail: (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str),
      $isUrl: (str: string) => {
        try {
          new URL(str);
          return true;
        } catch {
          return false;
        }
      },
      $isEmpty: (val: any) => {
        if (val === null || val === undefined) return true;
        if (typeof val === 'string') return val.trim() === '';
        if (Array.isArray(val)) return val.length === 0;
        if (typeof val === 'object') return Object.keys(val).length === 0;
        return false;
      },

      // Encoding
      $base64Encode: (str: string) => btoa(str),
      $base64Decode: (str: string) => atob(str),
      $urlEncode: (str: string) => encodeURIComponent(str),
      $urlDecode: (str: string) => decodeURIComponent(str),

      // UUID generation
      $uuid: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      },

      // Conditional
      $if: (condition: boolean, trueValue: any, falseValue: any) => condition ? trueValue : falseValue
    };
  }

  /**
   * Resolve all expressions in an object
   */
  resolveObject(obj: any, context: ExpressionContext): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.resolve(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveObject(item, context));
    }

    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.resolveObject(obj[key], context);
      }
      return result;
    }

    return obj;
  }

  /**
   * Test if string contains expressions
   */
  hasExpressions(value: string): boolean {
    return typeof value === 'string' && this.expressionRegex.test(value);
  }

  /**
   * Extract all expression strings from a value
   */
  extractExpressions(value: string): string[] {
    if (typeof value !== 'string') return [];

    const matches = value.matchAll(this.expressionRegex);
    return Array.from(matches).map(match => match[1].trim());
  }

  /**
   * Validate expression syntax
   */
  validateExpression(expression: string): { valid: boolean; error?: string } {
    try {
      // Try to parse the expression
      new Function(`return ${expression}`);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid expression'
      };
    }
  }
}

// Singleton instance
export const expressionEngine = new ExpressionEngine();

/**
 * Helper function to resolve expressions
 */
export function resolveExpression(expression: string, context: ExpressionContext): any {
  return expressionEngine.resolve(expression, context);
}

/**
 * Helper function to resolve object with expressions
 */
export function resolveExpressions(obj: any, context: ExpressionContext): any {
  return expressionEngine.resolveObject(obj, context);
}

/**
 * Example expressions:
 *
 * Basic:
 * {{ $json.name }}
 * {{ $json.email }}
 *
 * Node data:
 * {{ $node["HTTP Request"].json.data }}
 * {{ $node["Webhook"].json.body }}
 *
 * Functions:
 * {{ $upper($json.name) }}
 * {{ $dateFormat($now, 'iso') }}
 * {{ $length($json.items) }}
 *
 * Conditional:
 * {{ $if($json.status === 'active', 'Yes', 'No') }}
 *
 * Complex:
 * {{ $json.items.map(item => item.name).join(', ') }}
 * {{ $first($json.results).id }}
 * {{ $replace($json.text, 'old', 'new') }}
 */
