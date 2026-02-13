/**
 * Kafka Service
 * Handles Apache Kafka operations using KafkaJS
 * Supports: Producer, Consumer, SASL/SSL, Compression, Serialization
 */

import { logger } from '../../services/LoggingService';
import { Kafka, Producer, Consumer, Admin, CompressionTypes, logLevel } from 'kafkajs';

interface KafkaCredentials {
  brokers: string[];
  clientId?: string;
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
}

interface KafkaProducerMessage {
  topic: string;
  messages: Array<{
    key?: string;
    value: string | Buffer;
    headers?: Record<string, string>;
    partition?: number;
  }>;
  compression?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
  acks?: number;
}

interface KafkaConsumerConfig {
  groupId: string;
  topics: string[];
  fromBeginning?: boolean;
  autoCommit?: boolean;
  sessionTimeout?: number;
  heartbeatInterval?: number;
}

export class KafkaService {
  private kafka: Kafka;
  private producer?: Producer;
  private consumer?: Consumer;
  private admin?: Admin;
  private isProducerConnected = false;
  private isConsumerConnected = false;

  constructor(credentials: KafkaCredentials) {
    try {
      // Initialize Kafka client
      this.kafka = new Kafka({
        clientId: credentials.clientId || 'workflow-kafka-client',
        brokers: credentials.brokers,
        ssl: credentials.ssl ? true : false,
        sasl: credentials.sasl ? {
          mechanism: credentials.sasl.mechanism,
          username: credentials.sasl.username,
          password: credentials.sasl.password,
        } : undefined,
        logLevel: logLevel.INFO,
      });

      logger.info(`Kafka service initialized with brokers: ${credentials.brokers.join(', ')}`);
    } catch (error) {
      logger.error('Failed to initialize Kafka service:', error);
      throw new Error('Kafka initialization failed');
    }
  }

  /**
   * PRODUCER OPERATIONS
   */

  /**
   * Initialize producer
   */
  private async initializeProducer(): Promise<void> {
    if (this.isProducerConnected) return;

    try {
      logger.info('Initializing Kafka producer');

      this.producer = this.kafka.producer();
      await this.producer.connect();
      this.isProducerConnected = true;

      logger.info('Kafka producer connected successfully');
    } catch (error) {
      logger.error('Failed to initialize Kafka producer:', error);
      throw new Error('Kafka producer initialization failed');
    }
  }

  /**
   * Send message(s) to topic
   */
  async send(config: KafkaProducerMessage): Promise<any> {
    try {
      await this.initializeProducer();

      logger.info(`Sending message(s) to Kafka topic: ${config.topic}`);

      // Map compression type
      let compression = CompressionTypes.None;
      if (config.compression) {
        switch (config.compression) {
          case 'gzip': compression = CompressionTypes.GZIP; break;
          case 'snappy': compression = CompressionTypes.Snappy; break;
          case 'lz4': compression = CompressionTypes.LZ4; break;
          case 'zstd': compression = CompressionTypes.ZSTD; break;
        }
      }

      const result = await this.producer!.send({
        topic: config.topic,
        messages: config.messages.map(msg => ({
          key: msg.key,
          value: msg.value,
          headers: msg.headers,
          partition: msg.partition,
        })),
        compression,
        acks: config.acks ?? -1,
      });

      logger.info(`Message(s) sent successfully to ${config.topic}`);
      return result;
    } catch (error) {
      logger.error('Failed to send Kafka message:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Send batch messages
   */
  async sendBatch(batches: KafkaProducerMessage[]): Promise<any> {
    try {
      await this.initializeProducer();

      logger.info(`Sending batch of ${batches.length} messages`);

      const topicMessages = batches.map(batch => {
        let compression = CompressionTypes.None;
        if (batch.compression) {
          switch (batch.compression) {
            case 'gzip': compression = CompressionTypes.GZIP; break;
            case 'snappy': compression = CompressionTypes.Snappy; break;
            case 'lz4': compression = CompressionTypes.LZ4; break;
            case 'zstd': compression = CompressionTypes.ZSTD; break;
          }
        }

        return {
          topic: batch.topic,
          messages: batch.messages,
          compression,
          acks: batch.acks ?? -1,
        };
      });

      const result = await this.producer!.sendBatch({
        topicMessages,
      });

      logger.info('Batch messages sent successfully');
      return result;
    } catch (error) {
      logger.error('Failed to send batch messages:', error);
      throw this.handleError(error);
    }
  }

  /**
   * CONSUMER OPERATIONS
   */

  /**
   * Initialize consumer
   */
  private async initializeConsumer(config: KafkaConsumerConfig): Promise<void> {
    if (this.isConsumerConnected) return;

    try {
      logger.info('Initializing Kafka consumer');

      this.consumer = this.kafka.consumer({
        groupId: config.groupId,
        sessionTimeout: config.sessionTimeout || 30000,
        heartbeatInterval: config.heartbeatInterval || 3000,
      });

      await this.consumer.connect();
      this.isConsumerConnected = true;

      logger.info('Kafka consumer connected successfully');
    } catch (error) {
      logger.error('Failed to initialize Kafka consumer:', error);
      throw new Error('Kafka consumer initialization failed');
    }
  }

  /**
   * Subscribe to topics and consume messages
   */
  async consume(
    config: KafkaConsumerConfig,
    onMessage: (message: any) => void | Promise<void>
  ): Promise<void> {
    try {
      await this.initializeConsumer(config);

      logger.info(`Subscribing to Kafka topics: ${config.topics.join(', ')}`);

      // Subscribe to topics
      await this.consumer!.subscribe({
        topics: config.topics,
        fromBeginning: config.fromBeginning || false,
      });

      // Start consuming
      await this.consumer!.run({
        autoCommit: config.autoCommit !== false,
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const messageData = {
              topic,
              partition,
              offset: message.offset,
              key: message.key?.toString(),
              value: message.value?.toString(),
              headers: message.headers,
              timestamp: message.timestamp,
            };

            logger.debug(`Received Kafka message from ${topic}`);
            await onMessage(messageData);
          } catch (error) {
            logger.error('Error processing Kafka message:', error);
          }
        },
      });

      logger.info('Kafka consumer running');
    } catch (error) {
      logger.error('Failed to consume Kafka messages:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Consume one message from topic
   */
  async consumeOne(config: KafkaConsumerConfig): Promise<any> {
    try {
      await this.initializeConsumer(config);

      logger.info(`Consuming one message from topics: ${config.topics.join(', ')}`);

      await this.consumer!.subscribe({
        topics: config.topics,
        fromBeginning: config.fromBeginning || false,
      });

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for message'));
        }, 30000); // 30 second timeout

        this.consumer!.run({
          autoCommit: config.autoCommit !== false,
          eachMessage: async ({ topic, partition, message }) => {
            clearTimeout(timeout);

            const messageData = {
              topic,
              partition,
              offset: message.offset,
              key: message.key?.toString(),
              value: message.value?.toString(),
              headers: message.headers,
              timestamp: message.timestamp,
            };

            // Stop consumer after getting one message
            await this.consumer!.disconnect();
            this.isConsumerConnected = false;

            resolve(messageData);
          },
        }).catch(reject);
      });
    } catch (error) {
      logger.error('Failed to consume one Kafka message:', error);
      throw this.handleError(error);
    }
  }

  /**
   * ADMIN OPERATIONS
   */

  /**
   * Initialize admin
   */
  private async initializeAdmin(): Promise<void> {
    if (this.admin) return;

    try {
      logger.info('Initializing Kafka admin');

      this.admin = this.kafka.admin();
      await this.admin.connect();

      logger.info('Kafka admin connected successfully');
    } catch (error) {
      logger.error('Failed to initialize Kafka admin:', error);
      throw new Error('Kafka admin initialization failed');
    }
  }

  /**
   * Create topics
   */
  async createTopics(topics: Array<{ topic: string; numPartitions?: number; replicationFactor?: number }>): Promise<void> {
    try {
      await this.initializeAdmin();

      logger.info(`Creating Kafka topics: ${topics.map(t => t.topic).join(', ')}`);

      await this.admin!.createTopics({
        topics: topics.map(t => ({
          topic: t.topic,
          numPartitions: t.numPartitions || 1,
          replicationFactor: t.replicationFactor || 1,
        })),
      });

      logger.info('Topics created successfully');
    } catch (error) {
      logger.error('Failed to create topics:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete topics
   */
  async deleteTopics(topics: string[]): Promise<void> {
    try {
      await this.initializeAdmin();

      logger.info(`Deleting Kafka topics: ${topics.join(', ')}`);

      await this.admin!.deleteTopics({
        topics,
      });

      logger.info('Topics deleted successfully');
    } catch (error) {
      logger.error('Failed to delete topics:', error);
      throw this.handleError(error);
    }
  }

  /**
   * List topics
   */
  async listTopics(): Promise<string[]> {
    try {
      await this.initializeAdmin();

      logger.info('Listing Kafka topics');

      const topics = await this.admin!.listTopics();

      logger.info(`Found ${topics.length} topics`);
      return topics;
    } catch (error) {
      logger.error('Failed to list topics:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get topic metadata
   */
  async getTopicMetadata(topics?: string[]): Promise<any> {
    try {
      await this.initializeAdmin();

      logger.info('Fetching topic metadata');

      const metadata = await this.admin!.fetchTopicMetadata({ topics });

      return metadata;
    } catch (error) {
      logger.error('Failed to fetch topic metadata:', error);
      throw this.handleError(error);
    }
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Serialize message value
   */
  serializeValue(value: any, format: 'json' | 'string' | 'binary'): string | Buffer {
    switch (format) {
      case 'json':
        return JSON.stringify(value);
      case 'string':
        return String(value);
      case 'binary':
        return Buffer.isBuffer(value) ? value : Buffer.from(value);
      default:
        return String(value);
    }
  }

  /**
   * Deserialize message value
   */
  deserializeValue(value: string | Buffer, format: 'json' | 'string' | 'binary'): any {
    switch (format) {
      case 'json':
        return JSON.parse(value.toString());
      case 'string':
        return value.toString();
      case 'binary':
        return value;
      default:
        return value.toString();
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: any): Error {
    if (error instanceof Error) {
      return new Error(`Kafka Error: ${error.message}`);
    }
    return new Error('Unknown Kafka error');
  }

  /**
   * Disconnect all clients
   */
  async disconnect(): Promise<void> {
    try {
      if (this.producer && this.isProducerConnected) {
        await this.producer.disconnect();
        this.isProducerConnected = false;
        logger.info('Kafka producer disconnected');
      }

      if (this.consumer && this.isConsumerConnected) {
        await this.consumer.disconnect();
        this.isConsumerConnected = false;
        logger.info('Kafka consumer disconnected');
      }

      if (this.admin) {
        await this.admin.disconnect();
        logger.info('Kafka admin disconnected');
      }
    } catch (error) {
      logger.error('Failed to disconnect Kafka clients:', error);
    }
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    return {
      service: 'Kafka',
      producerConnected: this.isProducerConnected,
      consumerConnected: this.isConsumerConnected,
      adminConnected: this.admin ? true : false,
    };
  }
}

// Export factory function
export function createKafkaService(credentials: KafkaCredentials): KafkaService {
  return new KafkaService(credentials);
}
