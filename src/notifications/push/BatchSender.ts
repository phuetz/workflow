/**
 * Batch Sender
 * Efficiently sends push notifications in batches
 */

import { EventEmitter } from 'events';
import { generateUUID } from '../../utils/uuid';
import {
  PushNotificationPayload,
  PushNotificationOptions,
  PushNotificationResult,
  PushNotificationBatch,
} from '../../types/push';

export interface BatchConfig {
  maxBatchSize: number;
  batchTimeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number;
}

export class BatchSender extends EventEmitter {
  private config: BatchConfig;
  private pendingBatches: Map<string, PushNotificationBatch>;
  private batchTimers: Map<string, NodeJS.Timeout>;

  constructor(config?: Partial<BatchConfig>) {
    super();
    this.config = {
      maxBatchSize: 500,
      batchTimeout: 5000, // 5 seconds
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };
    this.pendingBatches = new Map();
    this.batchTimers = new Map();
  }

  /**
   * Add notification to batch
   */
  async addToBatch(
    userId: string,
    payload: PushNotificationPayload,
    options: PushNotificationOptions = {}
  ): Promise<string> {
    // Use userId as batch key (can also group by other criteria)
    const batchKey = this.getBatchKey(userId, options);

    let batch = this.pendingBatches.get(batchKey);

    if (!batch) {
      batch = {
        id: generateUUID(),
        notifications: [],
        options,
        createdAt: new Date(),
        status: 'pending',
      };
      this.pendingBatches.set(batchKey, batch);

      // Set timeout to send batch
      this.setBatchTimeout(batchKey);
    }

    batch.notifications.push(payload);

    // If batch is full, send immediately
    if (batch.notifications.length >= this.config.maxBatchSize) {
      this.clearBatchTimeout(batchKey);
      await this.sendBatch(batchKey);
    }

    return batch.id;
  }

  /**
   * Get batch key for grouping
   */
  private getBatchKey(userId: string, options: PushNotificationOptions): string {
    // Group by userId and platform
    const platform = options.platforms?.join(',') || 'all';
    return `${userId}_${platform}`;
  }

  /**
   * Set timeout to send batch
   */
  private setBatchTimeout(batchKey: string): void {
    const timer = setTimeout(() => {
      this.sendBatch(batchKey);
    }, this.config.batchTimeout);

    this.batchTimers.set(batchKey, timer);
  }

  /**
   * Clear batch timeout
   */
  private clearBatchTimeout(batchKey: string): void {
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }
  }

  /**
   * Send batch
   */
  private async sendBatch(batchKey: string): Promise<void> {
    const batch = this.pendingBatches.get(batchKey);
    if (!batch || batch.notifications.length === 0) {
      return;
    }

    // Remove from pending
    this.pendingBatches.delete(batchKey);
    this.clearBatchTimeout(batchKey);

    // Update status
    batch.status = 'processing';

    try {
      this.emit('batch:sending', batch);
      // Actual sending is handled by the consumer of this event
      batch.status = 'completed';
      this.emit('batch:sent', batch);
    } catch (error) {
      batch.status = 'failed';
      this.emit('batch:failed', batch, error);
    }
  }

  /**
   * Flush all pending batches
   */
  async flushAll(): Promise<void> {
    const batchKeys = Array.from(this.pendingBatches.keys());

    for (const batchKey of batchKeys) {
      this.clearBatchTimeout(batchKey);
      await this.sendBatch(batchKey);
    }

    this.emit('flushed');
  }

  /**
   * Get pending batches
   */
  getPendingBatches(): PushNotificationBatch[] {
    return Array.from(this.pendingBatches.values());
  }

  /**
   * Get batch statistics
   */
  getStats(): {
    pendingBatches: number;
    totalNotifications: number;
    averageBatchSize: number;
  } {
    const batches = Array.from(this.pendingBatches.values());
    const totalNotifications = batches.reduce(
      (sum, batch) => sum + batch.notifications.length,
      0
    );

    return {
      pendingBatches: batches.length,
      totalNotifications,
      averageBatchSize: batches.length > 0 ? totalNotifications / batches.length : 0,
    };
  }

  /**
   * Clear all batches
   */
  clearAll(): void {
    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }

    this.pendingBatches.clear();
    this.batchTimers.clear();
    this.emit('cleared');
  }
}
