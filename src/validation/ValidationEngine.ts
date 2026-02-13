/**
 * Comprehensive Input Validation Engine
 *
 * Provides enterprise-grade input validation using Zod schemas with:
 * - Schema-based validation
 * - Type validation (string, number, boolean, object, array)
 * - Format validation (email, URL, UUID, date, etc.)
 * - Range validation (min/max for numbers and strings)
 * - Pattern validation (regex)
 * - Custom validators
 * - Nested object validation
 * - Array validation
 * - Error aggregation
 * - Sanitization integration
 *
 * @module ValidationEngine
 */

import { z, ZodSchema, ZodError } from 'zod';

/**
 * Validation result
 */
export interface ValidationResult<T = any> {
  /** Whether validation passed */
  valid: boolean;
  /** Validated and typed data (if valid) */
  data?: T;
  /** Validation errors (if invalid) */
  errors?: ValidationError[];
  /** Error count */
  errorCount?: number;
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Field path (e.g., "user.email") */
  path: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Expected value/type */
  expected?: string;
  /** Received value/type */
  received?: string;
}

/**
 * Custom validator function
 */
export type CustomValidator<T = any> = (value: T) => boolean | Promise<boolean>;

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Strip unknown fields */
  stripUnknown?: boolean;
  /** Allow partial validation (optional fields) */
  partial?: boolean;
  /** Custom error messages */
  errorMessages?: Record<string, string>;
  /** Abort early on first error */
  abortEarly?: boolean;
}

/**
 * Common validation schemas
 */
export class CommonSchemas {
  /** Email validation */
  static email = z.string().email('Invalid email format');

  /** URL validation */
  static url = z.string().url('Invalid URL format');

  /** UUID validation */
  static uuid = z.string().uuid('Invalid UUID format');

  /** ISO 8601 date validation */
  static isoDate = z.string().datetime('Invalid ISO 8601 date format');

  /** Positive integer */
  static positiveInt = z.number().int().positive('Must be a positive integer');

  /** Non-negative integer */
  static nonNegativeInt = z.number().int().nonnegative('Must be a non-negative integer');

  /** Port number (1-65535) */
  static port = z.number().int().min(1).max(65535, 'Invalid port number');

  /** IP address (v4) */
  static ipv4 = z.string().ip({ version: 'v4', message: 'Invalid IPv4 address' });

  /** IP address (v4 or v6) */
  static ip = z.string().ip('Invalid IP address');

  /** Slug (URL-friendly string) */
  static slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');

  /** Hexadecimal color */
  static hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color');

  /** Alphanumeric only */
  static alphanumeric = z.string().regex(/^[a-zA-Z0-9]+$/, 'Must be alphanumeric');

  /** JSON string */
  static jsonString = z.string().refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid JSON string');

  /** Base64 string */
  static base64 = z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/, 'Invalid base64 string');

  /** Password (min 8 chars, uppercase, lowercase, number, special) */
  static strongPassword = z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character');

  /** Phone number (international format) */
  static phoneNumber = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number');

  /** Credit card number (basic format check) */
  static creditCard = z.string().regex(/^\d{13,19}$/, 'Invalid credit card number');

  /** Semantic version (e.g., 1.2.3) */
  static semver = z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid semantic version');
}

/**
 * Workflow-specific schemas
 */
export class WorkflowSchemas {
  /** Workflow ID */
  static workflowId = z.string().uuid('Invalid workflow ID');

  /** Node ID */
  static nodeId = z.string().min(1, 'Node ID is required');

  /** Edge ID */
  static edgeId = z.string().min(1, 'Edge ID is required');

  /** Workflow name */
  static workflowName = z.string()
    .min(1, 'Workflow name is required')
    .max(100, 'Workflow name too long')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Invalid workflow name');

  /** Node type */
  static nodeType = z.string().min(1, 'Node type is required');

  /** Cron expression */
  static cronExpression = z.string().regex(
    /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/,
    'Invalid cron expression'
  );

  /** HTTP method */
  static httpMethod = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

  /** HTTP status code */
  static httpStatus = z.number().int().min(100).max(599, 'Invalid HTTP status code');

  /** Workflow status */
  static workflowStatus = z.enum(['active', 'inactive', 'draft', 'error']);

  /** Execution status */
  static executionStatus = z.enum(['running', 'success', 'failed', 'cancelled', 'waiting']);
}

/**
 * Validation Engine
 */
export class ValidationEngine {
  private schemas: Map<string, ZodSchema> = new Map();

  /**
   * Register a validation schema
   */
  public registerSchema(name: string, schema: ZodSchema): void {
    this.schemas.set(name, schema);
  }

  /**
   * Get a registered schema
   */
  public getSchema(name: string): ZodSchema | undefined {
    return this.schemas.get(name);
  }

  /**
   * Validate data against a schema
   */
  public validate<T = any>(
    data: unknown,
    schema: ZodSchema<T>,
    options?: ValidationOptions
  ): ValidationResult<T> {
    try {
      // Apply options
      let finalSchema: ZodSchema<any> = schema;

      if (options?.stripUnknown && schema instanceof z.ZodObject) {
        finalSchema = schema.strip() as unknown as ZodSchema<any>;
      }

      if (options?.partial && schema instanceof z.ZodObject) {
        finalSchema = schema.partial() as unknown as ZodSchema<any>;
      }

      // Validate
      const result = finalSchema.parse(data);

      return {
        valid: true,
        data: result,
        errorCount: 0,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = this.formatZodErrors(error, options?.errorMessages);

        return {
          valid: false,
          errors,
          errorCount: errors.length,
        };
      }

      // Unexpected error
      return {
        valid: false,
        errors: [{
          path: '',
          message: error instanceof Error ? error.message : 'Validation failed',
          code: 'unknown_error',
        }],
        errorCount: 1,
      };
    }
  }

  /**
   * Validate data against a registered schema
   */
  public validateWithSchema<T = any>(
    data: unknown,
    schemaName: string,
    options?: ValidationOptions
  ): ValidationResult<T> {
    const schema = this.schemas.get(schemaName);

    if (!schema) {
      return {
        valid: false,
        errors: [{
          path: '',
          message: `Schema '${schemaName}' not found`,
          code: 'schema_not_found',
        }],
        errorCount: 1,
      };
    }

    return this.validate(data, schema, options);
  }

  /**
   * Validate multiple data items
   */
  public validateMany<T = any>(
    items: unknown[],
    schema: ZodSchema<T>,
    options?: ValidationOptions
  ): Array<ValidationResult<T>> {
    return items.map(item => this.validate(item, schema, options));
  }

  /**
   * Check if data is valid (boolean only)
   */
  public isValid(
    data: unknown,
    schema: ZodSchema,
    options?: ValidationOptions
  ): boolean {
    return this.validate(data, schema, options).valid;
  }

  /**
   * Safe parse (returns data or null)
   */
  public safeParse<T = any>(
    data: unknown,
    schema: ZodSchema<T>,
    options?: ValidationOptions
  ): T | null {
    const result = this.validate(data, schema, options);
    return result.valid ? result.data! : null;
  }

  /**
   * Format Zod errors to ValidationError[]
   */
  private formatZodErrors(
    zodError: ZodError,
    customMessages?: Record<string, string>
  ): ValidationError[] {
    return zodError.errors.map(err => {
      const path = err.path.join('.');
      const customMessage = customMessages?.[path];

      return {
        path,
        message: customMessage || err.message,
        code: err.code,
        expected: 'expected' in err ? String(err.expected) : undefined,
        received: 'received' in err ? String(err.received) : undefined,
      };
    });
  }

  /**
   * Create a custom validator
   */
  public static custom<T>(
    validator: CustomValidator<T>,
    message: string = 'Validation failed'
  ): z.ZodEffects<z.ZodType<T>> {
    return z.any().refine(validator, message) as z.ZodEffects<z.ZodType<T>>;
  }

  /**
   * Create an async custom validator
   */
  public static customAsync<T>(
    validator: CustomValidator<T>,
    message: string = 'Validation failed'
  ): z.ZodEffects<z.ZodType<T>> {
    return z.any().refine(validator, message) as z.ZodEffects<z.ZodType<T>>;
  }
}

/**
 * Predefined validation schemas
 */
export const PredefinedSchemas = {
  /**
   * Create workflow schema
   */
  createWorkflow: z.object({
    name: WorkflowSchemas.workflowName,
    description: z.string().max(500, 'Description too long').optional(),
    tags: z.array(z.string()).max(10, 'Too many tags').optional(),
    active: z.boolean().default(false),
    nodes: z.array(z.object({
      id: WorkflowSchemas.nodeId,
      type: WorkflowSchemas.nodeType,
      position: z.object({
        x: z.number(),
        y: z.number(),
      }),
      data: z.record(z.any()),
    })).min(1, 'At least one node required'),
    edges: z.array(z.object({
      id: WorkflowSchemas.edgeId,
      source: WorkflowSchemas.nodeId,
      target: WorkflowSchemas.nodeId,
      sourceHandle: z.string().optional(),
      targetHandle: z.string().optional(),
    })),
  }),

  /**
   * Update workflow schema
   */
  updateWorkflow: z.object({
    name: WorkflowSchemas.workflowName.optional(),
    description: z.string().max(500, 'Description too long').optional(),
    tags: z.array(z.string()).max(10, 'Too many tags').optional(),
    active: z.boolean().optional(),
    nodes: z.array(z.any()).optional(),
    edges: z.array(z.any()).optional(),
  }),

  /**
   * Execute workflow schema
   */
  executeWorkflow: z.object({
    workflowId: WorkflowSchemas.workflowId,
    data: z.record(z.any()).optional(),
    mode: z.enum(['production', 'test', 'manual']).default('production'),
    startNode: WorkflowSchemas.nodeId.optional(),
  }),

  /**
   * User registration schema
   */
  userRegistration: z.object({
    email: CommonSchemas.email,
    password: CommonSchemas.strongPassword,
    firstName: z.string().min(1, 'First name required').max(50, 'First name too long'),
    lastName: z.string().min(1, 'Last name required').max(50, 'Last name too long'),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms and conditions' }),
    }),
  }),

  /**
   * User login schema
   */
  userLogin: z.object({
    email: CommonSchemas.email,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
  }),

  /**
   * HTTP request node config schema
   */
  httpRequestConfig: z.object({
    url: CommonSchemas.url,
    method: WorkflowSchemas.httpMethod,
    headers: z.record(z.string()).optional(),
    body: z.union([z.string(), z.record(z.any())]).optional(),
    timeout: CommonSchemas.positiveInt.max(300000, 'Timeout too large').optional(),
    authentication: z.object({
      type: z.enum(['none', 'basic', 'bearer', 'oauth2', 'api-key']),
      credentials: z.record(z.string()).optional(),
    }).optional(),
  }),

  /**
   * Email node config schema
   */
  emailConfig: z.object({
    to: z.union([
      CommonSchemas.email,
      z.array(CommonSchemas.email).min(1, 'At least one recipient required'),
    ]),
    cc: z.union([CommonSchemas.email, z.array(CommonSchemas.email)]).optional(),
    bcc: z.union([CommonSchemas.email, z.array(CommonSchemas.email)]).optional(),
    subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
    body: z.string().min(1, 'Body is required'),
    html: z.boolean().default(false),
    attachments: z.array(z.object({
      filename: z.string(),
      content: z.string(),
      contentType: z.string().optional(),
    })).optional(),
  }),

  /**
   * Webhook config schema
   */
  webhookConfig: z.object({
    method: WorkflowSchemas.httpMethod,
    path: z.string().regex(/^\/[a-zA-Z0-9\-_\/]*$/, 'Invalid webhook path'),
    authentication: z.object({
      type: z.enum(['none', 'basic', 'header', 'hmac']),
      config: z.record(z.any()).optional(),
    }).optional(),
    responseCode: WorkflowSchemas.httpStatus.default(200),
    responseBody: z.string().optional(),
  }),

  /**
   * Schedule config schema
   */
  scheduleConfig: z.object({
    type: z.enum(['cron', 'interval']),
    cron: WorkflowSchemas.cronExpression.optional(),
    interval: CommonSchemas.positiveInt.optional(),
    timezone: z.string().optional(),
    enabled: z.boolean().default(true),
  }).refine(
    (data) => {
      if (data.type === 'cron') return !!data.cron;
      if (data.type === 'interval') return !!data.interval;
      return false;
    },
    'Either cron or interval must be specified'
  ),
};

/**
 * Singleton instance
 */
let validationEngineInstance: ValidationEngine | null = null;

/**
 * Get singleton instance
 */
export function getValidationEngine(): ValidationEngine {
  if (!validationEngineInstance) {
    validationEngineInstance = new ValidationEngine();

    // Register predefined schemas
    Object.entries(PredefinedSchemas).forEach(([name, schema]) => {
      validationEngineInstance!.registerSchema(name, schema);
    });
  }

  return validationEngineInstance;
}

/**
 * Express middleware factory for validation
 */
export function validateRequest(
  schema: ZodSchema,
  source: 'body' | 'query' | 'params' = 'body',
  options?: ValidationOptions
) {
  return (req: any, res: any, next: any) => {
    const engine = getValidationEngine();
    const data = req[source];

    const result = engine.validate(data, schema, options);

    if (!result.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'The request contains invalid data',
        errors: result.errors,
        errorCount: result.errorCount,
      });
    }

    // Attach validated data
    req.validated = result.data;

    next();
  };
}
