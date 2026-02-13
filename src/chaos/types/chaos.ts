/**
 * Chaos Engineering Platform - Type Definitions
 *
 * Comprehensive type system for chaos experiments, GameDays,
 * blast radius controls, and CI/CD integration.
 */

import type { WorkflowNode } from '../../types/workflow';

/**
 * Experiment categories
 */
export type ExperimentCategory = 'network' | 'compute' | 'state' | 'application';

/**
 * Experiment severity levels
 */
export type ExperimentSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Experiment execution status
 */
export type ExperimentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back' | 'aborted';

/**
 * Blast radius scope levels
 */
export type BlastRadiusScope = 'node' | 'workflow' | 'service' | 'global';

/**
 * Rollout strategy for gradual chaos introduction
 */
export type RolloutStrategy = 'immediate' | 'canary' | 'gradual' | 'blue_green';

/**
 * GameDay phase
 */
export type GameDayPhase = 'planning' | 'pre_game' | 'game' | 'post_game' | 'completed' | 'cancelled';

/**
 * GameDay role
 */
export type GameDayRole = 'incident_commander' | 'chaos_engineer' | 'observer' | 'participant';

/**
 * Resilience metric types
 */
export type ResilienceMetric = 'mtbf' | 'mttr' | 'error_budget' | 'resilience_score';

/**
 * Hypothesis steady state definition
 */
export interface SteadyStateHypothesis {
  description: string;
  metrics: {
    name: string;
    unit: string;
    baseline: number;
    tolerance: number; // Percentage deviation allowed
  }[];
  duration: number; // ms to observe before experiment
}

/**
 * Turbulent conditions definition
 */
export interface TurbulentConditions {
  description: string;
  faults: FaultDefinition[];
  duration: number; // ms
  rampUpTime?: number; // ms
}

/**
 * Expected outcome definition
 */
export interface ExpectedOutcome {
  description: string;
  assertions: {
    metric: string;
    operator: 'equals' | 'less_than' | 'greater_than' | 'within_range';
    value: number | [number, number];
    message?: string;
  }[];
  acceptableRecoveryTime?: number; // ms
}

/**
 * Fault definition
 */
export interface FaultDefinition {
  id: string;
  type: string; // Specific fault type (e.g., 'latency', 'packet_loss')
  parameters: Record<string, any>;
  targetScope: {
    nodeIds?: string[];
    workflowIds?: string[];
    services?: string[];
  };
}

/**
 * Blast radius configuration
 */
export interface BlastRadiusConfig {
  scope: BlastRadiusScope;
  percentage: number; // 0-100: percentage of targets to affect
  maxImpact: number; // Maximum number of targets
  excludeList?: string[]; // IDs to exclude from chaos
  includeList?: string[]; // IDs to explicitly include
  rolloutStrategy: RolloutStrategy;
  rolloutSteps?: number[]; // Percentages for gradual rollout (e.g., [1, 5, 10, 50])
}

/**
 * Safety controls
 */
export interface SafetyControls {
  enableEmergencyStop: boolean;
  autoRollbackOnSLAViolation: boolean;
  maxDuration: number; // ms - automatic stop after this time
  healthCheckInterval: number; // ms
  requiredApprovals?: number;
  approvers?: string[];
  preFlightChecks: PreFlightCheck[];
}

/**
 * Pre-flight safety check
 */
export interface PreFlightCheck {
  id: string;
  name: string;
  description: string;
  check: () => Promise<PreFlightCheckResult>;
  required: boolean;
}

/**
 * Pre-flight check result
 */
export interface PreFlightCheckResult {
  passed: boolean;
  message: string;
  details?: Record<string, any>;
}

/**
 * Core chaos experiment interface
 */
export interface ChaosExperiment {
  id: string;
  name: string;
  description: string;
  category: ExperimentCategory;
  severity: ExperimentSeverity;
  version: string;

  // Hypothesis-driven testing
  hypothesis: {
    steadyState: SteadyStateHypothesis;
    turbulentConditions: TurbulentConditions;
    expectedOutcome: ExpectedOutcome;
  };

  // Blast radius and safety
  blastRadius: BlastRadiusConfig;
  safetyControls: SafetyControls;

  // Metadata
  tags: string[];
  author?: string;
  createdAt: Date;
  updatedAt: Date;
  enabled: boolean;

  // Execution
  execute(context: ExperimentContext): Promise<ExperimentResult>;
  rollback(): Promise<void>;
}

/**
 * Experiment context
 */
export interface ExperimentContext {
  experimentId: string;
  workflowId?: string;
  targets: ExperimentTarget[];
  environment: 'development' | 'staging' | 'production';
  dryRun: boolean;
  monitoring: MonitoringConfig;
  metadata?: Record<string, any>;
}

/**
 * Experiment target
 */
export interface ExperimentTarget {
  id: string;
  type: 'node' | 'workflow' | 'service';
  name: string;
  metadata?: Record<string, any>;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean;
  metricsCollectionInterval: number; // ms
  traceEnabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  alertOnAnomalies: boolean;
}

/**
 * Experiment execution result
 */
export interface ExperimentResult {
  experimentId: string;
  experimentName: string;
  status: ExperimentStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number; // ms

  // Hypothesis validation
  steadyStateObserved: boolean;
  steadyStateMetrics: MetricObservation[];
  hypothesisValidated: boolean;

  // Execution details
  faultsInjected: FaultInjectionResult[];
  targetsAffected: number;

  // Outcomes
  systemRecovered: boolean;
  recoveryTime?: number; // ms
  slaViolations: SLAViolation[];

  // Insights
  observations: Observation[];
  recommendations: Recommendation[];

  // Metrics
  resilience: ResilienceMetrics;

  error?: Error;
}

/**
 * Metric observation
 */
export interface MetricObservation {
  metric: string;
  baseline: number;
  observed: number;
  deviation: number; // Percentage
  withinTolerance: boolean;
  timestamp: Date;
}

/**
 * Fault injection result
 */
export interface FaultInjectionResult {
  faultId: string;
  faultType: string;
  targetId: string;
  injectedAt: Date;
  removedAt?: Date;
  duration?: number; // ms
  successful: boolean;
  impact: 'none' | 'minor' | 'moderate' | 'major' | 'critical';
  error?: Error;
}

/**
 * SLA violation during experiment
 */
export interface SLAViolation {
  slaType: string;
  threshold: number;
  actual: number;
  startTime: Date;
  endTime?: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Observation during experiment
 */
export interface Observation {
  timestamp: Date;
  type: 'success' | 'warning' | 'error' | 'info';
  category: 'behavior' | 'performance' | 'recovery' | 'cascading' | 'other';
  message: string;
  details?: Record<string, any>;
}

/**
 * Recommendation from experiment
 */
export interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'resilience' | 'performance' | 'monitoring' | 'architecture';
  title: string;
  description: string;
  actionable: string; // Specific action to take
  estimatedImpact: string;
}

/**
 * Resilience metrics
 */
export interface ResilienceMetrics {
  mtbf: number; // Mean Time Between Failures (ms)
  mttr: number; // Mean Time To Recovery (ms)
  errorBudget: number; // Remaining error budget (0-100%)
  resilienceScore: number; // Overall score (0-100)
  availability: number; // Percentage
  recoveryRate: number; // Percentage of successful recoveries
}

/**
 * AI experiment suggestion
 */
export interface ExperimentSuggestion {
  id: string;
  experimentType: string;
  category: ExperimentCategory;
  severity: ExperimentSeverity;

  // AI-generated
  confidence: number; // 0-1
  reasoning: string;

  // Targeting
  suggestedTargets: ExperimentTarget[];

  // Risk assessment
  risk: {
    likelihood: number; // 0-1
    impact: number; // 0-1
    score: number; // likelihood × impact
    factors: string[];
  };

  // Proposed configuration
  proposedConfig: Partial<ChaosExperiment>;

  // Evidence
  evidence: {
    historicalFailures: number;
    similarWorkflows: number;
    complexityScore: number;
    dependencyCount: number;
  };

  // Metadata
  generatedAt: Date;
  priority: number; // 1-10
}

/**
 * GameDay configuration
 */
export interface GameDay {
  id: string;
  name: string;
  description: string;
  phase: GameDayPhase;

  // Scheduling
  scheduledAt: Date;
  startTime?: Date;
  endTime?: Date;
  duration: number; // Planned duration in ms

  // Team
  team: GameDayParticipant[];

  // Objectives
  objectives: string[];
  successCriteria: GameDaySuccessCriterion[];

  // Experiments
  experiments: GameDayExperiment[];

  // Phases
  preGame: GameDayPreGame;
  game: GameDayGame;
  postGame: GameDayPostGame;

  // Results
  results?: GameDayResults;

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GameDay participant
 */
export interface GameDayParticipant {
  userId: string;
  name: string;
  email: string;
  role: GameDayRole;
  joinedAt?: Date;
  activelyParticipating: boolean;
}

/**
 * GameDay success criterion
 */
export interface GameDaySuccessCriterion {
  id: string;
  description: string;
  metric: string;
  target: number;
  achieved?: boolean;
  actualValue?: number;
}

/**
 * GameDay experiment
 */
export interface GameDayExperiment {
  experimentId: string;
  scheduledTime: number; // Offset from game start in ms
  executed: boolean;
  executedAt?: Date;
  result?: ExperimentResult;
  notes?: string;
}

/**
 * GameDay pre-game phase
 */
export interface GameDayPreGame {
  briefingCompleted: boolean;
  briefingNotes?: string;
  baselineMetrics: Record<string, number>;
  systemHealthChecks: PreFlightCheckResult[];
  teamReady: boolean;
}

/**
 * GameDay game phase
 */
export interface GameDayGame {
  started: boolean;
  currentExperiment?: string;
  timeline: GameDayTimelineEvent[];
  observations: Observation[];
  incidents: GameDayIncident[];
}

/**
 * GameDay timeline event
 */
export interface GameDayTimelineEvent {
  timestamp: Date;
  type: 'experiment_start' | 'experiment_end' | 'observation' | 'incident' | 'action' | 'note';
  description: string;
  actor?: string;
  metadata?: Record<string, any>;
}

/**
 * GameDay incident
 */
export interface GameDayIncident {
  id: string;
  timestamp: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  relatedExperiment?: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: string;
}

/**
 * GameDay post-game phase
 */
export interface GameDayPostGame {
  debriefingCompleted: boolean;
  debriefingNotes?: string;
  lessonsLearned: LessonLearned[];
  actionItems: ActionItem[];
  reportGenerated: boolean;
  reportUrl?: string;
}

/**
 * Lesson learned
 */
export interface LessonLearned {
  id: string;
  category: 'resilience' | 'process' | 'tooling' | 'communication' | 'other';
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
}

/**
 * Action item
 */
export interface ActionItem {
  id: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee?: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completedAt?: Date;
}

/**
 * GameDay results
 */
export interface GameDayResults {
  successCriteriaAchieved: number; // Count
  totalExperiments: number;
  successfulExperiments: number;
  failedExperiments: number;
  totalIncidents: number;
  criticalIncidents: number;
  averageRecoveryTime: number; // ms
  resilienceImprovement: number; // Percentage
  participantFeedback: ParticipantFeedback[];
  overallScore: number; // 0-100
}

/**
 * Participant feedback
 */
export interface ParticipantFeedback {
  userId: string;
  rating: number; // 1-5
  comments?: string;
  submittedAt: Date;
}

/**
 * CI/CD chaos testing configuration
 */
export interface ChaosCICDConfig {
  enabled: boolean;
  stage: 'pre_deploy' | 'post_deploy' | 'continuous';
  experiments: string[]; // Experiment IDs
  failOnError: boolean;
  environmentTargets: ('development' | 'staging' | 'production')[];
  schedule?: string; // Cron expression
  promotionGates: PromotionGate[];
  notifications: CICDNotification[];
}

/**
 * Promotion gate
 */
export interface PromotionGate {
  id: string;
  name: string;
  condition: 'all_experiments_pass' | 'resilience_score_above' | 'no_critical_violations' | 'custom';
  threshold?: number;
  customCheck?: (results: ExperimentResult[]) => boolean;
  blocking: boolean; // Block promotion if fails
}

/**
 * CI/CD notification configuration
 */
export interface CICDNotification {
  channel: 'email' | 'slack' | 'teams' | 'webhook';
  events: ('experiment_start' | 'experiment_end' | 'failure' | 'promotion_blocked')[];
  config: Record<string, any>;
}

/**
 * CI/CD chaos test result
 */
export interface ChaosCICDResult {
  id: string;
  pipelineId: string;
  commitHash: string;
  branch: string;
  environment: string;

  startTime: Date;
  endTime?: Date;
  duration?: number; // ms

  status: 'passed' | 'failed' | 'partial';

  experiments: ExperimentResult[];

  promotionAllowed: boolean;
  blockedGates: string[];

  metrics: {
    totalExperiments: number;
    passedExperiments: number;
    failedExperiments: number;
    resilienceScore: number;
    criticalViolations: number;
  };

  report: string; // Markdown report
}

/**
 * Chaos dashboard configuration
 */
export interface ChaosDashboardConfig {
  refreshInterval: number; // ms
  timeRange: {
    start: Date;
    end: Date;
  };
  filters: {
    categories?: ExperimentCategory[];
    severities?: ExperimentSeverity[];
    statuses?: ExperimentStatus[];
    tags?: string[];
  };
}

/**
 * Chaos dashboard statistics
 */
export interface ChaosDashboardStats {
  totalExperiments: number;
  activeExperiments: number;
  totalGameDays: number;
  upcomingGameDays: number;

  resilience: {
    current: ResilienceMetrics;
    trend: 'improving' | 'stable' | 'degrading';
    historicalData: Array<{ timestamp: Date; metrics: ResilienceMetrics }>;
  };

  experiments: {
    byCategory: Record<ExperimentCategory, number>;
    bySeverity: Record<ExperimentSeverity, number>;
    byStatus: Record<ExperimentStatus, number>;
  };

  insights: {
    unknownFailuresDiscovered: number;
    improvementPercentage: number;
    mttrReduction: number; // Percentage
  };
}
