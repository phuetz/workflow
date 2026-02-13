/**
 * Error Handler - Handles error processing, DLQ, and checkpointing
 */

import { EventEmitter } from 'events';
import {
  IngestionRecord,
  DeadLetterRecord,
  Checkpoint,
  PipelineConfig,
  PipelineMetrics,
  CheckpointConfig,
  RetryPolicyConfig,
  DeadLetterQueueConfig,
} from './types';

export class ErrorHandler extends EventEmitter {
  // Dead letter queue storage
  private deadLetterRecords: Map<string, DeadLetterRecord[]> = new Map();

  // Checkpoint management
  private checkpoints: Map<string, Checkpoint[]> = new Map();
  private pendingRecords: Map<string, IngestionRecord[]> = new Map();
  private checkpointTimers: Map<string, NodeJS.Timeout> = new Map();

  // Configuration
  private readonly MAX_DEAD_LETTER_RECORDS = 10000;
  private readonly MAX_CHECKPOINTS = 100;

  /**
   * Initialize error handler for a pipeline
   */
  initialize(pipelineId: string): void {
    this.deadLetterRecords.set(pipelineId, []);
    this.checkpoints.set(pipelineId, []);
    this.pendingRecords.set(pipelineId, []);
  }

  /**
   * Add record to pending for exactly-once tracking
   */
  addPendingRecord(pipelineId: string, record: IngestionRecord): void {
    const pending = this.pendingRecords.get(pipelineId) || [];
    pending.push(record);
    this.pendingRecords.set(pipelineId, pending);
  }

  /**
   * Remove record from pending
   */
  removePendingRecord(pipelineId: string, recordId: string): void {
    const pending = this.pendingRecords.get(pipelineId) || [];
    const idx = pending.findIndex((r) => r.id === recordId);
    if (idx >= 0) {
      pending.splice(idx, 1);
      this.pendingRecords.set(pipelineId, pending);
    }
  }

  /**
   * Handle quality check failure
   */
  async handleQualityFailure(
    pipelineId: string,
    record: IngestionRecord,
    errors: any[],
    stage: string,
    dlqConfig: DeadLetterQueueConfig,
    metrics: PipelineMetrics | null
  ): Promise<void> {
    if (metrics) {
      metrics.recordsFailed++;
    }

    if (dlqConfig.enabled) {
      await this.sendToDeadLetterQueue(pipelineId, record, errors.join('; '), stage, metrics);
    }

    this.emit('record:failed', { pipelineId, record, errors, stage });
  }

  /**
   * Handle processing error with retry logic
   */
  async handleProcessingError(
    pipelineId: string,
    record: IngestionRecord,
    error: Error,
    retryPolicy: RetryPolicyConfig,
    dlqConfig: DeadLetterQueueConfig,
    metrics: PipelineMetrics | null,
    retryCallback: (records: IngestionRecord[]) => Promise<void>
  ): Promise<void> {
    if (metrics) {
      metrics.recordsFailed++;
      metrics.errorBreakdown[error.name] = (metrics.errorBreakdown[error.name] || 0) + 1;
    }

    // Check if error is retryable
    const retryable = retryPolicy.retryableErrors.some(
      (pattern) => error.message.includes(pattern) || error.name === pattern
    );

    if (retryable && dlqConfig.maxRetries > 0) {
      const dlqRecords = this.deadLetterRecords.get(pipelineId) || [];
      const existingDlq = dlqRecords.find((r) => r.originalRecord.id === record.id);

      if (!existingDlq || existingDlq.retryCount < dlqConfig.maxRetries) {
        // Retry with backoff
        const retryCount = existingDlq ? existingDlq.retryCount + 1 : 1;
        const delay = Math.min(
          retryPolicy.initialDelayMs *
            Math.pow(retryPolicy.backoffMultiplier, retryCount - 1),
          retryPolicy.maxDelayMs
        );

        setTimeout(async () => {
          await retryCallback([record]);
        }, delay);

        return;
      }
    }

    // Send to DLQ
    if (dlqConfig.enabled) {
      await this.sendToDeadLetterQueue(pipelineId, record, error.message, 'processing', metrics);
    }

    this.emit('record:error', { pipelineId, record, error: error.message });
  }

  /**
   * Send record to dead letter queue
   */
  async sendToDeadLetterQueue(
    pipelineId: string,
    record: IngestionRecord,
    error: string,
    stage: string,
    metrics: PipelineMetrics | null
  ): Promise<void> {
    const dlqRecords = this.deadLetterRecords.get(pipelineId) || [];

    const dlqRecord: DeadLetterRecord = {
      id: `dlq_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      originalRecord: record,
      error,
      errorType: stage,
      failedAt: new Date(),
      retryCount: 0,
      pipelineId,
      stageId: stage,
    };

    dlqRecords.push(dlqRecord);

    // Limit DLQ size
    if (dlqRecords.length > this.MAX_DEAD_LETTER_RECORDS) {
      dlqRecords.shift();
    }

    this.deadLetterRecords.set(pipelineId, dlqRecords);

    if (metrics) {
      metrics.recordsInDeadLetter++;
    }

    this.emit('dlq:record', { pipelineId, record: dlqRecord });
  }

  /**
   * Get dead letter records for a pipeline
   */
  getDeadLetterRecords(pipelineId: string): DeadLetterRecord[] {
    return this.deadLetterRecords.get(pipelineId) || [];
  }

  /**
   * Create a checkpoint
   */
  async createCheckpoint(
    pipelineId: string,
    pipeline: PipelineConfig,
    metrics: PipelineMetrics | null,
    getOffsets: () => Record<string, string>,
    getState: () => Record<string, any>
  ): Promise<Checkpoint> {
    const checkpoints = this.checkpoints.get(pipelineId) || [];

    const offsets = getOffsets();

    const checkpoint: Checkpoint = {
      id: `cp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      pipelineId,
      timestamp: new Date(),
      offsets,
      state: getState(),
      recordsProcessed: metrics?.recordsProcessed || 0,
      checksum: this.calculateChecksum(offsets),
    };

    checkpoints.push(checkpoint);

    // Limit checkpoint count
    if (checkpoints.length > this.MAX_CHECKPOINTS) {
      checkpoints.shift();
    }

    this.checkpoints.set(pipelineId, checkpoints);

    if (metrics) {
      metrics.checkpointCount++;
      metrics.lastCheckpoint = checkpoint.timestamp;
    }

    // Persist checkpoint if configured
    if (pipeline.checkpoint.storage.type !== 'memory') {
      await this.persistCheckpoint(checkpoint, pipeline.checkpoint.storage);
    }

    this.emit('checkpoint:created', { pipelineId, checkpoint });

    return checkpoint;
  }

  /**
   * Start periodic checkpoint timer
   */
  startCheckpointTimer(
    pipelineId: string,
    intervalMs: number,
    createCheckpointCallback: () => Promise<void>
  ): void {
    const timer = setInterval(async () => {
      await createCheckpointCallback();
    }, intervalMs);

    this.checkpointTimers.set(pipelineId, timer);
  }

  /**
   * Stop checkpoint timer
   */
  stopCheckpointTimer(pipelineId: string): void {
    const timer = this.checkpointTimers.get(pipelineId);
    if (timer) {
      clearInterval(timer);
      this.checkpointTimers.delete(pipelineId);
    }
  }

  /**
   * Get checkpoints for a pipeline
   */
  getCheckpoints(pipelineId: string): Checkpoint[] {
    return this.checkpoints.get(pipelineId) || [];
  }

  /**
   * Get latest checkpoint
   */
  getLatestCheckpoint(pipelineId: string): Checkpoint | null {
    const checkpoints = this.checkpoints.get(pipelineId) || [];
    return checkpoints.length > 0 ? checkpoints[checkpoints.length - 1] : null;
  }

  /**
   * Clean up resources for a pipeline
   */
  cleanup(pipelineId: string): void {
    this.stopCheckpointTimer(pipelineId);
    this.deadLetterRecords.delete(pipelineId);
    this.checkpoints.delete(pipelineId);
    this.pendingRecords.delete(pipelineId);
  }

  /**
   * Shutdown the error handler
   */
  shutdown(): void {
    this.checkpointTimers.forEach((timer) => {
      clearInterval(timer);
    });
    this.checkpointTimers.clear();
    this.deadLetterRecords.clear();
    this.checkpoints.clear();
    this.pendingRecords.clear();
  }

  private async persistCheckpoint(
    checkpoint: Checkpoint,
    storage: CheckpointConfig['storage']
  ): Promise<void> {
    // In production, this would write to the configured storage
    this.emit('checkpoint:persist', { checkpoint, storage });
  }

  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}
