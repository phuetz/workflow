/**
 * Comprehensive tests for OAuth2 Refactored Modules
 * Tests ProviderRegistry, TokenManager, AuthorizationFlow, GrantHandlers, and SupportingClasses
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProviderRegistry } from '../../auth/oauth2/ProviderRegistry';
import { TokenManager } from '../../auth/oauth2/TokenManager';
import { AuthorizationFlow } from '../../auth/oauth2/AuthorizationFlow';
import { GrantHandlers } from '../../auth/oauth2/GrantHandlers';
import {
  TokenStore,
  SessionManager,
  ConsentManager,
  PKCEValidator,
  JWTService
} from '../../auth/oauth2/SupportingClasses';

// Mock crypto
vi.mock('crypto', async () => {
  const actual = await vi.importActual('crypto');
  return {
    ...actual,
    randomBytes: (size: number) => ({
      toString: (encoding: string) => {
        return 'random_' + Math.random().toString(36).substring(2, 15);
      }
    })
  };
});

describe('OAuth2 Refactored Modules', () => {
  // ============================================================================
  // PROVIDER REGISTRY TESTS
  // ============================================================================

  describe('ProviderRegistry', () => {
    let registry: ProviderRegistry;

    beforeEach(() => {
      registry = new ProviderRegistry();
    });

    describe('Client Management', () => {
      it('should register a new client', async () => {
        const client = await registry.registerClient({
          name: 'Test App',
          redirectUris: ['http://localhost:3000/callback']
        });

        expect(client.id).toBeDefined();
        expect(client.secret).toBeDefined();
        expect(client.name).toBe('Test App');
      });

      it('should assign default values to new clients', async () => {
        const client = await registry.registerClient({
          name: 'Test App'
        });

        expect(client.allowedGrantTypes).toContain('authorization_code');
        expect(client.allowedResponseTypes).toContain('code');
        expect(client.allowedScopes).toContain('openid');
      });

      it('should update an existing client', async () => {
        const client = await registry.registerClient({ name: 'Original' });
        // Wait a small delay to ensure updatedAt is different
        await new Promise(resolve => setTimeout(resolve, 5));
        const updated = await registry.updateClient(client.id, { name: 'Updated' });

        expect(updated.name).toBe('Updated');
        expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(client.createdAt.getTime());
      });

      it('should throw error when updating non-existent client', async () => {
        await expect(
          registry.updateClient('non-existent', { name: 'Test' })
        ).rejects.toThrow('Client non-existent not found');
      });

      it('should delete a client', async () => {
        const client = await registry.registerClient({ name: 'To Delete' });
        await registry.deleteClient(client.id);

        expect(registry.getClient(client.id)).toBeUndefined();
      });

      it('should throw error when deleting non-existent client', async () => {
        await expect(
          registry.deleteClient('non-existent')
        ).rejects.toThrow('Client non-existent not found');
      });

      it('should get client by ID', async () => {
        const created = await registry.registerClient({ name: 'Test' });
        const retrieved = registry.getClient(created.id);

        expect(retrieved?.id).toBe(created.id);
      });

      it('should list all clients', async () => {
        await registry.registerClient({ name: 'Client 1' });
        await registry.registerClient({ name: 'Client 2' });

        const clients = registry.listClients();

        expect(clients.length).toBe(2);
      });

      it('should filter clients by owner', async () => {
        await registry.registerClient({ name: 'C1', metadata: { owner: 'user1' } });
        await registry.registerClient({ name: 'C2', metadata: { owner: 'user2' } });

        const filtered = registry.listClients({ metadata: { owner: 'user1' } });

        expect(filtered.length).toBe(1);
        expect(filtered[0].name).toBe('C1');
      });

      it('should validate client with correct secret', async () => {
        const client = await registry.registerClient({ name: 'Test' });
        const validated = await registry.validateClient(client.id, client.secret);

        expect(validated.id).toBe(client.id);
      });

      it('should throw error for invalid client credentials', async () => {
        const client = await registry.registerClient({ name: 'Test' });

        await expect(
          registry.validateClient(client.id, 'wrong-secret')
        ).rejects.toThrow('Invalid client credentials');
      });

      it('should validate client without secret when auth method is none', async () => {
        const client = await registry.registerClient({
          name: 'Public Client',
          settings: { tokenEndpointAuthMethod: 'none' }
        });

        const validated = await registry.validateClient(client.id);
        expect(validated.id).toBe(client.id);
      });

      it('should emit events on client operations', async () => {
        const listener = vi.fn();
        registry.on('clientRegistered', listener);

        await registry.registerClient({ name: 'Test' });

        expect(listener).toHaveBeenCalled();
      });
    });

    describe('Scope Management', () => {
      it('should have default scopes initialized', () => {
        const scopes = registry.listScopes();

        expect(scopes.some(s => s.name === 'openid')).toBe(true);
        expect(scopes.some(s => s.name === 'profile')).toBe(true);
        expect(scopes.some(s => s.name === 'email')).toBe(true);
      });

      it('should register a custom scope', () => {
        registry.registerScope({
          name: 'custom:read',
          displayName: 'Custom Read',
          description: 'Read custom data'
        });

        const scope = registry.getScope('custom:read');
        expect(scope?.name).toBe('custom:read');
      });

      it('should get scopes map', () => {
        const scopesMap = registry.getScopesMap();

        expect(scopesMap instanceof Map).toBe(true);
        expect(scopesMap.has('openid')).toBe(true);
      });
    });

    describe('Authorization Code Management', () => {
      it('should set and get authorization code', () => {
        const authCode = {
          code: 'test-code',
          clientId: 'client-1',
          userId: 'user-1',
          redirectUri: 'http://localhost/callback',
          scope: 'openid',
          expiresAt: new Date(Date.now() + 600000)
        };

        registry.setAuthorizationCode('test-code', authCode);
        const retrieved = registry.getAuthorizationCode('test-code');

        expect(retrieved?.code).toBe('test-code');
      });

      it('should delete authorization code', () => {
        registry.setAuthorizationCode('to-delete', {
          code: 'to-delete',
          clientId: 'client',
          userId: 'user',
          redirectUri: 'http://localhost',
          scope: 'openid',
          expiresAt: new Date()
        });

        registry.deleteAuthorizationCode('to-delete');

        expect(registry.getAuthorizationCode('to-delete')).toBeUndefined();
      });
    });

    describe('Device Code Management', () => {
      it('should set and get device code', () => {
        const deviceCode = {
          deviceCode: 'device-123',
          userCode: 'USER-CODE',
          clientId: 'client-1',
          scope: 'openid',
          expiresAt: new Date(Date.now() + 1800000),
          interval: 5
        };

        registry.setDeviceCode('device-123', deviceCode);
        const retrieved = registry.getDeviceCode('device-123');

        expect(retrieved?.userCode).toBe('USER-CODE');
      });

      it('should delete device code', () => {
        registry.setDeviceCode('to-delete', {
          deviceCode: 'to-delete',
          userCode: 'CODE',
          clientId: 'client',
          scope: 'openid',
          expiresAt: new Date(),
          interval: 5
        });

        registry.deleteDeviceCode('to-delete');

        expect(registry.getDeviceCode('to-delete')).toBeUndefined();
      });
    });

    describe('Configuration', () => {
      it('should return security config', () => {
        const config = registry.getSecurityConfig();

        expect(config.requireHttps).toBeDefined();
        expect(config.rateLimiting).toBeDefined();
      });

      it('should return JWKS', () => {
        const jwks = registry.getJWKS();

        expect(jwks.keys).toBeDefined();
        expect(jwks.keys.length).toBeGreaterThan(0);
      });

      it('should return metrics', () => {
        const metrics = registry.getMetrics();

        expect(metrics.totalClients).toBeDefined();
        expect(metrics.totalTokensIssued).toBeDefined();
      });

      it('should update metrics', () => {
        registry.updateMetrics({ totalTokensIssued: 100 });
        const metrics = registry.getMetrics();

        expect(metrics.totalTokensIssued).toBe(100);
      });

      it('should return issuer URL', () => {
        const issuer = registry.getIssuer();

        expect(issuer).toBeDefined();
        expect(typeof issuer).toBe('string');
      });
    });
  });

  // ============================================================================
  // TOKEN MANAGER TESTS
  // ============================================================================

  describe('TokenManager', () => {
    let tokenManager: TokenManager;
    let registry: ProviderRegistry;

    beforeEach(() => {
      tokenManager = new TokenManager('test-signing-key');
      registry = new ProviderRegistry();
    });

    describe('Token Generation', () => {
      it('should generate access token', async () => {
        const client = await registry.registerClient({ name: 'Test' });
        const token = await tokenManager.generateAccessToken(
          client,
          'user-1',
          'openid profile',
          'session-1'
        );

        expect(token.token).toBeDefined();
        expect(token.tokenType).toBe('Bearer');
        expect(token.clientId).toBe(client.id);
      });

      it('should generate refresh token', async () => {
        const client = await registry.registerClient({ name: 'Test' });
        const token = await tokenManager.generateRefreshToken(
          client,
          'user-1',
          'openid'
        );

        expect(token.token).toBeDefined();
        expect(token.family).toBeDefined();
      });

      it('should generate ID token', async () => {
        const client = await registry.registerClient({ name: 'Test' });
        const idToken = await tokenManager.generateIdToken(
          client.id,
          'user-1',
          'nonce-123',
          'session-1'
        );

        expect(idToken).toBeDefined();
        expect(idToken.split('.')).toHaveLength(3);
      });

      it('should generate complete token set', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          allowedGrantTypes: ['authorization_code', 'refresh_token']
        });
        const tokenSet = await tokenManager.generateTokenSet(
          client,
          'user-1',
          'openid profile',
          'session-1'
        );

        expect(tokenSet.access_token).toBeDefined();
        expect(tokenSet.refresh_token).toBeDefined();
        expect(tokenSet.token_type).toBe('Bearer');
      });

      it('should include id_token when openid scope present', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          allowedGrantTypes: ['authorization_code', 'refresh_token']
        });
        const tokenSet = await tokenManager.generateTokenSet(
          client,
          'user-1',
          'openid email',
          'session-1'
        );

        expect(tokenSet.id_token).toBeDefined();
      });
    });

    describe('Token Retrieval', () => {
      it('should retrieve access token', async () => {
        const client = await registry.registerClient({ name: 'Test' });
        const generated = await tokenManager.generateAccessToken(
          client,
          'user-1',
          'openid',
          'session-1'
        );

        const retrieved = tokenManager.getAccessToken(generated.token);

        expect(retrieved?.token).toBe(generated.token);
      });

      it('should retrieve refresh token', async () => {
        const client = await registry.registerClient({ name: 'Test' });
        const generated = await tokenManager.generateRefreshToken(
          client,
          'user-1',
          'openid'
        );

        const retrieved = tokenManager.getRefreshToken(generated.token);

        expect(retrieved?.token).toBe(generated.token);
      });
    });

    describe('Token Introspection', () => {
      it('should introspect valid access token', async () => {
        const client = await registry.registerClient({ name: 'Test' });
        const token = await tokenManager.generateAccessToken(
          client,
          'user-1',
          'openid',
          'session-1'
        );

        const introspection = await tokenManager.introspect(token.token);

        expect(introspection.active).toBe(true);
        expect(introspection.client_id).toBe(client.id);
      });

      it('should return inactive for unknown token', async () => {
        const introspection = await tokenManager.introspect('unknown-token');

        expect(introspection.active).toBe(false);
      });

      it('should introspect with token type hint', async () => {
        const client = await registry.registerClient({ name: 'Test' });
        const refreshToken = await tokenManager.generateRefreshToken(
          client,
          'user-1',
          'openid'
        );

        const introspection = await tokenManager.introspect(
          refreshToken.token,
          'refresh_token'
        );

        expect(introspection.active).toBe(true);
      });
    });

    describe('Token Revocation', () => {
      it('should revoke access token', async () => {
        const client = await registry.registerClient({ name: 'Test' });
        const token = await tokenManager.generateAccessToken(
          client,
          'user-1',
          'openid',
          'session-1'
        );

        await tokenManager.revoke({ token: token.token, token_type_hint: 'access_token' });

        expect(tokenManager.getAccessToken(token.token)).toBeUndefined();
      });

      it('should revoke refresh token', async () => {
        const client = await registry.registerClient({ name: 'Test' });
        const token = await tokenManager.generateRefreshToken(
          client,
          'user-1',
          'openid'
        );

        await tokenManager.revoke({ token: token.token, token_type_hint: 'refresh_token' });

        expect(tokenManager.getRefreshToken(token.token)).toBeUndefined();
      });

      it('should revoke all client tokens', async () => {
        const client = await registry.registerClient({ name: 'Test' });
        await tokenManager.generateAccessToken(client, 'user-1', 'openid', 'session-1');
        await tokenManager.generateAccessToken(client, 'user-2', 'openid', 'session-2');

        await tokenManager.revokeClientTokens(client.id);

        const tokens = Array.from(tokenManager.getAccessTokensMap().values());
        const clientTokens = tokens.filter(t => t.clientId === client.id);
        expect(clientTokens.length).toBe(0);
      });

      it('should emit event on token revocation', async () => {
        const listener = vi.fn();
        tokenManager.on('tokenRevoked', listener);

        const client = await registry.registerClient({ name: 'Test' });
        const token = await tokenManager.generateAccessToken(
          client,
          'user-1',
          'openid',
          'session-1'
        );

        await tokenManager.revoke({ token: token.token });

        expect(listener).toHaveBeenCalled();
      });
    });

    describe('Session Management', () => {
      it('should set and get session', () => {
        const session = {
          id: 'session-1',
          userId: 'user-1',
          authTime: new Date(),
          lastActivity: new Date()
        };

        tokenManager.setSession('session-1', session);
        const retrieved = tokenManager.getSession('session-1');

        expect(retrieved?.userId).toBe('user-1');
      });
    });

    describe('Token Cleanup', () => {
      it('should clean up expired tokens', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          settings: { accessTokenLifetime: -1 }
        });

        const token = await tokenManager.generateAccessToken(
          client,
          'user-1',
          'openid',
          'session-1'
        );

        await tokenManager.cleanup();

        expect(tokenManager.getAccessToken(token.token)).toBeUndefined();
      });
    });
  });

  // ============================================================================
  // AUTHORIZATION FLOW TESTS
  // ============================================================================

  describe('AuthorizationFlow', () => {
    let authFlow: AuthorizationFlow;
    let registry: ProviderRegistry;
    let tokenManager: TokenManager;

    beforeEach(() => {
      registry = new ProviderRegistry();
      tokenManager = new TokenManager('test-key');
      authFlow = new AuthorizationFlow(registry, tokenManager);
    });

    describe('Authorization Endpoint', () => {
      it('should authorize with code response type', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          redirectUris: ['http://localhost/callback'],
          allowedResponseTypes: ['code'],
          metadata: { trusted: true }
        });

        const result = await authFlow.authorize({
          clientId: client.id,
          redirectUri: 'http://localhost/callback',
          responseType: 'code',
          scope: 'openid'
        }, 'user-1');

        expect(result.redirectUri).toContain('code=');
      });

      it('should include state in redirect', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          redirectUris: ['http://localhost/callback'],
          allowedResponseTypes: ['code'],
          metadata: { trusted: true }
        });

        const result = await authFlow.authorize({
          clientId: client.id,
          redirectUri: 'http://localhost/callback',
          responseType: 'code',
          scope: 'openid',
          state: 'state-123'
        }, 'user-1');

        expect(result.redirectUri).toContain('state=state-123');
      });

      it('should throw error for invalid client', async () => {
        await expect(
          authFlow.authorize({
            clientId: 'invalid',
            redirectUri: 'http://localhost/callback',
            responseType: 'code',
            scope: 'openid'
          }, 'user-1')
        ).rejects.toThrow('Invalid client_id');
      });

      it('should throw error for invalid redirect URI', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          redirectUris: ['http://localhost/callback']
        });

        await expect(
          authFlow.authorize({
            clientId: client.id,
            redirectUri: 'http://evil.com/callback',
            responseType: 'code',
            scope: 'openid'
          }, 'user-1')
        ).rejects.toThrow('Invalid redirect_uri');
      });

      it('should handle implicit flow', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          redirectUris: ['http://localhost/callback'],
          allowedResponseTypes: ['token'],
          metadata: { trusted: true }
        });

        const result = await authFlow.authorize({
          clientId: client.id,
          redirectUri: 'http://localhost/callback',
          responseType: 'token',
          scope: 'openid'
        }, 'user-1');

        expect(result.redirectUri).toContain('access_token=');
      });

      it('should require consent for untrusted clients', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          redirectUris: ['http://localhost/callback'],
          allowedResponseTypes: ['code'],
          settings: { requireConsent: true }
        });

        const result = await authFlow.authorize({
          clientId: client.id,
          redirectUri: 'http://localhost/callback',
          responseType: 'code',
          scope: 'openid profile'
        }, 'user-1');

        expect(result.requireConsent).toBe(true);
      });
    });

    describe('Token Endpoint', () => {
      it('should exchange authorization code for tokens', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          redirectUris: ['http://localhost/callback'],
          allowedResponseTypes: ['code'],
          allowedGrantTypes: ['authorization_code', 'refresh_token'],
          metadata: { trusted: true }
        });

        const authResult = await authFlow.authorize({
          clientId: client.id,
          redirectUri: 'http://localhost/callback',
          responseType: 'code',
          scope: 'openid'
        }, 'user-1');

        const redirectUrl = new URL(authResult.redirectUri);
        const code = redirectUrl.searchParams.get('code');

        const tokens = await authFlow.token({
          grantType: 'authorization_code',
          code: code!,
          clientId: client.id,
          clientSecret: client.secret,
          redirectUri: 'http://localhost/callback'
        });

        expect(tokens.access_token).toBeDefined();
      });

      it('should throw error for unsupported grant type', async () => {
        await expect(
          authFlow.token({
            grantType: 'invalid_grant' as any,
            clientId: 'client-1'
          })
        ).rejects.toThrow('Unsupported grant_type');
      });
    });

    describe('Discovery Document', () => {
      it('should return discovery document', () => {
        const discovery = authFlow.getDiscoveryDocument();

        expect(discovery.issuer).toBeDefined();
        expect(discovery.authorization_endpoint).toBeDefined();
        expect(discovery.token_endpoint).toBeDefined();
        expect(discovery.jwks_uri).toBeDefined();
      });

      it('should include supported response types', () => {
        const discovery = authFlow.getDiscoveryDocument();

        expect(discovery.response_types_supported).toContain('code');
        expect(discovery.response_types_supported).toContain('token');
      });

      it('should include supported grant types', () => {
        const discovery = authFlow.getDiscoveryDocument();

        expect(discovery.grant_types_supported).toContain('authorization_code');
        expect(discovery.grant_types_supported).toContain('refresh_token');
      });
    });
  });

  // ============================================================================
  // GRANT HANDLERS TESTS
  // ============================================================================

  describe('GrantHandlers', () => {
    let grantHandlers: GrantHandlers;
    let registry: ProviderRegistry;
    let tokenManager: TokenManager;

    beforeEach(() => {
      registry = new ProviderRegistry();
      tokenManager = new TokenManager('test-key');
      grantHandlers = new GrantHandlers(registry, tokenManager);
    });

    describe('Authorization Code Grant', () => {
      it('should handle authorization code grant', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          allowedGrantTypes: ['authorization_code', 'refresh_token']
        });

        const authCode = {
          code: 'test-code',
          clientId: client.id,
          userId: 'user-1',
          redirectUri: 'http://localhost/callback',
          scope: 'openid',
          sessionId: 'session-1',
          expiresAt: new Date(Date.now() + 600000)
        };

        registry.setAuthorizationCode('test-code', authCode);

        const tokens = await grantHandlers.handleAuthorizationCodeGrant({
          grantType: 'authorization_code',
          code: 'test-code',
          clientId: client.id,
          clientSecret: client.secret,
          redirectUri: 'http://localhost/callback'
        });

        expect(tokens.access_token).toBeDefined();
      });

      it('should throw error for missing code', async () => {
        await expect(
          grantHandlers.handleAuthorizationCodeGrant({
            grantType: 'authorization_code',
            clientId: 'client-1'
          })
        ).rejects.toThrow('Missing authorization code');
      });

      it('should throw error for invalid code', async () => {
        await expect(
          grantHandlers.handleAuthorizationCodeGrant({
            grantType: 'authorization_code',
            code: 'invalid-code',
            clientId: 'client-1'
          })
        ).rejects.toThrow('Invalid authorization code');
      });

      it('should validate PKCE', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          allowedGrantTypes: ['authorization_code']
        });

        const authCode = {
          code: 'pkce-code',
          clientId: client.id,
          userId: 'user-1',
          redirectUri: 'http://localhost/callback',
          scope: 'openid',
          codeChallenge: 'challenge',
          codeChallengeMethod: 'S256' as const,
          expiresAt: new Date(Date.now() + 600000)
        };

        registry.setAuthorizationCode('pkce-code', authCode);

        await expect(
          grantHandlers.handleAuthorizationCodeGrant({
            grantType: 'authorization_code',
            code: 'pkce-code',
            clientId: client.id,
            clientSecret: client.secret,
            redirectUri: 'http://localhost/callback'
          })
        ).rejects.toThrow('Missing code_verifier');
      });
    });

    describe('Refresh Token Grant', () => {
      it('should handle refresh token grant', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          allowedGrantTypes: ['authorization_code', 'refresh_token']
        });

        const refreshToken = await tokenManager.generateRefreshToken(
          client,
          'user-1',
          'openid'
        );

        const tokens = await grantHandlers.handleRefreshTokenGrant({
          grantType: 'refresh_token',
          refreshToken: refreshToken.token,
          clientId: client.id,
          clientSecret: client.secret
        });

        expect(tokens.access_token).toBeDefined();
      });

      it('should throw error for missing refresh token', async () => {
        await expect(
          grantHandlers.handleRefreshTokenGrant({
            grantType: 'refresh_token',
            clientId: 'client-1'
          })
        ).rejects.toThrow('Missing refresh_token');
      });

      it('should throw error for invalid refresh token', async () => {
        await expect(
          grantHandlers.handleRefreshTokenGrant({
            grantType: 'refresh_token',
            refreshToken: 'invalid-token',
            clientId: 'client-1'
          })
        ).rejects.toThrow('Invalid refresh_token');
      });
    });

    describe('Client Credentials Grant', () => {
      it('should handle client credentials grant', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          allowedGrantTypes: ['client_credentials']
        });

        const tokens = await grantHandlers.handleClientCredentialsGrant({
          grantType: 'client_credentials',
          clientId: client.id,
          clientSecret: client.secret,
          scope: 'read:data'
        });

        expect(tokens.access_token).toBeDefined();
        expect(tokens.token_type).toBe('Bearer');
      });

      it('should throw error if grant type not allowed', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          allowedGrantTypes: ['authorization_code']
        });

        await expect(
          grantHandlers.handleClientCredentialsGrant({
            grantType: 'client_credentials',
            clientId: client.id,
            clientSecret: client.secret
          })
        ).rejects.toThrow('Grant type not allowed for client');
      });
    });

    describe('Password Grant', () => {
      it('should handle password grant', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          allowedGrantTypes: ['password', 'refresh_token']
        });

        const tokens = await grantHandlers.handlePasswordGrant({
          grantType: 'password',
          username: 'testuser',
          password: 'password123',
          clientId: client.id,
          clientSecret: client.secret
        });

        expect(tokens.access_token).toBeDefined();
      });

      it('should throw error for missing credentials', async () => {
        await expect(
          grantHandlers.handlePasswordGrant({
            grantType: 'password',
            clientId: 'client-1'
          })
        ).rejects.toThrow('Missing username or password');
      });
    });

    describe('Device Code Grant', () => {
      it('should return pending when not authorized', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          allowedGrantTypes: ['device_code']
        });

        registry.setDeviceCode('device-code', {
          deviceCode: 'device-code',
          userCode: 'USER-CODE',
          clientId: client.id,
          scope: 'openid',
          expiresAt: new Date(Date.now() + 1800000),
          interval: 5
        });

        const result = await grantHandlers.handleDeviceCodeGrant({
          grantType: 'device_code',
          deviceCode: 'device-code',
          clientId: client.id
        });

        expect(result.error).toBe('authorization_pending');
      });

      it('should return tokens when authorized', async () => {
        const client = await registry.registerClient({
          name: 'Test',
          allowedGrantTypes: ['device_code', 'refresh_token']
        });

        registry.setDeviceCode('auth-device', {
          deviceCode: 'auth-device',
          userCode: 'USER-CODE',
          clientId: client.id,
          userId: 'user-1',
          scope: 'openid',
          expiresAt: new Date(Date.now() + 1800000),
          interval: 5,
          authorizedAt: new Date()
        });

        const tokens = await grantHandlers.handleDeviceCodeGrant({
          grantType: 'device_code',
          deviceCode: 'auth-device',
          clientId: client.id,
          clientSecret: client.secret
        });

        expect(tokens.access_token).toBeDefined();
      });
    });
  });

  // ============================================================================
  // SUPPORTING CLASSES TESTS
  // ============================================================================

  describe('TokenStore', () => {
    let tokenStore: TokenStore;

    beforeEach(() => {
      tokenStore = new TokenStore();
    });

    it('should store token', async () => {
      await tokenStore.store('token-1', { data: 'test' });
      const retrieved = await tokenStore.retrieve('token-1');

      expect(retrieved.data).toBe('test');
    });

    it('should delete token', async () => {
      await tokenStore.store('token-1', { data: 'test' });
      await tokenStore.delete('token-1');
      const retrieved = await tokenStore.retrieve('token-1');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('SessionManager', () => {
    let sessionManager: SessionManager;

    beforeEach(() => {
      sessionManager = new SessionManager();
    });

    it('should create session', async () => {
      const session = await sessionManager.createSession('user-1', 'client-1');

      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user-1');
    });

    it('should get session', async () => {
      const created = await sessionManager.createSession('user-1');
      const retrieved = await sessionManager.getSession(created.id);

      expect(retrieved?.id).toBe(created.id);
    });

    it('should update session', async () => {
      const session = await sessionManager.createSession('user-1');
      await sessionManager.updateSession(session.id, { acr: '2' });
      const updated = await sessionManager.getSession(session.id);

      expect(updated?.acr).toBe('2');
    });

    it('should delete session', async () => {
      const session = await sessionManager.createSession('user-1');
      await sessionManager.deleteSession(session.id);
      const deleted = await sessionManager.getSession(session.id);

      expect(deleted).toBeUndefined();
    });
  });

  describe('ConsentManager', () => {
    let consentManager: ConsentManager;

    beforeEach(() => {
      consentManager = new ConsentManager();
    });

    it('should grant consent', async () => {
      await consentManager.grantConsent('user-1', 'client-1', ['openid', 'profile']);
      const hasConsent = await consentManager.checkConsent(
        'user-1',
        'client-1',
        ['openid', 'profile']
      );

      expect(hasConsent).toBe(true);
    });

    it('should check partial consent', async () => {
      await consentManager.grantConsent('user-1', 'client-1', ['openid']);
      const hasConsent = await consentManager.checkConsent(
        'user-1',
        'client-1',
        ['openid', 'profile']
      );

      expect(hasConsent).toBe(false);
    });

    it('should revoke consent', async () => {
      await consentManager.grantConsent('user-1', 'client-1', ['openid']);
      await consentManager.revokeConsent('user-1', 'client-1');
      const hasConsent = await consentManager.checkConsent(
        'user-1',
        'client-1',
        ['openid']
      );

      expect(hasConsent).toBe(false);
    });
  });

  describe('PKCEValidator', () => {
    let pkceValidator: PKCEValidator;

    beforeEach(() => {
      pkceValidator = new PKCEValidator();
    });

    it('should validate plain method', () => {
      const verifier = 'test-verifier';
      const result = pkceValidator.validate(verifier, verifier, 'plain');

      expect(result).toBe(true);
    });

    it('should validate S256 method', () => {
      const verifier = 'test-verifier';
      const crypto = require('crypto');
      const challenge = crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');

      const result = pkceValidator.validate(verifier, challenge, 'S256');

      expect(result).toBe(true);
    });

    it('should reject invalid verifier', () => {
      const result = pkceValidator.validate('wrong', 'challenge', 'plain');

      expect(result).toBe(false);
    });
  });

  describe('JWTService', () => {
    let jwtService: JWTService;

    beforeEach(() => {
      jwtService = new JWTService('test-signing-key');
    });

    it('should sign payload', () => {
      const token = jwtService.sign({ sub: 'user-1', iat: Date.now() });

      expect(token.split('.')).toHaveLength(3);
    });

    it('should verify valid token', () => {
      const payload = { sub: 'user-1', iat: Date.now() };
      const token = jwtService.sign(payload);
      const verified = jwtService.verify(token);

      expect(verified.sub).toBe('user-1');
    });

    it('should reject tampered token', () => {
      const token = jwtService.sign({ sub: 'user-1' });
      const parts = token.split('.');
      parts[1] = Buffer.from(JSON.stringify({ sub: 'hacker' })).toString('base64url');
      const tampered = parts.join('.');

      expect(() => jwtService.verify(tampered)).toThrow('Invalid signature');
    });
  });
});
