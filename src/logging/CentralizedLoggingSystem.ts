/**
 * Centralized Logging System
 * Enterprise-grade logging with aggregation, search, and analysis capabilities
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { logger } from '../services/SimpleLogger';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context: LogContext;
  metadata?: any;
  tags?: string[];
  correlation?: CorrelationInfo;
  performance?: PerformanceMetrics;
  error?: ErrorInfo;
  stack?: string[];
  fingerprint?: string;
}

export type LogLevel = 
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal';

export type LogCategory =
  | 'application'
  | 'workflow'
  | 'api'
  | 'database'
  | 'cache'
  | 'queue'
  | 'integration'
  | 'security'
  | 'performance'
  | 'audit'
  | 'system';

export interface LogContext {
  service: string;
  environment: string;
  version: string;
  host: string;
  pid: number;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
}

export interface CorrelationInfo {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  flags?: number;
}

export interface PerformanceMetrics {
  duration?: number;
  cpu?: number;
  memory?: number;
  io?: IOMetrics;
  custom?: Record<string, number>;
}

export interface IOMetrics {
  reads: number;
  writes: number;
  bytesRead: number;
  bytesWritten: number;
}

export interface ErrorInfo {
  code: string;
  type: string;
  message: string;
  details?: any;
  cause?: ErrorInfo;
}

export interface LogStream {
  id: string;
  name: string;
  type: 'file' | 'console' | 'remote' | 'database' | 'elasticsearch';
  config: StreamConfig;
  filters?: LogFilter[];
  formatter?: LogFormatter;
  buffer?: BufferConfig;
  active: boolean;
}

export interface StreamConfig {
  destination?: string;
  format?: 'json' | 'text' | 'csv' | 'binary';
  rotation?: RotationConfig;
  compression?: boolean;
  encryption?: boolean;
  batch?: BatchConfig;
}

export interface RotationConfig {
  type: 'size' | 'time' | 'count';
  maxSize?: number;
  maxAge?: number;
  maxFiles?: number;
  compress?: boolean;
  archive?: boolean;
}

export interface BatchConfig {
  size: number;
  interval: number;
  compress?: boolean;
}

export interface BufferConfig {
  size: number;
  flushInterval: number;
  overflow: 'drop' | 'block' | 'expand';
}

export interface LogFilter {
  type: 'level' | 'category' | 'pattern' | 'custom';
  include?: boolean;
  config: any;
}

export interface LogFormatter {
  type: 'json' | 'template' | 'custom';
  template?: string;
  fields?: string[];
  transform?: (entry: LogEntry) => any;
}

export interface LogQuery {
  timeRange?: {
    start: Date;
    end: Date;
  };
  levels?: LogLevel[];
  categories?: LogCategory[];
  search?: string;
  filters?: Record<string, any>;
  correlation?: string;
  limit?: number;
  offset?: number;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface LogAggregation {
  type: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'percentile';
  field?: string;
  groupBy?: string[];
  interval?: string;
  filters?: LogQuery;
}

export interface LogAlert {
  id: string;
  name: string;
  description?: string;
  condition: AlertCondition;
  actions: AlertAction[];
  schedule?: string;
  enabled: boolean;
  lastTriggered?: Date;
  metadata?: any;
}

export interface AlertCondition {
  type: 'threshold' | 'pattern' | 'absence' | 'anomaly';
  query: LogQuery;
  threshold?: {
    value: number;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  };
  pattern?: string;
  window?: number;
  count?: number;
}

export interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'custom';
  config: any;
  throttle?: number;
}

export interface LogStatistics {
  totalLogs: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Record<LogCategory, number>;
  errorRate: number;
  avgResponseTime: number;
  topErrors: Array<{
    fingerprint: string;
    count: number;
    lastSeen: Date;
    message: string;
  }>;
  throughput: {
    current: number;
    avg: number;
    peak: number;
  };
}

export class CentralizedLoggingSystem extends EventEmitter {
  private logs: Map<string, LogEntry> = new Map();
  private streams: Map<string, LogStream> = new Map();
  private alerts: Map<string, LogAlert> = new Map();
  private buffers: Map<string, LogEntry[]> = new Map();
  private statistics: LogStatistics;
  private correlations: Map<string, LogEntry[]> = new Map();
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private config: LoggingConfig;
  private flushTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: Partial<LoggingConfig>) {
    super();
    this.config = {
      maxLogs: 1000000,
      retentionDays: 30,
      defaultLevel: 'info',
      enableCorrelation: true,
      enablePerformance: true,
      enableErrorTracking: true,
      compressionThreshold: 1024,
      ...config
    };

    this.statistics = this.createEmptyStatistics();
    this.initialize();
  }

  /**
   * Initialize logging system
   */
  private initialize(): void {
    // Create default streams
    this.createDefaultStreams();

    // Start background tasks
    this.startBackgroundTasks();

    // Set up error tracking
    if (this.config.enableErrorTracking) {
      this.setupErrorTracking();
    }

    logger.debug('Centralized logging system initialized');
  }

  /**
   * Log entry
   */
  log(
    level: LogLevel,
    message: string,
    options?: {
      category?: LogCategory;
      context?: Partial<LogContext>;
      metadata?: any;
      tags?: string[];
      error?: Error | ErrorInfo;
      performance?: PerformanceMetrics;
      correlationId?: string;
    }
  ): LogEntry {
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      category: options?.category || 'application',
      message,
      context: this.buildContext(options?.context),
      metadata: options?.metadata,
      tags: options?.tags,
      fingerprint: this.generateFingerprint(message, options?.error)
    };

    // Add correlation info
    if (this.config.enableCorrelation && options?.correlationId) {
      entry.correlation = this.createCorrelation(options.correlationId);
    }

    // Add performance metrics
    if (this.config.enablePerformance && options?.performance) {
      entry.performance = options.performance;
    }

    // Add error info
    if (options?.error) {
      entry.error = this.extractErrorInfo(options.error);
      entry.stack = this.extractStackTrace(options.error);
    }

    // Store log
    this.storeLog(entry);

    // Process through streams
    this.processStreams(entry);

    // Check alerts
    this.checkAlerts(entry);

    // Update statistics
    this.updateStatistics(entry);

    // Emit event
    this.emit('log', entry);

    return entry;
  }

  /**
   * Convenience methods for different log levels
   */
  trace(message: string, options?: any): LogEntry {
    return this.log('trace', message, options);
  }

  debug(message: string, options?: any): LogEntry {
    return this.log('debug', message, options);
  }

  info(message: string, options?: any): LogEntry {
    return this.log('info', message, options);
  }

  warn(message: string, options?: any): LogEntry {
    return this.log('warn', message, options);
  }

  error(message: string, error?: Error | ErrorInfo, options?: any): LogEntry {
    return this.log('error', message, { ...options, error });
  }

  fatal(message: string, error?: Error | ErrorInfo, options?: any): LogEntry {
    return this.log('fatal', message, { ...options, error });
  }

  /**
   * Create log stream
   */
  createStream(config: Omit<LogStream, 'id'>): LogStream {
    const stream: LogStream = {
      ...config,
      id: `stream_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    };

    this.streams.set(stream.id, stream);
    
    // Initialize buffer if configured
    if (stream.buffer) {
      this.buffers.set(stream.id, []);
      this.startBufferFlush(stream);
    }

    this.emit('stream:created', stream);
    return stream;
  }

  /**
   * Query logs
   */
  async query(query: LogQuery): Promise<LogEntry[]> {
    let results = Array.from(this.logs.values());

    // Apply time range filter
    if (query.timeRange) {
      results = results.filter(log => 
        log.timestamp >= query.timeRange!.start &&
        log.timestamp <= query.timeRange!.end
      );
    }

    // Apply level filter
    if (query.levels?.length) {
      results = results.filter(log => query.levels!.includes(log.level));
    }

    // Apply category filter
    if (query.categories?.length) {
      results = results.filter(log => query.categories!.includes(log.category));
    }

    // Apply search
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      results = results.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.metadata).toLowerCase().includes(searchLower)
      );
    }

    // Apply correlation filter
    if (query.correlation) {
      const correlated = this.correlations.get(query.correlation) || [];
      results = results.filter(log => correlated.includes(log));
    }

    // Apply custom filters
    if (query.filters) {
      for (const [field, value] of Object.entries(query.filters)) {
        results = results.filter(log => {
          const logValue = this.getNestedValue(log, field);
          return logValue === value;
        });
      }
    }

    // Sort
    if (query.sort) {
      results.sort((a, b) => {
        const aVal = this.getNestedValue(a, query.sort!.field);
        const bVal = this.getNestedValue(b, query.sort!.field);
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return query.sort!.order === 'asc' ? comparison : -comparison;
      });
    }

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Aggregate logs
   */
  async aggregate(aggregation: LogAggregation): Promise<any> {
    const logs = await this.query(aggregation.filters || {});
    const results: any = {};

    if (aggregation.groupBy?.length) {
      // Group logs
      const groups = new Map<string, LogEntry[]>();
      
      for (const log of logs) {
        const key = aggregation.groupBy
          .map(field => this.getNestedValue(log, field))
          .join(':');
        
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(log);
      }

      // Apply aggregation to each group
      for (const [key, groupLogs] of Array.from(groups.entries())) {
        results[key] = this.calculateAggregation(
          groupLogs,
          aggregation.type,
          aggregation.field
        );
      }
    } else {
      // Apply aggregation to all logs
      results.value = this.calculateAggregation(
        logs,
        aggregation.type,
        aggregation.field
      );
    }

    return results;
  }

  /**
   * Create alert
   */
  createAlert(alert: Omit<LogAlert, 'id'>): LogAlert {
    const fullAlert: LogAlert = {
      ...alert,
      id: `alert_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    };

    this.alerts.set(fullAlert.id, fullAlert);
    
    // Start scheduled check if configured
    if (fullAlert.schedule) {
      this.scheduleAlert(fullAlert);
    }

    this.emit('alert:created', fullAlert);
    return fullAlert;
  }

  /**
   * Get error patterns
   */
  getErrorPatterns(limit = 10): Array<{
    pattern: string;
    count: number;
    lastSeen: Date;
    examples: LogEntry[];
  }> {
    const patterns = Array.from(this.errorPatterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return patterns.map(pattern => ({
      pattern: pattern.pattern,
      count: pattern.count,
      lastSeen: pattern.lastSeen,
      examples: pattern.examples.slice(0, 3)
    }));
  }

  /**
   * Get correlated logs
   */
  getCorrelatedLogs(correlationId: string): LogEntry[] {
    return this.correlations.get(correlationId) || [];
  }

  /**
   * Export logs
   */
  async exportLogs(
    query: LogQuery,
    format: 'json' | 'csv' | 'text'
  ): Promise<string> {
    const logs = await this.query(query);

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      
      case 'csv':
        return this.exportAsCSV(logs);
      
      case 'text':
        return this.exportAsText(logs);
      
      default:
        return '';
    }
  }

  /**
   * Store log entry
   */
  private storeLog(entry: LogEntry): void {
    // Store in memory (with size limit)
    if (this.logs.size >= this.config.maxLogs) {
      // Remove oldest logs
      const toRemove = this.logs.size - this.config.maxLogs + 1;
      const keys = Array.from(this.logs.keys()).slice(0, toRemove);
      keys.forEach(key => this.logs.delete(key));
    }

    this.logs.set(entry.id, entry);

    // Store in correlation map
    if (entry.correlation?.traceId) {
      if (!this.correlations.has(entry.correlation.traceId)) {
        this.correlations.set(entry.correlation.traceId, []);
      }
      this.correlations.get(entry.correlation.traceId)!.push(entry);
    }

    // Track error patterns
    if (entry.level === 'error' || entry.level === 'fatal') {
      this.trackErrorPattern(entry);
    }
  }

  /**
   * Process log through streams
   */
  private processStreams(entry: LogEntry): void {
    for (const stream of Array.from(this.streams.values())) {
      if (!stream.active) continue;

      // Apply filters
      if (stream.filters && !this.passesFilters(entry, stream.filters)) {
        continue;
      }

      // Format entry
      const formatted = stream.formatter 
        ? this.formatEntry(entry, stream.formatter)
        : entry;

      // Add to buffer or write directly
      if (stream.buffer) {
        this.addToBuffer(stream.id, entry);
      } else {
        this.writeToStream(stream, formatted);
      }
    }
  }

  /**
   * Check alerts
   */
  private checkAlerts(entry: LogEntry): void {
    for (const alert of Array.from(this.alerts.values())) {
      if (!alert.enabled) continue;

      if (this.matchesAlertCondition(entry, alert.condition)) {
        this.triggerAlert(alert, entry);
      }
    }
  }

  /**
   * Matches alert condition
   */
  private matchesAlertCondition(
    entry: LogEntry,
    condition: AlertCondition
  ): boolean {
    // Check if entry matches query
    const query = condition.query;
    
    if (query.levels && !query.levels.includes(entry.level)) {
      return false;
    }

    if (query.categories && !query.categories.includes(entry.category)) {
      return false;
    }

    switch (condition.type) {
      case 'threshold':
        // Would check threshold against aggregated data
        return false;
      
      case 'pattern':
        if (condition.pattern) {
          const regex = new RegExp(condition.pattern);
          return regex.test(entry.message);
        }
        return false;
      
      case 'anomaly':
        // Would use anomaly detection
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Trigger alert
   */
  private triggerAlert(alert: LogAlert, entry: LogEntry): void {
    // Check throttle
    if (alert.lastTriggered) {
      const throttleTime = 60000; // 1 minute default
      if (Date.now() - alert.lastTriggered.getTime() < throttleTime) {
        return;
      }
    }

    alert.lastTriggered = new Date();

    // Execute actions
    for (const action of alert.actions) {
      this.executeAlertAction(action, alert, entry);
    }

    this.emit('alert:triggered', { alert, entry });
  }

  /**
   * Execute alert action
   */
  private executeAlertAction(
    action: AlertAction,
    alert: LogAlert,
    entry: LogEntry
  ): void {
    switch (action.type) {
      case 'email':
        // Send email notification
        logger.debug(`Email alert: ${alert.name}`);
        break;
      
      case 'slack':
        // Send Slack notification
        logger.debug(`Slack alert: ${alert.name}`);
        break;
      
      case 'webhook':
        // Call webhook
        logger.debug(`Webhook alert: ${alert.name}`);
        break;
      
      case 'pagerduty':
        // Create PagerDuty incident
        logger.debug(`PagerDuty alert: ${alert.name}`);
        break;
    }
  }

  /**
   * Build context
   */
  private buildContext(partial?: Partial<LogContext>): LogContext {
    return {
      service: partial?.service || 'workflow-platform',
      environment: partial?.environment || process.env.NODE_ENV || 'development',
      version: partial?.version || '2.0.0',
      host: partial?.host || 'localhost',
      pid: partial?.pid || process.pid,
      ...partial
    };
  }

  /**
   * Create correlation info
   */
  private createCorrelation(traceId: string): CorrelationInfo {
    return {
      traceId,
      spanId: crypto.randomBytes(8).toString('hex'),
      flags: 1
    };
  }

  /**
   * Extract error info
   */
  private extractErrorInfo(error: Error | ErrorInfo): ErrorInfo {
    if ('code' in error && 'type' in error) {
      return error as ErrorInfo;
    }

    const err = error as Error;
    return {
      code: 'UNKNOWN',
      type: err.name || 'Error',
      message: err.message,
      details: err
    };
  }

  /**
   * Extract stack trace
   */
  private extractStackTrace(error: Error | ErrorInfo): string[] {
    if ('stack' in error && typeof error.stack === 'string') {
      return error.stack.split('\n').map(line => line.trim());
    }
    return [];
  }

  /**
   * Generate log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate fingerprint
   */
  private generateFingerprint(message: string, error?: Error | ErrorInfo): string {
    const data = message + (error ? JSON.stringify(error) : '');
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Track error pattern
   */
  private trackErrorPattern(entry: LogEntry): void {
    const fingerprint = entry.fingerprint!;
    
    if (!this.errorPatterns.has(fingerprint)) {
      this.errorPatterns.set(fingerprint, {
        pattern: entry.message,
        count: 0,
        firstSeen: entry.timestamp,
        lastSeen: entry.timestamp,
        examples: []
      });
    }

    const pattern = this.errorPatterns.get(fingerprint)!;
    pattern.count++;
    pattern.lastSeen = entry.timestamp;
    
    if (pattern.examples.length < 10) {
      pattern.examples.push(entry);
    }
  }

  /**
   * Update statistics
   */
  private updateStatistics(entry: LogEntry): void {
    this.statistics.totalLogs++;
    this.statistics.byLevel[entry.level] = 
      (this.statistics.byLevel[entry.level] || 0) + 1;
    this.statistics.byCategory[entry.category] = 
      (this.statistics.byCategory[entry.category] || 0) + 1;

    // Update error rate
    const errorCount = (this.statistics.byLevel.error || 0) + 
                      (this.statistics.byLevel.fatal || 0);
    this.statistics.errorRate = (errorCount / this.statistics.totalLogs) * 100;

    // Update throughput
    this.statistics.throughput.current = 
      this.calculateThroughput(Date.now() - 60000); // Last minute
  }

  /**
   * Calculate throughput
   */
  private calculateThroughput(since: number): number {
    const recentLogs = Array.from(this.logs.values())
      .filter(log => log.timestamp.getTime() > since);
    
    const duration = (Date.now() - since) / 1000; // in seconds
    return recentLogs.length / duration;
  }

  /**
   * Create default streams
   */
  private createDefaultStreams(): void {
    // Console stream
    this.createStream({
      name: 'console',
      type: 'console',
      config: {
        format: 'text'
      },
      filters: [{
        type: 'level',
        include: true,
        config: { minLevel: this.config.defaultLevel }
      }],
      active: true
    });

    // File stream
    this.createStream({
      name: 'file',
      type: 'file',
      config: {
        destination: './logs/app.log',
        format: 'json',
        rotation: {
          type: 'size',
          maxSize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          compress: true
        }
      },
      active: true
    });
  }

  /**
   * Start background tasks
   */
  private startBackgroundTasks(): void {
    // Clean old logs
    setInterval(() => {
      this.cleanOldLogs();
    }, 3600000); // Every hour

    // Update statistics
    setInterval(() => {
      this.updateGlobalStatistics();
    }, 60000); // Every minute
  }

  /**
   * Clean old logs
   */
  private cleanOldLogs(): void {
    const cutoff = new Date(
      Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000
    );

    for (const [id, log] of Array.from(this.logs.entries())) {
      if (log.timestamp < cutoff) {
        this.logs.delete(id);
      }
    }
  }

  /**
   * Update global statistics
   */
  private updateGlobalStatistics(): void {
    // Update top errors
    this.statistics.topErrors = Array.from(this.errorPatterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(pattern => ({
        fingerprint: crypto.createHash('md5')
          .update(pattern.pattern)
          .digest('hex'),
        count: pattern.count,
        lastSeen: pattern.lastSeen,
        message: pattern.pattern
      }));

    // Update throughput stats
    const current = this.calculateThroughput(Date.now() - 60000);
    this.statistics.throughput.current = current;
    
    if (current > this.statistics.throughput.peak) {
      this.statistics.throughput.peak = current;
    }

    this.emit('statistics:updated', this.statistics);
  }

  /**
   * Setup error tracking
   */
  private setupErrorTracking(): void {
    // Track unhandled errors
    if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error) => {
        this.fatal('Uncaught exception', error);
      });

      process.on('unhandledRejection', (reason) => {
        this.fatal('Unhandled rejection', reason as Error);
      });
    }
  }

  /**
   * Helper methods
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private passesFilters(entry: LogEntry, filters: LogFilter[]): boolean {
    for (const filter of filters) {
      const passes = this.checkFilter(entry, filter);
      if (filter.include && !passes) return false;
      if (!filter.include && passes) return false;
    }
    return true;
  }

  private checkFilter(entry: LogEntry, filter: LogFilter): boolean {
    switch (filter.type) {
      case 'level':
        const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
        const entryIndex = levels.indexOf(entry.level);
        const filterIndex = levels.indexOf(filter.config.minLevel || 'trace');
        return entryIndex >= filterIndex;
      
      case 'category':
        return filter.config.categories?.includes(entry.category) || false;
      
      case 'pattern':
        const regex = new RegExp(filter.config.pattern);
        return regex.test(entry.message);
      
      default:
        return true;
    }
  }

  private formatEntry(entry: LogEntry, formatter: LogFormatter): any {
    switch (formatter.type) {
      case 'json':
        return JSON.stringify(entry);
      
      case 'template':
        return this.applyTemplate(entry, formatter.template!);
      
      case 'custom':
        return formatter.transform ? formatter.transform(entry) : entry;
      
      default:
        return entry;
    }
  }

  private applyTemplate(entry: LogEntry, template: string): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return this.getNestedValue(entry, key) || '';
    });
  }

  private writeToStream(stream: LogStream, data: any): void {
    // In production, would write to actual stream destination
    logger.debug(`Writing to stream ${stream.name}:`, data);
  }

  private addToBuffer(streamId: string, entry: LogEntry): void {
    const buffer = this.buffers.get(streamId);
    if (buffer) {
      buffer.push(entry);
      
      const stream = this.streams.get(streamId);
      if (stream?.buffer && buffer.length >= stream.buffer.size) {
        this.flushBuffer(streamId);
      }
    }
  }

  private startBufferFlush(stream: LogStream): void {
    if (!stream.buffer) return;

    const timer = setInterval(() => {
      this.flushBuffer(stream.id);
    }, stream.buffer.flushInterval);

    this.flushTimers.set(stream.id, timer);
  }

  private flushBuffer(streamId: string): void {
    const buffer = this.buffers.get(streamId);
    const stream = this.streams.get(streamId);
    
    if (!buffer || !stream || buffer.length === 0) return;

    // Write buffered logs
    const logs = [...buffer];
    this.buffers.set(streamId, []);

    // Batch write
    if (stream.config.batch) {
      this.writeBatch(stream, logs);
    } else {
      logs.forEach(log => this.writeToStream(stream, log));
    }
  }

  private writeBatch(stream: LogStream, logs: LogEntry[]): void {
    // In production, would batch write to destination
    logger.debug(`Batch writing ${logs.length} logs to stream ${stream.name}`);
  }

  private scheduleAlert(alert: LogAlert): void {
    // In production, would use cron scheduler
    logger.debug(`Alert ${alert.name} scheduled: ${alert.schedule}`);
  }

  private calculateAggregation(
    logs: LogEntry[],
    type: string,
    field?: string
  ): number {
    if (logs.length === 0) return 0;

    switch (type) {
      case 'count':
        return logs.length;
      
      case 'sum':
        if (!field) return 0;
        return logs.reduce((sum, log) => 
          sum + (this.getNestedValue(log, field) || 0), 0);
      
      case 'avg':
        if (!field) return 0;
        const total = logs.reduce((sum, log) => 
          sum + (this.getNestedValue(log, field) || 0), 0);
        return total / logs.length;
      
      case 'min':
        if (!field) return 0;
        return Math.min(...logs.map(log => 
          this.getNestedValue(log, field) || 0));
      
      case 'max':
        if (!field) return 0;
        return Math.max(...logs.map(log => 
          this.getNestedValue(log, field) || 0));
      
      default:
        return 0;
    }
  }

  private exportAsCSV(logs: LogEntry[]): string {
    const headers = ['timestamp', 'level', 'category', 'message'];
    const rows = logs.map(log => 
      [log.timestamp.toISOString(), log.level, log.category, log.message]
        .map(v => `"${v}"`)
        .join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  private exportAsText(logs: LogEntry[]): string {
    return logs.map(log => 
      `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}`
    ).join('\n');
  }

  private createEmptyStatistics(): LogStatistics {
    return {
      totalLogs: 0,
      byLevel: {} as Record<LogLevel, number>,
      byCategory: {} as Record<LogCategory, number>,
      errorRate: 0,
      avgResponseTime: 0,
      topErrors: [],
      throughput: {
        current: 0,
        avg: 0,
        peak: 0
      }
    };
  }

  /**
   * Get statistics
   */
  getStatistics(): LogStatistics {
    return { ...this.statistics };
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    // Clear timers
    for (const timer of Array.from(this.flushTimers.values())) {
      clearInterval(timer);
    }

    // Flush all buffers
    for (const streamId of Array.from(this.buffers.keys())) {
      this.flushBuffer(streamId);
    }

    this.removeAllListeners();
    logger.debug('Logging system shut down');
  }
}

// Helper interfaces
interface LoggingConfig {
  maxLogs: number;
  retentionDays: number;
  defaultLevel: LogLevel;
  enableCorrelation: boolean;
  enablePerformance: boolean;
  enableErrorTracking: boolean;
  compressionThreshold: number;
}

interface ErrorPattern {
  pattern: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  examples: LogEntry[];
}

// Export singleton instance
export const loggingSystem = new CentralizedLoggingSystem();