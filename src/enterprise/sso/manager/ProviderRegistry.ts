/**
 * Provider Registry
 * Manages SSO provider configurations and IdP-specific defaults
 */

import { EventEmitter } from 'events';
import {
  SSOProviderConfig,
  IdPType,
  DEFAULT_SESSION_CONFIG,
} from './types';

// IdP-specific default configurations
export const IDP_CONFIGS: Record<IdPType, Partial<SSOProviderConfig>> = {
  okta: {
    protocol: 'oidc',
    oidc: {
      scope: ['openid', 'profile', 'email', 'groups'],
      responseType: 'code',
      tokenEndpointAuthMethod: 'client_secret_basic',
    } as SSOProviderConfig['oidc'],
  },
  azure_ad: {
    protocol: 'oidc',
    oidc: {
      scope: ['openid', 'profile', 'email', 'User.Read', 'GroupMember.Read.All'],
      responseType: 'code',
      tokenEndpointAuthMethod: 'client_secret_post',
    } as SSOProviderConfig['oidc'],
  },
  onelogin: {
    protocol: 'saml2',
    saml: {
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
      signAuthnRequest: true,
      wantAssertionsSigned: true,
      wantMessageSigned: true,
      acceptedClockSkewMs: 180000,
    } as SSOProviderConfig['saml'],
  },
  ping_identity: {
    protocol: 'oidc',
    oidc: {
      scope: ['openid', 'profile', 'email'],
      responseType: 'code',
      tokenEndpointAuthMethod: 'client_secret_basic',
    } as SSOProviderConfig['oidc'],
  },
  auth0: {
    protocol: 'oidc',
    oidc: {
      scope: ['openid', 'profile', 'email'],
      responseType: 'code',
      tokenEndpointAuthMethod: 'client_secret_post',
      codeChallengeMethod: 'S256',
    } as SSOProviderConfig['oidc'],
  },
  google_workspace: {
    protocol: 'oidc',
    oidc: {
      scope: ['openid', 'profile', 'email'],
      responseType: 'code',
      tokenEndpointAuthMethod: 'client_secret_post',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
      jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
    } as SSOProviderConfig['oidc'],
  },
  aws_iam_identity_center: {
    protocol: 'saml2',
    saml: {
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
      signAuthnRequest: false,
      wantAssertionsSigned: true,
      wantMessageSigned: false,
      acceptedClockSkewMs: 300000,
    } as SSOProviderConfig['saml'],
  },
};

export class ProviderRegistry {
  private providers: Map<string, SSOProviderConfig> = new Map();
  private eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * Validate provider configuration
   */
  public validateConfig(config: SSOProviderConfig): string | null {
    if (!config.id || config.id.trim() === '') {
      return 'Provider ID is required';
    }

    if (!config.name || config.name.trim() === '') {
      return 'Provider name is required';
    }

    if (!config.type) {
      return 'Provider type is required';
    }

    if (!config.protocol) {
      return 'Protocol is required';
    }

    if (!config.attributeMapping) {
      return 'Attribute mapping is required';
    }

    if (!config.attributeMapping.userId || !config.attributeMapping.email) {
      return 'userId and email attribute mappings are required';
    }

    if (config.protocol === 'saml2' && !config.saml) {
      return 'SAML configuration is required for SAML 2.0 protocol';
    }

    if (config.protocol === 'oidc' && !config.oidc) {
      return 'OIDC configuration is required for OIDC protocol';
    }

    if (config.saml) {
      if (!config.saml.entityId) return 'SAML entityId is required';
      if (!config.saml.ssoUrl) return 'SAML SSO URL is required';
      if (!config.saml.certificate) return 'SAML certificate is required';
      if (!config.saml.assertionConsumerServiceUrl) {
        return 'SAML Assertion Consumer Service URL is required';
      }
    }

    if (config.oidc) {
      if (!config.oidc.issuer) return 'OIDC issuer is required';
      if (!config.oidc.clientId) return 'OIDC client ID is required';
      if (!config.oidc.clientSecret) return 'OIDC client secret is required';
      if (!config.oidc.authorizationUrl) return 'OIDC authorization URL is required';
      if (!config.oidc.tokenUrl) return 'OIDC token URL is required';
      if (!config.oidc.redirectUri) return 'OIDC redirect URI is required';
    }

    return null;
  }

  /**
   * Register or update a provider
   */
  public register(config: SSOProviderConfig): SSOProviderConfig {
    // Merge with IdP-specific defaults
    const idpDefaults = IDP_CONFIGS[config.type] || {};
    const mergedConfig: SSOProviderConfig = {
      ...idpDefaults,
      ...config,
      saml: config.saml
        ? { ...((idpDefaults.saml as SSOProviderConfig['saml']) || {}), ...config.saml }
        : config.saml,
      oidc: config.oidc
        ? { ...((idpDefaults.oidc as SSOProviderConfig['oidc']) || {}), ...config.oidc }
        : config.oidc,
      session: { ...DEFAULT_SESSION_CONFIG, ...config.session },
      metadata: {
        ...config.metadata,
        lastUpdated: new Date(),
      },
    };

    this.providers.set(config.id, mergedConfig);
    this.eventEmitter.emit('provider:configured', { providerId: config.id, config: mergedConfig });

    return mergedConfig;
  }

  /**
   * Get a provider by ID
   */
  public get(providerId: string): SSOProviderConfig | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all providers
   */
  public getAll(): SSOProviderConfig[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get enabled providers sorted by priority
   */
  public getEnabled(): SSOProviderConfig[] {
    return Array.from(this.providers.values())
      .filter((p) => p.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Find provider by entity ID (for SAML) or issuer (for OIDC)
   */
  public findByEntityId(entityId: string): SSOProviderConfig | undefined {
    return Array.from(this.providers.values()).find(
      (p) => p.saml?.entityId === entityId || p.oidc?.issuer === entityId
    );
  }

  /**
   * Remove a provider
   */
  public remove(providerId: string): boolean {
    const removed = this.providers.delete(providerId);
    if (removed) {
      this.eventEmitter.emit('provider:removed', { providerId });
    }
    return removed;
  }

  /**
   * Check if provider exists
   */
  public has(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Get provider count
   */
  public get size(): number {
    return this.providers.size;
  }

  /**
   * Clear all providers
   */
  public clear(): void {
    this.providers.clear();
  }
}
