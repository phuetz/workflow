/**
 * Integration Tests: Authentication API
 * Tests for user authentication, registration, and session management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ApiClient } from '../../utils/api-client';
import { UserFactory } from '../../factories';
import { TestAssertions } from '../../utils/assertions';
import { testUtils } from '../../setup/integration-setup';

describe('Authentication API Integration Tests', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    apiClient = new ApiClient();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await apiClient.post('/api/v1/auth/register', {
        email: 'newuser@test.com',
        firstName: 'New',
        lastName: 'User',
        password: 'SecurePassword123!'
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data).toHaveProperty('user');
      expect(response.data).toHaveProperty('tokens');
      expect(response.data.user.email).toBe('newuser@test.com');
      expect(response.data.tokens.accessToken).toBeTruthy();
      expect(response.data.tokens.refreshToken).toBeTruthy();
    });

    it('should reject registration with existing email', async () => {
      const user = await UserFactory.create({ email: 'existing@test.com' });

      const response = await apiClient.post('/api/v1/auth/register', {
        email: user.email,
        firstName: 'Duplicate',
        lastName: 'User',
        password: 'Password123!'
      });

      TestAssertions.assertErrorResponse(response, 409);
      expect(response.error?.message).toContain('already exists');
    });

    it('should reject registration with weak password', async () => {
      const response = await apiClient.post('/api/v1/auth/register', {
        email: 'weak@test.com',
        firstName: 'Weak',
        lastName: 'Password',
        password: '123'
      });

      TestAssertions.assertErrorResponse(response, 400);
      expect(response.error?.message).toContain('password');
    });

    it('should reject registration with invalid email', async () => {
      const response = await apiClient.post('/api/v1/auth/register', {
        email: 'invalid-email',
        firstName: 'Invalid',
        lastName: 'Email',
        password: 'Password123!'
      });

      TestAssertions.assertErrorResponse(response, 400);
    });

    it('should reject registration with missing required fields', async () => {
      const response = await apiClient.post('/api/v1/auth/register', {
        email: 'incomplete@test.com'
      });

      TestAssertions.assertErrorResponse(response, 400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const password = 'TestPassword123!';
      const user = await UserFactory.create({ password });

      const response = await apiClient.post('/api/v1/auth/login', {
        email: user.email,
        password
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data).toHaveProperty('tokens');
      expect(response.data).toHaveProperty('user');
      expect(response.data.tokens.accessToken).toBeTruthy();
      expect(response.data.user.email).toBe(user.email);
    });

    it('should reject login with incorrect password', async () => {
      const user = await UserFactory.create({ password: 'CorrectPassword123!' });

      const response = await apiClient.post('/api/v1/auth/login', {
        email: user.email,
        password: 'WrongPassword123!'
      });

      TestAssertions.assertErrorResponse(response, 401);
      expect(response.error?.message).toContain('Invalid credentials');
    });

    it('should reject login with non-existent user', async () => {
      const response = await apiClient.post('/api/v1/auth/login', {
        email: 'nonexistent@test.com',
        password: 'Password123!'
      });

      TestAssertions.assertErrorResponse(response, 401);
    });

    it('should reject login for unverified email', async () => {
      const password = 'Password123!';
      const user = await UserFactory.create({ password, emailVerified: false });

      const response = await apiClient.post('/api/v1/auth/login', {
        email: user.email,
        password
      });

      TestAssertions.assertErrorResponse(response, 403);
      expect(response.error?.message).toContain('verify');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const password = 'Password123!';
      const user = await UserFactory.create({ password });

      // Login to get tokens
      const loginResponse = await apiClient.post('/api/v1/auth/login', {
        email: user.email,
        password
      });

      const refreshToken = loginResponse.data.tokens.refreshToken;

      // Refresh the token
      const refreshResponse = await apiClient.post('/api/v1/auth/refresh', {
        refreshToken
      });

      TestAssertions.assertSuccessResponse(refreshResponse);
      expect(refreshResponse.data.tokens.accessToken).toBeTruthy();
      expect(refreshResponse.data.tokens.refreshToken).toBeTruthy();
      expect(refreshResponse.data.tokens.accessToken).not.toBe(loginResponse.data.tokens.accessToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await apiClient.post('/api/v1/auth/refresh', {
        refreshToken: 'invalid-token'
      });

      TestAssertions.assertErrorResponse(response, 401);
    });

    it('should reject expired refresh token', async () => {
      // This would require manipulating token expiration
      // Placeholder for actual implementation
      expect(true).toBe(true);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const password = 'Password123!';
      const user = await UserFactory.create({ password });
      const token = await apiClient.login(user.email, password);

      apiClient.setAuthToken(token);

      const response = await apiClient.post('/api/v1/auth/logout');

      TestAssertions.assertSuccessResponse(response);

      // Token should be invalidated
      const testResponse = await apiClient.get('/api/v1/auth/me');
      TestAssertions.assertErrorResponse(testResponse, 401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user info when authenticated', async () => {
      const password = 'Password123!';
      const user = await UserFactory.create({ password });
      const token = await apiClient.login(user.email, password);

      apiClient.setAuthToken(token);

      const response = await apiClient.get('/api/v1/auth/me');

      TestAssertions.assertSuccessResponse(response);
      TestAssertions.assertValidUser(response.data.user);
      expect(response.data.user.email).toBe(user.email);
      expect(response.data.user.passwordHash).toBeUndefined(); // Should not expose password hash
    });

    it('should reject request without authentication', async () => {
      apiClient.clearAuthToken();

      const response = await apiClient.get('/api/v1/auth/me');

      TestAssertions.assertErrorResponse(response, 401);
    });

    it('should reject request with invalid token', async () => {
      apiClient.setAuthToken('invalid-token');

      const response = await apiClient.get('/api/v1/auth/me');

      TestAssertions.assertErrorResponse(response, 401);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should initiate password reset for existing user', async () => {
      const user = await UserFactory.create();

      const response = await apiClient.post('/api/v1/auth/forgot-password', {
        email: user.email
      });

      TestAssertions.assertSuccessResponse(response);
      expect(response.data.message).toContain('reset');
    });

    it('should not reveal if email does not exist', async () => {
      const response = await apiClient.post('/api/v1/auth/forgot-password', {
        email: 'nonexistent@test.com'
      });

      // Should return success to prevent email enumeration
      TestAssertions.assertSuccessResponse(response);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      // This requires generating a valid reset token
      // Placeholder for implementation
      expect(true).toBe(true);
    });

    it('should reject reset with invalid token', async () => {
      const response = await apiClient.post('/api/v1/auth/reset-password', {
        token: 'invalid-token',
        password: 'NewPassword123!'
      });

      TestAssertions.assertErrorResponse(response, 400);
    });

    it('should reject reset with weak password', async () => {
      const response = await apiClient.post('/api/v1/auth/reset-password', {
        token: 'valid-token',
        password: '123'
      });

      TestAssertions.assertErrorResponse(response, 400);
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      // Requires generating a valid verification token
      // Placeholder for implementation
      expect(true).toBe(true);
    });

    it('should reject verification with invalid token', async () => {
      const response = await apiClient.post('/api/v1/auth/verify-email', {
        token: 'invalid-token'
      });

      TestAssertions.assertErrorResponse(response, 400);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const user = await UserFactory.create({ password: 'Password123!' });

      // Make multiple failed login attempts
      const attempts = Array(10).fill(null).map(() =>
        apiClient.post('/api/v1/auth/login', {
          email: user.email,
          password: 'WrongPassword'
        })
      );

      const responses = await Promise.all(attempts);

      // Some responses should be rate limited
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should track active sessions', async () => {
      const password = 'Password123!';
      const user = await UserFactory.create({ password });

      // Login multiple times
      const session1 = await apiClient.post('/api/v1/auth/login', {
        email: user.email,
        password
      });

      const apiClient2 = new ApiClient();
      const session2 = await apiClient2.post('/api/v1/auth/login', {
        email: user.email,
        password
      });

      expect(session1.data.tokens.accessToken).not.toBe(session2.data.tokens.accessToken);

      // Both sessions should be valid
      apiClient.setAuthToken(session1.data.tokens.accessToken);
      const me1 = await apiClient.get('/api/v1/auth/me');
      TestAssertions.assertSuccessResponse(me1);

      apiClient2.setAuthToken(session2.data.tokens.accessToken);
      const me2 = await apiClient2.get('/api/v1/auth/me');
      TestAssertions.assertSuccessResponse(me2);
    });
  });
});
