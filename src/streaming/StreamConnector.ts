/**
 * Stream Connector
 *
 * Universal connector supporting 7+ streaming platforms:
 * - Apache Kafka
 * - Apache Pulsar
 * - Amazon Kinesis
 * - Google Pub/Sub
 * - Azure Event Hubs
 * - Redis Streams
 * - NATS Streaming
 *
 * Features:
 * - Connection pooling
 * - Auto-reconnect
 * - Health monitoring
 * - Metrics collection
 */

import { EventEmitter } from 'events';
import type {
  StreamConfig,
  StreamEvent,
  ThroughputMetrics,
} from '../types/streaming';

// Import platform-specific clients
import { PlatformClient, createInitialMetrics } from './connector/types';
import { KafkaClient } from './connector/KafkaConnector';
import { PulsarClient } from './connector/PulsarConnector';
import { KinesisClient } from './connector/KinesisConnector';
import { PubSubClient } from './connector/PubSubConnector';
import { EventHubsClient } from './connector/EventHubsConnector';
import { RedisStreamClient } from './connector/RedisStreamConnector';
import { NatsClient } from './connector/NatsConnector';

export class StreamConnector extends EventEmitter {
  private config: StreamConfig;
  private client: PlatformClient | null = null;
  private isRunning = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private metrics: ThroughputMetrics = createInitialMetrics();
  private metricsInterval: NodeJS.Timeout | null = null;
  private eventCounts: number[] = [];

  constructor(config: StreamConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to the streaming platform
   */
  async connect(): Promise<void> {
    try {
      this.client = await this.createClient();
      await this.client.connect();
      this.isRunning = true;
      this.reconnectAttempts = 0;
      this.startMetricsCollection();
      this.emit('connected', { platform: this.config.platform });
    } catch (error) {
      this.emit('error', error);
      await this.handleReconnect();
      throw error;
    }
  }

  /**
   * Disconnect from the streaming platform
   */
  async disconnect(): Promise<void> {
    this.isRunning = false;
    this.stopMetricsCollection();

    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }

    this.emit('disconnected', { platform: this.config.platform });
  }

  /**
   * Consume events from the stream
   */
  async consume(handler: (event: StreamEvent) => Promise<void>): Promise<void> {
    if (!this.client || !this.isRunning) {
      throw new Error('StreamConnector not connected');
    }

    await this.client.consume(async (event) => {
      try {
        this.metrics.recordsIn++;
        await handler(event);
        this.emit('event', event);
      } catch (error) {
        this.emit('error', { event, error });
        throw error;
      }
    });
  }

  /**
   * Produce an event to the stream
   */
  async produce(event: StreamEvent): Promise<void> {
    if (!this.client || !this.isRunning) {
      throw new Error('StreamConnector not connected');
    }

    try {
      await this.client.produce(event);
      this.metrics.recordsOut++;
      this.emit('produced', event);
    } catch (error) {
      this.emit('error', { event, error });
      throw error;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): ThroughputMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.client?.isConnected() ?? false;
  }

  /**
   * Get the underlying platform client
   */
  getClient(): PlatformClient | null {
    return this.client;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async createClient(): Promise<PlatformClient> {
    switch (this.config.platform) {
      case 'kafka':
        return new KafkaClient(this.config);
      case 'pulsar':
        return new PulsarClient(this.config);
      case 'kinesis':
        return new KinesisClient(this.config);
      case 'pubsub':
        return new PubSubClient(this.config);
      case 'eventhubs':
        return new EventHubsClient(this.config);
      case 'redis':
        return new RedisStreamClient(this.config);
      case 'nats':
        return new NatsClient(this.config);
      default:
        throw new Error(`Unsupported platform: ${this.config.platform}`);
    }
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('max-reconnect-attempts', {
        platform: this.config.platform,
        attempts: this.reconnectAttempts,
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    this.emit('reconnecting', {
      platform: this.config.platform,
      attempt: this.reconnectAttempts,
      delay,
    });

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.connect();
    } catch (error) {
      // Error already emitted in connect()
    }
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.eventCounts.push(this.metrics.recordsIn);
      if (this.eventCounts.length > 60) {
        this.eventCounts.shift();
      }

      // Calculate events per second
      if (this.eventCounts.length >= 2) {
        const recent = this.eventCounts[this.eventCounts.length - 1];
        const previous = this.eventCounts[this.eventCounts.length - 2];
        this.metrics.eventsPerSecond = recent - previous;
      }

      this.emit('metrics', this.metrics);
    }, 1000);
  }

  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }
}

// Re-export types and platform clients for convenience
export { PlatformClient, createInitialMetrics } from './connector/types';
export { KafkaClient } from './connector/KafkaConnector';
export { PulsarClient } from './connector/PulsarConnector';
export { KinesisClient } from './connector/KinesisConnector';
export { PubSubClient } from './connector/PubSubConnector';
export { EventHubsClient } from './connector/EventHubsConnector';
export { RedisStreamClient } from './connector/RedisStreamConnector';
export { NatsClient } from './connector/NatsConnector';
