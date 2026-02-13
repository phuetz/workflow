/**
 * Task Adherence Monitor - Drift Detection
 * Monitors agent task execution for scope drift and violations
 */

import { EventEmitter } from 'events';
import type {
  TaskAdherenceMetrics,
  TaskViolation,
  TaskSpecification,
  PolicySeverity,
} from './types/governance';

/**
 * Task execution context
 */
interface TaskExecutionContext {
  agentId: string;
  taskId: string;
  specification: TaskSpecification;
  actualOutputs: string[];
  actualActions: string[];
  actualDuration: number;
  metadata: Record<string, any>;
}

/**
 * Task Adherence Monitor - Detects task drift and violations
 */
export class TaskAdherenceMonitor extends EventEmitter {
  private specifications: Map<string, TaskSpecification> = new Map();
  private metrics: Map<string, TaskAdherenceMetrics[]> = new Map();
  private driftThreshold = 0.7; // Below 70% = drift

  constructor(driftThreshold = 0.7) {
    super();
    this.driftThreshold = driftThreshold;
  }

  // ============================================================================
  // Specification Management
  // ============================================================================

  /**
   * Register task specification
   */
  registerSpecification(spec: TaskSpecification): void {
    this.specifications.set(spec.id, spec);
    this.emit('specification:registered', { taskId: spec.id });
  }

  /**
   * Update specification
   */
  updateSpecification(taskId: string, updates: Partial<TaskSpecification>): void {
    const spec = this.specifications.get(taskId);
    if (!spec) {
      throw new Error(`Task specification ${taskId} not found`);
    }

    const updated = { ...spec, ...updates };
    this.specifications.set(taskId, updated);
    this.emit('specification:updated', { taskId });
  }

  /**
   * Get specification
   */
  getSpecification(taskId: string): TaskSpecification | undefined {
    return this.specifications.get(taskId);
  }

  // ============================================================================
  // Adherence Monitoring
  // ============================================================================

  /**
   * Evaluate task adherence
   */
  async evaluate(context: TaskExecutionContext): Promise<TaskAdherenceMetrics> {
    const { specification } = context;
    const violations: TaskViolation[] = [];

    // Evaluate scope adherence
    const scopeAdherence = this.evaluateScopeAdherence(
      specification.scope,
      context.actualActions,
      violations
    );

    // Evaluate goal alignment
    const goalAlignment = this.evaluateGoalAlignment(
      specification.goals,
      context.actualOutputs,
      violations
    );

    // Evaluate constraint compliance
    const constraintCompliance = this.evaluateConstraints(
      specification.constraints,
      context,
      violations
    );

    // Evaluate output quality
    const outputQuality = this.evaluateOutputQuality(
      specification.expectedOutputs,
      context.actualOutputs,
      violations
    );

    // Evaluate time adherence
    const timeAdherence = this.evaluateTimeAdherence(
      specification.maxDurationMinutes,
      context.actualDuration,
      violations
    );

    // Calculate overall adherence score
    const adherenceScore = (
      scopeAdherence * 0.25 +
      goalAlignment * 0.25 +
      constraintCompliance * 0.20 +
      outputQuality * 0.20 +
      timeAdherence * 0.10
    );

    const driftDetected = adherenceScore < this.driftThreshold * 100;
    const driftSeverity = this.determineDriftSeverity(adherenceScore);

    const metrics: TaskAdherenceMetrics = {
      agentId: context.agentId,
      taskId: context.taskId,
      adherenceScore,
      driftDetected,
      driftSeverity,
      metrics: {
        scopeAdherence,
        goalAlignment,
        constraintCompliance,
        outputQuality,
        timeAdherence,
      },
      violations,
      measuredAt: new Date(),
    };

    // Store metrics
    this.storeMetrics(context.agentId, metrics);

    // Emit events
    if (driftDetected) {
      this.emit('drift:detected', { agentId: context.agentId, taskId: context.taskId, metrics });
    }

    return metrics;
  }

  // ============================================================================
  // Individual Metrics Evaluators
  // ============================================================================

  /**
   * Evaluate scope adherence (0-100)
   */
  private evaluateScopeAdherence(
    expectedScope: string[],
    actualActions: string[],
    violations: TaskViolation[]
  ): number {
    if (expectedScope.length === 0) return 100;

    let inScopeCount = 0;
    const outOfScopeActions: string[] = [];

    for (const action of actualActions) {
      const isInScope = expectedScope.some(scope =>
        action.toLowerCase().includes(scope.toLowerCase())
      );

      if (isInScope) {
        inScopeCount++;
      } else {
        outOfScopeActions.push(action);
      }
    }

    // Record violations for out-of-scope actions
    if (outOfScopeActions.length > 0) {
      violations.push({
        type: 'scope_drift',
        severity: 'high' as PolicySeverity,
        description: `${outOfScopeActions.length} action(s) outside defined scope`,
        detectedAt: new Date(),
        evidence: outOfScopeActions,
      });
    }

    return actualActions.length > 0
      ? (inScopeCount / actualActions.length) * 100
      : 100;
  }

  /**
   * Evaluate goal alignment (0-100)
   */
  private evaluateGoalAlignment(
    expectedGoals: string[],
    actualOutputs: string[],
    violations: TaskViolation[]
  ): number {
    if (expectedGoals.length === 0) return 100;

    let achievedGoals = 0;

    for (const goal of expectedGoals) {
      const achieved = actualOutputs.some(output =>
        output.toLowerCase().includes(goal.toLowerCase())
      );

      if (achieved) achievedGoals++;
    }

    const score = (achievedGoals / expectedGoals.length) * 100;

    if (score < 50) {
      violations.push({
        type: 'goal_deviation',
        severity: 'high' as PolicySeverity,
        description: `Only ${achievedGoals}/${expectedGoals.length} goals achieved`,
        detectedAt: new Date(),
        evidence: [`Expected: ${expectedGoals.join(', ')}`],
      });
    }

    return score;
  }

  /**
   * Evaluate constraint compliance (0-100)
   */
  private evaluateConstraints(
    constraints: string[],
    context: TaskExecutionContext,
    violations: TaskViolation[]
  ): number {
    if (constraints.length === 0) return 100;

    let satisfiedCount = 0;
    const violatedConstraints: string[] = [];

    for (const constraint of constraints) {
      // Simple keyword matching - in production, implement proper constraint evaluation
      const satisfied = this.checkConstraint(constraint, context);

      if (satisfied) {
        satisfiedCount++;
      } else {
        violatedConstraints.push(constraint);
      }
    }

    if (violatedConstraints.length > 0) {
      violations.push({
        type: 'constraint_violation',
        severity: 'critical' as PolicySeverity,
        description: `${violatedConstraints.length} constraint(s) violated`,
        detectedAt: new Date(),
        evidence: violatedConstraints,
      });
    }

    return (satisfiedCount / constraints.length) * 100;
  }

  /**
   * Check individual constraint
   */
  private checkConstraint(constraint: string, context: TaskExecutionContext): boolean {
    const lower = constraint.toLowerCase();

    // Check common constraints
    if (lower.includes('no external api')) {
      return !context.actualActions.some(a => a.includes('api') || a.includes('http'));
    }

    if (lower.includes('no data deletion')) {
      return !context.actualActions.some(a => a.includes('delete'));
    }

    if (lower.includes('read-only')) {
      return !context.actualActions.some(a =>
        a.includes('write') || a.includes('update') || a.includes('delete')
      );
    }

    // Default: assume satisfied if not explicitly violated
    return true;
  }

  /**
   * Evaluate output quality (0-100)
   */
  private evaluateOutputQuality(
    expectedOutputs: string[],
    actualOutputs: string[],
    violations: TaskViolation[]
  ): number {
    if (expectedOutputs.length === 0) return 100;

    let matchCount = 0;

    for (const expected of expectedOutputs) {
      const found = actualOutputs.some(actual =>
        actual.toLowerCase().includes(expected.toLowerCase())
      );

      if (found) matchCount++;
    }

    const score = (matchCount / expectedOutputs.length) * 100;

    if (score < 60) {
      violations.push({
        type: 'goal_deviation',
        severity: 'medium' as PolicySeverity,
        description: `Output quality below expected (${score.toFixed(0)}%)`,
        detectedAt: new Date(),
        evidence: [`Expected outputs: ${expectedOutputs.length}, Matched: ${matchCount}`],
      });
    }

    return score;
  }

  /**
   * Evaluate time adherence (0-100)
   */
  private evaluateTimeAdherence(
    maxDurationMinutes: number | undefined,
    actualDuration: number,
    violations: TaskViolation[]
  ): number {
    if (!maxDurationMinutes) return 100;

    const maxDurationMs = maxDurationMinutes * 60 * 1000;
    const score = Math.max(0, 100 - ((actualDuration - maxDurationMs) / maxDurationMs) * 100);

    if (actualDuration > maxDurationMs) {
      const overtime = Math.round((actualDuration - maxDurationMs) / 60000);
      violations.push({
        type: 'constraint_violation',
        severity: 'medium' as PolicySeverity,
        description: `Execution exceeded time limit by ${overtime} minutes`,
        detectedAt: new Date(),
        evidence: [`Max: ${maxDurationMinutes}min, Actual: ${Math.round(actualDuration / 60000)}min`],
      });
    }

    return Math.max(0, score);
  }

  /**
   * Determine drift severity
   */
  private determineDriftSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' | undefined {
    if (score >= this.driftThreshold * 100) return undefined;
    if (score >= 50) return 'low';
    if (score >= 30) return 'medium';
    if (score >= 10) return 'high';
    return 'critical';
  }

  // ============================================================================
  // Metrics Storage and Retrieval
  // ============================================================================

  /**
   * Store metrics
   */
  private storeMetrics(agentId: string, metrics: TaskAdherenceMetrics): void {
    let history = this.metrics.get(agentId) || [];
    history.push(metrics);

    // Keep only last 100 measurements
    if (history.length > 100) {
      history = history.slice(-100);
    }

    this.metrics.set(agentId, history);
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(agentId: string): TaskAdherenceMetrics[] {
    return this.metrics.get(agentId) || [];
  }

  /**
   * Get latest metrics
   */
  getLatestMetrics(agentId: string): TaskAdherenceMetrics | undefined {
    const history = this.getMetricsHistory(agentId);
    return history.length > 0 ? history[history.length - 1] : undefined;
  }

  /**
   * Get average adherence score
   */
  getAverageAdherence(agentId: string): number {
    const history = this.getMetricsHistory(agentId);
    if (history.length === 0) return 0;

    const sum = history.reduce((acc, m) => acc + m.adherenceScore, 0);
    return sum / history.length;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get statistics
   */
  getStatistics() {
    let totalMeasurements = 0;
    let totalDrifts = 0;
    let totalViolations = 0;

    for (const history of this.metrics.values()) {
      totalMeasurements += history.length;
      totalDrifts += history.filter(m => m.driftDetected).length;
      totalViolations += history.reduce((sum, m) => sum + m.violations.length, 0);
    }

    const avgAdherence =
      totalMeasurements > 0
        ? Array.from(this.metrics.values())
            .flat()
            .reduce((sum, m) => sum + m.adherenceScore, 0) / totalMeasurements
        : 0;

    return {
      totalAgents: this.metrics.size,
      totalMeasurements,
      totalDrifts,
      totalViolations,
      avgAdherence,
      driftRate: totalMeasurements > 0 ? (totalDrifts / totalMeasurements) * 100 : 0,
    };
  }
}

/**
 * Singleton instance
 */
export const taskAdherenceMonitor = new TaskAdherenceMonitor();
