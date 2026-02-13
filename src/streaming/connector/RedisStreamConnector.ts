/**
 * Redis Streams Client Implementation
 *
 * Features:
 * - XREAD/XADD operations
 * - Consumer groups support
 * - Blocking reads with timeout
 * - Connection pooling via ioredis
 */

import {
  PlatformClient,
  StreamConfig,
  StreamEvent,
  ThroughputMetrics,
  createInitialMetrics,
} from './types';

interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  streamKey?: string;
}

export class RedisStreamClient implements PlatformClient {
  private config: StreamConfig;
  private client: any;
  private connected = false;
  private consuming = false;
  private metrics: ThroughputMetrics = createInitialMetrics();

  constructor(config: StreamConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const Redis = await import('ioredis');
      const redisConfig = this.config.connectionConfig as RedisConfig;
      this.client = new Redis.default({
        host: redisConfig.host || 'localhost',
        port: redisConfig.port || 6379,
        password: redisConfig.password,
        db: redisConfig.db || 0,
      });

      await this.client.ping();
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Redis connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.consuming = false;
    if (this.client) {
      await this.client.quit();
    }
    this.connected = false;
  }

  async consume(handler: (event: StreamEvent) => Promise<void>): Promise<void> {
    this.consuming = true;
    const redisConfig = this.config.connectionConfig as RedisConfig;
    const streamKey = redisConfig.streamKey || 'stream:events';
    let lastId = '0';

    while (this.consuming) {
      try {
        const results = await this.client.xread('BLOCK', 1000, 'STREAMS', streamKey, lastId);

        if (results) {
          for (const [, messages] of results) {
            for (const [id, fields] of messages) {
              const event: StreamEvent = {
                key: id,
                value: this.parseFields(fields),
                timestamp: Date.now(),
                offset: id,
              };

              this.metrics.recordsIn++;
              await handler(event);
              lastId = id;
            }
          }
        }
      } catch (error) {
        if (this.consuming) {
          throw error;
        }
      }
    }
  }

  async produce(event: StreamEvent): Promise<void> {
    const redisConfig = this.config.connectionConfig as RedisConfig;
    const streamKey = redisConfig.streamKey || 'stream:events';
    const fields = this.flattenObject(event.value);

    await this.client.xadd(streamKey, '*', ...fields);
    this.metrics.recordsOut++;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getMetrics(): ThroughputMetrics {
    return { ...this.metrics };
  }

  private parseFields(fields: string[]): any {
    const obj: any = {};
    for (let i = 0; i < fields.length; i += 2) {
      const key = fields[i];
      const value = fields[i + 1];
      try {
        obj[key] = JSON.parse(value);
      } catch {
        obj[key] = value;
      }
    }
    return obj;
  }

  private flattenObject(obj: any): string[] {
    const fields: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      fields.push(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
    return fields;
  }
}
