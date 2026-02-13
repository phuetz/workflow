/**
 * Saga Orchestrator
 * Orchestrates distributed transactions using the Saga pattern
 */

import {
  SagaDefinition,
  SagaInstance,
  SagaStatus,
  SagaContext,
  SagaResult,
  SagaStep,
  StepExecutor,
  SagaEvent,
  SagaEventType,
  SagaOrchestratorConfig,
  SagaStatistics,
} from './types/saga';
import { CompensationManager } from './CompensationManager';
import { eventPublisher } from '../eventsourcing/EventPublisher';

/**
 * Saga Orchestrator Implementation
 */
export class SagaOrchestrator {
  private sagas: Map<string, SagaDefinition> = new Map();
  private instances: Map<string, SagaInstance> = new Map();
  private stepExecutors: Map<string, StepExecutor> = new Map();
  private compensationManager: CompensationManager;
  private config: SagaOrchestratorConfig;
  private idempotencyCache: Map<string, SagaResult> = new Map();

  constructor(config?: Partial<SagaOrchestratorConfig>) {
    this.config = {
      defaultTimeout: config?.defaultTimeout || 300000, // 5 minutes
      defaultStepTimeout: config?.defaultStepTimeout || 30000, // 30 seconds
      defaultCompensationTimeout: config?.defaultCompensationTimeout || 30000,
      enableTracing: config?.enableTracing !== false,
      enableIdempotency: config?.enableIdempotency !== false,
      idempotencyTTL: config?.idempotencyTTL || 3600000, // 1 hour
      enableAutoRetry: config?.enableAutoRetry !== false,
      maxRetryAttempts: config?.maxRetryAttempts || 3,
    };

    this.compensationManager = new CompensationManager({
      defaultTimeout: this.config.defaultCompensationTimeout,
    });
  }

  /**
   * Register a saga definition
   */
  registerSaga(saga: SagaDefinition): void {
    this.sagas.set(saga.id, saga);
  }

  /**
   * Register a step executor
   */
  registerStepExecutor(action: string, executor: StepExecutor): void {
    this.stepExecutors.set(action, executor);
  }

  /**
   * Execute a saga
   */
  async execute(
    sagaId: string,
    context: Record<string, unknown>,
    options?: {
      correlationId?: string;
      userId?: string;
      idempotencyKey?: string;
    }
  ): Promise<SagaResult> {
    // Check idempotency
    if (
      this.config.enableIdempotency &&
      options?.idempotencyKey
    ) {
      const cached = this.idempotencyCache.get(options.idempotencyKey);
      if (cached) {
        return cached;
      }
    }

    const saga = this.sagas.get(sagaId);
    if (!saga) {
      throw new Error(`Saga ${sagaId} not found`);
    }

    // Create saga instance
    const instance: SagaInstance = {
      id: `saga_${Date.now()}_${Math.random()}`,
      sagaId,
      status: SagaStatus.PENDING,
      currentStep: 0,
      completedSteps: [],
      failedSteps: [],
      stepResults: new Map(),
      context,
      startedAt: new Date(),
      correlationId: options?.correlationId,
      userId: options?.userId,
    };

    this.instances.set(instance.id, instance);

    // Emit started event
    this.emitEvent({
      type: SagaEventType.SAGA_STARTED,
      instanceId: instance.id,
      sagaId,
      data: { context },
      timestamp: new Date(),
      correlationId: options?.correlationId,
    });

    // Execute saga
    const result = await this.executeSaga(instance, saga);

    // Cache result for idempotency
    if (this.config.enableIdempotency && options?.idempotencyKey) {
      this.idempotencyCache.set(options.idempotencyKey, result);

      // Cleanup after TTL
      setTimeout(() => {
        this.idempotencyCache.delete(options.idempotencyKey!);
      }, this.config.idempotencyTTL);
    }

    return result;
  }

  /**
   * Execute saga steps
   */
  private async executeSaga(
    instance: SagaInstance,
    saga: SagaDefinition
  ): Promise<SagaResult> {
    instance.status = SagaStatus.RUNNING;

    const startTime = Date.now();

    try {
      // Execute steps sequentially
      for (let i = 0; i < saga.steps.length; i++) {
        instance.currentStep = i;
        const step = saga.steps[i];

        // Check if step should be executed (condition)
        if (step.condition && !this.evaluateCondition(step.condition, instance)) {
          continue;
        }

        // Execute step with timeout
        const stepTimeout = step.timeout || this.config.defaultStepTimeout;
        const sagaTimeout = saga.timeout || this.config.defaultTimeout;

        try {
          const result = await this.executeStepWithRetry(
            step,
            instance,
            stepTimeout
          );

          instance.stepResults.set(step.id, result);
          instance.completedSteps.push(step.id);

          // Emit step completed event
          this.emitEvent({
            type: SagaEventType.STEP_COMPLETED,
            instanceId: instance.id,
            sagaId: instance.sagaId,
            data: { step: step.id, result },
            timestamp: new Date(),
            correlationId: instance.correlationId,
          });
        } catch (error) {
          // Step failed
          instance.failedSteps.push({
            stepId: step.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
          });

          // Emit step failed event
          this.emitEvent({
            type: SagaEventType.STEP_FAILED,
            instanceId: instance.id,
            sagaId: instance.sagaId,
            data: {
              step: step.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            timestamp: new Date(),
            correlationId: instance.correlationId,
          });

          // If step is not optional, fail saga and compensate
          if (!step.optional) {
            throw error;
          }
        }
      }

      // All steps completed successfully
      instance.status = SagaStatus.COMPLETED;
      instance.completedAt = new Date();

      const result: SagaResult = {
        success: true,
        instanceId: instance.id,
        status: SagaStatus.COMPLETED,
        data: Object.fromEntries(instance.stepResults),
        stepsCompleted: instance.completedSteps.length,
        stepsFailed: instance.failedSteps.length,
        durationMs: Date.now() - startTime,
        compensated: false,
      };

      // Emit completed event
      this.emitEvent({
        type: SagaEventType.SAGA_COMPLETED,
        instanceId: instance.id,
        sagaId: instance.sagaId,
        data: { result },
        timestamp: new Date(),
        correlationId: instance.correlationId,
      });

      return result;
    } catch (error) {
      // Saga failed, trigger compensation
      instance.status = SagaStatus.COMPENSATING;

      // Emit compensating event
      this.emitEvent({
        type: SagaEventType.SAGA_COMPENSATING,
        instanceId: instance.id,
        sagaId: instance.sagaId,
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
        correlationId: instance.correlationId,
      });

      // Execute compensations
      await this.compensationManager.compensate(
        saga,
        instance.completedSteps,
        this.createSagaContext(instance)
      );

      instance.status = SagaStatus.COMPENSATED;
      instance.completedAt = new Date();
      instance.error = error instanceof Error ? error.message : 'Unknown error';

      const result: SagaResult = {
        success: false,
        instanceId: instance.id,
        status: SagaStatus.COMPENSATED,
        error: instance.error,
        stepsCompleted: instance.completedSteps.length,
        stepsFailed: instance.failedSteps.length,
        durationMs: Date.now() - startTime,
        compensated: true,
      };

      // Emit compensated event
      this.emitEvent({
        type: SagaEventType.SAGA_COMPENSATED,
        instanceId: instance.id,
        sagaId: instance.sagaId,
        data: { result },
        timestamp: new Date(),
        correlationId: instance.correlationId,
      });

      return result;
    }
  }

  /**
   * Execute step with retry logic
   */
  private async executeStepWithRetry(
    step: SagaStep,
    instance: SagaInstance,
    timeout: number
  ): Promise<unknown> {
    const maxAttempts = step.retry?.maxAttempts || this.config.maxRetryAttempts;
    const delay = step.retry?.delayMs || 1000;
    const backoff = step.retry?.backoff || 'exponential';

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Emit retrying event (if not first attempt)
        if (attempt > 1) {
          this.emitEvent({
            type: SagaEventType.STEP_RETRYING,
            instanceId: instance.id,
            sagaId: instance.sagaId,
            data: { step: step.id, attempt },
            timestamp: new Date(),
            correlationId: instance.correlationId,
          });
        }

        // Execute step with timeout
        const result = await this.executeStepWithTimeout(
          step,
          instance,
          timeout
        );

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry on last attempt
        if (attempt === maxAttempts) {
          break;
        }

        // Calculate delay based on backoff strategy
        let retryDelay = delay;
        if (backoff === 'exponential') {
          retryDelay = delay * Math.pow(2, attempt - 1);
        } else if (backoff === 'linear') {
          retryDelay = delay * attempt;
        }

        // Wait before retry
        await this.sleep(retryDelay);
      }
    }

    throw lastError;
  }

  /**
   * Execute step with timeout
   */
  private async executeStepWithTimeout(
    step: SagaStep,
    instance: SagaInstance,
    timeout: number
  ): Promise<unknown> {
    const executor = this.stepExecutors.get(step.action);
    if (!executor) {
      throw new Error(`No executor registered for action: ${step.action}`);
    }

    const context = this.createSagaContext(instance);

    // Emit step started event
    this.emitEvent({
      type: SagaEventType.STEP_STARTED,
      instanceId: instance.id,
      sagaId: instance.sagaId,
      data: { step: step.id },
      timestamp: new Date(),
      correlationId: instance.correlationId,
    });

    // Execute with timeout
    return Promise.race([
      executor(step, context),
      this.timeoutPromise(timeout, `Step ${step.id} timed out`),
    ]);
  }

  /**
   * Create saga context
   */
  private createSagaContext(instance: SagaInstance): SagaContext {
    return {
      instanceId: instance.id,
      data: instance.context,
      stepResults: instance.stepResults,
      currentStep: instance.currentStep,
      correlationId: instance.correlationId,
    };
  }

  /**
   * Evaluate step condition
   */
  private evaluateCondition(
    condition: string,
    instance: SagaInstance
  ): boolean {
    // Simplified condition evaluation
    // In production, use a proper expression evaluator
    return true;
  }

  /**
   * Emit saga event
   */
  private emitEvent(event: SagaEvent): void {
    // Publish event for observability
    eventPublisher.publish({
      id: `evt_${Date.now()}_${Math.random()}`,
      aggregateId: event.instanceId,
      aggregateType: 'saga',
      eventType: event.type,
      version: 1,
      data: event.data,
      metadata: {},
      timestamp: event.timestamp,
      correlationId: event.correlationId,
    });
  }

  /**
   * Get saga instance
   */
  getSagaInstance(instanceId: string): SagaInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Get saga statistics
   */
  getStatistics(): SagaStatistics {
    const instances = Array.from(this.instances.values());
    const total = instances.length;
    const running = instances.filter((i) => i.status === SagaStatus.RUNNING).length;
    const completed = instances.filter(
      (i) => i.status === SagaStatus.COMPLETED
    ).length;
    const failed = instances.filter((i) => i.status === SagaStatus.FAILED).length;
    const compensated = instances.filter(
      (i) => i.status === SagaStatus.COMPENSATED
    ).length;

    const completedInstances = instances.filter((i) => i.completedAt);
    const avgDurationMs =
      completedInstances.length > 0
        ? completedInstances.reduce(
            (sum, i) =>
              sum +
              (i.completedAt!.getTime() - i.startedAt.getTime()),
            0
          ) / completedInstances.length
        : 0;

    const successRate = total > 0 ? completed / total : 0;
    const compensationRate = total > 0 ? compensated / total : 0;

    return {
      totalSagas: total,
      runningSagas: running,
      completedSagas: completed,
      failedSagas: failed,
      compensatedSagas: compensated,
      avgDurationMs,
      successRate,
      compensationRate,
    };
  }

  /**
   * Timeout promise utility
   */
  private timeoutPromise(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Global saga orchestrator instance
 */
export const sagaOrchestrator = new SagaOrchestrator();
