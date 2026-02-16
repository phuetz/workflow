/**
 * Data Transformation Types
 * Built-in data transformation functions and expressions
 */

 

export interface DataTransformFunction {
  id: string;
  name: string;
  category: TransformCategory;
  description: string;
  icon?: string;
  signature: FunctionSignature;
  examples: TransformExample[];
  implementation: TransformImplementation;
  tags: string[];
}

export type TransformCategory = 
  | 'string'
  | 'number'
  | 'date'
  | 'array'
  | 'object'
  | 'boolean'
  | 'crypto'
  | 'encoding'
  | 'validation'
  | 'conversion'
  | 'math'
  | 'logic'
  | 'comparison'
  | 'aggregation'
  | 'filtering'
  | 'mapping';

export interface FunctionSignature {
  inputs: FunctionParameter[];
  output: FunctionParameter;
  isVariadic?: boolean; // Accepts variable number of arguments
  isAsync?: boolean;
  isPure?: boolean; // No side effects
}

export interface FunctionParameter {
  name: string;
  type: ParameterType | ParameterType[];
  description: string;
  required?: boolean;
  defaultValue?: unknown;
  validator?: (value: unknown) => boolean;
}

export type ParameterType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'any'
  | 'regex'
  | 'function'
  | 'null'
  | 'undefined';

export interface TransformExample {
  title: string;
  input: unknown;
  output: unknown;
  code: string;
  description?: string;
}

export interface TransformImplementation {
  type: 'builtin' | 'custom' | 'expression';
  code?: string;
  handler?: (...args: unknown[]) => any;
  dependencies?: string[];
}

export interface TransformExpression {
  id: string;
  expression: string;
  variables: ExpressionVariable[];
  functions: string[]; // Function IDs used
  result?: unknown;
  error?: string;
  executionTime?: number;
}

export interface ExpressionVariable {
  name: string;
  path: string;
  type: ParameterType;
  value?: unknown;
  source: 'input' | 'node' | 'global' | 'context';
}

export interface TransformChain {
  id: string;
  name: string;
  description?: string;
  steps: TransformStep[];
  input: FunctionParameter;
  output: FunctionParameter;
  isReusable: boolean;
}

export interface TransformStep {
  id: string;
  functionId: string;
  inputs: Record<string, unknown>;
  outputVariable?: string;
  condition?: TransformCondition;
  errorHandling?: ErrorHandling;
}

export interface TransformCondition {
  type: 'if' | 'unless' | 'switch';
  expression: string;
  branches?: ConditionBranch[];
}

export interface ConditionBranch {
  condition: string;
  steps: TransformStep[];
}

export interface ErrorHandling {
  strategy: 'throw' | 'default' | 'skip' | 'retry';
  defaultValue?: unknown;
  retryCount?: number;
  retryDelay?: number;
}

export interface DataMapper {
  id: string;
  name: string;
  sourceSchema: DataSchema;
  targetSchema: DataSchema;
  mappings: FieldMapping[];
  transforms: Record<string, TransformChain>;
  options: MapperOptions;
}

export interface DataSchema {
  type: 'json' | 'xml' | 'csv' | 'custom';
  structure: SchemaField[];
  sample?: unknown;
}

export interface SchemaField {
  name: string;
  path: string;
  type: ParameterType;
  required?: boolean;
  children?: SchemaField[];
  metadata?: Record<string, unknown>;
}

export interface FieldMapping {
  id: string;
  sourcePath: string;
  targetPath: string;
  transform?: TransformChain;
  condition?: string;
  defaultValue?: unknown;
}

export interface MapperOptions {
  ignoreUnmapped?: boolean;
  preserveNull?: boolean;
  flattenArrays?: boolean;
  mergeObjects?: boolean;
  validation?: ValidationOptions;
}

export interface ValidationOptions {
  enabled: boolean;
  rules: ValidationRule[];
  onError: 'throw' | 'warn' | 'ignore';
}

export interface ValidationRule {
  field: string;
  type: ValidationType;
  config: unknown;
  message?: string;
}

export type ValidationType = 
  | 'required'
  | 'type'
  | 'regex'
  | 'range'
  | 'length'
  | 'enum'
  | 'custom';

export interface TransformPlayground {
  id: string;
  name: string;
  description?: string;
  input: unknown;
  expression: string;
  output?: unknown;
  error?: string;
  executionTime?: number;
  history: PlaygroundHistoryEntry[];
  savedExpressions: SavedExpression[];
}

export interface PlaygroundHistoryEntry {
  timestamp: Date;
  expression: string;
  input: unknown;
  output?: unknown;
  error?: string;
  executionTime?: number;
}

export interface SavedExpression {
  id: string;
  name: string;
  expression: string;
  description?: string;
  tags: string[];
  createdAt: Date;
  usageCount: number;
}

export interface TransformLibrary {
  functions: DataTransformFunction[];
  chains: TransformChain[];
  expressions: SavedExpression[];
  categories: CategoryInfo[];
  popularFunctions: string[]; // Function IDs
  recentlyUsed: string[]; // Function IDs
}

export interface CategoryInfo {
  name: TransformCategory;
  description: string;
  icon: string;
  functionCount: number;
}

export interface TransformContext {
  input: unknown;
  node?: unknown;
  workflow?: unknown;
  execution?: unknown;
  variables: Record<string, unknown>;
  functions: Record<string, (...args: unknown[]) => any>;
  helpers: TransformHelpers;
}

export interface TransformHelpers {
  // Date helpers
  now: () => Date;
  parseDate: (date: string | Date) => Date;
  formatDate: (date: Date, format: string) => string;
  
  // String helpers
  capitalize: (str: string) => string;
  slugify: (str: string) => string;
  truncate: (str: string, length: number) => string;
  
  // Array helpers
  flatten: (arr: unknown[]) => unknown[];
  unique: (arr: unknown[]) => unknown[];
  groupBy: (arr: unknown[], key: string) => Record<string, unknown[]>;
  
  // Object helpers
  pick: (obj: unknown, keys: string[]) => any;
  omit: (obj: unknown, keys: string[]) => any;
  merge: (...objects: unknown[]) => any;
  
  // Math helpers
  sum: (numbers: number[]) => number;
  avg: (numbers: number[]) => number;
  min: (numbers: number[]) => number;
  max: (numbers: number[]) => number;
  
  // Validation helpers
  isEmail: (str: string) => boolean;
  isUrl: (str: string) => boolean;
  isNumber: (value: unknown) => boolean;
  isEmpty: (value: unknown) => boolean;
}

export interface TransformService {
  // Function management
  registerFunction(func: DataTransformFunction): void;
  getFunction(id: string): DataTransformFunction | null;
  listFunctions(category?: TransformCategory): DataTransformFunction[];
  searchFunctions(query: string): DataTransformFunction[];
  
  // Expression evaluation
  evaluate(expression: string, context: TransformContext): Promise<unknown>;
  validateExpression(expression: string): ValidationResult;
  parseExpression(expression: string): ExpressionAST;
  
  // Transform chains
  createChain(chain: Omit<TransformChain, 'id'>): TransformChain;
  executeChain(chainId: string, input: unknown, context?: TransformContext): Promise<unknown>;
  
  // Data mapping
  createMapper(mapper: Omit<DataMapper, 'id'>): DataMapper;
  executeMapping(mapperId: string, data: unknown): Promise<unknown>;
  inferSchema(data: unknown): DataSchema;
  
  // Playground
  createPlayground(): TransformPlayground;
  testExpression(expression: string, input: unknown): Promise<PlaygroundHistoryEntry>;
  saveExpression(playground: TransformPlayground, name: string): SavedExpression;
  
  // Helpers
  getHelpers(): TransformHelpers;
  getSuggestions(partial: string, context: TransformContext): TransformSuggestion[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    line: number;
    column: number;
    message: string;
    type: string;
  }>;
  warnings: Array<{
    line: number;
    column: number;
    message: string;
  }>;
  usedFunctions: string[];
  usedVariables: string[];
}

export interface ExpressionAST {
  type: string;
  value?: unknown;
  operator?: string;
  left?: ExpressionAST;
  right?: ExpressionAST;
  arguments?: ExpressionAST[];
  property?: string;
  object?: ExpressionAST;
}

export interface TransformSuggestion {
  type: 'function' | 'variable' | 'property' | 'keyword';
  value: string;
  label: string;
  description?: string;
  signature?: string;
  category?: string;
  score: number;
}