/**
 * LogRhythm Connector
 * LogRhythm REST API connector for SIEM integration
 */

import https from 'https';
import http from 'http';
import {
  BaseSIEMConnector,
  LogRhythmConfig,
  SIEMEvent,
  BatchItem,
} from './types';

export class LogRhythmConnector extends BaseSIEMConnector {
  constructor(config: LogRhythmConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      const healthy = await this.healthCheck();
      if (!healthy) {
        throw new Error('Failed to connect to LogRhythm');
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

    const config = this.config as LogRhythmConfig;
    const severityMap: Record<string, number> = {
      low: 1,
      medium: 5,
      high: 8,
      critical: 10,
    };

    const cefEvents = events.map((event) => {
      const cefMessage = `CEF:0|Workflow|Engine|1.0|${event.eventType}|${event.message}|${severityMap[event.severity]}|src=${event.metadata?.sourceIp || '0.0.0.0'} dst=${event.metadata?.destinationIp || '0.0.0.0'} workflowId=${event.workflowId} executionId=${event.executionId} userId=${event.userId}`;
      return {
        message: cefMessage,
        entity: config.entityMapping?.[event.source] || event.source,
        source: event.source,
      };
    });

    let retries = 0;
    const maxRetries = this.config.maxRetries || 3;

    while (retries < maxRetries) {
      try {
        await this.sendToLogRhythm(cefEvents);
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
      `Failed to send batch to LogRhythm after ${maxRetries} retries`
    );
  }

  private sendToLogRhythm(events: unknown[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const config = this.config as LogRhythmConfig;
      const apiUrl = new URL(config.caseApiUrl);
      const protocol = apiUrl.protocol === 'https:' ? https : http;

      const data = JSON.stringify({ events });

      const options = {
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        path: '/logs',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
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
                `LogRhythm API returned ${res.statusCode}: ${body}`
              )
            );
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('LogRhythm request timeout'));
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
      const config = this.config as LogRhythmConfig;
      const apiUrl = new URL(config.caseApiUrl);
      const protocol = apiUrl.protocol === 'https:' ? https : http;

      return await new Promise((resolve) => {
        const options = {
          hostname: apiUrl.hostname,
          port: apiUrl.port,
          path: '/health',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${config.token}`,
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
