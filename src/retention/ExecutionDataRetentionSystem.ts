/**
 * Execution Data Retention System
 * Manage storage, archival, and cleanup of workflow execution data
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Types
export interface RetentionPolicy {
  id: string;
  name: string;
  description?: string;
  rules: RetentionRule[];
  priority: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetentionRule {
  id: string;
  type: RuleType;
  condition: RuleCondition;
  action: RuleAction;
  schedule?: RetentionSchedule;
  metadata?: any;
}

export type RuleType = 
  | 'age' 
  | 'status' 
  | 'size' 
  | 'count' 
  | 'tag' 
  | 'workflow'
  | 'custom';

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  unit?: TimeUnit;
}

export type ConditionOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'greater_than' 
  | 'less_than' 
  | 'contains' 
  | 'not_contains'
  | 'matches'
  | 'older_than'
  | 'newer_than';

export interface RuleAction {
  type: ActionType;
  target?: StorageTarget;
  options?: ActionOptions;
}

export type ActionType = 
  | 'delete' 
  | 'archive' 
  | 'compress' 
  | 'move' 
  | 'export' 
  | 'aggregate'
  | 'notify';

export interface StorageTarget {
  type: 'local' | 's3' | 'azure' | 'gcs' | 'database';
  location: string;
  credentials?: any;
  options?: any;
}

export interface ActionOptions {
  compression?: CompressionOptions;
  encryption?: EncryptionOptions;
  notification?: NotificationOptions;
  aggregation?: AggregationOptions;
}

export interface CompressionOptions {
  algorithm: 'gzip' | 'brotli' | 'zstd';
  level: number;
}

export interface EncryptionOptions {
  algorithm: string;
  key?: string;
  keyId?: string;
}

export interface NotificationOptions {
  channels: string[];
  template?: string;
  recipients?: string[];
}

export interface AggregationOptions {
  groupBy: string[];
  metrics: string[];
  format: 'json' | 'csv' | 'parquet';
}

export interface RetentionSchedule {
  type: 'cron' | 'interval' | 'manual';
  expression?: string;
  interval?: number;
  unit?: TimeUnit;
  timezone?: string;
  nextRun?: Date;
  lastRun?: Date;
}

export type TimeUnit = 
  | 'minutes' 
  | 'hours' 
  | 'days' 
  | 'weeks' 
  | 'months' 
  | 'years';

export interface ExecutionData {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  data?: any;
  error?: any;
  nodeExecutions?: NodeExecutionData[];
  metadata?: ExecutionMetadata;
  tags?: string[];
  size?: number;
}

export type ExecutionStatus = 
  | 'running' 
  | 'success' 
  | 'error' 
  | 'cancelled' 
  | 'timeout';

export interface NodeExecutionData {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt?: Date;
  inputData?: any;
  outputData?: any;
  error?: any;
}

export interface ExecutionMetadata {
  triggeredBy?: string;
  environment?: string;
  version?: string;
  retryCount?: number;
  parentExecutionId?: string;
  childExecutionIds?: string[];
  customData?: any;
}

export interface RetentionStatistics {
  totalExecutions: number;
  totalSize: number;
  executionsByStatus: { [status: string]: number };
  executionsByWorkflow: { [workflowId: string]: number };
  oldestExecution?: Date;
  newestExecution?: Date;
  averageSize: number;
  averageDuration: number;
}

export interface ArchiveMetadata {
  id: string;
  originalExecutionId: string;
  archivedAt: Date;
  location: string;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  checksum: string;
  expiresAt?: Date;
}

export interface RetentionJob {
  id: string;
  policyId: string;
  status: JobStatus;
  startedAt: Date;
  finishedAt?: Date;
  processed: number;
  deleted: number;
  archived: number;
  errors: JobError[];
  nextRun?: Date;
}

export type JobStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface JobError {
  executionId: string;
  error: string;
  timestamp: Date;
}

export interface RetentionQuery {
  workflowId?: string;
  status?: ExecutionStatus;
  startedAfter?: Date;
  startedBefore?: Date;
  finishedAfter?: Date;
  finishedBefore?: Date;
  tags?: string[];
  minSize?: number;
  maxSize?: number;
  limit?: number;
  offset?: number;
}

export interface BackupOptions {
  incremental?: boolean;
  compression?: boolean;
  encryption?: boolean;
  format?: 'json' | 'sql' | 'parquet';
  splitSize?: number;
  parallel?: boolean;
}

export interface RestoreOptions {
  overwrite?: boolean;
  validate?: boolean;
  skipErrors?: boolean;
  filter?: (execution: ExecutionData) => boolean;
}

// Main System Class
export class ExecutionDataRetentionSystem extends EventEmitter {
  private static instance: ExecutionDataRetentionSystem;
  private policies: Map<string, RetentionPolicy> = new Map();
  private executions: Map<string, ExecutionData> = new Map();
  private archives: Map<string, ArchiveMetadata> = new Map();
  private jobs: Map<string, RetentionJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private storageProviders: Map<string, StorageProvider> = new Map();
  private schedulers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEFAULT_RETENTION_DAYS = 30;
  private readonly MAX_EXECUTION_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly BATCH_SIZE = 1000;

  private constructor() {
    super();
    this.initializeDefaultPolicies();
    this.initializeStorageProviders();
    this.startRetentionScheduler();
  }

  public static getInstance(): ExecutionDataRetentionSystem {
    if (!ExecutionDataRetentionSystem.instance) {
      ExecutionDataRetentionSystem.instance = new ExecutionDataRetentionSystem();
    }
    return ExecutionDataRetentionSystem.instance;
  }

  // Execution Management
  public async saveExecution(execution: ExecutionData): Promise<void> {
    try {
      // Calculate size if not provided
      if (!execution.size) {
        execution.size = this.calculateExecutionSize(execution);
      }

      // Check size limit
      if (execution.size > this.MAX_EXECUTION_SIZE) {
        this.emit('execution:oversized', { 
          executionId: execution.id, 
          size: execution.size 
        });
        
        // Automatically compress large executions
        execution = await this.compressExecution(execution);
      }

      // Store execution
      this.executions.set(execution.id, execution);

      // Apply immediate retention rules
      await this.applyImmediateRules(execution);

      this.emit('execution:saved', { executionId: execution.id });
    } catch (error) {
      this.emit('execution:error', { 
        action: 'save', 
        executionId: execution.id, 
        error 
      });
      throw error;
    }
  }

  public async getExecution(
    executionId: string,
    options: { includeArchived?: boolean } = {}
  ): Promise<ExecutionData | null> {
    // Check active executions
    let execution = this.executions.get(executionId);
    if (execution) {
      return execution;
    }

    // Check archived executions if requested
    if (options.includeArchived) {
      const archive = this.archives.get(executionId);
      if (archive) {
        execution = await this.retrieveFromArchive(archive);
        return execution;
      }
    }

    return null;
  }

  public async queryExecutions(
    query: RetentionQuery
  ): Promise<ExecutionData[]> {
    let results = Array.from(this.executions.values());

    // Apply filters
    if (query.workflowId) {
      results = results.filter(e => e.workflowId === query.workflowId);
    }

    if (query.status) {
      results = results.filter(e => e.status === query.status);
    }

    if (query.startedAfter) {
      results = results.filter(e => e.startedAt > query.startedAfter!);
    }

    if (query.startedBefore) {
      results = results.filter(e => e.startedAt < query.startedBefore!);
    }

    if (query.finishedAfter) {
      results = results.filter(e => 
        e.finishedAt && e.finishedAt > query.finishedAfter!
      );
    }

    if (query.finishedBefore) {
      results = results.filter(e => 
        e.finishedAt && e.finishedAt < query.finishedBefore!
      );
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(e => 
        query.tags!.some(tag => e.tags?.includes(tag))
      );
    }

    if (query.minSize !== undefined) {
      results = results.filter(e => 
        e.size && e.size >= query.minSize!
      );
    }

    if (query.maxSize !== undefined) {
      results = results.filter(e => 
        e.size && e.size <= query.maxSize!
      );
    }

    // Sort by startedAt descending
    results.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  public async deleteExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    // Delete from storage
    this.executions.delete(executionId);

    // Delete from archives if exists
    const archive = this.archives.get(executionId);
    if (archive) {
      await this.deleteFromArchive(archive);
      this.archives.delete(executionId);
    }

    this.emit('execution:deleted', { executionId });
  }

  // Policy Management
  public async createPolicy(
    name: string,
    rules: RetentionRule[],
    options: Partial<RetentionPolicy> = {}
  ): Promise<RetentionPolicy> {
    if (this.policies.has(name)) {
      throw new Error(`Policy "${name}" already exists`);
    }

    const policy: RetentionPolicy = {
      id: this.generateId(),
      name,
      description: options.description,
      rules,
      priority: options.priority ?? 0,
      enabled: options.enabled ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.policies.set(name, policy);

    // Schedule policy if it has schedule rules
    this.schedulePolicy(policy);

    this.emit('policy:created', { policy });

    return policy;
  }

  public async updatePolicy(
    name: string,
    updates: Partial<RetentionPolicy>
  ): Promise<RetentionPolicy> {
    const policy = this.policies.get(name);
    if (!policy) {
      throw new Error(`Policy "${name}" not found`);
    }

    // Update policy
    Object.assign(policy, updates, {
      updatedAt: new Date()
    });

    // Reschedule if needed
    if (updates.rules || updates.enabled !== undefined) {
      this.unschedulePolicy(policy.id);
      if (policy.enabled) {
        this.schedulePolicy(policy);
      }
    }

    this.emit('policy:updated', { policy });

    return policy;
  }

  public async deletePolicy(name: string): Promise<void> {
    const policy = this.policies.get(name);
    if (!policy) {
      throw new Error(`Policy "${name}" not found`);
    }

    // Unschedule policy
    this.unschedulePolicy(policy.id);

    // Delete policy
    this.policies.delete(name);

    this.emit('policy:deleted', { policyName: name });
  }

  public async applyPolicy(
    policyName: string,
    options: { dryRun?: boolean } = {}
  ): Promise<RetentionJob> {
    const policy = this.policies.get(policyName);
    if (!policy) {
      throw new Error(`Policy "${policyName}" not found`);
    }

    if (!policy.enabled) {
      throw new Error(`Policy "${policyName}" is disabled`);
    }

    // Create job
    const job: RetentionJob = {
      id: this.generateId(),
      policyId: policy.id,
      status: 'pending',
      startedAt: new Date(),
      processed: 0,
      deleted: 0,
      archived: 0,
      errors: []
    };

    this.jobs.set(job.id, job);
    this.activeJobs.add(job.id);

    // Execute job
    this.executeRetentionJob(job, policy, options)
      .then(() => {
        job.status = 'completed';
        job.finishedAt = new Date();
        this.activeJobs.delete(job.id);
        this.emit('job:completed', { job });
      })
      .catch(error => {
        job.status = 'failed';
        job.finishedAt = new Date();
        this.activeJobs.delete(job.id);
        this.emit('job:failed', { job, error });
      });

    return job;
  }

  // Retention Execution
  private async executeRetentionJob(
    job: RetentionJob,
    policy: RetentionPolicy,
    options: { dryRun?: boolean }
  ): Promise<void> {
    job.status = 'running';
    this.emit('job:started', { job });

    // Sort rules by priority
    const sortedRules = [...policy.rules].sort((a, b) => {
      const aPriority = this.getRulePriority(a.type);
      const bPriority = this.getRulePriority(b.type);
      return aPriority - bPriority;
    });

    // Process each rule
    for (const rule of sortedRules) {
      try {
        await this.processRule(rule, job, options);
      } catch (error: any) {
        job.errors.push({
          executionId: '',
          error: error.message,
          timestamp: new Date()
        });
      }
    }
  }

  private async processRule(
    rule: RetentionRule,
    job: RetentionJob,
    options: { dryRun?: boolean }
  ): Promise<void> {
    // Find matching executions
    const matchingExecutions = this.findMatchingExecutions(rule);

    // Process in batches
    for (let i = 0; i < matchingExecutions.length; i += this.BATCH_SIZE) {
      const batch = matchingExecutions.slice(i, i + this.BATCH_SIZE);
      
      await Promise.all(
        batch.map(async execution => {
          try {
            if (!options.dryRun) {
              await this.applyAction(execution, rule.action);
            }
            
            job.processed++;
            
            switch (rule.action.type) {
              case 'delete':
                job.deleted++;
                break;
              case 'archive':
                job.archived++;
                break;
            }
          } catch (error: any) {
            job.errors.push({
              executionId: execution.id,
              error: error.message,
              timestamp: new Date()
            });
          }
        })
      );
    }
  }

  private findMatchingExecutions(rule: RetentionRule): ExecutionData[] {
    const executions = Array.from(this.executions.values());
    
    return executions.filter(execution => {
      return this.evaluateCondition(execution, rule.condition);
    });
  }

  private evaluateCondition(
    execution: ExecutionData,
    condition: RuleCondition
  ): boolean {
    const fieldValue = this.getFieldValue(execution, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      
      case 'not_equals':
        return fieldValue !== condition.value;
      
      case 'greater_than':
        return fieldValue > condition.value;
      
      case 'less_than':
        return fieldValue < condition.value;
      
      case 'contains':
        return String(fieldValue).includes(condition.value);
      
      case 'not_contains':
        return !String(fieldValue).includes(condition.value);
      
      case 'matches':
        return new RegExp(condition.value).test(String(fieldValue));
      
      case 'older_than':
        return this.isOlderThan(fieldValue as Date, condition.value, condition.unit);
      
      case 'newer_than':
        return this.isNewerThan(fieldValue as Date, condition.value, condition.unit);
      
      default:
        return false;
    }
  }

  private getFieldValue(execution: ExecutionData, field: string): any {
    const parts = field.split('.');
    let value: any = execution;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private isOlderThan(date: Date, value: number, unit?: TimeUnit): boolean {
    const age = this.convertToMilliseconds(value, unit || 'days');
    return Date.now() - date.getTime() > age;
  }

  private isNewerThan(date: Date, value: number, unit?: TimeUnit): boolean {
    const age = this.convertToMilliseconds(value, unit || 'days');
    return Date.now() - date.getTime() < age;
  }

  private convertToMilliseconds(value: number, unit: TimeUnit): number {
    switch (unit) {
      case 'minutes':
        return value * 60 * 1000;
      case 'hours':
        return value * 60 * 60 * 1000;
      case 'days':
        return value * 24 * 60 * 60 * 1000;
      case 'weeks':
        return value * 7 * 24 * 60 * 60 * 1000;
      case 'months':
        return value * 30 * 24 * 60 * 60 * 1000;
      case 'years':
        return value * 365 * 24 * 60 * 60 * 1000;
      default:
        return value;
    }
  }

  // Action Execution
  private async applyAction(
    execution: ExecutionData,
    action: RuleAction
  ): Promise<void> {
    switch (action.type) {
      case 'delete':
        await this.deleteExecution(execution.id);
        break;
      
      case 'archive':
        await this.archiveExecution(execution, action);
        break;
      
      case 'compress':
        await this.compressAndSaveExecution(execution, action);
        break;
      
      case 'move':
        await this.moveExecution(execution, action);
        break;
      
      case 'export':
        await this.exportExecution(execution, action);
        break;
      
      case 'aggregate':
        await this.aggregateExecution(execution, action);
        break;
      
      case 'notify':
        await this.notifyAction(execution, action);
        break;
    }
  }

  // Archive Operations
  private async archiveExecution(
    execution: ExecutionData,
    action: RuleAction
  ): Promise<void> {
    const target = action.target || {
      type: 'local' as const,
      location: './archives'
    };

    const provider = this.storageProviders.get(target.type);
    if (!provider) {
      throw new Error(`Storage provider "${target.type}" not found`);
    }

    // Prepare data
    let data = JSON.stringify(execution);
    let compressed = false;
    let encrypted = false;

    // Apply compression
    if (action.options?.compression) {
      data = await this.compressData(data, action.options.compression);
      compressed = true;
    }

    // Apply encryption
    if (action.options?.encryption) {
      data = await this.encryptData(data, action.options.encryption);
      encrypted = true;
    }

    // Store archive
    const location = await provider.store(execution.id, data, {
      ...target.options,
      metadata: {
        originalSize: execution.size,
        compressed,
        encrypted
      }
    });

    // Create archive metadata
    const archive: ArchiveMetadata = {
      id: this.generateId(),
      originalExecutionId: execution.id,
      archivedAt: new Date(),
      location,
      size: data.length,
      compressed,
      encrypted,
      checksum: this.calculateChecksum(data)
    };

    this.archives.set(execution.id, archive);

    // Remove from active executions
    this.executions.delete(execution.id);

    this.emit('execution:archived', { 
      executionId: execution.id, 
      archive 
    });
  }

  private async retrieveFromArchive(
    archive: ArchiveMetadata
  ): Promise<ExecutionData> {
    const provider = this.getProviderFromLocation(archive.location);
    
    // Retrieve data
    let data = await provider.retrieve(archive.originalExecutionId);

    // Decrypt if needed
    if (archive.encrypted) {
      data = await this.decryptData(data);
    }

    // Decompress if needed
    if (archive.compressed) {
      data = await this.decompressData(data);
    }

    return JSON.parse(data);
  }

  private async deleteFromArchive(archive: ArchiveMetadata): Promise<void> {
    const provider = this.getProviderFromLocation(archive.location);
    await provider.delete(archive.originalExecutionId);
  }

  // Compression
  private async compressExecution(
    execution: ExecutionData
  ): Promise<ExecutionData> {
    const compressed = { ...execution };
    
    // Compress large data fields
    if (compressed.data) {
      compressed.data = await this.compressData(
        JSON.stringify(compressed.data),
        { algorithm: 'gzip', level: 9 }
      );
    }

    if (compressed.nodeExecutions) {
      for (const node of compressed.nodeExecutions) {
        if (node.inputData) {
          node.inputData = await this.compressData(
            JSON.stringify(node.inputData),
            { algorithm: 'gzip', level: 9 }
          );
        }
        if (node.outputData) {
          node.outputData = await this.compressData(
            JSON.stringify(node.outputData),
            { algorithm: 'gzip', level: 9 }
          );
        }
      }
    }

    compressed.size = this.calculateExecutionSize(compressed);
    
    return compressed;
  }

  private async compressAndSaveExecution(
    execution: ExecutionData,
    action: RuleAction
  ): Promise<void> {
    const compressed = await this.compressExecution(execution);
    this.executions.set(execution.id, compressed);
    
    this.emit('execution:compressed', { 
      executionId: execution.id,
      originalSize: execution.size,
      compressedSize: compressed.size
    });
  }

  private async compressData(
    data: string | Buffer,
    options: CompressionOptions
  ): Promise<string> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    
    switch (options.algorithm) {
      case 'gzip':
        const compressed = await gzip(buffer, { level: options.level });
        return compressed.toString('base64');
      
      case 'brotli':
        // Brotli implementation
        return data.toString();
      
      case 'zstd':
        // Zstandard implementation
        return data.toString();
      
      default:
        return data.toString();
    }
  }

  private async decompressData(data: string): Promise<string> {
    const buffer = Buffer.from(data, 'base64');
    const decompressed = await gunzip(buffer);
    return decompressed.toString();
  }

  // Encryption
  private async encryptData(
    data: string,
    options: EncryptionOptions
  ): Promise<string> {
    // Implementation would use crypto module
    // This is a placeholder
    return Buffer.from(data).toString('base64');
  }

  private async decryptData(data: string): Promise<string> {
    // Implementation would use crypto module
    // This is a placeholder
    return Buffer.from(data, 'base64').toString();
  }

  // Move Operations
  private async moveExecution(
    execution: ExecutionData,
    action: RuleAction
  ): Promise<void> {
    if (!action.target) {
      throw new Error('Move action requires a target');
    }

    // Archive to new location
    await this.archiveExecution(execution, action);
    
    this.emit('execution:moved', { 
      executionId: execution.id,
      target: action.target
    });
  }

  // Export Operations
  private async exportExecution(
    execution: ExecutionData,
    action: RuleAction
  ): Promise<void> {
    const format = action.options?.aggregation?.format || 'json';
    const target = action.target || {
      type: 'local' as const,
      location: './exports'
    };

    let exportData: string;
    
    switch (format) {
      case 'csv':
        exportData = this.convertToCSV(execution);
        break;
      case 'parquet':
        exportData = await this.convertToParquet(execution);
        break;
      default:
        exportData = JSON.stringify(execution, null, 2);
    }

    const provider = this.storageProviders.get(target.type);
    if (provider) {
      await provider.store(
        `${execution.id}.${format}`,
        exportData,
        target.options
      );
    }

    this.emit('execution:exported', { 
      executionId: execution.id,
      format
    });
  }

  // Aggregation
  private async aggregateExecution(
    execution: ExecutionData,
    action: RuleAction
  ): Promise<void> {
    // Implementation for aggregating execution data
    // This would typically involve grouping and summarizing data
    
    this.emit('execution:aggregated', { 
      executionId: execution.id 
    });
  }

  // Notifications
  private async notifyAction(
    execution: ExecutionData,
    action: RuleAction
  ): Promise<void> {
    const options = action.options?.notification;
    if (!options) return;

    for (const channel of options.channels) {
      this.emit('notification:send', {
        channel,
        template: options.template,
        recipients: options.recipients,
        data: {
          executionId: execution.id,
          workflowName: execution.workflowName,
          status: execution.status,
          startedAt: execution.startedAt
        }
      });
    }
  }

  // Statistics
  public async getStatistics(): Promise<RetentionStatistics> {
    const executions = Array.from(this.executions.values());
    
    const stats: RetentionStatistics = {
      totalExecutions: executions.length,
      totalSize: executions.reduce((sum, e) => sum + (e.size || 0), 0),
      executionsByStatus: {},
      executionsByWorkflow: {},
      averageSize: 0,
      averageDuration: 0
    };

    let totalDuration = 0;
    let durationCount = 0;

    for (const execution of executions) {
      // By status
      stats.executionsByStatus[execution.status] = 
        (stats.executionsByStatus[execution.status] || 0) + 1;
      
      // By workflow
      stats.executionsByWorkflow[execution.workflowId] = 
        (stats.executionsByWorkflow[execution.workflowId] || 0) + 1;
      
      // Duration
      if (execution.duration) {
        totalDuration += execution.duration;
        durationCount++;
      }
      
      // Dates
      if (!stats.oldestExecution || execution.startedAt < stats.oldestExecution) {
        stats.oldestExecution = execution.startedAt;
      }
      if (!stats.newestExecution || execution.startedAt > stats.newestExecution) {
        stats.newestExecution = execution.startedAt;
      }
    }

    stats.averageSize = stats.totalExecutions > 0 
      ? stats.totalSize / stats.totalExecutions 
      : 0;
    
    stats.averageDuration = durationCount > 0 
      ? totalDuration / durationCount 
      : 0;

    return stats;
  }

  // Backup & Restore
  public async backup(options: BackupOptions = {}): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup_${timestamp}`;
    
    const data = {
      version: '1.0.0',
      timestamp,
      executions: Array.from(this.executions.values()),
      archives: Array.from(this.archives.values()),
      policies: Array.from(this.policies.values())
    };

    let backupData = JSON.stringify(data, null, 2);
    
    if (options.compression) {
      backupData = await this.compressData(
        backupData,
        { algorithm: 'gzip', level: 9 }
      );
    }

    // Store backup
    const location = `./backups/${backupId}.json${options.compression ? '.gz' : ''}`;
    await fs.writeFile(location, backupData);
    
    this.emit('backup:created', { backupId, location });
    
    return backupId;
  }

  public async restore(
    backupId: string,
    options: RestoreOptions = {}
  ): Promise<void> {
    const location = `./backups/${backupId}.json`;
    let backupData = await fs.readFile(location, 'utf-8');
    
    // Check if compressed
    if (location.endsWith('.gz')) {
      backupData = await this.decompressData(backupData);
    }

    const data = JSON.parse(backupData);
    
    // Validate backup
    if (options.validate) {
      this.validateBackupData(data);
    }

    // Clear existing data if overwrite
    if (options.overwrite) {
      this.executions.clear();
      this.archives.clear();
      this.policies.clear();
    }

    // Restore executions
    for (const execution of data.executions) {
      if (!options.filter || options.filter(execution)) {
        try {
          this.executions.set(execution.id, execution);
        } catch (error) {
          if (!options.skipErrors) throw error;
        }
      }
    }

    // Restore archives
    for (const archive of data.archives) {
      this.archives.set(archive.originalExecutionId, archive);
    }

    // Restore policies
    for (const policy of data.policies) {
      this.policies.set(policy.name, policy);
      if (policy.enabled) {
        this.schedulePolicy(policy);
      }
    }

    this.emit('restore:completed', { backupId });
  }

  // Helper Methods
  private calculateExecutionSize(execution: ExecutionData): number {
    const json = JSON.stringify(execution);
    return Buffer.byteLength(json, 'utf8');
  }

  private calculateChecksum(data: string | Buffer): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  }

  private generateId(): string {
    return `ret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getRulePriority(type: RuleType): number {
    const priorities: { [key in RuleType]: number } = {
      'custom': 1,
      'tag': 2,
      'workflow': 3,
      'status': 4,
      'count': 5,
      'size': 6,
      'age': 7
    };
    return priorities[type] || 999;
  }

  private getProviderFromLocation(location: string): StorageProvider {
    // Parse location to determine provider
    if (location.startsWith('s3://')) {
      return this.storageProviders.get('s3')!;
    } else if (location.startsWith('azure://')) {
      return this.storageProviders.get('azure')!;
    } else if (location.startsWith('gcs://')) {
      return this.storageProviders.get('gcs')!;
    } else {
      return this.storageProviders.get('local')!;
    }
  }

  private convertToCSV(execution: ExecutionData): string {
    // Simple CSV conversion
    const rows = [
      ['ID', 'Workflow', 'Status', 'Started', 'Finished', 'Duration'],
      [
        execution.id,
        execution.workflowName || execution.workflowId,
        execution.status,
        execution.startedAt.toISOString(),
        execution.finishedAt?.toISOString() || '',
        execution.duration?.toString() || ''
      ]
    ];
    
    return rows.map(row => row.join(',')).join('\n');
  }

  private async convertToParquet(execution: ExecutionData): Promise<string> {
    // Placeholder for Parquet conversion
    // Would use a library like parquetjs
    return JSON.stringify(execution);
  }

  private validateBackupData(data: any): void {
    if (!data.version) {
      throw new Error('Invalid backup: missing version');
    }
    if (!data.executions || !Array.isArray(data.executions)) {
      throw new Error('Invalid backup: missing or invalid executions');
    }
  }

  // Scheduling
  private schedulePolicy(policy: RetentionPolicy): void {
    for (const rule of policy.rules) {
      if (rule.schedule) {
        this.scheduleRule(policy.id, rule);
      }
    }
  }

  private unschedulePolicy(policyId: string): void {
    const scheduler = this.schedulers.get(policyId);
    if (scheduler) {
      clearInterval(scheduler);
      this.schedulers.delete(policyId);
    }
  }

  private scheduleRule(policyId: string, rule: RetentionRule): void {
    if (rule.schedule?.type === 'interval' && rule.schedule.interval) {
      const interval = this.convertToMilliseconds(
        rule.schedule.interval,
        rule.schedule.unit || 'hours'
      );
      
      const scheduler = setInterval(() => {
        this.applyPolicy(policyId).catch(error => {
          this.emit('scheduler:error', { policyId, error });
        });
      }, interval);
      
      this.schedulers.set(`${policyId}_${rule.id}`, scheduler);
    }
  }

  // Immediate Rules
  private async applyImmediateRules(execution: ExecutionData): Promise<void> {
    for (const [name, policy] of this.policies) {
      if (!policy.enabled) continue;
      
      for (const rule of policy.rules) {
        if (this.evaluateCondition(execution, rule.condition)) {
          await this.applyAction(execution, rule.action);
        }
      }
    }
  }

  // Initialization
  private initializeDefaultPolicies(): void {
    // Default retention policy
    this.createPolicy('default', [
      {
        id: 'delete_old',
        type: 'age',
        condition: {
          field: 'finishedAt',
          operator: 'older_than',
          value: this.DEFAULT_RETENTION_DAYS,
          unit: 'days'
        },
        action: {
          type: 'delete'
        }
      }
    ], {
      description: 'Default retention policy',
      priority: 0
    });

    // Error retention policy
    this.createPolicy('errors', [
      {
        id: 'archive_errors',
        type: 'status',
        condition: {
          field: 'status',
          operator: 'equals',
          value: 'error'
        },
        action: {
          type: 'archive',
          options: {
            compression: {
              algorithm: 'gzip',
              level: 9
            }
          }
        }
      }
    ], {
      description: 'Archive error executions',
      priority: 1
    });
  }

  private initializeStorageProviders(): void {
    // Local storage provider
    this.storageProviders.set('local', new LocalStorageProvider());
    
    // Cloud storage providers would be initialized here
    // this.storageProviders.set('s3', new S3StorageProvider());
    // this.storageProviders.set('azure', new AzureStorageProvider());
    // this.storageProviders.set('gcs', new GCSStorageProvider());
  }

  private startRetentionScheduler(): void {
    // Run retention policies every hour
    setInterval(() => {
      this.runScheduledPolicies().catch(error => {
        this.emit('scheduler:error', { error });
      });
    }, 60 * 60 * 1000);
  }

  private async runScheduledPolicies(): Promise<void> {
    for (const [name, policy] of this.policies) {
      if (policy.enabled) {
        try {
          await this.applyPolicy(name);
        } catch (error) {
          this.emit('policy:error', { policyName: name, error });
        }
      }
    }
  }
}

// Storage Provider Interface
interface StorageProvider {
  store(id: string, data: string | Buffer, options?: any): Promise<string>;
  retrieve(id: string): Promise<string>;
  delete(id: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

// Local Storage Provider
class LocalStorageProvider implements StorageProvider {
  private baseDir = './retention';

  async store(id: string, data: string | Buffer, options?: any): Promise<string> {
    const location = path.join(this.baseDir, id);
    const dir = path.dirname(location);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(location, data);
    
    return location;
  }

  async retrieve(id: string): Promise<string> {
    const location = path.join(this.baseDir, id);
    const data = await fs.readFile(location, 'utf-8');
    return data;
  }

  async delete(id: string): Promise<void> {
    const location = path.join(this.baseDir, id);
    await fs.unlink(location);
  }

  async list(prefix?: string): Promise<string[]> {
    const files: string[] = [];
    const dir = prefix ? path.join(this.baseDir, prefix) : this.baseDir;
    
    try {
      const entries = await fs.readdir(dir);
      files.push(...entries);
    } catch {
      // Directory doesn't exist
    }
    
    return files;
  }
}

// Export singleton instance
export default ExecutionDataRetentionSystem.getInstance();