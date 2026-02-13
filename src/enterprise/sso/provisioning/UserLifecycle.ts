/**
 * User Lifecycle Manager
 * Handles user creation, update, deletion, and archival
 */

import { EventEmitter } from 'events';
import { logger } from '../../../services/SimpleLogger';
import {
  LocalUser,
  ProvisioningResult,
  ProvisioningConfig,
  AuditEntry,
} from './types';

export class UserLifecycle extends EventEmitter {
  private users: Map<string, LocalUser>;
  private groups: Map<string, { id: string; members: string[] }>;
  private config: ProvisioningConfig;
  private createAuditEntry: (
    action: string,
    userId: string,
    source: string,
    details: Record<string, any>,
    previousState?: Record<string, any>,
    newState?: Record<string, any>
  ) => void;

  constructor(
    users: Map<string, LocalUser>,
    groups: Map<string, { id: string; members: string[] }>,
    config: ProvisioningConfig,
    createAuditEntry: (
      action: string,
      userId: string,
      source: string,
      details: Record<string, any>,
      previousState?: Record<string, any>,
      newState?: Record<string, any>
    ) => void
  ) {
    super();
    this.users = users;
    this.groups = groups;
    this.config = config;
    this.createAuditEntry = createAuditEntry;
  }

  /**
   * Update configuration reference
   */
  updateConfig(config: ProvisioningConfig): void {
    this.config = config;
  }

  /**
   * Create a new user
   */
  async createUser(
    userData: Partial<LocalUser>,
    source: string,
    externalId?: string,
    determineRole?: (data: Partial<LocalUser>) => string,
    determinePermissions?: (data: Partial<LocalUser>) => string[]
  ): Promise<ProvisioningResult> {
    const userId = this.generateId();

    const newUser: LocalUser = {
      id: userId,
      externalId: externalId,
      username: userData.username || '',
      email: userData.email || '',
      firstName: userData.firstName,
      lastName: userData.lastName,
      displayName: userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      title: userData.title,
      department: userData.department,
      organization: userData.organization,
      manager: userData.manager,
      employeeNumber: userData.employeeNumber,
      phone: userData.phone,
      photoUrl: userData.photoUrl,
      role: determineRole ? determineRole(userData) : 'user',
      permissions: determinePermissions ? determinePermissions(userData) : ['read:workflows'],
      groups: userData.groups || [],
      status: (userData.status as LocalUser['status']) || 'active',
      locale: userData.locale,
      timezone: userData.timezone,
      metadata: userData.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      provisionedBy: source,
      provisionedAt: new Date(),
    };

    this.users.set(userId, newUser);

    logger.info('User created', { userId, email: newUser.email, source });

    return {
      success: true,
      userId,
      action: 'create',
      source,
      details: `User ${newUser.email} created successfully`,
      timestamp: new Date(),
    };
  }

  /**
   * Update an existing user
   */
  async updateUser(
    userId: string,
    updates: Partial<LocalUser>,
    source: string
  ): Promise<ProvisioningResult> {
    const existingUser = this.users.get(userId);

    if (!existingUser) {
      return {
        success: false,
        userId,
        action: 'update',
        source,
        error: 'User not found',
        timestamp: new Date(),
      };
    }

    // Apply updates
    const updatedUser: LocalUser = {
      ...existingUser,
      ...updates,
      id: userId,
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);

    logger.info('User updated', { userId, email: updatedUser.email, source });

    return {
      success: true,
      userId,
      action: 'update',
      source,
      details: `User ${updatedUser.email} updated successfully`,
      timestamp: new Date(),
    };
  }

  /**
   * Deprovision a user
   */
  async deprovisionUser(
    userId: string,
    reason: string = 'User deprovisioned',
    source: string = 'system',
    hardDelete: boolean = false
  ): Promise<ProvisioningResult> {
    try {
      const user = this.users.get(userId);

      if (!user) {
        return {
          success: false,
          userId,
          action: 'delete',
          source,
          error: 'User not found',
          timestamp: new Date(),
        };
      }

      logger.info('Deprovisioning user', { userId, email: user.email, hardDelete, reason });

      if (hardDelete) {
        // Immediate deletion
        if (this.config.archiveOnDelete) {
          await this.archiveUser(user);
        }

        this.users.delete(userId);

        // Remove from all groups
        for (const group of this.groups.values()) {
          group.members = group.members.filter(m => m !== userId);
        }

        this.createAuditEntry('delete', userId, source, {
          reason,
          previousState: user,
          hardDelete: true
        });

        this.emit('userDeleted', { userId, user, reason });

        return {
          success: true,
          userId,
          action: 'delete',
          source,
          details: `User ${user.email} permanently deleted`,
          timestamp: new Date(),
        };
      } else {
        // Soft delete - suspend first if configured
        if (this.config.suspendBeforeDelete && user.status === 'active') {
          user.status = 'suspended';
          user.updatedAt = new Date();
          this.users.set(userId, user);

          // Schedule hard delete after delay
          setTimeout(() => {
            const currentUser = this.users.get(userId);
            if (currentUser && currentUser.status === 'suspended') {
              this.deprovisionUser(userId, reason, source, true);
            }
          }, this.config.deprovisionDelay * 24 * 60 * 60 * 1000);

          this.createAuditEntry('disable', userId, source, {
            reason,
            scheduledDeleteDate: new Date(Date.now() + this.config.deprovisionDelay * 24 * 60 * 60 * 1000)
          });

          this.emit('userSuspended', { userId, user, reason });

          return {
            success: true,
            userId,
            action: 'disable',
            source,
            details: `User ${user.email} suspended, scheduled for deletion in ${this.config.deprovisionDelay} days`,
            timestamp: new Date(),
          };
        } else {
          // Mark for pending deletion
          user.status = 'pending_deletion';
          user.deprovisionedAt = new Date();
          user.deprovisionReason = reason;
          user.updatedAt = new Date();
          this.users.set(userId, user);

          this.createAuditEntry('disable', userId, source, { reason });
          this.emit('userDisabled', { userId, user, reason });

          return {
            success: true,
            userId,
            action: 'disable',
            source,
            details: `User ${user.email} marked for deletion`,
            timestamp: new Date(),
          };
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to deprovision user', { userId, error: errorMessage });

      return {
        success: false,
        userId,
        action: 'delete',
        source,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Archive user data before deletion
   */
  private async archiveUser(user: LocalUser): Promise<void> {
    const archiveEntry: AuditEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      action: 'archive',
      userId: user.id,
      performedBy: 'system',
      source: 'deprovisioning',
      details: { archivedUser: user },
    };

    // In a real implementation, this would store to persistent audit log
    logger.info('User archived', { userId: user.id, email: user.email });
    this.emit('auditEntry', archiveEntry);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
