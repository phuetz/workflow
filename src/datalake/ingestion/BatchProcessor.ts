/**
 * Batch Processor - Handles batch processing, backpressure, and auto-scaling
 */

import { EventEmitter } from 'events';
import {
  PipelineConfig,
  PipelineMetrics,
  IngestionRecord,
  BackpressureConfig,
  AutoScalingConfig,
} from './types';

export interface BackpressureState {
  paused: boolean;
  bufferLevel: number;
}

export class BatchProcessor extends EventEmitter {
  // Buffers for backpressure handling
  private buffers: Map<string, IngestionRecord[]> = new Map();
  private backpressureState: Map<string, BackpressureState> = new Map();

  // Scaling management
  private instanceCounts: Map<string, number> = new Map();
  private scalingCooldowns: Map<string, Date> = new Map();
  private throughputHistory: Map<string, number[]> = new Map();

  // Latency tracking
  private latencyHistory: Map<string, number[]> = new Map();

  // Configuration
  private readonly LATENCY_WINDOW_SIZE = 1000;
  private readonly THROUGHPUT_WINDOW_SIZE = 60;

  /**
   * Initialize batch processor for a pipeline
   */
  initialize(pipelineId: string, scaling: AutoScalingConfig): void {
    this.buffers.set(pipelineId, []);
    this.backpressureState.set(pipelineId, { paused: false, bufferLevel: 0 });
    this.instanceCounts.set(pipelineId, scaling.minInstances);
    this.throughputHistory.set(pipelineId, []);
    this.latencyHistory.set(pipelineId, []);
  }

  /**
   * Check if pipeline is paused due to backpressure
   */
  isPaused(pipelineId: string): boolean {
    return this.backpressureState.get(pipelineId)?.paused || false;
  }

  /**
   * Handle backpressure for a pipeline
   */
  handleBackpressure(
    pipelineId: string,
    config: BackpressureConfig,
    incomingCount: number,
    metrics: PipelineMetrics | null
  ): boolean {
    const state = this.backpressureState.get(pipelineId);
    if (!state) return true;

    const buffer = this.buffers.get(pipelineId) || [];
    const currentLevel = buffer.length + incomingCount;
    state.bufferLevel = currentLevel;

    // Check high watermark
    if (currentLevel >= config.thresholds.highWatermark) {
      if (metrics) {
        metrics.backpressureEvents++;
      }

      switch (config.strategy) {
        case 'drop':
          this.emit('backpressure:drop', { pipelineId, dropped: incomingCount });
          return false;

        case 'buffer':
          if (buffer.length < config.bufferSize) {
            return true;
          }
          this.emit('backpressure:overflow', { pipelineId });
          return false;

        case 'pause':
          state.paused = true;
          this.emit('backpressure:pause', { pipelineId });

          if (config.pauseTimeoutMs) {
            setTimeout(() => {
              state.paused = false;
              this.emit('backpressure:resume', { pipelineId });
            }, config.pauseTimeoutMs);
          }
          return false;

        case 'sample':
          const sampleRate = config.sampleRate || 0.5;
          if (Math.random() > sampleRate) {
            return false;
          }
          break;
      }
    }

    // Check low watermark for resume
    if (state.paused && currentLevel <= config.thresholds.lowWatermark) {
      state.paused = false;
      this.emit('backpressure:resume', { pipelineId });
    }

    return true;
  }

  /**
   * Get buffer for a pipeline
   */
  getBuffer(pipelineId: string): IngestionRecord[] {
    return this.buffers.get(pipelineId) || [];
  }

  /**
   * Add records to buffer
   */
  addToBuffer(pipelineId: string, records: IngestionRecord[]): void {
    const buffer = this.buffers.get(pipelineId) || [];
    buffer.push(...records);
    this.buffers.set(pipelineId, buffer);
  }

  /**
   * Clear buffer for a pipeline
   */
  clearBuffer(pipelineId: string): IngestionRecord[] {
    const buffer = this.buffers.get(pipelineId) || [];
    this.buffers.set(pipelineId, []);
    return buffer;
  }

  /**
   * Track latency for a record
   */
  trackLatency(pipelineId: string, latencyMs: number, metrics: PipelineMetrics | null): void {
    const history = this.latencyHistory.get(pipelineId) || [];
    history.push(latencyMs);

    if (history.length > this.LATENCY_WINDOW_SIZE) {
      history.shift();
    }

    this.latencyHistory.set(pipelineId, history);

    // Update metrics
    if (metrics && history.length > 0) {
      const sorted = [...history].sort((a, b) => a - b);
      metrics.avgLatencyMs = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      metrics.p95LatencyMs = sorted[Math.floor(sorted.length * 0.95)] || 0;
      metrics.p99LatencyMs = sorted[Math.floor(sorted.length * 0.99)] || 0;
    }
  }

  /**
   * Check and apply auto-scaling
   */
  checkAutoScaling(
    pipelineId: string,
    config: AutoScalingConfig,
    metrics: PipelineMetrics | null
  ): void {
    if (!config.enabled) return;

    const cooldown = this.scalingCooldowns.get(pipelineId);

    if (cooldown && Date.now() < cooldown.getTime()) {
      return; // In cooldown period
    }

    const currentInstances = this.instanceCounts.get(pipelineId) || config.minInstances;
    const throughput = this.calculateCurrentThroughput(pipelineId, metrics);

    // Track throughput history
    const history = this.throughputHistory.get(pipelineId) || [];
    history.push(throughput);
    if (history.length > this.THROUGHPUT_WINDOW_SIZE) {
      history.shift();
    }
    this.throughputHistory.set(pipelineId, history);

    // Calculate average throughput
    const avgThroughput = history.reduce((a, b) => a + b, 0) / history.length;

    // Scale up check
    if (
      avgThroughput > config.targetThroughput * config.scaleUpThreshold &&
      currentInstances < config.maxInstances
    ) {
      const newCount = Math.min(currentInstances + 1, config.maxInstances);
      this.instanceCounts.set(pipelineId, newCount);
      this.scalingCooldowns.set(pipelineId, new Date(Date.now() + config.cooldownPeriodMs));

      if (metrics?.scalingStats) {
        metrics.scalingStats.currentInstances = newCount;
        metrics.scalingStats.scaleUpEvents++;
      }

      this.emit('scaling:up', { pipelineId, from: currentInstances, to: newCount });
    }

    // Scale down check
    if (
      avgThroughput < config.targetThroughput * config.scaleDownThreshold &&
      currentInstances > config.minInstances
    ) {
      const newCount = Math.max(currentInstances - 1, config.minInstances);
      this.instanceCounts.set(pipelineId, newCount);
      this.scalingCooldowns.set(pipelineId, new Date(Date.now() + config.cooldownPeriodMs));

      if (metrics?.scalingStats) {
        metrics.scalingStats.currentInstances = newCount;
        metrics.scalingStats.scaleDownEvents++;
      }

      this.emit('scaling:down', { pipelineId, from: currentInstances, to: newCount });
    }
  }

  /**
   * Calculate current throughput for a pipeline
   */
  calculateCurrentThroughput(pipelineId: string, metrics: PipelineMetrics | null): number {
    if (!metrics) return 0;

    const elapsed = (Date.now() - metrics.startTime.getTime()) / 1000;
    return elapsed > 0 ? metrics.recordsProcessed / elapsed : 0;
  }

  /**
   * Get current instance count
   */
  getInstanceCount(pipelineId: string): number {
    return this.instanceCounts.get(pipelineId) || 1;
  }

  /**
   * Clean up resources for a pipeline
   */
  cleanup(pipelineId: string): void {
    this.buffers.delete(pipelineId);
    this.backpressureState.delete(pipelineId);
    this.instanceCounts.delete(pipelineId);
    this.scalingCooldowns.delete(pipelineId);
    this.throughputHistory.delete(pipelineId);
    this.latencyHistory.delete(pipelineId);
  }

  /**
   * Shutdown the batch processor
   */
  shutdown(): void {
    this.buffers.clear();
    this.backpressureState.clear();
    this.instanceCounts.clear();
    this.scalingCooldowns.clear();
    this.throughputHistory.clear();
    this.latencyHistory.clear();
  }
}
