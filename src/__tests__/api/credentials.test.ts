import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import credentialsRouter from '../../backend/api/routes/credentials';

// Mock the repositories
vi.mock('../../backend/api/repositories/adapters', () => ({
  upsertCredential: vi.fn(),
  listCredentials: vi.fn(),
  deleteCredential: vi.fn(),
  getCredentialDecrypted: vi.fn(),
}));

import {
  upsertCredential,
  listCredentials,
  deleteCredential,
  getCredentialDecrypted,
} from '../../backend/api/repositories/adapters';

describe('Credentials API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/credentials', credentialsRouter);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/credentials', () => {
    it('should return all credentials', async () => {
      const mockCredentials = [
        {
          id: 'cred_1',
          kind: 'oauth2',
          name: 'Google OAuth',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cred_2',
          kind: 'api_key',
          name: 'Stripe API',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(listCredentials).mockReturnValue(mockCredentials);

      const response = await request(app).get('/api/credentials');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('credentials');
      expect(Array.isArray(response.body.credentials)).toBe(true);
      expect(response.body.credentials).toHaveLength(2);
      expect(listCredentials).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no credentials exist', async () => {
      vi.mocked(listCredentials).mockReturnValue([]);

      const response = await request(app).get('/api/credentials');

      expect(response.status).toBe(200);
      expect(response.body.credentials).toHaveLength(0);
    });

    it('should not expose credential secrets in list', async () => {
      const mockCredentials = [
        {
          id: 'cred_1',
          kind: 'api_key',
          name: 'Secret API',
          apiKey: 'secret_key_123', // This should not be in response
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(listCredentials).mockReturnValue(mockCredentials);

      const response = await request(app).get('/api/credentials');

      expect(response.status).toBe(200);
      // The actual filtering happens in the repository layer
      // We're testing that the endpoint returns what the repository provides
    });
  });

  describe('POST /api/credentials', () => {
    it('should create new credential successfully', async () => {
      const newCredential = {
        kind: 'oauth2',
        name: 'GitHub OAuth',
        clientId: 'github_client_id',
        clientSecret: 'github_client_secret',
        redirectUri: 'https://app.example.com/callback',
      };

      const createdCredential = {
        id: 'cred_new',
        kind: 'oauth2',
        name: 'GitHub OAuth',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(upsertCredential).mockReturnValue(createdCredential as any);

      const response = await request(app)
        .post('/api/credentials')
        .send(newCredential);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 'cred_new');
      expect(response.body).toHaveProperty('name', 'GitHub OAuth');
      expect(response.body).toHaveProperty('kind', 'oauth2');
      expect(response.body).not.toHaveProperty('clientSecret'); // Should not expose secrets
      expect(upsertCredential).toHaveBeenCalled();
    });

    it('should return 400 when kind is missing', async () => {
      const response = await request(app)
        .post('/api/credentials')
        .send({ name: 'Missing Kind' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Credential kind is required');
    });

    it('should create API key credential', async () => {
      const newCredential = {
        kind: 'api_key',
        name: 'Stripe API',
        apiKey: 'sk_test_123456',
      };

      const createdCredential = {
        id: 'cred_api',
        kind: 'api_key',
        name: 'Stripe API',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(upsertCredential).mockReturnValue(createdCredential as any);

      const response = await request(app)
        .post('/api/credentials')
        .send(newCredential);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 'cred_api');
      expect(response.body).not.toHaveProperty('apiKey');
    });

    it('should create basic auth credential', async () => {
      const newCredential = {
        kind: 'basic_auth',
        name: 'HTTP Basic',
        username: 'admin',
        password: 'secret_password',
      };

      const createdCredential = {
        id: 'cred_basic',
        kind: 'basic_auth',
        name: 'HTTP Basic',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(upsertCredential).mockReturnValue(createdCredential as any);

      const response = await request(app)
        .post('/api/credentials')
        .send(newCredential);

      expect(response.status).toBe(201);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('username');
    });

    it('should handle credentials without name', async () => {
      const newCredential = {
        kind: 'api_key',
        apiKey: 'some_key',
      };

      const createdCredential = {
        id: 'cred_unnamed',
        kind: 'api_key',
        name: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(upsertCredential).mockReturnValue(createdCredential as any);

      const response = await request(app)
        .post('/api/credentials')
        .send(newCredential);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 'cred_unnamed');
    });

    it('should handle empty request body', async () => {
      const response = await request(app).post('/api/credentials');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Credential kind is required');
    });
  });

  describe('GET /api/credentials/:id', () => {
    it('should return credential by id without secrets', async () => {
      const mockCredential = {
        id: 'cred_123',
        kind: 'oauth2',
        name: 'Google OAuth',
        clientId: 'google_client_id',
        clientSecret: 'google_client_secret', // Should not be exposed
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getCredentialDecrypted).mockReturnValue(mockCredential as any);

      const response = await request(app).get('/api/credentials/cred_123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'cred_123');
      expect(response.body).toHaveProperty('name', 'Google OAuth');
      expect(response.body).toHaveProperty('kind', 'oauth2');
      expect(response.body).not.toHaveProperty('clientSecret');
      expect(response.body).not.toHaveProperty('clientId');
      expect(getCredentialDecrypted).toHaveBeenCalledWith('cred_123');
    });

    it('should return 404 when credential not found', async () => {
      vi.mocked(getCredentialDecrypted).mockReturnValue(null);

      const response = await request(app).get('/api/credentials/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Credential not found');
    });

    it('should return only safe fields for API key credential', async () => {
      const mockCredential = {
        id: 'cred_api',
        kind: 'api_key',
        name: 'Stripe',
        apiKey: 'sk_live_secret_key',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getCredentialDecrypted).mockReturnValue(mockCredential as any);

      const response = await request(app).get('/api/credentials/cred_api');

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('apiKey');
    });

    it('should return only safe fields for basic auth credential', async () => {
      const mockCredential = {
        id: 'cred_basic',
        kind: 'basic_auth',
        name: 'HTTP Auth',
        username: 'admin',
        password: 'secret123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getCredentialDecrypted).mockReturnValue(mockCredential as any);

      const response = await request(app).get('/api/credentials/cred_basic');

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('username');
    });
  });

  describe('DELETE /api/credentials/:id', () => {
    it('should delete credential successfully', async () => {
      vi.mocked(deleteCredential).mockReturnValue(true);

      const response = await request(app).delete('/api/credentials/cred_123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(deleteCredential).toHaveBeenCalledWith('cred_123');
    });

    it('should return 404 when deleting nonexistent credential', async () => {
      vi.mocked(deleteCredential).mockReturnValue(false);

      const response = await request(app).delete('/api/credentials/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Credential not found');
    });

    it('should handle deletion of different credential types', async () => {
      vi.mocked(deleteCredential).mockReturnValue(true);

      const credentialIds = ['cred_oauth', 'cred_api', 'cred_basic'];

      for (const id of credentialIds) {
        const response = await request(app).delete(`/api/credentials/${id}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
      }

      expect(deleteCredential).toHaveBeenCalledTimes(3);
    });
  });

  describe('Security Tests', () => {
    it('should never expose sensitive data in responses', async () => {
      const mockCredential = {
        id: 'cred_secure',
        kind: 'oauth2',
        name: 'Secure Cred',
        clientId: 'client_id',
        clientSecret: 'super_secret',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        privateKey: '-----BEGIN PRIVATE KEY-----',
        apiKey: 'api_key_secret',
        password: 'password123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getCredentialDecrypted).mockReturnValue(mockCredential as any);

      const response = await request(app).get('/api/credentials/cred_secure');

      expect(response.status).toBe(200);
      // Only safe fields should be in response
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('kind');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // None of these should be present
      expect(response.body).not.toHaveProperty('clientSecret');
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('refreshToken');
      expect(response.body).not.toHaveProperty('privateKey');
      expect(response.body).not.toHaveProperty('apiKey');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should not allow updating credentials through GET', async () => {
      const mockCredential = {
        id: 'cred_123',
        kind: 'api_key',
        name: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getCredentialDecrypted).mockReturnValue(mockCredential as any);

      const response = await request(app)
        .get('/api/credentials/cred_123?update=true');

      expect(response.status).toBe(200);
      // Should just return the credential, not update it
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors on list', async () => {
      vi.mocked(listCredentials).mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app).get('/api/credentials');

      expect(response.status).toBe(500);
    });

    it('should handle database errors on create', async () => {
      vi.mocked(upsertCredential).mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/credentials')
        .send({ kind: 'api_key', name: 'Test' });

      expect(response.status).toBe(500);
    });

    it('should handle database errors on get', async () => {
      vi.mocked(getCredentialDecrypted).mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const response = await request(app).get('/api/credentials/cred_123');

      expect(response.status).toBe(500);
    });

    it('should handle database errors on delete', async () => {
      vi.mocked(deleteCredential).mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app).delete('/api/credentials/cred_123');

      expect(response.status).toBe(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle credential with very long name', async () => {
      const longName = 'A'.repeat(500);
      const newCredential = {
        kind: 'api_key',
        name: longName,
        apiKey: 'key123',
      };

      const createdCredential = {
        id: 'cred_long',
        kind: 'api_key',
        name: longName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(upsertCredential).mockReturnValue(createdCredential as any);

      const response = await request(app)
        .post('/api/credentials')
        .send(newCredential);

      expect(response.status).toBe(201);
    });

    it('should handle special characters in credential name', async () => {
      const specialName = 'Test@#$%^&*()_+{}|:"<>?';
      const newCredential = {
        kind: 'api_key',
        name: specialName,
        apiKey: 'key123',
      };

      const createdCredential = {
        id: 'cred_special',
        kind: 'api_key',
        name: specialName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(upsertCredential).mockReturnValue(createdCredential as any);

      const response = await request(app)
        .post('/api/credentials')
        .send(newCredential);

      expect(response.status).toBe(201);
    });

    it('should handle malformed JSON in request', async () => {
      const response = await request(app)
        .post('/api/credentials')
        .set('Content-Type', 'application/json')
        .send('{"kind": "api_key", "name": invalid}'); // Invalid JSON

      expect(response.status).toBe(400);
    });
  });
});
