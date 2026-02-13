/**
 * Validation Service
 * Advanced input validation with Joi and Zod schemas
 */

import Joi from 'joi';
import { z } from 'zod';
import { logger } from './SimpleLogger';

// Zod schemas for runtime validation
export const UserSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number and special character'),
  role: z.enum(['ADMIN', 'USER', 'VIEWER']).optional()
});

export const WorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  nodes: z.array(z.any()).min(1, 'At least one node required'),
  edges: z.array(z.any()),
  variables: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).optional()
});

export const ExecutionSchema = z.object({
  workflowId: z.string().cuid('Invalid workflow ID'),
  input: z.record(z.any()).optional(),
  variables: z.record(z.any()).optional(),
  priority: z.number().min(0).max(10).optional()
});

export const CredentialSchema = z.object({
  name: z.string().min(1, 'Credential name is required').max(100, 'Name too long'),
  type: z.enum(['API_KEY', 'OAUTH2', 'BASIC_AUTH', 'JWT', 'SSH_KEY', 'DATABASE', 'CUSTOM']),
  data: z.record(z.any()),
  description: z.string().max(500, 'Description too long').optional()
});

// Joi schemas for complex validation
const JoiSchemas = {
  user: Joi.object({
    email: Joi.string().email().required(),
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character'
      }),
    role: Joi.string().valid('ADMIN', 'USER', 'VIEWER').optional()
  }),

  workflow: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional().allow(''),
    nodes: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      type: Joi.string().required(),
      position: Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required()
      }).required(),
      data: Joi.object().required()
    })).min(1).required(),
    edges: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      source: Joi.string().required(),
      target: Joi.string().required(),
      sourceHandle: Joi.string().optional(),
      targetHandle: Joi.string().optional()
    })).required(),
    variables: Joi.object().optional(),
    settings: Joi.object().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    category: Joi.string().optional(),
    visibility: Joi.string().valid('PRIVATE', 'TEAM', 'PUBLIC').optional()
  }),

  execution: Joi.object({
    workflowId: Joi.string().pattern(/^[a-z0-9]+$/).required(),
    input: Joi.object().optional(),
    variables: Joi.object().optional(),
    priority: Joi.number().min(0).max(10).optional()
  }),

  credential: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    type: Joi.string().valid('API_KEY', 'OAUTH2', 'BASIC_AUTH', 'JWT', 'SSH_KEY', 'DATABASE', 'CUSTOM').required(),
    data: Joi.object().required(),
    description: Joi.string().max(500).optional().allow('')
  }),

  webhook: Joi.object({
    workflowId: Joi.string().pattern(/^[a-z0-9]+$/).required(),
    method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH').optional(),
    headers: Joi.object().optional(),
    secret: Joi.string().optional()
  }),

  apiKey: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    permissions: Joi.array().items(Joi.string()).required(),
    rateLimit: Joi.number().min(1).max(10000).optional(),
    expiresAt: Joi.date().greater('now').optional()
  }),

  team: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional().allow(''),
    settings: Joi.object().optional()
  }),

  notification: Joi.object({
    type: Joi.string().valid(
      'WORKFLOW_STARTED', 'WORKFLOW_COMPLETED', 'WORKFLOW_FAILED',
      'SYSTEM_ALERT', 'MENTION', 'SHARE_RECEIVED', 'REMINDER'
    ).required(),
    title: Joi.string().min(1).max(200).required(),
    message: Joi.string().min(1).max(1000).required(),
    priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT').optional(),
    expiresAt: Joi.date().greater('now').optional()
  })
};

export class ValidationService {
  /**
   * Validate data using Zod schema
   */
  static validateWithZod<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        logger.warn('Zod validation failed:', { errors: errorMessages, data });
        throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Validate data using Joi schema
   */
  static validateWithJoi(schemaName: keyof typeof JoiSchemas, data: unknown): unknown {
    const schema = JoiSchemas[schemaName];
    if (!schema) {
      throw new Error(`Schema '${schemaName}' not found`);
    }

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessages = error.details.map(d => d.message);
      logger.warn('Joi validation failed:', { errors: errorMessages, data });
      throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
    }

    return value;
  }

  /**
   * Sanitize HTML input to prevent XSS
   */
  static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate and sanitize workflow expression
   */
  static validateWorkflowExpression(expression: string): boolean {
    if (typeof expression !== 'string') return false;

    // Forbidden patterns that could be dangerous
    const forbiddenPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /import\s*\(/,
      /require\s*\(/,
      /process\./,
      /global\./,
      /window\./,
      /document\./,
      /__proto__/,
      /constructor/,
      /prototype/,
      /\.\s*\.\s*\./,  // path traversal
      /<!--/,           // HTML comments
      /<script/i,       // script tags
      /javascript:/i,   // javascript protocol
      /data:/i,         // data protocol
      /vbscript:/i      // vbscript protocol
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(expression)) {
        logger.warn('Dangerous expression detected:', { expression, pattern: pattern.source });
        return false;
      }
    }

    // Check for balanced parentheses and brackets
    const stack: string[] = [];
    const brackets = { '(': ')', '[': ']', '{': '}' };

    for (const char of expression) {
      if (char in brackets) {
        stack.push(brackets[char as keyof typeof brackets]);
      } else if (Object.values(brackets).includes(char)) {
        if (stack.pop() !== char) {
          return false;
        }
      }
    }

    return stack.length === 0;
  }

  /**
   * Validate email format with advanced rules
   */
  static validateEmail(email: string): boolean {
    if (typeof email !== 'string') return false;

    // RFC 5322 compliant regex (simplified)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(email)) return false;

    // Additional checks
    if (email.length > 254) return false; // RFC limit

    const [localPart] = email.split('@');
    // Only localPart is needed for validation
    if (localPart.length > 64) return false; // RFC limit

    // Check for common suspicious patterns
    const suspiciousPatterns = [
      /\.{2,}/,        // consecutive dots
      /^\.|\.$|@\./,   // dots at wrong positions
      /@.*@/,          // multiple @ symbols
      /\s/             // whitespace
    ];

    return !suspiciousPatterns.some(pattern => pattern.test(email));
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    if (typeof password !== 'string') {
      return { isValid: false, score: 0, feedback: ['Password must be a string'] };
    }

    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long');
    } else if (password.length >= 12) {
      score += 2;
    } else {
      score += 1;
    }

    // Character variety checks
    if (!/[a-z]/.test(password)) {
      feedback.push('Password must contain lowercase letters');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      feedback.push('Password must contain uppercase letters');
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      feedback.push('Password must contain numbers');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      feedback.push('Password must contain special characters');
    } else {
      score += 1;
    }

    // Common password patterns
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /letmein/i,
      /welcome/i
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      feedback.push('Password contains common patterns');
      score -= 2;
    }

    // Repetitive characters
    if (/(.)\1{2,}/.test(password)) {
      feedback.push('Password contains too many repeated characters');
      score -= 1;
    }

    const isValid = feedback.length === 0 && score >= 3;
    return {
      isValid,
      score: Math.max(0, Math.min(5, score)),
      feedback
    };
  }

  /**
   * Validate cron expression
   */
  static validateCronExpression(cronExpression: string): boolean {
    if (typeof cronExpression !== 'string') return false;

    // Basic cron format: * * * * * (5 fields) or * * * * * * (6 fields with seconds)
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 5 && parts.length !== 6) return false;

    const cronRegex = /^(\*|[0-9,-/]+)$/;
    return parts.every(part => cronRegex.test(part) || part === '*' || part === '?');
  }

  /**
   * Validate JSON structure
   */
  static validateJson(jsonString: string): { isValid: boolean; data?: unknown; error?: string } {
    if (typeof jsonString !== 'string') {
      return { isValid: false, error: 'Input must be a string' };
    }

    try {
      const data = JSON.parse(jsonString);
      return { isValid: true, data };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON'
      };
    }
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string, options?: {
    allowedProtocols?: string[];
    allowLocalhost?: boolean;
  }): boolean {
    if (typeof url !== 'string') return false;

    try {
      const urlObj = new URL(url);
      const allowedProtocols = options?.allowedProtocols || ['http:', 'https:'];

      if (!allowedProtocols.includes(urlObj.protocol)) {
        return false;
      }

      if (!options?.allowLocalhost &&
          (urlObj.hostname === 'localhost' ||
           urlObj.hostname === '127.0.0.1' ||
           urlObj.hostname === '0.0.0.0' ||
           urlObj.hostname === '::1' ||
           urlObj.hostname.match(/^10\./) ||
           urlObj.hostname.match(/^192\.168\./) ||
           urlObj.hostname.match(/^172\.1[6-9]\./) ||
           urlObj.hostname.match(/^172\.2[0-9]\./) ||
           urlObj.hostname.match(/^172\.3[01]\./) ||
           urlObj.hostname.includes('metadata') ||
           urlObj.hostname.endsWith('.local'))) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(file: {
    name: string;
    size: number;
    type: string;
  }, options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const { maxSize = 10 * 1024 * 1024, allowedTypes, allowedExtensions } = options;

    // Size check
    if (file.size > maxSize) {
      errors.push(`File size exceeds limit of ${maxSize} bytes`);
    }

    // MIME type check
    if (allowedTypes && !allowedTypes.includes(file.type)) {
      errors.push(`File type '${file.type}' not allowed`);
    }

    // Extension check
    if (allowedExtensions) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        errors.push(`File extension not allowed`);
      }
    }

    // Filename validation
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      errors.push('File name contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default ValidationService;