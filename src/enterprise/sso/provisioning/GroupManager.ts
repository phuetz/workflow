/**
 * Group Manager
 * Handles group synchronization and membership management
 */

import { EventEmitter } from 'events';
import { logger } from '../../../services/SimpleLogger';
import {
  SCIMGroup,
  LocalGroup,
  LocalUser,
  SyncResult,
  ProvisioningResult,
} from './types';

export class GroupManager extends EventEmitter {
  private groups: Map<string, LocalGroup>;
  private users: Map<string, LocalUser>;
  private groupMappings: Record<string, string>;

  constructor(
    groups: Map<string, LocalGroup>,
    users: Map<string, LocalUser>,
    groupMappings: Record<string, string>
  ) {
    super();
    this.groups = groups;
    this.users = users;
    this.groupMappings = groupMappings;
  }

  /**
   * Update group mappings
   */
  updateGroupMappings(mappings: Record<string, string>): void {
    this.groupMappings = mappings;
  }

  /**
   * Sync groups from external source
   */
  async syncGroups(externalGroups: SCIMGroup[], source: string = 'scim'): Promise<SyncResult> {
    const startTime = new Date();
    const result: SyncResult = {
      startTime,
      endTime: new Date(),
      duration: 0,
      totalProcessed: externalGroups.length,
      created: 0,
      updated: 0,
      disabled: 0,
      deleted: 0,
      errors: 0,
      conflicts: 0,
      details: [],
    };

    logger.info('Starting group sync', { count: externalGroups.length, source });

    for (const scimGroup of externalGroups) {
      try {
        const existingGroup = this.findGroupByExternalId(scimGroup.id || scimGroup.externalId || '');

        if (existingGroup) {
          // Update existing group
          const updatedGroup: LocalGroup = {
            ...existingGroup,
            displayName: scimGroup.displayName,
            members: scimGroup.members?.map(m => m.value) || [],
            updatedAt: new Date(),
          };
          this.groups.set(existingGroup.id, updatedGroup);
          result.updated++;

          result.details.push({
            success: true,
            userId: existingGroup.id,
            action: 'update',
            source,
            details: `Group ${scimGroup.displayName} updated`,
            timestamp: new Date(),
          });
        } else {
          // Create new group
          const groupId = this.generateId();
          const newGroup: LocalGroup = {
            id: groupId,
            externalId: scimGroup.id || scimGroup.externalId,
            name: scimGroup.displayName.toLowerCase().replace(/\s+/g, '_'),
            displayName: scimGroup.displayName,
            role: this.groupMappings[scimGroup.displayName] || 'user',
            permissions: [],
            members: scimGroup.members?.map(m => m.value) || [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          this.groups.set(groupId, newGroup);
          result.created++;

          result.details.push({
            success: true,
            userId: groupId,
            action: 'create',
            source,
            details: `Group ${scimGroup.displayName} created`,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        result.errors++;
        result.details.push({
          success: false,
          action: 'update',
          source,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
        });
      }
    }

    result.endTime = new Date();
    result.duration = result.endTime.getTime() - startTime.getTime();

    logger.info('Group sync completed', {
      created: result.created,
      updated: result.updated,
      errors: result.errors,
      duration: result.duration,
    });

    this.emit('groupsSynced', result);
    return result;
  }

  /**
   * Sync user group memberships
   */
  async syncUserGroups(userId: string, externalGroupIds: string[]): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;

    const newGroups: string[] = [];

    for (const externalId of externalGroupIds) {
      const group = this.findGroupByExternalId(externalId);
      if (group) {
        newGroups.push(group.id);

        // Add user to group members if not already present
        if (!group.members.includes(userId)) {
          group.members.push(userId);
          this.groups.set(group.id, group);
        }
      }
    }

    // Remove user from groups they're no longer a member of
    for (const group of this.groups.values()) {
      if (!newGroups.includes(group.id) && group.members.includes(userId)) {
        group.members = group.members.filter(m => m !== userId);
        this.groups.set(group.id, group);
      }
    }

    user.groups = newGroups;
    user.updatedAt = new Date();
    this.users.set(userId, user);

    logger.debug('User groups synced', { userId, groups: newGroups });
  }

  /**
   * Find group by external ID
   */
  findGroupByExternalId(externalId: string): LocalGroup | undefined {
    if (!externalId) return undefined;
    return Array.from(this.groups.values()).find(g => g.externalId === externalId);
  }

  /**
   * Get all groups
   */
  getGroups(): LocalGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Get group by ID
   */
  getGroup(groupId: string): LocalGroup | undefined {
    return this.groups.get(groupId);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
