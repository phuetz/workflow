/**
 * Datadog Security Connector
 * Datadog Security Monitoring connector for SIEM integration
 */

import https from 'https';
import {
  BaseSIEMConnector,
  DatadogConfig,
  SIEMEvent,
  BatchItem,
} from './types';

export class DatadogSecurityConnector extends BaseSIEMConnector {
  private ddApiUrl: string;

  constructor(config: DatadogConfig) {
    super(config);
    this.ddApiUrl = this.buildDatadogUrl(config.site);
  }

  private buildDatadogUrl(site: string): string {
    const siteMap: Record<string, string> = {
      us1: 'api.datadoghq.com',
      us3: 'api.us3.datadoghq.com',
      us5: 'api.us5.datadoghq.com',
      eu1: 'api.datadoghq.eu',
      ap1: 'api.ap1.datadoghq.com',
    };
    return siteMap[site] || siteMap.us1;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      const healthy = await this.healthCheck();
      if (!healthy) {
        throw new Error('Failed to connect to Datadog');
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

    const config = this.config as DatadogConfig;
    const ddEvents = events.map((event) => ({
      ddsource: event.source,
      ddtags: [
        `env:${config.env || 'production'}`,
        `service:${config.service || 'workflow'}`,
        `severity:${event.severity}`,
        ...(event.tags || []),
      ].join(','),
      hostname: 'workflow-engine',
      message: event.message,
      status: event.severity,
      timestamp: Math.floor(event.timestamp / 1000),
      metadata: {
        workflow_id: event.workflowId,
        execution_id: event.executionId,
        user_id: event.userId,
        event_type: event.eventType,
        ...event.metadata,
      },
    }));

    let retries = 0;
    const maxRetries = this.config.maxRetries || 3;

    while (retries < maxRetries) {
      try {
        await this.sendToDatadog(ddEvents);
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
      `Failed to send batch to Datadog after ${maxRetries} retries`
    );
  }

  private sendToDatadog(events: unknown[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const config = this.config as DatadogConfig;

      const data = events.map((event) => JSON.stringify(event)).join('\n');

      const options = {
        hostname: this.ddApiUrl,
        port: 443,
        path: '/v1/input',
        method: 'POST',
        headers: {
          'DD-API-KEY': config.apiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: this.config.timeout || 30000,
      };

      const req = https.request(options, (res) => {
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
                `Datadog API returned ${res.statusCode}: ${body}`
              )
            );
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Datadog request timeout'));
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
      const config = this.config as DatadogConfig;

      return await new Promise((resolve) => {
        const options = {
          hostname: this.ddApiUrl,
          port: 443,
          path: '/api/v1/validate',
          method: 'GET',
          headers: {
            'DD-API-KEY': config.apiKey,
          },
          timeout: 5000,
        };

        const req = https.request(options, (res) => {
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
