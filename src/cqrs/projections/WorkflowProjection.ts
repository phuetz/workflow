/**
 * Workflow Projection
 * Read model for workflows built from events
 */

import { IProjection, ProjectionState } from '../types/cqrs';
import { DomainEvent } from '../../eventsourcing/types/eventsourcing';
import { eventSubscriber } from '../../eventsourcing/EventSubscriber';
import {
  getWorkflowHandler,
  listWorkflowsHandler,
} from '../QueryHandler';

/**
 * Workflow Read Model
 */
export interface WorkflowReadModel {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  settings: Record<string, unknown>;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    config: Record<string, unknown>;
  }>;
  connections: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  status: 'active' | 'inactive' | 'archived';
}

/**
 * Workflow Projection Implementation
 */
export class WorkflowProjection implements IProjection {
  name = 'WorkflowProjection';
  private state: ProjectionState;
  private workflows: Map<string, WorkflowReadModel> = new Map();

  constructor() {
    this.state = {
      data: {},
      version: 0,
      eventsProcessed: 0,
    };

    // Subscribe to workflow events
    this.subscribeToEvents();
  }

  /**
   * Subscribe to workflow events
   */
  private subscribeToEvents(): void {
    eventSubscriber.subscribe(
      async (event: DomainEvent) => {
        await this.update(event);
      },
      {
        name: 'WorkflowProjection',
        filter: {
          aggregateTypes: ['workflow'],
          eventTypes: [
            'WorkflowCreated',
            'WorkflowUpdated',
            'WorkflowDeleted',
            'NodeAdded',
            'NodeUpdated',
            'NodeDeleted',
            'ConnectionAdded',
            'ConnectionDeleted',
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
    // Clear existing data
    await this.clear();

    // Process all events
    for (const event of events) {
      await this.update(event);
    }
  }

  /**
   * Update projection with a new event
   */
  async update(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'WorkflowCreated':
        this.handleWorkflowCreated(event);
        break;
      case 'WorkflowUpdated':
        this.handleWorkflowUpdated(event);
        break;
      case 'WorkflowDeleted':
        this.handleWorkflowDeleted(event);
        break;
      case 'NodeAdded':
        this.handleNodeAdded(event);
        break;
      case 'NodeUpdated':
        this.handleNodeUpdated(event);
        break;
      case 'NodeDeleted':
        this.handleNodeDeleted(event);
        break;
      case 'ConnectionAdded':
        this.handleConnectionAdded(event);
        break;
      case 'ConnectionDeleted':
        this.handleConnectionDeleted(event);
        break;
    }

    // Update state tracking
    this.state.lastEventId = event.id;
    this.state.lastEventTimestamp = event.timestamp;
    this.state.version++;
    this.state.eventsProcessed++;

    // Update query handlers
    this.updateQueryHandlers();
  }

  /**
   * Handle WorkflowCreated event
   */
  private handleWorkflowCreated(event: DomainEvent): void {
    const workflow: WorkflowReadModel = {
      id: event.aggregateId,
      name: event.data.name as string,
      description: event.data.description as string,
      tags: (event.data.tags as string[]) || [],
      settings: (event.data.settings as Record<string, unknown>) || {},
      nodes: [],
      connections: [],
      createdAt: new Date(event.data.createdAt as string),
      updatedAt: new Date(event.data.createdAt as string),
      version: event.version,
      status: 'active',
    };

    this.workflows.set(event.aggregateId, workflow);
  }

  /**
   * Handle WorkflowUpdated event
   */
  private handleWorkflowUpdated(event: DomainEvent): void {
    const workflow = this.workflows.get(event.aggregateId);
    if (!workflow) return;

    const updates = event.data.updates as Partial<WorkflowReadModel>;

    if (updates.name) workflow.name = updates.name;
    if (updates.description !== undefined)
      workflow.description = updates.description;
    if (updates.tags) workflow.tags = updates.tags;
    if (updates.settings) workflow.settings = updates.settings;

    workflow.updatedAt = new Date(event.data.updatedAt as string);
    workflow.version = event.version;
  }

  /**
   * Handle WorkflowDeleted event
   */
  private handleWorkflowDeleted(event: DomainEvent): void {
    const workflow = this.workflows.get(event.aggregateId);
    if (!workflow) return;

    workflow.status = 'archived';
    workflow.updatedAt = event.timestamp;
  }

  /**
   * Handle NodeAdded event
   */
  private handleNodeAdded(event: DomainEvent): void {
    const workflow = this.workflows.get(event.aggregateId);
    if (!workflow) return;

    workflow.nodes.push({
      id: event.data.nodeId as string,
      type: event.data.nodeType as string,
      position: event.data.position as { x: number; y: number },
      config: (event.data.config as Record<string, unknown>) || {},
    });

    workflow.updatedAt = new Date(event.data.addedAt as string);
    workflow.version = event.version;
  }

  /**
   * Handle NodeUpdated event
   */
  private handleNodeUpdated(event: DomainEvent): void {
    const workflow = this.workflows.get(event.aggregateId);
    if (!workflow) return;

    const nodeIndex = workflow.nodes.findIndex(
      (n) => n.id === event.data.nodeId
    );
    if (nodeIndex === -1) return;

    if (event.data.config) {
      workflow.nodes[nodeIndex].config = event.data.config as Record<
        string,
        unknown
      >;
    }
    if (event.data.position) {
      workflow.nodes[nodeIndex].position = event.data.position as {
        x: number;
        y: number;
      };
    }

    workflow.updatedAt = event.timestamp;
    workflow.version = event.version;
  }

  /**
   * Handle NodeDeleted event
   */
  private handleNodeDeleted(event: DomainEvent): void {
    const workflow = this.workflows.get(event.aggregateId);
    if (!workflow) return;

    workflow.nodes = workflow.nodes.filter((n) => n.id !== event.data.nodeId);
    workflow.updatedAt = event.timestamp;
    workflow.version = event.version;
  }

  /**
   * Handle ConnectionAdded event
   */
  private handleConnectionAdded(event: DomainEvent): void {
    const workflow = this.workflows.get(event.aggregateId);
    if (!workflow) return;

    workflow.connections.push({
      id: event.data.connectionId as string,
      sourceId: event.data.sourceId as string,
      targetId: event.data.targetId as string,
      sourceHandle: event.data.sourceHandle as string,
      targetHandle: event.data.targetHandle as string,
    });

    workflow.updatedAt = event.timestamp;
    workflow.version = event.version;
  }

  /**
   * Handle ConnectionDeleted event
   */
  private handleConnectionDeleted(event: DomainEvent): void {
    const workflow = this.workflows.get(event.aggregateId);
    if (!workflow) return;

    workflow.connections = workflow.connections.filter(
      (c) => c.id !== event.data.connectionId
    );
    workflow.updatedAt = event.timestamp;
    workflow.version = event.version;
  }

  /**
   * Query projection
   */
  async query(criteria: Record<string, unknown>): Promise<unknown> {
    if (criteria.id) {
      return this.workflows.get(criteria.id as string);
    }

    // Return all workflows
    return Array.from(this.workflows.values());
  }

  /**
   * Clear projection
   */
  async clear(): Promise<void> {
    this.workflows.clear();
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
   * Update query handlers with latest data
   */
  private updateQueryHandlers(): void {
    // Update GetWorkflow handler
    for (const [id, workflow] of this.workflows) {
      getWorkflowHandler.updateWorkflow(id, workflow);
      listWorkflowsHandler.updateWorkflow(id, workflow);
    }
  }

  /**
   * Get workflow count
   */
  getWorkflowCount(): number {
    return this.workflows.size;
  }

  /**
   * Get active workflow count
   */
  getActiveWorkflowCount(): number {
    return Array.from(this.workflows.values()).filter(
      (w) => w.status === 'active'
    ).length;
  }

  /**
   * Get workflows by tag
   */
  getWorkflowsByTag(tag: string): WorkflowReadModel[] {
    return Array.from(this.workflows.values()).filter((w) =>
      w.tags.includes(tag)
    );
  }
}

/**
 * Global workflow projection instance
 */
export const workflowProjection = new WorkflowProjection();
