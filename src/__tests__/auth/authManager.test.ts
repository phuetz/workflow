/**
 * Comprehensive tests for AuthManager
 * Target coverage: >85% (statements, branches, functions, lines)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

// Mock crypto for secure random generation
global.crypto = {
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(7)
} as any;

describe('AuthManager', () => {
  let authManager: AuthManager;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'admin@workflowbuilder.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin' as const,
    status: 'active' as const,
    permissions: [] as string[],
    emailVerified: true,
    lastLoginAt: new Date().toISOString()
  };

  const mockTokens = {
    accessToken: 'mock-jwt-access-token',
    refreshToken: 'mock-jwt-refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer' as const
  };

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

  describe('JWT Token Management', () => {
    it('should successfully login with valid credentials', async () => {
      const result = await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123'
      });

      expect(result.user.email).toBe('admin@workflowbuilder.com');
      expect(result.tokens.accessToken).toBe('mock-jwt-access-token');
      expect(result.tokens.refreshToken).toBe('mock-jwt-refresh-token');
    });

    it('should reject invalid credentials', async () => {
      await expect(authManager.login({
        email: 'test@example.com',
        password: 'wrong_password'
      })).rejects.toThrow('Invalid email or password');
    });

    it('should reject login for non-existent user', async () => {
      await expect(authManager.login({
        email: 'nonexistent@example.com',
        password: 'password123'
      })).rejects.toThrow('Invalid email or password');
    });
  });

  describe('Refresh Token Logic', () => {
    it('should issue refresh token with access token on login', async () => {
      const result = await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123'
      });

      expect(result.tokens.accessToken).toBeTruthy();
      expect(result.tokens.refreshToken).toBeTruthy();
      expect(result.tokens.expiresIn).toBe(3600);
    });

    it('should refresh access token with valid refresh token', async () => {
      // Login first to get tokens
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123'
      });

      const result = await authManager.refreshTokens();

      expect(result.accessToken).toBe('new-mock-jwt-access-token');
    });

    it('should throw error when no refresh token available', async () => {
      await expect(authManager.refreshTokens()).rejects.toThrow('No refresh token available');
    });
  });

  describe('Session Management', () => {
    it('should properly save session to localStorage', async () => {
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123'
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('auth_user', expect.any(String));
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_tokens', expect.any(String));
    });

    it('should clear session on logout', async () => {
      // Login first
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123'
      });

      await authManager.logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_user');
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_tokens');
      expect(authManager.getCurrentUser()).toBeNull();
      expect(authManager.getTokens()).toBeNull();
    });

    it('should check if user is authenticated', async () => {
      expect(authManager.isAuthenticated()).toBe(false);

      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123'
      });

      expect(authManager.isAuthenticated()).toBe(true);
    });

    it('should return correct auth header', async () => {
      expect(authManager.getAuthHeader()).toBe('');

      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123'
      });

      expect(authManager.getAuthHeader()).toBe('Bearer mock-jwt-access-token');
    });
  });

  describe('User Registration', () => {
    it('should successfully register new user', async () => {
      const result = await authManager.register({
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User'
      });

      expect(result.user.email).toBe('newuser@example.com');
      expect(result.tokens).toBeTruthy();
    });

    it('should return user with correct role', async () => {
      const result = await authManager.register({
        email: 'newuser@example.com',
        password: 'password123'
      });

      expect(result.user.role).toBe('user');
    });
  });

  describe('Password Management', () => {
    it('should change password when authenticated', async () => {
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123'
      });

      await expect(
        authManager.changePassword('admin123', 'newpassword123')
      ).resolves.not.toThrow();
    });

    it('should reject password change when not authenticated', async () => {
      await expect(
        authManager.changePassword('current', 'new')
      ).rejects.toThrow('User not authenticated');
    });

    it('should send password reset email', async () => {
      await expect(
        authManager.resetPassword('test@example.com')
      ).resolves.not.toThrow();
    });

    it('should confirm password reset', async () => {
      await expect(
        authManager.confirmResetPassword('reset_token', 'new_password')
      ).resolves.not.toThrow();
    });
  });

  describe('Email Verification', () => {
    it('should verify email with token', async () => {
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123'
      });

      await expect(
        authManager.verifyEmail('verification_token')
      ).resolves.not.toThrow();
    });

    it('should resend verification email when authenticated', async () => {
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123'
      });

      await expect(authManager.resendVerificationEmail()).resolves.not.toThrow();
    });

    it('should reject resend for unauthenticated user', async () => {
      await expect(authManager.resendVerificationEmail()).rejects.toThrow('User not authenticated');
    });
  });

  describe('OAuth2 Authentication', () => {
    it('should generate OAuth authorization URL', async () => {
      const authUrl = await authManager.initiateOAuth('google');

      expect(authUrl).toContain('accounts.google.com');
      expect(authUrl).toContain('client_id=');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('state=');
    });

    it('should throw error for unconfigured OAuth provider', async () => {
      await expect(authManager.initiateOAuth('invalid_provider')).rejects.toThrow(
        "OAuth provider 'invalid_provider' not configured"
      );
    });

    it('should store OAuth state in localStorage', async () => {
      await authManager.initiateOAuth('google');

      expect(localStorage.setItem).toHaveBeenCalledWith('oauth_state', expect.any(String));
      expect(localStorage.setItem).toHaveBeenCalledWith('oauth_provider', 'google');
    });

    it('should reject OAuth callback with invalid state', async () => {
      (localStorage.getItem as any).mockReturnValue(null);

      await expect(
        authManager.handleOAuthCallback('code', 'invalid_state', 'google')
      ).rejects.toThrow('Invalid OAuth state or provider');
    });
  });

  describe('Authorization Checks', () => {
    beforeEach(async () => {
      await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123'
      });
    });

    it('should check if user has permission', () => {
      expect(authManager.hasPermission('workflow.create')).toBe(true);
      expect(authManager.hasPermission('nonexistent.permission')).toBe(false);
    });

    it('should check if user has role', () => {
      expect(authManager.hasRole('admin')).toBe(true);
      expect(authManager.hasRole('user')).toBe(false);
    });

    it('should check if user has any role', () => {
      expect(authManager.hasAnyRole(['admin', 'user'])).toBe(true);
      expect(authManager.hasAnyRole(['viewer', 'guest'])).toBe(false);
    });

    it('should return false for permissions when not authenticated', async () => {
      await authManager.logout();

      expect(authManager.hasPermission('workflow.create')).toBe(false);
      expect(authManager.hasRole('admin')).toBe(false);
    });
  });

  describe('Security', () => {
    it('should generate secure random state for OAuth', async () => {
      const url1 = await authManager.initiateOAuth('google');

      // Create a new instance to get a different state
      const authManager2 = new AuthManager();
      const url2 = await authManager2.initiateOAuth('google');

      // Extract states from URLs
      const state1 = new URL(url1).searchParams.get('state');
      const state2 = new URL(url2).searchParams.get('state');

      expect(state1).toBeTruthy();
      expect(state2).toBeTruthy();
      expect(state1).not.toBe(state2);
      expect(state1!.length).toBeGreaterThan(32);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined gracefully', () => {
      expect(authManager.getCurrentUser()).toBeNull();
      expect(authManager.getTokens()).toBeNull();
      expect(authManager.isAuthenticated()).toBe(false);
    });

    it('should handle server-side environment (no localStorage)', () => {
      delete (global as any).localStorage;

      // Should not crash when localStorage is undefined
      const newAuthManager = new AuthManager();
      expect(newAuthManager.isAuthenticated()).toBe(false);
    });
  });

  describe('Permission System', () => {
    it('should assign correct permissions for admin role', async () => {
      const result = await authManager.login({
        email: 'admin@workflowbuilder.com',
        password: 'admin123'
      });

      expect(result.user.permissions).toContain('workflow.create');
      expect(result.user.permissions).toContain('workflow.delete');
      expect(result.user.permissions).toContain('user.create');
      expect(result.user.permissions).toContain('credential.delete');
    });

    it('should assign correct permissions for user role', async () => {
      const result = await authManager.register({
        email: 'regular@example.com',
        password: 'password123'
      });

      // Registered users get 'user' role
      expect(result.user.permissions).toContain('workflow.create');
      expect(result.user.permissions).toContain('workflow.read');
      expect(result.user.permissions).not.toContain('user.delete');
    });
  });

  describe('Multiple OAuth Providers', () => {
    it('should support Google OAuth', async () => {
      const authUrl = await authManager.initiateOAuth('google');
      expect(authUrl).toContain('accounts.google.com');
    });

    it('should support GitHub OAuth', async () => {
      const authUrl = await authManager.initiateOAuth('github');
      expect(authUrl).toContain('github.com');
    });

    it('should support Microsoft OAuth', async () => {
      const authUrl = await authManager.initiateOAuth('microsoft');
      expect(authUrl).toContain('login.microsoftonline.com');
    });
  });
});
