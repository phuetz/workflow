/**
 * Conversation types for the ConversationEngine
 */

import { WorkflowNode, WorkflowEdge } from '../types/workflow';

export type IntentType =
  | 'modify_workflow'
  | 'add_node'
  | 'remove_node'
  | 'configure_node'
  | 'connect_nodes'
  | 'optimize_workflow'
  | 'debug_workflow'
  | 'explain_workflow'
  | 'undo_change'
  | 'apply_suggestion'
  | 'ask_question'
  | 'unknown';

export type ChangeType =
  | 'add_node'
  | 'remove_node'
  | 'update_node'
  | 'add_edge'
  | 'remove_edge'
  | 'optimize_flow';

export interface Intent {
  type: IntentType;
  confidence: number;
  raw: string;
  entities: {
    nodeTypes?: string[];
    nodeIds?: string[];
    parameters?: Record<string, unknown>;
    action?: string;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface WorkflowChange {
  id: string;
  type: ChangeType;
  timestamp: Date;
  description: string;
  impact: {
    nodes: string[];
    edges: string[];
    estimatedImprovement?: {
      speed?: string;
      reliability?: string;
      cost?: string;
    };
  };
  operation: {
    action: string;
    target?: string;
    data?: Record<string, unknown>;
    before?: Record<string, unknown>;
  };
  reversible: boolean;
  confidence: number;
}

export interface ConversationContext {
  sessionId: string;
  workflowId: string;
  history: Message[];
  pendingChanges: WorkflowChange[];
  appliedChanges: WorkflowChange[];
  userIntent: Intent | null;
  currentNodes: WorkflowNode[];
  currentEdges: WorkflowEdge[];
  startTime: Date;
}

export interface ConversationResponse {
  message: string;
  changes?: WorkflowChange[];
  needsConfirmation: boolean;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface WorkflowUpdateResult {
  success: boolean;
  changes: WorkflowChange[];
  newNodes: WorkflowNode[];
  newEdges: WorkflowEdge[];
  errors?: string[];
  summary: string;
}
