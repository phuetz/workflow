/**
 * SSO (Single Sign-On) Service
 * Supports SAML 2.0 for enterprise authentication
 */

import passport from 'passport';
import { Strategy as SamlStrategy, Profile, VerifiedCallback } from 'passport-saml';
import { logger } from '../services/LogService';
import { getAuditService } from '../audit/AuditService';
import { AuditAction, AuditCategory, AuditSeverity } from '../audit/AuditTypes';

export interface SSOConfig {
  enabled: boolean;
  provider: 'saml' | 'ldap' | 'oauth2';
  saml?: {
    entryPoint: string; // Identity Provider login URL
    issuer: string; // SP entity ID
    cert: string; // IdP certificate
    callbackUrl: string; // Assertion Consumer Service URL
    logoutUrl?: string;
    identifierFormat?: string;
    acceptedClockSkewMs?: number;
    attributeMap?: {
      email?: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
      groups?: string;
    };
  };
}

export interface SSOUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string[];
  attributes?: Record<string, unknown>;
}

export class SSOService {
  private config: SSOConfig;
  private initialized: boolean = false;

  constructor(config: SSOConfig) {
    this.config = config;
  }

  /**
   * Initialize SSO authentication
   */
  initialize(): void {
    if (!this.config.enabled) {
      logger.info('SSO is disabled');
      return;
    }

    if (this.initialized) {
      logger.warn('SSO already initialized');
      return;
    }

    switch (this.config.provider) {
      case 'saml':
        this.initializeSAML();
        break;
      case 'ldap':
        logger.warn('LDAP SSO not yet implemented');
        break;
      case 'oauth2':
        logger.warn('OAuth2 SSO not yet implemented');
        break;
      default:
        throw new Error(`Unknown SSO provider: ${this.config.provider}`);
    }

    this.initialized = true;
    logger.info(`SSO initialized with provider: ${this.config.provider}`);
  }

  /**
   * Initialize SAML authentication
   */
  private initializeSAML(): void {
    if (!this.config.saml) {
      throw new Error('SAML configuration missing');
    }

    const strategy = new SamlStrategy(
      {
        entryPoint: this.config.saml.entryPoint,
        issuer: this.config.saml.issuer,
        cert: this.config.saml.cert,
        callbackUrl: this.config.saml.callbackUrl,
        logoutUrl: this.config.saml.logoutUrl,
        identifierFormat: this.config.saml.identifierFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        acceptedClockSkewMs: this.config.saml.acceptedClockSkewMs || -1,
      },
      async (profile: Profile | null | undefined, done: VerifiedCallback) => {
        try {
          if (!profile) {
            return done(new Error('No profile returned from IdP'));
          }

          logger.info('SAML authentication callback received', {
            nameID: profile.nameID,
          });

          const user = this.mapSAMLProfile(profile);

          // Audit log successful SSO login
          const auditService = getAuditService();
          await auditService.log({
            action: AuditAction.SECURITY_SSO_LOGIN,
            category: AuditCategory.SECURITY,
            severity: AuditSeverity.INFO,
            userId: user.id,
            username: user.displayName || user.email,
            userEmail: user.email,
            resourceType: 'user',
            resourceId: user.id,
            success: true,
            details: {
              provider: 'saml',
              groups: user.groups,
            },
          });

          return done(null, user);
        } catch (error) {
          logger.error('SAML authentication failed', {
            error: error instanceof Error ? error.message : String(error),
          });

          // Audit log failed SSO login
          const auditService = getAuditService();
          await auditService.log({
            action: AuditAction.SECURITY_SSO_LOGIN,
            category: AuditCategory.SECURITY,
            severity: AuditSeverity.ERROR,
            userId: 'unknown',
            resourceType: 'user',
            resourceId: 'unknown',
            success: false,
            errorMessage: error instanceof Error ? error.message : String(error),
          });

          return done(error as Error);
        }
      }
    );

    passport.use('saml', strategy);

    logger.info('SAML strategy configured', {
      entryPoint: this.config.saml.entryPoint,
      issuer: this.config.saml.issuer,
    });
  }

  /**
   * Map SAML profile to internal user format
   */
  private mapSAMLProfile(profile: Profile): SSOUser {
    const attributeMap = this.config.saml?.attributeMap || {};

    const emailAttr = attributeMap.email || 'email';
    const firstNameAttr = attributeMap.firstName || 'firstName';
    const lastNameAttr = attributeMap.lastName || 'lastName';
    const displayNameAttr = attributeMap.displayName || 'displayName';
    const groupsAttr = attributeMap.groups || 'groups';

    const email = this.getAttributeValue(profile, emailAttr) || profile.nameID || '';
    const firstName = this.getAttributeValue(profile, firstNameAttr);
    const lastName = this.getAttributeValue(profile, lastNameAttr);
    const displayName = this.getAttributeValue(profile, displayNameAttr) || profile.nameID;
    const groupsValue = this.getAttributeValue(profile, groupsAttr);

    let groups: string[] = [];
    if (Array.isArray(groupsValue)) {
      groups = groupsValue;
    } else if (typeof groupsValue === 'string') {
      groups = [groupsValue];
    }

    return {
      id: profile.nameID || email,
      email,
      firstName,
      lastName,
      displayName,
      groups,
      attributes: profile,
    };
  }

  /**
   * Get attribute value from SAML profile
   */
  private getAttributeValue(profile: Profile, attributeName: string): string | string[] | undefined {
    if (!profile || typeof profile !== 'object') {
      return undefined;
    }

    // Check direct property
    if (attributeName in profile) {
      const value = (profile as any)[attributeName];
      return value;
    }

    // Check in attributes object
    if ('attributes' in profile && profile.attributes && typeof profile.attributes === 'object') {
      const attrs = profile.attributes as Record<string, any>;
      if (attributeName in attrs) {
        return attrs[attributeName];
      }
    }

    return undefined;
  }

  /**
   * Generate SAML metadata XML
   */
  generateMetadata(): string {
    if (this.config.provider !== 'saml' || !this.config.saml) {
      throw new Error('SAML not configured');
    }

    const { issuer, callbackUrl } = this.config.saml;

    return `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="${issuer}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                 Location="${callbackUrl}"
                                 index="1" />
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
  }

  /**
   * Check if SSO is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get SSO provider
   */
  getProvider(): string {
    return this.config.provider;
  }

  /**
   * Update SSO configuration
   */
  updateConfig(newConfig: Partial<SSOConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.initialized) {
      this.initialized = false;
      this.initialize();
    }
  }
}

// Singleton instance
let ssoServiceInstance: SSOService | null = null;

export function getSSOService(): SSOService {
  if (!ssoServiceInstance) {
    // Default config (disabled by default)
    const config: SSOConfig = {
      enabled: process.env.SSO_ENABLED === 'true',
      provider: (process.env.SSO_PROVIDER as 'saml' | 'ldap' | 'oauth2') || 'saml',
      saml: {
        entryPoint: process.env.SAML_ENTRY_POINT || '',
        issuer: process.env.SAML_ISSUER || '',
        cert: process.env.SAML_CERT || '',
        callbackUrl: process.env.SAML_CALLBACK_URL || '',
        logoutUrl: process.env.SAML_LOGOUT_URL,
      },
    };

    ssoServiceInstance = new SSOService(config);
    ssoServiceInstance.initialize();
  }

  return ssoServiceInstance;
}

export function initializeSSOService(config: SSOConfig): SSOService {
  if (ssoServiceInstance) {
    logger.warn('SSO service already initialized');
    return ssoServiceInstance;
  }

  ssoServiceInstance = new SSOService(config);
  ssoServiceInstance.initialize();
  return ssoServiceInstance;
}
