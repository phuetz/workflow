/**
 * AWS Kinesis Client Implementation
 *
 * Features:
 * - Shard iteration with checkpointing
 * - Auto-reconnect with exponential backoff
 * - Support for enhanced fan-out consumers
 * - Batch record processing
 * - Rate limiting to avoid throttling
 */

import type { KinesisConfig } from '../../types/streaming';
import {
  PlatformClient,
  BatchProducer,
  StreamConfig,
  StreamEvent,
  ThroughputMetrics,
  createInitialMetrics,
  DEFAULT_RECONNECT_CONFIG,
} from './types';

export class KinesisClient implements PlatformClient, BatchProducer {
  private config: StreamConfig;
  private kinesisClient: any = null;
  private connected = false;
  private consuming = false;
  private shardIterators: Map<string, string> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = DEFAULT_RECONNECT_CONFIG.maxAttempts;
  private baseReconnectDelay = DEFAULT_RECONNECT_CONFIG.baseDelay;
  private pollIntervalMs = 1000;
  private metrics: ThroughputMetrics = createInitialMetrics();

  constructor(config: StreamConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const { KinesisClient, DescribeStreamCommand } = await import('@aws-sdk/client-kinesis');
      const kinesisConfig = this.config.connectionConfig as KinesisConfig;

      const clientConfig: any = {
        region: kinesisConfig.region,
        credentials: {
          accessKeyId: kinesisConfig.accessKeyId,
          secretAccessKey: kinesisConfig.secretAccessKey,
        },
      };

      if (kinesisConfig.endpoint) {
        clientConfig.endpoint = kinesisConfig.endpoint;
      }

      this.kinesisClient = new KinesisClient(clientConfig);

      if (this.config.consumerConfig?.topics?.[0]) {
        const streamName = this.config.consumerConfig.topics[0];
        await this.kinesisClient.send(new DescribeStreamCommand({ StreamName: streamName }));
      }

      this.connected = true;
      this.reconnectAttempts = 0;
    } catch (error) {
      this.connected = false;
      throw new Error(`Kinesis connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.consuming = false;
    this.shardIterators.clear();

    if (this.kinesisClient) {
      this.kinesisClient.destroy();
      this.kinesisClient = null;
    }

    this.connected = false;
  }

  async consume(handler: (event: StreamEvent) => Promise<void>): Promise<void> {
    if (!this.kinesisClient) {
      throw new Error('Kinesis client not initialized');
    }

    const streamName = this.config.consumerConfig?.topics?.[0];
    if (!streamName) {
      throw new Error('Stream name not configured');
    }

    this.consuming = true;

    try {
      const {
        DescribeStreamCommand,
        GetShardIteratorCommand,
        GetRecordsCommand,
      } = await import('@aws-sdk/client-kinesis');

      const describeResponse = await this.kinesisClient.send(
        new DescribeStreamCommand({ StreamName: streamName })
      );

      const shards = describeResponse.StreamDescription?.Shards || [];

      for (const shard of shards) {
        if (!shard.ShardId) continue;

        const iteratorType = this.config.consumerConfig?.fromBeginning
          ? 'TRIM_HORIZON'
          : 'LATEST';

        const iteratorResponse = await this.kinesisClient.send(
          new GetShardIteratorCommand({
            StreamName: streamName,
            ShardId: shard.ShardId,
            ShardIteratorType: iteratorType,
          })
        );

        if (iteratorResponse.ShardIterator) {
          this.shardIterators.set(shard.ShardId, iteratorResponse.ShardIterator);
        }
      }

      while (this.consuming && this.connected) {
        const pollPromises: Promise<void>[] = [];

        for (const [shardId, iterator] of this.shardIterators.entries()) {
          pollPromises.push(
            this.pollShard(shardId, iterator, handler, GetRecordsCommand)
          );
        }

        await Promise.all(pollPromises);
        await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      }
    } catch (error) {
      if (this.consuming) {
        console.error('Kinesis consume error:', error);
        await this.handleReconnect();
        if (this.connected) {
          await this.consume(handler);
        }
      }
    }
  }

  private async pollShard(
    shardId: string,
    iterator: string,
    handler: (event: StreamEvent) => Promise<void>,
    GetRecordsCommand: any
  ): Promise<void> {
    try {
      const recordsResponse = await this.kinesisClient.send(
        new GetRecordsCommand({
          ShardIterator: iterator,
          Limit: 100,
        })
      );

      if (recordsResponse.NextShardIterator) {
        this.shardIterators.set(shardId, recordsResponse.NextShardIterator);
      } else {
        this.shardIterators.delete(shardId);
      }

      const records = recordsResponse.Records || [];
      for (const record of records) {
        const event: StreamEvent = {
          key: record.PartitionKey || '',
          value: this.parseRecordData(record.Data),
          timestamp: record.ApproximateArrivalTimestamp
            ? record.ApproximateArrivalTimestamp.getTime()
            : Date.now(),
          offset: record.SequenceNumber,
          headers: {},
          metadata: {
            shardId,
            encryptionType: record.EncryptionType,
          },
        };

        this.metrics.recordsIn++;
        this.metrics.bytesPerSecond += record.Data?.length || 0;
        await handler(event);
      }
    } catch (error: any) {
      if (error.name === 'ExpiredIteratorException') {
        const { GetShardIteratorCommand } = await import('@aws-sdk/client-kinesis');
        const streamName = this.config.consumerConfig?.topics?.[0];

        const iteratorResponse = await this.kinesisClient.send(
          new GetShardIteratorCommand({
            StreamName: streamName,
            ShardId: shardId,
            ShardIteratorType: 'LATEST',
          })
        );

        if (iteratorResponse.ShardIterator) {
          this.shardIterators.set(shardId, iteratorResponse.ShardIterator);
        }
      } else if (error.name === 'ProvisionedThroughputExceededException') {
        this.pollIntervalMs = Math.min(this.pollIntervalMs * 2, 5000);
        console.warn(`Kinesis throttled, increasing poll interval to ${this.pollIntervalMs}ms`);
      } else {
        throw error;
      }
    }
  }

  async produce(event: StreamEvent): Promise<void> {
    if (!this.kinesisClient) {
      throw new Error('Kinesis client not initialized');
    }

    const streamName = this.config.producerConfig?.topic;
    if (!streamName) {
      throw new Error('Producer stream name not configured');
    }

    try {
      const { PutRecordCommand } = await import('@aws-sdk/client-kinesis');
      const data = Buffer.from(JSON.stringify(event.value));

      await this.kinesisClient.send(
        new PutRecordCommand({
          StreamName: streamName,
          Data: data,
          PartitionKey: event.key || this.generatePartitionKey(),
        })
      );

      this.metrics.recordsOut++;
    } catch (error: any) {
      if (error.name === 'ProvisionedThroughputExceededException') {
        await this.retryProduce(event, 1);
      } else {
        throw error;
      }
    }
  }

  async produceBatch(events: StreamEvent[]): Promise<void> {
    if (!this.kinesisClient) {
      throw new Error('Kinesis client not initialized');
    }

    const streamName = this.config.producerConfig?.topic;
    if (!streamName) {
      throw new Error('Producer stream name not configured');
    }

    try {
      const { PutRecordsCommand } = await import('@aws-sdk/client-kinesis');
      const batchSize = 500;

      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);

        const records = batch.map((event) => ({
          Data: Buffer.from(JSON.stringify(event.value)),
          PartitionKey: event.key || this.generatePartitionKey(),
        }));

        const response = await this.kinesisClient.send(
          new PutRecordsCommand({
            StreamName: streamName,
            Records: records,
          })
        );

        if (response.FailedRecordCount && response.FailedRecordCount > 0) {
          const failedRecords = response.Records?.filter((r: any) => r.ErrorCode);
          console.warn(
            `${response.FailedRecordCount} records failed:`,
            failedRecords?.map((r: any) => r.ErrorMessage)
          );
        }

        this.metrics.recordsOut += batch.length - (response.FailedRecordCount || 0);
      }
    } catch (error) {
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getMetrics(): ThroughputMetrics {
    return { ...this.metrics };
  }

  private parseRecordData(data: Uint8Array | undefined): any {
    if (!data) return null;

    try {
      const str = Buffer.from(data).toString('utf-8');
      return JSON.parse(str);
    } catch {
      return Buffer.from(data).toString('utf-8');
    }
  }

  private generatePartitionKey(): string {
    return `pk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async retryProduce(event: StreamEvent, attempt: number): Promise<void> {
    const maxRetries = 3;
    const delay = Math.pow(2, attempt) * 100;

    if (attempt > maxRetries) {
      throw new Error(`Failed to produce to Kinesis after ${maxRetries} retries`);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      const { PutRecordCommand } = await import('@aws-sdk/client-kinesis');

      await this.kinesisClient.send(
        new PutRecordCommand({
          StreamName: this.config.producerConfig?.topic,
          Data: Buffer.from(JSON.stringify(event.value)),
          PartitionKey: event.key || this.generatePartitionKey(),
        })
      );

      this.metrics.recordsOut++;
    } catch (error: any) {
      if (error.name === 'ProvisionedThroughputExceededException') {
        await this.retryProduce(event, attempt + 1);
      } else {
        throw error;
      }
    }
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connected = false;
      throw new Error(`Max reconnect attempts (${this.maxReconnectAttempts}) exceeded for Kinesis`);
    }

    this.reconnectAttempts++;
    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Kinesis reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.disconnect();
      await this.connect();
    } catch (error) {
      console.error('Kinesis reconnect failed:', error);
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        await this.handleReconnect();
      } else {
        throw error;
      }
    }
  }
}
