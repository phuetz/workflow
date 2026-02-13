/**
 * Pattern Catalog - Barrel Export
 * Comprehensive library of 50+ workflow patterns across 5 categories
 */

// Re-export all pattern collections
export { MESSAGING_PATTERNS } from './messagingPatterns';
export { INTEGRATION_PATTERNS } from './integrationPatterns';
export { RELIABILITY_PATTERNS } from './reliabilityPatterns';
export { DATA_PATTERNS } from './dataPatterns';
export { WORKFLOW_PATTERNS } from './workflowPatterns';

// Re-export individual messaging patterns
export {
  CHAIN_OF_RESPONSIBILITY,
  EVENT_DRIVEN,
  PUB_SUB,
  REQUEST_REPLY,
  MESSAGE_QUEUE,
  PIPES_AND_FILTERS,
  CONTENT_BASED_ROUTER,
  MESSAGE_TRANSLATOR,
  SCATTER_GATHER,
  CORRELATION_IDENTIFIER,
} from './messagingPatterns';

// Re-export individual integration patterns
export {
  API_GATEWAY,
  BACKEND_FOR_FRONTEND,
  SERVICE_MESH,
  ADAPTER,
  FACADE,
  WEBHOOK_INTEGRATION,
  ANTI_CORRUPTION_LAYER,
  STRANGLER_FIG,
  SIDECAR,
  AMBASSADOR,
} from './integrationPatterns';

// Re-export individual reliability patterns
export {
  RETRY,
  CIRCUIT_BREAKER,
  BULKHEAD,
  RATE_LIMITING,
  TIMEOUT,
  FALLBACK,
  HEALTH_CHECK,
  IDEMPOTENCY,
  COMPENSATING_TRANSACTION,
  DEAD_LETTER_QUEUE,
} from './reliabilityPatterns';

// Re-export individual data patterns
export {
  ETL,
  DATA_VALIDATION,
  DATA_ENRICHMENT,
  DATA_AGGREGATION,
  CACHE_ASIDE,
  DATA_PARTITIONING,
  CQRS,
  EVENT_SOURCING,
  MATERIALIZED_VIEW,
  CHANGE_DATA_CAPTURE,
} from './dataPatterns';

// Re-export individual workflow patterns
export {
  SAGA,
  ORCHESTRATION,
  CHOREOGRAPHY,
  FAN_OUT_FAN_IN,
  PRIORITY_QUEUE,
  BATCH_PROCESSING,
  SCHEDULED_WORKFLOW,
  CONDITIONAL_WORKFLOW,
  PARALLEL_WORKFLOW,
  SEQUENTIAL_WORKFLOW,
  LOOP_WORKFLOW,
} from './workflowPatterns';

// Import for combined catalog
import { MESSAGING_PATTERNS } from './messagingPatterns';
import { INTEGRATION_PATTERNS } from './integrationPatterns';
import { RELIABILITY_PATTERNS } from './reliabilityPatterns';
import { DATA_PATTERNS } from './dataPatterns';
import { WORKFLOW_PATTERNS } from './workflowPatterns';
import type { PatternDefinition } from '../../types/patterns';

/**
 * Combined pattern catalog containing all patterns
 */
export const ALL_PATTERNS: PatternDefinition[] = [
  ...MESSAGING_PATTERNS,
  ...INTEGRATION_PATTERNS,
  ...RELIABILITY_PATTERNS,
  ...DATA_PATTERNS,
  ...WORKFLOW_PATTERNS,
];

/**
 * Pattern categories with their patterns
 */
export const PATTERNS_BY_CATEGORY = {
  messaging: MESSAGING_PATTERNS,
  integration: INTEGRATION_PATTERNS,
  reliability: RELIABILITY_PATTERNS,
  data: DATA_PATTERNS,
  workflow: WORKFLOW_PATTERNS,
} as const;
