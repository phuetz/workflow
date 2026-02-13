/**
 * OAuth2 Configuration Types
 * Server configuration and settings types
 */

/**
 * Rate Limiting
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstSize: number;
}

export interface QuotaConfig {
  maxTokens: number;
  maxRefreshTokens: number;
  maxAuthorizationCodes: number;
  maxDeviceCodes: number;
}

/**
 * Security Configuration
 */
export interface SecurityConfig {
  requireHttps: boolean;
  allowHttp: boolean;
  corsOrigins: string[];
  csrfProtection: boolean;
  clickjackingProtection: boolean;
  rateLimiting: RateLimitConfig;
  ipWhitelist?: string[];
  ipBlacklist?: string[];
  userAgentBlacklist?: string[];
  jwtSigningKey: string;
  jwtEncryptionKey?: string;
  tokenHashAlgorithm: string;
  bcryptRounds: number;
}

/**
 * Metrics
 */
export interface OAuth2Metrics {
  totalClients: number;
  totalAuthorizationRequests: number;
  totalTokensIssued: number;
  totalTokensRevoked: number;
  totalIntrospections: number;
  activeTokens: number;
  activeSessions: number;
  averageTokenLifetime: number;
  tokenIssuanceRate: number;
  authorizationSuccessRate: number;
  tokenRefreshRate: number;
  errorRate: number;
  topClients: Array<{ clientId: string; requests: number }>;
  topScopes: Array<{ scope: string; usage: number }>;
}
