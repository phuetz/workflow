/**
 * Natural Language Processing Type Definitions
 * Type-safe interfaces for text-to-workflow parsing
 */

import { WorkflowNode, WorkflowEdge } from './workflow';

/**
 * Intent types recognized by the system
 */
export type IntentType =
  | 'schedule'      // Scheduled/time-based triggers
  | 'webhook'       // HTTP webhook triggers
  | 'watch'         // File/data watching triggers
  | 'manual'        // Manual execution
  | 'event'         // Event-based triggers
  | 'email'         // Email-based triggers
  | 'database';     // Database change triggers

/**
 * Action types that can be performed
 */
export type ActionType =
  | 'fetch'         // HTTP GET requests
  | 'post'          // HTTP POST requests
  | 'transform'     // Data transformation
  | 'filter'        // Data filtering
  | 'aggregate'     // Data aggregation
  | 'notify'        // Send notifications
  | 'email'         // Send email
  | 'save'          // Save to database
  | 'execute'       // Execute code
  | 'log'           // Log data
  | 'enrich'        // Enrich data from API
  | 'validate'      // Validate data
  | 'analyze'       // AI/ML analysis
  | 'summarize'     // Summarize content
  | 'forward'       // Forward to another service
  | 'store'         // Store in storage
  | 'process';      // Generic processing

/**
 * Condition operators
 */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'matches'
  | 'exists'
  | 'is_empty';

/**
 * Entity types extracted from natural language
 */
export interface Entity {
  type: 'app' | 'action' | 'schedule' | 'data' | 'condition' | 'parameter';
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  metadata?: Record<string, unknown>;
}

/**
 * Trigger intent extracted from user input
 */
export interface TriggerIntent {
  type: IntentType;
  schedule?: string;          // Cron expression or natural language
  webhookPath?: string;       // Webhook URL path
  source?: string;            // Data source (file, database, etc.)
  conditions?: ConditionIntent[];
  confidence: number;
}

/**
 * Action intent extracted from user input
 */
export interface ActionIntent {
  type: ActionType;
  service?: string;           // Service name (Slack, Email, etc.)
  operation?: string;         // Specific operation
  parameters?: Record<string, unknown>;
  target?: string;            // Target destination
  confidence: number;
  nodeType?: string;          // Mapped node type from nodeTypes.ts
}

/**
 * Condition/filter intent
 */
export interface ConditionIntent {
  field: string;
  operator: ConditionOperator;
  value: unknown;
  confidence: number;
}

/**
 * Recognized intent from natural language
 */
export interface Intent {
  type: IntentType;
  trigger?: TriggerIntent;
  actions: ActionIntent[];
  conditions?: ConditionIntent[];
  confidence: number;
  originalText: string;
  entities: Entity[];
  metadata?: {
    complexity?: 'simple' | 'medium' | 'complex';
    estimatedNodes?: number;
    suggestedName?: string;
  };
}

/**
 * Pattern matching result
 */
export interface PatternMatch {
  pattern: string;
  confidence: number;
  intent: Intent;
  matchedEntities: Entity[];
}

/**
 * Workflow generation result
 */
export interface WorkflowGenerationResult {
  success: boolean;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  intent: Intent;
  confidence: number;
  warnings?: string[];
  suggestions?: string[];
  missingParameters?: string[];
}

/**
 * Conversation message
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  intent?: Intent;
  workflowPreview?: WorkflowGenerationResult;
  clarificationNeeded?: ClarificationRequest;
}

/**
 * Clarification request when parameters are missing
 */
export interface ClarificationRequest {
  type: 'missing_parameter' | 'ambiguous_intent' | 'confirmation';
  question: string;
  field: string;
  suggestions?: string[];
  options?: Array<{ label: string; value: unknown }>;
}

/**
 * Conversation context for multi-turn dialogue
 */
export interface ConversationContext {
  id: string;
  messages: ConversationMessage[];
  currentIntent?: Intent;
  partialWorkflow?: WorkflowGenerationResult;
  clarifications: string[];
  userPreferences?: Record<string, unknown>;
  startTime: number;
  lastUpdateTime: number;
}

/**
 * Parameter inference result
 */
export interface InferredParameter {
  name: string;
  value: unknown;
  confidence: number;
  source: 'explicit' | 'inferred' | 'default';
  reasoning?: string;
}

/**
 * Common automation patterns recognized by the system
 */
export interface AutomationPattern {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  triggerType: IntentType;
  actionSequence: ActionType[];
  examples: string[];
  nodeTemplate: {
    nodes: Partial<WorkflowNode>[];
    edges: Partial<WorkflowEdge>[];
  };
  confidence: number;
}

/**
 * NLP processing options
 */
export interface NLPOptions {
  enableSpellCheck?: boolean;
  enableAutocorrect?: boolean;
  maxIntents?: number;
  minConfidence?: number;
  preferredServices?: Record<string, string>; // Map action to service
  defaultSchedule?: string;
  enableSmartDefaults?: boolean;
  conversationTimeout?: number; // milliseconds
}

/**
 * Intent recognition result
 */
export interface IntentRecognitionResult {
  intents: Intent[];
  primaryIntent: Intent | null;
  confidence: number;
  processingTime: number;
  entities: Entity[];
  suggestions?: string[];
}

/**
 * Workflow validation result
 */
export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  completeness: number; // 0-1 score
  readyForExecution: boolean;
}

/**
 * Performance metrics for NLP operations
 */
export interface NLPMetrics {
  intentRecognitionTime: number;
  workflowGenerationTime: number;
  totalProcessingTime: number;
  entitiesExtracted: number;
  confidence: number;
  conversationTurns?: number;
}

/**
 * Text-to-workflow conversion result
 */
export interface TextToWorkflowResult {
  success: boolean;
  workflow?: WorkflowGenerationResult;
  conversation?: ConversationContext;
  needsClarification: boolean;
  clarificationRequest?: ClarificationRequest;
  metrics: NLPMetrics;
  error?: string;
}
