/**
 * Extended Logger
 * Advanced logging system with levels, filtering, and real-time streaming
 */

import type {
  LogLevel,
  LogEntry,
  LogFilter,
  LogExportFormat,
  LogContext
} from '../types/debugging';

export class ExtendedLogger {
  private logs: LogEntry[] = [];
  private maxEntries: number;
  private listeners: Set<(entry: LogEntry) => void> = new Set();
  private levelPriority: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4
  };

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Log a message
   */
  log(
    level: LogLevel,
    source: string,
    message: string,
    context: Partial<LogContext> = {},
    metadata?: Record<string, unknown>
  ): LogEntry {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      source,
      message,
      context: this.createLogContext(context),
      metadata
    };

    // Capture stack trace for errors
    if (level === 'ERROR' || level === 'FATAL') {
      entry.stackTrace = new Error().stack;
    }

    this.addEntry(entry);
    return entry;
  }

  /**
   * Debug log
   */
  debug(source: string, message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>): LogEntry {
    return this.log('DEBUG', source, message, context, metadata);
  }

  /**
   * Info log
   */
  info(source: string, message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>): LogEntry {
    return this.log('INFO', source, message, context, metadata);
  }

  /**
   * Warning log
   */
  warn(source: string, message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>): LogEntry {
    return this.log('WARN', source, message, context, metadata);
  }

  /**
   * Error log
   */
  error(source: string, message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>): LogEntry {
    return this.log('ERROR', source, message, context, metadata);
  }

  /**
   * Fatal log
   */
  fatal(source: string, message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>): LogEntry {
    return this.log('FATAL', source, message, context, metadata);
  }

  /**
   * Add log entry
   */
  private addEntry(entry: LogEntry): void {
    this.logs.push(entry);

    // Trim old entries if exceeded max
    if (this.logs.length > this.maxEntries) {
      this.logs = this.logs.slice(-this.maxEntries);
    }

    // Notify listeners
    this.emit(entry);
  }

  /**
   * Get all logs
   */
  getLogs(filter?: LogFilter): LogEntry[] {
    let filtered = [...this.logs];

    if (!filter) return filtered;

    // Filter by levels
    if (filter.levels && filter.levels.length > 0) {
      filtered = filtered.filter(log => filter.levels!.includes(log.level));
    }

    // Filter by sources
    if (filter.sources && filter.sources.length > 0) {
      filtered = filtered.filter(log => filter.sources!.includes(log.source));
    }

    // Filter by time range
    if (filter.startTime) {
      filtered = filtered.filter(log => log.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      filtered = filtered.filter(log => log.timestamp <= filter.endTime!);
    }

    // Filter by search text
    if (filter.searchText) {
      const searchRegex = filter.useRegex
        ? new RegExp(filter.searchText, 'i')
        : null;

      filtered = filtered.filter(log => {
        if (searchRegex) {
          return searchRegex.test(log.message) ||
                 searchRegex.test(log.source) ||
                 (log.stackTrace && searchRegex.test(log.stackTrace));
        } else {
          const searchLower = filter.searchText!.toLowerCase();
          return log.message.toLowerCase().includes(searchLower) ||
                 log.source.toLowerCase().includes(searchLower) ||
                 (log.stackTrace && log.stackTrace.toLowerCase().includes(searchLower));
        }
      });
    }

    return filtered;
  }

  /**
   * Get logs for a specific workflow execution
   */
  getLogsForExecution(executionId: string): LogEntry[] {
    return this.logs.filter(log => log.context.executionId === executionId);
  }

  /**
   * Get logs for a specific workflow
   */
  getLogsForWorkflow(workflowId: string): LogEntry[] {
    return this.logs.filter(log => log.context.workflowId === workflowId);
  }

  /**
   * Get logs for a specific node
   */
  getLogsForNode(nodeId: string): LogEntry[] {
    return this.logs.filter(log => log.context.nodeId === nodeId);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Clear logs for a specific workflow execution
   */
  clearForExecution(executionId: string): void {
    this.logs = this.logs.filter(log => log.context.executionId !== executionId);
  }

  /**
   * Export logs
   */
  export(format: LogExportFormat, filter?: LogFilter): string {
    const logs = this.getLogs(filter);

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);

      case 'csv':
        return this.exportAsCSV(logs);

      case 'txt':
        return this.exportAsText(logs);

      default:
        return '';
    }
  }

  /**
   * Export as CSV
   */
  private exportAsCSV(logs: LogEntry[]): string {
    const headers = ['Timestamp', 'Level', 'Source', 'Message', 'Workflow', 'Execution', 'Node'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.level,
      log.source,
      log.message.replace(/"/g, '""'), // Escape quotes
      log.context.workflowId || '',
      log.context.executionId || '',
      log.context.nodeId || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Export as plain text
   */
  private exportAsText(logs: LogEntry[]): string {
    return logs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      const parts = [
        `[${timestamp}]`,
        `[${log.level}]`,
        `[${log.source}]`,
        log.message
      ];

      if (log.stackTrace) {
        parts.push('\n' + log.stackTrace);
      }

      return parts.join(' ');
    }).join('\n');
  }

  /**
   * Get log statistics
   */
  getStatistics(): LogStatistics {
    const stats: LogStatistics = {
      total: this.logs.length,
      byLevel: {
        DEBUG: 0,
        INFO: 0,
        WARN: 0,
        ERROR: 0,
        FATAL: 0
      },
      topSources: [],
      errorRate: 0,
      recentErrors: []
    };

    // Count by level
    this.logs.forEach(log => {
      stats.byLevel[log.level]++;
    });

    // Calculate error rate
    const errorCount = stats.byLevel.ERROR + stats.byLevel.FATAL;
    stats.errorRate = stats.total > 0 ? (errorCount / stats.total) * 100 : 0;

    // Get recent errors (last 10)
    stats.recentErrors = this.logs
      .filter(log => log.level === 'ERROR' || log.level === 'FATAL')
      .slice(-10)
      .reverse();

    // Get top sources
    const sourceCounts = new Map<string, number>();
    this.logs.forEach(log => {
      sourceCounts.set(log.source, (sourceCounts.get(log.source) || 0) + 1);
    });

    stats.topSources = Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([source, count]) => ({ source, count }));

    return stats;
  }

  /**
   * Create log context
   */
  private createLogContext(partial: Partial<LogContext>): LogContext {
    return {
      workflowId: partial.workflowId || '',
      workflowName: partial.workflowName || '',
      executionId: partial.executionId || '',
      nodeId: partial.nodeId,
      nodeName: partial.nodeName,
      userId: partial.userId,
      sessionId: partial.sessionId
    };
  }

  /**
   * Format log entry for display
   */
  format(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelColor = this.getLevelColor(entry.level);
    return `${timestamp} ${levelColor}[${entry.level}]\x1b[0m [${entry.source}] ${entry.message}`;
  }

  /**
   * Get ANSI color code for log level
   */
  private getLevelColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      DEBUG: '\x1b[90m',   // Gray
      INFO: '\x1b[36m',    // Cyan
      WARN: '\x1b[33m',    // Yellow
      ERROR: '\x1b[31m',   // Red
      FATAL: '\x1b[35m'    // Magenta
    };
    return colors[level] || '';
  }

  /**
   * Add event listener
   */
  on(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit log entry to listeners
   */
  private emit(entry: LogEntry): void {
    this.listeners.forEach(listener => listener(entry));
  }

  /**
   * Set max entries
   */
  setMaxEntries(max: number): void {
    this.maxEntries = max;
    if (this.logs.length > max) {
      this.logs = this.logs.slice(-max);
    }
  }

  /**
   * Get max entries
   */
  getMaxEntries(): number {
    return this.maxEntries;
  }
}

interface LogStatistics {
  total: number;
  byLevel: Record<LogLevel, number>;
  topSources: Array<{ source: string; count: number }>;
  errorRate: number;
  recentErrors: LogEntry[];
}

// Singleton instance
export const extendedLogger = new ExtendedLogger(10000);
