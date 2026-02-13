/**
 * OAuth2 Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OAuth2Service } from '../backend/auth/OAuth2Service';

describe('OAuth2Service', () => {
  let oauth2Service: OAuth2Service;

  beforeEach(() => {
    // Set up environment variables for testing
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';

    oauth2Service = new OAuth2Service();
  });

  describe('Provider Configuration', () => {
    it('should load configured providers', () => {
      const providers = oauth2Service.getConfiguredProviders();

      expect(providers.length).toBeGreaterThan(0);
      expect(providers.some(p => p.name === 'google')).toBe(true);
      expect(providers.some(p => p.name === 'github')).toBe(true);
    });

    it('should check if provider is configured', () => {
      expect(oauth2Service.isProviderConfigured('google')).toBe(true);
      expect(oauth2Service.isProviderConfigured('github')).toBe(true);
      expect(oauth2Service.isProviderConfigured('invalid')).toBe(false);
    });
  });

  describe('Authorization URL Generation', () => {
    it('should generate authorization URL', async () => {
      const { url, state } = await oauth2Service.getAuthorizationUrl('google');

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-google-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain(`state=${state}`);
      expect(state).toBeDefined();
      expect(state.length).toBeGreaterThan(20);
    });

    it('should include custom scopes', async () => {
      const { url } = await oauth2Service.getAuthorizationUrl('google', {
        scope: ['email', 'profile']
      });

      expect(url).toContain('scope=email+profile');
    });

    it('should support PKCE', async () => {
      const { url, codeVerifier } = await oauth2Service.getAuthorizationUrl('google', {
        usePKCE: true
      });

      expect(url).toContain('code_challenge=');
      expect(url).toContain('code_challenge_method=S256');
      expect(codeVerifier).toBeDefined();
      expect(codeVerifier!.length).toBeGreaterThan(20);
    });

    it('should throw error for unconfigured provider', async () => {
      await expect(
        oauth2Service.getAuthorizationUrl('invalid-provider')
      ).rejects.toThrow('not configured');
    });
  });

  describe('Token Exchange', () => {
    it('should exchange code for tokens', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-456',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'email profile'
        })
      });

      const { state } = await oauth2Service.getAuthorizationUrl('google');

      const tokens = await oauth2Service.exchangeCodeForTokens(
        'google',
        'auth-code-123',
        state
      );

      expect(tokens.accessToken).toBe('access-token-123');
      expect(tokens.refreshToken).toBe('refresh-token-456');
      expect(tokens.tokenType).toBe('Bearer');
      expect(tokens.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should reject invalid state', async () => {
      await expect(
        oauth2Service.exchangeCodeForTokens('google', 'code', 'invalid-state')
      ).rejects.toThrow('Invalid or expired OAuth2 state');
    });

    it('should handle token exchange errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid authorization code'
      });

      const { state } = await oauth2Service.getAuthorizationUrl('google');

      await expect(
        oauth2Service.exchangeCodeForTokens('google', 'invalid-code', state)
      ).rejects.toThrow('Token exchange failed');
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer'
        })
      });

      const tokens = await oauth2Service.refreshAccessToken(
        'google',
        'refresh-token-123'
      );

      expect(tokens.accessToken).toBe('new-access-token');
      expect(tokens.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should reuse refresh token if not returned', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          expires_in: 3600,
          token_type: 'Bearer'
        })
      });

      const tokens = await oauth2Service.refreshAccessToken(
        'google',
        'original-refresh-token'
      );

      expect(tokens.refreshToken).toBe('original-refresh-token');
    });

    it('should handle refresh errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid refresh token'
      });

      await expect(
        oauth2Service.refreshAccessToken('google', 'invalid-refresh-token')
      ).rejects.toThrow('Token refresh failed');
    });
  });

  describe('Token Revocation', () => {
    it('should revoke token', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      const result = await oauth2Service.revokeToken('google', 'token-123');

      expect(result).toBe(true);
    });

    it('should handle revocation errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400
      });

      const result = await oauth2Service.revokeToken('google', 'token-123');

      expect(result).toBe(false);
    });
  });

  describe('User Info', () => {
    it('should fetch user info', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: 'user-123',
          email: 'user@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg'
        })
      });

      const userInfo = await oauth2Service.getUserInfo('google', 'access-token');

      expect(userInfo.id).toBe('user-123');
      expect(userInfo.email).toBe('user@example.com');
      expect(userInfo.name).toBe('Test User');
      expect(userInfo.provider).toBe('google');
    });

    it('should handle user info errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(
        oauth2Service.getUserInfo('google', 'invalid-token')
      ).rejects.toThrow('Failed to fetch user info');
    });
  });

  describe('Token Expiration', () => {
    it('should detect when token needs refresh', () => {
      const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes

      const needsRefresh = oauth2Service.needsRefresh(expiresAt);

      expect(needsRefresh).toBe(true);
    });

    it('should not refresh when token is valid', () => {
      const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

      const needsRefresh = oauth2Service.needsRefresh(expiresAt);

      expect(needsRefresh).toBe(false);
    });
  });

  describe('PKCE Code Generation', () => {
    it('should generate valid code verifier', async () => {
      const { codeVerifier } = await oauth2Service.getAuthorizationUrl('google', {
        usePKCE: true
      });

      expect(codeVerifier).toBeDefined();
      expect(codeVerifier!.length).toBeGreaterThanOrEqual(43); // Base64URL encoded 32 bytes (RFC 7636: 43-128 chars)
      expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate different verifiers each time', async () => {
      const { codeVerifier: verifier1 } = await oauth2Service.getAuthorizationUrl('google', {
        usePKCE: true
      });

      const { codeVerifier: verifier2 } = await oauth2Service.getAuthorizationUrl('google', {
        usePKCE: true
      });

      expect(verifier1).not.toBe(verifier2);
    });
  });

  describe('State Management', () => {
    it('should generate unique state for each request', async () => {
      const { state: state1 } = await oauth2Service.getAuthorizationUrl('google');
      const { state: state2 } = await oauth2Service.getAuthorizationUrl('google');

      expect(state1).not.toBe(state2);
    });

    it('should track pending requests', async () => {
      const { state } = await oauth2Service.getAuthorizationUrl('google');

      // State should be valid initially
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      });

      await oauth2Service.exchangeCodeForTokens('google', 'code', state);

      // State should be invalid after use
      await expect(
        oauth2Service.exchangeCodeForTokens('google', 'code', state)
      ).rejects.toThrow('Invalid or expired OAuth2 state');
    });
  });

  describe('Multi-Provider Support', () => {
    it('should handle Google', async () => {
      const { url } = await oauth2Service.getAuthorizationUrl('google');
      expect(url).toContain('accounts.google.com');
    });

    it('should handle GitHub', async () => {
      const { url } = await oauth2Service.getAuthorizationUrl('github');
      expect(url).toContain('github.com');
    });

    it('should maintain separate states per provider', async () => {
      const { state: googleState } = await oauth2Service.getAuthorizationUrl('google');
      const { state: githubState } = await oauth2Service.getAuthorizationUrl('github');

      expect(googleState).not.toBe(githubState);

      // Google state should not work for GitHub
      await expect(
        oauth2Service.exchangeCodeForTokens('github', 'code', googleState)
      ).rejects.toThrow('Provider mismatch');
    });
  });
});
