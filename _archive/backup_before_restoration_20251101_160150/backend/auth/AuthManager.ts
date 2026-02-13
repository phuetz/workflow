/**
 * Authentication & Authorization Manager
 * JWT/OAuth2 system with role-based access control (RBAC)
 *
 * This class provides comprehensive authentication services including:
 * - Email/password authentication with bcrypt hashing
 * - OAuth2 integration (Google, GitHub, Microsoft)
 * - JWT token management with auto-refresh
 * - Role-based access control (admin, user, viewer)
 * - Session persistence across page reloads
 * - Account security features (lockout, password reset)
 *
 * @example
 * ```typescript
 * // Login with email/password
 * const { user, tokens } = await authManager.login({
 *   email: 'user@example.com',
 *   password: 'securePassword123'
 * });
 *
 * // Check permissions
 * if (authManager.hasPermission('workflow.create')) {
 *   // Create workflow
 * }
 * ```
 *
 * @since 1.0.0
 */

import { jwtService } from './jwt';
import { passwordService } from './passwordService';
import { userRepository } from '../database/userRepository';
import { emailService } from '../services/emailService';
import { logger } from '../../services/LoggingService';

/**
 * User entity representing an authenticated user
 */
interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  permissions: string[];
  lastLoginAt?: string;
  emailVerified: boolean;
}

/**
 * JWT authentication tokens
 */
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

/**
 * Login credentials for email/password authentication
 */
interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * OAuth2 provider configuration
 */
interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  authUrl: string;
  tokenUrl: string;
}

/**
 * Authentication & Authorization Manager
 * Handles all authentication flows and session management
 */
export class AuthManager {
  private currentUser: User | null = null;
  private tokens: AuthTokens | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  /**
   * Callback invoked when re-authentication is required
   * @example
   * ```typescript
   * authManager.onAuthRequired = (reason) => {
   *   console.log('Please log in again:', reason);
   *   redirectToLogin();
   * };
   * ```
   */
  public onAuthRequired?: (reason: string) => void;

  private oauthProviders: Map<string, OAuthProvider> = new Map();

  /**
   * Creates a new AuthManager instance
   * Automatically initializes OAuth providers and restores previous session
   */
  constructor() {
    this.initializeOAuthProviders();
    this.initializeAuth();
  }

  // Initialize OAuth providers conditionally based on available environment variables
  private initializeOAuthProviders(): void {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

    // Google OAuth
    if (process.env.VITE_GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.oauthProviders.set('google', {
        name: 'Google',
        clientId: process.env.VITE_GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: `${baseUrl}/auth/callback/google`,
        scope: ['openid', 'email', 'profile'],
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token'
      });
      logger.info('✅ Google OAuth provider configured');
    } else {
      logger.warn('⚠️  Google OAuth not configured (missing VITE_GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)');
    }

    // GitHub OAuth
    if (process.env.VITE_GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      this.oauthProviders.set('github', {
        name: 'GitHub',
        clientId: process.env.VITE_GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        redirectUri: `${baseUrl}/auth/callback/github`,
        scope: ['user:email'],
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token'
      });
      logger.info('✅ GitHub OAuth provider configured');
    } else {
      logger.warn('⚠️  GitHub OAuth not configured (missing VITE_GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET)');
    }

    // Microsoft OAuth
    if (process.env.VITE_MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      this.oauthProviders.set('microsoft', {
        name: 'Microsoft',
        clientId: process.env.VITE_MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        redirectUri: `${baseUrl}/auth/callback/microsoft`,
        scope: ['openid', 'email', 'profile'],
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
      });
      logger.info('✅ Microsoft OAuth provider configured');
    } else {
      logger.warn('⚠️  Microsoft OAuth not configured (missing VITE_MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET)');
    }

    if (this.oauthProviders.size === 0) {
      logger.warn('⚠️  No OAuth providers configured. Email/password authentication only.');
    }
  }

  private async initializeAuth() {
    // SERVER-SIDE FIX: localStorage only exists in browser, not on Node.js server
    if (typeof localStorage === 'undefined') {
      return; // Skip initialization on server-side
    }

    // Try to restore session from localStorage
    try {
      const savedTokens = localStorage.getItem('auth_tokens');
      const savedUser = localStorage.getItem('auth_user');

      if (savedTokens && savedUser) {
        try {
          this.tokens = JSON.parse(savedTokens);
          this.currentUser = JSON.parse(savedUser);

          // Verify token is still valid
          if (this.tokens && await this.isTokenValid(this.tokens.accessToken)) {
            this.startRefreshTimer();
            logger.info('✅ Session restored for user:', this.currentUser?.email);
          } else {
            await this.logout();
          }
        } catch (error) {
          logger.error('❌ Error restoring session:', error);
          await this.logout();
        }
      }
    } catch (error) {
      // Silently fail on server-side
      logger.debug('Auth initialization skipped (server-side)');
    }
  }

  /**
   * Authenticate user with email and password
   *
   * This method:
   * - Verifies credentials against the database
   * - Checks for account lockout (5 failed attempts)
   * - Auto-migrates old password hashes to bcrypt
   * - Generates JWT tokens (access + refresh)
   * - Starts automatic token refresh timer
   *
   * @param credentials - User's email and password
   * @returns Promise resolving to user object and JWT tokens
   * @throws {Error} If credentials are invalid
   * @throws {Error} If account is locked
   *
   * @example
   * ```typescript
   * try {
   *   const { user, tokens } = await authManager.login({
   *     email: 'user@example.com',
   *     password: 'securePassword123'
   *   });
   *   console.log('Logged in as:', user.email);
   *   console.log('Access token:', tokens.accessToken);
   * } catch (error) {
   *   console.error('Login failed:', error.message);
   * }
   * ```
   *
   * @see {@link register} for user registration
   * @see {@link logout} for logout
   * @since 1.0.0
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      // Simulate API call
      const response = await this.apiCall('/auth/login', 'POST', credentials);
      const { user, tokens } = response as { user: User; tokens: AuthTokens };

      await this.setSession(user, tokens);
      
      logger.info('✅ Login successful for user:', user.email);
      
      return { user, tokens };
    } catch (error) {
      logger.error('❌ Login failed:', error);
      throw new Error('Invalid email or password');
    }
  }

  // User Registration
  async register(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const response = await this.apiCall('/auth/register', 'POST', userData);
      const { user, tokens } = response as { user: User; tokens: AuthTokens };

      await this.setSession(user, tokens);
      
      logger.info('✅ Registration successful for user:', user.email);
      
      return { user, tokens };
    } catch (error) {
      logger.error('❌ Registration failed:', error);
      throw error;
    }
  }

  // OAuth2 Authentication
  async initiateOAuth(provider: string): Promise<string> {
    const config = this.oauthProviders.get(provider);
    if (!config) {
      throw new Error(`OAuth provider '${provider}' not configured`);
    }

    const state = this.generateSecureState();
    // SERVER-SIDE FIX: Only access localStorage in browser
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('oauth_state', state);
      localStorage.setItem('oauth_provider', provider);
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope.join(' '),
      response_type: 'code',
      state,
      access_type: 'offline',
      prompt: 'consent'
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;
    logger.info(`🔗 Initiating OAuth for ${provider}:`, authUrl);

    return authUrl;
  }

  // Handle OAuth callback
  async handleOAuthCallback(code: string, state: string, provider: string): Promise<{ user: User; tokens: AuthTokens }> {
    // SERVER-SIDE FIX: OAuth state verification only in browser
    let savedState = null;
    let savedProvider = null;
    if (typeof localStorage !== 'undefined') {
      savedState = localStorage.getItem('oauth_state');
      savedProvider = localStorage.getItem('oauth_provider');
    }

    // Verify state to prevent CSRF
    if (state !== savedState || provider !== savedProvider) {
      throw new Error('Invalid OAuth state or provider');
    }

    try {
      const response = await this.apiCall('/auth/oauth/callback', 'POST', {
        code,
        provider,
        state
      });

      const { user, tokens } = response as { user: User; tokens: AuthTokens };

      await this.setSession(user, tokens);

      // Clean up
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('oauth_state');
        localStorage.removeItem('oauth_provider');
      }

      logger.info(`✅ OAuth ${provider} login successful:`, user.email);

      return { user, tokens };
    } catch (error) {
      logger.error(`❌ OAuth ${provider} callback failed:`, error);
      throw error;
    }
  }

  // SECURITY FIX: Enhanced logout with proper token revocation
  async logout(userId?: string, refreshToken?: string): Promise<void> {
    try {
      // SECURITY FIX: Revoke tokens using JWT service
      if (this.tokens?.accessToken) {
        const accessPayload = jwtService.verifyToken(this.tokens.accessToken);
        if (accessPayload?.jti) {
          jwtService.revokeToken(accessPayload.jti);
        }
      }

      const tokenToRevoke = refreshToken || this.tokens?.refreshToken;
      if (tokenToRevoke) {
        const refreshPayload = tokenToRevoke ? jwtService.verifyToken(tokenToRevoke) : null;
        if (refreshPayload?.jti) {
          jwtService.revokeToken(refreshPayload.jti);
        }
      }
      
      // SECURITY FIX: Make API call with proper data
      if (this.tokens) {
        await this.apiCall('/auth/logout', 'POST', {
          refreshToken: tokenToRevoke || this.tokens.refreshToken
        });
      }
      
    } catch (error) {
      logger.warn('Token revocation or API call failed during logout:', error);
    } finally {
      this.clearSession();
      logger.info('✅ Logout successful with token revocation');
    }
  }

  // Token refresh
  async refreshTokens(): Promise<AuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.apiCall('/auth/refresh', 'POST', {
        refreshToken: this.tokens.refreshToken
      });

      this.tokens = response.tokens;
      this.saveTokens();
      this.startRefreshTimer();

      logger.info('✅ Tokens refreshed successfully');
      
      return this.tokens;
    } catch (error) {
      logger.error('❌ Token refresh failed:', error);
      await this.logout();
      throw error;
    }
  }

  // Password management
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!this.isAuthenticated() || !this.currentUser) {
      throw new Error('User not authenticated');
    }

    await this.apiCall('/auth/change-password', 'POST', {
      userId: this.currentUser.id,
      currentPassword,
      newPassword
    });

    logger.info('✅ Password changed successfully');
  }

  async resetPassword(email: string): Promise<void> {
    await this.apiCall('/auth/reset-password', 'POST', { email });
    logger.info('✅ Password reset email sent');
  }

  async confirmResetPassword(token: string, newPassword: string): Promise<void> {
    await this.apiCall('/auth/confirm-reset', 'POST', {
      token,
      newPassword
    });
    logger.info('✅ Password reset confirmed');
  }

  // Email verification
  async resendVerificationEmail(): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    await this.apiCall('/auth/resend-verification', 'POST', {
      userId: this.currentUser.id
    });
    logger.info('✅ Verification email sent');
  }

  async verifyEmail(token: string): Promise<void> {
    await this.apiCall('/auth/verify-email', 'POST', { token });
    
    if (this.currentUser) {
      this.currentUser.emailVerified = true;
      this.saveUser();
    }
    
    logger.info('✅ Email verified successfully');
  }

  // Authorization checks
  hasPermission(permission: string): boolean {
    return this.currentUser?.permissions.includes(permission) || false;
  }

  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.includes(this.currentUser?.role || '');
  }

  // Permission definitions
  private getPermissionsForRole(role: string): string[] {
    const permissions: Record<string, string[]> = {
      admin: [
        'workflow.create', 'workflow.read', 'workflow.update', 'workflow.delete',
        'workflow.execute', 'workflow.share', 'workflow.publish',
        'credential.create', 'credential.read', 'credential.update', 'credential.delete',
        'user.create', 'user.read', 'user.update', 'user.delete',
        'system.admin', 'audit.read'
      ],
      user: [
        'workflow.create', 'workflow.read', 'workflow.update', 'workflow.delete',
        'workflow.execute', 'workflow.share',
        'credential.create', 'credential.read', 'credential.update', 'credential.delete'
      ],
      viewer: [
        'workflow.read', 'credential.read'
      ]
    };

    return permissions[role] || [];
  }

  // Getters
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getTokens(): AuthTokens | null {
    return this.tokens;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && this.tokens !== null;
  }

  getAuthHeader(): string {
    return this.tokens ? `Bearer ${this.tokens.accessToken}` : '';
  }

  // Private helper methods
  private async setSession(user: User, tokens: AuthTokens): Promise<void> {
    user.permissions = this.getPermissionsForRole(user.role);
    
    this.currentUser = user;
    this.tokens = tokens;
    
    this.saveUser();
    this.saveTokens();
    this.startRefreshTimer();
  }

  private clearSession(): void {
    this.currentUser = null;
    this.tokens = null;

    // SERVER-SIDE FIX: Only access localStorage in browser
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_tokens');
    }

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private saveUser(): void {
    // SERVER-SIDE FIX: Only access localStorage in browser
    if (typeof localStorage !== 'undefined' && this.currentUser) {
      localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
    }
  }

  private saveTokens(): void {
    // SERVER-SIDE FIX: Only access localStorage in browser
    if (typeof localStorage !== 'undefined' && this.tokens) {
      try {
        // Store in localStorage for persistence across sessions
        // In production, consider using httpOnly cookies for refresh tokens
        localStorage.setItem('auth_tokens', JSON.stringify(this.tokens));
      } catch (error) {
        logger.error('Failed to store authentication tokens:', error);
        // Force logout if storage fails
        this.logout();
      }
    }
  }

  private startRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (this.tokens) {
      // Refresh 5 minutes before expiry
      const refreshTime = (this.tokens.expiresIn - 300) * 1000;
      this.refreshTimer = setTimeout(() => {
        this.refreshTokens().catch((error) => {
          // ERROR HANDLING FIX: Proper handling of token refresh failures
          logger.error('Token refresh failed:', error);
          // Clear invalid tokens to prevent further issues
          this.tokens = null;
          // Trigger re-authentication if callback is available
          if (this.onAuthRequired) {
            this.onAuthRequired('Token refresh failed. Please re-authenticate.');
          }
        });
      }, refreshTime);
    }
  }

  private async isTokenValid(token: string): Promise<boolean> {
    const payload = jwtService.verifyToken(token);
    return payload !== null;
  }

  private generateSecureState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Removed - password verification now handled by passwordService

  // Real API implementation
  private async apiCall(endpoint: string, method: string, data?: unknown): Promise<unknown> {
    switch (endpoint) {
      case '/auth/login': {
        const { email, password } = data as LoginCredentials;
        const user = await userRepository.findByEmail(email);
        if (!user) {
          throw new Error('Invalid credentials');
        }

        // Check if account is locked
        if (await userRepository.isAccountLocked(user.id)) {
          throw new Error('Account is locked due to too many failed login attempts');
        }

        // Verify password
        const isValidPassword = await passwordService.verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
          await userRepository.recordFailedLogin(user.id);
          throw new Error('Invalid credentials');
        }

        // Reset failed login attempts
        await userRepository.resetFailedLogins(user.id);

        // SECURITY: Automatic password hash migration
        // If user has old hash (scrypt or low bcrypt rounds), rehash with current settings
        if (passwordService.needsRehash(user.passwordHash)) {
          logger.info('Migrating password hash to bcrypt for user:', user.email);
          try {
            const newHash = await passwordService.hashPassword(password);
            await userRepository.update(user.id, { passwordHash: newHash });
            logger.info('Password hash migration successful for user:', user.email);
          } catch (error) {
            // Non-critical - log but don't fail login
            logger.error('Password hash migration failed:', error);
          }
        }

        // Get permissions for role
        user.permissions = this.getPermissionsForRole(user.role);

        // Generate JWT tokens
        const tokens = jwtService.generateTokens({
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions
        });

        return {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            permissions: user.permissions,
            emailVerified: user.emailVerified,
            lastLoginAt: user.lastLoginAt?.toISOString()
          },
          tokens: {
            ...tokens,
            tokenType: 'Bearer' as const
          }
        };
      }

      case '/auth/register': {
        const existingUser = await userRepository.findByEmail(data.email);
        // Validate email doesn't exist
        if (existingUser) {
          throw new Error('Email already registered');
        }

        // Hash password
        const passwordHash = await passwordService.hashPassword(data.password);

        // Create user
        const newUser = await userRepository.create({
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'user',
          status: 'active',
          permissions: this.getPermissionsForRole('user'),
          emailVerified: false,
          emailVerificationToken: passwordService.generateResetToken(),
          emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          failedLoginAttempts: 0
        });

        // Send verification email
        if (emailService) {
          await emailService.sendVerificationEmail(newUser);
        }

        // Generate JWT tokens
        const newTokens = jwtService.generateTokens({
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          permissions: newUser.permissions
        });

        return {
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            role: newUser.role,
            status: newUser.status,
            permissions: newUser.permissions,
            emailVerified: newUser.emailVerified
          },
          tokens: {
            ...newTokens,
            tokenType: 'Bearer' as const
          }
        };
      }

      case '/auth/refresh': {
        const { refreshToken } = data as { refreshToken: string };
        const refreshResult = await jwtService.refreshAccessToken(refreshToken);
        if (!refreshResult) {
          throw new Error('Invalid refresh token');
        }

        return {
          tokens: {
            accessToken: refreshResult.accessToken,
            refreshToken: refreshToken, // Keep same refresh token
            expiresIn: refreshResult.expiresIn,
            tokenType: 'Bearer' as const
          }
        };
      }

      case '/auth/logout': {
        // Revoke tokens
        if (data.refreshToken) {
          const payload = jwtService.verifyToken(data.refreshToken);
          if (payload) {
            jwtService.revokeToken(payload.jti);
          }
        }
        return { success: true };
      }

      case '/auth/change-password': {
        const { userId, currentPassword, newPassword } = data as { userId: string; currentPassword: string; newPassword: string };
        const userToUpdate = await userRepository.findById(userId);
        if (!userToUpdate) {
          throw new Error('User not found');
        }

        // Verify current password
        const isCurrentPasswordValid = await passwordService.verifyPassword(
          currentPassword,
          userToUpdate.passwordHash
        );
        if (!isCurrentPasswordValid) {
          throw new Error('Current password is incorrect');
        }

        // Hash new password
        const newPasswordHash = await passwordService.hashPassword(newPassword);

        // Update user
        await userRepository.update(userId, { passwordHash: newPasswordHash });
        return { success: true };
      }

      case '/auth/reset-password': {
        const { email } = data as { email: string };
        const resetUser = await userRepository.findByEmail(email);
        if (resetUser) {
          const resetToken = passwordService.generateResetToken();
          const hashedToken = await passwordService.hashResetToken(resetToken);
          await userRepository.update(resetUser.id, {
            passwordResetToken: hashedToken,
            passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
          });

          // Send reset email
          if (emailService) {
            await emailService.sendPasswordResetEmail(resetUser, resetToken);
          }
        }
        // Always return success to prevent email enumeration
        return { success: true };
      }

      case '/auth/confirm-reset': {
        const { token, newPassword } = data as { token: string; newPassword: string };
        const resetUserToUpdate = await userRepository.findByResetToken(await passwordService.hashResetToken(token));
        if (!resetUserToUpdate) {
          throw new Error('Invalid or expired reset token');
        }

        // Hash new password
        const resetPasswordHash = await passwordService.hashPassword(newPassword);

        // Update user and clear reset token
        await userRepository.update(resetUserToUpdate.id, {
          passwordHash: resetPasswordHash,
          passwordResetToken: undefined,
          passwordResetExpires: undefined
        });
        
        return { success: true };
      }

      case '/auth/verify-email': {
        const { token } = data as { token: string };
        const verifyUser = await userRepository.findByVerificationToken(token);
        if (!verifyUser) {
          throw new Error('Invalid or expired verification token');
        }

        await userRepository.update(verifyUser.id, {
          emailVerified: true,
          emailVerificationToken: undefined,
          emailVerificationExpires: undefined
        });
        
        return { success: true };
      }

      case '/auth/resend-verification': {
        const { userId } = data as { userId: string };
        const resendUser = await userRepository.findById(userId);
        if (!resendUser || resendUser.emailVerified) {
          throw new Error('Invalid request');
        }

        const newVerificationToken = passwordService.generateResetToken();
        await userRepository.update(resendUser.id, {
          emailVerificationToken: newVerificationToken,
          emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        if (emailService) {
          await emailService.sendVerificationEmail(resendUser);
        }
        
        return { success: true };
      }

      default:
        throw new Error('Unknown endpoint');
    }
  }
}

// Export singleton instance
export const authManager = new AuthManager();

// React hooks for easy integration
import React from 'react';

export function useAuth() {
  const [user, setUser] = React.useState(authManager.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = React.useState(authManager.isAuthenticated());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setUser(authManager.getCurrentUser());
      setIsAuthenticated(authManager.isAuthenticated());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    user,
    isAuthenticated,
    login: authManager.login.bind(authManager),
    register: authManager.register.bind(authManager),
    logout: authManager.logout.bind(authManager),
    hasPermission: authManager.hasPermission.bind(authManager),
    hasRole: authManager.hasRole.bind(authManager)
  };
}