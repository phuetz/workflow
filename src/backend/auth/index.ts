/**
 * Authentication & Authorization Barrel Export
 *
 * This module provides unified exports for auth-related services.
 *
 * @module backend/auth
 * @version 1.0.0
 * @since 2026-01-10
 */

// Core Auth Manager
export { AuthManager } from './AuthManager';

// Auth Service (Prisma-backed)
export { AuthService, authService } from './AuthService';
export type { AuthUser, AuthTokens, LoginCredentials, RegisterData } from './AuthService';

// API Key Authentication
export { APIKeyService } from './APIKeyService';

// JWT Utilities
export * from './jwt';

// OAuth2 Service
export { OAuth2Service } from './OAuth2Service';

// SSO Service
export { SSOService } from './SSOService';

// RBAC (Role-Based Access Control)
export { RBACManager } from './RBACManager';
export { RBACService } from './RBACService';
export { RBACPrismaService, rbacPrismaService, Permission } from './RBACPrismaService';

// MFA (Multi-Factor Authentication)
export { MFAService } from './MFAService';

// Password Services
export { PasswordHashingService } from './PasswordHashingService';
export { PasswordStrengthValidator } from './PasswordStrengthValidator';
export { PasswordHistoryManager } from './PasswordHistoryManager';
export { PasswordResetService } from './PasswordResetService';
export { PasswordBreachChecker } from './PasswordBreachChecker';
export * from './passwordService';

// Supabase Integration
export { SupabaseAuthManager } from './SupabaseAuthManager';

/**
 * Architecture Overview:
 *
 * Authentication Layer:
 * ├── AuthManager           - Central authentication orchestrator
 * ├── APIKeyService         - API key generation and validation
 * ├── OAuth2Service         - OAuth2 provider integration
 * ├── SSOService            - Single Sign-On (SAML, OIDC)
 * └── SupabaseAuthManager   - Supabase auth integration
 *
 * Authorization Layer:
 * ├── RBACManager           - Role-based access control
 * └── RBACService           - Permission checking service
 *
 * Security Layer:
 * ├── MFAService            - Multi-factor authentication
 * ├── PasswordHashingService    - Secure password hashing
 * ├── PasswordStrengthValidator - Password policy enforcement
 * ├── PasswordHistoryManager    - Password reuse prevention
 * ├── PasswordResetService      - Password reset flows
 * └── PasswordBreachChecker     - HaveIBeenPwned integration
 *
 * Usage:
 * ```typescript
 * import { AuthManager, RBACService } from '@backend/auth';
 * ```
 */
