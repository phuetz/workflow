/**
 * QRadar Connector
 * IBM QRadar SIEM connector
 */

import https from 'https';
import http from 'http';
import {
  BaseSIEMConnector,
  QRadarConfig,
  SIEMEvent,
  BatchItem,
} from './types';

export class QRadarConnector extends BaseSIEMConnector {
  constructor(config: QRadarConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      const healthy = await this.healthCheck();
      if (!healthy) {
        throw new Error('Failed to connect to QRadar');
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

    const config = this.config as QRadarConfig;
    const severityMap: Record<string, number> = {
      low: 1,
      medium: 5,
      high: 8,
      critical: 10,
    };

    const qradarEvents = events.map((event) => ({
      event_name: config.customEventMapping?.[event.eventType] || event.eventType,
      message: event.message,
      severity: severityMap[event.severity],
      source_ip: event.metadata?.sourceIp || '0.0.0.0',
      destination_ip: event.metadata?.destinationIp || '0.0.0.0',
      category: event.eventType,
      custom_properties: {
        workflow_id: event.workflowId,
        execution_id: event.executionId,
        user_id: event.userId,
        tags: event.tags?.join(','),
      },
    }));

    let retries = 0;
    const maxRetries = this.config.maxRetries || 3;

    while (retries < maxRetries) {
      try {
        await this.sendToQRadar(qradarEvents);
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
      `Failed to send batch to QRadar after ${maxRetries} retries`
    );
  }

  private sendToQRadar(events: unknown[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const config = this.config as QRadarConfig;
      const protocol = config.useSsl !== false ? https : http;

      const data = JSON.stringify({ events });

      const options = {
        hostname: config.host,
        port: config.port || (config.useSsl !== false ? 443 : 80),
        path: '/api/events',
        method: 'POST',
        headers: {
          'SEC': config.apiKey,
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
                `QRadar API returned ${res.statusCode}: ${body}`
              )
            );
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('QRadar request timeout'));
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
      const config = this.config as QRadarConfig;
      const protocol = config.useSsl !== false ? https : http;

      return await new Promise((resolve) => {
        const options = {
          hostname: config.host,
          port: config.port || (config.useSsl !== false ? 443 : 80),
          path: '/api/system/about',
          method: 'GET',
          headers: {
            'SEC': config.apiKey,
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
