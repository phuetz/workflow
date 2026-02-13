/**
 * Supabase-integrated Authentication Manager
 * Full JWT/OAuth2 implementation with Supabase backend
 *
 * @deprecated Use `@services/auth` (unified AuthService with SupabaseAuthProvider) instead.
 * This service is kept for backward compatibility.
 *
 * Migration:
 * ```typescript
 * // Old:
 * import { supabaseAuth } from '@backend/auth/SupabaseAuthManager';
 *
 * // New:
 * import { authService, SupabaseAuthProvider } from '@services/auth';
 *
 * // Using the unified service (recommended):
 * await authService.initialize();
 * await authService.switchProvider('supabase');
 *
 * // Or using the provider directly:
 * const supabaseProvider = new SupabaseAuthProvider();
 * await supabaseProvider.initialize();
 * ```
 *
 * @see /src/services/auth/providers/SupabaseAuthProvider.ts for the new implementation
 */

import { createClient, SupabaseClient, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { jwtDecode } from 'jwt-decode';
import { logger } from '../../services/SimpleLogger';

// Declare window for Node.js compatibility
declare const window: {
  location: { origin: string };
  localStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
} | undefined;

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'your-anon-key';

// Storage adapter for Node.js environment
const nodeStorage = {
  getItem: (key: string) => {
    // In Node.js, we'd typically use a database or file-based storage
    // For now, we'll use an in-memory store
    return (global as any).__authStorage?.[key] || null;
  },
  setItem: (key: string, value: string) => {
    if (!(global as any).__authStorage) {
      (global as any).__authStorage = {};
    }
    (global as any).__authStorage[key] = value;
  },
  removeItem: (key: string) => {
    if ((global as any).__authStorage) {
      delete (global as any).__authStorage[key];
    }
  }
};

// Helper to get base URL (works in both browser and Node.js)
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3000';
};

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  permissions: string[];
  lastLoginAt?: string;
  emailVerified: boolean;
  avatarUrl?: string;
  metadata?: Record<string, any>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export class SupabaseAuthManager {
  private supabase: SupabaseClient;
  private currentUser: User | null = null;
  private session: Session | null = null;
  private authStateListeners: ((user: User | null) => void)[] = [];

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: typeof window !== 'undefined',
        storage: typeof window !== 'undefined' ? window.localStorage : nodeStorage,
        flowType: 'pkce' // More secure than implicit flow
      }
    });

    this.initializeAuth();
  }

  private async initializeAuth() {
    // Listen to auth state changes
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug('Auth state changed', { event });

      this.session = session;

      if (session?.user) {
        await this.loadUserProfile(session.user);
      } else {
        this.currentUser = null;
      }

      // Notify listeners
      this.notifyAuthStateChange();
    });

    // Try to restore existing session
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session) {
      this.session = session;
      await this.loadUserProfile(session.user);
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

      if (error && error.code !== 'PGRST116') { // Not found error
        logger.error('Error loading user profile', { errorCode: error.code });
      }

      this.currentUser = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        firstName: profile?.first_name || supabaseUser.user_metadata?.first_name,
        lastName: profile?.last_name || supabaseUser.user_metadata?.last_name,
        role: profile?.role || 'user',
        status: profile?.status || 'active',
        permissions: this.getPermissionsForRole(profile?.role || 'user'),
        lastLoginAt: new Date().toISOString(),
        emailVerified: supabaseUser.email_confirmed_at !== null,
        avatarUrl: profile?.avatar_url || supabaseUser.user_metadata?.avatar_url,
        metadata: profile?.metadata || {}
      };

      // Update last login timestamp
      await this.updateLastLogin(supabaseUser.id);
    } catch (error) {
      logger.error('Error loading user profile', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  private async updateLastLogin(userId: string): Promise<void> {
    await this.supabase
      .from('user_profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);
  }

  // Email/Password Authentication
  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      if (!data.session) throw new Error('No session returned');

      await this.loadUserProfile(data.user);

      logger.info('Login successful');

      return {
        user: this.currentUser!,
        tokens: this.sessionToTokens(data.session)
      };
    } catch (error: any) {
      logger.error('Login failed', { error: error.message || 'Unknown error' });
      throw new Error(error.message || 'Invalid email or password');
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
      // Create auth user
      const { data, error } = await this.supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName
          },
          emailRedirectTo: `${getBaseUrl()}/auth/verify-email`
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('User creation failed');

      // Create user profile
      const { error: profileError } = await this.supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: 'user',
          status: 'active',
          created_at: new Date().toISOString()
        });

      if (profileError) {
        logger.error('Error creating user profile', { errorCode: profileError.code });
      }

      if (data.session) {
        await this.loadUserProfile(data.user);
      }

      logger.info('Registration successful');

      return {
        user: this.currentUser!,
        tokens: data.session ? this.sessionToTokens(data.session) : {
          accessToken: '',
          refreshToken: '',
          expiresIn: 0,
          tokenType: 'Bearer'
        }
      };
    } catch (error: any) {
      logger.error('Registration failed', { error: error.message || 'Unknown error' });
      throw new Error(error.message || 'Registration failed');
    }
  }

  // OAuth Authentication
  async loginWithOAuth(provider: 'google' | 'github' | 'microsoft' | 'gitlab' | 'azure'): Promise<void> {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: `${getBaseUrl()}/auth/callback`,
          scopes: provider === 'github' ? 'user:email' : 'openid email profile'
        }
      });

      if (error) throw error;

      logger.debug('Redirecting to OAuth provider', { provider });
    } catch (error: any) {
      logger.error('OAuth authentication failed', { provider, error: error.message || 'Unknown error' });
      throw error;
    }
  }

  // Magic Link Authentication
  async sendMagicLink(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${getBaseUrl()}/auth/callback`
        }
      });

      if (error) throw error;

      logger.info('Magic link sent successfully');
    } catch (error: any) {
      logger.error('Magic link send failed', { error: error.message || 'Unknown error' });
      throw error;
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;

      this.currentUser = null;
      this.session = null;

      logger.info('Logout successful');
    } catch (error) {
      logger.error('Logout failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  // Password Management
  async changePassword(newPassword: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      logger.info('Password changed successfully');
    } catch (error: any) {
      logger.error('Password change failed', { error: error.message || 'Unknown error' });
      throw error;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getBaseUrl()}/auth/reset-password`
      });

      if (error) throw error;

      logger.info('Password reset email sent successfully');
    } catch (error: any) {
      logger.error('Password reset failed', { error: error.message || 'Unknown error' });
      throw error;
    }
  }

  // Email Verification
  async resendVerificationEmail(): Promise<void> {
    if (!this.currentUser?.email) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email: this.currentUser.email,
        options: {
          emailRedirectTo: `${getBaseUrl()}/auth/verify-email`
        }
      });

      if (error) throw error;

      logger.info('Verification email resent successfully');
    } catch (error: any) {
      logger.error('Resend verification failed', { error: error.message || 'Unknown error' });
      throw error;
    }
  }

  // Profile Management
  async updateProfile(updates: {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await this.supabase
        .from('user_profiles')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          avatar_url: updates.avatarUrl,
          metadata: updates.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentUser.id);

      if (error) throw error;

      // Update local user object
      if (this.currentUser) {
        this.currentUser = {
          ...this.currentUser,
          firstName: updates.firstName || this.currentUser.firstName,
          lastName: updates.lastName || this.currentUser.lastName,
          avatarUrl: updates.avatarUrl || this.currentUser.avatarUrl,
          metadata: { ...this.currentUser.metadata, ...updates.metadata }
        };
      }

      logger.info('Profile updated successfully');
    } catch (error: any) {
      logger.error('Profile update failed', { error: error.message || 'Unknown error' });
      throw error;
    }
  }

  // Session Management
  async refreshSession(): Promise<void> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      if (error) throw error;

      if (data.session) {
        this.session = data.session;
        logger.debug('Session refreshed');
      }
    } catch (error: any) {
      logger.error('Session refresh failed', { error: error.message || 'Unknown error' });
      throw error;
    }
  }

  // Authorization
  hasPermission(permission: string): boolean {
    return this.currentUser?.permissions.includes(permission) || false;
  }

  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.includes(this.currentUser?.role || '');
  }

  requirePermission(permission: string): void {
    if (!this.hasPermission(permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }

  requireRole(role: string): void {
    if (!this.hasRole(role)) {
      throw new Error(`Role required: ${role}`);
    }
  }

  // Permission definitions
  private getPermissionsForRole(role: string): string[] {
    const permissions: Record<string, string[]> = {
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

    return permissions[role] || permissions['viewer'];
  }

  // Getters
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getSession(): Session | null {
    return this.session;
  }

  getAccessToken(): string | null {
    return this.session?.access_token || null;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && this.session !== null;
  }

  getAuthHeader(): string {
    const token = this.getAccessToken();
    return token ? `Bearer ${token}` : '';
  }

  // Auth State Listeners
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.authStateListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  private notifyAuthStateChange(): void {
    this.authStateListeners.forEach(callback => {
      try {
        callback(this.currentUser);
      } catch (error) {
        logger.error('Error in auth state listener', { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });
  }

  // Helper Methods
  private sessionToTokens(session: Session): AuthTokens {
    const expiresIn = session.expires_in || 3600;

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token || '',
      expiresIn,
      tokenType: 'Bearer'
    };
  }

  // Direct Supabase access for advanced use cases
  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }
}

// Export singleton instance
export const supabaseAuth = new SupabaseAuthManager();
