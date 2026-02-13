/**
 * ErrorMonitoringSystem.ts
 * Core error monitoring engine with real-time capture, classification, and alerting
 */

import { EventEmitter } from 'events';
import ErrorPatternAnalyzer from './ErrorPatternAnalyzer';
import AutoCorrection from './AutoCorrection';
import ErrorStorage from './ErrorStorage';
import ExternalIntegrations from './ExternalIntegrations';
import { logger } from '../services/SimpleLogger';

export type ErrorType = 'runtime' | 'network' | 'validation' | 'security' | 'performance' | 'database' | 'unknown';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ResolutionMethod = 'auto' | 'manual' | 'ignored' | 'pending';

export interface ErrorContext {
  userId?: string;
  workflowId?: string;
  nodeId?: string;
  executionId?: string;
  url?: string;
  userAgent?: string;
  timestamp: Date;
  environment: 'development' | 'staging' | 'production';
  version?: string;
}

export interface ErrorEvent {
  id: string;
  timestamp: Date;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context: ErrorContext;
  metadata: Record<string, unknown>;
  resolved: boolean;
  resolutionMethod?: ResolutionMethod;
  resolutionDetails?: string;
  attempts: number;
  fingerprint: string; // For deduplication
}

export interface MonitoringConfig {
  enabled: boolean;
  captureUnhandledRejections: boolean;
  captureConsoleErrors: boolean;
  sampleRate: number; // 0-1, percentage of errors to capture
  ignoredErrors: Array<string | RegExp>;
  severityThresholds: {
    alertOnCritical: boolean;
    alertOnHigh: boolean;
    criticalErrorsBeforeAlert: number;
  };
  storage: {
    maxErrors: number;
    retentionDays: number;
  };
  performance: {
    maxOverhead: number; // Max percentage of overhead allowed
    batchSize: number;
    flushIntervalMs: number;
  };
}

export interface ErrorStats {
  total: number;
  resolved: number;
  unresolved: number;
  byType: Record<ErrorType, number>;
  bySeverity: Record<ErrorSeverity, number>;
  byResolution: Record<ResolutionMethod, number>;
  topErrors: Array<{ message: string; count: number; fingerprint: string }>;
  errorRate: number; // Errors per minute
  mttr: number; // Mean time to resolution (minutes)
}

export class ErrorMonitoringSystem extends EventEmitter {
  private static instance: ErrorMonitoringSystem;
  private config: MonitoringConfig;
  private patternAnalyzer: ErrorPatternAnalyzer;
  private autoCorrection: AutoCorrection;
  private storage: ErrorStorage;
  private integrations: ExternalIntegrations;
  private errorBuffer: ErrorEvent[] = [];
  private flushTimer?: NodeJS.Timeout;
  private startTime: Date;
  private errorCount: number = 0;

  private constructor(config?: Partial<MonitoringConfig>) {
    super();
    this.startTime = new Date();
    this.config = this.getDefaultConfig(config);
    this.patternAnalyzer = new ErrorPatternAnalyzer();
    this.autoCorrection = new AutoCorrection();
    this.storage = new ErrorStorage(this.config.storage);
    this.integrations = new ExternalIntegrations();

    if (this.config.enabled) {
      this.initialize();
    }
  }

  public static getInstance(config?: Partial<MonitoringConfig>): ErrorMonitoringSystem {
    if (!ErrorMonitoringSystem.instance) {
      ErrorMonitoringSystem.instance = new ErrorMonitoringSystem(config);
    }
    return ErrorMonitoringSystem.instance;
  }

  private getDefaultConfig(config?: Partial<MonitoringConfig>): MonitoringConfig {
    return {
      enabled: true,
      captureUnhandledRejections: true,
      captureConsoleErrors: true,
      sampleRate: 1.0,
      ignoredErrors: [
        /ResizeObserver loop/i,
        /Loading chunk .+ failed/i,
        /Script error/i,
      ],
      severityThresholds: {
        alertOnCritical: true,
        alertOnHigh: true,
        criticalErrorsBeforeAlert: 3,
      },
      storage: {
        maxErrors: 10000,
        retentionDays: 30,
      },
      performance: {
        maxOverhead: 1, // 1% max overhead
        batchSize: 50,
        flushIntervalMs: 5000,
      },
      ...config,
    };
  }

  private initialize(): void {
    // Capture unhandled errors
    if (typeof window !== 'undefined') {
      this.setupBrowserHandlers();
    } else {
      this.setupNodeHandlers();
    }

    // Setup periodic flush
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.performance.flushIntervalMs);

    // Cleanup old errors periodically
    setInterval(() => {
      this.storage.cleanup();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  private setupBrowserHandlers(): void {
    // Global error handler
    window.addEventListener('error', (event: Event) => {
      const errorEvent = event as unknown as {
        message?: string;
        error?: Error;
        filename?: string;
        lineno?: number;
        colno?: number;
      };
      this.captureError({
        message: errorEvent.message || 'Unknown error',
        stack: errorEvent.error?.stack,
        type: 'runtime',
        severity: this.calculateSeverity(errorEvent.error),
        metadata: {
          filename: errorEvent.filename,
          lineno: errorEvent.lineno,
          colno: errorEvent.colno,
        },
      });
    });

    // Unhandled promise rejections
    if (this.config.captureUnhandledRejections) {
      window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        this.captureError({
          message: event.reason?.message || String(event.reason) || 'Unhandled rejection',
          stack: event.reason?.stack,
          type: 'runtime',
          severity: 'high',
          metadata: {
            reason: event.reason,
          },
        });
      });
    }

    // Console.error interception
    if (this.config.captureConsoleErrors) {
      const originalConsoleError = console.error;
      console.error = (...args: unknown[]) => {
        originalConsoleError.apply(console, args);
        this.captureError({
          message: args.map(arg => String(arg)).join(' '),
          type: 'runtime',
          severity: 'medium',
          metadata: { args },
        });
      };
    }
  }

  private setupNodeHandlers(): void {
    // Node.js error handlers
    process.on('uncaughtException', (error: Error) => {
      this.captureError({
        message: error.message,
        stack: error.stack,
        type: 'runtime',
        severity: 'critical',
        metadata: { name: error.name },
      });
    });

    if (this.config.captureUnhandledRejections) {
      process.on('unhandledRejection', (reason: unknown) => {
        this.captureError({
          message: reason instanceof Error ? reason.message : String(reason),
          stack: reason instanceof Error ? reason.stack : undefined,
          type: 'runtime',
          severity: 'high',
          metadata: { reason },
        });
      });
    }
  }

  /**
   * Capture an error event
   */
  public captureError(error: {
    message: string;
    stack?: string;
    type?: ErrorType;
    severity?: ErrorSeverity;
    context?: Partial<ErrorContext>;
    metadata?: Record<string, unknown>;
  }): ErrorEvent | null {
    // Sample rate check
    if (Math.random() > this.config.sampleRate) {
      return null;
    }

    // Check if error should be ignored
    if (this.shouldIgnoreError(error.message)) {
      return null;
    }

    const errorEvent: ErrorEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: error.type || this.detectErrorType(error.message, error.stack),
      severity: error.severity || this.calculateSeverity(error),
      message: error.message,
      stack: error.stack,
      context: {
        timestamp: new Date(),
        environment: this.detectEnvironment(),
        ...error.context,
      },
      metadata: error.metadata || {},
      resolved: false,
      attempts: 0,
      fingerprint: this.generateFingerprint(error.message, error.stack),
    };

    this.errorCount++;

    // Add to buffer
    this.errorBuffer.push(errorEvent);

    // Emit event for real-time listeners
    this.emit('error', errorEvent);

    // Check if we need to flush immediately (critical errors or buffer full)
    if (
      errorEvent.severity === 'critical' ||
      this.errorBuffer.length >= this.config.performance.batchSize
    ) {
      this.flush();
    }

    // Try auto-correction
    this.attemptAutoCorrection(errorEvent);

    // Send alerts if needed
    this.checkAlerts(errorEvent);

    return errorEvent;
  }

  /**
   * Capture a network error
   */
  public captureNetworkError(error: {
    url: string;
    method: string;
    status?: number;
    statusText?: string;
    message?: string;
    context?: Partial<ErrorContext>;
  }): ErrorEvent | null {
    return this.captureError({
      message: error.message || `Network error: ${error.method} ${error.url} (${error.status || 'unknown'})`,
      type: 'network',
      severity: error.status && error.status >= 500 ? 'high' : 'medium',
      context: error.context,
      metadata: {
        url: error.url,
        method: error.method,
        status: error.status,
        statusText: error.statusText,
      },
    });
  }

  /**
   * Capture a validation error
   */
  public captureValidationError(error: {
    field: string;
    value: unknown;
    message: string;
    context?: Partial<ErrorContext>;
  }): ErrorEvent | null {
    return this.captureError({
      message: `Validation error: ${error.field} - ${error.message}`,
      type: 'validation',
      severity: 'low',
      context: error.context,
      metadata: {
        field: error.field,
        value: error.value,
      },
    });
  }

  /**
   * Capture a security error
   */
  public captureSecurityError(error: {
    type: string;
    message: string;
    context?: Partial<ErrorContext>;
    metadata?: Record<string, unknown>;
  }): ErrorEvent | null {
    return this.captureError({
      message: `Security error: ${error.type} - ${error.message}`,
      type: 'security',
      severity: 'critical',
      context: error.context,
      metadata: error.metadata,
    });
  }

  /**
   * Capture a performance error
   */
  public capturePerformanceError(error: {
    metric: string;
    value: number;
    threshold: number;
    context?: Partial<ErrorContext>;
  }): ErrorEvent | null {
    return this.captureError({
      message: `Performance issue: ${error.metric} (${error.value}ms) exceeded threshold (${error.threshold}ms)`,
      type: 'performance',
      severity: error.value > error.threshold * 2 ? 'high' : 'medium',
      context: error.context,
      metadata: {
        metric: error.metric,
        value: error.value,
        threshold: error.threshold,
      },
    });
  }

  /**
   * Flush buffered errors to storage
   */
  private async flush(): Promise<void> {
    if (this.errorBuffer.length === 0) return;

    const errors = [...this.errorBuffer];
    this.errorBuffer = [];

    try {
      // Store errors
      await this.storage.storeErrors(errors);

      // Analyze patterns
      const patterns = await this.patternAnalyzer.analyzeErrors(errors);

      // Send to external integrations
      await this.integrations.sendErrors(errors, patterns.patterns as any);

      this.emit('flush', { count: errors.length, patterns });
    } catch (error) {
      logger.error('Failed to flush errors', { component: 'ErrorMonitoringSystem', error });
      // Re-add to buffer if flush failed
      this.errorBuffer.unshift(...errors);
    }
  }

  /**
   * Attempt automatic correction for an error
   */
  private async attemptAutoCorrection(error: ErrorEvent): Promise<void> {
    try {
      const corrected = await this.autoCorrection.tryCorrect(error);
      if (corrected) {
        error.resolved = true;
        error.resolutionMethod = 'auto';
        error.resolutionDetails = corrected.method;
        this.emit('auto-corrected', error);
      }
    } catch (correctionError) {
      logger.error('Auto-correction failed', { component: 'ErrorMonitoringSystem', error: correctionError });
    }
  }

  /**
   * Check if alerts should be sent
   */
  private async checkAlerts(error: ErrorEvent): Promise<void> {
    const shouldAlert =
      (error.severity === 'critical' && this.config.severityThresholds.alertOnCritical) ||
      (error.severity === 'high' && this.config.severityThresholds.alertOnHigh);

    if (shouldAlert) {
      // Check recent critical errors
      const recentCritical = await this.storage.getRecentErrors({
        severity: 'critical',
        minutes: 5,
      });

      if (recentCritical.length >= this.config.severityThresholds.criticalErrorsBeforeAlert) {
        this.emit('alert', {
          type: 'critical-threshold',
          error,
          recentErrors: recentCritical,
        });
        await this.integrations.sendAlert(error, recentCritical);
      }
    }
  }

  /**
   * Get error statistics
   */
  public async getStats(options?: {
    startDate?: Date;
    endDate?: Date;
    type?: ErrorType;
    severity?: ErrorSeverity;
  }): Promise<ErrorStats> {
    const errors = await this.storage.getErrors(options);

    const byType: Record<ErrorType, number> = {
      runtime: 0,
      network: 0,
      validation: 0,
      security: 0,
      performance: 0,
      database: 0,
      unknown: 0,
    };

    const bySeverity: Record<ErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const byResolution: Record<ResolutionMethod, number> = {
      auto: 0,
      manual: 0,
      ignored: 0,
      pending: 0,
    };

    const fingerprintCounts = new Map<string, { message: string; count: number }>();

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    errors.forEach(error => {
      byType[error.type]++;
      bySeverity[error.severity]++;

      if (error.resolved) {
        resolvedCount++;
        byResolution[error.resolutionMethod || 'manual']++;

        // Calculate resolution time if available
        if (error.resolutionDetails) {
          // This would be enhanced with actual resolution timestamp
          totalResolutionTime += 5; // Placeholder
        }
      } else {
        byResolution['pending']++;
      }

      // Count fingerprints for top errors
      const existing = fingerprintCounts.get(error.fingerprint);
      if (existing) {
        existing.count++;
      } else {
        fingerprintCounts.set(error.fingerprint, {
          message: error.message,
          count: 1,
        });
      }
    });

    // Get top errors
    const topErrors = Array.from(fingerprintCounts.entries())
      .map(([fingerprint, data]) => ({
        fingerprint,
        message: data.message,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate error rate
    const timeRangeMinutes = options?.startDate && options?.endDate
      ? (options.endDate.getTime() - options.startDate.getTime()) / (1000 * 60)
      : ((new Date()).getTime() - this.startTime.getTime()) / (1000 * 60);
    const errorRate = errors.length / Math.max(timeRangeMinutes, 1);

    // Calculate MTTR
    const mttr = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

    return {
      total: errors.length,
      resolved: resolvedCount,
      unresolved: errors.length - resolvedCount,
      byType,
      bySeverity,
      byResolution,
      topErrors,
      errorRate,
      mttr,
    };
  }

  /**
   * Get recent errors
   */
  public async getRecentErrors(limit: number = 100): Promise<ErrorEvent[]> {
    return this.storage.getRecentErrors({ limit });
  }

  /**
   * Mark error as resolved
   */
  public async resolveError(
    errorId: string,
    method: ResolutionMethod,
    details?: string
  ): Promise<void> {
    await this.storage.updateError(errorId, {
      resolved: true,
      resolutionMethod: method,
      resolutionDetails: details,
    });
    this.emit('resolved', { errorId, method, details });
  }

  /**
   * Utilities
   */
  private shouldIgnoreError(message: string): boolean {
    return this.config.ignoredErrors.some(pattern => {
      if (typeof pattern === 'string') {
        return message.includes(pattern);
      }
      return pattern.test(message);
    });
  }

  private detectErrorType(message: string, stack?: string): ErrorType {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('xhr')) {
      return 'network';
    }
    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
      return 'validation';
    }
    if (lowerMessage.includes('security') || lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden')) {
      return 'security';
    }
    if (lowerMessage.includes('performance') || lowerMessage.includes('timeout') || lowerMessage.includes('slow')) {
      return 'performance';
    }
    if (lowerMessage.includes('database') || lowerMessage.includes('query') || lowerMessage.includes('connection')) {
      return 'database';
    }

    return 'runtime';
  }

  private calculateSeverity(error: { message?: string; stack?: string } | Error | undefined): ErrorSeverity {
    const message = error instanceof Error ? error.message : (error?.message || '');
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('critical') ||
      lowerMessage.includes('fatal') ||
      lowerMessage.includes('security') ||
      lowerMessage.includes('unauthorized access')
    ) {
      return 'critical';
    }

    if (
      lowerMessage.includes('error') ||
      lowerMessage.includes('failed') ||
      lowerMessage.includes('exception')
    ) {
      return 'high';
    }

    if (
      lowerMessage.includes('warning') ||
      lowerMessage.includes('deprecated')
    ) {
      return 'medium';
    }

    return 'low';
  }

  private detectEnvironment(): 'development' | 'staging' | 'production' {
    if (typeof process !== 'undefined' && process.env.NODE_ENV) {
      if (process.env.NODE_ENV === 'production') return 'production';
      if (process.env.NODE_ENV === 'staging') return 'staging';
    }
    return 'development';
  }

  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateFingerprint(message: string, stack?: string): string {
    // Create a fingerprint for deduplication
    const normalized = message
      .replace(/\d+/g, 'N') // Replace numbers
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID') // Replace UUIDs
      .replace(/https?:\/\/[^\s]+/g, 'URL') // Replace URLs
      .toLowerCase()
      .trim();

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Cleanup and shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
    await this.storage.close();
    this.emit('shutdown');
  }
}

export default ErrorMonitoringSystem;
