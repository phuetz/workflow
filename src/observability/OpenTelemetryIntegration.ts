/**
 * OpenTelemetry Integration
 * Implements OpenTelemetry tracing, metrics, and logging
 */

import { randomUUID } from 'crypto';
import { logger } from '../services/SimpleLogger';
import {
  OTelSpan,
  DistributedTrace,
  ExecutionId,
  NodeId
} from '../types/lineage';

/**
 * OpenTelemetry configuration
 */
export interface OTelConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  exporterEndpoint?: string;
  samplingRate: number;
  enableMetrics: boolean;
  enableLogs: boolean;
  enableTraces: boolean;
}

/**
 * Span attributes
 */
export interface SpanAttributes {
  [key: string]: string | number | boolean;
}

/**
 * Metric point
 */
export interface MetricPoint {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  attributes: Record<string, string | number>;
}

/**
 * Log record
 */
export interface LogRecord {
  timestamp: string;
  severityText: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  severityNumber: number;
  body: string;
  attributes: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
}

/**
 * OpenTelemetry Integration Service
 */
export class OpenTelemetryService {
  private config: OTelConfig;
  private activeSpans = new Map<string, OTelSpan>();
  private completedTraces = new Map<string, DistributedTrace>();
  private metrics: MetricPoint[] = [];
  private logs: LogRecord[] = [];

  // Current trace context
  private currentTraceId: string | null = null;
  private currentSpanId: string | null = null;

  constructor(config: Partial<OTelConfig> = {}) {
    this.config = {
      serviceName: 'workflow-automation',
      serviceVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      samplingRate: 1.0, // 100% sampling by default
      enableMetrics: true,
      enableLogs: true,
      enableTraces: true,
      ...config
    };

    logger.info('OpenTelemetry service initialized', {
      serviceName: this.config.serviceName,
      environment: this.config.environment
    });
  }

  /**
   * Start a new trace
   */
  startTrace(
    workflowId: string,
    executionId: ExecutionId
  ): string {
    if (!this.config.enableTraces || !this.shouldSample()) {
      return 'no-trace';
    }

    const traceId = this.generateTraceId();
    this.currentTraceId = traceId;

    const trace: DistributedTrace = {
      traceId,
      workflowId,
      executionId,
      timestamp: new Date().toISOString(),
      spans: new Map(),
      metadata: {
        serviceName: this.config.serviceName,
        serviceVersion: this.config.serviceVersion,
        environment: this.config.environment,
        totalDuration: 0,
        spanCount: 0
      },
      rootSpan: ''
    };

    this.completedTraces.set(traceId, trace);

    logger.debug('Started trace', { traceId, workflowId, executionId });

    return traceId;
  }

  /**
   * End current trace
   */
  endTrace(traceId: string): DistributedTrace | null {
    const trace = this.completedTraces.get(traceId);
    if (!trace) return null;

    // Calculate total duration
    let totalDuration = 0;
    let rootSpan: OTelSpan | null = null;

    for (const span of trace.spans.values()) {
      if (span.duration) {
        totalDuration = Math.max(totalDuration, span.duration);
      }
      if (!span.parentSpanId) {
        rootSpan = span;
      }
    }

    trace.metadata.totalDuration = totalDuration;
    trace.metadata.spanCount = trace.spans.size;
    trace.rootSpan = rootSpan?.spanId || '';

    this.currentTraceId = null;
    this.currentSpanId = null;

    logger.debug('Ended trace', {
      traceId,
      totalDuration,
      spanCount: trace.spans.size
    });

    return trace;
  }

  /**
   * Start a new span
   */
  startSpan(
    name: string,
    kind: OTelSpan['kind'] = 'INTERNAL',
    attributes: SpanAttributes = {}
  ): string {
    if (!this.config.enableTraces || !this.currentTraceId) {
      return 'no-span';
    }

    const spanId = this.generateSpanId();
    const span: OTelSpan = {
      spanId,
      traceId: this.currentTraceId,
      parentSpanId: this.currentSpanId || undefined,
      name,
      kind,
      startTime: new Date().toISOString(),
      attributes: {
        'service.name': this.config.serviceName,
        'service.version': this.config.serviceVersion,
        'deployment.environment': this.config.environment,
        ...attributes
      },
      events: [],
      status: {
        code: 'UNSET'
      }
    };

    this.activeSpans.set(spanId, span);

    // Add to trace
    const trace = this.completedTraces.get(this.currentTraceId);
    if (trace) {
      trace.spans.set(spanId, span);
      if (!trace.rootSpan) {
        trace.rootSpan = spanId;
      }
    }

    // Set as current span for nesting
    this.currentSpanId = spanId;

    logger.debug('Started span', { spanId, name, traceId: this.currentTraceId });

    return spanId;
  }

  /**
   * End a span
   */
  endSpan(
    spanId: string,
    status: 'OK' | 'ERROR' = 'OK',
    statusMessage?: string
  ): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.endTime = new Date().toISOString();
    span.duration = new Date(span.endTime).getTime() - new Date(span.startTime).getTime();
    span.status = {
      code: status,
      message: statusMessage
    };

    this.activeSpans.delete(spanId);

    // Reset current span to parent
    if (this.currentSpanId === spanId) {
      this.currentSpanId = span.parentSpanId || null;
    }

    logger.debug('Ended span', {
      spanId,
      duration: span.duration,
      status
    });
  }

  /**
   * Add event to current span
   */
  addSpanEvent(
    spanId: string,
    eventName: string,
    attributes?: Record<string, unknown>
  ): void {
    const span = this.activeSpans.get(spanId) ||
                 this.findSpanInTraces(spanId);

    if (span) {
      span.events.push({
        timestamp: new Date().toISOString(),
        name: eventName,
        attributes
      });
    }
  }

  /**
   * Set span attributes
   */
  setSpanAttributes(spanId: string, attributes: SpanAttributes): void {
    const span = this.activeSpans.get(spanId) ||
                 this.findSpanInTraces(spanId);

    if (span) {
      span.attributes = {
        ...span.attributes,
        ...attributes
      };
    }
  }

  /**
   * Record a metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string = 'count',
    attributes: Record<string, string | number> = {}
  ): void {
    if (!this.config.enableMetrics) return;

    const metric: MetricPoint = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      attributes: {
        'service.name': this.config.serviceName,
        'deployment.environment': this.config.environment,
        ...attributes
      }
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    logger.debug('Recorded metric', { name, value, unit });
  }

  /**
   * Record a log entry
   */
  recordLog(
    severityText: LogRecord['severityText'],
    body: string,
    attributes: Record<string, unknown> = {}
  ): void {
    if (!this.config.enableLogs) return;

    const severityMap = {
      DEBUG: 1,
      INFO: 9,
      WARN: 13,
      ERROR: 17,
      FATAL: 21
    };

    const logRecord: LogRecord = {
      timestamp: new Date().toISOString(),
      severityText,
      severityNumber: severityMap[severityText],
      body,
      attributes: {
        'service.name': this.config.serviceName,
        ...attributes
      },
      traceId: this.currentTraceId || undefined,
      spanId: this.currentSpanId || undefined
    };

    this.logs.push(logRecord);

    // Keep only last 1000 logs in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  /**
   * Create a traced operation wrapper
   */
  async traceOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    attributes: SpanAttributes = {}
  ): Promise<T> {
    const spanId = this.startSpan(operationName, 'INTERNAL', attributes);

    try {
      const result = await operation();
      this.endSpan(spanId, 'OK');
      return result;
    } catch (error) {
      this.endSpan(
        spanId,
        'ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): DistributedTrace | undefined {
    return this.completedTraces.get(traceId);
  }

  /**
   * Get all traces for a workflow
   */
  getTracesForWorkflow(workflowId: string): DistributedTrace[] {
    return Array.from(this.completedTraces.values()).filter(
      trace => trace.workflowId === workflowId
    );
  }

  /**
   * Get metrics in time range
   */
  getMetrics(
    startTime: string,
    endTime: string,
    metricName?: string
  ): MetricPoint[] {
    const start = new Date(startTime);
    const end = new Date(endTime);

    return this.metrics.filter(metric => {
      const timestamp = new Date(metric.timestamp);
      const inRange = timestamp >= start && timestamp <= end;
      const matchesName = !metricName || metric.name === metricName;
      return inRange && matchesName;
    });
  }

  /**
   * Get logs in time range
   */
  getLogs(
    startTime: string,
    endTime: string,
    severity?: LogRecord['severityText']
  ): LogRecord[] {
    const start = new Date(startTime);
    const end = new Date(endTime);

    return this.logs.filter(log => {
      const timestamp = new Date(log.timestamp);
      const inRange = timestamp >= start && timestamp <= end;
      const matchesSeverity = !severity || log.severityText === severity;
      return inRange && matchesSeverity;
    });
  }

  /**
   * Export traces (for sending to collector)
   */
  exportTraces(): DistributedTrace[] {
    return Array.from(this.completedTraces.values());
  }

  /**
   * Export metrics (for sending to collector)
   */
  exportMetrics(): MetricPoint[] {
    return [...this.metrics];
  }

  /**
   * Export logs (for sending to collector)
   */
  exportLogs(): LogRecord[] {
    return [...this.logs];
  }

  /**
   * Clear old data
   */
  cleanup(retentionMinutes: number = 60): void {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - retentionMinutes);
    const cutoffIso = cutoffTime.toISOString();

    // Clear old traces
    for (const [traceId, trace] of this.completedTraces) {
      if (trace.timestamp < cutoffIso) {
        this.completedTraces.delete(traceId);
      }
    }

    // Clear old metrics
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffIso);

    // Clear old logs
    this.logs = this.logs.filter(l => l.timestamp >= cutoffIso);

    logger.info('OpenTelemetry data cleanup completed', {
      retentionMinutes,
      tracesRemaining: this.completedTraces.size,
      metricsRemaining: this.metrics.length,
      logsRemaining: this.logs.length
    });
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    activeSpans: number;
    totalTraces: number;
    totalMetrics: number;
    totalLogs: number;
    averageSpansPerTrace: number;
    averageTraceDuration: number;
  } {
    const traces = Array.from(this.completedTraces.values());
    const totalSpans = traces.reduce((sum, t) => sum + t.spans.size, 0);
    const averageSpansPerTrace = traces.length > 0 ? totalSpans / traces.length : 0;

    const totalDuration = traces.reduce((sum, t) => sum + t.metadata.totalDuration, 0);
    const averageTraceDuration = traces.length > 0 ? totalDuration / traces.length : 0;

    return {
      activeSpans: this.activeSpans.size,
      totalTraces: this.completedTraces.size,
      totalMetrics: this.metrics.length,
      totalLogs: this.logs.length,
      averageSpansPerTrace,
      averageTraceDuration
    };
  }

  // Private helper methods

  private generateTraceId(): string {
    return randomUUID().replace(/-/g, '');
  }

  private generateSpanId(): string {
    return randomUUID().replace(/-/g, '').substring(0, 16);
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.samplingRate;
  }

  private findSpanInTraces(spanId: string): OTelSpan | null {
    for (const trace of this.completedTraces.values()) {
      const span = trace.spans.get(spanId);
      if (span) return span;
    }
    return null;
  }
}

/**
 * Global OpenTelemetry service instance
 */
export const globalOTelService = new OpenTelemetryService({
  serviceName: 'workflow-automation',
  serviceVersion: '1.0.0',
  environment: process.env.NODE_ENV || 'development'
});

/**
 * Decorator for tracing class methods
 */
export function Trace(operationName?: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const name = operationName || `${target.constructor.name}.${propertyKey}`;
      return await globalOTelService.traceOperation(
        name,
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}
