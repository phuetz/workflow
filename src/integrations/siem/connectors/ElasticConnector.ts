/**
 * Elasticsearch Connector
 * Bulk API connector for Elasticsearch SIEM
 */

import https from 'https';
import http from 'http';
import {
  BaseSIEMConnector,
  ElasticsearchConfig,
  SIEMEvent,
  BatchItem,
} from './types';

export class ElasticsearchConnector extends BaseSIEMConnector {
  private nodes: string[];

  constructor(config: ElasticsearchConfig) {
    super(config);
    this.nodes = config.nodes;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      const healthy = await this.healthCheck();
      if (!healthy) {
        throw new Error('Failed to connect to Elasticsearch');
      }
      this.connected = true;
      this.startHealthChecks();
      this.emit('connected');
    } catch (error) {
      this.updateCircuitBreaker(false);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.stopBatchTimer();
    this.stopHealthChecks();
    this.connectionPool.clear();
    this.connected = false;
    this.emit('disconnected');
  }

  async sendEvent(event: SIEMEvent): Promise<void> {
    if (!this.shouldAttemptHealing()) {
      this.addToDeadLetterQueue({
        event,
        timestamp: Date.now(),
        retries: 0,
      });
      return;
    }

    await this.checkRateLimit(1);

    const batchItem: BatchItem = {
      event,
      timestamp: Date.now(),
      retries: 0,
    };

    this.batch.push(batchItem);

    if (this.batch.length >= (this.config.batchSize || 100)) {
      await this.processBatch();
    } else {
      this.startBatchTimer();
    }
  }

  async sendBatch(events: SIEMEvent[]): Promise<void> {
    if (events.length === 0) return;

    const config = this.config as ElasticsearchConfig;
    const bulkData = events
      .flatMap((event) => {
        const indexName =
          config.indexPattern || `security-${new Date().toISOString().split('T')[0]}`;
        return [
          JSON.stringify({
            index: {
              _index: indexName,
              _id: `${event.workflowId}-${event.executionId}-${Date.now()}`,
            },
          }),
          JSON.stringify({
            '@timestamp': new Date(event.timestamp).toISOString(),
            source: event.source,
            event_type: event.eventType,
            severity: event.severity,
            message: event.message,
            metadata: event.metadata,
            tags: event.tags,
            user_id: event.userId,
            workflow_id: event.workflowId,
            execution_id: event.executionId,
          }),
        ];
      })
      .join('\n') + '\n';

    let retries = 0;
    const maxRetries = this.config.maxRetries || 3;

    while (retries < maxRetries) {
      try {
        await this.sendToElasticsearch(bulkData);
        this.updateCircuitBreaker(true);
        this.emit('batchSent', { count: events.length });
        return;
      } catch (error) {
        retries++;
        if (retries < maxRetries) {
          const backoffMs = Math.pow(2, retries) * 1000;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    this.updateCircuitBreaker(false);
    events.forEach((event) => {
      this.addToDeadLetterQueue({
        event,
        timestamp: Date.now(),
        retries,
      });
    });
    throw new Error(
      `Failed to send batch to Elasticsearch after ${maxRetries} retries`
    );
  }

  private sendToElasticsearch(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const config = this.config as ElasticsearchConfig;
      const nodeUrl = new URL(this.nodes[0]);
      const protocol = nodeUrl.protocol === 'https:' ? https : http;

      const options = {
        hostname: nodeUrl.hostname,
        port: nodeUrl.port,
        path: '/_bulk',
        method: 'POST',
        headers: {
          Authorization: `ApiKey ${config.apiKey}`,
          'Content-Type': 'application/x-ndjson',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: this.config.timeout || 30000,
      };

      const req = protocol.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(
              new Error(
                `Elasticsearch bulk API returned ${res.statusCode}: ${body}`
              )
            );
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Elasticsearch request timeout'));
      });
      req.write(data);
      req.end();
    });
  }

  async query(filter: Record<string, unknown>): Promise<SIEMEvent[]> {
    this.emit('query', filter);
    return [];
  }

  async healthCheck(): Promise<boolean> {
    try {
      const nodeUrl = new URL(this.nodes[0]);
      const protocol = nodeUrl.protocol === 'https:' ? https : http;

      return await new Promise((resolve) => {
        const options = {
          hostname: nodeUrl.hostname,
          port: nodeUrl.port,
          path: '/',
          method: 'GET',
          headers: {
            Authorization: `ApiKey ${(this.config as ElasticsearchConfig).apiKey}`,
          },
          timeout: 5000,
        };

        const req = protocol.request(options, (res) => {
          resolve(res.statusCode === 200);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
        req.end();
      });
    } catch {
      return false;
    }
  }
}
