/**
 * Prometheus Monitoring System
 * Complete observability and metrics collection for production
 */

import { EventEmitter } from 'events';
import { Request, Response, NextFunction } from 'express';
import { getLogger } from '../backend/monitoring/EnhancedLogger';

const logger = getLogger('prometheus');

// Types
export interface PrometheusConfig {
  endpoint?: string;
  pushGateway?: string;
  interval?: number;
  prefix?: string;
  labels?: Record<string, string>;
  enableDefaultMetrics?: boolean;
  enableCustomMetrics?: boolean;
  buckets?: number[];
  quantiles?: number[];
}

export interface MetricOptions {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labels?: string[];
  buckets?: number[];
  quantiles?: number[];
}

export interface MetricValue {
  value: number;
  labels?: Record<string, string>;
  timestamp?: number;
}

export interface CollectedMetrics {
  counters: Map<string, CounterMetric>;
  gauges: Map<string, GaugeMetric>;
  histograms: Map<string, HistogramMetric>;
  summaries: Map<string, SummaryMetric>;
}

// Counter Metric
export class CounterMetric {
  private value: number = 0;
  private labeledValues: Map<string, number> = new Map();
  
  constructor(
    public name: string,
    public help: string,
    public labels: string[] = []
  ) {}
  
  inc(labels?: Record<string, string>, value: number = 1): void {
    if (labels) {
      const key = this.getLabelKey(labels);
      const current = this.labeledValues.get(key) || 0;
      this.labeledValues.set(key, current + value);
    } else {
      this.value += value;
    }
  }
  
  reset(): void {
    this.value = 0;
    this.labeledValues.clear();
  }
  
  private getLabelKey(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }
  
  collect(): string[] {
    const lines: string[] = [];
    lines.push(`# HELP ${this.name} ${this.help}`);
    lines.push(`# TYPE ${this.name} counter`);

    if (this.labeledValues.size > 0) {
      for (const [labelKey, value] of Array.from(this.labeledValues.entries())) {
        lines.push(`${this.name}{${labelKey}} ${value}`);
      }
    } else {
      lines.push(`${this.name} ${this.value}`);
    }

    return lines;
  }
}

// Gauge Metric
export class GaugeMetric {
  private value: number = 0;
  private labeledValues: Map<string, number> = new Map();
  
  constructor(
    public name: string,
    public help: string,
    public labels: string[] = []
  ) {}
  
  set(value: number, labels?: Record<string, string>): void {
    if (labels) {
      const key = this.getLabelKey(labels);
      this.labeledValues.set(key, value);
    } else {
      this.value = value;
    }
  }
  
  inc(labels?: Record<string, string>, value: number = 1): void {
    if (labels) {
      const key = this.getLabelKey(labels);
      const current = this.labeledValues.get(key) || 0;
      this.labeledValues.set(key, current + value);
    } else {
      this.value += value;
    }
  }
  
  dec(labels?: Record<string, string>, value: number = 1): void {
    this.inc(labels, -value);
  }
  
  private getLabelKey(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }
  
  collect(): string[] {
    const lines: string[] = [];
    lines.push(`# HELP ${this.name} ${this.help}`);
    lines.push(`# TYPE ${this.name} gauge`);

    if (this.labeledValues.size > 0) {
      for (const [labelKey, value] of Array.from(this.labeledValues.entries())) {
        lines.push(`${this.name}{${labelKey}} ${value}`);
      }
    } else {
      lines.push(`${this.name} ${this.value}`);
    }

    return lines;
  }
}

// Histogram Metric
export class HistogramMetric {
  private buckets: Map<number, number> = new Map();
  private sum: number = 0;
  private count: number = 0;
  private labeledHistograms: Map<string, HistogramData> = new Map();
  
  constructor(
    public name: string,
    public help: string,
    public labels: string[] = [],
    public bucketBoundaries: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  ) {
    this.initBuckets();
  }
  
  private initBuckets(): void {
    for (const boundary of this.bucketBoundaries) {
      this.buckets.set(boundary, 0);
    }
    this.buckets.set(Infinity, 0);
  }
  
  observe(value: number, labels?: Record<string, string>): void {
    if (labels) {
      const key = this.getLabelKey(labels);
      if (!this.labeledHistograms.has(key)) {
        this.labeledHistograms.set(key, new HistogramData(this.bucketBoundaries));
      }
      this.labeledHistograms.get(key)!.observe(value);
    } else {
      this.sum += value;
      this.count++;

      for (const [boundary, count] of Array.from(this.buckets.entries())) {
        if (value <= boundary) {
          this.buckets.set(boundary, count + 1);
        }
      }
    }
  }
  
  private getLabelKey(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }
  
  collect(): string[] {
    const lines: string[] = [];
    lines.push(`# HELP ${this.name} ${this.help}`);
    lines.push(`# TYPE ${this.name} histogram`);

    if (this.labeledHistograms.size > 0) {
      for (const [labelKey, histogram] of Array.from(this.labeledHistograms.entries())) {
        const buckets = histogram.getBuckets();
        for (const [boundary, count] of Array.from(buckets.entries())) {
          const bucketLabel = boundary === Infinity ? '+Inf' : boundary.toString();
          lines.push(`${this.name}_bucket{${labelKey},le="${bucketLabel}"} ${count}`);
        }
        lines.push(`${this.name}_sum{${labelKey}} ${histogram.getSum()}`);
        lines.push(`${this.name}_count{${labelKey}} ${histogram.getCount()}`);
      }
    } else {
      for (const [boundary, count] of Array.from(this.buckets.entries())) {
        const bucketLabel = boundary === Infinity ? '+Inf' : boundary.toString();
        lines.push(`${this.name}_bucket{le="${bucketLabel}"} ${count}`);
      }
      lines.push(`${this.name}_sum ${this.sum}`);
      lines.push(`${this.name}_count ${this.count}`);
    }

    return lines;
  }
}

// Helper class for histogram data
class HistogramData {
  private buckets: Map<number, number> = new Map();
  private sum: number = 0;
  private count: number = 0;
  
  constructor(bucketBoundaries: number[]) {
    for (const boundary of bucketBoundaries) {
      this.buckets.set(boundary, 0);
    }
    this.buckets.set(Infinity, 0);
  }
  
  observe(value: number): void {
    this.sum += value;
    this.count++;

    for (const [boundary, count] of Array.from(this.buckets.entries())) {
      if (value <= boundary) {
        this.buckets.set(boundary, count + 1);
      }
    }
  }
  
  getBuckets(): Map<number, number> {
    return this.buckets;
  }
  
  getSum(): number {
    return this.sum;
  }
  
  getCount(): number {
    return this.count;
  }
}

// Summary Metric
export class SummaryMetric {
  private values: number[] = [];
  private labeledSummaries: Map<string, number[]> = new Map();
  
  constructor(
    public name: string,
    public help: string,
    public labels: string[] = [],
    public quantiles: number[] = [0.5, 0.9, 0.99]
  ) {}
  
  observe(value: number, labels?: Record<string, string>): void {
    if (labels) {
      const key = this.getLabelKey(labels);
      if (!this.labeledSummaries.has(key)) {
        this.labeledSummaries.set(key, []);
      }
      this.labeledSummaries.get(key)!.push(value);
    } else {
      this.values.push(value);
    }
  }
  
  private getLabelKey(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }
  
  private calculateQuantile(values: number[], quantile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * quantile) - 1;
    return sorted[Math.max(0, index)];
  }
  
  collect(): string[] {
    const lines: string[] = [];
    lines.push(`# HELP ${this.name} ${this.help}`);
    lines.push(`# TYPE ${this.name} summary`);

    if (this.labeledSummaries.size > 0) {
      for (const [labelKey, values] of Array.from(this.labeledSummaries.entries())) {
        for (const quantile of this.quantiles) {
          const value = this.calculateQuantile(values, quantile);
          lines.push(`${this.name}{${labelKey},quantile="${quantile}"} ${value}`);
        }
        const sum = values.reduce((a, b) => a + b, 0);
        lines.push(`${this.name}_sum{${labelKey}} ${sum}`);
        lines.push(`${this.name}_count{${labelKey}} ${values.length}`);
      }
    } else {
      for (const quantile of this.quantiles) {
        const value = this.calculateQuantile(this.values, quantile);
        lines.push(`${this.name}{quantile="${quantile}"} ${value}`);
      }
      const sum = this.values.reduce((a, b) => a + b, 0);
      lines.push(`${this.name}_sum ${sum}`);
      lines.push(`${this.name}_count ${this.values.length}`);
    }

    return lines;
  }
}

// Main Prometheus Monitoring System
export class PrometheusMonitoring extends EventEmitter {
  private static instance: PrometheusMonitoring;
  private config: PrometheusConfig;
  private metrics: CollectedMetrics;
  private defaultMetrics: Map<string, GaugeMetric>;
  private scrapeInterval?: NodeJS.Timeout;
  private pushInterval?: NodeJS.Timeout;
  
  private constructor(config: PrometheusConfig = {}) {
    super();
    
    this.config = {
      endpoint: '/metrics',
      interval: 10000, // 10 seconds
      prefix: 'workflow_',
      enableDefaultMetrics: true,
      enableCustomMetrics: true,
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10],
      quantiles: [0.5, 0.9, 0.95, 0.99],
      ...config
    };
    
    this.metrics = {
      counters: new Map(),
      gauges: new Map(),
      histograms: new Map(),
      summaries: new Map()
    };
    
    this.defaultMetrics = new Map();
    
    if (this.config.enableDefaultMetrics) {
      this.registerDefaultMetrics();
    }
    
    if (this.config.enableCustomMetrics) {
      this.registerCustomMetrics();
    }
    
    this.startCollection();
  }
  
  public static getInstance(config?: PrometheusConfig): PrometheusMonitoring {
    if (!PrometheusMonitoring.instance) {
      PrometheusMonitoring.instance = new PrometheusMonitoring(config);
    }
    return PrometheusMonitoring.instance;
  }
  
  // Register default Node.js metrics
  private registerDefaultMetrics(): void {
    // Process metrics
    this.registerGauge({
      name: `${this.config.prefix}nodejs_process_cpu_usage`,
      help: 'Process CPU usage',
      type: 'gauge'
    });

    this.registerGauge({
      name: `${this.config.prefix}nodejs_process_memory_heap_used_bytes`,
      help: 'Process heap memory used',
      type: 'gauge'
    });

    this.registerGauge({
      name: `${this.config.prefix}nodejs_process_memory_heap_total_bytes`,
      help: 'Process total heap memory',
      type: 'gauge'
    });

    this.registerGauge({
      name: `${this.config.prefix}nodejs_process_memory_external_bytes`,
      help: 'Process external memory',
      type: 'gauge'
    });

    this.registerGauge({
      name: `${this.config.prefix}nodejs_active_handles`,
      help: 'Number of active handles',
      type: 'gauge'
    });

    this.registerGauge({
      name: `${this.config.prefix}nodejs_active_requests`,
      help: 'Number of active requests',
      type: 'gauge'
    });

    this.registerGauge({
      name: `${this.config.prefix}nodejs_event_loop_lag_seconds`,
      help: 'Event loop lag in seconds',
      type: 'gauge'
    });
  }
  
  // Register custom application metrics
  private registerCustomMetrics(): void {
    // Workflow metrics
    this.registerCounter({
      name: `${this.config.prefix}workflow_executions_total`,
      help: 'Total number of workflow executions',
      type: 'counter',
      labels: ['status', 'workflow_id']
    });

    this.registerHistogram({
      name: `${this.config.prefix}workflow_execution_duration_seconds`,
      help: 'Workflow execution duration in seconds',
      type: 'histogram',
      labels: ['workflow_id'],
      buckets: this.config.buckets
    });

    this.registerGauge({
      name: `${this.config.prefix}workflow_active_executions`,
      help: 'Number of currently active workflow executions',
      type: 'gauge'
    });

    // API metrics
    this.registerCounter({
      name: `${this.config.prefix}http_requests_total`,
      help: 'Total number of HTTP requests',
      type: 'counter',
      labels: ['method', 'route', 'status']
    });

    this.registerHistogram({
      name: `${this.config.prefix}http_request_duration_seconds`,
      help: 'HTTP request duration in seconds',
      type: 'histogram',
      labels: ['method', 'route'],
      buckets: this.config.buckets
    });

    // Node execution metrics
    this.registerCounter({
      name: `${this.config.prefix}node_executions_total`,
      help: 'Total number of node executions',
      type: 'counter',
      labels: ['node_type', 'status']
    });

    this.registerHistogram({
      name: `${this.config.prefix}node_execution_duration_seconds`,
      help: 'Node execution duration in seconds',
      type: 'histogram',
      labels: ['node_type'],
      buckets: this.config.buckets
    });

    // Queue metrics
    this.registerGauge({
      name: `${this.config.prefix}queue_size`,
      help: 'Current queue size',
      type: 'gauge',
      labels: ['queue_name']
    });

    this.registerGauge({
      name: `${this.config.prefix}queue_processing_rate`,
      help: 'Queue processing rate per second',
      type: 'gauge',
      labels: ['queue_name']
    });

    // Error metrics
    this.registerCounter({
      name: `${this.config.prefix}errors_total`,
      help: 'Total number of errors',
      type: 'counter',
      labels: ['type', 'component']
    });

    // Database metrics
    this.registerHistogram({
      name: `${this.config.prefix}database_query_duration_seconds`,
      help: 'Database query duration in seconds',
      type: 'histogram',
      labels: ['operation', 'table'],
      buckets: this.config.buckets
    });

    this.registerGauge({
      name: `${this.config.prefix}database_connections_active`,
      help: 'Number of active database connections',
      type: 'gauge'
    });

    this.registerGauge({
      name: `${this.config.prefix}database_connections_idle`,
      help: 'Number of idle database connections',
      type: 'gauge'
    });
  }
  
  // Register a counter metric
  public registerCounter(options: MetricOptions): CounterMetric {
    const counter = new CounterMetric(options.name, options.help, options.labels);
    this.metrics.counters.set(options.name, counter);
    return counter;
  }
  
  // Register a gauge metric
  public registerGauge(options: MetricOptions): GaugeMetric {
    const gauge = new GaugeMetric(options.name, options.help, options.labels);
    this.metrics.gauges.set(options.name, gauge);
    return gauge;
  }
  
  // Register a histogram metric
  public registerHistogram(options: MetricOptions): HistogramMetric {
    const histogram = new HistogramMetric(
      options.name,
      options.help,
      options.labels,
      options.buckets || this.config.buckets
    );
    this.metrics.histograms.set(options.name, histogram);
    return histogram;
  }
  
  // Register a summary metric
  public registerSummary(options: MetricOptions): SummaryMetric {
    const summary = new SummaryMetric(
      options.name,
      options.help,
      options.labels,
      options.quantiles || this.config.quantiles
    );
    this.metrics.summaries.set(options.name, summary);
    return summary;
  }
  
  // Get a registered metric
  public getMetric(name: string): CounterMetric | GaugeMetric | HistogramMetric | SummaryMetric | undefined {
    return this.metrics.counters.get(name) ||
           this.metrics.gauges.get(name) ||
           this.metrics.histograms.get(name) ||
           this.metrics.summaries.get(name);
  }
  
  // Increment a counter
  public incCounter(name: string, labels?: Record<string, string>, value: number = 1): void {
    const counter = this.metrics.counters.get(name);
    if (counter) {
      counter.inc(labels, value);
    }
  }
  
  // Set a gauge value
  public setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const gauge = this.metrics.gauges.get(name);
    if (gauge) {
      gauge.set(value, labels);
    }
  }
  
  // Observe a histogram value
  public observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const histogram = this.metrics.histograms.get(name);
    if (histogram) {
      histogram.observe(value, labels);
    }
  }
  
  // Observe a summary value
  public observeSummary(name: string, value: number, labels?: Record<string, string>): void {
    const summary = this.metrics.summaries.get(name);
    if (summary) {
      summary.observe(value, labels);
    }
  }
  
  // Collect default metrics
  private collectDefaultMetrics(): void {
    if (!this.config.enableDefaultMetrics) return;
    
    const memUsage = process.memoryUsage();
    
    this.setGauge(`${this.config.prefix}nodejs_process_memory_heap_used_bytes`, memUsage.heapUsed);
    this.setGauge(`${this.config.prefix}nodejs_process_memory_heap_total_bytes`, memUsage.heapTotal);
    this.setGauge(`${this.config.prefix}nodejs_process_memory_external_bytes`, memUsage.external);
    
    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    const totalCpu = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    this.setGauge(`${this.config.prefix}nodejs_process_cpu_usage`, totalCpu);
    
    // Active handles and requests (if available)
    if (typeof (process as any)._getActiveHandles === 'function') {
      this.setGauge(`${this.config.prefix}nodejs_active_handles`, (process as any)._getActiveHandles().length);
    }
    
    if (typeof (process as any)._getActiveRequests === 'function') {
      this.setGauge(`${this.config.prefix}nodejs_active_requests`, (process as any)._getActiveRequests().length);
    }
  }
  
  // Start metrics collection
  private startCollection(): void {
    // Collect default metrics periodically
    this.scrapeInterval = setInterval(() => {
      this.collectDefaultMetrics();
      this.emit('metrics-collected');
    }, this.config.interval);
    
    // Push to gateway if configured
    if (this.config.pushGateway) {
      this.pushInterval = setInterval(() => {
        this.pushMetrics();
      }, this.config.interval);
    }
    
    logger.info('Prometheus monitoring started', {
      endpoint: this.config.endpoint,
      interval: this.config.interval
    });
  }
  
  // Stop metrics collection
  public stop(): void {
    if (this.scrapeInterval) {
      clearInterval(this.scrapeInterval);
    }
    
    if (this.pushInterval) {
      clearInterval(this.pushInterval);
    }
    
    logger.info('Prometheus monitoring stopped');
  }
  
  // Collect all metrics in Prometheus format
  public collect(): string {
    const lines: string[] = [];

    // Collect default metrics first
    this.collectDefaultMetrics();

    // Collect counters
    for (const counter of Array.from(this.metrics.counters.values())) {
      lines.push(...counter.collect());
    }

    // Collect gauges
    for (const gauge of Array.from(this.metrics.gauges.values())) {
      lines.push(...gauge.collect());
    }

    // Collect histograms
    for (const histogram of Array.from(this.metrics.histograms.values())) {
      lines.push(...histogram.collect());
    }

    // Collect summaries
    for (const summary of Array.from(this.metrics.summaries.values())) {
      lines.push(...summary.collect());
    }

    return lines.join('\n');
  }
  
  // Push metrics to Prometheus pushgateway
  private async pushMetrics(): Promise<void> {
    if (!this.config.pushGateway) return;
    
    try {
      const metrics = this.collect();
      
      const response = await fetch(this.config.pushGateway, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain; version=0.0.4'
        },
        body: metrics
      });
      
      if (!response.ok) {
        throw new Error(`Push failed: ${response.statusText}`);
      }
      
      this.emit('metrics-pushed');
    } catch (error) {
      logger.error('Failed to push metrics to Prometheus', error);
      this.emit('push-error', error);
    }
  }
  
  // Express middleware for metrics endpoint
  public expressMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.path === this.config.endpoint) {
        res.set('Content-Type', 'text/plain; version=0.0.4');
        res.send(this.collect());
      } else {
        next();
      }
    };
  }
  
  // Helper method to time operations
  public async timeOperation<T>(
    name: string,
    operation: () => Promise<T>,
    labels?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = (Date.now() - startTime) / 1000;
      this.observeHistogram(name, duration, labels);
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.observeHistogram(name, duration, { ...labels, status: 'error' });
      throw error;
    }
  }
  
  // Helper method to track concurrent operations
  public trackConcurrent(
    gaugeName: string,
    operation: () => Promise<any>,
    labels?: Record<string, string>
  ): Promise<any> {
    const gauge = this.metrics.gauges.get(gaugeName);
    
    if (gauge) {
      gauge.inc(labels);
    }
    
    return operation().finally(() => {
      if (gauge) {
        gauge.dec(labels);
      }
    });
  }
}

// Export singleton instance as default
export default PrometheusMonitoring.getInstance();