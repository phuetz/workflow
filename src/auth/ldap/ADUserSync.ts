/**
 * Active Directory User Synchronization Service
 * Synchronizes users from AD to local database with scheduled updates
 */

import { ActiveDirectoryProvider } from './ActiveDirectoryProvider';
import { ADGroupMapper } from './ADGroupMapper';
import { LDAPUser, UserSyncResult } from '../../types/ldap';
import { logger } from '../../services/SimpleLogger';
import { userRepository } from '../../backend/database/userRepository';
import cron, { ScheduledTask } from 'node-cron';

export interface ADUserSyncConfig {
  enabled: boolean;
  syncOnStartup?: boolean;
  scheduleExpression?: string; // Cron expression (default: daily at 2 AM)
  fullSyncInterval?: number; // Full sync interval in hours (default: 24)
  deactivateRemovedUsers?: boolean; // Deactivate users not found in AD
  deactivateDisabledAccounts?: boolean; // Deactivate users with disabled AD accounts
  syncAttributes?: string[]; // Attributes to sync
  batchSize?: number; // Number of users to process per batch (default: 100)
}

export class ADUserSync {
  private config: ADUserSyncConfig;
  private syncTask: ScheduledTask | null = null;
  private syncing: boolean = false;
  private lastSyncTime: Date | null = null;
  private lastSyncResult: UserSyncResult | null = null;

  constructor(
    private adProvider: ActiveDirectoryProvider,
    private groupMapper: ADGroupMapper,
    config?: Partial<ADUserSyncConfig>
  ) {
    this.config = {
      enabled: config?.enabled ?? true,
      syncOnStartup: config?.syncOnStartup ?? false,
      scheduleExpression: config?.scheduleExpression || '0 2 * * *', // Daily at 2 AM
      fullSyncInterval: config?.fullSyncInterval || 24,
      deactivateRemovedUsers: config?.deactivateRemovedUsers ?? true,
      deactivateDisabledAccounts: config?.deactivateDisabledAccounts ?? true,
      syncAttributes: config?.syncAttributes || [
        'email',
        'firstName',
        'lastName',
        'displayName',
        'department',
        'title',
      ],
      batchSize: config?.batchSize || 100,
    };
  }

  /**
   * Initialize sync service
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('AD user sync is disabled');
      return;
    }

    logger.info('Initializing AD user sync service', {
      schedule: this.config.scheduleExpression,
      syncOnStartup: this.config.syncOnStartup,
    });

    // Sync on startup if enabled
    if (this.config.syncOnStartup) {
      logger.info('Running initial user sync');
      await this.syncUsers();
    }

    // Schedule periodic sync
    this.scheduleSyncTask();

    logger.info('AD user sync service initialized');
  }

  /**
   * Schedule sync task
   */
  private scheduleSyncTask(): void {
    if (!this.config.scheduleExpression) {
      return;
    }

    try {
      this.syncTask = cron.schedule(this.config.scheduleExpression, async () => {
        logger.info('Starting scheduled user sync');
        await this.syncUsers();
      });

      logger.info('User sync task scheduled', {
        expression: this.config.scheduleExpression,
      });
    } catch (error) {
      logger.error('Failed to schedule sync task', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Sync all users from AD
   */
  async syncUsers(): Promise<UserSyncResult> {
    if (this.syncing) {
      logger.warn('User sync already in progress');
      return this.lastSyncResult || this.createEmptyResult();
    }

    this.syncing = true;
    const startTime = Date.now();

    const result: UserSyncResult = {
      totalUsers: 0,
      created: 0,
      updated: 0,
      deactivated: 0,
      errors: 0,
      duration: 0,
      details: {
        createdUsers: [],
        updatedUsers: [],
        deactivatedUsers: [],
        errors: [],
      },
    };

    try {
      logger.info('Starting AD user synchronization');

      // Get all users from AD
      const adUsers = await this.getAllADUsers();
      result.totalUsers = adUsers.length;

      logger.info('Retrieved users from AD', { count: adUsers.length });

      // Process users in batches
      const batches = this.createBatches(adUsers, this.config.batchSize || 100);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.debug(`Processing batch ${i + 1}/${batches.length}`, {
          size: batch.length,
        });

        await Promise.all(
          batch.map(async (adUser) => {
            try {
              await this.syncUser(adUser, result);
            } catch (error) {
              result.errors++;
              result.details?.errors?.push({
                user: adUser.username,
                error: error instanceof Error ? error.message : String(error),
              });

              logger.error('Failed to sync user', {
                username: adUser.username,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          })
        );
      }

      // Deactivate removed users if enabled
      if (this.config.deactivateRemovedUsers) {
        await this.deactivateRemovedUsers(adUsers, result);
      }

      result.duration = Date.now() - startTime;
      this.lastSyncTime = new Date();
      this.lastSyncResult = result;

      logger.info('AD user synchronization completed', {
        totalUsers: result.totalUsers,
        created: result.created,
        updated: result.updated,
        deactivated: result.deactivated,
        errors: result.errors,
        duration: result.duration,
      });
    } catch (error) {
      logger.error('AD user synchronization failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      result.duration = Date.now() - startTime;
      this.lastSyncResult = result;
    } finally {
      this.syncing = false;
    }

    return result;
  }

  /**
   * Sync individual user
   */
  private async syncUser(adUser: LDAPUser, result: UserSyncResult): Promise<void> {
    // Check if account is disabled and should be deactivated
    if (
      this.config.deactivateDisabledAccounts &&
      adUser.accountEnabled === false
    ) {
      await this.deactivateUser(adUser.email, result);
      return;
    }

    // Find existing user by email
    const existingUser = await userRepository.findByEmail(adUser.email);

    if (existingUser) {
      // Update existing user
      const updates = this.buildUserUpdates(adUser);

      if (Object.keys(updates).length > 0) {
        await userRepository.update(existingUser.id, updates);
        result.updated++;
        result.details?.updatedUsers?.push(adUser.email);

        logger.debug('User updated', {
          email: adUser.email,
          updates: Object.keys(updates),
        });
      }
    } else {
      // Create new user
      await this.createUser(adUser, result);
    }
  }

  /**
   * Create new user from AD
   */
  private async createUser(adUser: LDAPUser, result: UserSyncResult): Promise<void> {
    // Map user to role
    const role = await this.groupMapper.mapUserToRole(adUser);

    const newUser = await userRepository.create({
      email: adUser.email,
      username: adUser.username,
      firstName: adUser.firstName,
      lastName: adUser.lastName,
      displayName: adUser.displayName,
      department: adUser.department,
      title: adUser.title,
      role: role as any,
      status: 'active',
      emailVerified: true, // AD users are pre-verified
      ldapDN: adUser.dn,
      ldapSynced: true,
      ldapSyncedAt: new Date(),
    } as any);

    result.created++;
    result.details?.createdUsers?.push(adUser.email);

    logger.info('User created from AD', {
      email: adUser.email,
      role,
    });
  }

  /**
   * Build user updates
   */
  private buildUserUpdates(adUser: LDAPUser): any {
    const updates: any = {
      ldapSynced: true,
      ldapSyncedAt: new Date(),
    };

    if (this.config.syncAttributes?.includes('firstName') && adUser.firstName) {
      updates.firstName = adUser.firstName;
    }

    if (this.config.syncAttributes?.includes('lastName') && adUser.lastName) {
      updates.lastName = adUser.lastName;
    }

    if (this.config.syncAttributes?.includes('displayName') && adUser.displayName) {
      updates.displayName = adUser.displayName;
    }

    if (this.config.syncAttributes?.includes('department') && adUser.department) {
      updates.department = adUser.department;
    }

    if (this.config.syncAttributes?.includes('title') && adUser.title) {
      updates.title = adUser.title;
    }

    if (adUser.dn) {
      updates.ldapDN = adUser.dn;
    }

    return updates;
  }

  /**
   * Get all users from AD
   */
  private async getAllADUsers(): Promise<LDAPUser[]> {
    const filter = '(&(objectClass=user)(mail=*))';
    return await this.adProvider.searchUsersInDomain(filter, undefined, 10000);
  }

  /**
   * Deactivate users not found in AD
   */
  private async deactivateRemovedUsers(
    adUsers: LDAPUser[],
    result: UserSyncResult
  ): Promise<void> {
    try {
      // Get all LDAP-synced users from database
      const localUsers = await userRepository.findLDAPSyncedUsers();

      const adEmails = new Set(adUsers.map((u) => u.email.toLowerCase()));

      for (const localUser of localUsers) {
        if (!adEmails.has(localUser.email.toLowerCase())) {
          await this.deactivateUser(localUser.email, result);
        }
      }
    } catch (error) {
      logger.error('Failed to deactivate removed users', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Deactivate user
   */
  private async deactivateUser(email: string, result: UserSyncResult): Promise<void> {
    const user = await userRepository.findByEmail(email);

    if (user && user.status === 'active') {
      await userRepository.update(user.id, {
        status: 'inactive',
        deactivatedAt: new Date(),
        deactivationReason: 'Removed from AD or account disabled',
      } as any);

      result.deactivated++;
      result.details?.deactivatedUsers?.push(email);

      logger.info('User deactivated', { email });
    }
  }

  /**
   * Create batches
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Create empty result
   */
  private createEmptyResult(): UserSyncResult {
    return {
      totalUsers: 0,
      created: 0,
      updated: 0,
      deactivated: 0,
      errors: 0,
      duration: 0,
    };
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * Get last sync result
   */
  getLastSyncResult(): UserSyncResult | null {
    return this.lastSyncResult;
  }

  /**
   * Check if sync is in progress
   */
  isSyncing(): boolean {
    return this.syncing;
  }

  /**
   * Stop sync service
   */
  stop(): void {
    if (this.syncTask) {
      this.syncTask.stop();
      this.syncTask = null;
      logger.info('AD user sync task stopped');
    }
  }

  /**
   * Destroy sync service
   */
  destroy(): void {
    this.stop();
    logger.info('AD user sync service destroyed');
  }
}
