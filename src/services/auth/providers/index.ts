/**
 * Auth Providers Barrel Export
 *
 * @module services/auth/providers
 * @version 1.0.0
 */

// Abstract base
export { AuthProvider, BaseAuthProvider } from './AuthProvider';

// Concrete implementations
export { LocalAuthProvider } from './LocalAuthProvider';
export { SupabaseAuthProvider } from './SupabaseAuthProvider';
