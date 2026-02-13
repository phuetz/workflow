/**
 * Unified Authentication Service Barrel Export
 *
 * This module provides the unified authentication service with interchangeable providers.
 * It consolidates multiple auth implementations (Local JWT, Supabase) into a single
 * facade with consistent API.
 *
 * @module services/auth
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import { authService } from '@services/auth';
 *
 * // Initialize (typically done at app startup)
 * await authService.initialize();
 *
 * // Login
 * const result = await authService.login({ email: 'user@example.com', password: 'password' });
 * if (result.success) {
 *   console.log('Logged in as:', result.user);
 * }
 *
 * // Check auth state
 * if (authService.isAuthenticated()) {
 *   const user = await authService.getCurrentUser();
 *   console.log('Current user:', user);
 * }
 *
 * // Use specific provider
 * import { LocalAuthProvider, SupabaseAuthProvider } from '@services/auth';
 * const localProvider = new LocalAuthProvider();
 * await localProvider.initialize();
 * ```
 *
 * Architecture:
 * ```
 * AuthService (Facade)
 *   ├── LocalAuthProvider (JWT + Prisma)
 *   └── SupabaseAuthProvider (Supabase SDK)
 * ```
 */

// Main service
export { AuthService, authService } from './AuthService';

// Types
export type {
  User,
  AuthResult,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  PasswordChangeRequest,
  AuthProviderConfig,
  AuthServiceConfig,
  AuthStateChangeCallback,
} from './types';

export { RolePermissions, getPermissionsForRole } from './types';

// Providers
export {
  AuthProvider,
  BaseAuthProvider,
  LocalAuthProvider,
  SupabaseAuthProvider,
} from './providers';
