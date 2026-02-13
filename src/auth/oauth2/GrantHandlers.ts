/**
 * OAuth2 Grant Handlers
 * Handles different token grant types
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import type { TokenRequest, OAuth2Client } from './types';
import type { ProviderRegistry } from './ProviderRegistry';
import type { TokenManager } from './TokenManager';

// ============================================================================
// GRANT HANDLERS CLASS
// ============================================================================

export class GrantHandlers extends EventEmitter {
  constructor(
    private registry: ProviderRegistry,
    private tokenManager: TokenManager
  ) {
    super();
  }

  async handleAuthorizationCodeGrant(request: TokenRequest): Promise<any> {
    if (!request.code) {
      throw new Error('Missing authorization code');
    }

    const authCode = this.registry.getAuthorizationCode(request.code);
    if (!authCode) {
      throw new Error('Invalid authorization code');
    }

    // Check expiration
    if (authCode.expiresAt < new Date()) {
      this.registry.deleteAuthorizationCode(request.code);
      throw new Error('Authorization code expired');
    }

    // Check if already used
    if (authCode.usedAt) {
      await this.revokeTokensFromAuthCode(request.code);
      throw new Error('Authorization code already used');
    }

    // Validate client
    const client = await this.registry.validateClient(authCode.clientId, request.clientSecret);

    // Validate redirect URI
    if (request.redirectUri !== authCode.redirectUri) {
      throw new Error('Invalid redirect_uri');
    }

    // Validate PKCE
    if (authCode.codeChallenge) {
      if (!request.codeVerifier) {
        throw new Error('Missing code_verifier');
      }

      const method = (authCode.codeChallengeMethod === 'plain' || authCode.codeChallengeMethod === 'S256')
        ? authCode.codeChallengeMethod
        : 'S256';

      if (!this.tokenManager.pkceValidator.validate(
        request.codeVerifier,
        authCode.codeChallenge,
        method
      )) {
        throw new Error('Invalid code_verifier');
      }
    }

    // Mark code as used
    authCode.usedAt = new Date();

    // Generate tokens
    const tokenData = await this.tokenManager.generateTokenSet(
      client,
      authCode.userId,
      authCode.scope,
      authCode.sessionId!,
      undefined,
      this.registry.getIssuer()
    );

    this.emit('tokensIssued', {
      clientId: client.id,
      userId: authCode.userId,
      grantType: 'authorization_code'
    });

    return tokenData;
  }

  async handleRefreshTokenGrant(request: TokenRequest): Promise<any> {
    if (!request.refreshToken) {
      throw new Error('Missing refresh_token');
    }

    const refreshToken = this.tokenManager.getRefreshToken(request.refreshToken);
    if (!refreshToken) {
      throw new Error('Invalid refresh_token');
    }

    // Check expiration
    if (refreshToken.expiresAt < new Date()) {
      this.tokenManager.getRefreshTokensMap().delete(request.refreshToken);
      throw new Error('Refresh token expired');
    }

    // Validate client
    const client = await this.registry.validateClient(refreshToken.clientId, request.clientSecret);

    // Check token rotation
    if (client.settings.refreshTokenRotation) {
      refreshToken.usedAt = new Date();
      refreshToken.rotated = true;
    }

    // Generate new tokens
    const tokenData = await this.tokenManager.generateTokenSet(
      client,
      refreshToken.userId,
      request.scope || refreshToken.scope,
      undefined,
      client.settings.refreshTokenRotation ? undefined : request.refreshToken,
      this.registry.getIssuer()
    );

    this.emit('tokenRefreshed', {
      clientId: client.id,
      userId: refreshToken.userId
    });

    return tokenData;
  }

  async handleClientCredentialsGrant(request: TokenRequest): Promise<any> {
    const client = await this.registry.validateClient(request.clientId!, request.clientSecret);

    if (!client.allowedGrantTypes.includes('client_credentials')) {
      throw new Error('Grant type not allowed for client');
    }

    const tokenData = await this.tokenManager.generateAccessToken(
      client,
      undefined,
      request.scope || client.defaultScopes?.join(' ') || '',
      undefined,
      this.registry.getIssuer()
    );

    this.emit('tokensIssued', {
      clientId: client.id,
      grantType: 'client_credentials'
    });

    return {
      access_token: tokenData.token,
      token_type: tokenData.tokenType,
      expires_in: client.settings.accessTokenLifetime,
      scope: tokenData.scope
    };
  }

  async handlePasswordGrant(request: TokenRequest): Promise<any> {
    if (!request.username || !request.password) {
      throw new Error('Missing username or password');
    }

    const client = await this.registry.validateClient(request.clientId!, request.clientSecret);

    if (!client.allowedGrantTypes.includes('password')) {
      throw new Error('Grant type not allowed for client');
    }

    const userId = await this.validateUserCredentials(request.username, request.password);
    const session = await this.tokenManager.sessionManager.createSession(userId, client.id);

    const tokenData = await this.tokenManager.generateTokenSet(
      client,
      userId,
      request.scope || client.defaultScopes?.join(' ') || '',
      session.id,
      undefined,
      this.registry.getIssuer()
    );

    this.emit('tokensIssued', {
      clientId: client.id,
      userId,
      grantType: 'password'
    });

    return tokenData;
  }

  async handleDeviceCodeGrant(request: TokenRequest): Promise<any> {
    if (!request.deviceCode) {
      throw new Error('Missing device_code');
    }

    const deviceCode = this.registry.getDeviceCode(request.deviceCode);
    if (!deviceCode) {
      throw new Error('Invalid device_code');
    }

    if (deviceCode.expiresAt < new Date()) {
      this.registry.deleteDeviceCode(request.deviceCode);
      throw new Error('Device code expired');
    }

    if (!deviceCode.authorizedAt) {
      return { error: 'authorization_pending' };
    }

    if (deviceCode.denied) {
      return { error: 'access_denied' };
    }

    const client = await this.registry.validateClient(deviceCode.clientId, request.clientSecret);

    const tokenData = await this.tokenManager.generateTokenSet(
      client,
      deviceCode.userId!,
      deviceCode.scope,
      undefined,
      undefined,
      this.registry.getIssuer()
    );

    this.registry.deleteDeviceCode(request.deviceCode);

    this.emit('tokensIssued', {
      clientId: client.id,
      userId: deviceCode.userId,
      grantType: 'device_code'
    });

    return tokenData;
  }

  private async validateUserCredentials(username: string, password: string): Promise<string> {
    return crypto.randomBytes(16).toString('hex');
  }

  private async revokeTokensFromAuthCode(code: string): Promise<void> {
    const authCode = this.registry.getAuthorizationCode(code);
    if (!authCode) return;

    this.emit('suspiciousActivity', {
      type: 'authorization_code_reuse',
      code,
      clientId: authCode.clientId,
      userId: authCode.userId
    });
  }
}
