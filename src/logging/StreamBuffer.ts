/**
 * Stream Buffer
 * Buffering and batching logic for log streaming
 */

import { EventEmitter } from 'events';
import { StreamedLog } from './LogStreamer';

export interface StreamBufferConfig {
  maxSize: number;
  flushInterval: number;
  onFlush: (logs: StreamedLog[]) => Promise<void>;
  onOverflow?: (log: StreamedLog) => void;
  overflowStrategy?: 'drop-oldest' | 'drop-newest' | 'block';
}

export interface BufferStats {
  size: number;
  maxSize: number;
  utilization: number;
  totalAdded: number;
  totalFlushed: number;
  totalDropped: number;
  lastFlush?: Date;
  flushCount: number;
}

export class StreamBuffer extends EventEmitter {
  private buffer: StreamedLog[] = [];
  private config: StreamBufferConfig;
  private flushTimer?: NodeJS.Timeout;
  private flushing = false;
  private stats: BufferStats;

  constructor(config: StreamBufferConfig) {
    super();
    this.config = {
      overflowStrategy: 'drop-oldest',
      ...config
    };

    this.stats = {
      size: 0,
      maxSize: config.maxSize,
      utilization: 0,
      totalAdded: 0,
      totalFlushed: 0,
      totalDropped: 0,
      flushCount: 0
    };

    this.startFlushTimer();
  }

  /**
   * Add log to buffer
   */
  async add(log: StreamedLog): Promise<void> {
    // Check if buffer is full
    if (this.buffer.length >= this.config.maxSize) {
      this.handleOverflow(log);
      return;
    }

    this.buffer.push(log);
    this.stats.size = this.buffer.length;
    this.stats.totalAdded++;
    this.updateUtilization();

    this.emit('log:added', { size: this.buffer.length, utilization: this.stats.utilization });

    // Auto-flush if buffer is full
    if (this.buffer.length >= this.config.maxSize) {
      await this.flush();
    }
  }

  /**
   * Flush buffer
   */
  async flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) {
      return;
    }

    this.flushing = true;

    try {
      const logs = [...this.buffer];
      this.buffer = [];
      this.stats.size = 0;
      this.updateUtilization();

      await this.config.onFlush(logs);

      this.stats.totalFlushed += logs.length;
      this.stats.lastFlush = new Date();
      this.stats.flushCount++;

      this.emit('buffer:flushed', {
        count: logs.length,
        totalFlushed: this.stats.totalFlushed
      });

    } catch (error) {
      this.emit('buffer:flush-error', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      this.flushing = false;
    }
  }

  /**
   * Handle buffer overflow
   */
  private handleOverflow(log: StreamedLog): void {
    switch (this.config.overflowStrategy) {
      case 'drop-oldest':
        const dropped = this.buffer.shift();
        this.buffer.push(log);
        this.stats.totalDropped++;
        this.emit('buffer:overflow', { strategy: 'drop-oldest', dropped });
        if (this.config.onOverflow && dropped) {
          this.config.onOverflow(dropped);
        }
        break;

      case 'drop-newest':
        this.stats.totalDropped++;
        this.emit('buffer:overflow', { strategy: 'drop-newest', dropped: log });
        if (this.config.onOverflow) {
          this.config.onOverflow(log);
        }
        break;

      case 'block':
        // In blocking mode, we wait for flush
        this.emit('buffer:full', { size: this.buffer.length });
        break;
    }
  }

  /**
   * Start auto-flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush().catch(error => {
          this.emit('timer:flush-error', {
            error: error instanceof Error ? error.message : String(error)
          });
        });
      }
    }, this.config.flushInterval);
  }

  /**
   * Update buffer utilization
   */
  private updateUtilization(): void {
    this.stats.utilization = (this.buffer.length / this.config.maxSize) * 100;
  }

  /**
   * Get current size
   */
  getSize(): number {
    return this.buffer.length;
  }

  /**
   * Get utilization percentage
   */
  getUtilization(): number {
    return this.stats.utilization;
  }

  /**
   * Get buffer statistics
   */
  getStats(): BufferStats {
    return { ...this.stats };
  }

  /**
   * Is buffer full
   */
  isFull(): boolean {
    return this.buffer.length >= this.config.maxSize;
  }

  /**
   * Is buffer empty
   */
  isEmpty(): boolean {
    return this.buffer.length === 0;
  }

  /**
   * Clear buffer
   */
  clear(): void {
    const dropped = this.buffer.length;
    this.buffer = [];
    this.stats.size = 0;
    this.stats.totalDropped += dropped;
    this.updateUtilization();
    this.emit('buffer:cleared', { dropped });
  }

  /**
   * Shutdown buffer
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Final flush
    if (this.buffer.length > 0) {
      await this.flush();
    }

    this.removeAllListeners();
  }
}
