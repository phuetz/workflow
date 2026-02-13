/**
 * Comprehensive Event Streaming Engine Tests
 *
 * Test coverage:
 * - Stream connectors (Kafka, Redis, mock platforms)
 * - Window operations (tumbling, sliding, session)
 * - Aggregations (count, sum, avg, percentiles)
 * - Complex event processing (patterns, anomalies)
 * - Stream joins (inner, left, right, full)
 * - Backpressure handling
 * - Performance and scalability
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamConnector } from '../streaming/StreamConnector';
import { StreamProcessor, WindowManager, AggregationBuilder } from '../streaming/StreamProcessor';
import { CEPEngine, PatternBuilder } from '../streaming/CEPEngine';
import { StreamJoin } from '../streaming/StreamJoin';
import { BackpressureHandler, FlowControlManager } from '../streaming/BackpressureHandler';
import type {
  StreamEvent,
  StreamConfig,
  WindowConfig,
  AggregationConfig,
  CEPPattern,
  StreamJoinConfig,
  BackpressureConfig,
  AnomalyDetectionConfig,
} from '../types/streaming';

// ============================================================================
// Test Utilities
// ============================================================================

function createTestEvent(key: string, value: any, timestamp?: number): StreamEvent {
  return {
    key,
    value,
    timestamp: timestamp || Date.now(),
  };
}

function createTestEvents(count: number, interval = 1000): StreamEvent[] {
  const events: StreamEvent[] = [];
  const baseTime = Date.now();

  for (let i = 0; i < count; i++) {
    events.push({
      key: `event-${i}`,
      value: { id: i, temperature: 20 + Math.random() * 10, userId: `user-${i % 3}` },
      timestamp: baseTime + i * interval,
    });
  }

  return events;
}

// ============================================================================
// Stream Connector Tests
// ============================================================================

describe('StreamConnector', () => {
  it('should create Kafka connector', async () => {
    const config: StreamConfig = {
      platform: 'kafka',
      connectionConfig: {
        brokers: ['localhost:9092'],
        clientId: 'test-client',
      },
      consumerConfig: {
        groupId: 'test-group',
        topics: ['test-topic'],
      },
    };

    const connector = new StreamConnector(config);
    expect(connector).toBeDefined();
    expect(connector.isConnected()).toBe(false);
  });

  it('should handle connection events', async () => {
    const config: StreamConfig = {
      platform: 'redis',
      connectionConfig: {
        host: 'localhost',
        port: 6379,
      },
    };

    const connector = new StreamConnector(config);
    const events: string[] = [];

    connector.on('connected', () => events.push('connected'));
    connector.on('disconnected', () => events.push('disconnected'));

    // Note: Actual connection would require Redis running
    // This tests the event emitter structure
    expect(connector.getMetrics()).toBeDefined();
  });

  it('should track throughput metrics', async () => {
    const config: StreamConfig = {
      platform: 'kafka',
      connectionConfig: {
        brokers: ['localhost:9092'],
        clientId: 'test-client',
      },
    };

    const connector = new StreamConnector(config);
    const metrics = connector.getMetrics();

    expect(metrics).toHaveProperty('eventsPerSecond');
    expect(metrics).toHaveProperty('bytesPerSecond');
    expect(metrics).toHaveProperty('recordsIn');
    expect(metrics).toHaveProperty('recordsOut');
  });
});

// ============================================================================
// Stream Processor Tests - Windowing
// ============================================================================

describe('StreamProcessor - Windowing', () => {
  let processor: StreamProcessor;

  beforeEach(() => {
    processor = new StreamProcessor();
  });

  it('should create tumbling windows', async () => {
    const events = createTestEvents(10, 1000);
    const config: WindowConfig = {
      type: 'tumbling',
      size: 5000, // 5 second windows
    };

    const windows = await processor.window(events, config);
    expect(windows.size).toBeGreaterThan(0);

    for (const [, window] of windows) {
      expect(window.end - window.start).toBe(5000);
    }
  });

  it('should create sliding windows with overlap', async () => {
    const events = createTestEvents(10, 1000);
    const config: WindowConfig = {
      type: 'sliding',
      size: 5000,
      slide: 2000, // 2 second slide
    };

    const windows = await processor.window(events, config);
    expect(windows.size).toBeGreaterThan(0);

    // Events should appear in multiple windows (overlap)
    const eventCounts = new Map<string, number>();
    for (const [, window] of windows) {
      for (const event of window.events) {
        eventCounts.set(event.key, (eventCounts.get(event.key) || 0) + 1);
      }
    }

    // At least some events should be in multiple windows
    const multiWindowEvents = Array.from(eventCounts.values()).filter((count) => count > 1);
    expect(multiWindowEvents.length).toBeGreaterThan(0);
  });

  it('should create session windows based on gaps', async () => {
    const baseTime = Date.now();
    const events: StreamEvent[] = [
      createTestEvent('e1', { value: 1 }, baseTime),
      createTestEvent('e2', { value: 2 }, baseTime + 1000),
      createTestEvent('e3', { value: 3 }, baseTime + 2000),
      // Gap of 10 seconds
      createTestEvent('e4', { value: 4 }, baseTime + 12000),
      createTestEvent('e5', { value: 5 }, baseTime + 13000),
    ];

    const config: WindowConfig = {
      type: 'session',
      gap: 5000, // 5 second gap
    };

    const windows = await processor.window(events, config);
    expect(windows.size).toBe(2); // Should create 2 sessions
  });

  it('should handle custom window functions', async () => {
    const events = createTestEvents(6, 1000);
    const config: WindowConfig = {
      type: 'custom',
      size: 0,
      customWindow: (evts) => {
        // Split into windows of 2 events each
        const result: StreamEvent[][] = [];
        for (let i = 0; i < evts.length; i += 2) {
          result.push(evts.slice(i, i + 2));
        }
        return result;
      },
    };

    const windows = await processor.window(events, config);
    expect(windows.size).toBe(3); // 6 events / 2 = 3 windows
  });
});

// ============================================================================
// Stream Processor Tests - Aggregations
// ============================================================================

describe('StreamProcessor - Aggregations', () => {
  let processor: StreamProcessor;

  beforeEach(() => {
    processor = new StreamProcessor();
  });

  it('should perform count aggregation', async () => {
    const events = createTestEvents(10, 100); // Shorter interval to fit in one window
    const windowConfig: WindowConfig = { type: 'tumbling', size: 10000 };
    const windows = await processor.window(events, windowConfig);

    const aggConfig: AggregationConfig = { type: 'count' };
    const results = await processor.aggregate(windows, aggConfig);

    expect(results.length).toBeGreaterThan(0);

    // Count total events across all windows
    const totalCount = results.reduce((sum, result) => {
      return sum + (result.groups.get('*') as number);
    }, 0);

    expect(totalCount).toBe(10);
  });

  it('should perform sum aggregation', async () => {
    const events: StreamEvent[] = [
      createTestEvent('e1', { amount: 10 }),
      createTestEvent('e2', { amount: 20 }),
      createTestEvent('e3', { amount: 30 }),
    ];

    const windowConfig: WindowConfig = { type: 'tumbling', size: 10000 };
    const windows = await processor.window(events, windowConfig);

    const aggConfig: AggregationConfig = { type: 'sum', field: 'amount' };
    const results = await processor.aggregate(windows, aggConfig);

    expect(results[0].groups.get('*')).toBe(60);
  });

  it('should perform avg aggregation', async () => {
    const events: StreamEvent[] = [
      createTestEvent('e1', { value: 10 }),
      createTestEvent('e2', { value: 20 }),
      createTestEvent('e3', { value: 30 }),
    ];

    const windowConfig: WindowConfig = { type: 'tumbling', size: 10000 };
    const windows = await processor.window(events, windowConfig);

    const aggConfig: AggregationConfig = { type: 'avg', field: 'value' };
    const results = await processor.aggregate(windows, aggConfig);

    expect(results[0].groups.get('*')).toBe(20);
  });

  it('should calculate percentiles', async () => {
    const events: StreamEvent[] = Array.from({ length: 100 }, (_, i) =>
      createTestEvent(`e${i}`, { value: i })
    );

    const windowConfig: WindowConfig = { type: 'tumbling', size: 10000 };
    const windows = await processor.window(events, windowConfig);

    const aggConfig: AggregationConfig = {
      type: 'percentile',
      field: 'value',
      percentile: 0.95, // p95
    };

    const results = await processor.aggregate(windows, aggConfig);
    const p95 = results[0].groups.get('*');

    expect(p95).toBeGreaterThan(90);
    expect(p95).toBeLessThanOrEqual(99);
  });

  it('should group by fields', async () => {
    const events: StreamEvent[] = [
      createTestEvent('e1', { userId: 'user1', amount: 10 }),
      createTestEvent('e2', { userId: 'user1', amount: 20 }),
      createTestEvent('e3', { userId: 'user2', amount: 30 }),
    ];

    const windowConfig: WindowConfig = { type: 'tumbling', size: 10000 };
    const windows = await processor.window(events, windowConfig);

    const aggConfig: AggregationConfig = {
      type: 'sum',
      field: 'amount',
      groupBy: ['userId'],
    };

    const results = await processor.aggregate(windows, aggConfig);
    const groups = results[0].groups;

    expect(groups.size).toBe(2);
    expect(groups.get(JSON.stringify(['user1']))).toBe(30);
    expect(groups.get(JSON.stringify(['user2']))).toBe(30);
  });

  it('should use AggregationBuilder', () => {
    const config = new AggregationBuilder()
      .type('sum')
      .field('revenue')
      .groupBy('userId', 'region')
      .build();

    expect(config.type).toBe('sum');
    expect(config.field).toBe('revenue');
    expect(config.groupBy).toEqual(['userId', 'region']);
  });
});

// ============================================================================
// Stream Processor Tests - Transformations
// ============================================================================

describe('StreamProcessor - Transformations', () => {
  let processor: StreamProcessor;

  beforeEach(() => {
    processor = new StreamProcessor();
  });

  it('should map events', async () => {
    const events = createTestEvents(5, 1000);
    const result = await processor.transform(events, {
      type: 'map',
      function: (event) => ({
        ...event,
        value: { ...event.value, doubled: event.value.id * 2 },
      }),
    });

    expect(result.length).toBe(5);
    expect(result[0].value.doubled).toBe(0);
    expect(result[1].value.doubled).toBe(2);
  });

  it('should filter events', async () => {
    const events: StreamEvent[] = [
      createTestEvent('e1', { value: 5 }),
      createTestEvent('e2', { value: 15 }),
      createTestEvent('e3', { value: 25 }),
    ];

    const result = await processor.transform(events, {
      type: 'filter',
      function: (event) => event.value.value > 10,
    });

    expect(result.length).toBe(2);
    expect(result[0].value.value).toBe(15);
    expect(result[1].value.value).toBe(25);
  });

  it('should flatMap events', async () => {
    const events: StreamEvent[] = [
      createTestEvent('e1', { items: [1, 2, 3] }),
    ];

    const result = await processor.transform(events, {
      type: 'flatMap',
      function: (event) =>
        event.value.items.map((item: number) => ({
          ...event,
          value: { item },
        })),
    });

    expect(result.length).toBe(3);
  });
});

// ============================================================================
// CEP Engine Tests
// ============================================================================

describe('CEPEngine', () => {
  let cep: CEPEngine;

  beforeEach(() => {
    cep = new CEPEngine();
  });

  it('should detect sequence patterns', async () => {
    const pattern = new PatternBuilder('login-sequence')
      .sequence(
        { eventType: 'login-attempt' },
        { eventType: 'login-success' }
      )
      .within(5000)
      .build();

    cep.registerPattern(pattern);

    const baseTime = Date.now();
    const events: StreamEvent[] = [
      createTestEvent('e1', {}, baseTime),
      { ...createTestEvent('e2', {}, baseTime + 1000), metadata: { type: 'login-attempt' } },
      { ...createTestEvent('e3', {}, baseTime + 2000), metadata: { type: 'login-success' } },
    ];

    const matches = await cep.processEvents(events);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].patternId).toBe('login-sequence');
  });

  it('should detect conjunction patterns', async () => {
    const pattern = new PatternBuilder('concurrent-events')
      .conjunction(
        { eventType: 'event-a' },
        { eventType: 'event-b' }
      )
      .within(5000)
      .build();

    cep.registerPattern(pattern);

    const baseTime = Date.now();
    const events: StreamEvent[] = [
      { ...createTestEvent('e1', {}, baseTime), metadata: { type: 'event-a' } },
      { ...createTestEvent('e2', {}, baseTime + 1000), metadata: { type: 'event-b' } },
    ];

    const matches = await cep.processEvents(events);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('should detect anomalies using Z-score', async () => {
    const events: StreamEvent[] = Array.from({ length: 100 }, (_, i) =>
      createTestEvent(`e${i}`, { temperature: 20 + (Math.random() * 2) })
    );

    // Add outlier
    events.push(createTestEvent('outlier', { temperature: 100 }));

    const config: AnomalyDetectionConfig = {
      method: 'zscore',
      field: 'temperature',
      sensitivity: 3,
      windowSize: 10,
      threshold: 3,
    };

    const anomalies = await cep.detectAnomalies(events, config);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].event.value.temperature).toBe(100);
  });

  it('should detect anomalies using IQR', async () => {
    const events: StreamEvent[] = Array.from({ length: 100 }, (_, i) =>
      createTestEvent(`e${i}`, { value: 20 + (Math.random() * 5) })
    );

    events.push(createTestEvent('outlier', { value: 200 }));

    const config: AnomalyDetectionConfig = {
      method: 'iqr',
      field: 'value',
      sensitivity: 5,
      windowSize: 10,
    };

    const anomalies = await cep.detectAnomalies(events, config);
    expect(anomalies.length).toBeGreaterThan(0);
  });

  it('should correlate events', () => {
    const events: StreamEvent[] = [
      createTestEvent('e1', { userId: 'user1', sessionId: 'session1' }),
      createTestEvent('e2', { userId: 'user1', sessionId: 'session1' }),
      createTestEvent('e3', { userId: 'user2', sessionId: 'session2' }),
    ];

    const correlations = cep.correlateEvents(events, ['userId', 'sessionId']);
    expect(correlations.size).toBe(2);
  });
});

// ============================================================================
// Stream Join Tests
// ============================================================================

describe('StreamJoin', () => {
  let join: StreamJoin;

  beforeEach(() => {
    join = new StreamJoin();
  });

  it('should perform inner join', async () => {
    const leftEvents: StreamEvent[] = [
      createTestEvent('l1', { id: 1, name: 'Alice' }),
      createTestEvent('l2', { id: 2, name: 'Bob' }),
    ];

    const rightEvents: StreamEvent[] = [
      createTestEvent('r1', { id: 1, age: 30 }),
      createTestEvent('r2', { id: 3, age: 25 }),
    ];

    const config: StreamJoinConfig = {
      type: 'inner',
      leftStream: 'users',
      rightStream: 'ages',
      leftKey: 'id',
      rightKey: 'id',
      window: { type: 'tumbling', size: 10000 },
    };

    const result = await join.joinStreams(leftEvents, rightEvents, config);
    expect(result.length).toBe(1); // Only id=1 matches
    expect(result[0].joinKey).toBe('1');
  });

  it('should perform left join', async () => {
    const leftEvents: StreamEvent[] = [
      createTestEvent('l1', { id: 1, name: 'Alice' }),
      createTestEvent('l2', { id: 2, name: 'Bob' }),
    ];

    const rightEvents: StreamEvent[] = [
      createTestEvent('r1', { id: 1, age: 30 }),
    ];

    const config: StreamJoinConfig = {
      type: 'left',
      leftStream: 'users',
      rightStream: 'ages',
      leftKey: 'id',
      rightKey: 'id',
      window: { type: 'tumbling', size: 10000 },
    };

    const result = await join.joinStreams(leftEvents, rightEvents, config);
    expect(result.length).toBe(2); // Both left events should be present
    expect(result.some((r) => r.right === undefined)).toBe(true);
  });

  it('should enrich stream with table data', async () => {
    const events: StreamEvent[] = [
      createTestEvent('e1', { userId: 'user1' }),
      createTestEvent('e2', { userId: 'user2' }),
    ];

    const table = new Map([
      ['user1', { name: 'Alice', email: 'alice@example.com' }],
      ['user2', { name: 'Bob', email: 'bob@example.com' }],
    ]);

    const result = await join.enrichStream(events, table, 'userId', 'userId');
    expect(result.length).toBe(2);
    expect(result[0].right?.value.name).toBe('Alice');
  });
});

// ============================================================================
// Backpressure Handler Tests
// ============================================================================

describe('BackpressureHandler', () => {
  it('should drop events when buffer is full', async () => {
    const config: BackpressureConfig = {
      strategy: 'drop',
      bufferSize: 5,
    };

    const handler = new BackpressureHandler(config);
    const events = createTestEvents(10, 100);

    await handler.handleEvents(events);
    const metrics = handler.getMetrics();

    expect(metrics.droppedEvents).toBeGreaterThan(0);
  });

  it('should sample events based on rate', async () => {
    const config: BackpressureConfig = {
      strategy: 'sample',
      samplingRate: 0.5, // 50%
      bufferSize: 1000,
    };

    const handler = new BackpressureHandler(config);
    const events = createTestEvents(100, 10);

    const result = await handler.handleEvents(events);
    expect(result.length).toBeLessThan(100);
  });

  it('should track lag metrics', async () => {
    const config: BackpressureConfig = {
      strategy: 'buffer',
      bufferSize: 1000,
    };

    const handler = new BackpressureHandler(config);
    const metrics = handler.getMetrics();

    expect(metrics).toHaveProperty('currentLag');
    expect(metrics).toHaveProperty('bufferUtilization');
    expect(metrics).toHaveProperty('throughput');
  });

  it('should support auto-scaling', async () => {
    const config: BackpressureConfig = {
      strategy: 'buffer',
      bufferSize: 1000,
      autoScaling: {
        enabled: true,
        minInstances: 1,
        maxInstances: 10,
        targetLag: 1000,
        scaleUpThreshold: 5000,
        scaleDownThreshold: 500,
        cooldownPeriod: 10000,
      },
    };

    const handler = new BackpressureHandler(config);
    await handler.scaleConsumers(2);

    const metrics = handler.getMetrics();
    expect(metrics.consumerInstances).toBe(3);
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Performance Tests', () => {
  it('should process 10,000 events quickly', async () => {
    const processor = new StreamProcessor();
    const events = createTestEvents(10000, 1);

    const start = Date.now();
    const windowConfig: WindowConfig = { type: 'tumbling', size: 10000 };
    const windows = await processor.window(events, windowConfig);

    const aggConfig: AggregationConfig = { type: 'count' };
    await processor.aggregate(windows, aggConfig);

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
  });

  it('should handle high-throughput aggregations', async () => {
    const processor = new StreamProcessor();
    const events = createTestEvents(50000, 1);

    const start = Date.now();
    const windowConfig: WindowConfig = { type: 'tumbling', size: 5000 };
    const windows = await processor.window(events, windowConfig);

    const aggConfig: AggregationConfig = {
      type: 'avg',
      field: 'temperature',
      groupBy: ['userId'],
    };

    await processor.aggregate(windows, aggConfig);
    const duration = Date.now() - start;

    // Should process 50k events in reasonable time
    expect(duration).toBeLessThan(5000);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration Tests', () => {
  it('should create complete streaming pipeline', async () => {
    // 1. Create events
    const events = createTestEvents(100, 100);

    // 2. Window events
    const processor = new StreamProcessor();
    const windowConfig: WindowConfig = { type: 'tumbling', size: 5000 };
    const windows = await processor.window(events, windowConfig);

    // 3. Aggregate
    const aggConfig: AggregationConfig = {
      type: 'avg',
      field: 'temperature',
      groupBy: ['userId'],
    };
    const results = await processor.aggregate(windows, aggConfig);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].groups.size).toBeGreaterThan(0);
  });

  it('should combine windowing, aggregation, and CEP', async () => {
    const processor = new StreamProcessor();
    const cep = new CEPEngine();

    // Generate events with patterns
    const events: StreamEvent[] = [];
    const baseTime = Date.now();

    for (let i = 0; i < 50; i++) {
      events.push({
        key: `e${i}`,
        value: { temperature: 20 + Math.random() * 5 },
        timestamp: baseTime + i * 1000,
        metadata: i % 10 === 0 ? { type: 'spike' } : undefined,
      });
    }

    // Window and aggregate
    const windowConfig: WindowConfig = { type: 'tumbling', size: 10000 };
    const windows = await processor.window(events, windowConfig);

    const aggConfig: AggregationConfig = { type: 'avg', field: 'temperature' };
    const aggResults = await processor.aggregate(windows, aggConfig);

    // Detect patterns
    const pattern = new PatternBuilder('spike-pattern')
      .sequence({ eventType: 'spike' })
      .build();

    cep.registerPattern(pattern);
    const matches = await cep.processEvents(events);

    expect(aggResults.length).toBeGreaterThan(0);
    expect(matches.length).toBeGreaterThan(0);
  });
});
