/**
 * Backup and Disaster Recovery Service
 * Comprehensive backup, restore, and disaster recovery functionality
 */

import { BaseService } from './BaseService';
import { 
  BackupConfig, 
  Backup, 
  RestoreConfig, 
  RestoreResult,
  DisasterRecoveryPlan,
  IBackupService,
  BackupOptions,
  RestorePreview,
  ValidationResult,
  DRTestResult,
  DRActivationResult,
  BackupFilters,
  RestoreConflict,
  RestoreRequirement,
  DRMetrics,
  DRIssue
} from '../types/backup';
import { workflowService } from './WorkflowService';
import { credentialsService } from './CredentialsService';

export class BackupService extends BaseService implements IBackupService {
  private static instance: BackupService;
  
  private backupConfigs: Map<string, BackupConfig> = new Map();
  private backups: Map<string, Backup> = new Map();
  private drPlans: Map<string, DisasterRecoveryPlan> = new Map();
  private scheduledBackups: Map<string, NodeJS.Timeout> = new Map();
  
  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  constructor() {
    super('BackupService');
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    this.log('info', 'Initializing Backup Service');
    await this.createDefaultConfigs();
    await this.startScheduledBackups();
  }

  private async createDefaultConfigs(): Promise<void> {
    // Daily backup configuration
    const dailyConfig: BackupConfig = {
      id: 'daily-backup',
      name: 'Daily Backup',
      description: 'Automated daily backup of all workflows and configurations',
      enabled: true,
      schedule: {
        type: 'scheduled',
        frequency: 'daily',
        time: '02:00',
        timezone: 'UTC'
      },
      retention: {
        strategy: 'simple',
        policies: [
          { type: 'daily', count: 7 },
          { type: 'weekly', count: 4 },
          { type: 'monthly', count: 12 }
        ],
        autoDelete: true,
        archiveOldBackups: true,
        archiveAfterDays: 90
      },
      destinations: [
        {
          id: 'local-storage',
          name: 'Local Storage',
          type: 'local',
          enabled: true,
          config: {
            path: './backups'
          }
        }
      ],
      encryption: {
        enabled: true,
        algorithm: 'AES-256-GCM',
        keyManagement: { type: 'local' },
        keyRotation: false
      },
      compression: {
        enabled: true,
        algorithm: 'gzip',
        level: 6
      },
      filters: {
        includeWorkflows: ['*'],
        excludeWorkflows: [],
        includeCredentials: true,
        includeExecutionHistory: true,
        includeNodeData: true,
        includeLogs: false,
        includeMetrics: false
      },
      notifications: {
        onSuccess: [],
        onFailure: [
          {
            type: 'email',
            recipients: ['admin@workflow.com'],
            includeDetails: true
          }
        ],
        onWarning: [],
        summary: {
          enabled: true,
          frequency: 'weekly',
          recipients: ['admin@workflow.com']
        }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };

    // Full backup configuration
    const fullConfig: BackupConfig = {
      id: 'full-backup',
      name: 'Full System Backup',
      description: 'Complete system backup including all data and configurations',
      enabled: true,
      schedule: {
        type: 'scheduled',
        frequency: 'weekly',
        daysOfWeek: [0], // Sunday
        time: '01:00',
        timezone: 'UTC'
      },
      retention: {
        strategy: 'grandfather-father-son',
        policies: [
          { type: 'daily', count: 7 },
          { type: 'weekly', count: 4 },
          { type: 'monthly', count: 12 },
          { type: 'yearly', count: 3 }
        ],
        autoDelete: true,
        archiveOldBackups: true,
        archiveAfterDays: 365
      },
      destinations: [
        {
          id: 'cloud-storage',
          name: 'Cloud Storage',
          type: 's3',
          enabled: true,
          config: {
            bucket: 'workflow-backups',
            region: 'us-east-1',
            accessKeyId: 'demo-key',
            secretAccessKey: 'demo-secret'
          }
        }
      ],
      encryption: {
        enabled: true,
        algorithm: 'AES-256-GCM',
        keyManagement: { type: 'kms', keyId: 'backup-key' },
        keyRotation: true,
        keyRotationFrequency: 90
      },
      compression: {
        enabled: true,
        algorithm: 'zstd',
        level: 3
      },
      filters: {
        includeWorkflows: ['*'],
        excludeWorkflows: [],
        includeCredentials: true,
        includeExecutionHistory: true,
        includeNodeData: true,
        includeLogs: true,
        includeMetrics: true
      },
      notifications: {
        onSuccess: [
          {
            type: 'email',
            recipients: ['admin@workflow.com'],
            includeDetails: false
          }
        ],
        onFailure: [
          {
            type: 'email',
            recipients: ['admin@workflow.com', 'ops@workflow.com'],
            includeDetails: true
          },
          {
            type: 'slack',
            recipients: ['#alerts'],
            includeDetails: true
          }
        ],
        onWarning: [
          {
            type: 'email',
            recipients: ['admin@workflow.com'],
            includeDetails: true
          }
        ],
        summary: {
          enabled: true,
          frequency: 'monthly',
          recipients: ['management@workflow.com']
        }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };

    this.backupConfigs.set(dailyConfig.id, dailyConfig);
    this.backupConfigs.set(fullConfig.id, fullConfig);

    // Create default disaster recovery plan
    const defaultDRPlan: DisasterRecoveryPlan = {
      id: 'default-dr-plan',
      name: 'Standard Disaster Recovery Plan',
      description: 'Standard disaster recovery procedures for workflow platform',
      rto: 60, // 1 hour
      rpo: 30, // 30 minutes
      strategies: [
        {
          name: 'Backup Restore Strategy',
          type: 'backup-restore',
          priority: 1,
          automated: false,
          steps: [
            {
              order: 1,
              name: 'Assess Damage',
              description: 'Evaluate the extent of system failure',
              automated: false,
              estimatedTime: 10,
              criticalPath: true
            },
            {
              order: 2,
              name: 'Provision New Infrastructure',
              description: 'Set up replacement infrastructure',
              automated: true,
              script: 'provision-infrastructure.sh',
              estimatedTime: 30,
              criticalPath: true
            },
            {
              order: 3,
              name: 'Restore Latest Backup',
              description: 'Restore from the most recent valid backup',
              automated: true,
              script: 'restore-backup.sh',
              estimatedTime: 45,
              criticalPath: true
            },
            {
              order: 4,
              name: 'Validate System',
              description: 'Verify system functionality',
              automated: true,
              validation: 'system-health-check.sh',
              estimatedTime: 15,
              criticalPath: true
            }
          ],
          requirements: [
            'Valid backup within RPO window',
            'Infrastructure provisioning access',
            'Backup restore scripts'
          ],
          estimatedTime: 100
        }
      ],
      testing: {
        schedule: {
          frequency: 'quarterly',
          nextTest: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          duration: 4,
          participants: ['ops-team', 'dev-team', 'management']
        },
        scenarios: [
          {
            name: 'Complete System Failure',
            description: 'Simulate complete infrastructure failure',
            type: 'partial',
            systems: ['database', 'application', 'storage'],
            steps: [
              'Simulate system failure',
              'Execute DR plan',
              'Validate recovery',
              'Document results'
            ],
            successCriteria: [
              'RTO < 60 minutes',
              'RPO < 30 minutes',
              'All workflows functional',
              'No data loss'
            ]
          }
        ],
        automation: {
          enabled: true,
          tools: ['ansible', 'terraform'],
          scripts: [
            {
              name: 'DR Test Automation',
              path: './scripts/dr-test.yml',
              parameters: {},
              timeout: 7200
            }
          ]
        },
        reporting: {
          template: 'dr-test-report.md',
          metrics: ['rto', 'rpo', 'success-rate', 'data-loss'],
          distribution: ['ops-team', 'management']
        }
      },
      documentation: {
        runbooks: [
          {
            name: 'Disaster Recovery Runbook',
            version: '1.0',
            path: './docs/dr-runbook.md',
            sections: ['assessment', 'communication', 'recovery', 'validation'],
            approvedBy: 'ops-manager',
            approvedDate: new Date()
          }
        ],
        diagrams: [
          {
            name: 'DR Architecture',
            type: 'architecture',
            path: './docs/dr-architecture.png',
            lastUpdated: new Date()
          }
        ],
        contacts: ['emergency-contacts.json'],
        lastReview: new Date(),
        nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      contacts: [
        {
          name: 'Operations Manager',
          role: 'Primary Contact',
          email: 'ops-manager@workflow.com',
          phone: '+1-555-0101',
          availability: '24/7'
        },
        {
          name: 'System Administrator',
          role: 'Technical Lead',
          email: 'sysadmin@workflow.com',
          phone: '+1-555-0102',
          availability: 'Business Hours'
        }
      ],
      active: true,
      lastUpdated: new Date()
    };

    this.drPlans.set(defaultDRPlan.id, defaultDRPlan);
  }

  private async startScheduledBackups(): Promise<void> {
    for (const config of this.backupConfigs.values()) {
      if (config.enabled && config.schedule.type === 'scheduled') {
        await this.scheduleBackup(config.id);
      }
    }
  }

  // Configuration Management
  async createBackupConfig(config: Partial<BackupConfig>): Promise<BackupConfig> {
    const backupConfig: BackupConfig = {
      id,
      name: config.name || `Backup Config ${id}`,
      description: config.description,
      enabled: config.enabled ?? true,
      schedule: config.schedule || {
        type: 'manual'
      },
      retention: config.retention || {
        strategy: 'simple',
        policies: [{ type: 'daily', count: 7 }],
        autoDelete: true,
        archiveOldBackups: false,
        archiveAfterDays: 30
      },
      destinations: config.destinations || [],
      encryption: config.encryption || {
        enabled: false,
        algorithm: 'AES-256-GCM',
        keyManagement: { type: 'local' },
        keyRotation: false
      },
      compression: config.compression || {
        enabled: true,
        algorithm: 'gzip',
        level: 6
      },
      filters: config.filters || {
        includeWorkflows: ['*'],
        excludeWorkflows: [],
        includeCredentials: true,
        includeExecutionHistory: false,
        includeNodeData: true,
        includeLogs: false,
        includeMetrics: false
      },
      notifications: config.notifications || {
        onSuccess: [],
        onFailure: [],
        onWarning: [],
        summary: { enabled: false, frequency: 'weekly', recipients: [] }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: config.createdBy || 'user'
    };

    this.backupConfigs.set(id, backupConfig);
    
    if (backupConfig.enabled && backupConfig.schedule.type === 'scheduled') {
      await this.scheduleBackup(id);
    }

    this.log('info', `Created backup configuration: ${backupConfig.name}`);
    return backupConfig;
  }

  async updateBackupConfig(id: string, updates: Partial<BackupConfig>): Promise<BackupConfig> {
    if (!config) {
      throw new Error(`Backup configuration not found: ${id}`);
    }

      ...config,
      ...updates,
      id,
      updatedAt: new Date()
    };

    this.backupConfigs.set(id, updatedConfig);

    // Update scheduling if needed
    if (this.scheduledBackups.has(id)) {
      clearTimeout(this.scheduledBackups.get(id)!);
      this.scheduledBackups.delete(id);
    }

    if (updatedConfig.enabled && updatedConfig.schedule.type === 'scheduled') {
      await this.scheduleBackup(id);
    }

    this.log('info', `Updated backup configuration: ${updatedConfig.name}`);
    return updatedConfig;
  }

  async deleteBackupConfig(id: string): Promise<void> {
    if (!this.backupConfigs.has(id)) {
      throw new Error(`Backup configuration not found: ${id}`);
    }

    // Cancel scheduled backup
    if (this.scheduledBackups.has(id)) {
      clearTimeout(this.scheduledBackups.get(id)!);
      this.scheduledBackups.delete(id);
    }

    this.backupConfigs.delete(id);
    this.log('info', `Deleted backup configuration: ${id}`);
  }

  async getBackupConfig(id: string): Promise<BackupConfig | null> {
    return this.backupConfigs.get(id) || null;
  }

  async listBackupConfigs(): Promise<BackupConfig[]> {
    return Array.from(this.backupConfigs.values());
  }

  // Backup Operations
  async createBackup(configId: string, options?: BackupOptions): Promise<Backup> {
    if (!config) {
      throw new Error(`Backup configuration not found: ${configId}`);
    }

    const backup: Backup = {
      id: backupId,
      configId,
      name: options?.name || `Backup ${new Date().toISOString()}`,
      description: options?.description,
      type: 'full', // Simplified for demo
      status: 'pending',
      size: 0,
      checksum: '',
      metadata: {
        version: '1.0.0',
        source: 'workflow-platform',
        hostname: 'localhost',
        platform: 'node.js',
        workflowCount: 0,
        credentialCount: 0,
        executionCount: 0,
        totalSize: 0,
        encrypted: config.encryption.enabled,
        compressed: config.compression.enabled,
        tags: options?.tags || []
      },
      manifest: {
        files: [],
        workflows: [],
        credentials: [],
        executions: [],
        dependencies: []
      },
      createdAt: new Date(),
      destinations: []
    };

    this.backups.set(backupId, backup);

    // Start backup process asynchronously
    this.performBackup(backup, config).catch(error => {
      this.log('error', `Backup failed: ${error.message}`, { backupId, error });
      backup.status = 'failed';
    });

    this.log('info', `Started backup: ${backup.name}`);
    return backup;
  }

  private async performBackup(backup: Backup, config: BackupConfig): Promise<void> {
    try {
      backup.status = 'running';
      this.backups.set(backup.id, backup);

      // Simulate backup process

      // Filter workflows based on config
        this.matchesFilter(w.id, config.filters.includeWorkflows, config.filters.excludeWorkflows)
      );

      // Build manifest
      backup.manifest.workflows = filteredWorkflows.map(w => ({
        id: w.id,
        name: w.name,
        version: w.version || '1.0.0',
        nodes: w.nodes?.length || 0,
        edges: w.edges?.length || 0,
        lastModified: w.updatedAt || new Date()
      }));

      if (config.filters.includeCredentials) {
        backup.manifest.credentials = credentials.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          encrypted: true
        }));
      }

      // Calculate metadata
      backup.metadata.workflowCount = backup.manifest.workflows.length;
      backup.metadata.credentialCount = backup.manifest.credentials.length;
      backup.metadata.totalSize = this.calculateBackupSize(backup);

      // Generate checksum
      backup.checksum = this.generateChecksum(backup);
      backup.size = backup.metadata.totalSize;
      backup.compressedSize = config.compression.enabled ? 
        Math.floor(backup.size * 0.3) : backup.size;

      // Set completion
      backup.status = 'completed';
      backup.completedAt = new Date();

      // Calculate expiration based on retention policy
      if (retention) {
        backup.expiresAt = new Date(Date.now() + retention.count * 24 * 60 * 60 * 1000);
      }

      this.backups.set(backup.id, backup);

      // Send success notification
      await this.sendNotification(config.notifications.onSuccess as unknown[], 'success', backup);

      this.log('info', `Backup completed: ${backup.name}`, {
        size: backup.size,
        workflows: backup.metadata.workflowCount,
        credentials: backup.metadata.credentialCount
      });

    } catch (error) {
      backup.status = 'failed';
      this.backups.set(backup.id, backup);
      
      // Send failure notification
      await this.sendNotification(config.notifications.onFailure as unknown[], 'failure', backup, error);
      
      throw error;
    }
  }

  private matchesFilter(id: string, include: string[], exclude: string[]): boolean {
    // Simple pattern matching (could be enhanced with regex)
    return isIncluded && !isExcluded;
  }

  private calculateBackupSize(backup: Backup): number {
    // Simplified size calculation
    size += backup.manifest.workflows.length * 10000; // ~10KB per workflow
    size += backup.manifest.credentials.length * 1000; // ~1KB per credential
    size += backup.manifest.executions.length * 5000; // ~5KB per execution
    return size;
  }

  private generateChecksum(backup: Backup): string {
    // Simplified checksum generation
    return `sha256:${Buffer.from(data).toString('base64').substring(0, 16)}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async sendNotification(configs: unknown[], type: string, backup: Backup, error?: unknown): Promise<void> {
    for (const config of configs) {
      this.log('info', `Sending ${type} notification`, { type: notificationConfig.type, recipients: notificationConfig.recipients });
      // In a real implementation, this would send actual notifications
    }
  }

  async listBackups(filters?: BackupFilters): Promise<Backup[]> {

    if (filters) {
      if (filters.modifiedAfter) {
        backups = backups.filter(b => b.createdAt >= filters.modifiedAfter!);
      }
      if (filters.modifiedBefore) {
        backups = backups.filter(b => b.createdAt <= filters.modifiedBefore!);
      }
      if (filters.tags?.length) {
        backups = backups.filter(b => 
          filters.tags!.some(tag => b.metadata.tags.includes(tag))
        );
      }
    }

    return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getBackup(id: string): Promise<Backup | null> {
    return this.backups.get(id) || null;
  }

  async deleteBackup(id: string): Promise<void> {
    if (!this.backups.has(id)) {
      throw new Error(`Backup not found: ${id}`);
    }

    this.backups.delete(id);
    this.log('info', `Deleted backup: ${id}`);
  }

  async verifyBackup(id: string): Promise<ValidationResult> {
    if (!backup) {
      return {
        passed: false,
        warnings: [],
        errors: ['Backup not found'],
        suggestions: []
      };
    }

    const warnings: string[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Check backup integrity
    if (backup.status !== 'completed') {
      errors.push('Backup is not in completed state');
    }

    if (!backup.checksum) {
      errors.push('Backup checksum is missing');
    }

    if (backup.size === 0) {
      warnings.push('Backup size is zero, may be empty');
    }

    // Check age
    if (ageInDays > 30) {
      warnings.push('Backup is older than 30 days');
    }

    // Check expiration
    if (backup.expiresAt && backup.expiresAt < new Date()) {
      errors.push('Backup has expired');
    }

    if (errors.length === 0 && warnings.length > 0) {
      suggestions.push('Consider creating a fresh backup');
    }

    return {
      passed: errors.length === 0,
      warnings,
      errors,
      suggestions
    };
  }

  // Restore Operations
  async restoreBackup(config: RestoreConfig): Promise<RestoreResult> {
    if (!backup) {
      throw new Error(`Backup not found: ${config.backupId}`);
    }

    const result: RestoreResult = {
      success: false,
      restoredItems: {
        workflows: [],
        credentials: [],
        executions: 0,
        settings: []
      },
      errors: [],
      warnings: [],
      duration: 0,
      report: {
        summary: '',
        details: [],
        recommendations: []
      }
    };

    try {
      this.log('info', `Starting restore from backup: ${backup.name}`);

      // Validate backup
      if (!validation.passed) {
        throw new Error(`Backup validation failed: ${validation.errors.join(', ')}`);
      }

      // Restore workflows
      if (config.options.restoreWorkflows) {
        for (const workflowInfo of backup.manifest.workflows) {
          try {
                          this.generateId();
            
            // In a real implementation, this would restore actual workflow data
            result.restoredItems.workflows.push({
              originalId: workflowInfo.id,
              newId,
              name: workflowInfo.name,
              status: 'success'
            });
          } catch (error) {
            result.errors.push({
              item: workflowInfo.name,
              type: 'workflow',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      // Restore credentials
      if (config.options.restoreCredentials) {
        for (const credInfo of backup.manifest.credentials) {
          try {
                          this.generateId();
            
            result.restoredItems.credentials.push({
              originalId: credInfo.id,
              newId,
              name: credInfo.name,
              type: credInfo.type,
              status: 'success'
            });
          } catch (error) {
            result.errors.push({
              item: credInfo.name,
              type: 'credential',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      // Generate report
      result.report.summary = `Restore ${result.success ? 'completed successfully' : 'completed with errors'}. ` +
        `Restored ${result.restoredItems.workflows.length} workflows and ${result.restoredItems.credentials.length} credentials.`;

      result.report.details = [
        {
          category: 'Workflows',
          items: backup.manifest.workflows.length,
          successful: result.restoredItems.workflows.filter(w => w.status === 'success').length,
          failed: result.restoredItems.workflows.filter(w => w.status === 'failed').length,
          skipped: 0
        },
        {
          category: 'Credentials',
          items: backup.manifest.credentials.length,
          successful: result.restoredItems.credentials.filter(c => c.status === 'success').length,
          failed: result.restoredItems.credentials.filter(c => c.status === 'failed').length,
          skipped: 0
        }
      ];

      if (result.errors.length > 0) {
        result.report.recommendations.push('Review and resolve the errors listed above');
        result.report.recommendations.push('Consider running a validation check on restored items');
      }

      this.log('info', `Restore completed: ${result.success ? 'success' : 'with errors'}`, {
        duration: result.duration,
        workflows: result.restoredItems.workflows.length,
        credentials: result.restoredItems.credentials.length,
        errors: result.errors.length
      });

      return result;

    } catch (error) {
      result.success = false;
      result.duration = Date.now() - startTime;
      result.errors.push({
        item: 'restore',
        type: 'workflow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      this.log('error', `Restore failed: ${error}`, { backupId: config.backupId });
      return result;
    }
  }

  async previewRestore(backupId: string): Promise<RestorePreview> {
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    // Check for conflicts
    const conflicts: RestoreConflict[] = [];
    
    for (const workflowInfo of backup.manifest.workflows) {
      if (existing) {
        conflicts.push({
          type: 'workflow',
          name: workflowInfo.name,
          existingId: existing.id,
          backupId: workflowInfo.id,
          resolution: 'overwrite'
        });
      }
    }

    // Check requirements
    const requirements: RestoreRequirement[] = [
      {
        type: 'storage',
        name: 'Available Storage',
        required: `${Math.floor(backup.size / 1024 / 1024)}MB`,
        current: '1GB',
        satisfied: true
      }
    ];

    return {
      backup,
      conflicts,
      requirements,
      estimatedTime: Math.floor(backup.size / 1000000) + 30, // Base time + size factor
      estimatedSize: backup.size
    };
  }

  async validateRestore(config: RestoreConfig): Promise<ValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];

    if (!backup) {
      errors.push('Backup not found');
      return { passed: false, warnings, errors, suggestions };
    }

    // Validate backup integrity
    errors.push(...backupValidation.errors);
    warnings.push(...backupValidation.warnings);

    // Check for conflicts if not using overwrite strategy
    if (config.strategy !== 'overwrite') {
      if (preview.conflicts.length > 0) {
        warnings.push(`Found ${preview.conflicts.length} potential conflicts`);
        suggestions.push('Consider using overwrite strategy or resolving conflicts manually');
      }
    }

    return {
      passed: errors.length === 0,
      warnings,
      errors,
      suggestions
    };
  }

  // Disaster Recovery
  async createDRPlan(plan: Partial<DisasterRecoveryPlan>): Promise<DisasterRecoveryPlan> {
    const drPlan: DisasterRecoveryPlan = {
      id,
      name: plan.name || `DR Plan ${id}`,
      description: plan.description || '',
      rto: plan.rto || 240, // 4 hours default
      rpo: plan.rpo || 60,  // 1 hour default
      strategies: plan.strategies || [],
      testing: plan.testing || {
        schedule: {
          frequency: 'quarterly',
          nextTest: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          duration: 4,
          participants: []
        },
        scenarios: [],
        automation: {
          enabled: false,
          tools: [],
          scripts: []
        },
        reporting: {
          template: '',
          metrics: [],
          distribution: []
        }
      },
      documentation: plan.documentation || {
        runbooks: [],
        diagrams: [],
        contacts: [],
        lastReview: new Date(),
        nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      contacts: plan.contacts || [],
      active: plan.active ?? false,
      lastUpdated: new Date()
    };

    this.drPlans.set(id, drPlan);
    this.log('info', `Created DR plan: ${drPlan.name}`);
    return drPlan;
  }

  async updateDRPlan(id: string, updates: Partial<DisasterRecoveryPlan>): Promise<DisasterRecoveryPlan> {
    if (!plan) {
      throw new Error(`DR plan not found: ${id}`);
    }

      ...plan,
      ...updates,
      id,
      lastUpdated: new Date()
    };

    this.drPlans.set(id, updatedPlan);
    this.log('info', `Updated DR plan: ${updatedPlan.name}`);
    return updatedPlan;
  }

  async testDRPlan(id: string, scenario?: string): Promise<DRTestResult> {
    if (!plan) {
      throw new Error(`DR plan not found: ${id}`);
    }

    this.log('info', `Starting DR test for plan: ${plan.name}`, { scenario });

    // Simulate DR test

    const metrics: DRMetrics = {
      actualRTO: 45, // minutes
      actualRPO: 15, // minutes
      dataLoss: 0,
      downtime: 45,
      successRate: 0.95
    };

    const issues: DRIssue[] = [
      {
        severity: 'medium',
        component: 'database',
        description: 'Database connection timeout during failover',
        impact: 'Increased recovery time by 5 minutes',
        resolution: 'Increase connection timeout configuration'
      }
    ];

    const result: DRTestResult = {
      success: true,
      scenario: testScenario,
      startTime,
      endTime,
      metrics,
      issues,
      recommendations: [
        'Update database connection timeout settings',
        'Consider implementing connection pooling',
        'Schedule more frequent DR tests'
      ],
      report: `DR test completed successfully for scenario: ${testScenario}. ` +
              `Achieved RTO of ${metrics.actualRTO} minutes (target: ${plan.rto}). ` +
              `Identified ${issues.length} issues for improvement.`
    };

    this.log('info', `DR test completed`, {
      scenario: testScenario,
      success: result.success,
      rto: metrics.actualRTO,
      issues: issues.length
    });

    return result;
  }

  async activateDRPlan(id: string): Promise<DRActivationResult> {
    if (!plan) {
      throw new Error(`DR plan not found: ${id}`);
    }

    this.log('info', `Activating DR plan: ${plan.name}`);

    const result: DRActivationResult = {
      activated: true,
      strategy: plan.strategies[0]?.name || 'Default Strategy',
      startTime: new Date(),
      status: 'activating',
      recoveredSystems: [],
      failedSystems: [],
      logs: [
        {
          timestamp: new Date(),
          level: 'info',
          component: 'dr-coordinator',
          message: `DR plan activation started: ${plan.name}`
        }
      ]
    };

    // Simulate DR activation process
    setTimeout(() => {
      result.status = 'active';
      result.completionTime = new Date();
      result.recoveredSystems = ['database', 'application', 'storage'];
      result.logs.push({
        timestamp: new Date(),
        level: 'info',
        component: 'dr-coordinator',
        message: 'DR plan activation completed successfully'
      });
    }, 5000);

    return result;
  }

  // Utility Methods
  async calculateFilteredBackupSize(filters: BackupFilters): Promise<number> {

    
    // Calculate workflow sizes
      this.matchesFilter(w.id, filters.includeWorkflows, filters.excludeWorkflows)
    );
    size += filteredWorkflows.length * 10000; // ~10KB per workflow

    // Add credential sizes
    if (filters.includeCredentials) {
      size += credentials.length * 1000; // ~1KB per credential
    }

    // Add execution history if included
    if (filters.includeExecutionHistory) {
      size += 50000; // Estimated execution history size
    }

    return size;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async exportBackup(id: string, format: 'zip' | 'tar'): Promise<Blob> {
    if (!backup) {
      throw new Error(`Backup not found: ${id}`);
    }

    // Simulate export
    return new Blob([exportData], { type: 'application/json' });
  }

  async importBackup(file: File): Promise<Backup> {
    const backup: Backup = JSON.parse(text);
    
    // Validate imported backup
    if (!backup.id || !backup.manifest) {
      throw new Error('Invalid backup file format');
    }

    // Generate new ID to avoid conflicts
    backup.id = newId;
    backup.createdAt = new Date();

    this.backups.set(newId, backup);
    this.log('info', `Imported backup: ${backup.name}`);
    
    return backup;
  }

  async scheduleBackup(configId: string): Promise<void> {
    if (!config || !config.enabled || config.schedule.type !== 'scheduled') {
      return;
    }

    // Cancel existing schedule
    if (this.scheduledBackups.has(configId)) {
      clearTimeout(this.scheduledBackups.get(configId)!);
    }

    // Calculate next run time

    if (delay > 0) {
        try {
          await this.createBackup(configId);
          // Reschedule for next run
          await this.scheduleBackup(configId);
        } catch (error) {
          this.log('error', `Scheduled backup failed: ${error}`);
        }
      }, delay);

      this.scheduledBackups.set(configId, timeout);
      this.log('info', `Scheduled backup: ${config.name} at ${nextRun.toISOString()}`);
    }
  }

  private calculateNextRun(schedule: { frequency: string; time?: string; daysOfWeek?: number[]; timezone?: string }): Date {

    switch (schedule.frequency) {
      case 'hourly':
        next.setHours(next.getHours() + 1, 0, 0, 0);
        break;
      case 'daily': {
        const [hours, minutes] = (schedule.time || '02:00').split(':');
        next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        break;
      }
      case 'weekly': {
        next.setDate(next.getDate() + daysUntilTarget);
        if (schedule.time) {
          const [h, m] = schedule.time.split(':');
          next.setHours(parseInt(h), parseInt(m), 0, 0);
        }
        if (next <= now) {
          next.setDate(next.getDate() + 7);
        }
        break;
      }
      default:
        next.setHours(next.getHours() + 24); // Default to daily
    }

    return next;
  }

  async cancelBackup(backupId: string): Promise<void> {
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    if (backup.status === 'running') {
      backup.status = 'cancelled';
      this.backups.set(backupId, backup);
      this.log('info', `Cancelled backup: ${backup.name}`);
    }
  }

  private generateId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const backupService = BackupService.getInstance();