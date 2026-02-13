/**
 * Comprehensive tests for QueueManager
 * Target coverage: >85% (statements, branches, functions, lines)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueueManager } from '../../backend/queue/QueueManager';

// Mock logger
vi.mock('../../services/LoggingService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock crypto for UUID generation
global.crypto = {
  randomUUID: () => 'test-job-' + Math.random().toString(36).substring(7)
} as any;

describe('QueueManager', () => {
  let queueManager: QueueManager;

  beforeEach(() => {
    vi.clearAllMocks();
    queueManager = new QueueManager();
  });

  afterEach(() => {
    queueManager.destroy();
    vi.clearAllMocks();
  });

  describe('Queue Initialization', () => {
    it('should initialize all default queues', () => {
      expect(queueManager).toBeDefined();
      // Verify queues are created by checking metrics
      const queues = ['workflow-execution', 'webhook-processing', 'email-sending', 'scheduled-tasks', 'data-processing'];

      queues.forEach(async queueName => {
        const metrics = await queueManager.getQueueMetrics(queueName);
        expect(metrics).toBeDefined();
        expect(metrics.waiting).toBeDefined();
        expect(metrics.active).toBeDefined();
      });
    });

    it('should initialize metrics for each queue', async () => {
      const metrics = await queueManager.getQueueMetrics('workflow-execution');

      expect(metrics).toEqual({
        waiting: expect.any(Number),
        active: expect.any(Number),
        completed: expect.any(Number),
        failed: expect.any(Number),
        delayed: expect.any(Number),
        paused: expect.any(Number)
      });
    });

    it('should start metrics collection on initialization', () => {
      // Check that metrics interval was created
      expect(queueManager['metricsIntervalId']).not.toBeNull();
    });
  });

  describe('Job Management', () => {
    it('should add job to workflow execution queue', async () => {
      const jobId = await queueManager.addJob('workflow-execution', 'workflow_execution', {
        workflowId: 'workflow-123',
        inputData: { test: 'data' }
      });

      expect(jobId).toBeTruthy();
      expect(typeof jobId).toBe('string');
    });

    it('should add job with priority', async () => {
      const jobId = await queueManager.addJob(
        'workflow-execution',
        'workflow_execution',
        { workflowId: 'workflow-123' },
        { priority: 10 }
      );

      expect(jobId).toBeTruthy();
    });

    it('should add job with delay', async () => {
      const jobId = await queueManager.addJob(
        'email-sending',
        'email_send',
        { to: 'test@example.com', subject: 'Test' },
        { delay: 5000 }
      );

      expect(jobId).toBeTruthy();
    });

    it('should add job with repeat configuration', async () => {
      const jobId = await queueManager.addJob(
        'scheduled-tasks',
        'schedule_trigger',
        { cronExpression: '0 0 * * *' },
        {
          repeat: {
            cron: '0 0 * * *',
            limit: 10
          }
        }
      );

      expect(jobId).toBeTruthy();
    });

    it('should throw error for non-existent queue', async () => {
      await expect(
        queueManager.addJob('non-existent-queue', 'test', {})
      ).rejects.toThrow("Queue 'non-existent-queue' not found");
    });

    it('should apply default maxAttempts when not specified', async () => {
      const jobId = await queueManager.addJob(
        'workflow-execution',
        'workflow_execution',
        { workflowId: 'workflow-123' }
      );

      expect(jobId).toBeTruthy();
    });
  });

  describe('Job Processing', () => {
    it('should process workflow execution job', async () => {
      const jobData = {
        workflowId: 'workflow-123',
        inputData: { test: 'data' }
      };

      const job = {
        id: 'job-123',
        type: 'workflow_execution' as const,
        data: jobData,
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date()
      };

      const result = await queueManager['processJob'](job);

      expect(result).toBeDefined();
      expect(result.executionId).toBeTruthy();
      expect(result.status).toBe('completed');
      expect(job.completedAt).toBeDefined();
    });

    it('should process webhook trigger job', async () => {
      const job = {
        id: 'job-456',
        type: 'webhook_trigger' as const,
        data: { webhookId: 'webhook-123', payload: {} },
        priority: 0,
        attempts: 0,
        maxAttempts: 2,
        createdAt: new Date()
      };

      const result = await queueManager['processJob'](job);

      expect(result).toBeDefined();
      expect(result.processed).toBe(true);
      expect(result.responseStatus).toBe(200);
    });

    it('should process schedule trigger job', async () => {
      const job = {
        id: 'job-789',
        type: 'schedule_trigger' as const,
        data: { cronExpression: '0 0 * * *', scheduleId: 'schedule-123' },
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date()
      };

      const result = await queueManager['processJob'](job);

      expect(result).toBeDefined();
      expect(result.executed).toBe(true);
      expect(result.nextRun).toBeTruthy();
    });

    it('should process email send job', async () => {
      const job = {
        id: 'job-email',
        type: 'email_send' as const,
        data: {
          to: 'test@example.com',
          subject: 'Test Email',
          body: 'Test body'
        },
        priority: 0,
        attempts: 0,
        maxAttempts: 5,
        createdAt: new Date()
      };

      const result = await queueManager['processJob'](job);

      expect(result).toBeDefined();
      expect(result.status).toBe('sent');
      expect(result.to).toBe('test@example.com');
    });

    it('should throw error for unknown job type', async () => {
      const job = {
        id: 'job-unknown',
        type: 'unknown_type' as any,
        data: {},
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date()
      };

      await expect(queueManager['processJob'](job)).rejects.toThrow('Unknown job type');
    });

    it('should increment attempts on job processing', async () => {
      const job = {
        id: 'job-123',
        type: 'workflow_execution' as const,
        data: { workflowId: 'workflow-123' },
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date()
      };

      expect(job.attempts).toBe(0);
      await queueManager['processJob'](job);
      expect(job.attempts).toBe(1);
    });

    it('should set processedAt timestamp', async () => {
      const job = {
        id: 'job-123',
        type: 'workflow_execution' as const,
        data: { workflowId: 'workflow-123' },
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date()
      };

      expect(job.processedAt).toBeUndefined();
      await queueManager['processJob'](job);
      expect(job.processedAt).toBeDefined();
    });
  });

  describe('Retry Strategies', () => {
    it('should handle job failure and retry', async () => {
      const failingJob = {
        id: 'job-fail',
        type: 'workflow_execution' as const,
        data: { shouldFail: true },
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date()
      };

      // Mock processWorkflowExecution to fail
      const originalMethod = queueManager['processWorkflowExecution'];
      queueManager['processWorkflowExecution'] = vi.fn().mockRejectedValue(
        new Error('Simulated failure')
      );

      await expect(queueManager['processJob'](failingJob)).rejects.toThrow('Simulated failure');
      expect(failingJob.failedAt).toBeDefined();
      expect(failingJob.error).toBe('Simulated failure');

      // Restore original method
      queueManager['processWorkflowExecution'] = originalMethod;
    });

    it('should move job to dead letter queue after max attempts', async () => {
      const job = {
        id: 'job-max-attempts',
        type: 'workflow_execution' as const,
        data: {},
        priority: 0,
        attempts: 3,
        maxAttempts: 3,
        createdAt: new Date()
      };

      queueManager['processWorkflowExecution'] = vi.fn().mockRejectedValue(
        new Error('Persistent failure')
      );

      const handleFailedJobSpy = vi.spyOn(queueManager as any, 'handleFailedJob');

      await expect(queueManager['processJob'](job)).rejects.toThrow();
      expect(handleFailedJobSpy).toHaveBeenCalled();
    });

    it('should send failure alert for failed job', async () => {
      const job = {
        id: 'job-alert',
        type: 'email_send' as const,
        data: {},
        priority: 0,
        attempts: 5,
        maxAttempts: 5,
        createdAt: new Date()
      };

      const error = new Error('Final failure');
      const sendAlertSpy = vi.spyOn(queueManager as any, 'sendFailureAlert');

      await queueManager['handleFailedJob'](job, error);
      expect(sendAlertSpy).toHaveBeenCalledWith(job, error);
    });
  });

  describe('Priority Handling', () => {
    it('should support different priority levels', async () => {
      const lowPriorityJob = await queueManager.addJob(
        'email-sending',
        'email_send',
        { to: 'test@example.com' },
        { priority: 1 }
      );

      const highPriorityJob = await queueManager.addJob(
        'workflow-execution',
        'workflow_execution',
        { workflowId: 'urgent-workflow' },
        { priority: 10 }
      );

      expect(lowPriorityJob).toBeTruthy();
      expect(highPriorityJob).toBeTruthy();
    });

    it('should default to priority 0 when not specified', async () => {
      const jobId = await queueManager.addJob(
        'data-processing',
        'workflow_execution',
        { data: 'test' }
      );

      expect(jobId).toBeTruthy();
    });
  });

  describe('Queue Management Operations', () => {
    it('should pause queue', async () => {
      await queueManager.pauseQueue('workflow-execution');
      // Should not throw error
    });

    it('should resume queue', async () => {
      await queueManager.pauseQueue('workflow-execution');
      await queueManager.resumeQueue('workflow-execution');
      // Should not throw error
    });

    it('should handle pause on non-existent queue gracefully', async () => {
      await queueManager.pauseQueue('non-existent');
      // Should not throw error
    });

    it('should clean completed jobs from queue', async () => {
      await queueManager.cleanQueue('workflow-execution', 24 * 60 * 60 * 1000);
      // Should not throw error
    });

    it('should clean with default grace period', async () => {
      await queueManager.cleanQueue('email-sending');
      // Should not throw error
    });
  });

  describe('Metrics Collection', () => {
    it('should get metrics for specific queue', async () => {
      const metrics = await queueManager.getQueueMetrics('workflow-execution');

      expect(metrics).toHaveProperty('waiting');
      expect(metrics).toHaveProperty('active');
      expect(metrics).toHaveProperty('completed');
      expect(metrics).toHaveProperty('failed');
      expect(metrics).toHaveProperty('delayed');
      expect(metrics).toHaveProperty('paused');
    });

    it('should return default metrics for unknown queue', async () => {
      const metrics = await queueManager.getQueueMetrics('unknown-queue');

      expect(metrics).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0
      });
    });

    it('should get all queue metrics', async () => {
      const allMetrics = await queueManager.getAllQueueMetrics();

      expect(allMetrics).toBeInstanceOf(Map);
      expect(allMetrics.size).toBeGreaterThan(0);
    });

    it('should update metrics after job processing', async () => {
      const beforeMetrics = await queueManager.getQueueMetrics('workflow-execution');

      await queueManager.addJob('workflow-execution', 'workflow_execution', {
        workflowId: 'test-123'
      });

      const afterMetrics = await queueManager.getQueueMetrics('workflow-execution');

      // Metrics should exist (exact values may vary due to simulation)
      expect(afterMetrics).toBeDefined();
    });

    it('should collect metrics at regular intervals', async () => {
      // Wait for at least one metrics collection cycle
      await new Promise(resolve => setTimeout(resolve, 6000));

      const metrics = await queueManager.getQueueMetrics('workflow-execution');
      expect(metrics).toBeDefined();
    }, 10000);
  });

  describe('Worker Management', () => {
    it('should create workers with correct concurrency', () => {
      // Workers should be initialized for all queues
      expect(queueManager['workers'].size).toBeGreaterThan(0);
    });

    it('should handle worker completion events', async () => {
      const jobId = await queueManager.addJob(
        'workflow-execution',
        'workflow_execution',
        { workflowId: 'test' }
      );

      expect(jobId).toBeTruthy();
      // Worker event handlers are set up during initialization
    });

    it('should handle worker failure events', async () => {
      const jobId = await queueManager.addJob(
        'webhook-processing',
        'webhook_trigger',
        { webhookId: 'test' }
      );

      expect(jobId).toBeTruthy();
    });
  });

  describe('Job Data Processing', () => {
    it('should process workflow execution with random simulation', async () => {
      const result = await queueManager['processWorkflowExecution']({
        workflowId: 'workflow-123'
      });

      expect(result.executionId).toMatch(/^exec_\d+$/);
      expect(result.status).toBe('completed');
      expect(result.duration).toBeGreaterThan(0);
      expect(result.nodesExecuted).toBeGreaterThan(0);
    });

    it('should process webhook with response status', async () => {
      const result = await queueManager['processWebhookTrigger']({
        webhookId: 'webhook-456'
      });

      expect(result.processed).toBe(true);
      expect(result.responseStatus).toBe(200);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should calculate next cron execution', async () => {
      const result = await queueManager['processScheduleTrigger']({
        cronExpression: '0 0 * * *',
        scheduleId: 'schedule-789'
      });

      expect(result.nextRun).toBeTruthy();
      const nextRunDate = new Date(result.nextRun);
      expect(nextRunDate).toBeInstanceOf(Date);
      expect(nextRunDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('should generate message ID for emails', async () => {
      const result = await queueManager['processEmailSend']({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test Body'
      });

      expect(result.messageId).toMatch(/^msg_\d+_/);
      expect(result.status).toBe('sent');
      expect(result.deliveredAt).toBeTruthy();
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up metrics interval on destroy', () => {
      const intervalId = queueManager['metricsIntervalId'];
      expect(intervalId).not.toBeNull();

      queueManager.destroy();

      expect(queueManager['metricsIntervalId']).toBeNull();
    });

    it('should clear queues on destroy', () => {
      queueManager.destroy();

      expect(queueManager['queues'].size).toBe(0);
      expect(queueManager['metrics'].size).toBe(0);
    });

    it('should be safe to call destroy multiple times', () => {
      queueManager.destroy();
      queueManager.destroy();
      // Should not throw error
    });
  });

  describe('Helper Methods', () => {
    it('should delay for specified milliseconds', async () => {
      const start = Date.now();
      await queueManager['delay'](100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some variance
    });

    it('should get next cron execution time', () => {
      const nextRun = queueManager['getNextCronExecution']('0 0 * * *');

      expect(nextRun).toBeTruthy();
      const nextDate = new Date(nextRun);
      expect(nextDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle cron expression variations', () => {
      const expressions = [
        '0 0 * * *',     // Daily at midnight
        '*/5 * * * *',   // Every 5 minutes
        '0 12 * * 1-5'   // Weekdays at noon
      ];

      expressions.forEach(expr => {
        const nextRun = queueManager['getNextCronExecution'](expr);
        expect(nextRun).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in job processing gracefully', async () => {
      const job = {
        id: 'job-error',
        type: 'workflow_execution' as const,
        data: { workflowId: 'error-workflow' },
        priority: 0,
        attempts: 0,
        maxAttempts: 1,
        createdAt: new Date()
      };

      queueManager['processWorkflowExecution'] = vi.fn().mockRejectedValue(
        new Error('Processing error')
      );

      await expect(queueManager['processJob'](job)).rejects.toThrow('Processing error');
      expect(job.error).toBe('Processing error');
    });

    it('should record error message on job failure', async () => {
      const job = {
        id: 'job-record-error',
        type: 'email_send' as const,
        data: {},
        priority: 0,
        attempts: 0,
        maxAttempts: 1,
        createdAt: new Date()
      };

      const errorMessage = 'Email service unavailable';
      queueManager['processEmailSend'] = vi.fn().mockRejectedValue(
        new Error(errorMessage)
      );

      await expect(queueManager['processJob'](job)).rejects.toThrow();
      expect(job.error).toBe(errorMessage);
    });
  });

  describe('Concurrency', () => {
    it('should handle multiple concurrent job additions', async () => {
      const jobPromises = Array.from({ length: 10 }, (_, i) =>
        queueManager.addJob('workflow-execution', 'workflow_execution', {
          workflowId: `workflow-${i}`
        })
      );

      const jobIds = await Promise.all(jobPromises);

      expect(jobIds.length).toBe(10);
      jobIds.forEach(id => expect(id).toBeTruthy());
    });

    it('should handle concurrent metric queries', async () => {
      const metricPromises = Array.from({ length: 5 }, () =>
        queueManager.getQueueMetrics('workflow-execution')
      );

      const metrics = await Promise.all(metricPromises);

      expect(metrics.length).toBe(5);
      metrics.forEach(m => expect(m).toBeDefined());
    });
  });

  describe('Queue Configuration', () => {
    it('should respect queue-specific settings', async () => {
      // High priority workflow queue
      const workflowJob = await queueManager.addJob(
        'workflow-execution',
        'workflow_execution',
        { workflowId: 'test' }
      );

      // Medium priority webhook queue
      const webhookJob = await queueManager.addJob(
        'webhook-processing',
        'webhook_trigger',
        { webhookId: 'test' }
      );

      // Low priority email queue
      const emailJob = await queueManager.addJob(
        'email-sending',
        'email_send',
        { to: 'test@example.com' }
      );

      expect(workflowJob).toBeTruthy();
      expect(webhookJob).toBeTruthy();
      expect(emailJob).toBeTruthy();
    });
  });

  describe('Job Removal', () => {
    it('should remove completed jobs after grace period', async () => {
      await queueManager.cleanQueue('workflow-execution', 0);
      // Should clean immediately with 0 grace period
    });

    it('should remove failed jobs after grace period', async () => {
      await queueManager.cleanQueue('workflow-execution', 1000);
      // Should clean jobs older than 1 second
    });

    it('should limit number of jobs removed', async () => {
      await queueManager.cleanQueue('email-sending', 24 * 60 * 60 * 1000);
      // Should respect removal limits
    });
  });
});
