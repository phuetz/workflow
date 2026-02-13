/**
 * Analytics Persistence Service - Layer 2: Storage
 *
 * Responsibilities:
 * - Persist metrics to time-series databases (InfluxDB, Prometheus, HTTP)
 * - Batch writes with automatic flushing
 * - Retry failed writes with configurable attempts
 * - Query stored metrics
 * - Health checks for backends
 *
 * Supported Backends:
 * - InfluxDB v2: Line protocol writes, Flux queries
 * - Prometheus: Remote write API, PromQL queries
 * - Custom HTTP: JSON API for custom backends
 *
 * Use Cases:
 * - Write metric: analyticsPersistence.writeMetric(measurement, fields, tags)
 * - Batch write: analyticsPersistence.writeMetrics(dataPoints)
 * - Query: analyticsPersistence.queryMetrics(options)
 * - Health check: analyticsPersistence.health()
 *
 * Note: This service is used internally by AnalyticsService and backend analyticsService.
 * Direct usage is recommended only for custom persistence needs.
 *
 * @see src/services/analytics/index.ts for architecture overview
 * @module AnalyticsPersistence
 */

import { logger } from './SimpleLogger';
import { config, ConfigHelpers } from '../config/environment';

export interface MetricDataPoint {
  measurement: string;
  tags: Record<string, string>;
  fields: Record<string, number | string | boolean>;
  timestamp: Date;
}

export interface AnalyticsPersistenceConfig {
  enabled: boolean;
  backends: Array<'influxdb' | 'prometheus' | 'http'>;
  batchSize: number;
  flushInterval: number;
  retryAttempts: number;
  retryDelay: number;
  enableCompression: boolean;
  influxdb?: {
    url: string;
    token: string;
    organization: string;
    bucket: string;
    headers?: Record<string, string>;
  };
  prometheus?: {
    url: string;
    headers?: Record<string, string>;
  };
  http?: {
    endpoint: string;
    queryEndpoint?: string;
    headers?: Record<string, string>;
  };
}

export interface PersistenceBackend {
  name: string;
  initialize(): Promise<void>;
  write(dataPoints: MetricDataPoint[]): Promise<void>;
  query?(query: string): Promise<unknown>;
  health(): Promise<boolean>;
  destroy(): Promise<void>;
}

/**
 * InfluxDB v2 Backend
 */
class InfluxDBBackend implements PersistenceBackend {
  name = 'InfluxDB';
  private config: AnalyticsPersistenceConfig;

  constructor(config: AnalyticsPersistenceConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      const healthy = await this.health();
      if (!healthy) {
        throw new Error('InfluxDB health check failed');
      }
      logger.info('InfluxDB backend initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize InfluxDB backend', error);
      throw error;
    }
  }

  async write(dataPoints: MetricDataPoint[]): Promise<void> {
    try {
      const lineProtocolData = this.convertToLineProtocol(dataPoints);
      const url = `${(this.config as any).connection.url}/api/v2/write?org=${(this.config as any).connection.organization}&bucket=${(this.config as any).connection.bucket}&precision=ms`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${(this.config as any).connection.token}`,
          'Content-Type': 'text/plain; charset=utf-8',
          ...(this.config.enableCompression && { 'Content-Encoding': 'gzip' }),
          ...(this.config as any).connection.headers
        },
        body: lineProtocolData,
        signal: AbortSignal.timeout(ConfigHelpers.getTimeout('apiRequest'))
      });

      if (!response.ok) {
        throw new Error(`InfluxDB write failed: ${response.status} ${response.statusText}`);
      }

      logger.debug(`Successfully wrote ${dataPoints.length} data points to InfluxDB`);
    } catch (error) {
      logger.error('Failed to write to InfluxDB', error);
      throw error;
    }
  }

  async query(flux: string): Promise<unknown> {
    try {
      const url = `${(this.config as any).connection.url}/api/v2/query?org=${(this.config as any).connection.organization}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${(this.config as any).connection.token}`,
          'Content-Type': 'application/vnd.flux',
          'Accept': 'application/csv',
          ...(this.config as any).connection.headers
        },
        body: flux,
        signal: AbortSignal.timeout(ConfigHelpers.getTimeout('apiRequest'))
      });

      if (!response.ok) {
        throw new Error(`InfluxDB query failed: ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      logger.error('Failed to query InfluxDB', error);
      throw error;
    }
  }

  async health(): Promise<boolean> {
    try {
      const url = `${(this.config as any).connection.url}/health`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${(this.config as any).connection.token}`,
          ...(this.config as any).connection.headers
        },
        signal: AbortSignal.timeout(5000)
      });

      return response.ok;
    } catch (error) {
      logger.warn('InfluxDB health check failed', error);
      return false;
    }
  }

  async destroy(): Promise<void> {
    logger.info('InfluxDB backend destroyed');
  }

  private convertToLineProtocol(dataPoints: MetricDataPoint[]): string {
    return dataPoints.map(point => {
      const tags = Object.entries(point.tags)
        .map(([key, value]) => `${key}=${this.escapeTag(value)}`)
        .join(',');

      const fields = Object.entries(point.fields)
        .map(([key, value]) => {
          if (typeof value === 'string') {
            return `${key}="${this.escapeString(value)}"`;
          } else if (typeof value === 'boolean') {
            return `${key}=${value}`;
          } else {
            return `${key}=${value}`;
          }
        })
        .join(',');

      const timestamp = point.timestamp.getTime() * 1000000; // Convert to nanoseconds
      return `${point.measurement}${tags ? ',' + tags : ''} ${fields} ${timestamp}`;
    }).join('\n');
  }

  private escapeTag(value: string): string {
    return value.replace(/[,\s=]/g, '\\$&');
  }

  private escapeString(value: string): string {
    return value.replace(/"/g, '\\"');
  }
}

/**
 * Prometheus Backend
 */
class PrometheusBackend implements PersistenceBackend {
  name = 'Prometheus';
  private config: AnalyticsPersistenceConfig;

  constructor(config: AnalyticsPersistenceConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      const healthy = await this.health();
      if (!healthy) {
        throw new Error('Prometheus health check failed');
      }
      logger.info('Prometheus backend initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Prometheus backend', error);
      throw error;
    }
  }

  async write(dataPoints: MetricDataPoint[]): Promise<void> {
    try {
      const prometheusData = this.convertToPrometheusFormat(dataPoints);
      const url = `${(this.config as any).connection.url}/api/v1/write`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-protobuf',
          'Content-Encoding': 'snappy',
          'X-Prometheus-Remote-Write-Version': '0.1.0',
          ...(this.config as any).connection.headers
        },
        body: prometheusData,
        signal: AbortSignal.timeout(ConfigHelpers.getTimeout('apiRequest'))
      });

      if (!response.ok) {
        throw new Error(`Prometheus write failed: ${response.status} ${response.statusText}`);
      }

      logger.debug(`Successfully wrote ${dataPoints.length} data points to Prometheus`);
    } catch (error) {
      logger.error('Failed to write to Prometheus', error);
      throw error;
    }
  }

  async query(promql: string): Promise<unknown> {
    try {
      const params = new URLSearchParams({
        query: promql,
        time: new Date().toISOString()
      });

      const url = `${(this.config as any).connection.url}/api/v1/query?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          ...(this.config as any).connection.headers
        },
        signal: AbortSignal.timeout(ConfigHelpers.getTimeout('apiRequest'))
      });

      if (!response.ok) {
        throw new Error(`Prometheus query failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to query Prometheus', error);
      throw error;
    }
  }

  async health(): Promise<boolean> {
    try {
      const url = `${(this.config as any).connection.url}/-/healthy`;

      const response = await fetch(url, {
        headers: (this.config as any).connection.headers,
        signal: AbortSignal.timeout(5000)
      });

      return response.ok;
    } catch (error) {
      logger.warn('Prometheus health check failed', error);
      return false;
    }
  }

  async destroy(): Promise<void> {
    logger.info('Prometheus backend destroyed');
  }

  private convertToPrometheusFormat(dataPoints: MetricDataPoint[]): ArrayBuffer {
    // This is a simplified conversion - in reality, you'd use protobuf
    // to generate the proper Prometheus remote write format
    const textFormat = dataPoints.map(point => {
      const labels = Object.entries(point.tags)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');

      return Object.entries(point.fields)
        .filter(([, value]) => typeof value === 'number')
        .map(([field, value]) =>
          `${point.measurement}_${field}{${labels}} ${value} ${point.timestamp.getTime()}`
        )
        .join('\n');
    }).join('\n');

    return new TextEncoder().encode(textFormat).buffer;
  }
}

/**
 * Custom HTTP Backend (for generic endpoints)
 */
class CustomHTTPBackend implements PersistenceBackend {
  name = 'Custom HTTP';
  private config: AnalyticsPersistenceConfig;

  constructor(config: AnalyticsPersistenceConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    logger.info('Custom HTTP backend initialized');
  }

  async write(dataPoints: MetricDataPoint[]): Promise<void> {
    try {
      const url = (this.config as any).connection.endpoint;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config as any).connection.headers
        },
        body: JSON.stringify({
          dataPoints,
          timestamp: new Date().toISOString(),
          source: 'workflow-builder-analytics'
        }),
        signal: AbortSignal.timeout(ConfigHelpers.getTimeout('apiRequest'))
      });

      if (!response.ok) {
        throw new Error(`Custom HTTP write failed: ${response.status} ${response.statusText}`);
      }

      logger.debug(`Successfully wrote ${dataPoints.length} data points to custom endpoint`);
    } catch (error) {
      logger.error('Failed to write to custom HTTP endpoint', error);
      throw error;
    }
  }

  async health(): Promise<boolean> {
    try {
      const url = (this.config as any).connection.endpoint;

      const response = await fetch(url, {
        method: 'HEAD',
        headers: (this.config as any).connection.headers,
        signal: AbortSignal.timeout(5000)
      });

      return response.ok;
    } catch (error) {
      logger.warn('Custom HTTP health check failed', error);
      return false;
    }
  }

  async destroy(): Promise<void> {
    logger.info('Custom HTTP backend destroyed');
  }
}

/**
 * Main Analytics Persistence Service
 */
export class AnalyticsPersistenceService {
  private config: AnalyticsPersistenceConfig;
  private backends: PersistenceBackend[] = [];
  private writeQueue: MetricDataPoint[] = [];
  private isWriting = false;
  private retryQueue: MetricDataPoint[] = [];
  private flushIntervalId: string | null = null;

  constructor(config?: Partial<AnalyticsPersistenceConfig>) {
    this.config = {
      enabled: true,
      backends: ['http'],
      batchSize: 100,
      flushInterval: 10000, // 10 seconds
      retryAttempts: 3,
      retryDelay: 1000,
      enableCompression: true,
      influxdb: {
        url: process.env.ANALYTICS_INFLUXDB_URL || 'http://localhost:8086',
        token: process.env.ANALYTICS_INFLUXDB_TOKEN || '',
        organization: process.env.ANALYTICS_INFLUXDB_ORG || 'workflow-org',
        bucket: process.env.ANALYTICS_INFLUXDB_BUCKET || 'analytics'
      },
      prometheus: {
        url: process.env.ANALYTICS_PROMETHEUS_URL || 'http://localhost:9090'
      },
      http: {
        endpoint: process.env.ANALYTICS_HTTP_ENDPOINT || 'http://localhost:3001/analytics',
        queryEndpoint: process.env.ANALYTICS_HTTP_QUERY_ENDPOINT || 'http://localhost:3001/analytics/query'
      },
      ...config
    };

    if (this.config.enabled) {
      this.backends = this.createBackends();
      this.setupFlushInterval();
    }
  }

  private createBackends(): PersistenceBackend[] {
    const backends: PersistenceBackend[] = [];
    
    this.config.backends.forEach(backendType => {
      switch (backendType) {
        case 'influxdb':
          if (this.config.influxdb) {
            const influxConfig = {
              ...this.config,
              connection: this.config.influxdb
            } as unknown as AnalyticsPersistenceConfig;
            backends.push(new InfluxDBBackend(influxConfig));
          }
          break;
        case 'prometheus':
          if (this.config.prometheus) {
            const promConfig = {
              ...this.config,
              connection: this.config.prometheus
            } as unknown as AnalyticsPersistenceConfig;
            backends.push(new PrometheusBackend(promConfig));
          }
          break;
        case 'http':
          if (this.config.http) {
            const httpConfig = {
              ...this.config,
              connection: this.config.http
            } as unknown as AnalyticsPersistenceConfig;
            backends.push(new CustomHTTPBackend(httpConfig));
          }
          break;
      }
    });
    
    return backends;
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Analytics persistence is disabled');
      return;
    }

    const results = await Promise.allSettled(this.backends.map(async backend => {
      try {
        await backend.initialize();
        logger.info(`Analytics persistence initialized with ${backend.name} backend`);
        return true;
      } catch (error) {
        logger.error(`Failed to initialize ${backend.name} backend`, error);
        return false;
      }
    }));

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    if (successCount === 0) {
      throw new Error('Failed to initialize any analytics backend');
    }

    logger.info(`Analytics persistence initialized with ${successCount}/${this.backends.length} backends`);
  }

  /**
   * Write a single metric data point
   */
  writeMetric(
    measurement: string,
    fields: Record<string, number | string | boolean>,
    tags: Record<string, string> = {},
    timestamp: Date = new Date()
  ): void {
    if (!this.config.enabled) return;
    
    const dataPoint: MetricDataPoint = {
      measurement,
      fields,
      tags,
      timestamp
    };

    this.writeQueue.push(dataPoint);

    // Flush immediately if batch size reached
    if (this.writeQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Write multiple metric data points
   */
  writeMetrics(dataPoints: MetricDataPoint[]): void {
    if (!this.config.enabled) return;
    
    this.writeQueue.push(...dataPoints);

    // Flush if batch size reached
    if (this.writeQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Force flush all queued metrics
   */
  async flush(): Promise<void> {
    if (this.isWriting || this.writeQueue.length === 0) {
      return;
    }

    this.isWriting = true;
    const batch = this.writeQueue.splice(0);

    try {
      await this.writeToBatches(batch);
      logger.debug(`Successfully flushed ${batch.length} metrics`);
    } catch (error) {
      logger.error('Failed to flush metrics after retries', error);
      // Add failed batch to retry queue
      this.retryQueue.push(...batch);
    } finally {
      this.isWriting = false;
    }
  }

  private async writeToBatches(dataPoints: MetricDataPoint[]): Promise<void> {
    const results = await Promise.allSettled(this.backends.map(backend =>
      this.writeWithRetry(backend, dataPoints)
    ));

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length === this.backends.length) {
      throw new Error('All backends failed to write metrics');
    }
  }

  private async writeWithRetry(backend: PersistenceBackend, dataPoints: MetricDataPoint[]): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await backend.write(dataPoints);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        logger.warn(`${backend.name} write attempt ${attempt} failed`, error);

        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async setupFlushInterval(): Promise<void> {
    const { intervalManager } = await import('../utils/intervalManager');

    this.flushIntervalId = intervalManager.create(
      'analytics_persistence_flush',
      () => {
        this.processBatches();
      },
      this.config.flushInterval,
      'analytics-persistence'
    );
  }
  
  private processBatches(): void {
    // Flush main queue
    this.flush();

    // Also try to flush retry queue
    if (this.retryQueue.length > 0) {
      const retryBatch = this.retryQueue.splice(0, this.config.batchSize);
      this.writeToBatches(retryBatch).catch(error => {
        logger.error('Retry queue flush failed', error);
        // Put back in retry queue for next attempt
        this.retryQueue.unshift(...retryBatch);
      });
    }
  }

  /**
   * Query metrics from persistence layer
   */
  async queryMetrics(options: {
    measurement: string;
    filters?: Record<string, string | number>;
    timeRange?: {
      start: Date;
      end: Date;
    };
    aggregation?: {
      function: 'mean' | 'sum' | 'count' | 'min' | 'max';
      field: string;
      groupBy?: string[];
    };
    orderBy?: string;
    order?: 'asc' | 'desc';
    limit?: number;
  }): Promise<unknown[]> {
    if (!this.config.enabled || !this.config.backends.length) {
      return [];
    }

    // For now, only support HTTP backend for queries
    if (!this.config.backends.includes('http') || !this.config.http?.queryEndpoint) {
      logger.warn('Query metrics not supported without HTTP backend with queryEndpoint');
      return [];
    }

    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('measurement', options.measurement);

      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          queryParams.append(`filter_${key}`, String(value));
        });
      }

      if (options.timeRange) {
        queryParams.append('start', options.timeRange.start.toISOString());
        queryParams.append('end', options.timeRange.end.toISOString());
      }

      if (options.aggregation) {
        queryParams.append('agg_function', options.aggregation.function);
        queryParams.append('agg_field', options.aggregation.field);
        if (options.aggregation.groupBy) {
          queryParams.append('group_by', options.aggregation.groupBy.join(','));
        }
      }

      if (options.orderBy) {
        queryParams.append('order_by', options.orderBy);
        queryParams.append('order', options.order || 'desc');
      }

      if (options.limit) {
        queryParams.append('limit', String(options.limit));
      }

      const url = `${this.config.http!.queryEndpoint}?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.config.http!.headers,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Query failed with status ${response.status}`);
      }

      const data = await response.json() as { results?: unknown[] };
      return data.results || [];

    } catch (error) {
      logger.error('Failed to query metrics', {
        measurement: options.measurement,
        error
      });
      return [];
    }
  }

  /**
   * Check if backends are healthy
   */
  async health(): Promise<{
    overall: boolean;
    backends: Record<string, boolean>;
  }> {
    const results: Record<string, boolean> = {};

    const healthChecks = await Promise.all(
      this.backends.map(async backend => {
        try {
          const isHealthy = await backend.health();
          results[backend.name] = isHealthy;
          return isHealthy;
        } catch (error) {
          results[backend.name] = false;
          return false;
        }
      })
    );

    return {
      overall: healthChecks.some(h => h),
      backends: results
    };
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    writeQueueSize: number;
    retryQueueSize: number;
    isWriting: boolean;
    backends: string[];
    enabled: boolean;
  } {
    return {
      writeQueueSize: this.writeQueue.length,
      retryQueueSize: this.retryQueue.length,
      isWriting: this.isWriting,
      backends: this.backends.map(b => b.name),
      enabled: this.config.enabled
    };
  }

  /**
   * Stop all persistence operations
   */
  async stop(): Promise<void> {
    // Stop flushing
    if (this.flushIntervalId) {
      const { intervalManager } = await import('../utils/intervalManager');
      intervalManager.clear(this.flushIntervalId);
      this.flushIntervalId = null;
    }

    // Process remaining batches
    this.processBatches();

    logger.info('Analytics persistence stopped');
  }
  
  /**
   * Cleanup and destroy the service
   */
  async destroy(): Promise<void> {
    this.stop();

    // Flush any remaining data
    await this.flush();

    // Destroy all backends
    await Promise.all(this.backends.map(b => b.destroy()));

    // Clear queues
    this.writeQueue = [];
    this.retryQueue = [];
    this.backends = [];

    logger.info('Analytics persistence service destroyed');
  }
}

// Create singleton instance
export const analyticsPersistence = new AnalyticsPersistenceService();