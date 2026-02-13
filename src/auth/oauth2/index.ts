/**
 * OAuth2 Provider System
 * Barrel export and facade for OAuth2 authorization server
 *
 * Split from original 1690 LOC file following SOLID principles:
 * - types.ts: All type definitions (~310 LOC)
 * - ProviderRegistry.ts: Client and scope management (~280 LOC)
 * - TokenManager.ts: Token generation and management (~350 LOC)
 * - AuthorizationFlow.ts: Authorization and token endpoints (~380 LOC)
 */

import { EventEmitter } from 'events';
import { ProviderRegistry } from './ProviderRegistry';
import { TokenManager } from './TokenManager';
import { AuthorizationFlow } from './AuthorizationFlow';

// Re-export all types
export * from './types';

// Re-export classes
export { ProviderRegistry } from './ProviderRegistry';
export { TokenManager, TokenStore, SessionManager, ConsentManager, PKCEValidator, JWTService } from './TokenManager';
export { AuthorizationFlow } from './AuthorizationFlow';
export { GrantHandlers } from './GrantHandlers';

// Import types for internal use
import type {
  OAuth2Client,
  AuthorizationRequest,
  TokenRequest,
  TokenIntrospection,
  TokenRevocation,
  DiscoveryDocument,
  JsonWebKeySet,
  OAuth2Metrics,
  Scope
} from './types';

// ============================================================================
// OAUTH2 PROVIDER SYSTEM FACADE
// ============================================================================

/**
 * OAuth2ProviderSystem - Facade class providing backwards-compatible API
 * Delegates to specialized modules for single responsibility
 */
export class OAuth2ProviderSystem extends EventEmitter {
  private static instance: OAuth2ProviderSystem;

  private registry: ProviderRegistry;
  private tokenManager: TokenManager;
  private authFlow: AuthorizationFlow;

  private constructor() {
    super();
    this.registry = new ProviderRegistry();
    this.tokenManager = new TokenManager(this.registry.getSecurityConfig().jwtSigningKey);
    this.authFlow = new AuthorizationFlow(this.registry, this.tokenManager);

    // Set up metrics callback
    this.tokenManager.setMetricsCallback((updates) => {
      const currentMetrics = this.registry.getMetrics();
      if (updates.totalTokensIssued) {
        currentMetrics.totalTokensIssued += updates.totalTokensIssued;
      }
      if (updates.activeTokens) {
        currentMetrics.activeTokens += updates.activeTokens;
      }
      if (updates.totalTokensRevoked) {
        currentMetrics.totalTokensRevoked += updates.totalTokensRevoked;
      }
      if (updates.totalIntrospections) {
        currentMetrics.totalIntrospections += updates.totalIntrospections;
      }
      this.registry.updateMetrics(currentMetrics);
    });

    // Forward events
    this.forwardEvents();
  }

  public static getInstance(): OAuth2ProviderSystem {
    if (!OAuth2ProviderSystem.instance) {
      OAuth2ProviderSystem.instance = new OAuth2ProviderSystem();
    }
    return OAuth2ProviderSystem.instance;
  }

  private forwardEvents(): void {
    // Forward registry events
    this.registry.on('clientRegistered', (data) => this.emit('clientRegistered', data));
    this.registry.on('clientUpdated', (data) => this.emit('clientUpdated', data));
    this.registry.on('clientDeleted', (data) => this.emit('clientDeleted', data));
    this.registry.on('scopeRegistered', (data) => this.emit('scopeRegistered', data));

    // Forward token manager events
    this.tokenManager.on('tokenRevoked', (data) => this.emit('tokenRevoked', data));
    this.tokenManager.on('cleanupCompleted', () => this.emit('cleanupCompleted'));

    // Forward auth flow events
    this.authFlow.on('authorizationCodeIssued', (data) => this.emit('authorizationCodeIssued', data));
    this.authFlow.on('tokensIssued', (data) => this.emit('tokensIssued', data));
    this.authFlow.on('tokenRefreshed', (data) => this.emit('tokenRefreshed', data));
    this.authFlow.on('suspiciousActivity', (data) => this.emit('suspiciousActivity', data));
  }

  // ============================================================================
  // CLIENT MANAGEMENT (delegated to ProviderRegistry)
  // ============================================================================

  public async registerClient(client: Partial<OAuth2Client>): Promise<OAuth2Client> {
    return this.registry.registerClient(client);
  }

  public async updateClient(clientId: string, updates: Partial<OAuth2Client>): Promise<OAuth2Client> {
    return this.registry.updateClient(clientId, updates);
  }

  public async deleteClient(clientId: string): Promise<void> {
    await this.tokenManager.revokeClientTokens(clientId);
    await this.registry.deleteClient(clientId);
  }

  public getClient(clientId: string): OAuth2Client | undefined {
    return this.registry.getClient(clientId);
  }

  public listClients(filter?: Partial<OAuth2Client>): OAuth2Client[] {
    return this.registry.listClients(filter);
  }

  // ============================================================================
  // AUTHORIZATION (delegated to AuthorizationFlow)
  // ============================================================================

  public async authorize(request: AuthorizationRequest, userId: string): Promise<any> {
    return this.authFlow.authorize(request, userId);
  }

  public async token(request: TokenRequest): Promise<any> {
    return this.authFlow.token(request);
  }

  // ============================================================================
  // TOKEN OPERATIONS (delegated to TokenManager)
  // ============================================================================

  public async introspect(token: string, tokenTypeHint?: string): Promise<TokenIntrospection> {
    return this.tokenManager.introspect(token, tokenTypeHint);
  }

  public async revoke(revocation: TokenRevocation): Promise<void> {
    return this.tokenManager.revoke(revocation);
  }

  // ============================================================================
  // SCOPE MANAGEMENT (delegated to ProviderRegistry)
  // ============================================================================

  public registerScope(scope: Scope): void {
    this.registry.registerScope(scope);
  }

  public getScope(name: string): Scope | undefined {
    return this.registry.getScope(name);
  }

  public listScopes(): Scope[] {
    return this.registry.listScopes();
  }

  // ============================================================================
  // CONSENT MANAGEMENT (delegated to TokenManager)
  // ============================================================================

  public async grantConsent(userId: string, clientId: string, scopes: string[]): Promise<void> {
    await this.tokenManager.consentManager.grantConsent(userId, clientId, scopes);
    this.emit('consentGranted', { userId, clientId, scopes });
  }

  public async revokeConsent(userId: string, clientId: string): Promise<void> {
    await this.tokenManager.consentManager.revokeConsent(userId, clientId);
    this.emit('consentRevoked', { userId, clientId });
  }

  // ============================================================================
  // DISCOVERY & METADATA (delegated to appropriate modules)
  // ============================================================================

  public getDiscoveryDocument(): DiscoveryDocument {
    return this.authFlow.getDiscoveryDocument();
  }

  public getJWKS(): JsonWebKeySet {
    return this.registry.getJWKS();
  }

  public getMetrics(): OAuth2Metrics {
    return this.registry.getMetrics();
  }

  // ============================================================================
  // CLEANUP (delegated to TokenManager)
  // ============================================================================

  public async cleanup(): Promise<void> {
    const now = new Date();

    // Clean expired authorization codes
    for (const [code, authCode] of Array.from(this.registry.getAuthorizationCodesMap().entries())) {
      if (authCode.expiresAt < now) {
        this.registry.deleteAuthorizationCode(code);
      }
    }

    // Clean expired device codes
    for (const [code, deviceCode] of Array.from(this.registry.getDeviceCodesMap().entries())) {
      if (deviceCode.expiresAt < now) {
        this.registry.deleteDeviceCode(code);
      }
    }

    // Delegate token and session cleanup to TokenManager
    await this.tokenManager.cleanup();
  }
}

// Export singleton instance
export const oauth2Provider = OAuth2ProviderSystem.getInstance();
