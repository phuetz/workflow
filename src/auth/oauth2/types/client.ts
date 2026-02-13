/**
 * OAuth2 Client Types
 * Client application and configuration types
 */

import type { GrantType, ResponseType } from './basic';
import type { RateLimitConfig, QuotaConfig } from './config';

/**
 * Client Application
 */
export interface OAuth2Client {
  id: string;
  secret?: string;
  name: string;
  description?: string;
  logoUri?: string;
  redirectUris: string[];
  postLogoutRedirectUris?: string[];
  allowedGrantTypes: GrantType[];
  allowedResponseTypes: ResponseType[];
  allowedScopes: string[];
  defaultScopes?: string[];
  contacts?: string[];
  tosUri?: string;
  policyUri?: string;
  jwksUri?: string;
  jwks?: JsonWebKey[];
  softwareId?: string;
  softwareVersion?: string;
  metadata: ClientMetadata;
  settings: ClientSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientMetadata {
  owner: string;
  environment: 'development' | 'staging' | 'production';
  trusted: boolean;
  firstParty: boolean;
  verified: boolean;
  rateLimit?: RateLimitConfig;
  quotas?: QuotaConfig;
  tags?: string[];
}

export interface ClientSettings {
  requireConsent: boolean;
  requirePkce: boolean;
  requireSignedRequestObject: boolean;
  tokenEndpointAuthMethod: 'none' | 'client_secret_basic' | 'client_secret_post' | 'client_secret_jwt' | 'private_key_jwt';
  tokenEndpointAuthSigningAlg?: string;
  idTokenSignedResponseAlg?: string;
  idTokenEncryptedResponseAlg?: string;
  idTokenEncryptedResponseEnc?: string;
  userinfoSignedResponseAlg?: string;
  userinfoEncryptedResponseAlg?: string;
  userinfoEncryptedResponseEnc?: string;
  requestObjectSigningAlg?: string;
  requestObjectEncryptionAlg?: string;
  requestObjectEncryptionEnc?: string;
  defaultMaxAge?: number;
  requireAuthTime?: boolean;
  defaultAcrValues?: string[];
  initiateLoginUri?: string;
  requestUris?: string[];
  accessTokenLifetime?: number;
  refreshTokenLifetime?: number;
  idTokenLifetime?: number;
  authorizationCodeLifetime?: number;
  deviceCodeLifetime?: number;
  refreshTokenRotation?: boolean;
  refreshTokenReuse?: boolean;
  introspectionEndpointAuthMethod?: string;
  revocationEndpointAuthMethod?: string;
  backchannelLogoutUri?: string;
  backchannelLogoutSessionRequired?: boolean;
  frontchannelLogoutUri?: string;
  frontchannelLogoutSessionRequired?: boolean;
}

/**
 * JSON Web Key
 */
export interface JsonWebKey {
  kty: string;
  use?: string;
  key_ops?: string[];
  alg?: string;
  kid?: string;
  x5c?: string[];
  x5t?: string;
  'x5t#S256'?: string;
  x5u?: string;
  n?: string;
  e?: string;
  d?: string;
  p?: string;
  q?: string;
  dp?: string;
  dq?: string;
  qi?: string;
  x?: string;
  y?: string;
  k?: string;
}

/**
 * JSON Web Key Set
 */
export interface JsonWebKeySet {
  keys: JsonWebKey[];
}
