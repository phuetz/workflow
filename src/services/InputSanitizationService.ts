/**
 * Input Sanitization Service
 * Advanced input cleaning and validation to prevent XSS, SQL injection, and other attacks
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './SimpleLogger';

interface SanitizationOptions {
  enableLogging?: boolean;
  strictMode?: boolean;
  allowedTags?: string[];
  allowedAttributes?: string[];
  maxStringLength?: number;
  maxObjectDepth?: number;
  customSanitizers?: Map<string, (value: unknown) => unknown>;
}

export class InputSanitizationService {
  private static instance: InputSanitizationService;
  private options: Required<SanitizationOptions>;
  private dangerousPatterns: RegExp[];
  private sqlInjectionPatterns: RegExp[];
  private xssPatterns: RegExp[];
  private pathTraversalPatterns: RegExp[];

  private constructor(options: SanitizationOptions = {}) {
    this.options = {
      enableLogging: options.enableLogging ?? true,
      strictMode: options.strictMode ?? false,
      allowedTags: options.allowedTags || ['b', 'i', 'em', 'strong', 'span'],
      allowedAttributes: options.allowedAttributes || ['class', 'id'],
      maxStringLength: options.maxStringLength || 10000,
      maxObjectDepth: options.maxObjectDepth || 10,
      customSanitizers: options.customSanitizers || new Map()
    };

    this.initializePatterns();
    logger.info('🧹 Input Sanitization Service initialized');
  }

  public static getInstance(options?: SanitizationOptions): InputSanitizationService {
    if (!InputSanitizationService.instance) {
      InputSanitizationService.instance = new InputSanitizationService(options);
    }
    return InputSanitizationService.instance;
  }

  private initializePatterns(): void {
    // Dangerous patterns that could execute code
    this.dangerousPatterns = [
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /setTimeout\s*\(/gi,
      /setInterval\s*\(/gi,
      /new\s+Function/gi,
      /import\s*\(/gi,
      /require\s*\(/gi,
      /process\s*\./gi,
      /global\s*\./gi,
      /__proto__/gi,
      /constructor\s*\./gi,
      /prototype\s*\./gi
    ];

    // SQL injection patterns
    this.sqlInjectionPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
      /(\b(or|and)\s+\d+\s*=\s*\d+)/gi,
      /('|")(\s*)(union|select|insert|update|delete)/gi,
      /;\s*(drop|delete|update|insert)/gi,
      /\/\*[\s\S]*?\*\//gi, // SQL comments
      /--[\s\S]*$/gm, // SQL line comments
      /(char|varchar|nvarchar)\s*\(\s*\d+\s*\)/gi,
      /0x[0-9a-f]+/gi // Hex values
    ];

    // XSS patterns
    this.xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
      /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
      /<embed[\s\S]*?>/gi,
      /<link[\s\S]*?>/gi,
      /<meta[\s\S]*?>/gi,
      /javascript\s*:/gi,
      /vbscript\s*:/gi,
      /data\s*:\s*text\/html/gi,
      /on\w+\s*=/gi, // Event handlers
      /@import/gi,
      /expression\s*\(/gi,
      /url\s*\(\s*javascript/gi
    ];

    // Path traversal patterns
    this.pathTraversalPatterns = [
      /\.\.[/\\]/g,
      /[/\\]\.\.[/\\]/g,
      /%2e%2e[/\\]/gi,
      /%252e%252e[/\\]/gi,
      /\.{2,}[/\\]/g
    ];
  }

  /**
   * Main sanitization middleware
   */
  public middleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
          req.body = this.sanitizeObject(req.body, 'body');
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
          req.query = this.sanitizeObject(req.query, 'query') as typeof req.query;
        }

        // Sanitize URL parameters
        if (req.params && typeof req.params === 'object') {
          req.params = this.sanitizeObject(req.params, 'params') as typeof req.params;
        }

        // Sanitize headers (selective)
        this.sanitizeHeaders(req);

        next();
      } catch (error) {
        logger.error('❌ Input sanitization error:', error);
        res.status(400).json({
          error: 'Invalid input data',
          code: 'INPUT_SANITIZATION_ERROR'
        });
      }
    };
  }

  /**
   * Sanitize object recursively
   */
  private sanitizeObject(obj: unknown, path: string, depth: number = 0): unknown {
    if (depth > this.options.maxObjectDepth) {
      this.logThreat('Object depth limit exceeded', path, obj);
      return {};
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) =>
        this.sanitizeObject(item, `${path}[${index}]`, depth + 1)
      );
    }

    if (typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key, `${path}.${key}`);
        if (sanitizedKey !== key) {
          this.logThreat('Dangerous key detected', `${path}.${key}`, key);
        }

        sanitized[sanitizedKey] = this.sanitizeObject(value, `${path}.${sanitizedKey}`, depth + 1);
      }

      return sanitized;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj, path);
    }

    return obj;
  }

  /**
   * Sanitize string input
   */
  public sanitizeString(input: string, path?: string): string {
    if (typeof input !== 'string') {
      return input;
    }

    let sanitized = input.trim();
    const originalLength = sanitized.length;

    // Check string length
    if (sanitized.length > this.options.maxStringLength) {
      sanitized = sanitized.substring(0, this.options.maxStringLength);
      this.logThreat('String length limit exceeded', path, `Length: ${originalLength}`);
    }

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Check for dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(sanitized)) {
        this.logThreat('Dangerous pattern detected', path, sanitized);
        if (this.options.strictMode) {
          return '';
        }
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // Check for SQL injection
    for (const pattern of this.sqlInjectionPatterns) {
      if (pattern.test(sanitized)) {
        this.logThreat('SQL injection attempt detected', path, sanitized);
        if (this.options.strictMode) {
          return '';
        }
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // Check for XSS
    for (const pattern of this.xssPatterns) {
      if (pattern.test(sanitized)) {
        this.logThreat('XSS attempt detected', path, sanitized);
        if (this.options.strictMode) {
          return '';
        }
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // Check for path traversal
    for (const pattern of this.pathTraversalPatterns) {
      if (pattern.test(sanitized)) {
        this.logThreat('Path traversal attempt detected', path, sanitized);
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // HTML entity encoding for remaining HTML
    sanitized = this.encodeHTMLEntities(sanitized);

    // Apply custom sanitizers
    for (const [key, sanitizer] of Array.from(this.options.customSanitizers)) {
      if (path?.includes(key)) {
        sanitized = sanitizer(sanitized) as string;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize HTML content
   */
  public sanitizeHTML(html: string): string {
    if (typeof html !== 'string') {
      return html;
    }

    let sanitized = html;

    // Remove dangerous tags completely
    const dangerousTags = [
      'script', 'iframe', 'object', 'embed', 'link', 'meta',
      'style', 'form', 'input', 'button', 'svg', 'math'
    ];

    for (const tag of dangerousTags) {
      const pattern = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis');
      const selfClosingPattern = new RegExp(`<${tag}[^>]*/>`, 'gi');
      sanitized = sanitized.replace(pattern, '');

      // Self-closing tags
      sanitized = sanitized.replace(selfClosingPattern, '');
    }

    // Remove event handlers from all tags
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '');

    // Remove javascript: and vbscript: protocols
    sanitized = sanitized.replace(/href\s*=\s*["']?\s*javascript\s*:/gi, 'href="#"');
    sanitized = sanitized.replace(/href\s*=\s*["']?\s*vbscript\s*:/gi, 'href="#"');
    sanitized = sanitized.replace(/src\s*=\s*["']?\s*javascript\s*:/gi, 'src=""');

    // Only allow specific tags and attributes if in strict mode
    if (this.options.strictMode) {
      sanitized = this.whitelistHTMLTags(sanitized);
    }

    return sanitized;
  }

  /**
   * Whitelist HTML tags and attributes
   */
  private whitelistHTMLTags(html: string): string {
    let sanitized = html;
    // Remove all tags except allowed ones
    const allowedTagsPattern = new RegExp(`<(?!/?(?:${this.options.allowedTags.join('|')})\b)[^>]+>`, 'gi');
    sanitized = sanitized.replace(allowedTagsPattern, '');

    // Remove all attributes except allowed ones
    const attrRegex = new RegExp(`\\s+((?!${this.options.allowedAttributes.join('|')})[a-z-]+)\\s*=\\s*["'][^"']*["']`, 'gi');
    sanitized = sanitized.replace(attrRegex, '');

    return sanitized;
  }

  /**
   * Encode HTML entities
   */
  private encodeHTMLEntities(str: string): string {
    const entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    return str.replace(/[&<>"'`=/]/g, (char) => 
      entityMap[char as keyof typeof entityMap]
    );
  }

  /**
   * Sanitize headers
   */
  private sanitizeHeaders(req: Request): void {
    const dangerousHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-forwarded-proto',
      'x-forwarded-host'
    ];

    for (const header of dangerousHeaders) {
      if (req.headers[header]) {
        const original = req.headers[header] as string;
        const sanitized = this.sanitizeString(original, `headers.${header}`);
        if (sanitized !== original) {
          req.headers[header] = sanitized;
        }
      }
    }
  }

  /**
   * Validate email format
   */
  public sanitizeEmail(email: string): string | null {
    if (typeof email !== 'string') {
      return null;
    }

    // Basic email regex (RFC 5322 simplified)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const sanitized = email.trim().toLowerCase();

    if (!emailRegex.test(sanitized) || sanitized.length > 254) {
      return null;
    }

    return sanitized;
  }

  /**
   * Sanitize URL
   */
  public sanitizeURL(url: string): string | null {
    if (typeof url !== 'string') {
      return null;
    }

    try {
      const sanitized = url.trim();
      const urlObj = new URL(sanitized);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return null;
      }

      // Check for suspicious patterns
      if (this.xssPatterns.some(pattern => pattern.test(sanitized))) {
        return null;
      }

      return urlObj.toString();
    } catch {
      return null;
    }
  }

  /**
   * Sanitize file path
   */
  public sanitizeFilePath(path: string): string {
    if (typeof path !== 'string') {
      return '';
    }

    let sanitized = path.trim();

    // Remove path traversal attempts
    for (const pattern of this.pathTraversalPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Only allow alphanumeric, dots, dashes, underscores, and forward slashes
    sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_/]/g, '');

    // Remove leading slashes to prevent absolute paths
    sanitized = sanitized.replace(/^\/+/, '');

    return sanitized;
  }

  /**
   * Log security threat
   */
  private logThreat(threat: string, path?: string, value?: unknown): void {
    if (this.options.enableLogging) {
      logger.warn(`🚨 Security threat detected: ${threat}`, {
        threat,
        path,
        value: typeof value === 'string' ? value.substring(0, 100) : value,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Add custom sanitizer
   */
  public addCustomSanitizer(key: string, sanitizer: (value: unknown) => unknown): void {
    this.options.customSanitizers.set(key, sanitizer);
    logger.info(`✅ Custom sanitizer added: ${key}`);
  }

  /**
   * Get sanitization statistics
   */
  public getStats(): {
    customSanitizers: number;
    configuration: Partial<SanitizationOptions>;
  } {
    return {
      customSanitizers: this.options.customSanitizers.size,
      configuration: {
        enableLogging: this.options.enableLogging,
        strictMode: this.options.strictMode,
        allowedTags: this.options.allowedTags,
        allowedAttributes: this.options.allowedAttributes,
        maxStringLength: this.options.maxStringLength,
        maxObjectDepth: this.options.maxObjectDepth
      }
    };
  }
}

export const inputSanitizationService = InputSanitizationService.getInstance();