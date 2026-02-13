/**
 * Splunk Connector
 * HTTP Event Collector (HEC) connector for Splunk SIEM
 */

import https from 'https';
import http from 'http';
import {
  BaseSIEMConnector,
  SplunkConfig,
  SIEMEvent,
  BatchItem,
} from './types';

export class SplunkConnector extends BaseSIEMConnector {
  private hecUrl: URL;

  constructor(config: SplunkConfig) {
    super(config);
    const protocol = config.useSsl !== false ? 'https' : 'http';
    this.hecUrl = new URL(`${protocol}://${config.hecUrl}`);
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      const healthy = await this.healthCheck();
      if (!healthy) {
        throw new Error('Failed to connect to Splunk HEC');
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

    const config = this.config as SplunkConfig;
    const batchData = events
      .map((event) => {
        const hecEvent = {
          time: event.timestamp / 1000,
          source: config.source || event.source,
          sourcetype: config.sourcetype || event.eventType,
          index: config.index || 'main',
          event: {
            severity: event.severity,
            message: event.message,
            metadata: event.metadata,
            tags: event.tags,
            userId: event.userId,
            workflowId: event.workflowId,
            executionId: event.executionId,
          },
        };
        return JSON.stringify(hecEvent);
      })
      .join('\n');

    let retries = 0;
    const maxRetries = this.config.maxRetries || 3;

    while (retries < maxRetries) {
      try {
        await this.sendToSplunk(batchData);
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
      `Failed to send batch to Splunk after ${maxRetries} retries`
    );
  }

  private sendToSplunk(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const config = this.config as SplunkConfig;
      const protocol = config.useSsl !== false ? https : http;

      const options = {
        hostname: this.hecUrl.hostname,
        port: this.hecUrl.port || (config.useSsl !== false ? 8088 : 8088),
        path: '/services/collector',
        method: 'POST',
        headers: {
          Authorization: `Splunk ${config.hecToken}`,
          'Content-Type': 'application/json',
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
                `Splunk HEC returned ${res.statusCode}: ${body}`
              )
            );
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Splunk HEC request timeout'));
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
      const config = this.config as SplunkConfig;
      const protocol = config.useSsl !== false ? https : http;

      return await new Promise((resolve) => {
        const options = {
          hostname: this.hecUrl.hostname,
          port: this.hecUrl.port || (config.useSsl !== false ? 8088 : 8088),
          path: '/services/collector/health',
          method: 'GET',
          headers: {
            Authorization: `Splunk ${config.hecToken}`,
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
