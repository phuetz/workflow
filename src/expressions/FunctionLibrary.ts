/**
 * Function Library
 * Central registry for all built-in functions
 * PROJET SAUVÉ - Phase 5.1: Variables & Expressions System
 */

import { logger } from '../services/SimpleLogger';
import type { BuiltInFunction, FunctionCategory } from '../types/expressions';

// Import function modules
import { getDateTimeFunctions } from './BuiltInFunctions/DateTimeFunctions';
import { getStringFunctions } from './BuiltInFunctions/StringFunctions';
import { getArrayFunctions } from './BuiltInFunctions/ArrayFunctions';
import { getObjectFunctions } from './BuiltInFunctions/ObjectFunctions';
import { getMathFunctions } from './BuiltInFunctions/MathFunctions';

export class FunctionLibrary {
  private functions: Map<string, BuiltInFunction>;

  constructor() {
    this.functions = new Map();
    this.registerAllFunctions();
    logger.debug(`FunctionLibrary initialized with ${this.functions.size} functions`);
  }

  /**
   * Register all built-in functions
   */
  private registerAllFunctions(): void {
    // Register datetime functions
    for (const func of getDateTimeFunctions()) {
      this.register(func);
    }

    // Register string functions
    for (const func of getStringFunctions()) {
      this.register(func);
    }

    // Register array functions
    for (const func of getArrayFunctions()) {
      this.register(func);
    }

    // Register object functions
    for (const func of getObjectFunctions()) {
      this.register(func);
    }

    // Register math functions
    for (const func of getMathFunctions()) {
      this.register(func);
    }

    // Register utility functions
    this.registerUtilityFunctions();

    logger.info(`Registered ${this.functions.size} built-in functions`);
  }

  /**
   * Register utility functions
   */
  private registerUtilityFunctions(): void {
    // $json() - Parse JSON string
    this.register({
      name: '$json',
      description: 'Parse JSON string into object',
      category: 'utility',
      parameters: [
        {
          name: 'jsonString',
          type: 'string',
          description: 'JSON string to parse',
          required: true
        }
      ],
      returnType: 'any',
      examples: ['$json(\'{"key": "value"}\')'],
      execute: (jsonString: string) => {
        try {
          return JSON.parse(jsonString);
        } catch (error) {
          throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    });

    // $jsonStringify() - Convert to JSON string
    this.register({
      name: '$jsonStringify',
      description: 'Convert value to JSON string',
      category: 'utility',
      parameters: [
        {
          name: 'value',
          type: 'any',
          description: 'Value to convert',
          required: true
        },
        {
          name: 'indent',
          type: 'number',
          description: 'Indentation spaces',
          required: false,
          defaultValue: 0
        }
      ],
      returnType: 'string',
      examples: ['$jsonStringify({key: "value"})','$jsonStringify({key: "value"}, 2)'],
      execute: (value: any, indent: number = 0) => {
        return JSON.stringify(value, null, indent);
      }
    });

    // $isEmpty() - Check if value is empty
    this.register({
      name: '$isEmpty',
      description: 'Check if value is empty (null, undefined, empty string, empty array, empty object)',
      category: 'utility',
      parameters: [
        {
          name: 'value',
          type: 'any',
          description: 'Value to check',
          required: true
        }
      ],
      returnType: 'boolean',
      examples: ['$isEmpty("")', '$isEmpty(null)', '$isEmpty([])'],
      execute: (value: any) => {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.length === 0;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
      }
    });

    // $isNull() - Check if null
    this.register({
      name: '$isNull',
      description: 'Check if value is null',
      category: 'utility',
      parameters: [
        {
          name: 'value',
          type: 'any',
          description: 'Value to check',
          required: true
        }
      ],
      returnType: 'boolean',
      examples: ['$isNull(null)', '$isNull(undefined)'],
      execute: (value: any) => value === null
    });

    // $isUndefined() - Check if undefined
    this.register({
      name: '$isUndefined',
      description: 'Check if value is undefined',
      category: 'utility',
      parameters: [
        {
          name: 'value',
          type: 'any',
          description: 'Value to check',
          required: true
        }
      ],
      returnType: 'boolean',
      examples: ['$isUndefined(undefined)'],
      execute: (value: any) => value === undefined
    });

    // $type() - Get type of value
    this.register({
      name: '$type',
      description: 'Get the type of a value',
      category: 'utility',
      parameters: [
        {
          name: 'value',
          type: 'any',
          description: 'Value to check',
          required: true
        }
      ],
      returnType: 'string',
      examples: ['$type("hello")', '$type(123)', '$type([])'],
      execute: (value: any) => {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
      }
    });

    // $default() - Return default value if first is empty
    this.register({
      name: '$default',
      description: 'Return default value if first value is null/undefined/empty',
      category: 'utility',
      parameters: [
        {
          name: 'value',
          type: 'any',
          description: 'Value to check',
          required: true
        },
        {
          name: 'defaultValue',
          type: 'any',
          description: 'Default value to return',
          required: true
        }
      ],
      returnType: 'any',
      examples: ['$default(null, "default")', '$default("", "default")'],
      execute: (value: any, defaultValue: any) => {
        if (value === null || value === undefined || value === '') {
          return defaultValue;
        }
        return value;
      }
    });
  }

  /**
   * Register a function
   */
  register(func: BuiltInFunction): void {
    if (this.functions.has(func.name)) {
      logger.warn(`Function ${func.name} already registered, overwriting`);
    }
    this.functions.set(func.name, func);
  }

  /**
   * Get function by name
   */
  getFunction(name: string): BuiltInFunction | undefined {
    return this.functions.get(name);
  }

  /**
   * Check if function exists
   */
  hasFunction(name: string): boolean {
    return this.functions.has(name);
  }

  /**
   * Get all functions
   */
  getAllFunctions(): BuiltInFunction[] {
    return Array.from(this.functions.values());
  }

  /**
   * Get functions by category
   */
  getFunctionsByCategory(category: FunctionCategory): BuiltInFunction[] {
    return this.getAllFunctions().filter(f => f.category === category);
  }

  /**
   * Search functions by name or description
   */
  searchFunctions(query: string): BuiltInFunction[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllFunctions().filter(f =>
      f.name.toLowerCase().includes(lowerQuery) ||
      f.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get function names for autocomplete
   */
  getFunctionNames(): string[] {
    return Array.from(this.functions.keys());
  }

  /**
   * Get function signature for display
   */
  getFunctionSignature(name: string): string | null {
    const func = this.functions.get(name);
    if (!func) return null;

    const params = func.parameters
      .map(p => {
        const optional = !p.required ? '?' : '';
        return `${p.name}${optional}: ${p.type}`;
      })
      .join(', ');

    return `${func.name}(${params}): ${func.returnType}`;
  }

  /**
   * Clear all functions (for testing)
   */
  clear(): void {
    this.functions.clear();
  }
}

// Export singleton instance
let libraryInstance: FunctionLibrary | null = null;

export function getFunctionLibrary(): FunctionLibrary {
  if (!libraryInstance) {
    libraryInstance = new FunctionLibrary();
  }
  return libraryInstance;
}

export function resetFunctionLibrary(): void {
  libraryInstance = null;
}
