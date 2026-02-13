/**
 * Type Definitions for Identity Federation Hub
 * All interfaces, types, and enums used across federation modules
 */

// =============================================================================
// Organization Types
// =============================================================================

export interface OrganizationInfo {
  id: string;
  name: string;
  domain: string;
  entityId: string;
  metadataUrl?: string;
  contacts: OrganizationContact[];
  attributes: Record<string, unknown>;
}

export interface OrganizationContact {
  type: 'technical' | 'administrative' | 'support';
  name: string;
  email: string;
  phone?: string;
}

// =============================================================================
// Trust Relationship Types
// =============================================================================

export interface TrustRelationship {
  id: string;
  name: string;
  sourceOrganization: OrganizationInfo;
  targetOrganization: OrganizationInfo;
  trustType: TrustType;
  trustDirection: TrustDirection;
  status: TrustStatus;
  protocol: FederationProtocol;
  metadata: FederationMetadata;
  claimsMapping: ClaimsMappingRule[];
  validFrom: Date;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
  lastVerifiedAt?: Date;
  autoRenew: boolean;
  tags: string[];
}

export type TrustType = 'federation' | 'delegation' | 'impersonation' | 'assertion';
export type TrustDirection = 'one-way' | 'two-way' | 'inbound' | 'outbound';
export type TrustStatus = 'active' | 'pending' | 'suspended' | 'expired' | 'revoked';

export type FederationProtocol =
  | 'saml2'
  | 'ws-federation'
  | 'oauth2'
  | 'oidc'
  | 'scim'
  | 'custom';

export interface FederationMetadata {
  entityId: string;
  ssoEndpoint?: string;
  sloEndpoint?: string;
  tokenEndpoint?: string;
  userInfoEndpoint?: string;
  jwksUri?: string;
  certificate?: string;
  publicKey?: string;
  algorithms?: string[];
  scopes?: string[];
  responseTypes?: string[];
  grantTypes?: string[];
  attributes: Record<string, unknown>;
}

// =============================================================================
// Claims Types
// =============================================================================

export interface ClaimsMappingRule {
  id: string;
  name: string;
  sourceClaimType: string;
  targetClaimType: string;
  transformation: ClaimTransformation;
  required: boolean;
  defaultValue?: string;
  condition?: ClaimCondition;
}

export interface ClaimTransformation {
  type: 'passthrough' | 'map' | 'regex' | 'script' | 'lookup';
  config: Record<string, unknown>;
}

export interface ClaimCondition {
  type: 'equals' | 'contains' | 'regex' | 'exists' | 'notExists';
  value?: string;
}

export interface FederatedClaims {
  subject: string;
  issuer: string;
  audience?: string;
  email?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  groups?: string[];
  roles?: string[];
  permissions?: string[];
  attributes: Record<string, unknown>;
  issuedAt: Date;
  expiresAt?: Date;
  notBefore?: Date;
}

// =============================================================================
// Identity Types
// =============================================================================

export interface FederatedIdentity {
  id: string;
  localUserId: string;
  externalUserId: string;
  providerId: string;
  providerName: string;
  claims: FederatedClaims;
  linkedAt: Date;
  lastLoginAt?: Date;
  status: IdentityLinkStatus;
  metadata: Record<string, unknown>;
}

export type IdentityLinkStatus = 'active' | 'pending' | 'suspended' | 'revoked';

export interface FederatedUser {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  role: string;
  permissions: string[];
  groups: string[];
  attributes: Record<string, unknown>;
  federatedIdentities: string[];
}

// =============================================================================
// Identity Provider Types
// =============================================================================

export interface IdentityProvider {
  id: string;
  name: string;
  type: FederationProtocol;
  enabled: boolean;
  priority: number;
  config: IdentityProviderConfig;
  claimsMapping: ClaimsMappingRule[];
  trustRelationshipId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IdentityProviderConfig {
  entityId: string;
  ssoUrl?: string;
  sloUrl?: string;
  tokenUrl?: string;
  authorizationUrl?: string;
  userInfoUrl?: string;
  jwksUri?: string;
  clientId?: string;
  clientSecret?: string;
  certificate?: string;
  privateKey?: string;
  scopes?: string[];
  responseType?: string;
  grantType?: string;
  redirectUri?: string;
  attributes: Record<string, unknown>;
}

// =============================================================================
// Session Types
// =============================================================================

export interface FederatedSession {
  id: string;
  userId: string;
  federatedIdentityId: string;
  providerId: string;
  sessionToken: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: Date;
  createdAt: Date;
  lastActivityAt: Date;
  ipAddress?: string;
  userAgent?: string;
  status: SessionStatus;
  attributes: Record<string, unknown>;
}

export type SessionStatus = 'active' | 'expired' | 'revoked' | 'terminated';

// =============================================================================
// Token Exchange Types
// =============================================================================

export interface TokenExchangeRequest {
  grantType: 'urn:ietf:params:oauth:grant-type:token-exchange';
  subjectToken: string;
  subjectTokenType: TokenType;
  requestedTokenType?: TokenType;
  audience?: string;
  scope?: string[];
  actorToken?: string;
  actorTokenType?: TokenType;
}

export interface TokenExchangeResponse {
  accessToken: string;
  issuedTokenType: TokenType;
  tokenType: 'Bearer';
  expiresIn: number;
  scope?: string;
  refreshToken?: string;
}

export type TokenType =
  | 'urn:ietf:params:oauth:token-type:access_token'
  | 'urn:ietf:params:oauth:token-type:refresh_token'
  | 'urn:ietf:params:oauth:token-type:id_token'
  | 'urn:ietf:params:oauth:token-type:saml1'
  | 'urn:ietf:params:oauth:token-type:saml2'
  | 'urn:ietf:params:oauth:token-type:jwt';

// =============================================================================
// SCIM Types
// =============================================================================

export interface SCIMUser {
  schemas: string[];
  id: string;
  externalId?: string;
  userName: string;
  name?: {
    formatted?: string;
    familyName?: string;
    givenName?: string;
    middleName?: string;
    honorificPrefix?: string;
    honorificSuffix?: string;
  };
  displayName?: string;
  nickName?: string;
  profileUrl?: string;
  emails?: Array<{
    value: string;
    type?: string;
    primary?: boolean;
  }>;
  addresses?: Array<{
    formatted?: string;
    streetAddress?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    type?: string;
  }>;
  phoneNumbers?: Array<{
    value: string;
    type?: string;
  }>;
  photos?: Array<{
    value: string;
    type?: string;
  }>;
  userType?: string;
  title?: string;
  preferredLanguage?: string;
  locale?: string;
  timezone?: string;
  active?: boolean;
  groups?: Array<{
    value: string;
    display?: string;
    type?: string;
    $ref?: string;
  }>;
  roles?: Array<{
    value: string;
    display?: string;
    type?: string;
    primary?: boolean;
  }>;
  meta?: {
    resourceType?: string;
    created?: string;
    lastModified?: string;
    location?: string;
    version?: string;
  };
}

// =============================================================================
// WS-Federation Types
// =============================================================================

export interface WSFederationRequest {
  wa: 'wsignin1.0' | 'wsignout1.0' | 'wsignoutcleanup1.0';
  wtrealm: string;
  wreply?: string;
  wctx?: string;
  wct?: string;
  wfresh?: number;
  whr?: string;
}

// =============================================================================
// Validation Types
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  user?: FederatedUser;
  claims?: FederatedClaims;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface FederationHubConfig {
  hubId: string;
  hubName: string;
  entityId: string;
  issuer: string;
  signingKey: string;
  signingCertificate: string;
  encryptionKey?: string;
  encryptionCertificate?: string;
  defaultSessionDuration: number;
  maxSessionDuration: number;
  allowedClockSkew: number;
  enableTokenExchange: boolean;
  enableSCIM: boolean;
  scimEndpoint?: string;
  wsFederationEndpoint?: string;
  samlEndpoint?: string;
  oidcEndpoint?: string;
}

export interface FederationHubStats {
  totalTrustRelationships: number;
  activeTrustRelationships: number;
  totalIdentityProviders: number;
  activeIdentityProviders: number;
  totalFederatedIdentities: number;
  totalActiveSessions: number;
  tokenExchangesLast24h: number;
  authenticationSuccessRate: number;
  averageAuthenticationTime: number;
}
