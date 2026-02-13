/**
 * Backpressure Handler
 *
 * Flow control and backpressure management:
 * - Multiple strategies (drop, buffer, block, sample)
 * - Consumer lag monitoring
 * - Auto-scaling triggers
 * - Circuit breaker for slow consumers
 * - Buffer management with overflow handling
 */

import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';
import type {
  StreamEvent,
  BackpressureConfig,
  BackpressureMetrics,
  AutoScalingConfig,
} from '../types/streaming';

export class BackpressureHandler extends EventEmitter {
  private config: BackpressureConfig;
  private buffer: StreamEvent[] = [];
  private droppedCount = 0;
  private processedCount = 0;
  private lastProcessedTimestamp = Date.now();
  private consumerInstances = 1;
  private circuitOpen = false;
  private lagHistory: number[] = [];

  constructor(config: BackpressureConfig) {
    super();
    this.config = config;

    if (config.autoScaling?.enabled) {
      this.startAutoScaling();
    }
  }

  /**
   * Handle incoming events with backpressure control
   */
  async handleEvents(events: StreamEvent[]): Promise<StreamEvent[]> {
    const currentLag = this.calculateLag();

    // Check if circuit breaker should open
    if (this.shouldOpenCircuit(currentLag)) {
      this.openCircuit();
      return [];
    }

    // Apply backpressure strategy
    switch (this.config.strategy) {
      case 'drop':
        return this.dropStrategy(events);

      case 'buffer':
        return this.bufferStrategy(events);

      case 'block':
        return this.blockStrategy(events);

      case 'sample':
        return this.sampleStrategy(events);

      default:
        return events;
    }
  }

  /**
   * Get current backpressure metrics
   */
  getMetrics(): BackpressureMetrics {
    return {
      currentLag: this.calculateLag(),
      bufferUtilization: this.buffer.length / (this.config.bufferSize || 1000),
      droppedEvents: this.droppedCount,
      throughput: this.calculateThroughput(),
      consumerInstances: this.consumerInstances,
    };
  }

  /**
   * Manually trigger scaling
   */
  async scaleConsumers(delta: number): Promise<void> {
    const newCount = Math.max(
      this.config.autoScaling?.minInstances || 1,
      Math.min(
        this.config.autoScaling?.maxInstances || 10,
        this.consumerInstances + delta
      )
    );

    if (newCount !== this.consumerInstances) {
      this.consumerInstances = newCount;
      this.emit('scaling', {
        from: this.consumerInstances - delta,
        to: newCount,
        reason: 'manual',
      });
    }
  }

  /**
   * Reset circuit breaker
   */
  resetCircuit(): void {
    this.circuitOpen = false;
    this.emit('circuit-closed');
  }

  /**
   * Clear buffer
   */
  clearBuffer(): void {
    const droppedFromClear = this.buffer.length;
    this.buffer = [];
    this.droppedCount += droppedFromClear;
    this.emit('buffer-cleared', { dropped: droppedFromClear });
  }

  // ============================================================================
  // Backpressure Strategies
  // ============================================================================

  private dropStrategy(events: StreamEvent[]): StreamEvent[] {
    const bufferSize = this.config.bufferSize || 1000;

    if (this.buffer.length + events.length > bufferSize) {
      // Drop oldest events or new events based on configuration
      const toDrop = this.buffer.length + events.length - bufferSize;
      this.droppedCount += toDrop;

      // Drop oldest events from buffer
      this.buffer.splice(0, toDrop);

      this.emit('events-dropped', {
        count: toDrop,
        reason: 'buffer-overflow',
      });
    }

    this.buffer.push(...events);
    return this.drainBuffer();
  }

  private bufferStrategy(events: StreamEvent[]): StreamEvent[] {
    const bufferSize = this.config.bufferSize || 1000;

    if (this.buffer.length + events.length > bufferSize) {
      // Buffer is full, apply backpressure
      this.emit('backpressure-applied', {
        bufferSize: this.buffer.length,
        incomingCount: events.length,
      });

      // Only accept what fits
      const available = bufferSize - this.buffer.length;
      this.buffer.push(...events.slice(0, available));
      this.droppedCount += events.length - available;

      return [];
    }

    this.buffer.push(...events);
    return this.drainBuffer();
  }

  private async blockStrategy(events: StreamEvent[]): Promise<StreamEvent[]> {
    const bufferSize = this.config.bufferSize || 1000;

    // Wait until buffer has space
    while (this.buffer.length >= bufferSize) {
      this.emit('blocking', {
        bufferSize: this.buffer.length,
        maxSize: bufferSize,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.buffer.push(...events);
    return this.drainBuffer();
  }

  private sampleStrategy(events: StreamEvent[]): StreamEvent[] {
    const samplingRate = this.config.samplingRate || 0.1; // 10% default

    // Randomly sample events
    const sampled = events.filter(() => Math.random() < samplingRate);

    this.droppedCount += events.length - sampled.length;

    if (sampled.length < events.length) {
      this.emit('events-sampled', {
        original: events.length,
        sampled: sampled.length,
        rate: samplingRate,
      });
    }

    this.buffer.push(...sampled);
    return this.drainBuffer();
  }

  private drainBuffer(): StreamEvent[] {
    if (this.buffer.length === 0) {
      return [];
    }

    // Drain based on consumer capacity
    const batchSize = Math.min(100, this.buffer.length);
    const drained = this.buffer.splice(0, batchSize);

    this.processedCount += drained.length;
    this.lastProcessedTimestamp = Date.now();

    return drained;
  }

  // ============================================================================
  // Circuit Breaker
  // ============================================================================

  private shouldOpenCircuit(lag: number): boolean {
    const maxLag = this.config.maxLag || 60000; // 60 seconds default
    return lag > maxLag && !this.circuitOpen;
  }

  private openCircuit(): void {
    this.circuitOpen = true;
    this.emit('circuit-opened', {
      lag: this.calculateLag(),
      bufferSize: this.buffer.length,
    });

    // Auto-close circuit after cooldown
    setTimeout(() => {
      this.resetCircuit();
    }, 30000); // 30 seconds cooldown
  }

  // ============================================================================
  // Auto-Scaling
  // ============================================================================

  private startAutoScaling(): void {
    setInterval(() => {
      this.evaluateScaling();
    }, this.config.autoScaling?.cooldownPeriod || 60000);
  }

  private evaluateScaling(): void {
    const autoScaling = this.config.autoScaling;
    if (!autoScaling?.enabled) return;

    const lag = this.calculateLag();
    this.lagHistory.push(lag);

    if (this.lagHistory.length > 10) {
      this.lagHistory.shift();
    }

    // Calculate average lag
    const avgLag = this.lagHistory.reduce((a, b) => a + b, 0) / this.lagHistory.length;

    // Scale up if lag is consistently high
    if (avgLag > autoScaling.scaleUpThreshold) {
      this.scaleConsumers(1);
      this.emit('auto-scaled', {
        direction: 'up',
        instances: this.consumerInstances,
        avgLag,
      });
    }

    // Scale down if lag is consistently low
    if (avgLag < autoScaling.scaleDownThreshold) {
      this.scaleConsumers(-1);
      this.emit('auto-scaled', {
        direction: 'down',
        instances: this.consumerInstances,
        avgLag,
      });
    }
  }

  // ============================================================================
  // Metrics Calculation
  // ============================================================================

  private calculateLag(): number {
    if (this.buffer.length === 0) {
      return 0;
    }

    const oldestEvent = this.buffer[0];
    return Date.now() - oldestEvent.timestamp;
  }

  private calculateThroughput(): number {
    const timeWindow = Date.now() - this.lastProcessedTimestamp;
    if (timeWindow === 0) return 0;

    return (this.processedCount * 1000) / timeWindow; // events per second
  }
}

// ============================================================================
// Flow Control Manager
// ============================================================================

export class FlowControlManager {
  private handlers = new Map<string, BackpressureHandler>();

  /**
   * Create a backpressure handler for a stream
   */
  createHandler(streamId: string, config: BackpressureConfig): BackpressureHandler {
    const handler = new BackpressureHandler(config);
    this.handlers.set(streamId, handler);

    handler.on('circuit-opened', (data) => {
      logger.warn(`Circuit opened for stream ${streamId}:`, data);
    });

    handler.on('events-dropped', (data) => {
      logger.warn(`Events dropped for stream ${streamId}:`, data);
    });

    return handler;
  }

  /**
   * Get handler for stream
   */
  getHandler(streamId: string): BackpressureHandler | undefined {
    return this.handlers.get(streamId);
  }

  /**
   * Get metrics for all streams
   */
  getAllMetrics(): Map<string, BackpressureMetrics> {
    const metrics = new Map<string, BackpressureMetrics>();

    for (const [streamId, handler] of this.handlers) {
      metrics.set(streamId, handler.getMetrics());
    }

    return metrics;
  }

  /**
   * Remove handler
   */
  removeHandler(streamId: string): void {
    const handler = this.handlers.get(streamId);
    if (handler) {
      handler.removeAllListeners();
      this.handlers.delete(streamId);
    }
  }
}
