/**
 * Active Directory Provider
 * AD-specific authentication with userAccountControl, password expiry, and nested groups
 */

import { LDAPAuthProvider } from './LDAPAuthProvider';
import { LDAPClient } from './LDAPClient';
import { getLDAPConfigManager } from './LDAPConfig';
import { ActiveDirectoryConfig, LDAPUser, LDAPAuthResult } from '../../types/ldap';
import { logger } from '../../services/SimpleLogger';
import { SearchOptions } from 'ldapjs';

// User Account Control flags
const UAC_FLAGS = {
  SCRIPT: 0x0001,
  ACCOUNTDISABLE: 0x0002,
  HOMEDIR_REQUIRED: 0x0008,
  LOCKOUT: 0x0010,
  PASSWD_NOTREQD: 0x0020,
  PASSWD_CANT_CHANGE: 0x0040,
  ENCRYPTED_TEXT_PWD_ALLOWED: 0x0080,
  TEMP_DUPLICATE_ACCOUNT: 0x0100,
  NORMAL_ACCOUNT: 0x0200,
  INTERDOMAIN_TRUST_ACCOUNT: 0x0800,
  WORKSTATION_TRUST_ACCOUNT: 0x1000,
  SERVER_TRUST_ACCOUNT: 0x2000,
  DONT_EXPIRE_PASSWORD: 0x10000,
  MNS_LOGON_ACCOUNT: 0x20000,
  SMARTCARD_REQUIRED: 0x40000,
  TRUSTED_FOR_DELEGATION: 0x80000,
  NOT_DELEGATED: 0x100000,
  USE_DES_KEY_ONLY: 0x200000,
  DONT_REQ_PREAUTH: 0x400000,
  PASSWORD_EXPIRED: 0x800000,
  TRUSTED_TO_AUTH_FOR_DELEGATION: 0x1000000,
  PARTIAL_SECRETS_ACCOUNT: 0x04000000,
};

export class ActiveDirectoryProvider extends LDAPAuthProvider {
  private adConfig: ActiveDirectoryConfig;
  private adClient: LDAPClient | null = null;

  constructor(config?: ActiveDirectoryConfig) {
    const adConfig = config || (getLDAPConfigManager().loadADFromEnv() as ActiveDirectoryConfig);
    super(adConfig);
    this.adConfig = adConfig;
  }

  /**
   * Initialize the AD provider
   */
  async initialize(): Promise<void> {
    await super.initialize();

    if (this.isInitialized()) {
      // Initialize AD-specific client
      this.adClient = new LDAPClient(this.adConfig);
      await this.adClient.initialize();

      logger.info('Active Directory provider initialized', {
        domain: this.adConfig.domain,
        nestedGroups: this.adConfig.nestedGroups,
      });
    }
  }

  /**
   * Authenticate user with AD-specific checks
   */
  async authenticate(username: string, password: string): Promise<LDAPAuthResult> {
    const result = await super.authenticate(username, password);

    if (!result.success || !result.user) {
      return result;
    }

    // Perform AD-specific checks
    const adChecks = await this.performADChecks(result.user);

    if (!adChecks.valid) {
      logger.info('AD account validation failed', {
        username,
        reason: adChecks.reason,
      });

      return {
        success: false,
        error: adChecks.reason,
        errorCode: adChecks.code,
      };
    }

    // Enrich user with AD-specific attributes
    const enrichedUser = await this.enrichUserWithADAttributes(result.user);

    return {
      success: true,
      user: enrichedUser,
      groups: result.groups,
    };
  }

  /**
   * Get user details with AD-specific attributes
   */
  async getUserDetails(username: string): Promise<LDAPUser | null> {
    const user = await super.getUserDetails(username);

    if (!user) {
      return null;
    }

    // Enrich with AD attributes
    return await this.enrichUserWithADAttributes(user);
  }

  /**
   * Perform AD-specific account checks
   */
  private async performADChecks(
    user: LDAPUser
  ): Promise<{ valid: boolean; reason?: string; code?: string }> {
    const uacConfig = this.adConfig.userAccountControl || {};

    // Check if account is enabled
    if (uacConfig.enabled !== false) {
      if (user.userAccountControl && this.isAccountDisabled(user.userAccountControl)) {
        return {
          valid: false,
          reason: 'Account is disabled',
          code: 'ACCOUNT_DISABLED',
        };
      }
    }

    // Check if account is locked
    if (uacConfig.locked !== false) {
      if (user.accountLocked) {
        return {
          valid: false,
          reason: 'Account is locked',
          code: 'ACCOUNT_LOCKED',
        };
      }
    }

    // Check if password is expired
    if (uacConfig.passwordExpired !== false) {
      if (user.passwordExpired) {
        return {
          valid: false,
          reason: 'Password has expired',
          code: 'PASSWORD_EXPIRED',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Enrich user with AD-specific attributes
   */
  private async enrichUserWithADAttributes(user: LDAPUser): Promise<LDAPUser> {
    if (!this.adClient) {
      return user;
    }

    try {
      // Get full user entry with AD attributes
      const entry = await this.adClient.getUserByDN(user.dn, [
        'userAccountControl',
        'accountExpires',
        'pwdLastSet',
        'lastLogon',
        'lastLogonTimestamp',
        'badPasswordTime',
        'badPwdCount',
        'lockoutTime',
      ]);

      if (!entry) {
        return user;
      }

      // Parse userAccountControl
      const uac = parseInt(entry.userAccountControl || '0', 10);
      user.userAccountControl = uac;
      user.accountEnabled = !this.isAccountDisabled(uac);
      user.passwordExpired = this.isPasswordExpired(uac);
      user.accountLocked = this.isAccountLocked(entry.lockoutTime);

      // Parse timestamps
      if (entry.lastLogon) {
        user.lastLogon = this.parseADTimestamp(entry.lastLogon);
      }

      if (entry.pwdLastSet) {
        user.pwdLastSet = this.parseADTimestamp(entry.pwdLastSet);
      }

      return user;
    } catch (error) {
      logger.error('Failed to enrich user with AD attributes', {
        dn: user.dn,
        error: error instanceof Error ? error.message : String(error),
      });
      return user;
    }
  }

  /**
   * Get nested groups (recursive)
   */
  async getNestedGroups(username: string, maxDepth?: number): Promise<string[]> {
    if (!this.adClient) {
      throw new Error('AD provider not initialized');
    }

    if (!this.adConfig.nestedGroups) {
      return await this.getUserGroups(username);
    }

    const user = await this.getUserDetails(username);

    if (!user) {
      return [];
    }

    const depth = maxDepth || this.adConfig.maxNestedDepth || 10;
    const allGroups = new Set<string>();
    const visited = new Set<string>();

    await this.resolveNestedGroups(user.memberOf || [], allGroups, visited, 0, depth);

    return Array.from(allGroups);
  }

  /**
   * Recursively resolve nested groups
   */
  private async resolveNestedGroups(
    groupDNs: string[],
    allGroups: Set<string>,
    visited: Set<string>,
    currentDepth: number,
    maxDepth: number
  ): Promise<void> {
    if (currentDepth >= maxDepth || !this.adClient) {
      return;
    }

    for (const groupDN of groupDNs) {
      if (visited.has(groupDN)) {
        continue;
      }

      visited.add(groupDN);
      allGroups.add(groupDN);

      try {
        // Get group's parent groups (memberOf)
        const groupEntry = await this.adClient.getUserByDN(groupDN, ['memberOf']);

        if (groupEntry && groupEntry.memberOf) {
          const parentGroups = Array.isArray(groupEntry.memberOf)
            ? groupEntry.memberOf
            : [groupEntry.memberOf];

          await this.resolveNestedGroups(
            parentGroups,
            allGroups,
            visited,
            currentDepth + 1,
            maxDepth
          );
        }
      } catch (error) {
        logger.warn('Failed to resolve nested group', {
          groupDN,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Search users in specific domain
   */
  async searchUsersInDomain(filter: string, domain?: string, limit?: number): Promise<LDAPUser[]> {
    if (!this.adClient) {
      throw new Error('AD provider not initialized');
    }

    const baseDN = domain
      ? this.domainToBaseDN(domain)
      : this.adConfig.baseDN;

    try {
      const attributes = this.getUserAttributesWithAD();

      const searchOptions: SearchOptions = {
        filter,
        scope: 'sub',
        attributes,
        sizeLimit: limit || 100,
      };

      const results = await this.adClient.search(baseDN, searchOptions);

      return results.entries.map((entry) => this.mapADEntryToUser(entry));
    } catch (error) {
      logger.error('Failed to search users in domain', {
        domain,
        filter,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get user attributes including AD-specific ones
   */
  private getUserAttributesWithAD(): string[] {
    const attrs = this.adConfig.userAttributes || {};
    return [
      'dn',
      attrs.username || 'sAMAccountName',
      attrs.email || 'mail',
      attrs.firstName || 'givenName',
      attrs.lastName || 'sn',
      attrs.displayName || 'displayName',
      attrs.memberOf || 'memberOf',
      attrs.department || 'department',
      attrs.title || 'title',
      attrs.phone || 'telephoneNumber',
      attrs.manager || 'manager',
      // AD-specific attributes
      'userAccountControl',
      'accountExpires',
      'pwdLastSet',
      'lastLogon',
      'lockoutTime',
      'objectGUID',
      'objectSid',
    ];
  }

  /**
   * Map AD entry to LDAPUser
   */
  private mapADEntryToUser(entry: any): LDAPUser {
    const attrs = this.adConfig.userAttributes || {};

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

    const username = getAttr(attrs.username || 'sAMAccountName');
    const email = getAttr(attrs.email || 'mail');
    const firstName = getAttr(attrs.firstName || 'givenName');
    const lastName = getAttr(attrs.lastName || 'sn');
    const displayName = getAttr(attrs.displayName || 'displayName') || `${firstName} ${lastName}`.trim();
    const memberOf = getArrayAttr(attrs.memberOf || 'memberOf');

    const groups = memberOf.map((dn) => {
      const cnMatch = dn.match(/^CN=([^,]+)/i);
      return cnMatch ? cnMatch[1] : dn;
    });

    const uac = parseInt(getAttr('userAccountControl', '0'), 10);

    return {
      dn: entry.dn || entry.objectName,
      uid: getAttr('objectGUID') || username,
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
      userAccountControl: uac,
      accountEnabled: !this.isAccountDisabled(uac),
      passwordExpired: this.isPasswordExpired(uac),
      accountLocked: this.isAccountLocked(getAttr('lockoutTime')),
      lastLogon: this.parseADTimestamp(getAttr('lastLogon')),
      pwdLastSet: this.parseADTimestamp(getAttr('pwdLastSet')),
      attributes: entry,
    };
  }

  /**
   * Check if account is disabled
   */
  private isAccountDisabled(uac: number): boolean {
    return (uac & UAC_FLAGS.ACCOUNTDISABLE) !== 0;
  }

  /**
   * Check if password is expired
   */
  private isPasswordExpired(uac: number): boolean {
    return (uac & UAC_FLAGS.PASSWORD_EXPIRED) !== 0;
  }

  /**
   * Check if account is locked
   */
  private isAccountLocked(lockoutTime: string | undefined): boolean {
    if (!lockoutTime || lockoutTime === '0') {
      return false;
    }

    // If lockoutTime is set and not zero, account is locked
    return parseInt(lockoutTime, 10) > 0;
  }

  /**
   * Parse AD timestamp (Windows file time)
   */
  private parseADTimestamp(timestamp: string | undefined): Date | undefined {
    if (!timestamp || timestamp === '0') {
      return undefined;
    }

    try {
      // Convert Windows file time (100-nanosecond intervals since Jan 1, 1601)
      // to Unix timestamp
      const fileTime = BigInt(timestamp);
      const unixEpoch = BigInt(116444736000000000);
      const unixTime = (fileTime - unixEpoch) / BigInt(10000);

      return new Date(Number(unixTime));
    } catch (error) {
      logger.warn('Failed to parse AD timestamp', { timestamp, error });
      return undefined;
    }
  }

  /**
   * Convert domain to base DN
   */
  private domainToBaseDN(domain: string): string {
    return domain
      .split('.')
      .map((part) => `dc=${part}`)
      .join(',');
  }

  /**
   * Change user password (requires admin privileges)
   */
  async changePassword(username: string, newPassword: string): Promise<boolean> {
    if (!this.adClient) {
      throw new Error('AD provider not initialized');
    }

    try {
      const user = await this.getUserDetails(username);

      if (!user) {
        logger.error('User not found for password change', { username });
        return false;
      }

      // This would require additional LDAP modify operations
      // Implementation depends on specific AD requirements
      logger.warn('Password change not yet implemented for AD');
      return false;
    } catch (error) {
      logger.error('Failed to change password', {
        username,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Destroy provider
   */
  async destroy(): Promise<void> {
    if (this.adClient) {
      await this.adClient.destroy();
      this.adClient = null;
    }

    await super.destroy();
  }
}

// Singleton instance
let adProviderInstance: ActiveDirectoryProvider | null = null;

export function getActiveDirectoryProvider(): ActiveDirectoryProvider {
  if (!adProviderInstance) {
    adProviderInstance = new ActiveDirectoryProvider();
  }
  return adProviderInstance;
}

export function initializeActiveDirectoryProvider(config: ActiveDirectoryConfig): ActiveDirectoryProvider {
  if (adProviderInstance) {
    logger.warn('Active Directory provider already initialized');
    return adProviderInstance;
  }

  adProviderInstance = new ActiveDirectoryProvider(config);
  return adProviderInstance;
}
