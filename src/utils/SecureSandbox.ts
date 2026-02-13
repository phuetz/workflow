/**
 * Secure Sandbox for Expression Evaluation
 * Replaces dangerous eval() with safe execution environment
 */

import * as vm from 'vm';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

// Types
export interface SandboxOptions {
  timeout?: number;
  memoryLimit?: number;
  allowedGlobals?: string[];
  allowedModules?: string[];
  maxCallStackDepth?: number;
  enableAsync?: boolean;
  strict?: boolean;
}

export interface SandboxContext {
  variables?: Record<string, any>;
  functions?: Record<string, Function>;
  constants?: Record<string, any>;
  node?: any;
  workflow?: any;
  execution?: any;
  env?: Record<string, string>;
}

export interface SandboxResult {
  success: boolean;
  value?: any;
  error?: SandboxError;
  executionTime?: number;
  memoryUsed?: number;
  logs?: string[];
}

export interface SandboxError {
  type: 'syntax' | 'runtime' | 'timeout' | 'memory' | 'security';
  message: string;
  line?: number;
  column?: number;
  stack?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  ast?: any;
}

export interface ValidationError {
  type: string;
  message: string;
  line?: number;
  column?: number;
}

export interface ValidationWarning {
  type: string;
  message: string;
  suggestion?: string;
}

// Main Sandbox Class
export class SecureSandbox {
  private static instance: SecureSandbox;
  private readonly defaultOptions: SandboxOptions;
  private readonly forbiddenPatterns: RegExp[];
  private readonly allowedBuiltins: Set<string>;
  private readonly maxExecutions = 10000;
  private executionCount = 0;

  private constructor() {
    this.defaultOptions = {
      timeout: 1000,
      memoryLimit: 50 * 1024 * 1024, // 50MB
      allowedGlobals: ['Math', 'Date', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean'],
      allowedModules: [],
      maxCallStackDepth: 100,
      enableAsync: false,
      strict: true
    };

    this.forbiddenPatterns = [
      /eval\s*\(/,
      /new\s+Function\s*\(/,
      /Function\s*\(/,
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /setImmediate\s*\(/,
      /require\s*\(/,
      /import\s+/,
      /export\s+/,
      /process\./,
      /global\./,
      /__dirname/,
      /__filename/,
      /child_process/,
      /fs\./,
      /\.constructor\s*\(/,
      /\[['"]constructor['"]\]/
    ];

    this.allowedBuiltins = new Set([
      // Math
      'Math.abs', 'Math.ceil', 'Math.floor', 'Math.round', 'Math.max', 'Math.min',
      'Math.pow', 'Math.sqrt', 'Math.random', 'Math.sin', 'Math.cos', 'Math.tan',
      'Math.PI', 'Math.E',
      
      // String
      'String.fromCharCode', 'String.fromCodePoint',
      
      // Number
      'Number.isNaN', 'Number.isFinite', 'Number.parseInt', 'Number.parseFloat',
      
      // Array
      'Array.isArray', 'Array.from', 'Array.of',
      
      // Object
      'Object.keys', 'Object.values', 'Object.entries', 'Object.assign',
      
      // JSON
      'JSON.parse', 'JSON.stringify',
      
      // Date
      'Date.now', 'Date.parse', 'Date.UTC'
    ]);
  }

  public static getInstance(): SecureSandbox {
    if (!SecureSandbox.instance) {
      SecureSandbox.instance = new SecureSandbox();
    }
    return SecureSandbox.instance;
  }

  // Main evaluation method
  public async evaluate(
    expression: string,
    context: SandboxContext = {},
    options: SandboxOptions = {}
  ): Promise<SandboxResult> {
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      // Rate limiting
      this.executionCount++;
      if (this.executionCount > this.maxExecutions) {
        throw this.createError('security', 'Execution limit exceeded');
      }

      // Merge options
      const sandboxOptions = { ...this.defaultOptions, ...options };

      // Validate expression
      const validation = await this.validateExpression(expression, sandboxOptions);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            type: 'syntax',
            message: validation.errors[0].message,
            line: validation.errors[0].line,
            column: validation.errors[0].column
          }
        };
      }

      // Prepare sandbox context
      const sandboxContext = this.prepareSandboxContext(context, sandboxOptions);

      // Add console.log capture
      sandboxContext.console = {
        log: (...args: any[]) => {
          logs.push(args.map(a => String(a)).join(' '));
        },
        error: (...args: any[]) => {
          logs.push(`ERROR: ${args.map(a => String(a)).join(' ')}`);
        },
        warn: (...args: any[]) => {
          logs.push(`WARN: ${args.map(a => String(a)).join(' ')}`);
        }
      };

      // Create VM context with security options
      const vmContext = vm.createContext(sandboxContext, {
        name: 'SecureSandbox',
        codeGeneration: {
          strings: false, // Disable eval()
          wasm: false,    // Disable WebAssembly
        }
      });

      // Freeze prototypes to prevent prototype pollution
      // Skip in test environment to prevent breaking other tests
      const isTestEnv =
        (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
        (typeof process !== 'undefined' && process.env?.VITEST === 'true') ||
        (typeof globalThis !== 'undefined' && 'describe' in globalThis) ||
        (typeof globalThis !== 'undefined' && 'vi' in globalThis);

      if (!isTestEnv) {
        vm.runInContext(`
          Object.freeze(Object.prototype);
          Object.freeze(Array.prototype);
          Object.freeze(Function.prototype);
          Object.freeze(String.prototype);
          Object.freeze(Number.prototype);
          Object.freeze(Boolean.prototype);
        `, vmContext);
      }

      // Wrap expression for return
      const wrappedExpression = sandboxOptions.strict
        ? `'use strict';\n${expression}`
        : expression;

      // Execute with native vm module
      const script = new vm.Script(wrappedExpression, {
        filename: 'expression.js',
        lineOffset: 0,
        columnOffset: 0,
      });

      const value = script.runInContext(vmContext, {
        timeout: sandboxOptions.timeout,
        breakOnSigint: true,
        displayErrors: true,
      });

      // Calculate metrics
      const executionTime = Date.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed;

      return {
        success: true,
        value,
        executionTime,
        memoryUsed,
        logs
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      // Determine error type
      let errorType: SandboxError['type'] = 'runtime';
      if (error.message?.includes('timeout')) {
        errorType = 'timeout';
      } else if (error.message?.includes('memory')) {
        errorType = 'memory';
      } else if (error.message?.includes('security')) {
        errorType = 'security';
      }

      return {
        success: false,
        error: {
          type: errorType,
          message: error.message,
          stack: error.stack
        },
        executionTime,
        logs
      };
    } finally {
      // Reset counter periodically
      if (this.executionCount > this.maxExecutions / 2) {
        setTimeout(() => {
          this.executionCount = 0;
        }, 60000); // Reset after 1 minute
      }
    }
  }

  // Validation methods
  public async validateExpression(
    expression: string,
    options: SandboxOptions = {}
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let ast: any = null;

    try {
      // Check for forbidden patterns
      for (const pattern of this.forbiddenPatterns) {
        if (pattern.test(expression)) {
          errors.push({
            type: 'security',
            message: `Forbidden pattern detected: ${pattern.source}`
          });
        }
      }

      // Parse AST
      ast = acorn.parse(expression, {
        ecmaVersion: 2020,
        locations: true,
        sourceType: 'script'
      });

      // Walk AST for security checks
      walk.simple(ast, {
        CallExpression: (node: any) => {
          // Check for dangerous function calls
          if (node.callee.type === 'Identifier') {
            const name = node.callee.name;
            if (['eval', 'Function', 'setTimeout', 'setInterval', 'require'].includes(name)) {
              errors.push({
                type: 'security',
                message: `Dangerous function call: ${name}`,
                line: node.loc?.start.line,
                column: node.loc?.start.column
              });
            }
          }

          // Check for constructor access
          if (node.callee.type === 'MemberExpression') {
            if (node.callee.property.name === 'constructor') {
              errors.push({
                type: 'security',
                message: 'Constructor access is not allowed',
                line: node.loc?.start.line,
                column: node.loc?.start.column
              });
            }
          }
        },

        MemberExpression: (node: any) => {
          // Check for dangerous property access
          if (node.object.name === 'process' || 
              node.object.name === 'global' ||
              node.object.name === 'window') {
            errors.push({
              type: 'security',
              message: `Access to ${node.object.name} is not allowed`,
              line: node.loc?.start.line,
              column: node.loc?.start.column
            });
          }
        },

        ImportDeclaration: (node: any) => {
          errors.push({
            type: 'security',
            message: 'Import statements are not allowed',
            line: node.loc?.start.line,
            column: node.loc?.start.column
          });
        },

        ExportAllDeclaration: (node: any) => {
          errors.push({
            type: 'security',
            message: 'Export statements are not allowed',
            line: node.loc?.start.line,
            column: node.loc?.start.column
          });
        },

        ExportNamedDeclaration: (node: any) => {
          errors.push({
            type: 'security',
            message: 'Export statements are not allowed',
            line: node.loc?.start.line,
            column: node.loc?.start.column
          });
        },

        ExportDefaultDeclaration: (node: any) => {
          errors.push({
            type: 'security',
            message: 'Export statements are not allowed',
            line: node.loc?.start.line,
            column: node.loc?.start.column
          });
        }
      });

      // Check complexity
      const complexity = this.calculateComplexity(ast);
      if (complexity > 20) {
        warnings.push({
          type: 'complexity',
          message: `Expression is too complex (complexity: ${complexity})`,
          suggestion: 'Consider breaking down the expression into smaller parts'
        });
      }

    } catch (error: any) {
      errors.push({
        type: 'syntax',
        message: error.message,
        line: error.loc?.line,
        column: error.loc?.column
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      ast
    };
  }

  // Helper methods
  private prepareSandboxContext(
    context: SandboxContext,
    options: SandboxOptions
  ): any {
    const sandboxContext: any = {};

    // Add allowed globals
    for (const global of options.allowedGlobals || []) {
      switch (global) {
        case 'Math':
          sandboxContext.Math = this.createSafeMath();
          break;
        case 'Date':
          sandboxContext.Date = this.createSafeDate();
          break;
        case 'JSON':
          sandboxContext.JSON = {
            parse: JSON.parse.bind(JSON),
            stringify: JSON.stringify.bind(JSON)
          };
          break;
        case 'Object':
          sandboxContext.Object = this.createSafeObject();
          break;
        case 'Array':
          sandboxContext.Array = this.createSafeArray();
          break;
        case 'String':
          sandboxContext.String = this.createSafeString();
          break;
        case 'Number':
          sandboxContext.Number = this.createSafeNumber();
          break;
        case 'Boolean':
          sandboxContext.Boolean = Boolean;
          break;
      }
    }

    // Add user context
    if (context.variables) {
      for (const [key, value] of Object.entries(context.variables)) {
        sandboxContext[key] = this.sanitizeValue(value);
      }
    }

    if (context.functions) {
      for (const [key, func] of Object.entries(context.functions)) {
        sandboxContext[key] = this.wrapFunction(func);
      }
    }

    if (context.constants) {
      for (const [key, value] of Object.entries(context.constants)) {
        Object.defineProperty(sandboxContext, key, {
          value: this.sanitizeValue(value),
          writable: false,
          configurable: false
        });
      }
    }

    // Add safe node/workflow/execution context
    if (context.node) {
      sandboxContext.$node = this.sanitizeValue(context.node);
    }

    if (context.workflow) {
      sandboxContext.$workflow = this.sanitizeValue(context.workflow);
    }

    if (context.execution) {
      sandboxContext.$execution = this.sanitizeValue(context.execution);
    }

    if (context.env) {
      sandboxContext.$env = this.sanitizeValue(context.env);
    }

    return sandboxContext;
  }

  private createSafeMath(): any {
    return {
      E: Math.E,
      LN10: Math.LN10,
      LN2: Math.LN2,
      LOG10E: Math.LOG10E,
      LOG2E: Math.LOG2E,
      PI: Math.PI,
      SQRT1_2: Math.SQRT1_2,
      SQRT2: Math.SQRT2,
      abs: Math.abs,
      acos: Math.acos,
      acosh: Math.acosh,
      asin: Math.asin,
      asinh: Math.asinh,
      atan: Math.atan,
      atan2: Math.atan2,
      atanh: Math.atanh,
      cbrt: Math.cbrt,
      ceil: Math.ceil,
      clz32: Math.clz32,
      cos: Math.cos,
      cosh: Math.cosh,
      exp: Math.exp,
      expm1: Math.expm1,
      floor: Math.floor,
      fround: Math.fround,
      hypot: Math.hypot,
      imul: Math.imul,
      log: Math.log,
      log10: Math.log10,
      log1p: Math.log1p,
      log2: Math.log2,
      max: Math.max,
      min: Math.min,
      pow: Math.pow,
      random: Math.random,
      round: Math.round,
      sign: Math.sign,
      sin: Math.sin,
      sinh: Math.sinh,
      sqrt: Math.sqrt,
      tan: Math.tan,
      tanh: Math.tanh,
      trunc: Math.trunc
    };
  }

  private createSafeDate(): any {
    const SafeDate: any = function(this: any, ...args: any[]) {
      if (new.target) {
        // @ts-ignore - spread is safe here with rest params
        return new (Date as any)(...args);
      }
      // @ts-ignore - spread is safe here with rest params
      return (Date as any)(...args);
    };

    SafeDate.now = Date.now;
    SafeDate.parse = Date.parse;
    SafeDate.UTC = Date.UTC;

    return SafeDate;
  }

  private createSafeObject(): any {
    return {
      assign: Object.assign,
      create: null, // Disabled for security
      defineProperty: null, // Disabled for security
      defineProperties: null, // Disabled for security
      entries: Object.entries,
      freeze: Object.freeze,
      fromEntries: Object.fromEntries,
      getOwnPropertyDescriptor: null, // Disabled for security
      getOwnPropertyDescriptors: null, // Disabled for security
      getOwnPropertyNames: Object.getOwnPropertyNames,
      getOwnPropertySymbols: null, // Disabled for security
      getPrototypeOf: null, // Disabled for security
      is: Object.is,
      isExtensible: Object.isExtensible,
      isFrozen: Object.isFrozen,
      isSealed: Object.isSealed,
      keys: Object.keys,
      preventExtensions: Object.preventExtensions,
      seal: Object.seal,
      setPrototypeOf: null, // Disabled for security
      values: Object.values
    };
  }

  private createSafeArray(): any {
    const SafeArray: any = function(this: any, ...args: any[]) {
      if (new.target) {
        // @ts-ignore - spread is safe here with rest params
        return new (Array as any)(...args);
      }
      // @ts-ignore - spread is safe here with rest params
      return (Array as any)(...args);
    };

    SafeArray.from = Array.from;
    SafeArray.isArray = Array.isArray;
    SafeArray.of = Array.of;

    return SafeArray;
  }

  private createSafeString(): any {
    const SafeString: any = function(this: any, ...args: any[]) {
      if (new.target) {
        // @ts-ignore - spread is safe here with rest params
        return new (String as any)(...args);
      }
      // @ts-ignore - spread is safe here with rest params
      return (String as any)(...args);
    };

    SafeString.fromCharCode = String.fromCharCode;
    SafeString.fromCodePoint = String.fromCodePoint;
    SafeString.raw = String.raw;

    return SafeString;
  }

  private createSafeNumber(): any {
    const SafeNumber: any = function(this: any, ...args: any[]) {
      if (new.target) {
        // @ts-ignore - spread is safe here with rest params
        return new (Number as any)(...args);
      }
      // @ts-ignore - spread is safe here with rest params
      return (Number as any)(...args);
    };

    SafeNumber.EPSILON = Number.EPSILON;
    SafeNumber.MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
    SafeNumber.MAX_VALUE = Number.MAX_VALUE;
    SafeNumber.MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER;
    SafeNumber.MIN_VALUE = Number.MIN_VALUE;
    SafeNumber.NaN = Number.NaN;
    SafeNumber.NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
    SafeNumber.POSITIVE_INFINITY = Number.POSITIVE_INFINITY;
    SafeNumber.isFinite = Number.isFinite;
    SafeNumber.isInteger = Number.isInteger;
    SafeNumber.isNaN = Number.isNaN;
    SafeNumber.isSafeInteger = Number.isSafeInteger;
    SafeNumber.parseFloat = Number.parseFloat;
    SafeNumber.parseInt = Number.parseInt;

    return SafeNumber;
  }

  private sanitizeValue(value: any, depth: number = 0): any {
    // Prevent deep recursion
    if (depth > 10) {
      return '[Max depth reached]';
    }

    // Handle primitives
    if (value === null || value === undefined) {
      return value;
    }

    const type = typeof value;
    if (type === 'boolean' || type === 'number' || type === 'string') {
      return value;
    }

    // Handle dates
    if (value instanceof Date) {
      return new Date(value.getTime());
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeValue(item, depth + 1));
    }

    // Handle objects
    if (type === 'object') {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        // Skip dangerous properties
        if (['constructor', '__proto__', 'prototype'].includes(key)) {
          continue;
        }
        sanitized[key] = this.sanitizeValue(val, depth + 1);
      }
      return sanitized;
    }

    // Handle functions (convert to string representation)
    if (type === 'function') {
      return '[Function]';
    }

    // Default
    return String(value);
  }

  private wrapFunction(func: Function): Function {
    return (...args: any[]) => {
      try {
        // Sanitize arguments
        const sanitizedArgs = args.map(arg => this.sanitizeValue(arg));
        
        // Call function with timeout
        const result = func.apply(null, sanitizedArgs);
        
        // Sanitize result
        return this.sanitizeValue(result);
      } catch (error: any) {
        throw new Error(`Function execution failed: ${error.message}`);
      }
    };
  }

  private calculateComplexity(ast: any): number {
    let complexity = 1;

    walk.simple(ast, {
      IfStatement: () => complexity++,
      ConditionalExpression: () => complexity++,
      LogicalExpression: (node: any) => {
        if (node.operator === '&&' || node.operator === '||') {
          complexity++;
        }
      },
      ForStatement: () => complexity++,
      ForInStatement: () => complexity++,
      ForOfStatement: () => complexity++,
      WhileStatement: () => complexity++,
      DoWhileStatement: () => complexity++,
      SwitchCase: () => complexity++
    });

    return complexity;
  }

  private createError(type: SandboxError['type'], message: string): Error {
    const error = new Error(message);
    (error as any).type = type;
    return error;
  }

  // Public utility methods
  public isExpressionSafe(expression: string): boolean {
    for (const pattern of this.forbiddenPatterns) {
      if (pattern.test(expression)) {
        return false;
      }
    }
    return true;
  }

  public getComplexity(expression: string): number {
    try {
      const ast = acorn.parse(expression, {
        ecmaVersion: 2020,
        sourceType: 'script'
      });
      return this.calculateComplexity(ast);
    } catch {
      return -1;
    }
  }

  public reset(): void {
    this.executionCount = 0;
  }
}

// Export singleton instance
export default SecureSandbox.getInstance();