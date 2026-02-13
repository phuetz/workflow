/**
 * Performance Monitor
 * Real-time performance monitoring, metrics collection, and alerting
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import * as os from 'os';

export interface PerformanceMetric {
  id: string;
  name: string;
  type: MetricType;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  labels: Record<string, string>;
  metadata: Record<string, unknown>;
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
  TIMER = 'timer'
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
    userTime: number;
    systemTime: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    cached: number;
    available: number;
    usage: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
    iops: {
      read: number;
      write: number;
    };
    throughput: {
      read: number;
      write: number;
    };
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    connectionsActive: number;
    connectionsTotal: number;
    errors: number;
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
    zombie: number;
  };
}

export interface ApplicationMetrics {
  requests: {
    total: number;
    rate: number;
    errorsTotal: number;
    errorRate: number;
    responseTime: {
      p50: number;
      p95: number;
      p99: number;
      mean: number;
      max: number;
      min: number;
    };
    throughput: number;
  };
  workflows: {
    total: number;
    active: number;
    completed: number;
    failed: number; 
    executionTime: {
      p50: number;
      p95: number;
      p99: number;
      mean: number;
    };
  };
  cache: {
    hitRate: number;
    missRate: number;
    size: number;
    evictions: number;
  };
  database: {
    connections: number;
    queries: number;
    queryTime: {
      p50: number;
      p95: number;
      p99: number;
      mean: number;
    };
    deadlocks: number;
    slowQueries: number;
  };
  queue: {
    size: number;
    throughput: number;
    processing: number;
    failed: number;
    latency: {
      p50: number;
      p95: number;
      p99: number;
      mean: number;
    };
  };
}

export interface PerformanceAlert {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  status: AlertStatus;
  triggeredAt: Date;
  resolvedAt?: Date;
  message: string;
  metrics: PerformanceMetric[];
  actions: AlertAction[];
  metadata: Record<string, unknown>;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  threshold: number;
  duration: number; // seconds
  tags?: Record<string, string>;
}

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  WARNING = 'warning',
  INFO = 'info'
}

export enum AlertStatus {
  TRIGGERED = 'triggered',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed'
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'pagerduty' | 'autoscale' | 'restart';
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface PerformanceReport {
  id: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    uptime: number;
    availability: number;
    meanResponseTime: number;
    throughput: number;
    errorRate: number;
  };
  systemMetrics: SystemMetrics;
  applicationMetrics: ApplicationMetrics;
  alerts: PerformanceAlert[];
  trends: {
    cpu: number[];
    memory: number[];
    responseTime: number[];
    throughput: number[];
  };
  recommendations: string[];
}

export interface TimeSeries {
  metric: string;
  points: Array<{
    timestamp: Date;
    value: number;
  }>;
  resolution: number; // seconds
  retention: number; // seconds
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private timeSeries: Map<string, TimeSeries> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private alertRules: Map<string, AlertCondition & { name: string; severity: AlertSeverity; actions: AlertAction[] }> = new Map();
  private collectors: Map<string, NodeJS.Timeout> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private timers: Map<string, { start: number; samples: number[] }> = new Map();
  private startTime: Date = new Date();
  
  constructor() {
    super();
    this.initializeAlertRules();
    this.startSystemCollection();
  }
  
  private initializeAlertRules(): void {
    const defaultRules = [
      {
        id: 'high_cpu_usage',
        name: 'High CPU Usage',
        metric: 'system.cpu.usage',
        operator: 'gt' as const,
        threshold: 80,
        duration: 300, // 5 minutes
        severity: AlertSeverity.WARNING,
        actions: [
          {
            type: 'email' as const,
            config: { recipients: ['admin@company.com'] },
            enabled: true
          }
        ]
      },
      {
        id: 'memory_exhaustion',
        name: 'Memory Exhaustion',
        metric: 'system.memory.usage',
        operator: 'gt' as const,
        threshold: 90,
        duration: 60, // 1 minute
        severity: AlertSeverity.CRITICAL,
        actions: [
          {
            type: 'email' as const,
            config: { recipients: ['admin@company.com'] },
            enabled: true
          },
          {
            type: 'autoscale' as const,
            config: { action: 'scale_up' },
            enabled: true
          }
        ]
      },
      {
        id: 'high_response_time',
        name: 'High Response Time',
        metric: 'app.requests.response_time.p95',
        operator: 'gt' as const,
        threshold: 2000, // 2 seconds
        duration: 180, // 3 minutes
        severity: AlertSeverity.WARNING,
        actions: [
          {
            type: 'slack' as const,
            config: { channel: '#alerts' },
            enabled: true
          }
        ]
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        metric: 'app.requests.error_rate',
        operator: 'gt' as const,
        threshold: 5, // 5%
        duration: 120, // 2 minutes
        severity: AlertSeverity.HIGH,
        actions: [
          {
            type: 'pagerduty' as const,
            config: { service_key: 'service-key' },
            enabled: true
          }
        ]
      }
    ];
    
    for (const rule of defaultRules) {
      this.alertRules.set(rule.id, rule);
    }
  }
  
  private startSystemCollection(): void {
    // Collect system metrics every 30 seconds
    const systemCollector = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);
    
    this.collectors.set('system', systemCollector);
    
    // Collect application metrics every 10 seconds
    const appCollector = setInterval(() => {
      this.collectApplicationMetrics();
    }, 10000);
    
    this.collectors.set('application', appCollector);
    
    // Check alerts every 60 seconds
    const alertCollector = setInterval(() => {
      this.checkAlerts();
    }, 60000);
    
    this.collectors.set('alerts', alertCollector);
    
    // Clean up old metrics every 5 minutes
    const cleanupCollector = setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000);
    
    this.collectors.set('cleanup', cleanupCollector);
  }
  
  // Metric Collection
  
  private collectSystemMetrics(): void {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const memInfo = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    // CPU metrics
    this.recordGauge('system.cpu.cores', cpus.length);
    this.recordGauge('system.cpu.load_1m', loadAvg[0]);
    this.recordGauge('system.cpu.load_5m', loadAvg[1]);
    this.recordGauge('system.cpu.load_15m', loadAvg[2]);
    
    // Calculate CPU usage (simplified)
    const cpuUsage = Math.min(100, (loadAvg[0] / cpus.length) * 100);
    this.recordGauge('system.cpu.usage', cpuUsage);
    
    // Memory metrics
    const memUsage = ((totalMem - freeMem) / totalMem) * 100;
    this.recordGauge('system.memory.total', totalMem);
    this.recordGauge('system.memory.free', freeMem);
    this.recordGauge('system.memory.used', totalMem - freeMem);
    this.recordGauge('system.memory.usage', memUsage);
    this.recordGauge('system.memory.heap_used', memInfo.heapUsed);
    this.recordGauge('system.memory.heap_total', memInfo.heapTotal);
    this.recordGauge('system.memory.external', memInfo.external);
    this.recordGauge('system.memory.rss', memInfo.rss);
    
    // Process metrics
    this.recordGauge('system.uptime', process.uptime());
    this.recordGauge('system.pid', process.pid);
    
    this.emit('systemMetricsCollected', {
      cpu: { usage: cpuUsage, cores: cpus.length, loadAverage: loadAvg },
      memory: {
        total: totalMem,
        used: totalMem - freeMem,
        free: freeMem,
        usage: memUsage,
        heapUsed: memInfo.heapUsed,
        heapTotal: memInfo.heapTotal
      }
    });
  }
  
  private collectApplicationMetrics(): void {
    // Collect cache metrics
    const cacheStats = this.getCacheStats();
    if (cacheStats) {
      this.recordGauge('app.cache.hit_rate', cacheStats.hitRate * 100);
      this.recordGauge('app.cache.size', cacheStats.totalKeys);
      this.recordGauge('app.cache.memory_usage', cacheStats.memoryUsage.percentage);
    }
    
    // Collect request metrics
    const requestStats = this.getRequestStats();
    if (requestStats) {
      this.recordGauge('app.requests.rate', requestStats.rate);
      this.recordGauge('app.requests.error_rate', requestStats.errorRate * 100);
      this.recordGauge('app.requests.response_time.mean', requestStats.responseTime.mean);
      this.recordGauge('app.requests.response_time.p95', requestStats.responseTime.p95);
    }
    
    // Collect workflow metrics
    const workflowStats = this.getWorkflowStats();
    if (workflowStats) {
      this.recordGauge('app.workflows.active', workflowStats.active);
      this.recordGauge('app.workflows.completed', workflowStats.completed);
      this.recordGauge('app.workflows.failed', workflowStats.failed);
    }
    
    this.emit('applicationMetricsCollected', {
      cache: cacheStats,
      requests: requestStats,
      workflows: workflowStats
    });
  }
  
  // Metric Recording
  
  public recordCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
    
    this.recordMetric({
      name,
      type: MetricType.COUNTER,
      value: current + value,
      unit: 'count',
      tags: tags || {},
      labels: {},
      metadata: {}
    });
  }
  
  public recordGauge(name: string, value: number, tags?: Record<string, string>): void {
    this.gauges.set(name, value);
    
    this.recordMetric({
      name,
      type: MetricType.GAUGE,
      value,
      unit: 'value',
      tags: tags || {},
      labels: {},
      metadata: {}
    });
  }
  
  public recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, []);
    }
    
    const samples = this.histograms.get(name)!;
    samples.push(value);
    
    // Keep only last 1000 samples
    if (samples.length > 1000) {
      samples.shift();
    }
    
    this.recordMetric({
      name,
      type: MetricType.HISTOGRAM,
      value,
      unit: 'value',
      tags: tags || {},
      labels: {},
      metadata: {
        sampleCount: samples.length,
        percentiles: this.calculatePercentiles(samples)
      }
    });
  }
  
  public startTimer(name: string): string {
    const timerId = crypto.randomUUID();
    const timerKey = `${name}:${timerId}`;
    
    this.timers.set(timerKey, {
      start: Date.now(),
      samples: this.timers.get(name)?.samples || []
    });
    
    return timerId;
  }
  
  public endTimer(name: string, timerId: string, tags?: Record<string, string>): number {
    const timerKey = `${name}:${timerId}`;
    const timer = this.timers.get(timerKey);
    
    if (!timer) {
      return 0;
    }
    
    const duration = Date.now() - timer.start;
    this.timers.delete(timerKey);
    
    // Update samples for the metric
    if (!this.timers.has(name)) {
      this.timers.set(name, { start: 0, samples: [] });
    }
    
    const metricTimer = this.timers.get(name)!;
    metricTimer.samples.push(duration);
    
    // Keep only last 1000 samples
    if (metricTimer.samples.length > 1000) {
      metricTimer.samples.shift();
    }
    
    this.recordMetric({
      name,
      type: MetricType.TIMER,
      value: duration,
      unit: 'ms',
      tags: tags || {},
      labels: {},
      metadata: {
        sampleCount: metricTimer.samples.length,
        percentiles: this.calculatePercentiles(metricTimer.samples)
      }
    });
    
    return duration;
  }
  
  public time<T>(name: string, fn: () => T, tags?: Record<string, string>): T;
  public time<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T>;
  public time<T>(name: string, fn: () => T | Promise<T>, tags?: Record<string, string>): T | Promise<T> {
    const timerId = this.startTimer(name);
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          this.endTimer(name, timerId, tags);
        });
      } else {
        this.endTimer(name, timerId, tags);
        return result;
      }
    } catch (error) {
      this.endTimer(name, timerId, tags);
      throw error;
    }
  }
  
  private recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...metric
    };
    
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    
    const metricHistory = this.metrics.get(metric.name)!;
    metricHistory.push(fullMetric);
    
    // Keep only last 1000 metrics per name
    if (metricHistory.length > 1000) {
      metricHistory.shift();
    }
    
    // Update time series
    this.updateTimeSeries(metric.name, fullMetric.value, fullMetric.timestamp);
    
    this.emit('metricRecorded', fullMetric);
  }
  
  private updateTimeSeries(metricName: string, value: number, timestamp: Date): void {
    if (!this.timeSeries.has(metricName)) {
      this.timeSeries.set(metricName, {
        metric: metricName,
        points: [],
        resolution: 60, // 1 minute
        retention: 86400 // 24 hours
      });
    }
    
    const series = this.timeSeries.get(metricName)!;
    series.points.push({ timestamp, value });
    
    // Remove old points based on retention
    const retentionCutoff = new Date(Date.now() - series.retention * 1000);
    series.points = series.points.filter(p => p.timestamp > retentionCutoff);
  }
  
  // Alert Management
  
  private checkAlerts(): void {
    for (const [ruleId, rule] of this.alertRules.entries()) {
      const currentMetrics = this.getRecentMetrics(rule.metric, rule.duration);
      
      if (currentMetrics.length === 0) continue;
      
      const shouldTrigger = this.evaluateAlertCondition(rule, currentMetrics);
      const existingAlert = this.alerts.get(ruleId);
      
      if (shouldTrigger && (!existingAlert || existingAlert.status === AlertStatus.RESOLVED)) {
        // Trigger new alert
        const alert: PerformanceAlert = {
          id: crypto.randomUUID(),
          name: rule.name,
          condition: rule,
          severity: rule.severity,
          status: AlertStatus.TRIGGERED,
          triggeredAt: new Date(),
          message: this.generateAlertMessage(rule, currentMetrics),
          metrics: currentMetrics,
          actions: rule.actions,
          metadata: {}
        };
        
        this.alerts.set(ruleId, alert);
        this.executeAlertActions(alert);
        
        this.emit('alertTriggered', alert);
      } else if (!shouldTrigger && existingAlert && existingAlert.status === AlertStatus.TRIGGERED) {
        // Resolve existing alert
        existingAlert.status = AlertStatus.RESOLVED;
        existingAlert.resolvedAt = new Date();
        
        this.emit('alertResolved', existingAlert);
      }
    }
  }
  
  private evaluateAlertCondition(condition: AlertCondition, metrics: PerformanceMetric[]): boolean {
    if (metrics.length === 0) return false;
    
    // Get the latest metric value
    const latestMetric = metrics[metrics.length - 1];
    const value = latestMetric.value;
    
    switch (condition.operator) {
      case 'gt':
        return value > condition.threshold;
      case 'gte':
        return value >= condition.threshold;
      case 'lt':
        return value < condition.threshold;
      case 'lte':
        return value <= condition.threshold;
      case 'eq':
        return value === condition.threshold;
      case 'ne':
        return value !== condition.threshold;
      default:
        return false;
    }
  }
  
  private generateAlertMessage(condition: AlertCondition, metrics: PerformanceMetric[]): string {
    const latestMetric = metrics[metrics.length - 1];
    return `${condition.metric} is ${latestMetric.value} (threshold: ${condition.operator} ${condition.threshold})`;
  }
  
  private executeAlertActions(alert: PerformanceAlert): void {
    for (const action of alert.actions) {
      if (!action.enabled) continue;
      
      try {
        this.executeAlertAction(action, alert);
      } catch (error) {
        console.error(`Failed to execute alert action ${action.type}:`, error);
      }
    }
  }
  
  private executeAlertAction(action: AlertAction, alert: PerformanceAlert): void {
    switch (action.type) {
      case 'email':
        console.log(`EMAIL ALERT: ${alert.name}`, {
          to: action.config.recipients,
          subject: `Performance Alert: ${alert.name}`,
          message: alert.message
        });
        break;
        
      case 'webhook':
        console.log(`WEBHOOK ALERT: ${alert.name}`, {
          url: action.config.url,
          payload: {
            alert: alert.name,
            severity: alert.severity,
            message: alert.message,
            triggeredAt: alert.triggeredAt
          }
        });
        break;
        
      case 'slack':
        console.log(`SLACK ALERT: ${alert.name}`, {
          channel: action.config.channel,
          message: `🚨 ${alert.severity.toUpperCase()}: ${alert.message}`
        });
        break;
        
      case 'autoscale':
        console.log(`AUTOSCALE ACTION: ${alert.name}`, {
          action: action.config.action,
          alert: alert.name
        });
        this.emit('autoscaleRequested', {
          alert,
          action: action.config.action
        });
        break;
        
      case 'restart':
        console.log(`RESTART ACTION: ${alert.name}`, {
          service: action.config.service || 'application'
        });
        this.emit('restartRequested', {
          alert,
          service: action.config.service
        });
        break;
    }
  }
  
  // Data Retrieval
  
  public getMetric(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || [];
  }
  
  public getMetrics(filter?: {
    names?: string[];
    type?: MetricType;
    startTime?: Date;
    endTime?: Date;
    tags?: Record<string, string>;
  }): PerformanceMetric[] {
    let allMetrics: PerformanceMetric[] = [];
    
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    
    if (filter) {
      if (filter.names) {
        allMetrics = allMetrics.filter(m => filter.names!.includes(m.name));
      }
      
      if (filter.type) {
        allMetrics = allMetrics.filter(m => m.type === filter.type);
      }
      
      if (filter.startTime) {
        allMetrics = allMetrics.filter(m => m.timestamp >= filter.startTime!);
      }
      
      if (filter.endTime) {
        allMetrics = allMetrics.filter(m => m.timestamp <= filter.endTime!);
      }
      
      if (filter.tags) {
        allMetrics = allMetrics.filter(m => {
          return Object.entries(filter.tags!).every(([key, value]) => 
            m.tags[key] === value
          );
        });
      }
    }
    
    return allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  public getTimeSeries(metricName: string, resolution?: number): TimeSeries | null {
    const series = this.timeSeries.get(metricName);
    if (!series) return null;
    
    if (resolution && resolution !== series.resolution) {
      // Downsample the time series
      return this.downsampleTimeSeries(series, resolution);
    }
    
    return series;
  }
  
  public getRecentMetrics(metricName: string, seconds: number): PerformanceMetric[] {
    const metrics = this.metrics.get(metricName) || [];
    const cutoff = new Date(Date.now() - seconds * 1000);
    
    return metrics.filter(m => m.timestamp > cutoff);
  }
  
  public getCurrentValue(metricName: string): number | null {
    const metrics = this.metrics.get(metricName);
    if (!metrics || metrics.length === 0) return null;
    
    return metrics[metrics.length - 1].value;
  }
  
  public getAlerts(status?: AlertStatus): PerformanceAlert[] {
    const alerts = Array.from(this.alerts.values());
    
    if (status) {
      return alerts.filter(a => a.status === status);
    }
    
    return alerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }
  
  // Statistics and Analysis
  
  public calculatePercentiles(values: number[]): Record<string, number> {
    if (values.length === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0 };
    }
    
    const sorted = values.slice().sort((a, b) => a - b);
    const len = sorted.length;
    
    return {
      p50: sorted[Math.floor(len * 0.5)],
      p90: sorted[Math.floor(len * 0.9)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)]
    };
  }
  
  public getSystemMetrics(): SystemMetrics {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memInfo = process.memoryUsage();
    const loadAvg = os.loadavg();
    
    return {
      cpu: {
        usage: this.getCurrentValue('system.cpu.usage') || 0,
        cores: cpus.length,
        loadAverage: loadAvg,
        userTime: 0, // Would calculate from actual CPU stats
        systemTime: 0
      },
      memory: {
        total: totalMem,
        used: totalMem - freeMem,
        free: freeMem,
        cached: 0, // Would get from system stats
        available: freeMem,
        usage: ((totalMem - freeMem) / totalMem) * 100,
        heapUsed: memInfo.heapUsed,
        heapTotal: memInfo.heapTotal,
        external: memInfo.external,
        rss: memInfo.rss
      },
      disk: {
        total: 0, // Would get from disk stats
        used: 0,
        free: 0,
        usage: 0,
        iops: { read: 0, write: 0 },
        throughput: { read: 0, write: 0 }
      },
      network: {
        bytesIn: 0, // Would get from network stats
        bytesOut: 0,
        packetsIn: 0,
        packetsOut: 0,
        connectionsActive: 0,
        connectionsTotal: 0,
        errors: 0
      },
      processes: {
        total: 0, // Would get from process stats
        running: 0,
        sleeping: 0,
        zombie: 0
      }
    };
  }
  
  public generateReport(startTime?: Date, endTime?: Date): PerformanceReport {
    const now = new Date();
    const start = startTime || new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    const end = endTime || now;
    
    const uptime = (now.getTime() - this.startTime.getTime()) / 1000;
    const availability = this.calculateAvailability(start, end);
    const responseTimeMetrics = this.getRecentMetrics('app.requests.response_time.mean', 24 * 60 * 60);
    const throughputMetrics = this.getRecentMetrics('app.requests.rate', 24 * 60 * 60);
    const errorRateMetrics = this.getRecentMetrics('app.requests.error_rate', 24 * 60 * 60);
    
    const meanResponseTime = responseTimeMetrics.length > 0 
      ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
      : 0;
    
    const meanThroughput = throughputMetrics.length > 0
      ? throughputMetrics.reduce((sum, m) => sum + m.value, 0) / throughputMetrics.length
      : 0;
    
    const meanErrorRate = errorRateMetrics.length > 0
      ? errorRateMetrics.reduce((sum, m) => sum + m.value, 0) / errorRateMetrics.length
      : 0;
    
    return {
      id: crypto.randomUUID(),
      generatedAt: now,
      period: { start, end },
      summary: {
        uptime,
        availability,
        meanResponseTime,
        throughput: meanThroughput,
        errorRate: meanErrorRate
      },
      systemMetrics: this.getSystemMetrics(),
      applicationMetrics: this.getApplicationMetrics(),
      alerts: this.getAlerts(),
      trends: {
        cpu: this.getRecentMetrics('system.cpu.usage', 24 * 60 * 60).map(m => m.value),
        memory: this.getRecentMetrics('system.memory.usage', 24 * 60 * 60).map(m => m.value),
        responseTime: responseTimeMetrics.map(m => m.value),
        throughput: throughputMetrics.map(m => m.value)
      },
      recommendations: this.generateRecommendations()
    };
  }
  
  private calculateAvailability(start: Date, end: Date): number {
    // Calculate uptime percentage based on alert history
    const alerts = this.getAlerts(AlertStatus.TRIGGERED);
    const criticalAlerts = alerts.filter(a => 
      a.severity === AlertSeverity.CRITICAL &&
      a.triggeredAt >= start &&
      a.triggeredAt <= end
    );
    
    const totalTime = end.getTime() - start.getTime();
    let downtime = 0;
    
    for (const alert of criticalAlerts) {
      const resolvedAt = alert.resolvedAt || new Date();
      downtime += resolvedAt.getTime() - alert.triggeredAt.getTime();
    }
    
    return Math.max(0, (totalTime - downtime) / totalTime * 100);
  }
  
  private getApplicationMetrics(): ApplicationMetrics {
    return {
      requests: {
        total: this.getCurrentValue('app.requests.total') || 0,
        rate: this.getCurrentValue('app.requests.rate') || 0,
        errorsTotal: this.getCurrentValue('app.requests.errors_total') || 0,
        errorRate: this.getCurrentValue('app.requests.error_rate') || 0,
        responseTime: {
          p50: this.getCurrentValue('app.requests.response_time.p50') || 0,
          p95: this.getCurrentValue('app.requests.response_time.p95') || 0,
          p99: this.getCurrentValue('app.requests.response_time.p99') || 0,
          mean: this.getCurrentValue('app.requests.response_time.mean') || 0,
          max: 0,
          min: 0
        },
        throughput: this.getCurrentValue('app.requests.throughput') || 0
      },
      workflows: {
        total: this.getCurrentValue('app.workflows.total') || 0,
        active: this.getCurrentValue('app.workflows.active') || 0,
        completed: this.getCurrentValue('app.workflows.completed') || 0,
        failed: this.getCurrentValue('app.workflows.failed') || 0,
        executionTime: {
          p50: this.getCurrentValue('app.workflows.execution_time.p50') || 0,
          p95: this.getCurrentValue('app.workflows.execution_time.p95') || 0,
          p99: this.getCurrentValue('app.workflows.execution_time.p99') || 0,
          mean: this.getCurrentValue('app.workflows.execution_time.mean') || 0
        }
      },
      cache: {
        hitRate: this.getCurrentValue('app.cache.hit_rate') || 0,
        missRate: 100 - (this.getCurrentValue('app.cache.hit_rate') || 0),
        size: this.getCurrentValue('app.cache.size') || 0,
        evictions: this.getCurrentValue('app.cache.evictions') || 0
      },
      database: {
        connections: this.getCurrentValue('app.database.connections') || 0,
        queries: this.getCurrentValue('app.database.queries') || 0,
        queryTime: {
          p50: this.getCurrentValue('app.database.query_time.p50') || 0,
          p95: this.getCurrentValue('app.database.query_time.p95') || 0,
          p99: this.getCurrentValue('app.database.query_time.p99') || 0,
          mean: this.getCurrentValue('app.database.query_time.mean') || 0
        },
        deadlocks: this.getCurrentValue('app.database.deadlocks') || 0,
        slowQueries: this.getCurrentValue('app.database.slow_queries') || 0
      },
      queue: {
        size: this.getCurrentValue('app.queue.size') || 0,
        throughput: this.getCurrentValue('app.queue.throughput') || 0,
        processing: this.getCurrentValue('app.queue.processing') || 0,
        failed: this.getCurrentValue('app.queue.failed') || 0,
        latency: {
          p50: this.getCurrentValue('app.queue.latency.p50') || 0,
          p95: this.getCurrentValue('app.queue.latency.p95') || 0,
          p99: this.getCurrentValue('app.queue.latency.p99') || 0,
          mean: this.getCurrentValue('app.queue.latency.mean') || 0
        }
      }
    };
  }
  
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const cpuUsage = this.getCurrentValue('system.cpu.usage') || 0;
    const memoryUsage = this.getCurrentValue('system.memory.usage') || 0;
    const errorRate = this.getCurrentValue('app.requests.error_rate') || 0;
    const responseTime = this.getCurrentValue('app.requests.response_time.p95') || 0;
    const cacheHitRate = this.getCurrentValue('app.cache.hit_rate') || 0;
    
    if (cpuUsage > 70) {
      recommendations.push('Consider scaling up CPU resources or optimizing CPU-intensive operations');
    }
    
    if (memoryUsage > 80) {
      recommendations.push('Memory usage is high - consider increasing memory or optimizing memory usage');
    }
    
    if (errorRate > 1) {
      recommendations.push('Error rate is elevated - investigate and fix underlying issues');
    }
    
    if (responseTime > 1000) {
      recommendations.push('Response times are slow - consider performance optimizations or scaling');
    }
    
    if (cacheHitRate < 80) {
      recommendations.push('Cache hit rate is low - review caching strategy and TTL settings');
    }
    
    return recommendations;
  }
  
  // Helper methods
  
  private getCacheStats(): Record<string, unknown> {
    // Would integrate with actual cache manager
    return null;
  }
  
  private getRequestStats(): Record<string, unknown> {
    // Would integrate with actual HTTP server metrics
    return null;
  }
  
  private getWorkflowStats(): Record<string, unknown> {
    // Would integrate with actual workflow engine metrics
    return null;
  }
  
  private downsampleTimeSeries(series: TimeSeries, targetResolution: number): TimeSeries {
    const downsampledPoints: Array<{ timestamp: Date; value: number }> = [];
    const ratio = targetResolution / series.resolution;
    
    for (let i = 0; i < series.points.length; i += ratio) {
      const bucket = series.points.slice(i, i + ratio);
      if (bucket.length > 0) {
        const avgValue = bucket.reduce((sum, p) => sum + p.value, 0) / bucket.length;
        downsampledPoints.push({
          timestamp: bucket[Math.floor(bucket.length / 2)].timestamp,
          value: avgValue
        });
      }
    }
    
    return {
      metric: series.metric,
      points: downsampledPoints,
      resolution: targetResolution,
      retention: series.retention
    };
  }
  
  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    
    for (const [name, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp > cutoff);
      this.metrics.set(name, filteredMetrics);
    }
    
    // Clean up time series
    for (const series of this.timeSeries.values()) {
      const retentionCutoff = new Date(Date.now() - series.retention * 1000);
      series.points = series.points.filter(p => p.timestamp > retentionCutoff);
    }
    
    this.emit('metricsCleanedUp', { cutoff });
  }
  
  // Public API
  
  public addAlertRule(rule: {
    id: string;
    name: string;
    metric: string;
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
    threshold: number;
    duration: number;
    severity: AlertSeverity;
    actions: AlertAction[];
  }): void {
    this.alertRules.set(rule.id, rule);
    this.emit('alertRuleAdded', rule);
  }
  
  public removeAlertRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId);
    
    if (removed) {
      // Also remove any existing alerts for this rule
      this.alerts.delete(ruleId);
      this.emit('alertRuleRemoved', { ruleId });
    }
    
    return removed;
  }
  
  public getStats(): {
    metricsCollected: number;
    activeAlerts: number;
    totalAlerts: number;
    timeSeriesCount: number;
    uptimeSeconds: number;
  } {
    const totalMetrics = Array.from(this.metrics.values())
      .reduce((sum, metrics) => sum + metrics.length, 0);
    
    const activeAlerts = Array.from(this.alerts.values())
      .filter(a => a.status === AlertStatus.TRIGGERED).length;
    
    return {
      metricsCollected: totalMetrics,
      activeAlerts,
      totalAlerts: this.alerts.size,
      timeSeriesCount: this.timeSeries.size,
      uptimeSeconds: (Date.now() - this.startTime.getTime()) / 1000
    };
  }
  
  public destroy(): void {
    // Clear all collectors
    for (const [, timer] of this.collectors.entries()) {
      clearInterval(timer);
    }
    
    this.collectors.clear();
    this.metrics.clear();
    this.timeSeries.clear();
    this.alerts.clear();
    this.alertRules.clear();
    this.histograms.clear();
    this.counters.clear();
    this.gauges.clear();
    this.timers.clear();
    
    this.emit('destroyed');
  }
}