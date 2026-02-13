/**
 * Edge Workflow Runtime
 * Lightweight runtime for executing workflows on edge devices
 * Target: <5MB footprint, <500ms startup, supports Node.js and Deno
 */

import { logger } from '../services/SimpleLogger';
import type {
  EdgeDevice,
  EdgeRuntime,
  EdgeRuntimeConfig,
  EdgeMetrics,
  CompiledWorkflow,
  EdgeWorkflowExecution,
  OfflineBuffer,
  OfflineEvent
} from '../types/edge';

export class EdgeWorkflowRuntime {
  private deviceId: string;
  private config: EdgeRuntimeConfig;
  private workflows: Map<string, CompiledWorkflow> = new Map();
  private executions: Map<string, EdgeWorkflowExecution> = new Map();
  private offlineBuffer: OfflineBuffer;
  private metrics: EdgeMetrics;
  private startTime: Date;
  private metricsInterval?: NodeJS.Timeout;
  private isOnline: boolean = true;

  constructor(deviceId: string, config: Partial<EdgeRuntimeConfig> = {}) {
    this.deviceId = deviceId;
    this.startTime = new Date();

    // Default configuration optimized for edge
    this.config = {
      maxMemory: config.maxMemory || 512, // 512MB default
      maxCpu: config.maxCpu || 80, // 80% max CPU
      offlineBufferSize: config.offlineBufferSize || 10000, // 10k events
      syncInterval: config.syncInterval || 30, // 30 seconds
      compressionEnabled: config.compressionEnabled ?? true,
      encryptionEnabled: config.encryptionEnabled ?? true,
      logLevel: config.logLevel || 'info'
    };

    this.offlineBuffer = {
      deviceId,
      events: [],
      size: 0,
      maxSize: this.config.offlineBufferSize * 1024, // Rough estimate: 1KB per event
      oldestEvent: new Date(),
      newestEvent: new Date()
    };

    this.metrics = this.initializeMetrics();

    logger.info(`Edge Runtime initialized for device ${deviceId}`, {
      context: { deviceId, config: this.config }
    });
  }

  /**
   * Start the edge runtime
   */
  async start(): Promise<void> {
    logger.info('Starting Edge Workflow Runtime', {
      context: { deviceId: this.deviceId }
    });

    // Start metrics collection
    this.startMetricsCollection();

    // Check network connectivity
    await this.checkConnectivity();

    // Load persisted workflows (if any)
    await this.loadPersistedWorkflows();

    logger.info('Edge Runtime started successfully', {
      context: {
        deviceId: this.deviceId,
        workflowCount: this.workflows.size,
        uptime: this.getUptime()
      }
    });
  }

  /**
   * Stop the edge runtime
   */
  async stop(): Promise<void> {
    logger.info('Stopping Edge Workflow Runtime', {
      context: { deviceId: this.deviceId }
    });

    // Stop metrics collection
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Persist offline buffer
    await this.persistOfflineBuffer();

    // Stop running executions gracefully
    for (const execution of this.executions.values()) {
      if (execution.status === 'running') {
        execution.status = 'offline-buffered';
        execution.endTime = new Date();
      }
    }

    logger.info('Edge Runtime stopped', {
      context: { deviceId: this.deviceId }
    });
  }

  /**
   * Load a compiled workflow into the runtime
   */
  async loadWorkflow(workflow: CompiledWorkflow): Promise<void> {
    // Validate workflow
    if (!this.validateWorkflow(workflow)) {
      throw new Error(`Invalid workflow: ${workflow.id}`);
    }

    // Check resource availability
    const requiredMemory = workflow.compiled.size / (1024 * 1024); // Convert to MB
    if (this.metrics.memory.used + requiredMemory > this.config.maxMemory) {
      throw new Error('Insufficient memory to load workflow');
    }

    // Store workflow
    this.workflows.set(workflow.id, workflow);

    logger.info('Workflow loaded successfully', {
      context: {
        workflowId: workflow.id,
        size: workflow.compiled.size,
        platform: workflow.targetPlatform
      }
    });
  }

  /**
   * Unload a workflow from the runtime
   */
  async unloadWorkflow(workflowId: string): Promise<void> {
    // Stop any running executions
    for (const [execId, execution] of this.executions) {
      if (execution.workflowId === workflowId && execution.status === 'running') {
        execution.status = 'offline-buffered';
        execution.endTime = new Date();
        this.executions.delete(execId);
      }
    }

    // Remove workflow
    this.workflows.delete(workflowId);

    logger.info('Workflow unloaded', {
      context: { workflowId }
    });
  }

  /**
   * Execute a workflow on the edge
   */
  async executeWorkflow(
    workflowId: string,
    input: unknown,
    options: { timeout?: number; priority?: 'low' | 'normal' | 'high' } = {}
  ): Promise<EdgeWorkflowExecution> {
    const startTime = Date.now();
    const executionId = this.generateId();

    const execution: EdgeWorkflowExecution = {
      id: executionId,
      workflowId,
      deviceId: this.deviceId,
      status: 'running',
      startTime: new Date(),
      location: 'edge',
      offlineMode: !this.isOnline,
      metrics: {
        cpuUsage: 0,
        memoryUsage: 0,
        networkUsage: 0,
        latency: 0
      }
    };

    this.executions.set(executionId, execution);

    try {
      // Get workflow
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // Execute with timeout
      const timeout = options.timeout || 30000; // 30s default
      const result = await this.executeWithTimeout(
        () => this.runWorkflow(workflow, input),
        timeout
      );

      // Update execution
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.duration = Date.now() - startTime;
      execution.results = result;
      execution.metrics.latency = execution.duration;

      // Update workflow metrics
      this.updateWorkflowMetrics(workflowId, execution);

      // If offline, buffer the execution
      if (!this.isOnline) {
        await this.bufferEvent({
          id: this.generateId(),
          type: 'execution',
          timestamp: new Date(),
          data: execution,
          size: JSON.stringify(execution).length,
          synced: false,
          retryCount: 0
        });
      }

      logger.info('Workflow executed successfully', {
        context: {
          executionId,
          workflowId,
          duration: execution.duration,
          location: 'edge'
        }
      });

      return execution;

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.duration = Date.now() - startTime;
      execution.error = error instanceof Error ? error.message : String(error);

      logger.error('Workflow execution failed', {
        context: { executionId, workflowId, error: execution.error }
      });

      // Buffer error event
      if (!this.isOnline) {
        await this.bufferEvent({
          id: this.generateId(),
          type: 'error',
          timestamp: new Date(),
          data: { executionId, error: execution.error },
          size: JSON.stringify(execution.error).length,
          synced: false,
          retryCount: 0
        });
      }

      throw error;
    }
  }

  /**
   * Get runtime information
   */
  getRuntime(): EdgeRuntime {
    return {
      id: this.deviceId,
      deviceId: this.deviceId,
      version: '1.0.0',
      workflowCount: this.workflows.size,
      uptime: this.getUptime(),
      metrics: this.metrics,
      configuration: this.config
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): EdgeMetrics {
    return { ...this.metrics };
  }

  /**
   * Get offline buffer status
   */
  getOfflineBuffer(): OfflineBuffer {
    return {
      ...this.offlineBuffer,
      events: [...this.offlineBuffer.events]
    };
  }

  /**
   * Set online/offline status
   */
  setOnlineStatus(online: boolean): void {
    const wasOnline = this.isOnline;
    this.isOnline = online;

    if (wasOnline && !online) {
      logger.warn('Edge device went offline', {
        context: { deviceId: this.deviceId }
      });
    } else if (!wasOnline && online) {
      logger.info('Edge device back online', {
        context: { deviceId: this.deviceId, bufferedEvents: this.offlineBuffer.events.length }
      });
    }
  }

  /**
   * Get memory footprint in bytes
   */
  getMemoryFootprint(): number {
    // Calculate runtime memory usage
    const runtimeSize = JSON.stringify({
      workflows: Array.from(this.workflows.values()),
      executions: Array.from(this.executions.values()),
      buffer: this.offlineBuffer
    }).length;

    return runtimeSize;
  }

  // Private methods

  private initializeMetrics(): EdgeMetrics {
    return {
      timestamp: new Date(),
      cpu: {
        usage: 0
      },
      memory: {
        used: 0,
        available: this.config.maxMemory,
        usage: 0
      },
      storage: {
        used: 0,
        available: 100
      },
      network: {
        bytesIn: 0,
        bytesOut: 0,
        latency: 0,
        packetsDropped: 0
      },
      workflows: {
        active: 0,
        executions: 0,
        errors: 0,
        avgExecutionTime: 0
      }
    };
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 1000); // Collect every second
  }

  private collectMetrics(): void {
    // Simulate metrics collection (in production, use actual system APIs)
    this.metrics.timestamp = new Date();

    // Memory metrics
    const memoryUsed = this.getMemoryFootprint() / (1024 * 1024); // MB
    this.metrics.memory.used = memoryUsed;
    this.metrics.memory.usage = (memoryUsed / this.config.maxMemory) * 100;

    // Workflow metrics
    this.metrics.workflows.active = Array.from(this.executions.values())
      .filter(e => e.status === 'running').length;

    // CPU usage (simplified simulation)
    this.metrics.cpu.usage = Math.min(100, this.metrics.workflows.active * 20);
  }

  private validateWorkflow(workflow: CompiledWorkflow): boolean {
    if (!workflow.id || !workflow.name || !workflow.compiled.code) {
      return false;
    }

    // Verify checksum
    const calculatedChecksum = this.calculateChecksum(workflow.compiled.code);
    if (calculatedChecksum !== workflow.compiled.checksum) {
      logger.warn('Workflow checksum mismatch', {
        context: { workflowId: workflow.id }
      });
      return false;
    }

    return true;
  }

  private async runWorkflow(workflow: CompiledWorkflow, input: unknown): Promise<unknown> {
    // In a real implementation, this would execute the compiled code
    // For now, we'll simulate execution

    // Simulate processing time based on workflow complexity
    const simulatedDuration = Math.random() * 100 + 10; // 10-110ms
    await new Promise(resolve => setTimeout(resolve, simulatedDuration));

    // Return mock result
    return {
      success: true,
      input,
      output: {
        processedAt: new Date(),
        workflowId: workflow.id,
        deviceId: this.deviceId,
        location: 'edge'
      }
    };
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeout)
      )
    ]);
  }

  private updateWorkflowMetrics(workflowId: string, execution: EdgeWorkflowExecution): void {
    this.metrics.workflows.executions++;

    if (execution.status === 'failed') {
      this.metrics.workflows.errors++;
    }

    // Update average execution time
    const completedExecutions = Array.from(this.executions.values())
      .filter(e => e.workflowId === workflowId && e.status === 'completed');

    if (completedExecutions.length > 0) {
      const totalTime = completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0);
      this.metrics.workflows.avgExecutionTime = totalTime / completedExecutions.length;
    }
  }

  private async bufferEvent(event: OfflineEvent): Promise<void> {
    // Check buffer size
    if (this.offlineBuffer.size + event.size > this.offlineBuffer.maxSize) {
      // Remove oldest events to make space
      while (this.offlineBuffer.size + event.size > this.offlineBuffer.maxSize && this.offlineBuffer.events.length > 0) {
        const removed = this.offlineBuffer.events.shift();
        if (removed) {
          this.offlineBuffer.size -= removed.size;
        }
      }
    }

    // Add event to buffer
    this.offlineBuffer.events.push(event);
    this.offlineBuffer.size += event.size;
    this.offlineBuffer.newestEvent = event.timestamp;

    if (this.offlineBuffer.events.length === 1) {
      this.offlineBuffer.oldestEvent = event.timestamp;
    }

    logger.debug('Event buffered', {
      context: {
        eventId: event.id,
        type: event.type,
        bufferSize: this.offlineBuffer.events.length
      }
    });
  }

  private async checkConnectivity(): Promise<void> {
    // In production, this would check actual network connectivity
    // For now, we'll assume online
    this.isOnline = true;
  }

  private async loadPersistedWorkflows(): Promise<void> {
    // In production, load workflows from local storage
    // For now, no-op
  }

  private async persistOfflineBuffer(): Promise<void> {
    // In production, persist buffer to local storage
    // For now, no-op
    logger.info('Offline buffer persisted', {
      context: {
        eventCount: this.offlineBuffer.events.length,
        size: this.offlineBuffer.size
      }
    });
  }

  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  private calculateChecksum(data: string): string {
    // Simple checksum calculation (in production, use crypto library)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create a lightweight edge runtime instance
 */
export function createEdgeRuntime(
  deviceId: string,
  config?: Partial<EdgeRuntimeConfig>
): EdgeWorkflowRuntime {
  return new EdgeWorkflowRuntime(deviceId, config);
}
