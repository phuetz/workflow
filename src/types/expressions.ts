/**
 * Expression Types
 * Type definitions for expression evaluation system
 * PROJET SAUVÉ - Phase 5.1: Variables & Expressions System
 */

/**
 * Expression context - available data during evaluation
 */
export interface ExpressionContext {
  // Global variables
  variables?: Record<string, any>;

  // Environment variables
  env?: Record<string, string>;

  // Node outputs accessible as $node["Node Name"]
  nodeOutputs?: Record<string, any>;

  // Current input data
  inputData?: any;

  // Workflow metadata
  workflowData?: {
    id?: string;
    name?: string;
    mode?: string;
  };

  // Execution metadata
  executionData?: {
    id?: string;
    mode?: string;
    startTime?: Date;
  };

  // Local scope variables
  localScope?: Record<string, any>;
}

/**
 * Expression evaluation result
 */
export interface ExpressionResult<T = any> {
  success: boolean;
  value?: T;
  error?: string;
  originalInput: string;
}

/**
 * Options for expression evaluation
 */
export interface EvaluationOptions {
  // Throw error on evaluation failure instead of returning error result
  throwOnError?: boolean;

  // Maximum evaluation depth (prevent infinite recursion)
  maxDepth?: number;

  // Timeout for evaluation in milliseconds
  timeout?: number;

  // Enable/disable certain features
  allowFunctionCalls?: boolean;
  allowMemberAccess?: boolean;
  allowArithmetic?: boolean;
}

/**
 * Expression found in input string
 */
export interface FoundExpression {
  // Full match including {{ }}
  fullMatch: string;

  // Expression content without {{ }}
  expression: string;

  // Start position in input string
  start: number;

  // End position in input string
  end: number;
}

/**
 * Expression validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * AST Node types
 */
export type ASTNode =
  | LiteralNode
  | IdentifierNode
  | MemberExpressionNode
  | CallExpressionNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | ConditionalExpressionNode
  | ArrayExpressionNode
  | ObjectExpressionNode;

export interface LiteralNode {
  type: 'Literal';
  value: string | number | boolean | null;
}

export interface IdentifierNode {
  type: 'Identifier';
  name: string;
}

export interface MemberExpressionNode {
  type: 'MemberExpression';
  object: ASTNode;
  property: ASTNode;
  computed: boolean; // true for a[b], false for a.b
}

export interface CallExpressionNode {
  type: 'CallExpression';
  callee: ASTNode;
  arguments: ASTNode[];
}

export interface BinaryExpressionNode {
  type: 'BinaryExpression';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryExpressionNode {
  type: 'UnaryExpression';
  operator: string;
  argument: ASTNode;
  prefix: boolean;
}

export interface ConditionalExpressionNode {
  type: 'ConditionalExpression';
  test: ASTNode;
  consequent: ASTNode;
  alternate: ASTNode;
}

export interface ArrayExpressionNode {
  type: 'ArrayExpression';
  elements: ASTNode[];
}

export interface ObjectExpressionNode {
  type: 'ObjectExpression';
  properties: PropertyNode[];
}

export interface PropertyNode {
  type: 'Property';
  key: ASTNode;
  value: ASTNode;
}

/**
 * Built-in function definition
 */
export interface BuiltInFunction {
  name: string;
  description: string;
  category: FunctionCategory;
  parameters: FunctionParameter[];
  returnType: string;
  examples: string[];
  execute: (...args: any[]) => any | Promise<any>;
}

export type FunctionCategory =
  | 'datetime'
  | 'string'
  | 'array'
  | 'object'
  | 'math'
  | 'conversion'
  | 'utility';

export interface FunctionParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  defaultValue?: any;
}

/**
 * Autocomplete suggestion
 */
export interface AutocompleteSuggestion {
  label: string;
  kind: 'variable' | 'function' | 'property' | 'keyword';
  detail?: string;
  documentation?: string;
  insertText?: string;
}

/**
 * Expression security config
 */
export interface SecurityConfig {
  // Allowed global variables
  allowedGlobals?: string[];

  // Forbidden patterns (regex)
  forbiddenPatterns?: RegExp[];

  // Maximum string length
  maxStringLength?: number;

  // Maximum array length
  maxArrayLength?: number;

  // Maximum object depth
  maxObjectDepth?: number;

  // Forbidden function names
  forbiddenFunctions?: string[];
}
