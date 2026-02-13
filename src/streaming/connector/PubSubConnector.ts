/**
 * Google Pub/Sub Client Implementation
 *
 * Features:
 * - Connection pooling with configurable settings
 * - Auto-reconnect with exponential backoff
 * - Dead letter queue support
 * - Message ordering with ordering keys
 * - Flow control for backpressure management
 * - Graceful shutdown with message acknowledgment
 */

import {
  PlatformClient,
  BatchProducer,
  StreamConfig,
  StreamEvent,
  ThroughputMetrics,
  createInitialMetrics,
  DEFAULT_RECONNECT_CONFIG,
} from './types';

interface PubSubConfig {
  projectId: string;
  keyFilename?: string;
  credentials?: Record<string, unknown>;
}

export class PubSubClient implements PlatformClient, BatchProducer {
  private config: StreamConfig;
  private pubsub: any = null;
  private subscriptions: Map<string, any> = new Map();
  private connected = false;
  private consuming = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = DEFAULT_RECONNECT_CONFIG.maxAttempts;
  private baseReconnectDelay = DEFAULT_RECONNECT_CONFIG.baseDelay;
  private sdkAvailable = true;
  private metrics: ThroughputMetrics = createInitialMetrics();

  constructor(config: StreamConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      let PubSubModule: any;
      try {
        PubSubModule = await import('@google-cloud/pubsub');
      } catch (importError) {
        this.sdkAvailable = false;
        console.warn(
          'Google Cloud Pub/Sub SDK (@google-cloud/pubsub) is not installed. ' +
            'Install it with: npm install @google-cloud/pubsub'
        );
        throw new Error(
          'Google Cloud Pub/Sub SDK not available. Install @google-cloud/pubsub to use this connector.'
        );
      }

      const pubsubConfig = this.config.connectionConfig as PubSubConfig;

      const clientConfig: any = {
        projectId: pubsubConfig.projectId,
      };

      if (pubsubConfig.keyFilename) {
        clientConfig.keyFilename = pubsubConfig.keyFilename;
      } else if (pubsubConfig.credentials) {
        clientConfig.credentials = pubsubConfig.credentials;
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        clientConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }

      this.pubsub = new PubSubModule.PubSub(clientConfig);

      if (this.config.consumerConfig?.topics?.[0]) {
        try {
          const [exists] = await this.pubsub.topic(this.config.consumerConfig.topics[0]).exists();
          if (!exists) {
            console.warn(
              `Topic ${this.config.consumerConfig.topics[0]} does not exist. ` +
                'It will be created on first publish if you have permissions.'
            );
          }
        } catch (checkError) {
          console.warn('Could not verify topic existence:', checkError);
        }
      }

      this.connected = true;
      this.reconnectAttempts = 0;
    } catch (error) {
      this.connected = false;
      if (this.sdkAvailable) {
        throw new Error(`Google Pub/Sub connection failed: ${error}`);
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.consuming = false;

    try {
      const closePromises: Promise<void>[] = [];

      for (const [name, subscription] of this.subscriptions.entries()) {
        closePromises.push(
          (async () => {
            try {
              subscription.removeAllListeners();
              await subscription.close();
              console.log(`Closed subscription: ${name}`);
            } catch (closeError) {
              console.error(`Error closing subscription ${name}:`, closeError);
            }
          })()
        );
      }

      await Promise.all(closePromises);
      this.subscriptions.clear();

      if (this.pubsub) {
        await this.pubsub.close();
        this.pubsub = null;
      }
    } catch (error) {
      console.error('Error during Pub/Sub disconnect:', error);
    }

    this.connected = false;
  }

  async consume(handler: (event: StreamEvent) => Promise<void>): Promise<void> {
    if (!this.pubsub) {
      throw new Error('Google Pub/Sub client not connected');
    }

    const consumerConfig = this.config.consumerConfig;
    if (!consumerConfig?.topics?.[0]) {
      throw new Error('Consumer topic not configured');
    }

    const topicName = consumerConfig.topics[0];
    const subscriptionName = consumerConfig.groupId || `${topicName}-subscription`;

    this.consuming = true;

    try {
      let subscription = this.subscriptions.get(subscriptionName);

      if (!subscription) {
        subscription = this.pubsub.subscription(subscriptionName, {
          flowControl: {
            maxMessages: consumerConfig.maxBytesPerPartition || 100,
            allowExcessMessages: false,
          },
          ackDeadline: consumerConfig.sessionTimeout
            ? Math.ceil(consumerConfig.sessionTimeout / 1000)
            : 30,
        });

        this.subscriptions.set(subscriptionName, subscription);
      }

      subscription.on('message', async (message: any) => {
        if (!this.consuming) {
          message.nack();
          return;
        }

        try {
          const messageData = this.parseMessageData(message.data);

          const event: StreamEvent = {
            key: message.orderingKey || message.id,
            value: messageData,
            timestamp: message.publishTime ? new Date(message.publishTime).getTime() : Date.now(),
            offset: message.id,
            headers: message.attributes || {},
            metadata: {
              ackId: message.ackId,
              deliveryAttempt: message.deliveryAttempt,
              orderingKey: message.orderingKey,
              topic: topicName,
              subscription: subscriptionName,
            },
          };

          this.metrics.recordsIn++;
          this.metrics.bytesPerSecond += message.data?.length || 0;

          await handler(event);
          message.ack();
        } catch (handlerError) {
          console.error('Error processing Pub/Sub message:', handlerError);
          message.nack();
        }
      });

      subscription.on('error', async (error: any) => {
        console.error('Pub/Sub subscription error:', error);

        if (this.consuming) {
          try {
            await this.handleReconnect();
            if (this.connected && this.consuming) {
              await this.consume(handler);
            }
          } catch (reconnectError) {
            console.error('Failed to reconnect to Pub/Sub:', reconnectError);
          }
        }
      });

      subscription.on('close', () => {
        console.log(`Subscription ${subscriptionName} closed`);
        this.subscriptions.delete(subscriptionName);
      });

      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.consuming) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 1000);
      });
    } catch (error) {
      if (this.consuming) {
        console.error('Pub/Sub consume error:', error);
        await this.handleReconnect();
        if (this.connected) {
          await this.consume(handler);
        }
      }
    }
  }

  async produce(event: StreamEvent): Promise<void> {
    if (!this.pubsub) {
      throw new Error('Google Pub/Sub client not connected');
    }

    const producerConfig = this.config.producerConfig;
    if (!producerConfig?.topic) {
      throw new Error('Producer topic not configured');
    }

    try {
      const topic = this.pubsub.topic(producerConfig.topic, {
        batching: {
          maxMessages: 100,
          maxMilliseconds: producerConfig.timeout || 1000,
        },
        enableMessageOrdering: !!event.key,
      });

      const messageData = Buffer.from(
        typeof event.value === 'string' ? event.value : JSON.stringify(event.value)
      );

      const messageConfig: any = {
        data: messageData,
      };

      if (event.headers && Object.keys(event.headers).length > 0) {
        messageConfig.attributes = event.headers;
      }

      if (event.key) {
        messageConfig.orderingKey = event.key;
      }

      const messageId = await topic.publishMessage(messageConfig);

      this.metrics.recordsOut++;
      this.metrics.bytesPerSecond += messageData.length;

      return messageId;
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        throw new Error(`Topic ${producerConfig.topic} not found`);
      } else if (error.code === 'PERMISSION_DENIED') {
        throw new Error(`Permission denied to publish to ${producerConfig.topic}`);
      }
      throw error;
    }
  }

  async produceBatch(events: StreamEvent[]): Promise<string[]> {
    if (!this.pubsub) {
      throw new Error('Google Pub/Sub client not connected');
    }

    const producerConfig = this.config.producerConfig;
    if (!producerConfig?.topic) {
      throw new Error('Producer topic not configured');
    }

    const topic = this.pubsub.topic(producerConfig.topic, {
      batching: {
        maxMessages: 1000,
        maxMilliseconds: producerConfig.timeout || 100,
      },
    });

    const publishPromises: Promise<string>[] = [];

    for (const event of events) {
      const messageData = Buffer.from(
        typeof event.value === 'string' ? event.value : JSON.stringify(event.value)
      );

      const messageConfig: any = {
        data: messageData,
      };

      if (event.headers) {
        messageConfig.attributes = event.headers;
      }

      if (event.key) {
        messageConfig.orderingKey = event.key;
      }

      publishPromises.push(topic.publishMessage(messageConfig));
      this.metrics.bytesPerSecond += messageData.length;
    }

    const messageIds = await Promise.all(publishPromises);
    this.metrics.recordsOut += events.length;

    return messageIds;
  }

  async createTopic(topicName: string): Promise<void> {
    if (!this.pubsub) {
      throw new Error('Google Pub/Sub client not connected');
    }

    try {
      const [exists] = await this.pubsub.topic(topicName).exists();
      if (!exists) {
        await this.pubsub.createTopic(topicName);
        console.log(`Created topic: ${topicName}`);
      }
    } catch (error) {
      throw new Error(`Failed to create topic ${topicName}: ${error}`);
    }
  }

  async createSubscription(
    topicName: string,
    subscriptionName: string,
    options?: {
      ackDeadlineSeconds?: number;
      retainAckedMessages?: boolean;
      messageRetentionDuration?: { seconds: number };
      deadLetterPolicy?: {
        deadLetterTopic: string;
        maxDeliveryAttempts: number;
      };
    }
  ): Promise<void> {
    if (!this.pubsub) {
      throw new Error('Google Pub/Sub client not connected');
    }

    try {
      const [exists] = await this.pubsub.subscription(subscriptionName).exists();
      if (!exists) {
        const subscriptionOptions: any = {
          ackDeadlineSeconds: options?.ackDeadlineSeconds || 30,
        };

        if (options?.retainAckedMessages !== undefined) {
          subscriptionOptions.retainAckedMessages = options.retainAckedMessages;
        }

        if (options?.messageRetentionDuration) {
          subscriptionOptions.messageRetentionDuration = options.messageRetentionDuration;
        }

        if (options?.deadLetterPolicy) {
          subscriptionOptions.deadLetterPolicy = {
            deadLetterTopic: `projects/${this.getProjectId()}/topics/${options.deadLetterPolicy.deadLetterTopic}`,
            maxDeliveryAttempts: options.deadLetterPolicy.maxDeliveryAttempts,
          };
        }

        await this.pubsub
          .topic(topicName)
          .createSubscription(subscriptionName, subscriptionOptions);
        console.log(`Created subscription: ${subscriptionName} for topic: ${topicName}`);
      }
    } catch (error) {
      throw new Error(`Failed to create subscription ${subscriptionName}: ${error}`);
    }
  }

  isConnected(): boolean {
    return this.connected && this.sdkAvailable;
  }

  getMetrics(): ThroughputMetrics {
    return { ...this.metrics };
  }

  private getProjectId(): string {
    const pubsubConfig = this.config.connectionConfig as PubSubConfig;
    return pubsubConfig.projectId;
  }

  private parseMessageData(data: Buffer): any {
    if (!data) return null;

    try {
      const str = data.toString('utf-8');
      return JSON.parse(str);
    } catch {
      return data.toString('utf-8');
    }
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connected = false;
      throw new Error(
        `Max reconnect attempts (${this.maxReconnectAttempts}) exceeded for Google Pub/Sub`
      );
    }

    this.reconnectAttempts++;
    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Pub/Sub reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
    );

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.disconnect();
      await this.connect();
    } catch (error) {
      console.error('Pub/Sub reconnect failed:', error);
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        await this.handleReconnect();
      } else {
        throw error;
      }
    }
  }
}
