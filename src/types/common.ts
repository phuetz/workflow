/**
 * Common Type Definitions
 * Replaces common 'any' usages with proper types
 */

// Database Types
export interface DatabaseResult<T = unknown> {
  rows: T[];
  rowCount: number;
  fields?: DatabaseField[];
}

export interface DatabaseField {
  name: string;
  type: string;
  nullable: boolean;
}

export interface DatabaseQuery {
  text: string;
  values: DatabaseValue[];
}

export type DatabaseValue = string | number | boolean | Date | null | Buffer;

// API Types
export interface ApiRequest<T = unknown> {
  body: T;
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  method: string;
  path: string;
  user?: AuthenticatedUser;
}

export interface ApiResponse<T = unknown> {
  status: number;
  data?: T;
  error?: ApiError;
  headers?: Record<string, string>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
  metadata?: Record<string, unknown>;
}

export enum UserRole {
  Admin = 'admin',
  User = 'user',
  Premium = 'premium',
  Guest = 'guest'
}

// Workflow Types
export interface WorkflowContext {
  input: unknown;
  variables: Record<string, unknown>;
  results: Record<string, unknown>;
  metadata: WorkflowMetadata;
  user?: AuthenticatedUser;
}

export interface WorkflowMetadata {
  workflowId: string;
  executionId: string;
  startTime: Date;
  currentNode?: string;
  parentExecution?: string;
}

export interface NodeExecutionResult {
  success: boolean;
  output?: unknown;
  error?: NodeExecutionError;
  metrics?: ExecutionMetrics;
}

export interface NodeExecutionError {
  code: string;
  message: string;
  nodeId: string;
  timestamp: Date;
  details?: unknown;
}

export interface ExecutionMetrics {
  duration: number;
  memoryUsage?: number;
  cpuUsage?: number;
  customMetrics?: Record<string, number>;
}

// Configuration Types
export interface ServiceConfig {
  enabled: boolean;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  customSettings?: Record<string, unknown>;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: 'LRU' | 'LFU' | 'TTL';
}

// Event Types
export interface WorkflowEvent<T = unknown> {
  type: string;
  timestamp: Date;
  data: T;
  source: string;
  correlationId?: string;
}

export interface SystemEvent {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
}

// Plugin Types
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: string[];
  main?: string;
  resources?: string[];
  dependencies?: Record<string, string>;
  configuration?: PluginConfiguration;
}

export interface PluginConfiguration {
  schema: Record<string, ConfigurationField>;
  defaults?: Record<string, unknown>;
  required?: string[];
}

export interface ConfigurationField {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  default?: unknown;
  enum?: unknown[];
  validation?: ValidationRule;
}

export interface ValidationRule {
  pattern?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  custom?: (value: unknown) => boolean;
}

// Security Types
export interface SecurityContext {
  user: AuthenticatedUser;
  permissions: Set<string>;
  restrictions: SecurityRestrictions;
  auditLog: AuditEntry[];
}

export interface SecurityRestrictions {
  allowedDomains: string[];
  allowedProtocols: string[];
  maxRequestSize: number;
  rateLimit: RateLimitConfig;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessful?: boolean;
  skipFailed?: boolean;
}

export interface AuditEntry {
  timestamp: Date;
  action: string;
  userId: string;
  resource: string;
  result: 'success' | 'failure';
  details?: Record<string, unknown>;
}

// Storage Types
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
}

export interface StorageOptions {
  prefix?: string;
  ttl?: number;
  serialize?: (value: unknown) => string;
  deserialize?: (value: string) => unknown;
}

// Queue Types
export interface QueueJob<T = unknown> {
  id: string;
  type: string;
  data: T;
  priority: number;
  createdAt: Date;
  scheduledAt?: Date;
  attempts: number;
  maxAttempts: number;
  result?: JobResult;
}

export interface JobResult {
  success: boolean;
  output?: unknown;
  error?: Error;
  completedAt: Date;
  duration: number;
}

export interface QueueOptions {
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  priority?: number;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// Function Types
export type AsyncFunction<T = void, R = void> = (arg: T) => Promise<R>;
export type SyncFunction<T = void, R = void> = (arg: T) => R;
export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;
export type ErrorHandler = (error: Error) => void | Promise<void>;

// Validation Types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
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

// Analytics Types
export interface AnalyticsEvent {
  type: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  properties: Record<string, unknown>;
  context: AnalyticsContext;
}

export interface AnalyticsContext {
  app: {
    name: string;
    version: string;
    build?: string;
  };
  device?: {
    type: string;
    model?: string;
    os?: string;
  };
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

// Response Types
export type SuccessResponse<T> = {
  success: true;
  data: T;
  metadata?: ResponseMetadata;
};

export type ErrorResponse = {
  success: false;
  error: ApiError;
  metadata?: ResponseMetadata;
};

export type ApiResponseType<T> = SuccessResponse<T> | ErrorResponse;

export interface ResponseMetadata {
  timestamp: Date;
  requestId: string;
  duration: number;
  version?: string;
}

// Pagination Types
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMetadata;
}

export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Filter Types
export interface FilterCriteria {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export enum FilterOperator {
  Equals = 'eq',
  NotEquals = 'ne',
  GreaterThan = 'gt',
  GreaterThanOrEqual = 'gte',
  LessThan = 'lt',
  LessThanOrEqual = 'lte',
  In = 'in',
  NotIn = 'nin',
  Contains = 'contains',
  StartsWith = 'startsWith',
  EndsWith = 'endsWith'
}

// Export commonly used type guards
export const isString = (value: unknown): value is string => typeof value === 'string';
export const isNumber = (value: unknown): value is number => typeof value === 'number';
export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
export const isObject = (value: unknown): value is object => typeof value === 'object' && value !== null;
export const isArray = <T>(value: unknown): value is T[] => Array.isArray(value);
export const isFunction = (value: unknown): value is (...args: unknown[]) => unknown => typeof value === 'function';
export const isNull = (value: unknown): value is null => value === null;
export const isUndefined = (value: unknown): value is undefined => value === undefined;
export const isDefined = <T>(value: T | undefined): value is T => value !== undefined;
export const isNotNull = <T>(value: T | null): value is T => value !== null;
export const isNotNullOrUndefined = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;