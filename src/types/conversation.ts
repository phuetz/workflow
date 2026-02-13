/**
 * Conversation Types for Conversational Workflow Editor
 * Agent 53 - Natural Language Workflow Modification
 */

import { WorkflowNode, WorkflowEdge } from './workflow';

/**
 * Message types in conversation
 */
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageType = 'text' | 'code' | 'suggestion' | 'explanation' | 'error' | 'success';

/**
 * Conversation message
 */
export interface ConversationMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  timestamp: number;
  metadata?: {
    nodeId?: string;
    action?: string;
    confidence?: number;
    suggestions?: string[];
    codeSnippet?: string;
    dataPreview?: Record<string, unknown>;
  };
}

/**
 * Intent types for conversation parsing
 */
export type ConversationIntent =
  | 'modify_workflow'
  | 'add_node'
  | 'remove_node'
  | 'configure_node'
  | 'connect_nodes'
  | 'optimize_workflow'
  | 'debug_issue'
  | 'explain_workflow'
  | 'explain_node'
  | 'suggest_improvement'
  | 'validate_workflow'
  | 'run_workflow'
  | 'ask_question'
  | 'undo_action'
  | 'unknown';

/**
 * Parsed user intent from conversation
 */
export interface ParsedIntent {
  intent: ConversationIntent;
  confidence: number;
  entities: {
    nodeType?: string;
    nodeId?: string;
    action?: string;
    parameters?: Record<string, unknown>;
    condition?: string;
    sourceNode?: string;
    targetNode?: string;
  };
  originalMessage: string;
  suggestedActions?: string[];
}

/**
 * Workflow modification request
 */
export interface ModificationRequest {
  type: 'add' | 'remove' | 'update' | 'connect' | 'disconnect' | 'optimize';
  target?: string; // node ID or edge ID
  params?: {
    nodeType?: string;
    position?: { x: number; y: number };
    config?: Record<string, unknown>;
    label?: string;
    sourceNode?: string;
    targetNode?: string;
    sourceHandle?: string;
    targetHandle?: string;
  };
  reason?: string;
}

/**
 * Modification result
 */
export interface ModificationResult {
  success: boolean;
  message: string;
  changes: {
    nodesAdded?: WorkflowNode[];
    nodesRemoved?: string[];
    nodesUpdated?: Array<{ id: string; changes: Partial<WorkflowNode> }>;
    edgesAdded?: WorkflowEdge[];
    edgesRemoved?: string[];
  };
  suggestions?: string[];
  undoable: boolean;
}

/**
 * Workflow explanation
 */
export interface WorkflowExplanation {
  summary: string;
  nodeExplanations: Array<{
    nodeId: string;
    nodeType: string;
    label: string;
    purpose: string;
    inputs: string[];
    outputs: string[];
    configuration: string;
  }>;
  dataFlow: Array<{
    from: string;
    to: string;
    description: string;
  }>;
  potentialIssues: string[];
  suggestions: string[];
}

/**
 * Node explanation
 */
export interface NodeExplanation {
  nodeId: string;
  nodeType: string;
  label: string;
  purpose: string;
  howItWorks: string;
  inputData: string;
  outputData: string;
  configuration: Record<string, string>;
  commonIssues: string[];
  bestPractices: string[];
  exampleUseCase: string;
}

/**
 * Debug analysis
 */
export interface DebugAnalysis {
  nodeId: string;
  nodeType: string;
  label: string;
  status: 'success' | 'error' | 'warning';
  issue?: string;
  rootCause?: string;
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  errorDetails?: {
    message: string;
    stack?: string;
    code?: string;
  };
  dataTrace: Array<{
    nodeId: string;
    label: string;
    data: Record<string, unknown>;
  }>;
  suggestedFixes: Array<{
    description: string;
    action: ModificationRequest;
    confidence: number;
  }>;
}

/**
 * Workflow improvement suggestion
 */
export interface ImprovementSuggestion {
  category: 'performance' | 'reliability' | 'maintainability' | 'cost' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  currentIssue: string;
  proposedSolution: string;
  benefits: string[];
  effort: 'low' | 'medium' | 'high';
  autoApplicable: boolean;
  modifications?: ModificationRequest[];
}

/**
 * Pattern detection result
 */
export interface DetectedPattern {
  patternId: string;
  name: string;
  description: string;
  nodes: string[];
  confidence: number;
  suggestedOptimizations?: string[];
}

/**
 * Conversation context
 */
export interface ConversationContext {
  messages: ConversationMessage[];
  currentWorkflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    name?: string;
    id?: string;
  };
  selectedNode?: string;
  executionResults?: Record<string, unknown>;
  recentChanges: ModificationResult[];
  userPreferences?: {
    verbosity: 'concise' | 'detailed' | 'verbose';
    autoApply: boolean;
    confirmActions: boolean;
  };
}

/**
 * Assistant response
 */
export interface AssistantResponse {
  message: string;
  type: 'text' | 'action' | 'question' | 'suggestion';
  actions?: ModificationRequest[];
  requiresConfirmation?: boolean;
  suggestions?: string[];
  explanation?: string;
  codePreview?: string;
  confidence: number;
}

/**
 * Conversation session
 */
export interface ConversationSession {
  id: string;
  workflowId?: string;
  startTime: number;
  lastActivity: number;
  context: ConversationContext;
  active: boolean;
}

/**
 * NLP Analysis result
 */
export interface NLPAnalysis {
  tokens: string[];
  entities: Array<{
    text: string;
    type: 'node_type' | 'action' | 'condition' | 'parameter' | 'value';
    value: string;
  }>;
  sentiment: 'positive' | 'neutral' | 'negative';
  intent: ParsedIntent;
}

/**
 * Data flow trace
 */
export interface DataFlowTrace {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  transformations: string[];
  timestamp: number;
  executionTime: number;
}

/**
 * Bottleneck detection
 */
export interface BottleneckDetection {
  nodeId: string;
  nodeLabel: string;
  issue: 'slow_execution' | 'high_memory' | 'rate_limit' | 'error_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metrics: {
    averageExecutionTime?: number;
    memoryUsage?: number;
    errorRate?: number;
    requestsPerSecond?: number;
  };
  recommendations: string[];
}

/**
 * Optimization strategy
 */
export interface OptimizationStrategy {
  name: string;
  description: string;
  applicableNodes: string[];
  expectedImprovement: {
    speed?: number; // percentage
    cost?: number; // percentage
    reliability?: number; // percentage
  };
  modifications: ModificationRequest[];
  risks: string[];
  prerequisites: string[];
}
