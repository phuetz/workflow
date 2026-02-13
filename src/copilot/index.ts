/**
 * AI Workflow Copilot Module
 * Natural language workflow builder with AI-powered suggestions
 */

export {
  AICopilot,
  createAICopilot,
  type WorkflowNode,
  type WorkflowEdge,
  type GeneratedWorkflow,
  type CopilotMessage,
  type NodeRecommendation,
  type Suggestion,
  type CopilotConfig,
  type IntentClassification
} from './AICopilot';

// Re-export other copilot modules
export { workflowGenerator, WorkflowGenerator } from './WorkflowGenerator';
export { workflowOptimizer, WorkflowOptimizer } from './WorkflowOptimizer';
export { intentClassifier, IntentClassifier } from './IntentClassifier';
export { parameterExtractor, ParameterExtractor } from './ParameterExtractor';
export { conversationalWorkflowBuilder, ConversationalWorkflowBuilder } from './ConversationalWorkflowBuilder';
export { templateSelector, TemplateSelector } from './TemplateSelector';
export { copilotMemory, CopilotMemoryManager } from './CopilotMemory';
export { agentCustomizer, AgentCustomizer } from './AgentCustomizer';

// Export types
export type {
  IntentType,
  IntentClassification as IntentClassificationResult,
  ConversationTurn,
  ExtractedParameter,
  WorkflowSuggestion,
  ClarificationQuestion,
  WorkflowTemplate,
  CopilotMemory as CopilotMemoryType,
  UserPreferences,
  ConversationHistory,
  LearnedPattern,
  AgentSkill,
  AgentConfiguration,
  OptimizationRecommendation,
  WorkflowGenerationRequest,
  WorkflowGenerationResult,
  TemplateMatchResult,
  ParameterExtractionConfig,
  CopilotMetrics,
  CopilotSession,
  CopilotConfig as CopilotConfigType
} from './types/copilot';
