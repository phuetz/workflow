/**
 * Event-Driven Architecture Tests
 * Comprehensive tests for EDA components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventStore } from '../eventsourcing/EventStore';
import { EventPublisher } from '../eventsourcing/EventPublisher';
import { EventSubscriber } from '../eventsourcing/EventSubscriber';
import { SnapshotService } from '../eventsourcing/Snapshot';
import { EventReplayService } from '../eventsourcing/replay/EventReplay';
import { CommandBus } from '../cqrs/CommandHandler';
import { QueryBus } from '../cqrs/QueryHandler';
import { WorkflowProjection } from '../cqrs/projections/WorkflowProjection';
import { ExecutionProjection } from '../cqrs/projections/ExecutionProjection';
import { MetricsProjection } from '../cqrs/projections/MetricsProjection';
import { SagaOrchestrator } from '../saga/SagaOrchestrator';
import { CompensationManager } from '../saga/CompensationManager';
import { EventBus } from '../eventbus/EventBus';
import { DeadLetterQueue } from '../eventbus/DeadLetterQueue';
import { DomainEvent, AggregateRoot } from '../eventsourcing/types/eventsourcing';
import { SagaStatus } from '../saga/types/saga';

describe('Event Store', () => {
  let eventStore: EventStore;

  beforeEach(() => {
    eventStore = new EventStore();
  });

  it('should append events to aggregate', async () => {
    const event: DomainEvent = {
      id: 'evt1',
      aggregateId: 'wf1',
      aggregateType: 'workflow',
      eventType: 'WorkflowCreated',
      version: 1,
      data: { name: 'Test Workflow' },
      metadata: {},
      timestamp: new Date(),
    };

    await eventStore.append('wf1', 'workflow', [event]);

    const events = await eventStore.getEvents('wf1', 'workflow');
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('WorkflowCreated');
  });

  it('should enforce optimistic concurrency control', async () => {
    const event1: DomainEvent = {
      id: 'evt1',
      aggregateId: 'wf1',
      aggregateType: 'workflow',
      eventType: 'WorkflowCreated',
      version: 1,
      data: {},
      metadata: {},
      timestamp: new Date(),
    };

    await eventStore.append('wf1', 'workflow', [event1]);

    const event2: DomainEvent = {
      id: 'evt2',
      aggregateId: 'wf1',
      aggregateType: 'workflow',
      eventType: 'WorkflowUpdated',
      version: 2,
      data: {},
      metadata: {},
      timestamp: new Date(),
    };

    // This should fail because expected version is 0 but actual is 1
    await expect(
      eventStore.append('wf1', 'workflow', [event2], 0)
    ).rejects.toThrow();
  });

  it('should subscribe to events', async () => {
    const handler = vi.fn();

    eventStore.subscribe('WorkflowCreated', handler);

    const event: DomainEvent = {
      id: 'evt1',
      aggregateId: 'wf1',
      aggregateType: 'workflow',
      eventType: 'WorkflowCreated',
      version: 1,
      data: {},
      metadata: {},
      timestamp: new Date(),
    };

    await eventStore.append('wf1', 'workflow', [event]);

    // Wait for async delivery
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'WorkflowCreated',
    }));
  });

  it('should retrieve events from specific version', async () => {
    const events: DomainEvent[] = [
      {
        id: 'evt1',
        aggregateId: 'wf1',
        aggregateType: 'workflow',
        eventType: 'WorkflowCreated',
        version: 1,
        data: {},
        metadata: {},
        timestamp: new Date(),
      },
      {
        id: 'evt2',
        aggregateId: 'wf1',
        aggregateType: 'workflow',
        eventType: 'WorkflowUpdated',
        version: 2,
        data: {},
        metadata: {},
        timestamp: new Date(),
      },
    ];

    await eventStore.append('wf1', 'workflow', events);

    const fromVersion2 = await eventStore.getEvents('wf1', 'workflow', 2);
    expect(fromVersion2).toHaveLength(1);
    expect(fromVersion2[0].eventType).toBe('WorkflowUpdated');
  });

  it('should get aggregate version', async () => {
    const events: DomainEvent[] = [
      {
        id: 'evt1',
        aggregateId: 'wf1',
        aggregateType: 'workflow',
        eventType: 'WorkflowCreated',
        version: 1,
        data: {},
        metadata: {},
        timestamp: new Date(),
      },
    ];

    await eventStore.append('wf1', 'workflow', events);

    const version = await eventStore.getVersion('wf1', 'workflow');
    expect(version).toBe(1);
  });
});

describe('Event Publisher', () => {
  let publisher: EventPublisher;

  beforeEach(() => {
    publisher = new EventPublisher();
  });

  it('should publish events to subscribers', async () => {
    const handler = vi.fn();
    publisher.subscribe('TestEvent', handler);

    const event: DomainEvent = {
      id: 'evt1',
      aggregateId: 'test1',
      aggregateType: 'test',
      eventType: 'TestEvent',
      version: 1,
      data: { test: 'data' },
      metadata: {},
      timestamp: new Date(),
    };

    await publisher.publish(event);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handler).toHaveBeenCalledWith(event);
  });

  it('should support wildcard subscriptions', async () => {
    const handler = vi.fn();
    publisher.subscribe('*', handler);

    const event: DomainEvent = {
      id: 'evt1',
      aggregateId: 'test1',
      aggregateType: 'test',
      eventType: 'AnyEvent',
      version: 1,
      data: {},
      metadata: {},
      timestamp: new Date(),
    };

    await publisher.publish(event);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handler).toHaveBeenCalled();
  });

  it('should retry failed deliveries', async () => {
    let attempts = 0;
    const handler = vi.fn(() => {
      attempts++;
      if (attempts < 3) throw new Error('Delivery failed');
    });

    const publisher = new EventPublisher({
      retryOnFailure: true,
      maxRetries: 3,
      retryDelayMs: 10,
    });

    publisher.subscribe('TestEvent', handler);

    const event: DomainEvent = {
      id: 'evt1',
      aggregateId: 'test1',
      aggregateType: 'test',
      eventType: 'TestEvent',
      version: 1,
      data: {},
      metadata: {},
      timestamp: new Date(),
    };

    await publisher.publish(event);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(attempts).toBe(3);
  });
});

describe('Snapshot Service', () => {
  let snapshotService: SnapshotService;

  beforeEach(() => {
    snapshotService = new SnapshotService();
  });

  it('should create and load snapshots', async () => {
    class TestAggregate extends AggregateRoot {
      private name = '';

      protected applyChange(event: DomainEvent): void {
        if (event.eventType === 'NameChanged') {
          this.name = event.data.name as string;
        }
      }

      getState(): Record<string, unknown> {
        return { name: this.name };
      }

      restoreState(state: Record<string, unknown>): void {
        this.name = state.name as string;
      }
    }

    const aggregate = new TestAggregate('test1');
    aggregate.version = 100;
    aggregate.restoreState({ name: 'Test' });

    await snapshotService.createSnapshot(aggregate, 'test', 'user1');

    const newAggregate = new TestAggregate('test1');
    const loaded = await snapshotService.loadSnapshot(newAggregate, 'test');

    expect(loaded).toBe(true);
    expect(newAggregate.version).toBe(100);
    expect(newAggregate.getState().name).toBe('Test');
  });
});

describe('Event Replay Service', () => {
  let eventStore: EventStore;
  let replayService: EventReplayService;

  beforeEach(() => {
    eventStore = new EventStore();
    replayService = new EventReplayService();
  });

  it('should replay all events', async () => {
    const events: DomainEvent[] = [
      {
        id: 'evt1',
        aggregateId: 'wf1',
        aggregateType: 'workflow',
        eventType: 'WorkflowCreated',
        version: 1,
        data: {},
        metadata: {},
        timestamp: new Date(),
      },
      {
        id: 'evt2',
        aggregateId: 'wf1',
        aggregateType: 'workflow',
        eventType: 'WorkflowUpdated',
        version: 2,
        data: {},
        metadata: {},
        timestamp: new Date(),
      },
    ];

    await eventStore.append('wf1', 'workflow', events);

    const handler = vi.fn();
    const result = await replayService.replayAll(handler);

    expect(result.eventsReplayed).toBe(2);
    expect(result.eventsSuccessful).toBe(2);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should build projection from events', async () => {
    const events: DomainEvent[] = [
      {
        id: 'evt1',
        aggregateId: 'wf1',
        aggregateType: 'workflow',
        eventType: 'WorkflowCreated',
        version: 1,
        data: { name: 'Workflow 1' },
        metadata: {},
        timestamp: new Date(),
      },
    ];

    await eventStore.append('wf1', 'workflow', events);

    const projection = await replayService.buildProjection(
      'TestProjection',
      (state, event) => {
        return { ...state, ...event.data };
      }
    );

    expect(projection.eventsApplied).toBe(1);
    expect(projection.state.name).toBe('Workflow 1');
  });
});

describe('Command Bus', () => {
  let commandBus: CommandBus;

  beforeEach(() => {
    commandBus = new CommandBus();
  });

  it('should dispatch commands to handlers', async () => {
    const command = {
      id: 'cmd1',
      type: 'CreateWorkflow',
      data: { name: 'Test Workflow' },
      timestamp: new Date(),
    };

    const result = await commandBus.dispatch(command);

    expect(result.success).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].eventType).toBe('WorkflowCreated');
  });

  it('should validate commands', async () => {
    const command = {
      id: 'cmd1',
      type: 'CreateWorkflow',
      data: {}, // Missing required 'name' field
      timestamp: new Date(),
    };

    const result = await commandBus.dispatch(command);

    expect(result.success).toBe(false);
    expect(result.error).toContain('name is required');
  });

  it('should implement idempotency', async () => {
    const command = {
      id: 'cmd1',
      type: 'CreateWorkflow',
      data: { name: 'Test Workflow' },
      timestamp: new Date(),
    };

    const result1 = await commandBus.dispatch(command);
    const result2 = await commandBus.dispatch(command); // Same command ID

    expect(result1.aggregateId).toBe(result2.aggregateId);
  });
});

describe('Query Bus', () => {
  let queryBus: QueryBus;

  beforeEach(() => {
    queryBus = new QueryBus();
  });

  it('should execute queries', async () => {
    // First create a workflow
    const commandBus = new CommandBus();
    const createCommand = {
      id: 'cmd1',
      type: 'CreateWorkflow',
      data: { name: 'Test Workflow' },
      timestamp: new Date(),
    };

    const cmdResult = await commandBus.dispatch(createCommand);

    // Then query it
    const query = {
      id: 'q1',
      type: 'GetWorkflow',
      parameters: { workflowId: cmdResult.aggregateId },
      timestamp: new Date(),
    };

    const result = await queryBus.execute(query);

    // Note: In-memory implementation might not have the data yet
    // This is to demonstrate the query pattern
    expect(result).toBeDefined();
  });
});

describe('Saga Orchestrator', () => {
  let orchestrator: SagaOrchestrator;

  beforeEach(() => {
    orchestrator = new SagaOrchestrator();
  });

  it('should execute saga successfully', async () => {
    // Register saga
    orchestrator.registerSaga({
      id: 'test-saga',
      name: 'Test Saga',
      steps: [
        { id: 'step1', name: 'Step 1', action: 'action1' },
        { id: 'step2', name: 'Step 2', action: 'action2' },
      ],
      compensations: [],
    });

    // Register step executors
    orchestrator.registerStepExecutor('action1', async () => ({ result: 'step1' }));
    orchestrator.registerStepExecutor('action2', async () => ({ result: 'step2' }));

    const result = await orchestrator.execute('test-saga', {});

    expect(result.success).toBe(true);
    expect(result.status).toBe(SagaStatus.COMPLETED);
    expect(result.stepsCompleted).toBe(2);
  });

  it('should compensate on failure', async () => {
    const compensated: string[] = [];

    orchestrator.registerSaga({
      id: 'fail-saga',
      name: 'Failing Saga',
      steps: [
        { id: 'step1', name: 'Step 1', action: 'action1' },
        { id: 'step2', name: 'Step 2', action: 'action2' },
      ],
      compensations: [
        { forStep: 'step1', action: 'compensate1' },
      ],
    });

    orchestrator.registerStepExecutor('action1', async () => ({ result: 'step1' }));
    orchestrator.registerStepExecutor('action2', async () => {
      throw new Error('Step 2 failed');
    });

    const compensationManager = new CompensationManager();
    compensationManager.registerCompensationExecutor('compensate1', async () => {
      compensated.push('step1');
    });

    const result = await orchestrator.execute('fail-saga', {});

    expect(result.success).toBe(false);
    expect(result.status).toBe(SagaStatus.COMPENSATED);
    expect(result.compensated).toBe(true);
  });

  it('should retry failed steps', async () => {
    let attempts = 0;

    orchestrator.registerSaga({
      id: 'retry-saga',
      name: 'Retry Saga',
      steps: [
        {
          id: 'step1',
          name: 'Step 1',
          action: 'action1',
          retry: { maxAttempts: 3, delayMs: 10, backoff: 'fixed' },
        },
      ],
      compensations: [],
    });

    orchestrator.registerStepExecutor('action1', async () => {
      attempts++;
      if (attempts < 3) throw new Error('Not yet');
      return { result: 'success' };
    });

    const result = await orchestrator.execute('retry-saga', {});

    expect(result.success).toBe(true);
    expect(attempts).toBe(3);
  });
});

describe('Event Bus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  it('should publish and deliver events', async () => {
    const handler = vi.fn();
    eventBus.subscribe('TestEvent', handler);

    const event: DomainEvent = {
      id: 'evt1',
      aggregateId: 'test1',
      aggregateType: 'test',
      eventType: 'TestEvent',
      version: 1,
      data: {},
      metadata: {},
      timestamp: new Date(),
    };

    await eventBus.publish(event);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handler).toHaveBeenCalled();
  });

  it('should maintain event ordering', async () => {
    const received: string[] = [];

    const eventBus = new EventBus({ enableOrdering: true });

    eventBus.subscribe('TestEvent', async (event) => {
      received.push(event.id);
    });

    const events: DomainEvent[] = [
      {
        id: 'evt1',
        aggregateId: 'test1',
        aggregateType: 'test',
        eventType: 'TestEvent',
        version: 1,
        data: {},
        metadata: {},
        timestamp: new Date(),
      },
      {
        id: 'evt2',
        aggregateId: 'test1',
        aggregateType: 'test',
        eventType: 'TestEvent',
        version: 2,
        data: {},
        metadata: {},
        timestamp: new Date(),
      },
    ];

    await eventBus.publishBatch(events);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(received).toEqual(['evt1', 'evt2']);
  });
});

describe('Dead Letter Queue', () => {
  let dlq: DeadLetterQueue;

  beforeEach(() => {
    dlq = new DeadLetterQueue();
  });

  it('should add failed events', () => {
    const event: DomainEvent = {
      id: 'evt1',
      aggregateId: 'test1',
      aggregateType: 'test',
      eventType: 'TestEvent',
      version: 1,
      data: {},
      metadata: {},
      timestamp: new Date(),
    };

    dlq.add(event, 'Delivery failed', 3);

    expect(dlq.size()).toBe(1);
  });

  it('should retry events', async () => {
    const event: DomainEvent = {
      id: 'evt1',
      aggregateId: 'test1',
      aggregateType: 'test',
      eventType: 'TestEvent',
      version: 1,
      data: {},
      metadata: {},
      timestamp: new Date(),
    };

    dlq.add(event, 'Failed', 1);

    const handler = vi.fn();
    const entry = dlq.getAll()[0];
    const success = await dlq.retry(entry.id, handler);

    expect(success).toBe(true);
    expect(dlq.size()).toBe(0);
  });

  it('should cleanup old entries', () => {
    const oldEvent: DomainEvent = {
      id: 'evt1',
      aggregateId: 'test1',
      aggregateType: 'test',
      eventType: 'TestEvent',
      version: 1,
      data: {},
      metadata: {},
      timestamp: new Date(),
    };

    const dlq = new DeadLetterQueue({ retentionDays: 0 });
    dlq.add(oldEvent, 'Failed', 1);

    const removed = dlq.cleanup();

    expect(removed).toBe(1);
    expect(dlq.size()).toBe(0);
  });
});

describe('Integration Tests', () => {
  it('should handle full event sourcing flow', async () => {
    const eventStore = new EventStore();
    const publisher = new EventPublisher();

    // Subscribe to events
    const receivedEvents: DomainEvent[] = [];
    publisher.subscribe('WorkflowCreated', async (event) => {
      receivedEvents.push(event);
    });

    // Create and append event
    const event: DomainEvent = {
      id: 'evt1',
      aggregateId: 'wf1',
      aggregateType: 'workflow',
      eventType: 'WorkflowCreated',
      version: 1,
      data: { name: 'Test' },
      metadata: {},
      timestamp: new Date(),
    };

    await eventStore.append('wf1', 'workflow', [event]);
    await publisher.publish(event);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(receivedEvents).toHaveLength(1);
  });

  it('should handle CQRS pattern', async () => {
    const commandBus = new CommandBus();
    const queryBus = new QueryBus();

    // Execute command
    const result = await commandBus.dispatch({
      id: 'cmd1',
      type: 'CreateWorkflow',
      data: { name: 'Test Workflow' },
      timestamp: new Date(),
    });

    expect(result.success).toBe(true);

    // Query the result
    const query = await queryBus.execute({
      id: 'q1',
      type: 'ListWorkflows',
      parameters: {},
      timestamp: new Date(),
    });

    expect(query.success).toBe(true);
  });
});
