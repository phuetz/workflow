/**
 * Enhanced Security Validator
 * Advanced input validation and attack prevention
 */

import { logger } from '../services/SimpleLogger';

export interface SecurityValidationResult {
  isValid: boolean;
  sanitizedValue?: unknown;
  errors: string[];
  threats: string[];
}

export class SecurityValidator {
  // Dangerous patterns that should be blocked
  private static readonly INJECTION_PATTERNS = [
    // SQL Injection patterns
    /('|(\\|;)*\s*(--|#|\/\*|xp_|sp_|exec|execute|select|insert|update|delete|union|drop|create|alter|truncate))/i,
    /(union\s+select|information_schema|sysobjects|syscolumns)/i,
    
    // Command Injection patterns
    /(;|\|{1,2}|&{1,2}|`|<|>|\$\(|\$\{|exec|eval|system|sh|bash|cmd|powershell|net\s+user)/i,
    /(\|\s*(rm|cat|ls|pwd|whoami|id|ps|netstat|wget|curl|nc|ncat))/i,
    
    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:|vbscript:|data:|on\w+\s*=/i,
    /<iframe|<object|<embed|<link|<meta|<base/i,
    
    // Path Traversal patterns
    /(\.\.[/\\]|\.\.%2f|\.\.%5c|%2e%2e[/\\])/i,
    /(\/etc\/passwd|\/windows\/system32|c:\\windows\\system32)/i,
    // LDAP Injection patterns
    /(\*|\(\||\)|&|!|=|~|>|<)/,
    
    // NoSQL Injection patterns
    /(\$where|\$regex|\$ne|\$gt|\$lt|\$in|\$nin|\$exists)/i,
    
    // Template Injection patterns
    /(\{\{|\}\}|\[\[|\]\]|<%|%>|\$\{)/,
    
    // XXE patterns
    /<!entity|<!doctype.*\[|<!doctype.*dtd/i,
  ];

  // Dangerous keywords
  private static readonly DANGEROUS_KEYWORDS = [
    'drop', 'truncate', 'delete', 'update', 'insert', 'exec', 'execute',
    'union', 'select', 'alter', 'create', 'shutdown', 'xp_cmdshell',
    'script', 'javascript', 'vbscript', 'onload', 'onerror', 'onclick',
    'eval', 'settimeout', 'setinterval', 'function', 'constructor',
    'prototype', '__proto__', 'import', 'require', 'process', 'global'
  ];

  /**
   * Comprehensive security validation of input
   */
  static validateInput(input: unknown, context: {
    type?: 'sql' | 'html' | 'url' | 'json' | 'general';
    maxLength?: number;
    allowSpecialChars?: boolean;
    strictMode?: boolean;
  } = {}): SecurityValidationResult {
    const { type = 'general', maxLength = 10000, allowSpecialChars = false, strictMode = true } = context;
    const errors: string[] = [];
    const threats: string[] = [];

    try {
      // Basic type and null checks
      if (input === null || input === undefined) {
        return { isValid: true, sanitizedValue: input, errors: [], threats: [] };
      }

      // Convert to string for analysis
      const inputStr = String(input);
      const lowerInput = inputStr.toLowerCase();
      let sanitizedValue: unknown = inputStr;

      // Length check
      if (inputStr.length > maxLength) {
        errors.push(`Input length exceeds maximum of ${maxLength} characters`);
        sanitizedValue = inputStr.substring(0, maxLength);
      }

      // Check for dangerous patterns
      for (const pattern of this.INJECTION_PATTERNS) {
        if (pattern.test(inputStr)) {
          threats.push(`Potential injection attack detected: ${pattern.source}`);
          if (strictMode) {
            errors.push('Input contains potentially dangerous content');
          }
        }
      }

      // Check for dangerous keywords
      for (const keyword of this.DANGEROUS_KEYWORDS) {
        if (lowerInput.includes(keyword)) {
          threats.push(`Dangerous keyword detected: ${keyword}`);
          if (strictMode && type !== 'general') {
            errors.push(`Dangerous keyword '${keyword}' not allowed`);
          }
        }
      }

      // Type-specific validation
      switch (type) {
        case 'sql':
          sanitizedValue = this.sanitizeSQL(inputStr);
          break;
        case 'html':
          sanitizedValue = this.sanitizeHTML(inputStr);
          break;
        case 'url': {
          const urlResult = this.validateURL(inputStr);
          if (!urlResult.isValid) {
            errors.push(...urlResult.errors);
          }
          sanitizedValue = urlResult.sanitizedValue;
          break;
        }
        case 'json':
          try {
            JSON.parse(inputStr);
          } catch {
            errors.push('Invalid JSON format');
          }
          break;
        default:
          sanitizedValue = this.sanitizeGeneral(inputStr, allowSpecialChars);
      }

      // Log security threats
      if (threats.length > 0) {
        logger.warn('Security threats detected in input', { threats, input: inputStr.substring(0, 100) });
      }

      return {
        isValid: errors.length === 0,
        sanitizedValue,
        errors,
        threats
      };

    } catch (error) {
      logger.error('Security validation error', { error, input });
      return {
        isValid: false,
        sanitizedValue: null,
        errors: ['Validation failed'],
        threats: []
      };
    }
  }

  /**
   * Sanitize SQL input to prevent injection
   */
  private static sanitizeSQL(input: string): string {
    return input
      .replace(/['";\\]/g, '') // Remove quotes and backslashes
      .replace(/--.*$/gm, '') // Remove SQL comments
      .replace(/\/\*.*?\*\//g, '') // Remove multi-line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Sanitize HTML input to prevent XSS
   */
  private static sanitizeHTML(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/&/g, '&amp;');
  }

  /**
   * Validate and sanitize URL
   */
  private static validateURL(input: string): { isValid: boolean; sanitizedValue: string; errors: string[] } {
    const errors: string[] = [];
    let sanitizedValue = '';

    try {
      const url = new URL(input);

      // Only allow safe protocols
      if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
        errors.push(`Protocol ${url.protocol} is not allowed`);
      }

      // Block private/local addresses
      if (url.hostname === 'localhost' ||
          url.hostname === '127.0.0.1' ||
          url.hostname.match(/^(10|192\.168|172\.(1[6-9]|2[0-9]|3[01]))\./) ||
          url.hostname.includes('metadata')) {
        errors.push('Access to private/local addresses is not allowed');
      }

      sanitizedValue = url.toString();
    } catch {
      errors.push('Invalid URL format');
    }

    return { isValid: errors.length === 0, sanitizedValue, errors };
  }

  /**
   * General sanitization
   */
  private static sanitizeGeneral(input: string, allowSpecialChars: boolean): string {
    if (allowSpecialChars) {
      return input.trim();
    }

    // Remove or escape dangerous characters
    return input
      .replace(/[<>&"'/\\]/g, '') // Remove HTML and path characters
      .replace(/[^\x20-\x7E]/g, '') // Keep only printable ASCII characters
      .trim();
  }

  /**
   * Validate file upload security
   */
  static validateFileUpload(file: {
    name: string;
    size: number;
    type: string;
    content?: Buffer;
  }): SecurityValidationResult {
    const errors: string[] = [];
    const threats: string[] = [];

    // Validate filename
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      errors.push('Filename contains invalid characters');
    }

    // Check for dangerous extensions
    const extension = file.name.split('.').pop()?.toLowerCase();
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.jar',
      '.app', '.deb', '.rpm', '.dmg', '.pkg', '.msi', '.scr',
      '.js', '.ts', '.py', '.rb', '.php', '.pl', '.cgi'
    ];
    const maxSize = 50 * 1024 * 1024; // 50MB default

    if (extension && dangerousExtensions.includes(`.${extension}`)) {
      threats.push(`Dangerous file extension: .${extension}`);
      errors.push('File type not allowed for security reasons');
    }

    // Size validation
    if (file.size > maxSize) {
      errors.push(`File size exceeds maximum limit of ${maxSize} bytes`);
    }

    // Content validation if available
    if (file.content) {
      const contentValidation = this.validateInput(file.content.toString('utf-8', 0, Math.min(1000, file.content.length)), {
        type: 'general',
        strictMode: true
      });
      if (contentValidation.threats.length > 0) {
        threats.push(...contentValidation.threats);
      }
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: file,
      errors,
      threats
    };
  }

  /**
   * Rate limiting check
   */
  private static rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  static checkRateLimit(identifier: string, maxRequests = 100, windowMs = 60000): boolean {
    const now = Date.now();
    const record = this.rateLimitMap.get(identifier);

    if (!record || now > record.resetTime) {
      this.rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxRequests) {
      logger.warn('Rate limit exceeded', { identifier, count: record.count });
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Clean up old rate limit entries
   */
  static cleanupRateLimit(): void {
    const now = Date.now();
    for (const [key, record] of this.rateLimitMap.entries()) {
      if (now > record.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }
}

// Clean up rate limit entries every 5 minutes
setInterval(() => {
  SecurityValidator.cleanupRateLimit();
}, 5 * 60 * 1000);

export default SecurityValidator;