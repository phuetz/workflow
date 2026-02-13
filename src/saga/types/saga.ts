/**
 * Saga Types
 * Distributed transaction orchestration types
 */

/**
 * Saga Step
 * Represents a single step in a saga
 */
export interface SagaStep {
  /** Step identifier */
  id: string;

  /** Step name */
  name: string;

  /** Service or action to execute */
  action: string;

  /** Target service (for microservices) */
  service?: string;

  /** Input data for the step */
  input?: Record<string, unknown>;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    delayMs: number;
    backoff?: 'fixed' | 'exponential' | 'linear';
  };

  /** Whether this step can be skipped on failure */
  optional?: boolean;

  /** Condition to execute this step */
  condition?: string;
}

/**
 * Compensation Step
 * Rollback action for a saga step
 */
export interface CompensationStep {
  /** Step ID this compensation is for */
  forStep: string;

  /** Compensation action name */
  action: string;

  /** Target service */
  service?: string;

  /** Input data for compensation */
  input?: Record<string, unknown>;

  /** When to trigger compensation */
  when?: 'always' | 'on_error' | 'on_timeout';

  /** Timeout for compensation */
  timeout?: number;
}

/**
 * Saga Definition
 */
export interface SagaDefinition {
  /** Saga identifier */
  id: string;

  /** Saga name */
  name: string;

  /** Saga description */
  description?: string;

  /** Saga steps */
  steps: SagaStep[];

  /** Compensation steps */
  compensations: CompensationStep[];

  /** Saga timeout in milliseconds */
  timeout?: number;

  /** Idempotency key */
  idempotencyKey?: string;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Saga Instance
 * Runtime instance of a saga execution
 */
export interface SagaInstance {
  /** Instance ID */
  id: string;

  /** Saga definition ID */
  sagaId: string;

  /** Current status */
  status: SagaStatus;

  /** Current step index */
  currentStep: number;

  /** Completed steps */
  completedSteps: string[];

  /** Failed steps */
  failedSteps: Array<{
    stepId: string;
    error: string;
    timestamp: Date;
  }>;

  /** Step results */
  stepResults: Map<string, unknown>;

  /** Saga context (shared data) */
  context: Record<string, unknown>;

  /** Started timestamp */
  startedAt: Date;

  /** Completed timestamp */
  completedAt?: Date;

  /** Error message */
  error?: string;

  /** Correlation ID */
  correlationId?: string;

  /** User who triggered the saga */
  userId?: string;
}

/**
 * Saga Status
 */
export enum SagaStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPENSATING = 'compensating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  COMPENSATED = 'compensated',
  CANCELLED = 'cancelled',
}

/**
 * Saga Context
 * Shared data across saga steps
 */
export interface SagaContext {
  /** Saga instance ID */
  instanceId: string;

  /** Saga data */
  data: Record<string, unknown>;

  /** Step results */
  stepResults: Map<string, unknown>;

  /** Current step index */
  currentStep: number;

  /** Correlation ID */
  correlationId?: string;
}

/**
 * Saga Result
 */
export interface SagaResult {
  /** Success flag */
  success: boolean;

  /** Instance ID */
  instanceId: string;

  /** Final status */
  status: SagaStatus;

  /** Result data */
  data?: Record<string, unknown>;

  /** Error message */
  error?: string;

  /** Completed steps count */
  stepsCompleted: number;

  /** Failed steps count */
  stepsFailed: number;

  /** Duration in milliseconds */
  durationMs: number;

  /** Whether compensation was executed */
  compensated: boolean;
}

/**
 * Step Executor Function
 * Function that executes a saga step
 */
export type StepExecutor = (
  step: SagaStep,
  context: SagaContext
) => Promise<unknown>;

/**
 * Compensation Executor Function
 * Function that executes a compensation
 */
export type CompensationExecutor = (
  compensation: CompensationStep,
  context: SagaContext
) => Promise<void>;

/**
 * Saga Event
 * Events emitted during saga execution
 */
export interface SagaEvent {
  /** Event type */
  type: SagaEventType;

  /** Saga instance ID */
  instanceId: string;

  /** Saga ID */
  sagaId: string;

  /** Event data */
  data: Record<string, unknown>;

  /** Timestamp */
  timestamp: Date;

  /** Correlation ID */
  correlationId?: string;
}

/**
 * Saga Event Types
 */
export enum SagaEventType {
  SAGA_STARTED = 'saga.started',
  SAGA_COMPLETED = 'saga.completed',
  SAGA_FAILED = 'saga.failed',
  SAGA_COMPENSATING = 'saga.compensating',
  SAGA_COMPENSATED = 'saga.compensated',
  STEP_STARTED = 'step.started',
  STEP_COMPLETED = 'step.completed',
  STEP_FAILED = 'step.failed',
  STEP_RETRYING = 'step.retrying',
  COMPENSATION_STARTED = 'compensation.started',
  COMPENSATION_COMPLETED = 'compensation.completed',
  COMPENSATION_FAILED = 'compensation.failed',
}

/**
 * Saga Statistics
 */
export interface SagaStatistics {
  /** Total sagas executed */
  totalSagas: number;

  /** Currently running sagas */
  runningSagas: number;

  /** Completed sagas */
  completedSagas: number;

  /** Failed sagas */
  failedSagas: number;

  /** Compensated sagas */
  compensatedSagas: number;

  /** Average duration */
  avgDurationMs: number;

  /** Success rate */
  successRate: number;

  /** Compensation rate */
  compensationRate: number;
}

/**
 * Saga Orchestrator Configuration
 */
export interface SagaOrchestratorConfig {
  /** Default timeout for sagas */
  defaultTimeout: number;

  /** Default timeout for steps */
  defaultStepTimeout: number;

  /** Default timeout for compensations */
  defaultCompensationTimeout: number;

  /** Enable distributed tracing */
  enableTracing: boolean;

  /** Enable idempotency checks */
  enableIdempotency: boolean;

  /** Idempotency TTL in milliseconds */
  idempotencyTTL: number;

  /** Enable automatic retry */
  enableAutoRetry: boolean;

  /** Max retry attempts */
  maxRetryAttempts: number;
}
