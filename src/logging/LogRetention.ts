/**
 * Log Retention Policy Engine
 * Manages log retention and auto-deletion based on policies
 */

import { EventEmitter } from 'events';
import { StreamedLog } from './LogStreamer';

export type RetentionPeriod = '7d' | '30d' | '90d' | '1y' | 'forever';

export interface RetentionPolicy {
  id: string;
  name: string;
  period: RetentionPeriod;
  levels?: string[];
  categories?: string[];
  conditions?: RetentionCondition[];
  enabled: boolean;
  priority?: number; // Higher priority wins
}

export interface RetentionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'matches';
  value: any;
}

export interface RetentionStats {
  totalLogs: number;
  retainedLogs: number;
  deletedLogs: number;
  lastCleanup?: Date;
  policiesApplied: number;
  storageUsed: number; // bytes
}

export class LogRetention extends EventEmitter {
  private policies: Map<string, RetentionPolicy> = new Map();
  private logs: Map<string, StreamedLog> = new Map();
  private cleanupInterval?: NodeJS.Timeout;
  private stats: RetentionStats;

  constructor(cleanupIntervalMs: number = 3600000) { // Default: 1 hour
    super();

    this.stats = {
      totalLogs: 0,
      retainedLogs: 0,
      deletedLogs: 0,
      policiesApplied: 0,
      storageUsed: 0,
    };

    this.startCleanupJob(cleanupIntervalMs);
  }

  /**
   * Add retention policy
   */
  addPolicy(policy: Omit<RetentionPolicy, 'id'>): RetentionPolicy {
    const id = `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullPolicy: RetentionPolicy = { ...policy, id };

    this.policies.set(id, fullPolicy);
    this.stats.policiesApplied = this.policies.size;

    this.emit('policy:added', fullPolicy);
    return fullPolicy;
  }

  /**
   * Remove retention policy
   */
  removePolicy(policyId: string): void {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    this.policies.delete(policyId);
    this.stats.policiesApplied = this.policies.size;

    this.emit('policy:removed', policy);
  }

  /**
   * Update retention policy
   */
  updatePolicy(policyId: string, updates: Partial<RetentionPolicy>): RetentionPolicy {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    const updated = { ...policy, ...updates, id: policyId };
    this.policies.set(policyId, updated);

    this.emit('policy:updated', updated);
    return updated;
  }

  /**
   * Get all policies
   */
  getPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): RetentionPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Add log for retention management
   */
  addLog(log: StreamedLog): void {
    this.logs.set(log.id, log);
    this.stats.totalLogs++;
    this.stats.retainedLogs++;
    this.updateStorageUsed();
  }

  /**
   * Remove log
   */
  removeLog(logId: string): void {
    const log = this.logs.get(logId);
    if (log) {
      this.logs.delete(logId);
      this.stats.retainedLogs--;
      this.stats.deletedLogs++;
      this.updateStorageUsed();
      this.emit('log:deleted', { logId, log });
    }
  }

  /**
   * Check if log should be retained
   */
  shouldRetain(log: StreamedLog): boolean {
    const applicablePolicies = this.getApplicablePolicies(log);

    if (applicablePolicies.length === 0) {
      // No policies apply, use default retention (30 days)
      const cutoff = this.getRetentionCutoff('30d');
      return new Date(log.timestamp) >= cutoff;
    }

    // Sort by priority (highest first)
    applicablePolicies.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Use highest priority policy
    const policy = applicablePolicies[0];

    if (policy.period === 'forever') {
      return true;
    }

    const cutoff = this.getRetentionCutoff(policy.period);
    return new Date(log.timestamp) >= cutoff;
  }

  /**
   * Get applicable policies for a log
   */
  private getApplicablePolicies(log: StreamedLog): RetentionPolicy[] {
    const applicable: RetentionPolicy[] = [];

    for (const policy of Array.from(this.policies.values())) {
      if (!policy.enabled) {
        continue;
      }

      // Check level filter
      if (policy.levels && !policy.levels.includes(log.level)) {
        continue;
      }

      // Check category filter
      if (policy.categories && log.category && !policy.categories.includes(log.category)) {
        continue;
      }

      // Check conditions
      if (policy.conditions && !this.matchesConditions(log, policy.conditions)) {
        continue;
      }

      applicable.push(policy);
    }

    return applicable;
  }

  /**
   * Check if log matches conditions
   */
  private matchesConditions(log: StreamedLog, conditions: RetentionCondition[]): boolean {
    for (const condition of conditions) {
      if (!this.matchesCondition(log, condition)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if log matches single condition
   */
  private matchesCondition(log: StreamedLog, condition: RetentionCondition): boolean {
    const value = this.getNestedValue(log, condition.field);

    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'ne':
        return value !== condition.value;
      case 'gt':
        return value > condition.value;
      case 'lt':
        return value < condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'matches':
        const regex = new RegExp(condition.value);
        return regex.test(String(value));
      default:
        return false;
    }
  }

  /**
   * Get retention cutoff date
   */
  private getRetentionCutoff(period: RetentionPeriod): Date {
    const now = new Date();

    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case 'forever':
        return new Date(0); // Keep forever
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Run cleanup job
   */
  async cleanup(): Promise<number> {
    const logsToDelete: string[] = [];

    for (const [logId, log] of Array.from(this.logs.entries())) {
      if (!this.shouldRetain(log)) {
        logsToDelete.push(logId);
      }
    }

    // Delete logs
    for (const logId of logsToDelete) {
      this.removeLog(logId);
    }

    this.stats.lastCleanup = new Date();
    this.emit('cleanup:completed', {
      deleted: logsToDelete.length,
      retained: this.logs.size,
    });

    return logsToDelete.length;
  }

  /**
   * Start automatic cleanup job
   */
  private startCleanupJob(intervalMs: number): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        this.emit('cleanup:error', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, intervalMs);
  }

  /**
   * Get retention statistics
   */
  getStats(): RetentionStats {
    return { ...this.stats };
  }

  /**
   * Update storage used
   */
  private updateStorageUsed(): void {
    let total = 0;
    for (const log of Array.from(this.logs.values())) {
      total += this.calculateLogSize(log);
    }
    this.stats.storageUsed = total;
  }

  /**
   * Calculate log size in bytes
   */
  private calculateLogSize(log: StreamedLog): number {
    return Buffer.byteLength(JSON.stringify(log), 'utf8');
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Shutdown retention manager
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.removeAllListeners();
  }
}

/**
 * Create default retention policies
 */
export function createDefaultPolicies(): RetentionPolicy[] {
  return [
    {
      id: 'default-errors',
      name: 'Error Logs - 90 Days',
      period: '90d',
      levels: ['error', 'fatal'],
      enabled: true,
      priority: 10,
    },
    {
      id: 'default-warnings',
      name: 'Warning Logs - 30 Days',
      period: '30d',
      levels: ['warn'],
      enabled: true,
      priority: 5,
    },
    {
      id: 'default-info',
      name: 'Info Logs - 7 Days',
      period: '7d',
      levels: ['info'],
      enabled: true,
      priority: 3,
    },
    {
      id: 'default-debug',
      name: 'Debug Logs - 7 Days',
      period: '7d',
      levels: ['debug', 'trace'],
      enabled: true,
      priority: 1,
    },
    {
      id: 'workflow-executions',
      name: 'Workflow Executions - 1 Year',
      period: '1y',
      categories: ['workflow'],
      enabled: true,
      priority: 15,
    },
    {
      id: 'security-audit',
      name: 'Security & Audit - Forever',
      period: 'forever',
      categories: ['security', 'audit'],
      enabled: true,
      priority: 20,
    },
  ];
}
