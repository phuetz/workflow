/**
 * Expression System - Public API
 *
 * Complete n8n-compatible expression system with:
 * - {{ }} syntax support
 * - Rich context variables ($json, $node, etc.)
 * - 100+ built-in functions
 * - Monaco editor with autocomplete
 * - Security sandbox
 */

// Core engine (using secure implementation)
export { SecureExpressionEngineV2 as ExpressionEngine, type ExpressionOptions, type EvaluationResult } from './SecureExpressionEngineV2';

// Context builder
export {
  ExpressionContext,
  type WorkflowItem,
  type NodeData,
  type WorkflowMetadata,
  type ExecutionMetadata,
  type ExpressionContextOptions,
} from './ExpressionContext';

// Built-in functions
export {
  builtInFunctions,
  stringFunctions,
  dateFunctions,
  arrayFunctions,
  objectFunctions,
  mathFunctions,
  conversionFunctions,
  validationFunctions,
} from './BuiltInFunctions';

// Autocomplete
export {
  getAllCompletions,
  getCompletionsForPrefix,
  getCompletionsByCategory,
  type AutocompleteItem,
} from './autocomplete';

// Integration utilities
export {
  ExpressionEvaluator,
  NodeParameterProcessor,
  ExecutionDataConverter,
  ExpressionValidator,
  ExpressionPerformanceMonitor,
  type NodeExecutionData,
  type ExpressionEvaluationContext,
} from './ExpressionIntegration';

// Re-export for convenience (using secure implementation)
export * from './SecureExpressionEngineV2';
export * from './ExpressionContext';
export * from './BuiltInFunctions';
export * from './autocomplete';
export * from './ExpressionIntegration';
