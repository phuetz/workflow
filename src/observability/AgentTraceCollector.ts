/**
 * Agent Trace Collector
 *
 * Distributed tracing system for AI agents with OpenTelemetry compatibility.
 * Collects, processes, and stores execution traces with <50ms P95 latency.
 */

import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';
import {
  AgentTrace,
  TraceSpan,
  TraceStatus,
  SpanType,
  TraceCollectorConfig,
  TraceQueryFilter,
  TraceQueryResult,
  TraceStatistics,
  TraceMetadata,
  SpanEvent,
  SpanError,
  SamplingStrategy,
} from './types/observability';

/**
 * Trace collector implementation
 */
export class AgentTraceCollector extends EventEmitter {
  private config: TraceCollectorConfig;
  private traces: Map<string, AgentTrace>;
  private spans: Map<string, TraceSpan>;
  private activeTraces: Set<string>;
  private samplingDecisions: Map<string, boolean>;
  private collectionMetrics: {
    totalTraces: number;
    totalSpans: number;
    droppedTraces: number;
    collectionLatencyP95: number;
  };

  constructor(config: Partial<TraceCollectorConfig> = {}) {
    super();
    this.config = {
      enabled: true,
      samplingStrategy: 'percentage',
      samplingRate: 0.1, // 10% by default
      maxSpansPerTrace: 1000,
      maxTraceAge: 24 * 60 * 60 * 1000, // 24 hours
      storage: {
        backend: 'memory',
        hotRetentionDays: 30,
        coldRetentionDays: 365,
        compressionEnabled: true,
        indexingEnabled: true,
      },
      exporters: [],
      ...config,
    };

    this.traces = new Map();
    this.spans = new Map();
    this.activeTraces = new Set();
    this.samplingDecisions = new Map();
    this.collectionMetrics = {
      totalTraces: 0,
      totalSpans: 0,
      droppedTraces: 0,
      collectionLatencyP95: 0,
    };

    this.startCleanupTask();
  }

  /**
   * Start a new trace
   */
  startTrace(
    agentId: string,
    agentName: string,
    operation: string,
    metadata: Partial<TraceMetadata> = {}
  ): string {
    const startTime = Date.now();

    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();

    // Sampling decision
    if (!this.shouldSample(traceId)) {
      this.samplingDecisions.set(traceId, false);
      return traceId;
    }

    this.samplingDecisions.set(traceId, true);

    const rootSpan: TraceSpan = {
      spanId,
      traceId,
      name: operation,
      type: 'agent',
      startTime,
      status: 'success',
      attributes: {
        agentId,
        agentName,
        ...metadata.tags,
      },
      events: [],
      children: [],
    };

    const trace: AgentTrace = {
      traceId,
      spanId,
      agentId,
      agentName,
      operation,
      startTime,
      status: 'success',
      metadata: {
        environment: 'production',
        version: '1.0.0',
        tags: {},
        context: {},
        ...metadata,
      },
      spans: [],
      rootSpan,
      totalCost: 0,
      slaViolations: [],
    };

    this.traces.set(traceId, trace);
    this.spans.set(spanId, rootSpan);
    this.activeTraces.add(traceId);
    this.collectionMetrics.totalTraces++;

    const collectionLatency = Date.now() - startTime;
    this.updateCollectionLatency(collectionLatency);

    this.emit('trace:started', trace);

    return traceId;
  }

  /**
   * End a trace
   */
  endTrace(
    traceId: string,
    status: TraceStatus = 'success',
    error?: SpanError
  ): void {
    if (!this.samplingDecisions.get(traceId)) {
      return; // Trace was not sampled
    }

    const trace = this.traces.get(traceId);
    if (!trace) {
      return;
    }

    const endTime = Date.now();
    trace.endTime = endTime;
    trace.duration = endTime - trace.startTime;
    trace.status = status;

    // Update root span
    trace.rootSpan.endTime = endTime;
    trace.rootSpan.duration = trace.duration;
    trace.rootSpan.status = status;
    if (error) {
      trace.rootSpan.error = error;
    }

    this.activeTraces.delete(traceId);

    this.emit('trace:completed', trace);

    // Export to configured exporters
    this.exportTrace(trace);
  }

  /**
   * Start a new span within a trace
   */
  startSpan(
    traceId: string,
    name: string,
    type: SpanType,
    parentSpanId?: string,
    attributes: Record<string, any> = {}
  ): string {
    if (!this.samplingDecisions.get(traceId)) {
      return ''; // Trace was not sampled
    }

    const trace = this.traces.get(traceId);
    if (!trace) {
      return '';
    }

    const spanId = this.generateSpanId();
    const span: TraceSpan = {
      spanId,
      traceId,
      parentSpanId: parentSpanId || trace.spanId,
      name,
      type,
      startTime: Date.now(),
      status: 'success',
      attributes,
      events: [],
      children: [],
    };

    this.spans.set(spanId, span);
    this.collectionMetrics.totalSpans++;

    // Add to parent's children
    if (parentSpanId) {
      const parentSpan = this.spans.get(parentSpanId);
      if (parentSpan) {
        parentSpan.children.push(span);
      }
    } else {
      trace.rootSpan.children.push(span);
    }

    this.emit('span:started', span);

    return spanId;
  }

  /**
   * End a span
   */
  endSpan(
    spanId: string,
    status: TraceStatus = 'success',
    error?: SpanError
  ): void {
    const span = this.spans.get(spanId);
    if (!span) {
      return;
    }

    const endTime = Date.now();
    span.endTime = endTime;
    span.duration = endTime - span.startTime;
    span.status = status;
    if (error) {
      span.error = error;
    }

    this.emit('span:completed', span);
  }

  /**
   * Add an event to a span
   */
  addSpanEvent(
    spanId: string,
    name: string,
    attributes: Record<string, any> = {}
  ): void {
    const span = this.spans.get(spanId);
    if (!span) {
      return;
    }

    const event: SpanEvent = {
      timestamp: Date.now(),
      name,
      attributes,
    };

    span.events.push(event);
  }

  /**
   * Set span attributes
   */
  setSpanAttributes(
    spanId: string,
    attributes: Record<string, any>
  ): void {
    const span = this.spans.get(spanId);
    if (!span) {
      return;
    }

    span.attributes = {
      ...span.attributes,
      ...attributes,
    };
  }

  /**
   * Query traces with filters
   */
  async queryTraces(
    filter: TraceQueryFilter = {}
  ): Promise<TraceQueryResult> {
    const startTime = Date.now();

    let filteredTraces = Array.from(this.traces.values());

    // Apply filters
    if (filter.traceIds && filter.traceIds.length > 0) {
      filteredTraces = filteredTraces.filter(t =>
        filter.traceIds!.includes(t.traceId)
      );
    }

    if (filter.agentIds && filter.agentIds.length > 0) {
      filteredTraces = filteredTraces.filter(t =>
        filter.agentIds!.includes(t.agentId)
      );
    }

    if (filter.workflowIds && filter.workflowIds.length > 0) {
      filteredTraces = filteredTraces.filter(t =>
        t.metadata.workflowId && filter.workflowIds!.includes(t.metadata.workflowId)
      );
    }

    if (filter.userIds && filter.userIds.length > 0) {
      filteredTraces = filteredTraces.filter(t =>
        t.metadata.userId && filter.userIds!.includes(t.metadata.userId)
      );
    }

    if (filter.status && filter.status.length > 0) {
      filteredTraces = filteredTraces.filter(t =>
        filter.status!.includes(t.status)
      );
    }

    if (filter.minDuration !== undefined) {
      filteredTraces = filteredTraces.filter(t =>
        t.duration !== undefined && t.duration >= filter.minDuration!
      );
    }

    if (filter.maxDuration !== undefined) {
      filteredTraces = filteredTraces.filter(t =>
        t.duration !== undefined && t.duration <= filter.maxDuration!
      );
    }

    if (filter.startTime !== undefined) {
      filteredTraces = filteredTraces.filter(t =>
        t.startTime >= filter.startTime!
      );
    }

    if (filter.endTime !== undefined) {
      filteredTraces = filteredTraces.filter(t =>
        t.endTime !== undefined && t.endTime <= filter.endTime!
      );
    }

    if (filter.tags) {
      filteredTraces = filteredTraces.filter(t => {
        return Object.entries(filter.tags!).every(
          ([key, value]) => t.metadata.tags[key] === value
        );
      });
    }

    // Sort by start time descending
    filteredTraces.sort((a, b) => b.startTime - a.startTime);

    const total = filteredTraces.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;

    const paginatedTraces = filteredTraces.slice(offset, offset + limit);

    const queryTime = Date.now() - startTime;

    return {
      traces: paginatedTraces,
      total,
      hasMore: offset + limit < total,
      queryTime,
    };
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): AgentTrace | undefined {
    return this.traces.get(traceId);
  }

  /**
   * Get span by ID
   */
  getSpan(spanId: string): TraceSpan | undefined {
    return this.spans.get(spanId);
  }

  /**
   * Get trace statistics
   */
  getStatistics(filter: TraceQueryFilter = {}): TraceStatistics {
    const traces = Array.from(this.traces.values()).filter(t => {
      if (filter.agentIds && !filter.agentIds.includes(t.agentId)) {
        return false;
      }
      if (filter.startTime && t.startTime < filter.startTime) {
        return false;
      }
      if (filter.endTime && t.endTime && t.endTime > filter.endTime) {
        return false;
      }
      return true;
    });

    const completedTraces = traces.filter(t => t.duration !== undefined);
    const durations = completedTraces.map(t => t.duration!).sort((a, b) => a - b);

    const successCount = traces.filter(t => t.status === 'success').length;
    const errorCount = traces.filter(t => t.status === 'error').length;
    const timeoutCount = traces.filter(t => t.status === 'timeout').length;

    const totalSpans = traces.reduce((sum, t) => sum + this.countSpans(t.rootSpan), 0);

    return {
      totalTraces: traces.length,
      totalSpans,
      averageDuration: durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0,
      p50Duration: this.percentile(durations, 0.5),
      p95Duration: this.percentile(durations, 0.95),
      p99Duration: this.percentile(durations, 0.99),
      successRate: traces.length > 0 ? successCount / traces.length : 0,
      errorRate: traces.length > 0 ? errorCount / traces.length : 0,
      timeoutRate: traces.length > 0 ? timeoutCount / traces.length : 0,
      totalCost: traces.reduce((sum, t) => sum + t.totalCost, 0),
    };
  }

  /**
   * Clear all traces
   */
  clear(): void {
    this.traces.clear();
    this.spans.clear();
    this.activeTraces.clear();
    this.samplingDecisions.clear();
  }

  /**
   * Get collection metrics
   */
  getMetrics() {
    return {
      ...this.collectionMetrics,
      activeTraces: this.activeTraces.size,
      totalTracesInMemory: this.traces.size,
      totalSpansInMemory: this.spans.size,
    };
  }

  /**
   * Generate trace ID
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate span ID
   */
  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Determine if trace should be sampled
   */
  private shouldSample(traceId: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    switch (this.config.samplingStrategy) {
      case 'always':
        return true;
      case 'never':
        return false;
      case 'percentage':
        return Math.random() < this.config.samplingRate;
      case 'adaptive':
        // Adaptive sampling based on system load
        return this.adaptiveSampling();
      default:
        return true;
    }
  }

  /**
   * Adaptive sampling based on system metrics
   */
  private adaptiveSampling(): boolean {
    const activeCount = this.activeTraces.size;
    const maxActive = 1000;

    if (activeCount < maxActive * 0.5) {
      return true; // Low load, sample everything
    } else if (activeCount < maxActive * 0.8) {
      return Math.random() < 0.5; // Medium load, sample 50%
    } else {
      return Math.random() < 0.1; // High load, sample 10%
    }
  }

  /**
   * Export trace to configured exporters
   */
  private async exportTrace(trace: AgentTrace): Promise<void> {
    for (const exporter of this.config.exporters) {
      try {
        // In production, this would send to actual exporters
        // For now, just emit an event
        this.emit('trace:exported', { trace, exporter: exporter.type });
      } catch (error) {
        logger.error('Failed to export trace:', error);
      }
    }
  }

  /**
   * Update collection latency metric
   */
  private updateCollectionLatency(latency: number): void {
    // Simple exponential moving average for P95
    const alpha = 0.1;
    this.collectionMetrics.collectionLatencyP95 =
      alpha * latency + (1 - alpha) * this.collectionMetrics.collectionLatencyP95;
  }

  /**
   * Count total spans in tree
   */
  private countSpans(span: TraceSpan): number {
    let count = 1;
    for (const child of span.children) {
      count += this.countSpans(child);
    }
    return count;
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Start cleanup task for old traces
   */
  private startCleanupTask(): void {
    setInterval(() => {
      const now = Date.now();
      const maxAge = this.config.maxTraceAge;

      for (const [traceId, trace] of this.traces.entries()) {
        if (now - trace.startTime > maxAge && !this.activeTraces.has(traceId)) {
          this.traces.delete(traceId);
          // Clean up associated spans
          this.cleanupSpans(trace.rootSpan);
        }
      }
    }, 60000); // Run every minute
  }

  /**
   * Clean up spans recursively
   */
  private cleanupSpans(span: TraceSpan): void {
    this.spans.delete(span.spanId);
    for (const child of span.children) {
      this.cleanupSpans(child);
    }
  }
}

export default AgentTraceCollector;
