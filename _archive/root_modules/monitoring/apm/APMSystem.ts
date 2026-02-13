import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as os from 'os';

export interface APMTransaction {
  id: string;
  name: string;
  type: 'web' | 'background' | 'workflow' | 'database' | 'external';
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'started' | 'completed' | 'failed' | 'timeout';
  labels: { [key: string]: string };
  metadata: {
    user?: string;
    tenant?: string;
    service: string;
    version: string;
    environment: string;
    host: string;
    pid: number;
  };
  spans: APMSpan[];
  errors: APMError[];
  metrics: TransactionMetrics;
  context: TransactionContext;
}

export interface APMSpan {
  id: string;
  transactionId: string;
  parentId?: string;
  name: string;
  type: 'db' | 'http' | 'cache' | 'custom' | 'function' | 'query';
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'started' | 'completed' | 'failed';
  labels: { [key: string]: string };
  stackTrace?: string[];
  context?: {
    db?: {
      statement?: string;
      type?: string;
      instance?: string;
      user?: string;
      rows?: number;
    };
    http?: {
      url?: string;
      method?: string;
      statusCode?: number;
      requestHeaders?: { [key: string]: string };
      responseHeaders?: { [key: string]: string };
      requestSize?: number;
      responseSize?: number;
    };
    custom?: { [key: string]: unknown };
  };
}

export interface APMError {
  id: string;
  transactionId?: string;
  spanId?: string;
  timestamp: number;
  message: string;
  type: string;
  handled: boolean;
  stackTrace: string[];
  context: {
    user?: string;
    tenant?: string;
    service: string;
    version: string;
    environment: string;
    tags?: { [key: string]: string };
    custom?: { [key: string]: unknown };
  };
  culprit?: string;
  fingerprint?: string;
  groupingKey?: string;
}

export interface TransactionMetrics {
  cpu: {
    usage: number;
    system: number;
    user: number;
  };
  memory: {
    heap: {
      used: number;
      total: number;
      free: number;
    };
    external: number;
    rss: number;
  };
  gc: {
    collections: number;
    duration: number;
    freed: number;
  };
  eventLoop: {
    lag: number;
    utilization: number;
  };
}

export interface TransactionContext {
  request?: {
    url?: string;
    method?: string;
    headers?: { [key: string]: string };
    body?: unknown;
    query?: { [key: string]: string };
    params?: { [key: string]: string };
  };
  response?: {
    statusCode?: number;
    headers?: { [key: string]: string };
    body?: unknown;
  };
  user?: {
    id?: string;
    email?: string;
    name?: string;
    roles?: string[];
  };
  workflow?: {
    id?: string;
    name?: string;
    version?: string;
    nodeId?: string;
    executionId?: string;
  };
  custom?: { [key: string]: unknown };
}

export interface APMMetrics {
  timestamp: number;
  interval: number;
  system: {
    cpu: {
      usage: number;
      cores: number;
      load: {
        '1m': number;
        '5m': number;
        '15m': number;
      };
    };
    memory: {
      total: number;
      free: number;
      used: number;
      cached: number;
      buffers: number;
      swap: {
        total: number;
        free: number;
        used: number;
      };
    };
    disk: {
      reads: number;
      writes: number;
      readBytes: number;
      writeBytes: number;
      usage: { [mount: string]: { total: number; free: number; used: number } };
    };
    network: {
      bytesIn: number;
      bytesOut: number;
      packetsIn: number;
      packetsOut: number;
      errors: number;
      dropped: number;
    };
  };
  process: {
    pid: number;
    ppid: number;
    uptime: number;
    cpu: {
      usage: number;
      system: number;
      user: number;
    };
    memory: {
      rss: number;
      heap: {
        used: number;
        total: number;
      };
      external: number;
    };
    handles: {
      file: number;
      socket: number;
      timer: number;
    };
    threads: number;
  };
  nodejs: {
    version: string;
    eventLoop: {
      lag: number;
      utilization: number;
    };
    gc: {
      collections: {
        minor: number;
        major: number;
        incremental: number;
      };
      duration: {
        minor: number;
        major: number;
        incremental: number;
      };
      freed: {
        minor: number;
        major: number;
        incremental: number;
      };
    };
    uv: {
      handles: number;
      requests: number;
    };
  };
}

export interface APMAlert {
  id: string;
  type: 'threshold' | 'anomaly' | 'error_rate' | 'performance' | 'availability';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  timestamp: number;
  service: string;
  environment: string;
  conditions: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration: number;
    aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'rate';
  };
  status: 'open' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  resolvedAt?: number;
  notifications: {
    channels: ('email' | 'slack' | 'webhook' | 'pagerduty')[];
    sent: boolean;
    sentAt?: number;
    attempts: number;
  };
  context: {
    query: string;
    values: { timestamp: number; value: number }[];
    metadata: { [key: string]: unknown };
  };
}

export interface APMConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  sampling: {
    transactionSampleRate: number;
    errorSampleRate: number;
    spanCompressionEnabled: boolean;
    spanCompressionExactMatchMaxDuration: number;
    spanCompressionSameKindMaxDuration: number;
  };
  performance: {
    captureBody: 'off' | 'errors' | 'transactions' | 'all';
    captureHeaders: boolean;
    stackTraceLimit: number;
    spanStackTraceMinDuration: number;
    longTaskThreshold: number;
  };
  filters: {
    ignoreUrls: string[];
    ignoreUserAgents: string[];
    sanitizeFieldNames: string[];
  };
  integrations: {
    http: boolean;
    express: boolean;
    postgres: boolean;
    redis: boolean;
    mongodb: boolean;
    elasticsearch: boolean;
  };
  transport: {
    endpoint: string;
    apiKey?: string;
    batchSize: number;
    batchInterval: number;
    maxQueueSize: number;
    timeout: number;
    compression: boolean;
  };
  alerting: {
    enabled: boolean;
    rules: APMAlertRule[];
    notifications: {
      email?: { recipients: string[]; smtp: unknown };
      slack?: { webhook: string; channel: string };
      webhook?: { url: string; headers: { [key: string]: string } };
      pagerduty?: { integrationKey: string };
    };
  };
}

export interface APMAlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    metric: string;
    aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'rate' | 'p95' | 'p99';
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration: number;
  };
  filters: {
    service?: string[];
    environment?: string[];
    transactionType?: string[];
    labels?: { [key: string]: string };
  };
  actions: {
    severity: 'info' | 'warning' | 'critical';
    channels: ('email' | 'slack' | 'webhook' | 'pagerduty')[];
    suppressDuration: number;
    escalation?: {
      after: number;
      severity: 'warning' | 'critical';
      channels: ('email' | 'slack' | 'webhook' | 'pagerduty')[];
    };
  };
}

export class APMSystem extends EventEmitter {
  private config: APMConfig;
  private transactions: Map<string, APMTransaction> = new Map();
  private spans: Map<string, APMSpan> = new Map();
  private errors: Map<string, APMError> = new Map();
  private metrics: APMMetrics[] = [];
  private alerts: Map<string, APMAlert> = new Map();
  private alertRules: Map<string, APMAlertRule> = new Map();
  private metricCollectors: Map<string, NodeJS.Timeout> = new Map();
  private transportQueue: unknown[] = [];
  private transportTimer?: NodeJS.Timeout;
  private isCollecting = false;

  constructor(config: APMConfig) {
    super();
    this.config = config;
    this.initializeCollectors();
    this.startTransportTimer();
    this.loadAlertRules();
  }

  private initializeCollectors(): void {
    // System metrics collector
    const systemCollector = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Every 30 seconds

    // Process metrics collector  
    const processCollector = setInterval(() => {
      this.collectProcessMetrics();
    }, 15000); // Every 15 seconds

    // Transaction cleanup
    const cleanupCollector = setInterval(() => {
      this.cleanupStaleTransactions();
    }, 60000); // Every minute

    this.metricCollectors.set('system', systemCollector);
    this.metricCollectors.set('process', processCollector);
    this.metricCollectors.set('cleanup', cleanupCollector);

    this.isCollecting = true;
    this.emit('collectors:started');
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      const metrics: APMMetrics = {
        timestamp: Date.now(),
        interval: 30000,
        system: await this.getSystemMetrics(),
        process: await this.getProcessMetrics(),
        nodejs: await this.getNodeJSMetrics()
      };

      this.metrics.push(metrics);
      
      // Keep only last 1000 metric points
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }

      this.emit('metrics:collected', metrics);
      this.checkAlertRules(metrics);
      
    } catch (error) {
      this.reportError(error, { context: 'metric_collection' });
    }
  }

  private async getSystemMetrics(): Promise<APMMetrics['system']> {

    return {
      cpu: {
        usage: this.getCPUUsage(),
        cores: os.cpus().length,
        load: {
          '1m': os.loadavg()[0],
          '5m': os.loadavg()[1],
          '15m': os.loadavg()[2]
        }
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        cached: 0, // Platform specific
        buffers: 0, // Platform specific
        swap: {
          total: 0, // Platform specific
          free: 0,
          used: 0
        }
      },
      disk: await this.getDiskMetrics(),
      network: await this.getNetworkMetrics()
    };
  }

  private async getProcessMetrics(): Promise<APMMetrics['process']> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      pid: process.pid,
      ppid: process.ppid,
      uptime: process.uptime(),
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        system: cpuUsage.system / 1000000,
        user: cpuUsage.user / 1000000
      },
      memory: {
        rss: memUsage.rss,
        heap: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal
        },
        external: memUsage.external
      },
      handles: await this.getHandleMetrics(),
      threads: 1 // Node.js is single-threaded for JS
    };
  }

  private async getNodeJSMetrics(): Promise<APMMetrics['nodejs']> {
    return {
      version: process.version,
      eventLoop: {
        lag: await this.measureEventLoopLag(),
        utilization: await this.measureEventLoopUtilization()
      },
      gc: await this.getGCMetrics(),
      uv: {
        handles: process._getActiveHandles().length,
        requests: process._getActiveRequests().length
      }
    };
  }

  // Transaction Management
  public startTransaction(
    name: string,
    type: APMTransaction['type'],
    options: Partial<APMTransaction> = {}
  ): APMTransaction {
    const transaction: APMTransaction = {
      id: crypto.randomUUID(),
      name,
      type,
      startTime: this.getHighResTime(),
      status: 'started',
      labels: options.labels || {},
      metadata: {
        service: this.config.serviceName,
        version: this.config.serviceVersion,
        environment: this.config.environment,
        host: os.hostname(),
        pid: process.pid,
        ...options.metadata
      },
      spans: [],
      errors: [],
      metrics: this.captureTransactionMetrics(),
      context: options.context || {}
    };

    this.transactions.set(transaction.id, transaction);
    this.emit('transaction:started', transaction);
    
    return transaction;
  }

  public endTransaction(
    transactionId: string,
    status: 'completed' | 'failed' | 'timeout' = 'completed'
  ): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return;

    transaction.endTime = this.getHighResTime();
    transaction.duration = transaction.endTime - transaction.startTime;
    transaction.status = status;

    // Sample transaction based on configuration
    if (this.shouldSampleTransaction(transaction)) {
      this.queueForTransport({
        type: 'transaction',
        data: transaction
      });
    }

    this.emit('transaction:ended', transaction);
  }

  public addTransactionContext(
    transactionId: string,
    context: Partial<TransactionContext>
  ): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return;

    transaction.context = {
      ...transaction.context,
      ...context
    };
  }

  // Span Management
  public startSpan(
    transactionId: string,
    name: string,
    type: APMSpan['type'],
    parentId?: string
  ): APMSpan {
    const span: APMSpan = {
      id: crypto.randomUUID(),
      transactionId,
      parentId,
      name,
      type,
      startTime: this.getHighResTime(),
      status: 'started',
      labels: {},
      stackTrace: this.captureStackTrace()
    };

    this.spans.set(span.id, span);
    
    const transaction = this.transactions.get(transactionId);
    if (transaction) {
      transaction.spans.push(span);
    }

    this.emit('span:started', span);
    return span;
  }

  public endSpan(
    spanId: string,
    status: 'completed' | 'failed' = 'completed'
  ): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.endTime = this.getHighResTime();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    this.emit('span:ended', span);
  }

  public addSpanContext(spanId: string, context: APMSpan['context']): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.context = {
      ...span.context,
      ...context
    };
  }

  // Error Reporting
  public reportError(
    error: Error | string,
    context: Partial<APMError['context']> = {},
    transactionId?: string,
    spanId?: string
  ): APMError {
    const errorObj: APMError = {
      id: crypto.randomUUID(),
      transactionId,
      spanId,
      timestamp: Date.now(),
      message: typeof error === 'string' ? error : error.message,
      type: typeof error === 'string' ? 'Error' : error.constructor.name,
      handled: true,
      stackTrace: typeof error === 'string' ? [] : this.parseStackTrace(error.stack || ''),
      context: {
        service: this.config.serviceName,
        version: this.config.serviceVersion,
        environment: this.config.environment,
        ...context
      }
    };

    // Generate error fingerprint for grouping
    errorObj.fingerprint = this.generateErrorFingerprint(errorObj);
    errorObj.groupingKey = this.generateGroupingKey(errorObj);

    this.errors.set(errorObj.id, errorObj);

    // Add to transaction if specified
    if (transactionId) {
      const transaction = this.transactions.get(transactionId);
      if (transaction) {
        transaction.errors.push(errorObj);
      }
    }

    // Sample error based on configuration
    if (this.shouldSampleError(errorObj)) {
      this.queueForTransport({
        type: 'error',
        data: errorObj
      });
    }

    this.emit('error:reported', errorObj);
    return errorObj;
  }

  // Alerting
  private loadAlertRules(): void {
    if (this.config.alerting?.enabled && this.config.alerting.rules) {
      for (const rule of this.config.alerting.rules) {
        this.alertRules.set(rule.id, rule);
      }
    }
  }

  private checkAlertRules(metrics: APMMetrics): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      this.evaluateAlertRule(rule, metrics);
    }
  }

  private evaluateAlertRule(rule: APMAlertRule, metrics: APMMetrics): void {
    const metricValue = this.extractMetricValue(rule.conditions.metric, metrics);
    if (metricValue === undefined) return;

    const thresholdMet = this.evaluateCondition(
      metricValue,
      rule.conditions.operator,
      rule.conditions.threshold
    );

    if (thresholdMet) {
      this.triggerAlert(rule, metricValue, metrics);
    }
  }

  private triggerAlert(
    rule: APMAlertRule,
    value: number,
    metrics: APMMetrics
  ): void {
    const alertId = `${rule.id}-${Date.now()}`;
    
    const alert: APMAlert = {
      id: alertId,
      type: 'threshold',
      severity: rule.actions.severity,
      title: `Alert: ${rule.name}`,
      description: `${rule.conditions.metric} ${rule.conditions.operator} ${rule.conditions.threshold} (current: ${value})`,
      timestamp: Date.now(),
      service: this.config.serviceName,
      environment: this.config.environment,
      conditions: {
        metric: rule.conditions.metric,
        operator: rule.conditions.operator,
        threshold: rule.conditions.threshold,
        duration: rule.conditions.duration,
        aggregation: rule.conditions.aggregation
      },
      status: 'open',
      notifications: {
        channels: rule.actions.channels,
        sent: false,
        attempts: 0
      },
      context: {
        query: rule.conditions.metric,
        values: [{ timestamp: metrics.timestamp, value }],
        metadata: { rule: rule.id }
      }
    };

    this.alerts.set(alertId, alert);
    this.sendAlertNotifications(alert);
    this.emit('alert:triggered', alert);
  }

  private async sendAlertNotifications(alert: APMAlert): Promise<void> {
    for (const channel of alert.notifications.channels) {
      try {
        await this.sendNotification(channel, alert);
        alert.notifications.sent = true;
        alert.notifications.sentAt = Date.now();
      } catch (error) {
        alert.notifications.attempts++;
        this.emit('alert:notification:failed', { alert, channel, error });
      }
    }
  }

  private async sendNotification(
    channel: string,
    alert: APMAlert
  ): Promise<void> {
    const config = this.config.alerting?.notifications;
    if (!config) return;

    switch (channel) {
      case 'email':
        if (config.email) {
          await this.sendEmailNotification(alert, config.email);
        }
        break;
      case 'slack':
        if (config.slack) {
          await this.sendSlackNotification(alert, config.slack);
        }
        break;
      case 'webhook':
        if (config.webhook) {
          await this.sendWebhookNotification(alert, config.webhook);
        }
        break;
      case 'pagerduty':
        if (config.pagerduty) {
          await this.sendPagerDutyNotification(alert, config.pagerduty);
        }
        break;
    }
  }

  // Transport
  private startTransportTimer(): void {
    this.transportTimer = setInterval(() => {
      if (this.transportQueue.length > 0) {
        this.flushTransportQueue();
      }
    }, this.config.transport.batchInterval);
  }

  private queueForTransport(data: unknown): void {
    this.transportQueue.push(data);
    
    if (this.transportQueue.length >= this.config.transport.batchSize) {
      this.flushTransportQueue();
    }
  }

  private async flushTransportQueue(): Promise<void> {
    if (this.transportQueue.length === 0) return;

    const batch = this.transportQueue.splice(0, this.config.transport.batchSize);
    
    try {
      await this.sendToTransport(batch);
      this.emit('transport:sent', { count: batch.length });
    } catch (error) {
      this.emit('transport:failed', { error, count: batch.length });
      
      // Re-queue if under max queue size
      if (this.transportQueue.length < this.config.transport.maxQueueSize) {
        this.transportQueue.unshift(...batch);
      }
    }
  }

  private async sendToTransport(batch: unknown[]): Promise<void> {
    // Send to APM server (Elastic APM, Jaeger, etc.)
    // This is a mock implementation
    console.log('Sending APM data:', {
      endpoint: this.config.transport.endpoint,
      count: batch.length,
      types: batch.map(item => item.type)
    });
  }

  // Utility Methods
  private getHighResTime(): number {
    const [seconds, nanoseconds] = process.hrtime();
    return seconds * 1000 + nanoseconds / 1000000;
  }

  private captureStackTrace(): string[] {
    const stack = new Error().stack;
    if (!stack) return [];
    
    return stack.split('\n')
      .slice(2) // Remove Error and this function
      .slice(0, this.config.performance.stackTraceLimit)
      .map(line => line.trim());
  }

  private parseStackTrace(stack: string): string[] {
    return stack.split('\n')
      .slice(1) // Remove error message
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  private captureTransactionMetrics(): TransactionMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000,
        system: cpuUsage.system / 1000000,
        user: cpuUsage.user / 1000000
      },
      memory: {
        heap: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
          free: memUsage.heapTotal - memUsage.heapUsed
        },
        external: memUsage.external,
        rss: memUsage.rss
      },
      gc: {
        collections: 0, // Would need gc profiling
        duration: 0,
        freed: 0
      },
      eventLoop: {
        lag: 0, // Would measure event loop lag
        utilization: 0
      }
    };
  }

  private shouldSampleTransaction(_transaction: APMTransaction): boolean { // eslint-disable-line @typescript-eslint/no-unused-vars
    return Math.random() < this.config.sampling.transactionSampleRate;
  }

  private shouldSampleError(_error: APMError): boolean { // eslint-disable-line @typescript-eslint/no-unused-vars
    return Math.random() < this.config.sampling.errorSampleRate;
  }

  private generateErrorFingerprint(error: APMError): string {
    const input = `${error.type}:${error.message}:${error.stackTrace[0] || ''}`;
    return crypto.createHash('md5').update(input).digest('hex');
  }

  private generateGroupingKey(error: APMError): string {
    return `${error.context.service}:${error.type}:${error.fingerprint}`;
  }

  private cleanupStaleTransactions(): void {
    const cutoff = Date.now() - 300000; // 5 minutes
    
    for (const [_id, transaction] of this.transactions.entries()) { // eslint-disable-line @typescript-eslint/no-unused-vars
      if (transaction.startTime < cutoff && transaction.status === 'started') {
        transaction.status = 'timeout';
        transaction.endTime = this.getHighResTime();
        transaction.duration = transaction.endTime - transaction.startTime;
        
        this.emit('transaction:timeout', transaction);
      }
    }
  }

  private getCPUUsage(): number {
    // Simplified CPU usage calculation
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }
    
    return 100 - (100 * totalIdle / totalTick);
  }

  private async getDiskMetrics(): Promise<APMMetrics['system']['disk']> {
    // Mock disk metrics - would use platform-specific APIs
    return {
      reads: 1000,
      writes: 500,
      readBytes: 1024 * 1024 * 100,
      writeBytes: 1024 * 1024 * 50,
      usage: {
        '/': { total: 1024 * 1024 * 1024 * 100, free: 1024 * 1024 * 1024 * 50, used: 1024 * 1024 * 1024 * 50 }
      }
    };
  }

  private async getNetworkMetrics(): Promise<APMMetrics['system']['network']> {
    // Mock network metrics - would use platform-specific APIs
    return {
      bytesIn: 1024 * 1024 * 10,
      bytesOut: 1024 * 1024 * 5,
      packetsIn: 1000,
      packetsOut: 500,
      errors: 0,
      dropped: 0
    };
  }

  private async getHandleMetrics(): Promise<APMMetrics['process']['handles']> {
    // Mock handle metrics - would use platform-specific APIs
    return {
      file: 10,
      socket: 5,
      timer: 3
    };
  }

  private async measureEventLoopLag(): Promise<number> {
    return new Promise(resolve => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const delta = process.hrtime.bigint() - start;
        resolve(Number(delta) / 1000000); // Convert to milliseconds
      });
    });
  }

  private async measureEventLoopUtilization(): Promise<number> {
    // Simplified event loop utilization
    return Math.random() * 100;
  }

  private async getGCMetrics(): Promise<APMMetrics['nodejs']['gc']> {
    // Mock GC metrics - would use gc profiling
    return {
      collections: {
        minor: 100,
        major: 10,
        incremental: 50
      },
      duration: {
        minor: 5,
        major: 50,
        incremental: 10
      },
      freed: {
        minor: 1024 * 1024,
        major: 1024 * 1024 * 10,
        incremental: 1024 * 1024 * 2
      }
    };
  }

  private extractMetricValue(metric: string, metrics: APMMetrics): number | undefined {
    // Extract nested metric values using dot notation
    const parts = metric.split('.');
    let value: unknown = metrics;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return typeof value === 'number' ? value : undefined;
  }

  private evaluateCondition(
    value: number,
    operator: string,
    threshold: number
  ): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  private async sendEmailNotification(alert: APMAlert, config: unknown): Promise<void> {
    // Mock email notification
    console.log('Sending email alert:', {
      to: config.recipients,
      subject: alert.title,
      body: alert.description
    });
  }

  private async sendSlackNotification(alert: APMAlert, config: unknown): Promise<void> {
    // Mock Slack notification
    console.log('Sending Slack alert:', {
      webhook: config.webhook,
      channel: config.channel,
      message: `${alert.title}: ${alert.description}`
    });
  }

  private async sendWebhookNotification(alert: APMAlert, config: unknown): Promise<void> {
    // Mock webhook notification
    console.log('Sending webhook alert:', {
      url: config.url,
      alert: alert
    });
  }

  private async sendPagerDutyNotification(alert: APMAlert, config: unknown): Promise<void> {
    // Mock PagerDuty notification
    console.log('Sending PagerDuty alert:', {
      integrationKey: config.integrationKey,
      alert: alert
    });
  }

  // Public API
  public getTransaction(id: string): APMTransaction | undefined {
    return this.transactions.get(id);
  }

  public getSpan(id: string): APMSpan | undefined {
    return this.spans.get(id);
  }

  public getError(id: string): APMError | undefined {
    return this.errors.get(id);
  }

  public getAlert(id: string): APMAlert | undefined {
    return this.alerts.get(id);
  }

  public getCurrentMetrics(): APMMetrics | undefined {
    return this.metrics[this.metrics.length - 1];
  }

  public getMetricHistory(minutes: number = 60): APMMetrics[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  public acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && alert.status === 'open') {
      alert.status = 'acknowledged';
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = Date.now();
      
      this.emit('alert:acknowledged', alert);
    }
  }

  public resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && alert.status !== 'resolved') {
      alert.status = 'resolved';
      alert.resolvedAt = Date.now();
      
      this.emit('alert:resolved', alert);
    }
  }

  public addAlertRule(rule: APMAlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.emit('alert:rule:added', rule);
  }

  public removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    this.emit('alert:rule:removed', ruleId);
  }

  public getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    collectors: boolean;
    transport: boolean;
    alerts: number;
    errors: number;
    uptime: number;
  } {
    const openAlerts = Array.from(this.alerts.values()).filter(a => a.status === 'open');
    const recentErrors = Array.from(this.errors.values()).filter(
      e => e.timestamp > Date.now() - 300000
    );

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (openAlerts.some(a => a.severity === 'critical') || recentErrors.length > 10) {
      status = 'critical';
    } else if (openAlerts.length > 0 || recentErrors.length > 0) {
      status = 'warning';
    }

    return {
      status,
      collectors: this.isCollecting,
      transport: !!this.transportTimer,
      alerts: openAlerts.length,
      errors: recentErrors.length,
      uptime: process.uptime()
    };
  }

  public async stop(): Promise<void> {
    // Clear all collectors
    for (const [_name, timer] of this.metricCollectors.entries()) { // eslint-disable-line @typescript-eslint/no-unused-vars
      clearInterval(timer);
    }
    this.metricCollectors.clear();

    // Clear transport timer
    if (this.transportTimer) {
      clearInterval(this.transportTimer);
      this.transportTimer = undefined;
    }

    // Flush remaining data
    await this.flushTransportQueue();

    this.isCollecting = false;
    this.emit('apm:stopped');
  }
}

export default APMSystem;