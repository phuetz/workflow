/**
 * Log Context
 * Context management for structured logging with trace IDs and correlation
 */

import { v4 as uuidv4 } from 'uuid';

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
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  [key: string]: any;
}

export class LogContext {
  private data: LogContextData;

  constructor(initialContext?: Partial<LogContextData>) {
    this.data = {
      service: 'workflow-platform',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '2.0.0',
      host: process.env.HOSTNAME || require('os').hostname(),
      pid: process.pid,
      ...initialContext,
    };
  }

  /**
   * Get context value
   */
  get(key: keyof LogContextData): any {
    return this.data[key];
  }

  /**
   * Set context value
   */
  set(key: keyof LogContextData, value: any): void {
    this.data[key] = value;
  }

  /**
   * Update multiple context values
   */
  update(context: Partial<LogContextData>): void {
    Object.assign(this.data, context);
  }

  /**
   * Get trace ID
   */
  getTraceId(): string | undefined {
    return this.data.traceId;
  }

  /**
   * Set trace ID
   */
  setTraceId(traceId: string): void {
    this.data.traceId = traceId;
  }

  /**
   * Generate and set new trace ID
   */
  generateTraceId(): string {
    const traceId = uuidv4();
    this.data.traceId = traceId;
    return traceId;
  }

  /**
   * Get span ID
   */
  getSpanId(): string | undefined {
    return this.data.spanId;
  }

  /**
   * Set span ID
   */
  setSpanId(spanId: string): void {
    this.data.spanId = spanId;
  }

  /**
   * Generate and set new span ID
   */
  generateSpanId(): string {
    const spanId = Math.random().toString(16).substring(2, 18);
    this.data.spanId = spanId;
    return spanId;
  }

  /**
   * Get parent span ID
   */
  getParentSpanId(): string | undefined {
    return this.data.parentSpanId;
  }

  /**
   * Set parent span ID
   */
  setParentSpanId(parentSpanId: string): void {
    this.data.parentSpanId = parentSpanId;
  }

  /**
   * Start a new span
   */
  startSpan(): string {
    const newSpanId = this.generateSpanId();

    if (this.data.spanId) {
      this.data.parentSpanId = this.data.spanId;
    }

    this.data.spanId = newSpanId;

    if (!this.data.traceId) {
      this.generateTraceId();
    }

    return newSpanId;
  }

  /**
   * End current span
   */
  endSpan(): void {
    if (this.data.parentSpanId) {
      this.data.spanId = this.data.parentSpanId;
      this.data.parentSpanId = undefined;
    } else {
      this.data.spanId = undefined;
    }
  }

  /**
   * Set user ID
   */
  setUserId(userId: string): void {
    this.data.userId = userId;
  }

  /**
   * Set session ID
   */
  setSessionId(sessionId: string): void {
    this.data.sessionId = sessionId;
  }

  /**
   * Set request ID
   */
  setRequestId(requestId: string): void {
    this.data.requestId = requestId;
  }

  /**
   * Generate and set new request ID
   */
  generateRequestId(): string {
    const requestId = uuidv4();
    this.data.requestId = requestId;
    return requestId;
  }

  /**
   * Set workflow context
   */
  setWorkflowContext(workflowId: string, executionId?: string, nodeId?: string): void {
    this.data.workflowId = workflowId;
    if (executionId) {
      this.data.executionId = executionId;
    }
    if (nodeId) {
      this.data.nodeId = nodeId;
    }
  }

  /**
   * Clear workflow context
   */
  clearWorkflowContext(): void {
    delete this.data.workflowId;
    delete this.data.executionId;
    delete this.data.nodeId;
  }

  /**
   * Create child context
   */
  child(context?: Partial<LogContextData>): LogContext {
    return new LogContext({
      ...this.data,
      ...context,
    });
  }

  /**
   * Clone context
   */
  clone(): LogContext {
    return new LogContext({ ...this.data });
  }

  /**
   * Convert to plain object
   */
  toJSON(): LogContextData {
    return { ...this.data };
  }

  /**
   * Clear all context
   */
  clear(): void {
    this.data = {
      service: this.data.service,
      environment: this.data.environment,
      version: this.data.version,
      host: this.data.host,
      pid: this.data.pid,
    };
  }
}

// Async local storage for request-scoped context
import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

/**
 * Get current context from async local storage
 */
export function getCurrentContext(): LogContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Run function with context
 */
export function runWithContext<T>(context: LogContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Run async function with context
 */
export async function runWithContextAsync<T>(
  context: LogContext,
  fn: () => Promise<T>
): Promise<T> {
  return asyncLocalStorage.run(context, fn);
}
