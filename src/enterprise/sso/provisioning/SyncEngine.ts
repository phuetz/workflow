/**
 * Sync Engine
 * Handles scheduled synchronization, conflict resolution, and bulk operations
 */

import { EventEmitter } from 'events';
import { logger } from '../../../services/SimpleLogger';
import {
  LocalUser,
  SyncResult,
  ConflictRecord,
  BulkOperation,
  ProvisioningConfig,
  SCIMUser,
  ProvisioningResult,
} from './types';
import { SCIMHandler } from './SCIMHandler';

export class SyncEngine extends EventEmitter {
  private config: ProvisioningConfig;
  private users: Map<string, LocalUser>;
  private conflicts: Map<string, ConflictRecord>;
  private bulkOperations: Map<string, BulkOperation>;
  private scimHandler: SCIMHandler;

  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private lastSyncResult: SyncResult | null = null;

  constructor(
    config: ProvisioningConfig,
    users: Map<string, LocalUser>,
    conflicts: Map<string, ConflictRecord>,
    bulkOperations: Map<string, BulkOperation>,
    scimHandler: SCIMHandler
  ) {
    super();
    this.config = config;
    this.users = users;
    this.conflicts = conflicts;
    this.bulkOperations = bulkOperations;
    this.scimHandler = scimHandler;
  }

  /**
   * Update configuration
   */
  updateConfig(config: ProvisioningConfig): void {
    this.config = config;
  }

  /**
   * Run scheduled synchronization
   */
  async runScheduledSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      logger.warn('Sync already in progress, skipping');
      return this.lastSyncResult!;
    }

    this.isSyncing = true;
    const startTime = new Date();

    const result: SyncResult = {
      startTime,
      endTime: new Date(),
      duration: 0,
      totalProcessed: 0,
      created: 0,
      updated: 0,
      disabled: 0,
      deleted: 0,
      errors: 0,
      conflicts: 0,
      details: [],
    };

    try {
      logger.info('Starting scheduled sync');
      this.emit('syncStarted', { startTime });

      // Fetch users from each configured source
      if (this.config.scimEndpoint) {
        const scimResult = await this.scimHandler.syncFromSCIM();
        this.mergeResults(result, scimResult);
      }

      // Sync from HR integrations
      for (const hrConfig of this.config.hrIntegrations) {
        if (hrConfig.enabled) {
          const hrResult = await this.scimHandler.syncFromHR(hrConfig);
          this.mergeResults(result, hrResult);
        }
      }

      // Handle users that were removed from source
      if (this.config.autoDeprovision) {
        await this.handleRemovedUsers(result);
      }

      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();
      this.lastSyncResult = result;

      logger.info('Scheduled sync completed', {
        created: result.created,
        updated: result.updated,
        disabled: result.disabled,
        deleted: result.deleted,
        errors: result.errors,
        duration: result.duration,
      });

      this.emit('syncCompleted', result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Scheduled sync failed', { error: errorMessage });

      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();
      result.errors++;

      this.emit('syncError', { error: errorMessage, result });
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Handle users removed from source
   */
  private async handleRemovedUsers(_result: SyncResult): Promise<void> {
    logger.debug('Checking for removed users');
  }

  /**
   * Start scheduled sync timer
   */
  startScheduledSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      this.runScheduledSync();
    }, this.config.syncInterval);

    logger.info('Scheduled sync started', { intervalMs: this.config.syncInterval });
  }

  /**
   * Stop scheduled sync timer
   */
  stopScheduledSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      logger.info('Scheduled sync stopped');
    }
  }

  /**
   * Handle attribute conflicts between source and target
   */
  async handleConflict(
    userId: string,
    sourceData: Partial<LocalUser>,
    targetData: Partial<LocalUser>,
    conflictFields: string[]
  ): Promise<'source' | 'target' | 'merged' | 'pending'> {
    const conflictId = this.generateId();

    const conflict: ConflictRecord = {
      id: conflictId,
      userId,
      sourceData,
      targetData,
      conflictFields,
      createdAt: new Date(),
    };

    logger.info('Conflict detected', { userId, fields: conflictFields });

    switch (this.config.conflictResolution) {
      case 'source_wins':
        conflict.resolution = 'source';
        conflict.resolvedAt = new Date();
        this.conflicts.set(conflictId, conflict);
        return 'source';

      case 'target_wins':
        conflict.resolution = 'target';
        conflict.resolvedAt = new Date();
        this.conflicts.set(conflictId, conflict);
        return 'target';

      case 'newest_wins':
        const sourceTime = (sourceData as any).updatedAt?.getTime() || 0;
        const targetTime = (targetData as any).updatedAt?.getTime() || 0;
        conflict.resolution = sourceTime >= targetTime ? 'source' : 'target';
        conflict.resolvedAt = new Date();
        this.conflicts.set(conflictId, conflict);
        return conflict.resolution as 'source' | 'target';

      case 'manual':
      default:
        conflict.resolution = 'pending';
        this.conflicts.set(conflictId, conflict);
        this.emit('conflictDetected', conflict);
        return 'pending';
    }
  }

  /**
   * Resolve a pending conflict
   */
  resolveConflict(
    conflictId: string,
    resolution: 'source' | 'target' | 'merged',
    resolvedBy: string,
    mergedData?: Partial<LocalUser>
  ): boolean {
    const conflict = this.conflicts.get(conflictId);

    if (!conflict) {
      logger.warn('Conflict not found', { conflictId });
      return false;
    }

    conflict.resolution = resolution;
    conflict.resolvedAt = new Date();
    conflict.resolvedBy = resolvedBy;
    this.conflicts.set(conflictId, conflict);

    // Apply resolution
    const user = this.users.get(conflict.userId);
    if (user) {
      let updates: Partial<LocalUser>;

      switch (resolution) {
        case 'source':
          updates = conflict.sourceData;
          break;
        case 'target':
          updates = conflict.targetData;
          break;
        case 'merged':
          updates = mergedData || { ...conflict.targetData, ...conflict.sourceData };
          break;
      }

      const updatedUser: LocalUser = { ...user, ...updates, updatedAt: new Date() };
      this.users.set(conflict.userId, updatedUser);

      logger.info('Conflict resolved', { conflictId, resolution, userId: conflict.userId });
      this.emit('conflictResolved', { conflict, resolution });
    }

    return true;
  }

  /**
   * Export users to various formats
   */
  async exportUsers(
    format: 'json' | 'csv' | 'scim' = 'json',
    filter?: (user: LocalUser) => boolean
  ): Promise<BulkOperation> {
    const operationId = this.generateId();

    const operation: BulkOperation = {
      id: operationId,
      type: 'export',
      status: 'running',
      totalRecords: 0,
      processedRecords: 0,
      successRecords: 0,
      failedRecords: 0,
      startedAt: new Date(),
      errors: [],
    };

    this.bulkOperations.set(operationId, operation);

    try {
      const usersToExport = filter
        ? Array.from(this.users.values()).filter(filter)
        : Array.from(this.users.values());

      operation.totalRecords = usersToExport.length;

      let exportData: string;

      switch (format) {
        case 'csv':
          exportData = this.usersToCSV(usersToExport);
          break;
        case 'scim':
          exportData = JSON.stringify(this.scimHandler.usersToSCIM(usersToExport), null, 2);
          break;
        case 'json':
        default:
          exportData = JSON.stringify(usersToExport, null, 2);
      }

      operation.processedRecords = usersToExport.length;
      operation.successRecords = usersToExport.length;
      operation.status = 'completed';
      operation.completedAt = new Date();
      operation.resultUrl = `data:application/${format};base64,${Buffer.from(exportData).toString('base64')}`;

      logger.info('Export completed', { operationId, format, records: usersToExport.length });
      this.emit('exportCompleted', operation);

    } catch (error) {
      operation.status = 'failed';
      operation.completedAt = new Date();
      operation.errors.push({
        record: 0,
        error: error instanceof Error ? error.message : String(error)
      });

      logger.error('Export failed', { operationId, error: error instanceof Error ? error.message : String(error) });
    }

    this.bulkOperations.set(operationId, operation);
    return operation;
  }

  /**
   * Import users from various formats
   */
  async importUsers(
    data: string | SCIMUser[] | LocalUser[],
    format: 'json' | 'csv' | 'scim' = 'json',
    source: string = 'bulk_import',
    provisionUser: (scimUser: SCIMUser, source: string) => Promise<ProvisioningResult>
  ): Promise<BulkOperation> {
    const operationId = this.generateId();

    const operation: BulkOperation = {
      id: operationId,
      type: 'import',
      status: 'running',
      totalRecords: 0,
      processedRecords: 0,
      successRecords: 0,
      failedRecords: 0,
      startedAt: new Date(),
      errors: [],
    };

    this.bulkOperations.set(operationId, operation);

    try {
      let usersToImport: any[];

      if (typeof data === 'string') {
        switch (format) {
          case 'csv':
            usersToImport = this.csvToUsers(data);
            break;
          case 'scim':
          case 'json':
          default:
            usersToImport = JSON.parse(data);
        }
      } else {
        usersToImport = data;
      }

      operation.totalRecords = usersToImport.length;

      // Process in batches
      const batches = this.createBatches(usersToImport, this.config.batchSize);

      for (const batch of batches) {
        await Promise.all(
          batch.map(async (userData, index) => {
            try {
              const globalIndex = operation.processedRecords + index;

              let result: ProvisioningResult;
              if (format === 'scim') {
                result = await provisionUser(userData as SCIMUser, source);
              } else {
                result = await provisionUser(
                  this.scimHandler.localUserToSCIM(userData as LocalUser),
                  source
                );
              }

              if (result.success) {
                operation.successRecords++;
              } else {
                operation.failedRecords++;
                operation.errors.push({
                  record: globalIndex,
                  error: result.error || 'Unknown error'
                });
              }
            } catch (error) {
              operation.failedRecords++;
              operation.errors.push({
                record: operation.processedRecords,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          })
        );

        operation.processedRecords += batch.length;
      }

      operation.status = 'completed';
      operation.completedAt = new Date();

      logger.info('Import completed', {
        operationId,
        total: operation.totalRecords,
        success: operation.successRecords,
        failed: operation.failedRecords,
      });

      this.emit('importCompleted', operation);

    } catch (error) {
      operation.status = 'failed';
      operation.completedAt = new Date();
      operation.errors.push({
        record: 0,
        error: error instanceof Error ? error.message : String(error)
      });

      logger.error('Import failed', { operationId, error: error instanceof Error ? error.message : String(error) });
    }

    this.bulkOperations.set(operationId, operation);
    return operation;
  }

  /**
   * Convert users to CSV format
   */
  private usersToCSV(users: LocalUser[]): string {
    const headers = [
      'id', 'externalId', 'username', 'email', 'firstName', 'lastName',
      'displayName', 'title', 'department', 'organization', 'role',
      'status', 'createdAt', 'updatedAt'
    ];

    const rows = users.map(user =>
      headers.map(h => {
        const value = (user as any)[h];
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
        return value ?? '';
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Parse CSV to users
   */
  private csvToUsers(csv: string): Partial<LocalUser>[] {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      const user: any = {};

      headers.forEach((header, index) => {
        if (values[index]) {
          user[header] = values[index];
        }
      });

      return user;
    });
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  /**
   * Merge sync results
   */
  mergeResults(target: SyncResult, source: SyncResult): void {
    target.totalProcessed += source.totalProcessed;
    target.created += source.created;
    target.updated += source.updated;
    target.disabled += source.disabled;
    target.deleted += source.deleted;
    target.errors += source.errors;
    target.conflicts += source.conflicts;
    target.details.push(...source.details);
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get pending conflicts
   */
  getPendingConflicts(): ConflictRecord[] {
    return Array.from(this.conflicts.values()).filter(c => c.resolution === 'pending');
  }

  /**
   * Get bulk operation status
   */
  getBulkOperation(operationId: string): BulkOperation | undefined {
    return this.bulkOperations.get(operationId);
  }

  /**
   * Get last sync result
   */
  getLastSyncResult(): SyncResult | null {
    return this.lastSyncResult;
  }

  /**
   * Check if sync is in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}
