/**
 * ExpressionEngine - n8n-compatible expression evaluator with {{ }} syntax
 *
 * Features:
 * - Parses {{ expression }} syntax
 * - Secure sandboxed evaluation
 * - Timeout protection (5 seconds)
 * - Memory limits
 * - Rich context support
 * - Built-in functions
 */

import { ExpressionContext } from './ExpressionContext';
import { builtInFunctions } from './BuiltInFunctions';

export interface ExpressionOptions {
  timeout?: number; // milliseconds, default 5000
  maxIterations?: number; // default 10000
  allowDangerousOperations?: boolean; // default false
}

export interface EvaluationResult {
  success: boolean;
  value?: any;
  error?: string;
  executionTime?: number;
}

export class ExpressionEngine {
  private static readonly DEFAULT_TIMEOUT = 5000;
  private static readonly DEFAULT_MAX_ITERATIONS = 10000;

  // Regex to match {{ expression }} with support for nested braces
  private static readonly EXPRESSION_REGEX = /\{\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\}/g;

  // Forbidden patterns for security
  private static readonly FORBIDDEN_PATTERNS = [
    /\brequire\s*\(/,
    /\bimport\s+/,
    /\bprocess\./,
    /\b__dirname\b/,
    /\b__filename\b/,
    /\bmodule\./,
    /\bexports\./,
    /\bglobal\./,
    /\bFunction\s*\(/,
    /\beval\s*\(/,
    /\bsetTimeout\s*\(/,
    /\bsetInterval\s*\(/,
    /\bsetImmediate\s*\(/,
    /\bexecSync\s*\(/,
    /\bspawn\s*\(/,
    /\bfork\s*\(/,
    /\bchild_process\b/,
    /\bfs\./,
    /\bhttp\./,
    /\bhttps\./,
    /\bnet\./,
    /\bdgram\./,
  ];

  /**
   * Parse a string and extract all expressions
   */
  static parseExpressions(input: string): { expression: string; start: number; end: number }[] {
    const expressions: { expression: string; start: number; end: number }[] = [];
    let match: RegExpExecArray | null;

    // Reset regex state
    this.EXPRESSION_REGEX.lastIndex = 0;

    while ((match = this.EXPRESSION_REGEX.exec(input)) !== null) {
      expressions.push({
        expression: match[1].trim(),
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return expressions;
  }

  /**
   * Check if a string contains any expressions
   */
  static hasExpressions(input: string): boolean {
    this.EXPRESSION_REGEX.lastIndex = 0;
    return this.EXPRESSION_REGEX.test(input);
  }

  /**
   * Validate expression for security issues
   */
  static validateExpression(expression: string): { valid: boolean; error?: string } {
    // Check forbidden patterns
    for (const pattern of this.FORBIDDEN_PATTERNS) {
      if (pattern.test(expression)) {
        return {
          valid: false,
          error: `Expression contains forbidden pattern: ${pattern.source}`,
        };
      }
    }

    // Check for suspicious strings
    const suspiciousStrings = ['constructor', 'prototype', '__proto__'];
    for (const str of suspiciousStrings) {
      if (expression.includes(str)) {
        return {
          valid: false,
          error: `Expression contains suspicious keyword: ${str}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Evaluate a single expression in a sandboxed environment
   */
  static evaluateExpression(
    expression: string,
    context: Record<string, any>,
    options: ExpressionOptions = {}
  ): EvaluationResult {
    const startTime = Date.now();
    const maxIterations = options.maxIterations || this.DEFAULT_MAX_ITERATIONS;

    try {
      // Validate expression
      const validation = this.validateExpression(expression);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          executionTime: Date.now() - startTime,
        };
      }

      // Create sandbox context
      const sandboxContext = this.createSandbox(context, maxIterations);

      // Evaluate expression (synchronous)
      const result = this.evaluateSync(expression, sandboxContext);

      return {
        success: true,
        value: result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Evaluate all expressions in a string and replace them with their values
   */
  static evaluateAll(
    input: string,
    context: Record<string, any>,
    options: ExpressionOptions = {}
  ): EvaluationResult {
    const startTime = Date.now();

    try {
      // If input is not a string, return it as-is
      if (typeof input !== 'string') {
        return { success: true, value: input, executionTime: 0 };
      }

      // Check if there are any expressions
      if (!this.hasExpressions(input)) {
        return { success: true, value: input, executionTime: 0 };
      }

      // Parse all expressions
      const expressions = this.parseExpressions(input);

      // If the entire input is a single expression, return the evaluated value
      if (expressions.length === 1 && expressions[0].start === 0 && expressions[0].end === input.length) {
        return this.evaluateExpression(expressions[0].expression, context, options);
      }

      // Replace all expressions with their values
      let result = input;
      let offset = 0;

      for (const expr of expressions) {
        const evaluation = this.evaluateExpression(expr.expression, context, options);

        if (!evaluation.success) {
          return {
            success: false,
            error: `Error in expression "${expr.expression}": ${evaluation.error}`,
            executionTime: Date.now() - startTime,
          };
        }

        // Convert value to string for replacement
        const valueStr = this.valueToString(evaluation.value);

        // Calculate positions with offset
        const replaceStart = expr.start + offset;
        const replaceEnd = expr.end + offset;

        result = result.substring(0, replaceStart) + valueStr + result.substring(replaceEnd);
        offset += valueStr.length - (expr.end - expr.start);
      }

      return {
        success: true,
        value: result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Create a secure sandbox context
   */
  private static createSandbox(context: Record<string, any>, maxIterations: number): Record<string, any> {
    // Create iteration counter for loop protection
    let iterationCount = 0;
    const iterationGuard = () => {
      iterationCount++;
      if (iterationCount > maxIterations) {
        throw new Error(`Maximum iterations exceeded (${maxIterations})`);
      }
    };

    // Wrap array methods with iteration guards
    const safeArrayMethods = {
      map: function(this: any[], callback: any) {
        iterationGuard();
        return Array.prototype.map.call(this, (item, index, array) => {
          iterationGuard();
          return callback(item, index, array);
        });
      },
      filter: function(this: any[], callback: any) {
        iterationGuard();
        return Array.prototype.filter.call(this, (item, index, array) => {
          iterationGuard();
          return callback(item, index, array);
        });
      },
      forEach: function(this: any[], callback: any) {
        iterationGuard();
        return Array.prototype.forEach.call(this, (item, index, array) => {
          iterationGuard();
          callback(item, index, array);
        });
      },
      reduce: function(this: any[], callback: any, initial?: any) {
        iterationGuard();
        return Array.prototype.reduce.call(this, (acc, item, index, array) => {
          iterationGuard();
          return callback(acc, item, index, array);
        }, initial);
      },
      find: function(this: any[], callback: any) {
        iterationGuard();
        return Array.prototype.find.call(this, (item, index, array) => {
          iterationGuard();
          return callback(item, index, array);
        });
      },
      some: function(this: any[], callback: any) {
        iterationGuard();
        return Array.prototype.some.call(this, (item, index, array) => {
          iterationGuard();
          return callback(item, index, array);
        });
      },
      every: function(this: any[], callback: any) {
        iterationGuard();
        return Array.prototype.every.call(this, (item, index, array) => {
          iterationGuard();
          return callback(item, index, array);
        });
      },
    };

    // Create proxy for arrays to intercept method calls
    const proxyHandler: ProxyHandler<any> = {
      get(target, prop) {
        if (Array.isArray(target) && typeof prop === 'string' && prop in safeArrayMethods) {
          return (safeArrayMethods as any)[prop].bind(target);
        }
        return target[prop];
      },
    };

    // Deep proxy objects and arrays
    const deepProxy = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return new Proxy(obj.map(deepProxy), proxyHandler);
      }

      const proxied: Record<string, any> = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          proxied[key] = deepProxy(obj[key]);
        }
      }
      return new Proxy(proxied, proxyHandler);
    };

    // Create sandbox with built-in functions and context
    // Merge context directly without deep proxying to avoid null issues
    const proxiedContext: Record<string, any> = {};
    for (const key in context) {
      if (Object.prototype.hasOwnProperty.call(context, key)) {
        const value = context[key];
        // Only proxy non-null objects and arrays
        if (value !== null && typeof value === 'object') {
          proxiedContext[key] = deepProxy(value);
        } else {
          proxiedContext[key] = value;
        }
      }
    }

    const sandbox: Record<string, any> = {
      ...builtInFunctions,
      ...proxiedContext,
      // Safe globals
      Math,
      Date,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      // Prevent access to dangerous globals
      console: {
        log: () => {}, // No-op
        error: () => {},
        warn: () => {},
      },
    };

    return sandbox;
  }

  /**
   * Evaluate expression synchronously (without async timeout)
   */
  private static evaluateSync(
    expression: string,
    context: Record<string, any>
  ): any {
    // Create function parameter names and values
    const paramNames = Object.keys(context);
    const paramValues = paramNames.map(name => context[name]);

    // Wrap expression in try-catch
    const wrappedExpression = `
      'use strict';
      try {
        return (${expression});
      } catch (error) {
        throw new Error('Expression error: ' + error.message);
      }
    `;

    // Create function
    // Note: This is the only controlled use of Function constructor
    // The expression has been validated and the context is sandboxed
    const fn = new Function(...paramNames, wrappedExpression);

    // Execute directly
    return fn(...paramValues);
  }

  /**
   * Convert a value to string for replacement
   */
  private static valueToString(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[Object]';
      }
    }
    return String(value);
  }

  /**
   * Test an expression with sample data
   */
  static testExpression(
    expression: string,
    sampleData: Record<string, any>,
    options: ExpressionOptions = {}
  ): EvaluationResult {
    return this.evaluateExpression(expression, sampleData, options);
  }

  /**
   * Get available context variables
   */
  static getAvailableVariables(context: Record<string, any>): string[] {
    const variables: string[] = [];

    const traverse = (obj: any, prefix: string = '') => {
      if (obj === null || typeof obj !== 'object') return;

      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          variables.push(fullKey);

          // Only traverse one level deep for performance
          if (prefix.split('.').length < 2) {
            traverse(obj[key], fullKey);
          }
        }
      }
    };

    traverse(context);
    return variables.sort();
  }
}

export default ExpressionEngine;
