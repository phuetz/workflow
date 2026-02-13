/**
 * SIEM Connectors Module
 * Supports Splunk, Elasticsearch, QRadar, LogRhythm, and Datadog
 * Features: Connection pooling, retry logic, batch processing, rate limiting
 */

import { EventEmitter } from 'events';

// Re-export all types
export * from './types';

// Re-export connectors
export { SplunkConnector } from './SplunkConnector';
export { ElasticsearchConnector } from './ElasticConnector';
export { QRadarConnector } from './QRadarConnector';
export { LogRhythmConnector } from './LogRhythmConnector';
export { DatadogSecurityConnector } from './DatadogConnector';

// Import for manager
import type {
  ISIEMConnector,
  SIEMEvent,
  CircuitBreakerState,
} from './types';
import { BaseSIEMConnector } from './types';

// ============================================================================
// SIEM Connector Manager
// ============================================================================

export class SIEMConnectorManager {
  private connectors: Map<string, ISIEMConnector> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();

  registerConnector(name: string, connector: ISIEMConnector): void {
    this.connectors.set(name, connector);
  }

  async sendEventToAll(event: SIEMEvent): Promise<void> {
    const promises = Array.from(this.connectors.values())
      .filter((connector) => connector.isConnected())
      .map((connector) =>
        connector.sendEvent(event).catch((error) => {
          this.eventEmitter.emit('error', { error, event });
        })
      );

    await Promise.all(promises);
  }

  async sendEventTo(connectorName: string, event: SIEMEvent): Promise<void> {
    const connector = this.connectors.get(connectorName);
    if (!connector) {
      throw new Error(`Connector '${connectorName}' not found`);
    }
    await connector.sendEvent(event);
  }

  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.connectors.values()).map((connector) =>
      connector.disconnect().catch((error) => {
        this.eventEmitter.emit('error', { error });
      })
    );

    await Promise.all(promises);
  }

  async getConnectorStatus(connectorName: string): Promise<{
    name: string;
    connected: boolean;
    healthy: boolean;
    circuitBreaker: CircuitBreakerState;
  } | null> {
    const connector = this.connectors.get(connectorName);
    if (!connector) return null;

    const healthy = await connector.healthCheck();
    return {
      name: connectorName,
      connected: connector.isConnected(),
      healthy,
      circuitBreaker:
        connector instanceof BaseSIEMConnector
          ? connector.getCircuitBreakerState()
          : { state: 'closed', failures: 0, lastFailureTime: 0, successCount: 0 },
    };
  }

  async getAllConnectorStatus(): Promise<Array<{
    name: string;
    connected: boolean;
    healthy: boolean;
    circuitBreaker: CircuitBreakerState;
  }>> {
    const statuses = await Promise.all(
      Array.from(this.connectors.keys()).map((name) =>
        this.getConnectorStatus(name)
      )
    );
    return statuses.filter(
      (status) => status !== null
    ) as Array<{
      name: string;
      connected: boolean;
      healthy: boolean;
      circuitBreaker: CircuitBreakerState;
    }>;
  }

  on(event: string, listener: (...args: unknown[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: unknown[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}
