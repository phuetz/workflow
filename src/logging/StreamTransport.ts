/**
 * Stream Transport Abstraction Layer
 * Base interface for all log streaming transports
 */

import { EventEmitter } from 'events';
import { StreamedLog } from './LogStreamer';

export type TransportStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

export interface TransportConfig {
  [key: string]: any;
}

export interface TransportMetrics {
  bytesTransferred: number;
  logsTransferred: number;
  errors: number;
  lastTransferAt?: Date;
  avgTransferTime: number;
}

export abstract class StreamTransport extends EventEmitter {
  protected status: TransportStatus = 'disconnected';
  protected metrics: TransportMetrics = {
    bytesTransferred: 0,
    logsTransferred: 0,
    errors: 0,
    avgTransferTime: 0
  };

  protected config: TransportConfig;

  constructor(config: TransportConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to transport
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from transport
   */
  abstract disconnect(): Promise<void>;

  /**
   * Send logs to transport
   */
  abstract send(logs: StreamedLog[]): Promise<void>;

  /**
   * Validate connection
   */
  abstract validate(): Promise<boolean>;

  /**
   * Get transport status
   */
  async getStatus(): Promise<TransportStatus> {
    return this.status;
  }

  /**
   * Get transport metrics
   */
  getMetrics(): TransportMetrics {
    return { ...this.metrics };
  }

  /**
   * Update metrics
   */
  protected updateMetrics(logs: StreamedLog[], transferTime: number): void {
    const bytes = Buffer.byteLength(JSON.stringify(logs), 'utf8');

    this.metrics.logsTransferred += logs.length;
    this.metrics.bytesTransferred += bytes;
    this.metrics.lastTransferAt = new Date();

    // Update average transfer time
    const count = this.metrics.logsTransferred;
    this.metrics.avgTransferTime =
      (this.metrics.avgTransferTime * (count - logs.length) + transferTime) / count;
  }

  /**
   * Handle error
   */
  protected handleError(error: Error): void {
    this.metrics.errors++;
    this.status = 'error';
    this.emit('error', error);
  }

  /**
   * Set status
   */
  protected setStatus(status: TransportStatus): void {
    const oldStatus = this.status;
    this.status = status;

    if (oldStatus !== status) {
      this.emit('status:changed', { from: oldStatus, to: status });
    }
  }
}
