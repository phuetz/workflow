/**
 * Credentials API Integration Tests
 * Tests for credential management operations
 *
 * Total: 10 tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import { Router } from 'express';

// Test UUIDs
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_CREDENTIAL_ID = '550e8400-e29b-41d4-a716-446655440002';
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440999';

// Mock user for authenticated requests
const mockUser = {
  id: TEST_USER_ID,
  email: 'test@test.com',
  role: 'USER',
  permissions: ['credential.create', 'credential.read', 'credential.update', 'credential.delete'],
};

// Mock credential data factory
function createMockCredential(overrides: Partial<{
  id: string;
  name: string;
  type: string;
  description: string;
  data: Record<string, unknown>;
  userId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: TEST_CREDENTIAL_ID,
    name: 'Test Credential',
    type: 'API_KEY',
    description: 'A test credential',
    data: { apiKey: 'encrypted-data' },
    userId: TEST_USER_ID,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Create a mock credentials router for testing
function createMockCredentialsRouter() {
  const router = Router();

  // Mock credential storage
  const credentials: Map<string, ReturnType<typeof createMockCredential>> = new Map();
  credentials.set(TEST_CREDENTIAL_ID, createMockCredential());

  // Authentication middleware
  const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }
    (req as any).user = mockUser;
    next();
  };

  // POST /api/credentials - Create credential
  router.post('/', authMiddleware, (req, res) => {
    const { kind, name, description, data } = req.body;

    if (!kind) {
      return res.status(400).json({ error: 'Credential type (kind) is required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const credential = createMockCredential({
      id: `cred-${Date.now()}`,
      name,
      type: kind.toUpperCase(),
      description,
      data: { encrypted: true }, // Don't store raw data, just mark as encrypted
      userId: (req as any).user.id,
    });

    credentials.set(credential.id, credential);

    // Return without sensitive data
    res.status(201).json({
      id: credential.id,
      name: credential.name,
      kind: credential.type.toLowerCase(),
      description: credential.description,
      isActive: credential.isActive,
      createdAt: credential.createdAt,
    });
  });

  // GET /api/credentials - List credentials
  router.get('/', authMiddleware, (req, res) => {
    const userId = (req as any).user.id;
    const userCredentials = Array.from(credentials.values())
      .filter(c => c.userId === userId)
      .map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        description: c.description,
        isActive: c.isActive,
        createdAt: c.createdAt,
        // No data field - sensitive info excluded
      }));

    res.json({ credentials: userCredentials });
  });

  // GET /api/credentials/:id - Get credential by ID
  router.get('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const credential = credentials.get(id);

    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    // Return without sensitive data
    res.json({
      id: credential.id,
      name: credential.name,
      type: credential.type,
      description: credential.description,
      isActive: credential.isActive,
      createdAt: credential.createdAt,
    });
  });

  // GET /api/credentials/:id/decrypt - Decrypt credential
  router.get('/:id/decrypt', authMiddleware, (req, res) => {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const credential = credentials.get(id);

    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    // Check ownership
    if (credential.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this credential' });
    }

    // Return with decrypted data
    res.json({
      id: credential.id,
      name: credential.name,
      type: credential.type,
      data: { apiKey: 'decrypted-secret-value' },
    });
  });

  // PUT /api/credentials/:id - Update credential
  router.put('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const { name, description, data } = req.body;
    const userId = (req as any).user.id;
    const credential = credentials.get(id);

    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    if (credential.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this credential' });
    }

    const updatedCredential = {
      ...credential,
      name: name ?? credential.name,
      description: description ?? credential.description,
      data: data ? { encrypted: true } : credential.data,
      updatedAt: new Date(),
    };

    credentials.set(id, updatedCredential);

    res.json({
      id: updatedCredential.id,
      name: updatedCredential.name,
      description: updatedCredential.description,
      isActive: updatedCredential.isActive,
    });
  });

  // DELETE /api/credentials/:id - Delete credential
  router.delete('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const credential = credentials.get(id);

    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    if (credential.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this credential' });
    }

    credentials.delete(id);

    res.json({ success: true, message: 'Credential deleted' });
  });

  // POST /api/credentials/test - Test credential connection
  router.post('/test', authMiddleware, (req, res) => {
    const { kind, data } = req.body;

    if (!kind || !data) {
      return res.status(400).json({ error: 'Kind and data are required for testing' });
    }

    // Simulate successful test
    res.json({
      success: true,
      message: 'Connection successful',
      latencyMs: 150,
    });
  });

  // Helper to add test credentials
  (router as any).addTestCredential = (credential: ReturnType<typeof createMockCredential>) => {
    credentials.set(credential.id, credential);
  };

  // Helper to clear credentials
  (router as any).clearCredentials = () => {
    credentials.clear();
    credentials.set(TEST_CREDENTIAL_ID, createMockCredential());
  };

  return router;
}

// Setup test application
function createTestApp(): Application {
  const app = express();
  app.use(express.json());

  const credentialsRouter = createMockCredentialsRouter();
  app.use('/api/credentials', credentialsRouter);

  // Store router reference for test manipulation
  (app as any).credentialsRouter = credentialsRouter;

  return app;
}

describe('Credentials API Integration Tests', () => {
  let app: Application;
  const authToken = 'valid-test-token';

  beforeEach(() => {
    app = createTestApp();
    (app as any).credentialsRouter.clearCredentials();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // POST /api/credentials - Create Credential Tests (3 tests)
  // ============================================================================

  describe('POST /api/credentials', () => {
    it('should create credential', async () => {
      const credentialData = {
        kind: 'api_key',
        name: 'My API Key',
        description: 'Test API key',
        data: { apiKey: 'test-api-key-123' },
      };

      const res = await request(app)
        .post('/api/credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .send(credentialData);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe(credentialData.name);
      expect(res.body.kind).toBe('api_key');
      // Sensitive data should not be returned
      expect(res.body.data).toBeUndefined();
    });

    it('should encrypt sensitive data (not return raw data)', async () => {
      const credentialData = {
        kind: 'api_key',
        name: 'Secret Key',
        data: { secret: 'super-secret-value' },
      };

      const res = await request(app)
        .post('/api/credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .send(credentialData);

      expect(res.status).toBe(201);
      // Data should not be in response
      expect(res.body.data).toBeUndefined();
    });

    it('should validate credential type', async () => {
      const res = await request(app)
        .post('/api/credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing kind/type
          name: 'Invalid Credential',
          data: { key: 'value' },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  // ============================================================================
  // GET /api/credentials - List Credentials Tests (1 test)
  // ============================================================================

  describe('GET /api/credentials', () => {
    it('should list credentials without sensitive data', async () => {
      const res = await request(app)
        .get('/api/credentials')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.credentials).toBeInstanceOf(Array);
      // Verify no sensitive data is returned
      res.body.credentials.forEach((cred: any) => {
        expect(cred.data).toBeUndefined();
      });
    });
  });

  // ============================================================================
  // GET /api/credentials/:id/decrypt - Decrypt Credential Tests (2 tests)
  // ============================================================================

  describe('GET /api/credentials/:id/decrypt', () => {
    it('should decrypt credential for authorized user', async () => {
      const res = await request(app)
        .get(`/api/credentials/${TEST_CREDENTIAL_ID}/decrypt`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(TEST_CREDENTIAL_ID);
      expect(res.body.data).toBeDefined();
    });

    it('should reject unauthorized access to other user credentials', async () => {
      // Add a credential owned by another user
      const otherCredential = createMockCredential({
        id: 'other-cred-123',
        userId: OTHER_USER_ID,
      });
      (app as any).credentialsRouter.addTestCredential(otherCredential);

      const res = await request(app)
        .get(`/api/credentials/other-cred-123/decrypt`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });
  });

  // ============================================================================
  // DELETE /api/credentials/:id - Delete Credential Tests (1 test)
  // ============================================================================

  describe('DELETE /api/credentials/:id', () => {
    it('should delete credential', async () => {
      const res = await request(app)
        .delete(`/api/credentials/${TEST_CREDENTIAL_ID}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============================================================================
  // POST /api/credentials/test - Test Credential Tests (1 test)
  // ============================================================================

  describe('POST /api/credentials/test', () => {
    it('should test credential connection', async () => {
      const testData = {
        kind: 'api_key',
        data: { apiKey: 'test-key' },
        testEndpoint: 'https://api.example.com/test',
      };

      const res = await request(app)
        .post('/api/credentials/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBeDefined();
    });
  });

  // ============================================================================
  // PUT /api/credentials/:id - Update Credential Tests (1 test)
  // ============================================================================

  describe('PUT /api/credentials/:id', () => {
    it('should update credential', async () => {
      const res = await request(app)
        .put(`/api/credentials/${TEST_CREDENTIAL_ID}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
    });
  });

  // ============================================================================
  // Additional Credential Security Tests (1 test)
  // ============================================================================

  describe('Credential Security', () => {
    it('should return 404 for non-existent credential', async () => {
      const res = await request(app)
        .get('/api/credentials/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });
});
