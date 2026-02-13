/**
 * Input Validation & Sanitization Test Suite
 *
 * Comprehensive tests for:
 * - Validation Engine (Zod-based schema validation)
 * - Sanitization Service (XSS, SQL injection, etc.)
 * - Expression Security (forbidden patterns, AST analysis)
 * - File Upload Security (magic bytes, MIME type validation)
 *
 * @module input-validation.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import {
  ValidationEngine,
  CommonSchemas,
  WorkflowSchemas,
  PredefinedSchemas,
  getValidationEngine,
} from '../validation/ValidationEngine';
import {
  SanitizationService,
  getSanitizationService,
  sanitize,
} from '../validation/SanitizationService';
import {
  ExpressionSecurityEnhanced,
  getExpressionSecurity,
  expressionSecurity,
} from '../security/ExpressionSecurityEnhanced';
import {
  FileUploadSecurityService,
  getFileUploadSecurity,
} from '../security/FileUploadSecurity';

describe('Validation Engine', () => {
  let engine: ValidationEngine;

  beforeEach(() => {
    engine = new ValidationEngine();
  });

  describe('Schema Validation', () => {
    it('should validate simple string schema', () => {
      const schema = z.string().min(1);
      const result = engine.validate('hello', schema);

      expect(result.valid).toBe(true);
      expect(result.data).toBe('hello');
      expect(result.errorCount).toBe(0);
    });

    it('should reject invalid data', () => {
      const schema = z.string().min(5);
      const result = engine.validate('hi', schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errorCount).toBeGreaterThan(0);
    });

    it('should validate complex object schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().min(0),
        email: z.string().email(),
      });

      const result = engine.validate(
        { name: 'John', age: 30, email: 'john@example.com' },
        schema
      );

      expect(result.valid).toBe(true);
      expect(result.data).toEqual({ name: 'John', age: 30, email: 'john@example.com' });
    });

    it('should validate nested objects', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          address: z.object({
            city: z.string(),
            zip: z.string(),
          }),
        }),
      });

      const result = engine.validate(
        {
          user: {
            name: 'John',
            address: { city: 'NYC', zip: '10001' },
          },
        },
        schema
      );

      expect(result.valid).toBe(true);
    });

    it('should validate arrays', () => {
      const schema = z.array(z.string()).min(1).max(5);
      const result = engine.validate(['a', 'b', 'c'], schema);

      expect(result.valid).toBe(true);
      expect(result.data).toEqual(['a', 'b', 'c']);
    });
  });

  describe('Common Schemas', () => {
    it('should validate email addresses', () => {
      expect(engine.validate('test@example.com', CommonSchemas.email).valid).toBe(true);
      expect(engine.validate('invalid-email', CommonSchemas.email).valid).toBe(false);
    });

    it('should validate URLs', () => {
      expect(engine.validate('https://example.com', CommonSchemas.url).valid).toBe(true);
      expect(engine.validate('not-a-url', CommonSchemas.url).valid).toBe(false);
    });

    it('should validate UUIDs', () => {
      expect(
        engine.validate('123e4567-e89b-12d3-a456-426614174000', CommonSchemas.uuid).valid
      ).toBe(true);
      expect(engine.validate('not-a-uuid', CommonSchemas.uuid).valid).toBe(false);
    });

    it('should validate strong passwords', () => {
      expect(engine.validate('MyP@ssw0rd123', CommonSchemas.strongPassword).valid).toBe(true);
      expect(engine.validate('weak', CommonSchemas.strongPassword).valid).toBe(false);
    });

    it('should validate IP addresses', () => {
      expect(engine.validate('192.168.1.1', CommonSchemas.ipv4).valid).toBe(true);
      expect(engine.validate('999.999.999.999', CommonSchemas.ipv4).valid).toBe(false);
    });
  });

  describe('Workflow Schemas', () => {
    it('should validate workflow names', () => {
      expect(engine.validate('My Workflow 123', WorkflowSchemas.workflowName).valid).toBe(true);
      expect(engine.validate('', WorkflowSchemas.workflowName).valid).toBe(false);
    });

    it('should validate cron expressions', () => {
      expect(engine.validate('0 0 * * *', WorkflowSchemas.cronExpression).valid).toBe(true);
      expect(engine.validate('invalid-cron', WorkflowSchemas.cronExpression).valid).toBe(false);
    });

    it('should validate HTTP methods', () => {
      expect(engine.validate('GET', WorkflowSchemas.httpMethod).valid).toBe(true);
      expect(engine.validate('POST', WorkflowSchemas.httpMethod).valid).toBe(true);
      expect(engine.validate('INVALID', WorkflowSchemas.httpMethod).valid).toBe(false);
    });
  });

  describe('Predefined Schemas', () => {
    it('should validate user registration', () => {
      const validData = {
        email: 'test@example.com',
        password: 'MyP@ssw0rd123',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true,
      };

      const result = engine.validate(validData, PredefinedSchemas.userRegistration);
      expect(result.valid).toBe(true);
    });

    it('should reject weak passwords in registration', () => {
      const weakPassword = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true,
      };

      const result = engine.validate(weakPassword, PredefinedSchemas.userRegistration);
      expect(result.valid).toBe(false);
    });

    it('should require terms acceptance', () => {
      const noTerms = {
        email: 'test@example.com',
        password: 'MyP@ssw0rd123',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: false,
      };

      const result = engine.validate(noTerms, PredefinedSchemas.userRegistration);
      expect(result.valid).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should check validity without returning data', () => {
      const schema = z.string().email();
      expect(engine.isValid('test@example.com', schema)).toBe(true);
      expect(engine.isValid('invalid', schema)).toBe(false);
    });

    it('should safely parse data', () => {
      const schema = z.number();
      expect(engine.safeParse(123, schema)).toBe(123);
      expect(engine.safeParse('invalid', schema)).toBeNull();
    });

    it('should validate multiple items', () => {
      const schema = z.string().email();
      const items = ['test@example.com', 'invalid', 'another@example.com'];
      const results = engine.validateMany(items, schema);

      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[2].valid).toBe(true);
    });
  });
});

describe('Sanitization Service', () => {
  let service: SanitizationService;

  beforeEach(() => {
    service = new SanitizationService();
  });

  describe('HTML Sanitization', () => {
    it('should sanitize XSS attacks', () => {
      const malicious = '<script>alert("XSS")</script>';
      const result = service.sanitizeHTML(malicious);

      expect(result.sanitized).not.toContain('<script>');
      expect(result.modified).toBe(true);
    });

    it('should allow safe HTML tags', () => {
      const safe = '<p>Hello <strong>world</strong></p>';
      const result = service.sanitizeHTML(safe, { allowHTML: true });

      expect(result.sanitized).toContain('<p>');
      expect(result.sanitized).toContain('<strong>');
    });

    it('should strip all HTML when requested', () => {
      const html = '<p>Hello <strong>world</strong></p>';
      const result = service.sanitizeHTML(html, { stripHTML: true });

      expect(result.sanitized).toBe('Hello world');
      expect(result.modified).toBe(true);
    });

    it('should encode HTML entities', () => {
      const text = '<div>Test & "quoted"</div>';
      const result = service.sanitizeHTML(text, { encodeHTML: true });

      expect(result.sanitized).toContain('&lt;');
      expect(result.sanitized).toContain('&gt;');
      expect(result.sanitized).toContain('&quot;');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should escape single quotes', () => {
      const input = "SELECT * FROM users WHERE name = 'John'";
      const result = service.sanitizeSQL(input);

      expect(result.sanitized).toContain("''");
      expect(result.modified).toBe(true);
    });

    it('should detect SQL keywords', () => {
      const input = 'SELECT * FROM users';
      const result = service.sanitizeSQL(input);

      expect(result.removedPatterns).toContain('sql-keywords');
    });

    it('should remove SQL comments', () => {
      const input = 'SELECT * FROM users -- comment';
      const result = service.sanitizeSQL(input);

      expect(result.removedPatterns).toContain('sql-comments');
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should remove MongoDB operators from strings', () => {
      const input = '$where: 1==1';
      const result = service.sanitizeNoSQL(input);

      expect(result).toBe('\\$where: 1==1');
    });

    it('should remove dangerous keys from objects', () => {
      const input = {
        username: 'test',
        $where: '1==1',
        __proto__: { admin: true },
      };

      const result = service.sanitizeNoSQL(input);

      expect(result).not.toHaveProperty('$where');
      expect(result).not.toHaveProperty('__proto__');
      expect(result.username).toBe('test');
    });
  });

  describe('Command Injection Prevention', () => {
    it('should remove shell metacharacters', () => {
      const input = 'echo test; rm -rf /';
      const result = service.sanitizeCommand(input);

      expect(result.sanitized).not.toContain(';');
      expect(result.removedPatterns).toContain('shell-metacharacters');
    });

    it('should detect dangerous commands', () => {
      const input = 'cat /etc/passwd';
      const result = service.sanitizeCommand(input);

      expect(result.removedPatterns).toContain('dangerous-commands');
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should remove path traversal sequences', () => {
      const input = '../../../etc/passwd';
      const result = service.sanitizePath(input);

      expect(result.sanitized).not.toContain('../');
      expect(result.removedPatterns).toContain('path-traversal');
    });

    it('should normalize path separators', () => {
      const input = 'path\\to\\file';
      const result = service.sanitizePath(input);

      expect(result.sanitized).toContain('/');
      expect(result.sanitized).not.toContain('\\');
    });
  });

  describe('Prototype Pollution Prevention', () => {
    it('should remove dangerous prototype keys', () => {
      const obj = {
        name: 'test',
        __proto__: { admin: true },
        constructor: { prototype: { admin: true } },
      };

      const result = service.sanitizeObject(obj);

      expect(result).not.toHaveProperty('__proto__');
      expect(result).not.toHaveProperty('constructor');
      expect(result.name).toBe('test');
    });
  });

  describe('Helper Functions', () => {
    it('should sanitize email addresses', () => {
      const email = '  TEST@Example.COM  ';
      const result = service.sanitizeEmail(email);

      expect(result.sanitized).toBe('test@example.com');
    });

    it('should sanitize URLs', () => {
      const url = 'javascript:alert(1)';
      const result = service.sanitizeURL(url);

      expect(result.sanitized).not.toContain('javascript:');
      expect(result.removedPatterns).toContain('javascript-protocol');
    });

    it('should detect dangerous patterns', () => {
      const input = '<script>eval("alert(1)")</script>';
      const patterns = service.detectDangerousPatterns(input);

      expect(patterns).toContain('xss');
    });
  });
});

describe('Expression Security Enhanced', () => {
  let security: ExpressionSecurityEnhanced;

  beforeEach(() => {
    security = new ExpressionSecurityEnhanced();
  });

  describe('Forbidden Pattern Detection', () => {
    it('should detect eval() usage', () => {
      const expr = 'eval("malicious code")';
      const result = security.analyze(expr);

      expect(result.safe).toBe(false);
      expect(result.violations.some(v => v.message.includes('eval'))).toBe(true);
    });

    it('should detect Function constructor', () => {
      const expr = 'new Function("return 1")';
      const result = security.analyze(expr);

      expect(result.safe).toBe(false);
    });

    it('should detect process access', () => {
      const expr = 'process.exit(0)';
      const result = security.analyze(expr);

      expect(result.safe).toBe(false);
    });

    it('should detect require() usage', () => {
      const expr = 'require("fs")';
      const result = security.analyze(expr);

      expect(result.safe).toBe(false);
    });
  });

  describe('AST Analysis', () => {
    it('should detect dangerous property access', () => {
      const expr = '__proto__.admin = true';
      const result = security.analyze(expr);

      expect(result.safe).toBe(false);
    });

    it('should detect bracket notation access', () => {
      const expr = 'obj["__proto__"]';
      const result = security.analyze(expr);

      expect(result.safe).toBe(false);
    });
  });

  describe('Complexity Analysis', () => {
    it('should calculate complexity score', () => {
      const simple = '1 + 1';
      const complex = 'for(let i=0;i<10;i++){if(i>5){console.log(i)}}';

      const simpleResult = security.analyze(simple);
      const complexResult = security.analyze(complex);

      expect(complexResult.complexityScore).toBeGreaterThan(simpleResult.complexityScore!);
    });

    it('should flag high complexity expressions', () => {
      const veryComplex = 'x'.repeat(1000) + ' && '.repeat(100) + 'y';
      const result = security.analyze(veryComplex);

      expect(result.violations.some(v => v.type === 'complexity')).toBe(true);
    });
  });

  describe('Infinite Loop Detection', () => {
    it('should detect while(true)', () => {
      const expr = 'while(true){}';
      const result = security.analyze(expr);

      expect(result.safe).toBe(false);
      expect(result.violations.some(v => v.message.includes('Infinite loop'))).toBe(true);
    });

    it('should detect for loops without increment', () => {
      const expr = 'for(let i=0;;){}';
      const result = security.analyze(expr);

      expect(result.violations.some(v => v.message.includes('infinite loop'))).toBe(true);
    });
  });

  describe('Safe Execution', () => {
    it('should allow safe expressions', () => {
      const expr = '1 + 1';
      const result = security.analyze(expr);

      expect(result.safe).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow math operations', () => {
      const expr = 'Math.sqrt(16) + Math.pow(2, 3)';
      const result = security.analyze(expr);

      expect(result.safe).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should validate expressions', () => {
      expect(security.isValid('1 + 1')).toBe(true);
      expect(security.isValid('eval("code")')).toBe(false);
    });

    it('should get violations', () => {
      const violations = security.getViolations('eval("code")');
      expect(violations.length).toBeGreaterThan(0);
    });
  });
});

describe('File Upload Security', () => {
  let service: FileUploadSecurityService;

  beforeEach(() => {
    service = new FileUploadSecurityService();
  });

  describe('File Size Validation', () => {
    it('should reject files exceeding size limit', async () => {
      const largeFile = {
        filename: 'large.jpg',
        buffer: Buffer.alloc(20 * 1024 * 1024), // 20MB
        mimetype: 'image/jpeg',
      };

      const result = await service.validateFile(largeFile, { maxSize: 10 * 1024 * 1024 });

      expect(result.safe).toBe(false);
      expect(result.violations.some(v => v.type === 'size')).toBe(true);
    });

    it('should accept files within size limit', async () => {
      const smallFile = {
        filename: 'small.jpg',
        buffer: Buffer.alloc(1024), // 1KB
        mimetype: 'image/jpeg',
      };

      const result = await service.validateFile(smallFile);

      expect(result.violations.some(v => v.type === 'size')).toBe(false);
    });
  });

  describe('Extension Validation', () => {
    it('should reject dangerous extensions', async () => {
      const exeFile = {
        filename: 'malware.exe',
        buffer: Buffer.from('MZ'),
        mimetype: 'application/x-msdownload',
      };

      const result = await service.validateFile(exeFile);

      expect(result.safe).toBe(false);
      expect(result.violations.some(v => v.message.includes('Dangerous file extension'))).toBe(true);
    });

    it('should accept allowed extensions', async () => {
      const txtFile = {
        filename: 'document.txt',
        buffer: Buffer.from('Hello'),
        mimetype: 'text/plain',
      };

      const result = await service.validateFile(txtFile, {
        allowedExtensions: ['.txt'],
      });

      // May have other violations but not extension
      expect(result.violations.some(v => v.type === 'extension')).toBe(false);
    });
  });

  describe('Filename Sanitization', () => {
    it('should sanitize malicious filenames', async () => {
      const file = {
        filename: '../../../etc/passwd',
        buffer: Buffer.from('test'),
        mimetype: 'text/plain',
      };

      const result = await service.validateFile(file);

      expect(result.fileInfo?.safeName).not.toContain('../');
    });

    it('should remove special characters', async () => {
      const file = {
        filename: 'file@#$%.txt',
        buffer: Buffer.from('test'),
        mimetype: 'text/plain',
      };

      const result = await service.validateFile(file);

      expect(result.fileInfo?.safeName).toMatch(/^[a-zA-Z0-9._-]+$/);
    });
  });

  describe('Safe File Types', () => {
    it('should provide safe image configuration', () => {
      const config = FileUploadSecurityService.getSafeImageTypes();

      expect(config.allowedExtensions).toContain('.jpg');
      expect(config.allowedExtensions).toContain('.png');
      expect(config.requireMagicBytesValidation).toBe(true);
    });

    it('should provide safe document configuration', () => {
      const config = FileUploadSecurityService.getSafeDocumentTypes();

      expect(config.allowedExtensions).toContain('.pdf');
      expect(config.allowedExtensions).toContain('.docx');
      expect(config.validateContent).toBe(true);
    });
  });
});
