/**
 * LDAP Authentication Provider
 * Provides LDAP-based authentication and user management
 */

import { LDAPClient } from './LDAPClient';
import { getLDAPConfigManager } from './LDAPConfig';
import { LDAPUser, LDAPAuthResult, LDAPConfig } from '../../types/ldap';
import { logger } from '../../services/SimpleLogger';
import { SearchOptions } from 'ldapjs';

export class LDAPAuthProvider {
  private client: LDAPClient | null = null;
  private config: LDAPConfig;
  private initialized: boolean = false;

  constructor(config?: LDAPConfig) {
    this.config = config || getLDAPConfigManager().getConfig();
  }

  /**
   * Initialize the LDAP provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('LDAP auth provider already initialized');
      return;
    }

    if (!this.config.enabled) {
      logger.info('LDAP authentication is disabled');
      return;
    }

    logger.info('Initializing LDAP authentication provider', {
      url: this.config.url,
      baseDN: this.config.baseDN,
    });

    try {
      this.client = new LDAPClient(this.config);
      await this.client.initialize();
      this.initialized = true;

      logger.info('LDAP authentication provider initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize LDAP authentication provider', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Authenticate user with username and password
   */
  async authenticate(username: string, password: string): Promise<LDAPAuthResult> {
    if (!this.initialized || !this.client) {
      return {
        success: false,
        error: 'LDAP provider not initialized',
        errorCode: 'NOT_INITIALIZED',
      };
    }

    const startTime = Date.now();

    try {
      logger.info('Authenticating user via LDAP', { username });

      // Validate credentials
      if (!username || !password) {
        return {
          success: false,
          error: 'Username and password are required',
          errorCode: 'INVALID_INPUT',
        };
      }

      // Authenticate with LDAP
      const authenticated = await this.client.authenticate(username, password);

      if (!authenticated) {
        logger.info('LDAP authentication failed', { username });
        return {
          success: false,
          error: 'Invalid username or password',
          errorCode: 'INVALID_CREDENTIALS',
        };
      }

      // Retrieve user details
      const user = await this.getUserDetails(username);

      if (!user) {
        logger.error('User authenticated but details not found', { username });
        return {
          success: false,
          error: 'User details not found',
          errorCode: 'USER_NOT_FOUND',
        };
      }

      // Get user groups
      const groups = await this.client.getUserGroups(user.dn);

      const duration = Date.now() - startTime;
      logger.info('LDAP authentication successful', {
        username,
        groups: groups.length,
        duration,
      });

      return {
        success: true,
        user,
        groups,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('LDAP authentication error', {
        username,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
        errorCode: 'AUTH_ERROR',
      };
    }
  }

  /**
   * Get user details by username
   */
  async getUserDetails(username: string): Promise<LDAPUser | null> {
    if (!this.initialized || !this.client) {
      throw new Error('LDAP provider not initialized');
    }

    try {
      const filter = this.config.searchFilter!.replace('{{username}}', username);
      const attributes = this.getUserAttributes();

      const searchOptions: SearchOptions = {
        filter,
        scope: this.config.searchScope || 'sub',
        attributes,
        sizeLimit: 1,
      };

      const results = await this.client.search(this.config.baseDN, searchOptions);

      if (results.entries.length === 0) {
        logger.warn('User not found in LDAP', { username });
        return null;
      }

      const entry = results.entries[0];

      return this.mapLDAPEntryToUser(entry);
    } catch (error) {
      logger.error('Failed to get user details', {
        username,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Search for users
   */
  async searchUsers(filter: string, limit?: number): Promise<LDAPUser[]> {
    if (!this.initialized || !this.client) {
      throw new Error('LDAP provider not initialized');
    }

    try {
      const attributes = this.getUserAttributes();

      const searchOptions: SearchOptions = {
        filter,
        scope: this.config.searchScope || 'sub',
        attributes,
        sizeLimit: limit || 100,
      };

      const results = await this.client.search(this.config.baseDN, searchOptions);

      return results.entries.map((entry) => this.mapLDAPEntryToUser(entry));
    } catch (error) {
      logger.error('Failed to search users', {
        filter,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get user by DN
   */
  async getUserByDN(dn: string): Promise<LDAPUser | null> {
    if (!this.initialized || !this.client) {
      throw new Error('LDAP provider not initialized');
    }

    try {
      const attributes = this.getUserAttributes();
      const entry = await this.client.getUserByDN(dn, attributes);

      if (!entry) {
        return null;
      }

      return this.mapLDAPEntryToUser(entry);
    } catch (error) {
      logger.error('Failed to get user by DN', {
        dn,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get user groups
   */
  async getUserGroups(username: string): Promise<string[]> {
    if (!this.initialized || !this.client) {
      throw new Error('LDAP provider not initialized');
    }

    try {
      const user = await this.getUserDetails(username);

      if (!user) {
        return [];
      }

      return await this.client.getUserGroups(user.dn);
    } catch (error) {
      logger.error('Failed to get user groups', {
        username,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Verify user exists
   */
  async userExists(username: string): Promise<boolean> {
    const user = await this.getUserDetails(username);
    return user !== null;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<{ success: boolean; latency: number; error?: string }> {
    if (!this.initialized || !this.client) {
      return {
        success: false,
        latency: 0,
        error: 'LDAP provider not initialized',
      };
    }

    return await this.client.testConnection();
  }

  /**
   * Get connection statistics
   */
  getStats() {
    if (!this.initialized || !this.client) {
      return null;
    }

    return this.client.getStats();
  }

  /**
   * Get pool status
   */
  getPoolStatus() {
    if (!this.initialized || !this.client) {
      return null;
    }

    return this.client.getPoolStatus();
  }

  /**
   * Get user attributes to retrieve
   */
  private getUserAttributes(): string[] {
    const attrs = this.config.userAttributes || {};
    const attributes = [
      'dn',
      attrs.username || 'sAMAccountName',
      attrs.email || 'mail',
      attrs.firstName || 'givenName',
      attrs.lastName || 'sn',
      attrs.displayName || 'displayName',
      attrs.memberOf || 'memberOf',
    ];

    // Add optional attributes
    if (attrs.department) attributes.push(attrs.department);
    if (attrs.title) attributes.push(attrs.title);
    if (attrs.phone) attributes.push(attrs.phone);
    if (attrs.manager) attributes.push(attrs.manager);

    return attributes;
  }

  /**
   * Map LDAP entry to LDAPUser
   */
  private mapLDAPEntryToUser(entry: any): LDAPUser {
    const attrs = this.config.userAttributes || {};

    const getAttr = (attrName: string, defaultValue?: any) => {
      const value = entry[attrName];
      if (value === undefined) return defaultValue;
      return Array.isArray(value) ? value[0] : value;
    };

    const getArrayAttr = (attrName: string): string[] => {
      const value = entry[attrName];
      if (value === undefined) return [];
      return Array.isArray(value) ? value : [value];
    };

    const username = getAttr(attrs.username || 'sAMAccountName') || getAttr('uid');
    const email = getAttr(attrs.email || 'mail');
    const firstName = getAttr(attrs.firstName || 'givenName');
    const lastName = getAttr(attrs.lastName || 'sn');
    const displayName = getAttr(attrs.displayName || 'displayName') || `${firstName} ${lastName}`.trim();
    const memberOf = getArrayAttr(attrs.memberOf || 'memberOf');

    // Extract group names from DNs
    const groups = memberOf.map((dn) => {
      const cnMatch = dn.match(/^CN=([^,]+)/i);
      return cnMatch ? cnMatch[1] : dn;
    });

    return {
      dn: entry.dn || entry.objectName,
      uid: getAttr('uid') || getAttr('objectGUID') || username,
      username,
      email,
      firstName,
      lastName,
      displayName,
      department: getAttr(attrs.department || 'department'),
      title: getAttr(attrs.title || 'title'),
      phone: getAttr(attrs.phone || 'telephoneNumber'),
      manager: getAttr(attrs.manager || 'manager'),
      memberOf,
      groups,
      attributes: entry,
    };
  }

  /**
   * Check if provider is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if LDAP is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Destroy provider and cleanup
   */
  async destroy(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
    }

    this.initialized = false;
    logger.info('LDAP authentication provider destroyed');
  }
}

// Singleton instance
let ldapAuthProviderInstance: LDAPAuthProvider | null = null;

export function getLDAPAuthProvider(): LDAPAuthProvider {
  if (!ldapAuthProviderInstance) {
    ldapAuthProviderInstance = new LDAPAuthProvider();
  }
  return ldapAuthProviderInstance;
}

export function initializeLDAPAuthProvider(config: LDAPConfig): LDAPAuthProvider {
  if (ldapAuthProviderInstance) {
    logger.warn('LDAP auth provider already initialized');
    return ldapAuthProviderInstance;
  }

  ldapAuthProviderInstance = new LDAPAuthProvider(config);
  return ldapAuthProviderInstance;
}
