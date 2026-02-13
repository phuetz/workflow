/**
 * Centralized Logging Service
 * Provides structured logging with levels, context, and various output targets
 */

import { intervalManager } from '../utils/intervalManager';
import { logger } from '../utils/logger';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  error?: Error;
  stack?: string;
  userId?: string;
  sessionId?: string;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  enableLocalStorage: boolean;
  maxLocalStorageEntries: number;
  remoteEndpoint?: string;
  includeStackTrace: boolean;
  sanitizeData: boolean;
}

export class LoggingService {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private remoteQueue: LogEntry[] = [];
  private isRemoteSending = false;
  private sessionId: string | null = null;
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4
  };

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      enableConsole: process.env.NODE_ENV !== 'production',
      enableRemote: process.env.NODE_ENV === 'production',
      enableLocalStorage: true,
      maxLocalStorageEntries: 1000,
      includeStackTrace: process.env.NODE_ENV !== 'production',
      sanitizeData: true,
      ...config
    };

    // Load existing logs from localStorage
    this.loadLogsFromStorage();

    // Set up periodic remote sync if enabled
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      intervalManager.create(
        'logging_remote_sync',
        () => this.flushRemoteQueue(),
        30000, // Every 30 seconds
        'logging'
      );
    }

    // Handle uncaught errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('Uncaught error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled promise rejection', {
          reason: event.reason
        });
      });
    }
  }

  // Main logging methods
  debug(message: string, data?: unknown, context?: string): void {
    this.log('debug', message, data, context);
  }

  info(message: string, data?: unknown, context?: string): void {
    this.log('info', message, data, context);
  }

  warn(message: string, data?: unknown, context?: string): void {
    this.log('warn', message, data, context);
  }

  error(message: string, data?: unknown, context?: string): void {
    this.log('error', message, data, context);
  }

  fatal(message: string, data?: unknown, context?: string): void {
    this.log('fatal', message, data, context);
  }

  // Core logging method
  private log(level: LogLevel, message: string, data?: unknown, context?: string): void {
    // Check if this log level should be recorded
    if (this.logLevels[level] < this.logLevels[this.config.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      data: this.config.sanitizeData ? this.sanitizeData(data) : data,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId()
    };

    // Add stack trace for errors
    if ((level === 'error' || level === 'fatal') && this.config.includeStackTrace) {
      entry.stack = new Error().stack;
    }

    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > 10000) {
      this.logBuffer.shift(); // Remove oldest entry
    }

    // Output to various targets
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    if (this.config.enableLocalStorage) {
      this.logToLocalStorage(entry);
    }

    if (this.config.enableRemote) {
      this.queueForRemote(entry);
    }

    // Emit event for log listeners
    this.emitLogEvent(entry);
  }

  // Console output with proper formatting
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]${entry.context ? ` [${entry.context}]` : ''}`;
    const style = this.getConsoleStyle(entry.level);

    // Use appropriate console method
    const consoleMethod = entry.level === 'error' || entry.level === 'fatal' ? 'error' :
                         entry.level === 'warn' ? 'warn' :
                         entry.level === 'info' ? 'info' : 'log';

    if (entry.data) {
      console[consoleMethod](`%c${prefix} ${entry.message}`, style, entry.data);
    } else {
      console[consoleMethod](`%c${prefix} ${entry.message}`, style);
    }

    if (entry.stack) {
      console[consoleMethod](entry.stack);
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      debug: 'color: #gray',
      info: 'color: #2196F3',
      warn: 'color: #FF9800; font-weight: bold',
      error: 'color: #F44336; font-weight: bold',
      fatal: 'color: #F44336; font-weight: bold; background: #FFEBEE; padding: 2px 4px'
    };
    return styles[level];
  }

  // Local storage persistence
  private logToLocalStorage(entry: LogEntry): void {
    try {
      const key = 'app_logs';
      const existingLogs = this.getLogsFromStorage();
      existingLogs.push(entry);

      // Keep only recent logs
      if (existingLogs.length > this.config.maxLocalStorageEntries) {
        existingLogs.splice(0, existingLogs.length - this.config.maxLocalStorageEntries);
      }

      localStorage.setItem(key, JSON.stringify(existingLogs));
    } catch {
      // Fail silently if localStorage is full or unavailable
    }
  }

  private loadLogsFromStorage(): void {
    try {
      const logs = this.getLogsFromStorage();
      this.logBuffer = logs.map(log => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }));
    } catch {
      // Fail silently
    }
  }

  private getLogsFromStorage(): LogEntry[] {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('app_logs') : null;
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Remote logging
  private queueForRemote(entry: LogEntry): void {
    if (!this.config.remoteEndpoint) return;

    this.remoteQueue.push(entry);

    // Send immediately for critical errors
    if (entry.level === 'error' || entry.level === 'fatal') {
      this.flushRemoteQueue();
    }
  }

  private async flushRemoteQueue(): Promise<void> {
    if (this.isRemoteSending || this.remoteQueue.length === 0 || !this.config.remoteEndpoint) {
      return;
    }

    this.isRemoteSending = true;
    const logsToSend = [...this.remoteQueue];
    this.remoteQueue = [];

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          logs: logsToSend,
          environment: process.env.NODE_ENV,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        })
      });
    } catch {
      // Re-queue failed logs
      this.remoteQueue.unshift(...logsToSend);
    } finally {
      this.isRemoteSending = false;
    }
  }

  // Data sanitization
  private sanitizeData(data: unknown): unknown {
    if (!data) return data;

    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential', 'api_key', 'apikey'];

    if (typeof data === 'string') {
      // Check if it looks like a credential
      if (data.length > 20 && /^[A-Za-z0-9+/=_-]+$/.test(data)) {
        return '[REDACTED]';
      }
      return data;
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = Array.isArray(data) ? [] : {};

      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const lowerKey = key.toLowerCase();
          if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
            (sanitized as Record<string, unknown>)[key] = '[REDACTED]';
          } else {
            (sanitized as Record<string, unknown>)[key] = this.sanitizeData((data as Record<string, unknown>)[key]);
          }
        }
      }

      return sanitized;
    }

    return data;
  }

  // Helper methods
  private getCurrentUserId(): string | undefined {
    try {
      const user = typeof localStorage !== 'undefined' ? localStorage.getItem('current_user') : null;
      return user ? JSON.parse(user).id : undefined;
    } catch {
      return undefined;
    }
  }

  private getSessionId(): string {
    if (!this.sessionId) {
      // Try to load from sessionStorage (browser only)
      if (typeof sessionStorage !== 'undefined') {
        try {
          const stored = sessionStorage.getItem('session_id');
          if (stored) {
            this.sessionId = stored;
            return this.sessionId;
          }
        } catch {
          // sessionStorage might be unavailable
        }
      }

      // Generate new session ID
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store in sessionStorage if available (browser)
      if (typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.setItem('session_id', this.sessionId);
        } catch {
          // Fail silently if sessionStorage is unavailable
        }
      }
    }
    return this.sessionId;
  }

  // Event emission for log listeners
  private emitLogEvent(entry: LogEntry): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-log', { detail: entry }));
    }
  }

  // Public methods for log management
  getLogs(filter?: {
    level?: LogLevel;
    context?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): LogEntry[] {
    let logs = [...this.logBuffer];

    if (filter) {
      if (filter.level) {
        logs = logs.filter(log => log.level === filter.level);
      }
      if (filter.context) {
        logs = logs.filter(log => log.context === filter.context);
      }
      if (filter.startDate) {
        logs = logs.filter(log => log.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        logs = logs.filter(log => log.timestamp <= filter.endDate!);
      }
      if (filter.limit) {
        logs = logs.slice(-filter.limit);
      }
    }

    return logs;
  }

  clearLogs(): void {
    this.logBuffer = [];
    this.remoteQueue = [];
    try {
      localStorage.removeItem('app_logs');
    } catch {
      // Ignore errors
    }
  }

  exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }

  // Configuration updates
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Cleanup resources and stop intervals
   */
  destroy(): void {
    // Stop sync interval using interval manager
    intervalManager.clear('logging_remote_sync');
    
    // Flush remaining logs before shutdown
    if (this.remoteQueue.length > 0) {
      this.flushRemoteQueue();
    }
    
    // Clear buffers
    this.logBuffer = [];
    this.remoteQueue = [];
    this.isRemoteSending = false;
    
    // Note: Can't use logger here as we're destroying it
    logger.debug('LoggingService destroyed and cleaned up');
  }

  // Performance monitoring
  startTimer(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.debug(`Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` }, 'performance');
    };
  }

  // Structured logging helpers
  logApiCall(method: string, url: string, status?: number, duration?: number): void {
    this.info('API Call', {
      method,
      url,
      status,
      duration: duration ? `${duration}ms` : undefined
    }, 'api');
  }

  logUserAction(action: string, details?: unknown): void {
    this.info('User Action', {
      action,
      ...details
    }, 'user-action');
  }

  logStateChange(component: string, change: unknown): void {
    this.debug('State Change', {
      component,
      change
    }, 'state');
  }
}

// Create singleton instance
export const logger = new LoggingService({
  enableConsole: process.env.NODE_ENV !== 'production',
  enableRemote: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.REACT_APP_LOG_ENDPOINT
});

// Convenience exports
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const fatal = logger.fatal.bind(logger);