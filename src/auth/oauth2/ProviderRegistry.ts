/**
 * OAuth2 Provider Registry
 * Manages client registration and lookup
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import type {
  OAuth2Client,
  OAuth2Metrics,
  Scope,
  AuthorizationCode,
  DeviceCode,
  SecurityConfig,
  JsonWebKeySet
} from './types';

// ============================================================================
// PROVIDER REGISTRY CLASS
// ============================================================================

export class ProviderRegistry extends EventEmitter {
  private clients: Map<string, OAuth2Client> = new Map();
  private scopes: Map<string, Scope> = new Map();
  private authorizationCodes: Map<string, AuthorizationCode> = new Map();
  private deviceCodes: Map<string, DeviceCode> = new Map();
  private securityConfig: SecurityConfig;
  private jwks: JsonWebKeySet;
  private metrics: OAuth2Metrics;

  constructor() {
    super();
    this.securityConfig = this.getDefaultSecurityConfig();
    this.jwks = this.generateJWKS();
    this.metrics = this.initializeMetrics();
    this.initializeDefaultScopes();
  }

  // ============================================================================
  // CLIENT MANAGEMENT
  // ============================================================================

  public async registerClient(client: Partial<OAuth2Client>): Promise<OAuth2Client> {
    const clientId = crypto.randomBytes(16).toString('hex');
    const clientSecret = crypto.randomBytes(32).toString('hex');

    const newClient: OAuth2Client = {
      id: clientId,
      secret: clientSecret,
      name: client.name || 'Unnamed Client',
      redirectUris: client.redirectUris || [],
      allowedGrantTypes: client.allowedGrantTypes || ['authorization_code'],
      allowedResponseTypes: client.allowedResponseTypes || ['code'],
      allowedScopes: client.allowedScopes || ['openid', 'profile', 'email'],
      metadata: {
        owner: client.metadata?.owner || 'system',
        environment: client.metadata?.environment || 'development',
        trusted: client.metadata?.trusted || false,
        firstParty: client.metadata?.firstParty || false,
        verified: client.metadata?.verified || false
      },
      settings: {
        requireConsent: client.settings?.requireConsent ?? true,
        requirePkce: client.settings?.requirePkce ?? true,
        requireSignedRequestObject: client.settings?.requireSignedRequestObject ?? false,
        tokenEndpointAuthMethod: client.settings?.tokenEndpointAuthMethod || 'client_secret_basic',
        accessTokenLifetime: client.settings?.accessTokenLifetime || 3600,
        refreshTokenLifetime: client.settings?.refreshTokenLifetime || 2592000,
        idTokenLifetime: client.settings?.idTokenLifetime || 3600,
        authorizationCodeLifetime: client.settings?.authorizationCodeLifetime || 600,
        deviceCodeLifetime: client.settings?.deviceCodeLifetime || 1800,
        refreshTokenRotation: client.settings?.refreshTokenRotation ?? true,
        refreshTokenReuse: client.settings?.refreshTokenReuse ?? false
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...client
    };

    this.clients.set(clientId, newClient);
    this.metrics.totalClients++;

    this.emit('clientRegistered', newClient);

    return newClient;
  }

  public async updateClient(clientId: string, updates: Partial<OAuth2Client>): Promise<OAuth2Client> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    const updatedClient = {
      ...client,
      ...updates,
      updatedAt: new Date()
    };

    this.clients.set(clientId, updatedClient);
    this.emit('clientUpdated', updatedClient);

    return updatedClient;
  }

  public async deleteClient(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    this.clients.delete(clientId);
    this.metrics.totalClients--;

    this.emit('clientDeleted', { clientId });
  }

  public getClient(clientId: string): OAuth2Client | undefined {
    return this.clients.get(clientId);
  }

  public listClients(filter?: Partial<OAuth2Client>): OAuth2Client[] {
    let clients = Array.from(this.clients.values());

    if (filter) {
      if (filter.metadata?.owner) {
        clients = clients.filter(c => c.metadata.owner === filter.metadata!.owner);
      }
      if (filter.metadata?.environment) {
        clients = clients.filter(c => c.metadata.environment === filter.metadata!.environment);
      }
    }

    return clients;
  }

  public async validateClient(clientId: string, clientSecret?: string): Promise<OAuth2Client> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error('Invalid client');
    }

    if (client.settings.tokenEndpointAuthMethod !== 'none' && client.secret !== clientSecret) {
      throw new Error('Invalid client credentials');
    }

    return client;
  }

  // ============================================================================
  // SCOPE MANAGEMENT
  // ============================================================================

  public registerScope(scope: Scope): void {
    this.scopes.set(scope.name, scope);
    this.emit('scopeRegistered', scope);
  }

  public getScope(name: string): Scope | undefined {
    return this.scopes.get(name);
  }

  public listScopes(): Scope[] {
    return Array.from(this.scopes.values());
  }

  public getScopesMap(): Map<string, Scope> {
    return this.scopes;
  }

  // ============================================================================
  // AUTHORIZATION CODE MANAGEMENT
  // ============================================================================

  public setAuthorizationCode(code: string, authCode: AuthorizationCode): void {
    this.authorizationCodes.set(code, authCode);
    this.metrics.totalAuthorizationRequests++;
  }

  public getAuthorizationCode(code: string): AuthorizationCode | undefined {
    return this.authorizationCodes.get(code);
  }

  public deleteAuthorizationCode(code: string): void {
    this.authorizationCodes.delete(code);
  }

  public getAuthorizationCodesMap(): Map<string, AuthorizationCode> {
    return this.authorizationCodes;
  }

  // ============================================================================
  // DEVICE CODE MANAGEMENT
  // ============================================================================

  public setDeviceCode(code: string, deviceCode: DeviceCode): void {
    this.deviceCodes.set(code, deviceCode);
  }

  public getDeviceCode(code: string): DeviceCode | undefined {
    return this.deviceCodes.get(code);
  }

  public deleteDeviceCode(code: string): void {
    this.deviceCodes.delete(code);
  }

  public getDeviceCodesMap(): Map<string, DeviceCode> {
    return this.deviceCodes;
  }

  // ============================================================================
  // CONFIGURATION & METADATA
  // ============================================================================

  public getSecurityConfig(): SecurityConfig {
    return this.securityConfig;
  }

  public getJWKS(): JsonWebKeySet {
    return this.jwks;
  }

  public getMetrics(): OAuth2Metrics {
    return { ...this.metrics };
  }

  public updateMetrics(updates: Partial<OAuth2Metrics>): void {
    Object.assign(this.metrics, updates);
  }

  public getIssuer(): string {
    return process.env.OAUTH2_ISSUER || 'https://auth.example.com';
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getDefaultSecurityConfig(): SecurityConfig {
    return {
      requireHttps: true,
      allowHttp: process.env.NODE_ENV === 'development',
      corsOrigins: ['*'],
      csrfProtection: true,
      clickjackingProtection: true,
      rateLimiting: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        burstSize: 10
      },
      jwtSigningKey: process.env.JWT_SIGNING_KEY || crypto.randomBytes(32).toString('hex'),
      tokenHashAlgorithm: 'sha256',
      bcryptRounds: 10
    };
  }

  private generateJWKS(): JsonWebKeySet {
    return {
      keys: [
        {
          kty: 'RSA',
          use: 'sig',
          alg: 'RS256',
          kid: crypto.randomBytes(16).toString('hex'),
          n: crypto.randomBytes(256).toString('base64url'),
          e: 'AQAB'
        }
      ]
    };
  }

  private initializeMetrics(): OAuth2Metrics {
    return {
      totalClients: 0,
      totalAuthorizationRequests: 0,
      totalTokensIssued: 0,
      totalTokensRevoked: 0,
      totalIntrospections: 0,
      activeTokens: 0,
      activeSessions: 0,
      averageTokenLifetime: 0,
      tokenIssuanceRate: 0,
      authorizationSuccessRate: 0,
      tokenRefreshRate: 0,
      errorRate: 0,
      topClients: [],
      topScopes: []
    };
  }

  private initializeDefaultScopes(): void {
    const defaultScopes: Scope[] = [
      {
        name: 'openid',
        displayName: 'OpenID',
        description: 'Access to your user identifier',
        required: true,
        userConsent: false,
        claims: ['sub']
      },
      {
        name: 'profile',
        displayName: 'Profile',
        description: 'Access to your basic profile information',
        userConsent: true,
        claims: ['name', 'family_name', 'given_name', 'middle_name', 'nickname', 'preferred_username', 'profile', 'picture', 'website', 'gender', 'birthdate', 'zoneinfo', 'locale', 'updated_at']
      },
      {
        name: 'email',
        displayName: 'Email',
        description: 'Access to your email address',
        userConsent: true,
        claims: ['email', 'email_verified']
      },
      {
        name: 'phone',
        displayName: 'Phone',
        description: 'Access to your phone number',
        userConsent: true,
        claims: ['phone_number', 'phone_number_verified']
      },
      {
        name: 'address',
        displayName: 'Address',
        description: 'Access to your physical address',
        userConsent: true,
        claims: ['address']
      },
      {
        name: 'offline_access',
        displayName: 'Offline Access',
        description: 'Access to your data when you are offline',
        userConsent: true
      }
    ];

    defaultScopes.forEach(scope => {
      this.scopes.set(scope.name, scope);
    });
  }
}
