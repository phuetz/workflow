/**
 * Splunk Stream
 * Integration with Splunk HTTP Event Collector (HEC)
 */

import axios, { AxiosInstance } from 'axios';
import { StreamTransport, TransportConfig } from '../StreamTransport';
import { StreamedLog } from '../LogStreamer';

export interface SplunkConfig extends TransportConfig {
  url: string; // HEC endpoint URL
  token: string; // HEC token
  index?: string;
  source?: string;
  sourcetype?: string;
  host?: string;
  validateSSL?: boolean;
  compression?: boolean;
}

interface SplunkEvent {
  time?: number;
  host?: string;
  source?: string;
  sourcetype?: string;
  index?: string;
  event: any;
  fields?: Record<string, any>;
}

export class SplunkStream extends StreamTransport {
  private client: AxiosInstance;
  protected declare config: SplunkConfig;

  constructor(config: SplunkConfig) {
    super(config);

    this.client = axios.create({
      baseURL: config.url,
      timeout: 30000,
      headers: {
        'Authorization': `Splunk ${config.token}`,
        'Content-Type': 'application/json',
      },
      httpsAgent: config.validateSSL === false
        ? new (require('https').Agent)({ rejectUnauthorized: false })
        : undefined,
    });

    this.connect();
  }

  /**
   * Connect to Splunk
   */
  async connect(): Promise<void> {
    try {
      this.setStatus('connecting');

      const isValid = await this.validate();

      if (isValid) {
        this.setStatus('connected');
        this.emit('connected');
      } else {
        throw new Error('Invalid Splunk HEC configuration');
      }
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from Splunk
   */
  async disconnect(): Promise<void> {
    this.setStatus('disconnected');
    this.emit('disconnected');
  }

  /**
   * Send logs to Splunk
   */
  async send(logs: StreamedLog[]): Promise<void> {
    if (this.status !== 'connected') {
      throw new Error('Transport not connected');
    }

    const startTime = Date.now();

    try {
      const splunkEvents = logs.map(log => this.transformLog(log));

      // Send as batch (newline-delimited JSON)
      const payload = splunkEvents.map(e => JSON.stringify(e)).join('\n');

      await this.client.post('/services/collector/event', payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.compression ? { 'Content-Encoding': 'gzip' } : {}),
        },
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
      const testEvent: SplunkEvent = {
        event: {
          message: 'Splunk connection test',
          level: 'info',
        },
        sourcetype: this.config.sourcetype || 'nodejs',
      };

      const response = await this.client.post(
        '/services/collector/event',
        JSON.stringify(testEvent)
      );

      return response.data.code === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Transform log to Splunk format
   */
  private transformLog(log: StreamedLog): SplunkEvent {
    const event: SplunkEvent = {
      time: new Date(log.timestamp).getTime() / 1000, // Splunk uses seconds
      host: this.config.host || log.context?.host || 'localhost',
      source: this.config.source || log.context?.service || 'workflow-platform',
      sourcetype: this.config.sourcetype || 'nodejs:json',
      index: this.config.index,
      event: {
        message: log.message,
        level: log.level,
        category: log.category,
        ...log.metadata,
      },
      fields: {},
    };

    // Add context fields
    if (log.context) {
      event.fields = {
        ...event.fields,
        service: log.context.service,
        environment: log.context.environment,
        version: log.context.version,
        userId: log.context.userId,
        sessionId: log.context.sessionId,
        requestId: log.context.requestId,
        workflowId: log.context.workflowId,
        executionId: log.context.executionId,
      };
    }

    // Add trace fields
    if (log.trace) {
      event.fields = {
        ...event.fields,
        traceId: log.trace.traceId,
        spanId: log.trace.spanId,
        parentSpanId: log.trace.parentSpanId,
      };
    }

    // Add error information
    if (log.error) {
      event.event.error = {
        type: log.error.type || log.error.name,
        message: log.error.message,
        stack: log.error.stack,
        code: log.error.code,
      };
    }

    // Add performance metrics
    if (log.performance) {
      event.event.performance = log.performance;
      event.fields = {
        ...event.fields,
        duration: log.performance.duration,
        memory: log.performance.memory,
        cpu: log.performance.cpu,
      };
    }

    // Add user information
    if (log.user) {
      event.event.user = log.user;
      event.fields = {
        ...event.fields,
        userId: log.user.id,
        username: log.user.username,
      };
    }

    return event;
  }
}
