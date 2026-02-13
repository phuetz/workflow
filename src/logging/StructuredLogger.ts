/**
 * Structured Logger
 * JSON structured logging with standard fields and context management
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { LogContext } from './LogContext';
import { StreamedLog } from './LogStreamer';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface StructuredLogOptions {
  context?: Partial<LogContextData>;
  metadata?: Record<string, any>;
  error?: Error | ErrorLike;
  performance?: PerformanceData;
  user?: UserData;
  trace?: TraceData;
  category?: string;
}

export interface LogContextData {
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

export interface ErrorLike {
  name?: string;
  message: string;
  stack?: string;
  code?: string;
  [key: string]: any;
}

export interface PerformanceData {
  duration?: number;
  memory?: number;
  cpu?: number;
  custom?: Record<string, number>;
}

export interface UserData {
  id?: string;
  username?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
}

export interface TraceData {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  flags?: number;
}

export class StructuredLogger extends EventEmitter {
  private context: LogContext;
  private minLevel: LogLevel;
  private levelPriority: Record<LogLevel, number> = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5,
  };

  constructor(context?: Partial<LogContextData>, minLevel: LogLevel = 'info') {
    super();
    this.context = new LogContext(context);
    this.minLevel = minLevel;
  }

  /**
   * Log trace message
   */
  trace(message: string, options?: StructuredLogOptions): StreamedLog | null {
    return this.log('trace', message, options);
  }

  /**
   * Log debug message
   */
  debug(message: string, options?: StructuredLogOptions): StreamedLog | null {
    return this.log('debug', message, options);
  }

  /**
   * Log info message
   */
  info(message: string, options?: StructuredLogOptions): StreamedLog | null {
    return this.log('info', message, options);
  }

  /**
   * Log warning message
   */
  warn(message: string, options?: StructuredLogOptions): StreamedLog | null {
    return this.log('warn', message, options);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | ErrorLike, options?: StructuredLogOptions): StreamedLog | null {
    return this.log('error', message, {
      ...options,
      error: error || options?.error,
    });
  }

  /**
   * Log fatal message
   */
  fatal(message: string, error?: Error | ErrorLike, options?: StructuredLogOptions): StreamedLog | null {
    return this.log('fatal', message, {
      ...options,
      error: error || options?.error,
    });
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, options?: StructuredLogOptions): StreamedLog | null {
    // Check if level should be logged
    if (this.levelPriority[level] < this.levelPriority[this.minLevel]) {
      return null;
    }

    // Build log entry
    const log: StreamedLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      level,
      message,
      category: options?.category,
      context: this.buildContext(options?.context),
      metadata: options?.metadata,
    };

    // Add trace information
    if (options?.trace) {
      log.trace = options.trace;
    } else if (this.context.getTraceId()) {
      log.trace = {
        traceId: this.context.getTraceId()!,
        spanId: this.context.getSpanId() || this.generateSpanId(),
        parentSpanId: this.context.getParentSpanId(),
      };
    }

    // Add error information
    if (options?.error) {
      log.error = this.extractError(options.error);
    }

    // Add performance metrics
    if (options?.performance) {
      log.performance = options.performance;
    }

    // Add user information
    if (options?.user) {
      log.user = options.user;
    }

    this.emit('log', log);
    return log;
  }

  /**
   * Build context
   */
  private buildContext(partial?: Partial<LogContextData>): any {
    return {
      ...this.context.toJSON(),
      ...partial,
    };
  }

  /**
   * Extract error information
   */
  private extractError(error: Error | ErrorLike): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').map(line => line.trim()),
        code: (error as any).code,
      };
    }

    return {
      name: error.name || 'Error',
      message: error.message,
      stack: error.stack?.split('\n').map(line => line.trim()),
      code: error.code,
    };
  }

  /**
   * Create child logger with additional context
   */
  child(context: Partial<LogContextData>): StructuredLogger {
    const childContext = this.context.child(context);
    const childLogger = new StructuredLogger(childContext.toJSON(), this.minLevel);

    // Forward events to parent
    childLogger.on('log', (log) => {
      this.emit('log', log);
    });

    return childLogger;
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.minLevel;
  }

  /**
   * Update context
   */
  updateContext(context: Partial<LogContextData>): void {
    this.context.update(context);
  }

  /**
   * Start timer for performance logging
   */
  startTimer(label: string): () => void {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    return () => {
      const duration = Date.now() - startTime;
      const memory = process.memoryUsage().heapUsed - startMemory;

      this.info(`${label} completed`, {
        performance: {
          duration,
          memory,
        },
      });
    };
  }

  /**
   * Log metric
   */
  metric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    this.info('Metric', {
      metadata: {
        metric: {
          name,
          value,
          unit: unit || 'count',
          tags,
        },
      },
    });
  }

  /**
   * Log HTTP request
   */
  httpRequest(method: string, url: string, statusCode: number, duration: number, options?: {
    userId?: string;
    requestId?: string;
    userAgent?: string;
    ip?: string;
  }): void {
    this.info(`HTTP ${method} ${url}`, {
      metadata: {
        http: {
          method,
          url,
          statusCode,
          duration,
        },
      },
      context: {
        userId: options?.userId,
        requestId: options?.requestId,
      },
      user: {
        ip: options?.ip,
        userAgent: options?.userAgent,
      },
      performance: {
        duration,
      },
    });
  }

  /**
   * Log workflow execution
   */
  workflowExecution(
    workflowId: string,
    executionId: string,
    status: 'started' | 'completed' | 'failed',
    options?: {
      nodeId?: string;
      duration?: number;
      error?: Error;
    }
  ): void {
    const level = status === 'failed' ? 'error' : 'info';
    const message = `Workflow ${status}: ${workflowId}`;

    this.log(level, message, {
      context: {
        workflowId,
        executionId,
        nodeId: options?.nodeId,
      },
      performance: options?.duration
        ? { duration: options.duration }
        : undefined,
      error: options?.error,
      category: 'workflow',
    });
  }

  /**
   * Log database query
   */
  dbQuery(query: string, duration: number, options?: {
    database?: string;
    table?: string;
    rowCount?: number;
  }): void {
    this.debug('Database query', {
      metadata: {
        db: {
          query,
          database: options?.database,
          table: options?.table,
          rowCount: options?.rowCount,
        },
      },
      performance: {
        duration,
      },
      category: 'database',
    });
  }

  /**
   * Log API call
   */
  apiCall(service: string, endpoint: string, duration: number, options?: {
    statusCode?: number;
    error?: Error;
  }): void {
    const level = options?.error ? 'error' : 'info';
    const message = `API call to ${service}: ${endpoint}`;

    this.log(level, message, {
      metadata: {
        api: {
          service,
          endpoint,
          statusCode: options?.statusCode,
        },
      },
      performance: {
        duration,
      },
      error: options?.error,
      category: 'integration',
    });
  }

  /**
   * Generate span ID
   */
  private generateSpanId(): string {
    return Math.random().toString(16).substring(2, 18);
  }
}

// Create default logger instance
export const structuredLogger = new StructuredLogger({
  service: 'workflow-platform',
  environment: process.env.NODE_ENV || 'development',
  version: process.env.APP_VERSION || '2.0.0',
  host: process.env.HOSTNAME || 'localhost',
  pid: process.pid,
});
