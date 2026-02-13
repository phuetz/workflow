/**
 * Execution Projection
 * Read model for workflow executions built from events
 */

import { IProjection, ProjectionState } from '../types/cqrs';
import { DomainEvent } from '../../eventsourcing/types/eventsourcing';
import { eventSubscriber } from '../../eventsourcing/EventSubscriber';
import {
  getExecutionHandler,
  listExecutionsHandler,
} from '../QueryHandler';

/**
 * Execution Read Model
 */
export interface ExecutionReadModel {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  environment: string;
  nodeResults: Map<
    string,
    {
      status: 'success' | 'error' | 'skipped';
      output?: unknown;
      error?: string;
      duration?: number;
    }
  >;
  version: number;
}

/**
 * Execution Projection Implementation
 */
export class ExecutionProjection implements IProjection {
  name = 'ExecutionProjection';
  private state: ProjectionState;
  private executions: Map<string, ExecutionReadModel> = new Map();

  constructor() {
    this.state = {
      data: {},
      version: 0,
      eventsProcessed: 0,
    };

    this.subscribeToEvents();
  }

  /**
   * Subscribe to execution events
   */
  private subscribeToEvents(): void {
    eventSubscriber.subscribe(
      async (event: DomainEvent) => {
        await this.update(event);
      },
      {
        name: 'ExecutionProjection',
        filter: {
          aggregateTypes: ['execution'],
          eventTypes: [
            'ExecutionStarted',
            'ExecutionCompleted',
            'ExecutionFailed',
            'ExecutionCancelled',
            'NodeExecuted',
          ],
        },
        enableCheckpointing: true,
        processingMode: 'sequential',
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
    switch (event.eventType) {
      case 'ExecutionStarted':
        this.handleExecutionStarted(event);
        break;
      case 'ExecutionCompleted':
        this.handleExecutionCompleted(event);
        break;
      case 'ExecutionFailed':
        this.handleExecutionFailed(event);
        break;
      case 'ExecutionCancelled':
        this.handleExecutionCancelled(event);
        break;
      case 'NodeExecuted':
        this.handleNodeExecuted(event);
        break;
    }

    this.state.lastEventId = event.id;
    this.state.lastEventTimestamp = event.timestamp;
    this.state.version++;
    this.state.eventsProcessed++;

    this.updateQueryHandlers();
  }

  /**
   * Handle ExecutionStarted event
   */
  private handleExecutionStarted(event: DomainEvent): void {
    const execution: ExecutionReadModel = {
      id: event.aggregateId,
      workflowId: event.data.workflowId as string,
      status: 'running',
      input: (event.data.input as Record<string, unknown>) || {},
      startedAt: new Date(event.data.startedAt as string),
      environment: (event.data.environment as string) || 'production',
      nodeResults: new Map(),
      version: event.version,
    };

    this.executions.set(event.aggregateId, execution);
  }

  /**
   * Handle ExecutionCompleted event
   */
  private handleExecutionCompleted(event: DomainEvent): void {
    const execution = this.executions.get(event.aggregateId);
    if (!execution) return;

    execution.status = 'completed';
    execution.output = event.data.output as Record<string, unknown>;
    execution.completedAt = new Date(event.data.completedAt as string);
    execution.duration =
      execution.completedAt.getTime() - execution.startedAt.getTime();
    execution.version = event.version;
  }

  /**
   * Handle ExecutionFailed event
   */
  private handleExecutionFailed(event: DomainEvent): void {
    const execution = this.executions.get(event.aggregateId);
    if (!execution) return;

    execution.status = 'failed';
    execution.error = event.data.error as string;
    execution.completedAt = new Date(event.data.failedAt as string);
    execution.duration =
      execution.completedAt.getTime() - execution.startedAt.getTime();
    execution.version = event.version;
  }

  /**
   * Handle ExecutionCancelled event
   */
  private handleExecutionCancelled(event: DomainEvent): void {
    const execution = this.executions.get(event.aggregateId);
    if (!execution) return;

    execution.status = 'cancelled';
    execution.completedAt = new Date(event.data.cancelledAt as string);
    execution.duration =
      execution.completedAt.getTime() - execution.startedAt.getTime();
    execution.version = event.version;
  }

  /**
   * Handle NodeExecuted event
   */
  private handleNodeExecuted(event: DomainEvent): void {
    const execution = this.executions.get(event.aggregateId);
    if (!execution) return;

    execution.nodeResults.set(event.data.nodeId as string, {
      status: event.data.status as 'success' | 'error' | 'skipped',
      output: event.data.output,
      error: event.data.error as string,
      duration: event.data.duration as number,
    });

    execution.version = event.version;
  }

  /**
   * Query projection
   */
  async query(criteria: Record<string, unknown>): Promise<unknown> {
    if (criteria.id) {
      return this.executions.get(criteria.id as string);
    }

    return Array.from(this.executions.values());
  }

  /**
   * Clear projection
   */
  async clear(): Promise<void> {
    this.executions.clear();
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
   * Update query handlers
   */
  private updateQueryHandlers(): void {
    for (const [id, execution] of this.executions) {
      getExecutionHandler.updateExecution(id, execution);
      listExecutionsHandler.updateExecution(id, execution);
    }
  }

  /**
   * Get execution statistics
   */
  getStatistics(): {
    total: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    avgDuration: number;
    successRate: number;
  } {
    const executions = Array.from(this.executions.values());
    const total = executions.length;
    const running = executions.filter((e) => e.status === 'running').length;
    const completed = executions.filter((e) => e.status === 'completed').length;
    const failed = executions.filter((e) => e.status === 'failed').length;
    const cancelled = executions.filter((e) => e.status === 'cancelled').length;

    const completedExecutions = executions.filter((e) => e.duration);
    const avgDuration =
      completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) /
          completedExecutions.length
        : 0;

    const successRate =
      total > 0 ? completed / (completed + failed + cancelled) : 0;

    return {
      total,
      running,
      completed,
      failed,
      cancelled,
      avgDuration,
      successRate,
    };
  }
}

/**
 * Global execution projection instance
 */
export const executionProjection = new ExecutionProjection();
