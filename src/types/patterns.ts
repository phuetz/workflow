/**
 * Workflow Pattern Library Type Definitions
 * Comprehensive types for pattern detection, matching, and suggestions
 */

import type { WorkflowNode, WorkflowEdge } from './workflow';

/**
 * Pattern Categories
 */
export type PatternCategory =
  | 'messaging'
  | 'integration'
  | 'reliability'
  | 'data'
  | 'workflow'
  | 'architecture';

/**
 * Pattern Complexity Level
 */
export type PatternComplexity = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Pattern Definition
 */
export interface PatternDefinition {
  id: string;
  name: string;
  category: PatternCategory;
  complexity: PatternComplexity;
  description: string;
  problem: string;
  solution: string;
  benefits: string[];
  tradeoffs: string[];
  useCases: string[];
  tags: string[];
  structure: PatternStructure;
  examples: PatternExample[];
  antiPatterns: string[];
  relatedPatterns: string[];
  documentation: string;
  version: string;
}

/**
 * Pattern Structure Definition
 */
export interface PatternStructure {
  minNodes: number;
  maxNodes?: number;
  requiredNodeTypes: string[];
  optionalNodeTypes: string[];
  requiredEdges: EdgePattern[];
  topology: TopologyType;
  constraints: PatternConstraint[];
}

/**
 * Edge Pattern Definition
 */
export interface EdgePattern {
  from: string;
  to: string;
  type?: 'sequential' | 'conditional' | 'parallel' | 'error';
  required: boolean;
}

/**
 * Topology Types
 */
export type TopologyType =
  | 'linear'
  | 'branching'
  | 'loop'
  | 'dag'
  | 'tree'
  | 'star'
  | 'mesh';

/**
 * Pattern Constraint
 */
export interface PatternConstraint {
  type: 'node-count' | 'edge-count' | 'depth' | 'breadth' | 'config' | 'custom';
  description: string;
  validate: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => boolean;
}

/**
 * Pattern Example
 */
export interface PatternExample {
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata: {
    industry?: string;
    useCase: string;
    complexity: PatternComplexity;
  };
}

/**
 * Pattern Detection Result
 */
export interface PatternDetectionResult {
  pattern: PatternDefinition;
  confidence: number;
  matches: PatternMatch[];
  suggestions: string[];
  timestamp: Date;
}

/**
 * Pattern Match
 */
export interface PatternMatch {
  nodeIds: string[];
  edgeIds: string[];
  score: number;
  coverage: number;
  deviations: PatternDeviation[];
}

/**
 * Pattern Deviation
 */
export interface PatternDeviation {
  type: 'missing-node' | 'extra-node' | 'missing-edge' | 'wrong-topology' | 'config-mismatch';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion?: string;
}

/**
 * Pattern Suggestion
 */
export interface PatternSuggestion {
  pattern: PatternDefinition;
  relevance: number;
  reason: string;
  context: SuggestionContext;
  implementation: PatternImplementation;
}

/**
 * Suggestion Context
 */
export interface SuggestionContext {
  currentNodes: string[];
  currentEdges: string[];
  userIntent?: string;
  workflowGoal?: string;
  detectedIssues: string[];
}

/**
 * Pattern Implementation
 */
export interface PatternImplementation {
  steps: ImplementationStep[];
  estimatedEffort: 'low' | 'medium' | 'high';
  prerequisites: string[];
  template?: PatternTemplate;
}

/**
 * Implementation Step
 */
export interface ImplementationStep {
  order: number;
  description: string;
  action: 'add-node' | 'add-edge' | 'configure' | 'remove' | 'modify';
  details: Record<string, unknown>;
}

/**
 * Pattern Template
 */
export interface PatternTemplate {
  id: string;
  patternId: string;
  name: string;
  description: string;
  nodes: Partial<WorkflowNode>[];
  edges: Partial<WorkflowEdge>[];
  placeholders: TemplatePlaceholder[];
  configuration: Record<string, unknown>;
}

/**
 * Template Placeholder
 */
export interface TemplatePlaceholder {
  id: string;
  type: 'node' | 'config' | 'credential';
  description: string;
  required: boolean;
  defaultValue?: unknown;
}

/**
 * Anti-Pattern Definition
 */
export interface AntiPatternDefinition {
  id: string;
  name: string;
  category: PatternCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  problem: string;
  symptoms: string[];
  consequences: string[];
  refactoring: string[];
  examples: string[];
  detection: AntiPatternDetection;
  relatedPatterns: string[];
}

/**
 * Anti-Pattern Detection Rules
 */
export interface AntiPatternDetection {
  rules: DetectionRule[];
  threshold: number;
}

/**
 * Detection Rule
 */
export interface DetectionRule {
  id: string;
  description: string;
  check: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => DetectionResult;
  weight: number;
}

/**
 * Detection Result
 */
export interface DetectionResult {
  matches: boolean;
  score: number;
  evidence: string[];
  affectedNodes: string[];
}

/**
 * Anti-Pattern Detection Result
 */
export interface AntiPatternDetectionResult {
  antiPattern: AntiPatternDefinition;
  confidence: number;
  affectedNodes: string[];
  affectedEdges: string[];
  evidence: string[];
  fixes: AntiPatternFix[];
  timestamp: Date;
}

/**
 * Anti-Pattern Fix
 */
export interface AntiPatternFix {
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  steps: string[];
  automatable: boolean;
  suggestedPattern?: string;
}

/**
 * Graph Analysis Result
 */
export interface GraphAnalysisResult {
  topology: TopologyType;
  nodeCount: number;
  edgeCount: number;
  depth: number;
  breadth: number;
  complexity: number;
  hasCycles: boolean;
  connectedComponents: string[][];
  criticalPaths: string[][];
  metrics: GraphMetrics;
}

/**
 * Graph Metrics
 */
export interface GraphMetrics {
  cyclomaticComplexity: number;
  fanIn: Record<string, number>;
  fanOut: Record<string, number>;
  density: number;
  modularity: number;
  clustering: number;
}

/**
 * Pattern Library Configuration
 */
export interface PatternLibraryConfig {
  enableAIDetection: boolean;
  detectionThreshold: number;
  suggestionThreshold: number;
  maxSuggestions: number;
  enableAntiPatternDetection: boolean;
  antiPatternThreshold: number;
  autoFix: boolean;
}

/**
 * Pattern Search Filter
 */
export interface PatternSearchFilter {
  categories?: PatternCategory[];
  complexity?: PatternComplexity[];
  tags?: string[];
  searchTerm?: string;
}

/**
 * Pattern Library State
 */
export interface PatternLibraryState {
  patterns: PatternDefinition[];
  antiPatterns: AntiPatternDefinition[];
  detectedPatterns: PatternDetectionResult[];
  detectedAntiPatterns: AntiPatternDetectionResult[];
  suggestions: PatternSuggestion[];
  config: PatternLibraryConfig;
}
