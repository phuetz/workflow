/**
 * Supabase-integrated Authentication Manager
 * Full JWT/OAuth2 implementation with Supabase backend
 */

import { createClient, SupabaseClient, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { jwtDecode } from 'jwt-decode';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

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
        detectSessionInUrl: true,
        storage: window.localStorage,
        flowType: 'pkce' // More secure than implicit flow
      }
    });

    this.initializeAuth();
  }

  private async initializeAuth() {
    // Listen to auth state changes
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event);

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
        console.error('Error loading user profile:', error);
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
      console.error('Error loading user profile:', error);
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

      console.log('✅ Login successful for user:', email);

      return {
        user: this.currentUser!,
        tokens: this.sessionToTokens(data.session)
      };
    } catch (error: any) {
      console.error('❌ Login failed:', error);
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
          emailRedirectTo: `${window.location.origin}/auth/verify-email`
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
        console.error('Error creating user profile:', profileError);
      }

      if (data.session) {
        await this.loadUserProfile(data.user);
      }

      console.log('✅ Registration successful for user:', userData.email);

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
      console.error('❌ Registration failed:', error);
      throw new Error(error.message || 'Registration failed');
    }
  }

  // OAuth Authentication
  async loginWithOAuth(provider: 'google' | 'github' | 'microsoft' | 'gitlab' | 'azure'): Promise<void> {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: provider === 'github' ? 'user:email' : 'openid email profile'
        }
      });

      if (error) throw error;

      console.log(`🔗 Redirecting to ${provider} OAuth...`);
    } catch (error: any) {
      console.error(`❌ OAuth ${provider} failed:`, error);
      throw error;
    }
  }

  // Magic Link Authentication
  async sendMagicLink(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      console.log('✅ Magic link sent to:', email);
    } catch (error: any) {
      console.error('❌ Magic link failed:', error);
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

      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout failed:', error);
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

      console.log('✅ Password changed successfully');
    } catch (error: any) {
      console.error('❌ Password change failed:', error);
      throw error;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;

      console.log('✅ Password reset email sent to:', email);
    } catch (error: any) {
      console.error('❌ Password reset failed:', error);
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
          emailRedirectTo: `${window.location.origin}/auth/verify-email`
        }
      });

      if (error) throw error;

      console.log('✅ Verification email resent');
    } catch (error: any) {
      console.error('❌ Resend verification failed:', error);
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

      console.log('✅ Profile updated successfully');
    } catch (error: any) {
      console.error('❌ Profile update failed:', error);
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
        console.log('✅ Session refreshed');
      }
    } catch (error: any) {
      console.error('❌ Session refresh failed:', error);
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
        console.error('Error in auth state listener:', error);
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
