/**
 * OAuth2 Token Types
 * Token-related type definitions
 */

import type { TokenType } from './basic';

/**
 * Authorization Code
 */
export interface AuthorizationCode {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  state?: string;
  nonce?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  sessionId?: string;
  expiresAt: Date;
  usedAt?: Date;
}

/**
 * Access Token
 */
export interface AccessToken {
  token: string;
  tokenType: TokenType;
  clientId: string;
  userId?: string;
  scope: string;
  expiresAt: Date;
  refreshToken?: string;
  idToken?: string;
  metadata: TokenMetadata;
}

export interface TokenMetadata {
  jti?: string;
  iat: number;
  exp: number;
  iss: string;
  sub?: string;
  aud: string | string[];
  azp?: string;
  sessionId?: string;
  authTime?: number;
  acr?: string;
  amr?: string[];
  claims?: any;
  extra?: any;
}

/**
 * Refresh Token
 */
export interface RefreshToken {
  token: string;
  clientId: string;
  userId: string;
  scope: string;
  expiresAt: Date;
  usedAt?: Date;
  rotated?: boolean;
  family?: string;
}

/**
 * Device Code
 */
export interface DeviceCode {
  deviceCode: string;
  userCode: string;
  clientId: string;
  scope: string;
  interval: number;
  expiresAt: Date;
  authorizedAt?: Date;
  userId?: string;
  denied?: boolean;
}

/**
 * Token Introspection
 */
export interface TokenIntrospection {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string | string[];
  iss?: string;
  jti?: string;
  [key: string]: any;
}

/**
 * Token Revocation
 */
export interface TokenRevocation {
  token: string;
  token_type_hint?: 'access_token' | 'refresh_token';
}
