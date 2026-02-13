/**
 * Expression Validator
 * Validates expressions for security and correctness
 * PROJET SAUVÉ - Phase 5.1: Variables & Expressions System
 */

import { logger } from '../services/SimpleLogger';
import type { ValidationResult, SecurityConfig } from '../types/expressions';

export class ExpressionValidator {
  private securityConfig: Required<SecurityConfig>;

  constructor(config?: Partial<SecurityConfig>) {
    this.securityConfig = {
      allowedGlobals: config?.allowedGlobals || [
        '$variables', '$vars', '$env', '$node', '$input', '$workflow', '$execution',
        'true', 'false', 'null', 'undefined'
      ],
      forbiddenPatterns: config?.forbiddenPatterns || [
        /eval\s*\(/i,
        /Function\s*\(/i,
        /constructor/i,
        /__proto__/i,
        /prototype/i,
        /import\s/i,
        /require\s*\(/i,
        /process\./i,
        /global\./i,
        /window\./i,
        /document\./i,
        /\bexec\b/i,
        /\bspawn\b/i,
        /child_process/i,
        /fs\./i,
        /readFile/i,
        /writeFile/i,
      ],
      maxStringLength: config?.maxStringLength || 10000,
      maxArrayLength: config?.maxArrayLength || 1000,
      maxObjectDepth: config?.maxObjectDepth || 10,
      forbiddenFunctions: config?.forbiddenFunctions || [
        'eval',
        'Function',
        'setTimeout',
        'setInterval',
        'setImmediate',
        'exec',
        'spawn',
        'fork',
        'execSync',
        'execFile',
      ]
    };
  }

  /**
   * Validate expression for security and correctness
   */
  validate(expression: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check for empty expression
      if (!expression || !expression.trim()) {
        errors.push('Expression cannot be empty');
        return { valid: false, error: errors.join('; '), warnings };
      }

      // Check length
      if (expression.length > this.securityConfig.maxStringLength) {
        errors.push(`Expression too long (max ${this.securityConfig.maxStringLength} characters)`);
      }

      // Check for forbidden patterns
      for (const pattern of this.securityConfig.forbiddenPatterns) {
        if (pattern.test(expression)) {
          errors.push(`Expression contains forbidden pattern: ${pattern.source}`);
        }
      }

      // Check for forbidden functions
      for (const funcName of this.securityConfig.forbiddenFunctions) {
        const regex = new RegExp(`\\b${funcName}\\s*\\(`, 'i');
        if (regex.test(expression)) {
          errors.push(`Forbidden function: ${funcName}`);
        }
      }

      // Check for potentially dangerous constructs
      if (/\[\s*['"]constructor['"]\s*\]/.test(expression)) {
        errors.push('Constructor access via bracket notation is forbidden');
      }

      if (/\[\s*['"]__proto__['"]\s*\]/.test(expression)) {
        errors.push('__proto__ access is forbidden');
      }

      // Check for unbalanced brackets
      if (!this.checkBalancedBrackets(expression)) {
        errors.push('Unbalanced brackets');
      }

      // Check for multiple statements (should be single expression)
      if (/;/.test(expression)) {
        warnings.push('Expression should not contain semicolons (single expression only)');
      }

      // Check for assignment (should be pure expression)
      if (/[^=!<>]=(?!=)/.test(expression)) {
        warnings.push('Expression appears to contain assignment operator');
      }

      // Validate allowed globals
      const identifiers = this.extractIdentifiers(expression);
      for (const id of identifiers) {
        if (id.startsWith('$') && !this.securityConfig.allowedGlobals.includes(id)) {
          warnings.push(`Unknown global variable: ${id}`);
        }
      }

      if (errors.length > 0) {
        return {
          valid: false,
          error: errors.join('; '),
          warnings
        };
      }

      return {
        valid: true,
        warnings
      };

    } catch (error) {
      logger.error('Expression validation failed:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
        warnings
      };
    }
  }

  /**
   * Check if brackets are balanced
   */
  private checkBalancedBrackets(expression: string): boolean {
    const stack: string[] = [];
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}'
    };

    let inString = false;
    let stringChar = '';
    let escaped = false;

    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];

      // Handle string literals
      if ((char === '"' || char === "'") && !escaped) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
        escaped = false;
        continue;
      }

      if (inString) {
        escaped = char === '\\' && !escaped;
        continue;
      }

      // Handle brackets
      if (char in pairs) {
        stack.push(char);
      } else if (Object.values(pairs).includes(char)) {
        const last = stack.pop();
        if (!last || pairs[last] !== char) {
          return false;
        }
      }

      escaped = false;
    }

    return stack.length === 0 && !inString;
  }

  /**
   * Extract identifiers from expression
   */
  private extractIdentifiers(expression: string): string[] {
    const identifiers: Set<string> = new Set();
    const regex = /\$?[a-zA-Z_][a-zA-Z0-9_]*/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(expression)) !== null) {
      identifiers.add(match[0]);
    }

    return Array.from(identifiers);
  }

  /**
   * Validate value against security constraints
   */
  validateValue(value: any, depth: number = 0): boolean {
    if (depth > this.securityConfig.maxObjectDepth) {
      throw new Error(`Object depth exceeds maximum (${this.securityConfig.maxObjectDepth})`);
    }

    if (typeof value === 'string' && value.length > this.securityConfig.maxStringLength) {
      throw new Error(`String length exceeds maximum (${this.securityConfig.maxStringLength})`);
    }

    if (Array.isArray(value)) {
      if (value.length > this.securityConfig.maxArrayLength) {
        throw new Error(`Array length exceeds maximum (${this.securityConfig.maxArrayLength})`);
      }
      for (const item of value) {
        this.validateValue(item, depth + 1);
      }
    }

    if (value && typeof value === 'object' && value.constructor === Object) {
      for (const key in value) {
        this.validateValue(value[key], depth + 1);
      }
    }

    return true;
  }

  /**
   * Update security config
   */
  updateConfig(config: Partial<SecurityConfig>): void {
    Object.assign(this.securityConfig, config);
  }

  /**
   * Get current security config
   */
  getConfig(): Readonly<Required<SecurityConfig>> {
    return { ...this.securityConfig };
  }
}
