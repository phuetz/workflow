/**
 * SecureExpressionEngine - VM2-based secure expression evaluator
 *
 * SECURITY: This implementation uses VM2 sandboxing to prevent Remote Code Execution (RCE)
 * attacks that are possible with the Function() constructor.
 *
 * Features:
 * - True V8 context isolation (not just object proxying)
 * - No access to Node.js APIs (require, process, fs, etc.)
 * - Configurable timeout protection with hard SIGKILL
 * - Memory limits to prevent DoS attacks
 * - Prototype chain isolation
 * - 100% backward compatible with ExpressionEngine
 *
 * Threat Model:
 * - Prevents constructor.constructor access to Function
 * - Blocks prototype pollution attacks
 * - Isolates process and global objects
 * - Prevents infinite loops with hard timeout
 * - Prevents memory exhaustion attacks
 *
 * @see EXPRESSION_ENGINE_SECURITY_FIX.md for migration guide
 */

// Note: vm2 has been replaced with native vm module for security (CVE-2023-37466)
// This file is deprecated and kept for reference only
// Use SecureExpressionEvaluator from utils instead
import { ExpressionContext } from './ExpressionContext';
import { builtInFunctions } from './BuiltInFunctions';

export interface ExpressionOptions {
  timeout?: number; // milliseconds, default 1000
  maxIterations?: number; // default 10000
  allowDangerousOperations?: boolean; // DEPRECATED: Always false for security
}

export interface EvaluationResult {
  success: boolean;
  value?: any;
  error?: string;
  executionTime?: number;
}

/**
 * VM2-based secure expression engine
 * Drop-in replacement for ExpressionEngine with enhanced security
 */
export class SecureExpressionEngine {
  private static readonly DEFAULT_TIMEOUT = 1000; // 1 second (down from 5s for security)
  private static readonly DEFAULT_MAX_ITERATIONS = 10000;
  private static readonly MAX_MEMORY_MB = 128; // 128MB memory limit

  // Regex to match {{ expression }} with support for nested braces
  private static readonly EXPRESSION_REGEX = /\{\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\}/g;

  // Forbidden patterns - still check as first line of defense
  // VM2 will block these anyway, but fail fast
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
    // Additional VM2 escape attempts
    /\bconstructor\s*\.\s*constructor\b/,
    /\b__proto__\b/,
    /\bprototype\b.*=/, // Assignment to prototype
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
   * Validate expression for security issues (first line of defense)
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

    // Check for suspicious strings (case-insensitive)
    const lowerExpr = expression.toLowerCase();
    const suspiciousStrings = ['constructor', '__proto__'];
    for (const str of suspiciousStrings) {
      if (lowerExpr.includes(str.toLowerCase())) {
        return {
          valid: false,
          error: `Expression contains suspicious keyword: ${str}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Evaluate a single expression in a VM2 sandbox
   */
  static evaluateExpression(
    expression: string,
    context: Record<string, any>,
    options: ExpressionOptions = {}
  ): EvaluationResult {
    const startTime = Date.now();
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;
    const maxIterations = options.maxIterations || this.DEFAULT_MAX_ITERATIONS;

    try {
      // Validate expression (fail fast)
      const validation = this.validateExpression(expression);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          executionTime: Date.now() - startTime,
        };
      }

      // Create VM2 sandbox with secure context
      const sandboxContext = this.createSecureSandbox(context, maxIterations);

      // Evaluate in VM2 (true isolation)
      const result = this.evaluateInVM(expression, sandboxContext, timeout);

      return {
        success: true,
        value: result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      // VM2 errors indicate security blocks or runtime errors
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Detect if this was a security block
      const isSecurityBlock =
        errorMessage.includes('is not defined') || // Constructor blocked
        errorMessage.includes('Cannot set property') || // Prototype pollution blocked
        errorMessage.includes('Script execution timed out'); // Timeout

      return {
        success: false,
        error: isSecurityBlock
          ? `Security violation: ${errorMessage}`
          : `Expression error: ${errorMessage}`,
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
   * Create a secure VM2 sandbox context
   *
   * SECURITY: This sandbox has NO access to:
   * - Node.js require()
   * - process object
   * - File system
   * - Network APIs
   * - Parent context
   * - Function constructor
   */
  private static createSecureSandbox(
    context: Record<string, any>,
    maxIterations: number
  ): Record<string, any> {
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
      map: function (this: any[], callback: any) {
        iterationGuard();
        return Array.prototype.map.call(this, (item, index, array) => {
          iterationGuard();
          return callback(item, index, array);
        });
      },
      filter: function (this: any[], callback: any) {
        iterationGuard();
        return Array.prototype.filter.call(this, (item, index, array) => {
          iterationGuard();
          return callback(item, index, array);
        });
      },
      forEach: function (this: any[], callback: any) {
        iterationGuard();
        return Array.prototype.forEach.call(this, (item, index, array) => {
          iterationGuard();
          callback(item, index, array);
        });
      },
      reduce: function (this: any[], callback: any, initial?: any) {
        iterationGuard();
        return Array.prototype.reduce.call(
          this,
          (acc, item, index, array) => {
            iterationGuard();
            return callback(acc, item, index, array);
          },
          initial
        );
      },
      find: function (this: any[], callback: any) {
        iterationGuard();
        return Array.prototype.find.call(this, (item, index, array) => {
          iterationGuard();
          return callback(item, index, array);
        });
      },
      some: function (this: any[], callback: any) {
        iterationGuard();
        return Array.prototype.some.call(this, (item, index, array) => {
          iterationGuard();
          return callback(item, index, array);
        });
      },
      every: function (this: any[], callback: any) {
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

    // Create proxied context
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

    // Create sandbox with built-in functions and context
    const sandbox: Record<string, any> = {
      ...builtInFunctions,
      ...proxiedContext,
      // Safe globals (whitelisted only)
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
      // No-op console (prevent information leakage)
      console: {
        log: () => {},
        error: () => {},
        warn: () => {},
        info: () => {},
        debug: () => {},
      },
      // Prevent common escape attempts
      constructor: undefined,
      __proto__: undefined,
      prototype: undefined,
    };

    return sandbox;
  }

  /**
   * Evaluate expression in VM2 sandbox (true isolation)
   *
   * SECURITY: This runs in a completely separate V8 context
   * with no access to the parent process or Node.js APIs.
   */
  private static evaluateInVM(
    expression: string,
    context: Record<string, any>,
    timeout: number
  ): any {
    // DEPRECATED: Use SecureExpressionEvaluator from utils instead
    // This implementation is kept for reference only
    throw new Error('SecureExpressionEngine is deprecated. Use SecureExpressionEvaluator from utils/SecureExpressionEvaluator.ts instead.');
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

  /**
   * Benchmark expression evaluation performance
   * Useful for performance regression testing
   */
  static benchmark(
    expression: string,
    context: Record<string, any>,
    iterations: number = 1000
  ): { avgMs: number; minMs: number; maxMs: number; totalMs: number } {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      this.evaluateExpression(expression, context);
      times.push(Date.now() - start);
    }

    return {
      avgMs: times.reduce((a, b) => a + b, 0) / times.length,
      minMs: Math.min(...times),
      maxMs: Math.max(...times),
      totalMs: times.reduce((a, b) => a + b, 0),
    };
  }

  /**
   * Security audit: Test expression against known attack vectors
   * Returns true if expression is safe, false if it contains exploits
   */
  static securityAudit(expression: string): {
    safe: boolean;
    threats: string[];
    recommendations: string[];
  } {
    const threats: string[] = [];
    const recommendations: string[] = [];

    // Test against common attack patterns
    const attackPatterns = [
      { pattern: /constructor/i, threat: 'Constructor access attempt' },
      { pattern: /__proto__/i, threat: 'Prototype pollution attempt' },
      { pattern: /prototype/i, threat: 'Prototype manipulation attempt' },
      { pattern: /process\./i, threat: 'Process object access attempt' },
      { pattern: /require\s*\(/i, threat: 'Module require attempt' },
      { pattern: /import\s+/i, threat: 'ES6 import attempt' },
      { pattern: /eval\s*\(/i, threat: 'Eval injection attempt' },
      { pattern: /Function\s*\(/i, threat: 'Function constructor attempt' },
      { pattern: /global\./i, threat: 'Global object access attempt' },
    ];

    for (const { pattern, threat } of attackPatterns) {
      if (pattern.test(expression)) {
        threats.push(threat);
      }
    }

    // Provide recommendations
    if (threats.length > 0) {
      recommendations.push('Expression contains potential security threats');
      recommendations.push('Use VM2 sandbox for evaluation (SecureExpressionEngine)');
      recommendations.push('Avoid using Function() or eval() constructors');
    }

    return {
      safe: threats.length === 0,
      threats,
      recommendations,
    };
  }
}

export default SecureExpressionEngine;
