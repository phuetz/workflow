/**
 * Queue Management System
 * Redis/Bull-based job queue for workflow execution
 */

interface QueueJob {
  id: string;
  type: 'workflow_execution' | 'webhook_trigger' | 'schedule_trigger' | 'email_send';
  priority: number;
  data: any;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  repeat?: {
    cron?: string;
    every?: number;
    limit?: number;
  };
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
}

interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker[]> = new Map();
  private metrics: Map<string, QueueMetrics> = new Map();

  constructor() {
    this.initializeQueues();
    this.startMetricsCollection();
  }

  private initializeQueues() {
    // Workflow execution queue (high priority)
    this.createQueue('workflow-execution', {
      concurrency: 5,
      priority: 'high',
      retryAttempts: 3,
      retryDelay: 5000
    });

    // Webhook processing queue (medium priority)
    this.createQueue('webhook-processing', {
      concurrency: 10,
      priority: 'medium',
      retryAttempts: 2,
      retryDelay: 2000
    });

    // Email sending queue (low priority)
    this.createQueue('email-sending', {
      concurrency: 3,
      priority: 'low',
      retryAttempts: 5,
      retryDelay: 10000
    });

    // Scheduled tasks queue
    this.createQueue('scheduled-tasks', {
      concurrency: 2,
      priority: 'medium',
      retryAttempts: 3,
      retryDelay: 30000
    });

    // Data processing queue
    this.createQueue('data-processing', {
      concurrency: 8,
      priority: 'medium',
      retryAttempts: 2,
      retryDelay: 5000
    });
  }

  private createQueue(name: string, options: any) {
    const queue = new Queue(name, options);
    this.queues.set(name, queue);
    
    // Initialize workers
    const workers = this.createWorkers(name, options.concurrency);
    this.workers.set(name, workers);

    console.log(`✅ Queue '${name}' initialized with ${options.concurrency} workers`);
  }

  private createWorkers(queueName: string, concurrency: number): Worker[] {
    const workers: Worker[] = [];

    for (let i = 0; i < concurrency; i++) {
      const worker = new Worker(queueName, async (job: QueueJob) => {
        return await this.processJob(job);
      });

      worker.on('completed', (job, result) => {
        console.log(`✅ Job ${job.id} completed in queue ${queueName}`);
        this.updateMetrics(queueName);
      });

      worker.on('failed', (job, error) => {
        console.error(`❌ Job ${job?.id} failed in queue ${queueName}:`, error);
        this.updateMetrics(queueName);
      });

      workers.push(worker);
    }

    return workers;
  }

  // Add job to queue
  async addJob(queueName: string, jobType: string, data: any, options: any = {}): Promise<string> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const jobId = `${jobType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: QueueJob = {
      id: jobId,
      type: jobType as any,
      priority: options.priority || 0,
      data,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      delay: options.delay,
      repeat: options.repeat,
      createdAt: new Date()
    };

    await queue.add(job, {
      priority: job.priority,
      delay: job.delay,
      attempts: job.maxAttempts,
      repeat: job.repeat,
      removeOnComplete: 100,
      removeOnFail: 50
    });

    console.log(`📤 Job ${jobId} added to queue ${queueName}`);
    this.updateMetrics(queueName);
    
    return jobId;
  }

  // Process individual job
  private async processJob(job: QueueJob): Promise<any> {
    console.log(`🔄 Processing job ${job.id} of type ${job.type}`);
    
    job.processedAt = new Date();
    job.attempts++;

    try {
      let result: any;

      switch (job.type) {
        case 'workflow_execution':
          result = await this.processWorkflowExecution(job.data);
          break;

        case 'webhook_trigger':
          result = await this.processWebhookTrigger(job.data);
          break;

        case 'schedule_trigger':
          result = await this.processScheduleTrigger(job.data);
          break;

        case 'email_send':
          result = await this.processEmailSend(job.data);
          break;

        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      job.completedAt = new Date();
      console.log(`✅ Job ${job.id} completed successfully`);
      
      return result;

    } catch (error: any) {
      job.failedAt = new Date();
      job.error = error.message;
      
      console.error(`❌ Job ${job.id} failed:`, error);
      
      if (job.attempts >= job.maxAttempts) {
        console.error(`💀 Job ${job.id} exceeded max attempts (${job.maxAttempts})`);
        await this.handleFailedJob(job, error);
      }
      
      throw error;
    }
  }

  // Workflow execution processor
  private async processWorkflowExecution(data: any): Promise<any> {
    const { workflowId, input, triggeredBy } = data;
    
    // Simulate workflow execution
    await this.delay(2000 + Math.random() * 3000);
    
    return {
      executionId: `exec_${Date.now()}`,
      workflowId,
      status: 'completed',
      duration: Math.floor(Math.random() * 5000) + 1000,
      nodesExecuted: Math.floor(Math.random() * 10) + 3,
      output: {
        processed: true,
        records: Math.floor(Math.random() * 100) + 1,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Webhook trigger processor
  private async processWebhookTrigger(data: any): Promise<any> {
    const { webhookId, payload, headers } = data;
    
    await this.delay(500 + Math.random() * 1500);
    
    return {
      webhookId,
      processed: true,
      responseStatus: 200,
      processingTime: Math.floor(Math.random() * 500) + 100
    };
  }

  // Schedule trigger processor
  private async processScheduleTrigger(data: any): Promise<any> {
    const { scheduleId, cronExpression } = data;
    
    await this.delay(1000 + Math.random() * 2000);
    
    return {
      scheduleId,
      executed: true,
      nextRun: this.getNextCronExecution(cronExpression),
      executionTime: new Date().toISOString()
    };
  }

  // Email send processor
  private async processEmailSend(data: any): Promise<any> {
    const { to, subject, body, template } = data;
    
    await this.delay(1500 + Math.random() * 2500);
    
    return {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      to,
      subject,
      status: 'sent',
      deliveredAt: new Date().toISOString()
    };
  }

  // Handle failed jobs
  private async handleFailedJob(job: QueueJob, error: Error): Promise<void> {
    // Log to database
    console.error(`💀 Final failure for job ${job.id}:`, error);
    
    // Send alert notification
    await this.sendFailureAlert(job, error);
    
    // Move to dead letter queue
    await this.moveToDeadLetterQueue(job);
  }

  // Queue management methods
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
      console.log(`⏸️ Queue '${queueName}' paused`);
    }
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
      console.log(`▶️ Queue '${queueName}' resumed`);
    }
  }

  async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
    return this.metrics.get(queueName) || {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0
    };
  }

  async getAllQueueMetrics(): Promise<Map<string, QueueMetrics>> {
    return new Map(this.metrics);
  }

  // Clean up completed/failed jobs
  async cleanQueue(queueName: string, grace: number = 24 * 60 * 60 * 1000): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.clean(grace, 100, 'completed');
      await queue.clean(grace, 50, 'failed');
      console.log(`🧹 Queue '${queueName}' cleaned`);
    }
  }

  // Private helper methods
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateMetrics(queueName: string): void {
    // Simulate metrics update
    const current = this.metrics.get(queueName) || {
      waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0
    };
    
    // Update with random simulation data
    this.metrics.set(queueName, {
      waiting: Math.floor(Math.random() * 20),
      active: Math.floor(Math.random() * 5),
      completed: current.completed + Math.floor(Math.random() * 3),
      failed: current.failed + Math.floor(Math.random() * 1),
      delayed: Math.floor(Math.random() * 3),
      paused: 0
    });
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      for (const queueName of this.queues.keys()) {
        this.updateMetrics(queueName);
      }
    }, 5000);
  }

  private getNextCronExecution(cron: string): string {
    // Simple cron calculation (would use a proper library in production)
    const now = new Date();
    const next = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
    return next.toISOString();
  }

  private async sendFailureAlert(job: QueueJob, error: Error): Promise<void> {
    // Would send actual alerts in production
    console.log(`🚨 ALERT: Job ${job.id} failed permanently:`, error.message);
  }

  private async moveToDeadLetterQueue(job: QueueJob): Promise<void> {
    // Would move to DLQ in production
    console.log(`💀 Moving job ${job.id} to dead letter queue`);
  }
}

// Simulation classes (would be real Bull/Redis in production)
class Queue {
  constructor(public name: string, public options: any) {}
  
  async add(job: any, options: any) {
    console.log(`📥 Adding job to ${this.name}:`, job.id);
  }
  
  async pause() {}
  async resume() {}
  async clean(grace: number, limit: number, type: string) {}
}

class Worker {
  private handlers: Map<string, Function> = new Map();
  
  constructor(public queueName: string, public processor: Function) {}
  
  on(event: string, handler: Function) {
    this.handlers.set(event, handler);
  }
}

// Export singleton instance
export const queueManager = new QueueManager();