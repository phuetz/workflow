/**
 * Enhanced Logger with Correlation IDs and Distributed Tracing
 * Production-grade structured logging with OpenTelemetry integration
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include custom properties
declare module 'express-serve-static-core' {
  interface Request {
    correlationId?: string;
    requestId?: string;
    user?: {
      id?: string;
      userId?: string;
      [key: string]: any;
    };
  }
}

// Async context storage for correlation IDs
const asyncLocalStorage = new AsyncLocalStorage<Map<string, any>>();

export interface LogContext {
  correlationId?: string;
  requestId?: string;
  userId?: string;
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  [key: string]: any;
}

export interface EnhancedLoggerOptions {
  service: string;
  environment?: string;
  version?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  enableElasticsearch?: boolean;
  elasticsearchUrl?: string;
  logLevel?: string;
  maxFileSize?: number;
  maxFiles?: number;
}

/**
 * Enhanced Logger with correlation tracking
 */
export class EnhancedLogger {
  private logger: winston.Logger;
  private service: string;
  private environment: string;
  private version: string;

  constructor(options: EnhancedLoggerOptions) {
    this.service = options.service;
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.version = options.version || process.env.APP_VERSION || '2.0.0';

    this.logger = this.createLogger(options);
  }

  /**
   * Create Winston logger with multiple transports
   */
  private createLogger(options: EnhancedLoggerOptions): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    if (options.enableConsole !== false) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            winston.format.errors({ stack: true }),
            winston.format.printf(this.consoleFormat.bind(this))
          ),
          handleExceptions: true,
          handleRejections: true,
        })
      );
    }

    // File transports
    if (options.enableFile !== false && this.environment === 'production') {
      // Combined log
      transports.push(
        new winston.transports.File({
          filename: 'logs/app.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          ),
          maxsize: options.maxFileSize || 10485760, // 10MB
          maxFiles: options.maxFiles || 10,
          tailable: true,
        })
      );

      // Error log
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          ),
          maxsize: options.maxFileSize || 10485760,
          maxFiles: options.maxFiles || 10,
          tailable: true,
        })
      );

      // Performance log
      transports.push(
        new winston.transports.File({
          filename: 'logs/performance.log',
          level: 'info',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          maxsize: options.maxFileSize || 5242880, // 5MB
          maxFiles: 5,
          tailable: true,
        })
      );

      // Audit log
      transports.push(
        new winston.transports.File({
          filename: 'logs/audit.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          maxsize: options.maxFileSize || 10485760,
          maxFiles: options.maxFiles || 20,
          tailable: true,
        })
      );
    }

    // Create logger
    return winston.createLogger({
      level: options.logLevel || process.env.LOG_LEVEL || 'info',
      defaultMeta: {
        service: this.service,
        environment: this.environment,
        version: this.version,
        hostname: process.env.HOSTNAME || 'unknown',
        pid: process.pid,
      },
      transports,
      exitOnError: false,
    });
  }

  /**
   * Console format for readable output
   */
  private consoleFormat(info: any): string {
    const { timestamp, level, message, correlationId, requestId, userId, workflowId, executionId, nodeId, traceId, stack, ...meta } = info;

    let log = `${timestamp} [${level}]`;

    // Add correlation context
    const context: string[] = [];
    if (correlationId) context.push(`CID:${correlationId.substring(0, 8)}`);
    if (requestId) context.push(`RID:${requestId.substring(0, 8)}`);
    if (traceId) context.push(`TID:${traceId.substring(0, 8)}`);
    if (userId) context.push(`UID:${userId}`);
    if (workflowId) context.push(`WID:${workflowId.substring(0, 8)}`);
    if (executionId) context.push(`EID:${executionId.substring(0, 8)}`);
    if (nodeId) context.push(`NID:${nodeId.substring(0, 8)}`);

    if (context.length > 0) {
      log += ` [${context.join('|')}]`;
    }

    log += `: ${message}`;

    // Add metadata
    const cleanMeta = this.cleanMeta(meta);
    if (Object.keys(cleanMeta).length > 0) {
      log += ` ${JSON.stringify(cleanMeta)}`;
    }

    // Add stack trace if present
    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  }

  /**
   * Clean metadata from default fields
   */
  private cleanMeta(meta: any): any {
    const { service, environment, version, hostname, pid, timestamp, level, message, ...clean } = meta;
    return clean;
  }

  /**
   * Get current context from async storage
   */
  private getContext(): LogContext {
    const store = asyncLocalStorage.getStore();
    if (store) {
      return Object.fromEntries(store.entries());
    }
    return {};
  }

  /**
   * Merge context with provided metadata
   */
  private mergeContext(meta: any = {}): any {
    const context = this.getContext();
    return { ...context, ...meta };
  }

  /**
   * Log debug message
   */
  debug(message: string, meta: any = {}): void {
    this.logger.debug(message, this.mergeContext(meta));
  }

  /**
   * Log info message
   */
  info(message: string, meta: any = {}): void {
    this.logger.info(message, this.mergeContext(meta));
  }

  /**
   * Log warning message
   */
  warn(message: string, meta: any = {}): void {
    this.logger.warn(message, this.mergeContext(meta));
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any, meta: any = {}): void {
    const errorMeta = { ...this.mergeContext(meta) };

    if (error instanceof Error) {
      errorMeta.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
      errorMeta.stack = error.stack;
    } else if (error) {
      errorMeta.error = error;
    }

    this.logger.error(message, errorMeta);
  }

  /**
   * Log fatal message
   */
  fatal(message: string, error?: Error | any, meta: any = {}): void {
    this.error(`FATAL: ${message}`, error, { ...meta, severity: 'fatal' });
  }

  /**
   * Log audit event
   */
  audit(action: string, meta: any = {}): void {
    this.logger.info(`AUDIT: ${action}`, {
      ...this.mergeContext(meta),
      type: 'audit',
      action,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log metric
   */
  metric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    this.logger.info(`METRIC: ${name}`, {
      ...this.mergeContext(tags),
      type: 'metric',
      metric: name,
      value,
      unit: unit || 'count',
      timestamp: Date.now(),
    });
  }

  /**
   * Log performance timing
   */
  performance(operation: string, durationMs: number, meta: any = {}): void {
    this.logger.info(`PERF: ${operation}`, {
      ...this.mergeContext(meta),
      type: 'performance',
      operation,
      duration_ms: durationMs,
      duration_seconds: (durationMs / 1000).toFixed(3),
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): EnhancedLogger {
    const childLogger = Object.create(this);
    const originalMergeContext = this.mergeContext.bind(this);

    childLogger.mergeContext = function (meta: any = {}) {
      return { ...originalMergeContext(meta), ...context };
    };

    return childLogger;
  }

  /**
   * Run function with correlation context
   */
  async withContext<T>(context: LogContext, fn: () => Promise<T>): Promise<T> {
    const store = new Map(Object.entries(context));

    // Ensure correlation ID exists
    if (!store.has('correlationId')) {
      store.set('correlationId', uuidv4());
    }

    return asyncLocalStorage.run(store, fn);
  }

  /**
   * Set context value
   */
  setContext(key: string, value: any): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.set(key, value);
    }
  }

  /**
   * Get context value
   */
  getContextValue(key: string): any {
    const store = asyncLocalStorage.getStore();
    return store?.get(key);
  }

  /**
   * Create a timer for performance measurement
   */
  startTimer(label: string, meta: any = {}): () => void {
    const start = Date.now();
    const context = this.getContext();

    return () => {
      const duration = Date.now() - start;
      this.performance(label, duration, { ...meta, ...context });
      return duration;
    };
  }

  /**
   * Time an async operation
   */
  async timeAsync<T>(label: string, operation: () => Promise<T>, meta: any = {}): Promise<T> {
    const endTimer = this.startTimer(label, meta);

    try {
      const result = await operation();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      this.error(`Operation failed: ${label}`, error, meta);
      throw error;
    }
  }

  /**
   * Express middleware for request logging with correlation ID
   */
  requestMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Extract headers (handle string | string[] types)
      const getHeader = (name: string): string => {
        const value = req.headers[name];
        return Array.isArray(value) ? value[0] : (value || '');
      };

      const correlationId = getHeader('x-correlation-id') || uuidv4();
      const requestId = getHeader('x-request-id') || uuidv4();
      const traceId = getHeader('x-trace-id') || undefined;
      const userId = req.user?.id || req.user?.userId;

      // Set correlation headers
      res.setHeader('x-correlation-id', correlationId);
      res.setHeader('x-request-id', requestId);

      // Attach to request
      req.correlationId = correlationId;
      req.requestId = requestId;

      const context: LogContext = {
        correlationId,
        requestId,
        userId,
        traceId,
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
      };

      asyncLocalStorage.run(new Map(Object.entries(context)), () => {
        const start = Date.now();

        this.info('Request started', {
          method: req.method,
          url: req.url,
          query: req.query,
          headers: this.sanitizeHeaders(req.headers),
        });

        // Log response
        res.on('finish', () => {
          const duration = Date.now() - start;

          const logData = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration_ms: duration,
          };

          if (res.statusCode >= 500) {
            this.error('Request failed', undefined, logData);
          } else if (res.statusCode >= 400) {
            this.warn('Request client error', logData);
          } else {
            this.info('Request completed', logData);
          }

          // Log performance metric
          this.metric('http_request_duration_ms', duration, 'milliseconds', {
            method: req.method,
            route: req.route?.path || req.url,
            status: res.statusCode.toString(),
          });
        });

        next();
      });
    };
  }

  /**
   * Sanitize sensitive headers
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Error handler middleware
   */
  errorMiddleware() {
    return (err: any, req: any, res: any, next: any) => {
      this.error('Request error', err, {
        method: req.method,
        url: req.url,
        status: err.status || 500,
      });

      next(err);
    };
  }

  /**
   * Flush all logs
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.end(() => {
        resolve();
      });
    });
  }
}

// Export singleton instance
let defaultLogger: EnhancedLogger;

export function getLogger(service?: string): EnhancedLogger {
  if (!defaultLogger) {
    defaultLogger = new EnhancedLogger({
      service: service || 'workflow-platform',
      enableConsole: true,
      enableFile: process.env.NODE_ENV === 'production',
      logLevel: process.env.LOG_LEVEL || 'info',
    });
  }
  return defaultLogger;
}

export default getLogger();
