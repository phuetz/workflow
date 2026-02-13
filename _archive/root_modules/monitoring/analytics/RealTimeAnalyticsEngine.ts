import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface AnalyticsConfig {
  samplingRate: number;
  bufferSize: number;
  flushInterval: number;
  retentionPeriod: number;
  aggregationWindows: TimeWindow[];
  streams: StreamConfig[];
  alerts: AlertConfig[];
  storage: StorageConfig;
  processing: ProcessingConfig;
}

export interface TimeWindow {
  name: string;
  duration: number; // milliseconds
  granularity: number; // milliseconds
  aggregations: AggregationType[];
}

export interface StreamConfig {
  name: string;
  pattern: string | RegExp;
  sampling?: number;
  filters?: StreamFilter[];
  transformations?: DataTransformation[];
  routing?: string[];
}

export interface StreamFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'regex' | 'exists';
  value: unknown;
}

export interface DataTransformation {
  type: 'map' | 'filter' | 'reduce' | 'enrich' | 'parse' | 'custom';
  config: unknown;
  expression?: string;
}

export interface AlertConfig {
  name: string;
  condition: AlertCondition;
  actions: AlertAction[];
  cooldown?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'change' | 'trend' | 'anomaly';
  threshold: number;
  window?: string;
  groupBy?: string[];
}

export interface AlertAction {
  type: 'webhook' | 'email' | 'slack' | 'sms' | 'custom';
  config: unknown;
  delay?: number;
}

export interface StorageConfig {
  type: 'memory' | 'redis' | 'influxdb' | 'elasticsearch' | 'timescaledb';
  connection: unknown;
  partitioning?: {
    field: string;
    strategy: 'time' | 'hash' | 'range';
    config: unknown;
  };
}

export interface ProcessingConfig {
  mode: 'streaming' | 'batch' | 'hybrid';
  parallelism: number;
  checkpointing?: {
    enabled: boolean;
    interval: number;
    storage: string;
  };
  watermarks?: {
    maxOutOfOrder: number;
    idleTimeout: number;
  };
}

export interface DataPoint {
  timestamp: number;
  metric: string;
  value: number;
  dimensions: Record<string, string>;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface AggregatedDataPoint {
  timestamp: number;
  window: string;
  metric: string;
  dimensions: Record<string, string>;
  aggregations: Record<AggregationType, number>;
  count: number;
  metadata?: Record<string, unknown>;
}

export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'p50' | 'p90' | 'p95' | 'p99' | 'stddev';

export interface MetricQuery {
  metrics: string[];
  dimensions?: Record<string, string | string[]>;
  timeRange: {
    start: number;
    end: number;
  };
  granularity?: number;
  aggregation?: AggregationType;
  groupBy?: string[];
  filters?: QueryFilter[];
  limit?: number;
  orderBy?: OrderBy[];
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'nin' | 'regex';
  value: unknown;
}

export interface OrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryResult {
  data: (DataPoint | AggregatedDataPoint)[];
  metadata: {
    totalPoints: number;
    timeRange: { start: number; end: number };
    granularity: number;
    executionTime: number;
    cached: boolean;
  };
}

export interface StreamProcessor {
  process(dataPoint: DataPoint): Promise<DataPoint[]>;
  flush(): Promise<void>;
}

export interface AnomalyDetector {
  detect(dataPoints: DataPoint[]): Promise<Anomaly[]>;
  train(dataPoints: DataPoint[]): Promise<void>;
}

export interface Anomaly {
  timestamp: number;
  metric: string;
  dimensions: Record<string, string>;
  value: number;
  expectedValue: number;
  score: number;
  type: 'spike' | 'drop' | 'trend' | 'seasonal' | 'contextual';
  severity: 'low' | 'medium' | 'high';
}

export interface Dashboard {
  id: string;
  name: string;
  panels: DashboardPanel[];
  filters: DashboardFilter[];
  autoRefresh?: number;
  timeRange?: { start: number; end: number };
}

export interface DashboardPanel {
  id: string;
  title: string;
  type: 'timeseries' | 'table' | 'heatmap' | 'gauge' | 'stat' | 'histogram' | 'custom';
  query: MetricQuery;
  visualization: VisualizationConfig;
  position: { x: number; y: number; width: number; height: number };
}

export interface DashboardFilter {
  name: string;
  field: string;
  type: 'select' | 'multiselect' | 'text' | 'daterange';
  options?: string[];
  defaultValue?: unknown;
}

export interface VisualizationConfig {
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  legend?: LegendConfig;
  colors?: string[];
  thresholds?: ThresholdConfig[];
  aggregationType?: AggregationType;
  [key: string]: unknown;
}

export interface AxisConfig {
  label?: string;
  unit?: string;
  scale?: 'linear' | 'log';
  min?: number;
  max?: number;
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  values?: boolean;
}

export interface ThresholdConfig {
  value: number;
  color: string;
  label?: string;
}

export class RealTimeAnalyticsEngine extends EventEmitter {
  private config: AnalyticsConfig;
  private streams: Map<string, StreamProcessor> = new Map();
  private dataBuffer: DataPoint[] = [];
  private aggregationCache: Map<string, Map<number, AggregatedDataPoint>> = new Map();
  private anomalyDetector: AnomalyDetector;
  private alertStates: Map<string, { lastTriggered: number; isActive: boolean }> = new Map();
  private flushTimer: NodeJS.Timeout | null = null;
  private storageConnection: unknown = null;
  private dashboards: Map<string, Dashboard> = new Map();

  constructor(config: AnalyticsConfig) {
    super();
    this.config = config;
    this.anomalyDetector = new SimpleAnomalyDetector();
    this.initializeStreams();
    this.initializeStorage();
    this.startFlushTimer();
  }

  private initializeStreams(): void {
    for (const streamConfig of this.config.streams) {
      const processor = new DefaultStreamProcessor(streamConfig);
      this.streams.set(streamConfig.name, processor);
    }
  }

  private async initializeStorage(): Promise<void> {
    switch (this.config.storage.type) {
      case 'influxdb':
        this.storageConnection = await this.initializeInfluxDB();
        break;
      case 'elasticsearch':
        this.storageConnection = await this.initializeElasticsearch();
        break;
      case 'timescaledb':
        this.storageConnection = await this.initializeTimescaleDB();
        break;
      case 'redis':
        this.storageConnection = await this.initializeRedis();
        break;
      default:
        this.storageConnection = new MemoryStorage();
    }
  }

  private async initializeInfluxDB(): Promise<unknown> {
    // InfluxDB initialization
    return {
      write: async (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        points: DataPoint[]
      ) => {
        // Write to InfluxDB
      },
      query: async (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        query: string
      ) => {
        // Query InfluxDB
        return [];
      }
    };
  }

  private async initializeElasticsearch(): Promise<unknown> {
    // Elasticsearch initialization
    return {
      index: async (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        points: DataPoint[]
      ) => {
        // Index to Elasticsearch
      },
      search: async (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        query: unknown
      ) => {
        // Search Elasticsearch
        return { hits: { hits: [] } };
      }
    };
  }

  private async initializeTimescaleDB(): Promise<unknown> {
    // TimescaleDB initialization
    return {
      insert: async (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        points: DataPoint[]
      ) => {
        // Insert to TimescaleDB
      },
      select: async (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        query: string
      ) => {
        // Query TimescaleDB
        return [];
      }
    };
  }

  private async initializeRedis(): Promise<unknown> {
    // Redis initialization
    return {
      zadd: async (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        key: string, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        score: number, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        member: string
      ) => {
        // Add to Redis sorted set
      },
      zrange: async (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        key: string, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        start: number, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        stop: number
      ) => {
        // Query Redis sorted set
        return [];
      }
    };
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushBuffer();
    }, this.config.flushInterval);
  }

  // Data Ingestion
  public async ingestDataPoint(dataPoint: DataPoint): Promise<void> {
    try {
      // Apply sampling
      if (Math.random() > this.config.samplingRate) {
        return;
      }

      // Process through streams
      let processedPoints = [dataPoint];
      for (const [streamName, processor] of this.streams.entries()) {
        if (this.matchesStream(dataPoint, streamName)) {
          processedPoints = await processor.process(dataPoint);
          break;
        }
      }

      // Add to buffer
      for (const point of processedPoints) {
        this.dataBuffer.push(point);
        
        // Real-time aggregation
        await this.updateRealTimeAggregations(point);
        
        // Anomaly detection
        await this.checkForAnomalies([point]);
        
        // Alert checking
        await this.checkAlerts(point);
        
        // Emit real-time event
        this.emit('datapoint', point);
      }

      // Flush if buffer is full
      if (this.dataBuffer.length >= this.config.bufferSize) {
        await this.flushBuffer();
      }

    } catch (error) {
      this.emit('error', { error, dataPoint });
    }
  }

  public async ingestBatch(dataPoints: DataPoint[]): Promise<void> {
    for (const point of dataPoints) {
      await this.ingestDataPoint(point);
    }
  }

  private matchesStream(dataPoint: DataPoint, streamName: string): boolean {
    const streamConfig = this.config.streams.find(s => s.name === streamName);
    if (!streamConfig) return false;

    // Check pattern match
    if (typeof streamConfig.pattern === 'string') {
      return dataPoint.metric.includes(streamConfig.pattern);
    } else {
      return streamConfig.pattern.test(dataPoint.metric);
    }
  }

  // Real-time Aggregation
  private async updateRealTimeAggregations(dataPoint: DataPoint): Promise<void> {
    for (const window of this.config.aggregationWindows) {
      const windowStart = this.getWindowStart(dataPoint.timestamp, window.duration);
      const windowKey = `${dataPoint.metric}:${window.name}`;
      
      if (!this.aggregationCache.has(windowKey)) {
        this.aggregationCache.set(windowKey, new Map());
      }
      
      const windowCache = this.aggregationCache.get(windowKey)!;
      
      let aggregated = windowCache.get(windowStart);
      if (!aggregated) {
        aggregated = {
          timestamp: windowStart,
          window: window.name,
          metric: dataPoint.metric,
          dimensions: { ...dataPoint.dimensions },
          aggregations: {} as Record<AggregationType, number>,
          count: 0
        };
        windowCache.set(windowStart, aggregated);
      }

      // Update aggregations
      aggregated.count++;
      
      for (const aggType of window.aggregations) {
        switch (aggType) {
          case 'sum':
            aggregated.aggregations.sum = (aggregated.aggregations.sum || 0) + dataPoint.value;
            break;
          case 'avg':
            aggregated.aggregations.avg = 
              ((aggregated.aggregations.avg || 0) * (aggregated.count - 1) + dataPoint.value) / aggregated.count;
            break;
          case 'min':
            aggregated.aggregations.min = Math.min(aggregated.aggregations.min || Infinity, dataPoint.value);
            break;
          case 'max':
            aggregated.aggregations.max = Math.max(aggregated.aggregations.max || -Infinity, dataPoint.value);
            break;
          case 'count':
            aggregated.aggregations.count = aggregated.count;
            break;
          // Add other aggregation types
        }
      }

      // Emit real-time aggregation update
      this.emit('aggregation', aggregated);
    }
  }

  private getWindowStart(timestamp: number, windowDuration: number): number {
    return Math.floor(timestamp / windowDuration) * windowDuration;
  }

  // Anomaly Detection
  private async checkForAnomalies(dataPoints: DataPoint[]): Promise<void> {
    try {
      const anomalies = await this.anomalyDetector.detect(dataPoints);
      
      for (const anomaly of anomalies) {
        this.emit('anomaly', anomaly);
        
        // Create anomaly alert if configured
        await this.handleAnomalyAlert(anomaly);
      }
    } catch (error) {
      this.emit('error', { error, context: 'anomaly_detection' });
    }
  }

  private async handleAnomalyAlert(anomaly: Anomaly): Promise<void> {
    const alertConfig = this.config.alerts.find(a => 
      a.condition.metric === anomaly.metric && 
      a.condition.operator === 'anomaly'
    );

    if (alertConfig) {
      await this.triggerAlert(alertConfig, {
        metric: anomaly.metric,
        value: anomaly.value,
        anomaly: anomaly
      });
    }
  }

  // Alert Management
  private async checkAlerts(dataPoint: DataPoint): Promise<void> {
    for (const alertConfig of this.config.alerts) {
      if (await this.evaluateAlertCondition(alertConfig, dataPoint)) {
        await this.triggerAlert(alertConfig, dataPoint);
      }
    }
  }

  private async evaluateAlertCondition(
    alertConfig: AlertConfig,
    dataPoint: DataPoint
  ): Promise<boolean> {
    const condition = alertConfig.condition;
    
    // Check if metric matches
    if (condition.metric !== dataPoint.metric) {
      return false;
    }

    // Check cooldown
    const alertState = this.alertStates.get(alertConfig.name);
    if (alertState?.isActive && alertConfig.cooldown) {
      const timeSinceLastAlert = Date.now() - alertState.lastTriggered;
      if (timeSinceLastAlert < alertConfig.cooldown) {
        return false;
      }
    }

    // Evaluate condition
    switch (condition.operator) {
      case 'gt':
        return dataPoint.value > condition.threshold;
      case 'lt':
        return dataPoint.value < condition.threshold;
      case 'gte':
        return dataPoint.value >= condition.threshold;
      case 'lte':
        return dataPoint.value <= condition.threshold;
      case 'eq':
        return dataPoint.value === condition.threshold;
      case 'change':
        return await this.evaluateChangeCondition(condition, dataPoint);
      case 'trend':
        return await this.evaluateTrendCondition(condition, dataPoint);
      default:
        return false;
    }
  }

  private async evaluateChangeCondition(
    condition: AlertCondition,
    dataPoint: DataPoint
  ): Promise<boolean> {
    // Get previous value for comparison
    const previousPoints = await this.queryMetric({
      metrics: [condition.metric],
      dimensions: dataPoint.dimensions,
      timeRange: {
        start: dataPoint.timestamp - 300000, // 5 minutes ago
        end: dataPoint.timestamp - 1
      },
      limit: 1,
      orderBy: [{ field: 'timestamp', direction: 'desc' }]
    });

    if (previousPoints.data.length === 0) return false;

    const previousValue = (previousPoints.data[0] as DataPoint).value;
    const changePercent = Math.abs((dataPoint.value - previousValue) / previousValue) * 100;
    
    return changePercent > condition.threshold;
  }

  private async evaluateTrendCondition(
    condition: AlertCondition,
    dataPoint: DataPoint
  ): Promise<boolean> {
    // Get recent points for trend analysis
    const recentPoints = await this.queryMetric({
      metrics: [condition.metric],
      dimensions: dataPoint.dimensions,
      timeRange: {
        start: dataPoint.timestamp - 900000, // 15 minutes ago
        end: dataPoint.timestamp
      },
      orderBy: [{ field: 'timestamp', direction: 'asc' }]
    });

    if (recentPoints.data.length < 3) return false;

    // Simple linear regression to detect trend
    const points = recentPoints.data as DataPoint[];
    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    points.forEach((point, i) => {
      sumX += i;
      sumY += point.value;
      sumXY += i * point.value;
      sumX2 += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Check if trend exceeds threshold
    return Math.abs(slope) > condition.threshold;
  }

  private async triggerAlert(
    alertConfig: AlertConfig,
    context: unknown
  ): Promise<void> {
    // Update alert state
    this.alertStates.set(alertConfig.name, {
      lastTriggered: Date.now(),
      isActive: true
    });

    // Execute alert actions
    for (const action of alertConfig.actions) {
      try {
        if (action.delay) {
          setTimeout(async () => {
            await this.executeAlertAction(action, alertConfig, context);
          }, action.delay);
        } else {
          await this.executeAlertAction(action, alertConfig, context);
        }
      } catch (error) {
        this.emit('error', { error, context: 'alert_action', action });
      }
    }

    this.emit('alert', { config: alertConfig, context });
  }

  private async executeAlertAction(
    action: AlertAction,
    alertConfig: AlertConfig,
    context: unknown
  ): Promise<void> {
    switch (action.type) {
      case 'webhook':
        await this.sendWebhookAlert(action.config, alertConfig, context);
        break;
      case 'email':
        await this.sendEmailAlert(action.config, alertConfig, context);
        break;
      case 'slack':
        await this.sendSlackAlert(action.config, alertConfig, context);
        break;
      case 'sms':
        await this.sendSMSAlert(action.config, alertConfig, context);
        break;
      case 'custom':
        await this.executeCustomAction(action.config, alertConfig, context);
        break;
    }
  }

  private async sendWebhookAlert(
     
    config: unknown,
     
    alertConfig: AlertConfig,
     
    context: unknown
  ): Promise<void> {
    const payload = {
      alert: alertConfig.name,
      severity: alertConfig.severity,
      timestamp: Date.now(),
      context
    };

    await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      body: JSON.stringify(payload)
    });
  }

  private async sendEmailAlert(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    config: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    alertConfig: AlertConfig,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown
  ): Promise<void> {
    // Email implementation
  }

  private async sendSlackAlert(
    config: unknown,
    alertConfig: AlertConfig,
    context: unknown
  ): Promise<void> {
    // Slack implementation
    const message = {
      text: `🚨 Alert: ${alertConfig.name}`,
      attachments: [{
        color: this.getSeverityColor(alertConfig.severity),
        fields: [
          { title: 'Metric', value: context.metric, short: true },
          { title: 'Value', value: context.value.toString(), short: true },
          { title: 'Severity', value: alertConfig.severity, short: true },
          { title: 'Time', value: new Date().toISOString(), short: true }
        ]
      }]
    };

    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  }

  private getSeverityColor(severity: string): string {
    const colors = {
      low: 'good',
      medium: 'warning',
      high: 'danger',
      critical: '#ff0000'
    };
    return colors[severity as keyof typeof colors] || 'good';
  }

  private async sendSMSAlert(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    config: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    alertConfig: AlertConfig,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown
  ): Promise<void> {
    // SMS implementation
  }

  private async executeCustomAction(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    config: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    alertConfig: AlertConfig,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown
  ): Promise<void> {
    // Custom action implementation
  }

  // Buffer Management
  private async flushBuffer(): Promise<void> {
    if (this.dataBuffer.length === 0) return;

    const pointsToFlush = [...this.dataBuffer];
    this.dataBuffer = [];

    try {
      await this.persistData(pointsToFlush);
      this.emit('buffer_flushed', { count: pointsToFlush.length });
    } catch (error) {
      // Re-add points to buffer on failure
      this.dataBuffer.unshift(...pointsToFlush);
      this.emit('error', { error, context: 'buffer_flush' });
    }
  }

  private async persistData(dataPoints: DataPoint[]): Promise<void> {
    switch (this.config.storage.type) {
      case 'memory':
        // Already in memory
        break;
      case 'influxdb':
        await this.storageConnection.write(dataPoints);
        break;
      case 'elasticsearch':
        await this.storageConnection.index(dataPoints);
        break;
      case 'timescaledb':
        await this.storageConnection.insert(dataPoints);
        break;
      case 'redis':
        for (const point of dataPoints) {
          await this.storageConnection.zadd(
            `metric:${point.metric}`,
            point.timestamp,
            JSON.stringify(point)
          );
        }
        break;
    }
  }

  // Querying
  public async queryMetric(query: MetricQuery): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      let data: (DataPoint | AggregatedDataPoint)[] = [];
      
      // Try cache first for aggregated data
      if (query.aggregation && query.granularity) {
        data = this.queryFromCache(query);
      }
      
      // Query from storage if no cache hit
      if (data.length === 0) {
        data = await this.queryFromStorage(query);
      }
      
      // Apply post-processing
      data = this.applyFilters(data, query.filters || []);
      data = this.applyGroupBy(data, query.groupBy || []);
      data = this.applyOrderBy(data, query.orderBy || []);
      data = this.applyLimit(data, query.limit);
      
      const executionTime = Date.now() - startTime;
      
      return {
        data,
        metadata: {
          totalPoints: data.length,
          timeRange: query.timeRange,
          granularity: query.granularity || 0,
          executionTime,
          cached: false // Set based on actual cache hit
        }
      };
    } catch (error) {
      this.emit('error', { error, context: 'query', query });
      throw error;
    }
  }

  private queryFromCache(query: MetricQuery): AggregatedDataPoint[] {
    const results: AggregatedDataPoint[] = [];
    
    for (const metric of query.metrics) {
      // Find matching window
      const window = this.config.aggregationWindows.find(w => 
        w.duration === query.granularity
      );
      
      if (!window) continue;
      
      const windowKey = `${metric}:${window.name}`;
      const windowCache = this.aggregationCache.get(windowKey);
      
      if (!windowCache) continue;
      
      // Get data points in time range
      for (const [timestamp, dataPoint] of windowCache.entries()) {
        if (timestamp >= query.timeRange.start && timestamp <= query.timeRange.end) {
          // Check dimension filters
          if (this.matchesDimensions(dataPoint.dimensions, query.dimensions)) {
            results.push(dataPoint);
          }
        }
      }
    }
    
    return results;
  }

  private async queryFromStorage(query: MetricQuery): Promise<DataPoint[]> {
    switch (this.config.storage.type) {
      case 'memory':
        return this.queryFromMemory(query);
      case 'influxdb':
        return this.queryInfluxDB(query);
      case 'elasticsearch':
        return this.queryElasticsearch(query);
      case 'timescaledb':
        return this.queryTimescaleDB(query);
      case 'redis':
        return this.queryRedis(query);
      default:
        return [];
    }
  }

  private queryFromMemory(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    query: MetricQuery
  ): DataPoint[] {
    // Simple in-memory query
    return [];
  }

  private async queryInfluxDB(query: MetricQuery): Promise<DataPoint[]> {
    // Build InfluxDB query
    const influxQuery = this.buildInfluxQuery(query);
    const result = await this.storageConnection.query(influxQuery);
    return this.parseInfluxResult(result);
  }

  private buildInfluxQuery(query: MetricQuery): string {
    // Build InfluxDB query string
    return `SELECT * FROM "${query.metrics[0]}" WHERE time >= ${query.timeRange.start} AND time <= ${query.timeRange.end}`;
  }

  private parseInfluxResult(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    result: unknown
  ): DataPoint[] {
    // Parse InfluxDB result
    return [];
  }

  private async queryElasticsearch(query: MetricQuery): Promise<DataPoint[]> {
    // Build Elasticsearch query
    const esQuery = this.buildElasticsearchQuery(query);
    const result = await this.storageConnection.search(esQuery);
    return this.parseElasticsearchResult(result);
  }

  private buildElasticsearchQuery(query: MetricQuery): unknown {
    return {
      index: 'metrics',
      body: {
        query: {
          bool: {
            must: [
              { terms: { metric: query.metrics } },
              {
                range: {
                  timestamp: {
                    gte: query.timeRange.start,
                    lte: query.timeRange.end
                  }
                }
              }
            ]
          }
        },
        size: query.limit || 10000,
        sort: [{ timestamp: { order: 'asc' } }]
      }
    };
  }

  private parseElasticsearchResult(result: unknown): DataPoint[] {
    return result.hits.hits.map((hit: unknown) => hit._source);
  }

  private async queryTimescaleDB(query: MetricQuery): Promise<DataPoint[]> {
    // Build SQL query
    const sqlQuery = this.buildSQLQuery(query);
    const result = await this.storageConnection.select(sqlQuery);
    return result;
  }

  private buildSQLQuery(query: MetricQuery): string {
    const whereConditions = [
      `metric IN (${query.metrics.map(m => `'${m}'`).join(',')})`,
      `timestamp >= ${query.timeRange.start}`,
      `timestamp <= ${query.timeRange.end}`
    ];

    if (query.dimensions) {
      for (const [key, value] of Object.entries(query.dimensions)) {
        if (Array.isArray(value)) {
          whereConditions.push(`dimensions->>'${key}' IN (${value.map(v => `'${v}'`).join(',')})`);
        } else {
          whereConditions.push(`dimensions->>'${key}' = '${value}'`);
        }
      }
    }

    return `
      SELECT * FROM metrics 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY timestamp ASC
      ${query.limit ? `LIMIT ${query.limit}` : ''}
    `;
  }

  private async queryRedis(query: MetricQuery): Promise<DataPoint[]> {
    const results: DataPoint[] = [];
    
    for (const metric of query.metrics) {
      const key = `metric:${metric}`;
      const data = await this.storageConnection.zrange(
        key,
        query.timeRange.start,
        query.timeRange.end
      );
      
      for (const item of data) {
        const point = JSON.parse(item);
        if (this.matchesDimensions(point.dimensions, query.dimensions)) {
          results.push(point);
        }
      }
    }
    
    return results;
  }

  private matchesDimensions(
    pointDimensions: Record<string, string>,
    queryDimensions?: Record<string, string | string[]>
  ): boolean {
    if (!queryDimensions) return true;
    
    for (const [key, value] of Object.entries(queryDimensions)) {
      const pointValue = pointDimensions[key];
      
      if (Array.isArray(value)) {
        if (!value.includes(pointValue)) return false;
      } else {
        if (pointValue !== value) return false;
      }
    }
    
    return true;
  }

  private applyFilters(
    data: (DataPoint | AggregatedDataPoint)[],
    filters: QueryFilter[]
  ): (DataPoint | AggregatedDataPoint)[] {
    return data.filter(point => {
      for (const filter of filters) {
        const value = this.getFieldValue(point, filter.field);
        
        switch (filter.operator) {
          case 'eq':
            if (value !== filter.value) return false;
            break;
          case 'ne':
            if (value === filter.value) return false;
            break;
          case 'gt':
            if (value <= filter.value) return false;
            break;
          case 'lt':
            if (value >= filter.value) return false;
            break;
          case 'in':
            if (!filter.value.includes(value)) return false;
            break;
          case 'nin':
            if (filter.value.includes(value)) return false;
            break;
          case 'regex':
            if (!new RegExp(filter.value).test(String(value))) return false;
            break;
        }
      }
      return true;
    });
  }

  private getFieldValue(point: DataPoint | AggregatedDataPoint, field: string): unknown {
    const parts = field.split('.');
    let value: unknown = point;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return value;
  }

  private applyGroupBy(
    data: (DataPoint | AggregatedDataPoint)[],
    groupBy: string[]
  ): (DataPoint | AggregatedDataPoint)[] {
    if (groupBy.length === 0) return data;
    
    const groups = new Map<string, (DataPoint | AggregatedDataPoint)[]>();
    
    for (const point of data) {
      const key = groupBy.map(field => this.getFieldValue(point, field)).join('|');
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(point);
    }
    
    // Return first point from each group (simplified)
    return Array.from(groups.values()).map(group => group[0]);
  }

  private applyOrderBy(
    data: (DataPoint | AggregatedDataPoint)[],
    orderBy: OrderBy[]
  ): (DataPoint | AggregatedDataPoint)[] {
    if (orderBy.length === 0) return data;
    
    return data.sort((a, b) => {
      for (const order of orderBy) {
        const aValue = this.getFieldValue(a, order.field);
        const bValue = this.getFieldValue(b, order.field);
        
        if (aValue < bValue) return order.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return order.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private applyLimit(
    data: (DataPoint | AggregatedDataPoint)[],
    limit?: number
  ): (DataPoint | AggregatedDataPoint)[] {
    if (!limit) return data;
    return data.slice(0, limit);
  }

  // Dashboard Management
  public createDashboard(dashboard: Omit<Dashboard, 'id'>): Dashboard {
    const newDashboard: Dashboard = {
      ...dashboard,
      id: crypto.randomUUID()
    };
    
    this.dashboards.set(newDashboard.id, newDashboard);
    this.emit('dashboard:created', newDashboard);
    
    return newDashboard;
  }

  public getDashboard(id: string): Dashboard | undefined {
    return this.dashboards.get(id);
  }

  public getAllDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  public async renderDashboard(id: string): Promise<unknown> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${id}`);
    }

    const panels = [];
    
    for (const panel of dashboard.panels) {
      try {
        const result = await this.queryMetric(panel.query);
        panels.push({
          ...panel,
          data: result.data,
          metadata: result.metadata
        });
      } catch (error) {
        panels.push({
          ...panel,
          error: error.message
        });
      }
    }

    return {
      ...dashboard,
      panels,
      renderedAt: Date.now()
    };
  }

  // Cleanup and Maintenance
  public async cleanup(): Promise<void> {
    // Clean up old data
    const cutoffTime = Date.now() - this.config.retentionPeriod;
    
    // Clean aggregation cache
    for (const [
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      windowKey, 
      windowCache
    ] of this.aggregationCache.entries()) {
      const toDelete: number[] = [];
      
      for (const [timestamp] of windowCache.entries()) {
        if (timestamp < cutoffTime) {
          toDelete.push(timestamp);
        }
      }
      
      for (const timestamp of toDelete) {
        windowCache.delete(timestamp);
      }
    }

    // Flush remaining buffer
    await this.flushBuffer();

    this.emit('cleanup:completed', { cutoffTime });
  }

  public stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Close storage connection
    if (this.storageConnection?.close) {
      this.storageConnection.close();
    }
    
    this.emit('stopped');
  }

  // Statistics
  public getStatistics(): unknown {
    return {
      bufferSize: this.dataBuffer.length,
      aggregationCacheSize: this.aggregationCache.size,
      activeAlerts: Array.from(this.alertStates.values()).filter(s => s.isActive).length,
      streamsCount: this.streams.size,
      dashboardsCount: this.dashboards.size,
      uptimeMs: process.uptime() * 1000
    };
  }
}

// Default implementations
class DefaultStreamProcessor implements StreamProcessor {
  private config: StreamConfig;

  constructor(config: StreamConfig) {
    this.config = config;
  }

  async process(dataPoint: DataPoint): Promise<DataPoint[]> {
    let result = [dataPoint];

    // Apply filters
    if (this.config.filters) {
      const passed = this.config.filters.every(filter => {
        const value = dataPoint.dimensions[filter.field] || dataPoint[filter.field as keyof DataPoint];
        return this.evaluateFilter(value, filter);
      });
      
      if (!passed) return [];
    }

    // Apply transformations
    if (this.config.transformations) {
      for (const transformation of this.config.transformations) {
        result = await this.applyTransformation(result, transformation);
      }
    }

    return result;
  }

  private evaluateFilter(value: unknown, filter: StreamFilter): boolean {
    switch (filter.operator) {
      case 'eq': return value === filter.value;
      case 'ne': return value !== filter.value;
      case 'gt': return value > filter.value;
      case 'lt': return value < filter.value;
      case 'gte': return value >= filter.value;
      case 'lte': return value <= filter.value;
      case 'in': return filter.value.includes(value);
      case 'nin': return !filter.value.includes(value);
      case 'regex': return new RegExp(filter.value).test(String(value));
      case 'exists': return value !== undefined && value !== null;
      default: return true;
    }
  }

  private async applyTransformation(
    points: DataPoint[],
    transformation: DataTransformation
  ): Promise<DataPoint[]> {
    switch (transformation.type) {
      case 'map':
        return points.map(point => ({ ...point, ...transformation.config }));
      case 'filter':
        return points.filter(point => 
          this.evaluateFilter(point.value, transformation.config)
        );
      case 'enrich':
        return points.map(point => ({
          ...point,
          metadata: { ...point.metadata, ...transformation.config }
        }));
      default:
        return points;
    }
  }

  async flush(): Promise<void> {
    // Nothing to flush for default processor
  }
}

class SimpleAnomalyDetector implements AnomalyDetector {
  private models: Map<string, unknown> = new Map();

  async detect(dataPoints: DataPoint[]): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    for (const point of dataPoints) {
      const model = this.models.get(point.metric);
      if (!model) continue;

      // Simple threshold-based detection
      const { mean, stddev } = model;
      const zScore = Math.abs((point.value - mean) / stddev);
      
      if (zScore > 3) { // 3 sigma rule
        anomalies.push({
          timestamp: point.timestamp,
          metric: point.metric,
          dimensions: point.dimensions,
          value: point.value,
          expectedValue: mean,
          score: zScore,
          type: point.value > mean ? 'spike' : 'drop',
          severity: zScore > 4 ? 'high' : 'medium'
        });
      }
    }

    return anomalies;
  }

  async train(dataPoints: DataPoint[]): Promise<void> {
    const metricData = new Map<string, number[]>();

    // Group by metric
    for (const point of dataPoints) {
      if (!metricData.has(point.metric)) {
        metricData.set(point.metric, []);
      }
      metricData.get(point.metric)!.push(point.value);
    }

    // Calculate statistics for each metric
    for (const [metric, values] of metricData.entries()) {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stddev = Math.sqrt(variance);

      this.models.set(metric, { mean, stddev, samples: values.length });
    }
  }
}

class MemoryStorage {
  private data: DataPoint[] = [];

  async write(points: DataPoint[]): Promise<void> {
    this.data.push(...points);
  }

  async query(
     
    query: unknown
  ): Promise<DataPoint[]> {
    return this.data.filter(point => 
      point.timestamp >= query.timeRange.start &&
      point.timestamp <= query.timeRange.end
    );
  }
}

export default RealTimeAnalyticsEngine;