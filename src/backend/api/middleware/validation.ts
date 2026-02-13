/**
 * Input Validation Middleware
 * Provides schema-based validation for API endpoints
 *
 * SECURITY: Validates and sanitizes all user input to prevent:
 * - SQL Injection
 * - XSS attacks
 * - Command injection
 * - Buffer overflow attacks
 * - Invalid data format attacks
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ApiError } from './errorHandler';

// ============================================================================
// ZOD-BASED VALIDATION MIDDLEWARE (New API)
// ============================================================================

/**
 * Generic validation middleware factory for request body
 * Uses Zod schemas for type-safe validation
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      });
    }
    req.body = result.data;
    next();
  };
}

/**
 * Generic validation middleware factory for route params
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: result.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      });
    }
    next();
  };
}

/**
 * Generic validation middleware factory for query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: result.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      });
    }
    next();
  };
}

/**
 * Combined validation middleware - validates body, params, and query in one call
 * Named validateAll to avoid conflict with legacy validateRequest
 */
export function validateAll<B = unknown, P = unknown, Q = unknown>(schemas: {
  body?: ZodSchema<B>;
  params?: ZodSchema<P>;
  query?: ZodSchema<Q>;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Array<{ location: string; path: string; message: string; code: string }> = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.push(...result.error.errors.map(err => ({
          location: 'body',
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        })));
      } else {
        req.body = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.push(...result.error.errors.map(err => ({
          location: 'params',
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        })));
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.push(...result.error.errors.map(err => ({
          location: 'query',
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        })));
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

// ============================================================================
// COMMON ZOD SCHEMAS
// ============================================================================

/** UUID validation schema */
export const idSchema = z.object({
  id: z.string().uuid('Invalid UUID format')
});

/** Pagination query parameters schema */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

/** Common string sanitization - removes dangerous patterns */
const sanitizeInputString = (val: string): string => {
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '')
    .replace(/<iframe/gi, '')
    .replace(/eval\s*\(/gi, '')
    .replace(/expression\s*\(/gi, '')
    .trim();
};

/** Sanitized string schema factory */
const sanitizedString = (maxLength = 255) => z.string()
  .max(maxLength)
  .transform(sanitizeInputString);

/** Sanitized string with min length (for required fields) */
const requiredSanitizedString = (minLength: number, maxLength = 255, message?: string) =>
  z.string()
    .min(minLength, message || `Must be at least ${minLength} characters`)
    .max(maxLength)
    .transform(sanitizeInputString);

/** Workflow creation/update schemas */
export const createWorkflowSchema = z.object({
  name: requiredSanitizedString(1, 255, 'Workflow name is required'),
  description: sanitizedString(2000).optional(),
  tags: z.array(sanitizedString(50)).max(20).optional(),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number()
    }),
    data: z.record(z.unknown()).optional()
  })).optional(),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional()
  })).optional(),
  settings: z.object({
    errorWorkflow: z.string().optional(),
    timezone: z.string().optional(),
    saveDataErrorExecution: z.enum(['all', 'none']).optional(),
    saveDataSuccessExecution: z.enum(['all', 'none']).optional(),
    saveExecutionProgress: z.boolean().optional(),
    timeout: z.number().int().positive().max(3600000).optional()
  }).optional()
});

export const updateWorkflowSchema = createWorkflowSchema.partial();

/** Workflow ID parameter schema */
export const workflowIdSchema = z.object({
  id: z.string().uuid('Invalid workflow ID format')
});

/** Workflow list query schema */
export const workflowListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: sanitizedString(100).optional(),
  status: z.enum(['draft', 'active', 'inactive', 'error', 'archived']).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional()
});

/** Workflow execution input schema */
export const executeWorkflowSchema = z.object({
  input: z.record(z.unknown()).optional()
});

/** Batch operations schema */
export const batchWorkflowIdsSchema = z.object({
  workflowIds: z.array(z.string().uuid()).min(1, 'At least one workflow ID is required').max(100, 'Maximum 100 workflows per batch')
});

export const batchTagSchema = z.object({
  workflowIds: z.array(z.string().uuid()).min(1).max(100),
  tags: z.array(sanitizedString(50)).max(20),
  operation: z.enum(['add', 'remove', 'replace']).default('add')
});

/** Execution queue schema */
export const queueExecutionSchema = z.object({
  workflowId: z.string().uuid('Invalid workflow ID'),
  userId: z.string().optional(),
  inputData: z.record(z.unknown()).optional(),
  triggerNode: z.string().optional(),
  mode: z.enum(['manual', 'trigger', 'webhook']).default('manual'),
  priority: z.boolean().default(false)
});

/** Execution export schema */
export const exportExecutionSchema = z.object({
  format: z.enum(['json', 'csv', 'xlsx']).default('json'),
  workflowId: z.string().uuid().optional(),
  status: z.enum(['success', 'error', 'all']).default('all'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  includeData: z.boolean().default(false),
  includeNodeExecutions: z.boolean().default(false),
  includeLogs: z.boolean().default(false),
  limit: z.coerce.number().int().positive().max(100000).default(10000)
});

/** Execution list query schema */
export const executionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  workflowId: z.string().uuid().optional(),
  status: z.enum(['pending', 'running', 'success', 'failure', 'cancelled']).optional()
});

/** Retry from node schema */
export const retryFromNodeSchema = z.object({
  testData: z.record(z.unknown()).optional(),
  stopAtNodeId: z.string().optional(),
  maxExecutionTime: z.number().int().positive().max(600000).optional()
});

/** Execution ID parameter schema */
export const executionIdSchema = z.object({
  id: z.string().min(1, 'Execution ID is required')
});

/** Export ID parameter schema */
export const exportIdSchema = z.object({
  exportId: z.string().min(1, 'Export ID is required')
});

/** Retry from node params schema */
export const retryFromNodeParamsSchema = z.object({
  executionId: z.string().min(1, 'Execution ID is required'),
  nodeId: z.string().min(1, 'Node ID is required')
});

/** Execution replay schema */
export const replayExecutionSchema = z.object({
  fromNodeId: z.string().optional(),
  modifiedInputData: z.record(z.unknown()).optional()
});

/** Replay execution params schema */
export const replayExecutionParamsSchema = z.object({
  id: z.string().min(1, 'Execution ID is required')
});

// ============================================================================
// CREDENTIAL SCHEMAS (Phase 9 - SEC9.2)
// ============================================================================

/** Credential ID parameter schema */
export const credentialIdSchema = z.object({
  id: z.string().uuid('Invalid credential ID format')
});

/** Credential types enum */
const credentialTypeEnum = z.enum([
  'api_key', 'oauth2', 'basic', 'bearer', 'ssh', 'database', 'custom'
]);

/** Create credential body schema */
export const createCredentialBodySchema = z.object({
  name: z.string()
    .min(1, 'Credential name is required')
    .max(255, 'Credential name too long')
    .transform(val => val.trim()),
  kind: credentialTypeEnum,
  description: z.string().max(1000).optional(),
  data: z.record(z.unknown()).optional().default({}),
  expiresAt: z.string().datetime().optional().nullable(),
});

/** Update credential body schema */
export const updateCredentialBodySchema = z.object({
  name: z.string()
    .min(1, 'Credential name is required')
    .max(255, 'Credential name too long')
    .transform(val => val.trim())
    .optional(),
  description: z.string().max(1000).optional().nullable(),
  data: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

/** Test credential body schema (new credential) */
export const testCredentialBodySchema = z.object({
  kind: credentialTypeEnum.optional(),
  type: credentialTypeEnum.optional(),
  data: z.record(z.unknown()),
  testEndpoint: z.string().url().optional(),
  timeoutMs: z.coerce.number().int().positive().max(10000).optional(),
}).refine(
  (data) => data.kind || data.type,
  { message: 'Either kind or type is required' }
);

/** Test existing credential body schema */
export const testExistingCredentialBodySchema = z.object({
  testEndpoint: z.string().url().optional(),
  timeoutMs: z.coerce.number().int().positive().max(10000).optional(),
});

// ============================================================================
// WEBHOOK SCHEMAS (Phase 9 - SEC9.4)
// ============================================================================

/** Webhook ID parameter schema */
export const webhookIdSchema = z.object({
  id: z.string().uuid('Invalid webhook ID format')
});

/** Create webhook body schema */
export const createWebhookBodySchema = z.object({
  name: z.string().min(1).max(255),
  workflowId: z.string().uuid(),
  path: z.string().min(1).max(500).optional(),
  httpMethod: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  authType: z.enum(['none', 'basic', 'bearer', 'api_key', 'hmac']).default('none'),
  authConfig: z.record(z.unknown()).optional(),
  responseMode: z.enum(['immediate', 'lastNode', 'responseNode']).default('immediate'),
  isActive: z.boolean().default(true),
});

/** Update webhook body schema */
export const updateWebhookBodySchema = createWebhookBodySchema.partial();

/** Webhook path params schema (for /workflow/:workflowId) */
export const webhookWorkflowParamsSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required')
});

/** Webhook detail params schema (for /workflow/:workflowId/:webhookId) */
export const webhookDetailParamsSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  webhookId: z.string().min(1, 'Webhook ID is required')
});

/** Webhook secret body schema */
export const webhookSecretBodySchema = z.object({
  secret: z.string().min(16, 'Secret must be at least 16 characters').max(512)
});

/** Webhook filter operators */
const filterOperatorEnum = z.enum(['equals', 'contains', 'startsWith', 'endsWith', 'regex', 'exists', 'gt', 'lt', 'gte', 'lte']);
const httpMethodEnum = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

/** Webhook filter body schema */
export const webhookFilterBodySchema = z.object({
  enabled: z.boolean(),
  headers: z.array(z.object({
    name: z.string().min(1),
    value: z.string(),
    operator: filterOperatorEnum
  })).optional(),
  queryParams: z.array(z.object({
    name: z.string().min(1),
    value: z.string(),
    operator: filterOperatorEnum
  })).optional(),
  bodyPaths: z.array(z.object({
    path: z.string().min(1),
    value: z.string(),
    operator: filterOperatorEnum
  })).optional(),
  ipWhitelist: z.array(z.string()).optional(),
  methods: z.array(httpMethodEnum).optional(),
  responseOnFilter: z.object({
    statusCode: z.number().int().min(100).max(599),
    body: z.unknown().optional()
  }).optional()
});

/** Webhook filter test body schema */
export const webhookFilterTestBodySchema = z.object({
  headers: z.record(z.string()).optional(),
  query: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  ip: z.string().optional(),
  method: httpMethodEnum.optional()
});

/** Webhook history query schema */
export const webhookHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50)
});

/** Webhook replay params schema */
export const webhookReplayParamsSchema = z.object({
  id: z.string().min(1),
  requestId: z.string().min(1, 'Request ID is required')
});

/** Webhook path ingestion params schema */
export const webhookPathParamsSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  webhookPath: z.string().min(1).max(100)
});

/** Webhook create body schema (for POST /workflow/:workflowId) */
export const webhookRouteCreateBodySchema = z.object({
  name: z.string().max(255).optional(),
  path: z.string().min(1).max(100),
  method: httpMethodEnum.optional().default('POST'),
  secret: z.string().min(16).max(512).optional(),
  description: z.string().max(1000).optional(),
  headers: z.record(z.string()).optional()
});

/** Webhook update body schema (for PUT) */
export const webhookRouteUpdateBodySchema = webhookRouteCreateBodySchema.extend({
  isActive: z.boolean().optional()
}).partial();

/** Simple ID params schema */
export const simpleIdParamsSchema = z.object({
  id: z.string().min(1, 'ID is required')
});

// ============================================================================
// AUTH SCHEMAS (Phase 9 - SEC9.5)
// ============================================================================

/** Login body schema */
export const loginBodySchema = z.object({
  email: z.string().email('Invalid email format').max(254),
  password: z.string().min(1, 'Password is required').max(128),
});

/** Register body schema */
export const registerBodySchema = z.object({
  email: z.string().email('Invalid email format').max(254),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

/** Change password body schema */
export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

/** Reset password request body schema */
export const resetPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email format').max(254),
});

/** Reset password confirm body schema */
export const resetPasswordConfirmSchema = z.object({
  token: z.string().min(1).max(500),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

/** Refresh token body schema */
export const refreshTokenBodySchema = z.object({
  refreshToken: z.string().min(1).max(1000),
});

// ============================================================================
// QUEUE SCHEMAS (Phase 9 - Queue Management)
// ============================================================================

/** Create job body schema (for POST /api/queue/execute) */
export const createJobBodySchema = z.object({
  workflowId: z.string().uuid('Invalid workflow ID format'),
  userId: z.string().min(1, 'User ID is required'),
  inputData: z.record(z.unknown()).default({}),
  triggerNode: z.string().optional(),
  mode: z.enum(['manual', 'trigger', 'webhook']).default('manual'),
  priority: z.boolean().default(false),
});

/** Job ID parameter schema */
export const jobIdParamsSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
});

/** Queue action body schema */
export const queueActionBodySchema = z.object({
  action: z.enum(['pause', 'resume', 'clean']),
  options: z.record(z.unknown()).optional(),
});

/** Queue clean body schema */
export const queueCleanBodySchema = z.object({
  olderThan: z.number().int().positive().optional(),
});

// ============================================================================
// ENVIRONMENT SCHEMAS (Phase 9 - Environment Management)
// ============================================================================

/** Environment variable schema */
const environmentVariableSchema = z.object({
  key: z.string().min(1, 'Variable key is required').max(255),
  value: z.string().max(10000),
  isSecret: z.boolean().default(false),
});

/** Environment type enum - matches EnvironmentType from EnvironmentTypes.ts */
const environmentTypeEnum = z.enum(['development', 'staging', 'production', 'testing']);

/** Create environment body schema */
export const createEnvironmentBodySchema = z.object({
  name: z.string().min(1, 'Environment name is required').max(100),
  type: environmentTypeEnum,
  description: z.string().max(1000).optional(),
  config: z.record(z.unknown()).optional(),
});

/** Update environment body schema */
export const updateEnvironmentBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

/** Environment ID parameter schema */
export const environmentIdParamsSchema = z.object({
  id: z.string().min(1, 'Environment ID is required'),
});

// ============================================================================
// FORMS SCHEMAS (Phase 9 - Form Management)
// ============================================================================

/** Form field type enum */
const formFieldTypeEnum = z.enum([
  'text', 'number', 'email', 'password', 'textarea',
  'select', 'multiselect', 'checkbox', 'radio',
  'date', 'datetime', 'file', 'hidden'
]);

/** Form field schema */
const formFieldSchema = z.object({
  name: z.string().min(1, 'Field name is required').max(100),
  type: formFieldTypeEnum,
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

/** Create form body schema */
export const createFormBodySchema = z.object({
  name: z.string().min(1, 'Form name is required').max(255),
  description: z.string().max(1000).optional(),
  fields: z.array(formFieldSchema).default([]),
  settings: z.record(z.unknown()).default({}),
  isActive: z.boolean().default(true),
  successMessage: z.string().max(500).optional(),
  redirectUrl: z.string().url().max(2000).optional().nullable(),
  workflowId: z.string().uuid().optional().nullable(),
});

/** Form ID parameter schema */
export const formIdParamsSchema = z.object({
  formId: z.string().min(1, 'Form ID is required'),
});

/** Update form body schema */
export const updateFormBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  fields: z.array(formFieldSchema).optional(),
  settings: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
  successMessage: z.string().max(500).optional().nullable(),
  redirectUrl: z.string().url().max(2000).optional().nullable(),
  workflowId: z.string().uuid().optional().nullable(),
});

// ============================================================================
// GIT SCHEMAS (Phase 9 - Git Integration)
// ============================================================================

/** Git branch name regex - alphanumeric with dashes, no leading/trailing dashes */
const gitBranchNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;

/** Git commit body schema */
export const gitCommitBodySchema = z.object({
  message: z.string().min(1, 'Commit message is required').max(500),
  files: z.array(z.string().min(1)).optional(),
});

/** Git branch body schema */
export const gitBranchBodySchema = z.object({
  name: z.string()
    .min(1, 'Branch name is required')
    .max(100)
    .regex(gitBranchNameRegex, 'Branch name must be alphanumeric with dashes (no leading/trailing dashes)'),
});

/** Git merge body schema */
export const gitMergeBodySchema = z.object({
  sourceBranch: z.string().min(1, 'Source branch is required').max(100),
  targetBranch: z.string().min(1, 'Target branch is required').max(100),
});

// ============================================================================
// SUBWORKFLOWS SCHEMAS (Phase 9 - Subworkflow Management)
// ============================================================================

/** Create subworkflow body schema */
export const createSubworkflowBodySchema = z.object({
  name: z.string().min(1, 'Subworkflow name is required').max(255),
  parentWorkflowId: z.string().uuid('Invalid parent workflow ID format'),
  config: z.record(z.unknown()).default({}),
});

/** Subworkflow ID parameter schema */
export const subworkflowIdParamsSchema = z.object({
  id: z.string().uuid('Invalid subworkflow ID format'),
});

// ============================================================================
// MARKETPLACE SCHEMAS (Phase 9 - Marketplace)
// ============================================================================

/** Submit template body schema */
export const submitTemplateBodySchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  category: z.string().min(1, 'Category is required').max(50),
  workflow: z.record(z.unknown()),
  tags: z.array(z.string().max(50)).max(10, 'Maximum 10 tags allowed').optional(),
});

/** Template ID parameter schema */
export const templateIdParamsSchema = z.object({
  id: z.string().uuid('Invalid template ID format'),
});

/** Marketplace search query schema */
export const searchQuerySchema = z.object({
  query: z.string().max(200).optional(),
  category: z.string().max(50).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// ============================================================================
// LEGACY VALIDATION SYSTEM (Preserved for backward compatibility)
// ============================================================================

/**
 * Validation schema types
 */
export type ValidationType = 'string' | 'email' | 'password' | 'uuid' | 'number' | 'boolean' | 'object' | 'array';

export interface ValidationRule {
  type: ValidationType;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  sanitize?: boolean;
  customValidator?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  body?: Record<string, ValidationRule>;
  params?: Record<string, ValidationRule>;
  query?: Record<string, ValidationRule>;
}

// Email regex - RFC 5322 simplified
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// UUID v4 regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Password requirements: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// Dangerous patterns to sanitize
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:/gi,
  /<iframe/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi,
];

/**
 * Sanitize string to remove dangerous content
 */
function sanitizeString(value: string): string {
  let sanitized = value.trim();

  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Escape HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return sanitized;
}

/**
 * Validate a single value against a rule
 */
function validateValue(value: any, rule: ValidationRule, fieldName: string): { valid: boolean; error?: string; sanitized?: any } {
  // Check required
  if (rule.required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: `${fieldName} is required` };
  }

  // If not required and not provided, skip validation
  if (value === undefined || value === null) {
    return { valid: true };
  }

  let sanitizedValue = value;

  switch (rule.type) {
    case 'string':
      if (typeof value !== 'string') {
        return { valid: false, error: `${fieldName} must be a string` };
      }
      if (rule.sanitize !== false) {
        sanitizedValue = sanitizeString(value);
      }
      if (rule.minLength && value.length < rule.minLength) {
        return { valid: false, error: `${fieldName} must be at least ${rule.minLength} characters` };
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return { valid: false, error: `${fieldName} must be at most ${rule.maxLength} characters` };
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        return { valid: false, error: `${fieldName} has invalid format` };
      }
      if (rule.enum && !rule.enum.includes(value)) {
        return { valid: false, error: `${fieldName} must be one of: ${rule.enum.join(', ')}` };
      }
      break;

    case 'email':
      if (typeof value !== 'string') {
        return { valid: false, error: `${fieldName} must be a string` };
      }
      if (!EMAIL_REGEX.test(value)) {
        return { valid: false, error: `${fieldName} must be a valid email address` };
      }
      if (value.length > 254) {
        return { valid: false, error: `${fieldName} is too long` };
      }
      sanitizedValue = value.toLowerCase().trim();
      break;

    case 'password':
      if (typeof value !== 'string') {
        return { valid: false, error: `${fieldName} must be a string` };
      }
      if (value.length < 8) {
        return { valid: false, error: `${fieldName} must be at least 8 characters` };
      }
      if (value.length > 128) {
        return { valid: false, error: `${fieldName} is too long` };
      }
      if (!PASSWORD_REGEX.test(value)) {
        return { valid: false, error: `${fieldName} must contain at least one uppercase letter, one lowercase letter, and one number` };
      }
      // Don't sanitize passwords - they may contain special chars
      sanitizedValue = value;
      break;

    case 'uuid':
      if (typeof value !== 'string') {
        return { valid: false, error: `${fieldName} must be a string` };
      }
      if (!UUID_REGEX.test(value)) {
        return { valid: false, error: `${fieldName} must be a valid UUID` };
      }
      break;

    case 'number': {
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(num)) {
        return { valid: false, error: `${fieldName} must be a valid number` };
      }
      if (rule.min !== undefined && num < rule.min) {
        return { valid: false, error: `${fieldName} must be at least ${rule.min}` };
      }
      if (rule.max !== undefined && num > rule.max) {
        return { valid: false, error: `${fieldName} must be at most ${rule.max}` };
      }
      sanitizedValue = num;
      break;
    }

    case 'boolean':
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        return { valid: false, error: `${fieldName} must be a boolean` };
      }
      sanitizedValue = value === true || value === 'true';
      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { valid: false, error: `${fieldName} must be an object` };
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return { valid: false, error: `${fieldName} must be an array` };
      }
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return { valid: false, error: `${fieldName} must have at least ${rule.minLength} items` };
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return { valid: false, error: `${fieldName} must have at most ${rule.maxLength} items` };
      }
      break;
  }

  // Custom validator
  if (rule.customValidator) {
    const customResult = rule.customValidator(sanitizedValue);
    if (customResult !== true) {
      return { valid: false, error: typeof customResult === 'string' ? customResult : `${fieldName} failed validation` };
    }
  }

  return { valid: true, sanitized: sanitizedValue };
}

/**
 * Validate request against schema
 */
function validateRequest(
  req: Request,
  schema: ValidationSchema
): { valid: boolean; errors: string[]; sanitizedData: Record<string, any> } {
  const errors: string[] = [];
  const sanitizedData: Record<string, any> = { body: {}, params: {}, query: {} };

  // Validate body
  if (schema.body) {
    for (const [field, rule] of Object.entries(schema.body)) {
      const result = validateValue(req.body?.[field], rule, field);
      if (!result.valid && result.error) {
        errors.push(result.error);
      } else if (result.sanitized !== undefined) {
        sanitizedData.body[field] = result.sanitized;
      }
    }
  }

  // Validate params
  if (schema.params) {
    for (const [field, rule] of Object.entries(schema.params)) {
      const result = validateValue(req.params?.[field], rule, field);
      if (!result.valid && result.error) {
        errors.push(result.error);
      } else if (result.sanitized !== undefined) {
        sanitizedData.params[field] = result.sanitized;
      }
    }
  }

  // Validate query
  if (schema.query) {
    for (const [field, rule] of Object.entries(schema.query)) {
      const result = validateValue(req.query?.[field], rule, field);
      if (!result.valid && result.error) {
        errors.push(result.error);
      } else if (result.sanitized !== undefined) {
        sanitizedData.query[field] = result.sanitized;
      }
    }
  }

  return { valid: errors.length === 0, errors, sanitizedData };
}

/**
 * Validation middleware factory
 */
export function validate(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { valid, errors, sanitizedData } = validateRequest(req, schema);

    if (!valid) {
      throw new ApiError(400, errors.join('; '));
    }

    // Replace with sanitized data
    if (Object.keys(sanitizedData.body).length > 0) {
      Object.assign(req.body, sanitizedData.body);
    }
    if (Object.keys(sanitizedData.params).length > 0) {
      Object.assign(req.params, sanitizedData.params);
    }
    if (Object.keys(sanitizedData.query).length > 0) {
      Object.assign(req.query as any, sanitizedData.query);
    }

    next();
  };
}

/**
 * Pre-defined validation schemas for common operations
 */
export const schemas = {
  // Auth schemas
  login: {
    body: {
      email: { type: 'email' as const, required: true },
      password: { type: 'string' as const, required: true, minLength: 1, maxLength: 128, sanitize: false },
    }
  },

  register: {
    body: {
      email: { type: 'email' as const, required: true },
      password: { type: 'password' as const, required: true },
      firstName: { type: 'string' as const, required: false, maxLength: 100 },
      lastName: { type: 'string' as const, required: false, maxLength: 100 },
    }
  },

  changePassword: {
    body: {
      currentPassword: { type: 'string' as const, required: true, minLength: 1, maxLength: 128, sanitize: false },
      newPassword: { type: 'password' as const, required: true },
    }
  },

  resetPassword: {
    body: {
      email: { type: 'email' as const, required: true },
    }
  },

  confirmReset: {
    body: {
      token: { type: 'string' as const, required: true, minLength: 1, maxLength: 500 },
      newPassword: { type: 'password' as const, required: true },
    }
  },

  refreshToken: {
    body: {
      refreshToken: { type: 'string' as const, required: true, minLength: 1, maxLength: 1000 },
    }
  },

  // Workflow schemas
  createWorkflow: {
    body: {
      name: { type: 'string' as const, required: true, minLength: 1, maxLength: 255 },
      description: { type: 'string' as const, required: false, maxLength: 2000 },
    }
  },

  workflowId: {
    params: {
      id: { type: 'uuid' as const, required: true },
    }
  },

  // Credential schemas
  createCredential: {
    body: {
      name: { type: 'string' as const, required: true, minLength: 1, maxLength: 255 },
      kind: { type: 'string' as const, required: true, enum: ['api_key', 'basic', 'bearer'] },
    }
  },

  credentialId: {
    params: {
      id: { type: 'uuid' as const, required: true },
    }
  },
};

export default validate;
