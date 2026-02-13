/**
 * SIEM Connector Types
 * Shared types and interfaces for SIEM connectors
 */

import { EventEmitter } from 'events';

// ============================================================================
// Event Types
// ============================================================================

export interface SIEMEvent {
  timestamp: number;
  source: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  userId?: string;
  workflowId?: string;
  executionId?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface SIEMConnectorConfig {
  name: string;
  enabled: boolean;
  timeout?: number;
  maxRetries?: number;
  batchSize?: number;
  batchIntervalMs?: number;
  rateLimit?: number;
  compression?: boolean;
}

export interface SplunkConfig extends SIEMConnectorConfig {
  type: 'splunk';
  hecUrl: string;
  hecToken: string;
  index?: string;
  sourcetype?: string;
  source?: string;
  useSsl?: boolean;
}

export interface ElasticsearchConfig extends SIEMConnectorConfig {
  type: 'elasticsearch';
  nodes: string[];
  apiKey: string;
  indexPattern?: string;
  pipelines?: string[];
  useSsl?: boolean;
}

export interface QRadarConfig extends SIEMConnectorConfig {
  type: 'qradar';
  host: string;
  apiKey: string;
  port?: number;
  useSsl?: boolean;
  customEventMapping?: Record<string, string>;
}

export interface LogRhythmConfig extends SIEMConnectorConfig {
  type: 'logrhythm';
  caseApiUrl: string;
  token: string;
  entityMapping?: Record<string, string>;
  useSsl?: boolean;
}

export interface DatadogConfig extends SIEMConnectorConfig {
  type: 'datadog';
  apiKey: string;
  applicationKey: string;
  site: 'us1' | 'us3' | 'us5' | 'eu1' | 'ap1';
  service?: string;
  env?: string;
}

export type SIEMConnectorConfigType =
  | SplunkConfig
  | ElasticsearchConfig
  | QRadarConfig
  | LogRhythmConfig
  | DatadogConfig;

// ============================================================================
// Connector Interface
// ============================================================================

export interface ISIEMConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendEvent(event: SIEMEvent): Promise<void>;
  sendBatch(events: SIEMEvent[]): Promise<void>;
  query(filter: Record<string, unknown>): Promise<SIEMEvent[]>;
  healthCheck(): Promise<boolean>;
  isConnected(): boolean;
}

// ============================================================================
// Internal Types
// ============================================================================

export interface BatchItem {
  event: SIEMEvent;
  timestamp: number;
  retries: number;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime: number;
  successCount: number;
}

// ============================================================================
// Base Connector Abstract Class
// ============================================================================

export abstract class BaseSIEMConnector extends EventEmitter implements ISIEMConnector {
  protected config: SIEMConnectorConfigType;
  protected connected: boolean = false;
  protected batch: BatchItem[] = [];
  protected batchTimer: NodeJS.Timeout | null = null;
  protected circuitBreaker: CircuitBreakerState = {
    state: 'closed',
    failures: 0,
    lastFailureTime: 0,
    successCount: 0,
  };
  protected deadLetterQueue: BatchItem[] = [];
  protected rateLimitTokens: number;
  protected lastTokenRefillTime: number = Date.now();
  protected connectionPool: Map<string, unknown> = new Map();
  protected poolSize: number = 5;
  protected healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: SIEMConnectorConfigType) {
    super();
    this.config = config;
    this.rateLimitTokens = config.rateLimit || 1000;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract sendEvent(event: SIEMEvent): Promise<void>;
  abstract sendBatch(events: SIEMEvent[]): Promise<void>;
  abstract query(filter: Record<string, unknown>): Promise<SIEMEvent[]>;
  abstract healthCheck(): Promise<boolean>;

  isConnected(): boolean {
    return this.connected;
  }

  protected startBatchTimer(): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      if (this.batch.length > 0) {
        const events = this.batch.splice(0, this.batch.length).map((item) => item.event);
        this.sendBatch(events).catch((error) => {
          this.emit('error', { error, context: 'batchTimer' });
        });
      }
      this.batchTimer = null;
    }, this.config.batchIntervalMs || 5000);
  }

  async processBatch(): Promise<void> {
    if (this.batch.length === 0) return;

    const batchSize = this.config.batchSize || 100;
    const events = this.batch.splice(0, batchSize).map((item) => item.event);

    try {
      await this.sendBatch(events);
    } catch (error) {
      this.emit('error', { error, context: 'processBatch' });
    }
  }

  protected refillRateLimitTokens(): void {
    const now = Date.now();
    const timePassed = (now - this.lastTokenRefillTime) / 1000;
    const rateLimit = this.config.rateLimit || 1000;
    const tokensToAdd = timePassed * rateLimit;
    this.rateLimitTokens = Math.min(
      rateLimit,
      this.rateLimitTokens + tokensToAdd
    );
    this.lastTokenRefillTime = now;
  }

  protected async checkRateLimit(tokensNeeded: number = 1): Promise<void> {
    this.refillRateLimitTokens();

    while (this.rateLimitTokens < tokensNeeded) {
      const waitTime = ((tokensNeeded - this.rateLimitTokens) /
        (this.config.rateLimit || 1000)) *
        1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.refillRateLimitTokens();
    }

    this.rateLimitTokens -= tokensNeeded;
  }

  protected updateCircuitBreaker(success: boolean): void {
    if (success) {
      this.circuitBreaker.successCount++;
      if (this.circuitBreaker.state === 'half-open' &&
          this.circuitBreaker.successCount >= 3) {
        this.circuitBreaker.state = 'closed';
        this.circuitBreaker.failures = 0;
        this.circuitBreaker.successCount = 0;
        this.emit('circuitBreakerClosed');
      }
    } else {
      this.circuitBreaker.failures++;
      this.circuitBreaker.lastFailureTime = Date.now();

      if (this.circuitBreaker.failures >= 5) {
        this.circuitBreaker.state = 'open';
        this.emit('circuitBreakerOpened');
      }
    }
  }

  protected shouldAttemptHealing(): boolean {
    if (this.circuitBreaker.state === 'closed') return true;

    if (this.circuitBreaker.state === 'open') {
      const timeSinceFailure = Date.now() - this.circuitBreaker.lastFailureTime;
      if (timeSinceFailure > 30000) {
        this.circuitBreaker.state = 'half-open';
        return true;
      }
      return false;
    }

    return true;
  }

  protected getConnection(key: string): unknown | null {
    return this.connectionPool.get(key) || null;
  }

  protected setConnection(key: string, connection: unknown): void {
    if (this.connectionPool.size >= this.poolSize) {
      const firstKey = this.connectionPool.keys().next().value;
      this.connectionPool.delete(firstKey);
    }
    this.connectionPool.set(key, connection);
  }

  protected addToDeadLetterQueue(item: BatchItem): void {
    this.deadLetterQueue.push(item);
    if (this.deadLetterQueue.length > 10000) {
      this.deadLetterQueue.shift();
    }
    this.emit('deadLetterQueued', item);
  }

  getDeadLetterQueue(): BatchItem[] {
    return [...this.deadLetterQueue];
  }

  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }

  protected startHealthChecks(): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(() => {
      this.healthCheck()
        .then((healthy) => {
          if (healthy) {
            this.updateCircuitBreaker(true);
          }
        })
        .catch((error) => {
          this.updateCircuitBreaker(false);
          this.emit('healthCheckFailed', error);
        });
    }, 60000);
  }

  protected stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  protected stopBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  getCircuitBreakerState(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }
}
