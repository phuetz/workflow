/**
 * User Provisioning Engine - SCIM 2.0 compliant user provisioning orchestrator
 * Coordinates lifecycle management, group sync, attribute mapping, and bulk operations
 */

import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';

// Import types and modules from provisioning subdirectory
import {
  SCIMUser,
  SCIMGroup,
  LocalUser,
  LocalGroup,
  ProvisioningConfig,
  ProvisioningResult,
  SyncResult,
  ConflictRecord,
  AuditEntry,
  BulkOperation,
  DEFAULT_ATTRIBUTE_MAPPINGS,
} from './provisioning/types';

import { SCIMHandler } from './provisioning/SCIMHandler';
import { UserLifecycle } from './provisioning/UserLifecycle';
import { GroupManager } from './provisioning/GroupManager';
import { AttributeMapper } from './provisioning/AttributeMapper';
import { SyncEngine } from './provisioning/SyncEngine';

// Re-export types for backwards compatibility
export * from './provisioning/types';

export class UserProvisioningEngine extends EventEmitter {
  private static instance: UserProvisioningEngine;

  private config: ProvisioningConfig;
  private users: Map<string, LocalUser> = new Map();
  private groups: Map<string, LocalGroup> = new Map();
  private conflicts: Map<string, ConflictRecord> = new Map();
  private auditLog: AuditEntry[] = [];
  private bulkOperations: Map<string, BulkOperation> = new Map();

  // Delegated components
  private scimHandler: SCIMHandler;
  private userLifecycle: UserLifecycle;
  private groupManager: GroupManager;
  private attributeMapper: AttributeMapper;
  private syncEngine: SyncEngine;

  private constructor(config?: Partial<ProvisioningConfig>) {
    super();
    this.config = this.initializeConfig(config);

    // Initialize components
    this.scimHandler = new SCIMHandler(this.config.scimEndpoint, this.config.scimToken);
    this.attributeMapper = new AttributeMapper(this.config.attributeMappings);
    this.groupManager = new GroupManager(this.groups, this.users, this.config.groupMappings);
    this.userLifecycle = new UserLifecycle(
      this.users,
      this.groups as any,
      this.config,
      this.createAuditEntry.bind(this)
    );
    this.syncEngine = new SyncEngine(
      this.config,
      this.users,
      this.conflicts,
      this.bulkOperations,
      this.scimHandler
    );

    // Forward events from components
    this.setupEventForwarding();

    logger.info('UserProvisioningEngine initialized', { mode: this.config.mode });
  }

  public static getInstance(config?: Partial<ProvisioningConfig>): UserProvisioningEngine {
    if (!UserProvisioningEngine.instance) {
      UserProvisioningEngine.instance = new UserProvisioningEngine(config);
    }
    return UserProvisioningEngine.instance;
  }

  public static resetInstance(): void {
    if (UserProvisioningEngine.instance) {
      UserProvisioningEngine.instance.shutdown();
      UserProvisioningEngine.instance = null as any;
    }
  }

  private initializeConfig(config?: Partial<ProvisioningConfig>): ProvisioningConfig {
    return {
      enabled: config?.enabled ?? true,
      mode: config?.mode ?? 'push',
      scimEndpoint: config?.scimEndpoint,
      scimToken: config?.scimToken,
      scimVersion: config?.scimVersion ?? '2.0',
      syncInterval: config?.syncInterval ?? 3600000,
      batchSize: config?.batchSize ?? 100,
      maxRetries: config?.maxRetries ?? 3,
      retryDelay: config?.retryDelay ?? 5000,
      autoProvision: config?.autoProvision ?? true,
      autoDeprovision: config?.autoDeprovision ?? true,
      deprovisionDelay: config?.deprovisionDelay ?? 30,
      suspendBeforeDelete: config?.suspendBeforeDelete ?? true,
      retainUserData: config?.retainUserData ?? true,
      dataRetentionDays: config?.dataRetentionDays ?? 90,
      archiveOnDelete: config?.archiveOnDelete ?? true,
      conflictResolution: config?.conflictResolution ?? 'source_wins',
      attributeMappings: config?.attributeMappings ?? DEFAULT_ATTRIBUTE_MAPPINGS,
      groupMappings: config?.groupMappings ?? {},
      hrIntegrations: config?.hrIntegrations ?? [],
    };
  }

  private setupEventForwarding(): void {
    // Forward lifecycle events
    this.userLifecycle.on('userDeleted', (data) => this.emit('userDeleted', data));
    this.userLifecycle.on('userSuspended', (data) => this.emit('userSuspended', data));
    this.userLifecycle.on('userDisabled', (data) => this.emit('userDisabled', data));
    this.userLifecycle.on('auditEntry', (entry) => {
      this.auditLog.push(entry);
      this.emit('auditEntry', entry);
    });

    // Forward group events
    this.groupManager.on('groupsSynced', (result) => this.emit('groupsSynced', result));

    // Forward sync events
    this.syncEngine.on('syncStarted', (data) => this.emit('syncStarted', data));
    this.syncEngine.on('syncCompleted', (result) => this.emit('syncCompleted', result));
    this.syncEngine.on('syncError', (data) => this.emit('syncError', data));
    this.syncEngine.on('conflictDetected', (conflict) => this.emit('conflictDetected', conflict));
    this.syncEngine.on('conflictResolved', (data) => this.emit('conflictResolved', data));
    this.syncEngine.on('exportCompleted', (op) => this.emit('exportCompleted', op));
    this.syncEngine.on('importCompleted', (op) => this.emit('importCompleted', op));
  }

  async provisionUser(scimUser: SCIMUser, source: string = 'scim'): Promise<ProvisioningResult> {
    const startTime = Date.now();

    try {
      logger.info('Provisioning user', { userName: scimUser.userName, source });

      const localUserData = this.attributeMapper.mapAttributes(scimUser);
      const existingUser = this.findUserByExternalId(scimUser.id || scimUser.externalId || '')
        || this.findUserByEmail(localUserData.email || '');

      let result: ProvisioningResult;

      if (existingUser) {
        const conflicts = this.attributeMapper.detectConflicts(existingUser, localUserData);

        if (conflicts.length > 0) {
          const resolution = await this.syncEngine.handleConflict(
            existingUser.id, localUserData, existingUser, conflicts
          );
          if (resolution === 'pending') {
            return {
              success: false,
              userId: existingUser.id,
              action: 'update',
              source,
              error: 'Update pending conflict resolution',
              timestamp: new Date(),
            };
          }
        }

        result = await this.userLifecycle.updateUser(existingUser.id, localUserData, source);
      } else {
        result = await this.userLifecycle.createUser(
          localUserData,
          source,
          scimUser.id || scimUser.externalId,
          this.determineRole.bind(this),
          this.determinePermissions.bind(this)
        );
      }

      if (scimUser.groups && scimUser.groups.length > 0 && result.userId) {
        await this.groupManager.syncUserGroups(result.userId, scimUser.groups.map(g => g.value));
      }

      this.createAuditEntry(result.action, result.userId!, source, {
        scimUser,
        localUser: localUserData,
        duration: Date.now() - startTime,
      });

      this.emit('userProvisioned', result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to provision user', { userName: scimUser.userName, error: errorMessage });

      const result: ProvisioningResult = {
        success: false,
        action: 'create',
        source,
        error: errorMessage,
        timestamp: new Date(),
      };

      this.emit('provisioningError', { user: scimUser, error: errorMessage });
      return result;
    }
  }

  async deprovisionUser(
    userId: string,
    reason: string = 'User deprovisioned',
    source: string = 'system',
    hardDelete: boolean = false
  ): Promise<ProvisioningResult> {
    return this.userLifecycle.deprovisionUser(userId, reason, source, hardDelete);
  }

  async syncGroups(externalGroups: SCIMGroup[], source: string = 'scim'): Promise<SyncResult> {
    return this.groupManager.syncGroups(externalGroups, source);
  }

  mapAttributes(scimUser: SCIMUser): Partial<LocalUser> {
    return this.attributeMapper.mapAttributes(scimUser);
  }

  async runScheduledSync(): Promise<SyncResult> {
    return this.syncEngine.runScheduledSync();
  }

  startScheduledSync(): void {
    this.syncEngine.startScheduledSync();
  }

  stopScheduledSync(): void {
    this.syncEngine.stopScheduledSync();
  }

  resolveConflict(
    conflictId: string,
    resolution: 'source' | 'target' | 'merged',
    resolvedBy: string,
    mergedData?: Partial<LocalUser>
  ): boolean {
    return this.syncEngine.resolveConflict(conflictId, resolution, resolvedBy, mergedData);
  }

  async exportUsers(
    format: 'json' | 'csv' | 'scim' = 'json',
    filter?: (user: LocalUser) => boolean
  ): Promise<BulkOperation> {
    return this.syncEngine.exportUsers(format, filter);
  }

  async importUsers(
    data: string | SCIMUser[] | LocalUser[],
    format: 'json' | 'csv' | 'scim' = 'json',
    source: string = 'bulk_import'
  ): Promise<BulkOperation> {
    return this.syncEngine.importUsers(data, format, source, this.provisionUser.bind(this));
  }

  private createAuditEntry(
    action: string,
    userId: string,
    source: string,
    details: Record<string, any>,
    previousState?: Record<string, any>,
    newState?: Record<string, any>
  ): void {
    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      action,
      userId,
      performedBy: source,
      source,
      details,
      previousState,
      newState,
    };

    this.auditLog.push(entry);
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }

    this.emit('auditEntry', entry);
  }

  getAuditLog(
    filter?: {
      userId?: string;
      action?: string;
      source?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
    offset: number = 0
  ): AuditEntry[] {
    let entries = [...this.auditLog];

    if (filter) {
      if (filter.userId) entries = entries.filter(e => e.userId === filter.userId);
      if (filter.action) entries = entries.filter(e => e.action === filter.action);
      if (filter.source) entries = entries.filter(e => e.source === filter.source);
      if (filter.startDate) entries = entries.filter(e => e.timestamp >= filter.startDate!);
      if (filter.endDate) entries = entries.filter(e => e.timestamp <= filter.endDate!);
    }

    return entries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private findUserByExternalId(externalId: string): LocalUser | undefined {
    if (!externalId) return undefined;
    return Array.from(this.users.values()).find(u => u.externalId === externalId);
  }

  private findUserByEmail(email: string): LocalUser | undefined {
    if (!email) return undefined;
    return Array.from(this.users.values()).find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );
  }

  private determineRole(userData: Partial<LocalUser>): string {
    for (const group of userData.groups || []) {
      const mappedRole = this.config.groupMappings[group];
      if (mappedRole) return mappedRole;
    }
    if (userData.title?.toLowerCase().includes('admin')) return 'admin';
    if (userData.title?.toLowerCase().includes('manager')) return 'manager';
    return 'user';
  }

  private determinePermissions(userData: Partial<LocalUser>): string[] {
    const permissions: string[] = ['read:workflows'];
    const role = this.determineRole(userData);

    switch (role) {
      case 'admin':
        permissions.push('write:workflows', 'delete:workflows', 'admin:users', 'admin:system');
        break;
      case 'manager':
        permissions.push('write:workflows', 'delete:workflows', 'manage:team');
        break;
      default:
        permissions.push('write:workflows');
    }

    return permissions;
  }

  getUsers(): LocalUser[] { return Array.from(this.users.values()); }
  getUser(userId: string): LocalUser | undefined { return this.users.get(userId); }
  getGroups(): LocalGroup[] { return this.groupManager.getGroups(); }
  getGroup(groupId: string): LocalGroup | undefined { return this.groupManager.getGroup(groupId); }
  getPendingConflicts(): ConflictRecord[] { return this.syncEngine.getPendingConflicts(); }
  getBulkOperation(id: string): BulkOperation | undefined { return this.syncEngine.getBulkOperation(id); }
  getLastSyncResult(): SyncResult | null { return this.syncEngine.getLastSyncResult(); }
  isSyncInProgress(): boolean { return this.syncEngine.isSyncInProgress(); }
  getConfig(): ProvisioningConfig { return { ...this.config }; }

  updateConfig(updates: Partial<ProvisioningConfig>): void {
    this.config = { ...this.config, ...updates };
    this.scimHandler.updateConfig(this.config.scimEndpoint, this.config.scimToken);
    this.attributeMapper.updateMappings(this.config.attributeMappings);
    this.groupManager.updateGroupMappings(this.config.groupMappings);
    this.userLifecycle.updateConfig(this.config);
    this.syncEngine.updateConfig(this.config);
    logger.info('Provisioning configuration updated', { updates: Object.keys(updates) });
    this.emit('configUpdated', this.config);
  }

  shutdown(): void {
    this.syncEngine.stopScheduledSync();
    this.removeAllListeners();
    logger.info('UserProvisioningEngine shutdown');
  }
}

export const userProvisioningEngine = UserProvisioningEngine.getInstance();
