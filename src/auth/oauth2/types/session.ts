/**
 * OAuth2 Session & Consent Types
 * Session management and user consent types
 */

/**
 * Scopes
 */
export interface Scope {
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  required?: boolean;
  userConsent?: boolean;
  claims?: string[];
  resources?: string[];
  metadata?: Record<string, any>;
}

/**
 * User Consent
 */
export interface UserConsent {
  userId: string;
  clientId: string;
  scopes: string[];
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  sessionId?: string;
}

/**
 * Session
 */
export interface OAuth2Session {
  id: string;
  userId: string;
  clientId?: string;
  authTime: Date;
  lastActivity: Date;
  expiresAt?: Date;
  acr?: string;
  amr?: string[];
  metadata?: Record<string, any>;
}
