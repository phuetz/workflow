import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  service: string;
  environment: string;
  version?: string;
  host: string;
  pid: number;
  context: {
    tenant?: string;
    user?: string;
    traceId?: string;
    spanId?: string;
    transactionId?: string;
    requestId?: string;
    sessionId?: string;
    workflowId?: string;
    executionId?: string;
    nodeId?: string;
    component?: string;
    function?: string;
    filename?: string;
    line?: number;
    tags?: { [key: string]: string };
    custom?: { [key: string]: unknown };
  };
  error?: {
    name: string;
    message: string;
    stack: string[];
    code?: string | number;
    fingerprint?: string;
  };
  performance?: {
    duration?: number;
    memory?: number;
    cpu?: number;
  };
  metadata: {
    source: 'application' | 'system' | 'access' | 'audit' | 'security';
    category?: string;
    severity?: number;
    facility?: string;
    indexed: boolean;
    compressed: boolean;
    encrypted: boolean;
    retention?: number;
  };
}

export interface LogQuery {
  from: number;
  to: number;
  levels?: LogEntry['level'][];
  services?: string[];
  environments?: string[];
  hosts?: string[];
  search?: string;
  context?: {
    tenant?: string;
    user?: string;
    traceId?: string;
    workflowId?: string;
    [key: string]: unknown;
  };
  tags?: { [key: string]: string };
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'level' | 'service';
  sortOrder?: 'asc' | 'desc';
  aggregation?: {
    groupBy: string[];
    metrics: ('count' | 'avg' | 'sum' | 'min' | 'max')[];
    interval?: string;
  };
}

export interface LogQueryResult {
  entries: LogEntry[];
  total: number;
  took: number;
  aggregations?: {
    [key: string]: {
      buckets: Array<{
        key: unknown;
        doc_count: number;
        metrics?: { [metric: string]: number };
      }>;
    };
  };
}

export interface LogStream {
  id: string;
  name: string;
  type: 'file' | 'syslog' | 'journald' | 'http' | 'tcp' | 'udp' | 'kafka';
  config: {
    path?: string;
    host?: string;
    port?: number;
    protocol?: string;
    format?: string;
    parser?: string;
    multiline?: {
      pattern: string;
      negate: boolean;
      match: 'before' | 'after';
    };
    filters?: LogFilter[];
    outputs?: LogOutput[];
  };
  status: 'active' | 'inactive' | 'error';
  stats: {
    bytesRead: number;
    linesRead: number;
    errorsCount: number;
    lastUpdate: number;
  };
}

export interface LogFilter {
  type: 'drop' | 'mutate' | 'grok' | 'json' | 'csv' | 'regex' | 'date';
  condition?: string;
  config: {
    pattern?: string;
    replacement?: string;
    fields?: string[];
    format?: string;
    source?: string;
    target?: string;
    [key: string]: unknown;
  };
}

export interface LogOutput {
  type: 'elasticsearch' | 'opensearch' | 'splunk' | 'datadog' | 'file' | 'kafka' | 'webhook';
  config: {
    endpoint?: string;
    index?: string;
    apiKey?: string;
    username?: string;
    password?: string;
    batchSize?: number;
    batchTimeout?: number;
    compression?: boolean;
    [key: string]: unknown;
  };
  enabled: boolean;
}

export interface LogAlert {
  id: string;
  name: string;
  enabled: boolean;
  query: LogQuery;
  conditions: {
    threshold: number;
    comparison: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
    timeWindow: number;
    frequency: number;
  };
  actions: {
    email?: {
      recipients: string[];
      subject: string;
      body: string;
    };
    webhook?: {
      url: string;
      method: 'POST' | 'PUT';
      headers: { [key: string]: string };
      body: string;
    };
    slack?: {
      webhook: string;
      channel: string;
      username?: string;
      iconEmoji?: string;
    };
  };
  status: 'active' | 'suppressed' | 'disabled';
  lastTriggered?: number;
  suppressUntil?: number;
}

export interface LogIndex {
  name: string;
  pattern: string;
  settings: {
    shards: number;
    replicas: number;
    refreshInterval: string;
    mappings: {
      [field: string]: {
        type: 'text' | 'keyword' | 'long' | 'double' | 'date' | 'boolean' | 'object';
        index?: boolean;
        store?: boolean;
        analyzer?: string;
        format?: string;
        fields?: { [key: string]: unknown };
      };
    };
  };
  retention: {
    days: number;
    sizeGB?: number;
    policy: 'delete' | 'archive' | 'compress';
  };
  stats: {
    docsCount: number;
    sizeBytes: number;
    lastUpdate: number;
  };
}

export interface LogDashboard {
  id: string;
  name: string;
  description?: string;
  widgets: LogWidget[];
  filters: {
    timeRange: { from: string; to: string };
    services?: string[];
    environments?: string[];
    levels?: LogEntry['level'][];
  };
  refreshInterval: number;
  shared: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface LogWidget {
  id: string;
  type: 'logs' | 'histogram' | 'pie' | 'bar' | 'line' | 'table' | 'metric' | 'heatmap';
  title: string;
  position: { x: number; y: number; w: number; h: number };
  query: LogQuery;
  config: {
    visualization?: {
      xAxis?: string;
      yAxis?: string;
      colorBy?: string;
      groupBy?: string[];
      limit?: number;
    };
    formatting?: {
      numberFormat?: string;
      dateFormat?: string;
      colorScheme?: string;
    };
    [key: string]: unknown;
  };
}

export interface LogConfig {
  storage: {
    backend: 'elasticsearch' | 'opensearch' | 'loki' | 'clickhouse' | 'file';
    connection: {
      hosts: string[];
      username?: string;
      password?: string;
      apiKey?: string;
      ssl?: boolean;
      maxRetries: number;
      requestTimeout: number;
    };
    indices: LogIndex[];
  };
  ingestion: {
    batchSize: number;
    batchTimeout: number;
    maxQueueSize: number;
    compression: boolean;
    workers: number;
    parsers: {
      [format: string]: {
        type: 'json' | 'logfmt' | 'regex' | 'grok' | 'csv';
        pattern?: string;
        delimiter?: string;
        fields?: string[];
      };
    };
  };
  processing: {
    enableEnrichment: boolean;
    enableGeoIP: boolean;
    enableUserAgent: boolean;
    enableStructuredData: boolean;
    pipelines: LogPipeline[];
  };
  retention: {
    defaultDays: number;
    policies: Array<{
      pattern: string;
      days: number;
      action: 'delete' | 'archive' | 'compress';
    }>;
  };
  security: {
    encryptAtRest: boolean;
    maskSensitiveData: boolean;
    sensitiveFields: string[];
    accessControl: {
      enabled: boolean;
      rules: Array<{
        role: string;
        permissions: string[];
        filters: { [key: string]: unknown };
      }>;
    };
  };
  alerting: {
    enabled: boolean;
    checkInterval: number;
    maxConcurrentAlerts: number;
    suppressionWindow: number;
  };
}

export interface LogPipeline {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  filters: LogFilter[];
  condition?: string;
  order: number;
}

export class LogAggregationService extends EventEmitter {
  private config: LogConfig;
  private streams: Map<string, LogStream> = new Map();
  private indices: Map<string, LogIndex> = new Map();
  private alerts: Map<string, LogAlert> = new Map();
  private dashboards: Map<string, LogDashboard> = new Map();
  private pipelines: Map<string, LogPipeline> = new Map();
  private ingestionQueue: LogEntry[] = [];
  private processingQueue: LogEntry[] = [];
  private isRunning = false;
  private workers: NodeJS.Timeout[] = [];
  private alertCheckers: NodeJS.Timeout[] = [];

  constructor(config: LogConfig) {
    super();
    this.config = config;
    this.initializeIndices();
    this.loadPipelines();
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    // Start ingestion workers
    for (let i = 0; i < this.config.ingestion.workers; i++) {
      const worker = setInterval(() => {
        this.processIngestionQueue();
      }, this.config.ingestion.batchTimeout);
      
      this.workers.push(worker);
    }

    // Start alert checkers
    if (this.config.alerting.enabled) {
      const alertChecker = setInterval(() => {
        this.checkAlerts();
      }, this.config.alerting.checkInterval);
      
      this.alertCheckers.push(alertChecker);
    }

    // Start retention cleanup
    const retentionWorker = setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000); // Daily
    
    this.workers.push(retentionWorker);

    this.isRunning = true;
    this.emit('service:started');
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    // Stop all workers
    for (const worker of this.workers) {
      clearInterval(worker);
    }
    this.workers = [];

    // Stop alert checkers
    for (const checker of this.alertCheckers) {
      clearInterval(checker);
    }
    this.alertCheckers = [];

    // Process remaining queues
    await this.flushQueues();

    this.isRunning = false;
    this.emit('service:stopped');
  }

  // Log Ingestion
  public ingest(entry: Partial<LogEntry>): void {
    const logEntry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: entry.timestamp || Date.now(),
      level: entry.level || 'info',
      message: entry.message || '',
      service: entry.service || 'unknown',
      environment: entry.environment || 'development',
      version: entry.version,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      host: entry.host || require('os').hostname(),
      pid: entry.pid || process.pid,
      context: entry.context || {},
      error: entry.error,
      performance: entry.performance,
      metadata: {
        source: 'application',
        indexed: false,
        compressed: false,
        encrypted: false,
        ...entry.metadata
      }
    };

    // Apply processing pipelines
    const processedEntry = this.applyPipelines(logEntry);
    if (!processedEntry) return; // Entry was filtered out

    this.ingestionQueue.push(processedEntry);

    // Trigger immediate processing if queue is full
    if (this.ingestionQueue.length >= this.config.ingestion.batchSize) {
      this.processIngestionQueue();
    }

    this.emit('log:ingested', processedEntry);
  }

  public ingestBatch(entries: Partial<LogEntry>[]): void {
    for (const entry of entries) {
      this.ingest(entry);
    }
  }

  private applyPipelines(entry: LogEntry): LogEntry | null {
    let processedEntry = { ...entry };

    // Apply pipelines in order
    const sortedPipelines = Array.from(this.pipelines.values())
      .filter(p => p.enabled)
      .sort((a, b) => a.order - b.order);

    for (const pipeline of sortedPipelines) {
      // Check pipeline condition
      if (pipeline.condition && !this.evaluateCondition(pipeline.condition, processedEntry)) {
        continue;
      }

      // Apply pipeline filters
      const result = this.applyFilters(processedEntry, pipeline.filters);
      if (result === null) {
        return null; // Entry was dropped
      }
      
      processedEntry = result;
    }

    return processedEntry;
  }

  private applyFilters(entry: LogEntry, filters: LogFilter[]): LogEntry | null {
    let processedEntry = { ...entry };

    for (const filter of filters) {
      const result = this.applyFilter(processedEntry, filter);
      if (result === null) {
        return null; // Entry was dropped
      }
      processedEntry = result;
    }

    return processedEntry;
  }

  private applyFilter(entry: LogEntry, filter: LogFilter): LogEntry | null {
    switch (filter.type) {
      case 'drop':
        if (this.evaluateCondition(filter.condition || '', entry)) {
          return null;
        }
        break;

      case 'mutate':
        return this.applyMutateFilter(entry, filter);

      case 'grok':
        return this.applyGrokFilter(entry, filter);

      case 'json':
        return this.applyJSONFilter(entry, filter);

      case 'regex':
        return this.applyRegexFilter(entry, filter);

      case 'date':
        return this.applyDateFilter(entry, filter);

      default:
        break;
    }

    return entry;
  }

  private applyMutateFilter(entry: LogEntry, filter: LogFilter): LogEntry {
    const result = { ...entry };
    
    if (filter.config.fields) {
      for (const field of filter.config.fields) {
        const value = this.getNestedValue(result, filter.config.source || field);
        if (value !== undefined) {
          this.setNestedValue(result, filter.config.target || field, value);
        }
      }
    }

    return result;
  }

  private applyGrokFilter(entry: LogEntry, filter: LogFilter): LogEntry {
    // Simplified grok parsing
    const pattern = filter.config.pattern || '';
    const result = { ...entry };
    
    // In a real implementation, use a proper grok library
    const match = entry.message.match(new RegExp(pattern));
    if (match && match.groups) {
      for (const [key, value] of Object.entries(match.groups)) {
        this.setNestedValue(result, `context.${key}`, value);
      }
    }

    return result;
  }

  private applyJSONFilter(entry: LogEntry, filter: LogFilter): LogEntry {
    const result = { ...entry };
    const source = filter.config.source || 'message';
    const target = filter.config.target || 'context';
    
    try {
      const value = this.getNestedValue(result, source);
      if (typeof value === 'string') {
        const parsed = JSON.parse(value);
        this.setNestedValue(result, target, parsed);
      }
    } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Ignore parse errors
    }

    return result;
  }

  private applyRegexFilter(entry: LogEntry, filter: LogFilter): LogEntry {
    const result = { ...entry };
    const pattern = new RegExp(filter.config.pattern || '');
    const source = filter.config.source || 'message';
    const target = filter.config.target || 'context.extracted';
    
    const value = this.getNestedValue(result, source);
    if (typeof value === 'string') {
      const match = value.match(pattern);
      if (match) {
        this.setNestedValue(result, target, match.groups || match[1] || match[0]);
      }
    }

    return result;
  }

  private applyDateFilter(entry: LogEntry, filter: LogFilter): LogEntry {
    const result = { ...entry };
    const source = filter.config.source || 'timestamp';
    const _format = filter.config.format || 'iso'; // eslint-disable-line @typescript-eslint/no-unused-vars
    
    const value = this.getNestedValue(result, source);
    if (value) {
      let timestamp: number;
      
      if (typeof value === 'string') {
        timestamp = Date.parse(value);
      } else if (typeof value === 'number') {
        timestamp = value;
      } else {
        return result;
      }

      if (!isNaN(timestamp)) {
        result.timestamp = timestamp;
      }
    }

    return result;
  }

  // Query System
  public async query(query: LogQuery): Promise<LogQueryResult> {
    const startTime = Date.now();
    
    try {
      // In a real implementation, this would query the storage backend
      const mockResults = this.mockQuery(query);
      
      const result: LogQueryResult = {
        entries: mockResults.entries,
        total: mockResults.total,
        took: Date.now() - startTime,
        aggregations: mockResults.aggregations
      };

      this.emit('query:executed', { query, result });
      return result;

    } catch (error) {
      this.emit('query:failed', { query, error });
      throw error;
    }
  }

  private mockQuery(query: LogQuery): LogQueryResult {
    // Mock implementation - in reality, this would query Elasticsearch/etc
    const mockEntries: LogEntry[] = [];
    
    for (let i = 0; i < Math.min(query.limit || 100, 50); i++) {
      mockEntries.push({
        id: crypto.randomUUID(),
        timestamp: Date.now() - Math.random() * (query.to - query.from),
        level: ['info', 'warn', 'error'][Math.floor(Math.random() * 3)] as LogEntry['level'],
        message: `Mock log message ${i}`,
        service: query.services?.[0] || 'test-service',
        environment: query.environments?.[0] || 'development',
        host: 'localhost',
        pid: process.pid,
        context: {
          tenant: query.context?.tenant,
          user: query.context?.user,
          traceId: crypto.randomUUID(),
          requestId: crypto.randomUUID()
        },
        metadata: {
          source: 'application',
          indexed: true,
          compressed: false,
          encrypted: false
        }
      });
    }

    return {
      entries: mockEntries,
      total: mockEntries.length,
      took: 0,
      aggregations: query.aggregation ? {
        levels: {
          buckets: [
            { key: 'info', doc_count: 30 },
            { key: 'warn', doc_count: 15 },
            { key: 'error', doc_count: 5 }
          ]
        }
      } : undefined
    };
  }

  // Stream Management
  public createStream(stream: Omit<LogStream, 'id' | 'status' | 'stats'>): LogStream {
    const logStream: LogStream = {
      id: crypto.randomUUID(),
      status: 'inactive',
      stats: {
        bytesRead: 0,
        linesRead: 0,
        errorsCount: 0,
        lastUpdate: Date.now()
      },
      ...stream
    };

    this.streams.set(logStream.id, logStream);
    this.emit('stream:created', logStream);
    
    return logStream;
  }

  public async startStream(streamId: string): Promise<void> {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream not found: ${streamId}`);
    }

    try {
      await this.initializeStream(stream);
      stream.status = 'active';
      this.emit('stream:started', stream);
    } catch (error) {
      stream.status = 'error';
      this.emit('stream:error', { stream, error });
      throw error;
    }
  }

  public async stopStream(streamId: string): Promise<void> {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream not found: ${streamId}`);
    }

    stream.status = 'inactive';
    this.emit('stream:stopped', stream);
  }

  private async initializeStream(stream: LogStream): Promise<void> {
    switch (stream.type) {
      case 'file':
        await this.initializeFileStream(stream);
        break;
      case 'syslog':
        await this.initializeSyslogStream(stream);
        break;
      case 'http':
        await this.initializeHttpStream(stream);
        break;
      case 'tcp':
        await this.initializeTcpStream(stream);
        break;
      default:
        throw new Error(`Unsupported stream type: ${stream.type}`);
    }
  }

  private async initializeFileStream(stream: LogStream): Promise<void> {
    const filePath = stream.config.path;
    if (!filePath) {
      throw new Error('File path is required for file stream');
    }

    // In a real implementation, use fs.watchFile or similar
    console.log(`Monitoring file: ${filePath}`);
  }

  private async initializeSyslogStream(stream: LogStream): Promise<void> {
    // Initialize syslog server
    console.log(`Starting syslog server on ${stream.config.host}:${stream.config.port}`);
  }

  private async initializeHttpStream(stream: LogStream): Promise<void> {
    // Initialize HTTP endpoint
    console.log(`Starting HTTP log endpoint on port ${stream.config.port}`);
  }

  private async initializeTcpStream(stream: LogStream): Promise<void> {
    // Initialize TCP server
    console.log(`Starting TCP log server on ${stream.config.host}:${stream.config.port}`);
  }

  // Alert Management
  public createAlert(alert: Omit<LogAlert, 'id' | 'status'>): LogAlert {
    const logAlert: LogAlert = {
      id: crypto.randomUUID(),
      status: 'active',
      ...alert
    };

    this.alerts.set(logAlert.id, logAlert);
    this.emit('alert:created', logAlert);
    
    return logAlert;
  }

  private async checkAlerts(): Promise<void> {
    for (const alert of this.alerts.values()) {
      if (!alert.enabled || alert.status !== 'active') continue;

      try {
        await this.evaluateAlert(alert);
      } catch (error) {
        this.emit('alert:evaluation:failed', { alert, error });
      }
    }
  }

  private async evaluateAlert(alert: LogAlert): Promise<void> {
    // Check suppression
    if (alert.suppressUntil && Date.now() < alert.suppressUntil) {
      return;
    }

    // Execute alert query
    const result = await this.query(alert.query);
    
    // Evaluate conditions
    const triggered = this.evaluateAlertConditions(alert, result);
    
    if (triggered) {
      await this.triggerAlert(alert, result);
    }
  }

  private evaluateAlertConditions(alert: LogAlert, result: LogQueryResult): boolean {
    const { threshold, comparison } = alert.conditions;
    const value = result.total;

    switch (comparison) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  private async triggerAlert(alert: LogAlert, result: LogQueryResult): Promise<void> {
    alert.lastTriggered = Date.now();
    alert.suppressUntil = Date.now() + (alert.conditions.frequency * 1000);

    // Send notifications
    if (alert.actions.email) {
      await this.sendEmailAlert(alert, alert.actions.email, result);
    }

    if (alert.actions.webhook) {
      await this.sendWebhookAlert(alert, alert.actions.webhook, result);
    }

    if (alert.actions.slack) {
      await this.sendSlackAlert(alert, alert.actions.slack, result);
    }

    this.emit('alert:triggered', { alert, result });
  }

  // Dashboard Management
  public createDashboard(dashboard: Omit<LogDashboard, 'id' | 'createdAt' | 'updatedAt'>): LogDashboard {
    const logDashboard: LogDashboard = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...dashboard
    };

    this.dashboards.set(logDashboard.id, logDashboard);
    this.emit('dashboard:created', logDashboard);
    
    return logDashboard;
  }

  public updateDashboard(id: string, updates: Partial<LogDashboard>): LogDashboard {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${id}`);
    }

    const updated = {
      ...dashboard,
      ...updates,
      updatedAt: Date.now()
    };

    this.dashboards.set(id, updated);
    this.emit('dashboard:updated', updated);
    
    return updated;
  }

  // Index Management
  private initializeIndices(): void {
    for (const index of this.config.storage.indices) {
      this.indices.set(index.name, {
        ...index,
        stats: {
          docsCount: 0,
          sizeBytes: 0,
          lastUpdate: Date.now()
        }
      });
    }
  }

  public createIndex(index: Omit<LogIndex, 'stats'>): LogIndex {
    const logIndex: LogIndex = {
      ...index,
      stats: {
        docsCount: 0,
        sizeBytes: 0,
        lastUpdate: Date.now()
      }
    };

    this.indices.set(logIndex.name, logIndex);
    this.emit('index:created', logIndex);
    
    return logIndex;
  }

  // Processing
  private async processIngestionQueue(): Promise<void> {
    if (this.ingestionQueue.length === 0) return;

    const batch = this.ingestionQueue.splice(0, this.config.ingestion.batchSize);
    
    try {
      await this.indexBatch(batch);
      this.emit('batch:processed', { count: batch.length });
    } catch (error) {
      this.emit('batch:failed', { error, count: batch.length });
      
      // Re-queue failed entries
      this.ingestionQueue.unshift(...batch);
    }
  }

  private async indexBatch(entries: LogEntry[]): Promise<void> {
    // In a real implementation, send to Elasticsearch/etc
    console.log(`Indexing batch of ${entries.length} log entries`);
    
    for (const entry of entries) {
      entry.metadata.indexed = true;
    }
  }

  private loadPipelines(): void {
    if (this.config.processing.pipelines) {
      for (const pipeline of this.config.processing.pipelines) {
        this.pipelines.set(pipeline.id, pipeline);
      }
    }
  }

  private async flushQueues(): Promise<void> {
    if (this.ingestionQueue.length > 0) {
      await this.processIngestionQueue();
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    const now = Date.now();
    
    for (const policy of this.config.retention.policies) {
      const _cutoff = now - (policy.days * 24 * 60 * 60 * 1000); // eslint-disable-line @typescript-eslint/no-unused-vars
      
      // In a real implementation, delete/archive old indices
      console.log(`Cleaning up logs older than ${policy.days} days for pattern: ${policy.pattern}`);
    }
  }

  // Utility Methods
  private evaluateCondition(condition: string, entry: LogEntry): boolean {
    // Simple condition evaluation - in reality, use a proper expression parser
    try {
      // Replace field references with actual values
      const processedCondition = condition.replace(/\$\{([^}]+)\}/g, (match, field) => {
        const value = this.getNestedValue(entry, field);
        return JSON.stringify(value);
      });

      // Evaluate the condition (be careful with eval in production!)
      return Function(`"use strict"; return (${processedCondition})`)();
    } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      return false;
    }
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private setNestedValue(obj: unknown, path: string, value: unknown): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  private async sendEmailAlert(alert: LogAlert, config: unknown, result: LogQueryResult): Promise<void> {
    console.log('Sending email alert:', {
      to: config.recipients,
      subject: config.subject,
      alert: alert.name,
      count: result.total
    });
  }

  private async sendWebhookAlert(alert: LogAlert, config: unknown, result: LogQueryResult): Promise<void> {
    console.log('Sending webhook alert:', {
      url: config.url,
      method: config.method,
      alert: alert.name,
      count: result.total
    });
  }

  private async sendSlackAlert(alert: LogAlert, config: unknown, result: LogQueryResult): Promise<void> {
    console.log('Sending Slack alert:', {
      channel: config.channel,
      alert: alert.name,
      count: result.total
    });
  }

  // Public API
  public getStream(id: string): LogStream | undefined {
    return this.streams.get(id);
  }

  public getAllStreams(): LogStream[] {
    return Array.from(this.streams.values());
  }

  public getAlert(id: string): LogAlert | undefined {
    return this.alerts.get(id);
  }

  public getAllAlerts(): LogAlert[] {
    return Array.from(this.alerts.values());
  }

  public getDashboard(id: string): LogDashboard | undefined {
    return this.dashboards.get(id);
  }

  public getAllDashboards(): LogDashboard[] {
    return Array.from(this.dashboards.values());
  }

  public getIndex(name: string): LogIndex | undefined {
    return this.indices.get(name);
  }

  public getAllIndices(): LogIndex[] {
    return Array.from(this.indices.values());
  }

  public getPipeline(id: string): LogPipeline | undefined {
    return this.pipelines.get(id);
  }

  public getAllPipelines(): LogPipeline[] {
    return Array.from(this.pipelines.values());
  }

  public getStats(): {
    streams: { active: number; inactive: number; error: number };
    alerts: { active: number; suppressed: number; disabled: number };
    indices: { count: number; totalDocs: number; totalSize: number };
    queues: { ingestion: number; processing: number };
    status: 'healthy' | 'warning' | 'critical';
  } {
    const streams = Array.from(this.streams.values());
    const alerts = Array.from(this.alerts.values());
    const indices = Array.from(this.indices.values());

    return {
      streams: {
        active: streams.filter(s => s.status === 'active').length,
        inactive: streams.filter(s => s.status === 'inactive').length,
        error: streams.filter(s => s.status === 'error').length
      },
      alerts: {
        active: alerts.filter(a => a.status === 'active').length,
        suppressed: alerts.filter(a => a.status === 'suppressed').length,
        disabled: alerts.filter(a => a.status === 'disabled').length
      },
      indices: {
        count: indices.length,
        totalDocs: indices.reduce((sum, i) => sum + i.stats.docsCount, 0),
        totalSize: indices.reduce((sum, i) => sum + i.stats.sizeBytes, 0)
      },
      queues: {
        ingestion: this.ingestionQueue.length,
        processing: this.processingQueue.length
      },
      status: this.getOverallStatus()
    };
  }

  private getOverallStatus(): 'healthy' | 'warning' | 'critical' {
    const errorStreams = Array.from(this.streams.values()).filter(s => s.status === 'error');
    const queueBacklog = this.ingestionQueue.length + this.processingQueue.length;
    
    if (errorStreams.length > 0 || queueBacklog > this.config.ingestion.maxQueueSize * 0.9) {
      return 'critical';
    }
    
    if (queueBacklog > this.config.ingestion.maxQueueSize * 0.7) {
      return 'warning';
    }
    
    return 'healthy';
  }
}

export default LogAggregationService;