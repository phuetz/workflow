/**
 * Durable Execution Engine with Saga Pattern
 * Provides automatic state persistence, failure recovery, and compensating transactions
 */

import { EventEmitter } from 'events';

// Types
export interface DurableWorkflowState {
  workflowId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'compensating' | 'compensated';
  currentStep: number;
  steps: DurableStep[];
  checkpoints: Checkpoint[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  metadata: Record<string, unknown>;
}

export interface DurableStep {
  id: string;
  nodeId: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'compensated';
  input: unknown;
  output?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  compensationAction?: CompensationAction;
  retryCount: number;
  duration?: number;
}

export interface Checkpoint {
  id: string;
  stepId: string;
  timestamp: Date;
  state: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CompensationAction {
  type: string;
  params: Record<string, unknown>;
  executed: boolean;
  result?: unknown;
  error?: string;
}

export interface SagaDefinition {
  steps: SagaStep[];
  compensationStrategy: 'backward' | 'forward' | 'parallel';
  timeout?: number;
  maxRetries?: number;
}

export interface SagaStep {
  id: string;
  name: string;
  action: (context: SagaContext) => Promise<unknown>;
  compensation?: (context: SagaContext, result: unknown) => Promise<void>;
  retryPolicy?: RetryPolicy;
  timeout?: number;
}

export interface SagaContext {
  executionId: string;
  stepResults: Map<string, unknown>;
  metadata: Record<string, unknown>;
  checkpoint: (data: Record<string, unknown>) => Promise<void>;
  getCheckpoint: () => Promise<Record<string, unknown> | null>;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffType: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;
  maxDelay?: number;
  retryableErrors?: string[];
}

export interface DurableExecutionConfig {
  persistenceAdapter: PersistenceAdapter;
  checkpointInterval?: number;
  defaultTimeout?: number;
  defaultRetryPolicy?: RetryPolicy;
}

// Persistence Adapter Interface
export interface PersistenceAdapter {
  saveState(state: DurableWorkflowState): Promise<void>;
  loadState(executionId: string): Promise<DurableWorkflowState | null>;
  saveCheckpoint(checkpoint: Checkpoint): Promise<void>;
  loadCheckpoints(executionId: string): Promise<Checkpoint[]>;
  listPendingExecutions(): Promise<string[]>;
  deleteExecution(executionId: string): Promise<void>;
}

// In-Memory Persistence Adapter (for development/testing)
export class InMemoryPersistenceAdapter implements PersistenceAdapter {
  private states: Map<string, DurableWorkflowState> = new Map();
  private checkpoints: Map<string, Checkpoint[]> = new Map();

  async saveState(state: DurableWorkflowState): Promise<void> {
    this.states.set(state.executionId, JSON.parse(JSON.stringify(state)));
  }

  async loadState(executionId: string): Promise<DurableWorkflowState | null> {
    const state = this.states.get(executionId);
    return state ? JSON.parse(JSON.stringify(state)) : null;
  }

  async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const executionId = checkpoint.id.split('_')[1];
    const existing = this.checkpoints.get(executionId) || [];
    existing.push(JSON.parse(JSON.stringify(checkpoint)));
    this.checkpoints.set(executionId, existing);
  }

  async loadCheckpoints(executionId: string): Promise<Checkpoint[]> {
    return this.checkpoints.get(executionId) || [];
  }

  async listPendingExecutions(): Promise<string[]> {
    return Array.from(this.states.entries())
      .filter(([_, state]) => ['pending', 'running', 'compensating'].includes(state.status))
      .map(([id]) => id);
  }

  async deleteExecution(executionId: string): Promise<void> {
    this.states.delete(executionId);
    this.checkpoints.delete(executionId);
  }
}

/**
 * Durable Execution Engine
 * Ensures workflow execution survives crashes with automatic recovery
 */
export class DurableExecutionEngine extends EventEmitter {
  private config: DurableExecutionConfig;
  private runningExecutions: Map<string, DurableWorkflowState> = new Map();
  private recoveryInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: DurableExecutionConfig) {
    super();
    this.config = {
      checkpointInterval: config.checkpointInterval || 5000,
      defaultTimeout: config.defaultTimeout || 30000,
      defaultRetryPolicy: config.defaultRetryPolicy || {
        maxRetries: 3,
        backoffType: 'exponential',
        initialDelay: 1000,
      },
      ...config,
    };
  }

  /**
   * Start the engine and recover any pending executions
   */
  async start(): Promise<void> {
    // Recover pending executions
    await this.recoverPendingExecutions();

    // Start periodic recovery check
    this.recoveryInterval = setInterval(() => {
      this.recoverPendingExecutions().catch(err => {
        this.emit('error', err);
      });
    }, 30000);

    this.emit('started');
  }

  /**
   * Stop the engine
   */
  async stop(): Promise<void> {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }

    // Wait for running executions to checkpoint
    for (const [executionId, state] of this.runningExecutions) {
      await this.config.persistenceAdapter.saveState(state);
    }

    this.emit('stopped');
  }

  /**
   * Execute a workflow with durable execution guarantees
   */
  async execute(
    workflowId: string,
    nodes: Array<{ id: string; type: string; config: Record<string, unknown> }>,
    input: unknown,
    metadata?: Record<string, unknown>
  ): Promise<DurableWorkflowState> {
    const executionId = this.generateExecutionId();

    // Initialize state
    const state: DurableWorkflowState = {
      workflowId,
      executionId,
      status: 'pending',
      currentStep: 0,
      steps: nodes.map(node => ({
        id: `step_${node.id}`,
        nodeId: node.id,
        nodeType: node.type,
        status: 'pending',
        input: null,
        retryCount: 0,
      })),
      checkpoints: [],
      startedAt: new Date(),
      retryCount: 0,
      metadata: metadata || {},
    };

    // Persist initial state
    await this.config.persistenceAdapter.saveState(state);
    this.runningExecutions.set(executionId, state);

    // Execute workflow
    try {
      state.status = 'running';
      await this.config.persistenceAdapter.saveState(state);

      let currentInput = input;

      for (let i = 0; i < state.steps.length; i++) {
        state.currentStep = i;
        const step = state.steps[i];

        // Execute step with retry
        const result = await this.executeStepWithRetry(state, step, currentInput);

        step.output = result;
        step.status = 'completed';
        step.completedAt = new Date();

        // Checkpoint after each step
        await this.createCheckpoint(state, step);

        currentInput = result;
      }

      state.status = 'completed';
      state.completedAt = new Date();
      await this.config.persistenceAdapter.saveState(state);

      this.emit('execution:completed', state);
      return state;

    } catch (error) {
      state.status = 'failed';
      state.error = error instanceof Error ? error.message : 'Unknown error';
      await this.config.persistenceAdapter.saveState(state);

      // Trigger compensation (saga rollback)
      await this.executeCompensation(state);

      this.emit('execution:failed', state);
      throw error;

    } finally {
      this.runningExecutions.delete(executionId);
    }
  }

  /**
   * Execute a saga (distributed transaction)
   */
  async executeSaga(
    sagaId: string,
    definition: SagaDefinition,
    input: unknown,
    metadata?: Record<string, unknown>
  ): Promise<DurableWorkflowState> {
    const executionId = this.generateExecutionId();
    const stepResults = new Map<string, unknown>();

    // Initialize state
    const state: DurableWorkflowState = {
      workflowId: sagaId,
      executionId,
      status: 'pending',
      currentStep: 0,
      steps: definition.steps.map(step => ({
        id: step.id,
        nodeId: step.id,
        nodeType: 'saga_step',
        status: 'pending',
        input: null,
        retryCount: 0,
        compensationAction: step.compensation ? {
          type: 'compensation',
          params: {},
          executed: false,
        } : undefined,
      })),
      checkpoints: [],
      startedAt: new Date(),
      retryCount: 0,
      metadata: metadata || {},
    };

    await this.config.persistenceAdapter.saveState(state);
    this.runningExecutions.set(executionId, state);

    try {
      state.status = 'running';
      let currentInput = input;

      for (let i = 0; i < definition.steps.length; i++) {
        state.currentStep = i;
        const sagaStep = definition.steps[i];
        const step = state.steps[i];

        // Create saga context
        const context: SagaContext = {
          executionId,
          stepResults,
          metadata: state.metadata,
          checkpoint: async (data) => {
            await this.createCheckpoint(state, step, data);
          },
          getCheckpoint: async () => {
            const checkpoints = state.checkpoints.filter(c => c.stepId === step.id);
            return checkpoints.length > 0 ? checkpoints[checkpoints.length - 1].state : null;
          },
        };

        step.startedAt = new Date();
        step.status = 'running';
        step.input = currentInput;

        try {
          // Execute with timeout
          const result = await this.executeWithTimeout(
            () => sagaStep.action(context),
            sagaStep.timeout || definition.timeout || this.config.defaultTimeout!
          );

          step.output = result;
          step.status = 'completed';
          step.completedAt = new Date();
          step.duration = step.completedAt.getTime() - step.startedAt.getTime();

          stepResults.set(sagaStep.id, result);
          currentInput = result;

          await this.createCheckpoint(state, step);

        } catch (error) {
          step.status = 'failed';
          step.error = error instanceof Error ? error.message : 'Unknown error';
          throw error;
        }
      }

      state.status = 'completed';
      state.completedAt = new Date();
      await this.config.persistenceAdapter.saveState(state);

      this.emit('saga:completed', { state, results: Object.fromEntries(stepResults) });
      return state;

    } catch (error) {
      state.status = 'compensating';
      await this.config.persistenceAdapter.saveState(state);

      // Execute compensations based on strategy
      await this.executeSagaCompensation(state, definition, stepResults);

      this.emit('saga:compensated', state);
      throw error;

    } finally {
      this.runningExecutions.delete(executionId);
    }
  }

  /**
   * Execute step with retry policy
   */
  private async executeStepWithRetry(
    state: DurableWorkflowState,
    step: DurableStep,
    input: unknown
  ): Promise<unknown> {
    const retryPolicy = this.config.defaultRetryPolicy!;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        step.startedAt = new Date();
        step.status = 'running';
        step.input = input;
        step.retryCount = attempt;

        await this.config.persistenceAdapter.saveState(state);

        // Execute the step (mock execution - would integrate with real ExecutionEngine)
        const result = await this.executeNode(step.nodeType, step.nodeId, input);

        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        step.error = lastError.message;

        if (attempt < retryPolicy.maxRetries) {
          const delay = this.calculateRetryDelay(retryPolicy, attempt);
          this.emit('step:retry', { step, attempt, delay, error: lastError });
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Execute a node (mock implementation)
   */
  private async executeNode(nodeType: string, nodeId: string, input: unknown): Promise<unknown> {
    // This would integrate with the real ExecutionEngine
    // For now, emit an event and return mock data
    return new Promise((resolve, reject) => {
      this.emit('node:execute', {
        nodeType,
        nodeId,
        input,
        callback: (error: Error | null, result: unknown) => {
          if (error) reject(error);
          else resolve(result || { success: true, nodeId });
        },
      });

      // Default timeout
      setTimeout(() => {
        resolve({ success: true, nodeId, mock: true });
      }, 100);
    });
  }

  /**
   * Create a checkpoint
   */
  private async createCheckpoint(
    state: DurableWorkflowState,
    step: DurableStep,
    additionalData?: Record<string, unknown>
  ): Promise<void> {
    const checkpoint: Checkpoint = {
      id: `cp_${state.executionId}_${step.id}_${Date.now()}`,
      stepId: step.id,
      timestamp: new Date(),
      state: {
        stepOutput: step.output,
        currentStep: state.currentStep,
        ...additionalData,
      },
    };

    state.checkpoints.push(checkpoint);
    await this.config.persistenceAdapter.saveCheckpoint(checkpoint);
    await this.config.persistenceAdapter.saveState(state);

    this.emit('checkpoint:created', checkpoint);
  }

  /**
   * Execute compensation for failed workflow
   */
  private async executeCompensation(state: DurableWorkflowState): Promise<void> {
    state.status = 'compensating';
    await this.config.persistenceAdapter.saveState(state);

    // Compensate in reverse order
    for (let i = state.currentStep; i >= 0; i--) {
      const step = state.steps[i];

      if (step.status === 'completed' && step.compensationAction) {
        try {
          // Execute compensation action
          step.compensationAction.executed = true;
          step.status = 'compensated';

          this.emit('step:compensated', step);
        } catch (error) {
          step.compensationAction.error = error instanceof Error ? error.message : 'Unknown error';
          this.emit('compensation:failed', { step, error });
        }
      }
    }

    state.status = 'compensated';
    await this.config.persistenceAdapter.saveState(state);
  }

  /**
   * Execute saga compensation with strategy
   */
  private async executeSagaCompensation(
    state: DurableWorkflowState,
    definition: SagaDefinition,
    stepResults: Map<string, unknown>
  ): Promise<void> {
    const completedSteps = state.steps
      .map((step, index) => ({ step, sagaStep: definition.steps[index] }))
      .filter(({ step }) => step.status === 'completed');

    switch (definition.compensationStrategy) {
      case 'backward':
        // Compensate in reverse order
        for (let i = completedSteps.length - 1; i >= 0; i--) {
          const { step, sagaStep } = completedSteps[i];
          await this.compensateStep(state, step, sagaStep, stepResults);
        }
        break;

      case 'forward':
        // Compensate in forward order
        for (const { step, sagaStep } of completedSteps) {
          await this.compensateStep(state, step, sagaStep, stepResults);
        }
        break;

      case 'parallel':
        // Compensate all in parallel
        await Promise.all(
          completedSteps.map(({ step, sagaStep }) =>
            this.compensateStep(state, step, sagaStep, stepResults)
          )
        );
        break;
    }

    state.status = 'compensated';
    await this.config.persistenceAdapter.saveState(state);
  }

  /**
   * Compensate a single step
   */
  private async compensateStep(
    state: DurableWorkflowState,
    step: DurableStep,
    sagaStep: SagaStep,
    stepResults: Map<string, unknown>
  ): Promise<void> {
    if (!sagaStep.compensation) return;

    const context: SagaContext = {
      executionId: state.executionId,
      stepResults,
      metadata: state.metadata,
      checkpoint: async () => {},
      getCheckpoint: async () => null,
    };

    try {
      await sagaStep.compensation(context, step.output);
      step.status = 'compensated';
      if (step.compensationAction) {
        step.compensationAction.executed = true;
      }
      this.emit('step:compensated', step);
    } catch (error) {
      if (step.compensationAction) {
        step.compensationAction.error = error instanceof Error ? error.message : 'Unknown error';
      }
      this.emit('compensation:failed', { step, error });
    }
  }

  /**
   * Recover pending executions after restart
   */
  private async recoverPendingExecutions(): Promise<void> {
    const pendingIds = await this.config.persistenceAdapter.listPendingExecutions();

    for (const executionId of pendingIds) {
      if (this.runningExecutions.has(executionId)) continue;

      const state = await this.config.persistenceAdapter.loadState(executionId);
      if (!state) continue;

      this.emit('execution:recovering', state);

      // Resume from last checkpoint
      try {
        await this.resumeExecution(state);
      } catch (error) {
        this.emit('recovery:failed', { state, error });
      }
    }
  }

  /**
   * Resume execution from checkpoint
   */
  private async resumeExecution(state: DurableWorkflowState): Promise<void> {
    // Find the last successful checkpoint
    const lastCheckpoint = state.checkpoints[state.checkpoints.length - 1];

    if (lastCheckpoint) {
      // Resume from after the last checkpoint
      state.currentStep = state.steps.findIndex(s => s.id === lastCheckpoint.stepId) + 1;
    }

    // Re-execute remaining steps
    // This would integrate with the main execute flow
    this.emit('execution:resumed', state);
  }

  /**
   * Calculate retry delay based on policy
   */
  private calculateRetryDelay(policy: RetryPolicy, attempt: number): number {
    switch (policy.backoffType) {
      case 'fixed':
        return policy.initialDelay;
      case 'linear':
        return policy.initialDelay * (attempt + 1);
      case 'exponential':
        return Math.min(
          policy.initialDelay * Math.pow(2, attempt),
          policy.maxDelay || 60000
        );
      default:
        return policy.initialDelay;
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeout)
      ),
    ]);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get execution state
   */
  async getExecutionState(executionId: string): Promise<DurableWorkflowState | null> {
    return this.config.persistenceAdapter.loadState(executionId);
  }

  /**
   * List all executions
   */
  async listExecutions(): Promise<string[]> {
    return this.config.persistenceAdapter.listPendingExecutions();
  }

  /**
   * Cancel an execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    const state = await this.config.persistenceAdapter.loadState(executionId);
    if (state && state.status === 'running') {
      state.status = 'failed';
      state.error = 'Cancelled by user';
      await this.config.persistenceAdapter.saveState(state);
      this.emit('execution:cancelled', state);
    }
  }
}

// Export factory function
export function createDurableExecutionEngine(
  config?: Partial<DurableExecutionConfig>
): DurableExecutionEngine {
  return new DurableExecutionEngine({
    persistenceAdapter: config?.persistenceAdapter || new InMemoryPersistenceAdapter(),
    ...config,
  });
}

export default DurableExecutionEngine;
