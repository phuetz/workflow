/**
 * Data Validation Schemas
 * Runtime validation using Zod-like schema definitions
 */

export type ValidationResult = {
  success: boolean;
  data?: any;
  errors?: ValidationError[];
};

export interface ValidationError {
  path: string[];
  message: string;
  code: string;
}

export abstract class Schema<T = any> {
  abstract validate(data: any): ValidationResult;

  parse(data: any): T {
    const result = this.validate(data);
    if (!result.success) {
      throw new ValidationException(result.errors || []);
    }
    return result.data as T;
  }

  safeParse(data: any): ValidationResult {
    return this.validate(data);
  }

  optional(): OptionalSchema<T> {
    return new OptionalSchema(this);
  }

  nullable(): NullableSchema<T> {
    return new NullableSchema(this);
  }

  default(value: T): DefaultSchema<T> {
    return new DefaultSchema(this, value);
  }
}

class ValidationException extends Error {
  constructor(public errors: ValidationError[]) {
    super('Validation failed');
    this.name = 'ValidationException';
  }
}

/**
 * String schema
 */
export class StringSchema extends Schema<string> {
  private minLength?: number;
  private maxLength?: number;
  private pattern?: RegExp;
  private emailValidation = false;
  private urlValidation = false;
  private uuidValidation = false;

  validate(data: any): ValidationResult {
    if (typeof data !== 'string') {
      return {
        success: false,
        errors: [{ path: [], message: 'Expected string', code: 'invalid_type' }]
      };
    }

    const errors: ValidationError[] = [];

    if (this.minLength !== undefined && data.length < this.minLength) {
      errors.push({
        path: [],
        message: `String must be at least ${this.minLength} characters`,
        code: 'too_small'
      });
    }

    if (this.maxLength !== undefined && data.length > this.maxLength) {
      errors.push({
        path: [],
        message: `String must be at most ${this.maxLength} characters`,
        code: 'too_big'
      });
    }

    if (this.pattern && !this.pattern.test(data)) {
      errors.push({
        path: [],
        message: 'Invalid format',
        code: 'invalid_string'
      });
    }

    if (this.emailValidation && !this.isEmail(data)) {
      errors.push({
        path: [],
        message: 'Invalid email address',
        code: 'invalid_string'
      });
    }

    if (this.urlValidation && !this.isURL(data)) {
      errors.push({
        path: [],
        message: 'Invalid URL',
        code: 'invalid_string'
      });
    }

    if (this.uuidValidation && !this.isUUID(data)) {
      errors.push({
        path: [],
        message: 'Invalid UUID',
        code: 'invalid_string'
      });
    }

    return errors.length > 0 ? { success: false, errors } : { success: true, data };
  }

  min(length: number): this {
    this.minLength = length;
    return this;
  }

  max(length: number): this {
    this.maxLength = length;
    return this;
  }

  regex(pattern: RegExp): this {
    this.pattern = pattern;
    return this;
  }

  email(): this {
    this.emailValidation = true;
    return this;
  }

  url(): this {
    this.urlValidation = true;
    return this;
  }

  uuid(): this {
    this.uuidValidation = true;
    return this;
  }

  private isEmail(str: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  }

  private isURL(str: string): boolean {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  private isUUID(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  }
}

/**
 * Number schema
 */
export class NumberSchema extends Schema<number> {
  private minValue?: number;
  private maxValue?: number;
  private integerOnly = false;
  private positiveOnly = false;

  validate(data: any): ValidationResult {
    if (typeof data !== 'number' || isNaN(data)) {
      return {
        success: false,
        errors: [{ path: [], message: 'Expected number', code: 'invalid_type' }]
      };
    }

    const errors: ValidationError[] = [];

    if (this.integerOnly && !Number.isInteger(data)) {
      errors.push({
        path: [],
        message: 'Expected integer',
        code: 'invalid_type'
      });
    }

    if (this.positiveOnly && data <= 0) {
      errors.push({
        path: [],
        message: 'Expected positive number',
        code: 'too_small'
      });
    }

    if (this.minValue !== undefined && data < this.minValue) {
      errors.push({
        path: [],
        message: `Number must be at least ${this.minValue}`,
        code: 'too_small'
      });
    }

    if (this.maxValue !== undefined && data > this.maxValue) {
      errors.push({
        path: [],
        message: `Number must be at most ${this.maxValue}`,
        code: 'too_big'
      });
    }

    return errors.length > 0 ? { success: false, errors } : { success: true, data };
  }

  min(value: number): this {
    this.minValue = value;
    return this;
  }

  max(value: number): this {
    this.maxValue = value;
    return this;
  }

  int(): this {
    this.integerOnly = true;
    return this;
  }

  positive(): this {
    this.positiveOnly = true;
    return this;
  }
}

/**
 * Boolean schema
 */
export class BooleanSchema extends Schema<boolean> {
  validate(data: any): ValidationResult {
    if (typeof data !== 'boolean') {
      return {
        success: false,
        errors: [{ path: [], message: 'Expected boolean', code: 'invalid_type' }]
      };
    }

    return { success: true, data };
  }
}

/**
 * Object schema
 */
export class ObjectSchema<T extends Record<string, any>> extends Schema<T> {
  constructor(private shape: { [K in keyof T]: Schema<T[K]> }) {
    super();
  }

  validate(data: any): ValidationResult {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return {
        success: false,
        errors: [{ path: [], message: 'Expected object', code: 'invalid_type' }]
      };
    }

    const result: any = {};
    const errors: ValidationError[] = [];

    for (const key in this.shape) {
      const schema = this.shape[key];
      const value = data[key];

      const fieldResult = schema.validate(value);

      if (!fieldResult.success) {
        errors.push(
          ...(fieldResult.errors || []).map(err => ({
            ...err,
            path: [key, ...err.path]
          }))
        );
      } else {
        result[key] = fieldResult.data;
      }
    }

    return errors.length > 0 ? { success: false, errors } : { success: true, data: result };
  }

  partial(): ObjectSchema<Partial<T>> {
    const newShape: any = {};
    for (const key in this.shape) {
      newShape[key] = this.shape[key].optional();
    }
    return new ObjectSchema(newShape);
  }

  pick<K extends keyof T>(keys: K[]): ObjectSchema<Pick<T, K>> {
    const newShape: any = {};
    for (const key of keys) {
      newShape[key] = this.shape[key];
    }
    return new ObjectSchema(newShape);
  }

  omit<K extends keyof T>(keys: K[]): ObjectSchema<Omit<T, K>> {
    const newShape: any = {};
    for (const key in this.shape) {
      if (!keys.includes(key as K)) {
        newShape[key] = this.shape[key];
      }
    }
    return new ObjectSchema(newShape);
  }
}

/**
 * Array schema
 */
export class ArraySchema<T> extends Schema<T[]> {
  private minItems?: number;
  private maxItems?: number;

  constructor(private itemSchema: Schema<T>) {
    super();
  }

  validate(data: any): ValidationResult {
    if (!Array.isArray(data)) {
      return {
        success: false,
        errors: [{ path: [], message: 'Expected array', code: 'invalid_type' }]
      };
    }

    const errors: ValidationError[] = [];

    if (this.minItems !== undefined && data.length < this.minItems) {
      errors.push({
        path: [],
        message: `Array must contain at least ${this.minItems} items`,
        code: 'too_small'
      });
    }

    if (this.maxItems !== undefined && data.length > this.maxItems) {
      errors.push({
        path: [],
        message: `Array must contain at most ${this.maxItems} items`,
        code: 'too_big'
      });
    }

    const result: T[] = [];

    for (let i = 0; i < data.length; i++) {
      const itemResult = this.itemSchema.validate(data[i]);

      if (!itemResult.success) {
        errors.push(
          ...(itemResult.errors || []).map(err => ({
            ...err,
            path: [i.toString(), ...err.path]
          }))
        );
      } else {
        result.push(itemResult.data);
      }
    }

    return errors.length > 0 ? { success: false, errors } : { success: true, data: result };
  }

  min(count: number): this {
    this.minItems = count;
    return this;
  }

  max(count: number): this {
    this.maxItems = count;
    return this;
  }

  nonempty(): this {
    return this.min(1);
  }
}

/**
 * Optional schema
 */
export class OptionalSchema<T> extends Schema<T | undefined> {
  constructor(private innerSchema: Schema<T>) {
    super();
  }

  validate(data: any): ValidationResult {
    if (data === undefined) {
      return { success: true, data: undefined };
    }

    return this.innerSchema.validate(data);
  }
}

/**
 * Nullable schema
 */
export class NullableSchema<T> extends Schema<T | null> {
  constructor(private innerSchema: Schema<T>) {
    super();
  }

  validate(data: any): ValidationResult {
    if (data === null) {
      return { success: true, data: null };
    }

    return this.innerSchema.validate(data);
  }
}

/**
 * Default schema
 */
export class DefaultSchema<T> extends Schema<T> {
  constructor(private innerSchema: Schema<T>, private defaultValue: T) {
    super();
  }

  validate(data: any): ValidationResult {
    if (data === undefined) {
      return { success: true, data: this.defaultValue };
    }

    return this.innerSchema.validate(data);
  }
}

/**
 * Enum schema
 */
export class EnumSchema<T extends string> extends Schema<T> {
  constructor(private values: T[]) {
    super();
  }

  validate(data: any): ValidationResult {
    if (!this.values.includes(data)) {
      return {
        success: false,
        errors: [{
          path: [],
          message: `Invalid enum value. Expected one of: ${this.values.join(', ')}`,
          code: 'invalid_enum_value'
        }]
      };
    }

    return { success: true, data };
  }
}

/**
 * Factory functions
 */
export const v = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  object: <T extends Record<string, any>>(shape: { [K in keyof T]: Schema<T[K]> }) =>
    new ObjectSchema(shape),
  array: <T>(itemSchema: Schema<T>) => new ArraySchema(itemSchema),
  enum: <T extends string>(values: T[]) => new EnumSchema(values),
  any: () => new Schema() {
    validate(data: any) {
      return { success: true, data };
    }
  }
};

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  email: v.string().email(),
  url: v.string().url(),
  uuid: v.string().uuid(),
  password: v.string().min(8).max(100),
  username: v.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  positiveInt: v.number().int().positive(),
  percentage: v.number().min(0).max(100),

  // Workflow schemas
  workflow: v.object({
    id: v.string().uuid(),
    name: v.string().min(1).max(255),
    description: v.string().max(1000).optional(),
    nodes: v.array(v.any()).min(1),
    edges: v.array(v.any()),
    isActive: v.boolean().default(true),
    tags: v.array(v.string()).optional()
  }),

  // User schemas
  user: v.object({
    email: v.string().email(),
    password: v.string().min(8),
    displayName: v.string().min(1).max(100)
  }),

  // API request
  apiRequest: v.object({
    method: v.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    url: v.string().url(),
    headers: v.object({}).optional(),
    body: v.any().optional()
  })
};
