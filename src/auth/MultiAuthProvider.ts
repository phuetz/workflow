/**
 * Multi-Authentication Provider
 * Supports combined LDAP, SAML, OAuth2, and local authentication with fallback
 */

import { LDAPAuthProvider } from './ldap/LDAPAuthProvider';
import { ActiveDirectoryProvider } from './ldap/ActiveDirectoryProvider';
import { UserProvisioner } from './ldap/UserProvisioner';
import { getSSOService } from '../backend/auth/SSOService';
import { authService } from '../services/auth';
import {
  MultiAuthConfig,
  AuthStrategy,
  AuthenticationContext,
  AuthenticationResult,
} from '../types/ldap';
import { logger } from '../services/SimpleLogger';

export class MultiAuthProvider {
  private config: MultiAuthConfig;
  private ldapProvider: LDAPAuthProvider | null = null;
  private adProvider: ActiveDirectoryProvider | null = null;
  private userProvisioner: UserProvisioner | null = null;
  private initialized: boolean = false;

  constructor(config: MultiAuthConfig) {
    this.config = config;
  }

  /**
   * Initialize all authentication strategies
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Multi-auth provider already initialized');
      return;
    }

    logger.info('Initializing multi-auth provider', {
      strategies: this.config.strategies.map((s) => s.name),
      fallback: this.config.fallback,
    });

    // Initialize LDAP/AD providers
    for (const strategy of this.config.strategies) {
      if (!strategy.enabled) continue;

      try {
        switch (strategy.type) {
          case 'ldap':
            if (strategy.config?.isActiveDirectory) {
              this.adProvider = new ActiveDirectoryProvider(strategy.config);
              await this.adProvider.initialize();
              logger.info('Active Directory provider initialized');
            } else {
              this.ldapProvider = new LDAPAuthProvider(strategy.config);
              await this.ldapProvider.initialize();
              logger.info('LDAP provider initialized');
            }
            break;

          case 'saml':
            getSSOService(); // SSO service auto-initializes
            logger.info('SAML provider initialized');
            break;

          case 'oauth2':
            // OAuth2 is handled by authManager
            logger.info('OAuth2 provider initialized');
            break;

          case 'local':
            // Local auth is always available via authManager
            logger.info('Local provider initialized');
            break;

          default:
            logger.warn('Unknown auth strategy', { type: strategy.type });
        }
      } catch (error) {
        logger.error('Failed to initialize auth strategy', {
          strategy: strategy.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.initialized = true;
    logger.info('Multi-auth provider initialized successfully');
  }

  /**
   * Authenticate user with automatic strategy selection
   */
  async authenticate(context: AuthenticationContext): Promise<AuthenticationResult> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'Multi-auth provider not initialized',
        errorCode: 'NOT_INITIALIZED',
      };
    }

    logger.info('Authenticating user', {
      username: context.username,
      strategy: context.strategy || 'auto',
    });

    // Get strategies in priority order
    const strategies = this.getStrategiesInOrder(context);

    // Try each strategy
    for (const strategy of strategies) {
      if (!strategy.enabled) continue;

      try {
        logger.debug('Trying authentication strategy', {
          username: context.username,
          strategy: strategy.name,
        });

        const result = await this.authenticateWithStrategy(strategy, context);

        if (result.success) {
          result.strategy = strategy.name;
          logger.info('Authentication successful', {
            username: context.username,
            strategy: strategy.name,
          });
          return result;
        }

        // If fallback is disabled, stop on first failure
        if (!this.config.fallback) {
          logger.info('Authentication failed, fallback disabled', {
            username: context.username,
            strategy: strategy.name,
          });
          return result;
        }

        logger.debug('Authentication failed, trying next strategy', {
          username: context.username,
          strategy: strategy.name,
          error: result.error,
        });
      } catch (error) {
        logger.error('Authentication strategy error', {
          username: context.username,
          strategy: strategy.name,
          error: error instanceof Error ? error.message : String(error),
        });

        if (!this.config.fallback) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Authentication failed',
            errorCode: 'AUTH_ERROR',
          };
        }
      }
    }

    // All strategies failed
    logger.warn('All authentication strategies failed', {
      username: context.username,
      strategies: strategies.map((s) => s.name),
    });

    return {
      success: false,
      error: 'Authentication failed with all strategies',
      errorCode: 'ALL_STRATEGIES_FAILED',
    };
  }

  /**
   * Authenticate with specific strategy
   */
  private async authenticateWithStrategy(
    strategy: AuthStrategy,
    context: AuthenticationContext
  ): Promise<AuthenticationResult> {
    switch (strategy.type) {
      case 'ldap':
        return await this.authenticateWithLDAP(context);

      case 'saml':
        return await this.authenticateWithSAML(context);

      case 'oauth2':
        return await this.authenticateWithOAuth2(context);

      case 'local':
        return await this.authenticateWithLocal(context);

      default:
        return {
          success: false,
          error: `Unknown strategy type: ${strategy.type}`,
          errorCode: 'UNKNOWN_STRATEGY',
        };
    }
  }

  /**
   * Authenticate with LDAP/AD
   */
  private async authenticateWithLDAP(
    context: AuthenticationContext
  ): Promise<AuthenticationResult> {
    const provider = this.adProvider || this.ldapProvider;

    if (!provider) {
      return {
        success: false,
        error: 'LDAP provider not configured',
        errorCode: 'LDAP_NOT_CONFIGURED',
      };
    }

    if (!context.password) {
      return {
        success: false,
        error: 'Password required for LDAP authentication',
        errorCode: 'PASSWORD_REQUIRED',
      };
    }

    const ldapResult = await provider.authenticate(context.username, context.password);

    if (!ldapResult.success || !ldapResult.user) {
      return {
        success: false,
        error: ldapResult.error || 'LDAP authentication failed',
        errorCode: ldapResult.errorCode || 'LDAP_AUTH_FAILED',
      };
    }

    // Provision user in local database
    if (this.userProvisioner) {
      try {
        const localUser = await this.userProvisioner.provisionUser(ldapResult.user);

        return {
          success: true,
          user: {
            id: localUser.id,
            username: ldapResult.user.username,
            email: ldapResult.user.email,
            firstName: ldapResult.user.firstName,
            lastName: ldapResult.user.lastName,
            displayName: ldapResult.user.displayName,
            role: localUser.role,
            permissions: localUser.permissions || [],
            groups: ldapResult.groups,
            attributes: ldapResult.user.attributes,
          },
        };
      } catch (error) {
        logger.error('Failed to provision LDAP user', {
          username: context.username,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Return LDAP user without local provisioning
    return {
      success: true,
      user: {
        id: ldapResult.user.uid,
        username: ldapResult.user.username,
        email: ldapResult.user.email,
        firstName: ldapResult.user.firstName,
        lastName: ldapResult.user.lastName,
        displayName: ldapResult.user.displayName,
        role: 'user',
        permissions: [],
        groups: ldapResult.groups,
        attributes: ldapResult.user.attributes,
      },
    };
  }

  /**
   * Authenticate with SAML
   */
  private async authenticateWithSAML(
    context: AuthenticationContext
  ): Promise<AuthenticationResult> {
    const ssoService = getSSOService();

    if (!ssoService.isEnabled()) {
      return {
        success: false,
        error: 'SAML not configured',
        errorCode: 'SAML_NOT_CONFIGURED',
      };
    }

    // SAML authentication is handled via redirect flow
    // This is a placeholder for SAML callback handling
    return {
      success: false,
      error: 'SAML authentication requires redirect flow',
      errorCode: 'SAML_REDIRECT_REQUIRED',
    };
  }

  /**
   * Authenticate with OAuth2
   */
  private async authenticateWithOAuth2(
    context: AuthenticationContext
  ): Promise<AuthenticationResult> {
    // OAuth2 authentication is handled via redirect flow
    return {
      success: false,
      error: 'OAuth2 authentication requires redirect flow',
      errorCode: 'OAUTH2_REDIRECT_REQUIRED',
    };
  }

  /**
   * Authenticate with local database
   */
  private async authenticateWithLocal(
    context: AuthenticationContext
  ): Promise<AuthenticationResult> {
    if (!context.password) {
      return {
        success: false,
        error: 'Password required for local authentication',
        errorCode: 'PASSWORD_REQUIRED',
      };
    }

    try {
      const result = await authService.login({
        email: context.username,
        password: context.password,
      });

      if (!result.success || !result.user || !result.tokens) {
        return {
          success: false,
          error: result.error || 'Local authentication failed',
          errorCode: result.errorCode || 'LOCAL_AUTH_FAILED',
        };
      }

      return {
        success: true,
        user: {
          id: result.user.id,
          username: result.user.email,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          displayName: `${result.user.firstName || ''} ${result.user.lastName || ''}`.trim(),
          role: result.user.role,
          permissions: result.user.permissions,
        },
        token: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Local authentication failed',
        errorCode: 'LOCAL_AUTH_FAILED',
      };
    }
  }

  /**
   * Get strategies in priority order
   */
  private getStrategiesInOrder(context: AuthenticationContext): AuthStrategy[] {
    // If user specified a strategy, try it first
    if (context.strategy) {
      const preferred = this.config.strategies.find((s) => s.name === context.strategy);
      if (preferred) {
        const others = this.config.strategies.filter((s) => s.name !== context.strategy);
        return [preferred, ...others];
      }
    }

    // Use configured priority
    if (this.config.priority === 'user-preference') {
      // Get user's preferred authentication method from context or cached preference
      const userPreference = this.getUserPreferredStrategy(context.username);
      if (userPreference) {
        const preferred = this.config.strategies.find((s) => s.name === userPreference);
        if (preferred) {
          const others = this.config.strategies.filter((s) => s.name !== userPreference);
          return [preferred, ...others.sort((a, b) => (b.priority || 0) - (a.priority || 0))];
        }
      }
    }

    // Return strategies in order (sorted by priority)
    return [...this.config.strategies].sort((a, b) => {
      return (b.priority || 0) - (a.priority || 0);
    });
  }

  // Cache for user auth preferences (in-memory, would be DB-backed in production)
  private userPreferences: Map<string, string> = new Map();

  /**
   * Get user's preferred authentication strategy
   */
  private getUserPreferredStrategy(username: string): string | null {
    // Check cache first
    if (this.userPreferences.has(username)) {
      return this.userPreferences.get(username) || null;
    }

    // In production, this would query a user preferences table
    // For now, return null to use default priority
    return null;
  }

  /**
   * Set user's preferred authentication strategy
   */
  setUserPreferredStrategy(username: string, strategyName: string): void {
    const strategy = this.config.strategies.find((s) => s.name === strategyName);
    if (!strategy) {
      throw new Error(`Unknown strategy: ${strategyName}`);
    }

    this.userPreferences.set(username, strategyName);
    logger.info('User auth preference updated', { username, strategy: strategyName });
  }

  /**
   * Clear user's preferred authentication strategy
   */
  clearUserPreferredStrategy(username: string): void {
    this.userPreferences.delete(username);
    logger.info('User auth preference cleared', { username });
  }

  /**
   * Set user provisioner
   */
  setUserProvisioner(provisioner: UserProvisioner): void {
    this.userProvisioner = provisioner;
    logger.info('User provisioner set');
  }

  /**
   * Get enabled strategies
   */
  getEnabledStrategies(): AuthStrategy[] {
    return this.config.strategies.filter((s) => s.enabled);
  }

  /**
   * Check if strategy is enabled
   */
  isStrategyEnabled(name: string): boolean {
    return this.config.strategies.some((s) => s.name === name && s.enabled);
  }

  /**
   * Get configuration
   */
  getConfig(): MultiAuthConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MultiAuthConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Multi-auth configuration updated');
  }

  /**
   * Destroy provider
   */
  async destroy(): Promise<void> {
    if (this.ldapProvider) {
      await this.ldapProvider.destroy();
      this.ldapProvider = null;
    }

    if (this.adProvider) {
      await this.adProvider.destroy();
      this.adProvider = null;
    }

    this.initialized = false;
    logger.info('Multi-auth provider destroyed');
  }
}

// Factory function
export function createMultiAuthProvider(config: MultiAuthConfig): MultiAuthProvider {
  return new MultiAuthProvider(config);
}

// Create default configuration
export function createDefaultMultiAuthConfig(): MultiAuthConfig {
  return {
    strategies: [
      {
        name: 'ldap',
        type: 'ldap',
        enabled: process.env.LDAP_ENABLED === 'true',
        priority: 100,
      },
      {
        name: 'saml',
        type: 'saml',
        enabled: process.env.SSO_ENABLED === 'true' && process.env.SSO_PROVIDER === 'saml',
        priority: 90,
      },
      {
        name: 'oauth2',
        type: 'oauth2',
        enabled: true,
        priority: 80,
      },
      {
        name: 'local',
        type: 'local',
        enabled: true,
        priority: 50,
      },
    ],
    fallback: true,
    priority: 'order',
    defaultStrategy: 'ldap',
  };
}
