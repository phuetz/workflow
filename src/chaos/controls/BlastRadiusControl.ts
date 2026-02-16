/**
 * Blast Radius Controls
 *
 * Safety controls for chaos experiments including scope limiting,
 * gradual rollout, emergency stop, and automatic rollback.
 */

import { logger } from '../../services/SimpleLogger';
import type {
  BlastRadiusConfig,
  ExperimentTarget,
  SafetyControls,
  PreFlightCheckResult,
} from '../types/chaos';

/**
 * Blast radius controller
 */
export class BlastRadiusControl {
  private emergencyStopCallbacks = new Set<() => Promise<void>>();

  /**
   * Validate blast radius configuration
   */
  validate(config: BlastRadiusConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate percentage
    if (config.percentage < 0 || config.percentage > 100) {
      errors.push('Percentage must be between 0 and 100');
    }

    // Validate max impact
    if (config.maxImpact < 1) {
      errors.push('Max impact must be at least 1');
    }

    // Validate rollout steps
    if (config.rolloutSteps) {
      for (const step of config.rolloutSteps) {
        if (step < 0 || step > 100) {
          errors.push(`Invalid rollout step: ${step}%`);
        }
      }

      // Ensure steps are ascending
      for (let i = 1; i < config.rolloutSteps.length; i++) {
        if (config.rolloutSteps[i] <= config.rolloutSteps[i - 1]) {
          errors.push('Rollout steps must be in ascending order');
        }
      }
    }

    // Critical experiments should have stricter limits
    if (config.scope === 'global' && config.percentage > 50) {
      errors.push('Global scope experiments should affect max 50% of targets');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate actual targets based on blast radius
   */
  calculateTargets(
    allTargets: ExperimentTarget[],
    config: BlastRadiusConfig
  ): ExperimentTarget[] {
    let candidates = [...allTargets];

    // Apply exclusion list
    if (config.excludeList && config.excludeList.length > 0) {
      candidates = candidates.filter(
        (t) => !config.excludeList!.includes(t.id)
      );
    }

    // Apply inclusion list (overrides other filters)
    if (config.includeList && config.includeList.length > 0) {
      candidates = allTargets.filter((t) =>
        config.includeList!.includes(t.id)
      );
    }

    // Calculate target count
    const targetCount = Math.min(
      Math.ceil((candidates.length * config.percentage) / 100),
      config.maxImpact
    );

    // Randomly select targets
    const shuffled = candidates.sort(() => Math.random() - 0.5);

    return shuffled.slice(0, targetCount);
  }

  /**
   * Get rollout plan
   */
  getRolloutPlan(
    targets: ExperimentTarget[],
    config: BlastRadiusConfig
  ): RolloutStep[] {
    if (config.rolloutStrategy === 'immediate') {
      return [
        {
          stepNumber: 1,
          percentage: 100,
          targets: targets,
          waitTime: 0,
        },
      ];
    }

    const steps: RolloutStep[] = [];
    const rolloutSteps = config.rolloutSteps || [10, 25, 50, 100];

    for (let i = 0; i < rolloutSteps.length; i++) {
      const percentage = rolloutSteps[i];
      const targetCount = Math.ceil((targets.length * percentage) / 100);
      const stepTargets = targets.slice(0, targetCount);

      steps.push({
        stepNumber: i + 1,
        percentage,
        targets: stepTargets,
        waitTime: i === 0 ? 0 : 30000, // 30s between steps
      });
    }

    return steps;
  }

  /**
   * Register emergency stop callback
   */
  registerEmergencyStop(callback: () => Promise<void>): void {
    this.emergencyStopCallbacks.add(callback);
  }

  /**
   * Trigger emergency stop
   */
  async triggerEmergencyStop(): Promise<void> {
    logger.debug('[Blast Radius] EMERGENCY STOP TRIGGERED');

    const promises = Array.from(this.emergencyStopCallbacks).map((cb) =>
      cb()
    );

    await Promise.all(promises);

    logger.debug('[Blast Radius] Emergency stop completed');
  }

  /**
   * Clear emergency stop callbacks
   */
  clearEmergencyStops(): void {
    this.emergencyStopCallbacks.clear();
  }
}

/**
 * Rollout step
 */
interface RolloutStep {
  stepNumber: number;
  percentage: number;
  targets: ExperimentTarget[];
  waitTime: number; // ms to wait before this step
}

/**
 * Safety validator
 */
export class SafetyValidator {
  /**
   * Run all safety checks
   */
  async runChecks(controls: SafetyControls): Promise<SafetyCheckResults> {
    const results: SafetyCheckResults = {
      passed: true,
      checks: [],
      warnings: [],
      errors: [],
    };

    // Run pre-flight checks
    for (const check of controls.preFlightChecks) {
      const result = await check.check();

      results.checks.push({
        name: check.name,
        passed: result.passed,
        message: result.message,
        required: check.required,
      });

      if (!result.passed) {
        if (check.required) {
          results.errors.push(
            `Required check failed: ${check.name} - ${result.message}`
          );
          results.passed = false;
        } else {
          results.warnings.push(
            `Optional check failed: ${check.name} - ${result.message}`
          );
        }
      }
    }

    // Validate duration
    if (controls.maxDuration > 3600000) {
      // > 1 hour
      results.warnings.push(
        'Experiment duration exceeds 1 hour - consider breaking into smaller experiments'
      );
    }

    // Validate health check interval
    if (controls.healthCheckInterval < 1000) {
      results.warnings.push(
        'Health check interval < 1s may cause performance issues'
      );
    }

    return results;
  }

  /**
   * Validate environment for chaos testing
   */
  validateEnvironment(environment: 'development' | 'staging' | 'production'): {
    safe: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const safe = true;

    if (environment === 'production') {
      warnings.push(
        'Running chaos experiments in PRODUCTION - ensure proper approvals'
      );
      warnings.push('Recommend starting with small blast radius (< 10%)');
      warnings.push('Ensure rollback procedures are tested');
    }

    if (environment === 'development') {
      warnings.push(
        'Development environment may not reflect production behavior'
      );
    }

    return { safe, warnings };
  }
}

/**
 * Safety check results
 */
interface SafetyCheckResults {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
    required: boolean;
  }>;
  warnings: string[];
  errors: string[];
}

/**
 * Automatic rollback controller
 */
export class AutoRollbackController {
  private rollbackTriggers = new Map<
    string,
    { threshold: number; current: number }
  >();

  /**
   * Register a rollback trigger
   */
  registerTrigger(metric: string, threshold: number): void {
    this.rollbackTriggers.set(metric, { threshold, current: 0 });
  }

  /**
   * Update metric value
   */
  updateMetric(metric: string, value: number): boolean {
    const trigger = this.rollbackTriggers.get(metric);

    if (!trigger) {
      return false;
    }

    trigger.current = value;

    // Check if threshold exceeded
    if (value > trigger.threshold) {
      logger.debug(
        `[Auto-Rollback] Threshold exceeded for ${metric}: ${value} > ${trigger.threshold}`
      );
      return true;
    }

    return false;
  }

  /**
   * Check if any trigger requires rollback
   */
  shouldRollback(): boolean {
    for (const [metric, trigger] of this.rollbackTriggers.entries()) {
      if (trigger.current > trigger.threshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get violated triggers
   */
  getViolations(): Array<{
    metric: string;
    threshold: number;
    current: number;
  }> {
    const violations: Array<{
      metric: string;
      threshold: number;
      current: number;
    }> = [];

    for (const [metric, trigger] of this.rollbackTriggers.entries()) {
      if (trigger.current > trigger.threshold) {
        violations.push({
          metric,
          threshold: trigger.threshold,
          current: trigger.current,
        });
      }
    }

    return violations;
  }

  /**
   * Reset all triggers
   */
  reset(): void {
    for (const trigger of this.rollbackTriggers.values()) {
      trigger.current = 0;
    }
  }
}

/**
 * Scope limiter for experiments
 */
export class ScopeLimiter {
  /**
   * Check if experiment scope is safe
   */
  isScopeSafe(
    scope: BlastRadiusConfig['scope'],
    environment: 'development' | 'staging' | 'production'
  ): { safe: boolean; reason?: string } {
    // Global scope in production requires extra caution
    if (scope === 'global' && environment === 'production') {
      return {
        safe: false,
        reason:
          'Global scope in production requires explicit approval and gradual rollout',
      };
    }

    return { safe: true };
  }

  /**
   * Get recommended scope for environment
   */
  getRecommendedScope(
    environment: 'development' | 'staging' | 'production'
  ): BlastRadiusConfig['scope'] {
    switch (environment) {
      case 'production':
        return 'node';
      case 'staging':
        return 'workflow';
      case 'development':
        return 'global';
    }
  }

  /**
   * Get recommended percentage for scope
   */
  getRecommendedPercentage(
    scope: BlastRadiusConfig['scope'],
    environment: 'development' | 'staging' | 'production'
  ): number {
    if (environment === 'production') {
      switch (scope) {
        case 'node':
          return 10;
        case 'workflow':
          return 5;
        case 'service':
          return 3;
        case 'global':
          return 1;
      }
    }

    if (environment === 'staging') {
      switch (scope) {
        case 'node':
          return 30;
        case 'workflow':
          return 20;
        case 'service':
          return 10;
        case 'global':
          return 5;
      }
    }

    // Development - more aggressive
    return 50;
  }
}
