/**
 * PLAN C PHASE 5 - Tests Unitaires WorkerPool
 * Tests complets avec ultra think methodology
 * Coverage cible: 95%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DistributedWorkerPool } from '../WorkerPool';
import type { 
  WorkerConfig, 
  WorkerTask, 
  WorkerInstance,
  PoolMetrics,
  TaskResult 
} from '../WorkerPool';

// Mock Worker global
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  
  postMessage(data: any): void {
    // Simulate async processing
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', {
          data: {
            success: Math.random() > 0.1,
            taskId: data.task?.id,
            result: { processed: true }
          }
        }));
      }
    }, 10);
  }
  
  terminate(): void {
    // Cleanup
  }
}

// @ts-ignore
global.Worker = MockWorker as any;
global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url')
} as any;

describe('DistributedWorkerPool', () => {
  let pool: DistributedWorkerPool;
  
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(async () => {
    if (pool) {
      await pool.stop();
    }
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create pool with default config', () => {
      pool = new DistributedWorkerPool();
      const metrics = pool.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.totalWorkers).toBe(0);
      expect(metrics.queuedTasks).toBe(0);
    });

    it('should create pool with custom config', () => {
      const config: Partial<WorkerConfig> = {
        maxWorkers: 20,
        minWorkers: 5,
        taskTimeout: 60000,
        maxRetries: 5
      };
      
      pool = new DistributedWorkerPool(config);
      const metrics = pool.getMetrics();
      
      expect(metrics).toBeDefined();
    });
  });

  describe('Worker Management', () => {
    beforeEach(() => {
      pool = new DistributedWorkerPool({
        minWorkers: 2,
        maxWorkers: 10,
        autoScale: false
      });
    });

    it('should start pool and create initial workers', async () => {
      await pool.start();
      
      // Wait for workers to be created
      await vi.advanceTimersByTimeAsync(100);
      
      const metrics = pool.getMetrics();
      expect(metrics.totalWorkers).toBe(2);
      expect(metrics.idleWorkers).toBe(2);
    });

    it('should stop pool and terminate all workers', async () => {
      await pool.start();
      await vi.advanceTimersByTimeAsync(100);
      
      await pool.stop();
      
      const metrics = pool.getMetrics();
      expect(metrics.totalWorkers).toBe(0);
    });

    it('should get worker status', async () => {
      await pool.start();
      await vi.advanceTimersByTimeAsync(100);
      
      const status = pool.getWorkerStatus();
      
      expect(Array.isArray(status)).toBe(true);
      expect(status.length).toBe(2);
      expect(status[0]).toHaveProperty('id');
      expect(status[0]).toHaveProperty('status');
      expect(status[0]).toHaveProperty('performance');
    });
  });

  describe('Task Submission', () => {
    beforeEach(async () => {
      pool = new DistributedWorkerPool({
        minWorkers: 2,
        maxWorkers: 10
      });
      await pool.start();
      await vi.advanceTimersByTimeAsync(100);
    });

    it('should submit task successfully', async () => {
      const taskId = await pool.submitTask('compute', { data: 'test' });
      
      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');
      expect(taskId).toMatch(/^task-/);
    });

    it('should submit task with priority', async () => {
      const taskId = await pool.submitTask('compute', { data: 'test' }, {
        priority: 10,
        timeout: 5000
      });
      
      expect(taskId).toBeDefined();
    });

    it('should submit task with callback', async () => {
      const callback = vi.fn();
      
      await pool.submitTask('compute', { data: 'test' }, {
        callback
      });
      
      // Process the task
      await vi.advanceTimersByTimeAsync(200);
      
      expect(callback).toHaveBeenCalled();
    });

    it('should reject task when queue is full', async () => {
      const poolWithSmallQueue = new DistributedWorkerPool({
        maxQueueSize: 1
      });
      await poolWithSmallQueue.start();
      
      await poolWithSmallQueue.submitTask('task1', {});
      await poolWithSmallQueue.submitTask('task2', {});
      
      await expect(
        poolWithSmallQueue.submitTask('task3', {})
      ).rejects.toThrow('Task queue is full');
      
      await poolWithSmallQueue.stop();
    });
  });

  describe('Batch Processing', () => {
    beforeEach(async () => {
      pool = new DistributedWorkerPool({
        minWorkers: 4
      });
      await pool.start();
      await vi.advanceTimersByTimeAsync(100);
    });

    it('should submit batch of tasks', async () => {
      const tasks = [
        { type: 'compute', payload: { id: 1 }, priority: 5 },
        { type: 'transform', payload: { id: 2 }, priority: 3 },
        { type: 'validate', payload: { id: 3 }, priority: 8 }
      ];
      
      const taskIds = await pool.submitBatch(tasks);
      
      expect(taskIds).toHaveLength(3);
      taskIds.forEach(id => {
        expect(id).toMatch(/^task-/);
      });
    });

    it('should emit batch progress events', async () => {
      const progressHandler = vi.fn();
      pool.on('batch:progress', progressHandler);
      
      const tasks = Array(10).fill(null).map((_, i) => ({
        type: 'compute',
        payload: { id: i }
      }));
      
      await pool.submitBatch(tasks);
      
      expect(progressHandler).toHaveBeenCalled();
    });
  });

  describe('Task Execution', () => {
    beforeEach(async () => {
      pool = new DistributedWorkerPool({
        minWorkers: 2,
        maxRetries: 2,
        taskTimeout: 1000
      });
      await pool.start();
      await vi.advanceTimersByTimeAsync(100);
    });

    it('should execute task and return result', async () => {
      const taskId = await pool.submitTask('compute', { value: 42 });
      
      // Let task process
      await vi.advanceTimersByTimeAsync(200);
      
      const result = await pool.getResult(taskId, 1000);
      
      expect(result).toBeDefined();
      expect(result?.taskId).toBe(taskId);
      expect(result?.success).toBeDefined();
    });

    it('should handle task timeout', async () => {
      const taskId = await pool.submitTask('compute', { value: 42 }, {
        timeout: 100
      });
      
      // Advance past timeout
      await vi.advanceTimersByTimeAsync(150);
      
      const result = await pool.getResult(taskId, 100);
      
      expect(result).toBeDefined();
      expect(result?.success).toBe(false);
      expect(result?.error?.message).toContain('timeout');
    });

    it('should retry failed tasks', async () => {
      const taskId = await pool.submitTask('compute', { fail: true });
      
      // Let it fail and retry
      await vi.advanceTimersByTimeAsync(500);
      
      const metrics = pool.getMetrics();
      expect(metrics.failedTasks).toBeGreaterThan(0);
    });

    it('should handle worker errors', async () => {
      const errorHandler = vi.fn();
      pool.on('worker:error', errorHandler);
      
      // Force worker error
      const workers = pool.getWorkerStatus();
      if (workers[0]) {
        // Simulate worker crash
        pool['handleWorkerError'](workers[0].id, new Error('Worker crashed'));
      }
      
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('Auto-Scaling', () => {
    beforeEach(async () => {
      pool = new DistributedWorkerPool({
        minWorkers: 2,
        maxWorkers: 10,
        autoScale: true
      });
      await pool.start();
      await vi.advanceTimersByTimeAsync(100);
    });

    it('should scale up when queue grows', async () => {
      const scaleUpHandler = vi.fn();
      pool.on('pool:scaled-up', scaleUpHandler);
      
      // Submit many tasks
      const tasks = Array(50).fill(null).map((_, i) => ({
        type: 'compute',
        payload: { id: i }
      }));
      
      await pool.submitBatch(tasks);
      
      // Trigger auto-scale check
      await vi.advanceTimersByTimeAsync(1100);
      
      const metrics = pool.getMetrics();
      expect(metrics.totalWorkers).toBeGreaterThan(2);
      expect(scaleUpHandler).toHaveBeenCalled();
    });

    it('should scale down when idle', async () => {
      // First scale up
      const tasks = Array(50).fill(null).map((_, i) => ({
        type: 'compute',
        payload: { id: i }
      }));
      await pool.submitBatch(tasks);
      await vi.advanceTimersByTimeAsync(1100);
      
      const scaleDownHandler = vi.fn();
      pool.on('pool:scaled-down', scaleDownHandler);
      
      // Wait for tasks to complete and workers to be idle
      await vi.advanceTimersByTimeAsync(5000);
      
      // Should scale down
      expect(scaleDownHandler).toHaveBeenCalled();
    });

    it('should respect min/max worker limits', async () => {
      // Try to scale beyond max
      const hugeBatch = Array(200).fill(null).map((_, i) => ({
        type: 'compute',
        payload: { id: i }
      }));
      
      await pool.submitBatch(hugeBatch);
      await vi.advanceTimersByTimeAsync(2000);
      
      const metrics = pool.getMetrics();
      expect(metrics.totalWorkers).toBeLessThanOrEqual(10);
      expect(metrics.totalWorkers).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Health Checks', () => {
    beforeEach(async () => {
      pool = new DistributedWorkerPool({
        minWorkers: 2,
        healthCheckInterval: 1000
      });
      await pool.start();
      await vi.advanceTimersByTimeAsync(100);
    });

    it('should perform health checks', async () => {
      const metrics1 = pool.getMetrics();
      
      // Advance time to trigger health check
      await vi.advanceTimersByTimeAsync(1100);
      
      const metrics2 = pool.getMetrics();
      expect(metrics2).toBeDefined();
    });

    it('should replace unhealthy workers', async () => {
      const unhealthyHandler = vi.fn();
      pool.on('worker:error', unhealthyHandler);
      
      // Simulate stuck worker
      const workers = pool.getWorkerStatus();
      const worker = pool['workers'].get(workers[0].id);
      if (worker) {
        worker.status = 'busy';
        worker.currentTask = {
          id: 'stuck-task',
          type: 'compute',
          payload: {},
          priority: 5,
          createdAt: new Date(Date.now() - 100000),
          retryCount: 0,
          timeout: 1000
        };
      }
      
      // Trigger health check
      await vi.advanceTimersByTimeAsync(5000);
      
      expect(unhealthyHandler).toHaveBeenCalled();
    });
  });

  describe('Metrics and Monitoring', () => {
    beforeEach(async () => {
      pool = new DistributedWorkerPool({
        minWorkers: 3
      });
      await pool.start();
      await vi.advanceTimersByTimeAsync(100);
    });

    it('should track pool metrics', async () => {
      const metrics = pool.getMetrics();
      
      expect(metrics).toHaveProperty('totalWorkers');
      expect(metrics).toHaveProperty('activeWorkers');
      expect(metrics).toHaveProperty('idleWorkers');
      expect(metrics).toHaveProperty('queuedTasks');
      expect(metrics).toHaveProperty('processedTasks');
      expect(metrics).toHaveProperty('failedTasks');
      expect(metrics).toHaveProperty('avgWaitTime');
      expect(metrics).toHaveProperty('avgExecutionTime');
      expect(metrics).toHaveProperty('throughput');
    });

    it('should update metrics after task execution', async () => {
      const initialMetrics = pool.getMetrics();
      
      await pool.submitTask('compute', { data: 'test' });
      await vi.advanceTimersByTimeAsync(200);
      
      const updatedMetrics = pool.getMetrics();
      expect(updatedMetrics.processedTasks).toBeGreaterThan(initialMetrics.processedTasks);
    });

    it('should calculate throughput', async () => {
      // Submit multiple tasks
      for (let i = 0; i < 10; i++) {
        await pool.submitTask('compute', { id: i });
      }
      
      await vi.advanceTimersByTimeAsync(1000);
      
      const metrics = pool.getMetrics();
      expect(metrics.throughput).toBeGreaterThan(0);
    });
  });

  describe('Event Emissions', () => {
    beforeEach(async () => {
      pool = new DistributedWorkerPool({
        minWorkers: 2
      });
    });

    it('should emit pool:started event', async () => {
      const handler = vi.fn();
      pool.on('pool:started', handler);
      
      await pool.start();
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          workers: expect.any(Number)
        })
      );
    });

    it('should emit task lifecycle events', async () => {
      const submittedHandler = vi.fn();
      const assignedHandler = vi.fn();
      const completedHandler = vi.fn();
      
      pool.on('task:submitted', submittedHandler);
      pool.on('task:assigned', assignedHandler);
      pool.on('task:completed', completedHandler);
      
      await pool.start();
      await vi.advanceTimersByTimeAsync(100);
      
      const taskId = await pool.submitTask('compute', {});
      await vi.advanceTimersByTimeAsync(500);
      
      expect(submittedHandler).toHaveBeenCalled();
      expect(assignedHandler).toHaveBeenCalled();
      expect(completedHandler).toHaveBeenCalled();
    });

    it('should emit worker lifecycle events', async () => {
      const createdHandler = vi.fn();
      const terminatedHandler = vi.fn();
      
      pool.on('worker:created', createdHandler);
      pool.on('worker:terminated', terminatedHandler);
      
      await pool.start();
      await vi.advanceTimersByTimeAsync(100);
      
      expect(createdHandler).toHaveBeenCalledTimes(2);
      
      await pool.stop();
      
      expect(terminatedHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Priority Queue', () => {
    beforeEach(async () => {
      pool = new DistributedWorkerPool({
        minWorkers: 1,
        priorityLevels: 5
      });
      await pool.start();
      await vi.advanceTimersByTimeAsync(100);
    });

    it('should process high priority tasks first', async () => {
      const results: string[] = [];
      
      // Submit tasks with different priorities
      await pool.submitTask('low', { id: 1 }, { 
        priority: 1,
        callback: () => results.push('low')
      });
      await pool.submitTask('high', { id: 2 }, { 
        priority: 5,
        callback: () => results.push('high')
      });
      await pool.submitTask('medium', { id: 3 }, { 
        priority: 3,
        callback: () => results.push('medium')
      });
      
      // Process all tasks
      await vi.advanceTimersByTimeAsync(1000);
      
      // High priority should be processed first
      expect(results[0]).toBe('high');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      pool = new DistributedWorkerPool({
        minWorkers: 2,
        maxRetries: 1
      });
      await pool.start();
      await vi.advanceTimersByTimeAsync(100);
    });

    it('should handle task submission errors gracefully', async () => {
      // Stop pool to cause submission error
      await pool.stop();
      
      const taskId = await pool.submitTask('compute', {});
      expect(taskId).toBeDefined(); // Should still return ID
    });

    it('should handle getResult timeout', async () => {
      const taskId = await pool.submitTask('compute', {});
      
      // Don't process the task
      const result = await pool.getResult(taskId, 100);
      
      expect(result).toBeNull();
    });

    it('should emit error events', async () => {
      const errorHandler = vi.fn();
      pool.on('task:error', errorHandler);
      
      // Mock worker to always fail
      const mockWorker = pool['workers'].values().next().value;
      if (mockWorker && mockWorker.worker) {
        mockWorker.worker.postMessage = vi.fn(() => {
          setTimeout(() => {
            if (mockWorker.worker?.onmessage) {
              mockWorker.worker.onmessage(new MessageEvent('message', {
                data: {
                  success: false,
                  error: 'Task failed'
                }
              }));
            }
          }, 10);
        });
      }
      
      await pool.submitTask('compute', {});
      await vi.advanceTimersByTimeAsync(200);
      
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle high load', async () => {
      pool = new DistributedWorkerPool({
        minWorkers: 4,
        maxWorkers: 16,
        autoScale: true
      });
      await pool.start();
      
      const startTime = Date.now();
      const taskCount = 100;
      
      // Submit many tasks
      const tasks = Array(taskCount).fill(null).map((_, i) => ({
        type: 'compute',
        payload: { id: i }
      }));
      
      const taskIds = await pool.submitBatch(tasks);
      
      expect(taskIds).toHaveLength(taskCount);
      
      // Check submission was fast
      const submissionTime = Date.now() - startTime;
      expect(submissionTime).toBeLessThan(1000);
    });

    it('should maintain performance under sustained load', async () => {
      pool = new DistributedWorkerPool({
        minWorkers: 4,
        maxWorkers: 8
      });
      await pool.start();
      await vi.advanceTimersByTimeAsync(100);
      
      // Sustained load test
      for (let batch = 0; batch < 5; batch++) {
        const tasks = Array(20).fill(null).map((_, i) => ({
          type: 'compute',
          payload: { batch, task: i }
        }));
        
        await pool.submitBatch(tasks);
        await vi.advanceTimersByTimeAsync(500);
      }
      
      const metrics = pool.getMetrics();
      expect(metrics.throughput).toBeGreaterThan(0);
      expect(metrics.avgExecutionTime).toBeLessThan(1000);
    });
  });
});

describe('Edge Cases', () => {
  let pool: DistributedWorkerPool;
  
  afterEach(async () => {
    if (pool) {
      await pool.stop();
    }
  });

  it('should handle zero workers config', async () => {
    pool = new DistributedWorkerPool({
      minWorkers: 0,
      maxWorkers: 0
    });
    
    await pool.start();
    const metrics = pool.getMetrics();
    expect(metrics.totalWorkers).toBe(0);
  });

  it('should handle immediate stop after start', async () => {
    pool = new DistributedWorkerPool();
    await pool.start();
    await pool.stop();
    
    const metrics = pool.getMetrics();
    expect(metrics.totalWorkers).toBe(0);
  });

  it('should handle multiple start calls', async () => {
    pool = new DistributedWorkerPool();
    
    await pool.start();
    await pool.start(); // Should be idempotent
    
    const metrics = pool.getMetrics();
    expect(metrics).toBeDefined();
  });

  it('should handle multiple stop calls', async () => {
    pool = new DistributedWorkerPool();
    
    await pool.start();
    await pool.stop();
    await pool.stop(); // Should be idempotent
    
    expect(true).toBe(true); // Should not throw
  });
});