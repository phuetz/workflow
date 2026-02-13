/**
 * Kafka Client Implementation
 *
 * Features:
 * - Connection with SASL/SSL support
 * - Consumer groups
 * - Producer with acknowledgment modes
 * - Auto-commit configuration
 */

import type { KafkaConfig } from '../../types/streaming';
import {
  PlatformClient,
  StreamConfig,
  StreamEvent,
  ThroughputMetrics,
  createInitialMetrics,
} from './types';

export class KafkaClient implements PlatformClient {
  private kafka: any;
  private consumer: any;
  private producer: any;
  private connected = false;
  private config: StreamConfig;
  private metrics: ThroughputMetrics = createInitialMetrics();

  constructor(config: StreamConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid bundling if not used
      const { Kafka } = await import('kafkajs');
      const kafkaConfig = this.config.connectionConfig as KafkaConfig;

      this.kafka = new Kafka({
        clientId: kafkaConfig.clientId,
        brokers: kafkaConfig.brokers,
        ssl: kafkaConfig.ssl,
        sasl: kafkaConfig.sasl as any,
        connectionTimeout: kafkaConfig.connectionTimeout || 30000,
        requestTimeout: kafkaConfig.requestTimeout || 30000,
      });

      if (this.config.consumerConfig) {
        this.consumer = this.kafka.consumer({
          groupId: this.config.consumerConfig.groupId || 'default-group',
          sessionTimeout: this.config.consumerConfig.sessionTimeout || 30000,
          heartbeatInterval: this.config.consumerConfig.heartbeatInterval || 3000,
        });
        await this.consumer.connect();
        await this.consumer.subscribe({
          topics: this.config.consumerConfig.topics,
          fromBeginning: this.config.consumerConfig.fromBeginning || false,
        });
      }

      if (this.config.producerConfig) {
        this.producer = this.kafka.producer({
          allowAutoTopicCreation: true,
          idempotent: this.config.producerConfig.idempotent || false,
          maxInFlightRequests: this.config.producerConfig.maxInFlightRequests || 5,
        });
        await this.producer.connect();
      }

      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Kafka connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.consumer) {
      await this.consumer.disconnect();
    }
    if (this.producer) {
      await this.producer.disconnect();
    }
    this.connected = false;
  }

  async consume(handler: (event: StreamEvent) => Promise<void>): Promise<void> {
    if (!this.consumer) {
      throw new Error('Consumer not initialized');
    }

    await this.consumer.run({
      autoCommit: this.config.consumerConfig?.autoCommit ?? true,
      autoCommitInterval: this.config.consumerConfig?.autoCommitInterval || 5000,
      eachMessage: async ({ topic, partition, message }: any) => {
        const event: StreamEvent = {
          key: message.key?.toString() || '',
          value: this.parseValue(message.value),
          timestamp: Number(message.timestamp),
          partition,
          offset: message.offset,
          headers: this.parseHeaders(message.headers),
        };

        this.metrics.recordsIn++;
        await handler(event);
      },
    });
  }

  async produce(event: StreamEvent): Promise<void> {
    if (!this.producer) {
      throw new Error('Producer not initialized');
    }

    const topic = this.config.producerConfig?.topic;
    if (!topic) {
      throw new Error('Producer topic not configured');
    }

    await this.producer.send({
      topic,
      messages: [
        {
          key: event.key,
          value: JSON.stringify(event.value),
          timestamp: event.timestamp.toString(),
          headers: event.headers,
          partition: event.partition,
        },
      ],
      acks: this.config.producerConfig?.acks || -1,
      timeout: this.config.producerConfig?.timeout || 30000,
      compression: this.config.producerConfig?.compression,
    });

    this.metrics.recordsOut++;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getMetrics(): ThroughputMetrics {
    return { ...this.metrics };
  }

  private parseValue(value: Buffer): any {
    try {
      return JSON.parse(value.toString());
    } catch {
      return value.toString();
    }
  }

  private parseHeaders(headers: any): Record<string, string> {
    if (!headers) return {};

    const parsed: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      parsed[key] = (value as Buffer).toString();
    }
    return parsed;
  }
}
