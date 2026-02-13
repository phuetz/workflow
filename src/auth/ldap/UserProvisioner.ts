/**
 * User Auto-Provisioning Service
 * Automatically creates and updates users on login from LDAP/AD
 */

import { LDAPAuthProvider } from './LDAPAuthProvider';
import { GroupMapper } from './GroupMapper';
import { LDAPUser, UserProvisioningConfig } from '../../types/ldap';
import { logger } from '../../services/SimpleLogger';
import { userRepository } from '../../backend/database/userRepository';

export class UserProvisioner {
  private config: UserProvisioningConfig;

  constructor(
    private ldapProvider: LDAPAuthProvider,
    private groupMapper: GroupMapper,
    config?: Partial<UserProvisioningConfig>
  ) {
    this.config = {
      enabled: config?.enabled ?? true,
      autoCreate: config?.autoCreate ?? true,
      autoUpdate: config?.autoUpdate ?? true,
      autoDeactivate: config?.autoDeactivate ?? false,
      defaultRole: config?.defaultRole || 'user',
      defaultStatus: config?.defaultStatus || 'active',
      defaultPermissions: config?.defaultPermissions || [],
      syncAttributes: config?.syncAttributes || [
        'email',
        'firstName',
        'lastName',
        'displayName',
        'department',
        'title',
      ],
      syncOnLogin: config?.syncOnLogin ?? true,
      deactivateOnMissingUser: config?.deactivateOnMissingUser ?? false,
      deactivateOnDisabledAccount: config?.deactivateOnDisabledAccount ?? true,
    };
  }

  /**
   * Provision user on login
   */
  async provisionUser(ldapUser: LDAPUser): Promise<any> {
    if (!this.config.enabled) {
      logger.warn('User provisioning is disabled');
      return null;
    }

    try {
      logger.info('Provisioning user', { email: ldapUser.email });

      // Check if user exists
      const existingUser = await userRepository.findByEmail(ldapUser.email);

      if (existingUser) {
        // Update existing user if auto-update is enabled
        if (this.config.autoUpdate && this.config.syncOnLogin) {
          return await this.updateUser(existingUser, ldapUser);
        }

        return existingUser;
      } else {
        // Create new user if auto-create is enabled
        if (this.config.autoCreate) {
          return await this.createUser(ldapUser);
        }

        logger.warn('User not found and auto-create is disabled', {
          email: ldapUser.email,
        });
        return null;
      }
    } catch (error) {
      logger.error('Failed to provision user', {
        email: ldapUser.email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create new user
   */
  private async createUser(ldapUser: LDAPUser): Promise<any> {
    logger.info('Creating new user from LDAP', { email: ldapUser.email });

    // Map user to role
    const role = await this.groupMapper.mapUserToRole(ldapUser);

    const newUser = await userRepository.create({
      email: ldapUser.email,
      username: ldapUser.username,
      firstName: ldapUser.firstName,
      lastName: ldapUser.lastName,
      displayName: ldapUser.displayName,
      department: ldapUser.department,
      title: ldapUser.title,
      role: role as any,
      status: this.config.defaultStatus,
      permissions: this.config.defaultPermissions,
      emailVerified: true, // LDAP users are pre-verified
      ldapDN: ldapUser.dn,
      ldapSynced: true,
      ldapSyncedAt: new Date(),
      createdVia: 'ldap',
    } as any);

    logger.info('User created successfully', {
      email: ldapUser.email,
      role,
      id: newUser.id,
    });

    return newUser;
  }

  /**
   * Update existing user
   */
  private async updateUser(existingUser: any, ldapUser: LDAPUser): Promise<any> {
    logger.debug('Updating user from LDAP', { email: ldapUser.email });

    const updates: any = {
      ldapSynced: true,
      ldapSyncedAt: new Date(),
      lastLoginAt: new Date(),
    };

    // Sync configured attributes
    if (this.shouldSyncAttribute('firstName') && ldapUser.firstName) {
      updates.firstName = ldapUser.firstName;
    }

    if (this.shouldSyncAttribute('lastName') && ldapUser.lastName) {
      updates.lastName = ldapUser.lastName;
    }

    if (this.shouldSyncAttribute('displayName') && ldapUser.displayName) {
      updates.displayName = ldapUser.displayName;
    }

    if (this.shouldSyncAttribute('department') && ldapUser.department) {
      updates.department = ldapUser.department;
    }

    if (this.shouldSyncAttribute('title') && ldapUser.title) {
      updates.title = ldapUser.title;
    }

    if (ldapUser.dn) {
      updates.ldapDN = ldapUser.dn;
    }

    // Update role based on group membership
    const newRole = await this.groupMapper.mapUserToRole(ldapUser);
    if (newRole !== existingUser.role) {
      updates.role = newRole;
      logger.info('User role updated', {
        email: ldapUser.email,
        oldRole: existingUser.role,
        newRole,
      });
    }

    // Reactivate user if they were deactivated
    if (existingUser.status === 'inactive' && ldapUser.accountEnabled !== false) {
      updates.status = 'active';
      updates.reactivatedAt = new Date();
      logger.info('User reactivated', { email: ldapUser.email });
    }

    // Deactivate if account is disabled in LDAP/AD
    if (
      this.config.deactivateOnDisabledAccount &&
      ldapUser.accountEnabled === false &&
      existingUser.status === 'active'
    ) {
      updates.status = 'inactive';
      updates.deactivatedAt = new Date();
      updates.deactivationReason = 'LDAP/AD account disabled';
      logger.info('User deactivated due to disabled LDAP account', {
        email: ldapUser.email,
      });
    }

    if (Object.keys(updates).length > 0) {
      await userRepository.update(existingUser.id, updates);
      logger.debug('User updated', {
        email: ldapUser.email,
        updates: Object.keys(updates),
      });
    }

    return { ...existingUser, ...updates };
  }

  /**
   * Check if attribute should be synced
   */
  private shouldSyncAttribute(attribute: string): boolean {
    return this.config.syncAttributes?.includes(attribute) ?? false;
  }

  /**
   * Verify user still exists in LDAP
   */
  async verifyUserExists(email: string): Promise<boolean> {
    try {
      const user = await userRepository.findByEmail(email);

      if (!user) {
        return false;
      }

      // Check if user exists in LDAP
      const ldapUser = await this.ldapProvider.getUserDetails(user.username);

      return ldapUser !== null;
    } catch (error) {
      logger.error('Failed to verify user existence', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Deactivate user if not found in LDAP
   */
  async deactivateIfMissing(email: string): Promise<boolean> {
    if (!this.config.deactivateOnMissingUser) {
      return false;
    }

    try {
      const exists = await this.verifyUserExists(email);

      if (!exists) {
        const user = await userRepository.findByEmail(email);

        if (user && user.status === 'active') {
          await userRepository.update(user.id, {
            status: 'inactive',
            deactivatedAt: new Date(),
            deactivationReason: 'User not found in LDAP',
          } as any);

          logger.info('User deactivated (not found in LDAP)', { email });
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Failed to deactivate missing user', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get provisioning configuration
   */
  getConfig(): UserProvisioningConfig {
    return { ...this.config };
  }

  /**
   * Update provisioning configuration
   */
  updateConfig(config: Partial<UserProvisioningConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('User provisioning configuration updated', config);
  }

  /**
   * Check if provisioning is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

// Factory function
export function createUserProvisioner(
  ldapProvider: LDAPAuthProvider,
  groupMapper: GroupMapper,
  config?: Partial<UserProvisioningConfig>
): UserProvisioner {
  return new UserProvisioner(ldapProvider, groupMapper, config);
}
