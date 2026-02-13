/**
 * OAuth2 Provider System - Type Definitions
 * Re-exports all types from the types directory
 *
 * Split from original large file for better maintainability:
 * - types/basic.ts (GrantType, ResponseType, TokenType)
 * - types/client.ts (OAuth2Client, ClientMetadata, ClientSettings, JWK)
 * - types/request.ts (AuthorizationRequest, TokenRequest)
 * - types/token.ts (AuthorizationCode, AccessToken, RefreshToken, DeviceCode)
 * - types/session.ts (Scope, UserConsent, OAuth2Session)
 * - types/config.ts (RateLimitConfig, QuotaConfig, SecurityConfig, Metrics)
 * - types/discovery.ts (DiscoveryDocument)
 */

export * from './types/index';
