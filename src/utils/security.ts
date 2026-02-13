/**
 * Security Utilities
 * Comprehensive security functions to prevent XSS, validate inputs, and secure data storage
 */

import { logger } from '../services/SimpleLogger';

// Configuration for security policies
const SECURITY_CONFIG = {
  maxStringLength: 10000,
  maxObjectDepth: 10,
  maxArrayLength: 1000,
  allowedProtocols: ['http:', 'https:', 'mailto:', 'tel:'],
  blockedTags: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'span', 'div'],
  maxUrlLength: 2048,
  sensitiveKeys: ['password', 'token', 'secret', 'key', 'auth', 'session', 'credential'],
};

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') {
    logger.warn('sanitizeHtml received non-string input', { type: typeof input });
    return '';
  }

  if (input.length > SECURITY_CONFIG.maxStringLength) {
    logger.warn('Input length exceeds maximum allowed', { length: input.length });
    return input.substring(0, SECURITY_CONFIG.maxStringLength);
  }

  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove dangerous event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '');
  
  // Remove javascript: protocols
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, '');
  
  // Remove dangerous tags
  SECURITY_CONFIG.blockedTags.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^>]*>.*?</${tag}>`, 'gis');
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*/>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    sanitized = sanitized.replace(selfClosingRegex, '');
  });
  
  // Remove data: URIs (potential for base64 encoded scripts)
  sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, '');
  
  // Remove style attributes that could contain expressions
  sanitized = sanitized.replace(/style\s*=\s*["'][^"']*expression\s*\([^"']*["']/gi, '');
  
  return sanitized.trim();
}

/**
 * Validate and sanitize URLs
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') {
    logger.warn('sanitizeUrl received non-string input', { type: typeof url });
    return null;
  }

  if (url.length > SECURITY_CONFIG.maxUrlLength) {
    logger.warn('URL length exceeds maximum allowed', { length: url.length });
    return null;
  }

  try {
    const urlObj = new URL(url);

    // Check if protocol is allowed
    if (!SECURITY_CONFIG.allowedProtocols.includes(urlObj.protocol)) {
      logger.warn('Blocked URL with disallowed protocol', { protocol: urlObj.protocol });
      return null;
    }
    
    // Block javascript: and data: protocols
    if (urlObj.protocol === 'javascript:' || urlObj.protocol === 'data:') {
      logger.warn('Blocked potentially dangerous URL protocol', { protocol: urlObj.protocol });
      return null;
    }
    
    return urlObj.toString();
  } catch (error) {
    logger.warn('Invalid URL provided to sanitizeUrl', { url, error });
    return null;
  }
}

/**
 * Validate input against various security criteria
 */
export function validateInput(input: unknown, options: {
  type?: 'string' | 'number' | 'email' | 'url' | 'object' | 'array';
  maxLength?: number;
  minLength?: number;
  required?: boolean;
  allowEmpty?: boolean;
  pattern?: RegExp;
  sanitize?: boolean;
}): {
  isValid: boolean;
  sanitizedValue?: unknown;
  errors: string[];
} {
  const { 
    type = 'string', 
    maxLength, 
    minLength, 
    required = false, 
    allowEmpty = true,
    pattern,
    sanitize = true 
  } = options;
  
  const errors: string[] = [];

  // Check if required
  if (required && (input === null || input === undefined || input === '')) {
    errors.push('This field is required');
    return { isValid: false, errors };
  }

  // Allow empty if specified
  if (!required && allowEmpty && (input === null || input === undefined || input === '')) {
    return { isValid: true, sanitizedValue: input, errors: [] };
  }

  // Type validation
  let sanitizedValue: unknown = input;

  switch (type) {
    case 'string':
      if (typeof input !== 'string') {
        errors.push('Must be a string');
        break;
      }

      if (maxLength && input.length > maxLength) {
        errors.push(`Must be ${maxLength} characters or less`);
        if (sanitize) {
          sanitizedValue = input.substring(0, maxLength);
        }
      }
      
      if (minLength && input.length < minLength) {
        errors.push(`Must be at least ${minLength} characters`);
      }
      
      if (pattern && !pattern.test(input)) {
        errors.push('Invalid format');
      }
      
      if (sanitize) {
        sanitizedValue = sanitizeHtml(sanitizedValue as string);
      }
      break;

    case 'number': {
      const num = Number(input);
      if (isNaN(num)) {
        errors.push('Must be a valid number');
        break;
      }
      sanitizedValue = num;
      break;
    }

    case 'email': {
      if (typeof input !== 'string') {
        errors.push('Email must be a string');
        break;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input)) {
        errors.push('Must be a valid email address');
      }
      
      if (sanitize) {
        sanitizedValue = sanitizeHtml(input.toLowerCase().trim());
      }
      break;
    }

    case 'url': {
      if (typeof input !== 'string') {
        errors.push('URL must be a string');
        break;
      }

      const sanitizedUrl = sanitizeUrl(input);
      if (!sanitizedUrl) {
        errors.push('Must be a valid URL');
      } else {
        sanitizedValue = sanitizedUrl;
      }
      break;
    }

    case 'object':
      if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        errors.push('Must be an object');
        break;
      }
      
      if (sanitize) {
        sanitizedValue = sanitizeObject(input);
      }
      break;

    case 'array':
      if (!Array.isArray(input)) {
        errors.push('Must be an array');
        break;
      }
      
      if (maxLength && input.length > maxLength) {
        errors.push(`Array must have ${maxLength} items or less`);
        if (sanitize) {
          sanitizedValue = input.slice(0, maxLength);
        }
      }
      
      if (sanitize) {
        sanitizedValue = sanitizeArray(sanitizedValue as unknown[]);
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    sanitizedValue,
    errors
  };
}

/**
 * Deep sanitize objects
 */
export function sanitizeObject(obj: unknown, depth = 0, visited = new WeakSet()): unknown {
  if (depth > SECURITY_CONFIG.maxObjectDepth) {
    logger.warn('Object depth exceeds maximum allowed', { depth });
    return {};
  }

  if (obj === null || typeof obj !== 'object') {
    return typeof obj === 'string' ? sanitizeHtml(obj) : obj;
  }

  // Detect circular references
  if (visited.has(obj as object)) {
    logger.warn('Circular reference detected during sanitization');
    return '[Circular Reference]';
  }

  // Mark as visited
  visited.add(obj as object);

  try {
    if (Array.isArray(obj)) {
      return sanitizeArray(obj, depth, visited);
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key
      const sanitizedKey = typeof key === 'string' ? sanitizeHtml(key) : key;

      // Skip potentially dangerous keys
      if (SECURITY_CONFIG.sensitiveKeys.some(sensitive =>
        sanitizedKey.toLowerCase().includes(sensitive.toLowerCase())
      )) {
        logger.info('Skipped sensitive key during sanitization', { key: sanitizedKey });
        continue;
      }

      // Recursively sanitize value
      sanitized[sanitizedKey] = sanitizeObject(value, depth + 1, visited);
    }

    return sanitized;
  } finally {
    // Remove from visited set to allow the same object in different branches
    visited.delete(obj as object);
  }
}

/**
 * Sanitize arrays
 */
export function sanitizeArray(arr: unknown[], depth = 0, visited = new WeakSet()): unknown[] {
  if (arr.length > SECURITY_CONFIG.maxArrayLength) {
    logger.warn('Array length exceeds maximum allowed', { length: arr.length });
    arr = arr.slice(0, SECURITY_CONFIG.maxArrayLength);
  }

  return arr.map(item => sanitizeObject(item, depth, visited));
}

/**
 * Secure localStorage operations
 */
export class SecureStorage {
  private static readonly ENCRYPTION_KEY = 'workflow-app-key';
  
  static setItem(key: string, value: unknown): boolean {
    try {
      // Validate key
      const keyValidation = validateInput(key, {
        type: 'string',
        required: true,
        maxLength: 100,
        pattern: /^[a-zA-Z0-9_-]+$/
      });

      if (!keyValidation.isValid) {
        logger.error('Invalid localStorage key', { key, errors: keyValidation.errors });
        return false;
      }

      // Sanitize value - use appropriate sanitizer based on type
      let sanitized: unknown;
      if (typeof value === 'string') {
        sanitized = sanitizeHtml(value);
      } else if (Array.isArray(value)) {
        sanitized = sanitizeArray(value);
      } else if (value !== null && typeof value === 'object') {
        sanitized = sanitizeObject(value);
      } else {
        sanitized = value;
      }

      // Convert to JSON
      const jsonString = JSON.stringify(sanitized);

      // Basic obfuscation (not real encryption, but better than plain text)
      const obfuscated = btoa(encodeURIComponent(jsonString));

      localStorage.setItem(keyValidation.sanitizedValue as string, obfuscated);

      logger.debug('Secure localStorage set', { key: keyValidation.sanitizedValue });
      return true;
    } catch (error) {
      logger.error('Failed to set localStorage item', { key, error });
      return false;
    }
  }

  static getItem(key: string): unknown {
    try {
      const keyValidation = validateInput(key, {
        type: 'string',
        required: true,
        maxLength: 100,
        pattern: /^[a-zA-Z0-9_-]+$/
      });
      
      if (!keyValidation.isValid) {
        logger.error('Invalid localStorage key for retrieval', { key, errors: keyValidation.errors });
        return null;
      }

      const obfuscated = localStorage.getItem(keyValidation.sanitizedValue as string);
      if (!obfuscated) {
        return null;
      }

      // Deobfuscate
      const jsonString = decodeURIComponent(atob(obfuscated));

      // Parse and sanitize
      const parsed = JSON.parse(jsonString);
      const sanitized = typeof parsed === 'string' ? sanitizeHtml(parsed) : parsed;

      logger.debug('Secure localStorage get', { key: keyValidation.sanitizedValue });
      return sanitized;
    } catch (error) {
      logger.error('Failed to get localStorage item', { key, error });
      return null;
    }
  }

  static removeItem(key: string): boolean {
    try {
      const keyValidation = validateInput(key, {
        type: 'string',
        required: true,
        maxLength: 100,
        pattern: /^[a-zA-Z0-9_-]+$/
      });
      
      if (!keyValidation.isValid) {
        logger.error('Invalid localStorage key for removal', { key, errors: keyValidation.errors });
        return false;
      }

      localStorage.removeItem(keyValidation.sanitizedValue as string);
      logger.debug('Secure localStorage remove', { key: keyValidation.sanitizedValue });
      return true;
    } catch (error) {
      logger.error('Failed to remove localStorage item', { key, error });
      return false;
    }
  }

  static clear(): boolean {
    try {
      localStorage.clear();
      logger.info('Secure localStorage cleared');
      return true;
    } catch (error) {
      logger.error('Failed to clear localStorage', error);
      return false;
    }
  }
}

/**
 * Content Security Policy helper
 */
export function generateCSPHeader(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: unsafe-* should be removed in production
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  return directives.join('; ');
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private static attempts: Map<string, { count: number; resetTime: number }> = new Map();
  
  static isAllowed(
    identifier: string,
    maxAttempts: number = 10,
    windowMs: number = 60000
  ): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (record.count >= maxAttempts) {
      logger.warn('Rate limit exceeded', { identifier, attempts: record.count });
      return false;
    }
    
    record.count++;
    return true;
  }
  
  static reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
  
  static cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if (now > record.resetTime) {
        this.attempts.delete(key);
      }
    }
  }
}

// Auto-cleanup rate limiter every 5 minutes
setInterval(() => {
  RateLimiter.cleanup();
}, 5 * 60 * 1000);

/**
 * Input validation middleware for forms
 */
export function createValidationSchema(schema: Record<string, unknown>) {
  return (data: Record<string, unknown>) => {
    const errors: Record<string, string[]> = {};
    const sanitizedData: Record<string, unknown> = {};
    let isValid = true;

    for (const [field, rules] of Object.entries(schema)) {
      const validation = validateInput(data[field], rules as Parameters<typeof validateInput>[1]);

      if (!validation.isValid) {
        errors[field] = validation.errors;
        isValid = false;
      } else {
        sanitizedData[field] = validation.sanitizedValue;
      }
    }

    return {
      isValid,
      errors,
      sanitizedData
    };
  };
}

// Export security configuration for use in other modules
export { SECURITY_CONFIG };