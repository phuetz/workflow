import { logger } from '../services/SimpleLogger';
import { SecureExpressionEvaluator } from '../utils/SecureExpressionEvaluator';
// SECURITY FIX: Comprehensive security manager for third-party integrations
// Prevents code injection, SSRF, XSS, and other integration vulnerabilities

export interface SecurityPolicy {
  allowedDomains: string[];
  allowedProtocols: string[];
  maxCodeExecutionTime: number;
  maxMemoryUsage: number;
  disallowedPatterns: RegExp[];
  cspDirectives: { [key: string]: string[] };
}

export interface CodeExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  securityViolations: string[];
  executionTime: number;
  memoryUsage: number;
}

// SECURITY FIX: Default security policy with strict settings
const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  allowedDomains: [
    'api.workflow.internal',
    'marketplace.workflow.internal',
    '*.trusted-partner.com'
  ],
  allowedProtocols: ['https:'],
  maxCodeExecutionTime: 5000, // 5 seconds
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  disallowedPatterns: [
    // Code injection patterns
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /new\s+Function/gi,
    /constructor\s*\(\s*['"]/gi,
    
    // Process/environment access
    /process\s*\./gi,
    /require\s*\(/gi,
    /import\s*\(/gi,
    /global\s*\./gi,
    /window\s*\./gi,
    /document\s*\./gi,
    /location\s*\./gi,
    /navigator\s*\./gi,
    
    // File system access
    /fs\s*\./gi,
    /readFile/gi,
    /writeFile/gi,
    /exec\s*\(/gi,
    /spawn\s*\(/gi,
    
    // Network access
    /fetch\s*\(/gi,
    /XMLHttpRequest/gi,
    /xhr\s*\./gi,
    /ajax\s*\(/gi,
    
    // DOM manipulation
    /innerHTML/gi,
    /outerHTML/gi,
    /insertAdjacentHTML/gi,
    /document\.write/gi,
    /document\.writeln/gi,
    
    // Event handlers
    /on\w+\s*=/gi,
    /addEventListener/gi,
    
    // Dangerous globals
    /__proto__/gi,
    /prototype\s*\./gi,
    /constructor\s*\./gi
  ],
  cspDirectives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'"],
    'font-src': ["'self'"],
    'object-src': ["'none'"],
    'media-src': ["'self'"],
    'frame-src': ["'none'"],
    'sandbox': ['allow-same-origin', 'allow-scripts']
  }
};

export class SecurityManager {
  private policy: SecurityPolicy;
  private trustedDomains: Set<string>;
  private codeExecutionCount: number = 0;
  private lastExecutionCheck: number = Date.now();
  private executionLimiter: Map<string, number> = new Map();

  constructor(customPolicy: Partial<SecurityPolicy> = {}) {
    this.policy = { ...DEFAULT_SECURITY_POLICY, ...customPolicy };
    this.trustedDomains = new Set(this.policy.allowedDomains);
  }

  // SECURITY FIX: Validate and sanitize URLs to prevent SSRF attacks
  validateUrl(url: string, _context: string = 'general'): boolean { // eslint-disable-line @typescript-eslint/no-unused-vars
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;

      // Check protocol
      if (!this.policy.allowedProtocols.includes(parsedUrl.protocol)) {
        logger.warn(`SECURITY: Blocked URL with disallowed protocol: ${parsedUrl.protocol}`);
        return false;
      }

      // Check for localhost/private IP ranges
      if (this.isPrivateIP(hostname) || this.isLocalhost(hostname)) {
        logger.warn(`SECURITY: Blocked URL targeting private/local address: ${hostname}`);
        return false;
      }

      // Check against allowed domains
      if (!this.isDomainAllowed(hostname)) {
        logger.warn(`SECURITY: Blocked URL with untrusted domain: ${hostname}`);
        return false;
      }

      // Check for dangerous paths
      if (this.hasDangerousPath(parsedUrl.pathname)) {
        logger.warn(`SECURITY: Blocked URL with dangerous path: ${parsedUrl.pathname}`);
        return false;
      }

      return true;
    } catch {
      logger.warn(`SECURITY: Invalid URL format: ${url}`);
      return false;
    }
  }

  // SECURITY FIX: Check if IP is in private ranges
  private isPrivateIP(hostname: string): boolean {
    const privateRanges = [
      /^127\./,              // 127.0.0.0/8 (loopback)
      /^10\./,               // 10.0.0.0/8 (private)
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12 (private)
      /^192\.168\./,         // 192.168.0.0/16 (private)
      /^169\.254\./,         // 169.254.0.0/16 (link-local)
      /^0\./,                // 0.0.0.0/8 (this network)
      /^224\./,              // 224.0.0.0/4 (multicast)
      /^240\./               // 240.0.0.0/4 (reserved)
    ];

    return privateRanges.some(range => range.test(hostname));
  }

  // SECURITY FIX: Check for localhost variants
  private isLocalhost(hostname: string): boolean {
    const localhostVariants = [
      'localhost',
      '0.0.0.0',
      '127.0.0.1',
      '::1',
      'ip6-localhost',
      'ip6-loopback'
    ];

    return localhostVariants.includes(hostname);
  }

  // SECURITY FIX: Check if domain is in allowed list
  private isDomainAllowed(hostname: string): boolean {
    for (const allowedDomain of Array.from(this.trustedDomains)) {
      if (allowedDomain.startsWith('*.')) {
        const domain = allowedDomain.substring(2);
        if (hostname.endsWith(domain)) {
          return true;
        }
      } else if (hostname === allowedDomain) {
        return true;
      }
    }
    return false;
  }

  // SECURITY FIX: Check for dangerous paths
  private hasDangerousPath(pathname: string): boolean {
    const dangerousPaths = [
      /\/\.\./,              // Directory traversal
      /\/etc\//,             // System files
      /\/proc\//,            // Process files
      /\/dev\//,             // Device files
      /\/var\/log\//,        // Log files
      /\/tmp\//,             // Temporary files
      /\/home\//,            // User directories
      /\/root\//,            // Root directory
      /\.ssh\//,             // SSH keys
      /\.git\//,             // Git repository
      /\.env$/,              // Environment files
      /\.config$/,           // Configuration files
      /password/i,           // Password files
      /secret/i,             // Secret files
      /private/i,            // Private files
      /admin/i,              // Admin endpoints
      /debug/i,              // Debug endpoints
      /internal/i            // Internal endpoints
    ];

    return dangerousPaths.some(pattern => pattern.test(pathname));
  }

  // SECURITY FIX: Secure code validation and execution
  async executeCode(
    code: string,
    inputData: unknown = {},
    context: unknown = {},
    executionId: string = 'default'
  ): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    const securityViolations: string[] = [];

    // Rate limiting
    if (!this.checkExecutionRateLimit(executionId)) {
      return {
        success: false,
        error: 'Execution rate limit exceeded',
        securityViolations: ['RATE_LIMIT_EXCEEDED'],
        executionTime: 0,
        memoryUsage: 0
      };
    }

    // Code security validation
    const codeValidation = this.validateCode(code);
    if (!codeValidation.isValid) {
      return {
        success: false,
        error: 'Code contains security violations',
        securityViolations: codeValidation.violations,
        executionTime: Date.now() - startTime,
        memoryUsage: 0
      };
    }

    // Create secure execution environment
    try {
      const result = await this.executeInSandbox(code, inputData, context);

      return {
        success: true,
        result,
        securityViolations,
        executionTime: Date.now() - startTime,
        memoryUsage: this.getMemoryUsage()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        securityViolations: ['EXECUTION_ERROR'],
        executionTime: Date.now() - startTime,
        memoryUsage: this.getMemoryUsage()
      };
    }
  }

  // SECURITY FIX: Rate limiting for code execution
  private checkExecutionRateLimit(executionId: string): boolean {
    const now = Date.now();

    // Reset counter every minute
    if (now - this.lastExecutionCheck > 60000) {
      this.executionLimiter.clear();
      this.lastExecutionCheck = now;
    }

    const currentCount = this.executionLimiter.get(executionId) || 0;

    // Allow max 10 executions per minute per ID
    if (currentCount >= 10) {
      return false;
    }

    this.executionLimiter.set(executionId, currentCount + 1);
    return true;
  }

  // SECURITY FIX: Comprehensive code validation
  private validateCode(code: string): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];
    
    // Check against disallowed patterns
    for (const pattern of this.policy.disallowedPatterns) {
      if (pattern.test(code)) {
        violations.push(`DANGEROUS_PATTERN: ${pattern.source}`);
      }
    }
    
    // Check code length
    if (code.length > 10000) {
      violations.push('CODE_TOO_LONG');
    }
    
    // Check for suspicious encodings
    if (this.hasEncodedContent(code)) {
      violations.push('ENCODED_CONTENT_DETECTED');
    }
    
    // Check for obfuscation patterns
    if (this.isObfuscated(code)) {
      violations.push('OBFUSCATED_CODE_DETECTED');
    }
    
    return {
      isValid: violations.length === 0,
      violations
    };
  }

  // SECURITY FIX: Detect encoded content
  private hasEncodedContent(code: string): boolean {
    const encodingPatterns = [
      /atob\s*\(/gi,           // Base64 decode
      /btoa\s*\(/gi,           // Base64 encode
      /unescape\s*\(/gi,       // URL decode
      /decodeURI/gi,           // URI decode
      /\\u[0-9a-f]{4}/gi,      // Unicode escapes
      /\\x[0-9a-f]{2}/gi,      // Hex escapes
      /%[0-9a-f]{2}/gi,        // URL encoding
      /String\.fromCharCode/gi  // Character code conversion
    ];

    return encodingPatterns.some(pattern => pattern.test(code));
  }

  // SECURITY FIX: Detect code obfuscation
  private isObfuscated(code: string): boolean {
    // High ratio of special characters to normal characters
    const normalCharCount = (code.match(/[a-zA-Z0-9]/g) || []).length;
    const specialCharCount = (code.match(/[^a-zA-Z0-9\s]/g) || []).length;

    if (normalCharCount > 0 && specialCharCount / normalCharCount > 0.5) {
      return true;
    }

    // Very long strings without spaces
    const longStrings = code.match(/\S{100,}/g);
    if (longStrings && longStrings.length > 0) {
      return true;
    }

    // Excessive use of array-style property access
    const arrayAccessCount = (code.match(/\[['"][^\]]+['"]\]/g) || []).length;
    if (arrayAccessCount > 10) {
      return true;
    }

    return false;
  }

  // SECURITY FIX: Secure sandboxed execution using SecureExpressionEvaluator
  private async executeInSandbox(code: string, inputData: unknown, context: unknown): Promise<unknown> {
    // Use SecureExpressionEvaluator instead of dangerous new Function()
    const result = SecureExpressionEvaluator.evaluate(code, {
      variables: {
        // Safe globals only
        Math,
        Date,
        JSON,
        String,
        Number,
        Boolean,
        Array,
        Object,

        // Input data
        input: inputData,
        context: context,

        // Safe utilities
        console: {
          log: (...args: unknown[]) => logger.info('[SANDBOX]', ...args),
          warn: (...args: unknown[]) => logger.warn('[SANDBOX]', ...args),
          error: (...args: unknown[]) => logger.error('[SANDBOX]', ...args)
        }
      },
      functions: {
        parseInt,
        parseFloat,
        isNaN,
        isFinite
      },

      // Options
      timeout: this.policy.maxCodeExecutionTime,
      maxDepth: 10
    });

    if (!result.success) {
      throw new Error(`Sandbox execution failed: ${result.error}`);
    }

    return result.value;
  }

  // SECURITY FIX: Memory usage estimation
  private getMemoryUsage(): number {
    // Simplified memory usage calculation
    // In production, would use more sophisticated memory monitoring
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    
    // Browser fallback
    return 0;
  }

  // SECURITY FIX: Validate plugin manifest for security issues
  validatePluginManifest(manifest: unknown): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Required fields
    const requiredFields = ['name', 'version', 'description', 'main'];
    for (const field of requiredFields) {
      if (!manifest || typeof manifest !== 'object' || !(field in manifest)) {
        violations.push(`MISSING_REQUIRED_FIELD: ${field}`);
      }
    }

    // Type guard to access manifest properties
    const manifestObj = manifest as Record<string, unknown>;

    // Validate permissions
    if (manifestObj.permissions && Array.isArray(manifestObj.permissions)) {
      const dangerousPermissions = [
        'filesystem',
        'network-external',
        'process-execution',
        'system-access',
        'admin-access'
      ];

      for (const permission of manifestObj.permissions) {
        if (typeof permission === 'string' && dangerousPermissions.includes(permission)) {
          violations.push(`DANGEROUS_PERMISSION: ${permission}`);
        }
      }
    }

    // Validate entry points
    if (manifestObj.main && typeof manifestObj.main === 'string') {
      if (this.hasDangerousPath(manifestObj.main)) {
        violations.push(`DANGEROUS_ENTRY_POINT: ${manifestObj.main}`);
      }
    }

    // Validate external resources
    if (manifestObj.resources && Array.isArray(manifestObj.resources)) {
      for (const resource of manifestObj.resources) {
        if (typeof resource === 'string' && !this.validateUrl(resource, 'plugin-resource')) {
          violations.push(`INVALID_RESOURCE_URL: ${resource}`);
        }
      }
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  // SECURITY FIX: Generate Content Security Policy header
  generateCSPHeader(): string {
    const directives = Object.entries(this.policy.cspDirectives)
      .map(([directive, values]) => `${directive} ${values.join(' ')}`)
      .join('; ');

    return directives;
  }

  // SECURITY FIX: Add security headers for HTTP requests
  getSecurityHeaders(): { [key: string]: string } {
    return {
      'Content-Security-Policy': this.generateCSPHeader(),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    };
  }

  // SECURITY FIX: Log security events
  logSecurityEvent(event: string, details: unknown): void {
    const securityEvent = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };

    logger.warn('SECURITY EVENT:', securityEvent);

    // In production, would send to security monitoring service
    // this.sendToSecurityService(securityEvent);
  }
}

// SECURITY FIX: Export singleton instance with default policy
export const securityManager = new SecurityManager();

// SECURITY FIX: Export security utilities
export const SecurityUtils = {
  sanitizeInput: (input: string): string => {
    return input.replace(/[<>"'&]/g, (match) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[match];
    });
  },
  
  validateJSON: (jsonString: string): { isValid: boolean; data?: unknown; error?: string } => {
    try {
      // Check size limit
      if (jsonString.length > 1024 * 1024) { // 1MB limit
        return { isValid: false, error: 'JSON too large' };
      }

      const data = JSON.parse(jsonString);

      return { isValid: true, data };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON'
      };
    }
  },
  
  hashSensitiveData: async (data: string): Promise<string> => {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback for environments without crypto.subtle
    return btoa(data).replace(/[^a-zA-Z0-9]/g, '');
  }
};