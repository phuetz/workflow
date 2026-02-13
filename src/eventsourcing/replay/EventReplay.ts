/**
 * Event Replay Service
 * Time-travel debugging and what-if analysis
 */

import {
  DomainEvent,
  EventReplayConfig,
  EventReplayResult,
  EventHandler,
} from '../types/eventsourcing';
import { eventStore } from '../EventStore';

/**
 * Replay Projection
 * Result of replaying events
 */
export interface ReplayProjection {
  /** Projection name */
  name: string;

  /** Current state */
  state: Record<string, unknown>;

  /** Events applied */
  eventsApplied: number;

  /** Last event timestamp */
  lastEventTimestamp?: Date;
}

/**
 * Replay Snapshot
 * Capture state at a specific point in time
 */
export interface ReplaySnapshot {
  timestamp: Date;
  state: Record<string, unknown>;
  eventId: string;
  eventType: string;
}

/**
 * Event Replay Service
 */
export class EventReplayService {
  /**
   * Replay all events
   */
  async replayAll(
    handler: EventHandler,
    config?: EventReplayConfig
  ): Promise<EventReplayResult> {
    const startTime = new Date();
    const errors: Array<{ eventId: string; error: string }> = [];

    // Get all events
    const events = await eventStore.getAllEvents(
      config?.fromTimestamp,
      config?.toTimestamp,
      config?.eventTypes
    );

    let eventsSuccessful = 0;
    let eventsFailed = 0;

    // Process events
    if (config?.parallel) {
      // Parallel processing
      const results = await Promise.allSettled(
        events.map((event) => handler(event))
      );

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
          eventsSuccessful++;
        } else {
          eventsFailed++;
          errors.push({
            eventId: events[i].id,
            error: result.reason?.message || 'Unknown error',
          });
        }
      }
    } else {
      // Sequential processing
      for (const event of events) {
        try {
          await handler(event);
          eventsSuccessful++;
        } catch (error) {
          eventsFailed++;
          errors.push({
            eventId: event.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    const endTime = new Date();

    return {
      eventsReplayed: events.length,
      eventsSuccessful,
      eventsFailed,
      durationMs: endTime.getTime() - startTime.getTime(),
      startTime,
      endTime,
      errors,
    };
  }

  /**
   * Replay events for a specific aggregate
   */
  async replayAggregate(
    aggregateId: string,
    aggregateType: string,
    handler: EventHandler,
    fromVersion?: number
  ): Promise<EventReplayResult> {
    const startTime = new Date();
    const errors: Array<{ eventId: string; error: string }> = [];

    // Get events for aggregate
    const events = await eventStore.getEvents(
      aggregateId,
      aggregateType,
      fromVersion
    );

    let eventsSuccessful = 0;
    let eventsFailed = 0;

    // Process events sequentially
    for (const event of events) {
      try {
        await handler(event);
        eventsSuccessful++;
      } catch (error) {
        eventsFailed++;
        errors.push({
          eventId: event.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const endTime = new Date();

    return {
      eventsReplayed: events.length,
      eventsSuccessful,
      eventsFailed,
      durationMs: endTime.getTime() - startTime.getTime(),
      startTime,
      endTime,
      errors,
    };
  }

  /**
   * Time-travel: Replay events up to a specific timestamp
   */
  async replayToTimestamp(
    timestamp: Date,
    handler: EventHandler
  ): Promise<EventReplayResult> {
    return this.replayAll(handler, {
      toTimestamp: timestamp,
    });
  }

  /**
   * What-if analysis: Replay events with modifications
   */
  async whatIfAnalysis(
    modifyEvent: (event: DomainEvent) => DomainEvent,
    handler: EventHandler,
    config?: EventReplayConfig
  ): Promise<EventReplayResult> {
    const startTime = new Date();
    const errors: Array<{ eventId: string; error: string }> = [];

    // Get events
    const events = await eventStore.getAllEvents(
      config?.fromTimestamp,
      config?.toTimestamp,
      config?.eventTypes
    );

    let eventsSuccessful = 0;
    let eventsFailed = 0;

    // Process with modifications
    for (const event of events) {
      try {
        const modifiedEvent = modifyEvent(event);
        await handler(modifiedEvent);
        eventsSuccessful++;
      } catch (error) {
        eventsFailed++;
        errors.push({
          eventId: event.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const endTime = new Date();

    return {
      eventsReplayed: events.length,
      eventsSuccessful,
      eventsFailed,
      durationMs: endTime.getTime() - startTime.getTime(),
      startTime,
      endTime,
      errors,
    };
  }

  /**
   * Build projection from events
   */
  async buildProjection(
    projectionName: string,
    applyEvent: (
      state: Record<string, unknown>,
      event: DomainEvent
    ) => Record<string, unknown>,
    config?: EventReplayConfig
  ): Promise<ReplayProjection> {
    let state: Record<string, unknown> = {};
    let eventsApplied = 0;
    let lastEventTimestamp: Date | undefined;

    // Get events
    const events = await eventStore.getAllEvents(
      config?.fromTimestamp,
      config?.toTimestamp,
      config?.eventTypes
    );

    // Apply events to build projection
    for (const event of events) {
      state = applyEvent(state, event);
      eventsApplied++;
      lastEventTimestamp = event.timestamp;
    }

    return {
      name: projectionName,
      state,
      eventsApplied,
      lastEventTimestamp,
    };
  }

  /**
   * Create snapshots at intervals during replay
   */
  async replayWithSnapshots(
    handler: EventHandler,
    snapshotInterval: number,
    config?: EventReplayConfig
  ): Promise<{
    result: EventReplayResult;
    snapshots: ReplaySnapshot[];
  }> {
    const startTime = new Date();
    const errors: Array<{ eventId: string; error: string }> = [];
    const snapshots: ReplaySnapshot[] = [];

    // Get events
    const events = await eventStore.getAllEvents(
      config?.fromTimestamp,
      config?.toTimestamp,
      config?.eventTypes
    );

    let eventsSuccessful = 0;
    let eventsFailed = 0;
    let currentState: Record<string, unknown> = {};

    // Process events
    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      try {
        await handler(event);
        eventsSuccessful++;

        // Update state (simplified)
        currentState = { ...currentState, ...event.data };

        // Take snapshot at interval
        if ((i + 1) % snapshotInterval === 0) {
          snapshots.push({
            timestamp: event.timestamp,
            state: { ...currentState },
            eventId: event.id,
            eventType: event.eventType,
          });
        }
      } catch (error) {
        eventsFailed++;
        errors.push({
          eventId: event.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const endTime = new Date();

    return {
      result: {
        eventsReplayed: events.length,
        eventsSuccessful,
        eventsFailed,
        durationMs: endTime.getTime() - startTime.getTime(),
        startTime,
        endTime,
        errors,
      },
      snapshots,
    };
  }

  /**
   * Replay with event filtering
   */
  async replayFiltered(
    filter: (event: DomainEvent) => boolean,
    handler: EventHandler,
    config?: EventReplayConfig
  ): Promise<EventReplayResult> {
    const startTime = new Date();
    const errors: Array<{ eventId: string; error: string }> = [];

    // Get all events
    const allEvents = await eventStore.getAllEvents(
      config?.fromTimestamp,
      config?.toTimestamp,
      config?.eventTypes
    );

    // Filter events
    const events = allEvents.filter(filter);

    let eventsSuccessful = 0;
    let eventsFailed = 0;

    // Process filtered events
    for (const event of events) {
      try {
        await handler(event);
        eventsSuccessful++;
      } catch (error) {
        eventsFailed++;
        errors.push({
          eventId: event.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const endTime = new Date();

    return {
      eventsReplayed: events.length,
      eventsSuccessful,
      eventsFailed,
      durationMs: endTime.getTime() - startTime.getTime(),
      startTime,
      endTime,
      errors,
    };
  }

  /**
   * Get event stream between two timestamps
   */
  async getEventStream(
    fromTimestamp: Date,
    toTimestamp: Date
  ): Promise<DomainEvent[]> {
    return eventStore.getAllEvents(fromTimestamp, toTimestamp);
  }

  /**
   * Compare state at two different points in time
   */
  async compareStates(
    timestamp1: Date,
    timestamp2: Date,
    applyEvent: (
      state: Record<string, unknown>,
      event: DomainEvent
    ) => Record<string, unknown>
  ): Promise<{
    state1: Record<string, unknown>;
    state2: Record<string, unknown>;
    differences: Array<{
      key: string;
      value1: unknown;
      value2: unknown;
    }>;
  }> {
    // Build state at timestamp1
    const projection1 = await this.buildProjection('state1', applyEvent, {
      toTimestamp: timestamp1,
    });

    // Build state at timestamp2
    const projection2 = await this.buildProjection('state2', applyEvent, {
      toTimestamp: timestamp2,
    });

    // Find differences
    const differences: Array<{
      key: string;
      value1: unknown;
      value2: unknown;
    }> = [];

    const allKeys = new Set([
      ...Object.keys(projection1.state),
      ...Object.keys(projection2.state),
    ]);

    for (const key of allKeys) {
      const value1 = projection1.state[key];
      const value2 = projection2.state[key];

      if (JSON.stringify(value1) !== JSON.stringify(value2)) {
        differences.push({ key, value1, value2 });
      }
    }

    return {
      state1: projection1.state,
      state2: projection2.state,
      differences,
    };
  }

  /**
   * Replay events in batches
   */
  async *replayInBatches(
    batchSize: number,
    handler: EventHandler,
    config?: EventReplayConfig
  ): AsyncGenerator<EventReplayResult> {
    // Get all events
    const events = await eventStore.getAllEvents(
      config?.fromTimestamp,
      config?.toTimestamp,
      config?.eventTypes
    );

    // Process in batches
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const startTime = new Date();
      const errors: Array<{ eventId: string; error: string }> = [];

      let eventsSuccessful = 0;
      let eventsFailed = 0;

      for (const event of batch) {
        try {
          await handler(event);
          eventsSuccessful++;
        } catch (error) {
          eventsFailed++;
          errors.push({
            eventId: event.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const endTime = new Date();

      yield {
        eventsReplayed: batch.length,
        eventsSuccessful,
        eventsFailed,
        durationMs: endTime.getTime() - startTime.getTime(),
        startTime,
        endTime,
        errors,
      };
    }
  }
}

/**
 * Global event replay service instance
 */
export const eventReplayService = new EventReplayService();
