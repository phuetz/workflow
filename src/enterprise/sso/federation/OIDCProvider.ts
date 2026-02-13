/**
 * OIDCProvider - OpenID Connect and OAuth2 protocol handling, including token exchange
 */

import { EventEmitter } from 'events';
import {
  FederationHubConfig,
  FederatedClaims,
  TokenExchangeRequest,
  TokenExchangeResponse,
  TokenType,
  ValidationResult,
  ValidationError,
} from './types';

export class OIDCProvider extends EventEmitter {
  private config: FederationHubConfig;

  constructor(config: FederationHubConfig) {
    super();
    this.config = config;
  }

  /**
   * Update configuration
   */
  updateConfig(config: FederationHubConfig): void {
    this.config = config;
  }

  /**
   * Exchange tokens between identity providers
   */
  async exchangeToken(request: TokenExchangeRequest): Promise<TokenExchangeResponse> {
    if (!this.config.enableTokenExchange) {
      throw new Error('Token exchange is not enabled');
    }

    const validatedToken = await this.validateSubjectToken(
      request.subjectToken,
      request.subjectTokenType
    );

    if (!validatedToken.valid) {
      throw new Error(
        `Invalid subject token: ${validatedToken.errors.map(e => e.message).join(', ')}`
      );
    }

    const requestedType = request.requestedTokenType ||
      'urn:ietf:params:oauth:token-type:access_token';

    const newToken = await this.generateToken(
      validatedToken.claims!,
      requestedType,
      {
        audience: request.audience,
        scope: request.scope,
      }
    );

    const response: TokenExchangeResponse = {
      accessToken: newToken.token,
      issuedTokenType: requestedType,
      tokenType: 'Bearer',
      expiresIn: newToken.expiresIn,
      scope: request.scope?.join(' '),
    };

    this.emit('tokenExchanged', {
      subjectTokenType: request.subjectTokenType,
      issuedTokenType: requestedType,
      audience: request.audience,
    });

    return response;
  }

  /**
   * Validate a subject token
   */
  async validateSubjectToken(
    token: string,
    _tokenType: TokenType
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!token) {
      errors.push({ code: 'MISSING_TOKEN', message: 'Subject token is required' });
      return { valid: false, errors, warnings };
    }

    try {
      const [, payloadB64] = token.split('.');
      if (payloadB64) {
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

        const claims: FederatedClaims = {
          subject: payload.sub,
          issuer: payload.iss,
          audience: payload.aud,
          email: payload.email,
          name: payload.name,
          issuedAt: new Date(payload.iat * 1000),
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
          attributes: payload,
        };

        return { valid: true, claims, errors: [], warnings };
      }
    } catch {
      // Token parsing failed
    }

    errors.push({ code: 'INVALID_TOKEN', message: 'Failed to parse subject token' });
    return { valid: false, errors, warnings };
  }

  /**
   * Generate a new token
   */
  async generateToken(
    claims: FederatedClaims,
    _tokenType: TokenType,
    options: { audience?: string; scope?: string[] }
  ): Promise<{ token: string; expiresIn: number }> {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 3600;

    const payload = {
      iss: this.config.issuer,
      sub: claims.subject,
      aud: options.audience || this.config.entityId,
      iat: now,
      exp: now + expiresIn,
      email: claims.email,
      name: claims.name,
      groups: claims.groups,
      roles: claims.roles,
      scope: options.scope?.join(' '),
    };

    const header = { alg: 'RS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = 'placeholder_signature';

    const token = `${headerB64}.${payloadB64}.${signature}`;

    return { token, expiresIn };
  }

  /**
   * Generate OIDC discovery document
   */
  generateOIDCDiscovery(): string {
    const discovery = {
      issuer: this.config.issuer,
      authorization_endpoint: `${this.config.oidcEndpoint}/authorize`,
      token_endpoint: `${this.config.oidcEndpoint}/token`,
      userinfo_endpoint: `${this.config.oidcEndpoint}/userinfo`,
      jwks_uri: `${this.config.oidcEndpoint}/.well-known/jwks.json`,
      registration_endpoint: `${this.config.oidcEndpoint}/register`,
      scopes_supported: ['openid', 'profile', 'email', 'groups'],
      response_types_supported: [
        'code',
        'token',
        'id_token',
        'code token',
        'code id_token',
        'token id_token',
        'code token id_token'
      ],
      response_modes_supported: ['query', 'fragment', 'form_post'],
      grant_types_supported: [
        'authorization_code',
        'implicit',
        'refresh_token',
        'client_credentials',
        'urn:ietf:params:oauth:grant-type:token-exchange'
      ],
      subject_types_supported: ['public', 'pairwise'],
      id_token_signing_alg_values_supported: ['RS256', 'RS384', 'RS512'],
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
        'private_key_jwt'
      ],
      claims_supported: [
        'sub',
        'iss',
        'aud',
        'exp',
        'iat',
        'email',
        'email_verified',
        'name',
        'given_name',
        'family_name',
        'groups',
        'roles'
      ],
    };

    return JSON.stringify(discovery, null, 2);
  }
}
