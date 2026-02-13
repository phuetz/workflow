/**
 * OAuth2 Token Manager
 * Handles token generation, storage, introspection and revocation
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import type {
  AccessToken,
  RefreshToken,
  OAuth2Client,
  TokenMetadata,
  TokenIntrospection,
  TokenRevocation,
  OAuth2Session
} from './types';
import { TokenStore, SessionManager, ConsentManager, PKCEValidator, JWTService } from './SupportingClasses';

// Re-export supporting classes
export { TokenStore, SessionManager, ConsentManager, PKCEValidator, JWTService } from './SupportingClasses';

// ============================================================================
// TOKEN MANAGER CLASS
// ============================================================================

export class TokenManager extends EventEmitter {
  private accessTokens: Map<string, AccessToken> = new Map();
  private refreshTokens: Map<string, RefreshToken> = new Map();
  private sessions: Map<string, OAuth2Session> = new Map();

  public tokenStore: TokenStore;
  public sessionManager: SessionManager;
  public consentManager: ConsentManager;
  public pkceValidator: PKCEValidator;
  public jwtService: JWTService;

  private metricsCallback?: (updates: { totalTokensIssued?: number; activeTokens?: number; totalTokensRevoked?: number; totalIntrospections?: number }) => void;

  constructor(jwtSigningKey: string) {
    super();
    this.tokenStore = new TokenStore();
    this.sessionManager = new SessionManager();
    this.consentManager = new ConsentManager();
    this.pkceValidator = new PKCEValidator();
    this.jwtService = new JWTService(jwtSigningKey);
  }

  setMetricsCallback(callback: (updates: any) => void): void {
    this.metricsCallback = callback;
  }

  // ============================================================================
  // TOKEN GENERATION
  // ============================================================================

  async generateTokenSet(
    client: OAuth2Client,
    userId: string | undefined,
    scope: string,
    sessionId: string | undefined,
    existingRefreshToken?: string,
    issuer?: string
  ): Promise<any> {
    const accessTokenData = await this.generateAccessToken(client, userId, scope, sessionId, issuer);

    const response: any = {
      access_token: accessTokenData.token,
      token_type: accessTokenData.tokenType,
      expires_in: client.settings.accessTokenLifetime,
      scope
    };

    if (userId && client.allowedGrantTypes.includes('refresh_token')) {
      if (existingRefreshToken) {
        response.refresh_token = existingRefreshToken;
      } else {
        const refreshTokenData = await this.generateRefreshToken(client, userId, scope);
        response.refresh_token = refreshTokenData.token;
      }
    }

    if (scope.includes('openid') && userId) {
      response.id_token = await this.generateIdToken(client.id, userId, undefined, sessionId, issuer);
    }

    return response;
  }

  async generateAccessToken(
    client: OAuth2Client,
    userId: string | undefined,
    scope: string,
    sessionId: string | undefined,
    issuer?: string
  ): Promise<AccessToken> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + client.settings.accessTokenLifetime! * 1000);
    const session = sessionId ? this.sessions.get(sessionId) : undefined;

    const metadata: TokenMetadata = {
      jti: crypto.randomBytes(16).toString('hex'),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
      iss: issuer || 'https://auth.example.com',
      sub: userId,
      aud: client.id,
      azp: client.id,
      sessionId,
      authTime: session?.authTime.getTime()
    };

    const accessToken: AccessToken = {
      token, tokenType: 'Bearer', clientId: client.id, userId, scope, expiresAt, metadata
    };

    this.accessTokens.set(token, accessToken);
    if (this.metricsCallback) {
      this.metricsCallback({ totalTokensIssued: 1, activeTokens: 1 });
    }

    return accessToken;
  }

  async generateRefreshToken(client: OAuth2Client, userId: string, scope: string): Promise<RefreshToken> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + client.settings.refreshTokenLifetime! * 1000);

    const refreshToken: RefreshToken = {
      token, clientId: client.id, userId, scope, expiresAt, family: crypto.randomBytes(16).toString('hex')
    };

    this.refreshTokens.set(token, refreshToken);
    return refreshToken;
  }

  async generateIdToken(clientId: string, userId: string, nonce?: string, sessionId?: string, issuer?: string): Promise<string> {
    const session = sessionId ? this.sessions.get(sessionId) : undefined;

    const payload: any = {
      iss: issuer || 'https://auth.example.com',
      sub: userId,
      aud: clientId,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      auth_time: session?.authTime.getTime(),
      nonce,
      acr: session?.acr,
      amr: session?.amr,
      azp: clientId
    };

    return this.jwtService.sign(payload);
  }

  // ============================================================================
  // TOKEN RETRIEVAL
  // ============================================================================

  getAccessToken(token: string): AccessToken | undefined { return this.accessTokens.get(token); }
  getRefreshToken(token: string): RefreshToken | undefined { return this.refreshTokens.get(token); }
  getAccessTokensMap(): Map<string, AccessToken> { return this.accessTokens; }
  getRefreshTokensMap(): Map<string, RefreshToken> { return this.refreshTokens; }

  setSession(sessionId: string, session: OAuth2Session): void { this.sessions.set(sessionId, session); }
  getSession(sessionId: string): OAuth2Session | undefined { return this.sessions.get(sessionId); }

  // ============================================================================
  // INTROSPECTION & REVOCATION
  // ============================================================================

  async introspect(token: string, tokenTypeHint?: string): Promise<TokenIntrospection> {
    let tokenData: AccessToken | RefreshToken | undefined;

    if (tokenTypeHint === 'refresh_token' || !tokenTypeHint) {
      tokenData = this.refreshTokens.get(token);
    }
    if (!tokenData && (tokenTypeHint === 'access_token' || !tokenTypeHint)) {
      tokenData = this.accessTokens.get(token);
    }
    if (!tokenData) { return { active: false }; }
    if (tokenData.expiresAt < new Date()) { return { active: false }; }

    const introspection: TokenIntrospection = {
      active: true,
      scope: tokenData.scope,
      client_id: tokenData.clientId,
      token_type: 'token' in tokenData ? 'refresh_token' : 'access_token',
      exp: Math.floor(tokenData.expiresAt.getTime() / 1000),
      iat: Math.floor(Date.now() / 1000)
    };

    if ('userId' in tokenData) {
      introspection.sub = tokenData.userId;
      introspection.username = tokenData.userId;
    }

    if (this.metricsCallback) { this.metricsCallback({ totalIntrospections: 1 }); }
    return introspection;
  }

  async revoke(revocation: TokenRevocation): Promise<void> {
    let revoked = false;

    if (revocation.token_type_hint === 'refresh_token' || !revocation.token_type_hint) {
      const refreshToken = this.refreshTokens.get(revocation.token);
      if (refreshToken) {
        this.refreshTokens.delete(revocation.token);
        revoked = true;
        if (refreshToken.family) { await this.revokeTokenFamily(refreshToken.family); }
      }
    }

    if (!revoked && (revocation.token_type_hint === 'access_token' || !revocation.token_type_hint)) {
      const accessToken = this.accessTokens.get(revocation.token);
      if (accessToken) {
        this.accessTokens.delete(revocation.token);
        revoked = true;
        if (this.metricsCallback) { this.metricsCallback({ activeTokens: -1 }); }
      }
    }

    if (revoked) {
      if (this.metricsCallback) { this.metricsCallback({ totalTokensRevoked: 1 }); }
      this.emit('tokenRevoked', { token: revocation.token });
    }
  }

  async revokeTokenFamily(family: string): Promise<void> {
    for (const [token, refreshToken] of Array.from(this.refreshTokens.entries())) {
      if (refreshToken.family === family) {
        this.refreshTokens.delete(token);
        if (this.metricsCallback) { this.metricsCallback({ totalTokensRevoked: 1 }); }
      }
    }
  }

  async revokeClientTokens(clientId: string): Promise<void> {
    for (const [token, accessToken] of Array.from(this.accessTokens.entries())) {
      if (accessToken.clientId === clientId) {
        this.accessTokens.delete(token);
        if (this.metricsCallback) { this.metricsCallback({ activeTokens: -1, totalTokensRevoked: 1 }); }
      }
    }
    for (const [token, refreshToken] of Array.from(this.refreshTokens.entries())) {
      if (refreshToken.clientId === clientId) {
        this.refreshTokens.delete(token);
        if (this.metricsCallback) { this.metricsCallback({ totalTokensRevoked: 1 }); }
      }
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async cleanup(): Promise<void> {
    const now = new Date();

    for (const [token, accessToken] of Array.from(this.accessTokens.entries())) {
      if (accessToken.expiresAt < now) {
        this.accessTokens.delete(token);
        if (this.metricsCallback) { this.metricsCallback({ activeTokens: -1 }); }
      }
    }

    for (const [token, refreshToken] of Array.from(this.refreshTokens.entries())) {
      if (refreshToken.expiresAt < now) { this.refreshTokens.delete(token); }
    }

    for (const [id, session] of Array.from(this.sessions.entries())) {
      if (session.expiresAt && session.expiresAt < now) { this.sessions.delete(id); }
    }

    this.emit('cleanupCompleted');
  }
}
