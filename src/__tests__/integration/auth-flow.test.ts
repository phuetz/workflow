/**
 * Authentication Flow Integration Tests
 * Tests for the complete authentication workflow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthManager } from '../../backend/auth/AuthManager';

// Mock the logger
vi.mock('../../utils/unifiedLogger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock crypto
global.crypto = {
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(7)
} as any;

describe('Authentication Flow Integration Tests', () => {
  let authManager: AuthManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    global.localStorage = localStorageMock as any;

    authManager = new AuthManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Email/Password Authentication', () => {
    it('should successfully login with valid credentials', async () => {
      const result = await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123',
      });

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('admin@workflowbuilder.com');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should reject login with invalid password', async () => {
      await expect(
        authManager.login({
          email: 'admin@workflowbuilder.com',
          password: 'wrongPassword',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject login for non-existent user', async () => {
      await expect(
        authManager.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should set user as authenticated after login', async () => {
      expect(authManager.isAuthenticated()).toBe(false);

      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123',
      });

      expect(authManager.isAuthenticated()).toBe(true);
    });
  });

  describe('User Registration', () => {
    it('should successfully register new user', async () => {
      const newUserData = {
        email: 'newuser@example.com',
        password: 'securePassword123',
        firstName: 'New',
        lastName: 'User',
      };

      const result = await authManager.register(newUserData);

      expect(result).toBeDefined();
      expect(result.user.email).toBe(newUserData.email);
      expect(result.user.firstName).toBe(newUserData.firstName);
      expect(result.user.lastName).toBe(newUserData.lastName);
    });

    it('should return tokens after registration', async () => {
      const result = await authManager.register({
        email: 'test@example.com',
        password: 'myPassword',
      });

      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should set new user role as "user"', async () => {
      const result = await authManager.register({
        email: 'test@example.com',
        password: 'myPassword',
      });

      expect(result.user.role).toBe('user');
    });
  });

  describe('Token Management', () => {
    it('should generate valid tokens on login', async () => {
      const result = await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123',
      });

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.tokens.tokenType).toBe('Bearer');
      expect(result.tokens.expiresIn).toBe(3600);
    });

    it('should refresh access token', async () => {
      // Login first
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123',
      });

      const result = await authManager.refreshTokens();

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.accessToken).toBe('new-mock-jwt-access-token');
    });

    it('should fail to refresh without login', async () => {
      await expect(authManager.refreshTokens()).rejects.toThrow('No refresh token available');
    });

    it('should logout and clear tokens', async () => {
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123',
      });

      expect(authManager.isAuthenticated()).toBe(true);

      await authManager.logout();

      expect(authManager.getCurrentUser()).toBeNull();
      expect(authManager.getTokens()).toBeNull();
      expect(authManager.isAuthenticated()).toBe(false);
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should assign admin permissions correctly', async () => {
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123',
      });

      expect(authManager.hasPermission('workflow.create')).toBe(true);
      expect(authManager.hasPermission('workflow.delete')).toBe(true);
      expect(authManager.hasPermission('user.create')).toBe(true);
      expect(authManager.hasRole('admin')).toBe(true);
    });

    it('should assign user permissions correctly', async () => {
      const result = await authManager.register({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(result.user.permissions).toContain('workflow.create');
      expect(result.user.permissions).toContain('workflow.read');
      expect(result.user.permissions).not.toContain('user.delete');
    });

    it('should check roles correctly', async () => {
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123',
      });

      expect(authManager.hasRole('admin')).toBe(true);
      expect(authManager.hasRole('user')).toBe(false);
      expect(authManager.hasAnyRole(['admin', 'user'])).toBe(true);
    });

    it('should return false for permissions when not authenticated', () => {
      expect(authManager.hasPermission('workflow.create')).toBe(false);
      expect(authManager.hasRole('admin')).toBe(false);
    });
  });

  describe('Session Persistence', () => {
    it('should save session to localStorage on login', async () => {
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123',
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('auth_user', expect.any(String));
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_tokens', expect.any(String));
    });

    it('should clear localStorage on logout', async () => {
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123',
      });

      await authManager.logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_user');
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_tokens');
    });
  });

  describe('Password Management', () => {
    it('should allow password change when authenticated', async () => {
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123',
      });

      await expect(
        authManager.changePassword('admin123', 'newPassword123')
      ).resolves.not.toThrow();
    });

    it('should reject password change when not authenticated', async () => {
      await expect(
        authManager.changePassword('oldPassword', 'newPassword')
      ).rejects.toThrow('User not authenticated');
    });

    it('should send password reset request', async () => {
      await expect(
        authManager.resetPassword('test@example.com')
      ).resolves.not.toThrow();
    });

    it('should confirm password reset with token', async () => {
      await expect(
        authManager.confirmResetPassword('reset_token', 'newPassword')
      ).resolves.not.toThrow();
    });
  });

  describe('OAuth2 Authentication', () => {
    it('should generate authorization URL for Google', async () => {
      const authUrl = await authManager.initiateOAuth('google');

      expect(authUrl).toContain('accounts.google.com');
      expect(authUrl).toContain('client_id=');
      expect(authUrl).toContain('response_type=code');
    });

    it('should generate authorization URL for GitHub', async () => {
      const authUrl = await authManager.initiateOAuth('github');

      expect(authUrl).toContain('github.com');
    });

    it('should generate authorization URL for Microsoft', async () => {
      const authUrl = await authManager.initiateOAuth('microsoft');

      expect(authUrl).toContain('login.microsoftonline.com');
    });

    it('should reject unknown OAuth provider', async () => {
      await expect(
        authManager.initiateOAuth('unknown_provider')
      ).rejects.toThrow("OAuth provider 'unknown_provider' not configured");
    });

    it('should store OAuth state', async () => {
      await authManager.initiateOAuth('google');

      expect(localStorage.setItem).toHaveBeenCalledWith('oauth_state', expect.any(String));
      expect(localStorage.setItem).toHaveBeenCalledWith('oauth_provider', 'google');
    });
  });

  describe('Email Verification', () => {
    it('should verify email when authenticated', async () => {
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123',
      });

      await expect(
        authManager.verifyEmail('verification_token')
      ).resolves.not.toThrow();
    });

    it('should resend verification email when authenticated', async () => {
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123',
      });

      await expect(
        authManager.resendVerificationEmail()
      ).resolves.not.toThrow();
    });

    it('should reject resend when not authenticated', async () => {
      await expect(
        authManager.resendVerificationEmail()
      ).rejects.toThrow('User not authenticated');
    });
  });

  describe('Auth Header', () => {
    it('should return empty string when not authenticated', () => {
      expect(authManager.getAuthHeader()).toBe('');
    });

    it('should return Bearer token when authenticated', async () => {
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123',
      });

      expect(authManager.getAuthHeader()).toBe('Bearer mock-jwt-access-token');
    });
  });
});
