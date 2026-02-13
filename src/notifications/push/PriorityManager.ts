/**
 * Priority Manager
 * Manages notification priority and scheduling
 */

import { EventEmitter } from 'events';
import { generateUUID } from '../../utils/uuid';
import {
  PushNotificationPayload,
  PushNotificationOptions,
  PushPriority,
} from '../../types/push';

export interface PriorityQueueItem {
  id: string;
  userId: string;
  payload: PushNotificationPayload;
  options: PushNotificationOptions;
  priority: number; // Numeric priority for queue ordering
  timestamp: Date;
  retries: number;
  maxRetries: number;
}

export class PriorityManager extends EventEmitter {
  private queues: Map<PushPriority, PriorityQueueItem[]>;
  private processing: boolean;
  private batchSize: number;
  private processingInterval: number;
  private intervalHandle?: NodeJS.Timeout;

  constructor(batchSize = 100, processingInterval = 1000) {
    super();
    this.queues = new Map([
      ['critical', []],
      ['high', []],
      ['normal', []],
      ['low', []],
    ]);
    this.processing = false;
    this.batchSize = batchSize;
    this.processingInterval = processingInterval;
  }

  /**
   * Start processing queue
   */
  start(): void {
    if (this.intervalHandle) {
      return;
    }

    this.processing = true;
    this.intervalHandle = setInterval(() => {
      this.processQueue();
    }, this.processingInterval);

    this.emit('started');
  }

  /**
   * Stop processing queue
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }

    this.processing = false;
    this.emit('stopped');
  }

  /**
   * Enqueue notification
   */
  async enqueue(
    userId: string,
    payload: PushNotificationPayload,
    options: PushNotificationOptions = {}
  ): Promise<string> {
    const priority = payload.priority || 'normal';
    const item: PriorityQueueItem = {
      id: generateUUID(),
      userId,
      payload,
      options,
      priority: this.getPriorityValue(priority),
      timestamp: new Date(),
      retries: 0,
      maxRetries: 3,
    };

    const queue = this.queues.get(priority);
    if (!queue) {
      throw new Error(`Invalid priority: ${priority}`);
    }

    queue.push(item);
    this.emit('enqueued', item);

    // Process immediately if critical
    if (priority === 'critical') {
      setImmediate(() => this.processCriticalQueue());
    }

    return item.id;
  }

  /**
   * Get numeric priority value
   */
  private getPriorityValue(priority: PushPriority): number {
    switch (priority) {
      case 'critical':
        return 4;
      case 'high':
        return 3;
      case 'normal':
        return 2;
      case 'low':
        return 1;
      default:
        return 2;
    }
  }

  /**
   * Process queue
   */
  private async processQueue(): Promise<void> {
    if (!this.processing) {
      return;
    }

    // Process in priority order: critical -> high -> normal -> low
    await this.processCriticalQueue();
    await this.processHighQueue();
    await this.processNormalQueue();
    await this.processLowQueue();
  }

  /**
   * Process critical queue (all items immediately)
   */
  private async processCriticalQueue(): Promise<void> {
    const queue = this.queues.get('critical')!;
    while (queue.length > 0) {
      const item = queue.shift()!;
      await this.processItem(item);
    }
  }

  /**
   * Process high priority queue
   */
  private async processHighQueue(): Promise<void> {
    const queue = this.queues.get('high')!;
    const batch = queue.splice(0, this.batchSize);

    for (const item of batch) {
      await this.processItem(item);
    }
  }

  /**
   * Process normal priority queue
   */
  private async processNormalQueue(): Promise<void> {
    const queue = this.queues.get('normal')!;
    const batch = queue.splice(0, Math.floor(this.batchSize / 2));

    for (const item of batch) {
      await this.processItem(item);
    }
  }

  /**
   * Process low priority queue
   */
  private async processLowQueue(): Promise<void> {
    const queue = this.queues.get('low')!;
    const batch = queue.splice(0, Math.floor(this.batchSize / 4));

    for (const item of batch) {
      await this.processItem(item);
    }
  }

  /**
   * Process single item
   */
  private async processItem(item: PriorityQueueItem): Promise<void> {
    try {
      this.emit('processing', item);
      // Actual sending is handled by the consumer of this event
    } catch (error) {
      this.emit('error', item, error);

      // Retry logic
      if (item.retries < item.maxRetries) {
        item.retries++;
        const priority = this.getItemPriority(item.priority);
        this.queues.get(priority)!.push(item);
        this.emit('retry', item);
      } else {
        this.emit('failed', item, error);
      }
    }
  }

  /**
   * Get priority name from value
   */
  private getItemPriority(value: number): PushPriority {
    switch (value) {
      case 4:
        return 'critical';
      case 3:
        return 'high';
      case 2:
        return 'normal';
      case 1:
        return 'low';
      default:
        return 'normal';
    }
  }

  /**
   * Get queue sizes
   */
  getQueueSizes(): Record<PushPriority, number> {
    return {
      critical: this.queues.get('critical')!.length,
      high: this.queues.get('high')!.length,
      normal: this.queues.get('normal')!.length,
      low: this.queues.get('low')!.length,
    };
  }

  /**
   * Get total queue size
   */
  getTotalQueueSize(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  /**
   * Clear all queues
   */
  clearAll(): void {
    for (const queue of this.queues.values()) {
      queue.length = 0;
    }
    this.emit('cleared');
  }

  /**
   * Get queue item by ID
   */
  getItem(id: string): PriorityQueueItem | null {
    for (const queue of this.queues.values()) {
      const item = queue.find(i => i.id === id);
      if (item) {
        return item;
      }
    }
    return null;
  }

  /**
   * Remove item from queue
   */
  removeItem(id: string): boolean {
    for (const queue of this.queues.values()) {
      const index = queue.findIndex(i => i.id === id);
      if (index !== -1) {
        queue.splice(index, 1);
        this.emit('removed', id);
        return true;
      }
    }
    return false;
  }
}
