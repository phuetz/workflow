/**
 * Datadog Logs Stream
 * Integration with Datadog Logs API
 */

import axios, { AxiosInstance } from 'axios';
import { StreamTransport, TransportConfig } from '../StreamTransport';
import { StreamedLog } from '../LogStreamer';

export interface DatadogConfig extends TransportConfig {
  apiKey: string;
  site?: string; // e.g., 'datadoghq.com', 'datadoghq.eu'
  service?: string;
  source?: string;
  hostname?: string;
  tags?: string[];
  ddsource?: string;
  ddtags?: string;
  compression?: boolean;
}

interface DatadogLog {
  message: string;
  timestamp?: number;
  level?: string;
  service?: string;
  hostname?: string;
  ddsource?: string;
  ddtags?: string;
  [key: string]: any;
}

export class DatadogStream extends StreamTransport {
  private client: AxiosInstance;
  protected declare config: DatadogConfig;

  constructor(config: DatadogConfig) {
    super(config);

    const site = config.site || 'datadoghq.com';
    const baseURL = `https://http-intake.logs.${site}`;

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'DD-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
      },
    });

    this.connect();
  }

  /**
   * Connect to Datadog
   */
  async connect(): Promise<void> {
    try {
      this.setStatus('connecting');

      // Validate API key by sending test log
      const isValid = await this.validate();

      if (isValid) {
        this.setStatus('connected');
        this.emit('connected');
      } else {
        throw new Error('Invalid Datadog API key');
      }
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from Datadog
   */
  async disconnect(): Promise<void> {
    this.setStatus('disconnected');
    this.emit('disconnected');
  }

  /**
   * Send logs to Datadog
   */
  async send(logs: StreamedLog[]): Promise<void> {
    if (this.status !== 'connected') {
      throw new Error('Transport not connected');
    }

    const startTime = Date.now();

    try {
      const datadogLogs = logs.map(log => this.transformLog(log));

      // Datadog accepts multiple logs in array
      await this.client.post('/api/v2/logs', datadogLogs, {
        headers: this.config.compression
          ? { 'Content-Encoding': 'gzip' }
          : {},
      });

      const transferTime = Date.now() - startTime;
      this.updateMetrics(logs, transferTime);

      this.emit('logs:sent', { count: logs.length, time: transferTime });
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Validate connection
   */
  async validate(): Promise<boolean> {
    try {
      const testLog: DatadogLog = {
        message: 'Datadog connection test',
        level: 'info',
        service: this.config.service || 'workflow-platform',
        ddsource: this.config.ddsource || 'nodejs',
      };

      await this.client.post('/api/v2/logs', [testLog]);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Transform log to Datadog format
   */
  private transformLog(log: StreamedLog): DatadogLog {
    const ddlog: DatadogLog = {
      message: log.message,
      timestamp: new Date(log.timestamp).getTime(),
      level: this.mapLogLevel(log.level),
      service: this.config.service || log.context?.service || 'workflow-platform',
      hostname: this.config.hostname || log.context?.host,
      ddsource: this.config.ddsource || 'nodejs',
    };

    // Add tags
    const tags: string[] = [...(this.config.tags || [])];

    if (log.category) {
      tags.push(`category:${log.category}`);
    }

    if (log.context?.environment) {
      tags.push(`env:${log.context.environment}`);
    }

    if (log.context?.userId) {
      tags.push(`user_id:${log.context.userId}`);
    }

    if (log.trace?.traceId) {
      tags.push(`trace_id:${log.trace.traceId}`);
      ddlog.dd = {
        trace_id: log.trace.traceId,
        span_id: log.trace.spanId,
      };
    }

    if (tags.length > 0) {
      ddlog.ddtags = tags.join(',');
    }

    // Add metadata
    if (log.metadata) {
      Object.assign(ddlog, log.metadata);
    }

    // Add error information
    if (log.error) {
      ddlog.error = {
        kind: log.error.type || log.error.name,
        message: log.error.message,
        stack: log.error.stack,
      };
    }

    // Add performance metrics
    if (log.performance) {
      ddlog.performance = log.performance;
    }

    // Add user context
    if (log.user) {
      ddlog.usr = log.user;
    }

    return ddlog;
  }

  /**
   * Map log level to Datadog level
   */
  private mapLogLevel(level: string): string {
    const mapping: Record<string, string> = {
      trace: 'debug',
      debug: 'debug',
      info: 'info',
      warn: 'warn',
      error: 'error',
      fatal: 'critical',
    };

    return mapping[level.toLowerCase()] || 'info';
  }
}
