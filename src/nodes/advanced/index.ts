/**
 * Advanced Workflow Nodes Index
 * Exports all advanced node implementations for n8n/Zapier parity
 */

// Email Parser - Parse and extract data from emails
export {
  EmailParser,
  createEmailParser,
  type ParsedEmail,
  type EmailAddress,
  type Attachment,
  type ExtractedData,
  type AmountData,
  type TrackingNumber,
  type ParserRule,
  type EmailParserConfig
} from './EmailParser';

// Lookup Node - Search and retrieve data from tables/databases
export {
  LookupNode,
  createLookupNode,
  type LookupConfig,
  type LookupSource,
  type LookupResult,
  type LookupCacheEntry
} from './LookupNode';

// Digest/Batch Node - Collect and batch items over time
export {
  DigestBatchNode,
  createDigestBatchNode,
  type DigestConfig,
  type ScheduleConfig,
  type AggregationConfig,
  type DigestItem,
  type BatchResult,
  type DigestState
} from './DigestBatchNode';

// Paths Node - Multi-branch conditional routing
export {
  PathsNode,
  createPathsNode,
  createEmptyPathsConfig,
  type PathConfig,
  type PathCondition,
  type PathOperator,
  type PathsNodeConfig,
  type PathEvaluationResult,
  type ConditionResult,
  type PathsResult
} from './PathsNode';

// Debounce/Throttle Node - Control execution rate
export {
  DebounceThrottleNode,
  createDebouncer,
  createThrottler,
  createDeduplicator,
  createRateLimiter,
  type DebounceConfig,
  type ExecutionResult,
  type DebounceState,
  type ThrottleState,
  type RateLimitState
} from './DebounceThrottleNode';
