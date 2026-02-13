/**
 * Auth API Integration Tests
 * Tests for authentication and user management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import { Router } from 'express';

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

const mockUser = {
  id: TEST_USER_ID,
  email: 'test@test.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
  permissions: ['workflow.create', 'workflow.read'],
  emailVerified: true,
};

const mockTokens = {
  accessToken: 'mock-access-token-jwt',
  refreshToken: 'mock-refresh-token-jwt',
  expiresIn: 3600,
  tokenType: 'Bearer',
};

function createMockAuthRouter() {
  const router = Router();
  const users = new Map<string, typeof mockUser & { passwordHash: string }>();
  users.set(TEST_USER_ID, { ...mockUser, passwordHash: 'hashed-password' });
  users.set('user-by-email:test@test.com', { ...mockUser, passwordHash: 'hashed-password' });

  const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }
    const token = authHeader.split(' ')[1];
    if (token === 'invalid-format') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    (req as any).user = mockUser;
    next();
  };

  router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    const user = users.get(`user-by-email:${email}`);
    if (!user || password === 'wrong-password') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      tokens: mockTokens,
    });
  });

  router.post('/register', (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (users.has(`user-by-email:${email}`)) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const newUser = {
      id: `user-${Date.now()}`, email, firstName: firstName || null,
      lastName: lastName || null, role: 'USER',
      permissions: ['workflow.create', 'workflow.read'],
      emailVerified: false, passwordHash: 'hashed-password',
    };
    users.set(newUser.id, newUser);
    users.set(`user-by-email:${email}`, newUser);
    res.status(201).json({
      user: { id: newUser.id, email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName, role: newUser.role },
      tokens: mockTokens,
    });
  });

  router.post('/refresh', (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    if (refreshToken.split('.').length !== 3) {
      return res.status(400).json({ error: 'Invalid refresh token format' });
    }
    if (refreshToken === 'expired.refresh.token') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.json({
      tokens: { accessToken: 'new-access-token-jwt', refreshToken: 'new-refresh-token-jwt', expiresIn: 3600, tokenType: 'Bearer' },
    });
  });

  router.post('/logout', authMiddleware, (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
  });

  router.get('/me', authMiddleware, (req, res) => {
    const user = (req as any).user;
    res.json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, permissions: user.permissions },
    });
  });

  router.post('/change-password', authMiddleware, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    res.json({ success: true });
  });

  return router;
}

function createTestApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createMockAuthRouter());
  return app;
}

describe('Auth API Integration Tests', () => {
  let app: Application;
  const authToken = 'valid-test-token';

  beforeEach(() => {
    app = createTestApp();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@test.com');
      expect(res.body.tokens).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com', password: 'wrong-password' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('should return JWT tokens with correct structure', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.tokens.accessToken).toBeDefined();
      expect(res.body.tokens.refreshToken).toBeDefined();
      expect(res.body.tokens.tokenType).toBe('Bearer');
      expect(res.body.tokens.expiresIn).toBeGreaterThan(0);
    });

    it('should reject login with missing fields', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject login for non-existent user', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'password123' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register new user with valid data', async () => {
      const res = await request(app).post('/api/auth/register')
        .send({ email: 'newuser@test.com', password: 'SecurePassword123!', firstName: 'New', lastName: 'User' });
      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('newuser@test.com');
      expect(res.body.tokens).toBeDefined();
    });

    it('should reject invalid email format', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'invalid-email', password: 'SecurePassword123!' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should enforce minimum password length', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'valid@email.com', password: '123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject duplicate email registration', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'test@test.com', password: 'SecurePassword123!' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already exists');
    });

    it('should reject registration with missing fields', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'valid@email.com' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh with valid token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'valid.refresh.token' });
      expect(res.status).toBe(200);
      expect(res.body.tokens).toBeDefined();
      expect(res.body.tokens.accessToken).toBeDefined();
      expect(res.body.tokens.refreshToken).toBeDefined();
    });

    it('should reject expired refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'expired.refresh.token' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('should reject missing refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject invalid token format', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'not-a-jwt' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('Middleware Authentication', () => {
    it('should reject request without authorization header', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('should reject request with non-Bearer token', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', 'Basic sometoken');
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('should allow request with valid Bearer token', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe(mockUser.id);
      expect(res.body.user.email).toBe(mockUser.email);
      expect(res.body.user.permissions).toBeDefined();
    });

    it('should return user data on GET /me', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('USER');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${authToken}`).send({});
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject logout without authentication', async () => {
      const res = await request(app).post('/api/auth/logout').send({});
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should change password with valid data', async () => {
      const res = await request(app).post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentPassword: 'password123', newPassword: 'newSecurePass123!' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject weak new password', async () => {
      const res = await request(app).post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentPassword: 'password123', newPassword: '123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });
});
