/**
 * Supabase Authentication Provider
 * JWT/OAuth2 authentication using Supabase backend
 *
 * @module services/auth/providers/SupabaseAuthProvider
 * @version 1.0.0
 */

import { BaseAuthProvider } from './AuthProvider';
import type {
  User,
  AuthResult,
  AuthTokens,
  LoginCredentials,
  RegisterData,
} from '../types';
import { getPermissionsForRole } from '../types';
import { logger } from '../../SimpleLogger';

// Types for Supabase (to avoid direct dependency if not installed)
interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  email_confirmed_at?: string | null;
}

// Storage adapter for Node.js environment
const nodeStorage = {
  getItem: (key: string): string | null => {
    return (global as any).__authStorage?.[key] || null;
  },
  setItem: (key: string, value: string): void => {
    if (!(global as any).__authStorage) {
      (global as any).__authStorage = {};
    }
    (global as any).__authStorage[key] = value;
  },
  removeItem: (key: string): void => {
    if ((global as any).__authStorage) {
      delete (global as any).__authStorage[key];
    }
  }
};

/**
 * Get base URL for redirects
 */
function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3000';
}

/**
 * Supabase authentication provider
 */
export class SupabaseAuthProvider extends BaseAuthProvider {
  readonly name = 'supabase';

  private supabase: any = null;
  private session: SupabaseSession | null = null;
  private initialized = false;

  private supabaseUrl: string;
  private supabaseAnonKey: string;

  constructor() {
    super();
    this.supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    this.supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      logger.warn('Supabase credentials not configured, provider will be inactive');
      this.initialized = true;
      return;
    }

    try {
      const { createClient } = await import('@supabase/supabase-js');

      this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: typeof window !== 'undefined',
          storage: typeof window !== 'undefined' ? window.localStorage : nodeStorage,
          flowType: 'pkce'
        }
      });

      // Listen to auth state changes
      this.supabase.auth.onAuthStateChange(async (event: string, session: SupabaseSession | null) => {
        logger.debug('Supabase auth state changed', { event });

        this.session = session;

        if (session) {
          const { data: { user } } = await this.supabase.auth.getUser();
          if (user) {
            await this.loadUserProfile(user);
          }
        } else {
          this.currentUser = null;
          this.tokens = null;
        }

        this.notifyAuthStateChange();
      });

      // Try to restore existing session
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session) {
        this.session = session;
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user) {
          await this.loadUserProfile(user);
        }
      }

      this.initialized = true;
      logger.info('SupabaseAuthProvider initialized');
    } catch (error) {
      logger.error('Failed to initialize SupabaseAuthProvider', { error });
      // Don't throw - provider can work in degraded mode
      this.initialized = true;
    }
  }

  private async loadUserProfile(supabaseUser: SupabaseUser): Promise<void> {
    try {
      // Fetch user profile from custom table
      const { data: profile, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error loading user profile', { errorCode: error.code });
      }

      const role = profile?.role || 'user';

      this.currentUser = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        firstName: profile?.first_name || supabaseUser.user_metadata?.first_name,
        lastName: profile?.last_name || supabaseUser.user_metadata?.last_name,
        displayName: [
          profile?.first_name || supabaseUser.user_metadata?.first_name,
          profile?.last_name || supabaseUser.user_metadata?.last_name
        ].filter(Boolean).join(' ') || supabaseUser.email,
        role: role as 'admin' | 'user' | 'viewer',
        status: (profile?.status || 'active') as 'active' | 'inactive' | 'suspended',
        permissions: getPermissionsForRole(role),
        lastLoginAt: new Date().toISOString(),
        emailVerified: supabaseUser.email_confirmed_at !== null,
        avatarUrl: profile?.avatar_url || supabaseUser.user_metadata?.avatar_url,
        metadata: profile?.metadata || {}
      };

      // Update last login timestamp
      await this.updateLastLogin(supabaseUser.id);
    } catch (error) {
      logger.error('Error loading user profile', { error });
      throw error;
    }
  }

  private async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      logger.warn('Failed to update last login', { error });
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    if (!this.supabase) {
      return {
        success: false,
        error: 'Supabase provider not configured',
        errorCode: 'PROVIDER_NOT_CONFIGURED',
      };
    }

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        logger.warn('Supabase login failed', { error: error.message });
        return {
          success: false,
          error: error.message || 'Invalid email or password',
          errorCode: 'INVALID_CREDENTIALS',
        };
      }

      if (!data.session) {
        return {
          success: false,
          error: 'No session returned',
          errorCode: 'NO_SESSION',
        };
      }

      this.session = data.session;
      await this.loadUserProfile(data.user);

      this.tokens = this.sessionToTokens(data.session);

      logger.info('Supabase login successful');

      return {
        success: true,
        user: this.currentUser!,
        tokens: this.tokens,
      };
    } catch (error: any) {
      logger.error('Supabase login error', { error: error.message });
      return {
        success: false,
        error: error.message || 'Login failed',
        errorCode: 'LOGIN_ERROR',
      };
    }
  }

  async logout(): Promise<void> {
    if (!this.supabase) {
      this.currentUser = null;
      this.tokens = null;
      this.session = null;
      this.notifyAuthStateChange();
      return;
    }

    try {
      await this.supabase.auth.signOut();
    } catch (error) {
      logger.warn('Supabase logout error', { error });
    } finally {
      this.currentUser = null;
      this.tokens = null;
      this.session = null;
      this.notifyAuthStateChange();
      logger.info('Supabase logout successful');
    }
  }

  async register(data: RegisterData): Promise<AuthResult> {
    if (!this.supabase) {
      return {
        success: false,
        error: 'Supabase provider not configured',
        errorCode: 'PROVIDER_NOT_CONFIGURED',
      };
    }

    try {
      const { data: authData, error } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName
          },
          emailRedirectTo: `${getBaseUrl()}/auth/verify-email`
        }
      });

      if (error) {
        logger.warn('Supabase registration failed', { error: error.message });
        return {
          success: false,
          error: error.message || 'Registration failed',
          errorCode: 'REGISTRATION_ERROR',
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'User creation failed',
          errorCode: 'USER_CREATION_FAILED',
        };
      }

      // Create user profile
      const { error: profileError } = await this.supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          role: 'user',
          status: 'active',
          created_at: new Date().toISOString()
        });

      if (profileError) {
        logger.error('Error creating user profile', { errorCode: profileError.code });
      }

      if (authData.session) {
        this.session = authData.session;
        await this.loadUserProfile(authData.user);
        this.tokens = this.sessionToTokens(authData.session);
      }

      logger.info('Supabase registration successful');

      return {
        success: true,
        user: this.currentUser!,
        tokens: authData.session ? this.tokens! : undefined,
      };
    } catch (error: any) {
      logger.error('Supabase registration error', { error: error.message });
      return {
        success: false,
        error: error.message || 'Registration failed',
        errorCode: 'REGISTRATION_ERROR',
      };
    }
  }

  async refreshToken(): Promise<AuthTokens | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      const { data, error } = await this.supabase.auth.refreshSession();

      if (error) {
        logger.error('Supabase token refresh failed', { error: error.message });
        return null;
      }

      if (data.session) {
        this.session = data.session;
        this.tokens = this.sessionToTokens(data.session);
        logger.debug('Supabase session refreshed');
        return this.tokens;
      }

      return null;
    } catch (error: any) {
      logger.error('Supabase token refresh error', { error: error.message });
      return null;
    }
  }

  async verifyToken(token: string): Promise<User | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      // Use the token to get user
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        return null;
      }

      // Load profile data
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const role = profile?.role || 'user';

      return {
        id: user.id,
        email: user.email!,
        firstName: profile?.first_name || user.user_metadata?.first_name,
        lastName: profile?.last_name || user.user_metadata?.last_name,
        displayName: [
          profile?.first_name || user.user_metadata?.first_name,
          profile?.last_name || user.user_metadata?.last_name
        ].filter(Boolean).join(' ') || user.email,
        role: role as 'admin' | 'user' | 'viewer',
        status: (profile?.status || 'active') as 'active' | 'inactive' | 'suspended',
        permissions: getPermissionsForRole(role),
        emailVerified: user.email_confirmed_at !== null,
      };
    } catch (error) {
      logger.error('Supabase token verification error', { error });
      return null;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!this.supabase || !this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    // Note: Supabase doesn't require current password for updateUser
    // This is a limitation of the Supabase API
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw new Error(error.message || 'Password change failed');
    }

    logger.info('Supabase password changed successfully');
  }

  async requestPasswordReset(email: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase provider not configured');
    }

    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getBaseUrl()}/auth/reset-password`
    });

    if (error) {
      throw new Error(error.message || 'Password reset request failed');
    }

    logger.info('Supabase password reset email sent');
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase provider not configured');
    }

    // Supabase handles this through the redirect flow
    // The token is exchanged for a session in the callback
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw new Error(error.message || 'Password reset failed');
    }

    logger.info('Supabase password reset successfully');
  }

  async verifyEmail(token: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase provider not configured');
    }

    // Supabase handles email verification through the redirect flow
    // The token is automatically verified when the user clicks the link
    logger.info('Supabase email verification - handled via redirect');
  }

  async resendVerificationEmail(): Promise<void> {
    if (!this.supabase || !this.currentUser?.email) {
      throw new Error('User not authenticated');
    }

    const { error } = await this.supabase.auth.resend({
      type: 'signup',
      email: this.currentUser.email,
      options: {
        emailRedirectTo: `${getBaseUrl()}/auth/verify-email`
      }
    });

    if (error) {
      throw new Error(error.message || 'Resend verification email failed');
    }

    logger.info('Supabase verification email resent');
  }

  /**
   * OAuth authentication (Supabase-specific)
   */
  async loginWithOAuth(provider: 'google' | 'github' | 'microsoft' | 'gitlab' | 'azure'): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase provider not configured');
    }

    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: `${getBaseUrl()}/auth/callback`,
        scopes: provider === 'github' ? 'user:email' : 'openid email profile'
      }
    });

    if (error) {
      throw new Error(error.message || 'OAuth authentication failed');
    }

    logger.debug('Supabase redirecting to OAuth provider', { provider });
  }

  /**
   * Magic link authentication (Supabase-specific)
   */
  async sendMagicLink(email: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase provider not configured');
    }

    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${getBaseUrl()}/auth/callback`
      }
    });

    if (error) {
      throw new Error(error.message || 'Magic link send failed');
    }

    logger.info('Supabase magic link sent');
  }

  private sessionToTokens(session: SupabaseSession): AuthTokens {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token || '',
      expiresIn: session.expires_in || 3600,
      tokenType: 'Bearer'
    };
  }

  /**
   * Get direct access to Supabase client (advanced use cases)
   */
  getSupabaseClient(): any {
    return this.supabase;
  }
}
