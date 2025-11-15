/**
 * Data Retention & Backup System
 * Automated backup, archiving, and data lifecycle management
 */

export interface RetentionPolicy {
  id: string;
  name: string;
  enabled: boolean;
  resourceType: 'workflow' | 'execution' | 'log' | 'audit' | 'all';
  retentionPeriod: number; // Days
  actions: RetentionAction[];
  conditions?: {
    status?: string[];
    tags?: string[];
    priority?: string[];
  };
  schedule: string; // Cron expression
  createdAt: string;
  updatedAt: string;
}

export type RetentionAction =
  | 'archive'
  | 'delete'
  | 'compress'
  | 'moveToStorage'
  | 'notify';

export interface BackupConfig {
  id: string;
  name: string;
  enabled: boolean;
  type: BackupType;
  schedule: string; // Cron expression
  retention: number; // Number of backups to keep
  compression?: boolean;
  encryption?: boolean;
  destinations: BackupDestination[];
  includeResources: string[]; // Resource types to include
  excludeResources?: string[]; // Resource types to exclude
  lastBackup?: string;
  nextBackup?: string;
  createdAt: string;
  updatedAt: string;
}

export type BackupType = 'full' | 'incremental' | 'differential';

export interface BackupDestination {
  type: 'local' | 's3' | 'gcs' | 'azure' | 'sftp';
  config: any; // Destination-specific configuration
}

export interface Backup {
  id: string;
  configId: string;
  type: BackupType;
  size: number; // Bytes
  compressed: boolean;
  encrypted: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  duration?: number;
  resources: {
    workflows: number;
    executions: number;
    logs: number;
    total: number;
  };
  destination: string;
  error?: string;
  checksum?: string;
}

export interface RestoreOptions {
  backupId: string;
  resources?: string[]; // Specific resources to restore
  overwrite?: boolean;
  dryRun?: boolean;
}

export interface RestoreResult {
  success: boolean;
  restored: {
    workflows: number;
    executions: number;
    logs: number;
    total: number;
  };
  skipped: number;
  errors: Array<{
    resource: string;
    error: string;
  }>;
}

class DataRetentionBackupManager {
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();
  private backupConfigs: Map<string, BackupConfig> = new Map();
  private backups: Map<string, Backup> = new Map();
  private checkInterval?: NodeJS.Timeout;

  constructor() {
    this.loadFromStorage();
    this.startScheduler();
  }

  /**
   * Create retention policy
   */
  createRetentionPolicy(
    name: string,
    resourceType: RetentionPolicy['resourceType'],
    retentionPeriod: number,
    actions: RetentionAction[],
    schedule: string,
    options?: {
      conditions?: RetentionPolicy['conditions'];
    }
  ): RetentionPolicy {
    const policy: RetentionPolicy = {
      id: this.generateId('policy'),
      name,
      enabled: true,
      resourceType,
      retentionPeriod,
      actions,
      conditions: options?.conditions,
      schedule,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.retentionPolicies.set(policy.id, policy);
    this.saveToStorage();

    return policy;
  }

  /**
   * Create backup configuration
   */
  createBackupConfig(
    name: string,
    type: BackupType,
    schedule: string,
    destinations: BackupDestination[],
    includeResources: string[],
    options?: {
      retention?: number;
      compression?: boolean;
      encryption?: boolean;
      excludeResources?: string[];
    }
  ): BackupConfig {
    const config: BackupConfig = {
      id: this.generateId('backup'),
      name,
      enabled: true,
      type,
      schedule,
      retention: options?.retention || 7,
      compression: options?.compression ?? true,
      encryption: options?.encryption ?? false,
      destinations,
      includeResources,
      excludeResources: options?.excludeResources,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.backupConfigs.set(config.id, config);
    this.saveToStorage();

    return config;
  }

  /**
   * Execute backup
   */
  async executeBackup(configId: string): Promise<Backup> {
    const config = this.backupConfigs.get(configId);

    if (!config) {
      throw new Error('Backup configuration not found');
    }

    const backup: Backup = {
      id: this.generateId('bkp'),
      configId,
      type: config.type,
      size: 0,
      compressed: config.compression || false,
      encrypted: config.encryption || false,
      status: 'pending',
      startTime: new Date().toISOString(),
      resources: {
        workflows: 0,
        executions: 0,
        logs: 0,
        total: 0
      },
      destination: config.destinations[0]?.type || 'local'
    };

    this.backups.set(backup.id, backup);

    try {
      backup.status = 'in_progress';

      // Collect data to backup
      const data = await this.collectBackupData(config);

      // Count resources
      backup.resources.workflows = data.workflows?.length || 0;
      backup.resources.executions = data.executions?.length || 0;
      backup.resources.logs = data.logs?.length || 0;
      backup.resources.total =
        backup.resources.workflows +
        backup.resources.executions +
        backup.resources.logs;

      // Compress if enabled
      let backupData = JSON.stringify(data);
      if (config.compression) {
        backupData = this.compress(backupData);
      }

      // Encrypt if enabled
      if (config.encryption) {
        backupData = this.encrypt(backupData);
      }

      backup.size = backupData.length;
      backup.checksum = this.calculateChecksum(backupData);

      // Save to destinations
      for (const destination of config.destinations) {
        await this.saveToDestination(destination, backup.id, backupData);
      }

      backup.status = 'completed';
      backup.endTime = new Date().toISOString();
      backup.duration = new Date(backup.endTime).getTime() - new Date(backup.startTime).getTime();

      // Update config
      config.lastBackup = backup.endTime;
      this.backupConfigs.set(configId, config);

      // Clean up old backups
      await this.cleanupOldBackups(configId, config.retention);
    } catch (error: any) {
      backup.status = 'failed';
      backup.error = error.message;
      backup.endTime = new Date().toISOString();
    }

    this.backups.set(backup.id, backup);
    this.saveToStorage();

    return backup;
  }

  /**
   * Restore from backup
   */
  async restore(options: RestoreOptions): Promise<RestoreResult> {
    const backup = this.backups.get(options.backupId);

    if (!backup) {
      throw new Error('Backup not found');
    }

    if (backup.status !== 'completed') {
      throw new Error('Cannot restore from incomplete backup');
    }

    const result: RestoreResult = {
      success: false,
      restored: {
        workflows: 0,
        executions: 0,
        logs: 0,
        total: 0
      },
      skipped: 0,
      errors: []
    };

    try {
      // Load backup data
      let backupData = await this.loadFromDestination(backup);

      // Decrypt if needed
      if (backup.encrypted) {
        backupData = this.decrypt(backupData);
      }

      // Decompress if needed
      if (backup.compressed) {
        backupData = this.decompress(backupData);
      }

      const data = JSON.parse(backupData);

      // Restore resources
      if (data.workflows && (!options.resources || options.resources.includes('workflows'))) {
        for (const workflow of data.workflows) {
          try {
            if (!options.dryRun) {
              await this.restoreWorkflow(workflow, options.overwrite);
            }
            result.restored.workflows++;
          } catch (error: any) {
            result.errors.push({ resource: `workflow:${workflow.id}`, error: error.message });
          }
        }
      }

      if (data.executions && (!options.resources || options.resources.includes('executions'))) {
        for (const execution of data.executions) {
          try {
            if (!options.dryRun) {
              await this.restoreExecution(execution, options.overwrite);
            }
            result.restored.executions++;
          } catch (error: any) {
            result.errors.push({ resource: `execution:${execution.id}`, error: error.message });
          }
        }
      }

      if (data.logs && (!options.resources || options.resources.includes('logs'))) {
        for (const log of data.logs) {
          try {
            if (!options.dryRun) {
              await this.restoreLog(log);
            }
            result.restored.logs++;
          } catch (error: any) {
            result.errors.push({ resource: `log:${log.id}`, error: error.message });
          }
        }
      }

      result.restored.total =
        result.restored.workflows +
        result.restored.executions +
        result.restored.logs;

      result.success = result.errors.length === 0;
    } catch (error: any) {
      result.errors.push({ resource: 'backup', error: error.message });
    }

    return result;
  }

  /**
   * Apply retention policies
   */
  async applyRetentionPolicies(): Promise<void> {
    for (const policy of this.retentionPolicies.values()) {
      if (!policy.enabled) continue;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriod);

      // Find resources older than retention period
      const resources = await this.findOldResources(policy, cutoffDate);

      // Apply actions
      for (const action of policy.actions) {
        switch (action) {
          case 'archive':
            await this.archiveResources(resources);
            break;

          case 'delete':
            await this.deleteResources(resources);
            break;

          case 'compress':
            await this.compressResources(resources);
            break;

          case 'moveToStorage':
            await this.moveToStorage(resources);
            break;

          case 'notify':
            await this.notifyRetention(policy, resources);
            break;
        }
      }
    }
  }

  /**
   * Collect backup data
   */
  private async collectBackupData(config: BackupConfig): Promise<any> {
    const data: any = {};

    if (config.includeResources.includes('workflows')) {
      data.workflows = await this.getWorkflows();
    }

    if (config.includeResources.includes('executions')) {
      data.executions = await this.getExecutions();
    }

    if (config.includeResources.includes('logs')) {
      data.logs = await this.getLogs();
    }

    return data;
  }

  /**
   * Find old resources
   */
  private async findOldResources(policy: RetentionPolicy, cutoffDate: Date): Promise<any[]> {
    // Mock implementation - in production, query database
    return [];
  }

  /**
   * Get workflows (mock)
   */
  private async getWorkflows(): Promise<any[]> {
    // Mock implementation
    return [];
  }

  /**
   * Get executions (mock)
   */
  private async getExecutions(): Promise<any[]> {
    // Mock implementation
    return [];
  }

  /**
   * Get logs (mock)
   */
  private async getLogs(): Promise<any[]> {
    // Mock implementation
    return [];
  }

  /**
   * Restore workflow
   */
  private async restoreWorkflow(workflow: any, overwrite?: boolean): Promise<void> {
    // Mock implementation
    console.log('Restoring workflow:', workflow.id);
  }

  /**
   * Restore execution
   */
  private async restoreExecution(execution: any, overwrite?: boolean): Promise<void> {
    // Mock implementation
    console.log('Restoring execution:', execution.id);
  }

  /**
   * Restore log
   */
  private async restoreLog(log: any): Promise<void> {
    // Mock implementation
    console.log('Restoring log:', log.id);
  }

  /**
   * Archive resources
   */
  private async archiveResources(resources: any[]): Promise<void> {
    console.log('Archiving', resources.length, 'resources');
  }

  /**
   * Delete resources
   */
  private async deleteResources(resources: any[]): Promise<void> {
    console.log('Deleting', resources.length, 'resources');
  }

  /**
   * Compress resources
   */
  private async compressResources(resources: any[]): Promise<void> {
    console.log('Compressing', resources.length, 'resources');
  }

  /**
   * Move to storage
   */
  private async moveToStorage(resources: any[]): Promise<void> {
    console.log('Moving', resources.length, 'resources to storage');
  }

  /**
   * Notify retention
   */
  private async notifyRetention(policy: RetentionPolicy, resources: any[]): Promise<void> {
    console.log('Notifying retention:', policy.name, resources.length, 'resources');
  }

  /**
   * Compress data
   */
  private compress(data: string): string {
    // Simple compression (use library in production)
    return data;
  }

  /**
   * Decompress data
   */
  private decompress(data: string): string {
    // Simple decompression
    return data;
  }

  /**
   * Encrypt data
   */
  private encrypt(data: string): string {
    // Simple encryption (use proper encryption in production)
    return btoa(data);
  }

  /**
   * Decrypt data
   */
  private decrypt(data: string): string {
    // Simple decryption
    return atob(data);
  }

  /**
   * Calculate checksum
   */
  private calculateChecksum(data: string): string {
    // Simple checksum (use SHA-256 in production)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Save to destination
   */
  private async saveToDestination(
    destination: BackupDestination,
    backupId: string,
    data: string
  ): Promise<void> {
    // Mock save - in production, implement actual storage
    console.log(`Saving backup ${backupId} to ${destination.type}`);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`backup_${backupId}`, data);
    }
  }

  /**
   * Load from destination
   */
  private async loadFromDestination(backup: Backup): Promise<string> {
    // Mock load
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(`backup_${backup.id}`);
      if (data) return data;
    }

    throw new Error('Backup not found in storage');
  }

  /**
   * Clean up old backups
   */
  private async cleanupOldBackups(configId: string, retention: number): Promise<void> {
    const backups = Array.from(this.backups.values())
      .filter(b => b.configId === configId && b.status === 'completed')
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    // Keep only retention number of backups
    for (let i = retention; i < backups.length; i++) {
      this.backups.delete(backups[i].id);

      // Delete from storage
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`backup_${backups[i].id}`);
      }
    }
  }

  /**
   * Start scheduler
   */
  private startScheduler(): void {
    this.checkInterval = setInterval(() => {
      // Check backup schedules
      for (const config of this.backupConfigs.values()) {
        if (config.enabled && this.shouldRunBackup(config)) {
          this.executeBackup(config.id).catch(console.error);
        }
      }

      // Apply retention policies
      this.applyRetentionPolicies().catch(console.error);
    }, 60000); // Check every minute
  }

  /**
   * Should run backup
   */
  private shouldRunBackup(config: BackupConfig): boolean {
    // Simple check - in production, use cron parser
    if (!config.lastBackup) return true;

    const lastBackup = new Date(config.lastBackup);
    const now = new Date();
    const hoursSinceLastBackup = (now.getTime() - lastBackup.getTime()) / 3600000;

    return hoursSinceLastBackup >= 24; // Run once per day
  }

  /**
   * Get backups
   */
  getBackups(configId?: string): Backup[] {
    let backups = Array.from(this.backups.values());

    if (configId) {
      backups = backups.filter(b => b.configId === configId);
    }

    return backups.sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  /**
   * Get retention policies
   */
  getRetentionPolicies(): RetentionPolicy[] {
    return Array.from(this.retentionPolicies.values());
  }

  /**
   * Get backup configs
   */
  getBackupConfigs(): BackupConfig[] {
    return Array.from(this.backupConfigs.values());
  }

  /**
   * Generate ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save to storage
   */
  private saveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('retention-policies', JSON.stringify(Array.from(this.retentionPolicies.entries())));
        localStorage.setItem('backup-configs', JSON.stringify(Array.from(this.backupConfigs.entries())));
        localStorage.setItem('backups', JSON.stringify(Array.from(this.backups.entries())));
      } catch (error) {
        console.error('Failed to save retention/backup data:', error);
      }
    }
  }

  /**
   * Load from storage
   */
  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const policies = localStorage.getItem('retention-policies');
        if (policies) this.retentionPolicies = new Map(JSON.parse(policies));

        const configs = localStorage.getItem('backup-configs');
        if (configs) this.backupConfigs = new Map(JSON.parse(configs));

        const backups = localStorage.getItem('backups');
        if (backups) this.backups = new Map(JSON.parse(backups));
      } catch (error) {
        console.error('Failed to load retention/backup data:', error);
      }
    }
  }

  /**
   * Destroy
   */
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// Singleton instance
export const dataRetentionBackupManager = new DataRetentionBackupManager();
