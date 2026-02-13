/**
 * Source Connector - Handles connections to various streaming sources
 */

import { EventEmitter } from 'events';
import {
  IngestionSourceConfig,
  IngestionRecord,
  SchemaDefinition,
  SchemaField,
  SourceConnection,
} from './types';

export class SourceConnector extends EventEmitter {
  private sourceConnections: Map<string, SourceConnection> = new Map();
  private sourcePollers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Connect to a source
   */
  async connect(
    pipelineId: string,
    source: IngestionSourceConfig,
    onRecords: (records: IngestionRecord[]) => Promise<void>
  ): Promise<void> {
    const connectionKey = `${pipelineId}:${source.id}`;

    let connection: SourceConnection;

    switch (source.type) {
      case 'kafka':
        connection = await this.createKafkaConsumer(source);
        break;
      case 'kinesis':
        connection = await this.createKinesisConsumer(source);
        break;
      case 'pubsub':
        connection = await this.createPubSubSubscriber(source);
        break;
      case 'eventhub':
        connection = await this.createEventHubConsumer(source);
        break;
      case 'fluentd':
      case 'logstash':
      case 'filebeat':
        connection = await this.createLogCollectorReceiver(source);
        break;
      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }

    this.sourceConnections.set(connectionKey, connection);

    // Start polling
    const pollInterval = source.pollIntervalMs || 100;
    const poller = setInterval(async () => {
      try {
        const records = await connection.poll();
        if (records && records.length > 0) {
          await onRecords(records);
        }
      } catch (error) {
        this.emit('error', { pipelineId, sourceId: source.id, error });
      }
    }, pollInterval);

    this.sourcePollers.set(connectionKey, poller);

    this.emit('connected', { pipelineId, sourceId: source.id, type: source.type });
  }

  /**
   * Disconnect from a source
   */
  async disconnect(pipelineId: string, sourceId: string): Promise<void> {
    const connectionKey = `${pipelineId}:${sourceId}`;

    // Stop poller
    const poller = this.sourcePollers.get(connectionKey);
    if (poller) {
      clearInterval(poller);
      this.sourcePollers.delete(connectionKey);
    }

    // Close connection
    const connection = this.sourceConnections.get(connectionKey);
    if (connection) {
      await connection.close();
      this.sourceConnections.delete(connectionKey);
    }

    this.emit('disconnected', { pipelineId, sourceId });
  }

  /**
   * Disconnect all sources for a pipeline
   */
  async disconnectAll(pipelineId: string, sources: IngestionSourceConfig[]): Promise<void> {
    for (const source of sources) {
      await this.disconnect(pipelineId, source.id);
    }
  }

  /**
   * Check if a source is connected
   */
  isConnected(pipelineId: string, sourceId: string): boolean {
    const connectionKey = `${pipelineId}:${sourceId}`;
    const connection = this.sourceConnections.get(connectionKey);
    return connection?.connected || false;
  }

  /**
   * Get connection for a source
   */
  getConnection(pipelineId: string, sourceId: string): SourceConnection | undefined {
    const connectionKey = `${pipelineId}:${sourceId}`;
    return this.sourceConnections.get(connectionKey);
  }

  /**
   * Shutdown all connections
   */
  async shutdown(): Promise<void> {
    // Stop all pollers
    this.sourcePollers.forEach((timer) => {
      clearInterval(timer);
    });
    this.sourcePollers.clear();

    // Close all connections
    for (const [, connection] of this.sourceConnections) {
      await connection.close();
    }
    this.sourceConnections.clear();
  }

  // Source connection creators (simulated for testing)
  private async createKafkaConsumer(source: IngestionSourceConfig): Promise<SourceConnection> {
    return {
      type: 'kafka',
      connected: true,
      poll: async () => this.simulateKafkaMessages(source),
      commit: async () => {},
      close: async () => {},
    };
  }

  private async createKinesisConsumer(source: IngestionSourceConfig): Promise<SourceConnection> {
    return {
      type: 'kinesis',
      connected: true,
      poll: async () => this.simulateKinesisRecords(source),
      checkpoint: async () => {},
      close: async () => {},
    };
  }

  private async createPubSubSubscriber(source: IngestionSourceConfig): Promise<SourceConnection> {
    return {
      type: 'pubsub',
      connected: true,
      poll: async () => this.simulatePubSubMessages(source),
      ack: async () => {},
      close: async () => {},
    };
  }

  private async createEventHubConsumer(source: IngestionSourceConfig): Promise<SourceConnection> {
    return {
      type: 'eventhub',
      connected: true,
      poll: async () => this.simulateEventHubEvents(source),
      checkpoint: async () => {},
      close: async () => {},
    };
  }

  private async createLogCollectorReceiver(source: IngestionSourceConfig): Promise<SourceConnection> {
    return {
      type: source.type,
      connected: true,
      poll: async () => this.simulateLogMessages(source),
      close: async () => {},
    };
  }

  // Simulation methods for testing
  private simulateKafkaMessages(source: IngestionSourceConfig): IngestionRecord[] {
    const count = Math.floor(Math.random() * 10) + 1;
    return Array.from({ length: count }, (_, i) => ({
      id: `kafka_${Date.now()}_${i}`,
      sourceId: source.id,
      timestamp: new Date(),
      key: `key_${Math.floor(Math.random() * 100)}`,
      value: this.generateSampleData(source.schema),
      partition: Math.floor(Math.random() * (source.partitions || 1)),
      offset: `${Date.now()}_${i}`,
    }));
  }

  private simulateKinesisRecords(source: IngestionSourceConfig): IngestionRecord[] {
    const count = Math.floor(Math.random() * 5) + 1;
    return Array.from({ length: count }, (_, i) => ({
      id: `kinesis_${Date.now()}_${i}`,
      sourceId: source.id,
      timestamp: new Date(),
      value: this.generateSampleData(source.schema),
      partition: Math.floor(Math.random() * (source.partitions || 1)),
      offset: `shard-0:${Date.now()}_${i}`,
    }));
  }

  private simulatePubSubMessages(source: IngestionSourceConfig): IngestionRecord[] {
    const count = Math.floor(Math.random() * 8) + 1;
    return Array.from({ length: count }, (_, i) => ({
      id: `pubsub_${Date.now()}_${i}`,
      sourceId: source.id,
      timestamp: new Date(),
      value: this.generateSampleData(source.schema),
      headers: { messageId: `msg_${Date.now()}_${i}` },
    }));
  }

  private simulateEventHubEvents(source: IngestionSourceConfig): IngestionRecord[] {
    const count = Math.floor(Math.random() * 6) + 1;
    return Array.from({ length: count }, (_, i) => ({
      id: `eventhub_${Date.now()}_${i}`,
      sourceId: source.id,
      timestamp: new Date(),
      value: this.generateSampleData(source.schema),
      partition: Math.floor(Math.random() * 4),
      offset: `${Date.now()}_${i}`,
    }));
  }

  private simulateLogMessages(source: IngestionSourceConfig): IngestionRecord[] {
    const count = Math.floor(Math.random() * 15) + 1;
    return Array.from({ length: count }, (_, i) => ({
      id: `log_${Date.now()}_${i}`,
      sourceId: source.id,
      timestamp: new Date(),
      value: {
        message: `Log message ${i}`,
        level: ['info', 'warn', 'error', 'debug'][Math.floor(Math.random() * 4)],
        service: 'sample-service',
        timestamp: new Date().toISOString(),
      },
      headers: { tag: source.connection.tags?.[0] || 'default' },
    }));
  }

  private generateSampleData(schema?: SchemaDefinition): any {
    if (!schema) {
      return {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        value: Math.random() * 1000,
      };
    }

    const data: Record<string, any> = {};
    for (const field of schema.fields) {
      data[field.name] = this.generateFieldValue(field);
    }
    return data;
  }

  private generateFieldValue(field: SchemaField): any {
    switch (field.type) {
      case 'string':
        return field.enum
          ? field.enum[Math.floor(Math.random() * field.enum.length)]
          : `string_${Math.random().toString(36).substring(7)}`;
      case 'number':
        return Math.random() * 1000;
      case 'boolean':
        return Math.random() > 0.5;
      case 'date':
        return new Date().toISOString();
      case 'object':
        return { nested: 'value' };
      case 'array':
        return [1, 2, 3];
      case 'binary':
        return Buffer.from('binary data').toString('base64');
      default:
        return null;
    }
  }
}
