/**
 * Tool Span Tracker
 *
 * Tracks every tool invocation within agent executions with detailed
 * metrics including input/output, cost, performance, and errors.
 */

import { EventEmitter } from 'events';
import {
  ToolSpan,
  TraceStatus,
  CostBreakdown,
  CostCategory,
  SpanError,
  ToolSpanMetadata,
  TokenUsage,
  RateLimitInfo,
} from './types/observability';

/**
 * Tool call context
 */
interface ToolCallContext {
  traceId: string;
  parentSpanId?: string;
  workflowId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Tool span tracker implementation
 */
export class ToolSpanTracker extends EventEmitter {
  private spans: Map<string, ToolSpan>;
  private activeSpans: Set<string>;
  private toolMetrics: Map<string, ToolMetrics>;

  constructor() {
    super();
    this.spans = new Map();
    this.activeSpans = new Set();
    this.toolMetrics = new Map();
  }

  /**
   * Start tracking a tool call
   */
  startToolCall(
    tool: string,
    operation: string,
    input: any,
    context: ToolCallContext
  ): string {
    const spanId = this.generateSpanId();

    const span: ToolSpan = {
      spanId,
      traceId: context.traceId,
      parentSpanId: context.parentSpanId,
      tool,
      operation,
      input: this.sanitizeInput(input),
      startTime: Date.now(),
      status: 'success',
      cost: {
        total: 0,
        breakdown: {},
        currency: 'USD',
        timestamp: Date.now(),
      },
      metadata: {
        retryCount: 0,
        cacheHit: false,
      },
    };

    this.spans.set(spanId, span);
    this.activeSpans.add(spanId);

    // Initialize tool metrics if not exists
    if (!this.toolMetrics.has(tool)) {
      this.toolMetrics.set(tool, {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalDuration: 0,
        totalCost: 0,
        averageDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        cacheHitRate: 0,
      });
    }

    const metrics = this.toolMetrics.get(tool)!;
    metrics.totalCalls++;

    this.emit('tool:started', span);

    return spanId;
  }

  /**
   * End a tool call
   */
  endToolCall(
    spanId: string,
    output: any,
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
    span.output = this.sanitizeOutput(output);
    span.status = status;
    if (error) {
      span.error = error;
    }

    this.activeSpans.delete(spanId);

    // Update tool metrics
    const metrics = this.toolMetrics.get(span.tool)!;
    metrics.totalDuration += span.duration;
    metrics.averageDuration = metrics.totalDuration / metrics.totalCalls;

    if (status === 'success') {
      metrics.successfulCalls++;
    } else {
      metrics.failedCalls++;
    }

    this.emit('tool:completed', span);
  }

  /**
   * Record LLM-specific metrics
   */
  recordLLMMetrics(
    spanId: string,
    provider: string,
    model: string,
    tokens: TokenUsage,
    cost: number
  ): void {
    const span = this.spans.get(spanId);
    if (!span) {
      return;
    }

    span.metadata.apiProvider = provider;
    span.metadata.model = model;
    span.metadata.tokens = tokens;

    // Update cost
    span.cost.total += cost;
    span.cost.breakdown.llm = (span.cost.breakdown.llm || 0) + cost;

    // Update tool metrics
    const metrics = this.toolMetrics.get(span.tool)!;
    metrics.totalCost += cost;
  }

  /**
   * Record rate limit information
   */
  recordRateLimit(
    spanId: string,
    rateLimit: RateLimitInfo
  ): void {
    const span = this.spans.get(spanId);
    if (!span) {
      return;
    }

    span.metadata.rateLimit = rateLimit;

    this.emit('tool:ratelimit', { spanId, rateLimit });
  }

  /**
   * Record retry attempt
   */
  recordRetry(spanId: string): void {
    const span = this.spans.get(spanId);
    if (!span) {
      return;
    }

    span.metadata.retryCount++;

    this.emit('tool:retry', { spanId, retryCount: span.metadata.retryCount });
  }

  /**
   * Record cache hit
   */
  recordCacheHit(spanId: string, cacheKey: string): void {
    const span = this.spans.get(spanId);
    if (!span) {
      return;
    }

    span.metadata.cacheHit = true;

    // Update cache hit rate
    const metrics = this.toolMetrics.get(span.tool);
    if (metrics) {
      const totalCalls = metrics.totalCalls;
      const cacheHits = Array.from(this.spans.values())
        .filter(s => s.tool === span.tool && s.metadata.cacheHit)
        .length;
      metrics.cacheHitRate = cacheHits / totalCalls;
    }

    this.emit('tool:cache_hit', { spanId, cacheKey });
  }

  /**
   * Add cost to a tool span
   */
  addCost(
    spanId: string,
    amount: number,
    category: CostCategory
  ): void {
    const span = this.spans.get(spanId);
    if (!span) {
      return;
    }

    span.cost.total += amount;
    span.cost.breakdown[category] = (span.cost.breakdown[category] || 0) + amount;

    // Update tool metrics
    const metrics = this.toolMetrics.get(span.tool)!;
    metrics.totalCost += amount;
  }

  /**
   * Get tool span by ID
   */
  getSpan(spanId: string): ToolSpan | undefined {
    return this.spans.get(spanId);
  }

  /**
   * Get all spans for a trace
   */
  getSpansForTrace(traceId: string): ToolSpan[] {
    return Array.from(this.spans.values()).filter(s => s.traceId === traceId);
  }

  /**
   * Get tool metrics
   */
  getToolMetrics(tool?: string): Map<string, ToolMetrics> | ToolMetrics | undefined {
    if (tool) {
      return this.toolMetrics.get(tool);
    }
    return this.toolMetrics;
  }

  /**
   * Get top tools by call count
   */
  getTopTools(limit: number = 10): Array<{ tool: string; metrics: ToolMetrics }> {
    return Array.from(this.toolMetrics.entries())
      .map(([tool, metrics]) => ({ tool, metrics }))
      .sort((a, b) => b.metrics.totalCalls - a.metrics.totalCalls)
      .slice(0, limit);
  }

  /**
   * Get top tools by cost
   */
  getTopToolsByCost(limit: number = 10): Array<{ tool: string; metrics: ToolMetrics }> {
    return Array.from(this.toolMetrics.entries())
      .map(([tool, metrics]) => ({ tool, metrics }))
      .sort((a, b) => b.metrics.totalCost - a.metrics.totalCost)
      .slice(0, limit);
  }

  /**
   * Get top tools by error rate
   */
  getTopToolsByErrorRate(limit: number = 10): Array<{ tool: string; metrics: ToolMetrics; errorRate: number }> {
    return Array.from(this.toolMetrics.entries())
      .map(([tool, metrics]) => ({
        tool,
        metrics,
        errorRate: metrics.failedCalls / metrics.totalCalls,
      }))
      .filter(t => t.metrics.totalCalls >= 10) // Minimum calls for statistical significance
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): PerformanceStats {
    const allSpans = Array.from(this.spans.values()).filter(s => s.duration !== undefined);
    const durations = allSpans.map(s => s.duration!).sort((a, b) => a - b);

    return {
      totalSpans: this.spans.size,
      activeSpans: this.activeSpans.size,
      completedSpans: allSpans.length,
      averageDuration: durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0,
      p50Duration: this.percentile(durations, 0.5),
      p95Duration: this.percentile(durations, 0.95),
      p99Duration: this.percentile(durations, 0.99),
      totalCost: allSpans.reduce((sum, s) => sum + s.cost.total, 0),
    };
  }

  /**
   * Clear all spans
   */
  clear(): void {
    this.spans.clear();
    this.activeSpans.clear();
    this.toolMetrics.clear();
  }

  /**
   * Generate span ID
   */
  private generateSpanId(): string {
    return `tool_span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize input to prevent storing sensitive data
   */
  private sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Redact potential API keys, tokens, passwords
      return input.replace(/([a-zA-Z0-9_-]{32,})/g, '***REDACTED***');
    } else if (typeof input === 'object' && input !== null) {
      const sanitized: any = Array.isArray(input) ? [] : {};
      for (const [key, value] of Object.entries(input)) {
        // Redact sensitive fields
        if (['apiKey', 'token', 'password', 'secret', 'credential'].some(s =>
          key.toLowerCase().includes(s)
        )) {
          sanitized[key] = '***REDACTED***';
        } else {
          sanitized[key] = this.sanitizeInput(value);
        }
      }
      return sanitized;
    }
    return input;
  }

  /**
   * Sanitize output
   */
  private sanitizeOutput(output: any): any {
    return this.sanitizeInput(output); // Same logic for now
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
}

/**
 * Tool metrics interface
 */
interface ToolMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalDuration: number;
  totalCost: number;
  averageDuration: number;
  p95Duration: number;
  p99Duration: number;
  cacheHitRate: number;
}

/**
 * Performance statistics
 */
interface PerformanceStats {
  totalSpans: number;
  activeSpans: number;
  completedSpans: number;
  averageDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  totalCost: number;
}

export default ToolSpanTracker;
