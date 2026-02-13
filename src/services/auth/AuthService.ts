/**
 * Unified Authentication Service (Facade)
 * Central authentication service that delegates to the appropriate provider
 *
 * @module services/auth/AuthService
 * @version 1.0.0
 */

import type {
  User,
  AuthResult,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  AuthServiceConfig,
  AuthStateChangeCallback,
} from './types';
import type { AuthProvider } from './providers/AuthProvider';
import { LocalAuthProvider } from './providers/LocalAuthProvider';
import { SupabaseAuthProvider } from './providers/SupabaseAuthProvider';
import { logger } from '../SimpleLogger';

/**
 * Default configuration
 */
const defaultConfig: AuthServiceConfig = {
  defaultProvider: process.env.AUTH_PROVIDER === 'supabase' ? 'supabase' : 'local',
  providers: [
    { type: 'local', enabled: true },
    { type: 'supabase', enabled: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL },
  ],
  autoRefreshTokens: true,
  tokenRefreshThresholdSeconds: 300, // 5 minutes
};

/**
 * Unified Authentication Service
 * Facade that manages multiple auth providers with automatic detection
 */
export class AuthService {
  private static instance: AuthService;

  private config: AuthServiceConfig;
  private providers: Map<string, AuthProvider> = new Map();
  private activeProvider: AuthProvider | null = null;
  private initialized = false;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor(config: Partial<AuthServiceConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<AuthServiceConfig>): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService(config);
    }
    return AuthService.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static resetInstance(): void {
    if (AuthService.instance) {
      AuthService.instance.destroy().catch(err => logger.error('Failed to destroy AuthService', { error: err }));
      AuthService.instance = null as any;
    }
  }

  /**
   * Initialize the auth service and providers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('AuthService already initialized');
      return;
    }

    logger.info('Initializing AuthService', {
      defaultProvider: this.config.defaultProvider,
      enabledProviders: this.config.providers.filter(p => p.enabled).map(p => p.type),
    });

    // Initialize enabled providers
    for (const providerConfig of this.config.providers) {
      if (!providerConfig.enabled) continue;

      try {
        let provider: AuthProvider;

        switch (providerConfig.type) {
          case 'local':
            provider = new LocalAuthProvider();
            break;
          case 'supabase':
            provider = new SupabaseAuthProvider();
            break;
          default:
            logger.warn('Unknown provider type', { type: providerConfig.type });
            continue;
        }

        await provider.initialize();
        this.providers.set(providerConfig.type, provider);
        logger.info('Provider initialized', { provider: providerConfig.type });
      } catch (error) {
        logger.error('Failed to initialize provider', {
          provider: providerConfig.type,
          error,
        });
      }
    }

    // Set active provider
    this.activeProvider = this.providers.get(this.config.defaultProvider) || null;

    if (!this.activeProvider && this.providers.size > 0) {
      // Fall back to first available provider
      const providerKeys = Array.from(this.providers.keys());
      if (providerKeys.length > 0) {
        this.activeProvider = this.providers.get(providerKeys[0]) || null;
      }
      logger.warn('Default provider not available, using fallback', {
        activeProvider: this.activeProvider?.name,
      });
    }

    if (!this.activeProvider) {
      logger.error('No auth providers available');
    }

    // Setup token auto-refresh
    if (this.config.autoRefreshTokens && this.activeProvider) {
      this.setupTokenRefresh();
    }

    this.initialized = true;
    logger.info('AuthService initialized', {
      activeProvider: this.activeProvider?.name,
      providers: Array.from(this.providers.keys()),
    });
  }

  /**
   * Login with credentials
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    this.ensureInitialized();

    if (!this.activeProvider) {
      return {
        success: false,
        error: 'No auth provider available',
        errorCode: 'NO_PROVIDER',
      };
    }

    const result = await this.activeProvider.login(credentials);

    if (result.success && this.config.autoRefreshTokens) {
      this.setupTokenRefresh();
    }

    return result;
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    this.clearRefreshTimer();

    if (this.activeProvider) {
      await this.activeProvider.logout();
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResult> {
    this.ensureInitialized();

    if (!this.activeProvider) {
      return {
        success: false,
        error: 'No auth provider available',
        errorCode: 'NO_PROVIDER',
      };
    }

    const result = await this.activeProvider.register(data);

    if (result.success && this.config.autoRefreshTokens) {
      this.setupTokenRefresh();
    }

    return result;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    if (!this.activeProvider) {
      return null;
    }
    return this.activeProvider.getCurrentUser();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.activeProvider?.isAuthenticated() || false;
  }

  /**
   * Get current tokens
   */
  getTokens(): AuthTokens | null {
    return this.activeProvider?.getTokens() || null;
  }

  /**
   * Get authorization header
   */
  getAuthHeader(): string {
    return this.activeProvider?.getAuthHeader() || '';
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<AuthTokens | null> {
    if (!this.activeProvider) {
      return null;
    }
    return this.activeProvider.refreshToken();
  }

  /**
   * Verify a token
   */
  async verifyToken(token: string): Promise<User | null> {
    if (!this.activeProvider) {
      return null;
    }
    return this.activeProvider.verifyToken(token);
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    this.ensureInitialized();

    if (!this.activeProvider) {
      throw new Error('No auth provider available');
    }

    await this.activeProvider.changePassword(currentPassword, newPassword);
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    this.ensureInitialized();

    if (!this.activeProvider) {
      throw new Error('No auth provider available');
    }

    await this.activeProvider.requestPasswordReset(email);
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    this.ensureInitialized();

    if (!this.activeProvider) {
      throw new Error('No auth provider available');
    }

    await this.activeProvider.resetPassword(token, newPassword);
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    this.ensureInitialized();

    if (!this.activeProvider) {
      throw new Error('No auth provider available');
    }

    await this.activeProvider.verifyEmail(token);
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(): Promise<void> {
    this.ensureInitialized();

    if (!this.activeProvider) {
      throw new Error('No auth provider available');
    }

    await this.activeProvider.resendVerificationEmail();
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    if (!this.activeProvider) {
      return () => {};
    }
    return this.activeProvider.onAuthStateChange(callback);
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission: string): boolean {
    return this.activeProvider?.hasPermission(permission) || false;
  }

  /**
   * Check if user has role
   */
  hasRole(role: string): boolean {
    return this.activeProvider?.hasRole(role) || false;
  }

  /**
   * Switch to a different provider
   */
  async switchProvider(providerName: 'local' | 'supabase'): Promise<void> {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider '${providerName}' is not available`);
    }

    // Logout from current provider
    if (this.activeProvider) {
      await this.activeProvider.logout();
    }

    this.activeProvider = provider;
    this.clearRefreshTimer();

    logger.info('Switched auth provider', { provider: providerName });
  }

  /**
   * Get active provider name
   */
  getActiveProviderName(): string | null {
    return this.activeProvider?.name || null;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get specific provider (for advanced use)
   */
  getProvider(name: string): AuthProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Destroy the service
   */
  async destroy(): Promise<void> {
    this.clearRefreshTimer();

    for (const provider of this.providers.values()) {
      try {
        await provider.destroy();
      } catch (error) {
        logger.error('Error destroying provider', { error });
      }
    }

    this.providers.clear();
    this.activeProvider = null;
    this.initialized = false;

    logger.info('AuthService destroyed');
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('AuthService not initialized. Call initialize() first.');
    }
  }

  private setupTokenRefresh(): void {
    this.clearRefreshTimer();

    const tokens = this.activeProvider?.getTokens();
    if (!tokens) return;

    // Refresh before expiry
    const refreshTime = (tokens.expiresIn - this.config.tokenRefreshThresholdSeconds) * 1000;

    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(async () => {
        try {
          await this.refreshToken();
          this.setupTokenRefresh(); // Schedule next refresh
        } catch (error) {
          logger.error('Token auto-refresh failed', { error });
        }
      }, refreshTime);
    }
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// Export for direct class access
export default AuthService;
