/**
 * Data Transformation Service
 * Built-in data transformation functions and expression evaluation
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { BaseService } from './BaseService';
import type {
  DataTransformFunction,
  TransformContext,
  TransformChain,
  DataMapper,
  TransformPlayground,
  // TransformLibrary, // Not used
  TransformHelpers,
  ValidationResult,
  ExpressionAST,
  TransformSuggestion,
  TransformCategory,
  SavedExpression,
  PlaygroundHistoryEntry,
  TransformService as ITransformService,
  DataSchema,
  ParameterType
} from '../types/dataTransform';
import { format, parseISO, isValid } from 'date-fns';

export class DataTransformService extends BaseService implements ITransformService {
  private static instance: DataTransformService;
  private functions: Map<string, DataTransformFunction> = new Map();
  private chains: Map<string, TransformChain> = new Map();
  private mappers: Map<string, DataMapper> = new Map();
  private playgrounds: Map<string, TransformPlayground> = new Map();
  private expressions: Map<string, SavedExpression> = new Map();
  private helpers: TransformHelpers;

  private constructor() {
    super('DataTransformService');
    this.helpers = this.createHelpers();
    this.initializeBuiltinFunctions();
  }

  static getInstance(): DataTransformService {
    if (!DataTransformService.instance) {
      DataTransformService.instance = new DataTransformService();
    }
    return DataTransformService.instance;
  }

  private createHelpers(): TransformHelpers {
    return {
      // Date helpers
      now: () => new Date(),
      parseDate: (date: string | Date) => {
        if (date instanceof Date) return date;
        const parsed = parseISO(date as string);
        return isValid(parsed) ? parsed : new Date(date);
      },
      formatDate: (date: Date, formatStr: string) => format(date, formatStr),

      // String helpers
      capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),
      slugify: (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
      truncate: (str: string, length: number) => str.length > length ? str.slice(0, length) + '...' : str,

      // Array helpers
      flatten: (arr: unknown[]) => arr.flat(Infinity),
      unique: (arr: unknown[]) => Array.from(new Set(arr)),
      groupBy: (arr: unknown[], key: string): Record<string, unknown[]> => {
        return arr.reduce<Record<string, unknown[]>>((groups, item) => {
          const group = (item as any)[key];
          groups[group] = groups[group] || [];
          groups[group].push(item);
          return groups;
        }, {});
      },

      // Object helpers
      pick: (obj: unknown, keys: string[]) => {
        const result: any = {};
        keys.forEach(key => {
          if (key in (obj as object)) result[key] = (obj as any)[key];
        });
        return result;
      },
      omit: (obj: unknown, keys: string[]) => {
        const result: any = { ...(obj as object) };
        keys.forEach(key => delete result[key]);
        return result;
      },
      merge: (...objects: unknown[]) => Object.assign({}, ...objects),

      // Math helpers
      sum: (numbers: number[]) => numbers.reduce((a, b) => a + b, 0),
      avg: (numbers: number[]) => numbers.reduce((a, b) => a + b, 0) / numbers.length,
      min: (numbers: number[]) => Math.min(...numbers),
      max: (numbers: number[]) => Math.max(...numbers),

      // Validation helpers
      isEmail: (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str),
      isUrl: (str: string) => {
        try {
          new URL(str);
          return true;
        } catch {
          return false;
        }
      },
      isNumber: (value: unknown) => typeof value === 'number' && !isNaN(value),
      isEmpty: (value: unknown) => {
        if (value == null) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
      }
    };
  }

  private initializeBuiltinFunctions() {
    const functions: Array<Omit<DataTransformFunction, 'id'>> = [
      // String functions
      {
        name: 'upper',
        category: 'string',
        description: 'Convert string to uppercase',
        icon: 'type',
        signature: {
          inputs: [{ name: 'text', type: 'string', description: 'Text to convert', required: true }],
          output: { name: 'result', type: 'string', description: 'Uppercase text' },
          isPure: true
        },
        examples: [
          {
            title: 'Basic usage',
            input: 'hello world',
            output: 'HELLO WORLD',
            code: 'upper("hello world")'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (text: string) => text.toUpperCase()
        },
        tags: ['string', 'case', 'text']
      },

      {
        name: 'lower',
        category: 'string',
        description: 'Convert string to lowercase',
        signature: {
          inputs: [{ name: 'text', type: 'string', description: 'Text to convert', required: true }],
          output: { name: 'result', type: 'string', description: 'Lowercase text' },
          isPure: true
        },
        examples: [
          {
            title: 'Basic usage',
            input: 'HELLO WORLD',
            output: 'hello world',
            code: 'lower("HELLO WORLD")'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (text: string) => text.toLowerCase()
        },
        tags: ['string', 'case', 'text']
      },

      {
        name: 'trim',
        category: 'string',
        description: 'Remove whitespace from beginning and end of string',
        signature: {
          inputs: [{ name: 'text', type: 'string', description: 'Text to trim', required: true }],
          output: { name: 'result', type: 'string', description: 'Trimmed text' },
          isPure: true
        },
        examples: [
          {
            title: 'Basic usage',
            input: '  hello world  ',
            output: 'hello world',
            code: 'trim("  hello world  ")'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (text: string) => text.trim()
        },
        tags: ['string', 'whitespace', 'clean']
      },

      {
        name: 'replace',
        category: 'string',
        description: 'Replace text in string',
        signature: {
          inputs: [
            { name: 'text', type: 'string', description: 'Original text', required: true },
            { name: 'search', type: 'string', description: 'Text to find', required: true },
            { name: 'replacement', type: 'string', description: 'Replacement text', required: true }
          ],
          output: { name: 'result', type: 'string', description: 'Modified text' },
          isPure: true
        },
        examples: [
          {
            title: 'Replace text',
            input: { text: 'Hello world', search: 'world', replacement: 'universe' },
            output: 'Hello universe',
            code: 'replace("Hello world", "world", "universe")'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (text: string, search: string, replacement: string) => text.replace(new RegExp(search, 'g'), replacement)
        },
        tags: ['string', 'replace', 'text']
      },

      {
        name: 'split',
        category: 'string',
        description: 'Split string into array',
        signature: {
          inputs: [
            { name: 'text', type: 'string', description: 'Text to split', required: true },
            { name: 'delimiter', type: 'string', description: 'Split delimiter', required: true }
          ],
          output: { name: 'result', type: 'array', description: 'Array of strings' },
          isPure: true
        },
        examples: [
          {
            title: 'Split by comma',
            input: { text: 'apple,banana,orange', delimiter: ',' },
            output: ['apple', 'banana', 'orange'],
            code: 'split("apple,banana,orange", ",")'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (text: string, delimiter: string) => text.split(delimiter)
        },
        tags: ['string', 'array', 'split']
      },

      // Number functions
      {
        name: 'round',
        category: 'number',
        description: 'Round number to specified decimal places',
        signature: {
          inputs: [
            { name: 'number', type: 'number', description: 'Number to round', required: true },
            { name: 'decimals', type: 'number', description: 'Decimal places', defaultValue: 0 }
          ],
          output: { name: 'result', type: 'number', description: 'Rounded number' },
          isPure: true
        },
        examples: [
          {
            title: 'Round to 2 decimals',
            input: { number: 3.14159, decimals: 2 },
            output: 3.14,
            code: 'round(3.14159, 2)'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (num: number, decimals: number = 0) => Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
        },
        tags: ['number', 'math', 'round']
      },

      {
        name: 'abs',
        category: 'number',
        description: 'Get absolute value of number',
        signature: {
          inputs: [{ name: 'number', type: 'number', description: 'Input number', required: true }],
          output: { name: 'result', type: 'number', description: 'Absolute value' },
          isPure: true
        },
        examples: [
          {
            title: 'Get absolute value',
            input: -42,
            output: 42,
            code: 'abs(-42)'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (num: number) => Math.abs(num)
        },
        tags: ['number', 'math', 'absolute']
      },

      // Array functions
      {
        name: 'length',
        category: 'array',
        description: 'Get length of array or string',
        signature: {
          inputs: [{ name: 'input', type: ['array', 'string'], description: 'Array or string', required: true }],
          output: { name: 'result', type: 'number', description: 'Length' },
          isPure: true
        },
        examples: [
          {
            title: 'Array length',
            input: [1, 2, 3, 4, 5],
            output: 5,
            code: 'length([1, 2, 3, 4, 5])'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (input: unknown[] | string) => input.length
        },
        tags: ['array', 'string', 'length', 'count']
      },

      {
        name: 'first',
        category: 'array',
        description: 'Get first element of array',
        signature: {
          inputs: [{ name: 'array', type: 'array', description: 'Input array', required: true }],
          output: { name: 'result', type: 'any', description: 'First element' },
          isPure: true
        },
        examples: [
          {
            title: 'Get first element',
            input: ['apple', 'banana', 'orange'],
            output: 'apple',
            code: 'first(["apple", "banana", "orange"])'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (arr: unknown[]) => arr[0]
        },
        tags: ['array', 'first', 'head']
      },

      {
        name: 'last',
        category: 'array',
        description: 'Get last element of array',
        signature: {
          inputs: [{ name: 'array', type: 'array', description: 'Input array', required: true }],
          output: { name: 'result', type: 'any', description: 'Last element' },
          isPure: true
        },
        examples: [
          {
            title: 'Get last element',
            input: ['apple', 'banana', 'orange'],
            output: 'orange',
            code: 'last(["apple", "banana", "orange"])'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (arr: unknown[]) => arr[arr.length - 1]
        },
        tags: ['array', 'last', 'tail']
      },

      {
        name: 'filter',
        category: 'array',
        description: 'Filter array elements',
        signature: {
          inputs: [
            { name: 'array', type: 'array', description: 'Input array', required: true },
            { name: 'condition', type: 'function', description: 'Filter condition', required: true }
          ],
          output: { name: 'result', type: 'array', description: 'Filtered array' },
          isPure: true
        },
        examples: [
          {
            title: 'Filter numbers > 5',
            input: { array: [1, 2, 6, 8, 3, 9], condition: 'x => x > 5' },
            output: [6, 8, 9],
            code: 'filter([1, 2, 6, 8, 3, 9], x => x > 5)'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (arr: unknown[], condition: (value: unknown, index: number, array: unknown[]) => unknown) => arr.filter(condition)
        },
        tags: ['array', 'filter', 'select']
      },

      {
        name: 'map',
        category: 'array',
        description: 'Transform array elements',
        signature: {
          inputs: [
            { name: 'array', type: 'array', description: 'Input array', required: true },
            { name: 'transform', type: 'function', description: 'Transform function', required: true }
          ],
          output: { name: 'result', type: 'array', description: 'Transformed array' },
          isPure: true
        },
        examples: [
          {
            title: 'Square numbers',
            input: { array: [1, 2, 3, 4], transform: 'x => x * x' },
            output: [1, 4, 9, 16],
            code: 'map([1, 2, 3, 4], x => x * x)'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (arr: unknown[], transform: (value: unknown, index: number, array: unknown[]) => unknown) => arr.map(transform)
        },
        tags: ['array', 'map', 'transform']
      },

      // Date functions
      {
        name: 'now',
        category: 'date',
        description: 'Get current date and time',
        signature: {
          inputs: [],
          output: { name: 'result', type: 'date', description: 'Current date' },
          isPure: false
        },
        examples: [
          {
            title: 'Current date',
            input: null,
            output: new Date(),
            code: 'now()'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: () => new Date()
        },
        tags: ['date', 'current', 'time']
      },

      {
        name: 'formatDate',
        category: 'date',
        description: 'Format date as string',
        signature: {
          inputs: [
            { name: 'date', type: 'date', description: 'Date to format', required: true },
            { name: 'format', type: 'string', description: 'Format string', defaultValue: 'yyyy-MM-dd' }
          ],
          output: { name: 'result', type: 'string', description: 'Formatted date' },
          isPure: true
        },
        examples: [
          {
            title: 'Format date',
            input: { date: new Date('2023-12-25'), format: 'dd/MM/yyyy' },
            output: '25/12/2023',
            code: 'formatDate(new Date("2023-12-25"), "dd/MM/yyyy")'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (date: Date, formatStr: string = 'yyyy-MM-dd') => format(date, formatStr)
        },
        tags: ['date', 'format', 'string']
      },

      // Object functions
      {
        name: 'keys',
        category: 'object',
        description: 'Get object keys as array',
        signature: {
          inputs: [{ name: 'object', type: 'object', description: 'Input object', required: true }],
          output: { name: 'result', type: 'array', description: 'Array of keys' },
          isPure: true
        },
        examples: [
          {
            title: 'Get object keys',
            input: { name: 'John', age: 30, city: 'New York' },
            output: ['name', 'age', 'city'],
            code: 'keys({name: "John", age: 30, city: "New York"})'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (obj: object) => Object.keys(obj)
        },
        tags: ['object', 'keys', 'properties']
      },

      {
        name: 'values',
        category: 'object',
        description: 'Get object values as array',
        signature: {
          inputs: [{ name: 'object', type: 'object', description: 'Input object', required: true }],
          output: { name: 'result', type: 'array', description: 'Array of values' },
          isPure: true
        },
        examples: [
          {
            title: 'Get object values',
            input: { name: 'John', age: 30, city: 'New York' },
            output: ['John', 30, 'New York'],
            code: 'values({name: "John", age: 30, city: "New York"})'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (obj: object) => Object.values(obj)
        },
        tags: ['object', 'values', 'data']
      },

      // Type conversion functions
      {
        name: 'toString',
        category: 'conversion',
        description: 'Convert value to string',
        signature: {
          inputs: [{ name: 'value', type: 'any', description: 'Value to convert', required: true }],
          output: { name: 'result', type: 'string', description: 'String representation' },
          isPure: true
        },
        examples: [
          {
            title: 'Number to string',
            input: 42,
            output: '42',
            code: 'toString(42)'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (value: unknown) => String(value)
        },
        tags: ['conversion', 'string', 'cast']
      },

      {
        name: 'toNumber',
        category: 'conversion',
        description: 'Convert value to number',
        signature: {
          inputs: [{ name: 'value', type: 'any', description: 'Value to convert', required: true }],
          output: { name: 'result', type: 'number', description: 'Number representation' },
          isPure: true
        },
        examples: [
          {
            title: 'String to number',
            input: '42',
            output: 42,
            code: 'toNumber("42")'
          }
        ],
        implementation: {
          type: 'builtin',
          handler: (value: unknown) => Number(value)
        },
        tags: ['conversion', 'number', 'cast']
      }
    ];

    // Register all builtin functions
    functions.forEach(func => {
      const fullFunc: DataTransformFunction = {
        ...func,
        id: this.generateId()
      };
      this.functions.set(fullFunc.id, fullFunc);
    });
  }

  registerFunction(func: DataTransformFunction): void {
    this.functions.set(func.id, func);
    this.logger.info('Registered transform function', { id: func.id, name: func.name });
  }

  getFunction(id: string): DataTransformFunction | null {
    return this.functions.get(id) || null;
  }

  listFunctions(category?: TransformCategory): DataTransformFunction[] {
    const functions = Array.from(this.functions.values());
    if (category) {
      return functions.filter(f => f.category === category);
    }
    return functions;
  }

  searchFunctions(query: string): DataTransformFunction[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.functions.values()).filter(func =>
      func.name.toLowerCase().includes(lowerQuery) ||
      func.description.toLowerCase().includes(lowerQuery) ||
      func.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  async evaluate(expression: string, context: TransformContext): Promise<unknown> {
    this.logger.debug('Evaluating expression', { expression });

    try {
      // Create a safe evaluation context
      const evalContext = {
        ...context.variables,
        ...this.createFunctionContext(),
        $input: context.input,
        $node: context.node,
        $workflow: context.workflow,
        $helpers: this.helpers
      };

      // Parse and evaluate the expression
      // Using safe evaluation instead of external engine for now
      const result = this.safeEvaluate(expression, evalContext);
      return result;
    } catch (error) {
      this.logger.error('Expression evaluation failed', { expression, error });
      throw error;
    }
  }

  validateExpression(expression: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      usedFunctions: [],
      usedVariables: []
    };

    try {
      // Basic syntax validation
      if (!expression.trim()) {
        result.valid = false;
        result.errors.push({
          line: 1,
          column: 1,
          message: 'Expression cannot be empty',
          type: 'syntax'
        });
        return result;
      }

      // Check for balanced parentheses
      let parenCount = 0;
      for (let i = 0; i < expression.length; i++) {
        if (expression[i] === '(') parenCount++;
        if (expression[i] === ')') parenCount--;
        if (parenCount < 0) {
          result.valid = false;
          result.errors.push({
            line: 1,
            column: i + 1,
            message: 'Unexpected closing parenthesis',
            type: 'syntax'
          });
          break;
        }
      }

      if (parenCount > 0) {
        result.valid = false;
        result.errors.push({
          line: 1,
          column: expression.length,
          message: 'Missing closing parenthesis',
          type: 'syntax'
        });
      }

      // Extract function calls and variables
      const functionRegex = /(\w+)\s*\(/g;
      const functionMatches = Array.from(expression.matchAll(functionRegex));
      if (functionMatches && functionMatches.length > 0) {
        functionMatches.forEach(match => {
          const funcName = match[1];
          result.usedFunctions.push(funcName);

          // Check if function exists
          const func = Array.from(this.functions.values()).find(f => f.name === funcName);
          if (!func) {
            result.warnings.push({
              line: 1,
              column: expression.indexOf(match[0]) + 1,
              message: `Unknown function: ${funcName}`
            });
          }
        });
      }

      // Extract variable references
      const variableRegex = /\$(\w+)/g;
      const variableMatches = Array.from(expression.matchAll(variableRegex)).map(m => m[1]);
      if (variableMatches && variableMatches.length > 0) {
        result.usedVariables = Array.from(new Set(variableMatches));
      }

    } catch (error) {
      result.valid = false;
      result.errors.push({
        line: 1,
        column: 1,
        message: error instanceof Error ? error.message : 'Validation error',
        type: 'error'
      });
    }

    return result;
  }

  parseExpression(expression: string): ExpressionAST {
    // Simplified AST parsing - in production, use a proper parser
    return {
      type: 'expression',
      value: expression
    };
  }

  createChain(chain: Omit<TransformChain, 'id'>): TransformChain {
    const newChain: TransformChain = {
      ...chain,
      id: this.generateId()
    };
    
    this.chains.set(newChain.id, newChain);
    return newChain;
  }

  async executeChain(chainId: string, input: unknown, _context?: TransformContext): Promise<unknown> {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Transform chain ${chainId} not found`);
    }

    let currentData = input;
    const variables: Record<string, unknown> = { input };

    for (const step of chain.steps) {
      try {
        // Check condition if present
        if (step.condition && !this.evaluateCondition(step.condition, currentData, variables)) {
          continue;
        }

        // Get function
        const func = this.functions.get(step.functionId);
        if (!func) {
          throw new Error(`Function ${step.functionId} not found`);
        }

        // Prepare inputs
        const inputs = Object.values(step.inputs).map(value => {
          if (typeof value === 'string' && value.startsWith('$')) {
            return variables[value.substring(1)] || currentData;
          }
          return value;
        });

        // Execute function
        const result = func.implementation.handler ?
          await func.implementation.handler(...inputs) :
          currentData;

        // Store result in variable if specified
        if (step.outputVariable) {
          variables[step.outputVariable] = result;
        } else {
          currentData = result;
        }

      } catch (error) {
        if (step.errorHandling) {
          switch (step.errorHandling.strategy) {
            case 'default':
              currentData = step.errorHandling.defaultValue;
              break;
            case 'skip':
              continue;
            case 'retry':
              // Implement retry logic
              break;
            default:
              throw error;
          }
        } else {
          throw error;
        }
      }
    }

    return currentData;
  }

  createMapper(mapper: Omit<DataMapper, 'id'>): DataMapper {
    const newMapper: DataMapper = {
      ...mapper,
      id: this.generateId()
    };
    
    this.mappers.set(newMapper.id, newMapper);
    return newMapper;
  }

  async executeMapping(mapperId: string, data: unknown): Promise<unknown> {
    const mapper = this.mappers.get(mapperId);
    if (!mapper) {
      throw new Error(`Data mapper ${mapperId} not found`);
    }

    const result: any = {};

    for (const mapping of mapper.mappings) {
      try {
        // Get source value
        const sourceValue = this.getValueByPath(data, mapping.sourcePath);
        let finalValue = sourceValue;

        // Apply transform if present
        if (mapping.transform) {
          finalValue = await this.executeChain(mapping.transform.id, sourceValue);
        }

        // Apply condition if present
        if (mapping.condition && !this.evaluateSimpleCondition(mapping.condition, sourceValue)) {
          finalValue = mapping.defaultValue;
        }

        // Set target value
        this.setValueByPath(result, mapping.targetPath, finalValue);

      } catch (error) {
        this.logger.warn('Mapping failed', { mapping: mapping.id, error });
        if (mapping.defaultValue !== undefined) {
          this.setValueByPath(result, mapping.targetPath, mapping.defaultValue);
        }
      }
    }

    return result;
  }

  inferSchema(data: unknown): DataSchema {
    const structure = this.inferStructure(data, '') as any;
    return {
      type: 'json',
      structure: Array.isArray(structure) ? structure : [],
      sample: data
    };
  }

  createPlayground(): TransformPlayground {
    const playground: TransformPlayground = {
      id: this.generateId(),
      name: `Playground ${Date.now()}`,
      input: {},
      expression: '',
      history: [],
      savedExpressions: []
    };

    this.playgrounds.set(playground.id, playground);
    return playground;
  }

  async testExpression(expression: string, input: unknown): Promise<PlaygroundHistoryEntry> {
    const startTime = Date.now();
    try {
      const context: TransformContext = {
        input,
        variables: {},
        functions: this.createFunctionContext() as Record<string, (...args: unknown[]) => any>,
        helpers: this.helpers
      };

      const output = await this.evaluate(expression, context);
      const executionTime = Date.now() - startTime;

      return {
        timestamp: new Date(),
        expression,
        input,
        output,
        executionTime
      };
    } catch (error) {
      return {
        timestamp: new Date(),
        expression,
        input,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  saveExpression(playground: TransformPlayground, name: string): SavedExpression {
    const savedExpression: SavedExpression = {
      id: this.generateId(),
      name,
      expression: playground.expression,
      description: `Saved from ${playground.name}`,
      tags: [],
      createdAt: new Date(),
      usageCount: 0
    };

    this.expressions.set(savedExpression.id, savedExpression);
    playground.savedExpressions.push(savedExpression);

    return savedExpression;
  }

  getHelpers(): TransformHelpers {
    return this.helpers;
  }

  getSuggestions(partial: string, context: TransformContext): TransformSuggestion[] {
    const suggestions: TransformSuggestion[] = [];
    const lowerPartial = partial.toLowerCase();

    // Function suggestions
    Array.from(this.functions.values())
      .filter(func => func.name.toLowerCase().includes(lowerPartial))
      .forEach(func => {
        const score = this.calculateSuggestionScore(func.name, partial);
        suggestions.push({
          type: 'function',
          value: func.name,
          label: func.name,
          description: func.description,
          signature: this.formatSignature(func),
          category: func.category,
          score
        });
      });

    // Variable suggestions
    Object.keys(context.variables || {})
      .filter(variable => variable.toLowerCase().includes(lowerPartial))
      .forEach(variable => {
        const score = this.calculateSuggestionScore(variable, partial);
        suggestions.push({
          type: 'variable',
          value: `$${variable}`,
          label: variable,
          description: `Variable: ${variable}`,
          score
        });
      });

    // Helper suggestions
    Object.keys(this.helpers)
      .filter(helper => helper.toLowerCase().includes(lowerPartial))
      .forEach(helper => {
        const score = this.calculateSuggestionScore(helper, partial);
        suggestions.push({
          type: 'function',
          value: `$helpers.${helper}`,
          label: helper,
          description: `Helper function: ${helper}`,
          category: 'helpers',
          score
        });
      });

    return suggestions.sort((a, b) => b.score - a.score).slice(0, 20);
  }

  // Private helper methods
  private createFunctionContext(): Record<string, unknown> {
    const context: Record<string, unknown> = {};
    
    Array.from(this.functions.values()).forEach(func => {
      if (func.implementation.handler) {
        context[func.name] = func.implementation.handler;
      }
    });

    return context;
  }

  private safeEvaluate(expression: string, context: Record<string, unknown>): unknown {
    // Create a safe evaluation environment
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    try {
      // Use Function constructor for safer evaluation than eval()
      const func = new Function(...contextKeys, `return ${expression}`);
      return func(...contextValues);
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  private evaluateCondition(_condition: unknown, _data: unknown, _variables: Record<string, unknown>): boolean {
    // Simplified condition evaluation
    return true;
  }

  private evaluateSimpleCondition(_condition: string, _value: unknown): boolean {
    // Simplified condition evaluation
    return true;
  }

  private getValueByPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setValueByPath(obj: unknown, path: string, value: unknown): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in (current as object))) (current as any)[key] = {};
      return (current as any)[key];
    }, obj as object);
    (target as any)[lastKey] = value;
  }

  private inferStructure(data: unknown, path: string): unknown[] {
    if (Array.isArray(data)) {
      return [{
        name: path,
        path,
        type: 'array',
        children: data.length > 0 ? this.inferStructure(data[0], `${path}[0]`) : []
      }];
    }
    
    if (typeof data === 'object' && data !== null) {
      return Object.entries(data).map(([key, value]) => ({
        name: key,
        path: path ? `${path}.${key}` : key,
        type: this.inferType(value),
        children: typeof value === 'object' ? this.inferStructure(value, path ? `${path}.${key}` : key) : undefined
      }));
    }
    
    return [];
  }

  private inferType(value: unknown): ParameterType {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'any';
  }

  private formatSignature(func: DataTransformFunction): string {
    const inputs = func.signature.inputs.map(input => {
      const optional = !input.required ? '?' : '';
      return `${input.name}${optional}: ${Array.isArray(input.type) ? input.type.join('|') : input.type}`;
    }).join(', ');

    return `${func.name}(${inputs}): ${Array.isArray(func.signature.output.type) ? func.signature.output.type.join('|') : func.signature.output.type}`;
  }

  private calculateSuggestionScore(name: string, partial: string): number {
    const lowerName = name.toLowerCase();
    const lowerPartial = partial.toLowerCase();

    if (lowerName === lowerPartial) return 100;
    if (lowerName.startsWith(lowerPartial)) return 80;
    if (lowerName.includes(lowerPartial)) return 60;

    // Fuzzy matching
    let score = 0;
    let partialIndex = 0;

    for (let i = 0; i < lowerName.length && partialIndex < lowerPartial.length; i++) {
      if (lowerName[i] === lowerPartial[partialIndex]) {
        score += 10;
        partialIndex++;
      }
    }

    return partialIndex === lowerPartial.length ? score : 0;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}