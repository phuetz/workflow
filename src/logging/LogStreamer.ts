/**
 * Log Streaming Orchestrator
 * Real-time log streaming to third-party services with buffering and retry logic
 */

import { EventEmitter } from 'events';
import { StreamBuffer } from './StreamBuffer';
import { StreamTransport, TransportConfig, TransportStatus } from './StreamTransport';
import { DatadogStream } from './integrations/DatadogStream';
import { SplunkStream } from './integrations/SplunkStream';
import { ElasticsearchStream } from './integrations/ElasticsearchStream';
import { CloudWatchStream } from './integrations/CloudWatchStream';
import { GCPLoggingStream } from './integrations/GCPLoggingStream';

export interface LogStreamConfig {
  id?: string;
  type: 'datadog' | 'splunk' | 'elasticsearch' | 'cloudwatch' | 'gcp';
  config: TransportConfig;
  enabled?: boolean;
  buffer?: {
    size?: number;
    flushInterval?: number;
  };
  retry?: {
    maxRetries?: number;
    backoffMs?: number;
  };
  filters?: LogFilter[];
  sampling?: {
    rate: number; // 0-1, where 1 is 100%
    levels?: string[];
  };
}

export interface LogFilter {
  type: 'level' | 'category' | 'field' | 'regex';
  operator?: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'matches';
  field?: string;
  value?: any;
  pattern?: string;
}

export interface StreamedLog {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  category?: string;
  context?: any;
  metadata?: any;
  error?: any;
  trace?: {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
  };
  performance?: {
    duration?: number;
    memory?: number;
    cpu?: number;
  };
  user?: {
    id?: string;
    username?: string;
    ip?: string;
  };
}

export interface StreamMetrics {
  streamId: string;
  streamType: string;
  logsStreamed: number;
  logsDropped: number;
  logsFailed: number;
  bytesStreamed: number;
  avgLatency: number;
  lastStreamedAt?: Date;
  errors: number;
  retries: number;
  successRate: number;
  uptime: number;
  status: TransportStatus;
}

export interface StreamHealth {
  streamId: string;
  healthy: boolean;
  lastCheck: Date;
  latency: number;
  errorRate: number;
  bufferUtilization: number;
  status: TransportStatus;
  issues: string[];
}

export class LogStreamer extends EventEmitter {
  private streams: Map<string, {
    config: LogStreamConfig;
    transport: StreamTransport;
    buffer: StreamBuffer;
    metrics: StreamMetrics;
  }> = new Map();

  private healthCheckInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private sampleCounters: Map<string, number> = new Map();

  private config: {
    maxStreams: number;
    healthCheckIntervalMs: number;
    metricsIntervalMs: number;
    defaultBufferSize: number;
    defaultFlushInterval: number;
    defaultMaxRetries: number;
    defaultBackoffMs: number;
  };

  constructor(config?: Partial<typeof LogStreamer.prototype.config>) {
    super();
    this.config = {
      maxStreams: 10,
      healthCheckIntervalMs: 30000, // 30s
      metricsIntervalMs: 60000, // 1 minute
      defaultBufferSize: 100,
      defaultFlushInterval: 5000, // 5s
      defaultMaxRetries: 3,
      defaultBackoffMs: 1000,
      ...config
    };

    this.initialize();
  }

  /**
   * Initialize log streamer
   */
  private initialize(): void {
    this.startHealthChecks();
    this.startMetricsCollection();
  }

  /**
   * Add stream
   */
  addStream(config: LogStreamConfig): string {
    if (this.streams.size >= this.config.maxStreams) {
      throw new Error(`Maximum number of streams (${this.config.maxStreams}) reached`);
    }

    const streamId = config.id || this.generateStreamId();

    if (this.streams.has(streamId)) {
      throw new Error(`Stream ${streamId} already exists`);
    }

    // Create transport
    const transport = this.createTransport(config.type, config.config);

    // Create buffer
    const buffer = new StreamBuffer({
      maxSize: config.buffer?.size || this.config.defaultBufferSize,
      flushInterval: config.buffer?.flushInterval || this.config.defaultFlushInterval,
      onFlush: async (logs) => {
        await this.flushLogs(streamId, logs);
      },
      onOverflow: (log) => {
        this.handleOverflow(streamId, log);
      }
    });

    // Initialize metrics
    const metrics: StreamMetrics = {
      streamId,
      streamType: config.type,
      logsStreamed: 0,
      logsDropped: 0,
      logsFailed: 0,
      bytesStreamed: 0,
      avgLatency: 0,
      errors: 0,
      retries: 0,
      successRate: 100,
      uptime: 0,
      status: 'connected'
    };

    this.streams.set(streamId, {
      config,
      transport,
      buffer,
      metrics
    });

    this.emit('stream:added', { streamId, type: config.type });
    return streamId;
  }

  /**
   * Remove stream
   */
  async removeStream(streamId: string): Promise<void> {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`);
    }

    // Flush remaining logs
    await stream.buffer.flush();

    // Disconnect transport
    await stream.transport.disconnect();

    // Remove stream
    this.streams.delete(streamId);

    this.emit('stream:removed', { streamId });
  }

  /**
   * Stream log
   */
  async stream(log: StreamedLog): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [streamId, stream] of Array.from(this.streams.entries())) {
      if (!stream.config.enabled) {
        continue;
      }

      // Apply filters
      if (stream.config.filters && !this.passesFilters(log, stream.config.filters)) {
        continue;
      }

      // Apply sampling
      if (stream.config.sampling && !this.passesSampling(streamId, log, stream.config.sampling)) {
        continue;
      }

      // Add to buffer
      promises.push(
        stream.buffer.add(log).catch(error => {
          this.emit('stream:error', { streamId, error });
        })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Flush all streams
   */
  async flushAll(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const stream of Array.from(this.streams.values())) {
      promises.push(stream.buffer.flush());
    }

    await Promise.all(promises);
  }

  /**
   * Get stream metrics
   */
  getMetrics(streamId?: string): StreamMetrics | StreamMetrics[] {
    if (streamId) {
      const stream = this.streams.get(streamId);
      if (!stream) {
        throw new Error(`Stream ${streamId} not found`);
      }
      return { ...stream.metrics };
    }

    return Array.from(this.streams.values()).map(s => ({ ...s.metrics }));
  }

  /**
   * Get stream health
   */
  async getHealth(streamId?: string): Promise<StreamHealth | StreamHealth[]> {
    if (streamId) {
      return this.checkStreamHealth(streamId);
    }

    const healthChecks = await Promise.all(
      Array.from(this.streams.keys()).map(id => this.checkStreamHealth(id))
    );

    return healthChecks;
  }

  /**
   * Enable stream
   */
  enableStream(streamId: string): void {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`);
    }

    stream.config.enabled = true;
    this.emit('stream:enabled', { streamId });
  }

  /**
   * Disable stream
   */
  async disableStream(streamId: string): Promise<void> {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`);
    }

    // Flush before disabling
    await stream.buffer.flush();
    stream.config.enabled = false;
    this.emit('stream:disabled', { streamId });
  }

  /**
   * Create transport
   */
  private createTransport(
    type: LogStreamConfig['type'],
    config: TransportConfig
  ): StreamTransport {
    switch (type) {
      case 'datadog':
        return new DatadogStream(config as any);
      case 'splunk':
        return new SplunkStream(config as any);
      case 'elasticsearch':
        return new ElasticsearchStream(config as any);
      case 'cloudwatch':
        return new CloudWatchStream(config as any);
      case 'gcp':
        return new GCPLoggingStream(config as any);
      default:
        throw new Error(`Unknown stream type: ${type}`);
    }
  }

  /**
   * Flush logs to transport
   */
  private async flushLogs(streamId: string, logs: StreamedLog[]): Promise<void> {
    const stream = this.streams.get(streamId);
    if (!stream) return;

    const startTime = Date.now();
    let attempt = 0;
    const maxRetries = stream.config.retry?.maxRetries || this.config.defaultMaxRetries;
    const backoffMs = stream.config.retry?.backoffMs || this.config.defaultBackoffMs;

    while (attempt <= maxRetries) {
      try {
        // Send logs
        await stream.transport.send(logs);

        // Update metrics
        const latency = Date.now() - startTime;
        stream.metrics.logsStreamed += logs.length;
        stream.metrics.bytesStreamed += this.calculateSize(logs);
        stream.metrics.avgLatency = this.updateAvgLatency(stream.metrics.avgLatency, latency, stream.metrics.logsStreamed);
        stream.metrics.lastStreamedAt = new Date();
        stream.metrics.successRate = this.calculateSuccessRate(stream.metrics);

        this.emit('stream:flushed', { streamId, count: logs.length, latency });
        return;

      } catch (error) {
        attempt++;
        stream.metrics.errors++;

        if (attempt <= maxRetries) {
          stream.metrics.retries++;
          const delay = backoffMs * Math.pow(2, attempt - 1);

          this.emit('stream:retry', {
            streamId,
            attempt,
            maxRetries,
            delay,
            error: error instanceof Error ? error.message : String(error)
          });

          await this.sleep(delay);
        } else {
          // Max retries exceeded
          stream.metrics.logsFailed += logs.length;
          stream.metrics.successRate = this.calculateSuccessRate(stream.metrics);

          this.emit('stream:failed', {
            streamId,
            count: logs.length,
            error: error instanceof Error ? error.message : String(error)
          });

          throw error;
        }
      }
    }
  }

  /**
   * Handle buffer overflow
   */
  private handleOverflow(streamId: string, log: StreamedLog): void {
    const stream = this.streams.get(streamId);
    if (stream) {
      stream.metrics.logsDropped++;
    }

    this.emit('stream:overflow', { streamId, log });
  }

  /**
   * Check stream health
   */
  private async checkStreamHealth(streamId: string): Promise<StreamHealth> {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`);
    }

    const startTime = Date.now();
    const status = await stream.transport.getStatus();
    const latency = Date.now() - startTime;

    const errorRate = stream.metrics.logsStreamed > 0
      ? (stream.metrics.logsFailed / (stream.metrics.logsStreamed + stream.metrics.logsFailed)) * 100
      : 0;

    const bufferUtilization = stream.buffer.getUtilization();

    const issues: string[] = [];

    if (status !== 'connected') {
      issues.push(`Transport status: ${status}`);
    }

    if (errorRate > 5) {
      issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
    }

    if (bufferUtilization > 80) {
      issues.push(`High buffer utilization: ${bufferUtilization.toFixed(2)}%`);
    }

    if (latency > 1000) {
      issues.push(`High latency: ${latency}ms`);
    }

    const healthy = issues.length === 0 && status === 'connected';

    const health: StreamHealth = {
      streamId,
      healthy,
      lastCheck: new Date(),
      latency,
      errorRate,
      bufferUtilization,
      status,
      issues
    };

    this.emit('stream:health', health);
    return health;
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const streamId of Array.from(this.streams.keys())) {
        try {
          await this.checkStreamHealth(streamId);
        } catch (error) {
          this.emit('health:error', {
            streamId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      for (const [streamId, stream] of Array.from(this.streams.entries())) {
        stream.metrics.uptime += this.config.metricsIntervalMs / 1000;
        this.emit('metrics:collected', { streamId, metrics: stream.metrics });
      }
    }, this.config.metricsIntervalMs);
  }

  /**
   * Apply filters
   */
  private passesFilters(log: StreamedLog, filters: LogFilter[]): boolean {
    for (const filter of filters) {
      if (!this.checkFilter(log, filter)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check individual filter
   */
  private checkFilter(log: StreamedLog, filter: LogFilter): boolean {
    switch (filter.type) {
      case 'level': {
        const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
        const logLevel = levels.indexOf(log.level.toLowerCase());
        const filterLevel = levels.indexOf(String(filter.value).toLowerCase());

        switch (filter.operator) {
          case 'eq': return logLevel === filterLevel;
          case 'ne': return logLevel !== filterLevel;
          case 'gt': return logLevel > filterLevel;
          case 'lt': return logLevel < filterLevel;
          default: return logLevel >= filterLevel;
        }
      }

      case 'category':
        return filter.operator === 'eq'
          ? log.category === filter.value
          : log.category !== filter.value;

      case 'field': {
        const value = this.getNestedValue(log, filter.field || '');
        switch (filter.operator) {
          case 'eq': return value === filter.value;
          case 'ne': return value !== filter.value;
          case 'contains': return String(value).includes(String(filter.value));
          default: return false;
        }
      }

      case 'regex':
        if (filter.pattern) {
          const regex = new RegExp(filter.pattern);
          return regex.test(log.message);
        }
        return true;

      default:
        return true;
    }
  }

  /**
   * Apply sampling
   */
  private passesSampling(
    streamId: string,
    log: StreamedLog,
    sampling: NonNullable<LogStreamConfig['sampling']>
  ): boolean {
    // Check if level should be sampled
    if (sampling.levels && !sampling.levels.includes(log.level.toLowerCase())) {
      return true; // Don't sample this level
    }

    // Apply sampling rate
    const counter = this.sampleCounters.get(streamId) || 0;
    const shouldSample = counter % Math.ceil(1 / sampling.rate) === 0;
    this.sampleCounters.set(streamId, counter + 1);

    return shouldSample;
  }

  /**
   * Helper methods
   */
  private generateStreamId(): string {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private calculateSize(logs: StreamedLog[]): number {
    return Buffer.byteLength(JSON.stringify(logs), 'utf8');
  }

  private updateAvgLatency(currentAvg: number, newLatency: number, count: number): number {
    return (currentAvg * (count - 1) + newLatency) / count;
  }

  private calculateSuccessRate(metrics: StreamMetrics): number {
    const total = metrics.logsStreamed + metrics.logsFailed;
    return total > 0 ? (metrics.logsStreamed / total) * 100 : 100;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Flush all buffers
    await this.flushAll();

    // Disconnect all transports
    const disconnectPromises = Array.from(this.streams.values()).map(
      stream => stream.transport.disconnect()
    );
    await Promise.all(disconnectPromises);

    this.removeAllListeners();
  }
}
