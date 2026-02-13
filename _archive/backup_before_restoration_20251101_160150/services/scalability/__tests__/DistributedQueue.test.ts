/**
 * PLAN C PHASE 5 - Tests Unitaires DistributedQueue
 * Tests complets pour le système de queue distribuée
 * Coverage cible: 95%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DistributedQueue, QueueManager } from '../DistributedQueue';
import type {
  QueueConfig,
  Message,
  QueueStats,
  ConsumerOptions,
  ProducerOptions,
  MessageHandler
} from '../DistributedQueue';

// Mock localStorage
const localStorageMock = {
  storage: new Map<string, string>(),
  getItem: vi.fn((key: string) => localStorageMock.storage.get(key) || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.storage.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    localStorageMock.storage.delete(key);
  }),
  clear: vi.fn(() => {
    localStorageMock.storage.clear();
  })
};

// @ts-ignore
global.localStorage = localStorageMock;

describe('DistributedQueue', () => {
  let queue: DistributedQueue<any>;
  
  beforeEach(() => {
    vi.useFakeTimers();
    localStorageMock.clear();
  });
  
  afterEach(() => {
    if (queue) {
      queue.purge();
    }
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create queue with default configuration', () => {
      queue = new DistributedQueue();
      const stats = queue.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.name).toBe('default');
      expect(stats.size).toBe(0);
      expect(stats.pending).toBe(0);
    });

    it('should create queue with custom configuration', () => {
      const config: Partial<QueueConfig> = {
        name: 'test-queue',
        type: 'redis',
        maxSize: 5000,
        maxRetries: 5,
        retryDelay: 2000,
        visibilityTimeout: 60000,
        deadLetterQueue: true,
        persistence: true,
        clustering: true,
        partitions: 3,
        replicationFactor: 2
      };
      
      queue = new DistributedQueue(config);
      const stats = queue.getStats();
      
      expect(stats.name).toBe('test-queue');
    });

    it('should initialize with persistence', async () => {
      // Pre-populate localStorage
      const existingMessage = {
        id: 'msg-existing',
        queue: 'persistent-queue',
        payload: { data: 'persisted' },
        metadata: {
          contentType: 'application/json',
          encoding: 'utf-8',
          headers: {}
        },
        attempts: 0,
        maxRetries: 3,
        priority: 5,
        timestamp: new Date()
      };
      
      localStorageMock.setItem(
        'queue:persistent-queue',
        JSON.stringify([['msg-existing', existingMessage]])
      );
      
      queue = new DistributedQueue({
        name: 'persistent-queue',
        persistence: true
      });
      
      // Wait for initialization
      await vi.advanceTimersByTimeAsync(100);
      
      const stats = queue.getStats();
      expect(stats.size).toBe(1);
      expect(stats.pending).toBe(1);
      
      const message = queue.getMessage('msg-existing');
      expect(message).toBeDefined();
      expect(message?.payload).toEqual({ data: 'persisted' });
    });

    it('should initialize with clustering', async () => {
      const clusterHandler = vi.fn();
      
      queue = new DistributedQueue({
        clustering: true
      });
      
      queue.on('heartbeat:sent', clusterHandler);
      
      // Wait for first heartbeat
      await vi.advanceTimersByTimeAsync(5100);
      
      expect(clusterHandler).toHaveBeenCalled();
    });
  });

  describe('Message Sending', () => {
    beforeEach(() => {
      queue = new DistributedQueue({
        maxSize: 10
      });
    });

    it('should send a message', async () => {
      const messageId = await queue.send({ data: 'test' });
      
      expect(messageId).toBeDefined();
      expect(messageId).toMatch(/^msg-/);
      
      const stats = queue.getStats();
      expect(stats.size).toBe(1);
      expect(stats.pending).toBe(1);
    });

    it('should send message with options', async () => {
      const options: Partial<ProducerOptions> = {
        persistent: true,
        priority: 10,
        expiration: 5000,
        headers: { 'x-custom': 'value' }
      };
      
      const messageId = await queue.send({ data: 'test' }, options);
      
      const message = queue.getMessage(messageId);
      expect(message?.priority).toBe(10);
      expect(message?.metadata.headers['x-custom']).toBe('value');
      expect(message?.expiration).toBeDefined();
    });

    it('should reject when queue is full', async () => {
      const smallQueue = new DistributedQueue({ maxSize: 2 });
      
      await smallQueue.send({ data: 1 });
      await smallQueue.send({ data: 2 });
      
      await expect(smallQueue.send({ data: 3 }))
        .rejects.toThrow('Queue is full');
      
      smallQueue.purge();
    });

    it('should emit message:sent event', async () => {
      const sentHandler = vi.fn();
      queue.on('message:sent', sentHandler);
      
      await queue.send({ data: 'test' });
      
      expect(sentHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^msg-/),
          payload: { data: 'test' }
        })
      );
    });

    it('should handle message expiration', async () => {
      const messageId = await queue.send(
        { data: 'expires' },
        { expiration: 1000 }
      );
      
      // Advance past expiration
      await vi.advanceTimersByTimeAsync(1100);
      
      const message = queue.getMessage(messageId);
      expect(message?.expiration).toBeDefined();
      
      // Trigger cleanup
      await vi.advanceTimersByTimeAsync(5000);
      
      const stats = queue.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Batch Sending', () => {
    beforeEach(() => {
      queue = new DistributedQueue();
    });

    it('should send batch of messages', async () => {
      const messages = [
        { payload: { id: 1 }, options: { priority: 5 } },
        { payload: { id: 2 }, options: { priority: 8 } },
        { payload: { id: 3 }, options: { priority: 3 } }
      ];
      
      const messageIds = await queue.sendBatch(messages);
      
      expect(messageIds).toHaveLength(3);
      messageIds.forEach(id => {
        expect(id).toMatch(/^msg-/);
      });
      
      const stats = queue.getStats();
      expect(stats.size).toBe(3);
      expect(stats.pending).toBe(3);
    });

    it('should emit batch:sent event', async () => {
      const batchHandler = vi.fn();
      queue.on('batch:sent', batchHandler);
      
      const messages = Array(5).fill(null).map((_, i) => ({
        payload: { id: i }
      }));
      
      await queue.sendBatch(messages);
      
      expect(batchHandler).toHaveBeenCalledWith({ count: 5 });
    });

    it('should retry batch on failure', async () => {
      const failQueue = new DistributedQueue({ maxSize: 2 });
      
      const messages = Array(5).fill(null).map((_, i) => ({
        payload: { id: i }
      }));
      
      // This should retry and eventually succeed partially
      const messageIds = await failQueue.sendBatch(messages);
      
      expect(messageIds.length).toBeGreaterThan(0);
      failQueue.purge();
    });
  });

  describe('Message Consumption', () => {
    beforeEach(async () => {
      queue = new DistributedQueue();
      
      // Add some messages
      await queue.send({ data: 'message1' }, { priority: 5 });
      await queue.send({ data: 'message2' }, { priority: 8 });
      await queue.send({ data: 'message3' }, { priority: 3 });
    });

    it('should consume messages', async () => {
      const processedMessages: Message[] = [];
      const handler: MessageHandler = async (message) => {
        processedMessages.push(message);
      };
      
      const consumerId = await queue.consume(handler);
      
      expect(consumerId).toMatch(/^consumer-/);
      
      // Let consumer process messages
      await vi.advanceTimersByTimeAsync(100);
      
      expect(processedMessages.length).toBeGreaterThan(0);
    });

    it('should consume with options', async () => {
      const handler: MessageHandler = vi.fn();
      const options: Partial<ConsumerOptions> = {
        concurrency: 2,
        batchSize: 2,
        prefetch: 5,
        autoAck: false,
        exclusive: true,
        priority: 10
      };
      
      const consumerId = await queue.consume(handler, options);
      
      expect(consumerId).toBeDefined();
      
      // Let consumer process
      await vi.advanceTimersByTimeAsync(100);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should process messages by priority', async () => {
      const processedPriorities: number[] = [];
      const handler: MessageHandler = async (message) => {
        processedPriorities.push(message.priority);
      };
      
      await queue.consume(handler);
      
      // Let consumer process all messages
      await vi.advanceTimersByTimeAsync(200);
      
      // Should process highest priority first
      expect(processedPriorities[0]).toBe(8);
    });

    it('should stop consumer', async () => {
      const handler: MessageHandler = vi.fn();
      const consumerId = await queue.consume(handler);
      
      const stopHandler = vi.fn();
      queue.on('consumer:stopped', stopHandler);
      
      await queue.stopConsumer(consumerId);
      
      expect(stopHandler).toHaveBeenCalledWith({ consumerId });
    });

    it('should emit consumer events', async () => {
      const startHandler = vi.fn();
      queue.on('consumer:started', startHandler);
      
      const consumerId = await queue.consume(async () => {});
      
      expect(startHandler).toHaveBeenCalledWith({ consumerId });
    });
  });

  describe('Message Acknowledgment', () => {
    let messageId: string;
    let consumerId: string;
    
    beforeEach(async () => {
      queue = new DistributedQueue();
      messageId = await queue.send({ data: 'test' });
      
      // Start consumer with manual ack
      consumerId = await queue.consume(
        async (message) => {
          // Don't auto-ack
        },
        { autoAck: false }
      );
      
      // Let message be picked up
      await vi.advanceTimersByTimeAsync(50);
    });

    it('should acknowledge message', async () => {
      const ackHandler = vi.fn();
      queue.on('message:acked', ackHandler);
      
      await queue.ack(messageId);
      
      expect(ackHandler).toHaveBeenCalledWith({ messageId });
      
      const stats = queue.getStats();
      expect(stats.completed).toBe(1);
    });

    it('should reject message with requeue', async () => {
      const nackHandler = vi.fn();
      queue.on('message:nacked', nackHandler);
      
      await queue.nack(messageId, true);
      
      expect(nackHandler).toHaveBeenCalledWith({
        messageId,
        requeue: true
      });
      
      // Message should be requeued after delay
      await vi.advanceTimersByTimeAsync(1100);
      
      const stats = queue.getStats();
      expect(stats.pending).toBeGreaterThan(0);
    });

    it('should reject message without requeue', async () => {
      await queue.nack(messageId, false);
      
      const stats = queue.getStats();
      expect(stats.failed).toBe(1);
    });

    it('should move to dead letter queue after max retries', async () => {
      const dlqHandler = vi.fn();
      queue.on('message:dead-lettered', dlqHandler);
      
      // Simulate max retries
      const message = queue.getMessage(messageId);
      if (message) {
        message.attempts = message.maxRetries;
      }
      
      await queue.nack(messageId, true);
      
      expect(dlqHandler).toHaveBeenCalled();
      
      const stats = queue.getStats();
      expect(stats.deadLetter).toBe(1);
    });
  });

  describe('Queue Management', () => {
    beforeEach(async () => {
      queue = new DistributedQueue();
      
      // Add messages
      for (let i = 0; i < 5; i++) {
        await queue.send({ id: i });
      }
    });

    it('should purge queue', async () => {
      const purgeHandler = vi.fn();
      queue.on('queue:purged', purgeHandler);
      
      const count = await queue.purge();
      
      expect(count).toBe(5);
      expect(purgeHandler).toHaveBeenCalledWith({ count: 5 });
      
      const stats = queue.getStats();
      expect(stats.size).toBe(0);
      expect(stats.pending).toBe(0);
    });

    it('should get queue statistics', () => {
      const stats = queue.getStats();
      
      expect(stats).toHaveProperty('name');
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('processing');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('deadLetter');
      expect(stats).toHaveProperty('throughput');
      expect(stats).toHaveProperty('avgProcessingTime');
      expect(stats).toHaveProperty('errorRate');
    });

    it('should get message by ID', async () => {
      const messageId = await queue.send({ test: 'data' });
      
      const message = queue.getMessage(messageId);
      
      expect(message).toBeDefined();
      expect(message?.payload).toEqual({ test: 'data' });
    });
  });

  describe('Queue Binding', () => {
    let queue2: DistributedQueue;
    
    beforeEach(() => {
      queue = new DistributedQueue({ name: 'queue1' });
      queue2 = new DistributedQueue({ name: 'queue2' });
    });
    
    afterEach(() => {
      if (queue2) {
        queue2.purge();
      }
    });

    it('should bind queues', () => {
      const bindHandler = vi.fn();
      queue.on('queue:bound', bindHandler);
      
      queue.bind({
        source: 'queue1',
        target: 'queue2',
        routingKey: 'test.*'
      });
      
      expect(bindHandler).toHaveBeenCalled();
    });

    it('should unbind queues', () => {
      queue.bind({
        source: 'queue1',
        target: 'queue2'
      });
      
      const unbindHandler = vi.fn();
      queue.on('queue:unbound', unbindHandler);
      
      queue.unbind('queue1', 'queue2');
      
      expect(unbindHandler).toHaveBeenCalledWith({
        source: 'queue1',
        target: 'queue2'
      });
    });

    it('should filter messages with binding', () => {
      const binding = {
        source: 'queue1',
        target: 'queue2',
        filter: (message: Message) => message.priority > 5
      };
      
      queue.bind(binding);
      
      // Binding is stored
      expect(queue['bindings']).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      queue = new DistributedQueue();
    });

    it('should handle consumer errors', async () => {
      const errorHandler = vi.fn();
      queue.on('message:error', errorHandler);
      
      const failingHandler: MessageHandler = async () => {
        throw new Error('Processing failed');
      };
      
      await queue.send({ data: 'will-fail' });
      await queue.consume(failingHandler);
      
      // Let consumer process and fail
      await vi.advanceTimersByTimeAsync(100);
      
      expect(errorHandler).toHaveBeenCalled();
    });

    it('should handle processing timeout', async () => {
      const slowHandler: MessageHandler = async () => {
        await new Promise(resolve => setTimeout(resolve, 60000));
      };
      
      queue = new DistributedQueue({
        visibilityTimeout: 100
      });
      
      await queue.send({ data: 'slow' });
      await queue.consume(slowHandler);
      
      // Advance past timeout
      await vi.advanceTimersByTimeAsync(200);
      
      const stats = queue.getStats();
      expect(stats.failed).toBeGreaterThan(0);
    });

    it('should return stuck messages to queue', async () => {
      const handler: MessageHandler = async () => {
        // Simulate stuck processing
        await new Promise(() => {}); // Never resolves
      };
      
      await queue.send({ data: 'stuck' });
      await queue.consume(handler, { autoAck: false });
      
      // Let message be picked up
      await vi.advanceTimersByTimeAsync(50);
      
      const stats1 = queue.getStats();
      expect(stats1.processing).toBe(1);
      
      // Advance past visibility timeout
      await vi.advanceTimersByTimeAsync(30100);
      
      const stats2 = queue.getStats();
      expect(stats2.processing).toBe(0);
      expect(stats2.pending).toBe(1);
    });
  });

  describe('Metrics and Monitoring', () => {
    beforeEach(async () => {
      queue = new DistributedQueue();
    });

    it('should track throughput', async () => {
      const handler: MessageHandler = async () => {
        // Quick processing
      };
      
      // Send and process multiple messages
      for (let i = 0; i < 10; i++) {
        await queue.send({ id: i });
      }
      
      await queue.consume(handler);
      await vi.advanceTimersByTimeAsync(500);
      
      const stats = queue.getStats();
      expect(stats.throughput).toBeGreaterThan(0);
    });

    it('should track average processing time', async () => {
      const handler: MessageHandler = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      };
      
      await queue.send({ data: 'test' });
      await queue.consume(handler);
      
      await vi.advanceTimersByTimeAsync(100);
      
      const stats = queue.getStats();
      expect(stats.avgProcessingTime).toBeGreaterThan(0);
    });

    it('should calculate error rate', async () => {
      let shouldFail = true;
      const handler: MessageHandler = async () => {
        if (shouldFail) {
          shouldFail = false;
          throw new Error('Fail');
        }
      };
      
      await queue.send({ data: 1 });
      await queue.send({ data: 2 });
      await queue.consume(handler);
      
      await vi.advanceTimersByTimeAsync(200);
      
      const stats = queue.getStats();
      expect(stats.errorRate).toBeGreaterThan(0);
    });

    it('should emit metrics events', (done) => {
      queue.on('metrics:updated', (stats) => {
        expect(stats).toHaveProperty('throughput');
        expect(stats).toHaveProperty('avgProcessingTime');
        done();
      });
      
      // Trigger metrics update
      vi.advanceTimersByTime(5100);
    });
  });

  describe('Persistence', () => {
    beforeEach(() => {
      queue = new DistributedQueue({
        name: 'persistent-test',
        persistence: true
      });
    });

    it('should persist messages to localStorage', async () => {
      await queue.send({ data: 'persist-me' });
      
      // Check localStorage
      const stored = localStorageMock.getItem('queue:persistent-test');
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
    });

    it('should remove from persistence on ack', async () => {
      const messageId = await queue.send({ data: 'temp' });
      
      const handler: MessageHandler = async () => {};
      await queue.consume(handler);
      
      await vi.advanceTimersByTimeAsync(100);
      await queue.ack(messageId);
      
      // Should be removed from persistence
      const stored = localStorageMock.getItem('queue:persistent-test');
      const parsed = stored ? JSON.parse(stored) : [];
      expect(parsed).toHaveLength(0);
    });

    it('should clear persistence on purge', async () => {
      await queue.send({ data: 1 });
      await queue.send({ data: 2 });
      
      await queue.purge();
      
      const stored = localStorageMock.getItem('queue:persistent-test');
      const parsed = stored ? JSON.parse(stored) : [];
      expect(parsed).toHaveLength(0);
    });
  });

  describe('Clustering', () => {
    beforeEach(() => {
      queue = new DistributedQueue({
        clustering: true,
        replicationFactor: 2
      });
    });

    it('should broadcast heartbeat', (done) => {
      queue.on('heartbeat:sent', (event) => {
        expect(event.nodeId).toBeDefined();
        done();
      });
      
      // Trigger heartbeat
      vi.advanceTimersByTime(5100);
    });

    it('should replicate messages', async () => {
      const replicateHandler = vi.fn();
      queue.on('message:replicated', replicateHandler);
      
      await queue.send({ data: 'replicate-me' });
      
      // Should attempt replication
      expect(replicateHandler).toHaveBeenCalled();
    });
  });
});

describe('QueueManager', () => {
  let manager: QueueManager;
  
  beforeEach(() => {
    manager = QueueManager.getInstance();
  });
  
  afterEach(() => {
    // Clean up all queues
    manager.getAllQueues().forEach(name => {
      manager.deleteQueue(name);
    });
  });

  describe('Queue Management', () => {
    it('should be singleton', () => {
      const manager2 = QueueManager.getInstance();
      expect(manager).toBe(manager2);
    });

    it('should create queue', () => {
      const queue = manager.createQueue('test-queue', {
        maxSize: 1000
      });
      
      expect(queue).toBeDefined();
      expect(queue.getStats().name).toBe('test-queue');
    });

    it('should get existing queue', () => {
      const queue1 = manager.createQueue('shared-queue');
      const queue2 = manager.getQueue('shared-queue');
      
      expect(queue1).toBe(queue2);
    });

    it('should return same queue if already exists', () => {
      const queue1 = manager.createQueue('duplicate');
      const queue2 = manager.createQueue('duplicate');
      
      expect(queue1).toBe(queue2);
    });

    it('should delete queue', () => {
      manager.createQueue('temp-queue');
      manager.deleteQueue('temp-queue');
      
      const queue = manager.getQueue('temp-queue');
      expect(queue).toBeUndefined();
    });

    it('should list all queues', () => {
      manager.createQueue('queue1');
      manager.createQueue('queue2');
      manager.createQueue('queue3');
      
      const queues = manager.getAllQueues();
      expect(queues).toContain('queue1');
      expect(queues).toContain('queue2');
      expect(queues).toContain('queue3');
    });

    it('should get global stats', () => {
      const queue1 = manager.createQueue('stats-queue1');
      const queue2 = manager.createQueue('stats-queue2');
      
      queue1.send({ data: 1 });
      queue2.send({ data: 2 });
      
      const globalStats = manager.getGlobalStats();
      
      expect(globalStats['stats-queue1']).toBeDefined();
      expect(globalStats['stats-queue2']).toBeDefined();
      expect(globalStats['stats-queue1'].size).toBe(1);
      expect(globalStats['stats-queue2'].size).toBe(1);
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for typed queues', async () => {
      interface CustomMessage {
        userId: string;
        action: string;
        timestamp: number;
      }
      
      const typedQueue = manager.createQueue<CustomMessage>('typed-queue');
      
      await typedQueue.send({
        userId: 'user123',
        action: 'login',
        timestamp: Date.now()
      });
      
      const handler: MessageHandler<CustomMessage> = async (message) => {
        expect(message.payload.userId).toBe('user123');
        expect(message.payload.action).toBe('login');
      };
      
      await typedQueue.consume(handler);
    });
  });
});