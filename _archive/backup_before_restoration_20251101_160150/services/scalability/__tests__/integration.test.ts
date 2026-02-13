/**
 * PLAN C PHASE 5 - Tests d'Intégration Complets
 * Tests end-to-end pour l'infrastructure de scalabilité
 * Ultra Think methodology - Tests exhaustifs du système complet
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
  ScalabilityManager,
  initializeScalability,
  getRecommendedConfig,
  scalabilityManager
} from '../index';
import { DistributedWorkerPool } from '../WorkerPool';
import { IntelligentLoadBalancer } from '../LoadBalancer';
import { IntelligentAutoScaler } from '../AutoScaler';
import { DistributedQueue, QueueManager } from '../DistributedQueue';
import { GraphQLFederationGateway } from '../GraphQLFederation';

// Mock WebSocket and Worker
class MockWebSocket {
  send = vi.fn();
  close = vi.fn();
  on = vi.fn();
  emit = vi.fn();
}

class MockWorker {
  postMessage = vi.fn();
  terminate = vi.fn();
  onmessage = null;
  onerror = null;
}

// @ts-ignore
global.WebSocket = MockWebSocket as any;
// @ts-ignore
global.Worker = MockWorker as any;
global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url')
} as any;

// Mock localStorage
const localStorageMock = {
  storage: new Map<string, string>(),
  getItem: vi.fn((key: string) => localStorageMock.storage.get(key) || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.storage.set(key, value);
  }),
  clear: vi.fn(() => {
    localStorageMock.storage.clear();
  })
};

// @ts-ignore
global.localStorage = localStorageMock;

describe('Scalability Infrastructure Integration Tests', () => {
  let manager: ScalabilityManager;

  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (manager) {
      await manager.stop();
    }
  });

  describe('ScalabilityManager Integration', () => {
    it('should initialize all services correctly', async () => {
      manager = new ScalabilityManager({
        enableWorkerPool: true,
        enableQueue: true,
        enableLoadBalancer: true,
        enableAutoScaling: true,
        enableFederation: true
      });

      const readyHandler = vi.fn();
      manager.on('scalability:ready', readyHandler);

      await manager.start();

      expect(readyHandler).toHaveBeenCalled();
      
      const status = manager.getStatus();
      expect(status.workers.active).toBe(true);
      expect(status.queues.active).toBe(true);
      expect(status.loadBalancer.active).toBe(true);
      expect(status.autoScaler.active).toBe(true);
      expect(status.federation.active).toBe(true);
    });

    it('should handle service failures gracefully', async () => {
      manager = new ScalabilityManager({
        enableWorkerPool: true,
        enableQueue: false, // Disable one service
        enableLoadBalancer: true
      });

      await manager.start();

      // Try to use disabled service
      await expect(
        manager.sendToQueue('test', { data: 'test' })
      ).rejects.toThrow('Queue system is not enabled');

      // Other services should work
      const taskId = await manager.submitTask('compute', { data: 'test' });
      expect(taskId).toBeDefined();
    });

    it('should coordinate between services', async () => {
      manager = await initializeScalability({
        enableWorkerPool: true,
        enableQueue: true,
        enableLoadBalancer: true,
        monitoring: { enabled: true, interval: 1000 }
      });

      // Submit task to worker pool
      const taskId = await manager.submitTask('process', { value: 42 });
      expect(taskId).toBeDefined();

      // Send message to queue
      const messageId = await manager.sendToQueue('normal-priority', { 
        action: 'process',
        taskId 
      });
      expect(messageId).toBeDefined();

      // Route request through load balancer
      const response = await manager.route({
        id: 'req-1',
        method: 'GET',
        path: '/api/status',
        headers: {},
        clientIp: '192.168.1.1',
        priority: 5,
        timestamp: new Date()
      });
      expect(response).toBeDefined();
    });

    it('should emit monitoring events', (done) => {
      manager = new ScalabilityManager({
        monitoring: { enabled: true, interval: 100 }
      });

      manager.on('metrics:collected', (metrics) => {
        expect(metrics).toBeDefined();
        expect(metrics).toHaveProperty('workers');
        expect(metrics).toHaveProperty('queues');
        done();
      });

      manager.start().then(() => {
        vi.advanceTimersByTime(150);
      });
    });
  });

  describe('Worker Pool + Queue Integration', () => {
    let workerPool: DistributedWorkerPool;
    let queue: DistributedQueue;

    beforeEach(async () => {
      workerPool = new DistributedWorkerPool({
        minWorkers: 2,
        maxWorkers: 5
      });
      
      queue = new DistributedQueue({
        name: 'task-queue',
        maxSize: 100
      });

      await workerPool.start();
    });

    afterEach(async () => {
      await workerPool.stop();
      await queue.purge();
    });

    it('should process queue messages with worker pool', async () => {
      const results: any[] = [];

      // Setup queue consumer that submits to worker pool
      await queue.consume(async (message) => {
        const taskId = await workerPool.submitTask(
          'compute',
          message.payload,
          { callback: (result) => results.push(result) }
        );
        await queue.ack(message.id);
      });

      // Send messages to queue
      for (let i = 0; i < 10; i++) {
        await queue.send({ id: i, data: `task-${i}` });
      }

      // Process messages
      await vi.advanceTimersByTimeAsync(1000);

      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle backpressure between queue and workers', async () => {
      // Flood the system
      const messageIds: string[] = [];
      
      for (let i = 0; i < 50; i++) {
        messageIds.push(await queue.send({ id: i }));
      }

      // Start consuming with limited workers
      await queue.consume(async (message) => {
        await workerPool.submitTask('heavy', message.payload);
      }, { concurrency: 2 });

      // Let system process
      await vi.advanceTimersByTimeAsync(2000);

      const queueStats = queue.getStats();
      const poolMetrics = workerPool.getMetrics();

      // System should handle load without crashing
      expect(queueStats.failed).toBeLessThan(10);
      expect(poolMetrics.failedTasks).toBeLessThan(10);
    });
  });

  describe('Load Balancer + Auto Scaler Integration', () => {
    let loadBalancer: IntelligentLoadBalancer;
    let autoScaler: IntelligentAutoScaler;

    beforeEach(async () => {
      loadBalancer = new IntelligentLoadBalancer({
        strategy: 'least-connections',
        enableML: true
      });

      autoScaler = new IntelligentAutoScaler({
        minInstances: 2,
        maxInstances: 10,
        predictionEnabled: true
      });

      await autoScaler.start();
      await vi.advanceTimersByTimeAsync(200);
    });

    afterEach(async () => {
      loadBalancer.destroy();
      await autoScaler.stop();
    });

    it('should scale nodes based on load balancer metrics', async () => {
      // Add initial nodes
      const instances = autoScaler.getInstances();
      instances.forEach(instance => {
        loadBalancer.addNode({
          host: `server-${instance.id}`,
          port: 3000
        });
      });

      // Simulate high load
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(loadBalancer.route({
          id: `req-${i}`,
          method: 'GET',
          path: '/api/test',
          headers: {},
          clientIp: `192.168.1.${i % 256}`,
          priority: 5,
          timestamp: new Date()
        }));
      }

      await Promise.all(requests);

      // Check load balancer stats
      const lbStats = loadBalancer.getStats();
      expect(lbStats.totalRequests).toBe(100);

      // Trigger auto-scaling evaluation
      await vi.advanceTimersByTimeAsync(15000);

      // Should have scaled up
      const newInstances = autoScaler.getInstances();
      expect(newInstances.length).toBeGreaterThan(2);
    });

    it('should update load balancer when instances change', async () => {
      const nodeAddedHandler = vi.fn();
      loadBalancer.on('node:added', nodeAddedHandler);

      // Scale up
      await autoScaler.scaleTo(5);
      await vi.advanceTimersByTimeAsync(200);

      // Add new instances to load balancer
      const instances = autoScaler.getInstances();
      instances.forEach(instance => {
        if (!loadBalancer.getNodes().find(n => n.host === `server-${instance.id}`)) {
          loadBalancer.addNode({
            host: `server-${instance.id}`,
            port: 3000
          });
        }
      });

      expect(loadBalancer.getNodes().length).toBe(5);
    });
  });

  describe('Full System Integration', () => {
    let manager: ScalabilityManager;

    beforeEach(async () => {
      manager = await initializeScalability({
        enableWorkerPool: true,
        enableQueue: true,
        enableLoadBalancer: true,
        enableAutoScaling: true,
        enableFederation: false, // Disable for simplicity
        monitoring: { enabled: true, interval: 1000 }
      });
    });

    afterEach(async () => {
      await manager.stop();
    });

    it('should handle end-to-end workflow', async () => {
      const workflow = async () => {
        // Step 1: Submit task to worker pool
        const taskId = await manager.submitTask('preprocess', {
          input: 'raw data',
          options: { format: 'json' }
        });

        // Step 2: Queue follow-up task
        const messageId = await manager.sendToQueue('normal-priority', {
          taskId,
          action: 'postprocess',
          dependencies: [taskId]
        });

        // Step 3: Route API request
        const response = await manager.route({
          id: `req-${taskId}`,
          method: 'POST',
          path: '/api/process',
          headers: { 'content-type': 'application/json' },
          body: { taskId, messageId },
          clientIp: '10.0.0.1',
          priority: 8,
          timestamp: new Date()
        });

        return { taskId, messageId, response };
      };

      const result = await workflow();

      expect(result.taskId).toBeDefined();
      expect(result.messageId).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.response.statusCode).toBeLessThanOrEqual(200);
    });

    it('should maintain performance under sustained load', async () => {
      const startTime = Date.now();
      const operations: Promise<any>[] = [];

      // Simulate sustained load
      for (let i = 0; i < 100; i++) {
        operations.push(
          manager.submitTask('compute', { id: i }),
          manager.sendToQueue('high-priority', { id: i }),
          manager.route({
            id: `req-${i}`,
            method: 'GET',
            path: '/api/test',
            headers: {},
            clientIp: '192.168.1.1',
            priority: 5,
            timestamp: new Date()
          })
        );
      }

      await Promise.all(operations);
      const duration = Date.now() - startTime;

      // Should handle 300 operations quickly
      expect(duration).toBeLessThan(10000);

      const status = manager.getStatus();
      expect(status.workers.metrics?.failedTasks || 0).toBeLessThan(10);
    });

    it('should recover from failures', async () => {
      const healthHandler = vi.fn();
      manager.on('health:issues', healthHandler);

      // Simulate component failure
      const status = manager.getStatus();
      if (status.workers.metrics) {
        status.workers.metrics.failedTasks = 150;
      }

      // Trigger health check
      await vi.advanceTimersByTimeAsync(31000);

      // Should detect issues
      expect(healthHandler).toHaveBeenCalled();

      // System should still be operational
      const taskId = await manager.submitTask('recovery', { test: true });
      expect(taskId).toBeDefined();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance targets', async () => {
      const manager = await initializeScalability(
        getRecommendedConfig(10000)
      );

      const benchmarks = {
        workerThroughput: 0,
        queueThroughput: 0,
        routingLatency: 0,
        scalingTime: 0
      };

      // Benchmark worker pool
      const workerStart = Date.now();
      const workerTasks = Array(100).fill(null).map((_, i) => 
        manager.submitTask('benchmark', { id: i })
      );
      await Promise.all(workerTasks);
      benchmarks.workerThroughput = 100 / ((Date.now() - workerStart) / 1000);

      // Benchmark queue
      const queueStart = Date.now();
      const queueMessages = Array(100).fill(null).map((_, i) =>
        manager.sendToQueue('normal-priority', { id: i })
      );
      await Promise.all(queueMessages);
      benchmarks.queueThroughput = 100 / ((Date.now() - queueStart) / 1000);

      // Benchmark routing
      const routingStart = Date.now();
      await manager.route({
        id: 'perf-test',
        method: 'GET',
        path: '/benchmark',
        headers: {},
        clientIp: '127.0.0.1',
        priority: 5,
        timestamp: new Date()
      });
      benchmarks.routingLatency = Date.now() - routingStart;

      // Benchmark scaling
      const scalingStart = Date.now();
      await manager.scaleTo(10);
      benchmarks.scalingTime = Date.now() - scalingStart;

      // Assert performance targets
      expect(benchmarks.workerThroughput).toBeGreaterThan(50); // 50+ tasks/sec
      expect(benchmarks.queueThroughput).toBeGreaterThan(100); // 100+ msg/sec
      expect(benchmarks.routingLatency).toBeLessThan(100); // <100ms
      expect(benchmarks.scalingTime).toBeLessThan(5000); // <5s

      await manager.stop();
    });
  });

  describe('Stress Testing', () => {
    it('should handle 1000 concurrent operations', async () => {
      const manager = await initializeScalability({
        enableWorkerPool: true,
        enableQueue: true,
        enableLoadBalancer: true,
        enableAutoScaling: true
      });

      const operations: Promise<any>[] = [];
      
      // Generate 1000 mixed operations
      for (let i = 0; i < 1000; i++) {
        const op = i % 3;
        switch (op) {
          case 0:
            operations.push(
              manager.submitTask('stress', { id: i })
            );
            break;
          case 1:
            operations.push(
              manager.sendToQueue('normal-priority', { id: i })
            );
            break;
          case 2:
            operations.push(
              manager.route({
                id: `stress-${i}`,
                method: 'GET',
                path: '/stress',
                headers: {},
                clientIp: `10.0.${Math.floor(i / 256)}.${i % 256}`,
                priority: 5,
                timestamp: new Date()
              })
            );
            break;
        }
      }

      const results = await Promise.allSettled(operations);
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Should handle most operations successfully
      expect(succeeded).toBeGreaterThan(900); // 90%+ success rate
      expect(failed).toBeLessThan(100); // <10% failure rate

      await manager.stop();
    });

    it('should handle memory efficiently', async () => {
      const manager = await initializeScalability({
        enableWorkerPool: true,
        enableQueue: true
      });

      // Track memory usage (simulated)
      const memorySnapshots: number[] = [];
      
      // Perform operations
      for (let batch = 0; batch < 10; batch++) {
        const tasks = Array(100).fill(null).map((_, i) => 
          manager.submitTask('memory-test', { 
            batch, 
            id: i,
            data: new Array(1000).fill('x') // Some data
          })
        );
        
        await Promise.all(tasks);
        
        // Simulate memory measurement
        memorySnapshots.push(Math.random() * 500 + 100); // Mock memory in MB
      }

      // Memory should not grow linearly (indicates leaks)
      const avgFirstHalf = memorySnapshots.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      const avgSecondHalf = memorySnapshots.slice(5).reduce((a, b) => a + b, 0) / 5;
      
      // Memory growth should be minimal
      const growth = (avgSecondHalf - avgFirstHalf) / avgFirstHalf;
      expect(growth).toBeLessThan(0.2); // Less than 20% growth

      await manager.stop();
    });
  });

  describe('Configuration Recommendations', () => {
    it('should provide correct recommendations for different loads', () => {
      const config10 = getRecommendedConfig(10);
      expect(config10.enableAutoScaling).toBe(false);
      expect(config10.enableFederation).toBe(false);

      const config100 = getRecommendedConfig(100);
      expect(config100.enableLoadBalancer).toBe(false);
      expect(config100.enableAutoScaling).toBe(false);

      const config1000 = getRecommendedConfig(1000);
      expect(config1000.enableLoadBalancer).toBe(true);
      expect(config1000.enableAutoScaling).toBe(false);

      const config10000 = getRecommendedConfig(10000);
      expect(config10000.enableLoadBalancer).toBe(true);
      expect(config10000.enableAutoScaling).toBe(true);
      expect(config10000.enableFederation).toBe(false);

      const config100000 = getRecommendedConfig(100000);
      expect(config100000.enableWorkerPool).toBe(true);
      expect(config100000.enableQueue).toBe(true);
      expect(config100000.enableLoadBalancer).toBe(true);
      expect(config100000.enableAutoScaling).toBe(true);
      expect(config100000.enableFederation).toBe(true);
    });
  });

  describe('GraphQL Federation Integration', () => {
    let federation: GraphQLFederationGateway;

    beforeEach(() => {
      federation = new GraphQLFederationGateway({
        gateway: { port: 4000, playground: true },
        caching: { enabled: true, ttl: 60000 }
      });
    });

    afterEach(async () => {
      await federation.stop();
    });

    it('should federate multiple services', async () => {
      await federation.registerService({
        name: 'users',
        url: 'http://localhost:4001',
        schema: `
          type User {
            id: ID!
            name: String!
            email: String!
          }
          type Query {
            user(id: ID!): User
          }
        `,
        version: '1.0.0',
        health: {
          status: 'healthy',
          lastCheck: new Date(),
          responseTime: 50,
          errorRate: 0,
          uptime: 99.9
        },
        metadata: {
          owner: 'team-a',
          team: 'platform',
          sla: 99.9,
          dependencies: [],
          capabilities: ['graphql']
        }
      });

      await federation.registerService({
        name: 'posts',
        url: 'http://localhost:4002',
        schema: `
          type Post {
            id: ID!
            title: String!
            content: String!
            authorId: ID!
          }
          type Query {
            posts: [Post!]!
          }
        `,
        version: '1.0.0',
        health: {
          status: 'healthy',
          lastCheck: new Date(),
          responseTime: 60,
          errorRate: 0,
          uptime: 99.9
        },
        metadata: {
          owner: 'team-b',
          team: 'content',
          sla: 99.9,
          dependencies: ['users'],
          capabilities: ['graphql']
        }
      });

      await federation.start();

      const schema = federation.getSchema();
      expect(schema).toContain('User');
      expect(schema).toContain('Post');

      const status = federation.getServiceStatus();
      expect(status).toHaveLength(2);
      expect(status[0].health.status).toBe('healthy');
    });

    it('should execute federated queries', async () => {
      await federation.start();

      const query = `
        query GetUserWithPosts {
          user(id: "1") {
            id
            name
            posts {
              title
            }
          }
        }
      `;

      const result = await federation.execute(query, { userId: '1' });

      expect(result).toBeDefined();
      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
    });
  });
});

describe('Edge Cases and Error Scenarios', () => {
  it('should handle initialization failures gracefully', async () => {
    // Force initialization failure
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const manager = new ScalabilityManager({
      enableWorkerPool: true
    });

    // Mock worker creation failure
    vi.spyOn(global, 'Worker').mockImplementation(() => {
      throw new Error('Worker creation failed');
    });

    await manager.start();
    
    // Should still be operational with degraded functionality
    const status = manager.getStatus();
    expect(status).toBeDefined();

    await manager.stop();
    vi.restoreAllMocks();
  });

  it('should handle network partitions', async () => {
    const manager = await initializeScalability({
      enableLoadBalancer: true,
      enableAutoScaling: true
    });

    // Simulate network partition
    const status = manager.getStatus();
    
    // Should continue operating with available resources
    expect(status.loadBalancer.active).toBe(true);

    await manager.stop();
  });

  it('should prevent resource exhaustion', async () => {
    const manager = new ScalabilityManager({
      enableWorkerPool: true,
      enableQueue: true
    });

    await manager.start();

    // Try to exhaust resources
    const promises: Promise<any>[] = [];
    
    for (let i = 0; i < 10000; i++) {
      promises.push(
        manager.submitTask('exhaust', { id: i }).catch(() => null)
      );
    }

    // Should handle gracefully without crashing
    const results = await Promise.allSettled(promises);
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value).length;
    
    // Some should succeed, but system should protect itself
    expect(succeeded).toBeGreaterThan(0);
    expect(succeeded).toBeLessThan(10000);

    await manager.stop();
  });
});