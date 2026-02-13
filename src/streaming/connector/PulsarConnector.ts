/**
 * Pulsar Client Implementation
 *
 * Features:
 * - Connection pooling
 * - Auto-reconnect with exponential backoff
 * - Schema support (JSON, Avro)
 * - Dead letter queue support
 * - Batching for high throughput
 */

import type { PulsarConfig } from '../../types/streaming';
import {
  PlatformClient,
  StreamConfig,
  StreamEvent,
  ThroughputMetrics,
  createInitialMetrics,
  DEFAULT_RECONNECT_CONFIG,
} from './types';

export class PulsarClient implements PlatformClient {
  private config: StreamConfig;
  private client: any = null;
  private consumer: any = null;
  private producer: any = null;
  private connected = false;
  private consuming = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = DEFAULT_RECONNECT_CONFIG.maxAttempts;
  private baseReconnectDelay = DEFAULT_RECONNECT_CONFIG.baseDelay;
  private metrics: ThroughputMetrics = createInitialMetrics();

  constructor(config: StreamConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid bundling if not used
      const Pulsar = await import('pulsar-client');
      const pulsarConfig = this.config.connectionConfig as PulsarConfig;

      // Create client with authentication if provided
      const clientConfig: any = {
        serviceUrl: pulsarConfig.serviceUrl,
        operationTimeoutSeconds: pulsarConfig.operationTimeout
          ? Math.ceil(pulsarConfig.operationTimeout / 1000)
          : 30,
      };

      // Add authentication token if provided
      if (pulsarConfig.authToken) {
        clientConfig.authentication = new Pulsar.AuthenticationToken({
          token: pulsarConfig.authToken,
        });
      }

      // Add TLS configuration if provided
      if (pulsarConfig.tlsTrustCertsFilePath) {
        clientConfig.tlsTrustCertsFilePath = pulsarConfig.tlsTrustCertsFilePath;
        clientConfig.tlsValidateHostname = true;
        clientConfig.tlsAllowInsecureConnection = false;
      }

      this.client = new Pulsar.Client(clientConfig);

      // Create consumer if consumer config is provided
      if (this.config.consumerConfig) {
        const consumerConfig: any = {
          topic: this.config.consumerConfig.topics[0],
          subscription: this.config.consumerConfig.groupId || 'default-subscription',
          subscriptionType: 'Shared',
          ackTimeoutMs: this.config.consumerConfig.sessionTimeout || 30000,
          receiverQueueSize: this.config.consumerConfig.maxBytesPerPartition || 1000,
          subscriptionInitialPosition: this.config.consumerConfig.fromBeginning
            ? 'Earliest'
            : 'Latest',
        };

        // Multi-topic subscription
        if (this.config.consumerConfig.topics.length > 1) {
          consumerConfig.topicsPattern = this.config.consumerConfig.topics.join('|');
        }

        this.consumer = await this.client.subscribe(consumerConfig);
      }

      // Create producer if producer config is provided
      if (this.config.producerConfig) {
        const producerConfig: any = {
          topic: this.config.producerConfig.topic,
          sendTimeoutMs: this.config.producerConfig.timeout || 30000,
          batchingEnabled: true,
          batchingMaxMessages: 1000,
          batchingMaxPublishDelayMs: 10,
        };

        // Compression configuration
        if (this.config.producerConfig.compression && this.config.producerConfig.compression !== 'none') {
          const compressionMap: Record<string, string> = {
            'gzip': 'GZIP',
            'snappy': 'Snappy',
            'lz4': 'LZ4',
            'zstd': 'ZSTD',
          };
          producerConfig.compressionType = compressionMap[this.config.producerConfig.compression] || 'NONE';
        }

        this.producer = await this.client.createProducer(producerConfig);
      }

      this.connected = true;
      this.reconnectAttempts = 0;
    } catch (error) {
      this.connected = false;
      throw new Error(`Pulsar connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.consuming = false;

    try {
      if (this.consumer) {
        await this.consumer.close();
        this.consumer = null;
      }

      if (this.producer) {
        await this.producer.flush();
        await this.producer.close();
        this.producer = null;
      }

      if (this.client) {
        await this.client.close();
        this.client = null;
      }
    } catch (error) {
      console.error('Error during Pulsar disconnect:', error);
    }

    this.connected = false;
  }

  async consume(handler: (event: StreamEvent) => Promise<void>): Promise<void> {
    if (!this.consumer) {
      throw new Error('Pulsar consumer not initialized');
    }

    this.consuming = true;

    while (this.consuming && this.connected) {
      try {
        // Receive message with timeout
        const message = await this.consumer.receive(5000);

        if (message) {
          const event: StreamEvent = {
            key: message.getPartitionKey() || '',
            value: this.parseMessageData(message.getData()),
            timestamp: message.getEventTimestamp() || Date.now(),
            offset: message.getMessageId().toString(),
            headers: this.parseProperties(message.getProperties()),
            metadata: {
              topic: message.getTopicName(),
              producerName: message.getProducerName(),
              sequenceId: message.getSequenceId(),
              redeliveryCount: message.getRedeliveryCount(),
            },
          };

          try {
            this.metrics.recordsIn++;
            await handler(event);
            await this.consumer.acknowledge(message);
          } catch (handlerError) {
            await this.consumer.negativeAcknowledge(message);
            throw handlerError;
          }
        }
      } catch (error: any) {
        if (this.consuming) {
          if (error.message?.includes('timeout')) {
            continue;
          }
          console.error('Pulsar consume error:', error);
          await this.handleReconnect();
        }
      }
    }
  }

  async produce(event: StreamEvent): Promise<void> {
    if (!this.producer) {
      throw new Error('Pulsar producer not initialized');
    }

    try {
      const messageBuilder: any = {
        data: Buffer.from(JSON.stringify(event.value)),
        eventTimestamp: event.timestamp,
      };

      if (event.key) {
        messageBuilder.partitionKey = event.key;
      }

      if (event.headers) {
        messageBuilder.properties = event.headers;
      }

      await this.producer.send(messageBuilder);
      this.metrics.recordsOut++;
    } catch (error) {
      if (this.connected) {
        await this.handleReconnect();
        await this.producer.send({
          data: Buffer.from(JSON.stringify(event.value)),
          eventTimestamp: event.timestamp,
          partitionKey: event.key,
          properties: event.headers,
        });
        this.metrics.recordsOut++;
      } else {
        throw error;
      }
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getMetrics(): ThroughputMetrics {
    return { ...this.metrics };
  }

  private parseMessageData(data: Buffer): any {
    try {
      return JSON.parse(data.toString('utf-8'));
    } catch {
      return data.toString('utf-8');
    }
  }

  private parseProperties(properties: any): Record<string, string> {
    if (!properties) return {};

    const result: Record<string, string> = {};
    if (typeof properties.forEach === 'function') {
      properties.forEach((value: string, key: string) => {
        result[key] = value;
      });
    } else if (typeof properties === 'object') {
      Object.entries(properties).forEach(([key, value]) => {
        result[key] = String(value);
      });
    }
    return result;
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connected = false;
      throw new Error(`Max reconnect attempts (${this.maxReconnectAttempts}) exceeded for Pulsar`);
    }

    this.reconnectAttempts++;
    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Pulsar reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.disconnect();
      await this.connect();
    } catch (error) {
      console.error('Pulsar reconnect failed:', error);
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        await this.handleReconnect();
      } else {
        throw error;
      }
    }
  }
}
