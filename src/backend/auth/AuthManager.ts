/**
 * Authentication & Authorization Manager
 * JWT/OAuth2 system with role-based access control
 */

import { jwtDecode } from 'jwt-decode';

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

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  authUrl: string;
  tokenUrl: string;
}

export class AuthManager {
  private currentUser: User | null = null;
  private tokens: AuthTokens | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  // OAuth2 providers configuration
  private oauthProviders: Map<string, OAuthProvider> = new Map([
    ['google', {
      name: 'Google',
      clientId: process.env.VITE_GOOGLE_CLIENT_ID || 'google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'google-client-secret',
      redirectUri: `${window.location.origin}/auth/callback/google`,
      scope: ['openid', 'email', 'profile'],
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token'
    }],
    ['github', {
      name: 'GitHub',
      clientId: process.env.VITE_GITHUB_CLIENT_ID || 'github-client-id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'github-client-secret',
      redirectUri: `${window.location.origin}/auth/callback/github`,
      scope: ['user:email'],
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token'
    }],
    ['microsoft', {
      name: 'Microsoft',
      clientId: process.env.VITE_MICROSOFT_CLIENT_ID || 'microsoft-client-id',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'microsoft-client-secret',
      redirectUri: `${window.location.origin}/auth/callback/microsoft`,
      scope: ['openid', 'email', 'profile'],
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    }]
  ]);

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    // Try to restore session from localStorage
    const savedTokens = localStorage.getItem('auth_tokens');
    const savedUser = localStorage.getItem('auth_user');

    if (savedTokens && savedUser) {
      try {
        this.tokens = JSON.parse(savedTokens);
        this.currentUser = JSON.parse(savedUser);

        // Verify token is still valid
        if (this.tokens && await this.isTokenValid(this.tokens.accessToken)) {
          this.startRefreshTimer();
          console.log('✅ Session restored for user:', this.currentUser?.email);
        } else {
          await this.logout();
        }
      } catch (error) {
        console.error('❌ Error restoring session:', error);
        await this.logout();
      }
    }
  }

  // Email/Password Authentication
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      // Simulate API call
      const response = await this.apiCall('/auth/login', 'POST', credentials);
      
      const { user, tokens } = response;
      
      await this.setSession(user, tokens);
      
      console.log('✅ Login successful for user:', user.email);
      
      return { user, tokens };
    } catch (error) {
      console.error('❌ Login failed:', error);
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
      
      const { user, tokens } = response;
      
      await this.setSession(user, tokens);
      
      console.log('✅ Registration successful for user:', user.email);
      
      return { user, tokens };
    } catch (error) {
      console.error('❌ Registration failed:', error);
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
    localStorage.setItem('oauth_state', state);
    localStorage.setItem('oauth_provider', provider);

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
    
    console.log(`🔗 Initiating OAuth for ${provider}:`, authUrl);
    
    return authUrl;
  }

  // Handle OAuth callback
  async handleOAuthCallback(code: string, state: string, provider: string): Promise<{ user: User; tokens: AuthTokens }> {
    const savedState = localStorage.getItem('oauth_state');
    const savedProvider = localStorage.getItem('oauth_provider');

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

      const { user, tokens } = response;
      
      await this.setSession(user, tokens);
      
      // Clean up
      localStorage.removeItem('oauth_state');
      localStorage.removeItem('oauth_provider');
      
      console.log(`✅ OAuth ${provider} login successful:`, user.email);
      
      return { user, tokens };
    } catch (error) {
      console.error(`❌ OAuth ${provider} callback failed:`, error);
      throw error;
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      if (this.tokens) {
        await this.apiCall('/auth/logout', 'POST', {
          refreshToken: this.tokens.refreshToken
        });
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearSession();
      console.log('✅ Logout successful');
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

      console.log('✅ Tokens refreshed successfully');
      
      return this.tokens;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      await this.logout();
      throw error;
    }
  }

  // Password management
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    await this.apiCall('/auth/change-password', 'POST', {
      currentPassword,
      newPassword
    });

    console.log('✅ Password changed successfully');
  }

  async resetPassword(email: string): Promise<void> {
    await this.apiCall('/auth/reset-password', 'POST', { email });
    console.log('✅ Password reset email sent');
  }

  async confirmResetPassword(token: string, newPassword: string): Promise<void> {
    await this.apiCall('/auth/confirm-reset', 'POST', {
      token,
      newPassword
    });
    console.log('✅ Password reset confirmed');
  }

  // Email verification
  async resendVerificationEmail(): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    await this.apiCall('/auth/resend-verification', 'POST');
    console.log('✅ Verification email sent');
  }

  async verifyEmail(token: string): Promise<void> {
    await this.apiCall('/auth/verify-email', 'POST', { token });
    
    if (this.currentUser) {
      this.currentUser.emailVerified = true;
      this.saveUser();
    }
    
    console.log('✅ Email verified successfully');
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
    const permissions = {
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
    
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_tokens');
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private saveUser(): void {
    if (this.currentUser) {
      localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
    }
  }

  private saveTokens(): void {
    if (this.tokens) {
      localStorage.setItem('auth_tokens', JSON.stringify(this.tokens));
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
        this.refreshTokens().catch(console.error);
      }, refreshTime);
    }
  }

  private async isTokenValid(token: string): Promise<boolean> {
    try {
      const decoded: any = jwtDecode(token);
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  private generateSecureState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Simulate API calls (would be real HTTP calls in production)
  private async apiCall(endpoint: string, method: string, data?: any): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Simulate different responses based on endpoint
    switch (endpoint) {
      case '/auth/login':
        if (data.email === 'admin@workflowbuilder.com' && data.password === 'admin123') {
          return {
            user: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              email: 'admin@workflowbuilder.com',
              firstName: 'Admin',
              lastName: 'User',
              role: 'admin',
              status: 'active',
              permissions: [],
              emailVerified: true,
              lastLoginAt: new Date().toISOString()
            },
            tokens: {
              accessToken: 'mock-jwt-access-token',
              refreshToken: 'mock-jwt-refresh-token',
              expiresIn: 3600,
              tokenType: 'Bearer' as const
            }
          };
        } else {
          throw new Error('Invalid credentials');
        }

      case '/auth/register':
        return {
          user: {
            id: Math.random().toString(36).substr(2, 9),
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            role: 'user',
            status: 'active',
            permissions: [],
            emailVerified: false
          },
          tokens: {
            accessToken: 'mock-jwt-access-token',
            refreshToken: 'mock-jwt-refresh-token',
            expiresIn: 3600,
            tokenType: 'Bearer' as const
          }
        };

      case '/auth/refresh':
        return {
          tokens: {
            accessToken: 'new-mock-jwt-access-token',
            refreshToken: 'new-mock-jwt-refresh-token',
            expiresIn: 3600,
            tokenType: 'Bearer' as const
          }
        };

      default:
        return { success: true };
    }
  }
}

// Export singleton instance
export const authManager = new AuthManager();

// React hooks for easy integration
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