/**
 * Comprehensive tests for OAuth2Service
 * Target coverage: >85% (statements, branches, functions, lines)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OAuth2Service } from '../../backend/auth/OAuth2Service';
import crypto from 'crypto';

// Mock dependencies
vi.mock('../../services/LoggingService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../../backend/security/EncryptionService', () => ({
  encryptionService: {
    encrypt: vi.fn((data) => `encrypted_${data}`),
    decrypt: vi.fn((data) => data.replace('encrypted_', ''))
  }
}));

// Mock crypto
vi.mock('crypto', async () => {
  const actual = await vi.importActual('crypto') as any;
  return {
    ...actual,
    default: {
      ...actual,
      randomBytes: (size: number) => ({
        toString: (encoding: string) => {
          if (encoding === 'base64url') {
            return 'random_' + Math.random().toString(36).substring(7);
          }
          return 'randomBytes';
        }
      }),
      createHash: (algorithm: string) => ({
        update: (data: string) => ({
          digest: (encoding: string) => {
            return `hash_${data}`;
          }
        })
      })
    }
  };
});

// Mock fetch
global.fetch = vi.fn();

describe('OAuth2Service', () => {
  let oauth2Service: OAuth2Service;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up environment variables for OAuth providers
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/oauth/google/callback';

    process.env.MICROSOFT_CLIENT_ID = 'microsoft-client-id';
    process.env.MICROSOFT_CLIENT_SECRET = 'microsoft-client-secret';

    process.env.GITHUB_CLIENT_ID = 'github-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'github-client-secret';

    oauth2Service = new OAuth2Service();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Initialization', () => {
    it('should initialize configured OAuth providers', () => {
      expect(oauth2Service.isProviderConfigured('google')).toBe(true);
      expect(oauth2Service.isProviderConfigured('microsoft')).toBe(true);
      expect(oauth2Service.isProviderConfigured('github')).toBe(true);
    });

    it('should not initialize providers without credentials', () => {
      // Create service without Slack credentials
      expect(oauth2Service.isProviderConfigured('slack')).toBe(false);
    });

    it('should get list of configured providers', () => {
      const providers = oauth2Service.getConfiguredProviders();

      expect(providers.length).toBeGreaterThan(0);
      expect(providers.some(p => p.name === 'google')).toBe(true);
      expect(providers.some(p => p.name === 'microsoft')).toBe(true);
      expect(providers.some(p => p.name === 'github')).toBe(true);
    });

    it('should include display names for providers', () => {
      const providers = oauth2Service.getConfiguredProviders();

      const googleProvider = providers.find(p => p.name === 'google');
      expect(googleProvider?.displayName).toBe('Google');
    });
  });

  describe('Authorization URL Generation', () => {
    it('should generate authorization URL for Google', async () => {
      const result = await oauth2Service.getAuthorizationUrl('google');

      expect(result.url).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(result.url).toContain('client_id=google-client-id');
      expect(result.url).toContain('response_type=code');
      expect(result.state).toBeTruthy();
    });

    it('should include required OAuth parameters', async () => {
      const result = await oauth2Service.getAuthorizationUrl('google');

      expect(result.url).toContain('redirect_uri=');
      expect(result.url).toContain('scope=');
      expect(result.url).toContain('state=');
      expect(result.url).toContain('access_type=offline');
      expect(result.url).toContain('prompt=consent');
    });

    it('should generate secure random state', async () => {
      const result1 = await oauth2Service.getAuthorizationUrl('google');
      const result2 = await oauth2Service.getAuthorizationUrl('google');

      expect(result1.state).not.toBe(result2.state);
    });

    it('should support custom state parameter', async () => {
      const customState = 'custom_state_12345';
      const result = await oauth2Service.getAuthorizationUrl('google', {
        state: customState
      });

      expect(result.state).toBe(customState);
    });

    it('should support custom scopes', async () => {
      const result = await oauth2Service.getAuthorizationUrl('google', {
        scope: ['openid', 'email']
      });

      expect(result.url).toContain('scope=openid%20email');
    });

    it('should use default scopes when not specified', async () => {
      const result = await oauth2Service.getAuthorizationUrl('google');

      expect(result.url).toContain('scope=');
    });

    it('should support PKCE flow', async () => {
      const result = await oauth2Service.getAuthorizationUrl('google', {
        usePKCE: true
      });

      expect(result.codeVerifier).toBeTruthy();
      expect(result.url).toContain('code_challenge=');
      expect(result.url).toContain('code_challenge_method=S256');
    });

    it('should throw error for unconfigured provider', async () => {
      await expect(
        oauth2Service.getAuthorizationUrl('invalid_provider')
      ).rejects.toThrow("OAuth2 provider 'invalid_provider' not configured");
    });

    it('should store pending request', async () => {
      const result = await oauth2Service.getAuthorizationUrl('google');

      expect(oauth2Service['pendingRequests'].has(result.state)).toBe(true);
    });

    it('should clean up expired requests on new authorization', async () => {
      // Create an old request
      const oldState = 'old_state';
      oauth2Service['pendingRequests'].set(oldState, {
        provider: 'google',
        state: oldState,
        redirectUri: 'http://localhost:3000/callback',
        scope: 'openid',
        createdAt: Date.now() - 20 * 60 * 1000 // 20 minutes ago (expired)
      });

      await oauth2Service.getAuthorizationUrl('google');

      expect(oauth2Service['pendingRequests'].has(oldState)).toBe(false);
    });
  });

  describe('Token Exchange', () => {
    it('should exchange authorization code for tokens', async () => {
      const authResult = await oauth2Service.getAuthorizationUrl('google');

      const mockTokenResponse = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        expires_in: 3600,
        scope: 'openid email',
        token_type: 'Bearer'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      } as Response);

      const tokens = await oauth2Service.exchangeCodeForTokens(
        'google',
        'auth_code_123',
        authResult.state
      );

      expect(tokens.accessToken).toBe('access_token_123');
      expect(tokens.refreshToken).toBe('refresh_token_123');
      expect(tokens.tokenType).toBe('Bearer');
      expect(tokens.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should validate state parameter', async () => {
      await expect(
        oauth2Service.exchangeCodeForTokens('google', 'code', 'invalid_state')
      ).rejects.toThrow('Invalid or expired OAuth2 state');
    });

    it('should validate provider match', async () => {
      const authResult = await oauth2Service.getAuthorizationUrl('google');

      await expect(
        oauth2Service.exchangeCodeForTokens('github', 'code', authResult.state)
      ).rejects.toThrow('Provider mismatch in OAuth2 callback');
    });

    it('should include PKCE verifier when used', async () => {
      const authResult = await oauth2Service.getAuthorizationUrl('google', {
        usePKCE: true
      });

      const mockTokenResponse = {
        access_token: 'access_token',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      const fetchMock = vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      } as Response);

      await oauth2Service.exchangeCodeForTokens('google', 'code', authResult.state);

      const fetchCall = fetchMock.mock.calls[0];
      const requestBody = fetchCall[1]?.body as string;
      expect(requestBody).toContain('code_verifier=');
    });

    it('should handle token exchange errors', async () => {
      const authResult = await oauth2Service.getAuthorizationUrl('google');

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid authorization code'
      } as Response);

      await expect(
        oauth2Service.exchangeCodeForTokens('google', 'invalid_code', authResult.state)
      ).rejects.toThrow('Token exchange failed');
    });

    it('should remove used state after successful exchange', async () => {
      const authResult = await oauth2Service.getAuthorizationUrl('google');

      const mockTokenResponse = {
        access_token: 'access_token',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      } as Response);

      await oauth2Service.exchangeCodeForTokens('google', 'code', authResult.state);

      expect(oauth2Service['pendingRequests'].has(authResult.state)).toBe(false);
    });

    it('should handle ID token in response', async () => {
      const authResult = await oauth2Service.getAuthorizationUrl('google');

      const mockTokenResponse = {
        access_token: 'access_token',
        id_token: 'id_token_jwt',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      } as Response);

      const tokens = await oauth2Service.exchangeCodeForTokens('google', 'code', authResult.state);

      expect(tokens.idToken).toBe('id_token_jwt');
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token', async () => {
      const mockRefreshResponse = {
        access_token: 'new_access_token',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRefreshResponse
      } as Response);

      const tokens = await oauth2Service.refreshAccessToken('google', 'refresh_token_123');

      expect(tokens.accessToken).toBe('new_access_token');
      expect(tokens.refreshToken).toBe('refresh_token_123'); // Original refresh token
      expect(tokens.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should use new refresh token if provided', async () => {
      const mockRefreshResponse = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRefreshResponse
      } as Response);

      const tokens = await oauth2Service.refreshAccessToken('google', 'old_refresh_token');

      expect(tokens.refreshToken).toBe('new_refresh_token');
    });

    it('should handle refresh errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Invalid refresh token',
        text: async () => 'Refresh token expired'
      } as Response);

      await expect(
        oauth2Service.refreshAccessToken('google', 'invalid_refresh_token')
      ).rejects.toThrow('Token refresh failed');
    });

    it('should throw error for unconfigured provider', async () => {
      await expect(
        oauth2Service.refreshAccessToken('invalid_provider', 'refresh_token')
      ).rejects.toThrow("OAuth2 provider 'invalid_provider' not configured");
    });
  });

  describe('Token Revocation', () => {
    it('should revoke access token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true
      } as Response);

      const result = await oauth2Service.revokeToken('google', 'access_token', 'access_token');

      expect(result).toBe(true);
    });

    it('should revoke refresh token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true
      } as Response);

      const result = await oauth2Service.revokeToken('google', 'refresh_token', 'refresh_token');

      expect(result).toBe(true);
    });

    it('should return false when revocation endpoint not available', async () => {
      const result = await oauth2Service.revokeToken('unknown_provider', 'token');

      expect(result).toBe(false);
    });

    it('should handle revocation errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400
      } as Response);

      const result = await oauth2Service.revokeToken('google', 'invalid_token');

      expect(result).toBe(false);
    });

    it('should throw error for unconfigured provider', async () => {
      await expect(
        oauth2Service.revokeToken('invalid_provider', 'token')
      ).rejects.toThrow("OAuth2 provider 'invalid_provider' not configured");
    });
  });

  describe('User Info Retrieval', () => {
    it('should get user info from Google', async () => {
      const mockUserInfo = {
        sub: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserInfo
      } as Response);

      const userInfo = await oauth2Service.getUserInfo('google', 'access_token');

      expect(userInfo.id).toBe('user-123');
      expect(userInfo.email).toBe('user@example.com');
      expect(userInfo.name).toBe('Test User');
      expect(userInfo.picture).toBe('https://example.com/photo.jpg');
      expect(userInfo.provider).toBe('google');
    });

    it('should normalize user info across providers', async () => {
      // Microsoft returns different field names
      const mockMicrosoftUser = {
        id: 'ms-user-123',
        userPrincipalName: 'user@company.com',
        displayName: 'MS User'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMicrosoftUser
      } as Response);

      const userInfo = await oauth2Service.getUserInfo('microsoft', 'access_token');

      expect(userInfo.id).toBe('ms-user-123');
      expect(userInfo.email).toBe('user@company.com');
      expect(userInfo.name).toBe('MS User');
    });

    it('should handle GitHub user info format', async () => {
      const mockGitHubUser = {
        id: 'gh-123',
        email: 'dev@github.com',
        login: 'developer',
        avatar_url: 'https://github.com/avatar.jpg'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGitHubUser
      } as Response);

      const userInfo = await oauth2Service.getUserInfo('github', 'access_token');

      expect(userInfo.id).toBe('gh-123');
      expect(userInfo.email).toBe('dev@github.com');
      expect(userInfo.name).toBe('developer');
      expect(userInfo.picture).toBe('https://github.com/avatar.jpg');
    });

    it('should throw error when user info fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized'
      } as Response);

      await expect(
        oauth2Service.getUserInfo('google', 'invalid_token')
      ).rejects.toThrow('Failed to fetch user info');
    });

    it('should throw error for provider without user info endpoint', async () => {
      // Remove google temporarily to test
      oauth2Service['providers'].delete('google');

      await expect(
        oauth2Service.getUserInfo('google', 'token')
      ).rejects.toThrow("User info not available for provider 'google'");
    });
  });

  describe('Token Expiration Checks', () => {
    it('should detect when token needs refresh', () => {
      const expiresAt = Date.now() + 4 * 60 * 1000; // 4 minutes from now

      expect(oauth2Service.needsRefresh(expiresAt)).toBe(true);
    });

    it('should not refresh token with sufficient time remaining', () => {
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

      expect(oauth2Service.needsRefresh(expiresAt)).toBe(false);
    });

    it('should consider 5 minute buffer for refresh', () => {
      const expiresAt = Date.now() + 5 * 60 * 1000 + 1000; // Just over 5 minutes

      expect(oauth2Service.needsRefresh(expiresAt)).toBe(false);
    });
  });

  describe('PKCE Support', () => {
    it('should generate code verifier', () => {
      const verifier1 = oauth2Service['generateCodeVerifier']();
      const verifier2 = oauth2Service['generateCodeVerifier']();

      expect(verifier1).toBeTruthy();
      expect(verifier2).toBeTruthy();
      expect(verifier1).not.toBe(verifier2);
    });

    it('should generate code challenge from verifier', () => {
      const verifier = 'test_verifier';
      const challenge = oauth2Service['generateCodeChallenge'](verifier);

      expect(challenge).toBeTruthy();
      expect(challenge).toContain('hash_');
    });

    it('should generate consistent challenge for same verifier', () => {
      const verifier = 'test_verifier';
      const challenge1 = oauth2Service['generateCodeChallenge'](verifier);
      const challenge2 = oauth2Service['generateCodeChallenge'](verifier);

      expect(challenge1).toBe(challenge2);
    });
  });

  describe('State Management', () => {
    it('should generate secure random state', () => {
      const state1 = oauth2Service['generateState']();
      const state2 = oauth2Service['generateState']();

      expect(state1).toBeTruthy();
      expect(state2).toBeTruthy();
      expect(state1).not.toBe(state2);
    });

    it('should expire old pending requests', async () => {
      // Create old request
      const oldState = 'old_state';
      oauth2Service['pendingRequests'].set(oldState, {
        provider: 'google',
        state: oldState,
        redirectUri: 'http://localhost:3000/callback',
        scope: 'openid',
        createdAt: Date.now() - 15 * 60 * 1000 // 15 minutes ago
      });

      // Trigger cleanup
      oauth2Service['cleanupExpiredRequests']();

      expect(oauth2Service['pendingRequests'].has(oldState)).toBe(false);
    });

    it('should keep recent pending requests', async () => {
      const recentState = 'recent_state';
      oauth2Service['pendingRequests'].set(recentState, {
        provider: 'google',
        state: recentState,
        redirectUri: 'http://localhost:3000/callback',
        scope: 'openid',
        createdAt: Date.now() - 5 * 60 * 1000 // 5 minutes ago
      });

      oauth2Service['cleanupExpiredRequests']();

      expect(oauth2Service['pendingRequests'].has(recentState)).toBe(true);
    });
  });

  describe('Multiple Providers', () => {
    it('should handle different providers independently', async () => {
      const googleUrl = await oauth2Service.getAuthorizationUrl('google');
      const githubUrl = await oauth2Service.getAuthorizationUrl('github');

      expect(googleUrl.url).toContain('accounts.google.com');
      expect(githubUrl.url).toContain('github.com');
      expect(googleUrl.state).not.toBe(githubUrl.state);
    });

    it('should support Microsoft tenant configuration', () => {
      process.env.MICROSOFT_TENANT_ID = 'my-tenant';
      const newService = new OAuth2Service();

      const provider = newService['providers'].get('microsoft');
      expect(provider?.authorizationUrl).toContain('my-tenant');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during token exchange', async () => {
      const authResult = await oauth2Service.getAuthorizationUrl('google');

      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        oauth2Service.exchangeCodeForTokens('google', 'code', authResult.state)
      ).rejects.toThrow('Network error');
    });

    it('should handle network errors during token refresh', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection timeout'));

      await expect(
        oauth2Service.refreshAccessToken('google', 'refresh_token')
      ).rejects.toThrow('Connection timeout');
    });

    it('should handle network errors during user info fetch', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network failure'));

      await expect(
        oauth2Service.getUserInfo('google', 'access_token')
      ).rejects.toThrow('Network failure');
    });

    it('should handle fetch errors during token revocation', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Revocation failed'));

      const result = await oauth2Service.revokeToken('google', 'token');

      expect(result).toBe(false);
    });
  });

  describe('Scope Handling', () => {
    it('should include default scopes for provider', async () => {
      const result = await oauth2Service.getAuthorizationUrl('google');

      expect(result.url).toContain('scope=');
      expect(decodeURIComponent(result.url)).toContain('https://www.googleapis.com/auth/userinfo.email');
    });

    it('should override with custom scopes', async () => {
      const customScopes = ['custom:scope1', 'custom:scope2'];
      const result = await oauth2Service.getAuthorizationUrl('google', {
        scope: customScopes
      });

      expect(result.url).toContain('scope=custom%3Ascope1%20custom%3Ascope2');
    });

    it('should handle empty custom scopes array', async () => {
      const result = await oauth2Service.getAuthorizationUrl('google', {
        scope: []
      });

      // Should use default scopes
      expect(result.url).toContain('scope=');
    });
  });

  describe('Provider Configuration', () => {
    it('should check if provider is configured', () => {
      expect(oauth2Service.isProviderConfigured('google')).toBe(true);
      expect(oauth2Service.isProviderConfigured('nonexistent')).toBe(false);
    });

    it('should return configured providers list', () => {
      const providers = oauth2Service.getConfiguredProviders();

      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
      expect(providers.every(p => p.name && p.displayName)).toBe(true);
    });
  });
});
