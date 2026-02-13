/**
 * Chaos CI/CD Integration
 *
 * Pipeline integration for chaos testing with pre-deploy validation,
 * automated experiment execution, pass/fail criteria, and promotion gates.
 */

import type {
  ChaosCICDConfig,
  ChaosCICDResult,
  PromotionGate,
  CICDNotification,
  ChaosExperiment,
  ExperimentResult,
} from '../types/chaos';
import { ExperimentExecutor, ExecutionContextBuilder } from '../experiments/ExperimentExecutor';
import { logger } from '../../services/SimpleLogger';

/**
 * CI/CD chaos testing integration
 */
export class ChaosCICDIntegration {
  private executor: ExperimentExecutor;
  private pipelineResults = new Map<string, ChaosCICDResult>();

  constructor(executor?: ExperimentExecutor) {
    this.executor = executor || new ExperimentExecutor();
  }

  /**
   * Run chaos tests in CI/CD pipeline
   */
  async runPipeline(
    config: ChaosCICDConfig,
    pipelineContext: {
      pipelineId: string;
      commitHash: string;
      branch: string;
      environment: 'development' | 'staging' | 'production';
    },
    experiments: ChaosExperiment[]
  ): Promise<ChaosCICDResult> {
    logger.debug(`[Chaos CI/CD] Running pipeline for ${pipelineContext.branch}`);

    const result: ChaosCICDResult = {
      id: `cicd-${Date.now()}`,
      pipelineId: pipelineContext.pipelineId,
      commitHash: pipelineContext.commitHash,
      branch: pipelineContext.branch,
      environment: pipelineContext.environment,
      startTime: new Date(),
      status: 'passed',
      experiments: [],
      promotionAllowed: true,
      blockedGates: [],
      metrics: {
        totalExperiments: 0,
        passedExperiments: 0,
        failedExperiments: 0,
        resilienceScore: 0,
        criticalViolations: 0,
      },
      report: '',
    };

    try {
      // Filter experiments based on stage
      const relevantExperiments = this.filterExperimentsByStage(
        experiments,
        config.stage
      );

      result.metrics.totalExperiments = relevantExperiments.length;

      // Send start notification
      await this.sendNotification(config, 'experiment_start', result);

      // Execute experiments
      for (const experiment of relevantExperiments) {
        const experimentResult = await this.runExperiment(
          experiment,
          pipelineContext.environment
        );

        result.experiments.push(experimentResult);

        if (experimentResult.status === 'completed') {
          result.metrics.passedExperiments++;
        } else {
          result.metrics.failedExperiments++;
          result.status = 'failed';
        }

        // Count critical violations
        result.metrics.criticalViolations += experimentResult.slaViolations.filter(
          (v) => v.severity === 'critical'
        ).length;
      }

      // Calculate resilience score
      result.metrics.resilienceScore = this.calculateResilienceScore(
        result.experiments
      );

      // Check promotion gates
      const gateResults = await this.checkPromotionGates(
        config.promotionGates,
        result
      );

      result.promotionAllowed = gateResults.allowed;
      result.blockedGates = gateResults.blocked;

      // Generate report
      result.report = this.generateReport(result);

      // Send completion notification
      await this.sendNotification(config, 'experiment_end', result);

      // Send failure notification if needed
      if (result.status === 'failed' && config.failOnError) {
        await this.sendNotification(config, 'failure', result);
      }

      // Send promotion blocked notification
      if (!result.promotionAllowed) {
        await this.sendNotification(config, 'promotion_blocked', result);
      }

      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();

      this.pipelineResults.set(result.id, result);

      logger.debug(
        `[Chaos CI/CD] Pipeline completed: ${result.status} (${result.metrics.passedExperiments}/${result.metrics.totalExperiments} passed)`
      );

      return result;
    } catch (error) {
      result.status = 'failed';
      result.endTime = new Date();
      result.duration = result.endTime!.getTime() - result.startTime.getTime();

      throw error;
    }
  }

  /**
   * Run single experiment in pipeline
   */
  private async runExperiment(
    experiment: ChaosExperiment,
    environment: 'development' | 'staging' | 'production'
  ): Promise<ExperimentResult> {
    // Build context
    const context = new ExecutionContextBuilder()
      .setExperimentId(experiment.id)
      .setEnvironment(environment)
      .setTargets([
        { id: 'target-1', type: 'workflow', name: 'Test Workflow' },
      ])
      .setDryRun(environment === 'production') // Dry run in production
      .build();

    // Execute
    return await this.executor.execute(experiment, context, {
      autoRollback: true,
    });
  }

  /**
   * Filter experiments by pipeline stage
   */
  private filterExperimentsByStage(
    experiments: ChaosExperiment[],
    stage: ChaosCICDConfig['stage']
  ): ChaosExperiment[] {
    // In production, filter based on stage
    // For now, return all experiments
    return experiments;
  }

  /**
   * Calculate overall resilience score
   */
  private calculateResilienceScore(results: ExperimentResult[]): number {
    if (results.length === 0) return 0;

    const avgScore =
      results.reduce((sum, r) => sum + r.resilience.resilienceScore, 0) /
      results.length;

    return Math.round(avgScore);
  }

  /**
   * Check promotion gates
   */
  private async checkPromotionGates(
    gates: PromotionGate[],
    result: ChaosCICDResult
  ): Promise<{ allowed: boolean; blocked: string[] }> {
    const blocked: string[] = [];

    for (const gate of gates) {
      const passed = await this.evaluateGate(gate, result);

      if (!passed && gate.blocking) {
        blocked.push(gate.id);
      }
    }

    return {
      allowed: blocked.length === 0,
      blocked,
    };
  }

  /**
   * Evaluate single promotion gate
   */
  private async evaluateGate(
    gate: PromotionGate,
    result: ChaosCICDResult
  ): Promise<boolean> {
    switch (gate.condition) {
      case 'all_experiments_pass':
        return result.metrics.failedExperiments === 0;

      case 'resilience_score_above':
        return result.metrics.resilienceScore >= (gate.threshold || 80);

      case 'no_critical_violations':
        return result.metrics.criticalViolations === 0;

      case 'custom':
        if (gate.customCheck) {
          return gate.customCheck(result.experiments);
        }
        return true;

      default:
        logger.warn(`Unknown gate condition: ${gate.condition}`);
        return true;
    }
  }

  /**
   * Generate markdown report
   */
  private generateReport(result: ChaosCICDResult): string {
    const sections: string[] = [];

    // Header
    sections.push(`# Chaos Engineering Report`);
    sections.push(``);
    sections.push(`**Pipeline**: ${result.pipelineId}`);
    sections.push(`**Branch**: ${result.branch}`);
    sections.push(`**Commit**: ${result.commitHash}`);
    sections.push(`**Environment**: ${result.environment}`);
    sections.push(`**Status**: ${result.status.toUpperCase()}`);
    sections.push(``);

    // Metrics
    sections.push(`## Metrics`);
    sections.push(``);
    sections.push(`- **Total Experiments**: ${result.metrics.totalExperiments}`);
    sections.push(`- **Passed**: ${result.metrics.passedExperiments} ✅`);
    sections.push(`- **Failed**: ${result.metrics.failedExperiments} ❌`);
    sections.push(`- **Resilience Score**: ${result.metrics.resilienceScore}/100`);
    sections.push(`- **Critical Violations**: ${result.metrics.criticalViolations}`);
    sections.push(``);

    // Promotion Status
    sections.push(`## Promotion Status`);
    sections.push(``);

    if (result.promotionAllowed) {
      sections.push(`✅ **ALLOWED** - All gates passed`);
    } else {
      sections.push(`❌ **BLOCKED** - Failed gates:`);
      for (const gate of result.blockedGates) {
        sections.push(`  - ${gate}`);
      }
    }

    sections.push(``);

    // Experiment Results
    sections.push(`## Experiment Results`);
    sections.push(``);

    for (const exp of result.experiments) {
      const status = exp.status === 'completed' ? '✅' : '❌';
      sections.push(`### ${status} ${exp.experimentName}`);
      sections.push(``);
      sections.push(`- **Status**: ${exp.status}`);
      sections.push(`- **Resilience Score**: ${exp.resilience.resilienceScore}/100`);
      sections.push(`- **Recovery Time**: ${exp.recoveryTime || 0}ms`);
      sections.push(`- **SLA Violations**: ${exp.slaViolations.length}`);
      sections.push(``);

      // Recommendations
      if (exp.recommendations.length > 0) {
        sections.push(`**Recommendations**:`);
        for (const rec of exp.recommendations) {
          sections.push(`- [${rec.priority.toUpperCase()}] ${rec.title}: ${rec.actionable}`);
        }
        sections.push(``);
      }
    }

    return sections.join('\n');
  }

  /**
   * Send notification
   */
  private async sendNotification(
    config: ChaosCICDConfig,
    event: CICDNotification['events'][0],
    result: ChaosCICDResult
  ): Promise<void> {
    for (const notification of config.notifications) {
      if (notification.events.includes(event)) {
        logger.debug(
          `[Chaos CI/CD] Sending ${notification.channel} notification for ${event}`
        );

        // In production, send actual notifications
        switch (notification.channel) {
          case 'slack':
            await this.sendSlackNotification(notification.config, result);
            break;
          case 'email':
            await this.sendEmailNotification(notification.config, result);
            break;
          case 'webhook':
            await this.sendWebhookNotification(notification.config, result);
            break;
        }
      }
    }
  }

  private async sendSlackNotification(
    config: any,
    result: ChaosCICDResult
  ): Promise<void> {
    // Slack notification logic
  }

  private async sendEmailNotification(
    config: any,
    result: ChaosCICDResult
  ): Promise<void> {
    // Email notification logic
  }

  private async sendWebhookNotification(
    config: any,
    result: ChaosCICDResult
  ): Promise<void> {
    // Webhook notification logic
  }

  /**
   * Get pipeline result
   */
  getResult(id: string): ChaosCICDResult | undefined {
    return this.pipelineResults.get(id);
  }

  /**
   * List all pipeline results
   */
  listResults(): ChaosCICDResult[] {
    return Array.from(this.pipelineResults.values());
  }
}

/**
 * Pipeline configuration builder
 */
export class PipelineConfigBuilder {
  private config: Partial<ChaosCICDConfig> = {
    enabled: true,
    stage: 'post_deploy',
    experiments: [],
    failOnError: true,
    environmentTargets: ['staging'],
    promotionGates: [],
    notifications: [],
  };

  setEnabled(enabled: boolean): this {
    this.config.enabled = enabled;
    return this;
  }

  setStage(stage: ChaosCICDConfig['stage']): this {
    this.config.stage = stage;
    return this;
  }

  addExperiment(experimentId: string): this {
    this.config.experiments!.push(experimentId);
    return this;
  }

  setFailOnError(failOnError: boolean): this {
    this.config.failOnError = failOnError;
    return this;
  }

  addEnvironment(env: 'development' | 'staging' | 'production'): this {
    if (!this.config.environmentTargets!.includes(env)) {
      this.config.environmentTargets!.push(env);
    }
    return this;
  }

  addPromotionGate(gate: PromotionGate): this {
    this.config.promotionGates!.push(gate);
    return this;
  }

  addNotification(notification: CICDNotification): this {
    this.config.notifications!.push(notification);
    return this;
  }

  build(): ChaosCICDConfig {
    return this.config as ChaosCICDConfig;
  }
}

/**
 * Common promotion gates
 */
export class PromotionGates {
  static readonly ALL_PASS: PromotionGate = {
    id: 'all-experiments-pass',
    name: 'All Experiments Pass',
    condition: 'all_experiments_pass',
    blocking: true,
  };

  static readonly RESILIENCE_THRESHOLD: PromotionGate = {
    id: 'resilience-threshold',
    name: 'Resilience Score Above 80',
    condition: 'resilience_score_above',
    threshold: 80,
    blocking: true,
  };

  static readonly NO_CRITICAL_VIOLATIONS: PromotionGate = {
    id: 'no-critical-violations',
    name: 'No Critical SLA Violations',
    condition: 'no_critical_violations',
    blocking: true,
  };

  static createCustomGate(
    id: string,
    name: string,
    check: (results: ExperimentResult[]) => boolean,
    blocking: boolean = true
  ): PromotionGate {
    return {
      id,
      name,
      condition: 'custom',
      customCheck: check,
      blocking,
    };
  }
}

/**
 * Schedule chaos tests in CI/CD
 */
export class ChaosScheduler {
  private schedules = new Map<string, ScheduledChaosTest>();

  /**
   * Schedule periodic chaos testing
   */
  schedule(
    name: string,
    config: ChaosCICDConfig,
    cronExpression: string
  ): string {
    const id = `schedule-${Date.now()}`;

    this.schedules.set(id, {
      id,
      name,
      config,
      cronExpression,
      enabled: true,
      lastRun: undefined,
      nextRun: this.calculateNextRun(cronExpression),
    });

    logger.debug(`[Chaos Scheduler] Scheduled ${name}: ${cronExpression}`);

    return id;
  }

  /**
   * Cancel scheduled test
   */
  cancel(id: string): void {
    this.schedules.delete(id);
  }

  /**
   * Get scheduled tests
   */
  listSchedules(): ScheduledChaosTest[] {
    return Array.from(this.schedules.values());
  }

  private calculateNextRun(cronExpression: string): Date {
    // Simplified - use a proper cron library in production
    return new Date(Date.now() + 86400000); // 24 hours
  }
}

interface ScheduledChaosTest {
  id: string;
  name: string;
  config: ChaosCICDConfig;
  cronExpression: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun: Date;
}
