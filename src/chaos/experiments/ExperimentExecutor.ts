/**
 * Chaos Experiment Executor
 *
 * Executes chaos experiments with hypothesis testing, blast radius control,
 * gradual rollout, automatic rollback, and real-time monitoring.
 */

import { logger } from '../../services/SimpleLogger';
import type {
  ChaosExperiment,
  ExperimentContext,
  ExperimentResult,
  ExperimentStatus,
  FaultInjectionResult,
  MetricObservation,
  Observation,
  SLAViolation,
  PreFlightCheckResult,
} from '../types/chaos';

/**
 * Experiment execution configuration
 */
export interface ExecutionConfig {
  dryRun?: boolean;
  skipPreFlightChecks?: boolean;
  overrideBlastRadius?: {
    percentage?: number;
    maxImpact?: number;
  };
  monitoringInterval?: number; // ms
  autoRollback?: boolean;
}

/**
 * Experiment execution context builder
 */
export class ExecutionContextBuilder {
  private context: Partial<ExperimentContext> = {
    targets: [],
    environment: 'development',
    dryRun: false,
    monitoring: {
      enabled: true,
      metricsCollectionInterval: 5000,
      traceEnabled: true,
      logLevel: 'info',
      alertOnAnomalies: true,
    },
  };

  setExperimentId(id: string): this {
    this.context.experimentId = id;
    return this;
  }

  setWorkflowId(id: string): this {
    this.context.workflowId = id;
    return this;
  }

  setTargets(targets: ExperimentContext['targets']): this {
    this.context.targets = targets;
    return this;
  }

  setEnvironment(env: ExperimentContext['environment']): this {
    this.context.environment = env;
    return this;
  }

  setDryRun(dryRun: boolean): this {
    this.context.dryRun = dryRun;
    return this;
  }

  setMetadata(metadata: Record<string, any>): this {
    this.context.metadata = metadata;
    return this;
  }

  build(): ExperimentContext {
    if (!this.context.experimentId) {
      throw new Error('Experiment ID is required');
    }
    if (!this.context.targets || this.context.targets.length === 0) {
      throw new Error('At least one target is required');
    }

    return this.context as ExperimentContext;
  }
}

/**
 * Experiment executor with advanced execution capabilities
 */
export class ExperimentExecutor {
  private activeExperiments = new Map<string, ExperimentExecution>();
  private slaMonitor: SLAMonitor;
  private metricsCollector: MetricsCollector;

  constructor() {
    this.slaMonitor = new SLAMonitor();
    this.metricsCollector = new MetricsCollector();
  }

  /**
   * Execute a chaos experiment
   */
  async execute(
    experiment: ChaosExperiment,
    context: ExperimentContext,
    config: ExecutionConfig = {}
  ): Promise<ExperimentResult> {
    const executionId = `exec-${experiment.id}-${Date.now()}`;

    logger.debug(`[Executor] Starting experiment: ${experiment.name} (${executionId})`);

    // Create execution tracker
    const execution = new ExperimentExecution(
      executionId,
      experiment,
      context,
      config
    );
    this.activeExperiments.set(executionId, execution);

    try {
      // Phase 1: Pre-flight checks
      if (!config.skipPreFlightChecks) {
        await this.runPreFlightChecks(experiment, context);
      }

      // Phase 2: Observe steady state
      const steadyStateMetrics = await this.observeSteadyState(
        experiment,
        context
      );

      // Phase 3: Calculate blast radius and select targets
      const targets = await this.calculateBlastRadius(
        experiment,
        context,
        config.overrideBlastRadius
      );

      // Update context with final targets
      const finalContext: ExperimentContext = {
        ...context,
        targets,
      };

      // Phase 4: Gradual rollout (if configured)
      const result = await this.gradualRollout(
        experiment,
        finalContext,
        execution
      );

      // Phase 5: Validate hypothesis
      result.hypothesisValidated = this.validateHypothesis(
        experiment,
        result
      );

      // Phase 6: Automatic rollback if needed
      if (
        config.autoRollback !== false &&
        experiment.safetyControls.autoRollbackOnSLAViolation &&
        result.slaViolations.length > 0
      ) {
        logger.debug(`[Executor] SLA violations detected, rolling back...`);
        await experiment.rollback();
        result.status = 'rolled_back';
      }

      logger.debug(`[Executor] Experiment completed: ${result.status}`);
      return result;
    } catch (error) {
      logger.error(`[Executor] Experiment failed:`, error);

      // Emergency rollback
      try {
        await experiment.rollback();
      } catch (rollbackError) {
        logger.error(`[Executor] Rollback failed:`, rollbackError);
      }

      // Return failed result
      return {
        experimentId: experiment.id,
        experimentName: experiment.name,
        status: 'failed',
        startTime: new Date(),
        endTime: new Date(),
        steadyStateObserved: false,
        steadyStateMetrics: [],
        hypothesisValidated: false,
        faultsInjected: [],
        targetsAffected: 0,
        systemRecovered: false,
        slaViolations: [],
        observations: [],
        recommendations: [],
        resilience: {
          mtbf: 0,
          mttr: 0,
          errorBudget: 0,
          resilienceScore: 0,
          availability: 0,
          recoveryRate: 0,
        },
        error: error as Error,
      };
    } finally {
      this.activeExperiments.delete(executionId);
    }
  }

  /**
   * Run pre-flight safety checks
   */
  private async runPreFlightChecks(
    experiment: ChaosExperiment,
    context: ExperimentContext
  ): Promise<void> {
    logger.debug(`[Executor] Running pre-flight checks...`);

    const checks = experiment.safetyControls.preFlightChecks;

    for (const check of checks) {
      const result = await check.check();

      if (!result.passed && check.required) {
        throw new Error(
          `Pre-flight check failed: ${check.name} - ${result.message}`
        );
      }

      if (!result.passed) {
        logger.warn(
          `[Executor] Pre-flight check warning: ${check.name} - ${result.message}`
        );
      }
    }

    logger.debug(`[Executor] All pre-flight checks passed`);
  }

  /**
   * Observe steady state before introducing chaos
   */
  private async observeSteadyState(
    experiment: ChaosExperiment,
    context: ExperimentContext
  ): Promise<MetricObservation[]> {
    logger.debug(
      `[Executor] Observing steady state for ${experiment.hypothesis.steadyState.duration}ms...`
    );

    const observations: MetricObservation[] = [];

    for (const metric of experiment.hypothesis.steadyState.metrics) {
      // Collect metric (simulated)
      const observed = await this.metricsCollector.collect(
        metric.name,
        context
      );

      const deviation =
        ((observed - metric.baseline) / metric.baseline) * 100;
      const withinTolerance = Math.abs(deviation) <= metric.tolerance;

      observations.push({
        metric: metric.name,
        baseline: metric.baseline,
        observed,
        deviation,
        withinTolerance,
        timestamp: new Date(),
      });

      if (!withinTolerance) {
        logger.warn(
          `[Executor] Metric ${metric.name} is outside tolerance: ${observed} (baseline: ${metric.baseline}, tolerance: ${metric.tolerance}%)`
        );
      }
    }

    return observations;
  }

  /**
   * Calculate blast radius and select targets
   */
  private async calculateBlastRadius(
    experiment: ChaosExperiment,
    context: ExperimentContext,
    override?: ExecutionConfig['overrideBlastRadius']
  ): Promise<ExperimentContext['targets']> {
    const blastRadius = experiment.blastRadius;

    let percentage = blastRadius.percentage;
    let maxImpact = blastRadius.maxImpact;

    if (override) {
      percentage = override.percentage ?? percentage;
      maxImpact = override.maxImpact ?? maxImpact;
    }

    // Calculate number of targets
    const totalTargets = context.targets.length;
    const targetCount = Math.min(
      Math.ceil((totalTargets * percentage) / 100),
      maxImpact
    );

    logger.debug(
      `[Executor] Blast radius: ${percentage}% of ${totalTargets} targets = ${targetCount} targets (max: ${maxImpact})`
    );

    // Select random targets
    const shuffled = [...context.targets].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, targetCount);

    // Apply exclusion/inclusion lists
    let filtered = selected;

    if (blastRadius.excludeList && blastRadius.excludeList.length > 0) {
      filtered = filtered.filter(
        (t) => !blastRadius.excludeList!.includes(t.id)
      );
    }

    if (blastRadius.includeList && blastRadius.includeList.length > 0) {
      // Only include specified targets
      filtered = context.targets.filter((t) =>
        blastRadius.includeList!.includes(t.id)
      );
    }

    return filtered;
  }

  /**
   * Gradual rollout of chaos (canary-style)
   */
  private async gradualRollout(
    experiment: ChaosExperiment,
    context: ExperimentContext,
    execution: ExperimentExecution
  ): Promise<ExperimentResult> {
    const rolloutStrategy = experiment.blastRadius.rolloutStrategy;

    if (rolloutStrategy === 'immediate') {
      return await experiment.execute(context);
    }

    // Gradual rollout
    const steps = experiment.blastRadius.rolloutSteps || [10, 25, 50, 100];
    const totalTargets = context.targets.length;

    logger.debug(
      `[Executor] Gradual rollout with steps: ${steps.join('% → ')}%`
    );

    let cumulativeResult: ExperimentResult | null = null;

    for (let i = 0; i < steps.length; i++) {
      const stepPercentage = steps[i];
      const stepTargetCount = Math.ceil(
        (totalTargets * stepPercentage) / 100
      );

      const stepTargets = context.targets.slice(0, stepTargetCount);

      logger.debug(
        `[Executor] Rollout step ${i + 1}/${steps.length}: ${stepPercentage}% (${stepTargetCount} targets)`
      );

      const stepContext: ExperimentContext = {
        ...context,
        targets: stepTargets,
      };

      const stepResult = await experiment.execute(stepContext);

      // Monitor for SLA violations
      if (
        experiment.safetyControls.autoRollbackOnSLAViolation &&
        stepResult.slaViolations.length > 0
      ) {
        logger.error(
          `[Executor] SLA violations in step ${i + 1}, aborting rollout`
        );
        await experiment.rollback();
        stepResult.status = 'aborted';
        return stepResult;
      }

      cumulativeResult = stepResult;

      // Wait between steps
      if (i < steps.length - 1) {
        await this.sleep(5000);
      }
    }

    return cumulativeResult!;
  }

  /**
   * Validate hypothesis based on experiment results
   */
  private validateHypothesis(
    experiment: ChaosExperiment,
    result: ExperimentResult
  ): boolean {
    const assertions = experiment.hypothesis.expectedOutcome.assertions;

    for (const assertion of assertions) {
      // In a real implementation, you'd evaluate the assertion
      // against actual metrics collected during the experiment
      logger.debug(
        `[Executor] Validating assertion: ${assertion.metric} ${assertion.operator} ${assertion.value}`
      );
    }

    // Simplified validation
    return (
      result.steadyStateObserved &&
      result.systemRecovered &&
      result.slaViolations.length === 0
    );
  }

  /**
   * Stop a running experiment
   */
  async stop(experimentId: string): Promise<void> {
    const execution = this.activeExperiments.get(experimentId);

    if (!execution) {
      throw new Error(`No active experiment found with ID: ${experimentId}`);
    }

    logger.debug(`[Executor] Emergency stop for experiment: ${experimentId}`);

    await execution.experiment.rollback();
    this.activeExperiments.delete(experimentId);
  }

  /**
   * Get active experiments
   */
  getActiveExperiments(): ExperimentExecution[] {
    return Array.from(this.activeExperiments.values());
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Experiment execution tracker
 */
class ExperimentExecution {
  status: ExperimentStatus = 'running';
  startTime = new Date();
  endTime?: Date;

  constructor(
    public id: string,
    public experiment: ChaosExperiment,
    public context: ExperimentContext,
    public config: ExecutionConfig
  ) {}
}

/**
 * SLA monitoring during experiments
 */
class SLAMonitor {
  private violations: SLAViolation[] = [];

  monitor(metric: string, value: number, threshold: number): void {
    if (value > threshold) {
      this.violations.push({
        slaType: metric,
        threshold,
        actual: value,
        startTime: new Date(),
        severity: 'high',
      });
    }
  }

  getViolations(): SLAViolation[] {
    return this.violations;
  }

  reset(): void {
    this.violations = [];
  }
}

/**
 * Metrics collector for experiments
 */
class MetricsCollector {
  async collect(
    metricName: string,
    context: ExperimentContext
  ): Promise<number> {
    // Simulate metric collection
    // In a real implementation, this would query monitoring systems

    const mockMetrics: Record<string, number> = {
      response_time: 195,
      success_rate: 99.95,
      cpu_usage: 32,
      memory_usage: 48,
      error_rate: 0.05,
      availability: 99.9,
    };

    return mockMetrics[metricName] || 100;
  }

  async collectMultiple(
    metricNames: string[],
    context: ExperimentContext
  ): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    for (const name of metricNames) {
      results[name] = await this.collect(name, context);
    }

    return results;
  }
}

/**
 * Experiment result aggregator
 */
export class ExperimentResultAggregator {
  /**
   * Aggregate multiple experiment results
   */
  aggregate(results: ExperimentResult[]): AggregatedResult {
    const total = results.length;
    const completed = results.filter((r) => r.status === 'completed').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const rolledBack = results.filter(
      (r) => r.status === 'rolled_back'
    ).length;

    const avgRecoveryTime =
      results
        .filter((r) => r.recoveryTime)
        .reduce((sum, r) => sum + (r.recoveryTime || 0), 0) /
      results.filter((r) => r.recoveryTime).length;

    const totalViolations = results.reduce(
      (sum, r) => sum + r.slaViolations.length,
      0
    );

    const avgResilienceScore =
      results.reduce((sum, r) => sum + r.resilience.resilienceScore, 0) /
      total;

    return {
      total,
      completed,
      failed,
      rolledBack,
      avgRecoveryTime,
      totalSLAViolations: totalViolations,
      avgResilienceScore,
      successRate: (completed / total) * 100,
    };
  }
}

interface AggregatedResult {
  total: number;
  completed: number;
  failed: number;
  rolledBack: number;
  avgRecoveryTime: number;
  totalSLAViolations: number;
  avgResilienceScore: number;
  successRate: number;
}

/**
 * Experiment scheduler for periodic execution
 */
export class ExperimentScheduler {
  private scheduled = new Map<string, ScheduledExperiment>();
  private executor: ExperimentExecutor;

  constructor(executor: ExperimentExecutor) {
    this.executor = executor;
  }

  /**
   * Schedule an experiment to run periodically
   */
  schedule(
    experiment: ChaosExperiment,
    context: ExperimentContext,
    cronExpression: string
  ): string {
    const id = `sched-${experiment.id}-${Date.now()}`;

    const scheduled: ScheduledExperiment = {
      id,
      experiment,
      context,
      cronExpression,
      nextRun: this.parseNextRun(cronExpression),
      enabled: true,
    };

    this.scheduled.set(id, scheduled);

    logger.debug(
      `[Scheduler] Scheduled experiment ${experiment.name} with cron: ${cronExpression}`
    );

    return id;
  }

  /**
   * Cancel a scheduled experiment
   */
  cancel(scheduleId: string): void {
    this.scheduled.delete(scheduleId);
  }

  /**
   * Run scheduled experiments
   */
  async tick(): Promise<void> {
    const now = Date.now();

    for (const [id, scheduled] of this.scheduled.entries()) {
      if (scheduled.enabled && scheduled.nextRun <= now) {
        logger.debug(`[Scheduler] Running scheduled experiment: ${id}`);

        try {
          await this.executor.execute(
            scheduled.experiment,
            scheduled.context
          );

          // Update next run time
          scheduled.nextRun = this.parseNextRun(scheduled.cronExpression);
        } catch (error) {
          logger.error(`[Scheduler] Scheduled experiment failed:`, error);
        }
      }
    }
  }

  private parseNextRun(cronExpression: string): number {
    // Simplified cron parsing - in production use a proper cron library
    return Date.now() + 3600000; // 1 hour from now
  }
}

interface ScheduledExperiment {
  id: string;
  experiment: ChaosExperiment;
  context: ExperimentContext;
  cronExpression: string;
  nextRun: number;
  enabled: boolean;
}
