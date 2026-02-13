/**
 * Query Engine barrel export
 */

// Types
export * from './types';

// Core components
export { QueryParser } from './QueryParser';
export { QueryOptimizer, type OptimizationResult } from './QueryOptimizer';
export { QueryCache } from './QueryCache';
export { QueryExecutor, type ExecutionResult } from './QueryExecutor';
export { ResultFormatter } from './ResultFormatter';

// Managers
export { SchedulerManager } from './SchedulerManager';
export { ViewManager } from './ViewManager';

// Pre-built queries
export {
  PREBUILT_QUERIES,
  getPrebuiltQueryByName,
  getPrebuiltQueriesByCategory,
  type PrebuiltQueryDefinition
} from './PrebuiltQueries';
