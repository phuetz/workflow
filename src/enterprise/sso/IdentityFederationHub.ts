/**
 * Identity Federation Hub
 * Cross-domain identity federation, trust management, and identity brokering
 * for enterprise B2B partner integration
 *
 * Supports: SCIM, WS-Federation, SAML, OAuth2/OIDC
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// Import types
import {
  TrustRelationship,
  TrustType,
  TrustDirection,
  FederationProtocol,
  FederationMetadata,
  ClaimsMappingRule,
  OrganizationInfo,
  FederatedIdentity,
  FederatedClaims,
  IdentityProvider,
  FederatedSession,
  TokenExchangeRequest,
  TokenExchangeResponse,
  SCIMUser,
  WSFederationRequest,
  ValidationResult,
  FederationHubConfig,
  FederationHubStats,
} from './federation/types';

// Import sub-modules
import { TrustStore } from './federation/TrustStore';
import { IdentityMapper } from './federation/IdentityMapper';
import { SessionManager } from './federation/SessionManager';
import { SAMLProvider } from './federation/SAMLProvider';
import { OIDCProvider } from './federation/OIDCProvider';
import { SCIMHandler } from './federation/SCIMHandler';
import { AuditLogger } from './federation/AuditLogger';

// Re-export all types
export * from './federation/types';

export class IdentityFederationHub extends EventEmitter {
  private static instance: IdentityFederationHub | null = null;

  private config: FederationHubConfig;
  private identityProviders: Map<string, IdentityProvider> = new Map();
  private initialized: boolean = false;
  private trustVerificationInterval: NodeJS.Timeout | null = null;

  // Sub-modules
  private trustStore: TrustStore;
  private identityMapper: IdentityMapper;
  private sessionManager: SessionManager;
  private samlProvider: SAMLProvider;
  private oidcProvider: OIDCProvider;
  private scimHandler: SCIMHandler;
  private auditLogger: AuditLogger;

  private constructor(config: FederationHubConfig) {
    super();
    this.config = config;

    // Initialize sub-modules
    this.trustStore = new TrustStore();
    this.identityMapper = new IdentityMapper();
    this.sessionManager = new SessionManager({
      defaultSessionDuration: config.defaultSessionDuration,
      maxSessionDuration: config.maxSessionDuration,
    });
    this.samlProvider = new SAMLProvider(config);
    this.oidcProvider = new OIDCProvider(config);
    this.scimHandler = new SCIMHandler(config, this.identityMapper);
    this.auditLogger = new AuditLogger();

    this.setupEventForwarding();
  }

  static getInstance(config?: FederationHubConfig): IdentityFederationHub {
    if (!IdentityFederationHub.instance) {
      if (!config) {
        config = IdentityFederationHub.getDefaultConfig();
      }
      IdentityFederationHub.instance = new IdentityFederationHub(config);
    }
    return IdentityFederationHub.instance;
  }

  static resetInstance(): void {
    if (IdentityFederationHub.instance) {
      IdentityFederationHub.instance.destroy();
      IdentityFederationHub.instance = null;
    }
  }

  private static getDefaultConfig(): FederationHubConfig {
    return {
      hubId: crypto.randomUUID(),
      hubName: 'Workflow Federation Hub',
      entityId: process.env.FEDERATION_ENTITY_ID || 'urn:workflow:federation:hub',
      issuer: process.env.FEDERATION_ISSUER || 'https://workflow.example.com/federation',
      signingKey: process.env.FEDERATION_SIGNING_KEY || '',
      signingCertificate: process.env.FEDERATION_SIGNING_CERT || '',
      defaultSessionDuration: 3600000,
      maxSessionDuration: 86400000,
      allowedClockSkew: 300000,
      enableTokenExchange: true,
      enableSCIM: true,
      scimEndpoint: '/scim/v2',
      wsFederationEndpoint: '/wsfed',
      samlEndpoint: '/saml',
      oidcEndpoint: '/oidc',
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      this.emit('warning', { message: 'Federation hub already initialized' });
      return;
    }

    this.emit('initializing', { hubId: this.config.hubId });

    this.sessionManager.startCleanup(60000);
    this.trustVerificationInterval = setInterval(
      () => this.trustStore.verifyTrustRelationships(),
      3600000
    );

    this.initialized = true;
    this.emit('initialized', { hubId: this.config.hubId, entityId: this.config.entityId });
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Federation hub is not initialized');
    }
  }

  // Trust Relationship Management
  async createTrustRelationship(
    sourceOrg: OrganizationInfo,
    targetOrg: OrganizationInfo,
    options: {
      trustType: TrustType;
      trustDirection: TrustDirection;
      protocol: FederationProtocol;
      metadata: FederationMetadata;
      claimsMapping?: ClaimsMappingRule[];
      validityDays?: number;
      autoRenew?: boolean;
      tags?: string[];
    }
  ): Promise<TrustRelationship> {
    this.ensureInitialized();
    return this.trustStore.createTrustRelationship(sourceOrg, targetOrg, options);
  }

  async activateTrustRelationship(trustId: string): Promise<TrustRelationship> {
    return this.trustStore.activateTrustRelationship(trustId);
  }

  async suspendTrustRelationship(trustId: string, reason: string): Promise<TrustRelationship> {
    const trust = await this.trustStore.suspendTrustRelationship(trustId, reason);
    await this.terminateSessionsByTrust(trustId);
    return trust;
  }

  async revokeTrustRelationship(trustId: string, reason: string): Promise<void> {
    await this.trustStore.revokeTrustRelationship(trustId, reason);
    await this.terminateSessionsByTrust(trustId);
    await this.unlinkIdentitiesByTrust(trustId);
  }

  // Identity Federation
  async federateIdentity(
    providerId: string,
    externalClaims: FederatedClaims,
    options?: { linkToLocalUser?: string; createIfNotExists?: boolean }
  ): Promise<FederatedIdentity> {
    this.ensureInitialized();
    const provider = this.getProvider(providerId);
    const validationResult = await this.identityMapper.validateClaims(
      externalClaims, provider, this.config.allowedClockSkew
    );
    if (!validationResult.valid) {
      throw new Error(`Invalid claims: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }
    return this.identityMapper.federateIdentity(provider, externalClaims, options);
  }

  async transformClaims(
    sourceClaims: FederatedClaims,
    mappingRules: ClaimsMappingRule[]
  ): Promise<FederatedClaims> {
    return this.identityMapper.transformClaims(sourceClaims, mappingRules);
  }

  async linkIdentities(localUserId: string, federatedIdentityIds: string[]): Promise<void> {
    this.ensureInitialized();
    return this.identityMapper.linkIdentities(localUserId, federatedIdentityIds);
  }

  async unlinkIdentity(localUserId: string, federatedIdentityId: string): Promise<void> {
    await this.identityMapper.unlinkIdentity(localUserId, federatedIdentityId);
    await this.sessionManager.terminateSessionsByIdentity(federatedIdentityId);
  }

  // Session Management
  async manageFederatedSession(
    userId: string,
    federatedIdentityId: string,
    action: 'create' | 'refresh' | 'terminate',
    sessionData?: Partial<FederatedSession>
  ): Promise<FederatedSession | null> {
    this.ensureInitialized();
    const identity = this.identityMapper.getFederatedIdentity(federatedIdentityId);
    return this.sessionManager.manageFederatedSession(
      userId, federatedIdentityId, action, sessionData, identity
    );
  }

  // Token Exchange
  async exchangeToken(request: TokenExchangeRequest): Promise<TokenExchangeResponse> {
    this.ensureInitialized();
    return this.oidcProvider.exchangeToken(request);
  }

  // User Validation
  async validateFederatedUser(providerId: string, claims: FederatedClaims): Promise<ValidationResult> {
    this.ensureInitialized();
    const provider = this.identityProviders.get(providerId);
    if (!provider) {
      return { valid: false, errors: [{ code: 'PROVIDER_NOT_FOUND', message: `Identity provider not found: ${providerId}` }], warnings: [] };
    }
    if (!provider.enabled) {
      return { valid: false, errors: [{ code: 'PROVIDER_DISABLED', message: `Identity provider is disabled: ${provider.name}` }], warnings: [] };
    }
    if (provider.trustRelationshipId) {
      const trust = this.trustStore.getTrustRelationship(provider.trustRelationshipId);
      if (!trust || trust.status !== 'active') {
        return { valid: false, errors: [{ code: 'TRUST_NOT_ACTIVE', message: 'Trust relationship is not active' }], warnings: [] };
      }
    }
    const claimsValidation = await this.identityMapper.validateClaims(claims, provider, this.config.allowedClockSkew);
    if (!claimsValidation.valid) return claimsValidation;

    const transformedClaims = await this.identityMapper.transformClaims(claims, provider.claimsMapping);
    const federatedIdentity = this.identityMapper.findFederatedIdentity(providerId, claims.subject);
    if (federatedIdentity && federatedIdentity.status !== 'active') {
      return { valid: false, errors: [{ code: 'IDENTITY_NOT_ACTIVE', message: 'Federated identity is not active' }], warnings: [] };
    }
    const user = this.identityMapper.buildFederatedUser(transformedClaims, federatedIdentity);
    return { valid: true, user, claims: transformedClaims, errors: [], warnings: [] };
  }

  // Provider Management
  async registerIdentityProvider(provider: IdentityProvider): Promise<void> {
    this.ensureInitialized();
    this.validateProviderConfig(provider);
    this.identityProviders.set(provider.id, provider);
    this.emit('identityProviderRegistered', { providerId: provider.id, providerName: provider.name, type: provider.type });
  }

  async unregisterIdentityProvider(providerId: string): Promise<void> {
    const provider = this.identityProviders.get(providerId);
    if (!provider) return;
    await this.sessionManager.terminateSessionsByProvider(providerId);
    this.identityProviders.delete(providerId);
    this.emit('identityProviderUnregistered', { providerId, providerName: provider.name });
  }

  // SCIM
  async handleSCIMUser(
    action: 'create' | 'update' | 'delete' | 'get',
    user: Partial<SCIMUser>,
    providerId: string
  ): Promise<SCIMUser | null> {
    const provider = this.getProvider(providerId);
    return this.scimHandler.handleSCIMUser(action, user, provider);
  }

  // WS-Federation
  async handleWSFederationRequest(request: WSFederationRequest): Promise<{ response: string; redirectUrl?: string }> {
    this.ensureInitialized();
    return this.samlProvider.handleWSFederationRequest(request);
  }

  // Metadata
  getFederationMetadata(protocol: FederationProtocol): string {
    switch (protocol) {
      case 'saml2': return this.samlProvider.generateSAMLMetadata();
      case 'ws-federation': return this.samlProvider.generateWSFedMetadata();
      case 'oidc': return this.oidcProvider.generateOIDCDiscovery();
      default: throw new Error(`Metadata not supported for protocol: ${protocol}`);
    }
  }

  // Statistics
  getStats(): FederationHubStats {
    return {
      totalTrustRelationships: this.trustStore.getTotalTrustCount(),
      activeTrustRelationships: this.trustStore.getActiveTrustCount(),
      totalIdentityProviders: this.identityProviders.size,
      activeIdentityProviders: Array.from(this.identityProviders.values()).filter(p => p.enabled).length,
      totalFederatedIdentities: this.identityMapper.getTotalCount(),
      totalActiveSessions: this.sessionManager.getActiveSessionsCount(),
      tokenExchangesLast24h: 0,
      authenticationSuccessRate: this.auditLogger.getStats().successRate,
      averageAuthenticationTime: 150,
    };
  }

  destroy(): void {
    this.sessionManager.stopCleanup();
    if (this.trustVerificationInterval) {
      clearInterval(this.trustVerificationInterval);
      this.trustVerificationInterval = null;
    }
    this.trustStore.clear();
    this.identityProviders.clear();
    this.identityMapper.clear();
    this.sessionManager.clear();
    this.auditLogger.clear();
    this.initialized = false;
    this.emit('destroyed', { hubId: this.config.hubId });
  }

  // Private helpers
  private getProvider(providerId: string): IdentityProvider {
    const provider = this.identityProviders.get(providerId);
    if (!provider) throw new Error(`Identity provider not found: ${providerId}`);
    if (!provider.enabled) throw new Error(`Identity provider is disabled: ${provider.name}`);
    return provider;
  }

  private validateProviderConfig(provider: IdentityProvider): void {
    if (!provider.id || !provider.name || !provider.type) {
      throw new Error('Invalid provider config: missing required fields');
    }
    if (!provider.config.entityId) {
      throw new Error('Provider config must include entityId');
    }
  }

  private async terminateSessionsByTrust(trustId: string): Promise<void> {
    const trust = this.trustStore.getTrustRelationship(trustId);
    if (!trust) return;
    const providers = Array.from(this.identityProviders.values())
      .filter(p => p.trustRelationshipId === trustId);
    for (const provider of providers) {
      await this.sessionManager.terminateSessionsByProvider(provider.id);
    }
  }

  private async unlinkIdentitiesByTrust(trustId: string): Promise<void> {
    const providerIds = new Set(
      Array.from(this.identityProviders.values())
        .filter(p => p.trustRelationshipId === trustId)
        .map(p => p.id)
    );
    this.identityMapper.revokeIdentitiesByProviders(providerIds);
  }

  private setupEventForwarding(): void {
    const events = ['trustRelationshipCreated', 'trustRelationshipActivated', 'trustRelationshipSuspended',
      'trustRelationshipRevoked', 'trustRelationshipRenewed', 'trustRelationshipExpired',
      'federatedIdentityCreated', 'federatedIdentityUpdated', 'identitiesLinked', 'identityUnlinked',
      'sessionCreated', 'sessionRefreshed', 'sessionTerminated', 'sessionExpired',
      'tokenExchanged', 'scimUserCreated', 'scimUserUpdated', 'scimUserDeleted'];
    const modules = [this.trustStore, this.identityMapper, this.sessionManager, this.samlProvider, this.oidcProvider, this.scimHandler];
    for (const mod of modules) {
      for (const event of events) mod.on(event, e => this.emit(event, e));
    }
  }
}

// Factory functions
export const getIdentityFederationHub = (config?: FederationHubConfig) => IdentityFederationHub.getInstance(config);
export const initializeIdentityFederationHub = async (config: FederationHubConfig) => { const hub = IdentityFederationHub.getInstance(config); await hub.initialize(); return hub; };
export const createDefaultClaimsMapping = (): ClaimsMappingRule[] => [
  { id: 'map-sub', name: 'Subject', sourceClaimType: 'sub', targetClaimType: 'subject', transformation: { type: 'passthrough', config: {} }, required: true },
  { id: 'map-email', name: 'Email', sourceClaimType: 'email', targetClaimType: 'email', transformation: { type: 'passthrough', config: {} }, required: true },
  { id: 'map-name', name: 'Display Name', sourceClaimType: 'name', targetClaimType: 'name', transformation: { type: 'passthrough', config: {} }, required: false },
  { id: 'map-given-name', name: 'First Name', sourceClaimType: 'given_name', targetClaimType: 'givenName', transformation: { type: 'passthrough', config: {} }, required: false },
  { id: 'map-family-name', name: 'Last Name', sourceClaimType: 'family_name', targetClaimType: 'familyName', transformation: { type: 'passthrough', config: {} }, required: false },
  { id: 'map-groups', name: 'Groups', sourceClaimType: 'groups', targetClaimType: 'groups', transformation: { type: 'passthrough', config: {} }, required: false },
  { id: 'map-roles', name: 'Roles', sourceClaimType: 'roles', targetClaimType: 'roles', transformation: { type: 'passthrough', config: {} }, required: false },
];

export default IdentityFederationHub;
