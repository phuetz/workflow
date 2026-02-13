/**
 * Abstract Auth Provider Interface
 * Base interface that all auth providers must implement
 *
 * @module services/auth/providers/AuthProvider
 * @version 1.0.0
 */

import type {
  User,
  AuthResult,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  AuthStateChangeCallback,
} from '../types';
import { logger } from '../../SimpleLogger';

/**
 * Abstract interface for authentication providers
 * All providers (Local, Supabase, LDAP, etc.) must implement this interface
 */
export interface AuthProvider {
  /**
   * Provider name identifier
   */
  readonly name: string;

  /**
   * Initialize the provider
   */
  initialize(): Promise<void>;

  /**
   * Authenticate user with email and password
   */
  login(credentials: LoginCredentials): Promise<AuthResult>;

  /**
   * Logout the current user
   */
  logout(): Promise<void>;

  /**
   * Register a new user
   */
  register(data: RegisterData): Promise<AuthResult>;

  /**
   * Get the currently authenticated user
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * Refresh the access token
   */
  refreshToken(): Promise<AuthTokens | null>;

  /**
   * Verify a token and return the associated user
   */
  verifyToken(token: string): Promise<User | null>;

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean;

  /**
   * Get current auth tokens
   */
  getTokens(): AuthTokens | null;

  /**
   * Get authorization header value
   */
  getAuthHeader(): string;

  /**
   * Change user password
   */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;

  /**
   * Request password reset
   */
  requestPasswordReset(email: string): Promise<void>;

  /**
   * Reset password with token
   */
  resetPassword(token: string, newPassword: string): Promise<void>;

  /**
   * Verify email with token
   */
  verifyEmail(token: string): Promise<void>;

  /**
   * Resend verification email
   */
  resendVerificationEmail(): Promise<void>;

  /**
   * Subscribe to auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChange(callback: AuthStateChangeCallback): () => void;

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean;

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean;

  /**
   * Destroy/cleanup the provider
   */
  destroy(): Promise<void>;
}

/**
 * Base class with common functionality for auth providers
 */
export abstract class BaseAuthProvider implements AuthProvider {
  abstract readonly name: string;

  protected currentUser: User | null = null;
  protected tokens: AuthTokens | null = null;
  protected authStateListeners: AuthStateChangeCallback[] = [];

  abstract initialize(): Promise<void>;
  abstract login(credentials: LoginCredentials): Promise<AuthResult>;
  abstract logout(): Promise<void>;
  abstract register(data: RegisterData): Promise<AuthResult>;
  abstract refreshToken(): Promise<AuthTokens | null>;
  abstract verifyToken(token: string): Promise<User | null>;
  abstract changePassword(currentPassword: string, newPassword: string): Promise<void>;
  abstract requestPasswordReset(email: string): Promise<void>;
  abstract resetPassword(token: string, newPassword: string): Promise<void>;
  abstract verifyEmail(token: string): Promise<void>;
  abstract resendVerificationEmail(): Promise<void>;

  async getCurrentUser(): Promise<User | null> {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && this.tokens !== null;
  }

  getTokens(): AuthTokens | null {
    return this.tokens;
  }

  getAuthHeader(): string {
    return this.tokens ? `Bearer ${this.tokens.accessToken}` : '';
  }

  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    this.authStateListeners.push(callback);
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  hasPermission(permission: string): boolean {
    return this.currentUser?.permissions.includes(permission) || false;
  }

  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  protected notifyAuthStateChange(): void {
    this.authStateListeners.forEach(callback => {
      try {
        callback(this.currentUser);
      } catch (error) {
        logger.error('Error in auth state listener', { component: 'AuthProvider', error });
      }
    });
  }

  async destroy(): Promise<void> {
    this.currentUser = null;
    this.tokens = null;
    this.authStateListeners = [];
  }
}
