/**
 * SSO Manager Types and Interfaces
 * All type definitions for the Enterprise SSO system
 */

// ============================================================================
// Basic Types
// ============================================================================

export type IdPType =
  | 'okta'
  | 'azure_ad'
  | 'onelogin'
  | 'ping_identity'
  | 'auth0'
  | 'google_workspace'
  | 'aws_iam_identity_center';

export type AuthProtocol = 'saml2' | 'oidc';

export type MFAMethod = 'totp' | 'sms' | 'email' | 'push' | 'hardware_key' | 'biometric';

export type SessionStatus = 'active' | 'expired' | 'revoked' | 'pending_mfa';

export type AuditEventType =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'session_refresh'
  | 'mfa_challenge'
  | 'mfa_success'
  | 'mfa_failure'
  | 'token_refresh'
  | 'attribute_sync'
  | 'role_sync'
  | 'jit_provision'
  | 'slo_initiated'
  | 'slo_completed'
  | 'config_change';

// ============================================================================
// Provider Configuration
// ============================================================================

export interface SSOProviderConfig {
  id: string;
  name: string;
  type: IdPType;
  protocol: AuthProtocol;
  enabled: boolean;
  priority: number;

  // SAML 2.0 Configuration
  saml?: SAMLConfig;

  // OIDC Configuration
  oidc?: OIDCConfig;

  // Attribute Mapping
  attributeMapping: AttributeMapping;

  // Role Mapping
  roleMapping: RoleMapping[];

  // MFA Configuration
  mfa?: MFAConfig;

  // Session Configuration
  session?: SessionConfig;

  // JIT Provisioning
  jitProvisioning?: JITProvisioningConfig;

  // Metadata
  metadata?: ProviderMetadata;
}

export interface SAMLConfig {
  entityId: string;
  ssoUrl: string;
  sloUrl?: string;
  certificate: string;
  privateKey?: string;
  signatureAlgorithm: 'sha256' | 'sha512';
  digestAlgorithm: 'sha256' | 'sha512';
  assertionConsumerServiceUrl: string;
  audienceRestriction?: string;
  nameIdFormat: 'emailAddress' | 'persistent' | 'transient' | 'unspecified';
  authnContext?: string;
  signAuthnRequest: boolean;
  wantAssertionsSigned: boolean;
  wantMessageSigned: boolean;
  acceptedClockSkewMs: number;
  forceAuthn?: boolean;
  passiveAuthn?: boolean;
}

export interface OIDCConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  jwksUrl: string;
  redirectUri: string;
  postLogoutRedirectUri?: string;
  scope: string[];
  responseType: 'code' | 'id_token' | 'code id_token';
  responseMode?: 'query' | 'fragment' | 'form_post';
  codeChallengeMethod?: 'S256' | 'plain';
  tokenEndpointAuthMethod: 'client_secret_basic' | 'client_secret_post' | 'private_key_jwt';
  idTokenSignedResponseAlg?: string;
  clockTolerance?: number;
}

export interface MFAConfig {
  enabled: boolean;
  required: boolean;
  methods: MFAMethod[];
  rememberDeviceDays?: number;
  stepUpAuthTriggers?: string[];
}

export interface SessionConfig {
  maxDurationMs: number;
  idleTimeoutMs: number;
  absoluteTimeoutMs: number;
  singleSessionPerUser: boolean;
  persistSessions: boolean;
}

export interface JITProvisioningConfig {
  enabled: boolean;
  defaultRole: string;
  autoActivate: boolean;
  syncAttributes: boolean;
  syncGroups: boolean;
  deactivateOnRemoval: boolean;
}

export interface ProviderMetadata {
  lastUpdated: Date;
  createdBy: string;
  description?: string;
  tags?: string[];
}

// ============================================================================
// Attribute and Role Mapping
// ============================================================================

export interface AttributeMapping {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string;
  department?: string;
  title?: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  timezone?: string;
  customAttributes?: Record<string, string>;
}

export interface RoleMapping {
  idpGroup: string;
  localRole: string;
  permissions?: string[];
  priority?: number;
}

// ============================================================================
// SAML Types
// ============================================================================

export interface SAMLResponse {
  issuer: string;
  nameId: string;
  nameIdFormat: string;
  sessionIndex?: string;
  attributes: Record<string, string | string[]>;
  conditions?: {
    notBefore?: Date;
    notOnOrAfter?: Date;
    audienceRestriction?: string[];
  };
  authnContext?: string;
  signature?: {
    valid: boolean;
    algorithm: string;
  };
}

// ============================================================================
// OIDC Types
// ============================================================================

export interface OIDCToken {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  scope: string[];
  claims?: OIDCClaims;
}

export interface OIDCClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  auth_time?: number;
  nonce?: string;
  acr?: string;
  amr?: string[];
  azp?: string;
  at_hash?: string;
  c_hash?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  groups?: string[];
  [key: string]: unknown;
}

// ============================================================================
// User Types
// ============================================================================

export interface SSOUser {
  id: string;
  externalId: string;
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups: string[];
  roles: string[];
  permissions: string[];
  department?: string;
  title?: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  timezone?: string;
  customAttributes: Record<string, unknown>;
  mfaVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  provisionedVia: 'jit' | 'scim' | 'manual';
  status: 'active' | 'inactive' | 'pending' | 'locked';
}

// ============================================================================
// Session Types
// ============================================================================

export interface SSOSession {
  id: string;
  userId: string;
  providerId: string;
  protocol: AuthProtocol;
  status: SessionStatus;
  idpSessionId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  mfaCompleted: boolean;
  mfaMethod?: MFAMethod;
  deviceId?: string;
  deviceInfo?: {
    userAgent: string;
    ip: string;
    location?: string;
  };
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId?: string;
  providerId?: string;
  sessionId?: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, unknown>;
  errorMessage?: string;
  errorCode?: string;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface AuthenticationRequest {
  providerId: string;
  returnUrl?: string;
  forceAuthn?: boolean;
  prompt?: 'login' | 'none' | 'consent' | 'select_account';
  loginHint?: string;
  state?: string;
  nonce?: string;
  acrValues?: string[];
}

export interface AuthenticationResult {
  success: boolean;
  user?: SSOUser;
  session?: SSOSession;
  requiresMfa?: boolean;
  mfaChallenge?: {
    challengeId: string;
    methods: MFAMethod[];
    expiresAt: Date;
  };
  redirectUrl?: string;
  error?: string;
  errorCode?: string;
}

export interface LogoutRequest {
  sessionId: string;
  userId?: string;
  providerId?: string;
  singleLogout?: boolean;
  returnUrl?: string;
}

export interface LogoutResult {
  success: boolean;
  logoutUrls?: string[];
  error?: string;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface SSOStatistics {
  providers: {
    total: number;
    enabled: number;
    byType: Record<IdPType, number>;
  };
  sessions: {
    total: number;
    active: number;
    expired: number;
    revoked: number;
  };
  users: {
    total: number;
    active: number;
    byProvider: Record<string, number>;
  };
  auditLogs: {
    total: number;
    last24h: number;
    failures: number;
  };
}

// ============================================================================
// MFA Challenge Type
// ============================================================================

export interface MFAChallenge {
  userId: string;
  methods: MFAMethod[];
  expiresAt: Date;
}

// ============================================================================
// Default Session Configuration
// ============================================================================

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  maxDurationMs: 24 * 60 * 60 * 1000, // 24 hours
  idleTimeoutMs: 30 * 60 * 1000, // 30 minutes
  absoluteTimeoutMs: 72 * 60 * 60 * 1000, // 72 hours
  singleSessionPerUser: false,
  persistSessions: true,
};
