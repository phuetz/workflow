/**
 * Trace Visualization
 *
 * Utilities for rendering distributed traces as flame graphs, timelines,
 * and other visualization formats.
 */

import {
  AgentTrace,
  TraceSpan,
  ToolSpan,
} from './types/observability';

/**
 * Flame graph node
 */
export interface FlameGraphNode {
  id: string;
  name: string;
  value: number; // Duration
  start: number;
  end: number;
  depth: number;
  color: string;
  children: FlameGraphNode[];
  metadata: Record<string, any>;
}

/**
 * Timeline event
 */
export interface TimelineEvent {
  id: string;
  name: string;
  type: 'span' | 'event' | 'error';
  start: number;
  end?: number;
  duration?: number;
  lane: number;
  color: string;
  metadata: Record<string, any>;
}

/**
 * Gantt chart task
 */
export interface GanttTask {
  id: string;
  name: string;
  start: number;
  end: number;
  duration: number;
  dependencies: string[];
  progress: number;
  metadata: Record<string, any>;
}

/**
 * Trace visualization utilities
 */
export class TraceVisualization {
  /**
   * Convert trace to flame graph format
   */
  static toFlameGraph(trace: AgentTrace): FlameGraphNode {
    return this.spanToFlameGraphNode(trace.rootSpan, 0);
  }

  /**
   * Convert span to flame graph node recursively
   */
  private static spanToFlameGraphNode(span: TraceSpan, depth: number): FlameGraphNode {
    const duration = span.duration || 0;
    const color = this.getSpanColor(span);

    const node: FlameGraphNode = {
      id: span.spanId,
      name: span.name,
      value: duration,
      start: span.startTime,
      end: span.endTime || span.startTime,
      depth,
      color,
      children: [],
      metadata: {
        type: span.type,
        status: span.status,
        attributes: span.attributes,
      },
    };

    // Add children
    for (const child of span.children) {
      node.children.push(this.spanToFlameGraphNode(child, depth + 1));
    }

    return node;
  }

  /**
   * Convert trace to timeline events
   */
  static toTimeline(trace: AgentTrace): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const lanes = new Map<string, number>();
    let nextLane = 0;

    const addSpanEvents = (span: TraceSpan) => {
      // Determine lane
      let lane = lanes.get(span.spanId);
      if (lane === undefined) {
        lane = nextLane++;
        lanes.set(span.spanId, lane);
      }

      // Add span event
      events.push({
        id: span.spanId,
        name: span.name,
        type: 'span',
        start: span.startTime,
        end: span.endTime,
        duration: span.duration,
        lane,
        color: this.getSpanColor(span),
        metadata: {
          type: span.type,
          status: span.status,
          attributes: span.attributes,
        },
      });

      // Add span events (logs)
      for (const event of span.events) {
        events.push({
          id: `${span.spanId}_${event.timestamp}`,
          name: event.name,
          type: 'event',
          start: event.timestamp,
          lane,
          color: '#3b82f6',
          metadata: event.attributes,
        });
      }

      // Add error event if present
      if (span.error) {
        events.push({
          id: `${span.spanId}_error`,
          name: span.error.message,
          type: 'error',
          start: span.endTime || span.startTime,
          lane,
          color: '#ef4444',
          metadata: {
            type: span.error.type,
            stack: span.error.stack,
          },
        });
      }

      // Process children
      for (const child of span.children) {
        addSpanEvents(child);
      }
    };

    addSpanEvents(trace.rootSpan);

    return events.sort((a, b) => a.start - b.start);
  }

  /**
   * Convert trace to Gantt chart format
   */
  static toGanttChart(trace: AgentTrace): GanttTask[] {
    const tasks: GanttTask[] = [];

    const addSpanTasks = (span: TraceSpan) => {
      tasks.push({
        id: span.spanId,
        name: span.name,
        start: span.startTime,
        end: span.endTime || span.startTime,
        duration: span.duration || 0,
        dependencies: span.parentSpanId ? [span.parentSpanId] : [],
        progress: span.endTime ? 100 : 0,
        metadata: {
          type: span.type,
          status: span.status,
        },
      });

      for (const child of span.children) {
        addSpanTasks(child);
      }
    };

    addSpanTasks(trace.rootSpan);

    return tasks;
  }

  /**
   * Calculate critical path of trace
   */
  static calculateCriticalPath(trace: AgentTrace): {
    path: TraceSpan[];
    duration: number;
  } {
    const findLongestPath = (span: TraceSpan): { path: TraceSpan[]; duration: number } => {
      if (span.children.length === 0) {
        return {
          path: [span],
          duration: span.duration || 0,
        };
      }

      let longestChildPath = { path: [] as TraceSpan[], duration: 0 };

      for (const child of span.children) {
        const childPath = findLongestPath(child);
        if (childPath.duration > longestChildPath.duration) {
          longestChildPath = childPath;
        }
      }

      return {
        path: [span, ...longestChildPath.path],
        duration: (span.duration || 0) + longestChildPath.duration,
      };
    };

    return findLongestPath(trace.rootSpan);
  }

  /**
   * Generate trace summary statistics
   */
  static generateSummary(trace: AgentTrace): {
    totalSpans: number;
    totalDuration: number;
    longestSpan: { name: string; duration: number };
    spansByType: Record<string, number>;
    errorCount: number;
  } {
    let totalSpans = 0;
    let errorCount = 0;
    const spansByType: Record<string, number> = {};
    let longestSpan = { name: '', duration: 0 };

    const traverse = (span: TraceSpan) => {
      totalSpans++;

      // Count by type
      spansByType[span.type] = (spansByType[span.type] || 0) + 1;

      // Track longest span
      if (span.duration && span.duration > longestSpan.duration) {
        longestSpan = { name: span.name, duration: span.duration };
      }

      // Count errors
      if (span.error) {
        errorCount++;
      }

      // Traverse children
      for (const child of span.children) {
        traverse(child);
      }
    };

    traverse(trace.rootSpan);

    return {
      totalSpans,
      totalDuration: trace.duration || 0,
      longestSpan,
      spansByType,
      errorCount,
    };
  }

  /**
   * Generate waterfall data for visualization
   */
  static toWaterfall(trace: AgentTrace): Array<{
    id: string;
    name: string;
    type: string;
    start: number;
    duration: number;
    depth: number;
    status: string;
  }> {
    const waterfall: Array<{
      id: string;
      name: string;
      type: string;
      start: number;
      duration: number;
      depth: number;
      status: string;
    }> = [];

    const traverse = (span: TraceSpan, depth: number) => {
      waterfall.push({
        id: span.spanId,
        name: span.name,
        type: span.type,
        start: span.startTime - trace.startTime, // Relative to trace start
        duration: span.duration || 0,
        depth,
        status: span.status,
      });

      for (const child of span.children) {
        traverse(child, depth + 1);
      }
    };

    traverse(trace.rootSpan, 0);

    return waterfall;
  }

  /**
   * Export trace to JSON for external tools
   */
  static toJSON(trace: AgentTrace): string {
    return JSON.stringify(trace, null, 2);
  }

  /**
   * Export trace to OpenTelemetry format
   */
  static toOpenTelemetry(trace: AgentTrace): any {
    const convertSpan = (span: TraceSpan): any => ({
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.name,
      kind: this.spanTypeToOtelKind(span.type),
      startTimeUnixNano: span.startTime * 1_000_000,
      endTimeUnixNano: span.endTime ? span.endTime * 1_000_000 : undefined,
      attributes: Object.entries(span.attributes).map(([key, value]) => ({
        key,
        value: { stringValue: String(value) },
      })),
      events: span.events.map(e => ({
        timeUnixNano: e.timestamp * 1_000_000,
        name: e.name,
        attributes: Object.entries(e.attributes).map(([key, value]) => ({
          key,
          value: { stringValue: String(value) },
        })),
      })),
      status: {
        code: span.status === 'success' ? 1 : 2,
        message: span.error?.message,
      },
    });

    const spans: any[] = [];

    const traverse = (span: TraceSpan) => {
      spans.push(convertSpan(span));
      for (const child of span.children) {
        traverse(child);
      }
    };

    traverse(trace.rootSpan);

    return {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: 'workflow-agent' } },
              { key: 'agent.id', value: { stringValue: trace.agentId } },
            ],
          },
          scopeSpans: [
            {
              scope: {
                name: 'agent-observability',
                version: '1.0.0',
              },
              spans,
            },
          ],
        },
      ],
    };
  }

  /**
   * Get color for span based on type and status
   */
  private static getSpanColor(span: TraceSpan): string {
    if (span.error || span.status === 'error') {
      return '#ef4444'; // red
    }

    if (span.status === 'timeout') {
      return '#f59e0b'; // amber
    }

    switch (span.type) {
      case 'agent':
        return '#8b5cf6'; // purple
      case 'tool':
        return '#3b82f6'; // blue
      case 'llm':
        return '#10b981'; // green
      case 'memory':
        return '#ec4899'; // pink
      case 'routing':
        return '#f59e0b'; // amber
      case 'workflow':
        return '#6366f1'; // indigo
      case 'http':
        return '#14b8a6'; // teal
      case 'database':
        return '#8b5cf6'; // purple
      case 'cache':
        return '#06b6d4'; // cyan
      default:
        return '#64748b'; // slate
    }
  }

  /**
   * Convert span type to OpenTelemetry span kind
   */
  private static spanTypeToOtelKind(type: string): number {
    switch (type) {
      case 'http':
        return 3; // CLIENT
      case 'database':
        return 3; // CLIENT
      case 'agent':
      case 'workflow':
        return 1; // INTERNAL
      default:
        return 0; // UNSPECIFIED
    }
  }

  /**
   * Calculate span utilization (self time vs total time)
   */
  static calculateSpanUtilization(span: TraceSpan): {
    totalTime: number;
    selfTime: number;
    utilization: number;
  } {
    const totalTime = span.duration || 0;
    const childTime = span.children.reduce((sum, child) => sum + (child.duration || 0), 0);
    const selfTime = totalTime - childTime;
    const utilization = totalTime > 0 ? (selfTime / totalTime) * 100 : 0;

    return {
      totalTime,
      selfTime,
      utilization,
    };
  }

  /**
   * Find bottleneck spans (slowest operations)
   */
  static findBottlenecks(trace: AgentTrace, limit: number = 5): Array<{
    span: TraceSpan;
    duration: number;
    percentage: number;
  }> {
    const spans: Array<{ span: TraceSpan; duration: number }> = [];

    const collect = (span: TraceSpan) => {
      if (span.duration) {
        spans.push({ span, duration: span.duration });
      }
      for (const child of span.children) {
        collect(child);
      }
    };

    collect(trace.rootSpan);

    const totalDuration = trace.duration || 1;

    return spans
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map(({ span, duration }) => ({
        span,
        duration,
        percentage: (duration / totalDuration) * 100,
      }));
  }
}

export default TraceVisualization;
