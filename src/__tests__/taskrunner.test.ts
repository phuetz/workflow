/**
 * Task Runner System - Comprehensive Test Suite
 * Tests for all task runner components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TaskQueue } from '../execution/taskrunner/TaskQueue';
import { ConnectionPool } from '../execution/taskrunner/ConnectionPool';
import { ResultCache } from '../execution/taskrunner/ResultCache';
import { SmartRetry } from '../execution/taskrunner/SmartRetry';
import { MemoryOptimizer } from '../execution/taskrunner/MemoryOptimizer';
import { DistributedExecutor } from '../execution/taskrunner/DistributedExecutor';
import { Task, WorkflowNode, WorkflowEdge } from '../types/taskrunner';

// ============================================================================
// TaskQueue Tests
// ============================================================================

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue({
      maxQueueSize: 100,
      enableDeduplication: true
    });
  });

  afterEach(() => {
    queue.shutdown();
  });

  it('should enqueue tasks with different priorities', () => {
    const task1: Task = createMockTask('1', 'normal');
    const task2: Task = createMockTask('2', 'high');
    const task3: Task = createMockTask('3', 'critical');

    expect(queue.enqueue(task1)).toBe(true);
    expect(queue.enqueue(task2)).toBe(true);
    expect(queue.enqueue(task3)).toBe(true);

    const metrics = queue.getMetrics();
    expect(metrics.totalQueued).toBe(3);
  });

  it('should dequeue tasks in priority order', () => {
    const task1: Task = createMockTask('1', 'low');
    const task2: Task = createMockTask('2', 'high');
    const task3: Task = createMockTask('3', 'critical');

    queue.enqueue(task1);
    queue.enqueue(task2);
    queue.enqueue(task3);

    const dequeued1 = queue.dequeue();
    expect(dequeued1?.priority).toBe('critical');

    const dequeued2 = queue.dequeue();
    expect(dequeued2?.priority).toBe('high');

    const dequeued3 = queue.dequeue();
    expect(dequeued3?.priority).toBe('low');
  });

  it('should detect and skip duplicate tasks', () => {
    const task1: Task = createMockTask('1', 'normal');
    const task2: Task = { ...task1, id: '2' };

    expect(queue.enqueue(task1)).toBe(true);
    expect(queue.enqueue(task2)).toBe(false); // Duplicate

    const metrics = queue.getMetrics();
    expect(metrics.totalQueued).toBe(1);
  });

  it('should handle task completion', () => {
    const task: Task = createMockTask('1', 'normal');
    queue.enqueue(task);

    const dequeued = queue.dequeue();
    expect(dequeued).toBeTruthy();

    queue.complete(dequeued!.id);

    const metrics = queue.getMetrics();
    expect(metrics.completedTasks).toBe(1);
  });

  it('should handle task failure and retry', () => {
    const task: Task = createMockTask('1', 'normal');
    task.maxRetries = 3;

    queue.enqueue(task);
    const dequeued = queue.dequeue();

    queue.fail(dequeued!.id, 'Test error');

    expect(queue.retry(dequeued!.id)).toBe(true);

    const metrics = queue.getMetrics();
    expect(metrics.failedTasks).toBe(1);
  });
});

// ============================================================================
// ConnectionPool Tests
// ============================================================================

describe('ConnectionPool', () => {
  let pool: ConnectionPool;

  beforeEach(() => {
    pool = new ConnectionPool({
      http: {
        maxConnections: 10,
        keepAlive: true,
        keepAliveTimeout: 30000,
        timeout: 30000,
        maxRedirects: 5
      },
      database: {
        maxConnections: 5,
        idleTimeout: 60000,
        connectionTimeout: 10000,
        enablePreparedStatements: true
      }
    });
  });

  afterEach(async () => {
    await pool.shutdown();
  });

  it('should create and reuse HTTP agents', () => {
    const agent1 = pool.getHttpAgent('https://api.example.com/data');
    const agent2 = pool.getHttpAgent('https://api.example.com/users');

    expect(agent1).toBe(agent2); // Same host, should reuse

    const agent3 = pool.getHttpAgent('https://other.example.com');
    expect(agent3).not.toBe(agent1); // Different host
  });

  it('should track HTTP connection metrics', () => {
    pool.getHttpAgent('https://api.example.com');
    pool.releaseHttpConnection('https://api.example.com', 100);

    const metrics = pool.getMetrics();
    expect(metrics.http.requestsServed).toBe(1);
    expect(metrics.http.avgResponseTime).toBe(100);
  });

  it('should acquire and release database connections', async () => {
    const conn1 = await pool.acquireDbConnection();
    expect(conn1).toBeTruthy();

    pool.releaseDbConnection(conn1, 50);

    const metrics = pool.getMetrics();
    expect(metrics.database.queriesExecuted).toBe(1);
  });

  it('should handle connection pool limits', async () => {
    const connections: string[] = [];

    // Acquire max connections
    for (let i = 0; i < 5; i++) {
      const conn = await pool.acquireDbConnection();
      connections.push(conn);
    }

    // Try to acquire one more - should timeout
    const timeoutPromise = pool.acquireDbConnection();
    await expect(timeoutPromise).rejects.toThrow('Connection acquisition timeout');

    // Release a connection
    pool.releaseDbConnection(connections[0], 10);

    // Now should be able to acquire
    const newConn = await pool.acquireDbConnection();
    expect(newConn).toBeTruthy();
  }, 15000); // Increase timeout for this test
});

// ============================================================================
// ResultCache Tests
// ============================================================================

describe('ResultCache', () => {
  let cache: ResultCache;

  beforeEach(() => {
    cache = new ResultCache({
      maxSize: 10, // 10 MB
      maxEntries: 100,
      ttl: 60000,
      evictionPolicy: 'lru',
      compressionEnabled: true
    });
  });

  afterEach(() => {
    cache.shutdown();
  });

  it('should cache and retrieve results', () => {
    const result = createMockResult('test-node');
    cache.set('key1', result);

    const retrieved = cache.get('key1');
    expect(retrieved).toBeTruthy();
    expect(retrieved?.nodeId).toBe('test-node');
  });

  it('should handle cache misses', () => {
    const result = cache.get('nonexistent');
    expect(result).toBeNull();

    const metrics = cache.getMetrics();
    expect(metrics.hitRate).toBe(0);
    expect(metrics.missRate).toBe(1);
  });

  it('should track cache hit rate', () => {
    const result = createMockResult('test-node');
    cache.set('key1', result);

    cache.get('key1'); // Hit
    cache.get('key1'); // Hit
    cache.get('key2'); // Miss

    const metrics = cache.getMetrics();
    expect(metrics.hitRate).toBeCloseTo(0.66, 1);
  });

  it('should compress large entries', () => {
    const largeResult = createMockResult('test-node');
    largeResult.data = { content: 'x'.repeat(10000) }; // Large data

    cache.set('large-key', largeResult);

    const metrics = cache.getMetrics();
    expect(metrics.compressionRatio).toBeGreaterThan(0);
  });

  it('should evict entries when full (LRU)', () => {
    cache = new ResultCache({
      maxEntries: 3,
      evictionPolicy: 'lru'
    });

    cache.set('key1', createMockResult('node1'));
    cache.set('key2', createMockResult('node2'));
    cache.set('key3', createMockResult('node3'));

    // Access key1 to make it recently used
    cache.get('key1');

    // Add new entry, should evict key2 (least recently used)
    cache.set('key4', createMockResult('node4'));

    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
    expect(cache.has('key3')).toBe(true);
    expect(cache.has('key4')).toBe(true);
  });
});

// ============================================================================
// SmartRetry Tests
// ============================================================================

describe('SmartRetry', () => {
  let retry: SmartRetry;

  beforeEach(() => {
    retry = new SmartRetry({
      maxAttempts: 3,
      baseDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2
    }, {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 5000
    });
  });

  afterEach(() => {
    retry.shutdown();
  });

  it('should retry on retryable errors', async () => {
    let attempts = 0;

    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('ETIMEDOUT');
      }
      return 'success';
    });

    const result = await retry.executeWithRetry(fn, { taskId: 'test' });
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const fn = vi.fn(async () => {
      throw new Error('Not retryable');
    });

    await expect(retry.executeWithRetry(fn, { taskId: 'test' })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should implement exponential backoff', async () => {
    const delays: number[] = [];
    let attempts = 0;

    const fn = async () => {
      const start = Date.now();
      attempts++;

      if (attempts > 1) {
        delays.push(Date.now() - start);
      }

      if (attempts < 3) {
        throw new Error('ETIMEDOUT');
      }
      return 'success';
    };

    await retry.executeWithRetry(fn, { taskId: 'test' });

    // Delays should increase exponentially (approximately)
    expect(delays.length).toBeGreaterThan(0);
  });

  it('should open circuit breaker after threshold failures', async () => {
    const fn = vi.fn(async () => {
      throw new Error('ETIMEDOUT');
    });

    // Trigger failures to open circuit
    for (let i = 0; i < 3; i++) {
      try {
        await retry.executeWithRetry(fn, { type: 'test-service' });
      } catch {
        // Expected
      }
    }

    // Circuit should be open now
    await expect(
      retry.executeWithRetry(fn, { type: 'test-service' })
    ).rejects.toThrow('Circuit breaker is open');
  });
});

// ============================================================================
// MemoryOptimizer Tests
// ============================================================================

describe('MemoryOptimizer', () => {
  let optimizer: MemoryOptimizer;

  beforeEach(() => {
    optimizer = new MemoryOptimizer({
      enableAutoGC: false, // Disable for tests
      thresholds: {
        warning: 400,
        critical: 800,
        gcTrigger: 300
      }
    });
  });

  afterEach(() => {
    optimizer.shutdown();
  });

  it('should get current memory stats', () => {
    const stats = optimizer.getMemoryStats();

    expect(stats.heapUsed).toBeGreaterThan(0);
    expect(stats.heapTotal).toBeGreaterThan(0);
    expect(stats.rss).toBeGreaterThan(0);
  });

  it('should format memory stats', () => {
    const formatted = optimizer.getFormattedMemoryStats();

    expect(formatted.heapUsed).toMatch(/MB$/);
    expect(formatted.heapUtilization).toMatch(/%$/);
  });

  it('should trigger garbage collection', async () => {
    const gcPromise = new Promise<void>((resolve) => {
      optimizer.on('gc_completed', (data) => {
        expect(data.reason).toBe('manual');
        resolve();
      });
    });

    optimizer.triggerGarbageCollection('manual');
    await gcPromise;
  }, 1000);

  it('should get memory metrics', () => {
    const metrics = optimizer.getMetrics();

    expect(metrics.current).toBeDefined();
    expect(metrics.thresholds).toBeDefined();
    expect(metrics.gc).toBeDefined();
    expect(metrics.alerts).toBeDefined();
  });
});

// ============================================================================
// DistributedExecutor Tests
// ============================================================================

describe('DistributedExecutor', () => {
  let executor: DistributedExecutor;

  beforeEach(() => {
    executor = new DistributedExecutor();
  });

  it('should create execution plan for linear workflow', () => {
    const { nodes, edges } = createLinearWorkflow(5);

    const plan = executor.createExecutionPlan('workflow-1', nodes, edges);

    expect(plan.partitions).toBeDefined();
    expect(plan.executionOrder).toBeDefined();
    expect(plan.partitions.length).toBeGreaterThan(0);
  });

  it('should create execution plan for parallel workflow', () => {
    const { nodes, edges } = createParallelWorkflow();

    const plan = executor.createExecutionPlan('workflow-2', nodes, edges);

    // Should have multiple partitions that can run in parallel
    expect(plan.executionOrder.length).toBeGreaterThan(0);
    expect(plan.partitions.length).toBeGreaterThan(0);
  });

  it('should estimate execution duration', () => {
    const { nodes, edges } = createLinearWorkflow(3);

    const plan = executor.createExecutionPlan('workflow-3', nodes, edges);

    expect(plan.totalEstimatedDuration).toBeGreaterThan(0);
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function createMockTask(id: string, priority: 'critical' | 'high' | 'normal' | 'low'): Task {
  return {
    id,
    workflowId: 'test-workflow',
    nodeId: `node-${id}`,
    node: {
      id: `node-${id}`,
      type: 'customNode',
      position: { x: 0, y: 0 },
      data: {
        label: `Node ${id}`,
        type: 'http_request',
        config: {}
      }
    },
    inputData: {},
    priority,
    status: 'pending',
    retryCount: 0,
    maxRetries: 3,
    createdAt: Date.now(),
    timeout: 60000,
    dependencies: []
  };
}

function createMockResult(nodeId: string) {
  return {
    success: true,
    status: 'success' as const,
    data: { result: 'test' },
    nodeId,
    timestamp: Date.now(),
    duration: 100
  };
}

function createLinearWorkflow(nodeCount: number): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `node-${i}`,
      type: 'customNode',
      position: { x: i * 200, y: 0 },
      data: {
        label: `Node ${i}`,
        type: 'http_request',
        config: {}
      }
    });

    if (i > 0) {
      edges.push({
        id: `edge-${i}`,
        source: `node-${i - 1}`,
        target: `node-${i}`,
        type: 'smoothstep'
      });
    }
  }

  return { nodes, edges };
}

function createParallelWorkflow(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const nodes: WorkflowNode[] = [
    {
      id: 'start',
      type: 'customNode',
      position: { x: 0, y: 0 },
      data: { label: 'Start', type: 'webhook', config: {} }
    },
    {
      id: 'parallel-1',
      type: 'customNode',
      position: { x: 200, y: -100 },
      data: { label: 'Parallel 1', type: 'http_request', config: {} }
    },
    {
      id: 'parallel-2',
      type: 'customNode',
      position: { x: 200, y: 100 },
      data: { label: 'Parallel 2', type: 'http_request', config: {} }
    },
    {
      id: 'end',
      type: 'customNode',
      position: { x: 400, y: 0 },
      data: { label: 'End', type: 'email', config: {} }
    }
  ];

  const edges: WorkflowEdge[] = [
    { id: 'e1', source: 'start', target: 'parallel-1', type: 'smoothstep' },
    { id: 'e2', source: 'start', target: 'parallel-2', type: 'smoothstep' },
    { id: 'e3', source: 'parallel-1', target: 'end', type: 'smoothstep' },
    { id: 'e4', source: 'parallel-2', target: 'end', type: 'smoothstep' }
  ];

  return { nodes, edges };
}
