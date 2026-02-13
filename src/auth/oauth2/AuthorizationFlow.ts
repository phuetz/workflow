/**
 * OAuth2 Authorization Flow
 * Handles authorization code, implicit, and hybrid flows
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import type {
  AuthorizationRequest,
  TokenRequest,
  OAuth2Client,
  AuthorizationCode,
  DiscoveryDocument
} from './types';
import type { ProviderRegistry } from './ProviderRegistry';
import type { TokenManager } from './TokenManager';
import { GrantHandlers } from './GrantHandlers';

// ============================================================================
// AUTHORIZATION FLOW CLASS
// ============================================================================

export class AuthorizationFlow extends EventEmitter {
  private grantHandlers: GrantHandlers;

  constructor(
    private registry: ProviderRegistry,
    private tokenManager: TokenManager
  ) {
    super();
    this.grantHandlers = new GrantHandlers(registry, tokenManager);
    this.forwardGrantEvents();
  }

  private forwardGrantEvents(): void {
    this.grantHandlers.on('tokensIssued', (data) => this.emit('tokensIssued', data));
    this.grantHandlers.on('tokenRefreshed', (data) => this.emit('tokenRefreshed', data));
    this.grantHandlers.on('suspiciousActivity', (data) => this.emit('suspiciousActivity', data));
  }

  // ============================================================================
  // AUTHORIZATION ENDPOINT
  // ============================================================================

  async authorize(request: AuthorizationRequest, userId: string): Promise<any> {
    const client = this.registry.getClient(request.clientId);
    if (!client) {
      throw new Error('Invalid client_id');
    }

    if (!client.redirectUris.includes(request.redirectUri)) {
      throw new Error('Invalid redirect_uri');
    }

    if (!client.allowedResponseTypes.includes(request.responseType)) {
      throw new Error('Unsupported response_type');
    }

    const requestedScopes = (request.scope || '').split(' ');
    const validScopes = requestedScopes.filter(scope =>
      client.allowedScopes.includes(scope)
    );

    const consent = await this.tokenManager.consentManager.checkConsent(userId, request.clientId, validScopes);
    if (!consent && client.settings.requireConsent && !client.metadata.trusted) {
      return { requireConsent: true, scopes: validScopes, client };
    }

    const session = await this.tokenManager.sessionManager.createSession(userId, request.clientId);

    switch (request.responseType) {
      case 'code':
        return this.handleAuthorizationCodeFlow(request, userId, validScopes.join(' '), session.id);
      case 'token':
        return this.handleImplicitFlow(request, client, userId, validScopes.join(' '), session.id);
      case 'id_token':
      case 'token id_token':
      case 'code id_token':
      case 'code token':
      case 'code token id_token':
        return this.handleHybridFlow(request, client, userId, validScopes.join(' '), session.id);
      default:
        throw new Error('Unsupported response_type');
    }
  }

  private async handleAuthorizationCodeFlow(
    request: AuthorizationRequest,
    userId: string,
    scope: string,
    sessionId: string
  ): Promise<any> {
    const code = crypto.randomBytes(32).toString('hex');
    const client = this.registry.getClient(request.clientId)!;

    const authCode: AuthorizationCode = {
      code,
      clientId: request.clientId,
      userId,
      redirectUri: request.redirectUri,
      scope,
      state: request.state,
      nonce: request.nonce,
      codeChallenge: request.codeChallenge,
      codeChallengeMethod: request.codeChallengeMethod,
      sessionId,
      expiresAt: new Date(Date.now() + client.settings.authorizationCodeLifetime! * 1000)
    };

    this.registry.setAuthorizationCode(code, authCode);
    this.emit('authorizationCodeIssued', { code, clientId: request.clientId, userId });

    const redirectUrl = new URL(request.redirectUri);
    redirectUrl.searchParams.set('code', code);
    if (request.state) {
      redirectUrl.searchParams.set('state', request.state);
    }

    return { redirectUri: redirectUrl.toString() };
  }

  private async handleImplicitFlow(
    request: AuthorizationRequest,
    client: OAuth2Client,
    userId: string,
    scope: string,
    sessionId: string
  ): Promise<any> {
    const tokenData = await this.tokenManager.generateAccessToken(
      client, userId, scope, sessionId, this.registry.getIssuer()
    );

    const redirectUrl = new URL(request.redirectUri);
    const fragment = new URLSearchParams();
    fragment.set('access_token', tokenData.token);
    fragment.set('token_type', tokenData.tokenType);
    fragment.set('expires_in', String(client.settings.accessTokenLifetime));
    if (scope) fragment.set('scope', scope);
    if (request.state) fragment.set('state', request.state);

    redirectUrl.hash = fragment.toString();
    return { redirectUri: redirectUrl.toString() };
  }

  private async handleHybridFlow(
    request: AuthorizationRequest,
    client: OAuth2Client,
    userId: string,
    scope: string,
    sessionId: string
  ): Promise<any> {
    const responseTypes = request.responseType.split(' ');
    const redirectUrl = new URL(request.redirectUri);
    const fragment = new URLSearchParams();

    if (responseTypes.includes('code')) {
      const codeResponse = await this.handleAuthorizationCodeFlow(request, userId, scope, sessionId);
      const codeUrl = new URL(codeResponse.redirectUri);
      fragment.set('code', codeUrl.searchParams.get('code')!);
    }

    if (responseTypes.includes('token')) {
      const tokenData = await this.tokenManager.generateAccessToken(
        client, userId, scope, sessionId, this.registry.getIssuer()
      );
      fragment.set('access_token', tokenData.token);
      fragment.set('token_type', tokenData.tokenType);
      fragment.set('expires_in', String(client.settings.accessTokenLifetime));
    }

    if (responseTypes.includes('id_token')) {
      const idToken = await this.tokenManager.generateIdToken(
        request.clientId, userId, request.nonce, sessionId, this.registry.getIssuer()
      );
      fragment.set('id_token', idToken);
    }

    if (request.state) fragment.set('state', request.state);
    redirectUrl.hash = fragment.toString();
    return { redirectUri: redirectUrl.toString() };
  }

  // ============================================================================
  // TOKEN ENDPOINT (delegates to GrantHandlers)
  // ============================================================================

  async token(request: TokenRequest): Promise<any> {
    switch (request.grantType) {
      case 'authorization_code':
        return this.grantHandlers.handleAuthorizationCodeGrant(request);
      case 'refresh_token':
        return this.grantHandlers.handleRefreshTokenGrant(request);
      case 'client_credentials':
        return this.grantHandlers.handleClientCredentialsGrant(request);
      case 'password':
        return this.grantHandlers.handlePasswordGrant(request);
      case 'device_code':
        return this.grantHandlers.handleDeviceCodeGrant(request);
      default:
        throw new Error('Unsupported grant_type');
    }
  }

  // ============================================================================
  // DISCOVERY DOCUMENT
  // ============================================================================

  getDiscoveryDocument(): DiscoveryDocument {
    const baseUrl = this.registry.getIssuer();
    const scopes = this.registry.getScopesMap();

    return {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/authorize`,
      token_endpoint: `${baseUrl}/token`,
      userinfo_endpoint: `${baseUrl}/userinfo`,
      jwks_uri: `${baseUrl}/.well-known/jwks.json`,
      registration_endpoint: `${baseUrl}/register`,
      scopes_supported: Array.from(scopes.keys()),
      response_types_supported: ['code', 'token', 'id_token', 'code token', 'code id_token', 'token id_token', 'code token id_token'],
      response_modes_supported: ['query', 'fragment', 'form_post'],
      grant_types_supported: ['authorization_code', 'implicit', 'password', 'client_credentials', 'refresh_token', 'device_code'],
      acr_values_supported: ['0', '1', '2'],
      subject_types_supported: ['public', 'pairwise'],
      id_token_signing_alg_values_supported: ['RS256', 'HS256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'client_secret_jwt', 'private_key_jwt', 'none'],
      claims_supported: ['sub', 'name', 'given_name', 'family_name', 'middle_name', 'nickname', 'preferred_username', 'profile', 'picture', 'website', 'email', 'email_verified', 'gender', 'birthdate', 'zoneinfo', 'locale', 'phone_number', 'phone_number_verified', 'address', 'updated_at'],
      code_challenge_methods_supported: ['plain', 'S256'],
      introspection_endpoint: `${baseUrl}/introspect`,
      revocation_endpoint: `${baseUrl}/revoke`,
      device_authorization_endpoint: `${baseUrl}/device_authorization`,
      end_session_endpoint: `${baseUrl}/logout`,
      check_session_iframe: `${baseUrl}/session`,
      backchannel_logout_supported: true,
      backchannel_logout_session_supported: true,
      frontchannel_logout_supported: true,
      frontchannel_logout_session_supported: true
    };
  }
}
