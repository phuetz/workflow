// Note: Removed circular import from LoggingService to avoid build issues

/**
 * Logger Utility
 * Comprehensive logging system with multiple outputs and levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: any;
  source?: string;
  userId?: string;
  executionId?: string;
  correlationId?: string;
  stack?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  outputs: LogOutput[];
  format: 'json' | 'text' | 'structured';
  includeTimestamp: boolean;
  includeSource: boolean;
  maxBufferSize: number;
}

export interface LogOutput {
  type: 'console' | 'file' | 'remote' | 'memory' | 'custom';
  config?: any;
}

export class Logger {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private outputs: Map<string, (entry: LogEntry) => void> = new Map();

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: LogLevel.INFO,
      outputs: [{ type: 'console' }],
      format: 'text',
      includeTimestamp: true,
      includeSource: false,
      maxBufferSize: 1000,
      ...config
    };

    this.initializeOutputs();
  }

  /**
   * Initialize log outputs
   */
  private initializeOutputs(): void {
    for (const output of this.config.outputs) {
      switch (output.type) {
        case 'console':
          this.outputs.set('console', (entry) => this.logToConsole(entry));
          break;
        case 'memory':
          this.outputs.set('memory', (entry) => this.logToMemory(entry));
          break;
        case 'file':
          this.outputs.set('file', (entry) => this.logToFile(entry, output.config));
          break;
        case 'remote':
          this.outputs.set('remote', (entry) => this.logToRemote(entry, output.config));
          break;
        case 'custom':
          if (output.config?.handler) {
            this.outputs.set('custom', output.config.handler);
          }
          break;
      }
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any, context?: any): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    };
    this.log(LogLevel.ERROR, message, errorContext);
  }

  /**
   * Log fatal message
   */
  fatal(message: string, error?: Error | any, context?: any): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    };
    this.log(LogLevel.FATAL, message, errorContext);
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, context?: any): void {
    // Check if level should be logged
    if (level < this.config.level) {
      return;
    }

    // Create log entry
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context
    };

    // Add source information
    if (this.config.includeSource) {
      entry.source = this.getCallerInfo();
    }

    // Add to buffer
    this.addToBuffer(entry);

    // Send to outputs
    for (const output of Array.from(this.outputs.values())) {
      try {
        output(entry);
      } catch (error) {
        // Fallback to console to avoid circular logging
        console.error('Logger output error:', error);
      }
    }
  }

  /**
   * Get caller information
   */
  private getCallerInfo(): string {
    const error = new Error();
    const stack = error.stack?.split('\n')[4];
    if (stack) {
      const match = stack.match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/);
      if (match) {
        return `${match[1]} (${match[2]}:${match[3]})`;
      }
    }
    return 'unknown';
  }

  /**
   * Add entry to buffer
   */
  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry);
    
    // Trim buffer if too large
    if (this.buffer.length > this.config.maxBufferSize) {
      this.buffer.shift();
    }
  }

  /**
   * Log to console
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = this.config.includeTimestamp
      ? `[${entry.timestamp.toISOString()}] `
      : '';
    
    const levelStr = LogLevel[entry.level];
    const prefix = `${timestamp}[${levelStr}]`;
    
    const message = this.formatMessage(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message);
        break;
      case LogLevel.INFO:
        console.info(prefix, message);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(prefix, message);
        break;
    }
  }

  /**
   * Log to memory buffer
   */
  private logToMemory(entry: LogEntry): void {
    // Already added to buffer in log()
  }

  /**
   * Log to file (mock implementation)
   */
  private logToFile(entry: LogEntry, config: any): void {
    // In a real implementation, this would write to a file
    // For now, just log that we would write to file
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[FILE LOG] Would write to ${config?.path || 'app.log'}`);
    }
  }

  /**
   * Log to remote service (mock implementation)
   */
  private logToRemote(entry: LogEntry, config: any): void {
    // In a real implementation, this would send to a remote logging service
    // For now, just log that we would send remotely
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[REMOTE LOG] Would send to ${config?.endpoint || 'logging service'}`);
    }
  }

  /**
   * Format message based on config
   */
  private formatMessage(entry: LogEntry): string {
    switch (this.config.format) {
      case 'json':
        return JSON.stringify({
          message: entry.message,
          ...entry.context
        });
      
      case 'structured':
        return `${entry.message} ${entry.context ? JSON.stringify(entry.context) : ''}`;
      
      case 'text':
      default:
        if (entry.context) {
          return `${entry.message} - ${JSON.stringify(entry.context)}`;
        }
        return entry.message;
    }
  }

  /**
   * Get buffered logs
   */
  getBuffer(filter?: {
    level?: LogLevel;
    startTime?: Date;
    endTime?: Date;
    contains?: string;
  }): LogEntry[] {
    let logs = [...this.buffer];

    if (filter) {
      if (filter.level !== undefined) {
        logs = logs.filter(log => log.level >= filter.level!);
      }
      
      if (filter.startTime) {
        logs = logs.filter(log => log.timestamp >= filter.startTime!);
      }
      
      if (filter.endTime) {
        logs = logs.filter(log => log.timestamp <= filter.endTime!);
      }
      
      if (filter.contains) {
        logs = logs.filter(log => 
          log.message.includes(filter.contains!) ||
          JSON.stringify(log.context).includes(filter.contains!)
        );
      }
    }

    return logs;
  }

  /**
   * Clear buffer
   */
  clearBuffer(): void {
    this.buffer = [];
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Create child logger with context
   */
  child(context: any): Logger {
    const childLogger = new Logger(this.config);
    const originalLog = childLogger.log.bind(childLogger);
    
    childLogger.log = (level: LogLevel, message: string, additionalContext?: any) => {
      originalLog(level, message, { ...context, ...additionalContext });
    };
    
    return childLogger;
  }

  /**
   * Create a timer for performance logging
   */
  time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`${label} completed`, { duration: `${duration}ms` });
    };
  }

  /**
   * Log performance metrics
   */
  metric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    this.info('Metric', {
      metric: name,
      value,
      unit: unit || 'count',
      tags
    });
  }
}

// Create default logger instance
export const logger = new Logger({
  level: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : LogLevel.INFO,
  format: process.env.LOG_FORMAT as any || 'text',
  outputs: [
    { type: 'console' },
    { type: 'memory' }
  ]
});

// Export convenience functions
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const fatal = logger.fatal.bind(logger);
