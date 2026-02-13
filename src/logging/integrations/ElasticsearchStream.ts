/**
 * Elasticsearch Stream
 * Integration with Elasticsearch Bulk API
 */

import axios, { AxiosInstance } from 'axios';
import { StreamTransport, TransportConfig } from '../StreamTransport';
import { StreamedLog } from '../LogStreamer';

export interface ElasticsearchConfig extends TransportConfig {
  url: string;
  index: string;
  username?: string;
  password?: string;
  apiKey?: string;
  cloudId?: string;
  pipeline?: string;
  validateSSL?: boolean;
  compression?: boolean;
}

interface BulkOperation {
  index: {
    _index: string;
    _id?: string;
    pipeline?: string;
  };
}

export class ElasticsearchStream extends StreamTransport {
  private client: AxiosInstance;
  protected declare config: ElasticsearchConfig;

  constructor(config: ElasticsearchConfig) {
    super(config);

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-ndjson',
    };

    // Authentication
    if (config.apiKey) {
      headers['Authorization'] = `ApiKey ${config.apiKey}`;
    } else if (config.username && config.password) {
      const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    this.client = axios.create({
      baseURL: config.url,
      timeout: 30000,
      headers,
      httpsAgent: config.validateSSL === false
        ? new (require('https').Agent)({ rejectUnauthorized: false })
        : undefined,
    });

    this.connect();
  }

  /**
   * Connect to Elasticsearch
   */
  async connect(): Promise<void> {
    try {
      this.setStatus('connecting');

      const isValid = await this.validate();

      if (isValid) {
        this.setStatus('connected');
        this.emit('connected');
      } else {
        throw new Error('Cannot connect to Elasticsearch');
      }
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from Elasticsearch
   */
  async disconnect(): Promise<void> {
    this.setStatus('disconnected');
    this.emit('disconnected');
  }

  /**
   * Send logs to Elasticsearch
   */
  async send(logs: StreamedLog[]): Promise<void> {
    if (this.status !== 'connected') {
      throw new Error('Transport not connected');
    }

    const startTime = Date.now();

    try {
      // Build bulk request body
      const bulkBody: string[] = [];

      for (const log of logs) {
        const operation: BulkOperation = {
          index: {
            _index: this.getIndexName(),
            _id: log.id,
          },
        };

        if (this.config.pipeline) {
          operation.index.pipeline = this.config.pipeline;
        }

        bulkBody.push(JSON.stringify(operation));
        bulkBody.push(JSON.stringify(this.transformLog(log)));
      }

      const payload = bulkBody.join('\n') + '\n';

      const response = await this.client.post('/_bulk', payload, {
        headers: this.config.compression
          ? { 'Content-Encoding': 'gzip' }
          : {},
      });

      // Check for errors in bulk response
      if (response.data.errors) {
        const errors = response.data.items
          .filter((item: any) => item.index?.error)
          .map((item: any) => item.index.error);

        if (errors.length > 0) {
          throw new Error(`Bulk indexing errors: ${JSON.stringify(errors)}`);
        }
      }

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
      const response = await this.client.get('/');
      return response.status === 200 && response.data.version;
    } catch (error) {
      return false;
    }
  }

  /**
   * Transform log to Elasticsearch document
   */
  private transformLog(log: StreamedLog): any {
    const doc: any = {
      '@timestamp': log.timestamp,
      message: log.message,
      log: {
        level: log.level,
        logger: 'workflow-platform',
      },
    };

    // Add category
    if (log.category) {
      doc.category = log.category;
    }

    // Add context
    if (log.context) {
      doc.service = {
        name: log.context.service,
        environment: log.context.environment,
        version: log.context.version,
      };

      if (log.context.host) {
        doc.host = {
          name: log.context.host,
        };
      }

      if (log.context.userId) {
        doc.user = doc.user || {};
        doc.user.id = log.context.userId;
      }

      if (log.context.sessionId) {
        doc.session = { id: log.context.sessionId };
      }

      if (log.context.requestId) {
        doc.request = { id: log.context.requestId };
      }

      if (log.context.workflowId) {
        doc.workflow = {
          id: log.context.workflowId,
          executionId: log.context.executionId,
        };
      }
    }

    // Add trace information
    if (log.trace) {
      doc.trace = {
        id: log.trace.traceId,
      };
      doc.span = {
        id: log.trace.spanId,
      };
      if (log.trace.parentSpanId) {
        doc.span.parent_id = log.trace.parentSpanId;
      }
    }

    // Add error information
    if (log.error) {
      doc.error = {
        type: log.error.type || log.error.name,
        message: log.error.message,
        stack_trace: log.error.stack,
        code: log.error.code,
      };
    }

    // Add performance metrics
    if (log.performance) {
      doc.performance = {
        duration: log.performance.duration,
        memory: log.performance.memory,
        cpu: log.performance.cpu,
      };
    }

    // Add user information
    if (log.user) {
      doc.user = {
        ...doc.user,
        id: log.user.id,
        name: log.user.username,
        ip: log.user.ip,
      };
    }

    // Add metadata
    if (log.metadata) {
      doc.metadata = log.metadata;
    }

    return doc;
  }

  /**
   * Get index name with date suffix
   */
  private getIndexName(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${this.config.index}-${year}.${month}.${day}`;
  }
}
