/**
 * PLAN C PHASE 3 - Patterns Partagés pour Éliminer les Duplications
 * Centralise les patterns de code répétitifs
 */

import { logger } from '../services/SimpleLogger';
import { cacheLayer as cacheService } from '../services/CacheLayer';
import { performanceHub } from '../services/core/PerformanceMonitoringHub';

// ============================================
// Types Stricts (Remplace les 'any')
// ============================================

export type AsyncFunction<T = unknown, R = unknown> = (args: T) => Promise<R>;
export type SyncFunction<T = unknown, R = unknown> = (args: T) => R;
export type ErrorHandler = (error: Error, context?: ErrorContext) => void;
export type RetryStrategy = 'exponential' | 'linear' | 'fixed';

export interface ErrorContext {
  operation: string;
  module: string;
  data?: unknown;
  userId?: string;
  timestamp: Date;
}

export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  strategy: RetryStrategy;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface CacheOptions {
  ttl: number;
  key: string;
  compress?: boolean;
  namespace?: string;
}

export interface ValidationResult<T = unknown> {
  valid: boolean;
  data?: T;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Pattern 1: Try-Catch avec Logging
// ============================================

export async function withErrorHandling<T>(
  operation: AsyncFunction<unknown, T>,
  context: Partial<ErrorContext>,
  defaultValue?: T
): Promise<T | undefined> {
  const fullContext: ErrorContext = {
    operation: context.operation || 'unknown',
    module: context.module || 'unknown',
    timestamp: new Date(),
    ...context
  };
  
  try {
    const traceId = performanceHub.startTrace(fullContext.operation);
    const result = await operation(context.data);
    performanceHub.endTrace(traceId, 'completed');
    return result;
  } catch (error) {
    logger.error(`Error in ${fullContext.module}.${fullContext.operation}:`, error, JSON.stringify(fullContext));
    performanceHub.increment('errors.count', 1, {
      module: fullContext.module,
      operation: fullContext.operation
    });

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw error;
  }
}

export function withSyncErrorHandling<T>(
  operation: SyncFunction<unknown, T>,
  context: Partial<ErrorContext>,
  defaultValue?: T
): T | undefined {
  const fullContext: ErrorContext = {
    operation: context.operation || 'unknown',
    module: context.module || 'unknown',
    timestamp: new Date(),
    ...context
  };
  
  try {
    return operation(context.data);
  } catch (error) {
    logger.error(`Error in ${fullContext.module}.${fullContext.operation}:`, error, JSON.stringify(fullContext));

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw error;
  }
}

// ============================================
// Pattern 2: Retry Logic
// ============================================

export async function withRetry<T>(
  operation: AsyncFunction<unknown, T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    strategy = 'exponential',
    onRetry
  } = options;
  
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation(undefined);
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts) {
        const waitTime = calculateDelay(attempt, delay, strategy);
        
        if (onRetry) {
          onRetry(attempt, lastError);
        }
        
        logger.debug(`Retry attempt ${attempt}/${maxAttempts} after ${waitTime}ms`);
        await sleep(waitTime);
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

function calculateDelay(attempt: number, baseDelay: number, strategy: RetryStrategy): number {
  switch (strategy) {
    case 'exponential':
      return Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
    case 'linear':
      return baseDelay * attempt;
    case 'fixed':
    default:
      return baseDelay;
  }
}

// ============================================
// Pattern 3: Caching Wrapper
// ============================================

export async function withCache<T>(
  key: string,
  operation: AsyncFunction<unknown, T>,
  options: Partial<CacheOptions> = {}
): Promise<T> {
  const {
    ttl = 300,
    compress = false,
    namespace = 'default'
  } = options;
  
  const cacheKey = `${namespace}:${key}`;
  
  // Try to get from cache
  const cached = await cacheService.get<T>(cacheKey);
  if (cached !== null) {
    logger.debug(`Cache hit for key: ${cacheKey}`);
    performanceHub.increment('cache.hits', 1, { namespace });
    return cached;
  }
  
  // Execute operation
  logger.debug(`Cache miss for key: ${cacheKey}`);
  performanceHub.increment('cache.misses', 1, { namespace });
  
  const result = await operation(undefined);

  // Store in cache
  await cacheService.set(cacheKey, result, ttl);

  return result;
}

// ============================================
// Pattern 4: Validation Wrapper
// ============================================

export function createValidator<T>(
  schema: Record<string, ValidatorFunction>
): (data: unknown) => ValidationResult<T> {
  return (data: unknown): ValidationResult<T> => {
    const errors: ValidationError[] = [];
    const validatedData: Record<string, unknown> = {};
    
    if (!data || typeof data !== 'object') {
      errors.push({
        field: '',
        message: 'Invalid data format',
        code: 'INVALID_FORMAT'
      });
      
      return { valid: false, errors };
    }
    
    const dataObj = data as Record<string, unknown>;
    
    for (const [field, validator] of Object.entries(schema)) {
      const value = dataObj[field];
      const result = validator(value, field);
      
      if (!result.valid) {
        errors.push(...result.errors);
      } else if (result.transformed !== undefined) {
        validatedData[field] = result.transformed;
      } else {
        validatedData[field] = value;
      }
    }
    
    return {
      valid: errors.length === 0,
      data: validatedData as T,
      errors
    };
  };
}

type ValidatorFunction = (value: unknown, field: string) => {
  valid: boolean;
  errors: ValidationError[];
  transformed?: unknown;
};

// Common validators
export const validators = {
  required: (field: string): ValidatorFunction => 
    (value: unknown): { valid: boolean; errors: ValidationError[] } => {
      const valid = value !== null && value !== undefined && value !== '';
      return {
        valid,
        errors: valid ? [] : [{
          field,
          message: `${field} is required`,
          code: 'REQUIRED'
        }]
      };
    },
  
  string: (field: string, minLength?: number, maxLength?: number): ValidatorFunction =>
    (value: unknown): { valid: boolean; errors: ValidationError[]; transformed?: unknown } => {
      if (typeof value !== 'string') {
        return {
          valid: false,
          errors: [{
            field,
            message: `${field} must be a string`,
            code: 'INVALID_TYPE'
          }]
        };
      }
      
      const errors: ValidationError[] = [];
      
      if (minLength && value.length < minLength) {
        errors.push({
          field,
          message: `${field} must be at least ${minLength} characters`,
          code: 'MIN_LENGTH'
        });
      }
      
      if (maxLength && value.length > maxLength) {
        errors.push({
          field,
          message: `${field} must be at most ${maxLength} characters`,
          code: 'MAX_LENGTH'
        });
      }
      
      return {
        valid: errors.length === 0,
        errors,
        transformed: value.trim()
      };
    },
  
  number: (field: string, min?: number, max?: number): ValidatorFunction =>
    (value: unknown): { valid: boolean; errors: ValidationError[]; transformed?: unknown } => {
      const num = Number(value);
      
      if (isNaN(num)) {
        return {
          valid: false,
          errors: [{
            field,
            message: `${field} must be a number`,
            code: 'INVALID_TYPE'
          }]
        };
      }
      
      const errors: ValidationError[] = [];
      
      if (min !== undefined && num < min) {
        errors.push({
          field,
          message: `${field} must be at least ${min}`,
          code: 'MIN_VALUE'
        });
      }
      
      if (max !== undefined && num > max) {
        errors.push({
          field,
          message: `${field} must be at most ${max}`,
          code: 'MAX_VALUE'
        });
      }
      
      return {
        valid: errors.length === 0,
        errors,
        transformed: num
      };
    },
  
  email: (field: string): ValidatorFunction =>
    (value: unknown): { valid: boolean; errors: ValidationError[] } => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const valid = typeof value === 'string' && emailRegex.test(value);
      
      return {
        valid,
        errors: valid ? [] : [{
          field,
          message: `${field} must be a valid email`,
          code: 'INVALID_EMAIL'
        }]
      };
    },
  
  enum: <T>(field: string, values: T[]): ValidatorFunction =>
    (value: unknown): { valid: boolean; errors: ValidationError[] } => {
      const valid = values.includes(value as T);
      
      return {
        valid,
        errors: valid ? [] : [{
          field,
          message: `${field} must be one of: ${values.join(', ')}`,
          code: 'INVALID_ENUM'
        }]
      };
    }
};

// ============================================
// Pattern 5: Pagination Helper
// ============================================

export function paginate<T>(
  data: T[],
  params: PaginationParams
): PaginatedResult<T> {
  const { page, limit, sortBy, order = 'asc' } = params;
  
  // Sort if needed
  const sorted = [...data];
  if (sortBy) {
    sorted.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortBy];
      const bVal = (b as Record<string, unknown>)[sortBy];

      // Type guard for comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }
  
  // Paginate
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedData = sorted.slice(start, end);
  const totalPages = Math.ceil(data.length / limit);
  
  return {
    data: paginatedData,
    total: data.length,
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

// ============================================
// Pattern 6: Batch Processing
// ============================================

export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  onProgress?: (processed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length);
    }
  }
  
  return results;
}

// ============================================
// Pattern 7: Debounce & Throttle
// ============================================

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>): void => {
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>): void => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// ============================================
// Pattern 8: Deep Clone & Merge
// ============================================

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target;
  
  const source = sources.shift();
  
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  
  return deepMerge(target, ...sources);
}

function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}

// ============================================
// Pattern 9: API Response Builder
// ============================================

export class ResponseBuilder<T = unknown> {
  private response: ApiResponse<T> = {
    success: false
  };
  
  success(data: T): this {
    this.response.success = true;
    this.response.data = data;
    return this;
  }
  
  error(message: string): this {
    this.response.success = false;
    this.response.error = message;
    return this;
  }
  
  metadata(metadata: Record<string, unknown>): this {
    this.response.metadata = metadata;
    return this;
  }
  
  build(): ApiResponse<T> {
    return this.response;
  }
}

// ============================================
// Pattern 10: Singleton Factory
// ============================================

export function createSingleton<T>(
  factory: () => T
): () => T {
  let instance: T | null = null;
  
  return (): T => {
    if (!instance) {
      instance = factory();
    }
    return instance;
  };
}

// ============================================
// Utility Functions
// ============================================

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  
  return result;
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  
  for (const key of keys) {
    delete result[key];
  }
  
  return result;
}

export function groupBy<T>(
  array: T[],
  keySelector: (item: T) => string
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const key = keySelector(item);
    
    if (!groups[key]) {
      groups[key] = [];
    }
    
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  
  return chunks;
}

export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args) as ReturnType<T>;
    cache.set(key, result);

    return result;
  }) as T;
}