/**
 * Unified Authentication Types
 * Common interfaces for all auth providers
 *
 * @module services/auth/types
 * @version 1.0.0
 */

/**
 * User representation across all providers
 */
export interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  permissions: string[];
  emailVerified: boolean;
  lastLoginAt?: Date | string | null;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType?: 'Bearer';
}

/**
 * Result of authentication operations
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  tokens?: AuthTokens;
  error?: string;
  errorCode?: string;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data
 */
export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Password change request
 */
export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Auth provider configuration
 */
export interface AuthProviderConfig {
  type: 'local' | 'supabase' | 'ldap' | 'oauth2';
  enabled: boolean;
  options?: Record<string, unknown>;
}

/**
 * Auth service configuration
 */
export interface AuthServiceConfig {
  defaultProvider: 'local' | 'supabase';
  providers: AuthProviderConfig[];
  autoRefreshTokens: boolean;
  tokenRefreshThresholdSeconds: number;
}

/**
 * Auth state change callback
 */
export type AuthStateChangeCallback = (user: User | null) => void;

/**
 * Role permissions mapping
 */
export const RolePermissions: Record<string, string[]> = {
  admin: [
    'workflow.create', 'workflow.read', 'workflow.update', 'workflow.delete',
    'workflow.execute', 'workflow.share', 'workflow.publish',
    'credential.create', 'credential.read', 'credential.update', 'credential.delete',
    'user.create', 'user.read', 'user.update', 'user.delete',
    'team.create', 'team.read', 'team.update', 'team.delete',
    'system.admin', 'audit.read', 'settings.manage'
  ],
  user: [
    'workflow.create', 'workflow.read', 'workflow.update', 'workflow.delete',
    'workflow.execute', 'workflow.share',
    'credential.create', 'credential.read', 'credential.update', 'credential.delete',
    'team.read'
  ],
  viewer: [
    'workflow.read', 'workflow.execute', 'credential.read', 'team.read'
  ]
};

/**
 * Get permissions for a given role
 */
export function getPermissionsForRole(role: string): string[] {
  return RolePermissions[role.toLowerCase()] || RolePermissions['viewer'];
}
