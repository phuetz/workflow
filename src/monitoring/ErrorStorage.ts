/**
 * ErrorStorage.ts
 * Persistent error database with efficient querying and retention
 */

import type { ErrorEvent, ErrorType, ErrorSeverity } from './ErrorMonitoringSystem';
import { logger } from '../services/SimpleLogger';

export interface StorageConfig {
  maxErrors: number;
  retentionDays: number;
  persistToFile?: boolean;
  filePath?: string;
}

export interface QueryOptions {
  startDate?: Date;
  endDate?: Date;
  type?: ErrorType;
  severity?: ErrorSeverity;
  workflowId?: string;
  userId?: string;
  resolved?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export interface RecentErrorsOptions {
  minutes?: number;
  severity?: ErrorSeverity;
  type?: ErrorType;
  limit?: number;
}

export interface StorageStats {
  totalErrors: number;
  resolvedErrors: number;
  unresolvedErrors: number;
  oldestError?: Date;
  newestError?: Date;
  storageSize: number; // bytes
  averageErrorSize: number;
}

export class ErrorStorage {
  private errors: Map<string, ErrorEvent> = new Map();
  private indices: {
    byTimestamp: ErrorEvent[];
    byFingerprint: Map<string, ErrorEvent[]>;
    bySeverity: Map<ErrorSeverity, ErrorEvent[]>;
    byType: Map<ErrorType, ErrorEvent[]>;
    byWorkflow: Map<string, ErrorEvent[]>;
    byUser: Map<string, ErrorEvent[]>;
  };
  private config: StorageConfig;
  private saveTimer?: NodeJS.Timeout;

  constructor(config: StorageConfig) {
    this.config = config;
    this.indices = {
      byTimestamp: [],
      byFingerprint: new Map(),
      bySeverity: new Map(),
      byType: new Map(),
      byWorkflow: new Map(),
      byUser: new Map(),
    };

    // Load from persistent storage if enabled
    if (this.config.persistToFile) {
      this.loadFromDisk();
    }

    // Setup periodic save
    if (this.config.persistToFile) {
      this.saveTimer = setInterval(() => {
        this.saveToDisk();
      }, 60000); // Save every minute
    }
  }

  /**
   * Store multiple errors
   */
  public async storeErrors(errors: ErrorEvent[]): Promise<void> {
    errors.forEach(error => {
      this.storeError(error);
    });
  }

  /**
   * Store a single error
   */
  public storeError(error: ErrorEvent): void {
    // Check if we've exceeded max errors
    if (this.errors.size >= this.config.maxErrors) {
      this.evictOldest();
    }

    // Store the error
    this.errors.set(error.id, error);

    // Update indices
    this.updateIndices(error);
  }

  /**
   * Get errors with filtering and pagination
   */
  public async getErrors(options: QueryOptions = {}): Promise<ErrorEvent[]> {
    let results = Array.from(this.errors.values());

    // Apply filters
    if (options.startDate) {
      results = results.filter(e => e.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      results = results.filter(e => e.timestamp <= options.endDate!);
    }

    if (options.type) {
      results = results.filter(e => e.type === options.type);
    }

    if (options.severity) {
      results = results.filter(e => e.severity === options.severity);
    }

    if (options.workflowId) {
      results = results.filter(e => e.context.workflowId === options.workflowId);
    }

    if (options.userId) {
      results = results.filter(e => e.context.userId === options.userId);
    }

    if (options.resolved !== undefined) {
      results = results.filter(e => e.resolved === options.resolved);
    }

    // Sort
    const sortBy = options.sortBy || 'timestamp';
    const sortOrder = options.sortOrder || 'desc';

    results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
          break;
        case 'severity':
          comparison = this.severityToNumber(a.severity) - this.severityToNumber(b.severity);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Paginate
    if (options.offset !== undefined) {
      results = results.slice(options.offset);
    }

    if (options.limit !== undefined) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get recent errors
   */
  public async getRecentErrors(options: RecentErrorsOptions = {}): Promise<ErrorEvent[]> {
    const minutes = options.minutes || 60;
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);

    let errors = this.indices.byTimestamp.filter(e => e.timestamp >= cutoff);

    if (options.severity) {
      errors = errors.filter(e => e.severity === options.severity);
    }

    if (options.type) {
      errors = errors.filter(e => e.type === options.type);
    }

    if (options.limit) {
      errors = errors.slice(0, options.limit);
    }

    return errors;
  }

  /**
   * Get error by ID
   */
  public async getError(id: string): Promise<ErrorEvent | null> {
    return this.errors.get(id) || null;
  }

  /**
   * Get errors by fingerprint (duplicate detection)
   */
  public async getErrorsByFingerprint(fingerprint: string): Promise<ErrorEvent[]> {
    return this.indices.byFingerprint.get(fingerprint) || [];
  }

  /**
   * Update error
   */
  public async updateError(
    id: string,
    updates: Partial<ErrorEvent>
  ): Promise<ErrorEvent | null> {
    const error = this.errors.get(id);
    if (!error) return null;

    const updated = { ...error, ...updates };
    this.errors.set(id, updated);

    // Update indices if needed
    if (updates.severity || updates.type || updates.resolved) {
      this.rebuildIndices();
    }

    return updated;
  }

  /**
   * Delete error
   */
  public async deleteError(id: string): Promise<boolean> {
    const deleted = this.errors.delete(id);
    if (deleted) {
      this.rebuildIndices();
    }
    return deleted;
  }

  /**
   * Cleanup old errors based on retention policy
   */
  public async cleanup(): Promise<number> {
    const cutoff = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    let deleted = 0;

    Array.from(this.errors.entries()).forEach(([id, error]) => {
      if (error.timestamp < cutoff) {
        this.errors.delete(id);
        deleted++;
      }
    });

    if (deleted > 0) {
      this.rebuildIndices();
    }

    return deleted;
  }

  /**
   * Get storage statistics
   */
  public getStats(): StorageStats {
    const errors = Array.from(this.errors.values());
    const resolved = errors.filter(e => e.resolved).length;

    // Calculate storage size (approximate)
    const storageSize = errors.reduce((total, error) => {
      return total + JSON.stringify(error).length * 2; // Rough estimate
    }, 0);

    return {
      totalErrors: errors.length,
      resolvedErrors: resolved,
      unresolvedErrors: errors.length - resolved,
      oldestError: errors.length > 0 ? new Date(Math.min(...errors.map(e => e.timestamp.getTime()))) : undefined,
      newestError: errors.length > 0 ? new Date(Math.max(...errors.map(e => e.timestamp.getTime()))) : undefined,
      storageSize,
      averageErrorSize: errors.length > 0 ? storageSize / errors.length : 0,
    };
  }

  /**
   * Clear all errors
   */
  public async clear(): Promise<void> {
    this.errors.clear();
    this.rebuildIndices();
  }

  /**
   * Export errors to JSON
   */
  public async exportToJSON(): Promise<string> {
    const errors = Array.from(this.errors.values());
    return JSON.stringify(errors, null, 2);
  }

  /**
   * Import errors from JSON
   */
  public async importFromJSON(json: string): Promise<number> {
    try {
      const errors = JSON.parse(json) as ErrorEvent[];
      let imported = 0;

      errors.forEach(error => {
        // Convert date strings back to Date objects
        error.timestamp = new Date(error.timestamp);
        error.context.timestamp = new Date(error.context.timestamp);

        this.storeError(error);
        imported++;
      });

      return imported;
    } catch (error) {
      logger.error('Failed to import errors', { component: 'ErrorStorage', error });
      return 0;
    }
  }

  /**
   * Close storage and cleanup
   */
  public async close(): Promise<void> {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }

    if (this.config.persistToFile) {
      await this.saveToDisk();
    }
  }

  /**
   * Private methods
   */
  private updateIndices(error: ErrorEvent): void {
    // Timestamp index (keep sorted)
    const insertIndex = this.binarySearch(this.indices.byTimestamp, error.timestamp);
    this.indices.byTimestamp.splice(insertIndex, 0, error);

    // Fingerprint index
    const fingerprintErrors = this.indices.byFingerprint.get(error.fingerprint) || [];
    fingerprintErrors.push(error);
    this.indices.byFingerprint.set(error.fingerprint, fingerprintErrors);

    // Severity index
    const severityErrors = this.indices.bySeverity.get(error.severity) || [];
    severityErrors.push(error);
    this.indices.bySeverity.set(error.severity, severityErrors);

    // Type index
    const typeErrors = this.indices.byType.get(error.type) || [];
    typeErrors.push(error);
    this.indices.byType.set(error.type, typeErrors);

    // Workflow index
    if (error.context.workflowId) {
      const workflowErrors = this.indices.byWorkflow.get(error.context.workflowId) || [];
      workflowErrors.push(error);
      this.indices.byWorkflow.set(error.context.workflowId, workflowErrors);
    }

    // User index
    if (error.context.userId) {
      const userErrors = this.indices.byUser.get(error.context.userId) || [];
      userErrors.push(error);
      this.indices.byUser.set(error.context.userId, userErrors);
    }
  }

  private rebuildIndices(): void {
    // Clear all indices
    this.indices.byTimestamp = [];
    this.indices.byFingerprint.clear();
    this.indices.bySeverity.clear();
    this.indices.byType.clear();
    this.indices.byWorkflow.clear();
    this.indices.byUser.clear();

    // Rebuild from current errors
    Array.from(this.errors.values()).forEach(error => {
      this.updateIndices(error);
    });
  }

  private evictOldest(): void {
    // Find and remove oldest error
    if (this.indices.byTimestamp.length > 0) {
      const oldest = this.indices.byTimestamp[0];
      this.errors.delete(oldest.id);
      this.rebuildIndices();
    }
  }

  private binarySearch(arr: ErrorEvent[], timestamp: Date): number {
    let left = 0;
    let right = arr.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (arr[mid].timestamp.getTime() > timestamp.getTime()) {
        right = mid;
      } else {
        left = mid + 1;
      }
    }

    return left;
  }

  private severityToNumber(severity: ErrorSeverity): number {
    const map: Record<ErrorSeverity, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };
    return map[severity];
  }

  private async saveToDisk(): Promise<void> {
    if (!this.config.persistToFile || !this.config.filePath) return;

    try {
      const json = await this.exportToJSON();

      // Use Node.js fs if available
      if (typeof require !== 'undefined') {
        const fs = await import('fs');
        await fs.promises.writeFile(this.config.filePath, json, 'utf-8');
      } else if (typeof localStorage !== 'undefined') {
        // Fallback to localStorage in browser
        localStorage.setItem('error_storage', json);
      }
    } catch (error) {
      logger.error('Failed to save errors to disk', { component: 'ErrorStorage', error });
    }
  }

  private async loadFromDisk(): Promise<void> {
    if (!this.config.persistToFile) return;

    try {
      let json: string | null = null;

      // Try Node.js fs
      if (typeof require !== 'undefined' && this.config.filePath) {
        try {
          const fs = await import('fs');
          json = await fs.promises.readFile(this.config.filePath, 'utf-8');
        } catch {
          // File doesn't exist or can't be read
        }
      } else if (typeof localStorage !== 'undefined') {
        // Try localStorage in browser
        json = localStorage.getItem('error_storage');
      }

      if (json) {
        await this.importFromJSON(json);
      }
    } catch (error) {
      logger.error('Failed to load errors from disk', { component: 'ErrorStorage', error });
    }
  }
}

export default ErrorStorage;
