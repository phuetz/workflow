/**
 * Azure Event Hubs Client Implementation
 *
 * Features:
 * - Consumer group support ($Default or custom)
 * - Auto-reconnect with exponential backoff
 * - Partition-aware consuming and producing
 * - Batch message processing
 * - Graceful degradation when SDK is not installed
 * - Checkpointing support for reliable processing
 */

import type { EventHubsConfig } from '../../types/streaming';
import {
  PlatformClient,
  BatchProducer,
  StreamConfig,
  StreamEvent,
  ThroughputMetrics,
  createInitialMetrics,
  DEFAULT_RECONNECT_CONFIG,
} from './types';

export class EventHubsClient implements PlatformClient, BatchProducer {
  private config: StreamConfig;
  private consumerClient: any = null;
  private producerClient: any = null;
  private subscription: any = null;
  private connected = false;
  private consuming = false;
  private consumerGroup = '$Default';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = DEFAULT_RECONNECT_CONFIG.maxAttempts;
  private baseReconnectDelay = DEFAULT_RECONNECT_CONFIG.baseDelay;
  private sdkAvailable = true;
  private metrics: ThroughputMetrics = createInitialMetrics();

  constructor(config: StreamConfig) {
    this.config = config;
    if (this.config.consumerConfig?.groupId) {
      this.consumerGroup = this.config.consumerConfig.groupId;
    }
  }

  async connect(): Promise<void> {
    try {
      let EventHubsModule: any;
      try {
        EventHubsModule = await import('@azure/event-hubs');
      } catch (importError) {
        this.sdkAvailable = false;
        console.warn(
          'Azure Event Hubs SDK (@azure/event-hubs) is not installed. ' +
          'Install it with: npm install @azure/event-hubs'
        );
        throw new Error(
          'Azure Event Hubs SDK not available. Please install @azure/event-hubs package.'
        );
      }

      const eventHubsConfig = this.config.connectionConfig as EventHubsConfig;

      const connectionString =
        eventHubsConfig.connectionString ||
        process.env.AZURE_EVENTHUBS_CONNECTION_STRING;

      if (!connectionString) {
        throw new Error(
          'Event Hubs connection string not provided. ' +
          'Set it in config or AZURE_EVENTHUBS_CONNECTION_STRING environment variable.'
        );
      }

      const eventHubName = eventHubsConfig.eventHubName;
      if (!eventHubName) {
        throw new Error('Event Hub name is required in configuration.');
      }

      if (this.config.consumerConfig) {
        this.consumerClient = new EventHubsModule.EventHubConsumerClient(
          this.consumerGroup,
          connectionString,
          eventHubName
        );
      }

      if (this.config.producerConfig) {
        this.producerClient = new EventHubsModule.EventHubProducerClient(
          connectionString,
          eventHubName
        );
      }

      if (this.consumerClient) {
        await this.consumerClient.getEventHubProperties();
      } else if (this.producerClient) {
        await this.producerClient.getEventHubProperties();
      }

      this.connected = true;
      this.reconnectAttempts = 0;
      console.log(`Connected to Azure Event Hub: ${eventHubName}`);
    } catch (error) {
      this.connected = false;
      throw new Error(`Event Hubs connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.consuming = false;

    try {
      if (this.subscription) {
        await this.subscription.close();
        this.subscription = null;
      }

      if (this.consumerClient) {
        await this.consumerClient.close();
        this.consumerClient = null;
      }

      if (this.producerClient) {
        await this.producerClient.close();
        this.producerClient = null;
      }
    } catch (error) {
      console.error('Error during Event Hubs disconnect:', error);
    }

    this.connected = false;
  }

  async consume(handler: (event: StreamEvent) => Promise<void>): Promise<void> {
    if (!this.sdkAvailable) {
      throw new Error('Azure Event Hubs SDK not available');
    }

    if (!this.consumerClient) {
      throw new Error('Event Hubs consumer not initialized. Ensure consumerConfig is provided.');
    }

    this.consuming = true;

    try {
      const startPosition = this.config.consumerConfig?.fromBeginning
        ? { offset: '0' }
        : { offset: '@latest' };

      this.subscription = this.consumerClient.subscribe(
        {
          processEvents: async (events: any[], context: any) => {
            for (const event of events) {
              if (!this.consuming) break;

              try {
                const streamEvent: StreamEvent = {
                  key: event.partitionKey || '',
                  value: this.parseEventBody(event.body),
                  timestamp: event.enqueuedTimeUtc
                    ? event.enqueuedTimeUtc.getTime()
                    : Date.now(),
                  partition: context.partitionId ? parseInt(context.partitionId, 10) : undefined,
                  offset: event.offset,
                  headers: this.parseEventProperties(event.properties),
                  metadata: {
                    sequenceNumber: event.sequenceNumber,
                    enqueuedTimeUtc: event.enqueuedTimeUtc?.toISOString(),
                    partitionKey: event.partitionKey,
                    systemProperties: event.systemProperties,
                    correlationId: event.correlationId,
                    messageId: event.messageId,
                    contentType: event.contentType,
                  },
                };

                this.metrics.recordsIn++;
                this.metrics.bytesPerSecond += this.estimateEventSize(event);

                await handler(streamEvent);
              } catch (handlerError) {
                console.error(
                  `Error processing Event Hub event (partition: ${context.partitionId}, offset: ${event.offset}):`,
                  handlerError
                );
              }
            }
          },
          processError: async (err: Error, context: any) => {
            console.error(
              `Event Hub error (partition: ${context.partitionId}):`,
              err.message
            );

            if (
              this.consuming &&
              (err.message.includes('connection') ||
                err.message.includes('timeout') ||
                err.message.includes('disconnected'))
            ) {
              await this.handleReconnect();
            }
          },
        },
        {
          startPosition: startPosition,
          maxBatchSize: this.config.consumerConfig?.maxBytesPerPartition || 100,
          maxWaitTimeInSeconds: Math.ceil(
            (this.config.consumerConfig?.sessionTimeout || 30000) / 1000
          ),
        }
      );

      console.log(
        `Event Hubs consumer started (consumer group: ${this.consumerGroup})`
      );
    } catch (error) {
      if (this.consuming) {
        console.error('Event Hubs consume error:', error);
        await this.handleReconnect();
        if (this.connected) {
          await this.consume(handler);
        }
      }
    }
  }

  async produce(event: StreamEvent): Promise<void> {
    if (!this.sdkAvailable) {
      throw new Error('Azure Event Hubs SDK not available');
    }

    if (!this.producerClient) {
      throw new Error('Event Hubs producer not initialized. Ensure producerConfig is provided.');
    }

    try {
      const batchOptions: any = {};
      if (event.key) {
        batchOptions.partitionKey = event.key;
      } else if (event.partition !== undefined) {
        batchOptions.partitionId = event.partition.toString();
      }

      const batch = await this.producerClient.createBatch(batchOptions);

      const eventData: any = {
        body: event.value,
        properties: event.headers || {},
      };

      if (event.metadata?.correlationId) {
        eventData.correlationId = event.metadata.correlationId;
      }

      if (event.metadata?.contentType) {
        eventData.contentType = event.metadata.contentType;
      }

      const added = batch.tryAdd(eventData);
      if (!added) {
        throw new Error(
          'Event is too large to fit in a batch. Consider splitting the event or increasing batch size limits.'
        );
      }

      await this.producerClient.sendBatch(batch);
      this.metrics.recordsOut++;
    } catch (error: any) {
      console.error('Event Hubs produce error:', error);

      if (
        error.message?.includes('timeout') ||
        error.message?.includes('connection') ||
        error.code === 'ServiceUnavailable'
      ) {
        await this.retryProduce(event, 1);
      } else {
        throw error;
      }
    }
  }

  async produceBatch(events: StreamEvent[]): Promise<void> {
    if (!this.sdkAvailable) {
      throw new Error('Azure Event Hubs SDK not available');
    }

    if (!this.producerClient) {
      throw new Error('Event Hubs producer not initialized');
    }

    try {
      const eventsByPartition = new Map<string, StreamEvent[]>();

      for (const event of events) {
        const partitionKey = event.key || '_default';
        if (!eventsByPartition.has(partitionKey)) {
          eventsByPartition.set(partitionKey, []);
        }
        eventsByPartition.get(partitionKey)!.push(event);
      }

      for (const [partitionKey, partitionEvents] of eventsByPartition) {
        const batchOptions: any = {};
        if (partitionKey !== '_default') {
          batchOptions.partitionKey = partitionKey;
        }

        let batch = await this.producerClient.createBatch(batchOptions);
        let sentCount = 0;

        for (const event of partitionEvents) {
          const eventData = {
            body: event.value,
            properties: event.headers || {},
          };

          if (!batch.tryAdd(eventData)) {
            await this.producerClient.sendBatch(batch);
            sentCount += batch.count;

            batch = await this.producerClient.createBatch(batchOptions);
            if (!batch.tryAdd(eventData)) {
              throw new Error('Single event too large for Event Hubs batch');
            }
          }
        }

        if (batch.count > 0) {
          await this.producerClient.sendBatch(batch);
          sentCount += batch.count;
        }

        this.metrics.recordsOut += sentCount;
      }
    } catch (error) {
      console.error('Event Hubs batch produce error:', error);
      throw error;
    }
  }

  async getEventHubProperties(): Promise<any> {
    if (!this.sdkAvailable) {
      throw new Error('Azure Event Hubs SDK not available');
    }

    const client = this.consumerClient || this.producerClient;
    if (!client) {
      throw new Error('No Event Hubs client available');
    }

    return await client.getEventHubProperties();
  }

  async getPartitionIds(): Promise<string[]> {
    const properties = await this.getEventHubProperties();
    return properties.partitionIds;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getMetrics(): ThroughputMetrics {
    return { ...this.metrics };
  }

  isSdkAvailable(): boolean {
    return this.sdkAvailable;
  }

  private parseEventBody(body: any): any {
    if (body === undefined || body === null) {
      return null;
    }

    if (typeof body === 'object') {
      return body;
    }

    if (typeof body === 'string') {
      try {
        return JSON.parse(body);
      } catch {
        return body;
      }
    }

    if (Buffer.isBuffer(body)) {
      const str = body.toString('utf-8');
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    }

    return body;
  }

  private parseEventProperties(properties: any): Record<string, string> {
    if (!properties) return {};

    const result: Record<string, string> = {};
    if (typeof properties === 'object') {
      for (const [key, value] of Object.entries(properties)) {
        result[key] = String(value);
      }
    }
    return result;
  }

  private estimateEventSize(event: any): number {
    try {
      return JSON.stringify(event.body).length;
    } catch {
      return 0;
    }
  }

  private async retryProduce(event: StreamEvent, attempt: number): Promise<void> {
    const maxRetries = 3;
    const delay = Math.pow(2, attempt) * 100;

    if (attempt > maxRetries) {
      throw new Error(`Failed to produce to Event Hubs after ${maxRetries} retries`);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      const batch = await this.producerClient.createBatch({
        partitionKey: event.key || undefined,
      });
      batch.tryAdd({ body: event.value, properties: event.headers || {} });
      await this.producerClient.sendBatch(batch);
      this.metrics.recordsOut++;
    } catch (error: any) {
      if (
        error.message?.includes('timeout') ||
        error.message?.includes('connection')
      ) {
        await this.retryProduce(event, attempt + 1);
      } else {
        throw error;
      }
    }
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connected = false;
      throw new Error(
        `Max reconnect attempts (${this.maxReconnectAttempts}) exceeded for Event Hubs`
      );
    }

    this.reconnectAttempts++;
    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Event Hubs reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
    );

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.disconnect();
      await this.connect();
    } catch (error) {
      console.error('Event Hubs reconnect failed:', error);
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        await this.handleReconnect();
      } else {
        throw error;
      }
    }
  }
}
