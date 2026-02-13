/**
 * Metrics Collector
 * Collects real-time metrics from workflow executions
 */

import { logger } from '../services/SimpleLogger';
import type {
  ExecutionMetrics,
  NodeExecutionMetric,
  ResourceUsage,
  AnalyticsEvent,
  EventType,
} from '../types/advanced-analytics';

export class MetricsCollector {
  private events: AnalyticsEvent[] = [];
  private executionMetrics: Map<string, Partial<ExecutionMetrics>> = new Map();
  private eventHandlers: Map<EventType, Set<(event: AnalyticsEvent) => void>> = new Map();
  private metricsBuffer: AnalyticsEvent[] = [];
  private bufferFlushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 1000;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor() {
    this.startBufferFlush();
  }

  /**
   * Record workflow execution start
   */
  recordWorkflowStart(workflowId: string, executionId: string): void {
    const event = this.createEvent('workflow.started', {
      workflowId,
      executionId,
      timestamp: new Date(),
    });

    this.events.push(event);
    this.emitEvent(event);

    // Initialize metrics tracking
    this.executionMetrics.set(executionId, {
      workflowId,
      executionId,
      startTime: new Date(),
      nodeExecutions: [],
    });
  }

  /**
   * Record workflow execution completion
   */
  recordWorkflowComplete(
    executionId: string,
    status: 'success' | 'failed' | 'canceled',
    error?: string
  ): void {
    const metrics = this.executionMetrics.get(executionId);
    if (!metrics) return;

    const endTime = new Date();
    const duration = endTime.getTime() - (metrics.startTime?.getTime() || 0);

    const completeMetrics: ExecutionMetrics = {
      ...metrics,
      endTime,
      duration,
      status,
      resourceUsage: metrics.resourceUsage || this.getDefaultResourceUsage(),
      cost: metrics.cost || this.getDefaultCost(),
    } as ExecutionMetrics;

    const event = this.createEvent(
      status === 'success' ? 'workflow.completed' : 'workflow.failed',
      {
        workflowId: metrics.workflowId,
        executionId,
        duration,
        status,
        error,
      }
    );

    this.events.push(event);
    this.emitEvent(event);

    // Store complete metrics
    this.executionMetrics.set(executionId, completeMetrics);
  }

  /**
   * Record node execution start
   */
  recordNodeStart(
    executionId: string,
    nodeId: string,
    nodeType: string
  ): void {
    const metrics = this.executionMetrics.get(executionId);
    if (!metrics || !metrics.nodeExecutions) return;

    const nodeMetric: NodeExecutionMetric = {
      nodeId,
      nodeType,
      startTime: new Date(),
      endTime: new Date(), // Will be updated on complete
      duration: 0,
      status: 'success',
    };

    metrics.nodeExecutions.push(nodeMetric);

    const event = this.createEvent('node.started', {
      workflowId: metrics.workflowId,
      executionId,
      nodeId,
      nodeType,
    });

    this.events.push(event);
    this.emitEvent(event);
  }

  /**
   * Record node execution completion
   */
  recordNodeComplete(
    executionId: string,
    nodeId: string,
    status: 'success' | 'failed' | 'skipped',
    data?: {
      apiCalls?: number;
      dataSize?: number;
      error?: string;
    }
  ): void {
    const metrics = this.executionMetrics.get(executionId);
    if (!metrics || !metrics.nodeExecutions) return;

    const nodeMetric = metrics.nodeExecutions.find(n => n.nodeId === nodeId);
    if (!nodeMetric) return;

    nodeMetric.endTime = new Date();
    nodeMetric.duration = nodeMetric.endTime.getTime() - nodeMetric.startTime.getTime();
    nodeMetric.status = status;
    nodeMetric.apiCalls = data?.apiCalls;
    nodeMetric.dataSize = data?.dataSize;
    nodeMetric.errorMessage = data?.error;

    const event = this.createEvent(
      status === 'success' ? 'node.completed' : 'node.failed',
      {
        workflowId: metrics.workflowId,
        executionId,
        nodeId,
        duration: nodeMetric.duration,
        status,
        error: data?.error,
      }
    );

    this.events.push(event);
    this.emitEvent(event);
  }

  /**
   * Record API call
   */
  recordApiCall(
    executionId: string,
    nodeId: string,
    data: {
      endpoint: string;
      method: string;
      statusCode: number;
      duration: number;
      requestSize: number;
      responseSize: number;
    }
  ): void {
    const event = this.createEvent('api.call', {
      executionId,
      nodeId,
      ...data,
    });

    this.events.push(event);
    this.emitEvent(event);
  }

  /**
   * Update resource usage
   */
  updateResourceUsage(executionId: string, usage: Partial<ResourceUsage>): void {
    const metrics = this.executionMetrics.get(executionId);
    if (!metrics) return;

    metrics.resourceUsage = {
      ...this.getDefaultResourceUsage(),
      ...metrics.resourceUsage,
      ...usage,
    };
  }

  /**
   * Get metrics for execution
   */
  getExecutionMetrics(executionId: string): ExecutionMetrics | undefined {
    const metrics = this.executionMetrics.get(executionId);
    return metrics as ExecutionMetrics;
  }

  /**
   * Get all events in date range
   */
  getEvents(startDate: Date, endDate: Date, type?: EventType): AnalyticsEvent[] {
    return this.events.filter(event => {
      const inRange = event.timestamp >= startDate && event.timestamp <= endDate;
      const typeMatch = !type || event.type === type;
      return inRange && typeMatch;
    });
  }

  /**
   * Subscribe to events
   */
  on(eventType: EventType, handler: (event: AnalyticsEvent) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)?.add(handler);
  }

  /**
   * Unsubscribe from events
   */
  off(eventType: EventType, handler: (event: AnalyticsEvent) => void): void {
    this.eventHandlers.get(eventType)?.delete(handler);
  }

  /**
   * Get current metrics buffer size
   */
  getBufferSize(): number {
    return this.metricsBuffer.length;
  }

  /**
   * Manually flush metrics buffer
   */
  async flushBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const eventsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    // In production, this would write to database/time-series DB
    // For now, we keep events in memory
    logger.debug(`Flushed ${eventsToFlush.length} events to storage`);
  }

  /**
   * Clean up old metrics (data retention)
   */
  cleanupOldMetrics(retentionDays: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const initialCount = this.events.length;
    this.events = this.events.filter(event => event.timestamp >= cutoffDate);

    const deletedCount = initialCount - this.events.length;
    logger.debug(`Cleaned up ${deletedCount} old events`);

    return deletedCount;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalEvents: number;
    eventsInBuffer: number;
    activeExecutions: number;
    eventsByType: Record<string, number>;
  } {
    const eventsByType: Record<string, number> = {};
    this.events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    });

    return {
      totalEvents: this.events.length,
      eventsInBuffer: this.metricsBuffer.length,
      activeExecutions: this.executionMetrics.size,
      eventsByType,
    };
  }

  /**
   * Stop collector and cleanup
   */
  stop(): void {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
      this.bufferFlushInterval = null;
    }
    this.flushBuffer();
  }

  // Private methods

  private createEvent(type: EventType, data: Record<string, unknown>): AnalyticsEvent {
    const event: AnalyticsEvent = {
      id: this.generateId(),
      type,
      timestamp: new Date(),
      workflowId: data.workflowId as string,
      executionId: data.executionId as string,
      nodeId: data.nodeId as string,
      data,
    };

    this.metricsBuffer.push(event);

    // Auto-flush if buffer is full
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      this.flushBuffer();
    }

    return event;
  }

  private emitEvent(event: AnalyticsEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          logger.error('Error in event handler:', error);
        }
      });
    }
  }

  private startBufferFlush(): void {
    this.bufferFlushInterval = setInterval(() => {
      this.flushBuffer();
    }, this.FLUSH_INTERVAL);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultResourceUsage(): ResourceUsage {
    return {
      cpuTime: 0,
      memoryPeak: 0,
      networkIn: 0,
      networkOut: 0,
      storageUsed: 0,
    };
  }

  private getDefaultCost(): import('../types/advanced-analytics').ExecutionCost {
    return {
      apiCalls: 0,
      llmTokens: 0,
      compute: 0,
      storage: 0,
      total: 0,
      breakdown: [],
    };
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();
