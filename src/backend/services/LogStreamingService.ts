/**
 * Log Streaming Service
 * Streams execution logs to external platforms: Datadog, Splunk, Elasticsearch.
 * Buffers logs and flushes in batches for efficiency.
 */

import { logger } from '../../services/SimpleLogger';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  executionId?: string;
  workflowId?: string;
  nodeId?: string;
  metadata?: Record<string, unknown>;
}

interface StreamConfig {
  type: 'datadog' | 'splunk' | 'elasticsearch' | 'webhook';
  enabled: boolean;
  endpoint: string;
  apiKey?: string;
  token?: string;
  index?: string;
  batchSize?: number;
  flushIntervalMs?: number;
}

export class LogStreamingService {
  private streams: StreamConfig[] = [];
  private buffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private maxBufferSize = 100;
  private defaultFlushMs = 5000;

  constructor() {
    this.initFromEnv();
  }

  private initFromEnv() {
    // Datadog
    if (process.env.DATADOG_API_KEY) {
      this.addStream({
        type: 'datadog',
        enabled: true,
        endpoint: process.env.DATADOG_ENDPOINT || 'https://http-intake.logs.datadoghq.com/api/v2/logs',
        apiKey: process.env.DATADOG_API_KEY,
        batchSize: parseInt(process.env.DATADOG_BATCH_SIZE || '50'),
      });
    }

    // Splunk
    if (process.env.SPLUNK_HEC_TOKEN) {
      this.addStream({
        type: 'splunk',
        enabled: true,
        endpoint: process.env.SPLUNK_HEC_ENDPOINT || 'https://localhost:8088/services/collector/event',
        token: process.env.SPLUNK_HEC_TOKEN,
        index: process.env.SPLUNK_INDEX || 'workflow',
      });
    }

    // Elasticsearch
    if (process.env.ELASTICSEARCH_URL) {
      this.addStream({
        type: 'elasticsearch',
        enabled: true,
        endpoint: process.env.ELASTICSEARCH_URL,
        index: process.env.ELASTICSEARCH_INDEX || 'workflow-logs',
        apiKey: process.env.ELASTICSEARCH_API_KEY,
      });
    }

    // Custom webhook
    if (process.env.LOG_WEBHOOK_URL) {
      this.addStream({
        type: 'webhook',
        enabled: true,
        endpoint: process.env.LOG_WEBHOOK_URL,
        token: process.env.LOG_WEBHOOK_TOKEN,
      });
    }
  }

  addStream(config: StreamConfig) {
    this.streams.push(config);
    logger.info('Log stream added', { type: config.type, endpoint: config.endpoint.replace(/\/\/.*@/, '//***@') });

    if (!this.flushTimer) {
      this.flushTimer = setInterval(() => this.flush(), config.flushIntervalMs || this.defaultFlushMs);
    }
  }

  removeStream(type: string) {
    this.streams = this.streams.filter(s => s.type !== type);
  }

  getStreams() {
    return this.streams.map(s => ({
      type: s.type,
      enabled: s.enabled,
      endpoint: s.endpoint.replace(/\/\/.*@/, '//***@'),
    }));
  }

  /**
   * Log an entry. Buffered and flushed in batches.
   */
  log(entry: LogEntry) {
    if (this.streams.length === 0) return;

    this.buffer.push({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    });

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Flush buffered logs to all streams.
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.streams.length === 0) return;

    const batch = this.buffer.splice(0, this.maxBufferSize);

    const promises = this.streams
      .filter(s => s.enabled)
      .map(stream => this.sendBatch(stream, batch).catch(err => {
        logger.warn(`Failed to send logs to ${stream.type}`, { error: String(err) });
      }));

    await Promise.allSettled(promises);
  }

  private async sendBatch(stream: StreamConfig, entries: LogEntry[]): Promise<void> {
    const { default: fetch } = await import('node-fetch');

    switch (stream.type) {
      case 'datadog': {
        const body = entries.map(e => ({
          ddsource: 'workflow-platform',
          ddtags: `env:${process.env.NODE_ENV || 'development'}`,
          hostname: process.env.HOSTNAME || 'workflow-server',
          message: e.message,
          status: e.level,
          ...e.metadata,
          executionId: e.executionId,
          workflowId: e.workflowId,
          nodeId: e.nodeId,
        }));

        await fetch(stream.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'DD-API-KEY': stream.apiKey || '',
          },
          body: JSON.stringify(body),
        });
        break;
      }

      case 'splunk': {
        const events = entries.map(e => JSON.stringify({
          event: {
            message: e.message,
            level: e.level,
            executionId: e.executionId,
            workflowId: e.workflowId,
            nodeId: e.nodeId,
            ...e.metadata,
          },
          time: new Date(e.timestamp).getTime() / 1000,
          sourcetype: 'workflow-platform',
          index: stream.index,
        })).join('\n');

        await fetch(stream.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Splunk ${stream.token}`,
            'Content-Type': 'application/json',
          },
          body: events,
        });
        break;
      }

      case 'elasticsearch': {
        // Bulk API format
        const lines: string[] = [];
        const indexName = `${stream.index}-${new Date().toISOString().slice(0, 10)}`;

        for (const entry of entries) {
          lines.push(JSON.stringify({ index: { _index: indexName } }));
          lines.push(JSON.stringify({
            '@timestamp': entry.timestamp,
            level: entry.level,
            message: entry.message,
            executionId: entry.executionId,
            workflowId: entry.workflowId,
            nodeId: entry.nodeId,
            ...entry.metadata,
          }));
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/x-ndjson' };
        if (stream.apiKey) headers['Authorization'] = `ApiKey ${stream.apiKey}`;

        await fetch(`${stream.endpoint}/_bulk`, {
          method: 'POST',
          headers,
          body: lines.join('\n') + '\n',
        });
        break;
      }

      case 'webhook': {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (stream.token) headers['Authorization'] = `Bearer ${stream.token}`;

        await fetch(stream.endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ logs: entries }),
        });
        break;
      }
    }
  }

  /**
   * Cleanup on shutdown.
   */
  async shutdown() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}

export const logStreamingService = new LogStreamingService();
