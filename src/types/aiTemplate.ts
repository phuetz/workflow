/**
 * AI Template Generator Types
 * Advanced AI-powered template generation with NLP and conversational customization
 */

import type { WorkflowNode, WorkflowEdge } from './workflow';
import type { TemplateCategory, TemplateDocumentation, WorkflowTemplate } from './templates';

// ==================== Template Generation ====================

export interface GeneratedTemplate {
  name: string;
  description: string;
  category: TemplateCategory;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  documentation: TemplateDocumentation;
  version: string;
  tags: string[];
  qualityScore: number; // 0-100
  metadata: TemplateMetadata;
}

export interface TemplateMetadata {
  generatedAt: Date;
  generationMethod: 'ai' | 'manual' | 'imported';
  promptUsed?: string;
  contextUsed?: TemplateContext;
  iterationsCount: number;
  confidenceScore: number; // 0-1
  usedPatterns: string[];
}

export interface TemplateContext {
  industry?: string;
  useCase?: string;
  connectedApps?: string[];
  userSkillLevel?: 'beginner' | 'intermediate' | 'advanced';
  existingWorkflows?: string[];
  teamPreferences?: Record<string, unknown>;
  constraints?: {
    maxNodes?: number;
    requiredIntegrations?: string[];
    forbiddenIntegrations?: string[];
    performanceRequirements?: string[];
  };
}

export interface TemplateIntent {
  primaryGoal: string;
  trigger: {
    type: string;
    event?: string;
    schedule?: string;
  };
  actions: TemplateAction[];
  dataFlow: DataFlowRequirement[];
  errorHandling: ErrorHandlingRequirement;
  conditions: ConditionRequirement[];
  integrations: IntegrationRequirement[];
}

export interface TemplateAction {
  type: 'api_call' | 'transformation' | 'notification' | 'storage' | 'custom';
  service?: string;
  operation: string;
  inputs: string[];
  outputs: string[];
  optional: boolean;
}

export interface DataFlowRequirement {
  from: string;
  to: string;
  transformation?: string;
  validation?: string;
}

export interface ErrorHandlingRequirement {
  strategy: 'retry' | 'fallback' | 'notify' | 'ignore';
  retryCount?: number;
  fallbackAction?: string;
  notificationChannel?: string;
}

export interface ConditionRequirement {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
  value: unknown;
  thenAction: string;
  elseAction?: string;
}

export interface IntegrationRequirement {
  service: string;
  operations: string[];
  required: boolean;
  alternatives?: string[];
}

// ==================== Template Patterns ====================

export interface TemplatePattern {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  keywords: string[];
  structure: PatternStructure;
  applicability: PatternApplicability;
  examples: string[];
  qualityIndicators: string[];
}

export interface PatternStructure {
  minNodes: number;
  maxNodes: number;
  requiredNodeTypes: string[];
  optionalNodeTypes: string[];
  typicalFlow: string[];
  commonTransformations: string[];
}

export interface PatternApplicability {
  industries: string[];
  useCases: string[];
  integrations: string[];
  skillLevel: ('beginner' | 'intermediate' | 'advanced')[];
}

// ==================== Conversational Customization ====================

export interface CustomizationSession {
  id: string;
  templateId: string;
  template: GeneratedTemplate;
  conversation: ConversationMessage[];
  pendingQuestions: CustomizationQuestion[];
  completedAnswers: Record<string, unknown>;
  status: 'active' | 'completed' | 'abandoned';
  startedAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    suggestedNodes?: string[];
    modifiedFields?: string[];
    validationResults?: ValidationResult[];
  };
}

export interface CustomizationQuestion {
  id: string;
  type: 'text' | 'select' | 'multiselect' | 'credential' | 'confirm';
  question: string;
  context: string;
  field: string;
  nodeId?: string;
  options?: Array<{ label: string; value: unknown; description?: string }>;
  required: boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    custom?: string;
  };
  defaultValue?: unknown;
  priority: number; // 1-10, higher = more important
}

export interface ValidationResult {
  field: string;
  valid: boolean;
  message?: string;
  suggestion?: string;
}

// ==================== Template Suggestions ====================

export interface TemplateSuggestion {
  template: GeneratedTemplate | WorkflowTemplate;
  relevanceScore: number; // 0-100
  reason: SuggestionReason;
  context: SuggestionContext;
  estimatedSetupTime: number; // minutes
  expectedBenefit: string;
  similarTemplatesUsed?: number;
}

export interface SuggestionReason {
  primary: string;
  factors: SuggestionFactor[];
  matchedPatterns: string[];
}

export interface SuggestionFactor {
  type: 'connected_apps' | 'user_behavior' | 'industry' | 'use_case' | 'team_preference' | 'similar_users';
  weight: number; // 0-1
  description: string;
  confidence: number; // 0-1
}

export interface SuggestionContext {
  userProfile: UserProfile;
  recentActivity: ActivityData[];
  connectedIntegrations: string[];
  teamUsage?: TeamUsageData;
}

export interface UserProfile {
  id: string;
  industry?: string;
  role?: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredIntegrations: string[];
  workflowCategories: TemplateCategory[];
  usagePatterns: UsagePattern[];
}

export interface ActivityData {
  type: 'workflow_created' | 'template_used' | 'integration_connected' | 'node_added';
  timestamp: Date;
  details: Record<string, unknown>;
  category?: TemplateCategory;
}

export interface TeamUsageData {
  teamId: string;
  popularTemplates: string[];
  commonIntegrations: string[];
  averageComplexity: number;
  preferredCategories: TemplateCategory[];
}

export interface UsagePattern {
  pattern: string;
  frequency: number;
  lastUsed: Date;
  category?: TemplateCategory;
}

// ==================== Template Evolution ====================

export interface TemplateEvolutionData {
  templateId: string;
  version: string;
  usageMetrics: TemplateUsageMetrics;
  feedbackData: TemplateFeedback[];
  performanceMetrics: TemplatePerformanceMetrics;
  improvementSuggestions: ImprovementSuggestion[];
  evolutionHistory: EvolutionEntry[];
}

export interface TemplateUsageMetrics {
  totalInstalls: number;
  activeUsers: number;
  successRate: number; // 0-1
  completionRate: number; // 0-1
  averageSetupTime: number; // minutes
  averageExecutionTime: number; // ms
  errorRate: number; // 0-1
  retentionRate: number; // 0-1
  popularityTrend: 'rising' | 'stable' | 'declining';
}

export interface TemplateFeedback {
  id: string;
  userId: string;
  rating: number; // 1-5
  comment?: string;
  category: 'ease_of_use' | 'documentation' | 'reliability' | 'performance' | 'features';
  timestamp: Date;
  helpful: boolean;
  issuesReported?: string[];
}

export interface TemplatePerformanceMetrics {
  avgExecutionTime: number;
  p95ExecutionTime: number;
  errorRate: number;
  timeoutRate: number;
  resourceUsage: {
    memory: number;
    cpu: number;
    apiCalls: number;
  };
  bottlenecks: PerformanceBottleneck[];
}

export interface PerformanceBottleneck {
  nodeId: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

export interface ImprovementSuggestion {
  id: string;
  type: 'performance' | 'usability' | 'reliability' | 'features';
  priority: number; // 1-10
  description: string;
  expectedImpact: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  autoImplementable: boolean;
  votes: number;
  source: 'ai' | 'user_feedback' | 'analytics' | 'community';
}

export interface EvolutionEntry {
  version: string;
  timestamp: Date;
  changes: TemplateChange[];
  improvementsApplied: string[];
  qualityScoreDelta: number;
  usageImpact: {
    installsDelta: number;
    satisfactionDelta: number;
    performanceDelta: number;
  };
}

export interface TemplateChange {
  type: 'node_added' | 'node_removed' | 'node_modified' | 'edge_added' | 'edge_removed' | 'config_changed';
  target: string;
  before?: unknown;
  after?: unknown;
  reason: string;
}

// ==================== Quality Scoring ====================

export interface QualityScoreComponents {
  completeness: number; // 0-100
  documentation: number; // 0-100
  nodeSelection: number; // 0-100
  errorHandling: number; // 0-100
  performance: number; // 0-100
  usability: number; // 0-100
  maintainability: number; // 0-100
}

export interface QualityCriteria {
  hasDescription: boolean;
  hasDocumentation: boolean;
  hasErrorHandling: boolean;
  hasValidation: boolean;
  hasProperNaming: boolean;
  hasExamples: boolean;
  optimizedDataFlow: boolean;
  followsBestPractices: boolean;
  hasTestCases?: boolean;
}

// ==================== A/B Testing ====================

export interface TemplateABTest {
  id: string;
  name: string;
  templateId: string;
  variantA: GeneratedTemplate;
  variantB: GeneratedTemplate;
  hypothesis: string;
  metrics: ABTestMetrics;
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  trafficSplit: number; // 0-1 (e.g., 0.5 = 50/50)
  minSampleSize: number;
  confidenceLevel: number; // e.g., 0.95 for 95%
  results?: ABTestResults;
}

export interface ABTestMetrics {
  primary: MetricDefinition;
  secondary: MetricDefinition[];
}

export interface MetricDefinition {
  name: string;
  type: 'success_rate' | 'completion_time' | 'error_rate' | 'user_rating' | 'custom';
  targetValue?: number;
  improvementThreshold: number; // minimum % improvement to declare winner
}

export interface ABTestResults {
  variantAStats: VariantStats;
  variantBStats: VariantStats;
  winner?: 'A' | 'B' | 'inconclusive';
  confidence: number; // 0-1
  significantDifference: boolean;
  recommendations: string[];
}

export interface VariantStats {
  impressions: number;
  installations: number;
  completions: number;
  averageRating: number;
  averageSetupTime: number;
  errorRate: number;
  metricValues: Record<string, number>;
}

// ==================== Template Library ====================

export interface TemplateLibrary {
  patterns: TemplatePattern[];
  nodeCompatibility: NodeCompatibilityMatrix;
  integrationCatalog: IntegrationCatalog;
  bestPractices: BestPractice[];
}

export interface NodeCompatibilityMatrix {
  [nodeType: string]: {
    compatibleWith: string[];
    incompatibleWith: string[];
    recommendedFollowers: string[];
    commonPredecessors: string[];
  };
}

export interface IntegrationCatalog {
  [service: string]: {
    name: string;
    category: string;
    operations: IntegrationOperation[];
    authentication: string[];
    rateLimit?: number;
    popularity: number;
    alternatives: string[];
  };
}

export interface IntegrationOperation {
  id: string;
  name: string;
  description: string;
  inputs: ParameterDefinition[];
  outputs: ParameterDefinition[];
  examples: OperationExample[];
}

export interface ParameterDefinition {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: unknown;
  validation?: Record<string, unknown>;
}

export interface OperationExample {
  description: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

export interface BestPractice {
  id: string;
  category: TemplateCategory;
  title: string;
  description: string;
  applies_to: string[];
  examples: string[];
  impact: 'low' | 'medium' | 'high';
}

// ==================== NLP Processing ====================

export interface NLPAnalysis {
  intent: string;
  entities: ExtractedEntity[];
  keywords: string[];
  sentiment: number; // -1 to 1
  confidence: number; // 0-1
  suggestedCategory: TemplateCategory;
  detectedPatterns: string[];
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface ExtractedEntity {
  type: 'service' | 'action' | 'trigger' | 'data_type' | 'condition';
  value: string;
  confidence: number;
  position: [number, number];
  metadata?: Record<string, unknown>;
}

// ==================== Service Interfaces ====================

export interface AITemplateGeneratorService {
  generateTemplate(description: string, context?: TemplateContext): Promise<GeneratedTemplate>;
  refineTemplate(template: GeneratedTemplate, feedback: string): Promise<GeneratedTemplate>;
  validateTemplate(template: GeneratedTemplate): Promise<ValidationResult[]>;
  calculateQualityScore(template: GeneratedTemplate): number;
}

export interface TemplateCustomizerService {
  startCustomization(template: GeneratedTemplate): CustomizationSession;
  askQuestion(sessionId: string, userResponse: string): Promise<CustomizationQuestion | null>;
  applyCustomization(sessionId: string, updates: Record<string, unknown>): Promise<GeneratedTemplate>;
  getProgress(sessionId: string): number; // 0-100
}

export interface TemplateSuggesterService {
  getSuggestions(context: SuggestionContext, limit?: number): Promise<TemplateSuggestion[]>;
  recordUsage(templateId: string, userId: string, success: boolean): Promise<void>;
  updateUserProfile(userId: string, activity: ActivityData): Promise<void>;
}

export interface TemplateEvolutionService {
  trackUsage(templateId: string, metrics: Partial<TemplateUsageMetrics>): Promise<void>;
  submitFeedback(templateId: string, feedback: TemplateFeedback): Promise<void>;
  analyzePerformance(templateId: string): Promise<TemplatePerformanceMetrics>;
  generateImprovements(templateId: string): Promise<ImprovementSuggestion[]>;
  applyImprovement(templateId: string, suggestionId: string): Promise<GeneratedTemplate>;
  runABTest(test: TemplateABTest): Promise<string>;
  getABTestResults(testId: string): Promise<ABTestResults>;
}
