/**
 * Sanitization Service
 *
 * Comprehensive input sanitization to prevent:
 * - XSS (Cross-Site Scripting)
 * - SQL Injection
 * - NoSQL Injection
 * - Command Injection
 * - LDAP Injection
 * - Path Traversal
 * - XML/XXE Injection
 * - Prototype Pollution
 *
 * @module SanitizationService
 */

import * as DOMPurifyModule from 'isomorphic-dompurify';
const DOMPurify = (DOMPurifyModule as any).default || DOMPurifyModule;

/**
 * Sanitization options
 */
export interface SanitizationOptions {
  /** Allow HTML tags */
  allowHTML?: boolean;
  /** Allowed HTML tags (if allowHTML is true) */
  allowedTags?: string[];
  /** Allowed HTML attributes */
  allowedAttributes?: string[];
  /** Strip all HTML */
  stripHTML?: boolean;
  /** Encode HTML entities */
  encodeHTML?: boolean;
  /** Trim whitespace */
  trim?: boolean;
  /** Convert to lowercase */
  lowercase?: boolean;
}

/**
 * Sanitization result
 */
export interface SanitizationResult {
  /** Sanitized value */
  sanitized: string;
  /** Whether the value was modified */
  modified: boolean;
  /** What was removed/changed */
  removedPatterns?: string[];
}

/**
 * Dangerous patterns for detection
 */
const DANGEROUS_PATTERNS = {
  // SQL Injection
  sql: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(--|\#|\/\*|\*\/)/g, // SQL comments
    /('|('')|;|\||`)/g, // SQL special chars
  ],

  // NoSQL Injection (MongoDB)
  nosql: [
    /\$where/gi,
    /\$regex/gi,
    /\$ne/gi,
    /\$gt/gi,
    /\$lt/gi,
    /\$or/gi,
    /\$and/gi,
  ],

  // Command Injection
  command: [
    /[;&|`$(){}[\]<>]/g, // Shell metacharacters
    /(^|\s)(cat|ls|rm|wget|curl|nc|bash|sh|eval|exec)\s/gi,
  ],

  // LDAP Injection
  ldap: [
    /[*()\\]/g,
    /\x00/g, // Null byte
  ],

  // Path Traversal
  pathTraversal: [
    /\.\.[\/\\]/g, // ../ or ..\
    /[\/\\]\.\.[\/\\]/g,
    /^[\/\\]/g, // Leading slash
  ],

  // XML/XXE
  xml: [
    /<!\[CDATA\[/gi,
    /<!ENTITY/gi,
    /<!DOCTYPE/gi,
  ],

  // Prototype Pollution
  prototypePollution: [
    /__proto__/gi,
    /constructor/gi,
    /prototype/gi,
  ],

  // XSS
  xss: [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers (onclick, onerror, etc.)
  ],
};

/**
 * Sanitization Service
 */
export class SanitizationService {
  /**
   * Sanitize HTML content
   */
  public sanitizeHTML(
    html: string,
    options?: SanitizationOptions
  ): SanitizationResult {
    const original = html;

    if (options?.stripHTML) {
      const sanitized = this.stripHTML(html);
      return {
        sanitized,
        modified: sanitized !== original,
        removedPatterns: ['html-tags'],
      };
    }

    if (options?.encodeHTML) {
      const sanitized = this.encodeHTMLEntities(html);
      return {
        sanitized,
        modified: sanitized !== original,
        removedPatterns: ['html-encoded'],
      };
    }

    // Use DOMPurify with configuration
    const config: any = {};

    if (options?.allowedTags) {
      config.ALLOWED_TAGS = options.allowedTags;
    }

    if (options?.allowedAttributes) {
      config.ALLOWED_ATTR = options.allowedAttributes;
    }

    const sanitized = DOMPurify.sanitize(html, config);

    return {
      sanitized,
      modified: sanitized !== original,
      removedPatterns: sanitized !== original ? ['xss'] : [],
    };
  }

  /**
   * Prevent SQL injection
   */
  public sanitizeSQL(input: string): SanitizationResult {
    const original = input;
    let sanitized = input;
    const removedPatterns: string[] = [];

    // Escape single quotes
    sanitized = sanitized.replace(/'/g, "''");

    // Remove SQL comments
    if (DANGEROUS_PATTERNS.sql[1].test(sanitized)) {
      sanitized = sanitized.replace(DANGEROUS_PATTERNS.sql[1], '');
      removedPatterns.push('sql-comments');
    }

    // Detect SQL keywords (but don't remove, just flag)
    if (DANGEROUS_PATTERNS.sql[0].test(input)) {
      removedPatterns.push('sql-keywords');
    }

    return {
      sanitized,
      modified: sanitized !== original,
      removedPatterns,
    };
  }

  /**
   * Prevent NoSQL injection
   */
  public sanitizeNoSQL(input: any): any {
    if (typeof input === 'string') {
      // Check for MongoDB operators
      for (const pattern of DANGEROUS_PATTERNS.nosql) {
        if (pattern.test(input)) {
          // Escape $ signs
          return input.replace(/\$/g, '\\$');
        }
      }
      return input;
    }

    if (typeof input === 'object' && input !== null) {
      // Remove dangerous keys
      const sanitized: any = Array.isArray(input) ? [] : {};

      for (const key in input) {
        // Skip prototype pollution keys
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }

        // Skip MongoDB operators
        if (key.startsWith('$')) {
          continue;
        }

        sanitized[key] = this.sanitizeNoSQL(input[key]);
      }

      return sanitized;
    }

    return input;
  }

  /**
   * Prevent command injection
   */
  public sanitizeCommand(input: string): SanitizationResult {
    const original = input;
    const removedPatterns: string[] = [];

    // Remove shell metacharacters
    const sanitized = input.replace(DANGEROUS_PATTERNS.command[0], '');

    if (sanitized !== original) {
      removedPatterns.push('shell-metacharacters');
    }

    // Check for dangerous commands
    if (DANGEROUS_PATTERNS.command[1].test(input)) {
      removedPatterns.push('dangerous-commands');
    }

    return {
      sanitized,
      modified: sanitized !== original,
      removedPatterns,
    };
  }

  /**
   * Prevent LDAP injection
   */
  public sanitizeLDAP(input: string): SanitizationResult {
    const original = input;
    let sanitized = input;

    // Escape LDAP special characters
    sanitized = sanitized
      .replace(/\*/g, '\\2a')
      .replace(/\(/g, '\\28')
      .replace(/\)/g, '\\29')
      .replace(/\\/g, '\\5c')
      .replace(/\x00/g, '\\00');

    return {
      sanitized,
      modified: sanitized !== original,
      removedPatterns: sanitized !== original ? ['ldap-special-chars'] : [],
    };
  }

  /**
   * Prevent path traversal
   */
  public sanitizePath(input: string): SanitizationResult {
    const original = input;
    const removedPatterns: string[] = [];

    // Remove path traversal sequences
    let sanitized = input.replace(/\.\.[\/\\]/g, '');

    if (sanitized !== original) {
      removedPatterns.push('path-traversal');
    }

    // Remove leading slashes
    sanitized = sanitized.replace(/^[\/\\]+/, '');

    // Normalize path separators
    sanitized = sanitized.replace(/[\/\\]+/g, '/');

    return {
      sanitized,
      modified: sanitized !== original,
      removedPatterns,
    };
  }

  /**
   * Prevent XML/XXE injection
   */
  public sanitizeXML(input: string): SanitizationResult {
    const original = input;
    const removedPatterns: string[] = [];

    // Remove dangerous XML constructs
    const sanitized = input
      .replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, '')
      .replace(/<!ENTITY[\s\S]*?>/gi, '')
      .replace(/<!DOCTYPE[\s\S]*?>/gi, '');

    if (sanitized !== original) {
      removedPatterns.push('xml-entities');
    }

    return {
      sanitized,
      modified: sanitized !== original,
      removedPatterns,
    };
  }

  /**
   * Prevent prototype pollution
   */
  public sanitizeObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};

    for (const key in obj) {
      // Skip dangerous keys
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }

      if (obj.hasOwnProperty(key)) {
        sanitized[key] = this.sanitizeObject(obj[key]);
      }
    }

    return sanitized;
  }

  /**
   * General purpose sanitization
   */
  public sanitize(
    input: string,
    options?: SanitizationOptions
  ): SanitizationResult {
    let sanitized = input;
    const removedPatterns: string[] = [];

    // Trim whitespace
    if (options?.trim !== false) {
      sanitized = sanitized.trim();
    }

    // Convert to lowercase
    if (options?.lowercase) {
      sanitized = sanitized.toLowerCase();
    }

    // HTML sanitization
    if (options?.stripHTML) {
      sanitized = this.stripHTML(sanitized);
      removedPatterns.push('html-stripped');
    } else if (options?.encodeHTML) {
      sanitized = this.encodeHTMLEntities(sanitized);
      removedPatterns.push('html-encoded');
    } else if (options?.allowHTML) {
      const result = this.sanitizeHTML(sanitized, options);
      sanitized = result.sanitized;
      removedPatterns.push(...(result.removedPatterns || []));
    }

    // Check for dangerous patterns
    for (const [type, patterns] of Object.entries(DANGEROUS_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(sanitized)) {
          removedPatterns.push(type);
          break;
        }
      }
    }

    return {
      sanitized,
      modified: sanitized !== input,
      removedPatterns: removedPatterns.length > 0 ? removedPatterns : undefined,
    };
  }

  /**
   * Strip all HTML tags
   */
  private stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Encode HTML entities
   */
  private encodeHTMLEntities(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Decode HTML entities
   */
  public decodeHTMLEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  /**
   * Sanitize for JSON
   */
  public sanitizeJSON(input: string): SanitizationResult {
    const original = input;

    try {
      // Parse and re-stringify to remove potential exploits
      const parsed = JSON.parse(input);
      const sanitized = JSON.stringify(this.sanitizeObject(parsed));

      return {
        sanitized,
        modified: sanitized !== original,
      };
    } catch {
      // Invalid JSON, return escaped version
      return {
        sanitized: this.encodeHTMLEntities(input),
        modified: true,
        removedPatterns: ['invalid-json'],
      };
    }
  }

  /**
   * Sanitize email address
   */
  public sanitizeEmail(email: string): SanitizationResult {
    const original = email;
    let sanitized = email.toLowerCase().trim();

    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>()[\]\\,;:\s]/g, '');

    return {
      sanitized,
      modified: sanitized !== original,
    };
  }

  /**
   * Sanitize URL
   */
  public sanitizeURL(url: string): SanitizationResult {
    const original = url;
    let sanitized = url.trim();
    const removedPatterns: string[] = [];

    // Check for javascript: protocol
    if (/^javascript:/i.test(sanitized)) {
      sanitized = sanitized.replace(/^javascript:/i, '');
      removedPatterns.push('javascript-protocol');
    }

    // Check for data: protocol with script
    if (/^data:.*script/i.test(sanitized)) {
      sanitized = '';
      removedPatterns.push('data-script-protocol');
    }

    // Encode special characters
    try {
      const urlObj = new URL(sanitized);
      sanitized = urlObj.toString();
    } catch {
      // Invalid URL, encode manually
      sanitized = encodeURI(sanitized);
    }

    return {
      sanitized,
      modified: sanitized !== original,
      removedPatterns: removedPatterns.length > 0 ? removedPatterns : undefined,
    };
  }

  /**
   * Detect if input contains dangerous patterns
   */
  public detectDangerousPatterns(input: string): string[] {
    const detected: string[] = [];

    for (const [type, patterns] of Object.entries(DANGEROUS_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(input)) {
          detected.push(type);
          break;
        }
      }
    }

    return detected;
  }

  /**
   * Express middleware for sanitization
   */
  public middleware(options?: SanitizationOptions) {
    return (req: any, res: any, next: any) => {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = this.sanitizeObject(req.body);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = this.sanitizeObject(req.query);
      }

      // Sanitize URL parameters
      if (req.params && typeof req.params === 'object') {
        req.params = this.sanitizeObject(req.params);
      }

      next();
    };
  }
}

/**
 * Singleton instance
 */
let sanitizationServiceInstance: SanitizationService | null = null;

/**
 * Get singleton instance
 */
export function getSanitizationService(): SanitizationService {
  if (!sanitizationServiceInstance) {
    sanitizationServiceInstance = new SanitizationService();
  }
  return sanitizationServiceInstance;
}

/**
 * Helper functions for quick sanitization
 */
export const sanitize = {
  html: (input: string, options?: SanitizationOptions) =>
    getSanitizationService().sanitizeHTML(input, options).sanitized,

  sql: (input: string) =>
    getSanitizationService().sanitizeSQL(input).sanitized,

  nosql: (input: any) =>
    getSanitizationService().sanitizeNoSQL(input),

  command: (input: string) =>
    getSanitizationService().sanitizeCommand(input).sanitized,

  ldap: (input: string) =>
    getSanitizationService().sanitizeLDAP(input).sanitized,

  path: (input: string) =>
    getSanitizationService().sanitizePath(input).sanitized,

  xml: (input: string) =>
    getSanitizationService().sanitizeXML(input).sanitized,

  object: (obj: any) =>
    getSanitizationService().sanitizeObject(obj),

  email: (email: string) =>
    getSanitizationService().sanitizeEmail(email).sanitized,

  url: (url: string) =>
    getSanitizationService().sanitizeURL(url).sanitized,

  json: (json: string) =>
    getSanitizationService().sanitizeJSON(json).sanitized,
};
