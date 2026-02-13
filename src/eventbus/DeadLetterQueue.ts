/**
 * Dead Letter Queue
 * Handles failed event deliveries
 */

import { DomainEvent } from '../eventsourcing/types/eventsourcing';
import { logger } from '../services/SimpleLogger';

/**
 * Dead Letter Entry
 */
export interface DeadLetterEntry {
  /** Entry ID */
  id: string;

  /** Original event */
  event: DomainEvent;

  /** Failure reason */
  reason: string;

  /** Number of delivery attempts */
  attempts: number;

  /** First failure timestamp */
  firstFailure: Date;

  /** Last failure timestamp */
  lastFailure: Date;

  /** Stack trace if available */
  stackTrace?: string;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Dead Letter Queue Configuration
 */
export interface DeadLetterQueueConfig {
  /** Max entries to keep */
  maxEntries: number;

  /** Retention period in days */
  retentionDays: number;

  /** Enable automatic cleanup */
  enableAutoCleanup: boolean;

  /** Cleanup interval in milliseconds */
  cleanupIntervalMs: number;
}

/**
 * Dead Letter Queue Implementation
 */
export class DeadLetterQueue {
  private entries: Map<string, DeadLetterEntry> = new Map();
  private config: DeadLetterQueueConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config?: Partial<DeadLetterQueueConfig>) {
    this.config = {
      maxEntries: config?.maxEntries || 10000,
      retentionDays: config?.retentionDays || 30,
      enableAutoCleanup: config?.enableAutoCleanup !== false,
      cleanupIntervalMs: config?.cleanupIntervalMs || 3600000, // 1 hour
    };

    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Add event to dead letter queue
   */
  add(
    event: DomainEvent,
    reason: string,
    attempts: number,
    stackTrace?: string,
    metadata?: Record<string, unknown>
  ): void {
    const id = `dlq_${event.id}_${Date.now()}`;
    const now = new Date();

    const entry: DeadLetterEntry = {
      id,
      event,
      reason,
      attempts,
      firstFailure: now,
      lastFailure: now,
      stackTrace,
      metadata,
    };

    // Check if already exists (update)
    const existing = this.findByEventId(event.id);
    if (existing) {
      existing.attempts = attempts;
      existing.lastFailure = now;
      existing.reason = reason;
      if (stackTrace) existing.stackTrace = stackTrace;
      return;
    }

    this.entries.set(id, entry);

    // Enforce max entries
    if (this.entries.size > this.config.maxEntries) {
      this.removeOldestEntry();
    }
  }

  /**
   * Get entry by ID
   */
  get(id: string): DeadLetterEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Find entry by event ID
   */
  findByEventId(eventId: string): DeadLetterEntry | undefined {
    for (const entry of this.entries.values()) {
      if (entry.event.id === eventId) {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * Get all entries
   */
  getAll(): DeadLetterEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Get entries by event type
   */
  getByEventType(eventType: string): DeadLetterEntry[] {
    return Array.from(this.entries.values()).filter(
      (e) => e.event.eventType === eventType
    );
  }

  /**
   * Get entries by aggregate
   */
  getByAggregate(aggregateId: string, aggregateType: string): DeadLetterEntry[] {
    return Array.from(this.entries.values()).filter(
      (e) =>
        e.event.aggregateId === aggregateId &&
        e.event.aggregateType === aggregateType
    );
  }

  /**
   * Retry event
   */
  async retry(
    id: string,
    handler: (event: DomainEvent) => Promise<void>
  ): Promise<boolean> {
    const entry = this.entries.get(id);
    if (!entry) {
      return false;
    }

    try {
      await handler(entry.event);
      // Success - remove from DLQ
      this.entries.delete(id);
      return true;
    } catch (error) {
      // Failed again - update entry
      entry.attempts++;
      entry.lastFailure = new Date();
      entry.reason = error instanceof Error ? error.message : 'Unknown error';
      if (error instanceof Error && error.stack) {
        entry.stackTrace = error.stack;
      }
      return false;
    }
  }

  /**
   * Retry all events
   */
  async retryAll(
    handler: (event: DomainEvent) => Promise<void>
  ): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    const entries = Array.from(this.entries.values());

    for (const entry of entries) {
      const success = await this.retry(entry.id, handler);
      if (success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    return { succeeded, failed };
  }

  /**
   * Remove entry
   */
  remove(id: string): boolean {
    return this.entries.delete(id);
  }

  /**
   * Remove oldest entry
   */
  private removeOldestEntry(): void {
    let oldest: DeadLetterEntry | null = null;
    let oldestId: string | null = null;

    for (const [id, entry] of this.entries) {
      if (!oldest || entry.firstFailure < oldest.firstFailure) {
        oldest = entry;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.entries.delete(oldestId);
    }
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Cleanup old entries
   */
  cleanup(): number {
    const now = new Date();
    const cutoffDate = new Date(
      now.getTime() - this.config.retentionDays * 24 * 60 * 60 * 1000
    );

    let removed = 0;

    for (const [id, entry] of this.entries) {
      if (entry.firstFailure < cutoffDate) {
        this.entries.delete(id);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Start automatic cleanup
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const removed = this.cleanup();
      if (removed > 0) {
        logger.debug(`DLQ: Cleaned up ${removed} old entries`);
      }
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalEntries: number;
    byEventType: Record<string, number>;
    byAggregateType: Record<string, number>;
    avgAttempts: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const entries = Array.from(this.entries.values());

    const byEventType: Record<string, number> = {};
    const byAggregateType: Record<string, number> = {};
    let totalAttempts = 0;

    for (const entry of entries) {
      byEventType[entry.event.eventType] =
        (byEventType[entry.event.eventType] || 0) + 1;
      byAggregateType[entry.event.aggregateType] =
        (byAggregateType[entry.event.aggregateType] || 0) + 1;
      totalAttempts += entry.attempts;
    }

    const timestamps = entries.map((e) => e.firstFailure);

    return {
      totalEntries: entries.length,
      byEventType,
      byAggregateType,
      avgAttempts: entries.length > 0 ? totalAttempts / entries.length : 0,
      oldestEntry:
        timestamps.length > 0
          ? new Date(Math.min(...timestamps.map((t) => t.getTime())))
          : undefined,
      newestEntry:
        timestamps.length > 0
          ? new Date(Math.max(...timestamps.map((t) => t.getTime())))
          : undefined,
    };
  }

  /**
   * Get size
   */
  size(): number {
    return this.entries.size;
  }

  /**
   * Export entries (for analysis/debugging)
   */
  export(): DeadLetterEntry[] {
    return Array.from(this.entries.values());
  }
}

/**
 * Global dead letter queue instance
 */
export const deadLetterQueue = new DeadLetterQueue({
  maxEntries: 10000,
  retentionDays: 30,
  enableAutoCleanup: true,
});
