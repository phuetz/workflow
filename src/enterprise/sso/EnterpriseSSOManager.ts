/**
 * Enterprise SSO Manager - Main orchestrator for SSO functionality
 * Supports SAML 2.0 and OIDC protocols with JIT provisioning, MFA, and SLO
 */
import { EventEmitter } from 'events';
import {
  IdPType, SSOProviderConfig, SSOUser, SSOSession, AuditLogEntry, AuditEventType,
  AuthenticationRequest, AuthenticationResult, LogoutRequest, LogoutResult, SSOStatistics,
  ProviderRegistry, AuthenticationFlow, TokenManager, UserProvisioner,
  SessionManager, AuditLogger, MFAManager,
} from './manager';

export class EnterpriseSSOManager extends EventEmitter {
  private static instance: EnterpriseSSOManager | null = null;
  private providerRegistry: ProviderRegistry;
  private authFlow: AuthenticationFlow;
  private tokenManager: TokenManager;
  private userProvisioner: UserProvisioner;
  private sessionManager: SessionManager;
  private auditLogger: AuditLogger;
  private mfaManager: MFAManager;
  private pendingAuthnRequests: Map<string, AuthenticationRequest> = new Map();

  private constructor() {
    super();
    this.providerRegistry = new ProviderRegistry(this);
    this.authFlow = new AuthenticationFlow();
    this.tokenManager = new TokenManager();
    this.userProvisioner = new UserProvisioner(this);
    this.sessionManager = new SessionManager(this, this.tokenManager);
    this.auditLogger = new AuditLogger(this);
    this.mfaManager = new MFAManager();
    this.sessionManager.startCleanup();
    this.on('audit:request', (event) => this.auditLogger.log(event));
  }

  public static getInstance(): EnterpriseSSOManager {
    if (!EnterpriseSSOManager.instance) EnterpriseSSOManager.instance = new EnterpriseSSOManager();
    return EnterpriseSSOManager.instance;
  }

  public static resetInstance(): void {
    if (EnterpriseSSOManager.instance) {
      EnterpriseSSOManager.instance.sessionManager.stopCleanup();
      EnterpriseSSOManager.instance.removeAllListeners();
      EnterpriseSSOManager.instance = null;
    }
  }

  // Provider Management
  public async configureSSOProvider(config: SSOProviderConfig): Promise<{ success: boolean; providerId: string; error?: string }> {
    try {
      const validationError = this.providerRegistry.validateConfig(config);
      if (validationError) return { success: false, providerId: config.id, error: validationError };
      this.providerRegistry.register(config);
      this.auditLogger.log({ eventType: 'config_change', providerId: config.id, success: true, details: { action: 'configure_provider', providerType: config.type, protocol: config.protocol } });
      return { success: true, providerId: config.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.auditLogger.log({ eventType: 'config_change', providerId: config.id, success: false, errorMessage, details: { action: 'configure_provider' } });
      return { success: false, providerId: config.id, error: errorMessage };
    }
  }

  public getProvider(providerId: string): SSOProviderConfig | undefined { return this.providerRegistry.get(providerId); }
  public getAllProviders(): SSOProviderConfig[] { return this.providerRegistry.getAll(); }
  public getEnabledProviders(): SSOProviderConfig[] { return this.providerRegistry.getEnabled(); }

  public removeProvider(providerId: string): boolean {
    const removed = this.providerRegistry.remove(providerId);
    if (removed) this.auditLogger.log({ eventType: 'config_change', providerId, success: true, details: { action: 'remove_provider' } });
    return removed;
  }

  // Authentication
  public async authenticateUser(request: AuthenticationRequest): Promise<AuthenticationResult> {
    const provider = this.providerRegistry.get(request.providerId);
    if (!provider) return { success: false, error: 'Provider not found', errorCode: 'PROVIDER_NOT_FOUND' };
    if (!provider.enabled) return { success: false, error: 'Provider is disabled', errorCode: 'PROVIDER_DISABLED' };
    try {
      const state = request.state || this.authFlow.generateSecureToken();
      const nonce = request.nonce || this.authFlow.generateSecureToken();
      this.pendingAuthnRequests.set(state, { ...request, state, nonce });
      const redirectUrl = provider.protocol === 'saml2'
        ? this.authFlow.generateSAMLAuthnRequest(provider, state, request.forceAuthn)
        : this.authFlow.generateOIDCAuthnRequest(provider, state, nonce, request);
      this.emit('auth:initiated', { providerId: request.providerId, state });
      return { success: true, redirectUrl };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      this.auditLogger.log({ eventType: 'login_failure', providerId: request.providerId, success: false, errorMessage, details: { phase: 'initiation' } });
      return { success: false, error: errorMessage, errorCode: 'AUTH_INITIATION_FAILED' };
    }
  }

  public async validateSAMLResponse(samlResponse: string, _relayState?: string): Promise<AuthenticationResult> {
    try {
      const decodedResponse = Buffer.from(samlResponse, 'base64').toString('utf-8');
      const parsedResponse = this.authFlow.parseSAMLResponse(decodedResponse);
      const provider = this.providerRegistry.findByEntityId(parsedResponse.issuer);
      if (!provider) return { success: false, error: 'Unknown SAML issuer', errorCode: 'UNKNOWN_ISSUER' };
      if (provider.saml?.wantAssertionsSigned && !parsedResponse.signature?.valid) {
        this.auditLogger.log({ eventType: 'login_failure', providerId: provider.id, success: false, errorMessage: 'Invalid SAML signature', details: { phase: 'signature_validation' } });
        return { success: false, error: 'Invalid SAML signature', errorCode: 'INVALID_SIGNATURE' };
      }
      if (parsedResponse.conditions) {
        const now = new Date();
        if (parsedResponse.conditions.notBefore && now < parsedResponse.conditions.notBefore) return { success: false, error: 'SAML assertion not yet valid', errorCode: 'ASSERTION_NOT_YET_VALID' };
        if (parsedResponse.conditions.notOnOrAfter && now > parsedResponse.conditions.notOnOrAfter) return { success: false, error: 'SAML assertion expired', errorCode: 'ASSERTION_EXPIRED' };
      }
      const user = await this.userProvisioner.mapSAMLAttributesToUser(provider, parsedResponse);
      return this.finalizeAuthentication(user, provider, parsedResponse.sessionIndex);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'SAML validation failed';
      this.auditLogger.log({ eventType: 'login_failure', success: false, errorMessage, details: { phase: 'saml_validation' } });
      return { success: false, error: errorMessage, errorCode: 'SAML_VALIDATION_FAILED' };
    }
  }

  public async validateOIDCToken(code: string, state: string, providerId?: string): Promise<AuthenticationResult> {
    try {
      const pendingRequest = this.pendingAuthnRequests.get(state);
      if (!pendingRequest) return { success: false, error: 'Invalid or expired state', errorCode: 'INVALID_STATE' };
      this.pendingAuthnRequests.delete(state);
      const provider = this.providerRegistry.get(providerId || pendingRequest.providerId);
      if (!provider || !provider.oidc) return { success: false, error: 'Provider not found or not configured for OIDC', errorCode: 'PROVIDER_NOT_FOUND' };
      const tokens = await this.tokenManager.exchangeCodeForTokens(provider, code);
      const claims = this.tokenManager.decodeAndValidateIdToken(tokens.idToken, provider, pendingRequest.nonce);
      const userInfo = await this.tokenManager.fetchUserInfo(provider, tokens.accessToken);
      const user = await this.userProvisioner.mapOIDCClaimsToUser(provider, { ...claims, ...userInfo }, tokens.accessToken);
      return this.finalizeAuthentication(user, provider, undefined, tokens);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OIDC validation failed';
      this.auditLogger.log({ eventType: 'login_failure', providerId, success: false, errorMessage, details: { phase: 'oidc_validation' } });
      return { success: false, error: errorMessage, errorCode: 'OIDC_VALIDATION_FAILED' };
    }
  }

  private finalizeAuthentication(user: SSOUser, provider: SSOProviderConfig, idpSessionId?: string, tokens?: any): AuthenticationResult {
    if (provider.mfa?.required && !user.mfaVerified) {
      const { challengeId, challenge } = this.mfaManager.createChallenge(user.id, provider.mfa.methods);
      return { success: false, requiresMfa: true, mfaChallenge: { challengeId, methods: provider.mfa.methods, expiresAt: challenge.expiresAt } };
    }
    const session = this.sessionManager.createSession(user, provider, idpSessionId, tokens);
    this.userProvisioner.storeUser(user);
    this.auditLogger.log({ eventType: 'login_success', userId: user.id, providerId: provider.id, sessionId: session.id, success: true, details: { protocol: provider.protocol, groups: user.groups } });
    this.emit('auth:success', { user, session, provider: provider.id });
    return { success: true, user, session };
  }

  // MFA
  public async completeMFAChallenge(challengeId: string, method: any, code: string): Promise<AuthenticationResult> {
    const result = await this.mfaManager.completeChallenge(challengeId, method, code);
    if (!result.success) {
      this.auditLogger.log({ eventType: 'mfa_failure', userId: result.userId, success: false, details: { method, challengeId } });
      return { success: false, error: result.error, errorCode: result.errorCode };
    }
    const user = this.userProvisioner.getUser(result.userId!);
    if (!user) return { success: false, error: 'User not found', errorCode: 'USER_NOT_FOUND' };
    this.userProvisioner.setMfaVerified(user.id, true);
    const provider = this.providerRegistry.get(user.providerId);
    if (!provider) return { success: false, error: 'Provider not found', errorCode: 'PROVIDER_NOT_FOUND' };
    const session = this.sessionManager.createSession(user, provider);
    this.auditLogger.log({ eventType: 'mfa_success', userId: user.id, providerId: user.providerId, sessionId: session.id, success: true, details: { method } });
    return { success: true, user, session };
  }

  // Session Management
  public async refreshSession(sessionId: string): Promise<{ success: boolean; session?: SSOSession; error?: string }> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    const provider = this.providerRegistry.get(session.providerId);
    if (!provider) return { success: false, error: 'Provider not found' };
    const result = await this.sessionManager.refreshSession(sessionId, provider);
    if (result.success) this.auditLogger.log({ eventType: 'session_refresh', userId: session.userId, providerId: session.providerId, sessionId, success: true, details: {} });
    return result;
  }

  public getSession(sessionId: string): SSOSession | undefined { return this.sessionManager.getSession(sessionId); }
  public getUserSessions(userId: string): SSOSession[] { return this.sessionManager.getUserSessions(userId); }
  public validateSession(sessionId: string): { valid: boolean; reason?: string } { return this.sessionManager.validateSession(sessionId); }

  // Logout
  public async initiateLogout(request: LogoutRequest): Promise<LogoutResult> {
    const session = this.sessionManager.getSession(request.sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    const provider = this.providerRegistry.get(session.providerId);
    const logoutUrls: string[] = [];
    try {
      this.sessionManager.revokeSession(request.sessionId);
      if (request.singleLogout && provider) {
        this.sessionManager.revokeUserSessions(session.userId);
        if (provider.protocol === 'saml2' && provider.saml?.sloUrl) logoutUrls.push(this.authFlow.generateSAMLLogoutRequest(provider, session.idpSessionId, session.userId));
        else if (provider.protocol === 'oidc' && provider.oidc?.postLogoutRedirectUri) logoutUrls.push(this.authFlow.generateOIDCLogoutUrl(provider, session.accessToken));
        this.auditLogger.log({ eventType: 'slo_initiated', userId: session.userId, providerId: session.providerId, sessionId: session.id, success: true, details: {} });
      }
      this.auditLogger.log({ eventType: 'logout', userId: session.userId, providerId: session.providerId, sessionId: session.id, success: true, details: { singleLogout: request.singleLogout } });
      return { success: true, logoutUrls };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      this.auditLogger.log({ eventType: 'logout', userId: session.userId, providerId: session.providerId, sessionId: session.id, success: false, errorMessage, details: {} });
      return { success: false, error: errorMessage };
    }
  }

  // User Management
  public getUser(userId: string): SSOUser | undefined { return this.userProvisioner.getUser(userId); }
  public getUserByExternalId(externalId: string, providerId: string): SSOUser | undefined { return this.userProvisioner.getUserByExternalId(externalId, providerId); }
  public updateUser(userId: string, updates: Partial<SSOUser>): SSOUser | undefined { return this.userProvisioner.updateUser(userId, updates); }
  public deactivateUser(userId: string): boolean {
    const result = this.userProvisioner.deactivateUser(userId);
    if (result) this.sessionManager.revokeUserSessions(userId);
    return result;
  }

  // Attribute and Role Mapping
  public mapAttributes(providerId: string, idpAttributes: Record<string, unknown>): Record<string, unknown> {
    const provider = this.providerRegistry.get(providerId);
    if (!provider) throw new Error('Provider not found');
    return this.userProvisioner.getGroupSync().mapAttributes(provider, idpAttributes);
  }

  public syncRoles(providerId: string, idpGroups: string[]): { roles: string[]; permissions: string[] } {
    const provider = this.providerRegistry.get(providerId);
    if (!provider) throw new Error('Provider not found');
    return this.userProvisioner.getGroupSync().syncRoles(provider, idpGroups);
  }

  // Audit Logging
  public getAuditLogs(filters?: { userId?: string; providerId?: string; eventType?: AuditEventType; startDate?: Date; endDate?: Date; success?: boolean; limit?: number; offset?: number }): { logs: AuditLogEntry[]; total: number } { return this.auditLogger.getLogs(filters); }
  public clearAuditLogs(olderThan: Date): number { return this.auditLogger.clearLogs(olderThan); }

  // Fallback & Statistics
  public getFallbackOptions(providerId?: string): { localAuth: boolean; alternativeProviders: SSOProviderConfig[] } { return { localAuth: true, alternativeProviders: this.getEnabledProviders().filter((p) => p.id !== providerId) }; }

  public getStatistics(): SSOStatistics {
    const providers = this.providerRegistry.getAll();
    const sessions = this.sessionManager.getAllSessions();
    const users = this.userProvisioner.getAllUsers();
    const byType: Record<IdPType, number> = { okta: 0, azure_ad: 0, onelogin: 0, ping_identity: 0, auth0: 0, google_workspace: 0, aws_iam_identity_center: 0 };
    providers.forEach((p) => byType[p.type]++);
    const byProvider: Record<string, number> = {};
    users.forEach((u) => { byProvider[u.providerId] = (byProvider[u.providerId] || 0) + 1; });
    return {
      providers: { total: providers.length, enabled: providers.filter((p) => p.enabled).length, byType },
      sessions: { total: sessions.length, active: sessions.filter((s) => s.status === 'active').length, expired: sessions.filter((s) => s.status === 'expired').length, revoked: sessions.filter((s) => s.status === 'revoked').length },
      users: { total: users.length, active: users.filter((u) => u.status === 'active').length, byProvider },
      auditLogs: { total: this.auditLogger.size, last24h: this.auditLogger.getLast24HoursCount(), failures: this.auditLogger.getFailureCount() },
    };
  }
}

// Re-export types for backward compatibility
export * from './manager/types';

// Export singleton accessor
export function getEnterpriseSSOManager(): EnterpriseSSOManager {
  return EnterpriseSSOManager.getInstance();
}

export default EnterpriseSSOManager;
