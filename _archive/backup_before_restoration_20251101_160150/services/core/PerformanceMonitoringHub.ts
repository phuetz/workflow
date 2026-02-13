/**
 * PLAN C PHASE 3 - Service Monolithique 5: Hub de Monitoring Performance
 * Unifie métriques, monitoring, APM, profiling et observabilité
 */

import { logger } from '../LoggingService';
import cacheService from '../CacheService';
import { notificationService } from './UnifiedNotificationService';
import { EventEmitter } from 'events';

// Types
export interface Metric {
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  tags: Record<string, string>;
  timestamp: Date;
  unit?: string;
  description?: string;
}

export interface MetricDefinition {
  name: string;
  type: Metric['type'];
  unit?: string;
  description?: string;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  retention?: number; // days
  alerts?: MetricAlert[];
}

export interface MetricAlert {
  name: string;
  condition: string; // e.g., "value > 100"
  duration?: number; // milliseconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown?: number;
  actions?: AlertAction[];
}

export interface AlertAction {
  type: 'notification' | 'webhook' | 'scale' | 'restart' | 'custom';
  config: Record<string, any>;
}

export interface PerformanceSnapshot {
  timestamp: Date;
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  io: IOMetrics;
  network: NetworkMetrics;
  custom: Record<string, number>;
}

export interface CPUMetrics {
  usage: number; // percentage
  user: number;
  system: number;
  idle: number;
  load1m: number;
  load5m: number;
  load15m: number;
}

export interface MemoryMetrics {
  used: number; // bytes
  free: number;
  total: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface IOMetrics {
  reads: number;
  writes: number;
  readBytes: number;
  writeBytes: number;
  readTime: number;
  writeTime: number;
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  errors: number;
  dropped: number;
}

export interface Trace {
  id: string;
  parentId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'running' | 'completed' | 'failed';
  tags: Record<string, any>;
  logs: TraceLog[];
  children: Trace[];
}

export interface TraceLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export interface Profile {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  samples: ProfileSample[];
  summary?: ProfileSummary;
}

export interface ProfileSample {
  timestamp: number;
  stack: string[];
  cpu: number;
  memory: number;
}

export interface ProfileSummary {
  totalSamples: number;
  duration: number;
  hotspots: Array<{
    function: string;
    samples: number;
    percentage: number;
  }>;
  memoryLeaks?: Array<{
    location: string;
    growth: number;
  }>;
}

export interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  refreshInterval: number;
  timeRange: TimeRange;
  variables: Record<string, any>;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'gauge' | 'table' | 'heatmap' | 'log' | 'alert';
  title: string;
  metrics: string[];
  config: Record<string, any>;
  position: { x: number; y: number; width: number; height: number };
}

export interface TimeRange {
  from: Date | string; // Can be relative like 'now-1h'
  to: Date | string;
}

/**
 * Hub unifié de monitoring de performance
 */
export class PerformanceMonitoringHub extends EventEmitter {
  private static instance: PerformanceMonitoringHub;
  
  // Configuration
  private readonly METRICS_BUFFER_SIZE = 10000;
  private readonly SNAPSHOT_INTERVAL = 5000; // 5 seconds
  private readonly AGGREGATION_INTERVAL = 60000; // 1 minute
  private readonly MAX_TRACE_DEPTH = 20;
  private readonly PROFILE_SAMPLE_RATE = 100; // Hz
  
  // Storage
  private metrics: Metric[] = [];
  private metricDefinitions: Map<string, MetricDefinition> = new Map();
  private snapshots: PerformanceSnapshot[] = [];
  private traces: Map<string, Trace> = new Map();
  private activeProfiles: Map<string, Profile> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private metricAlerts: Map<string, MetricAlert> = new Map();
  
  // Aggregated metrics
  private aggregatedMetrics: Map<string, AggregatedMetric> = new Map();
  
  // Monitoring
  private snapshotTimer: NodeJS.Timeout | null = null;
  private aggregationTimer: NodeJS.Timeout | null = null;
  private profileTimer: NodeJS.Timeout | null = null;
  
  private constructor() {
    super();
    this.initialize();
  }
  
  static getInstance(): PerformanceMonitoringHub {
    if (!PerformanceMonitoringHub.instance) {
      PerformanceMonitoringHub.instance = new PerformanceMonitoringHub();
    }
    return PerformanceMonitoringHub.instance;
  }
  
  private initialize(): void {
    // Register default metrics
    this.registerDefaultMetrics();
    
    // Start snapshot collection
    this.startSnapshotCollection();
    
    // Start metric aggregation
    this.startMetricAggregation();
    
    logger.info('Performance Monitoring Hub initialized');
  }
  
  /**
   * Record a metric
   */
  recordMetric(metric: Omit<Metric, 'timestamp'>): void {
    const fullMetric: Metric = {
      ...metric,
      timestamp: new Date()
    };
    
    // Add to buffer
    this.metrics.push(fullMetric);
    
    // Trim buffer if needed
    if (this.metrics.length > this.METRICS_BUFFER_SIZE) {
      this.metrics = this.metrics.slice(-this.METRICS_BUFFER_SIZE);
    }
    
    // Update aggregated metrics
    this.updateAggregatedMetric(fullMetric);
    
    // Check alerts
    this.checkMetricAlerts(fullMetric);
    
    // Emit event
    this.emit('metric.recorded', fullMetric);
  }
  
  /**
   * Increment a counter
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      value,
      type: 'counter',
      tags: tags || {}
    });
  }
  
  /**
   * Set a gauge value
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      value,
      type: 'gauge',
      tags: tags || {}
    });
  }
  
  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      value,
      type: 'histogram',
      tags: tags || {}
    });
  }
  
  /**
   * Start a trace
   */
  startTrace(name: string, parentId?: string): string {
    const trace: Trace = {
      id: this.generateTraceId(),
      parentId,
      name,
      startTime: Date.now(),
      status: 'running',
      tags: {},
      logs: [],
      children: []
    };
    
    this.traces.set(trace.id, trace);
    
    // Add to parent if exists
    if (parentId) {
      const parent = this.traces.get(parentId);
      if (parent) {
        parent.children.push(trace);
      }
    }
    
    this.emit('trace.started', trace);
    
    return trace.id;
  }
  
  /**
   * End a trace
   */
  endTrace(traceId: string, status: 'completed' | 'failed' = 'completed'): void {
    const trace = this.traces.get(traceId);
    
    if (!trace) {
      logger.warn(`Trace ${traceId} not found`);
      return;
    }
    
    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.status = status;
    
    // Record trace metrics
    this.recordMetric({
      name: 'trace.duration',
      value: trace.duration,
      type: 'histogram',
      tags: {
        name: trace.name,
        status
      }
    });
    
    this.emit('trace.ended', trace);
    
    // Store trace for analysis
    this.storeTrace(trace);
  }
  
  /**
   * Add log to trace
   */
  traceLog(
    traceId: string,
    level: TraceLog['level'],
    message: string,
    data?: any
  ): void {
    const trace = this.traces.get(traceId);
    
    if (!trace) {
      logger.warn(`Trace ${traceId} not found`);
      return;
    }
    
    trace.logs.push({
      timestamp: Date.now(),
      level,
      message,
      data
    });
  }
  
  /**
   * Start profiling
   */
  startProfiling(name: string): string {
    const profile: Profile = {
      id: this.generateProfileId(),
      name,
      startTime: new Date(),
      samples: []
    };
    
    this.activeProfiles.set(profile.id, profile);
    
    // Start sampling
    const timer = setInterval(() => {
      this.collectProfileSample(profile);
    }, 1000 / this.PROFILE_SAMPLE_RATE);
    
    // Store timer reference
    profile.timerId = timer;
    
    logger.info(`Started profiling: ${name}`);
    
    return profile.id;
  }
  
  /**
   * Stop profiling
   */
  stopProfiling(profileId: string): Profile | undefined {
    const profile = this.activeProfiles.get(profileId);
    
    if (!profile) {
      logger.warn(`Profile ${profileId} not found`);
      return undefined;
    }
    
    profile.endTime = new Date();
    
    // Stop sampling
    if (profile.timerId) {
      clearInterval(profile.timerId);
    }
    
    // Generate summary
    profile.summary = this.generateProfileSummary(profile);
    
    // Remove from active
    this.activeProfiles.delete(profileId);
    
    // Store profile
    this.storeProfile(profile);
    
    logger.info(`Stopped profiling: ${profile.name}`);
    
    return profile;
  }
  
  /**
   * Get current performance snapshot
   */
  getSnapshot(): PerformanceSnapshot {
    // BROWSER FIX: Use browser-compatible memory API
    let memUsage;
    if (typeof process !== 'undefined' && process.memoryUsage) {
      // Node.js environment
      memUsage = process.memoryUsage();
    } else if (typeof performance !== 'undefined' && (performance as any).memory) {
      // Browser with performance.memory (Chrome)
      const perfMemory = (performance as any).memory;
      memUsage = {
        rss: perfMemory.usedJSHeapSize || 0,
        heapUsed: perfMemory.usedJSHeapSize || 0,
        heapTotal: perfMemory.totalJSHeapSize || 0,
        external: 0
      };
    } else {
      // Fallback for browsers without performance.memory
      memUsage = {
        rss: 0,
        heapUsed: 0,
        heapTotal: 0,
        external: 0
      };
    }

    return {
      timestamp: new Date(),
      cpu: this.getCPUMetrics(),
      memory: {
        used: memUsage.rss,
        free: 0, // Would need OS-specific implementation
        total: 0,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      },
      io: this.getIOMetrics(),
      network: this.getNetworkMetrics(),
      custom: this.getCustomMetrics()
    };
  }
  
  /**
   * Get metrics for time range
   */
  getMetrics(
    names: string[],
    timeRange: TimeRange,
    tags?: Record<string, string>
  ): Metric[] {
    const from = this.parseTime(timeRange.from);
    const to = this.parseTime(timeRange.to);
    
    return this.metrics.filter(m => {
      if (!names.includes(m.name)) return false;
      if (m.timestamp < from || m.timestamp > to) return false;
      
      if (tags) {
        for (const [key, value] of Object.entries(tags)) {
          if (m.tags[key] !== value) return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(
    name: string,
    timeRange: TimeRange,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count'
  ): number {
    const metrics = this.getMetrics([name], timeRange);
    
    if (metrics.length === 0) return 0;
    
    switch (aggregation) {
      case 'sum':
        return metrics.reduce((sum, m) => sum + m.value, 0);
      
      case 'avg':
        return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
      
      case 'min':
        return Math.min(...metrics.map(m => m.value));
      
      case 'max':
        return Math.max(...metrics.map(m => m.value));
      
      case 'count':
        return metrics.length;
      
      default:
        return 0;
    }
  }
  
  /**
   * Create a dashboard
   */
  createDashboard(dashboard: Dashboard): void {
    this.dashboards.set(dashboard.id, dashboard);
    logger.info(`Dashboard ${dashboard.id} created`);
  }
  
  /**
   * Get dashboard data
   */
  getDashboardData(dashboardId: string): any {
    const dashboard = this.dashboards.get(dashboardId);
    
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }
    
    const data: any = {
      dashboard,
      widgets: {}
    };
    
    for (const widget of dashboard.widgets) {
      data.widgets[widget.id] = this.getWidgetData(widget, dashboard.timeRange);
    }
    
    return data;
  }
  
  /**
   * Register metric definition
   */
  registerMetric(definition: MetricDefinition): void {
    this.metricDefinitions.set(definition.name, definition);
    
    // Register alerts
    if (definition.alerts) {
      for (const alert of definition.alerts) {
        this.metricAlerts.set(`${definition.name}:${alert.name}`, alert);
      }
    }
    
    logger.info(`Metric ${definition.name} registered`);
  }
  
  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];
    
    // Group metrics by name
    const grouped = new Map<string, Metric[]>();
    
    for (const metric of this.metrics) {
      if (!grouped.has(metric.name)) {
        grouped.set(metric.name, []);
      }
      grouped.get(metric.name)!.push(metric);
    }
    
    // Format each metric
    for (const [name, metrics] of grouped) {
      const definition = this.metricDefinitions.get(name);
      
      // Add HELP and TYPE lines
      if (definition) {
        if (definition.description) {
          lines.push(`# HELP ${name} ${definition.description}`);
        }
        lines.push(`# TYPE ${name} ${definition.type}`);
      }
      
      // Add metric values
      for (const metric of metrics.slice(-10)) { // Last 10 values
        const labels = Object.entries(metric.tags)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        
        const labelStr = labels ? `{${labels}}` : '';
        lines.push(`${name}${labelStr} ${metric.value} ${metric.timestamp.getTime()}`);
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Private helper methods
   */
  
  private registerDefaultMetrics(): void {
    // System metrics
    this.registerMetric({
      name: 'system.cpu.usage',
      type: 'gauge',
      unit: 'percent',
      description: 'CPU usage percentage',
      alerts: [{
        name: 'high_cpu',
        condition: 'value > 80',
        duration: 60000,
        severity: 'high',
        cooldown: 300000
      }]
    });
    
    this.registerMetric({
      name: 'system.memory.usage',
      type: 'gauge',
      unit: 'bytes',
      description: 'Memory usage in bytes',
      alerts: [{
        name: 'high_memory',
        condition: 'value > 1073741824', // 1GB
        duration: 60000,
        severity: 'high',
        cooldown: 300000
      }]
    });
    
    // Application metrics
    this.registerMetric({
      name: 'app.request.count',
      type: 'counter',
      description: 'Total number of requests'
    });
    
    this.registerMetric({
      name: 'app.request.duration',
      type: 'histogram',
      unit: 'milliseconds',
      description: 'Request duration'
    });
    
    this.registerMetric({
      name: 'app.error.count',
      type: 'counter',
      description: 'Total number of errors'
    });
  }
  
  private startSnapshotCollection(): void {
    this.snapshotTimer = setInterval(() => {
      const snapshot = this.getSnapshot();
      
      // Store snapshot
      this.snapshots.push(snapshot);
      
      // Keep only last hour
      const oneHourAgo = Date.now() - 3600000;
      this.snapshots = this.snapshots.filter(s => 
        s.timestamp.getTime() > oneHourAgo
      );
      
      // Record snapshot metrics
      this.recordSnapshotMetrics(snapshot);
      
    }, this.SNAPSHOT_INTERVAL);
  }
  
  private recordSnapshotMetrics(snapshot: PerformanceSnapshot): void {
    this.gauge('system.cpu.usage', snapshot.cpu.usage);
    this.gauge('system.memory.usage', snapshot.memory.used);
    this.gauge('system.memory.heap', snapshot.memory.heapUsed);
    
    if (snapshot.io) {
      this.gauge('system.io.reads', snapshot.io.reads);
      this.gauge('system.io.writes', snapshot.io.writes);
    }
    
    if (snapshot.network) {
      this.gauge('system.network.in', snapshot.network.bytesIn);
      this.gauge('system.network.out', snapshot.network.bytesOut);
    }
  }
  
  private startMetricAggregation(): void {
    this.aggregationTimer = setInterval(() => {
      this.aggregateMetrics();
    }, this.AGGREGATION_INTERVAL);
  }
  
  private aggregateMetrics(): void {
    const now = Date.now();
    const windowStart = now - this.AGGREGATION_INTERVAL;
    
    // Group metrics by name
    const grouped = new Map<string, Metric[]>();
    
    for (const metric of this.metrics) {
      if (metric.timestamp.getTime() < windowStart) continue;
      
      if (!grouped.has(metric.name)) {
        grouped.set(metric.name, []);
      }
      grouped.get(metric.name)!.push(metric);
    }
    
    // Calculate aggregations
    for (const [name, metrics] of grouped) {
      const values = metrics.map(m => m.value);
      
      this.aggregatedMetrics.set(name, {
        count: metrics.length,
        sum: values.reduce((a, b) => a + b, 0),
        avg: values.reduce((a, b) => a + b, 0) / metrics.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p50: this.percentile(values, 0.5),
        p95: this.percentile(values, 0.95),
        p99: this.percentile(values, 0.99)
      });
    }
  }
  
  private updateAggregatedMetric(metric: Metric): void {
    const agg = this.aggregatedMetrics.get(metric.name) || {
      count: 0,
      sum: 0,
      avg: 0,
      min: Infinity,
      max: -Infinity,
      p50: 0,
      p95: 0,
      p99: 0
    };
    
    agg.count++;
    agg.sum += metric.value;
    agg.avg = agg.sum / agg.count;
    agg.min = Math.min(agg.min, metric.value);
    agg.max = Math.max(agg.max, metric.value);
    
    this.aggregatedMetrics.set(metric.name, agg);
  }
  
  private checkMetricAlerts(metric: Metric): void {
    const definition = this.metricDefinitions.get(metric.name);
    
    if (!definition?.alerts) return;
    
    for (const alert of definition.alerts) {
      const alertKey = `${metric.name}:${alert.name}`;
      
      // Evaluate condition
      const condition = alert.condition.replace('value', String(metric.value));
      const triggered = this.evaluateCondition(condition);
      
      if (triggered) {
        this.triggerMetricAlert(metric, alert);
      }
    }
  }
  
  private evaluateCondition(condition: string): boolean {
    try {
      // Safe evaluation of simple conditions
      // In production, use a proper expression parser
      return new Function('return ' + condition)();
    } catch (error) {
      logger.error('Failed to evaluate condition:', error);
      return false;
    }
  }
  
  private async triggerMetricAlert(metric: Metric, alert: MetricAlert): Promise<void> {
    // Send notification
    await notificationService.send({
      type: 'alert',
      severity: alert.severity,
      title: `Metric Alert: ${alert.name}`,
      message: `Metric ${metric.name} triggered alert: ${metric.value}`,
      source: 'performance-monitoring',
      channels: ['console', 'websocket'],
      data: { metric, alert }
    });
    
    // Execute actions
    if (alert.actions) {
      for (const action of alert.actions) {
        await this.executeAlertAction(action, metric, alert);
      }
    }
  }
  
  private async executeAlertAction(
    action: AlertAction,
    metric: Metric,
    alert: MetricAlert
  ): Promise<void> {
    switch (action.type) {
      case 'notification':
        // Already handled above
        break;
      
      case 'webhook':
        // Send webhook
        logger.info(`Webhook triggered for alert ${alert.name}`);
        break;
      
      case 'scale':
        // Trigger auto-scaling
        logger.info(`Auto-scaling triggered for alert ${alert.name}`);
        break;
      
      case 'restart':
        // Trigger service restart
        logger.info(`Service restart triggered for alert ${alert.name}`);
        break;
      
      case 'custom':
        if (action.config.handler) {
          await action.config.handler(metric, alert);
        }
        break;
    }
  }
  
  private getCPUMetrics(): CPUMetrics {
    // In production, use OS-specific APIs
    return {
      usage: Math.random() * 100,
      user: Math.random() * 100,
      system: Math.random() * 100,
      idle: Math.random() * 100,
      load1m: Math.random() * 4,
      load5m: Math.random() * 4,
      load15m: Math.random() * 4
    };
  }
  
  private getIOMetrics(): IOMetrics {
    // In production, use OS-specific APIs
    return {
      reads: Math.floor(Math.random() * 1000),
      writes: Math.floor(Math.random() * 1000),
      readBytes: Math.floor(Math.random() * 1000000),
      writeBytes: Math.floor(Math.random() * 1000000),
      readTime: Math.random() * 100,
      writeTime: Math.random() * 100
    };
  }
  
  private getNetworkMetrics(): NetworkMetrics {
    // In production, use OS-specific APIs
    return {
      bytesIn: Math.floor(Math.random() * 1000000),
      bytesOut: Math.floor(Math.random() * 1000000),
      packetsIn: Math.floor(Math.random() * 10000),
      packetsOut: Math.floor(Math.random() * 10000),
      errors: Math.floor(Math.random() * 10),
      dropped: Math.floor(Math.random() * 10)
    };
  }
  
  private getCustomMetrics(): Record<string, number> {
    const custom: Record<string, number> = {};
    
    // Add custom application metrics
    for (const [name, agg] of this.aggregatedMetrics) {
      if (name.startsWith('app.')) {
        custom[name] = agg.avg;
      }
    }
    
    return custom;
  }
  
  private collectProfileSample(profile: Profile): void {
    const sample: ProfileSample = {
      timestamp: Date.now(),
      stack: this.captureStackTrace(),
      cpu: this.getCPUUsage(),
      memory: process.memoryUsage().heapUsed
    };
    
    profile.samples.push(sample);
  }
  
  private captureStackTrace(): string[] {
    const err = new Error();
    const stack = err.stack?.split('\n').slice(2, 10) || [];
    return stack.map(line => line.trim());
  }
  
  private getCPUUsage(): number {
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 1000; // Convert to milliseconds
  }
  
  private generateProfileSummary(profile: Profile): ProfileSummary {
    const functionCounts = new Map<string, number>();
    
    // Count function occurrences
    for (const sample of profile.samples) {
      for (const frame of sample.stack) {
        const func = this.extractFunctionName(frame);
        functionCounts.set(func, (functionCounts.get(func) || 0) + 1);
      }
    }
    
    // Find hotspots
    const hotspots = Array.from(functionCounts.entries())
      .map(([func, count]) => ({
        function: func,
        samples: count,
        percentage: (count / profile.samples.length) * 100
      }))
      .sort((a, b) => b.samples - a.samples)
      .slice(0, 10);
    
    // Detect memory leaks
    const memoryGrowth = this.detectMemoryGrowth(profile.samples);
    
    return {
      totalSamples: profile.samples.length,
      duration: profile.endTime ? profile.endTime.getTime() - profile.startTime.getTime() : 0,
      hotspots,
      memoryLeaks: memoryGrowth
    };
  }
  
  private extractFunctionName(stackFrame: string): string {
    // Extract function name from stack frame
    const match = stackFrame.match(/at\s+(.+?)\s+\(/);
    return match ? match[1] : stackFrame;
  }
  
  private detectMemoryGrowth(samples: ProfileSample[]): Array<{ location: string; growth: number }> {
    // Simple memory leak detection
    const leaks: Array<{ location: string; growth: number }> = [];
    
    if (samples.length < 10) return leaks;
    
    const startMemory = samples[0].memory;
    const endMemory = samples[samples.length - 1].memory;
    const growth = endMemory - startMemory;
    
    if (growth > 10485760) { // 10MB growth
      leaks.push({
        location: 'heap',
        growth
      });
    }
    
    return leaks;
  }
  
  private getWidgetData(widget: DashboardWidget, timeRange: TimeRange): any {
    switch (widget.type) {
      case 'chart':
        return this.getChartData(widget.metrics, timeRange);
      
      case 'gauge':
        return this.getGaugeData(widget.metrics[0]);
      
      case 'table':
        return this.getTableData(widget.metrics, timeRange);
      
      default:
        return null;
    }
  }
  
  private getChartData(metrics: string[], timeRange: TimeRange): any {
    const data: any = {
      labels: [],
      datasets: []
    };
    
    for (const metricName of metrics) {
      const metricData = this.getMetrics([metricName], timeRange);
      
      data.datasets.push({
        label: metricName,
        data: metricData.map(m => ({
          x: m.timestamp,
          y: m.value
        }))
      });
    }
    
    return data;
  }
  
  private getGaugeData(metricName: string): any {
    const agg = this.aggregatedMetrics.get(metricName);
    
    return {
      value: agg?.avg || 0,
      min: agg?.min || 0,
      max: agg?.max || 100
    };
  }
  
  private getTableData(metrics: string[], timeRange: TimeRange): any {
    const rows: any[] = [];
    
    for (const metricName of metrics) {
      const agg = this.aggregatedMetrics.get(metricName);
      
      if (agg) {
        rows.push({
          metric: metricName,
          count: agg.count,
          avg: agg.avg.toFixed(2),
          min: agg.min.toFixed(2),
          max: agg.max.toFixed(2),
          p95: agg.p95.toFixed(2)
        });
      }
    }
    
    return { rows };
  }
  
  private parseTime(time: Date | string): Date {
    if (time instanceof Date) return time;
    
    if (typeof time === 'string' && time.startsWith('now')) {
      const match = time.match(/now-(\d+)([smhd])/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        const ms = {
          's': 1000,
          'm': 60000,
          'h': 3600000,
          'd': 86400000
        }[unit] || 1000;
        
        return new Date(Date.now() - value * ms);
      }
    }
    
    return new Date(time);
  }
  
  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index] || 0;
  }
  
  private async storeTrace(trace: Trace): Promise<void> {
    try {
      await cacheService.set(
        `trace:${trace.id}`,
        trace,
        86400 // 24 hours
      );
    } catch (error) {
      logger.warn('Failed to store trace in cache:', error);
    }
  }

  private async storeProfile(profile: Profile): Promise<void> {
    try {
      await cacheService.set(
        `profile:${profile.id}`,
        profile,
        86400 // 24 hours
      );
    } catch (error) {
      logger.warn('Failed to store profile in cache:', error);
    }
  }
  
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateProfileId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Interface for aggregated metrics
interface AggregatedMetric {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

// Export singleton instance
export const performanceHub = PerformanceMonitoringHub.getInstance();