import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Redis
vi.mock('ioredis', () => ({
  default: class RedisMock {
    private store = new Map<string, string>();

    async get(key: string) {
      return this.store.get(key) || null;
    }

    async set(key: string, value: string) {
      this.store.set(key, value);
      return 'OK';
    }

    async del(key: string) {
      this.store.delete(key);
      return 1;
    }

    async lpush(key: string, value: string) {
      const list = JSON.parse(this.store.get(key) || '[]');
      list.unshift(value);
      this.store.set(key, JSON.stringify(list));
      return list.length;
    }

    async rpop(key: string) {
      const list = JSON.parse(this.store.get(key) || '[]');
      const value = list.pop();
      this.store.set(key, JSON.stringify(list));
      return value || null;
    }

    async llen(key: string) {
      const list = JSON.parse(this.store.get(key) || '[]');
      return list.length;
    }

    on() {
      return this;
    }

    connect() {
      return Promise.resolve();
    }

    disconnect() {
      return Promise.resolve();
    }
  },
}));

import { QueueManager } from '../../backend/queue/QueueManager';

// TODO: Tests use wrong QueueManager API (initialize/shutdown/enqueue don't exist). Needs rewrite.
describe.skip('Queue Processing Integration Tests', () => {
  let queueManager: QueueManager;

  beforeEach(async () => {
    queueManager = new QueueManager();
    await queueManager.initialize();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await queueManager.shutdown();
    vi.clearAllMocks();
  });

  describe('Job Enqueueing', () => {
    it('should enqueue job successfully', async () => {
      const job = {
        id: 'job_1',
        type: 'workflow_execution',
        data: {
          workflowId: 'wf_123',
          input: { test: 'data' },
        },
        priority: 'normal' as const,
      };

      const jobId = await queueManager.enqueue(job);

      expect(jobId).toBeDefined();
      expect(jobId).toBe('job_1');
    });

    it('should enqueue multiple jobs', async () => {
      const jobs = [
        {
          id: 'job_1',
          type: 'workflow_execution',
          data: { workflowId: 'wf_1' },
          priority: 'normal' as const,
        },
        {
          id: 'job_2',
          type: 'workflow_execution',
          data: { workflowId: 'wf_2' },
          priority: 'high' as const,
        },
        {
          id: 'job_3',
          type: 'workflow_execution',
          data: { workflowId: 'wf_3' },
          priority: 'low' as const,
        },
      ];

      const jobIds = await Promise.all(jobs.map((job) => queueManager.enqueue(job)));

      expect(jobIds).toHaveLength(3);
      expect(jobIds).toContain('job_1');
      expect(jobIds).toContain('job_2');
      expect(jobIds).toContain('job_3');
    });

    it('should respect job priority', async () => {
      const highPriorityJob = {
        id: 'job_high',
        type: 'workflow_execution',
        data: { workflowId: 'wf_1' },
        priority: 'high' as const,
      };

      const normalPriorityJob = {
        id: 'job_normal',
        type: 'workflow_execution',
        data: { workflowId: 'wf_2' },
        priority: 'normal' as const,
      };

      await queueManager.enqueue(normalPriorityJob);
      await queueManager.enqueue(highPriorityJob);

      // High priority should be processed first
      const stats = await queueManager.getStats();
      expect(stats).toBeDefined();
    });

    it('should handle large job payloads', async () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          data: 'x'.repeat(100),
        })),
      };

      const job = {
        id: 'job_large',
        type: 'workflow_execution',
        data: largeData,
        priority: 'normal' as const,
      };

      const jobId = await queueManager.enqueue(job);
      expect(jobId).toBe('job_large');
    });
  });

  describe('Job Processing', () => {
    it('should process job successfully', async () => {
      const job = {
        id: 'job_process',
        type: 'workflow_execution',
        data: { workflowId: 'wf_123' },
        priority: 'normal' as const,
      };

      await queueManager.enqueue(job);

      const processor = vi.fn().mockResolvedValue({ success: true });
      await queueManager.registerProcessor('workflow_execution', processor);

      // Trigger processing
      await queueManager.processNext();

      expect(processor).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'job_process',
          type: 'workflow_execution',
        })
      );
    });

    it('should handle job processing errors', async () => {
      const job = {
        id: 'job_error',
        type: 'workflow_execution',
        data: { workflowId: 'wf_error' },
        priority: 'normal' as const,
      };

      await queueManager.enqueue(job);

      const processor = vi.fn().mockRejectedValue(new Error('Processing failed'));
      await queueManager.registerProcessor('workflow_execution', processor);

      await queueManager.processNext();

      // Job should be marked as failed
      const jobStatus = await queueManager.getJobStatus('job_error');
      expect(jobStatus?.status).toBe('failed');
    });

    it('should retry failed jobs', async () => {
      const job = {
        id: 'job_retry',
        type: 'workflow_execution',
        data: { workflowId: 'wf_retry' },
        priority: 'normal' as const,
        retries: 3,
      };

      await queueManager.enqueue(job);

      let attempts = 0;
      const processor = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ success: true });
      });

      await queueManager.registerProcessor('workflow_execution', processor);

      // Process until success
      await queueManager.processNext(); // Attempt 1 - fails
      await queueManager.processNext(); // Attempt 2 - fails
      await queueManager.processNext(); // Attempt 3 - succeeds

      expect(processor).toHaveBeenCalledTimes(3);
    });

    it('should respect max retry limit', async () => {
      const job = {
        id: 'job_max_retry',
        type: 'workflow_execution',
        data: { workflowId: 'wf_fail' },
        priority: 'normal' as const,
        retries: 2,
      };

      await queueManager.enqueue(job);

      const processor = vi.fn().mockRejectedValue(new Error('Always fails'));
      await queueManager.registerProcessor('workflow_execution', processor);

      // Process multiple times
      await queueManager.processNext();
      await queueManager.processNext();
      await queueManager.processNext();

      // Should not exceed max retries
      expect(processor).toHaveBeenCalledTimes(2);

      const jobStatus = await queueManager.getJobStatus('job_max_retry');
      expect(jobStatus?.status).toBe('failed');
    });
  });

  describe('Queue Management', () => {
    it('should get queue statistics', async () => {
      const jobs = [
        { id: 'job_1', type: 'workflow_execution', data: {}, priority: 'normal' as const },
        { id: 'job_2', type: 'workflow_execution', data: {}, priority: 'high' as const },
        { id: 'job_3', type: 'email_send', data: {}, priority: 'low' as const },
      ];

      await Promise.all(jobs.map((job) => queueManager.enqueue(job)));

      const stats = await queueManager.getStats();

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.pending).toBeGreaterThanOrEqual(0);
      expect(stats.processing).toBeGreaterThanOrEqual(0);
      expect(stats.completed).toBeGreaterThanOrEqual(0);
      expect(stats.failed).toBeGreaterThanOrEqual(0);
    });

    it('should pause and resume queue', async () => {
      const job = {
        id: 'job_pause',
        type: 'workflow_execution',
        data: { workflowId: 'wf_123' },
        priority: 'normal' as const,
      };

      await queueManager.enqueue(job);
      await queueManager.pause();

      const isPaused = queueManager.isPaused();
      expect(isPaused).toBe(true);

      await queueManager.resume();

      const isResumed = !queueManager.isPaused();
      expect(isResumed).toBe(true);
    });

    it('should clear queue', async () => {
      const jobs = Array.from({ length: 10 }, (_, i) => ({
        id: `job_${i}`,
        type: 'workflow_execution',
        data: { workflowId: `wf_${i}` },
        priority: 'normal' as const,
      }));

      await Promise.all(jobs.map((job) => queueManager.enqueue(job)));

      await queueManager.clear();

      const stats = await queueManager.getStats();
      expect(stats.pending).toBe(0);
    });

    it('should remove specific job from queue', async () => {
      const job = {
        id: 'job_remove',
        type: 'workflow_execution',
        data: { workflowId: 'wf_123' },
        priority: 'normal' as const,
      };

      await queueManager.enqueue(job);

      const removed = await queueManager.removeJob('job_remove');
      expect(removed).toBe(true);

      const jobStatus = await queueManager.getJobStatus('job_remove');
      expect(jobStatus).toBeNull();
    });
  });

  describe('Job Status Tracking', () => {
    it('should track job status throughout lifecycle', async () => {
      const job = {
        id: 'job_track',
        type: 'workflow_execution',
        data: { workflowId: 'wf_123' },
        priority: 'normal' as const,
      };

      await queueManager.enqueue(job);

      let status = await queueManager.getJobStatus('job_track');
      expect(status?.status).toBe('pending');

      const processor = vi.fn().mockImplementation(async (job) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { success: true };
      });

      await queueManager.registerProcessor('workflow_execution', processor);
      await queueManager.processNext();

      status = await queueManager.getJobStatus('job_track');
      expect(['processing', 'completed']).toContain(status?.status);
    });

    it('should track job progress', async () => {
      const job = {
        id: 'job_progress',
        type: 'workflow_execution',
        data: { workflowId: 'wf_123' },
        priority: 'normal' as const,
      };

      await queueManager.enqueue(job);

      const processor = vi.fn().mockImplementation(async (job) => {
        await queueManager.updateJobProgress('job_progress', 50);
        await new Promise((resolve) => setTimeout(resolve, 50));
        await queueManager.updateJobProgress('job_progress', 100);
        return { success: true };
      });

      await queueManager.registerProcessor('workflow_execution', processor);
      await queueManager.processNext();

      const status = await queueManager.getJobStatus('job_progress');
      expect(status?.progress).toBe(100);
    });

    it('should store job results', async () => {
      const job = {
        id: 'job_result',
        type: 'workflow_execution',
        data: { workflowId: 'wf_123' },
        priority: 'normal' as const,
      };

      await queueManager.enqueue(job);

      const result = { executionId: 'exec_123', status: 'success', data: { output: 'test' } };
      const processor = vi.fn().mockResolvedValue(result);

      await queueManager.registerProcessor('workflow_execution', processor);
      await queueManager.processNext();

      const status = await queueManager.getJobStatus('job_result');
      expect(status?.result).toEqual(result);
    });
  });

  describe('Concurrent Processing', () => {
    it('should process multiple jobs concurrently', async () => {
      const jobs = Array.from({ length: 5 }, (_, i) => ({
        id: `job_concurrent_${i}`,
        type: 'workflow_execution',
        data: { workflowId: `wf_${i}` },
        priority: 'normal' as const,
      }));

      await Promise.all(jobs.map((job) => queueManager.enqueue(job)));

      const processedJobs: string[] = [];
      const processor = vi.fn().mockImplementation(async (job) => {
        processedJobs.push(job.id);
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { success: true };
      });

      await queueManager.registerProcessor('workflow_execution', processor);

      // Set concurrency to 3
      await queueManager.setConcurrency(3);

      // Process all jobs
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(queueManager.processNext());
      }
      await Promise.all(promises);

      expect(processedJobs).toHaveLength(5);
    });

    it('should respect concurrency limit', async () => {
      const jobs = Array.from({ length: 10 }, (_, i) => ({
        id: `job_limit_${i}`,
        type: 'workflow_execution',
        data: { workflowId: `wf_${i}` },
        priority: 'normal' as const,
      }));

      await Promise.all(jobs.map((job) => queueManager.enqueue(job)));

      let concurrentCount = 0;
      let maxConcurrent = 0;

      const processor = vi.fn().mockImplementation(async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise((resolve) => setTimeout(resolve, 100));
        concurrentCount--;
        return { success: true };
      });

      await queueManager.registerProcessor('workflow_execution', processor);
      await queueManager.setConcurrency(3);

      // Process jobs
      const promises = jobs.map(() => queueManager.processNext());
      await Promise.all(promises);

      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });
  });

  describe('Job Scheduling', () => {
    it('should schedule job for future execution', async () => {
      const job = {
        id: 'job_scheduled',
        type: 'workflow_execution',
        data: { workflowId: 'wf_123' },
        priority: 'normal' as const,
        scheduledFor: new Date(Date.now() + 5000), // 5 seconds from now
      };

      await queueManager.enqueue(job);

      const status = await queueManager.getJobStatus('job_scheduled');
      expect(status?.status).toBe('scheduled');
    });

    it('should process scheduled jobs when time arrives', async () => {
      const job = {
        id: 'job_timed',
        type: 'workflow_execution',
        data: { workflowId: 'wf_123' },
        priority: 'normal' as const,
        scheduledFor: new Date(Date.now() + 100), // 100ms from now
      };

      await queueManager.enqueue(job);

      const processor = vi.fn().mockResolvedValue({ success: true });
      await queueManager.registerProcessor('workflow_execution', processor);

      // Wait for scheduled time
      await new Promise((resolve) => setTimeout(resolve, 200));
      await queueManager.processNext();

      expect(processor).toHaveBeenCalled();
    });
  });

  describe('Dead Letter Queue', () => {
    it('should move permanently failed jobs to DLQ', async () => {
      const job = {
        id: 'job_dlq',
        type: 'workflow_execution',
        data: { workflowId: 'wf_fail' },
        priority: 'normal' as const,
        retries: 1,
      };

      await queueManager.enqueue(job);

      const processor = vi.fn().mockRejectedValue(new Error('Permanent failure'));
      await queueManager.registerProcessor('workflow_execution', processor);

      // Process until max retries
      await queueManager.processNext();
      await queueManager.processNext();

      const dlq = await queueManager.getDeadLetterQueue();
      expect(dlq.some((j) => j.id === 'job_dlq')).toBe(true);
    });

    it('should allow reprocessing jobs from DLQ', async () => {
      const job = {
        id: 'job_retry_dlq',
        type: 'workflow_execution',
        data: { workflowId: 'wf_123' },
        priority: 'normal' as const,
        retries: 1,
      };

      await queueManager.enqueue(job);

      // Fail initially
      const failProcessor = vi.fn().mockRejectedValue(new Error('Fail'));
      await queueManager.registerProcessor('workflow_execution', failProcessor);
      await queueManager.processNext();
      await queueManager.processNext();

      // Move to DLQ
      const dlq = await queueManager.getDeadLetterQueue();
      expect(dlq.some((j) => j.id === 'job_retry_dlq')).toBe(true);

      // Retry from DLQ
      const successProcessor = vi.fn().mockResolvedValue({ success: true });
      await queueManager.registerProcessor('workflow_execution', successProcessor);
      await queueManager.retryFromDLQ('job_retry_dlq');

      expect(successProcessor).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle processor registration errors', async () => {
      expect(() => {
        queueManager.registerProcessor('invalid_type', null as any);
      }).toThrow();
    });

    it('should handle enqueue errors gracefully', async () => {
      const invalidJob = {
        id: '',
        type: 'workflow_execution',
        data: {},
        priority: 'invalid' as any,
      };

      await expect(queueManager.enqueue(invalidJob)).rejects.toThrow();
    });

    it('should handle concurrent shutdown gracefully', async () => {
      const jobs = Array.from({ length: 5 }, (_, i) => ({
        id: `job_shutdown_${i}`,
        type: 'workflow_execution',
        data: {},
        priority: 'normal' as const,
      }));

      await Promise.all(jobs.map((job) => queueManager.enqueue(job)));

      const processor = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return { success: true };
      });

      await queueManager.registerProcessor('workflow_execution', processor);

      // Start processing
      const processing = queueManager.processNext();

      // Shutdown immediately
      await queueManager.shutdown();

      // Should handle gracefully
      await expect(processing).resolves.toBeDefined();
    });
  });
});
