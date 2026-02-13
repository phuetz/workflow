/**
 * LDAP Configuration Management
 * Validates and manages LDAP connection settings
 */

import { LDAPConfig, ActiveDirectoryConfig } from '../../types/ldap';
import { logger } from '../../services/SimpleLogger';

export class LDAPConfigManager {
  private config: LDAPConfig | null = null;
  private validated: boolean = false;

  /**
   * Load LDAP configuration from environment variables
   */
  loadFromEnv(): LDAPConfig {
    const config: LDAPConfig = {
      enabled: process.env.LDAP_ENABLED === 'true',
      url: process.env.LDAP_URL || '',
      baseDN: process.env.LDAP_BASE_DN || '',
      bindDN: process.env.LDAP_BIND_DN || '',
      bindPassword: process.env.LDAP_BIND_PASSWORD || '',

      // Connection settings
      timeout: parseInt(process.env.LDAP_TIMEOUT || '5000', 10),
      connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT || '10000', 10),
      idleTimeout: parseInt(process.env.LDAP_IDLE_TIMEOUT || '300000', 10),
      reconnect: process.env.LDAP_RECONNECT !== 'false',

      // TLS/SSL settings
      tlsOptions: {
        rejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false',
        ca: process.env.LDAP_TLS_CA ? [process.env.LDAP_TLS_CA] : undefined,
        cert: process.env.LDAP_TLS_CERT,
        key: process.env.LDAP_TLS_KEY,
      },

      // Search settings
      searchFilter: process.env.LDAP_SEARCH_FILTER || '(&(objectClass=user)(sAMAccountName={{username}}))',
      searchScope: (process.env.LDAP_SEARCH_SCOPE as 'base' | 'one' | 'sub') || 'sub',
      searchAttributes: process.env.LDAP_SEARCH_ATTRIBUTES?.split(','),

      // Group settings
      groupBaseDN: process.env.LDAP_GROUP_BASE_DN,
      groupSearchFilter: process.env.LDAP_GROUP_SEARCH_FILTER || '(objectClass=group)',
      groupMemberAttribute: process.env.LDAP_GROUP_MEMBER_ATTRIBUTE || 'member',

      // User attributes mapping
      userAttributes: {
        username: process.env.LDAP_ATTR_USERNAME || 'sAMAccountName',
        email: process.env.LDAP_ATTR_EMAIL || 'mail',
        firstName: process.env.LDAP_ATTR_FIRSTNAME || 'givenName',
        lastName: process.env.LDAP_ATTR_LASTNAME || 'sn',
        displayName: process.env.LDAP_ATTR_DISPLAYNAME || 'displayName',
        memberOf: process.env.LDAP_ATTR_MEMBEROF || 'memberOf',
        department: process.env.LDAP_ATTR_DEPARTMENT || 'department',
        title: process.env.LDAP_ATTR_TITLE || 'title',
        phone: process.env.LDAP_ATTR_PHONE || 'telephoneNumber',
        manager: process.env.LDAP_ATTR_MANAGER || 'manager',
      },

      // Group mapping
      groupMapping: this.parseGroupMapping(process.env.LDAP_GROUP_MAPPING),

      // Connection pool settings
      poolSize: parseInt(process.env.LDAP_POOL_SIZE || '5', 10),
      poolMaxIdleTime: parseInt(process.env.LDAP_POOL_MAX_IDLE_TIME || '300000', 10),
    };

    this.config = config;
    return config;
  }

  /**
   * Load Active Directory configuration
   */
  loadADFromEnv(): ActiveDirectoryConfig {
    const baseConfig = this.loadFromEnv();

    const adConfig: ActiveDirectoryConfig = {
      ...baseConfig,
      domain: process.env.AD_DOMAIN,
      domainController: process.env.AD_DOMAIN_CONTROLLER,
      globalCatalogServer: process.env.AD_GLOBAL_CATALOG,

      // AD-specific settings
      userAccountControl: {
        enabled: process.env.AD_CHECK_ACCOUNT_ENABLED !== 'false',
        passwordExpired: process.env.AD_CHECK_PASSWORD_EXPIRED === 'true',
        locked: process.env.AD_CHECK_ACCOUNT_LOCKED !== 'false',
      },

      // Nested group settings
      nestedGroups: process.env.AD_NESTED_GROUPS !== 'false',
      maxNestedDepth: parseInt(process.env.AD_MAX_NESTED_DEPTH || '10', 10),

      // Multi-domain support
      trustedDomains: process.env.AD_TRUSTED_DOMAINS?.split(','),
    };

    this.config = adConfig;
    return adConfig;
  }

  /**
   * Set configuration manually
   */
  setConfig(config: LDAPConfig): void {
    this.config = config;
    this.validated = false;
  }

  /**
   * Get current configuration
   */
  getConfig(): LDAPConfig {
    if (!this.config) {
      this.loadFromEnv();
    }
    return this.config!;
  }

  /**
   * Validate LDAP configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = this.getConfig();

    // Check required fields
    if (!config.url) {
      errors.push('LDAP URL is required');
    } else {
      // Validate URL format
      if (!config.url.startsWith('ldap://') && !config.url.startsWith('ldaps://')) {
        errors.push('LDAP URL must start with ldap:// or ldaps://');
      }

      // Recommend LDAPS for production
      if (config.url.startsWith('ldap://') && process.env.NODE_ENV === 'production') {
        logger.warn('Using unencrypted LDAP connection in production. Consider using LDAPS (ldaps://)');
      }
    }

    if (!config.baseDN) {
      errors.push('LDAP Base DN is required');
    } else {
      // Validate DN format
      if (!this.isValidDN(config.baseDN)) {
        errors.push('LDAP Base DN format is invalid');
      }
    }

    if (!config.bindDN) {
      errors.push('LDAP Bind DN is required');
    } else {
      if (!this.isValidDN(config.bindDN)) {
        errors.push('LDAP Bind DN format is invalid');
      }
    }

    if (!config.bindPassword) {
      errors.push('LDAP Bind Password is required');
    }

    // Validate search filter
    if (config.searchFilter && !config.searchFilter.includes('{{username}}')) {
      logger.warn('LDAP search filter does not contain {{username}} placeholder. User authentication may not work correctly.');
    }

    // Validate timeout values
    if (config.timeout && config.timeout < 1000) {
      logger.warn('LDAP timeout is less than 1 second. This may cause connection issues.');
    }

    if (config.connectTimeout && config.connectTimeout < 1000) {
      logger.warn('LDAP connect timeout is less than 1 second. This may cause connection issues.');
    }

    // Validate pool size
    if (config.poolSize && (config.poolSize < 1 || config.poolSize > 50)) {
      errors.push('LDAP pool size must be between 1 and 50');
    }

    this.validated = errors.length === 0;

    if (this.validated) {
      logger.info('LDAP configuration validated successfully', {
        url: config.url,
        baseDN: config.baseDN,
        poolSize: config.poolSize,
      });
    } else {
      logger.error('LDAP configuration validation failed', { errors });
    }

    return { valid: this.validated, errors };
  }

  /**
   * Check if configuration is validated
   */
  isValidated(): boolean {
    return this.validated;
  }

  /**
   * Get connection string (sanitized)
   */
  getConnectionString(): string {
    const config = this.getConfig();
    return `${config.url}/${config.baseDN}`;
  }

  /**
   * Get sanitized configuration (for logging)
   */
  getSanitizedConfig(): Partial<LDAPConfig> {
    const config = this.getConfig();
    return {
      enabled: config.enabled,
      url: config.url,
      baseDN: config.baseDN,
      bindDN: config.bindDN,
      bindPassword: '***REDACTED***',
      timeout: config.timeout,
      searchFilter: config.searchFilter,
      poolSize: config.poolSize,
    };
  }

  /**
   * Parse group mapping from string
   */
  private parseGroupMapping(mappingStr?: string): Record<string, string> | undefined {
    if (!mappingStr) return undefined;

    try {
      return JSON.parse(mappingStr);
    } catch (error) {
      logger.error('Failed to parse LDAP group mapping', { error });
      return undefined;
    }
  }

  /**
   * Validate DN format
   */
  private isValidDN(dn: string): boolean {
    // Basic DN validation: should contain at least one component
    // Format: cn=value,dc=value,dc=value
    const dnPattern = /^([a-zA-Z]+=.+)(,[a-zA-Z]+=.+)*$/;
    return dnPattern.test(dn);
  }

  /**
   * Test connection with current configuration
   */
  async testConnection(): Promise<{ success: boolean; error?: string; latency?: number }> {
    // This will be implemented with LDAPClient
    // For now, return a placeholder
    logger.info('LDAP connection test requested');
    return { success: true, latency: 0 };
  }

  /**
   * Get default Active Directory configuration template
   */
  static getADTemplate(): Partial<ActiveDirectoryConfig> {
    return {
      url: 'ldaps://ad.company.com:636',
      baseDN: 'dc=company,dc=com',
      bindDN: 'cn=service_account,ou=service_accounts,dc=company,dc=com',
      bindPassword: 'CHANGE_ME',
      searchFilter: '(&(objectClass=user)(sAMAccountName={{username}}))',
      groupSearchFilter: '(objectClass=group)',
      groupMemberAttribute: 'member',
      userAttributes: {
        username: 'sAMAccountName',
        email: 'mail',
        firstName: 'givenName',
        lastName: 'sn',
        displayName: 'displayName',
        memberOf: 'memberOf',
        department: 'department',
        title: 'title',
      },
      poolSize: 5,
      timeout: 5000,
      nestedGroups: true,
      maxNestedDepth: 10,
    };
  }

  /**
   * Get default OpenLDAP configuration template
   */
  static getOpenLDAPTemplate(): Partial<LDAPConfig> {
    return {
      url: 'ldap://ldap.company.com:389',
      baseDN: 'dc=company,dc=com',
      bindDN: 'cn=admin,dc=company,dc=com',
      bindPassword: 'CHANGE_ME',
      searchFilter: '(&(objectClass=inetOrgPerson)(uid={{username}}))',
      groupSearchFilter: '(objectClass=groupOfNames)',
      groupMemberAttribute: 'member',
      userAttributes: {
        username: 'uid',
        email: 'mail',
        firstName: 'givenName',
        lastName: 'sn',
        displayName: 'displayName',
        memberOf: 'memberOf',
      },
      poolSize: 5,
      timeout: 5000,
    };
  }

  /**
   * Export configuration to environment variables format
   */
  exportToEnv(): string[] {
    const config = this.getConfig();
    const envVars: string[] = [];

    envVars.push(`LDAP_ENABLED=${config.enabled}`);
    envVars.push(`LDAP_URL=${config.url}`);
    envVars.push(`LDAP_BASE_DN=${config.baseDN}`);
    envVars.push(`LDAP_BIND_DN=${config.bindDN}`);
    envVars.push(`LDAP_BIND_PASSWORD=${config.bindPassword}`);

    if (config.timeout) envVars.push(`LDAP_TIMEOUT=${config.timeout}`);
    if (config.searchFilter) envVars.push(`LDAP_SEARCH_FILTER=${config.searchFilter}`);
    if (config.poolSize) envVars.push(`LDAP_POOL_SIZE=${config.poolSize}`);

    if (config.userAttributes) {
      Object.entries(config.userAttributes).forEach(([key, value]) => {
        if (value) {
          envVars.push(`LDAP_ATTR_${key.toUpperCase()}=${value}`);
        }
      });
    }

    if (config.groupMapping) {
      envVars.push(`LDAP_GROUP_MAPPING=${JSON.stringify(config.groupMapping)}`);
    }

    return envVars;
  }
}

// Singleton instance
let configManagerInstance: LDAPConfigManager | null = null;

export function getLDAPConfigManager(): LDAPConfigManager {
  if (!configManagerInstance) {
    configManagerInstance = new LDAPConfigManager();
  }
  return configManagerInstance;
}
