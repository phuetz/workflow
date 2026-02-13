/**
 * Budget Enforcement System
 *
 * Enforces performance budgets during:
 * - CI/CD builds
 * - Workflow execution
 * - API requests
 * - Development mode
 *
 * Features:
 * - Fail builds if budgets exceeded
 * - Block execution if critical budgets violated
 * - Send alerts on budget violations
 * - Generate enforcement reports
 *
 * Usage:
 * const enforcer = BudgetEnforcer.getInstance();
 * await enforcer.enforce('workflow.execution', metrics, { type: 'workflow', targetId: 'wf-123' });
 */

import { logger } from '../services/SimpleLogger';
import {
  performanceBudgetManager,
  BudgetMetrics,
  BudgetScope,
  BudgetCheck,
  BudgetViolation,
} from './PerformanceBudget';

export interface EnforcementConfig {
  mode: 'strict' | 'warning' | 'off';
  failOnCritical: boolean;
  failOnError: boolean;
  failOnWarning: boolean;
  blockExecution: boolean;
  sendAlerts: boolean;
  alertChannels: {
    slack?: string;
    email?: string;
    webhook?: string;
  };
}

export interface EnforcementResult {
  passed: boolean;
  blocked: boolean;
  budgetCheck: BudgetCheck;
  action: 'allow' | 'warn' | 'block' | 'fail';
  message: string;
  recommendations?: string[];
}

export interface EnforcementReport {
  period: {
    start: number;
    end: number;
  };
  enforcements: {
    total: number;
    passed: number;
    warned: number;
    blocked: number;
    failed: number;
  };
  violations: {
    critical: number;
    error: number;
    warning: number;
  };
  topViolators: {
    metric: string;
    scope: BudgetScope;
    violationCount: number;
    averageExceeded: number;
  }[];
}

export class BudgetEnforcer {
  private static instance: BudgetEnforcer;
  private config: EnforcementConfig;
  private enforcementHistory: EnforcementResult[] = [];
  private readonly MAX_HISTORY = 10000;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.loadConfig();
  }

  public static getInstance(): BudgetEnforcer {
    if (!BudgetEnforcer.instance) {
      BudgetEnforcer.instance = new BudgetEnforcer();
    }
    return BudgetEnforcer.instance;
  }

  /**
   * Get default enforcement configuration
   */
  private getDefaultConfig(): EnforcementConfig {
    return {
      mode: 'warning',
      failOnCritical: true,
      failOnError: false,
      failOnWarning: false,
      blockExecution: false,
      sendAlerts: true,
      alertChannels: {},
    };
  }

  /**
   * Update enforcement configuration
   */
  public updateConfig(config: Partial<EnforcementConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
  }

  /**
   * Get current configuration
   */
  public getConfig(): EnforcementConfig {
    return { ...this.config };
  }

  /**
   * Enforce budget for metrics
   */
  public async enforce(
    metric: string,
    metrics: BudgetMetrics,
    scope: BudgetScope
  ): Promise<EnforcementResult> {
    // Check if enforcement is disabled
    if (this.config.mode === 'off') {
      return {
        passed: true,
        blocked: false,
        budgetCheck: {
          budgetId: 'disabled',
          budgetName: 'Enforcement Disabled',
          metric,
          passed: true,
          violations: [],
          timestamp: Date.now(),
        },
        action: 'allow',
        message: 'Budget enforcement is disabled',
      };
    }

    // Check budget
    const budgetCheck = performanceBudgetManager.checkBudget(metric, metrics, scope);

    // Determine action based on violations
    const action = this.determineAction(budgetCheck);

    // Generate result
    const result: EnforcementResult = {
      passed: budgetCheck.passed,
      blocked: action === 'block' || action === 'fail',
      budgetCheck,
      action,
      message: this.generateMessage(budgetCheck, action),
      recommendations: this.generateRecommendations(budgetCheck),
    };

    // Record enforcement
    this.enforcementHistory.push(result);
    if (this.enforcementHistory.length > this.MAX_HISTORY) {
      this.enforcementHistory = this.enforcementHistory.slice(-this.MAX_HISTORY);
    }

    // Send alerts if configured
    if (this.config.sendAlerts && !budgetCheck.passed) {
      await this.sendAlerts(result);
    }

    // Log enforcement
    this.logEnforcement(result);

    return result;
  }

  /**
   * Determine enforcement action based on violations
   */
  private determineAction(budgetCheck: BudgetCheck): 'allow' | 'warn' | 'block' | 'fail' {
    if (budgetCheck.passed) {
      return 'allow';
    }

    const hasCritical = budgetCheck.violations.some(v => v.severity === 'critical');
    const hasError = budgetCheck.violations.some(v => v.severity === 'error');
    const hasWarning = budgetCheck.violations.some(v => v.severity === 'warning');

    // Check fail conditions
    if (this.config.failOnCritical && hasCritical) {
      return 'fail';
    }
    if (this.config.failOnError && hasError) {
      return 'fail';
    }
    if (this.config.failOnWarning && hasWarning) {
      return 'fail';
    }

    // Check block conditions
    if (this.config.blockExecution && (hasCritical || hasError)) {
      return 'block';
    }

    // In strict mode, treat any violation as failure
    if (this.config.mode === 'strict') {
      return 'fail';
    }

    // Default to warning
    return 'warn';
  }

  /**
   * Generate enforcement message
   */
  private generateMessage(budgetCheck: BudgetCheck, action: string): string {
    if (budgetCheck.passed) {
      return `Budget check passed for ${budgetCheck.metric}`;
    }

    const violationCount = budgetCheck.violations.length;
    const actionText = action === 'fail' ? 'Build failed' :
                      action === 'block' ? 'Execution blocked' :
                      'Warning';

    return `${actionText}: ${violationCount} budget violation(s) detected for ${budgetCheck.metric}`;
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(budgetCheck: BudgetCheck): string[] {
    if (budgetCheck.passed) return [];

    const recommendations: string[] = [];

    budgetCheck.violations.forEach(violation => {
      switch (violation.limit) {
        case 'maxTime':
          recommendations.push(
            'Optimize workflow execution time by:',
            '  - Enabling parallel execution for independent nodes',
            '  - Adding caching for frequently accessed data',
            '  - Reviewing and optimizing slow nodes',
            '  - Consider using sub-workflows for complex operations'
          );
          break;

        case 'maxMemory':
          recommendations.push(
            'Reduce memory usage by:',
            '  - Processing data in smaller chunks',
            '  - Clearing unused variables',
            '  - Using streaming for large datasets',
            '  - Optimizing data structures'
          );
          break;

        case 'maxApiCalls':
          recommendations.push(
            'Reduce API calls by:',
            '  - Implementing request caching',
            '  - Batching multiple requests',
            '  - Using webhooks instead of polling',
            '  - Implementing rate limiting'
          );
          break;

        case 'maxCost':
          recommendations.push(
            'Reduce costs by:',
            '  - Optimizing API usage',
            '  - Using cheaper alternatives for non-critical operations',
            '  - Implementing request caching',
            '  - Review and remove unnecessary integrations'
          );
          break;

        case 'maxFileSize':
          recommendations.push(
            'Reduce file size by:',
            '  - Compressing files before processing',
            '  - Removing unnecessary data',
            '  - Using streaming for large files',
            '  - Splitting large files into chunks'
          );
          break;

        case 'maxDataTransfer':
          recommendations.push(
            'Reduce data transfer by:',
            '  - Compressing data in transit',
            '  - Filtering data at source',
            '  - Using incremental updates',
            '  - Implementing efficient protocols'
          );
          break;
      }
    });

    // Remove duplicates
    return Array.from(new Set(recommendations));
  }

  /**
   * Send alerts for budget violations
   */
  private async sendAlerts(result: EnforcementResult): Promise<void> {
    const { budgetCheck, action } = result;

    // Only alert on block or fail
    if (action !== 'block' && action !== 'fail') {
      return;
    }

    const alerts: Promise<void>[] = [];

    // Slack alert
    if (this.config.alertChannels.slack) {
      alerts.push(this.sendSlackAlert(result));
    }

    // Email alert
    if (this.config.alertChannels.email) {
      alerts.push(this.sendEmailAlert(result));
    }

    // Webhook alert
    if (this.config.alertChannels.webhook) {
      alerts.push(this.sendWebhookAlert(result));
    }

    await Promise.allSettled(alerts);
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(result: EnforcementResult): Promise<void> {
    const { budgetCheck, action, message } = result;
    const color = action === 'fail' ? 'danger' : 'warning';

    const violationFields = budgetCheck.violations.map(v => ({
      title: v.limit,
      value: `Budget: ${v.budgetValue}, Actual: ${v.actualValue.toFixed(2)} (${v.exceeded.toFixed(1)}% over)`,
      short: false,
    }));

    const payload = {
      attachments: [{
        color,
        title: `Budget ${action === 'fail' ? 'Failure' : 'Violation'}: ${budgetCheck.metric}`,
        text: message,
        fields: violationFields,
        footer: 'Performance Budget Enforcer',
        ts: Math.floor(budgetCheck.timestamp / 1000),
      }],
    };

    await fetch(this.config.alertChannels.slack!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(result: EnforcementResult): Promise<void> {
    const { budgetCheck, action, message, recommendations } = result;

    const violationsList = budgetCheck.violations
      .map(v => `- ${v.limit}: ${v.actualValue.toFixed(2)} / ${v.budgetValue} (${v.exceeded.toFixed(1)}% over)`)
      .join('\n');

    const recommendationsList = recommendations
      ? '\n\nRecommendations:\n' + recommendations.join('\n')
      : '';

    await fetch('/api/notifications/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: this.config.alertChannels.email,
        subject: `Performance Budget ${action === 'fail' ? 'Failure' : 'Violation'}: ${budgetCheck.metric}`,
        body: `
${message}

Violations:
${violationsList}${recommendationsList}

Budget: ${budgetCheck.budgetName}
Timestamp: ${new Date(budgetCheck.timestamp).toLocaleString()}
        `,
      }),
    });
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(result: EnforcementResult): Promise<void> {
    await fetch(this.config.alertChannels.webhook!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'budget_violation',
        result,
        timestamp: Date.now(),
      }),
    });
  }

  /**
   * Log enforcement result
   */
  private logEnforcement(result: EnforcementResult): void {
    const { budgetCheck, action } = result;

    if (action === 'allow') {
      logger.debug(`✓ Budget check passed: ${budgetCheck.metric}`);
    } else if (action === 'warn') {
      logger.warn(`⚠ Budget warning: ${budgetCheck.metric}`, budgetCheck.violations);
    } else {
      logger.error(`✗ Budget ${action}: ${budgetCheck.metric}`, budgetCheck.violations);

      if (result.recommendations && result.recommendations.length > 0) {
        logger.debug('Recommendations:', result.recommendations);
      }
    }
  }

  /**
   * Generate enforcement report
   */
  public generateReport(days: number = 7): EnforcementReport {
    const endTime = Date.now();
    const startTime = endTime - (days * 24 * 60 * 60 * 1000);

    const relevantEnforcements = this.enforcementHistory.filter(
      e => e.budgetCheck.timestamp >= startTime
    );

    const total = relevantEnforcements.length;
    const passed = relevantEnforcements.filter(e => e.action === 'allow').length;
    const warned = relevantEnforcements.filter(e => e.action === 'warn').length;
    const blocked = relevantEnforcements.filter(e => e.action === 'block').length;
    const failed = relevantEnforcements.filter(e => e.action === 'fail').length;

    // Count violations by severity
    const allViolations = relevantEnforcements.flatMap(e => e.budgetCheck.violations);
    const critical = allViolations.filter(v => v.severity === 'critical').length;
    const error = allViolations.filter(v => v.severity === 'error').length;
    const warning = allViolations.filter(v => v.severity === 'warning').length;

    // Find top violators
    const violatorMap = new Map<string, { count: number; totalExceeded: number }>();

    relevantEnforcements.forEach(e => {
      if (e.budgetCheck.passed) return;

      const key = `${e.budgetCheck.metric}`;
      const existing = violatorMap.get(key) || { count: 0, totalExceeded: 0 };

      existing.count += e.budgetCheck.violations.length;
      existing.totalExceeded += e.budgetCheck.violations.reduce((sum, v) => sum + v.exceeded, 0);

      violatorMap.set(key, existing);
    });

    const topViolators = Array.from(violatorMap.entries())
      .map(([metric, data]) => ({
        metric,
        scope: { type: 'global' as const },
        violationCount: data.count,
        averageExceeded: data.totalExceeded / data.count,
      }))
      .sort((a, b) => b.violationCount - a.violationCount)
      .slice(0, 10);

    return {
      period: { start: startTime, end: endTime },
      enforcements: { total, passed, warned, blocked, failed },
      violations: { critical, error, warning },
      topViolators,
    };
  }

  /**
   * Get enforcement history
   */
  public getHistory(limit: number = 100): EnforcementResult[] {
    return this.enforcementHistory.slice(-limit).reverse();
  }

  /**
   * Clear enforcement history
   */
  public clearHistory(): void {
    this.enforcementHistory = [];
  }

  /**
   * Save configuration
   */
  private saveConfig(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('budgetEnforcement.config', JSON.stringify(this.config));
      } catch (error) {
        logger.warn('Failed to save enforcement config:', error);
      }
    }
  }

  /**
   * Load configuration
   */
  private loadConfig(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('budgetEnforcement.config');
        if (saved) {
          this.config = { ...this.config, ...JSON.parse(saved) };
        }
      } catch (error) {
        logger.warn('Failed to load enforcement config:', error);
      }
    }
  }
}

// Export singleton instance
export const budgetEnforcer = BudgetEnforcer.getInstance();
