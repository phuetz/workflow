/**
 * OAuth2 Basic Types
 * Core type definitions for OAuth2 implementation
 */

/**
 * OAuth2 Grant Types
 */
export type GrantType =
  | 'authorization_code'
  | 'implicit'
  | 'password'
  | 'client_credentials'
  | 'refresh_token'
  | 'device_code'
  | 'jwt_bearer'
  | 'saml2_bearer';

/**
 * OAuth2 Response Types
 */
export type ResponseType = 'code' | 'token' | 'id_token' | 'code token' | 'code id_token' | 'token id_token' | 'code token id_token';

/**
 * OAuth2 Token Types
 */
export type TokenType = 'Bearer' | 'MAC' | 'JWT';
