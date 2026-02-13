/**
 * Execution Logger
 * Provides logging functionality for workflow executions
 * PROJET SAUVÉ - Phase 5.3: Execution History & Logs
 */

import { logger as systemLogger } from '../services/SimpleLogger';
import { getExecutionStorage, ExecutionStorage } from './ExecutionStorage';
import type {
  ExecutionLog,
  LogLevel,
  WorkflowExecution,
  NodeExecution,
  ExecutionContext
} from '../types/execution';

export interface LoggerOptions {
  executionId: string;
  nodeExecutionId?: string;
  source?: string;
  category?: string;
}

export class ExecutionLogger {
  private storage: ExecutionStorage;
  private executionId: string;
  private nodeExecutionId?: string;
  private source?: string;
  private category?: string;
  private logBuffer: ExecutionLog[] = [];
  private bufferSize = 100;
  private flushInterval = 5000; // 5 seconds
  private flushTimer?: ReturnType<typeof setTimeout>;

  constructor(options: LoggerOptions) {
    this.storage = getExecutionStorage();
    this.executionId = options.executionId;
    this.nodeExecutionId = options.nodeExecutionId;
    this.source = options.source;
    this.category = options.category;

    // Start auto-flush
    this.startAutoFlush();
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: Record<string, any>): void {
    this.log('debug', message, data);
  }

  /**
   * Log info message
   */
  info(message: string, data?: Record<string, any>): void {
    this.log('info', message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: Record<string, any>): void {
    this.log('warn', message, data);
  }

  /**
   * Log error message
   */
  error(message: string, data?: Record<string, any>): void {
    this.log('error', message, data);
  }

  /**
   * Log fatal error message
   */
  fatal(message: string, data?: Record<string, any>): void {
    this.log('fatal', message, data);
  }

  /**
   * Log message
   */
  private log(level: LogLevel, message: string, data?: Record<string, any>): void {
    const logEntry: ExecutionLog = {
      id: '', // Will be set by storage
      executionId: this.executionId,
      nodeExecutionId: this.nodeExecutionId,
      level,
      message,
      timestamp: new Date(),
      data: this.sanitizeData(data),
      source: this.source,
      category: this.category
    };

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Also log to system logger
    systemLogger[level](`[Execution ${this.executionId}] ${message}`, data);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  /**
   * Log execution start
   */
  logExecutionStart(execution: WorkflowExecution): void {
    this.info(`Workflow execution started: ${execution.workflowName}`, {
      workflowId: execution.workflowId,
      mode: execution.mode,
      triggeredBy: execution.triggeredBy
    });
  }

  /**
   * Log execution completion
   */
  logExecutionComplete(execution: WorkflowExecution): void {
    this.info(`Workflow execution completed: ${execution.workflowName}`, {
      status: execution.status,
      duration: execution.duration,
      totalNodes: execution.nodeExecutions.length
    });
  }

  /**
   * Log execution error
   */
  logExecutionError(execution: WorkflowExecution, error: Error): void {
    this.error(`Workflow execution failed: ${execution.workflowName}`, {
      error: error.message,
      stack: error.stack,
      status: execution.status
    });
  }

  /**
   * Log node execution start
   */
  logNodeStart(nodeExecution: NodeExecution): void {
    this.info(`Node execution started: ${nodeExecution.nodeName}`, {
      nodeId: nodeExecution.nodeId,
      nodeType: nodeExecution.nodeType
    });
  }

  /**
   * Log node execution completion
   */
  logNodeComplete(nodeExecution: NodeExecution): void {
    this.info(`Node execution completed: ${nodeExecution.nodeName}`, {
      status: nodeExecution.status,
      duration: nodeExecution.duration
    });
  }

  /**
   * Log node execution error
   */
  logNodeError(nodeExecution: NodeExecution, error: Error): void {
    this.error(`Node execution failed: ${nodeExecution.nodeName}`, {
      error: error.message,
      stack: error.stack,
      nodeType: nodeExecution.nodeType,
      retryCount: nodeExecution.retryCount
    });
  }

  /**
   * Log HTTP request
   */
  logHttpRequest(method: string, url: string, options?: Record<string, any>): void {
    this.debug(`HTTP ${method} request to ${url}`, {
      method,
      url,
      ...options
    });
  }

  /**
   * Log HTTP response
   */
  logHttpResponse(status: number, url: string, duration: number): void {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'debug';
    this[level](`HTTP response ${status} from ${url}`, {
      status,
      url,
      duration
    });
  }

  /**
   * Log data transformation
   */
  logDataTransform(inputSize: number, outputSize: number, operation: string): void {
    this.debug(`Data transformation: ${operation}`, {
      operation,
      inputSize,
      outputSize,
      reduction: inputSize - outputSize
    });
  }

  /**
   * Log retry attempt
   */
  logRetry(attempt: number, maxAttempts: number, reason?: string): void {
    this.warn(`Retry attempt ${attempt}/${maxAttempts}`, {
      attempt,
      maxAttempts,
      reason
    });
  }

  /**
   * Log credential usage
   */
  logCredentialUsage(credentialName: string, action: string): void {
    this.debug(`Using credential: ${credentialName} for ${action}`, {
      credentialName,
      action
    });
  }

  /**
   * Log variable access
   */
  logVariableAccess(variableName: string, action: 'read' | 'write'): void {
    this.debug(`Variable ${action}: ${variableName}`, {
      variableName,
      action
    });
  }

  /**
   * Log workflow transition
   */
  logTransition(fromNode: string, toNode: string, condition?: string): void {
    this.debug(`Transition: ${fromNode} → ${toNode}`, {
      fromNode,
      toNode,
      condition
    });
  }

  /**
   * Log performance metric
   */
  logPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.debug(`Performance: ${metric} = ${value}${unit}`, {
      metric,
      value,
      unit
    });
  }

  /**
   * Log with context
   */
  logWithContext(level: LogLevel, message: string, context: ExecutionContext): void {
    this.log(level, message, {
      executionId: context.executionId,
      workflowId: context.workflowId,
      userId: context.userId,
      mode: context.mode
    });
  }

  /**
   * Flush log buffer to storage
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // Add all logs to storage
      for (const log of logsToFlush) {
        await this.storage.addLog(log);
      }

      systemLogger.debug(`Flushed ${logsToFlush.length} logs to storage`);
    } catch (error) {
      systemLogger.error('Failed to flush logs:', error);
      // Re-add to buffer if flush failed
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Stop auto-flush timer
   */
  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Sanitize data before logging
   */
  private sanitizeData(data?: Record<string, any>): Record<string, any> | undefined {
    if (!data) {
      return undefined;
    }

    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'api_key', 'authorization'];

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

      if (isSensitive && typeof value === 'string') {
        sanitized[key] = '***REDACTED***';
      } else if (value instanceof Error) {
        sanitized[key] = {
          message: value.message,
          stack: value.stack
        };
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value as Record<string, any>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Create child logger for node execution
   */
  createNodeLogger(nodeExecutionId: string, nodeName: string): ExecutionLogger {
    return new ExecutionLogger({
      executionId: this.executionId,
      nodeExecutionId,
      source: nodeName,
      category: this.category
    });
  }

  /**
   * Get buffer size
   */
  getBufferSize(): number {
    return this.logBuffer.length;
  }

  /**
   * Clear buffer
   */
  clearBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * Cleanup and flush on destroy
   */
  async destroy(): Promise<void> {
    this.stopAutoFlush();
    await this.flush();
  }
}

/**
 * Create execution logger
 */
export function createExecutionLogger(options: LoggerOptions): ExecutionLogger {
  return new ExecutionLogger(options);
}
