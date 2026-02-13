/**
 * Durable Execution Engine Module
 * State persistence, failure recovery, and Saga pattern
 */

export {
  DurableExecutionEngine,
  type DurableWorkflowState,
  type DurableStep,
  type Checkpoint,
  type CompensationAction,
  type SagaDefinition,
  type SagaStep,
  type SagaContext,
  type RetryPolicy,
  type DurableExecutionConfig,
  type PersistenceAdapter,
  InMemoryPersistenceAdapter,
  createDurableExecutionEngine
} from './DurableExecutionEngine';
