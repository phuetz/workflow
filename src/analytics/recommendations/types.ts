/**
 * Types and Interfaces for AI Recommendations Engine
 *
 * @module recommendations/types
 */

import { WorkflowExecutionData } from '../MLModels';

// ============================================================================
// Workflow Types
// ============================================================================

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings?: WorkflowSettings;
}

export interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, any>;
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowSettings {
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    backoff: 'linear' | 'exponential';
  };
  errorHandling?: 'continue' | 'stop';
  parallelism?: number;
}

// ============================================================================
// Recommendation Types
// ============================================================================

export type RecommendationType =
  | 'optimization'
  | 'replacement'
  | 'alternative'
  | 'cost'
  | 'performance'
  | 'security'
  | 'best_practice';

export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';

export type EffortLevel = 'low' | 'medium' | 'high';

export interface RecommendationImpact {
  performance?: number; // Percentage improvement
  cost?: number; // Percentage savings
  reliability?: number; // Percentage improvement
  security?: number; // 0-10 security score improvement
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  impact: RecommendationImpact;
  effort: EffortLevel;
  confidence: number; // 0-1
  suggestedChanges: SuggestedChange[];
  reasoning: string;
  references?: string[];
}

export interface SuggestedChange {
  action: 'add' | 'remove' | 'modify' | 'replace';
  target: {
    type: 'node' | 'edge' | 'setting' | 'workflow';
    id?: string;
  };
  details: string;
  before?: any;
  after?: any;
}

// ============================================================================
// Analysis Types
// ============================================================================

export interface OptimizationAnalysis {
  workflow: Workflow;
  executionData?: WorkflowExecutionData[];
  recommendations: Recommendation[];
  score: {
    current: number; // 0-100
    potential: number; // 0-100
    improvement: number; // Percentage
  };
  summary: string;
}

export interface DuplicateNodeInfo {
  id: string;
  node: WorkflowNode;
  mergeWith: string;
}

export interface NodeReplacementInfo {
  type: string;
  reason: string;
  impact: RecommendationImpact;
}

export type NodeReplacementMap = Record<string, NodeReplacementInfo>;

// Re-export WorkflowExecutionData for convenience
export type { WorkflowExecutionData };
