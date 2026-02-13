/**
 * AI Module
 * AI-powered features for workflow automation
 */

// Data Cleaning
export {
  AIDataCleaner,
  type DataCleaningRequest,
  type DataCleaningResult,
  type CleaningOptions,
  type Transformation,
  type TransformationType
} from './AIDataCleaner';

// Auto Naming
export {
  AutoNamingService,
  autoNamingService,
  type AutoNamingOptions,
  type AutoNamingResult,
  type BulkRenamePreview
} from './AutoNaming';

// Context Analysis
export { ContextAnalyzer } from './ContextAnalyzer';

// Naming Patterns
export {
  type NamingPattern,
  type NamingContext,
  httpRequestPatterns,
  databasePatterns,
  emailPatterns,
  slackPatterns,
  conditionalPatterns,
  loopPatterns,
  transformPatterns,
  webhookPatterns,
  NAMING_PATTERNS,
  ACTION_VERBS
} from './NamingPatterns';

// Parameter Suggestions
export { ParameterSuggester } from './ParameterSuggester';

// Pattern Matching
export { PatternMatcher } from './PatternMatcher';

// Quality Analysis
export { QualityAnalyzer } from './QualityAnalyzer';

// Smart Completion
export {
  SmartCompletionService,
  smartCompletionService,
  type CompletionItem,
  type CompletionContext
} from './SmartCompletion';

// Workflow Recommendations
export { WorkflowRecommender } from './WorkflowRecommender';
