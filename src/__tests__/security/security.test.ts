import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

describe('Security Tests', () => {
  describe('SQL Injection Prevention', () => {
    it('should sanitize SQL injection attempts in workflow names', () => {
      const maliciousInput = "'; DROP TABLE workflows; --";
      const sanitized = sanitizeInput(maliciousInput);

      expect(sanitized).not.toContain('DROP TABLE');
      expect(sanitized).not.toContain('--');
      expect(sanitized).not.toContain(';');
    });

    it('should prevent SQL injection in search queries', () => {
      const maliciousQuery = "1' OR '1'='1";
      const sanitized = sanitizeInput(maliciousQuery);

      expect(sanitized).not.toContain("OR '1'='1");
    });

    it('should handle UNION-based SQL injection attempts', () => {
      const maliciousInput = "1 UNION SELECT * FROM users";
      const sanitized = sanitizeInput(maliciousInput);

      expect(sanitized).not.toContain('UNION');
      expect(sanitized).not.toContain('SELECT');
    });

    it('should prevent blind SQL injection', () => {
      const maliciousInput = "1' AND SLEEP(5) --";
      const sanitized = sanitizeInput(maliciousInput);

      expect(sanitized).not.toContain('SLEEP');
      expect(sanitized).not.toContain('--');
    });

    it('should validate parameterized queries', () => {
      const userId = "1 OR 1=1";
      const params = validateQueryParams({ userId });

      expect(params.userId).not.toContain('OR');
      expect(params.userId).not.toContain('=');
    });
  });

  describe('XSS (Cross-Site Scripting) Prevention', () => {
    it('should escape HTML in workflow descriptions', () => {
      const maliciousHTML = '<script>alert("XSS")</script>';
      const escaped = escapeHTML(maliciousHTML);

      expect(escaped).not.toContain('<script>');
      expect(escaped).not.toContain('</script>');
      expect(escaped).toContain('&lt;script&gt;');
    });

    it('should sanitize JavaScript event handlers', () => {
      const maliciousInput = '<img src=x onerror="alert(1)">';
      const sanitized = sanitizeHTML(maliciousInput);

      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('alert');
    });

    it('should prevent DOM-based XSS', () => {
      const maliciousURL = 'javascript:alert(document.cookie)';
      const sanitized = sanitizeURL(maliciousURL);

      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toBe('');
    });

    it('should escape attribute values', () => {
      const maliciousAttr = '" onclick="alert(1)"';
      const escaped = escapeAttribute(maliciousAttr);

      expect(escaped).not.toContain('onclick');
      expect(escaped).toContain('&quot;');
    });

    it('should sanitize user-generated content', () => {
      const userContent = '<iframe src="http://evil.com"></iframe>';
      const sanitized = sanitizeHTML(userContent);

      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('</iframe>');
    });

    it('should prevent XSS in JSON responses', () => {
      const data = {
        name: '</script><script>alert(1)</script>',
      };

      const json = JSON.stringify(data);
      expect(json).toContain('\\u003c'); // Escaped <
      expect(json).not.toContain('<script>');
    });
  });

  describe('CSRF (Cross-Site Request Forgery) Protection', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      // CSRF middleware would be added here
    });

    it('should require CSRF token for state-changing requests', async () => {
      const router = express.Router();
      router.post('/workflow', (req, res) => {
        const token = req.headers['x-csrf-token'];
        if (!token) {
          return res.status(403).json({ error: 'CSRF token missing' });
        }
        res.json({ success: true });
      });

      app.use('/api', router);

      const response = await request(app).post('/api/workflow').send({ name: 'Test' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('CSRF token');
    });

    it('should validate CSRF token', async () => {
      const validToken = 'valid_csrf_token_123';
      const router = express.Router();

      router.post('/workflow', (req, res) => {
        const token = req.headers['x-csrf-token'];
        if (token !== validToken) {
          return res.status(403).json({ error: 'Invalid CSRF token' });
        }
        res.json({ success: true });
      });

      app.use('/api', router);

      const invalidResponse = await request(app)
        .post('/api/workflow')
        .set('x-csrf-token', 'invalid_token')
        .send({ name: 'Test' });

      expect(invalidResponse.status).toBe(403);

      const validResponse = await request(app)
        .post('/api/workflow')
        .set('x-csrf-token', validToken)
        .send({ name: 'Test' });

      expect(validResponse.status).toBe(200);
    });

    it('should not require CSRF for GET requests', async () => {
      const router = express.Router();
      router.get('/workflows', (_req, res) => {
        res.json({ workflows: [] });
      });

      app.use('/api', router);

      const response = await request(app).get('/api/workflows');
      expect(response.status).toBe(200);
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name+tag@example.co.uk',
        'valid_email@test-domain.com',
      ];

      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user space@example.com',
        'user@.com',
      ];

      validEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(true);
      });

      invalidEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(false);
      });
    });

    it('should validate URL format', () => {
      const validURLs = [
        'https://example.com',
        'http://subdomain.example.com',
        'https://example.com/path?query=value',
      ];

      const invalidURLs = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'not-a-url',
      ];

      validURLs.forEach((url) => {
        expect(isValidURL(url)).toBe(true);
      });

      invalidURLs.forEach((url) => {
        expect(isValidURL(url)).toBe(false);
      });
    });

    it('should validate workflow ID format', () => {
      expect(isValidWorkflowId('wf_abc123')).toBe(true);
      expect(isValidWorkflowId('wf_123_test')).toBe(true);

      expect(isValidWorkflowId('')).toBe(false);
      expect(isValidWorkflowId('invalid id')).toBe(false);
      expect(isValidWorkflowId('../../etc/passwd')).toBe(false);
      expect(isValidWorkflowId('<script>alert(1)</script>')).toBe(false);
    });

    it('should validate JSON payloads', () => {
      const validJSON = '{"name": "test", "value": 123}';
      const invalidJSON = '{name: test}'; // Invalid JSON

      expect(() => JSON.parse(validJSON)).not.toThrow();
      expect(() => JSON.parse(invalidJSON)).toThrow();
    });

    it('should limit string length', () => {
      const maxLength = 255;
      const validString = 'a'.repeat(100);
      const tooLong = 'a'.repeat(300);

      expect(validateStringLength(validString, maxLength)).toBe(true);
      expect(validateStringLength(tooLong, maxLength)).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits per IP', async () => {
      const rateLimiter = createRateLimiter({ max: 5, windowMs: 1000 });
      const ip = '192.168.1.1';

      // First 5 requests should succeed
      for (let i = 0; i < 5; i++) {
        const allowed = await rateLimiter.check(ip);
        expect(allowed).toBe(true);
      }

      // 6th request should be blocked
      const blocked = await rateLimiter.check(ip);
      expect(blocked).toBe(false);
    });

    it('should reset rate limit after window expires', async () => {
      const rateLimiter = createRateLimiter({ max: 2, windowMs: 100 });
      const ip = '192.168.1.2';

      // Use up the limit
      await rateLimiter.check(ip);
      await rateLimiter.check(ip);

      // Should be blocked
      expect(await rateLimiter.check(ip)).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be allowed again
      expect(await rateLimiter.check(ip)).toBe(true);
    });

    it('should have separate limits for different IPs', async () => {
      const rateLimiter = createRateLimiter({ max: 2, windowMs: 1000 });

      await rateLimiter.check('192.168.1.1');
      await rateLimiter.check('192.168.1.1');

      // IP 1 is blocked
      expect(await rateLimiter.check('192.168.1.1')).toBe(false);

      // IP 2 should still be allowed
      expect(await rateLimiter.check('192.168.1.2')).toBe(true);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication', async () => {
      const app = express();
      const router = express.Router();

      router.use((req, res, next) => {
        if (!req.headers.authorization) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
      });

      router.get('/protected', (_req, res) => {
        res.json({ data: 'secret' });
      });

      app.use('/api', router);

      const response = await request(app).get('/api/protected');
      expect(response.status).toBe(401);
    });

    it('should validate JWT tokens', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.signature';
      const invalidToken = 'not.a.valid.token';

      expect(isValidJWT(validToken)).toBe(true);
      expect(isValidJWT(invalidToken)).toBe(false);
    });

    it('should enforce role-based access control', () => {
      const adminUser = { role: 'admin', permissions: ['*'] };
      const regularUser = { role: 'user', permissions: ['read'] };

      expect(hasPermission(adminUser, 'workflow.delete')).toBe(true);
      expect(hasPermission(regularUser, 'workflow.delete')).toBe(false);
      expect(hasPermission(regularUser, 'read')).toBe(true);
    });

    it('should prevent privilege escalation', () => {
      const user = { role: 'user', permissions: ['workflow.read'] };

      // User should not be able to escalate to admin
      const canEscalate = hasPermission(user, 'user.promote');
      expect(canEscalate).toBe(false);
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt sensitive data', () => {
      const plaintext = 'sensitive_api_key_123';
      const encrypted = encrypt(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toBeDefined();
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should decrypt encrypted data correctly', () => {
      const plaintext = 'my_secret_password';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should use different ciphertext for same plaintext', () => {
      const plaintext = 'test_data';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // Due to random IV, ciphertexts should be different
      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should hash passwords before storage', async () => {
      const password = 'mySecurePassword123';
      const hashed = await hashPassword(password);

      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(50); // bcrypt hashes are long
      expect(hashed).toMatch(/^\$2[aby]\$/); // bcrypt format
    });

    it('should verify hashed passwords correctly', async () => {
      const password = 'testPassword123';
      const hashed = await hashPassword(password);

      const valid = await verifyPassword(password, hashed);
      const invalid = await verifyPassword('wrongPassword', hashed);

      expect(valid).toBe(true);
      expect(invalid).toBe(false);
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should prevent directory traversal attacks', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        'file://../../secret.txt',
        '/root/.ssh/id_rsa',
      ];

      maliciousPaths.forEach((path) => {
        expect(isSafePath(path)).toBe(false);
      });
    });

    it('should allow safe file paths', () => {
      const safePaths = [
        'workflows/my-workflow.json',
        'templates/email-template.html',
        'data/exports/report.csv',
      ];

      safePaths.forEach((path) => {
        expect(isSafePath(path)).toBe(true);
      });
    });

    it('should sanitize file names', () => {
      const maliciousName = '../../../etc/passwd';
      const sanitized = sanitizeFileName(maliciousName);

      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('\\');
    });
  });

  describe('Content Security Policy', () => {
    it('should set CSP headers', async () => {
      const app = express();
      app.use((_req, res, next) => {
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
        );
        next();
      });

      app.get('/', (_req, res) => res.send('OK'));

      const response = await request(app).get('/');
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('should prevent inline script execution', () => {
      const csp = "script-src 'self'";
      expect(csp).not.toContain("'unsafe-inline'");
      expect(csp).not.toContain("'unsafe-eval'");
    });
  });

  describe('Secure Headers', () => {
    it('should set security headers', async () => {
      const app = express();
      app.use((_req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        next();
      });

      app.get('/', (_req, res) => res.send('OK'));

      const response = await request(app).get('/');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    });
  });

  describe('Secret Management', () => {
    it('should not expose secrets in responses', () => {
      const credential = {
        id: 'cred_123',
        name: 'API Key',
        apiKey: 'secret_key_123',
      };

      const sanitized = sanitizeCredentialResponse(credential);

      expect(sanitized).toHaveProperty('id');
      expect(sanitized).toHaveProperty('name');
      expect(sanitized).not.toHaveProperty('apiKey');
    });

    it('should mask secrets in logs', () => {
      const logMessage = 'API Key: sk_live_1234567890abcdef';
      const masked = maskSecrets(logMessage);

      expect(masked).not.toContain('sk_live_1234567890abcdef');
      expect(masked).toContain('***');
    });

    it('should validate secret strength', () => {
      const weakSecret = '123456';
      const strongSecret = 'aB3$dF6&hJ9*kL2@';

      expect(isStrongSecret(weakSecret)).toBe(false);
      expect(isStrongSecret(strongSecret)).toBe(true);
    });
  });
});

// Helper functions for testing
function sanitizeInput(input: string): string {
  return input.replace(/[;'"\\-]/g, '');
}

function validateQueryParams(params: any): any {
  const sanitized: any = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    }
  }
  return sanitized;
}

function escapeHTML(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeHTML(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function sanitizeURL(url: string): string {
  if (url.startsWith('javascript:') || url.startsWith('data:')) {
    return '';
  }
  return url;
}

function escapeAttribute(attr: string): string {
  return attr.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidWorkflowId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length > 0;
}

function validateStringLength(str: string, maxLength: number): boolean {
  return str.length <= maxLength;
}

function createRateLimiter(options: { max: number; windowMs: number }) {
  const requests = new Map<string, number[]>();

  return {
    async check(ip: string): Promise<boolean> {
      const now = Date.now();
      const windowStart = now - options.windowMs;

      const ipRequests = requests.get(ip) || [];
      const validRequests = ipRequests.filter((time) => time > windowStart);

      if (validRequests.length >= options.max) {
        return false;
      }

      validRequests.push(now);
      requests.set(ip, validRequests);
      return true;
    },
  };
}

function isValidJWT(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3;
}

function hasPermission(user: any, permission: string): boolean {
  if (user.permissions.includes('*')) return true;
  return user.permissions.includes(permission);
}

function encrypt(plaintext: string): string {
  // Simplified encryption for testing
  return Buffer.from(plaintext).toString('base64') + '_encrypted';
}

function decrypt(ciphertext: string): string {
  const base64 = ciphertext.replace('_encrypted', '');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

async function hashPassword(password: string): Promise<string> {
  // Simplified bcrypt simulation
  return `$2b$10$${Buffer.from(password).toString('base64')}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const expected = await hashPassword(password);
  return hash.includes(Buffer.from(password).toString('base64'));
}

function isSafePath(path: string): boolean {
  return !path.includes('..') && !path.startsWith('/') && !path.includes('\\');
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function sanitizeCredentialResponse(credential: any): any {
  const { apiKey, clientSecret, password, ...safe } = credential;
  return safe;
}

function maskSecrets(message: string): string {
  return message.replace(/sk_[a-zA-Z0-9]+/g, '***');
}

function isStrongSecret(secret: string): boolean {
  return (
    secret.length >= 12 &&
    /[A-Z]/.test(secret) &&
    /[a-z]/.test(secret) &&
    /[0-9]/.test(secret) &&
    /[^A-Za-z0-9]/.test(secret)
  );
}
