/**
 * Common type definitions to replace 'any' types across the codebase
 * This file provides strict type alternatives for common use cases
 */

// ============================================================================
// JSON & DATA TYPES
// ============================================================================

/**
 * Type-safe JSON value
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONObject
  | JSONArray;

export interface JSONObject {
  [key: string]: JSONValue;
}

export type JSONArray = JSONValue[];

/**
 * Type-safe JSON primitive
 */
export type JSONPrimitive = string | number | boolean | null;

/**
 * Unknown record type for objects with unknown structure
 */
export type UnknownRecord = Record<string, unknown>;

/**
 * Unknown array type
 */
export type UnknownArray = unknown[];

// ============================================================================
// FUNCTION TYPES
// ============================================================================

/**
 * Generic callback function
 */
export type GenericCallback<T = void> = (error: Error | null, result?: T) => void;

/**
 * Generic async function
 */
export type AsyncFunction<T = unknown, R = unknown> = (arg: T) => Promise<R>;

/**
 * Generic transform function
 */
export type TransformFunction<TInput = unknown, TOutput = unknown> = (input: TInput) => TOutput;

/**
 * Generic validator function
 */
export type ValidatorFunction<T = unknown> = (value: T) => boolean;

/**
 * Generic predicate function
 */
export type PredicateFunction<T = unknown> = (value: T) => boolean;

// ============================================================================
// EXPRESSION & EVALUATION
// ============================================================================

/**
 * Expression evaluation context
 */
export interface EvaluationContext {
  variables: UnknownRecord;
  functions: Record<string, (...args: unknown[]) => unknown>;
  metadata?: UnknownRecord;
}

/**
 * Expression result
 */
export type ExpressionResult =
  | string
  | number
  | boolean
  | null
  | undefined
  | UnknownRecord
  | UnknownArray;

// ============================================================================
// ERROR & VALIDATION
// ============================================================================

/**
 * Error details
 */
export interface ErrorDetails {
  message: string;
  code?: string;
  stack?: string;
  metadata?: UnknownRecord;
}

/**
 * Validation result
 */
export interface ValidationResult<T = unknown> {
  valid: boolean;
  value?: T;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// ============================================================================
// CONFIGURATION & OPTIONS
// ============================================================================

/**
 * Configuration value types
 */
export type ConfigValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: ConfigValue }
  | ConfigValue[];

/**
 * Generic configuration object
 */
export type ConfigObject = Record<string, ConfigValue>;

/**
 * Generic options object
 */
export type OptionsObject = Record<string, unknown>;

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

/**
 * Data mapper function
 */
export type DataMapper<TSource = UnknownRecord, TTarget = UnknownRecord> = (
  source: TSource
) => TTarget;

/**
 * Field mapping configuration
 */
export interface FieldMapping {
  source: string;
  target: string;
  transform?: TransformFunction;
  defaultValue?: unknown;
}

/**
 * Transform rule
 */
export interface TransformRule<T = unknown> {
  type: string;
  condition?: PredicateFunction<T>;
  transform: TransformFunction<T>;
}

// ============================================================================
// WORKFLOW & EXECUTION
// ============================================================================

/**
 * Node input data
 */
export type NodeInputData = UnknownRecord | UnknownArray | JSONValue;

/**
 * Node output data
 */
export type NodeOutputData = UnknownRecord | UnknownArray | JSONValue;

/**
 * Execution context
 */
export interface ExecutionContext {
  variables: UnknownRecord;
  credentials?: UnknownRecord;
  environment?: UnknownRecord;
  metadata?: UnknownRecord;
}

/**
 * Execution result
 */
export interface ExecutionResult<T = NodeOutputData> {
  success: boolean;
  data?: T;
  error?: ErrorDetails;
  metadata?: UnknownRecord;
}

// ============================================================================
// HTTP & API
// ============================================================================

/**
 * HTTP headers
 */
export type HttpHeaders = Record<string, string | string[]>;

/**
 * HTTP query parameters
 */
export type QueryParameters = Record<string, string | string[] | number | boolean>;

/**
 * HTTP request body
 */
export type RequestBody =
  | string
  | UnknownRecord
  | UnknownArray
  | Buffer
  | FormData
  | null;

/**
 * HTTP response data
 */
export type ResponseData =
  | string
  | UnknownRecord
  | UnknownArray
  | Buffer
  | null;

// ============================================================================
// SCHEMA & STRUCTURE
// ============================================================================

/**
 * JSON Schema type
 */
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  enum?: JSONValue[];
  const?: JSONValue;
  default?: JSONValue;
  description?: string;
  title?: string;
  [key: string]: unknown;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
    keyword?: string;
  }>;
}

// ============================================================================
// EVENTS & MESSAGING
// ============================================================================

/**
 * Event payload
 */
export type EventPayload = UnknownRecord;

/**
 * Event handler
 */
export type EventHandler<T = EventPayload> = (payload: T) => void | Promise<void>;

/**
 * Message data
 */
export interface MessageData {
  type: string;
  payload: UnknownRecord;
  metadata?: UnknownRecord;
  timestamp: Date;
}

// ============================================================================
// STORAGE & PERSISTENCE
// ============================================================================

/**
 * Storage key
 */
export type StorageKey = string;

/**
 * Storage value
 */
export type StorageValue = JSONValue;

/**
 * Storage entry
 */
export interface StorageEntry<T = StorageValue> {
  key: StorageKey;
  value: T;
  metadata?: UnknownRecord;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

// ============================================================================
// METRICS & MONITORING
// ============================================================================

/**
 * Metric value
 */
export type MetricValue = number | string | boolean;

/**
 * Metrics data
 */
export type MetricsData = Record<string, MetricValue>;

/**
 * Time series data point
 */
export interface TimeSeriesDataPoint {
  timestamp: Date | number;
  value: number;
  metadata?: UnknownRecord;
}

// ============================================================================
// TESTING & DEBUGGING
// ============================================================================

/**
 * Test data
 */
export type TestData = UnknownRecord | UnknownArray;

/**
 * Mock data
 */
export interface MockData {
  scenario: string;
  input: UnknownRecord;
  output: UnknownRecord;
  conditions?: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
}

/**
 * Debug info
 */
export interface DebugInfo {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: UnknownRecord;
  stack?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Required deep type
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Nullable type
 */
export type Nullable<T> = T | null;

/**
 * Maybe type (nullable or undefined)
 */
export type Maybe<T> = T | null | undefined;

/**
 * Awaited type (unwrap Promise)
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Constructor type
 */
export type Constructor<T = object> = new (...args: unknown[]) => T;

/**
 * Class type
 */
export type Class<T = object> = { prototype: T } & Constructor<T>;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if value is a valid JSON value
 */
export function isJSONValue(value: unknown): value is JSONValue {
  if (value === null) return true;
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isJSONValue);
  if (type === 'object') {
    return Object.values(value as object).every(isJSONValue);
  }
  return false;
}

/**
 * Check if value is a record
 */
export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is a non-empty record
 */
export function isNonEmptyRecord(value: unknown): value is UnknownRecord {
  return isRecord(value) && Object.keys(value).length > 0;
}

/**
 * Check if value is an array
 */
export function isArray(value: unknown): value is UnknownArray {
  return Array.isArray(value);
}

/**
 * Check if value is a non-empty array
 */
export function isNonEmptyArray(value: unknown): value is UnknownArray {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is a function
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/**
 * Check if value is a promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return value instanceof Promise || (
    isRecord(value) &&
    isFunction((value as { then?: unknown }).then)
  );
}

/**
 * Assert value is defined (not null or undefined)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Value is null or undefined'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

/**
 * Assert value is a record
 */
export function assertRecord(
  value: unknown,
  message = 'Value is not a record'
): asserts value is UnknownRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
}

/**
 * Assert value is an array
 */
export function assertArray(
  value: unknown,
  message = 'Value is not an array'
): asserts value is UnknownArray {
  if (!isArray(value)) {
    throw new Error(message);
  }
}
