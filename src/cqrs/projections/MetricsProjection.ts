/**
 * Metrics Projection
 * Aggregated metrics read model built from events
 */

import { IProjection, ProjectionState } from '../types/cqrs';
import { DomainEvent } from '../../eventsourcing/types/eventsourcing';
import { eventSubscriber } from '../../eventsourcing/EventSubscriber';
import { getMetricsHandler } from '../QueryHandler';

/**
 * Metric Data Point
 */
export interface MetricDataPoint {
  type: string;
  value: number;
  timestamp: Date;
  workflowId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated Metric
 */
export interface AggregatedMetric {
  type: string;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  period: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Metrics Projection Implementation
 */
export class MetricsProjection implements IProjection {
  name = 'MetricsProjection';
  private state: ProjectionState;
  private metrics: Map<string, MetricDataPoint[]> = new Map();
  private aggregations: Map<string, AggregatedMetric[]> = new Map();

  constructor() {
    this.state = {
      data: {},
      version: 0,
      eventsProcessed: 0,
    };

    this.subscribeToEvents();
  }

  /**
   * Subscribe to all events for metrics
   */
  private subscribeToEvents(): void {
    eventSubscriber.subscribe(
      async (event: DomainEvent) => {
        await this.update(event);
      },
      {
        name: 'MetricsProjection',
        filter: {
          eventTypes: [
            'ExecutionStarted',
            'ExecutionCompleted',
            'ExecutionFailed',
            'NodeExecuted',
            'WorkflowCreated',
          ],
        },
        enableCheckpointing: true,
        processingMode: 'parallel',
      }
    );
  }

  /**
   * Rebuild projection from events
   */
  async rebuild(events: DomainEvent[]): Promise<void> {
    await this.clear();
    for (const event of events) {
      await this.update(event);
    }
  }

  /**
   * Update projection with a new event
   */
  async update(event: DomainEvent): Promise<void> {
    // Extract metrics from events
    switch (event.eventType) {
      case 'ExecutionStarted':
        this.recordMetric('executions.started', 1, event.timestamp, {
          workflowId: event.data.workflowId as string,
        });
        break;

      case 'ExecutionCompleted':
        this.recordMetric('executions.completed', 1, event.timestamp);
        // Record duration if available
        if (event.data.duration) {
          this.recordMetric(
            'executions.duration',
            event.data.duration as number,
            event.timestamp,
            { workflowId: event.data.workflowId as string }
          );
        }
        break;

      case 'ExecutionFailed':
        this.recordMetric('executions.failed', 1, event.timestamp, {
          workflowId: event.data.workflowId as string,
          error: event.data.error as string,
        });
        break;

      case 'NodeExecuted':
        this.recordMetric('nodes.executed', 1, event.timestamp, {
          nodeId: event.data.nodeId as string,
          status: event.data.status as string,
        });
        if (event.data.duration) {
          this.recordMetric(
            'nodes.duration',
            event.data.duration as number,
            event.timestamp,
            { nodeId: event.data.nodeId as string }
          );
        }
        break;

      case 'WorkflowCreated':
        this.recordMetric('workflows.created', 1, event.timestamp);
        break;
    }

    this.state.lastEventId = event.id;
    this.state.lastEventTimestamp = event.timestamp;
    this.state.version++;
    this.state.eventsProcessed++;

    // Aggregate metrics periodically
    if (this.state.eventsProcessed % 100 === 0) {
      this.aggregateMetrics();
    }
  }

  /**
   * Record a metric data point
   */
  private recordMetric(
    type: string,
    value: number,
    timestamp: Date,
    metadata?: Record<string, unknown>
  ): void {
    const key = metadata?.workflowId
      ? `${(metadata.workflowId as string)}`
      : 'global';

    const metrics = this.metrics.get(key) || [];
    metrics.push({
      type,
      value,
      timestamp,
      workflowId: metadata?.workflowId as string,
      metadata,
    });

    this.metrics.set(key, metrics);

    // Update query handler
    getMetricsHandler.addMetric(
      metadata?.workflowId as string | null,
      {
        type,
        value,
        timestamp,
        metadata,
      }
    );
  }

  /**
   * Aggregate metrics by time period
   */
  private aggregateMetrics(): void {
    for (const [key, metrics] of this.metrics) {
      // Group by metric type
      const byType = new Map<string, MetricDataPoint[]>();

      for (const metric of metrics) {
        const list = byType.get(metric.type) || [];
        list.push(metric);
        byType.set(metric.type, list);
      }

      // Aggregate each type
      const aggregations: AggregatedMetric[] = [];

      for (const [type, dataPoints] of byType) {
        const values = dataPoints.map((dp) => dp.value);
        const timestamps = dataPoints.map((dp) => dp.timestamp);

        aggregations.push({
          type,
          count: values.length,
          sum: values.reduce((a, b) => a + b, 0),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          period: 'all',
          startTime: new Date(Math.min(...timestamps.map((t) => t.getTime()))),
          endTime: new Date(Math.max(...timestamps.map((t) => t.getTime()))),
        });
      }

      this.aggregations.set(key, aggregations);
    }
  }

  /**
   * Query projection
   */
  async query(criteria: Record<string, unknown>): Promise<unknown> {
    const { workflowId, metricType, aggregated } = criteria;

    const key = workflowId ? (workflowId as string) : 'global';

    if (aggregated) {
      const aggs = this.aggregations.get(key) || [];
      if (metricType) {
        return aggs.filter((a) => a.type === metricType);
      }
      return aggs;
    }

    const metrics = this.metrics.get(key) || [];
    if (metricType) {
      return metrics.filter((m) => m.type === metricType);
    }
    return metrics;
  }

  /**
   * Clear projection
   */
  async clear(): Promise<void> {
    this.metrics.clear();
    this.aggregations.clear();
    this.state = {
      data: {},
      version: 0,
      eventsProcessed: 0,
    };
  }

  /**
   * Get projection version
   */
  async getVersion(): Promise<number> {
    return this.state.version;
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics(): {
    totalExecutions: number;
    activeExecutions: number;
    failureRate: number;
    avgExecutionTime: number;
    workflowCount: number;
  } {
    const globalMetrics = this.metrics.get('global') || [];

    const execStarted = globalMetrics.filter(
      (m) => m.type === 'executions.started'
    ).length;
    const execCompleted = globalMetrics.filter(
      (m) => m.type === 'executions.completed'
    ).length;
    const execFailed = globalMetrics.filter(
      (m) => m.type === 'executions.failed'
    ).length;

    const durations = globalMetrics
      .filter((m) => m.type === 'executions.duration')
      .map((m) => m.value);

    const avgExecutionTime =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    const failureRate =
      execCompleted + execFailed > 0
        ? execFailed / (execCompleted + execFailed)
        : 0;

    const workflowCount = globalMetrics.filter(
      (m) => m.type === 'workflows.created'
    ).length;

    return {
      totalExecutions: execStarted,
      activeExecutions: execStarted - execCompleted - execFailed,
      failureRate,
      avgExecutionTime,
      workflowCount,
    };
  }

  /**
   * Get metrics by time range
   */
  getMetricsByTimeRange(
    type: string,
    startTime: Date,
    endTime: Date,
    workflowId?: string
  ): MetricDataPoint[] {
    const key = workflowId || 'global';
    const metrics = this.metrics.get(key) || [];

    return metrics.filter(
      (m) =>
        m.type === type &&
        m.timestamp >= startTime &&
        m.timestamp <= endTime
    );
  }
}

/**
 * Global metrics projection instance
 */
export const metricsProjection = new MetricsProjection();
