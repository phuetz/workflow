/**
 * AI Recommendations Module
 *
 * Barrel export for all recommendation-related components.
 *
 * @module recommendations
 */

// Export all types
export {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowSettings,
  Recommendation,
  SuggestedChange,
  OptimizationAnalysis,
  RecommendationType,
  RecommendationPriority,
  EffortLevel,
  RecommendationImpact,
  DuplicateNodeInfo,
  NodeReplacementInfo,
  NodeReplacementMap,
  WorkflowExecutionData,
} from './types';

// Export components
export { DataAnalyzer } from './DataAnalyzer';
export { PriorityRanker } from './PriorityRanker';
export { RecommendationEngine } from './RecommendationEngine';
export { RecommendationFormatter } from './RecommendationFormatter';
